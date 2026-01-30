import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PeopleDataRequest {
  projectId: string;
  assetId: string;
  content: string;
  dataType: 'pesquisa_clima' | 'feedback_360';
}

interface CollaboratorClimateData {
  name: string;
  engagement_score?: number;
  satisfaction_score?: number;
  insights: string[];
}

interface AnalysisResult {
  collaborators: CollaboratorClimateData[];
  team_insights: string[];
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { projectId, assetId, content, dataType } = await req.json() as PeopleDataRequest;

    console.log(`[analyze-people-data] Processing ${dataType} for project ${projectId}`);

    if (!projectId || !content || !dataType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: projectId, content, dataType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get existing collaborators for the project
    const { data: existingCollaborators } = await supabase
      .from('collaborators')
      .select('id, name')
      .eq('project_id', projectId);

    console.log(`[analyze-people-data] Found ${existingCollaborators?.length || 0} existing collaborators`);

    // Call OpenAI to analyze the climate data
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const systemPrompt = `Você é um especialista em Recursos Humanos e Clima Organizacional.
Analise os dados fornecidos (CSV de pesquisa de clima ou feedback) e extraia:

1. COLABORADORES IDENTIFICADOS:
   - Nome do colaborador
   - Score de engajamento (0-100, se disponível)
   - Score de satisfação (0-100, se disponível)
   - Insights individuais relevantes

2. INSIGHTS DO TIME:
   - Padrões gerais identificados
   - Áreas de atenção
   - Pontos fortes culturais
   - Recomendações

REGRAS:
- Extraia APENAS informações presentes nos dados
- Não invente scores ou métricas
- Foque em insights acionáveis
- Se um colaborador já existe na lista fornecida, use o nome exatamente como está

Colaboradores existentes no projeto: ${JSON.stringify(existingCollaborators?.map(c => c.name) || [])}

Responda em JSON válido com a estrutura:
{
  "collaborators": [
    {
      "name": "string",
      "engagement_score": number | null,
      "satisfaction_score": number | null,
      "insights": ["string"]
    }
  ],
  "team_insights": ["string"]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Tipo de dados: ${dataType}\n\nConteúdo:\n${content}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[analyze-people-data] OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysisText = aiResponse.choices[0]?.message?.content;
    
    if (!analysisText) {
      throw new Error('Empty response from AI');
    }

    console.log('[analyze-people-data] AI analysis received');

    const analysis: AnalysisResult = JSON.parse(analysisText);
    
    let collaboratorsUpdated = 0;
    let newCollaborators = 0;

    // Process each identified collaborator
    for (const collabData of analysis.collaborators) {
      // Try to find existing collaborator by name (case-insensitive)
      const existing = existingCollaborators?.find(
        c => c.name.toLowerCase() === collabData.name.toLowerCase()
      );

      const climateMetadata = {
        climate_data: {
          engagement_score: collabData.engagement_score,
          satisfaction_score: collabData.satisfaction_score,
          insights: collabData.insights,
          updated_at: new Date().toISOString(),
        }
      };

      if (existing) {
        // Update existing collaborator with climate data
        const { error } = await supabase
          .from('collaborators')
          .update({
            disc_profile: climateMetadata,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (!error) {
          collaboratorsUpdated++;
          console.log(`[analyze-people-data] Updated collaborator: ${existing.name}`);
        }
      } else {
        // Create new collaborator with climate data
        const { error } = await supabase
          .from('collaborators')
          .insert({
            project_id: projectId,
            name: collabData.name,
            disc_profile: climateMetadata,
            profile_source: 'manual',
          });

        if (!error) {
          newCollaborators++;
          console.log(`[analyze-people-data] Created new collaborator: ${collabData.name}`);
        }
      }
    }

    // Update asset status if provided
    if (assetId) {
      await supabase
        .from('assets')
        .update({ status: 'completed' })
        .eq('id', assetId);
    }

    console.log(`[analyze-people-data] Complete: ${collaboratorsUpdated} updated, ${newCollaborators} created`);

    return new Response(
      JSON.stringify({
        collaboratorsUpdated,
        newCollaborators,
        insights: analysis.team_insights,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[analyze-people-data] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
