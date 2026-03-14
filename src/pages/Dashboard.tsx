import { motion } from 'framer-motion';
import { FileDown, Sparkles } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyProjectState } from '@/components/layout/EmptyProjectState';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/components/ui/button';
import { useProjectContext } from '@/shared/contexts/ProjectContext';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';
import { ProjectStepper } from '@/features/dashboard/components/ProjectStepper';
import { StatsGrid } from '@/features/dashboard/components/StatsGrid';
import { PillarCoverage } from '@/features/dashboard/components/PillarCoverage';
import { RecentGaps } from '@/features/dashboard/components/RecentGaps';
import { NextStepCTA } from '@/features/dashboard/components/NextStepCTA';
import { ActivityFeed } from '@/features/dashboard/components/ActivityFeed';

export default function Dashboard() {
  const { currentProject, isLoading: projectLoading } = useProjectContext();
  const {
    stats, pillarCoverage, recentGaps, stepperState,
    activityFeed, dominantStyle, nextStep, isLoading: dataLoading,
  } = useDashboardData(currentProject?.id);

  if (projectLoading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </AppLayout>
    );
  }

  if (!currentProject) {
    return (
      <AppLayout>
        <EmptyProjectState />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* 3.1 PageHeader */}
        <PageHeader
          title="Dashboard do Projeto"
          description={`${currentProject.name} · ${currentProject.client_name} — visão geral e próximos passos`}
          actions={
            <>
              <Button variant="outline" size="sm" className="gap-2">
                <FileDown className="w-4 h-4" />
                Exportar Relatório
              </Button>
              <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <Sparkles className="w-4 h-4" />
                Gerar Diagnóstico com IA
              </Button>
            </>
          }
        />

        {/* 3.2 ProjectStepper */}
        <ProjectStepper
          steps={stepperState.steps}
          currentIndex={stepperState.currentIndex}
          pct={stepperState.pct}
        />

        {/* 3.3 StatsGrid */}
        <StatsGrid
          totalAssets={stats.totalAssets}
          pdfs={stats.pdfs}
          entrevistas={stats.entrevistas}
          totalEvidences={stats.totalEvidences}
          validados={stats.validados}
          pendentes={stats.pendentes}
          criticalidadeAlta={stats.criticalidadeAlta}
          totalCollaborators={stats.totalCollaborators}
          dominantStyle={dominantStyle}
        />

        {/* 3.4 Two columns: PillarCoverage + RecentGaps */}
        <div className="grid grid-cols-2 gap-4">
          <PillarCoverage items={pillarCoverage} />
          <RecentGaps gaps={recentGaps} totalGaps={stats.totalEvidences} />
        </div>

        {/* 3.5 NextStepCTA */}
        <NextStepCTA {...nextStep} />

        {/* 3.6 ActivityFeed */}
        <ActivityFeed items={activityFeed} />
      </div>
    </AppLayout>
  );
}
