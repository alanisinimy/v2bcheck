import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Helper to get primary DISC style
function getPrimaryStyle(discProfile: { D: number; I: number; S: number; C: number }): string {
  const styles = [
    { letter: 'D', value: discProfile.D, name: 'Dominante' },
    { letter: 'I', value: discProfile.I, name: 'Influente' },
    { letter: 'S', value: discProfile.S, name: 'Estável' },
    { letter: 'C', value: discProfile.C, name: 'Consciente' },
  ];
  const primary = styles.reduce((a, b) => (a.value > b.value ? a : b));
  return `Alto ${primary.letter} - ${primary.name}`;
}

// Helper to format DISC profile for prompt
function formatDiscProfile(discProfile: { D: number; I: number; S: number; C: number }): string {
  return `D=${discProfile.D}, I=${discProfile.I}, S=${discProfile.S}, C=${discProfile.C} (Perfil ${getPrimaryStyle(discProfile)})`;
}

// Build context about collaborator if available
async function buildCollaboratorContext(
  supabase: any,
  collaboratorId: string
): Promise<string> {
  try {
    // Fetch collaborator data
    const { data: collaborator, error: collabError } = await supabase
      .from('collaborators')
      .select('name, role, disc_profile, project_id')
      .eq('id', collaboratorId)
      .single();

    if (collabError || !collaborator) {
      console.log('Collaborator not found:', collaboratorId);
      return '';
    }

    // Fetch previous validated evidences linked to this collaborator's assets
    const { data: assets } = await supabase
      .from('assets')
      .select('id')
      .eq('collaborator_id', collaboratorId);

    const assetIds = assets?.map((a: any) => a.id) || [];

    let previousEvidences: string[] = [];
    if (assetIds.length > 0) {
      const { data: evidences } = await supabase
        .from('evidences')
        .select('content')
        .in('asset_id', assetIds)
        .eq('status', 'validado')
        .order('created_at', { ascending: false })
        .limit(5);

      previousEvidences = evidences?.map((e: any) => e.content) || [];
    }

    // Build context string
    let context = `
CONTEXTO DO COLABORADOR:
Você está analisando um arquivo de ${collaborator.name}.`;

    if (collaborator.role) {
      context += `\nCargo: ${collaborator.role}`;
    }

    if (collaborator.disc_profile) {
      const profile = collaborator.disc_profile as { D: number; I: number; S: number; C: number };
      context += `\nPerfil Comportamental DISC: ${formatDiscProfile(profile)}`;
    }

    if (previousEvidences.length > 0) {
      context += `\n\nO QUE JÁ SABEMOS SOBRE ${collaborator.name.toUpperCase()}:`;
      previousEvidences.forEach((ev: string) => {
        context += `\n- ${ev}`;
      });
    }

    context += `

INSTRUÇÃO ESPECIAL: 
Cruze novas informações com o perfil DISC. Se a pessoa reclama de algo,
verifique se confirma uma característica do perfil (ex: Alto I resiste a processos rígidos,
Alto D pode ter conflitos de autoridade, Alto S resiste a mudanças bruscas, Alto C reclama de falta de dados).
`;

    return context;
  } catch (error) {
    console.error('Error building collaborator context:', error);
    return '';
  }
}

const BLACKLIST_RULES = `
REGRAS DE EXCLUSÃO (BLACKLIST) - IGNORE COMPLETAMENTE:

1. IGNORE A CONSULTORIA:
   - Qualquer menção a "Vendas2B", "Vendas to Be", "Vendas 2 Be", "V2B"
   - Frases como "Nós da consultoria vamos...", "Nosso diagnóstico vai..."
   - Promessas futuras da consultoria ("Vamos implementar", "Vamos fazer", "Vamos entregar")
   - Escopo de projeto ou metodologia da consultoria
   - Explicações sobre como a consultoria trabalha

2. IGNORE OS CONSULTORES:
   - Ações atribuídas a consultores (Luana, João, Emília, ou quem conduz a reunião)
   - Perguntas dos consultores (são contexto, não evidência)
   - Explicações sobre a metodologia de trabalho
   - Qualquer frase que comece com "A gente vai..." quando dita pelo consultor

3. FOCO EXCLUSIVO NO CLIENTE:
   - Extraia APENAS fatos, dores e processos da empresa cliente
   - Se a frase fala sobre o que a consultoria vai fazer, DESCARTE
   - Se a frase fala sobre o que o CLIENTE faz/sente/sofre, EXTRAIA
   - Foque em problemas reais, métricas, ferramentas e comportamentos do cliente

EXEMPLOS DE DESCARTE:
- ❌ "A Vendas2B vai mapear todos os processos" (escopo de projeto)
- ❌ "Luana perguntou sobre o CRM" (ação do consultor)
- ❌ "Vamos entregar um dashboard personalizado" (promessa futura)
- ❌ "Nossa metodologia envolve 5 pilares" (metodologia da consultoria)
- ❌ "A Emília vai analisar os dados" (ação do consultor)

EXEMPLOS DE EXTRAÇÃO:
- ✅ "O time não preenche o CRM por falta de tempo" (dor do cliente)
- ✅ "A meta é de 30 reuniões por mês" (dado factual)
- ✅ "Usamos o HubSpot desde 2022" (tecnologia do cliente)
- ✅ "Tenho dificuldade em fazer follow-up" (comportamento do cliente)
- ✅ "O processo de vendas demora em média 45 dias" (métrica do cliente)
`;

