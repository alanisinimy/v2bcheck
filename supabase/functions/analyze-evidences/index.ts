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

    let previousGaps: string[] = [];
    if (assetIds.length > 0) {
      const { data: evidences } = await supabase
        .from('evidences')
        .select('content, benchmark')
        .in('asset_id', assetIds)
        .eq('status', 'validado')
        .order('created_at', { ascending: false })
        .limit(5);

      previousGaps = evidences?.map((e: any) => e.content) || [];
    }

    // Build context string
    let context = `
CONTEXTO DO COLABORADOR:
Você está analisando um arquivo vinculado a ${collaborator.name}.`;

    if (collaborator.role) {
      context += `\nCargo: ${collaborator.role}`;
    }

    if (collaborator.disc_profile) {
      const profile = collaborator.disc_profile as { D: number; I: number; S: number; C: number };
      context += `\nPerfil Comportamental DISC: ${formatDiscProfile(profile)}`;
      context += `\n\nUse o perfil DISC para contextualizar os gaps. Ex: Se a pessoa é Alto D e reclama de processos lentos, isso pode indicar um gap de "Burocracia que bloqueia vendedores de alto desempenho".`;
    }

    if (previousGaps.length > 0) {
      context += `\n\nGAPS JÁ IDENTIFICADOS ANTERIORMENTE:`;
      previousGaps.forEach((gap: string) => {
        context += `\n- ${gap}`;
      });
      context += `\n\nNÃO repita esses gaps. Se encontrar informações novas sobre eles, pode aprofundar ou identificar causa-raiz.`;
    }

    return context;
  } catch (error) {
    console.error('Error building collaborator context:', error);
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT: CONSULTOR ESTRATÉGICO (McKinsey/Deloitte Style)
// ═══════════════════════════════════════════════════════════════

const BASE_SYSTEM_PROMPT = `Você é um Consultor Estratégico Sênior estilo McKinsey/Deloitte especializado em transformação de vendas B2B.

═══════════════════════════════════════════════════════════════
                    SUA MISSÃO
═══════════════════════════════════════════════════════════════

Identificar GAPS DE MERCADO que impedem a empresa de atingir seu potencial de vendas.

Você NÃO extrai citações literais. Você SINTETIZA problemas estratégicos.
Você NÃO anota fatos neutros. Você identifica BARREIRAS ao crescimento.

═══════════════════════════════════════════════════════════════
                 O QUE É UM GAP ESTRATÉGICO?
═══════════════════════════════════════════════════════════════

Um GAP é a distância entre o estado atual e a melhor prática de mercado.

EXEMPLO DE CONVERSÃO:
- ❌ Citação: "O João disse que o CRM está desatualizado"
- ❌ Micro-fato: "O time não preenche o CRM"
- ✅ GAP: "Baixa adoção de CRM compromete visibilidade do pipeline e previsibilidade de receita"
  - Benchmark: "Gestão centralizada de pipeline com dados limpos e atualização diária"
  - Impacto: Receita
  - Criticidade: Alta

═══════════════════════════════════════════════════════════════
                 REGRAS DE CONDENSAÇÃO (MENOS É MAIS)
═══════════════════════════════════════════════════════════════

1. NÃO CRIE UM GAP PARA CADA FRASE. AGRUPE problemas relacionados:
   - Se 3 pessoas reclamam do CRM → UM ÚNICO GAP sobre tecnologia
   - Se há problemas de follow-up e cadência → UM GAP de "Processo Comercial"
   - Se há conflitos entre gestor e time → UM GAP de "Alinhamento de Gestão"

2. IGNORE FATOS NEUTROS OU BIOGRÁFICOS:
   - "Tatiane trabalha desde 2012" → NÃO É GAP
   - "A empresa tem 50 funcionários" → NÃO É GAP
   - "O escritório fica em SP" → NÃO É GAP
   - "Usamos Salesforce" → SÓ é gap se houver PROBLEMA com isso

3. FOCO EM PROBLEMAS, RISCOS E OPORTUNIDADES PERDIDAS:
   - Só registre algo que representa perda de receita, ineficiência, risco operacional ou barreira cultural
   - Pergunte-se: "Isso impede a empresa de vender mais?" Se não, descarte.

4. LIMITE: MÁXIMO 8 GAPS POR ANÁLISE
   - Se identificar mais de 8, priorize os de maior impacto em receita
   - Prefira profundidade a quantidade

═══════════════════════════════════════════════════════════════
                 CRITÉRIO DE CRITICIDADE
═══════════════════════════════════════════════════════════════

ALTA (🔴):
- Afeta diretamente a receita (perda de deals, churn, ciclo longo)
- Impede a operação (sistema crítico quebrado, processo bloqueado)
- Risco de compliance ou legal

MÉDIA (🟡):
- Gera ineficiência ou retrabalho significativo
- Reduz produtividade do time
- Afeta experiência do cliente indiretamente

BAIXA (🟢):
- Incômodo operacional menor
- "Nice to have" sem impacto mensurável
- Otimizações de baixa prioridade

═══════════════════════════════════════════════════════════════
                 TIPOS DE IMPACTO
═══════════════════════════════════════════════════════════════

- RECEITA: Afeta diretamente vendas, conversão, ticket médio, churn
- EFICIENCIA: Afeta produtividade, tempo, retrabalho, custos operacionais
- RISCO: Afeta compliance, segurança, dependência de pessoas-chave
- CULTURA: Afeta motivação, alinhamento, resistência a mudanças

═══════════════════════════════════════════════════════════════
                 PILARES DE CLASSIFICAÇÃO
═══════════════════════════════════════════════════════════════

1. PESSOAS - Perfil, Skills, Motivação, Comportamento, Turnover
2. PROCESSOS - Fluxo, Gargalos, Cadência, SLA, Handoffs
3. DADOS - KPIs, Metas, Conversão, Métricas, Dashboards
4. TECNOLOGIA - CRM, Ferramentas, Stack, Automação, Integrações
5. GESTÃO - Rituais, Cultura, Crenças, Alinhamento, Liderança

═══════════════════════════════════════════════════════════════
                 FILTRO DE RELEVÂNCIA
═══════════════════════════════════════════════════════════════

DESCARTE AUTOMÁTICO se o conteúdo for sobre:
- A consultoria realizando o diagnóstico (Vendas2B, V2B, etc.)
- Ações futuras de consultores ("vamos implementar", "iremos fazer")
- Metodologia ou escopo do projeto de consultoria
- Promessas ou expectativas sobre o projeto

FOQUE APENAS em problemas ATUAIS do CLIENTE.`;

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

    console.log('Calling OpenAI API to analyze content (Strategic Gap Analysis)...');
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
          { role: 'user', content: `Analise este texto e identifique os GAPS ESTRATÉGICOS (máximo 8). Lembre-se: você é um consultor McKinsey sintetizando problemas de alto nível, não um auditor listando citações.\n\n${content}` }
        ],
        temperature: 0.3,
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_strategic_gaps',
              description: 'Identifique gaps estratégicos que impedem a empresa de atingir seu potencial. Agrupe problemas relacionados e forneça benchmarks de mercado.',
              parameters: {
                type: 'object',
                properties: {
                  gaps: {
                    type: 'array',
                    maxItems: 8,
                    items: {
                      type: 'object',
                      properties: {
                        gap: { 
                          type: 'string',
                          description: 'Descrição sintética do problema estratégico em uma frase (sem aspas, narrativo). Ex: "Baixa adoção de CRM compromete visibilidade do pipeline"'
                        },
                        pilar: { 
                          type: 'string', 
                          enum: ['pessoas', 'processos', 'dados', 'tecnologia', 'gestao'],
                          description: 'O pilar ao qual o gap pertence'
                        },
                        benchmark: {
                          type: 'string',
                          description: 'Qual é a melhor prática de mercado que está faltando? Ex: "Gestão centralizada de pipeline com dados limpos e atualização diária"'
                        },
                        impacto: {
                          type: 'string',
                          enum: ['receita', 'eficiencia', 'risco', 'cultura'],
                          description: 'Tipo de impacto principal: receita, eficiencia, risco ou cultura'
                        },
                        criticidade: {
                          type: 'string',
                          enum: ['alta', 'media', 'baixa'],
                          description: 'Nível de criticidade baseado no impacto em receita e operação'
                        },
                        is_divergence: { 
                          type: 'boolean',
                          description: 'TRUE se há contradição explícita entre fontes (ex: gestor diz A, time diz B)'
                        },
                        divergence_description: { 
                          type: 'string',
                          description: 'Se is_divergence=true, descreva a contradição'
                        }
                      },
                      required: ['gap', 'pilar', 'benchmark', 'impacto', 'criticidade', 'is_divergence']
                    }
                  }
                },
                required: ['gaps']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_strategic_gaps' } }
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
    if (!toolCall || toolCall.function.name !== 'extract_strategic_gaps') {
      console.error('Unexpected response format:', JSON.stringify(completion));
      throw new Error('Unexpected AI response format');
    }

    let gaps;
    try {
      const args = JSON.parse(toolCall.function.arguments);
      gaps = args.gaps;
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError);
      throw new Error('Failed to parse AI response');
    }

    if (!Array.isArray(gaps)) {
      console.error('Gaps is not an array:', gaps);
      throw new Error('Invalid gaps format');
    }

    console.log(`Extracted ${gaps.length} strategic gaps`);

    // Log gaps for debugging
    gaps.forEach((gap: any, index: number) => {
      console.log(`Gap ${index + 1}: [${gap.pilar}] ${gap.gap.substring(0, 60)}... | Criticidade: ${gap.criticidade} | Impacto: ${gap.impacto}`);
    });

    return new Response(
      JSON.stringify({ gaps, count: gaps.length }),
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
