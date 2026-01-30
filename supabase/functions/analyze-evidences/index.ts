import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `Você é um Auditor Sênior de Vendas B2B. Sua função é extrair evidências factuais de textos para um diagnóstico comercial.

Analise o texto e extraia itens classificando-os em 5 Pilares:
1. Pessoas (Perfil, Skills, Motivação)
2. Processos (Fluxo, Gargalos, Cadência)
3. Dados (KPIs, Metas, Conversão)
4. Tecnologia (CRM, Ferramentas)
5. Gestão & Cultura (Rituais, Crenças)

REGRAS:
- Seja factual e direto
- Se houver contradição explícita, marque is_divergence=true
- Classifique cada evidência corretamente no pilar apropriado
- Extraia TODAS as evidências relevantes do texto`;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();

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

    console.log('Calling OpenAI API to analyze content...');
    console.log('Content length:', content.length);

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Analise este texto e extraia as evidências:\n\n${content}` }
        ],
        temperature: 0.2,
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_evidences',
              description: 'Extraia evidências estruturadas do texto analisado',
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
                          description: 'Descrição clara e factual da evidência em pt-BR'
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
