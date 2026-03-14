import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEFAULT_PILARES = [
  { key: 'pessoas', label: 'Pessoas' },
  { key: 'processos', label: 'Processos' },
  { key: 'dados', label: 'Dados' },
  { key: 'tecnologia', label: 'Tecnologia' },
  { key: 'gestao', label: 'Gestão' },
];

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

function formatDiscProfile(discProfile: { D: number; I: number; S: number; C: number }): string {
  return `D=${discProfile.D}, I=${discProfile.I}, S=${discProfile.S}, C=${discProfile.C} (Perfil ${getPrimaryStyle(discProfile)})`;
}

async function buildCollaboratorContext(supabase: any, collaboratorId: string): Promise<string> {
  try {
    const { data: collaborator, error: collabError } = await supabase
      .from('collaborators')
      .select('name, role, disc_profile, project_id')
      .eq('id', collaboratorId)
      .single();

    if (collabError || !collaborator) return '';

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

    let context = `\nCONTEXTO DO COLABORADOR:\nVocê está analisando um arquivo vinculado a ${collaborator.name}.`;
    if (collaborator.role) context += `\nCargo: ${collaborator.role}`;
    if (collaborator.disc_profile) {
      const profile = collaborator.disc_profile as { D: number; I: number; S: number; C: number };
      context += `\nPerfil Comportamental DISC: ${formatDiscProfile(profile)}`;
      context += `\n\nUse o perfil DISC para contextualizar os gaps.`;
    }
    if (previousGaps.length > 0) {
      context += `\n\nGAPS JÁ IDENTIFICADOS ANTERIORMENTE:`;
      previousGaps.forEach((gap: string) => { context += `\n- ${gap}`; });
      context += `\n\nNÃO repita esses gaps. Se encontrar informações novas sobre eles, pode aprofundar ou identificar causa-raiz.`;
    }
    return context;
  } catch {
    return '';
  }
}