const BASE_SYSTEM_PROMPT = `Você é um Auditor Sênior de Vendas B2B. Sua função é extrair evidências factuais de textos para um diagnóstico comercial.

${BLACKLIST_RULES}

Analise o texto e extraia itens classificando-os em 5 Pilares:
1. Pessoas (Perfil, Skills, Motivação, Comportamento)
2. Processos (Fluxo, Gargalos, Cadência, SLA)
3. Dados (KPIs, Metas, Conversão, Métricas)
4. Tecnologia (CRM, Ferramentas, Stack, Automação)
5. Gestão & Cultura (Rituais, Crenças, Alinhamento, Liderança)

REGRAS DE EXTRAÇÃO:
- Seja factual e direto
- Extraia APENAS informações sobre o cliente, nunca sobre a consultoria
- Se houver contradição explícita, marque is_divergence=true
- Classifique cada evidência corretamente no pilar apropriado
- Extraia TODAS as evidências relevantes do texto
- Prefira frases completas e contextualizadas`;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { content, collaboratorId } = await req.json();

    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Content is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Build dynamic system prompt
    let systemPrompt = BASE_SYSTEM_PROMPT;

    // Add collaborator context if provided
    if (collaboratorId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const collaboratorContext = await buildCollaboratorContext(supabase, collaboratorId);
      if (collaboratorContext) {
        systemPrompt = collaboratorContext + '\n\n' + systemPrompt;
        console.log('Added collaborator context for:', collaboratorId);
      }
    }

    console.log('Calling OpenAI API to analyze content...');
    console.log('Content length:', content.length);
    console.log('Has collaborator context:', !!collaboratorId);

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analise este texto e extraia as evidências (lembre-se de ignorar menções à consultoria Vendas2B e focar apenas no cliente):\n\n${content}` }
        ],
        temperature: 0.2,
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_evidences',
              description: 'Extraia evidências estruturadas do texto analisado, focando apenas no cliente',
              parameters: {
                type: 'object',
                properties: {
                  evidences: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        content: { 
                          type: 'string',
                          description: 'Descrição clara e factual da evidência em pt-BR. Deve ser sobre o CLIENTE, não sobre a consultoria.'
                        },
                        pilar: { 
                          type: 'string', 
                          enum: ['pessoas', 'processos', 'dados', 'tecnologia', 'gestao'],
                          description: 'O pilar ao qual a evidência pertence'
                        },
                        is_divergence: { 
                          type: 'boolean',
                          description: 'Se há contradição explícita no texto'
                        },
                        divergence_description: { 
                          type: 'string',
                          description: 'Explicação da divergência, se aplicável'
                        }
                      },
                      required: ['content', 'pilar', 'is_divergence']
                    }
                  }
                },
                required: ['evidences']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_evidences' } }
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error('Failed to analyze content');
    }

    const completion = await openaiResponse.json();

    console.log('OpenAI response received');

    // Extract tool call arguments
    const toolCall = completion.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_evidences') {
      console.error('Unexpected response format:', JSON.stringify(completion));
      throw new Error('Unexpected AI response format');
    }

    let evidences;
    try {
      const args = JSON.parse(toolCall.function.arguments);
      evidences = args.evidences;
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError);
      throw new Error('Failed to parse AI response');
    }

    if (!Array.isArray(evidences)) {
      console.error('Evidences is not an array:', evidences);
      throw new Error('Invalid evidences format');
    }

    console.log(`Extracted ${evidences.length} evidences`);

    return new Response(
      JSON.stringify({ evidences, count: evidences.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-evidences:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
