import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DiscProfileBars } from './DiscProfileBars';
import { cn } from '@/lib/utils';
import type { Collaborator } from '@/hooks/useCollaborators';

interface CollaboratorCardProps {
  collaborator: Collaborator;
  onInferProfile: () => void;
  onDelete: () => void;
  isInferring?: boolean;
  isDeleting?: boolean;
}

const STYLE_NAMES: Record<string, { name: string; emoji: string }> = {
  D: { name: 'Dominante', emoji: '🦁' },
  I: { name: 'Comunicador', emoji: '🌟' },
  S: { name: 'Estável', emoji: '🤝' },
  C: { name: 'Analítico', emoji: '🔍' },
};

const SOURCE_LABELS: Record<string, { label: string; icon: string }> = {
  pdf_auto: { label: 'PDF Auto', icon: '📋' },
  ai_inferred: { label: 'IA Inferido', icon: '🕵️' },
  manual: { label: 'Manual', icon: '✍️' },
};

export function CollaboratorCard({
  collaborator,
  onInferProfile,
  onDelete,
  isInferring = false,
  isDeleting = false,
}: CollaboratorCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  const hasProfile = !!collaborator.disc_profile;
  const style = collaborator.primary_style ? STYLE_NAMES[collaborator.primary_style] : null;
  const source = SOURCE_LABELS[collaborator.profile_source];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4 border border-border/50"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-foreground">{collaborator.name}</h3>
          {collaborator.role && (
            <p className="text-sm text-muted-foreground">{collaborator.role}</p>
          )}
        </div>
        <Badge variant="secondary" className="text-xs">
          {source.icon} {source.label}
        </Badge>
      </div>

      {hasProfile && collaborator.disc_profile ? (
        <>
          <DiscProfileBars profile={collaborator.disc_profile} size="sm" />
          {style && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-lg">{style.emoji}</span>
              <span className="text-sm font-medium text-foreground">
                Alto {collaborator.primary_style} - {style.name}
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Perfil DISC não mapeado
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={onInferProfile}
            disabled={isInferring}
          >
            {isInferring ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Inferindo...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Inferir Perfil via IA
              </>
            )}
          </Button>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border/50 flex justify-end">
        {showConfirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Confirmar?</span>
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
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
