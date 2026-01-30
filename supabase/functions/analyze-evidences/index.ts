import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

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

// ═══════════════════════════════════════════════════════════════
// CAMADA 3: FILTRO PÓS-EXTRAÇÃO (Backend)
// ═══════════════════════════════════════════════════════════════

// Palavras-chave que indicam evidência sobre consultoria
const CONSULTANCY_KEYWORDS = [
  'vendas2b', 'vendas to be', 'vendas 2 be', 'v2b',
  'a gente vai', 'vamos fazer', 'vamos entregar',
  'nosso diagnóstico', 'nossa metodologia', 'nosso projeto',
  'a consultoria', 'nós vamos', 'iremos implementar',
  'nossa equipe vai', 'o diagnóstico vai', 'irá realizar',
  'equipe da vendas', 'time da vendas'
];

// Nomes de consultores conhecidos
const CONSULTANT_NAMES = ['luana', 'emília', 'emilia', 'joão', 'joao'];

// Filtro pós-extração para capturar evidências que escapam do prompt
function isAboutConsultancy(content: string): boolean {
  const lower = content.toLowerCase();
  
  // Check keywords
  for (const keyword of CONSULTANCY_KEYWORDS) {
    if (lower.includes(keyword)) return true;
  }
  
  // Check if starts with consultant action or mentions consultant doing something
  for (const name of CONSULTANT_NAMES) {
    if (lower.startsWith(name) || 
        lower.includes(`${name} vai`) || 
        lower.includes(`${name} menciona`) ||
        lower.includes(`${name} irá`) ||
        lower.includes(`${name} disse`) ||
        lower.includes(`${name} laguna`)) {
      return true;
    }
  }
  
  return false;
}

// ═══════════════════════════════════════════════════════════════
// CAMADA 1: PROMPT REFORÇADO (Abordagem Positiva)
// ═══════════════════════════════════════════════════════════════

const BASE_SYSTEM_PROMPT = `Você é um Auditor Sênior de Vendas B2B extraindo evidências para diagnóstico comercial.

═══════════════════════════════════════════════════════════════
                    TESTE DE RELEVÂNCIA OBRIGATÓRIO
═══════════════════════════════════════════════════════════════

ANTES de extrair qualquer evidência, aplique este teste a CADA frase:

┌─────────────────────────────────────────────────────────────┐
│ PERGUNTA 1: O sujeito da frase é o CLIENTE?                │
│ - "O time de vendas não usa CRM" → SIM (cliente)           │
│ - "A Vendas2B vai mapear processos" → NÃO (consultoria)    │
│                                                             │
│ Se NÃO → DESCARTE IMEDIATAMENTE                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PERGUNTA 2: A frase descreve um FATO ATUAL ou uma          │
│             PROMESSA FUTURA?                                │
│ - "Usamos HubSpot desde 2022" → FATO ATUAL ✓               │
│ - "Vamos implementar dashboards" → PROMESSA FUTURA ✗       │
│                                                             │
│ Se PROMESSA FUTURA → DESCARTE                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PERGUNTA 3: A frase é sobre metodologia/escopo de projeto? │
│ - "Nossa metodologia tem 5 pilares" → SIM (escopo) ✗       │
│ - "O processo de vendas demora 45 dias" → NÃO (cliente) ✓  │
│                                                             │
│ Se SIM → DESCARTE                                          │
└─────────────────────────────────────────────────────────────┘

TERMOS QUE INDICAM DESCARTE AUTOMÁTICO:
- "Vendas2B", "Vendas to Be", "V2B", "a consultoria"
- "Luana vai...", "Luana menciona...", "João vai...", "Emília vai..."
- "A gente vai...", "Nós vamos...", "Vamos entregar..."
- "Nosso diagnóstico", "Nossa metodologia", "Nosso projeto"
- "irá realizar um diagnóstico", "equipe da Vendas"

═══════════════════════════════════════════════════════════════

PILARES DE CLASSIFICAÇÃO:
1. Pessoas - Perfil, Skills, Motivação, Comportamento
2. Processos - Fluxo, Gargalos, Cadência, SLA
3. Dados - KPIs, Metas, Conversão, Métricas
4. Tecnologia - CRM, Ferramentas, Stack, Automação
5. Gestão & Cultura - Rituais, Crenças, Alinhamento

REGRAS:
- Extraia APENAS evidências que passam no teste de relevância
- Seja factual e direto
- Prefira frases completas e contextualizadas
- Marque is_divergence=true se houver contradição explícita
- Marque is_about_client=false se tiver QUALQUER dúvida sobre a origem`;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT to verify auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Use service role for database operations
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Build dynamic system prompt
    let systemPrompt = BASE_SYSTEM_PROMPT;

    // Add collaborator context if provided
    if (collaboratorId) {
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
              description: 'Extraia evidências estruturadas do texto analisado, focando APENAS no cliente. Aplique o teste de relevância a cada frase.',
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
                        is_about_client: {
                          type: 'boolean',
                          description: 'TRUE se a evidência é sobre o cliente. FALSE se menciona a consultoria, escopo futuro, ou ações de consultores.'
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
                      required: ['content', 'pilar', 'is_about_client', 'is_divergence']
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

    console.log(`Extracted ${evidences.length} raw evidences from AI`);

    // ═══════════════════════════════════════════════════════════════
    // CAMADA 2 + 3: FILTRO PÓS-EXTRAÇÃO
    // ═══════════════════════════════════════════════════════════════
    
    const filteredEvidences = evidences.filter((ev: any) => {
      // Layer 2: Check AI's own classification
      if (ev.is_about_client === false) {
        console.log(`Filtered (AI marked as not client): "${ev.content.substring(0, 50)}..."`);
        return false;
      }
      
      // Layer 3: Backend keyword filter
      if (isAboutConsultancy(ev.content)) {
        console.log(`Filtered (keyword match): "${ev.content.substring(0, 50)}..."`);
        return false;
      }
      
      return true;
    });

    console.log(`After filtering: ${filteredEvidences.length} evidences (removed ${evidences.length - filteredEvidences.length})`);

    return new Response(
      JSON.stringify({ evidences: filteredEvidences, count: filteredEvidences.length }),
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
