import { motion } from 'framer-motion';
import { FileAudio, FileVideo, FileText, FileSpreadsheet, Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Asset } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface AssetCardProps {
  asset: Asset;
  index: number;
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

export function AssetCard({ asset, index }: AssetCardProps) {
  const Icon = getFileIcon(asset.file_type);
  
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
        <p className="text-sm text-muted-foreground">
          {formatFileSize(asset.file_size)}
          {asset.duration_seconds && ` • ${Math.floor(asset.duration_seconds / 60)}min`}
        </p>
        
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
    </motion.div>
  );
}
