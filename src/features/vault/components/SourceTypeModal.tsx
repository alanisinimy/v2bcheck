import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { SourceType } from '@/lib/types';
import { SOURCE_TYPES } from '@/lib/types';
import { CollaboratorPicker } from './CollaboratorPicker';
import { AddCollaboratorDialog } from '@/components/team/AddCollaboratorDialog';
import { useCreateCollaborator, type Collaborator } from '@/hooks/useCollaborators';

interface SourceTypeModalProps {
  isOpen: boolean;
  fileName: string;
  projectId: string;
  onConfirm: (sourceType: SourceType, collaboratorId: string | null) => void;
  onCancel: () => void;
}

const sourceTypeOptions: SourceType[] = [
  'entrevista_diretoria',
  'entrevista_operacao',
  'reuniao_kickoff',
  'reuniao_vendas',
  'reuniao_diagnostico',
  'reuniao_planejamento',
  'briefing',
  'documentacao',
  'perfil_disc',
];

// Source types that should show collaborator picker
const SOURCE_TYPES_WITH_COLLABORATOR: SourceType[] = [
  'entrevista_operacao',
  'briefing',
  'perfil_disc',
];

export function SourceTypeModal({ 
  isOpen, 
  fileName, 
  projectId,
  onConfirm, 
  onCancel 
}: SourceTypeModalProps) {
  const [selected, setSelected] = useState<SourceType | null>(null);
  const [collaboratorId, setCollaboratorId] = useState<string | null>(null);
  const [showCreateCollaborator, setShowCreateCollaborator] = useState(false);
  
  const createCollaboratorMutation = useCreateCollaborator();

  const showCollaboratorPicker = selected && SOURCE_TYPES_WITH_COLLABORATOR.includes(selected);

  const handleConfirm = () => {
    if (selected) {
      onConfirm(selected, showCollaboratorPicker ? collaboratorId : null);
      resetState();
    }
  };

  const resetState = () => {
    setSelected(null);
    setCollaboratorId(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onCancel();
      resetState();
    }
  };

  const handleCreateCollaborator = async (data: { name: string; role?: string }) => {
    try {
      const newCollaborator = await createCollaboratorMutation.mutateAsync({
        projectId,
        name: data.name,
        role: data.role,
      });
      
      // Auto-select the newly created collaborator
      setCollaboratorId(newCollaborator.id);
      setShowCreateCollaborator(false);
    } catch (error) {
      console.error('Error creating collaborator:', error);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Qual é a origem deste arquivo?</DialogTitle>
            <DialogDescription className="truncate">
              {fileName}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-4">
            {sourceTypeOptions.map((type) => {
              const config = SOURCE_TYPES[type];
              const isSelected = selected === type;

              return (
                <motion.button
                  key={type}
                  onClick={() => {
                    setSelected(type);
                    // Reset collaborator when changing source type
                    if (!SOURCE_TYPES_WITH_COLLABORATOR.includes(type)) {
                      setCollaboratorId(null);
                    }
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    'flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all duration-200',
                    isSelected
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50 hover:bg-accent/50'
                  )}
                >
                  <span className="text-xl">{config.icon}</span>
                  <span className={cn(
                    'font-medium',
                    isSelected ? 'text-primary' : 'text-foreground'
                  )}>
                    {config.label}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Collaborator Picker - Shows conditionally */}
          <AnimatePresence>
            {showCollaboratorPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2 overflow-hidden"
              >
                <Label className="text-sm font-medium">
                  Este arquivo pertence a algum colaborador?
                </Label>
                <CollaboratorPicker
                  projectId={projectId}
                  value={collaboratorId}
                  onChange={setCollaboratorId}
                  onCreateNew={() => setShowCreateCollaborator(true)}
                />
                {selected === 'perfil_disc' && !collaboratorId && (
                  <p className="text-xs text-muted-foreground">
                    💡 Recomendado vincular a um colaborador para evitar duplicações.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={!selected}>
              Processar Arquivo
            </Button>
          </div>
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
