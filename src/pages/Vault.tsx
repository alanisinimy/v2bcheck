import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyProjectState } from '@/components/layout/EmptyProjectState';
import { FileUploadZone } from '@/components/vault/FileUploadZone';
import { AssetCard } from '@/components/vault/AssetCard';
import { SourceTypeModal } from '@/components/vault/SourceTypeModal';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useAssets, useDeleteAsset } from '@/hooks/useProject';
import { useUploadAsset, useUpdateAssetStatus } from '@/hooks/useUploadAsset';
import { analyzeEvidences, extractTextFromFile } from '@/hooks/useAnalyzeEvidences';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { SourceType } from '@/lib/types';

interface PendingFile {
  file: File;
  sourceType?: SourceType;
}

export default function Vault() {
  const { currentProject, isLoading: isLoadingProject } = useProjectContext();
  const { data: assets = [], isLoading: isLoadingAssets } = useAssets(currentProject?.id);
  const uploadAssetMutation = useUploadAsset();
  const updateStatusMutation = useUpdateAssetStatus();
  const deleteAssetMutation = useDeleteAsset();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
  
  // Classification modal state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [classifiedFiles, setClassifiedFiles] = useState<PendingFile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const processFiles = useCallback(async (files: PendingFile[]) => {
    if (!currentProject) return;
    
    setIsUploading(true);
    
    for (const { file, sourceType } of files) {
      if (!sourceType) continue;
      
      try {
        // Step 1: Upload file to storage and create asset record
        setProcessingMessage(`Enviando ${file.name}...`);
        const asset = await uploadAssetMutation.mutateAsync({
          projectId: currentProject.id,
          file,
          sourceType,
        });

        toast({
          title: 'Upload concluído',
          description: `${file.name} foi enviado com sucesso.`,
        });

        // Step 2: Extract text from file
        setProcessingMessage(`Extraindo texto de ${file.name}...`);
        const textContent = await extractTextFromFile(file);

        if (textContent) {
          // Step 3: Analyze with AI
          setProcessingMessage(`Analisando ${file.name} com IA...`);
          
          const result = await analyzeEvidences({
            projectId: currentProject.id,
            assetId: asset.id,
            content: textContent,
            sourceDescription: file.name,
            sourceType,
          });

          if (result.error) {
            // Update asset status to error
            await updateStatusMutation.mutateAsync({
              assetId: asset.id,
              status: 'error',
              projectId: currentProject.id,
            });

            toast({
              title: 'Erro na análise',
              description: result.error,
              variant: 'destructive',
            });
          } else {
            // Step 4: Update asset status to completed
            await updateStatusMutation.mutateAsync({
              assetId: asset.id,
              status: 'completed',
              projectId: currentProject.id,
            });

            // Invalidate evidences query to refresh Matriz
            queryClient.invalidateQueries({ queryKey: ['evidences', currentProject.id] });
            
            // If it's a DISC profile, also invalidate collaborators
            if (sourceType === 'perfil_disc') {
              queryClient.invalidateQueries({ queryKey: ['collaborators', currentProject.id] });
              
              if (result.collaborator) {
                toast({
                  title: result.isNewCollaborator ? 'Colaborador cadastrado' : 'Perfil atualizado',
                  description: `${result.collaborator.name} foi ${result.isNewCollaborator ? 'adicionado ao time' : 'atualizado'} automaticamente.`,
                });
              }
            } else {
              toast({
                title: 'IA processou o arquivo',
                description: `${result.count} evidências extraídas de ${file.name}.`,
              });
            }
          }
        } else {
          // File type not supported for text extraction
          await updateStatusMutation.mutateAsync({
            assetId: asset.id,
            status: 'completed',
            projectId: currentProject.id,
          });

          toast({
            title: 'Arquivo processado',
            description: `${file.name} foi salvo (tipo não suportado para extração de texto).`,
          });
        }

      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: 'Erro no upload',
          description: `Não foi possível processar ${file.name}.`,
          variant: 'destructive',
        });
      }
    }
    
    setIsUploading(false);
    setProcessingMessage(null);
  }, [currentProject, uploadAssetMutation, updateStatusMutation, queryClient]);

  const handleFilesSelected = useCallback((files: File[]) => {
    if (files.length === 0) return;
    
    // Start classification flow
    setPendingFiles(files);
    setCurrentFileIndex(0);
    setClassifiedFiles([]);
    setIsModalOpen(true);
  }, []);

  const handleSourceTypeConfirm = useCallback((sourceType: SourceType) => {
    const currentFile = pendingFiles[currentFileIndex];
    const newClassified = [...classifiedFiles, { file: currentFile, sourceType }];
    
    if (currentFileIndex < pendingFiles.length - 1) {
      // More files to classify
      setClassifiedFiles(newClassified);
      setCurrentFileIndex(currentFileIndex + 1);
    } else {
      // All files classified, start processing
      setIsModalOpen(false);
      setPendingFiles([]);
      setCurrentFileIndex(0);
      setClassifiedFiles([]);
      processFiles(newClassified);
    }
  }, [pendingFiles, currentFileIndex, classifiedFiles, processFiles]);

  const handleSourceTypeCancel = useCallback(() => {
    setIsModalOpen(false);
    setPendingFiles([]);
    setCurrentFileIndex(0);
    setClassifiedFiles([]);
  }, []);

  const handleDeleteAsset = useCallback(async (assetId: string, storagePath: string) => {
    if (!currentProject) return;
    
    setDeletingAssetId(assetId);
    
    try {
      await deleteAssetMutation.mutateAsync({
        assetId,
        storagePath,
        projectId: currentProject.id,
      });
      
      toast({
        title: 'Arquivo excluído',
        description: 'O arquivo e suas evidências foram removidos.',
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o arquivo.',
        variant: 'destructive',
      });
    } finally {
      setDeletingAssetId(null);
    }
  }, [currentProject, deleteAssetMutation]);

  const isLoading = isLoadingProject || isLoadingAssets;
  const currentFileName = pendingFiles[currentFileIndex]?.name || '';

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
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">The Vault</h1>
          <p className="text-muted-foreground">
            Central de ingestão de dados. Faça upload de reuniões, documentos e planilhas.
          </p>
        </motion.header>

        {/* Upload Zone */}
        <FileUploadZone 
          onFilesSelected={handleFilesSelected}
          isUploading={isUploading}
        />

        {/* Source Type Classification Modal */}
        <SourceTypeModal
          isOpen={isModalOpen}
          fileName={currentFileName}
          onConfirm={handleSourceTypeConfirm}
          onCancel={handleSourceTypeCancel}
        />

        {/* Processing Message */}
        {processingMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-foreground">{processingMessage}</span>
            </div>
          </motion.div>
        )}

        {/* Assets List */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Arquivos Processados ({assets.length})
          </h2>
          
          <div className="space-y-3">
            {assets.map((asset, index) => (
              <AssetCard 
                key={asset.id} 
                asset={asset} 
                index={index}
                onDelete={handleDeleteAsset}
                isDeleting={deletingAssetId === asset.id}
              />
            ))}
          </div>

          {assets.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum arquivo ainda. Comece fazendo upload acima.</p>
            </div>
          )}
        </motion.section>
      </div>
    </AppLayout>
  );
}
