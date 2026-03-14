import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { PILARES, type Pilar } from '@/shared/types/project';
import { CRITICALITY_CONFIG, STATUS_CONFIG, type Evidence, type CriticalityType } from '@/shared/types/gap';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

interface PillarViewProps {
  evidences: Evidence[];
}

const ALL_PILARES: Pilar[] = ['pessoas', 'processos', 'dados', 'tecnologia', 'gestao'];

export function PillarView({ evidences }: PillarViewProps) {
  const [expanded, setExpanded] = useState<Set<Pilar>>(new Set(ALL_PILARES));

  const pilarGroups = useMemo(() => {
    return ALL_PILARES.map(pilar => {
      const items = evidences.filter(e => e.pilar === pilar);
      const alta = items.filter(e => e.criticality === 'alta').length;
      const media = items.filter(e => e.criticality === 'media').length;
      const baixa = items.filter(e => e.criticality === 'baixa' || !e.criticality).length;
      return { pilar, items, alta, media, baixa };
    });
  }, [evidences]);

  const toggle = (pilar: Pilar) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(pilar) ? next.delete(pilar) : next.add(pilar);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {pilarGroups.map(({ pilar, items, alta, media, baixa }) => {
        const config = PILARES[pilar];
        const isOpen = expanded.has(pilar);

        return (
          <div key={pilar} className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-soft">
            {/* Header */}
            <button
              onClick={() => toggle(pilar)}
              className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left"
            >
              <span className="text-lg">{config.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{config.label}</span>
                  <Badge variant="secondary" className="text-xs">{items.length} gaps</Badge>
                </div>
                {/* Criticality bar */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  {alta > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium">
                      {alta} alta
                    </span>
                  )}
                  {media > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/15 text-warning font-medium">
                      {media} média
                    </span>
                  )}
                  {baixa > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/15 text-success font-medium">
                      {baixa} baixa
                    </span>
                  )}
                </div>
              </div>
              {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
            </button>

            {/* Body */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border/30 divide-y divide-border/20">
                    {items.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        Nenhum gap neste pilar.
                      </div>
                    ) : (
                      items.map(ev => {
                        const crit = ev.criticality as CriticalityType | undefined;
                        const critConf = crit ? CRITICALITY_CONFIG[crit] : CRITICALITY_CONFIG.media;
                        const statusConf = STATUS_CONFIG[ev.status];
                        const isWeak = ev.status === 'rejeitado' || ev.status === 'investigar';

                        return (
                          <div key={ev.id} className="p-4 hover:bg-muted/20 transition-colors">
                            <div className="flex items-start gap-3">
                              <span className="text-xs font-mono text-muted-foreground mt-0.5 w-8 flex-shrink-0">
                                G{(ev.sequential_id || 0).toString().padStart(2, '0')}
                              </span>
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <p className="text-sm text-foreground">{ev.content}</p>
                                {ev.benchmark && (
                                  <p className="text-xs text-muted-foreground italic">💡 {ev.benchmark}</p>
                                )}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge variant="outline" className={cn('text-[10px]', critConf.color)}>{critConf.label}</Badge>
                                  <Badge variant="outline" className={cn('text-[10px]', statusConf.color)}>{statusConf.label}</Badge>
                                  {isWeak && (
                                    <Link
                                      to={`/vault?pilar=${pilar}`}
                                      className="text-[10px] text-primary hover:underline font-medium ml-1"
                                    >
                                      ↩ Coletar mais evidência
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
