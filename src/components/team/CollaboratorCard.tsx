import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DiscProfileBars } from './DiscProfileBars';
import { RoleFitBadge } from './RoleFitBadge';
import { RoleSelector } from './RoleSelector';
import type { Collaborator } from '@/hooks/useCollaborators';

interface CollaboratorCardProps {
  collaborator: Collaborator;
  onInferProfile: () => void;
  onDelete: () => void;
  onUpdateRole: (role: string) => void;
  onAnalyzeRoleFit: () => void;
  isInferring?: boolean;
  isDeleting?: boolean;
  isAnalyzingFit?: boolean;
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
  onUpdateRole,
  onAnalyzeRoleFit,
  isInferring = false,
  isDeleting = false,
  isAnalyzingFit = false,
}: CollaboratorCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  const hasProfile = !!collaborator.disc_profile;
  const style = collaborator.primary_style ? STYLE_NAMES[collaborator.primary_style] : null;
  const source = SOURCE_LABELS[collaborator.profile_source];

  const handleRoleChange = (newRole: string) => {
    onUpdateRole(newRole);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4 border border-border/50"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{collaborator.name}</h3>
          <div className="mt-1">
            <RoleSelector
              value={collaborator.role}
              onChange={handleRoleChange}
              disabled={isAnalyzingFit}
              className="h-8 w-full max-w-[180px]"
            />
          </div>
        </div>
        <Badge variant="secondary" className="text-xs shrink-0 ml-2">
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

          {/* Role Fit Section */}
          <div className="mt-4 pt-3 border-t border-border/30">
            <div className="flex items-center justify-between gap-2 mb-2">
              <RoleFitBadge level={collaborator.role_fit_level} />
              <Button
                size="sm"
                variant="ghost"
                onClick={onAnalyzeRoleFit}
                disabled={isAnalyzingFit || !collaborator.role}
                className="h-7 text-xs"
                title={!collaborator.role ? 'Selecione um cargo primeiro' : 'Recalcular análise de fit'}
              >
                {isAnalyzingFit ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Recalcular
                  </>
                )}
              </Button>
            </div>
            {collaborator.role_fit_reason && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {collaborator.role_fit_reason}
              </p>
            )}
            {!collaborator.role_fit_level && collaborator.role && (
              <p className="text-xs text-muted-foreground italic">
                Clique em "Recalcular" para analisar a adequação ao cargo.
              </p>
            )}
            {!collaborator.role && (
              <p className="text-xs text-muted-foreground italic">
                Selecione um cargo para analisar o fit comportamental.
              </p>
            )}
          </div>
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
