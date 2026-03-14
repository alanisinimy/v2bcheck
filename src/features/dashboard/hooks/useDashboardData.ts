import { useMemo } from 'react';
import { useAssets, useEvidences } from '@/hooks/useProject';
import { useCollaborators, useTeamDistribution } from '@/hooks/useCollaborators';
import { useInitiatives } from '@/hooks/useInitiatives';
import { useActivityLog } from '@/features/dashboard/hooks/useActivityLog';
import type { Pilar } from '@/shared/types/project';

const ALL_PILARES: Pilar[] = ['pessoas', 'processos', 'dados', 'tecnologia', 'gestao'];

export function useDashboardData(projectId: string | undefined) {
  const { data: assets = [], isLoading: loadingAssets } = useAssets(projectId);
  const { data: evidences = [], isLoading: loadingEvidences } = useEvidences(projectId);
  const { data: collaborators = [], isLoading: loadingCollaborators } = useCollaborators(projectId);
  const { data: initiatives = [], isLoading: loadingInitiatives } = useInitiatives(projectId);
  const { data: activityLog = [], isLoading: loadingActivity } = useActivityLog(projectId);
  const teamDistribution = useTeamDistribution(collaborators);

  const stats = useMemo(() => {
    const pendentes = evidences.filter(e => e.status === 'pendente').length;
    const validados = evidences.filter(e => e.status === 'validado').length;
    const rejeitados = evidences.filter(e => e.status === 'rejeitado').length;
    const investigar = evidences.filter(e => e.status === 'investigar').length;
    const criticalidadeAlta = evidences.filter(e => e.criticality === 'alta').length;
    const pdfs = assets.filter(a => a.file_type?.includes('pdf')).length;
    const entrevistas = assets.filter(a =>
      a.source_type?.startsWith('entrevista') || a.source_type?.startsWith('reuniao')
    ).length;

    return {
      totalAssets: assets.length,
      pdfs,
      entrevistas,
      totalEvidences: evidences.length,
      pendentes,
      validados,
      rejeitados,
      investigar,
      criticalidadeAlta,
      totalCollaborators: collaborators.length,
    };
  }, [assets, evidences, collaborators]);

  // Pillar coverage
  const pillarCoverage = useMemo(() => {
    const total = evidences.length || 1;
    return ALL_PILARES.map(pilar => {
      const count = evidences.filter(e => e.pilar === pilar).length;
      const pct = Math.round((count / total) * 100);
      return { pilar, count, pct };
    });
  }, [evidences]);

  // Recent gaps (last 5)
  const recentGaps = useMemo(() => {
    return [...evidences]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [evidences]);

  // Stepper state
  const stepperState = useMemo(() => {
    const hasFiles = assets.length > 0;
    const hasGaps = evidences.length > 0;
    const allGapsReviewed = hasGaps && evidences.every(e => e.status !== 'pendente');
    // Synthesis = all gaps reviewed (placeholder for actual synthesis flag)
    const hasSynthesis = allGapsReviewed && evidences.length > 0;
    const hasPlan = initiatives.length > 0;

    const steps = [
      { done: hasFiles, label: 'Upload', description: 'Enviar arquivos ao Vault' },
      { done: hasGaps, label: 'Análise IA', description: 'Gerar gaps com inteligência artificial' },
      { done: allGapsReviewed, label: 'Validar Gaps', description: 'Revisar e validar cada gap' },
      { done: hasSynthesis, label: 'Síntese', description: 'Gerar síntese executiva' },
      { done: hasPlan, label: 'Plano de Ação', description: 'Criar plano estratégico' },
    ];

    const doneCount = steps.filter(s => s.done).length;
    const currentIndex = steps.findIndex(s => !s.done);
    const pct = Math.round((doneCount / steps.length) * 100);

    return { steps, doneCount, currentIndex, pct };
  }, [assets, evidences, initiatives]);

  // Activity feed from activity_log table
  const activityFeed = activityLog;

  // Dominant DISC style
  const dominantStyle = useMemo(() => {
    const { D, I, S, C } = teamDistribution;
    const max = Math.max(D, I, S, C);
    if (max === 0) return null;
    if (D === max) return 'D';
    if (I === max) return 'I';
    if (S === max) return 'S';
    return 'C';
  }, [teamDistribution]);

  // Next step CTA
  const nextStep = useMemo(() => {
    if (assets.length === 0) return { message: 'Fazer upload de evidências', cta: 'Ir para Vault →', href: '/vault' };
    if (evidences.length === 0) return { message: 'Analisar arquivos com IA', cta: 'Ir para Vault →', href: '/vault' };
    if (stats.pendentes > 0) return { message: `Validar ${stats.pendentes} gaps pendentes`, cta: 'Ir para Matriz →', href: '/matriz' };
    if (initiatives.length === 0) return { message: 'Gerar plano de ação estratégico', cta: 'Ir para Plano →', href: '/plan' };
    return { message: 'Diagnóstico completo! Exporte os entregáveis', cta: 'Exportar →', href: '/plan' };
  }, [assets, evidences, stats.pendentes, initiatives]);

  const isLoading = loadingAssets || loadingEvidences || loadingCollaborators || loadingInitiatives || loadingActivity;

  return {
    stats,
    pillarCoverage,
    recentGaps,
    stepperState,
    activityFeed,
    dominantStyle,
    nextStep,
    teamDistribution,
    isLoading,
  };
}
