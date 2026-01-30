import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DiscProfile {
  dom: number;
  inf: number;
  est: number;
  conf: number;
}

interface ExtractedDisc {
  name: string;
  role?: string;
  disc_profile: DiscProfile;
  primary_style: 'D' | 'I' | 'S' | 'C';
  insight: string;
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

    const { content, projectId, assetId } = await req.json();

    if (!content || !projectId || !assetId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: content, projectId, assetId' }),
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

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call OpenAI to extract DISC profile from PDF content
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
            content: `Você é um especialista em análise de perfis DISC. Sua tarefa é extrair informações de um relatório de perfil DISC.

EXTRAIA AS SEGUINTES INFORMAÇÕES:
1. Nome completo do colaborador
2. Cargo (se mencionado)
3. Perfil DISC com valores numéricos de 0 a 100 para cada dimensão:
   - D (Dominância): Foco em resultados, assertividade, competitividade
   - I (Influência): Sociabilidade, entusiasmo, comunicação
   - S (Estabilidade): Paciência, cooperação, confiabilidade
   - C (Conformidade): Precisão, análise, qualidade
4. Estilo dominante (a letra com maior valor)
5. Um insight comportamental de 1-2 frases sobre como esse perfil impacta o trabalho em vendas

RESPONDA SOMENTE EM JSON VÁLIDO com esta estrutura exata:
{
  "name": "Nome Completo",
  "role": "Cargo ou null",
  "disc_profile": {
    "dom": 0-100,
    "inf": 0-100,
    "est": 0-100,
    "conf": 0-100
  },
  "primary_style": "D" | "I" | "S" | "C",
  "insight": "Texto do insight comportamental"
}

Se não conseguir identificar valores numéricos exatos, estime baseado em descrições como "Alto", "Médio", "Baixo":
- Alto = 75-85
- Médio = 45-55
- Baixo = 15-25`
          },
          {
            role: 'user',
            content: `Analise este relatório DISC e extraia as informações:\n\n${content.slice(0, 8000)}`
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
        JSON.stringify({ error: 'Failed to analyze DISC profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const rawExtracted = JSON.parse(openaiData.choices[0].message.content);

    console.log('Raw extracted DISC profile:', rawExtracted);

    // Validate and sanitize the extracted data
    const validStyles = ['D', 'I', 'S', 'C'];
    
    // Check if the AI failed to extract valid data
    if (!rawExtracted.name || rawExtracted.name === 'null' || rawExtracted.name.toLowerCase() === 'null') {
      return new Response(
        JSON.stringify({ error: 'Não foi possível extrair o nome do colaborador do PDF. Verifique se é um relatório DISC válido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate primary_style - if invalid, determine from disc_profile values
    let primaryStyle = rawExtracted.primary_style;
    if (!validStyles.includes(primaryStyle)) {
      // Determine primary style from the highest DISC value
      const profile = rawExtracted.disc_profile || { dom: 0, inf: 0, est: 0, conf: 0 };
      const styleMap: [string, number][] = [
        ['D', profile.dom || 0],
        ['I', profile.inf || 0],
        ['S', profile.est || 0],
        ['C', profile.conf || 0],
      ];
      styleMap.sort((a, b) => b[1] - a[1]);
      primaryStyle = styleMap[0][0] as 'D' | 'I' | 'S' | 'C';
    }

    // Ensure disc_profile has valid numbers
    const discProfile: DiscProfile = {
      dom: Math.max(0, Math.min(100, Number(rawExtracted.disc_profile?.dom) || 0)),
      inf: Math.max(0, Math.min(100, Number(rawExtracted.disc_profile?.inf) || 0)),
      est: Math.max(0, Math.min(100, Number(rawExtracted.disc_profile?.est) || 0)),
      conf: Math.max(0, Math.min(100, Number(rawExtracted.disc_profile?.conf) || 0)),
    };

    const extracted: ExtractedDisc = {
      name: rawExtracted.name,
      role: rawExtracted.role === 'null' ? undefined : rawExtracted.role,
      disc_profile: discProfile,
      primary_style: primaryStyle as 'D' | 'I' | 'S' | 'C',
      insight: rawExtracted.insight === 'null' ? 'Perfil extraído automaticamente.' : rawExtracted.insight,
    };

    console.log('Validated DISC profile:', extracted);

    // Use service role for database operations
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if collaborator already exists (by name + project)
    const { data: existingCollaborator } = await supabase
      .from('collaborators')
      .select('id')
      .eq('project_id', projectId)
      .ilike('name', extracted.name)
      .single();

    let collaborator;
    let isNew = false;

    if (existingCollaborator) {
      // Update existing collaborator
      const { data, error } = await supabase
        .from('collaborators')
        .update({
          disc_profile: extracted.disc_profile,
          primary_style: extracted.primary_style,
          profile_source: 'pdf_auto',
          role: extracted.role || undefined,
        })
        .eq('id', existingCollaborator.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating collaborator:', error);
        throw error;
      }
      collaborator = data;
    } else {
      // Create new collaborator
      const { data, error } = await supabase
        .from('collaborators')
        .insert({
          project_id: projectId,
          name: extracted.name,
          role: extracted.role,
          disc_profile: extracted.disc_profile,
          primary_style: extracted.primary_style,
          profile_source: 'pdf_auto',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating collaborator:', error);
        throw error;
      }
      collaborator = data;
      isNew = true;
    }

    // Create automatic evidence for Pessoas pilar
    const styleNames: Record<string, string> = {
      'D': 'Dominante',
      'I': 'Comunicador',
      'S': 'Estável',
      'C': 'Analítico'
    };
    
    const styleName = styleNames[extracted.primary_style] || extracted.primary_style;
    const evidenceContent = `${extracted.name} tem perfil ${styleName} (Alto ${extracted.primary_style}). ${extracted.insight}`;

    const { data: evidence, error: evidenceError } = await supabase
      .from('evidences')
      .insert({
        project_id: projectId,
        asset_id: assetId,
        pilar: 'pessoas',
        content: evidenceContent,
        source_description: `📋 Perfil DISC • ${extracted.name}`,
        status: 'validado',
        is_divergence: false,
        evidence_type: 'fato',
      })
      .select()
      .single();

    if (evidenceError) {
      console.error('Error creating evidence:', evidenceError);
      // Don't throw - collaborator was created successfully
    }

    return new Response(
      JSON.stringify({
        collaborator,
        evidence,
        isNew,
        extracted,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in analyze-disc:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
