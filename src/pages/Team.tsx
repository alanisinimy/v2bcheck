import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Upload, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyProjectState } from '@/components/layout/EmptyProjectState';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/components/ui/button';
import { CollaboratorCard } from '@/features/time/components/CollaboratorCard';
import { AddCollaboratorDialog } from '@/features/time/components/AddCollaboratorDialog';
import { PeopleDataUploadZone } from '@/features/time/components/PeopleDataUploadZone';
import { PeopleDataBatchModal, type ClassifiedFile } from '@/features/time/components/PeopleDataBatchModal';
import { TeamDistributionChart } from '@/features/time/components/DiscProfileBars';
import { useProjectContext } from '@/shared/contexts/ProjectContext';
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
  
  // Batch upload state
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);

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

  // Batch upload handlers
  const handleFilesSelected = useCallback((files: File[]) => {
    if (files.length === 0) return;
    
    setPendingFiles(files);
    setIsBatchModalOpen(true);
  }, []);

  const handleBatchProcess = useCallback(async (classifiedFiles: ClassifiedFile[]) => {
    if (!currentProject || classifiedFiles.length === 0) return;
    
    setIsProcessingFile(true);
    setCurrentProcessingIndex(0);
    
    let successCount = 0;
    let errorCount = 0;
    
    try {
      for (let i = 0; i < classifiedFiles.length; i++) {
        setCurrentProcessingIndex(i);
        const { file, dataType, collaboratorId } = classifiedFiles[i];
        
        try {
          // Extract text from file
          const textContent = await extractTextFromFile(file);
          
          if (!textContent) {
            throw new Error('Não foi possível extrair texto do arquivo');
          }

          // Create asset record
          const { data: asset, error: assetError } = await supabase
            .from('assets')
            .insert({
              project_id: currentProject.id,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              storage_path: `people-data/${Date.now()}-${file.name}`,
              source_type: dataType === 'perfil_disc' ? 'perfil_disc' : 'pesquisa_clima',
              collaborator_id: collaboratorId || null,
              status: 'processing' as const,
            })
            .select()
            .single();

          if (assetError) throw assetError;

          if (dataType === 'perfil_disc') {
            // Use existing analyze-disc function
            const { error } = await supabase.functions.invoke('analyze-disc', {
              body: {
                projectId: currentProject.id,
                assetId: asset.id,
                content: textContent,
              }
            });

            if (error) throw error;
          } else {
            // Use analyze-people-data function
            const { error } = await supabase.functions.invoke('analyze-people-data', {
              body: {
                projectId: currentProject.id,
                assetId: asset.id,
                content: textContent,
                dataType: 'pesquisa_clima',
              }
            });

            if (error) throw error;
          }

          // Update asset status
          await supabase
            .from('assets')
            .update({ status: 'completed' })
            .eq('id', asset.id);

          successCount++;
        } catch (fileError: any) {
          console.error(`Error processing ${file.name}:`, fileError);
          errorCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['collaborators', currentProject.id] });
      
      if (successCount > 0) {
        toast({
          title: 'Arquivos processados',
          description: `${successCount} arquivo(s) processado(s) com sucesso${errorCount > 0 ? `, ${errorCount} erro(s)` : ''}.`,
        });
      } else {
        toast({
          title: 'Erro no processamento',
          description: 'Nenhum arquivo foi processado com sucesso.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Batch processing error:', error);
      toast({
        title: 'Erro ao processar',
        description: error.message || 'Erro no processamento em lote.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingFile(false);
      setIsBatchModalOpen(false);
      setPendingFiles([]);
      setShowUploadZone(false);
    }
  }, [currentProject, queryClient]);

  const handleBatchCancel = useCallback(() => {
    setIsBatchModalOpen(false);
    setPendingFiles([]);
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
        <PageHeader
          title="Time do Projeto"
          description="Colaboradores mapeados com perfil DISC"
          actions={
            <>
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
            </>
          }
        />

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

        {/* Batch Upload Modal */}
        <PeopleDataBatchModal
          open={isBatchModalOpen}
          files={pendingFiles}
          projectId={currentProject.id}
          onProcessFiles={handleBatchProcess}
          onCancel={handleBatchCancel}
          isProcessing={isProcessingFile}
          currentProcessingIndex={currentProcessingIndex}
        />
      </div>
    </AppLayout>
  );
}
