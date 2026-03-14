import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyProjectState } from '@/components/layout/EmptyProjectState';
import { EvidenceTable } from '@/components/matriz/EvidenceTable';
import { AddEvidenceDialog } from '@/components/matriz/AddEvidenceDialog';
import { Button } from '@/components/ui/button';
import { useProjectContext } from '@/shared/contexts/ProjectContext';
import { useEvidences, useUpdateEvidenceStatus } from '@/hooks/useProject';
import { useConsolidateEvidences } from '@/hooks/useConsolidateEvidences';
import type { EvidenceStatus } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export default function Matriz() {
  const { currentProject, isLoading: isLoadingProject } = useProjectContext();
  const { data: evidences = [], isLoading: isLoadingEvidences } = useEvidences(currentProject?.id);
  const updateStatusMutation = useUpdateEvidenceStatus();
  const consolidateMutation = useConsolidateEvidences();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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
      <div className="p-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1">Matriz de Diagnóstico</h1>
              <p className="text-sm text-muted-foreground">
                Gaps identificados, benchmarks e análise de criticidade
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleConsolidate}
                variant="outline"
                size="sm"
                disabled={consolidateMutation.isPending || evidences.length < 5}
                className="gap-2"
              >
                {consolidateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Organizando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Consolidar
                  </>
                )}
              </Button>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                size="sm"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Nova Evidência
              </Button>
            </div>
          </div>
        </motion.header>

        {/* Evidence Table */}
        <EvidenceTable
          evidences={evidences}
          projectId={currentProject.id}
          onStatusChange={handleStatusChange}
        />

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
