import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Upload, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyProjectState } from '@/components/layout/EmptyProjectState';
import { Button } from '@/components/ui/button';
import { CollaboratorCard } from '@/components/team/CollaboratorCard';
import { AddCollaboratorDialog } from '@/components/team/AddCollaboratorDialog';
import { PeopleDataUploadZone } from '@/components/team/PeopleDataUploadZone';
import { PeopleDataTypeModal } from '@/components/team/PeopleDataTypeModal';
import { TeamDistributionChart } from '@/components/team/DiscProfileBars';
import { useProjectContext } from '@/contexts/ProjectContext';
import {
  useCollaborators,
  useCreateCollaborator,
  useDeleteCollaborator,
  useInferProfile,
  useTeamDistribution,
  useUpdateCollaborator,
  useAnalyzeRoleFit,
} from '@/hooks/useCollaborators';
import { supabase } from '@/integrations/supabase/client';
import { extractTextFromFile } from '@/hooks/useAnalyzeEvidences';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

type PeopleDataType = 'perfil_disc' | 'pesquisa_clima';

export default function Team() {
  const { currentProject, isLoading: isLoadingProject } = useProjectContext();
  const { data: collaborators = [], isLoading: isLoadingCollaborators } = useCollaborators(currentProject?.id);
  const createMutation = useCreateCollaborator();
  const deleteMutation = useDeleteCollaborator();
  const updateMutation = useUpdateCollaborator();
  const inferMutation = useInferProfile();
  const analyzeFitMutation = useAnalyzeRoleFit();
  const queryClient = useQueryClient();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [inferringId, setInferringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [analyzingFitId, setAnalyzingFitId] = useState<string | null>(null);
  
  // People data upload state
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const distribution = useTeamDistribution(collaborators);

  const handleAddCollaborator = async (data: { name: string; role?: string }) => {
    if (!currentProject) return;
    
    try {
      await createMutation.mutateAsync({
        projectId: currentProject.id,
        ...data,
      });
      
      toast({
        title: 'Colaborador adicionado',
        description: `${data.name} foi adicionado ao time.`,
      });
      
      setIsAddDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar',
        description: error.message || 'Não foi possível adicionar o colaborador.',
        variant: 'destructive',
      });
    }
  };

  const handleInferProfile = async (collaborator: { id: string; name: string }) => {
    if (!currentProject) return;
    
    setInferringId(collaborator.id);
    
    try {
      const result = await inferMutation.mutateAsync({
        projectId: currentProject.id,
        collaboratorId: collaborator.id,
        collaboratorName: collaborator.name,
      });
      
      toast({
        title: 'Perfil inferido',
        description: `O perfil DISC de ${collaborator.name} foi estimado pela IA.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro na inferência',
        description: error.message || 'Não foi possível inferir o perfil.',
        variant: 'destructive',
      });
    } finally {
      setInferringId(null);
    }
  };

  const handleDeleteCollaborator = async (id: string) => {
    if (!currentProject) return;
    
    setDeletingId(id);
    
    try {
      await deleteMutation.mutateAsync({
        id,
        projectId: currentProject.id,
      });
      
      toast({
        title: 'Colaborador removido',
        description: 'O colaborador foi removido do time.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message || 'Não foi possível remover o colaborador.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateRole = async (collaborator: { id: string; name: string }, role: string) => {
    if (!currentProject) return;
    
    try {
      await updateMutation.mutateAsync({
        id: collaborator.id,
        projectId: currentProject.id,
        role,
        // Clear fit when role changes
        role_fit_level: undefined,
        role_fit_reason: undefined,
      } as any);
      
      toast({
        title: 'Cargo atualizado',
        description: `${collaborator.name} agora é ${role}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar cargo',
        description: error.message || 'Não foi possível atualizar o cargo.',
        variant: 'destructive',
      });
    }
  };

  const handleAnalyzeRoleFit = async (collaborator: { id: string; name: string; role: string | null; disc_profile: any }) => {
    if (!currentProject || !collaborator.role || !collaborator.disc_profile) return;
    
    setAnalyzingFitId(collaborator.id);
    
    try {
      await analyzeFitMutation.mutateAsync({
        projectId: currentProject.id,
        collaboratorId: collaborator.id,
        collaboratorName: collaborator.name,
        role: collaborator.role,
        discProfile: collaborator.disc_profile,
      });
      
      toast({
        title: 'Análise concluída',
        description: `O fit de ${collaborator.name} para ${collaborator.role} foi analisado.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro na análise',
        description: error.message || 'Não foi possível analisar o fit.',
        variant: 'destructive',
      });
    } finally {
      setAnalyzingFitId(null);
    }
  };

  // People data upload handlers
  const handleFilesSelected = useCallback((files: File[]) => {
    if (files.length > 0) {
      setPendingFile(files[0]);
      setIsTypeModalOpen(true);
    }
  }, []);

  const handleProcessPeopleData = useCallback(async (dataType: PeopleDataType, collaboratorId?: string) => {
    if (!currentProject || !pendingFile) return;
    
    setIsProcessingFile(true);
    
    try {
      // Extract text from file
      const textContent = await extractTextFromFile(pendingFile);
      
      if (!textContent) {
        throw new Error('Não foi possível extrair texto do arquivo');
      }

      // Create asset record
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .insert({
          project_id: currentProject.id,
          file_name: pendingFile.name,
          file_type: pendingFile.type,
          file_size: pendingFile.size,
          storage_path: `people-data/${Date.now()}-${pendingFile.name}`,
          source_type: dataType === 'perfil_disc' ? 'perfil_disc' : 'pesquisa_clima',
          collaborator_id: collaboratorId || null,
          status: 'processing' as const,
        })
        .select()
        .single();

      if (assetError) throw assetError;

      if (dataType === 'perfil_disc') {
        // Use existing analyze-disc function
        const { data, error } = await supabase.functions.invoke('analyze-disc', {
          body: {
            projectId: currentProject.id,
            assetId: asset.id,
            content: textContent,
          }
        });

        if (error) throw error;

        // Update asset status
        await supabase
          .from('assets')
          .update({ status: 'completed' })
          .eq('id', asset.id);

        queryClient.invalidateQueries({ queryKey: ['collaborators', currentProject.id] });
        
        toast({
          title: data.isNew ? 'Colaborador cadastrado' : 'Perfil atualizado',
          description: `${data.collaborator?.name || 'Colaborador'} foi ${data.isNew ? 'adicionado ao time' : 'atualizado'}.`,
        });
      } else {
        // Use new analyze-people-data function
        const { data, error } = await supabase.functions.invoke('analyze-people-data', {
          body: {
            projectId: currentProject.id,
            assetId: asset.id,
            content: textContent,
            dataType: 'pesquisa_clima',
          }
        });

        if (error) throw error;

        // Update asset status
        await supabase
          .from('assets')
          .update({ status: 'completed' })
          .eq('id', asset.id);

        queryClient.invalidateQueries({ queryKey: ['collaborators', currentProject.id] });
        
        toast({
          title: 'Pesquisa processada',
          description: `${data.collaboratorsUpdated} atualizado(s), ${data.newCollaborators} novo(s).`,
        });
      }
      
      setIsTypeModalOpen(false);
      setPendingFile(null);
      setShowUploadZone(false);
    } catch (error: any) {
      console.error('People data processing error:', error);
      toast({
        title: 'Erro ao processar',
        description: error.message || 'Não foi possível processar o arquivo.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingFile(false);
    }
  }, [currentProject, pendingFile, queryClient]);

  const handleTypeModalClose = useCallback(() => {
    setIsTypeModalOpen(false);
    setPendingFile(null);
  }, []);

  const isLoading = isLoadingProject || isLoadingCollaborators;

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
      <div className="p-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Time do Projeto
            </h1>
            <p className="text-muted-foreground">
              Colaboradores mapeados com perfil DISC
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              onClick={() => setShowUploadZone(!showUploadZone)}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Dados de Pessoas
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Manual
            </Button>
          </div>
        </motion.header>

        {/* People Data Upload Zone (Collapsible) */}
        {showUploadZone && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            <PeopleDataUploadZone
              onFilesSelected={handleFilesSelected}
              disabled={isProcessingFile}
            />
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Collaborators Grid */}
          <div className="lg:col-span-2">
            {collaborators.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 glass rounded-xl border border-border/50"
              >
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhum colaborador mapeado
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Faça upload de PDFs DISC no Vault para cadastrar automaticamente, 
                  ou adicione manualmente para depois inferir o perfil via IA.
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Colaborador
                </Button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {collaborators.map((collaborator) => (
                  <CollaboratorCard
                    key={collaborator.id}
                    collaborator={collaborator}
                    onInferProfile={() => handleInferProfile(collaborator)}
                    onDelete={() => handleDeleteCollaborator(collaborator.id)}
                    onUpdateRole={(role) => handleUpdateRole(collaborator, role)}
                    onAnalyzeRoleFit={() => handleAnalyzeRoleFit(collaborator)}
                    isInferring={inferringId === collaborator.id}
                    isDeleting={deletingId === collaborator.id}
                    isAnalyzingFit={analyzingFitId === collaborator.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Team Distribution Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass rounded-xl p-6 border border-border/50 sticky top-8"
            >
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Distribuição DISC do Time
              </h2>
              
              {distribution.total > 0 ? (
                <>
                  <TeamDistributionChart distribution={distribution} />
                  <p className="text-sm text-muted-foreground mt-4">
                    {distribution.total} colaborador{distribution.total !== 1 ? 'es' : ''} com perfil mapeado
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhum perfil DISC mapeado ainda.
                  Faça upload de PDFs ou use a inferência via IA.
                </p>
              )}
            </motion.div>
          </div>
        </div>

        {/* Add Collaborator Dialog */}
        <AddCollaboratorDialog
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onConfirm={handleAddCollaborator}
          isLoading={createMutation.isPending}
        />

        {/* People Data Type Modal */}
        <PeopleDataTypeModal
          open={isTypeModalOpen}
          onOpenChange={handleTypeModalClose}
          fileName={pendingFile?.name || ''}
          fileType={pendingFile?.type || ''}
          collaborators={collaborators.map(c => ({ id: c.id, name: c.name }))}
          onSubmit={handleProcessPeopleData}
          isProcessing={isProcessingFile}
        />
      </div>
    </AppLayout>
  );
}
