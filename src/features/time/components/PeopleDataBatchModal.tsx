import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Users, ChevronRight, Zap, SkipForward } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { CollaboratorPicker } from '@/components/vault/CollaboratorPicker';
import { AddCollaboratorDialog } from '@/components/team/AddCollaboratorDialog';
import { useCreateCollaborator } from '@/hooks/useCollaborators';
import { cn } from '@/lib/utils';

type PeopleDataType = 'perfil_disc' | 'pesquisa_clima';

export interface ClassifiedFile {
  file: File;
  dataType: PeopleDataType;
  collaboratorId?: string;
}

interface PeopleDataBatchModalProps {
  open: boolean;
  files: File[];
  projectId: string;
  onProcessFiles: (classifiedFiles: ClassifiedFile[]) => Promise<void>;
  onCancel: () => void;
  isProcessing: boolean;
  currentProcessingIndex: number;
}

function detectDataType(file: File): PeopleDataType {
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'perfil_disc';
  if (ext === 'csv') return 'pesquisa_clima';
  // Default to DISC for unknown types
  return 'perfil_disc';
}

export function PeopleDataBatchModal({
  open,
  files,
  projectId,
  onProcessFiles,
  onCancel,
  isProcessing,
  currentProcessingIndex,
}: PeopleDataBatchModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [classifiedFiles, setClassifiedFiles] = useState<ClassifiedFile[]>([]);
  const [currentCollaboratorId, setCurrentCollaboratorId] = useState<string | null>(null);
  const [showCreateCollaborator, setShowCreateCollaborator] = useState(false);
  
  const createCollaboratorMutation = useCreateCollaborator();

  const currentFile = files[currentIndex];
  const detectedType = currentFile ? detectDataType(currentFile) : 'perfil_disc';
  const totalFiles = files.length;
  const progressPercent = totalFiles > 0 ? ((currentIndex + 1) / totalFiles) * 100 : 0;

  const skippedCount = useMemo(() => {
    return currentIndex - classifiedFiles.length;
  }, [currentIndex, classifiedFiles.length]);

  const handleNext = () => {
    // Add current file to classified list
    const newClassified: ClassifiedFile = {
      file: currentFile,
      dataType: detectedType,
      collaboratorId: detectedType === 'perfil_disc' ? (currentCollaboratorId ?? undefined) : undefined,
    };
    
    setClassifiedFiles(prev => [...prev, newClassified]);
    setCurrentCollaboratorId(null);
    
    if (currentIndex < totalFiles - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Last file - trigger processing with all classified files
      onProcessFiles([...classifiedFiles, newClassified]);
    }
  };

  const handleSkip = () => {
    setCurrentCollaboratorId(null);
    
    if (currentIndex < totalFiles - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Last file skipped - process only classified files
      if (classifiedFiles.length > 0) {
        onProcessFiles(classifiedFiles);
      } else {
        onCancel();
      }
    }
  };

  const handleProcessAll = () => {
    // Auto-classify all remaining files
    const allClassified: ClassifiedFile[] = files.map(file => ({
      file,
      dataType: detectDataType(file),
      // No collaborator assignment when processing all
    }));
    
    onProcessFiles(allClassified);
  };

  const handleCreateCollaborator = async (data: { name: string; role?: string }) => {
    try {
      const newCollaborator = await createCollaboratorMutation.mutateAsync({
        projectId,
        name: data.name,
        role: data.role,
      });
      
      setCurrentCollaboratorId(newCollaborator.id);
      setShowCreateCollaborator(false);
    } catch (error) {
      console.error('Error creating collaborator:', error);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !isProcessing) {
      onCancel();
      // Reset state
      setCurrentIndex(0);
      setClassifiedFiles([]);
      setCurrentCollaboratorId(null);
    }
  };

  // Processing view
  if (isProcessing) {
    const processingProgress = totalFiles > 0 
      ? ((currentProcessingIndex + 1) / totalFiles) * 100 
      : 0;
    
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Processando Arquivos</DialogTitle>
            <DialogDescription>
              Arquivo {currentProcessingIndex + 1} de {totalFiles}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            <Progress value={processingProgress} className="h-2" />
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <FileText className="h-5 w-5 text-muted-foreground animate-pulse" />
              <span className="text-sm font-medium truncate">
                {files[currentProcessingIndex]?.name || 'Processando...'}
              </span>
            </div>
            
            <p className="text-xs text-center text-muted-foreground">
              Extraindo dados e atualizando perfis...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Classificar Arquivos</span>
              <span className="text-sm font-normal text-muted-foreground">
                {currentIndex + 1} de {totalFiles}
              </span>
            </DialogTitle>
            <DialogDescription>
              {totalFiles > 1 
                ? 'Classifique cada arquivo ou processe todos automaticamente'
                : 'Confirme o tipo do arquivo para processar'
              }
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar */}
          <Progress value={progressPercent} className="h-1" />

          {/* Current file info */}
          <AnimatePresence mode="wait">
            {currentFile && (
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 py-2"
              >
                {/* File card */}
                <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30">
                  {detectedType === 'perfil_disc' ? (
                    <FileText className="h-8 w-8 text-primary" />
                  ) : (
                    <Users className="h-8 w-8 text-primary" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{currentFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Tipo detectado: {detectedType === 'perfil_disc' ? 'PDF (Perfil DISC)' : 'CSV (Pesquisa de Clima)'}
                    </p>
                  </div>
                </div>

                {/* Collaborator picker - only for DISC */}
                {detectedType === 'perfil_disc' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Vincular a colaborador existente?
                    </Label>
                    <CollaboratorPicker
                      projectId={projectId}
                      value={currentCollaboratorId}
                      onChange={setCurrentCollaboratorId}
                      onCreateNew={() => setShowCreateCollaborator(true)}
                    />
                    <p className="text-xs text-muted-foreground">
                      💡 Se não vincular, o colaborador será criado automaticamente do PDF.
                    </p>
                  </div>
                )}

                {detectedType === 'pesquisa_clima' && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 inline mr-2" />
                    Pesquisas de clima são processadas em lote e vinculadas automaticamente.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2">
            {totalFiles > 1 && currentIndex === 0 && (
              <Button 
                variant="secondary" 
                onClick={handleProcessAll}
                className="w-full gap-2"
              >
                <Zap className="h-4 w-4" />
                Processar Todos ({totalFiles} arquivos)
              </Button>
            )}
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleSkip}
                className="flex-1 gap-2"
              >
                <SkipForward className="h-4 w-4" />
                Pular
              </Button>
              <Button 
                onClick={handleNext}
                className="flex-1 gap-2"
              >
                {currentIndex === totalFiles - 1 ? 'Processar' : 'Próximo'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Skipped indicator */}
          {skippedCount > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              {skippedCount} arquivo(s) será(ão) ignorado(s)
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Collaborator Sub-Dialog */}
      <AddCollaboratorDialog
        isOpen={showCreateCollaborator}
        onClose={() => setShowCreateCollaborator(false)}
        onConfirm={handleCreateCollaborator}
        isLoading={createCollaboratorMutation.isPending}
      />
    </>
  );
}
