import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PILARES = [
  { id: "pessoas", label: "Pessoas", peso: 20 },
  { id: "processos", label: "Processos", peso: 20 },
  { id: "dados", label: "Dados", peso: 20 },
  { id: "tecnologia", label: "Tecnologia", peso: 20 },
  { id: "gestao", label: "Gestão & Cultura", peso: 20 },
];

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://api.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 8000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI Gateway error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project_id, tipo, formato } = await req.json();
    if (!project_id || !tipo) {
      return new Response(JSON.stringify({ error: "project_id and tipo required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth client to get user
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create export job
    const { data: job, error: jobError } = await supabase
      .from("export_jobs")
      .insert({
        project_id,
        user_id: userId,
        tipo,
        formato: formato || "md",
        status: "gerando",
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Fetch project data in parallel
    const [projectRes, evidencesRes, initiativesRes] = await Promise.all([
      supabase.from("projects").select("*").eq("id", project_id).single(),
      supabase.from("evidences").select("*").eq("project_id", project_id),
      supabase.from("initiatives").select("*").eq("project_id", project_id),
    ]);

    if (projectRes.error) throw projectRes.error;

    const project = projectRes.data;
    const evidences = evidencesRes.data || [];
    const initiatives = initiativesRes.data || [];
    const pilares = project.pilares_config || DEFAULT_PILARES;

    let content = "";
    const timestamp = new Date().toISOString().split("T")[0];

    if (tipo === "matriz") {
      content = generateMatrizContent(project, evidences, pilares);
    } else if (tipo === "plano") {
      content = generatePlanoContent(project, initiatives, pilares);
    } else if (tipo === "sintese") {
      content = await generateSinteseContent(project, evidences, initiatives, pilares);
    } else {
      throw new Error(`Tipo de export desconhecido: ${tipo}`);
    }

    // Upload to storage
    const fileName = `${project_id}/${tipo}_${timestamp}.md`;
    const { error: uploadError } = await supabase.storage
      .from("exports")
      .upload(fileName, new Blob([content], { type: "text/markdown" }), {
        contentType: "text/markdown",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get signed URL (valid 7 days)
    const { data: urlData } = await supabase.storage
      .from("exports")
      .createSignedUrl(fileName, 60 * 60 * 24 * 7);

    const fileUrl = urlData?.signedUrl || "";

    // Update job
    await supabase
      .from("export_jobs")
      .update({ status: "concluido", file_url: fileUrl, completed_at: new Date().toISOString() })
      .eq("id", job.id);

    // Activity log
    await supabase.from("activity_log").insert({
      project_id,
      actor_type: "sistema",
      actor_name: "Sistema",
      action: "export_gerado",
      description: `Exportou ${tipo} em formato markdown`,
      metadata: { job_id: job.id, tipo, formato: "md" },
    });

    return new Response(
      JSON.stringify({ success: true, job_id: job.id, file_url: fileUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-export error:", err);

    // Try to update job status to error if we have context
    try {
      const { project_id, tipo } = await req.clone().json().catch(() => ({}));
      if (project_id) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase
          .from("export_jobs")
          .update({ status: "erro", error_message: err.message })
          .eq("project_id", project_id)
          .eq("status", "gerando");
      }
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateMatrizContent(project: any, evidences: any[], pilares: any[]): string {
  const validated = evidences.filter((e) => e.status === "validado");
  const pending = evidences.filter((e) => e.status === "pendente");

  let md = `# Matriz de Gaps — ${project.name}\n`;
  md += `**Cliente:** ${project.client_name}\n`;
  md += `**Data:** ${new Date().toLocaleDateString("pt-BR")}\n\n`;
  md += `---\n\n`;
  md += `## Resumo\n\n`;
  md += `- **Total de gaps:** ${evidences.length}\n`;
  md += `- **Validados:** ${validated.length}\n`;
  md += `- **Pendentes:** ${pending.length}\n`;
  md += `- **Criticidade alta:** ${evidences.filter((e) => e.criticality === "alta").length}\n\n`;

  for (const pilar of pilares) {
    const pilarGaps = evidences.filter((e) => e.pilar === pilar.id);
    if (pilarGaps.length === 0) continue;

    md += `## ${pilar.label}\n\n`;
    md += `| # | Gap | Benchmark | Impacto | Criticidade | Status |\n`;
    md += `|---|-----|-----------|---------|-------------|--------|\n`;

    for (const gap of pilarGaps) {
      md += `| G${String(gap.sequential_id || 0).padStart(2, "0")} | ${gap.content?.slice(0, 80)} | ${gap.benchmark || "-"} | ${gap.impact || "-"} | ${gap.criticality || "-"} | ${gap.status} |\n`;
    }
    md += "\n";
  }

  return md;
}

function generatePlanoContent(project: any, initiatives: any[], pilares: any[]): string {
  let md = `# Plano de Ação — ${project.name}\n`;
  md += `**Cliente:** ${project.client_name}\n`;
  md += `**Data:** ${new Date().toLocaleDateString("pt-BR")}\n\n`;
  md += `---\n\n`;
  md += `## Resumo\n\n`;
  md += `- **Total de iniciativas:** ${initiatives.length}\n`;
  md += `- **Aprovadas:** ${initiatives.filter((i) => i.status === "approved").length}\n\n`;

  for (const pilar of pilares) {
    const pilarInit = initiatives.filter((i) => i.target_pilar === pilar.id);
    if (pilarInit.length === 0) continue;

    md += `## ${pilar.label}\n\n`;
    for (const init of pilarInit) {
      md += `### I${String(init.sequential_id || 0).padStart(2, "0")} — ${init.title}\n\n`;
      if (init.description) md += `${init.description}\n\n`;
      md += `- **Impacto:** ${init.impact} | **Esforço:** ${init.effort} | **Status:** ${init.status}\n`;
      if (init.reasoning) md += `- **Racional:** ${init.reasoning}\n`;
      if (init.expected_impact) md += `- **Impacto esperado:** ${init.expected_impact}\n`;
      md += "\n";
    }
  }

  return md;
}

async function generateSinteseContent(
  project: any,
  evidences: any[],
  initiatives: any[],
  pilares: any[]
): Promise<string> {
  const validatedGaps = evidences.filter((e) => e.status === "validado");
  const criticalGaps = validatedGaps.filter((e) => e.criticality === "alta");

  const pilarSummary = pilares
    .map((p: any) => {
      const count = validatedGaps.filter((e) => e.pilar === p.id).length;
      return `- ${p.label}: ${count} gap(s) validado(s)`;
    })
    .join("\n");

  const topGaps = criticalGaps
    .slice(0, 10)
    .map((g) => `- [${g.pilar}] ${g.content?.slice(0, 100)}`)
    .join("\n");

  const topInitiatives = initiatives
    .slice(0, 10)
    .map((i) => `- [${i.target_pilar || "geral"}] ${i.title}`)
    .join("\n");

  const systemPrompt = `Você é um consultor sênior de estratégia comercial B2B.
Gere uma síntese executiva profissional em markdown para apresentação à diretoria.

Estrutura:
1. Contexto do Projeto (2 parágrafos)
2. Principais Achados por Pilar (bullet points)
3. Gaps Críticos (top 5 com recomendação)
4. Plano Estratégico Resumido (top iniciativas)
5. Próximos Passos Recomendados

Escreva em português brasileiro, tom executivo, objetivo e direto.`;

  const userPrompt = `Projeto: ${project.name}
Cliente: ${project.client_name}
Setor: ${project.sector || "Não informado"}
Contexto: ${project.client_context || "Não informado"}
Dores principais: ${project.main_pain_points || "Não informado"}
Objetivos: ${project.project_goals || "Não informado"}

Cobertura por pilar:
${pilarSummary}

Gaps críticos:
${topGaps || "Nenhum gap crítico"}

Iniciativas propostas:
${topInitiatives || "Nenhuma iniciativa"}

Total: ${validatedGaps.length} gaps validados, ${initiatives.length} iniciativas geradas.`;

  const aiContent = await callAI(systemPrompt, userPrompt);

  let md = `# Síntese Executiva — ${project.name}\n`;
  md += `**Cliente:** ${project.client_name}\n`;
  md += `**Data:** ${new Date().toLocaleDateString("pt-BR")}\n\n`;
  md += `---\n\n`;
  md += aiContent;

  return md;
}
