import { motion } from 'framer-motion';
import { Calendar, FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { useProject, useProjectStats, useEvidences } from '@/hooks/useProject';
import type { Pilar } from '@/lib/types';
import { PILARES } from '@/lib/types';

// Demo project ID - in real app would come from route/context
const DEMO_PROJECT_ID = 'demo-project';

export default function Dashboard() {
  const { data: project } = useProject(DEMO_PROJECT_ID);
  const { data: evidences } = useEvidences(DEMO_PROJECT_ID);
  const stats = useProjectStats(DEMO_PROJECT_ID);

  // Use mock data for demo
  const mockProject = {
    name: 'Diagnóstico Comercial',
    client_name: 'TechCorp Brasil',
    start_date: '2024-01-15',
  };

  const mockStats = {
    total: 24,
    byPilar: {
      pessoas: 6,
      processos: 5,
      dados: 4,
      tecnologia: 5,
      gestao: 4,
    } as Record<Pilar, number>,
    byStatus: {
      pendente: 12,
      validado: 8,
      rejeitado: 2,
      investigar: 2,
    },
    divergences: 3,
  };

  const displayProject = project || mockProject;
  const displayStats = evidences ? stats : mockStats;

  const pilares: Pilar[] = ['pessoas', 'processos', 'dados', 'tecnologia', 'gestao'];

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {displayProject.client_name}
          </h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="font-medium text-foreground">{displayProject.name}</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Início: {new Date(displayProject.start_date).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </motion.header>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total de Evidências"
            value={displayStats.total}
            icon={FileText}
            index={0}
          />
          <StatsCard
            title="Validadas"
            value={displayStats.byStatus?.validado || 0}
            icon={CheckCircle}
            variant="success"
            index={1}
          />
          <StatsCard
            title="Pendentes"
            value={displayStats.byStatus?.pendente || 0}
            icon={Clock}
            index={2}
          />
          <StatsCard
            title="Divergências"
            value={displayStats.divergences}
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
          className="text-xl font-semibold text-foreground mb-4"
        >
          Saturação por Pilar
        </motion.h2>
        
        <div className="grid grid-cols-5 gap-4">
          {pilares.map((pilar, index) => (
            <MetricCard
              key={pilar}
              pilar={pilar}
              count={displayStats.byPilar?.[pilar] || 0}
              total={displayStats.total}
              index={index}
            />
          ))}
        </div>

        {/* Insights Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-8 bg-card rounded-2xl p-6 border border-border/50 shadow-soft"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Divergências Detectadas
          </h2>
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
              <p className="text-foreground">
                <span className="font-medium">Tecnologia vs Operação:</span> Gestor comercial alega uso de Salesforce, 
                mas time relata uso de planilhas.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
              <p className="text-foreground">
                <span className="font-medium">Dados vs Realidade:</span> Meta de crescimento de 40% sem 
                histórico de contratações planejadas.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
              <p className="text-foreground">
                <span className="font-medium">Gestão vs Execução:</span> Reunião de pipeline ocorre às segundas, 
                mas 60% do time falta.
              </p>
            </div>
          </div>
        </motion.section>
      </div>
    </AppLayout>
  );
}
