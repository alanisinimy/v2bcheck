import { motion } from 'framer-motion';
import { cn } from '@/shared/lib/utils';
import { PILARES, type Pilar } from '@/shared/types/project';
import { Progress } from '@/components/ui/progress';

interface PillarItem {
  pilar: Pilar;
  count: number;
  pct: number;
}

interface PillarCoverageProps {
  items: PillarItem[];
}

function getBadge(pct: number): { label: string; cls: string } {
  if (pct >= 70) return { label: 'Forte', cls: 'bg-success/15 text-success' };
  if (pct >= 40) return { label: 'Médio', cls: 'bg-warning/15 text-warning' };
  return { label: 'Fraco', cls: 'bg-destructive/15 text-destructive' };
}

export function PillarCoverage({ items }: PillarCoverageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="rounded-2xl border border-border/50 bg-card p-6 shadow-soft flex-1"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Cobertura por Pilar</h3>
      <div className="space-y-4">
        {items.map(({ pilar, count, pct }) => {
          const config = PILARES[pilar];
          const badge = getBadge(pct);
          return (
            <div key={pilar} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground flex items-center gap-2">
                  <span>{config.icon}</span>
                  {config.label}
                  <span className="text-xs text-muted-foreground">({count})</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">{pct}%</span>
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', badge.cls)}>
                    {badge.label}
                  </span>
                </div>
              </div>
              <Progress
                value={pct}
                className={cn(
                  'h-2',
                  pct >= 70 ? '[&>div]:bg-success' : pct >= 40 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'
                )}
              />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
