import { motion } from 'framer-motion';
import { Calendar, FileText, CheckCircle, Clock, AlertTriangle, BarChart3, Info } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyProjectState } from '@/components/layout/EmptyProjectState';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ProjectOverviewForm } from '@/components/dashboard/ProjectOverviewForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjectContext } from '@/shared/contexts/ProjectContext';
import { useProjectStats, useEvidences } from '@/hooks/useProject';
import type { Pilar } from '@/lib/types';
import { PILARES } from '@/lib/types';

export default function Dashboard() {
  const { currentProject, isLoading } = useProjectContext();
  
  // Dados reais do Supabase
  const stats = useProjectStats(currentProject?.id);
  const { data: evidences } = useEvidences(currentProject?.id);

  // Filtrar divergências reais (is_divergence=true ou evidence_type='divergencia')
  const recentDivergences = evidences
    ?.filter(ev => ev.is_divergence || ev.evidence_type === 'divergencia')
    .slice(0, 5) || [];

  const pilares: Pilar[] = ['pessoas', 'processos', 'dados', 'tecnologia', 'gestao'];

  // Show loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </AppLayout>
    );
  }

  // Show empty state if no project selected
  if (!currentProject) {
    return (
      <AppLayout>
        <EmptyProjectState />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {currentProject.client_name}
          </h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="font-medium text-foreground">{currentProject.name}</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Início: {new Date(currentProject.start_date).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </motion.header>

        {/* Tabs */}
        <Tabs defaultValue="metricas" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="metricas" className="gap-2 data-[state=active]:bg-background">
              <BarChart3 className="w-4 h-4" />
              Métricas
            </TabsTrigger>
            <TabsTrigger value="visao-geral" className="gap-2 data-[state=active]:bg-background">
              <Info className="w-4 h-4" />
              Visão Geral
            </TabsTrigger>
          </TabsList>

          {/* Metrics Tab */}
          <TabsContent value="metricas" className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4">
              <StatsCard
                title="Total de Evidências"
                value={stats.total}
                icon={FileText}
                index={0}
              />
              <StatsCard
                title="Validadas"
                value={stats.byStatus?.validado || 0}
                icon={CheckCircle}
                variant="success"
                index={1}
              />
              <StatsCard
                title="Pendentes"
                value={stats.byStatus?.pendente || 0}
                icon={Clock}
                index={2}
              />
              <StatsCard
                title="Divergências"
                value={stats.divergences}
                icon={AlertTriangle}
                variant="warning"
                index={3}
              />
            </div>

            {/* Pilares Grid */}
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-semibold text-foreground"
            >
              Saturação por Pilar
            </motion.h2>
            
            <div className="grid grid-cols-5 gap-4">
              {pilares.map((pilar, index) => (
                <MetricCard
                  key={pilar}
                  pilar={pilar}
                  count={stats.byPilar?.[pilar] || 0}
                  total={stats.total}
                  index={index}
                />
              ))}
            </div>

            {/* Insights Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft"
            >
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Divergências Detectadas
              </h2>
              <div className="space-y-3">
                {recentDivergences.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    Nenhuma divergência detectada ainda.
                  </p>
                ) : (
                  recentDivergences.map((div) => (
                    <div key={div.id} className="p-4 rounded-xl bg-warning/5 border border-warning/20">
                      <p className="text-foreground">
                        <span className="font-medium capitalize">{div.pilar}:</span>{' '}
                        {div.divergence_description || div.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.section>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="visao-geral">
            <ProjectOverviewForm project={currentProject} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
