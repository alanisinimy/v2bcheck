import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Clock } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Progress } from '@/components/ui/progress';

export interface ProcessingFileItem {
  id: string;
  fileName: string;
  status: 'queued' | 'extracting' | 'classifying' | 'indexing' | 'done' | 'error';
}

interface ProcessingProgressProps {
  files: ProcessingFileItem[];
}

const statusConfig: Record<ProcessingFileItem['status'], { icon: React.ReactNode; label: string }> = {
  queued: { icon: <Clock className="w-4 h-4 text-muted-foreground" />, label: 'Na fila' },
  extracting: { icon: <Loader2 className="w-4 h-4 text-primary animate-spin" />, label: 'Extraindo texto...' },
  classifying: { icon: <Loader2 className="w-4 h-4 text-primary animate-spin" />, label: 'Classificando por pilar...' },
  indexing: { icon: <Loader2 className="w-4 h-4 text-primary animate-spin" />, label: 'Indexando...' },
  done: { icon: <Check className="w-4 h-4 text-success" />, label: 'Concluído' },
  error: { icon: <span className="text-destructive text-sm">✗</span>, label: 'Erro' },
};

const statusEmoji: Record<ProcessingFileItem['status'], string> = {
  queued: '⏳',
  extracting: '🔄',
  classifying: '🔄',
  indexing: '🔄',
  done: '✅',
  error: '❌',
};

export function ProcessingProgress({ files }: ProcessingProgressProps) {
  const doneCount = files.filter(f => f.status === 'done').length;
  const pct = files.length > 0 ? Math.round((doneCount / files.length) * 100) : 0;

  if (files.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-soft overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Loader2 className="w-4 h-4 text-primary animate-spin" />
        <span className="text-sm font-semibold text-foreground">Processando arquivos...</span>
      </div>

      {/* File list */}
      <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto">
        <AnimatePresence>
          {files.map((file) => {
            const config = statusConfig[file.status];
            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between gap-3 py-1.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm flex-shrink-0">{statusEmoji[file.status]}</span>
                  <span className={cn(
                    'text-sm truncate',
                    file.status === 'done' ? 'text-muted-foreground' : 'text-foreground'
                  )}>
                    {file.fileName}
                  </span>
                </div>
                <span className={cn(
                  'text-xs flex-shrink-0 font-medium',
                  file.status === 'done' ? 'text-success' :
                  file.status === 'error' ? 'text-destructive' :
                  file.status === 'queued' ? 'text-muted-foreground' : 'text-primary'
                )}>
                  {config.label}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <Progress value={pct} className="h-2 flex-1 [&>div]:bg-primary" />
        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
          {doneCount} de {files.length} processados
        </span>
      </div>
    </motion.div>
  );
}
