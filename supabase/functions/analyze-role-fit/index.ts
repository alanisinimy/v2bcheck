import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DiscProfile {
  dom: number;
  inf: number;
  est: number;
  conf: number;
}

interface RequestBody {
  collaboratorId: string;
  collaboratorName: string;
  role: string;
  discProfile: DiscProfile;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { collaboratorId, collaboratorName, role, discProfile } = await req.json() as RequestBody;

    console.log(`Analyzing role fit for ${collaboratorName} as ${role}`, discProfile);

    if (!collaboratorId || !role || !discProfile) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: collaboratorId, role, discProfile" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Você é um especialista em Gestão de Talentos em Vendas B2B com profundo conhecimento em metodologia DISC.

REGRAS DE OURO POR CARGO:

SDR/BDR (Prospecção Outbound):
- IDEAL: Alto C (processo, disciplina) + Alto D (persistência, resultado) OU Alto S (constância)
- CUIDADO: Alto I sozinho pode perder foco em tarefas repetitivas de cadência
- O SDR precisa de método, resiliência a rejeição e disciplina para seguir scripts

Closer/AE (Account Executive):
- IDEAL: Alto D (assertividade, fechamento) + Alto I (influência, persuasão)
- CUIDADO: Alto C pode travar a negociação buscando perfeição
- O Closer precisa de coragem para pedir o fechamento e habilidade de conexão

Farmer/CS (Customer Success):
- IDEAL: Alto S (relacionamento, paciência) + Alto I (empatia, comunicação)
- CUIDADO: Alto D pode ser agressivo demais para retenção
- O Farmer precisa construir relacionamentos de longo prazo

Gerente/Líder:
- IDEAL: D moderado a alto (liderança) + equilíbrio nos demais
- Precisa adaptar estilo para gerenciar perfis diversos
- Alto C ajuda em análise de métricas, Alto I em motivação do time

BDR Outbound Agressivo:
- IDEAL: Alto D (assertivo) + Alto C (metódico)
- Perfil "hunter" que combina agressividade com processo

Consultor de Vendas:
- IDEAL: Alto I (relacionamento) + Alto C (conhecimento técnico)
- Precisa equilibrar consultoria com fechamento

ESCALA DE INTERPRETAÇÃO:
- Valores acima de 60: Alto (dominante no perfil)
- Valores entre 40-60: Médio (influência moderada)
- Valores abaixo de 40: Baixo (não é característica natural)`;

    const userPrompt = `Analise o fit do perfil DISC de ${collaboratorName} para o cargo de ${role}.

PERFIL DISC:
- D (Dominância): ${discProfile.dom}%
- I (Influência): ${discProfile.inf}%
- S (Estabilidade): ${discProfile.est}%
- C (Conformidade): ${discProfile.conf}%

TAREFA:
1. Compare o perfil com as exigências comportamentais do cargo ${role}
2. Classifique como 'alto', 'medio' ou 'baixo'
3. Dê uma justificativa focando no IMPACTO PRÁTICO para o desempenho

Responda APENAS com JSON válido:
{
  "fit_level": "alto" | "medio" | "baixo",
  "reason": "Justificativa em 1-2 frases curtas focando no impacto prático"
}`;

    console.log("Calling Lovable AI Gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to analyze role fit" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log("AI Response:", content);

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response
    let result: { fit_level: string; reason: string };
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      result = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the result
    const validLevels = ["alto", "medio", "baixo"];
    if (!validLevels.includes(result.fit_level)) {
      console.error("Invalid fit_level:", result.fit_level);
      result.fit_level = "medio"; // Default to medium if invalid
    }

    // Update the collaborator in the database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: updateError } = await supabase
      .from("collaborators")
      .update({
        role_fit_level: result.fit_level,
        role_fit_reason: result.reason,
      })
      .eq("id", collaboratorId);

    if (updateError) {
      console.error("Failed to update collaborator:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save role fit analysis" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Role fit analysis saved: ${result.fit_level} - ${result.reason}`);

    return new Response(
      JSON.stringify({
        role_fit_level: result.fit_level,
        role_fit_reason: result.reason,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-role-fit:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
