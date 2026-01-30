import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, FileText, Users, BarChart3 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyProjectState } from '@/components/layout/EmptyProjectState';
import { Button } from '@/components/ui/button';
import { InitiativeTable } from '@/components/plan/InitiativeTable';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useProjectStats, useEvidences } from '@/hooks/useProject';
import { useCollaborators, useTeamDistribution } from '@/hooks/useCollaborators';
import {
  useInitiatives,
  useGeneratePlan,
  useUpdateInitiative,
  useDeleteInitiative,
  type InitiativeStatus,
} from '@/hooks/useInitiatives';
import { toast } from '@/hooks/use-toast';

export default function Plan() {
  const { currentProject, isLoading: isLoadingProject } = useProjectContext();
  const stats = useProjectStats(currentProject?.id);
  const { data: collaborators = [] } = useCollaborators(currentProject?.id);
  const { data: initiatives = [], isLoading: isLoadingInitiatives } = useInitiatives(currentProject?.id);
  const { data: evidences = [] } = useEvidences(currentProject?.id);
  
  const generateMutation = useGeneratePlan();
  const updateMutation = useUpdateInitiative();
  const deleteMutation = useDeleteInitiative();
  
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [teamInsight, setTeamInsight] = useState<string | null>(null);

  const distribution = useTeamDistribution(collaborators);
  const validatedCount = stats.byStatus?.validado || 0;

  // Filter only validated evidences for context
  const validatedEvidences = evidences.filter(e => e.status === 'validado');

  const handleGeneratePlan = async () => {
    if (!currentProject) return;
    
    try {
      const result = await generateMutation.mutateAsync(currentProject.id);
      setTeamInsight(result.teamInsight);
      
      toast({
        title: 'Plano gerado',
        description: `${result.initiatives.length} iniciativas estratégicas foram criadas.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar plano',
        description: error.message || 'Não foi possível gerar o plano estratégico.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (id: string, status: InitiativeStatus) => {
    if (!currentProject) return;
    
    setUpdatingId(id);
    
    try {
      await updateMutation.mutateAsync({
        id,
        projectId: currentProject.id,
        status,
      });
      
      toast({
        title: 'Status atualizado',
        description: 'A iniciativa foi atualizada.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Não foi possível atualizar a iniciativa.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentProject) return;
    
    setDeletingId(id);
    
    try {
      await deleteMutation.mutateAsync({
        id,
        projectId: currentProject.id,
      });
      
      toast({
        title: 'Iniciativa descartada',
        description: 'A iniciativa foi removida do plano.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message || 'Não foi possível remover a iniciativa.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const isLoading = isLoadingProject || isLoadingInitiatives;

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

  // Dominant style calculation
  const dominantStyle = Object.entries(distribution.percentages || {})
    .sort(([, a], [, b]) => b - a)[0];
  const dominantStyleName = dominantStyle?.[1] > 0 ? dominantStyle[0] : null;

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Plano Estratégico
            </h1>
            <p className="text-muted-foreground">
              Iniciativas geradas pela IA cruzando gaps identificados e perfil do time
            </p>
          </div>
          <Button
            onClick={handleGeneratePlan}
            disabled={generateMutation.isPending}
            size="lg"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Plano com IA
              </>
            )}
          </Button>
        </motion.header>

        {/* Context Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-6 border border-border/50 mb-8"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Contexto Analisado
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{validatedCount}</p>
                <p className="text-xs text-muted-foreground">Gaps Validados</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{collaborators.length}</p>
                <p className="text-xs text-muted-foreground">Colaboradores Mapeados</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {dominantStyleName ? `Alto ${dominantStyleName}` : '—'}
                </p>
                <p className="text-xs text-muted-foreground">Perfil Dominante do Time</p>
              </div>
            </div>
          </div>

          {teamInsight && (
            <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-foreground">{teamInsight}</p>
            </div>
          )}
        </motion.div>

        {/* Initiatives Table */}
        {initiatives.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center py-16 glass rounded-xl border border-border/50"
          >
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhuma iniciativa gerada ainda
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Clique em "Gerar Plano com IA" para criar iniciativas estratégicas 
              baseadas nos gaps validados e no perfil do seu time.
            </p>
            {validatedCount === 0 && (
              <p className="text-sm text-warning">
                ⚠️ Você precisa validar gaps na Matriz antes de gerar o plano.
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-foreground">
              Iniciativas Estratégicas ({initiatives.length})
            </h2>
            
            <InitiativeTable
              initiatives={initiatives}
              evidences={validatedEvidences}
              onUpdateStatus={handleUpdateStatus}
              onDelete={handleDelete}
              updatingId={updatingId}
              deletingId={deletingId}
            />
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
