import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyProjectState } from '@/components/layout/EmptyProjectState';
import { EvidenceCard } from '@/components/matriz/EvidenceCard';
import { FilterBar } from '@/components/matriz/FilterBar';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useEvidences } from '@/hooks/useProject';
import type { Evidence, Pilar, EvidenceStatus } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

// Mock evidences generator based on project
const getMockEvidences = (projectId: string): Evidence[] => [
  {
    id: '1',
    project_id: projectId,
    pilar: 'tecnologia',
    content: 'Gestor comercial alega uso de Salesforce, mas time relata uso de planilhas para gestão do pipeline.',
    source_description: 'Reunião de Kick-off',
    timecode_start: 845,
    status: 'pendente',
    is_divergence: true,
    divergence_description: 'Conflito entre declaração do gestor e relato da equipe',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    project_id: projectId,
    pilar: 'processos',
    content: 'Processo de qualificação não possui critério de BANT definido. Leads entram no pipeline sem validação de budget ou timeline.',
    source_description: 'Entrevista Equipe Comercial',
    timecode_start: 1230,
    status: 'pendente',
    is_divergence: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    project_id: projectId,
    pilar: 'pessoas',
    content: 'Vendedor João possui perfil "I" alto no DISC, com dificuldade em fechamento técnico. Recomenda-se pairing com vendedor de perfil "D".',
    source_description: 'Análise DISC',
    status: 'validado',
    is_divergence: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    project_id: projectId,
    pilar: 'dados',
    content: 'Meta de crescimento de 40% YoY sem histórico de contratações planejadas ou aumento de budget de marketing.',
    source_description: 'Reunião de Kick-off',
    timecode_start: 2100,
    status: 'investigar',
    is_divergence: true,
    divergence_description: 'Meta agressiva sem plano de suporte estruturado',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    project_id: projectId,
    pilar: 'gestao',
    content: 'Reunião de pipeline ocorre às segundas-feiras às 9h, mas 60% do time comercial falta regularmente.',
    source_description: 'Entrevista Equipe Comercial',
    timecode_start: 3400,
    status: 'pendente',
    is_divergence: true,
    divergence_description: 'Ritual existe na teoria mas não na prática',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    project_id: projectId,
    pilar: 'processos',
    content: 'Cadência de follow-up não é padronizada. Cada vendedor segue sua própria metodologia.',
    source_description: 'Entrevista Equipe Comercial',
    timecode_start: 1800,
    status: 'validado',
    is_divergence: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '7',
    project_id: projectId,
    pilar: 'tecnologia',
    content: 'Sistema de telefonia VoIP não está integrado ao CRM. Chamadas não são logadas automaticamente.',
    source_description: 'Processos Comerciais - Documentação',
    status: 'pendente',
    is_divergence: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '8',
    project_id: projectId,
    pilar: 'pessoas',
    content: 'Equipe não recebeu treinamento formal de vendas nos últimos 12 meses. Onboarding consiste em "shadowing" informal.',
    source_description: 'Entrevista Equipe Comercial',
    timecode_start: 4200,
    status: 'pendente',
    is_divergence: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '9',
    project_id: projectId,
    pilar: 'dados',
    content: 'Taxa de conversão de MQL para SQL é de 12%, abaixo do benchmark de 25% para o segmento.',
    source_description: 'Pipeline Q4 2023',
    status: 'validado',
    is_divergence: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '10',
    project_id: projectId,
    pilar: 'gestao',
    content: 'Cultura de "vendedor herói" prevalece. Não há playbook documentado de melhores práticas.',
    source_description: 'Reunião de Kick-off',
    timecode_start: 2800,
    status: 'pendente',
    is_divergence: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function Matriz() {
  const { currentProject, isLoading } = useProjectContext();
  const { data: dbEvidences } = useEvidences(currentProject?.id || '');
  
  // Get mock evidences for current project
  const mockEvidences = currentProject ? getMockEvidences(currentProject.id) : [];
  const [localEvidences, setLocalEvidences] = useState<Evidence[]>(mockEvidences);
  
  const [selectedPilar, setSelectedPilar] = useState<Pilar | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<EvidenceStatus | 'all'>('all');
  const [showDivergences, setShowDivergences] = useState(false);

  // Use DB evidences if available, otherwise use local mock
  const evidences = dbEvidences?.length ? dbEvidences : localEvidences;

  const filteredEvidences = useMemo(() => {
    return evidences.filter(ev => {
      if (selectedPilar !== 'all' && ev.pilar !== selectedPilar) return false;
      if (selectedStatus !== 'all' && ev.status !== selectedStatus) return false;
      if (showDivergences && !ev.is_divergence) return false;
      return true;
    });
  }, [evidences, selectedPilar, selectedStatus, showDivergences]);

  const handleStatusChange = (evidenceId: string, status: EvidenceStatus) => {
    // Update local state for demo
    setLocalEvidences(prev =>
      prev.map(ev => ev.id === evidenceId ? { ...ev, status } : ev)
    );

    const statusLabels = {
      validado: 'validada',
      rejeitado: 'rejeitada',
      investigar: 'marcada para investigação',
      pendente: 'marcada como pendente',
    };

    toast({
      title: 'Status atualizado',
      description: `Evidência ${statusLabels[status]}.`,
    });
  };

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
          <h1 className="text-3xl font-bold text-foreground mb-2">Matriz de Diagnóstico</h1>
          <p className="text-muted-foreground">
            Mesa de trabalho do consultor. Valide, rejeite ou investigue cada evidência.
          </p>
        </motion.header>

        {/* Filter Bar */}
        <FilterBar
          selectedPilar={selectedPilar}
          selectedStatus={selectedStatus}
          showDivergences={showDivergences}
          onPilarChange={setSelectedPilar}
          onStatusChange={setSelectedStatus}
          onDivergenceToggle={() => setShowDivergences(!showDivergences)}
        />

        {/* Evidence Count */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground mb-4"
        >
          Mostrando {filteredEvidences.length} de {evidences.length} evidências
        </motion.p>

        {/* Evidence Grid - Masonry-style layout */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredEvidences.map((evidence, index) => (
              <div key={evidence.id} className="break-inside-avoid">
                <EvidenceCard
                  evidence={evidence}
                  onStatusChange={handleStatusChange}
                  index={index}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>

        {filteredEvidences.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-muted-foreground"
          >
            <p>Nenhuma evidência encontrada com os filtros atuais.</p>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
