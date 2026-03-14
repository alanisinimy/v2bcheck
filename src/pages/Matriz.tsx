import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyProjectState } from '@/components/layout/EmptyProjectState';
import { PageHeader } from '@/shared/components/PageHeader';
import { EvidenceTable } from '@/components/matriz/EvidenceTable';
import { AddEvidenceDialog } from '@/components/matriz/AddEvidenceDialog';
import { PillarView } from '@/features/diagnostico/components/PillarView';
import { CoberturaView } from '@/features/diagnostico/components/CoberturaView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
      const statusLabels = { validado: 'validada', rejeitado: 'rejeitada', investigar: 'marcada para investigação', pendente: 'marcada como pendente' };
      toast({ title: 'Status atualizado', description: `Evidência ${statusLabels[status]}.` });
    } catch {
      toast({ title: 'Erro ao atualizar', description: 'Não foi possível atualizar o status.', variant: 'destructive' });
    }
  };

  const handleConsolidate = async () => {
    if (!currentProject) return;
    try {
      const result = await consolidateMutation.mutateAsync(currentProject.id);
      toast({ title: '🧹 Consolidação concluída!', description: `${result.stats.evidences_archived} evidências redundantes arquivadas.` });
    } catch (error) {
      toast({ title: 'Erro na consolidação', description: error instanceof Error ? error.message : 'Falha.', variant: 'destructive' });
    }
  };

  const isLoading = isLoadingProject || isLoadingEvidences;

  if (isLoading) {
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
      <div className="p-8 max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <PageHeader
          title="Matriz de Diagnóstico"
          description="Gaps identificados, benchmarks e análise de criticidade"
          actions={
            <>
              <Button
                onClick={handleConsolidate}
                variant="outline"
                size="sm"
                disabled={consolidateMutation.isPending || evidences.length < 5}
                className="gap-2"
              >
                {consolidateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Organizando...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Consolidar</>
                )}
              </Button>
              <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Evidência
              </Button>
            </>
          }
        />

        {/* 5.1 ViewSwitcher Tabs */}
        <Tabs defaultValue="tabela" className="space-y-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="tabela" className="gap-2 data-[state=active]:bg-background text-sm">
              📋 Tabela Geral
            </TabsTrigger>
            <TabsTrigger value="pilar" className="gap-2 data-[state=active]:bg-background text-sm">
              📊 Por Pilar
            </TabsTrigger>
            <TabsTrigger value="cobertura" className="gap-2 data-[state=active]:bg-background text-sm">
              📈 Cobertura
            </TabsTrigger>
          </TabsList>

          {/* Tabela Geral (existing) */}
          <TabsContent value="tabela">
            <EvidenceTable
              evidences={evidences}
              projectId={currentProject.id}
              onStatusChange={handleStatusChange}
            />
          </TabsContent>

          {/* 5.2 Por Pilar */}
          <TabsContent value="pilar">
            <PillarView evidences={evidences} />
          </TabsContent>

          {/* 5.3 Cobertura */}
          <TabsContent value="cobertura">
            <CoberturaView evidences={evidences} />
          </TabsContent>
        </Tabs>

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
