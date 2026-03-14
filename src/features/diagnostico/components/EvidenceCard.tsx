import { motion } from 'framer-motion';
import { Check, X, Flag, ExternalLink, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Evidence, EvidenceStatus } from '@/lib/types';
import { PILARES, EVIDENCE_TYPES } from '@/lib/types';

interface EvidenceCardProps {
  evidence: Evidence;
  onStatusChange: (id: string, status: EvidenceStatus) => void;
  index: number;
}

const pilarBgClasses: Record<string, string> = {
  pessoas: 'bg-pilar-pessoas',
  processos: 'bg-pilar-processos',
  dados: 'bg-pilar-dados',
  tecnologia: 'bg-pilar-tecnologia',
  gestao: 'bg-pilar-gestao',
};

export function EvidenceCard({ evidence, onStatusChange, index }: EvidenceCardProps) {
  const config = PILARES[evidence.pilar];
  
  const statusStyles = {
    pendente: 'border-border/50',
    validado: 'border-success/50 bg-success/5',
    rejeitado: 'opacity-50 border-destructive/30',
    investigar: 'border-warning/50 bg-warning/5',
  };

  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ 
        opacity: evidence.status === 'rejeitado' ? 0.5 : 1, 
        y: 0, 
        scale: 1 
      }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.03, ease: [0.25, 0.1, 0.25, 1] }}
      layout
      className={cn(
        'bg-card rounded-2xl p-5 border shadow-soft transition-all duration-300 hover:shadow-soft-lg',
        statusStyles[evidence.status]
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg">{config.icon}</span>
          <Badge 
            variant="secondary" 
            className={cn('font-medium', pilarBgClasses[evidence.pilar])}
          >
            {config.label}
          </Badge>
          {evidence.evidence_type && evidence.evidence_type !== 'fato' && (
            <Badge 
              variant="outline" 
              className={cn('gap-1', EVIDENCE_TYPES[evidence.evidence_type].color)}
            >
              <span>{EVIDENCE_TYPES[evidence.evidence_type].icon}</span>
              {EVIDENCE_TYPES[evidence.evidence_type].label}
            </Badge>
          )}
          {evidence.is_divergence && !evidence.evidence_type && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1">
              <AlertTriangle className="w-3 h-3" />
              Divergência
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-foreground leading-relaxed mb-3">
        {evidence.content}
      </p>

      {/* Divergence description */}
      {evidence.is_divergence && evidence.divergence_description && (
        <p className="text-sm text-warning bg-warning/10 rounded-lg p-2 mb-3">
          ⚠️ {evidence.divergence_description}
        </p>
      )}

      {/* Source */}
      {evidence.source_description && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <ExternalLink className="w-3.5 h-3.5" />
          <span>{evidence.source_description}</span>
          {evidence.timecode_start !== null && evidence.timecode_start !== undefined && (
            <span className="text-primary font-medium">
              @ {formatTimecode(evidence.timecode_start)}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-border/50">
        <Button
          size="sm"
          variant={evidence.status === 'validado' ? 'default' : 'outline'}
          className={cn(
            'flex-1 active-scale',
            evidence.status === 'validado' && 'bg-success hover:bg-success/90 text-success-foreground'
          )}
          onClick={() => onStatusChange(evidence.id, evidence.status === 'validado' ? 'pendente' : 'validado')}
        >
          <Check className="w-4 h-4 mr-1" />
          Validar
        </Button>
        <Button
          size="sm"
          variant={evidence.status === 'rejeitado' ? 'default' : 'outline'}
          className={cn(
            'flex-1 active-scale',
            evidence.status === 'rejeitado' && 'bg-destructive hover:bg-destructive/90'
          )}
          onClick={() => onStatusChange(evidence.id, evidence.status === 'rejeitado' ? 'pendente' : 'rejeitado')}
        >
          <X className="w-4 h-4 mr-1" />
          Rejeitar
        </Button>
        <Button
          size="sm"
          variant={evidence.status === 'investigar' ? 'default' : 'outline'}
          className={cn(
            'active-scale',
            evidence.status === 'investigar' && 'bg-warning hover:bg-warning/90 text-warning-foreground'
          )}
          onClick={() => onStatusChange(evidence.id, evidence.status === 'investigar' ? 'pendente' : 'investigar')}
        >
          <Flag className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
