import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyProjectState } from '@/components/layout/EmptyProjectState';
import { FileUploadZone } from '@/components/vault/FileUploadZone';
import { AssetCard } from '@/components/vault/AssetCard';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useAssets } from '@/hooks/useProject';
import { useUploadAsset, useUpdateAssetStatus } from '@/hooks/useUploadAsset';
import { toast } from '@/hooks/use-toast';

export default function Vault() {
  const { currentProject, isLoading: isLoadingProject } = useProjectContext();
  const { data: assets = [], isLoading: isLoadingAssets } = useAssets(currentProject?.id);
  const uploadAssetMutation = useUploadAsset();
  const updateStatusMutation = useUpdateAssetStatus();
  const [isUploading, setIsUploading] = useState(false);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (!currentProject) return;
    
    setIsUploading(true);
    
    for (const file of files) {
      try {
        // Upload file to storage and create asset record
        const asset = await uploadAssetMutation.mutateAsync({
          projectId: currentProject.id,
          file,
        });

        toast({
          title: 'Upload concluído',
          description: `${file.name} foi enviado com sucesso.`,
        });

        // Simulate AI processing delay, then update to completed
        setTimeout(async () => {
          try {
            await updateStatusMutation.mutateAsync({
              assetId: asset.id,
              status: 'completed',
              projectId: currentProject.id,
            });

            toast({
              title: 'Arquivo processado',
              description: `${file.name} foi analisado pela IA com sucesso.`,
            });
          } catch (error) {
            console.error('Error updating asset status:', error);
          }
        }, 3000);

      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: 'Erro no upload',
          description: `Não foi possível enviar ${file.name}.`,
          variant: 'destructive',
        });
      }
    }
    
    setIsUploading(false);
  }, [currentProject, uploadAssetMutation, updateStatusMutation]);

  const isLoading = isLoadingProject || isLoadingAssets;

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
              <AssetCard key={asset.id} asset={asset} index={index} />
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
