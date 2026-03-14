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

interface Chunk {
  id: string;
  text: string;
  pilar: string;
  relevance: number;
}

async function updateQueueStatus(
  supabase: any,
  fileId: string,
  status: string,
  step: string,
  progress: number,
  errorMessage?: string,
) {
  const update: any = { status, step_atual: step, progress_pct: progress };
  if (status === 'processando' && progress === 0) update.started_at = new Date().toISOString();
  if (status === 'concluido' || status === 'erro') update.completed_at = new Date().toISOString();
  if (errorMessage) update.error_message = errorMessage;

  await supabase
    .from('processing_queue')
    .update(update)
    .eq('file_id', fileId);
}

function buildChunkingPrompt(pilares: PilarConfig[]): string {
  const pilarList = pilares.map(p => `- ${p.key}: ${p.label}`).join('\n');

  return `Você é um indexador de documentos para diagnóstico comercial B2B.

SUA TAREFA: Dividir o texto em chunks semânticos e classificar cada um por pilar.

PILARES DISPONÍVEIS:
${pilarList}

REGRAS:
1. Cada chunk deve ter entre 100 e 500 caracteres
2. Chunks devem ser semanticamente coesos (uma ideia por chunk)
3. Descarte trechos irrelevantes (cumprimentos, dados biográficos neutros, conversa fiada)
4. Classifique cada chunk no pilar MAIS RELEVANTE
5. Atribua uma relevância de 0.0 a 1.0 (1.0 = muito relevante para diagnóstico)
6. Chunks com relevância < 0.3 devem ser descartados
7. Máximo 30 chunks por documento`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userId = claimsData.claims.sub;

    const { file_id, project_id } = await req.json();

    if (!file_id || !project_id) {
      return new Response(
        JSON.stringify({ error: 'file_id and project_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify project membership
    const { data: member, error: memberError } = await userClient
      .from('project_members')
      .select('role')
      .eq('project_id', project_id)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: No access to this project' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Service role client for DB operations
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Step 1: Fetch asset
    await updateQueueStatus(supabase, file_id, 'processando', 'extraindo', 10);

    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, file_name, storage_path, extracted_text, file_type')
      .eq('id', file_id)
      .single();

    if (assetError || !asset) {
      await updateQueueStatus(supabase, file_id, 'erro', 'extraindo', 0, 'Asset not found');
      throw new Error('Asset not found');
    }

    // Step 2: Extract text (if not already extracted)
    let text = asset.extracted_text;
    if (!text) {
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('project-files')
          .download(asset.storage_path);

        if (downloadError || !fileData) {
          await updateQueueStatus(supabase, file_id, 'erro', 'extraindo', 0, 'Failed to download file');
          throw new Error('Failed to download file from storage');
        }

        text = await fileData.text();

        // Save extracted text
        await supabase
          .from('assets')
          .update({ extracted_text: text, processing_status: 'extraido' })
          .eq('id', file_id);
      } catch (e) {
        await updateQueueStatus(supabase, file_id, 'erro', 'extraindo', 0, `Extraction failed: ${e instanceof Error ? e.message : 'unknown'}`);
        throw e;
      }
    }

    if (!text || text.trim().length < 50) {
      await updateQueueStatus(supabase, file_id, 'erro', 'extraindo', 0, 'Insufficient text content');
      return new Response(
        JSON.stringify({ error: 'Texto insuficiente para processar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await updateQueueStatus(supabase, file_id, 'processando', 'classificando', 30);

    // Step 3: Fetch pilares_config
    const { data: project } = await supabase
      .from('projects')
      .select('pilares_config')
      .eq('id', project_id)
      .single();

    const pilares: PilarConfig[] = (project?.pilares_config as PilarConfig[]) || DEFAULT_PILARES;
    const pilarKeys = pilares.map(p => p.key);

    // Step 4: Call AI for chunking + classification
    const systemPrompt = buildChunkingPrompt(pilares);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analise e divida este texto em chunks semânticos classificados por pilar:\n\n${text.substring(0, 30000)}` }
        ],
        temperature: 0.2,
        tools: [{
          type: 'function',
          function: {
            name: 'save_chunks',
            description: 'Salva os chunks semânticos classificados por pilar',
            parameters: {
              type: 'object',
              properties: {
                chunks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: 'ID único do chunk (ex: chunk_01)' },
                      text: { type: 'string', description: 'Texto do chunk (100-500 chars)' },
                      pilar: { type: 'string', enum: pilarKeys },
                      relevance: { type: 'number', description: '0.0 a 1.0' },
                    },
                    required: ['id', 'text', 'pilar', 'relevance'],
                  },
                },
                primary_pilar: { type: 'string', enum: pilarKeys, description: 'Pilar com mais chunks relevantes' },
              },
              required: ['chunks', 'primary_pilar'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'save_chunks' } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errText);

      if (aiResponse.status === 429) {
        await updateQueueStatus(supabase, file_id, 'erro', 'classificando', 30, 'Rate limit exceeded');
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, try again later' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        await updateQueueStatus(supabase, file_id, 'erro', 'classificando', 30, 'AI credits depleted');
        return new Response(JSON.stringify({ error: 'AI credits depleted' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await updateQueueStatus(supabase, file_id, 'erro', 'classificando', 30, 'AI processing failed');
      throw new Error('AI processing failed');
    }

    const completion = await aiResponse.json();
    const toolCall = completion.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== 'save_chunks') {
      await updateQueueStatus(supabase, file_id, 'erro', 'classificando', 30, 'Unexpected AI response');
      throw new Error('Unexpected AI response format');
    }

    let parsed: { chunks: Chunk[]; primary_pilar: string };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      await updateQueueStatus(supabase, file_id, 'erro', 'classificando', 30, 'Failed to parse AI response');
      throw new Error('Failed to parse AI response');
    }

    // Validate pilar values
    const validChunks = parsed.chunks
      .filter(c => pilarKeys.includes(c.pilar) && c.relevance >= 0.3)
      .map(c => ({ ...c, relevance: Math.min(1, Math.max(0, c.relevance)) }));

    await updateQueueStatus(supabase, file_id, 'processando', 'indexando', 70);

    // Step 5: Save to database
    const primaryPilar = pilarKeys.includes(parsed.primary_pilar) ? parsed.primary_pilar : pilarKeys[0];

    await supabase
      .from('assets')
      .update({
        chunks: validChunks,
        pilar_classificado: primaryPilar,
        processing_status: 'indexado',
        status: 'completed',
      })
      .eq('id', file_id);

    // Step 6: Complete
    await updateQueueStatus(supabase, file_id, 'concluido', 'concluido', 100);

    // Log activity
    await supabase.from('activity_log').insert({
      project_id: project_id,
      actor_type: 'ia',
      actor_name: 'IA',
      action: 'file_indexed',
      description: `indexou "${asset.file_name}" com ${validChunks.length} chunks em ${Object.keys(validChunks.reduce((acc: Record<string, boolean>, c) => { acc[c.pilar] = true; return acc; }, {})).length} pilares`,
      metadata: { file_id, chunks_count: validChunks.length, primary_pilar: primaryPilar },
    });

    console.log(`Ingested ${validChunks.length} chunks for file ${asset.file_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        chunks_count: validChunks.length,
        primary_pilar: primaryPilar,
        file_name: asset.file_name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ingest-evidence:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
