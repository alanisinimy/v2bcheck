import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Edit2, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Initiative, InitiativeStatus } from '@/hooks/useInitiatives';
import { PILARES } from '@/lib/types';

interface InitiativeCardProps {
  initiative: Initiative;
  index: number;
  onUpdateStatus: (status: InitiativeStatus) => void;
  onDelete: () => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

const IMPACT_CONFIG = {
  low: { label: 'Baixo', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'Médio', color: 'bg-warning/15 text-warning' },
  high: { label: 'Alto', color: 'bg-success/15 text-success' },
};

const EFFORT_CONFIG = {
  low: { label: 'Baixo', color: 'bg-success/15 text-success' },
  medium: { label: 'Médio', color: 'bg-warning/15 text-warning' },
  high: { label: 'Alto', color: 'bg-destructive/15 text-destructive' },
};

const STATUS_CONFIG: Record<InitiativeStatus, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground' },
  approved: { label: 'Aprovada', color: 'bg-success/15 text-success' },
  in_progress: { label: 'Em Andamento', color: 'bg-primary/15 text-primary' },
  done: { label: 'Concluída', color: 'bg-success/15 text-success' },
};

export function InitiativeCard({
  initiative,
  index,
  onUpdateStatus,
  onDelete,
  isUpdating = false,
  isDeleting = false,
}: InitiativeCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  const impactConfig = IMPACT_CONFIG[initiative.impact];
  const effortConfig = EFFORT_CONFIG[initiative.effort];
  const statusConfig = STATUS_CONFIG[initiative.status];
  const pilarConfig = initiative.target_pilar ? PILARES[initiative.target_pilar] : null;

  const isApproved = initiative.status === 'approved' || initiative.status === 'in_progress' || initiative.status === 'done';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        'glass rounded-xl p-5 border transition-all duration-200',
        isApproved ? 'border-success/30 bg-success/5' : 'border-border/50'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-muted-foreground/50">
            {index + 1}
          </span>
          <div>
            <h3 className="font-semibold text-foreground">{initiative.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={impactConfig.color}>
                Impacto: {impactConfig.label}
              </Badge>
              <Badge className={effortConfig.color}>
                Esforço: {effortConfig.label}
              </Badge>
              {pilarConfig && (
                <Badge variant="outline">
                  {pilarConfig.icon} {pilarConfig.label}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
      </div>

      {initiative.description && (
        <p className="text-sm text-foreground mb-3 pl-10">
          {initiative.description}
        </p>
      )}

      {initiative.reasoning && (
        <div className="pl-10 mb-4">
          <p className="text-sm text-muted-foreground italic">
            "{initiative.reasoning}"
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
        {initiative.status === 'draft' && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus('approved')}
              disabled={isUpdating}
              className="text-success hover:text-success"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Aprovar
                </>
              )}
            </Button>
            
            {showConfirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Descartar?</span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sim'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowConfirmDelete(false)}
                >
                  Não
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowConfirmDelete(true)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Descartar
              </Button>
            )}
          </>
        )}

        {initiative.status === 'approved' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdateStatus('in_progress')}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Iniciar Execução'
            )}
          </Button>
        )}

        {initiative.status === 'in_progress' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdateStatus('done')}
            disabled={isUpdating}
            className="text-success hover:text-success"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                Marcar como Concluída
              </>
            )}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
