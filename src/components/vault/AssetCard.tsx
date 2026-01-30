import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileAudio, FileVideo, FileText, FileSpreadsheet, Check, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Asset } from '@/lib/types';
import { SOURCE_TYPES } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AssetCardProps {
  asset: Asset;
  index: number;
  onDelete?: (assetId: string, storagePath: string) => void;
  isDeleting?: boolean;
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith('audio/')) return FileAudio;
  if (fileType.startsWith('video/')) return FileVideo;
  if (fileType === 'application/pdf') return FileText;
  return FileSpreadsheet;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssetCard({ asset, index, onDelete, isDeleting }: AssetCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const Icon = getFileIcon(asset.file_type);

  const handleDelete = () => {
    onDelete?.(asset.id, asset.storage_path);
    setIsDialogOpen(false);
  };
  
  const statusConfig = {
    uploading: {
      icon: Loader2,
      label: 'Enviando...',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      animate: true,
    },
    processing: {
      icon: Loader2,
      label: 'IA processando...',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      animate: true,
    },
    completed: {
      icon: Check,
      label: 'Concluído',
      color: 'text-success',
      bgColor: 'bg-success/10',
      animate: false,
    },
    error: {
      icon: AlertCircle,
      label: 'Erro',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      animate: false,
    },
  };

  const status = statusConfig[asset.status];
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-card rounded-xl p-4 border border-border/50 shadow-soft flex items-center gap-4"
    >
      {/* File Icon */}
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{asset.file_name}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{formatFileSize(asset.file_size)}</span>
          {asset.duration_seconds && <span>• {Math.floor(asset.duration_seconds / 60)}min</span>}
          {asset.source_type && (
            <>
              <span>•</span>
              <Badge variant="outline" className="text-xs font-normal">
                {SOURCE_TYPES[asset.source_type].icon} {SOURCE_TYPES[asset.source_type].label}
              </Badge>
            </>
          )}
        </div>
        
        {/* Processing skeleton */}
        {asset.status === 'processing' && (
          <div className="mt-2 space-y-1">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-3/4" />
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium', status.bgColor, status.color)}>
        <StatusIcon className={cn('w-3.5 h-3.5', status.animate && 'animate-spin')} />
        <span>{status.label}</span>
      </div>

      {/* Delete Button */}
      {onDelete && (
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O arquivo "{asset.file_name}" e todas as evidências associadas serão permanentemente excluídos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </motion.div>
  );
}