function buildSystemPrompt(pilares: { key: string; label: string }[]): string {
  const pilarDescriptions = pilares.map((p, i) => `${i + 1}. ${p.key.toUpperCase()} - ${p.label}`).join('\n');

  return `Você é um Consultor Estratégico Sênior estilo McKinsey/Deloitte especializado em transformação de vendas B2B.

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

═══════════════════════════════════════════════════════════════
                 REGRAS DE CONDENSAÇÃO (MENOS É MAIS)
═══════════════════════════════════════════════════════════════

1. NÃO CRIE UM GAP PARA CADA FRASE. AGRUPE problemas relacionados.
2. IGNORE FATOS NEUTROS OU BIOGRÁFICOS.
3. FOCO EM PROBLEMAS, RISCOS E OPORTUNIDADES PERDIDAS.
4. LIMITE: MÁXIMO 8 GAPS POR ANÁLISE.

═══════════════════════════════════════════════════════════════
                 CRITÉRIO DE CRITICIDADE
═══════════════════════════════════════════════════════════════

ALTA (🔴): Afeta diretamente receita, impede operação, risco de compliance
MÉDIA (🟡): Gera ineficiência, reduz produtividade, afeta experiência indiretamente
BAIXA (🟢): Incômodo menor, "nice to have"

═══════════════════════════════════════════════════════════════
                 TIPOS DE IMPACTO
═══════════════════════════════════════════════════════════════

- RECEITA: Afeta vendas, conversão, ticket médio, churn
- EFICIENCIA: Afeta produtividade, tempo, retrabalho
- RISCO: Afeta compliance, segurança, dependência
- CULTURA: Afeta motivação, alinhamento, resistência

═══════════════════════════════════════════════════════════════
                 PILARES DE CLASSIFICAÇÃO
═══════════════════════════════════════════════════════════════

Os pilares deste projeto são:
${pilarDescriptions}

═══════════════════════════════════════════════════════════════
                 FILTRO DE RELEVÂNCIA
═══════════════════════════════════════════════════════════════

DESCARTE AUTOMÁTICO se o conteúdo for sobre a consultoria, ações futuras de consultores, metodologia ou promessas sobre o projeto.
FOQUE APENAS em problemas ATUAIS do CLIENTE.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { content, collaboratorId, sourceType, projectId } = await req.json();

    if (!content || typeof content !== 'string') {
      return new Response(JSON.stringify({ error: 'Content is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Fetch dynamic pilares if projectId provided
    let pilares = DEFAULT_PILARES;
    if (projectId) {
      const { data: project } = await supabase
        .from('projects')
        .select('pilares_config')
        .eq('id', projectId)
        .single();

      if (project?.pilares_config && Array.isArray(project.pilares_config)) {
        pilares = (project.pilares_config as any[]).map(p => ({
          key: p.key || p.pilar,
          label: p.label || p.key,
        }));
      }
    }

    const pilarKeys = pilares.map(p => p.key);
    const isTechnicalNote = sourceType === 'observacao_consultor';

    // Build prompt
    let systemPrompt = buildSystemPrompt(pilares);

    if (isTechnicalNote) {
      systemPrompt = `═══════════════════════════════════════════════════════════════
                    NOTA TÉCNICA DO CONSULTOR
═══════════════════════════════════════════════════════════════

ATENÇÃO: Este conteúdo é uma NOTA TÉCNICA escrita diretamente pelo consultor.
Trate como VERDADE ABSOLUTA com ALTA CONFIANÇA.
Criticidade padrão: ALTA (a menos que o consultor indique diferente).

═══════════════════════════════════════════════════════════════\n\n` + systemPrompt;
    }

    if (collaboratorId) {
      const context = await buildCollaboratorContext(supabase, collaboratorId);
      if (context) systemPrompt = context + '\n\n' + systemPrompt;
    }

    console.log(`Calling Lovable AI Gateway (gemini-2.5-pro) for gap analysis. Content: ${content.length} chars`);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analise este texto e identifique os GAPS ESTRATÉGICOS (máximo 8).\n\n${content}` }
        ],
        temperature: 0.3,
        tools: [{
          type: 'function',
          function: {
            name: 'extract_strategic_gaps',
            description: 'Identifique gaps estratégicos que impedem a empresa de atingir seu potencial.',
            parameters: {
              type: 'object',
              properties: {
                gaps: {
                  type: 'array',
                  maxItems: 8,
                  items: {
                    type: 'object',
                    properties: {
                      gap: { type: 'string', description: 'Descrição sintética do problema estratégico' },
                      pilar: { type: 'string', enum: pilarKeys },
                      benchmark: { type: 'string', description: 'Melhor prática de mercado' },
                      impacto: { type: 'string', enum: ['receita', 'eficiencia', 'risco', 'cultura'] },
                      criticidade: { type: 'string', enum: ['alta', 'media', 'baixa'] },
                      confidence_score: { type: 'number', description: 'Confiança de 0.0 a 1.0 na identificação deste gap' },
                      is_divergence: { type: 'boolean', description: 'TRUE se há contradição entre fontes' },
                      divergence_description: { type: 'string', description: 'Descrição da contradição' },
                    },
                    required: ['gap', 'pilar', 'benchmark', 'impacto', 'criticidade', 'confidence_score', 'is_divergence'],
                  },
                },
              },
              required: ['gaps'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'extract_strategic_gaps' } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Failed to analyze content');
    }

    const completion = await aiResponse.json();
    const toolCall = completion.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== 'extract_strategic_gaps') {
      throw new Error('Unexpected AI response format');
    }

    let gaps;
    try {
      const args = JSON.parse(toolCall.function.arguments);
      gaps = args.gaps;
    } catch {
      throw new Error('Failed to parse AI response');
    }

    if (!Array.isArray(gaps)) throw new Error('Invalid gaps format');

    // Validate pilar values
    gaps = gaps.map((gap: any) => {
      let pilar = gap.pilar?.toLowerCase();
      if (!pilarKeys.includes(pilar)) {
        if (pilar === 'cultura') pilar = 'gestao';
        else pilar = pilarKeys[0] || 'processos';
      }

      const confidence = Math.min(1, Math.max(0, gap.confidence_score ?? 1.0));
      const returnReason = confidence < 0.6 ? 'confianca_baixa' : null;

      return { ...gap, pilar, confidence_score: confidence, return_reason: returnReason };
    });

    console.log(`Extracted ${gaps.length} strategic gaps`);

    // Log activity if projectId
    if (projectId) {
      await supabase.from('activity_log').insert({
        project_id: projectId,
        actor_type: 'ia',
        actor_name: 'IA',
        action: 'gaps_generated',
        description: `gerou ${gaps.length} gaps estratégicos a partir de ${isTechnicalNote ? 'nota técnica' : 'arquivo'}`,
        metadata: { gaps_count: gaps.length, pilares: [...new Set(gaps.map((g: any) => g.pilar))] },
      }).then(() => {}).catch(e => console.error('Activity log error:', e));
    }

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
