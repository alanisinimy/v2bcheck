import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, X, Trash2, Loader2, FileText } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyProjectState } from '@/components/layout/EmptyProjectState';
import { PageHeader } from '@/shared/components/PageHeader';
import { FileUploadZone } from '@/components/vault/FileUploadZone';
import { AssetCard } from '@/components/vault/AssetCard';
import { SourceTypeModal } from '@/components/vault/SourceTypeModal';
import { TechnicalNoteModal } from '@/components/vault/TechnicalNoteModal';
import { ProcessingProgress, type ProcessingFileItem } from '@/features/vault/components/ProcessingProgress';
import { VaultFilters } from '@/features/vault/components/VaultFilters';
import { AssetDetailDrawer } from '@/features/vault/components/AssetDetailDrawer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProjectContext } from '@/shared/contexts/ProjectContext';
import { useAssets, useEvidences, useDeleteAsset } from '@/hooks/useProject';
import { useUploadAsset, useUpdateAssetStatus } from '@/hooks/useUploadAsset';
import { analyzeEvidences, extractTextFromFile, analyzeTechnicalNote } from '@/hooks/useAnalyzeEvidences';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { SourceType, Asset } from '@/lib/types';
import type { Pilar } from '@/shared/types/project';

interface PendingFile {
  file: File;
  sourceType?: SourceType;
  collaboratorId?: string | null;
}

