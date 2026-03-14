import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { PILARES, type Pilar } from '@/shared/types/project';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import type { Evidence } from '@/shared/types/gap';

interface CoberturaViewProps {
  evidences: Evidence[];
}

const ALL_PILARES: Pilar[] = ['pessoas', 'processos', 'dados', 'tecnologia', 'gestao'];

function getBadge(pct: number): { label: string; cls: string } {
  if (pct >= 70) return { label: 'Forte', cls: 'bg-success/15 text-success' };
  if (pct >= 40) return { label: 'Médio', cls: 'bg-warning/15 text-warning' };
  return { label: 'Fraco', cls: 'bg-destructive/15 text-destructive' };
}

export function CoberturaView({ evidences }: CoberturaViewProps) {
  const items = useMemo(() => {
    const total = evidences.length || 1;
    return ALL_PILARES.map(pilar => {
      const count = evidences.filter(e => e.pilar === pilar).length;
      const validated = evidences.filter(e => e.pilar === pilar && e.status === 'validado').length;
      const pct = Math.round((count / total) * 100);
      return { pilar, count, validated, pct };
    });
  }, [evidences]);

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl border border-border/50 bg-card p-6 shadow-soft"
      >
        <h3 className="text-sm font-semibold text-foreground mb-1">Análise de Cobertura</h3>
        <p className="text-xs text-muted-foreground mb-6">
          Avalie se há evidências suficientes em cada pilar para um diagnóstico completo.
        </p>

        <div className="space-y-5">
          {items.map(({ pilar, count, validated, pct }, i) => {
            const config = PILARES[pilar];
            const badge = getBadge(pct);
            const isWeak = pct < 40;

            return (
              <motion.div
                key={pilar}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'rounded-xl p-4 border transition-colors',
                  isWeak ? 'border-destructive/30 bg-destructive/5' : 'border-border/30 bg-muted/20'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <span className="font-semibold text-foreground text-sm">{config.label}</span>
                    <span className="text-xs text-muted-foreground">
                      ({count} gaps · {validated} validados)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{pct}%</span>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', badge.cls)}>
                      {badge.label}
                    </span>
                  </div>
                </div>

                <Progress
                  value={pct}
                  className={cn(
                    'h-2.5 mb-2',
                    pct >= 70 ? '[&>div]:bg-success' : pct >= 40 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'
                  )}
                />

                {isWeak && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Evidência insuficiente — considere coletar mais material
                    </span>
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                      <Link to="/vault">Ir para Vault →</Link>
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
