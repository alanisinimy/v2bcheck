import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ExtractedContext {
  client_context: string;
  main_pain_points: string;
  project_goals: string;
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

    console.log('Fetching assets for project:', projectId);

    // Fetch text assets from the project (excluding DISC profiles)
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, file_name, storage_path, file_type, source_type, created_at')
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .neq('source_type', 'perfil_disc')
      .order('created_at', { ascending: false });

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      throw assetsError;
    }

    console.log('Found assets:', assets?.length);

    // Filter only text-based files
    const textExtensions = ['.txt', '.md', '.csv'];
    const textAssets = assets?.filter(asset => {
      const fileName = asset.file_name.toLowerCase();
      return textExtensions.some(ext => fileName.endsWith(ext)) || 
             asset.file_type === 'text/plain' ||
             asset.file_type === 'text/markdown' ||
             asset.file_type === 'text/csv';
    }) || [];

    console.log('Text assets found:', textAssets.length);

    if (textAssets.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Nenhuma transcrição encontrada. Faça upload de reuniões no Vault.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download and concatenate text content
    let allContent = '';
    const maxChars = 50000; // ~12.5k tokens for gpt-4o-mini

    for (const asset of textAssets) {
      if (allContent.length >= maxChars) {
        console.log('Reached max character limit, stopping');
        break;
      }

      try {
        console.log('Downloading:', asset.storage_path);
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from('project-files')
          .download(asset.storage_path);

        if (downloadError) {
          console.error('Error downloading file:', asset.storage_path, downloadError);
          continue;
        }

        if (fileData) {
          const text = await fileData.text();
          const remainingChars = maxChars - allContent.length;
          const textToAdd = text.substring(0, remainingChars);
          
          allContent += `\n\n=== ${asset.file_name} ===\n${textToAdd}`;
          console.log('Added content from:', asset.file_name, '- chars:', textToAdd.length);
        }
      } catch (err) {
        console.error('Error processing file:', asset.storage_path, err);
        continue;
      }
    }

    console.log('Total content length:', allContent.length);

    if (allContent.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Não foi possível ler o conteúdo dos arquivos. Verifique os uploads.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call OpenAI to extract context
    console.log('Calling OpenAI for context extraction...');
    
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
            content: `Você é um Auditor Sênior de Diagnóstico Comercial.

Sua tarefa é ler todas as transcrições de reuniões de um projeto de consultoria e extrair um resumo executivo factual.

REGRA CRÍTICA: Seja 100% factual. Extraia APENAS informações explicitamente mencionadas nas transcrições. Não invente dados.

Extraia informações para preencher 3 campos:

1. CONTEXTO DA EMPRESA:
   - O que a empresa faz (produto/serviço)
   - Tempo de mercado / tamanho do time
   - Modelo de venda (Inside Sales, Field Sales, PLG, híbrido)
   - Segmento de atuação e ticket médio (se mencionado)
   - Estrutura do time comercial

2. STACK TECNOLÓGICO & PROCESSOS:
   - Liste TODAS as ferramentas citadas (CRM, ERP, planilhas, etc)
   - Como cada ferramenta é usada atualmente
   - Integrações existentes ou desejadas
   - Ferramentas sendo avaliadas ou que querem implementar
   - Processos existentes de vendas, reuniões, follow-ups

3. DORES LATENTES:
   - Problemas citados repetidamente nas reuniões
   - Frustrações mencionadas pelo time ou gestão
   - Gaps identificados entre o estado atual e desejado
   - Metas não atingidas ou desafios recorrentes

Se alguma categoria não tiver informação suficiente, escreva "Não identificado nas transcrições."

Responda APENAS em JSON válido:
{
  "client_context": "Texto resumido do contexto da empresa...",
  "main_pain_points": "Lista das principais dores identificadas...",
  "project_goals": "Objetivos inferidos a partir das dores e contexto..."
}`
          },
          {
            role: 'user',
            content: `Analise as seguintes transcrições de reuniões e extraia o contexto executivo:

${allContent}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Falha ao processar transcrições com IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const extractedContext: ExtractedContext = JSON.parse(openaiData.choices[0].message.content);

    console.log('Extracted context:', extractedContext);

    // Save to projects table
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        client_context: extractedContext.client_context,
        main_pain_points: extractedContext.main_pain_points,
        project_goals: extractedContext.project_goals,
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Error updating project:', updateError);
      // Return the extracted context anyway
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...extractedContext,
        stats: {
          filesProcessed: textAssets.length,
          charactersAnalyzed: allContent.length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in extract-project-context:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
