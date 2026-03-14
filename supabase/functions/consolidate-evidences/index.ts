import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

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

interface ConsolidationGroup {
  winner_id: string;
  redundant_ids: string[];
  reason: string;
}

interface Evidence {
  id: string;
  content: string;
  pilar: string;
  status: string;
}

const CONSOLIDATION_PROMPT = `Você é um editor de evidências de diagnóstico comercial.

Analise estas evidências e identifique GRUPOS que dizem semanticamente a mesma coisa.
Para cada grupo de duplicatas:
1. Escolha a frase MAIS COMPLETA e bem escrita para representar o grupo (a "vencedora")
2. Liste os IDs das evidências redundantes que devem ser arquivadas

REGRAS:
- Duas evidências são duplicatas se comunicam o MESMO INSIGHT, mesmo com palavras diferentes
- "Time não usa CRM" e "Equipe evita preencher o sistema" são DUPLICATAS
- "Time não usa CRM" e "CRM tem poucos campos" são DIFERENTES
- Quando em dúvida, NÃO consolide
- Evidências de pilares diferentes NUNCA são duplicatas`;

async function processEvidencesByPilar(
  evidences: Evidence[],
  apiKey: string,
): Promise<ConsolidationGroup[]> {
  const byPilar: Record<string, Evidence[]> = {};
  for (const ev of evidences) {
    if (!byPilar[ev.pilar]) byPilar[ev.pilar] = [];
    byPilar[ev.pilar].push(ev);
  }

  const allConsolidations: ConsolidationGroup[] = [];

  for (const [pilar, pilarEvidences] of Object.entries(byPilar)) {
    if (pilarEvidences.length < 2) continue;

    const evidenceList = pilarEvidences.map(ev =>
      `ID: ${ev.id}\nConteúdo: ${ev.content}`
    ).join('\n\n');

    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: CONSOLIDATION_PROMPT },
            { role: 'user', content: `Pilar: ${pilar.toUpperCase()}\n\nEvidências:\n\n${evidenceList}` },
          ],
          temperature: 0.1,
          tools: [{
            type: 'function',
            function: {
              name: 'consolidate',
              description: 'Retorna grupos de evidências duplicatas',
              parameters: {
                type: 'object',
                properties: {
                  consolidations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        winner_id: { type: 'string' },
                        redundant_ids: { type: 'array', items: { type: 'string' } },
                        reason: { type: 'string' },
                      },
                      required: ['winner_id', 'redundant_ids', 'reason'],
                    },
                  },
                },
                required: ['consolidations'],
              },
            },
          }],
          tool_choice: { type: 'function', function: { name: 'consolidate' } },
        }),
      });

      if (!response.ok) {
        console.error(`AI error for pilar ${pilar}:`, response.status);
        continue;
      }

      const completion = await response.json();
      const toolCall = completion.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) continue;

      const result = JSON.parse(toolCall.function.arguments);
      const validIds = new Set(pilarEvidences.map(e => e.id));

      for (const group of result.consolidations || []) {
        if (!validIds.has(group.winner_id)) continue;
        const validRedundant = group.redundant_ids.filter((id: string) => validIds.has(id));
        if (validRedundant.length > 0) {
          allConsolidations.push({ ...group, redundant_ids: validRedundant });
        }
      }
    } catch (error) {
      console.error(`Error processing pilar ${pilar}:`, error);
    }
  }

  return allConsolidations;
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
    const userId = claimsData.claims.sub;

    const { projectId } = await req.json();
    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), {
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

    // Fetch evidences
    const { data: evidences, error: fetchError } = await supabase
      .from('evidences')
      .select('id, content, pilar, status')
      .eq('project_id', projectId)
      .in('status', ['pendente', 'validado'])
      .order('created_at', { ascending: true });

    if (fetchError) throw new Error('Failed to fetch evidences');

    if (!evidences || evidences.length < 5) {
      return new Response(JSON.stringify({
        error: 'Poucas evidências para consolidar (mínimo: 5)',
        stats: { total_analyzed: evidences?.length || 0, groups_found: 0, evidences_archived: 0 },
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch pilares config
    const { data: project } = await supabase
      .from('projects')
      .select('pilares_config')
      .eq('id', projectId)
      .single();

    const pilares: PilarConfig[] = (project?.pilares_config as PilarConfig[]) || DEFAULT_PILARES;
    const totalPeso = pilares.reduce((sum, p) => sum + p.peso, 0);

    console.log(`Analyzing ${evidences.length} evidences for consolidation`);

    const consolidations = await processEvidencesByPilar(evidences, LOVABLE_API_KEY);

    // Archive redundant
    const redundantIds: string[] = [];
    for (const group of consolidations) {
      redundantIds.push(...group.redundant_ids);
    }

    if (redundantIds.length > 0) {
      const { error: updateError } = await supabase
        .from('evidences')
        .update({ status: 'rejeitado', notes: 'Consolidada automaticamente pela IA' })
        .in('id', redundantIds);

      if (updateError) throw new Error('Failed to archive redundant evidences');
    }

    // Calculate coverage per pilar
    const activeEvidences = evidences.filter(e => !redundantIds.includes(e.id));
    const cobertura_por_pilar = pilares.map(p => {
      const pilarEvs = activeEvidences.filter(e => e.pilar === p.key);
      const validated = pilarEvs.filter(e => e.status === 'validado').length;
      const total = pilarEvs.length;
      const pesoPct = totalPeso > 0 ? (p.peso / totalPeso) * 100 : 0;
      const expectedMin = Math.max(2, Math.round((p.peso / totalPeso) * activeEvidences.length * 0.5));
      const cobertura_pct = expectedMin > 0 ? Math.min(100, Math.round((total / expectedMin) * 100)) : 0;

      return {
        pilar: p.key,
        label: p.label,
        peso: p.peso,
        peso_pct: Math.round(pesoPct),
        gaps_count: total,
        validados_count: validated,
        cobertura_pct,
        status: cobertura_pct >= 60 ? 'adequada' as const : cobertura_pct >= 30 ? 'parcial' as const : 'insuficiente' as const,
      };
    });

    const alertas: string[] = [];
    for (const cob of cobertura_por_pilar) {
      if (cob.status === 'insuficiente' && cob.peso > 0) {
        alertas.push(`Pilar "${cob.label}" com cobertura insuficiente (${cob.cobertura_pct}%)`);
      }
    }

    // Log activity
    await supabase.from('activity_log').insert({
      project_id: projectId,
      actor_type: 'ia',
      actor_name: 'IA',
      action: 'evidences_consolidated',
      description: `consolidou ${evidences.length} evidências, arquivou ${redundantIds.length} duplicatas`,
      metadata: {
        total_analyzed: evidences.length,
        groups_found: consolidations.length,
        evidences_archived: redundantIds.length,
      },
    }).catch(e => console.error('Activity log error:', e));

    const stats = {
      total_analyzed: evidences.length,
      groups_found: consolidations.length,
      evidences_archived: redundantIds.length,
    };

    return new Response(JSON.stringify({
      success: true,
      consolidations,
      stats,
      cobertura_por_pilar,
      alertas,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in consolidate-evidences:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
