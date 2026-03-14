import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PILARES = ["pessoas", "processos", "dados", "tecnologia", "gestao"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { note_id, project_id } = await req.json();
    if (!note_id || !project_id) {
      return new Response(JSON.stringify({ error: "note_id and project_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch note
    const { data: note, error: noteError } = await supabase
      .from("quick_notes")
      .select("*")
      .eq("id", note_id)
      .single();

    if (noteError || !note) {
      throw new Error("Note not found");
    }

    // Fetch project for pilares
    const { data: project } = await supabase
      .from("projects")
      .select("pilares_config")
      .eq("id", project_id)
      .single();

    const pilares = project?.pilares_config
      ? (project.pilares_config as any[]).map((p: any) => p.id || p.label)
      : DEFAULT_PILARES;

    // Call AI
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um assistente de consultoria B2B. Receba uma nota rápida do consultor e:
1. Estruture o conteúdo em formato claro com bullet points
2. Sugira o pilar mais relevante dentre: ${pilares.join(", ")}
3. Destaque insights acionáveis

Responda em JSON:
{
  "processed_content": "texto estruturado em markdown",
  "pilar_sugerido": "um dos pilares",
  "insights": ["insight 1", "insight 2"]
}`;

    const res = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: note.raw_content },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI Gateway error ${res.status}: ${errText}`);
    }

    const aiData = await res.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON response
    let parsed;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { processed_content: aiContent, pilar_sugerido: null };
    } catch {
      parsed = { processed_content: aiContent, pilar_sugerido: null };
    }

    // Update note
    await supabase
      .from("quick_notes")
      .update({
        processed_content: parsed.processed_content,
        pilar_sugerido: parsed.pilar_sugerido,
        status: "processado",
      })
      .eq("id", note_id);

    // Activity log
    await supabase.from("activity_log").insert({
      project_id,
      actor_type: "ia",
      actor_name: "IA",
      action: "nota_processada",
      description: `Processou nota rápida e sugeriu pilar "${parsed.pilar_sugerido || "não identificado"}"`,
      metadata: { note_id },
    });

    return new Response(
      JSON.stringify({
        success: true,
        processed_content: parsed.processed_content,
        pilar_sugerido: parsed.pilar_sugerido,
        insights: parsed.insights || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-quick-note error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
