import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SourceType } from '@/lib/types';
import { SOURCE_TYPES } from '@/lib/types';

interface SourceTypeModalProps {
  isOpen: boolean;
  fileName: string;
  onConfirm: (sourceType: SourceType) => void;
  onCancel: () => void;
}

const sourceTypeOptions: SourceType[] = [
  'entrevista_diretoria',
  'entrevista_operacao',
  'reuniao_kickoff',
  'reuniao_vendas',
  'briefing',
  'documentacao',
];

export function SourceTypeModal({ isOpen, fileName, onConfirm, onCancel }: SourceTypeModalProps) {
  const [selected, setSelected] = useState<SourceType | null>(null);

  const handleConfirm = () => {
    if (selected) {
      onConfirm(selected);
      setSelected(null);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onCancel();
      setSelected(null);
    }
  };

  return (
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
                onClick={() => setSelected(type)}
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

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selected}>
            Processar Arquivo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
