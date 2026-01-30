import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CONSOLIDATION_PROMPT = `Você é um editor de evidências de diagnóstico comercial.

Analise estas evidências e identifique GRUPOS que dizem semanticamente a mesma coisa.
Para cada grupo de duplicatas:
1. Escolha a frase MAIS COMPLETA e bem escrita para representar o grupo (a "vencedora")
2. Liste os IDs das evidências redundantes que devem ser arquivadas

REGRAS:
- Duas evidências são duplicatas se comunicam o MESMO INSIGHT, mesmo com palavras diferentes
- "Time não usa CRM" e "Equipe evita preencher o sistema" são DUPLICATAS
- "Time não usa CRM" e "CRM tem poucos campos" são DIFERENTES (problemas distintos)
- "Meta de 30 reuniões" e "Meta mensal é 30 meetings" são DUPLICATAS
- Quando em dúvida, NÃO consolide
- Só agrupe se tiver CERTEZA de que são a mesma informação
- Evidências de pilares diferentes NUNCA são duplicatas

Responda APENAS com JSON válido, sem markdown:
{
  "consolidations": [
    {
      "winner_id": "uuid-da-vencedora",
      "redundant_ids": ["uuid-1", "uuid-2"],
      "reason": "Breve explicação de por que são duplicatas"
    }
  ]
}`;

interface Evidence {
  id: string;
  content: string;
  pilar: string;
}

interface ConsolidationGroup {
  winner_id: string;
  redundant_ids: string[];
  reason: string;
}

interface ConsolidationResult {
  consolidations: ConsolidationGroup[];
}

// Process evidences in batches by pilar
async function processEvidencesByPilar(
  evidences: Evidence[],
  openaiApiKey: string
): Promise<ConsolidationResult> {
  // Group by pilar to reduce context and improve accuracy
  const byPilar: Record<string, Evidence[]> = {};
  for (const ev of evidences) {
    if (!byPilar[ev.pilar]) byPilar[ev.pilar] = [];
    byPilar[ev.pilar].push(ev);
  }

  const allConsolidations: ConsolidationGroup[] = [];

  for (const [pilar, pilarEvidences] of Object.entries(byPilar)) {
    // Skip if less than 2 evidences in this pilar
    if (pilarEvidences.length < 2) continue;

    console.log(`Processing ${pilarEvidences.length} evidences in pilar: ${pilar}`);

    // Format evidences for the prompt
    const evidenceList = pilarEvidences.map(ev => 
      `ID: ${ev.id}\nConteúdo: ${ev.content}`
    ).join('\n\n');

    const userPrompt = `Pilar: ${pilar.toUpperCase()}\n\nEvidências para analisar:\n\n${evidenceList}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: CONSOLIDATION_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenAI error for pilar ${pilar}:`, errorText);
        continue;
      }

      const completion = await response.json();
      const content = completion.choices?.[0]?.message?.content;

      if (!content) {
        console.error(`No content in response for pilar ${pilar}`);
        continue;
      }

      try {
        const result: ConsolidationResult = JSON.parse(content);
        if (result.consolidations && Array.isArray(result.consolidations)) {
          // Validate that all IDs exist in our evidence list
          const validIds = new Set(pilarEvidences.map(e => e.id));
          
          for (const group of result.consolidations) {
            if (!validIds.has(group.winner_id)) {
              console.warn(`Invalid winner_id: ${group.winner_id}`);
              continue;
            }
            
            const validRedundantIds = group.redundant_ids.filter(id => validIds.has(id));
            if (validRedundantIds.length > 0) {
              allConsolidations.push({
                ...group,
                redundant_ids: validRedundantIds
              });
            }
          }
        }
      } catch (parseError) {
        console.error(`Failed to parse response for pilar ${pilar}:`, parseError);
      }

    } catch (error) {
      console.error(`Error processing pilar ${pilar}:`, error);
    }
  }

  return { consolidations: allConsolidations };
}

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
    const userId = claimsData.claims.sub;

    const { projectId } = await req.json();

    if (!projectId || typeof projectId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'projectId is required' }),
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

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Use service role for database operations
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch all evidences that can be consolidated (pendente or validado)
    const { data: evidences, error: fetchError } = await supabase
      .from('evidences')
      .select('id, content, pilar')
      .eq('project_id', projectId)
      .in('status', ['pendente', 'validado'])
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching evidences:', fetchError);
      throw new Error('Failed to fetch evidences');
    }

    if (!evidences || evidences.length < 5) {
      return new Response(
        JSON.stringify({ 
          error: 'Poucas evidências para consolidar (mínimo: 5)',
          stats: { total_analyzed: evidences?.length || 0, groups_found: 0, evidences_archived: 0 }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing ${evidences.length} evidences for consolidation`);

    // Process evidences by pilar
    const result = await processEvidencesByPilar(evidences, OPENAI_API_KEY);

    // Collect all redundant IDs to archive
    const redundantIds: string[] = [];
    for (const group of result.consolidations) {
      redundantIds.push(...group.redundant_ids);
    }

    // Update redundant evidences to 'rejeitado' status
    if (redundantIds.length > 0) {
      const { error: updateError } = await supabase
        .from('evidences')
        .update({ status: 'rejeitado', notes: 'Consolidada automaticamente pela IA' })
        .in('id', redundantIds);

      if (updateError) {
        console.error('Error updating evidences:', updateError);
        throw new Error('Failed to archive redundant evidences');
      }

      console.log(`Archived ${redundantIds.length} redundant evidences`);
    }

    const stats = {
      total_analyzed: evidences.length,
      groups_found: result.consolidations.length,
      evidences_archived: redundantIds.length
    };

    console.log('Consolidation complete:', stats);

    return new Response(
      JSON.stringify({ 
        success: true,
        consolidations: result.consolidations,
        stats 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in consolidate-evidences:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