export default function Vault() {
  const { currentProject, isLoading: isLoadingProject } = useProjectContext();
  const { data: assets = [], isLoading: isLoadingAssets } = useAssets(currentProject?.id);
  const { data: evidences = [] } = useEvidences(currentProject?.id);
  const uploadAssetMutation = useUploadAsset();
  const updateStatusMutation = useUpdateAssetStatus();
  const deleteAssetMutation = useDeleteAsset();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  // Processing progress state
  const [processingFiles, setProcessingFiles] = useState<ProcessingFileItem[]>([]);

  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // Classification modal state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [classifiedFiles, setClassifiedFiles] = useState<PendingFile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Technical Note modal state
  const [isTechnicalNoteOpen, setIsTechnicalNoteOpen] = useState(false);
  const [isProcessingNote, setIsProcessingNote] = useState(false);

  // Filters
  const [sourceTypeFilter, setSourceTypeFilter] = useState<SourceType | 'all'>('all');
  const [pilarFilter, setPilarFilter] = useState<Pilar | 'all'>('all');

  // Asset detail drawer
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);

  // Filter assets
  const filteredAssets = useMemo(() => {
    let result = assets;
    if (sourceTypeFilter !== 'all') {
      result = result.filter(a => a.source_type === sourceTypeFilter);
    }
    if (pilarFilter !== 'all') {
      // Filter by assets that have evidences in the selected pilar
      const assetIdsWithPilar = new Set(
        evidences.filter(e => e.pilar === pilarFilter).map(e => e.asset_id)
      );
      result = result.filter(a => assetIdsWithPilar.has(a.id));
    }
    return result;
  }, [assets, evidences, sourceTypeFilter, pilarFilter]);

  const updateFileStatus = useCallback((fileId: string, status: ProcessingFileItem['status']) => {
    setProcessingFiles(prev => prev.map(f => f.id === fileId ? { ...f, status } : f));
  }, []);

  const processFiles = useCallback(async (files: PendingFile[]) => {
    if (!currentProject) return;

    // Initialize processing progress
    const items: ProcessingFileItem[] = files.map((f, i) => ({
      id: `file-${Date.now()}-${i}`,
      fileName: f.file.name,
      status: 'queued' as const,
    }));
    setProcessingFiles(items);
    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const { file, sourceType, collaboratorId } = files[i];
      const fileId = items[i].id;
      if (!sourceType) continue;

      try {
        // Step 1: Upload
        updateFileStatus(fileId, 'extracting');
        const asset = await uploadAssetMutation.mutateAsync({
          projectId: currentProject.id,
          file,
          sourceType,
          collaboratorId: collaboratorId || undefined,
        });

        // Step 2: Extract text
        const textContent = await extractTextFromFile(file);

        if (textContent) {
          // Step 3: Classify
          updateFileStatus(fileId, 'classifying');

          const result = await analyzeEvidences({
            projectId: currentProject.id,
            assetId: asset.id,
            content: textContent,
            sourceDescription: file.name,
            sourceType,
            collaboratorId: collaboratorId || undefined,
          });

          if (result.error) {
            await updateStatusMutation.mutateAsync({
              assetId: asset.id,
              status: 'error',
              projectId: currentProject.id,
            });
            updateFileStatus(fileId, 'error');
            toast({ title: 'Erro na análise', description: result.error, variant: 'destructive' });
          } else {
            // Step 4: Index
            updateFileStatus(fileId, 'indexing');
            await updateStatusMutation.mutateAsync({
              assetId: asset.id,
              status: 'completed',
              projectId: currentProject.id,
            });
            queryClient.invalidateQueries({ queryKey: ['evidences', currentProject.id] });

            if (sourceType === 'perfil_disc') {
              queryClient.invalidateQueries({ queryKey: ['collaborators', currentProject.id] });
              if (result.collaborator) {
                toast({
                  title: result.isNewCollaborator ? 'Colaborador cadastrado' : 'Perfil atualizado',
                  description: `${result.collaborator.name} foi ${result.isNewCollaborator ? 'adicionado ao time' : 'atualizado'} automaticamente.`,
                });
              }
            } else {
              toast({ title: 'IA processou o arquivo', description: `${result.count} gaps extraídos de ${file.name}.` });
            }
            updateFileStatus(fileId, 'done');
          }
        } else {
          await updateStatusMutation.mutateAsync({
            assetId: asset.id,
            status: 'completed',
            projectId: currentProject.id,
          });
          updateFileStatus(fileId, 'done');
          toast({ title: 'Arquivo processado', description: `${file.name} foi salvo.` });
        }
      } catch (error) {
        console.error('Upload error:', error);
        updateFileStatus(fileId, 'error');
        toast({ title: 'Erro no upload', description: `Não foi possível processar ${file.name}.`, variant: 'destructive' });
      }
    }

    setIsUploading(false);
    // Clear processing files after a delay
    setTimeout(() => setProcessingFiles([]), 3000);
  }, [currentProject, uploadAssetMutation, updateStatusMutation, queryClient, updateFileStatus]);

  const handleFilesSelected = useCallback((files: File[]) => {
    if (files.length === 0) return;
    setPendingFiles(files);
    setCurrentFileIndex(0);
    setClassifiedFiles([]);
    setIsModalOpen(true);
  }, []);

  const handleSourceTypeConfirm = useCallback((sourceType: SourceType, collaboratorId: string | null) => {
    const currentFile = pendingFiles[currentFileIndex];
    const newClassified = [...classifiedFiles, { file: currentFile, sourceType, collaboratorId }];

    if (currentFileIndex < pendingFiles.length - 1) {
      setClassifiedFiles(newClassified);
      setCurrentFileIndex(currentFileIndex + 1);
    } else {
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

  const handleTechnicalNoteSubmit = useCallback(async (title: string, content: string) => {
    if (!currentProject) return;
    setIsProcessingNote(true);
    try {
      const result = await analyzeTechnicalNote({ projectId: currentProject.id, title, content });
      if (result.error) {
        toast({ title: 'Erro na análise', description: result.error, variant: 'destructive' });
      } else {
        queryClient.invalidateQueries({ queryKey: ['assets', currentProject.id] });
        queryClient.invalidateQueries({ queryKey: ['evidences', currentProject.id] });
        toast({ title: 'Nota técnica processada', description: `${result.count} gaps estratégicos extraídos.` });
        setIsTechnicalNoteOpen(false);
      }
    } catch (error) {
      console.error('Technical note error:', error);
      toast({ title: 'Erro ao processar nota', description: 'Não foi possível processar a nota técnica.', variant: 'destructive' });
    } finally {
      setIsProcessingNote(false);
    }
  }, [currentProject, queryClient]);

  const handleDeleteAsset = useCallback(async (assetId: string, storagePath: string) => {
    if (!currentProject) return;
    setDeletingAssetId(assetId);
    try {
      await deleteAssetMutation.mutateAsync({ assetId, storagePath, projectId: currentProject.id });
      toast({ title: 'Arquivo excluído', description: 'O arquivo e suas evidências foram removidos.' });
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'Erro ao excluir', description: 'Não foi possível excluir o arquivo.', variant: 'destructive' });
    } finally {
      setDeletingAssetId(null);
    }
  }, [currentProject, deleteAssetMutation]);

  // Selection handlers
  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => !prev);
    setSelectedAssets(new Set());
  }, []);

  const handleSelectionChange = useCallback((assetId: string, selected: boolean) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (selected) next.add(assetId); else next.delete(assetId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedAssets.size === filteredAssets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(filteredAssets.map(a => a.id)));
    }
  }, [filteredAssets, selectedAssets.size]);

  const handleBulkDelete = useCallback(async () => {
    if (!currentProject || selectedAssets.size === 0) return;
    setIsBulkDeleting(true);
    setShowBulkDeleteDialog(false);
    const assetsToDelete = assets.filter(a => selectedAssets.has(a.id));
    let deletedCount = 0;
    let errorCount = 0;
    for (const asset of assetsToDelete) {
      try {
        await deleteAssetMutation.mutateAsync({ assetId: asset.id, storagePath: asset.storage_path, projectId: currentProject.id });
        deletedCount++;
      } catch { errorCount++; }
    }
    setIsBulkDeleting(false);
    setSelectedAssets(new Set());
    setIsSelectionMode(false);
    toast({
      title: errorCount === 0 ? 'Arquivos excluídos' : 'Exclusão parcial',
      description: errorCount === 0 ? `${deletedCount} arquivo(s) removidos.` : `${deletedCount} excluído(s), ${errorCount} erro(s).`,
      variant: errorCount > 0 ? 'destructive' : undefined,
    });
  }, [currentProject, selectedAssets, assets, deleteAssetMutation]);

  const isLoading = isLoadingProject || isLoadingAssets;
  const currentFileName = pendingFiles[currentFileIndex]?.name || '';
  const allSelected = filteredAssets.length > 0 && selectedAssets.size === filteredAssets.length;
  const someSelected = selectedAssets.size > 0 && selectedAssets.size < filteredAssets.length;

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
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <PageHeader
          title="The Vault"
          description="Central de ingestão de dados. Faça upload de reuniões, documentos e planilhas."
          actions={
            <Button variant="outline" onClick={() => setIsTechnicalNoteOpen(true)} className="gap-2">
              <FileText className="w-4 h-4" />
              Adicionar Nota Técnica
            </Button>
          }
        />

        {/* Upload Zone */}
        <FileUploadZone onFilesSelected={handleFilesSelected} isUploading={isUploading} />

        {/* Source Type Classification Modal */}
        <SourceTypeModal
          isOpen={isModalOpen}
          fileName={currentFileName}
          projectId={currentProject.id}
          onConfirm={handleSourceTypeConfirm}
          onCancel={handleSourceTypeCancel}
        />

        {/* Technical Note Modal */}
        <TechnicalNoteModal
          open={isTechnicalNoteOpen}
          onOpenChange={setIsTechnicalNoteOpen}
          onSubmit={handleTechnicalNoteSubmit}
          isProcessing={isProcessingNote}
        />

        {/* 4.1 Processing Progress */}
        <AnimatePresence>
          {processingFiles.length > 0 && (
            <ProcessingProgress files={processingFiles} />
          )}
        </AnimatePresence>

        {/* Assets Section */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          {/* Section Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Arquivos Processados ({assets.length})
            </h2>
            {assets.length > 0 && (
              <Button
                variant={isSelectionMode ? 'secondary' : 'outline'}
                size="sm"
                onClick={toggleSelectionMode}
                className="gap-2"
              >
                {isSelectionMode ? <><X className="w-4 h-4" /> Cancelar</> : <><CheckSquare className="w-4 h-4" /> Selecionar</>}
              </Button>
            )}
          </div>

          {/* 4.2 Filters */}
          {assets.length > 0 && (
            <div className="mb-4">
              <VaultFilters
                sourceTypeFilter={sourceTypeFilter}
                pilarFilter={pilarFilter}
                onSourceTypeChange={setSourceTypeFilter}
                onPilarChange={setPilarFilter}
              />
            </div>
          )}

          {/* Bulk Actions Bar */}
          <AnimatePresence>
            {isSelectionMode && filteredAssets.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
                    <span className="text-sm text-muted-foreground">
                      {selectedAssets.size === 0
                        ? 'Nenhum selecionado'
                        : `${selectedAssets.size} de ${filteredAssets.length} selecionado(s)`}
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={selectedAssets.size === 0 || isBulkDeleting}
                    onClick={() => setShowBulkDeleteDialog(true)}
                    className="gap-2"
                  >
                    {isBulkDeleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Excluindo...</> : <><Trash2 className="w-4 h-4" /> Excluir ({selectedAssets.size})</>}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Asset List */}
          <div className="space-y-3">
            {filteredAssets.map((asset, index) => (
              <div
                key={asset.id}
                onClick={() => !isSelectionMode && setDetailAsset(asset)}
                className={!isSelectionMode ? 'cursor-pointer' : undefined}
              >
                <AssetCard
                  asset={asset}
                  index={index}
                  onDelete={handleDeleteAsset}
                  isDeleting={deletingAssetId === asset.id}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedAssets.has(asset.id)}
                  onSelectionChange={handleSelectionChange}
                />
              </div>
            ))}
          </div>

          {filteredAssets.length === 0 && assets.length > 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum arquivo corresponde aos filtros selecionados.</p>
            </div>
          )}

          {assets.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum arquivo ainda. Comece fazendo upload acima.</p>
            </div>
          )}
        </motion.section>

        {/* Asset Detail Drawer */}
        <AssetDetailDrawer
          asset={detailAsset}
          evidences={evidences}
          open={!!detailAsset}
          onClose={() => setDetailAsset(null)}
        />

        {/* Bulk Delete Confirmation */}
        <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir {selectedAssets.size} arquivo(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todos os arquivos selecionados e suas evidências serão permanentemente excluídos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir {selectedAssets.size} arquivo(s)
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
