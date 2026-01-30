import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { projectId, collaboratorId, collaboratorName } = await req.json();

    if (!projectId || !collaboratorId || !collaboratorName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
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

    // Fetch all evidences from the project to analyze verbal patterns
    const { data: evidences, error: evidencesError } = await supabase
      .from('evidences')
      .select('content, source_description')
      .eq('project_id', projectId);

    if (evidencesError) {
      throw evidencesError;
    }

    // Build context from evidences mentioning the person
    const relevantContent = evidences
      ?.filter(e => 
        e.content?.toLowerCase().includes(collaboratorName.toLowerCase()) ||
        e.source_description?.toLowerCase().includes(collaboratorName.toLowerCase())
      )
      .map(e => e.content)
      .join('\n\n') || '';

    // If no specific mentions, use all evidences as context
    const contextContent = relevantContent || evidences?.map(e => e.content).join('\n\n').slice(0, 10000) || '';

    if (!contextContent) {
      return new Response(
        JSON.stringify({ error: 'Não há evidências suficientes para inferir o perfil' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call OpenAI to infer DISC profile
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
            content: `Você é um especialista em análise comportamental DISC. Sua tarefa é inferir o perfil DISC de uma pessoa baseado em padrões de comportamento verbal identificados em transcrições de reuniões e entrevistas.

INDICADORES COMPORTAMENTAIS:

D (Dominância) - Alto quando a pessoa:
- Toma decisões rápidas
- É direta e assertiva
- Foca em resultados
- Desafia o status quo
- Usa linguagem imperativa

I (Influência) - Alto quando a pessoa:
- Conta histórias e usa exemplos
- É entusiasta e expressiva
- Valoriza relacionamentos
- Usa humor e informalidade
- Fala sobre pessoas e conexões

S (Estabilidade) - Alto quando a pessoa:
- É paciente e ouve atentamente
- Evita conflitos
- Valoriza harmonia do time
- Resiste a mudanças bruscas
- Faz perguntas de confirmação

C (Conformidade) - Alto quando a pessoa:
- Faz perguntas detalhadas
- Pede dados e evidências
- É cautelosa nas decisões
- Valoriza qualidade e precisão
- Usa linguagem técnica

RESPONDA SOMENTE EM JSON VÁLIDO:
{
  "disc_profile": {
    "dom": 0-100,
    "inf": 0-100,
    "est": 0-100,
    "conf": 0-100
  },
  "primary_style": "D" | "I" | "S" | "C",
  "reasoning": "Explicação de 2-3 frases sobre os padrões observados",
  "confidence": 0-100
}`
          },
          {
            role: 'user',
            content: `Analise os padrões de comportamento de "${collaboratorName}" baseado nestas evidências coletadas do projeto:\n\n${contextContent.slice(0, 8000)}`
          }
        ],
        temperature: 0.4,
        response_format: { type: "json_object" }
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to infer DISC profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const inferred = JSON.parse(openaiData.choices[0].message.content);

    console.log('Inferred DISC profile:', inferred);

    // Update collaborator with inferred profile
    const { data: collaborator, error: updateError } = await supabase
      .from('collaborators')
      .update({
        disc_profile: inferred.disc_profile,
        primary_style: inferred.primary_style,
        profile_source: 'ai_inferred',
      })
      .eq('id', collaboratorId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating collaborator:', updateError);
      throw updateError;
    }

    // Create evidence about the inference
    const styleNames: Record<string, string> = {
      'D': 'Dominante',
      'I': 'Comunicador',
      'S': 'Estável',
      'C': 'Analítico'
    };
    
    const styleName = styleNames[inferred.primary_style] || inferred.primary_style;
    
    await supabase
      .from('evidences')
      .insert({
        project_id: projectId,
        pilar: 'pessoas',
        content: `Perfil de ${collaboratorName} inferido via IA como ${styleName} (${inferred.primary_style}). ${inferred.reasoning}`,
        source_description: `🕵️ Inferência IA • ${collaboratorName}`,
        status: 'pendente',
        is_divergence: false,
        evidence_type: 'fato',
      });

    return new Response(
      JSON.stringify({
        collaborator,
        inferred,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in infer-disc-profile:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
