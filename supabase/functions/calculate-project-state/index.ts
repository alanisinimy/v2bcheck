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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all data in parallel
    const [projectRes, assetsRes, evidencesRes, initiativesRes, collaboratorsRes, queueRes] =
      await Promise.all([
        supabase.from("projects").select("*").eq("id", project_id).single(),
        supabase.from("assets").select("id, status, file_type, source_type").eq("project_id", project_id),
        supabase.from("evidences").select("id, pilar, status, criticality").eq("project_id", project_id),
        supabase.from("initiatives").select("id, status, target_pilar").eq("project_id", project_id),
        supabase.from("collaborators").select("id").eq("project_id", project_id),
        supabase.from("processing_queue").select("id, status").eq("project_id", project_id),
      ]);

    if (projectRes.error) throw projectRes.error;

    const project = projectRes.data;
    const assets = assetsRes.data || [];
    const evidences = evidencesRes.data || [];
    const initiatives = initiativesRes.data || [];
    const collaborators = collaboratorsRes.data || [];
    const queue = queueRes.data || [];

    const pilares = project.pilares_config || DEFAULT_PILARES;

    // Stats
    const completedFiles = assets.filter((a: any) => a.status === "completed").length;
    const totalGaps = evidences.length;
    const pendingGaps = evidences.filter((e: any) => e.status === "pendente").length;
    const validatedGaps = evidences.filter((e: any) => e.status === "validado").length;
    const rejectedGaps = evidences.filter((e: any) => e.status === "rejeitado").length;
    const criticalGaps = evidences.filter((e: any) => e.criticality === "alta").length;
    const hasInitiatives = initiatives.length > 0;
    const approvedInitiatives = initiatives.filter((i: any) => i.status === "approved").length;

    // Stepper
    const hasFiles = completedFiles > 0;
    const hasGaps = totalGaps > 0;
    const allGapsReviewed = hasGaps && evidences.every((e: any) => e.status !== "pendente");
    const hasSynthesis = allGapsReviewed && totalGaps > 0;
    const hasPlan = hasInitiatives;

    const steps = [
      { done: hasFiles, label: "Upload", description: "Enviar arquivos ao Vault", detail: `${completedFiles} arquivo(s)` },
      { done: hasGaps, label: "Análise IA", description: "Gerar gaps com IA", detail: `${totalGaps} gap(s)` },
      { done: allGapsReviewed, label: "Validar Gaps", description: "Revisar cada gap", detail: `${pendingGaps} pendente(s)` },
      { done: hasSynthesis, label: "Síntese", description: "Gerar síntese executiva", detail: allGapsReviewed ? "Pronta" : "Aguardando validação" },
      { done: hasPlan, label: "Plano de Ação", description: "Criar plano estratégico", detail: `${initiatives.length} iniciativa(s)` },
    ];

    const doneCount = steps.filter((s) => s.done).length;
    const currentIndex = steps.findIndex((s) => !s.done);
    const pct = Math.round((doneCount / steps.length) * 100);

    // Pillar coverage
    const totalPeso = pilares.reduce((sum: number, p: any) => sum + (p.peso || 20), 0);
    const cobertura = pilares.map((p: any) => {
      const gapsCount = evidences.filter((e: any) => e.pilar === p.id).length;
      const validadosCount = evidences.filter((e: any) => e.pilar === p.id && e.status === "validado").length;
      const pesoPct = Math.round(((p.peso || 20) / totalPeso) * 100);
      const coberturaPct = totalGaps > 0 ? Math.round((gapsCount / totalGaps) * 100) : 0;
      return {
        pilar: p.id,
        label: p.label,
        peso: p.peso || 20,
        peso_pct: pesoPct,
        gaps_count: gapsCount,
        validados_count: validadosCount,
        cobertura_pct: coberturaPct,
        status: coberturaPct >= pesoPct * 0.8 ? "adequada" : coberturaPct >= pesoPct * 0.4 ? "parcial" : "insuficiente",
      };
    });

    // Next step
    let nextStep;
    if (!hasFiles) {
      nextStep = { message: "Fazer upload de evidências", cta: "Ir para Vault →", href: "/vault" };
    } else if (!hasGaps) {
      nextStep = { message: "Analisar arquivos com IA", cta: "Ir para Vault →", href: "/vault" };
    } else if (pendingGaps > 0) {
      nextStep = { message: `Validar ${pendingGaps} gaps pendentes`, cta: "Ir para Matriz →", href: "/matriz" };
    } else if (!hasPlan) {
      nextStep = { message: "Gerar plano de ação estratégico", cta: "Ir para Plano →", href: "/plan" };
    } else {
      nextStep = { message: "Diagnóstico completo! Exporte os entregáveis", cta: "Exportar →", href: "/plan" };
    }

    // Processing queue
    const activeProcessing = queue.filter((q: any) => q.status === "na_fila" || q.status === "processando");

    // Current phase
    const currentPhase = project.current_phase || "vault";

    return new Response(
      JSON.stringify({
        current_phase: currentPhase,
        stepper: { steps, doneCount, currentIndex, pct },
        stats: {
          totalFiles: assets.length,
          completedFiles,
          totalGaps,
          pendingGaps,
          validatedGaps,
          rejectedGaps,
          criticalGaps,
          totalInitiatives: initiatives.length,
          approvedInitiatives,
          totalCollaborators: collaborators.length,
        },
        cobertura,
        next_step: nextStep,
        processing: {
          isProcessing: activeProcessing.length > 0,
          totalActive: activeProcessing.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("calculate-project-state error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
