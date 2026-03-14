import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Pilar } from '@/lib/types';
import { PILARES } from '@/lib/types';

interface MetricCardProps {
  pilar: Pilar;
  count: number;
  total: number;
  index: number;
}

const pilarColorClasses: Record<Pilar, string> = {
  pessoas: 'bg-pilar-pessoas',
  processos: 'bg-pilar-processos',
  dados: 'bg-pilar-dados',
  tecnologia: 'bg-pilar-tecnologia',
  gestao: 'bg-pilar-gestao',
};

export function MetricCard({ pilar, count, total, index }: MetricCardProps) {
  const config = PILARES[pilar];
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-card rounded-2xl p-6 shadow-soft border border-border/50 active-scale cursor-pointer hover:shadow-soft-lg transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-2xl', pilarColorClasses[pilar])}>
          {config.icon}
        </div>
        <span className="text-3xl font-bold text-foreground">{count}</span>
      </div>
      
      <h3 className="font-semibold text-foreground mb-1">{config.label}</h3>
      <p className="text-sm text-muted-foreground mb-4">{config.description}</p>
      
      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, delay: index * 0.1 + 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="h-full bg-primary rounded-full"
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {percentage}% das evidências
      </p>
    </motion.div>
  );
}
