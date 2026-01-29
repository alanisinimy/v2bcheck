import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyProjectState } from '@/components/layout/EmptyProjectState';
import { FileUploadZone } from '@/components/vault/FileUploadZone';
import { AssetCard } from '@/components/vault/AssetCard';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useAssets } from '@/hooks/useProject';
import type { Asset } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

// Mock assets generator based on project
const getMockAssets = (projectId: string): Asset[] => [
  {
    id: '1',
    project_id: projectId,
    file_name: 'Reunião de Kick-off - TechCorp.mp3',
    file_type: 'audio/mpeg',
    file_size: 45678901,
    storage_path: 'demo/kickoff.mp3',
    status: 'completed',
    duration_seconds: 3720,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    project_id: projectId,
    file_name: 'Entrevista Equipe Comercial.mp4',
    file_type: 'video/mp4',
    file_size: 234567890,
    storage_path: 'demo/entrevista.mp4',
    status: 'completed',
    duration_seconds: 5400,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    project_id: projectId,
    file_name: 'Processos Comerciais - Documentação.pdf',
    file_type: 'application/pdf',
    file_size: 2345678,
    storage_path: 'demo/processos.pdf',
    status: 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    project_id: projectId,
    file_name: 'Pipeline Q4 2023.csv',
    file_type: 'text/csv',
    file_size: 123456,
    storage_path: 'demo/pipeline.csv',
    status: 'processing',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function Vault() {
  const { currentProject, isLoading } = useProjectContext();
  const { data: dbAssets } = useAssets(currentProject?.id || '');
  const [localAssets, setLocalAssets] = useState<Asset[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Get mock assets for current project
  const mockAssets = currentProject ? getMockAssets(currentProject.id) : [];
  
  // Combine DB assets with mock assets for demo
  const assets = dbAssets?.length ? dbAssets : [...mockAssets, ...localAssets];

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (!currentProject) return;
    
    setIsUploading(true);
    
    for (const file of files) {
      // Create a temporary local asset for immediate feedback
      const tempAsset: Asset = {
        id: `temp-${Date.now()}-${file.name}`,
        project_id: currentProject.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: '',
        status: 'uploading',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      setLocalAssets(prev => [tempAsset, ...prev]);

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update to processing
      setLocalAssets(prev => 
        prev.map(a => a.id === tempAsset.id ? { ...a, status: 'processing' as const } : a)
      );

      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Update to completed
      setLocalAssets(prev => 
        prev.map(a => a.id === tempAsset.id ? { ...a, status: 'completed' as const } : a)
      );

      toast({
        title: 'Arquivo processado',
        description: `${file.name} foi analisado pela IA com sucesso.`,
      });
    }
    
    setIsUploading(false);
  }, [currentProject]);

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
