import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Initiative {
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  reasoning: string;
  target_pilar?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Missing projectId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch validated evidences
    const { data: evidences, error: evidencesError } = await supabase
      .from('evidences')
      .select('content, pilar, is_divergence, evidence_type')
      .eq('project_id', projectId)
      .eq('status', 'validado');

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

    // Format evidences for prompt
    const problemsList = evidences
      .filter(e => e.evidence_type !== 'ponto_forte')
      .map(e => `- [${e.pilar.toUpperCase()}] ${e.content}`)
      .join('\n');

    const strengthsList = evidences
      .filter(e => e.evidence_type === 'ponto_forte')
      .map(e => `- [${e.pilar.toUpperCase()}] ${e.content}`)
      .join('\n');

    // Call OpenAI for strategic planning
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

REGRA CRÍTICA: As soluções DEVEM considerar a psicologia do time (perfil DISC).

EXEMPLOS DE CRUZAMENTO:
- Problema: "Falta de preenchimento de CRM" + Time "Alto I" 
  → Solução: Gamificação com ranking, não cobrança formal
  
- Problema: "Reuniões improdutivas" + Time "Alto D"
  → Solução: Reuniões curtas com pauta fechada e decisões rápidas
  
- Problema: "Resistência a mudanças" + Time "Alto S"
  → Solução: Mudanças graduais com muito suporte e treinamento
  
- Problema: "Forecast impreciso" + Time "Alto C"
  → Solução: Ferramenta com campos estruturados e regras claras

RESPONDA EM JSON VÁLIDO:
{
  "teamInsight": "Resumo de 2-3 frases sobre o perfil do time e como isso impacta as soluções",
  "initiatives": [
    {
      "title": "Título curto e acionável",
      "description": "Descrição de 2-3 frases do que fazer",
      "impact": "low" | "medium" | "high",
      "effort": "low" | "medium" | "high",
      "reasoning": "Por que essa solução funciona para esse perfil de time",
      "target_pilar": "pessoas" | "processos" | "dados" | "tecnologia" | "gestao"
    }
  ]
}

Gere de 3 a 5 iniciativas estratégicas priorizadas por impacto/esforço.`
          },
          {
            role: 'user',
            content: `Gere um plano estratégico para este diagnóstico comercial.

PERFIL DO TIME:
${teamProfileDescription}
${collaborators?.length ? `\nColaboradores: ${collaborators.map(c => `${c.name} (${c.primary_style || 'sem perfil'})`).join(', ')}` : ''}

PROBLEMAS IDENTIFICADOS (Evidências Validadas):
${problemsList || 'Nenhum problema específico identificado'}

PONTOS FORTES:
${strengthsList || 'Nenhum ponto forte identificado'}

Considere o perfil comportamental do time ao propor soluções.`
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

    // Save initiatives to database
    const initiativesToInsert = plan.initiatives.map((init: Initiative) => ({
      project_id: projectId,
      title: init.title,
      description: init.description,
      reasoning: init.reasoning,
      impact: init.impact,
      effort: init.effort,
      status: 'draft',
      target_pilar: init.target_pilar || null,
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

  } catch (error) {
    console.error('Error in generate-strategic-plan:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
