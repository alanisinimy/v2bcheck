import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEFAULT_PILARES = [
  { key: 'pessoas', label: 'Pessoas', peso: 1 },
  { key: 'processos', label: 'Processos', peso: 1 },
  { key: 'dados', label: 'Dados', peso: 1 },
  { key: 'tecnologia', label: 'Tecnologia', peso: 1 },
  { key: 'gestao', label: 'Gestão', peso: 1 },
];

interface PilarConfig { key: string; label: string; peso: number; }

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
    const userId = claimsData.claims.sub;

    const { projectId } = await req.json();
    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Missing projectId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify membership
    const { data: member, error: memberError } = await userClient
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Fetch project with pilares
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('client_context, main_pain_points, project_goals, pilares_config')
      .eq('id', projectId)
      .single();

    if (projectError) console.error('Error fetching project:', projectError);

    const pilares: PilarConfig[] = (project?.pilares_config as PilarConfig[]) || DEFAULT_PILARES;
    const totalPeso = pilares.reduce((sum, p) => sum + p.peso, 0);

    const projectContext = project?.client_context || 'Não informado';
    const projectPainPoints = project?.main_pain_points || 'Não informado';
    const projectGoals = project?.project_goals || 'Não informado';

    // Fetch validated evidences
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
      return new Response(JSON.stringify({
        error: 'Nenhuma evidência validada encontrada. Valide evidências na Matriz antes de gerar o plano.',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Team profile
    const styleCounts: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };
    collaborators?.forEach(c => { if (c.primary_style) styleCounts[c.primary_style]++; });
    const totalProfiles = Object.values(styleCounts).reduce((a, b) => a + b, 0);
    const teamProfileDescription = totalProfiles > 0
      ? Object.entries(styleCounts).map(([s, c]) => `${s}: ${Math.round((c / totalProfiles) * 100)}%`).join(', ')
      : 'Perfis não mapeados';

    // Build pilares context with weights
    const pilaresContext = pilares.map(p => {
      const pesoPct = totalPeso > 0 ? Math.round((p.peso / totalPeso) * 100) : 20;
      return `- ${p.key.toUpperCase()} (${p.label}) — Peso: ${pesoPct}%`;
    }).join('\n');

    // Format gaps
    const gapsList = evidences
      .filter(e => e.evidence_type !== 'ponto_forte')
      .map(e => {
        const gapId = e.sequential_id ? `G${e.sequential_id.toString().padStart(2, '0')}` : 'G--';
        return `${gapId}: [${e.pilar.toUpperCase()}] ${e.content}${e.benchmark ? ` (Benchmark: ${e.benchmark})` : ''}`;
      }).join('\n');

    const strengthsList = evidences
      .filter(e => e.evidence_type === 'ponto_forte')
      .map(e => `- [${e.pilar.toUpperCase()}] ${e.content}`)
      .join('\n');

    const pilarKeys = pilares.map(p => p.key);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `Você é um consultor sênior de vendas B2B especializado em diagnósticos comerciais.

PILARES DO PROJETO (com pesos de priorização):
${pilaresContext}

IMPORTANTE: Considere os PESOS dos pilares na priorização das iniciativas. Pilares com peso maior devem receber mais atenção.

REGRA CRÍTICA #1: As soluções DEVEM considerar a psicologia do time (perfil DISC).
REGRA CRÍTICA #2: Cada iniciativa DEVE listar quais IDs de Gaps (G01, G02...) ela resolve.
REGRA CRÍTICA #3: Se o contexto menciona ferramentas já usadas, sugira otimização, não implementação.
REGRA CRÍTICA #4: Use setas (↑ ↓) no expected_impact.

Gere de 3 a 6 iniciativas estratégicas. Quick Wins primeiro.`,
          },
          {
            role: 'user',
            content: `Gere um plano estratégico para este diagnóstico comercial.

CONTEXTO DA EMPRESA:
${projectContext}

OBJETIVOS:
${projectGoals}

STACK E DORES:
${projectPainPoints}

PERFIL DO TIME:
${teamProfileDescription}
${collaborators?.length ? `\nColaboradores: ${collaborators.map(c => `${c.name} (${c.primary_style || 'sem perfil'})`).join(', ')}` : ''}

GAPS (Evidências Validadas):
${gapsList || 'Nenhum gap'}

PONTOS FORTES:
${strengthsList || 'Nenhum ponto forte'}`,
          },
        ],
        temperature: 0.6,
        tools: [{
          type: 'function',
          function: {
            name: 'generate_plan',
            description: 'Gera plano estratégico com iniciativas',
            parameters: {
              type: 'object',
              properties: {
                teamInsight: { type: 'string', description: 'Resumo de 2-3 frases sobre o perfil do time' },
                initiatives: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: 'ID da iniciativa (IE01, IE02...)' },
                      title: { type: 'string' },
                      related_gaps: { type: 'array', items: { type: 'string' } },
                      strategy: { type: 'string' },
                      expected_impact: { type: 'string' },
                      effort: { type: 'string', enum: ['low', 'medium', 'high'] },
                      target_pilar: { type: 'string', enum: pilarKeys },
                    },
                    required: ['id', 'title', 'related_gaps', 'strategy', 'expected_impact', 'effort'],
                  },
                },
              },
              required: ['teamInsight', 'initiatives'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'generate_plan' } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Failed to generate strategic plan');
    }

    const completion = await aiResponse.json();
    const toolCall = completion.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) throw new Error('Unexpected AI response');

    let plan: { teamInsight: string; initiatives: any[] };
    try {
      plan = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error('Failed to parse AI response');
    }

    // Save initiatives
    const initiativesToInsert = plan.initiatives.map((init: any) => ({
      project_id: projectId,
      title: init.title,
      description: init.strategy,
      reasoning: null,
      impact: 'medium' as const,
      effort: init.effort || 'medium',
      status: 'draft' as const,
      target_pilar: pilarKeys.includes(init.target_pilar) ? init.target_pilar : null,
      related_gaps: init.related_gaps || [],
      expected_impact: init.expected_impact || null,
    }));

    const { data: savedInitiatives, error: insertError } = await supabase
      .from('initiatives')
      .insert(initiativesToInsert)
      .select();

    if (insertError) console.error('Error saving initiatives:', insertError);

    // Log activity
    await supabase.from('activity_log').insert({
      project_id: projectId,
      actor_type: 'ia',
      actor_name: 'IA',
      action: 'plan_generated',
      description: `gerou plano com ${plan.initiatives.length} iniciativas estratégicas`,
      metadata: { initiatives_count: plan.initiatives.length, evidences_used: evidences.length },
    }).catch(e => console.error('Activity log error:', e));

    return new Response(JSON.stringify({
      teamInsight: plan.teamInsight,
      initiatives: savedInitiatives || initiativesToInsert,
      stats: {
        validatedEvidences: evidences.length,
        collaborators: collaborators?.length || 0,
        teamProfile: styleCounts,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in generate-strategic-plan:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
