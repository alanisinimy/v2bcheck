import { motion } from 'framer-motion';
import { cn } from '@/shared/lib/utils';
import { PILARES } from '@/shared/types/project';
import { STATUS_CONFIG, CRITICALITY_CONFIG, type Evidence } from '@/shared/types/gap';
import { Link } from 'react-router-dom';

interface RecentGapsProps {
  gaps: Evidence[];
  totalGaps: number;
}

export function RecentGaps({ gaps, totalGaps }: RecentGapsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="rounded-2xl border border-border/50 bg-card p-6 shadow-soft flex-1"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Gaps Recentes</h3>
        <Link to="/matriz" className="text-xs text-primary hover:underline font-medium">
          Ver todos {totalGaps} →
        </Link>
      </div>

      {gaps.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum gap identificado ainda.</p>
      ) : (
        <div className="space-y-3">
          {gaps.map(gap => {
            const criticality = gap.criticality as keyof typeof CRITICALITY_CONFIG | undefined;
            const critConfig = criticality ? CRITICALITY_CONFIG[criticality] : null;
            const statusConfig = STATUS_CONFIG[gap.status];
            const pilarConfig = PILARES[gap.pilar];

            return (
              <div key={gap.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                {/* Criticality dot */}
                <div className={cn(
                  'w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0',
                  criticality === 'alta' ? 'bg-destructive' : criticality === 'media' ? 'bg-warning' : 'bg-success'
                )} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground line-clamp-1">{gap.content}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                      {pilarConfig?.icon} {pilarConfig?.label}
                    </span>
                    {critConfig && (
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', critConfig.color)}>
                        {critConfig.label}
                      </span>
                    )}
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', statusConfig.color)}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
