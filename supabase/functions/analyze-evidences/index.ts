import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Calling Lovable AI Gateway to analyze content...');
    console.log('Content length:', content.length);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
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
                      required: ['content', 'pilar', 'is_divergence'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['evidences'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_evidences' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error('Payment required');
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add funds to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract tool call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_evidences') {
      console.error('Unexpected response format:', JSON.stringify(data));
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
