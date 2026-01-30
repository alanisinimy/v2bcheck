import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface GeneratedInitiative {
  id: string;
  title: string;
  related_gaps: string[];
  strategy: string;
  expected_impact: string;
  effort: 'low' | 'medium' | 'high';
  target_pilar?: string;
}

Deno.serve(async (req) => {
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
    const userId = claimsData.claims.sub;

    const { projectId } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Missing projectId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify project membership
    const { data: member, error: memberError } = await userClient
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: No access to this project' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for database operations
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project context
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('client_context, main_pain_points, project_goals')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('Error fetching project:', projectError);
    }

    const projectContext = project?.client_context || 'Não informado';
    const projectPainPoints = project?.main_pain_points || 'Não informado';
    const projectGoals = project?.project_goals || 'Não informado';

    // Fetch validated evidences WITH sequential_id for gap mapping
    const { data: evidences, error: evidencesError } = await supabase
      .from('evidences')
      .select('content, pilar, is_divergence, evidence_type, sequential_id, benchmark, impact, criticality')
      .eq('project_id', projectId)
      .eq('status', 'validado')
      .order('sequential_id', { ascending: true });

    if (evidencesError) throw evidencesError;

    // Fetch collaborators
    const { data: collaborators, error: collaboratorsError } = await supabase
      .from('collaborators')
      .select('name, role, disc_profile, primary_style')
      .eq('project_id', projectId);

    if (collaboratorsError) throw collaboratorsError;

    if (!evidences || evidences.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma evidência validada encontrada. Valide evidências na Matriz antes de gerar o plano.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate team profile distribution
    const styleCounts: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };
    collaborators?.forEach(c => {
      if (c.primary_style) {
        styleCounts[c.primary_style]++;
      }
    });
    const totalProfiles = Object.values(styleCounts).reduce((a, b) => a + b, 0);
    
    const teamProfileDescription = totalProfiles > 0
      ? Object.entries(styleCounts)
          .map(([style, count]) => `${style}: ${Math.round((count / totalProfiles) * 100)}%`)
          .join(', ')
      : 'Perfis não mapeados';

    // Format gaps with IDs for the AI prompt (G01, G02, etc.)
    const gapsList = evidences
      .filter(e => e.evidence_type !== 'ponto_forte')
      .map(e => {
        const gapId = e.sequential_id ? `G${e.sequential_id.toString().padStart(2, '0')}` : 'G--';
        return `${gapId}: [${e.pilar.toUpperCase()}] ${e.content}${e.benchmark ? ` (Benchmark: ${e.benchmark})` : ''}`;
      })
      .join('\n');

    const strengthsList = evidences
      .filter(e => e.evidence_type === 'ponto_forte')
      .map(e => `- [${e.pilar.toUpperCase()}] ${e.content}`)
      .join('\n');

    // Call OpenAI for strategic planning with gap-aware prompt
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um consultor sênior de vendas B2B especializado em diagnósticos comerciais e transformação de times.

CONTEXTO DOS 5 PILARES:
- PESSOAS: DISC, Skills, Motivação, Liderança
- PROCESSOS: Fluxo de vendas, Cadência, Gargalos
- DADOS: KPIs, Metas, Conversão
- TECNOLOGIA: CRM, Stack, Automação
- GESTÃO: Rituais, Cultura, Alinhamento

REGRA CRÍTICA #1: As soluções DEVEM considerar a psicologia do time (perfil DISC).

REGRA CRÍTICA #2 - RASTREABILIDADE DE GAPS: 
Cada iniciativa DEVE listar EXPLICITAMENTE quais IDs de Gaps (G01, G02, G03...) ela resolve.
Isso permite rastreabilidade entre problemas identificados e soluções propostas.

REGRA CRÍTICA #3 - FERRAMENTAS EXISTENTES: 
Se o contexto menciona que JÁ USAM uma ferramenta (HubSpot, Pipedrive, Salesforce, etc.), 
você NUNCA deve sugerir "Implementar" ou "Adquirir" essa ferramenta. 
Sugira: "Auditoria de", "Otimização de", "Treinamento de", "Integração de".

REGRA CRÍTICA #4 - IMPACTO ESPERADO:
Use setas (↑ ↓) para indicar métricas afetadas. Exemplos:
- "↑ Conversão / ↓ Ciclo de Vendas"
- "↑ Previsibilidade / ↓ Churn"
- "↑ Produtividade / ↑ Engajamento"

RESPONDA EM JSON VÁLIDO:
{
  "teamInsight": "Resumo de 2-3 frases sobre o perfil do time e como isso impacta as soluções",
  "initiatives": [
    {
      "id": "IE01",
      "title": "Título curto e acionável",
      "related_gaps": ["G01", "G03"],
      "strategy": "Descrição tática de 2-3 frases do que fazer",
      "expected_impact": "↑ Conversão / ↓ Ciclo de Vendas",
      "effort": "low" | "medium" | "high",
      "target_pilar": "pessoas" | "processos" | "dados" | "tecnologia" | "gestao"
    }
  ]
}

Gere de 3 a 6 iniciativas estratégicas. Cada iniciativa pode atacar múltiplos gaps relacionados.
Priorize por impacto/esforço (Quick Wins primeiro).`
          },
          {
            role: 'user',
            content: `Gere um plano estratégico para este diagnóstico comercial.

CONTEXTO OBRIGATÓRIO DA EMPRESA:
${projectContext}

OBJETIVOS DO PROJETO:
${projectGoals}

STACK TECNOLÓGICO E DORES IDENTIFICADAS:
${projectPainPoints}

PERFIL DO TIME:
${teamProfileDescription}
${collaborators?.length ? `\nColaboradores: ${collaborators.map(c => `${c.name} (${c.primary_style || 'sem perfil'})`).join(', ')}` : ''}

GAPS IDENTIFICADOS (Evidências Validadas com IDs):
${gapsList || 'Nenhum gap específico identificado'}

PONTOS FORTES:
${strengthsList || 'Nenhum ponto forte identificado'}

IMPORTANTE: 
1. Liste quais IDs de Gaps (G01, G02...) cada iniciativa resolve no campo "related_gaps"
2. Use setas (↑ ↓) no campo "expected_impact" para indicar métricas afetadas
3. Considere o perfil comportamental do time ao propor soluções`
          }
        ],
        temperature: 0.6,
        response_format: { type: "json_object" }
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate strategic plan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const plan = JSON.parse(openaiData.choices[0].message.content);

    console.log('Generated plan:', plan);

    // Save initiatives to database with new fields
    const initiativesToInsert = plan.initiatives.map((init: GeneratedInitiative, index: number) => ({
      project_id: projectId,
      title: init.title,
      description: init.strategy,
      reasoning: null, // We now use description for strategy
      impact: 'medium', // Default, the AI focus is on expected_impact text
      effort: init.effort,
      status: 'draft',
      target_pilar: init.target_pilar || null,
      related_gaps: init.related_gaps || [],
      expected_impact: init.expected_impact || null,
      // sequential_id is auto-generated by trigger
    }));

    const { data: savedInitiatives, error: insertError } = await supabase
      .from('initiatives')
      .insert(initiativesToInsert)
      .select();

    if (insertError) {
      console.error('Error saving initiatives:', insertError);
      // Don't throw - return the generated plan anyway
    }

    return new Response(
      JSON.stringify({
        teamInsight: plan.teamInsight,
        initiatives: savedInitiatives || initiativesToInsert,
        stats: {
          validatedEvidences: evidences.length,
          collaborators: collaborators?.length || 0,
          teamProfile: styleCounts,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in generate-strategic-plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
