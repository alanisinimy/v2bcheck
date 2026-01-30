import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyProjectState } from '@/components/layout/EmptyProjectState';
import { EvidenceCard } from '@/components/matriz/EvidenceCard';
import { FilterBar } from '@/components/matriz/FilterBar';
import { AddEvidenceDialog } from '@/components/matriz/AddEvidenceDialog';
import { Button } from '@/components/ui/button';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useEvidences, useUpdateEvidenceStatus } from '@/hooks/useProject';
import { useConsolidateEvidences } from '@/hooks/useConsolidateEvidences';
import type { Pilar, EvidenceStatus } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export default function Matriz() {
  const { currentProject, isLoading: isLoadingProject } = useProjectContext();
  const { data: evidences = [], isLoading: isLoadingEvidences } = useEvidences(currentProject?.id);
  const updateStatusMutation = useUpdateEvidenceStatus();
  const consolidateMutation = useConsolidateEvidences();
  
  const [selectedPilar, setSelectedPilar] = useState<Pilar | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<EvidenceStatus | 'all'>('all');
  const [showDivergences, setShowDivergences] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredEvidences = evidences.filter(ev => {
    if (selectedPilar !== 'all' && ev.pilar !== selectedPilar) return false;
    if (selectedStatus !== 'all' && ev.status !== selectedStatus) return false;
    if (showDivergences && !ev.is_divergence) return false;
    return true;
  });

  const handleStatusChange = async (evidenceId: string, status: EvidenceStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ evidenceId, status });
      
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
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o status da evidência.',
        variant: 'destructive',
      });
    }
  };

  const handleConsolidate = async () => {
    if (!currentProject) return;

    try {
      const result = await consolidateMutation.mutateAsync(currentProject.id);
      
      toast({
        title: '🧹 Consolidação concluída!',
        description: `${result.stats.evidences_archived} evidências redundantes arquivadas. Matriz mais limpa!`,
      });
    } catch (error) {
      toast({
        title: 'Erro na consolidação',
        description: error instanceof Error ? error.message : 'Não foi possível consolidar as evidências.',
        variant: 'destructive',
      });
    }
  };

  const isLoading = isLoadingProject || isLoadingEvidences;

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Matriz de Diagnóstico</h1>
              <p className="text-muted-foreground">
                Mesa de trabalho do consultor. Valide, rejeite ou investigue cada evidência.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleConsolidate}
                variant="outline"
                disabled={consolidateMutation.isPending || evidences.length < 5}
                className="gap-2"
              >
                {consolidateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    A IA está organizando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Consolidar Evidências
                  </>
                )}
              </Button>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                Nova Evidência
              </Button>
            </div>
          </div>
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
            <p>
              {evidences.length === 0 
                ? 'Nenhuma evidência ainda. Clique em "Nova Evidência" para criar uma.'
                : 'Nenhuma evidência encontrada com os filtros atuais.'}
            </p>
          </motion.div>
        )}

        {/* Add Evidence Dialog */}
        <AddEvidenceDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          projectId={currentProject.id}
        />
      </div>
    </AppLayout>
  );
}
