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

interface PilarConfig {
  key: string;
  label: string;
  peso: number;
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

    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: 'project_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify membership
    const { data: member, error: memberError } = await userClient
      .from('project_members')
      .select('role')
      .eq('project_id', project_id)
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

    // Fetch active gaps
    const { data: gaps, error: gapsError } = await supabase
      .from('evidences')
      .select('id, content, pilar, status, criticality, is_divergence')
      .eq('project_id', project_id)
      .in('status', ['pendente', 'validado'])
      .order('created_at', { ascending: true });

    if (gapsError) throw gapsError;

    if (!gaps || gaps.length < 3) {
      return new Response(JSON.stringify({
        error: 'Mínimo de 3 gaps para validação',
        stats: { total_analyzed: gaps?.length || 0 }
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch pilares config
    const { data: project } = await supabase
      .from('projects')
      .select('pilares_config')
      .eq('id', project_id)
      .single();

    const pilares: PilarConfig[] = (project?.pilares_config as PilarConfig[]) || DEFAULT_PILARES;
    const totalPeso = pilares.reduce((sum, p) => sum + p.peso, 0);

    // Group by pilar for analysis
    const byPilar: Record<string, typeof gaps> = {};
    for (const gap of gaps) {
      if (!byPilar[gap.pilar]) byPilar[gap.pilar] = [];
      byPilar[gap.pilar].push(gap);
    }

    // Format for AI
    const gapsList = gaps.map(g =>
      `ID: ${g.id}\nPilar: ${g.pilar}\nConteúdo: ${g.content}\nStatus: ${g.status}`
    ).join('\n\n');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um validador de gaps de diagnóstico comercial B2B.

TAREFA: Analise os gaps e identifique:
1. DUPLICATAS SEMÂNTICAS: gaps que dizem a mesma coisa com palavras diferentes (MESMO PILAR APENAS)
2. CONTRADIÇÕES: gaps que se contradizem entre si (informações conflitantes)

REGRAS:
- Dois gaps são duplicatas APENAS se comunicam o MESMO insight no MESMO pilar
- Uma contradição é quando dois gaps afirmam coisas opostas
- Quando em dúvida, NÃO marque como duplicata
- Gaps de pilares diferentes NUNCA são duplicatas`,
          },
          { role: 'user', content: `Analise estes ${gaps.length} gaps:\n\n${gapsList}` },
        ],
        temperature: 0.1,
        tools: [{
          type: 'function',
          function: {
            name: 'validate_gaps',
            description: 'Retorna duplicatas e contradições encontradas',
            parameters: {
              type: 'object',
              properties: {
                duplicates: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      keep_id: { type: 'string', description: 'ID do gap a manter (mais completo)' },
                      remove_ids: { type: 'array', items: { type: 'string' }, description: 'IDs dos duplicados a arquivar' },
                      reason: { type: 'string' },
                    },
                    required: ['keep_id', 'remove_ids', 'reason'],
                  },
                },
                contradictions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      gap_ids: { type: 'array', items: { type: 'string' } },
                      description: { type: 'string' },
                    },
                    required: ['gap_ids', 'description'],
                  },
                },
              },
              required: ['duplicates', 'contradictions'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'validate_gaps' } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errText);
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
      throw new Error('AI processing failed');
    }

    const completion = await aiResponse.json();
    const toolCall = completion.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) throw new Error('Unexpected AI response');

    let result: {
      duplicates: { keep_id: string; remove_ids: string[]; reason: string }[];
      contradictions: { gap_ids: string[]; description: string }[];
    };

    try {
      result = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error('Failed to parse AI response');
    }

    // Validate IDs exist
    const validIds = new Set(gaps.map(g => g.id));
    const validDuplicates = result.duplicates.filter(d =>
      validIds.has(d.keep_id) && d.remove_ids.every(id => validIds.has(id))
    );

    // Archive duplicates
    const removedIds: string[] = [];
    for (const dup of validDuplicates) {
      const validRemoveIds = dup.remove_ids.filter(id => validIds.has(id));
      if (validRemoveIds.length > 0) {
        await supabase
          .from('evidences')
          .update({ status: 'rejeitado', return_reason: 'duplicata', notes: `Duplicata de gap mantido. Razão: ${dup.reason}` })
          .in('id', validRemoveIds);
        removedIds.push(...validRemoveIds);
      }
    }

    // Calculate coverage per pilar
    const activeGaps = gaps.filter(g => !removedIds.includes(g.id));
    const cobertura_por_pilar = pilares.map(p => {
      const pilarGaps = activeGaps.filter(g => g.pilar === p.key);
      const validated = pilarGaps.filter(g => g.status === 'validado').length;
      const total = pilarGaps.length;
      const pesoPct = (p.peso / totalPeso) * 100;
      const cobertura_pct = totalPeso > 0 ? Math.round((total / (gaps.length * (p.peso / totalPeso))) * 100) : 0;

      return {
        pilar: p.key,
        label: p.label,
        peso: p.peso,
        peso_pct: Math.round(pesoPct),
        gaps_count: total,
        validados_count: validated,
        cobertura_pct: Math.min(100, cobertura_pct),
        status: cobertura_pct >= 60 ? 'adequada' : cobertura_pct >= 30 ? 'parcial' : 'insuficiente',
      };
    });

    // Generate alerts
    const alertas: string[] = [];
    for (const cob of cobertura_por_pilar) {
      if (cob.status === 'insuficiente' && cob.peso > 0) {
        alertas.push(`Pilar "${cob.label}" tem cobertura insuficiente (${cob.cobertura_pct}%) — considere coletar mais dados`);
      }
    }
    if (result.contradictions.length > 0) {
      alertas.push(`${result.contradictions.length} contradição(ões) detectada(s) — requer investigação`);
    }

    // Log activity
    await supabase.from('activity_log').insert({
      project_id,
      actor_type: 'ia',
      actor_name: 'IA',
      action: 'gaps_validated',
      description: `validou ${gaps.length} gaps: ${removedIds.length} duplicatas removidas, ${result.contradictions.length} contradições`,
      metadata: { gaps_analyzed: gaps.length, duplicates_removed: removedIds.length, contradictions: result.contradictions.length },
    });

    return new Response(JSON.stringify({
      success: true,
      gaps_removidos: removedIds.length,
      duplicates: validDuplicates,
      contradictions: result.contradictions,
      cobertura_por_pilar,
      alertas,
      stats: {
        total_analyzed: gaps.length,
        duplicates_found: validDuplicates.length,
        gaps_removed: removedIds.length,
        contradictions_found: result.contradictions.length,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in validate-gaps:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
