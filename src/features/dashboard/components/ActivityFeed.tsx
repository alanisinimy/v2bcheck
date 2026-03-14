import { motion } from 'framer-motion';
import { cn } from '@/shared/lib/utils';
import type { ActivityLogEntry } from '@/features/dashboard/hooks/useActivityLog';

interface ActivityFeedProps {
  items: ActivityLogEntry[];
}

const ACTION_TYPE_MAP: Record<string, string> = {
  upload: 'upload',
  gap_gerado: 'ai',
  gap_validado: 'validation',
  gap_rejeitado: 'validation',
  gap_atualizado: 'ai',
  sintese_gerada: 'ai',
  plano_gerado: 'ai',
  disc_processado: 'ai',
  evidencia_consolidada: 'ai',
  processamento: 'ai',
};

const dotColors: Record<string, string> = {
  upload: 'bg-primary',
  ai: 'bg-secondary-foreground',
  validation: 'bg-success',
  alert: 'bg-warning',
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  if (hours < 24) {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return days === 0 ? `hoje, ${h}:${m}` : `ontem, ${h}:${m}`;
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="rounded-2xl border border-border/50 bg-card p-6 shadow-soft"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Atividade Recente</h3>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma atividade registrada.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const type = ACTION_TYPE_MAP[item.action] || 'ai';
            const time = new Date(item.created_at);
            const actorPrefix = item.actor_name && item.actor_type === 'consultor'
              ? `${item.actor_name} `
              : item.actor_type === 'ia' ? 'IA ' : '';

            return (
              <div key={item.id} className="flex items-start gap-3">
                <div className={cn('w-2 h-2 rounded-full mt-2 flex-shrink-0', dotColors[type] || dotColors.ai)} />
                <p className="text-sm text-foreground flex-1 line-clamp-1">
                  {actorPrefix}{item.description}
                </p>
                <span className="text-[11px] text-muted-foreground flex-shrink-0 font-mono tabular-nums">
                  {formatRelativeTime(time)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
