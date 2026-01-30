import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DiscProfile } from '@/hooks/useCollaborators';

interface DiscProfileBarsProps {
  profile: DiscProfile;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

const DISC_CONFIG = {
  D: { label: 'Dominância', color: 'bg-red-500', textColor: 'text-red-600' },
  I: { label: 'Influência', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  S: { label: 'Estabilidade', color: 'bg-green-500', textColor: 'text-green-600' },
  C: { label: 'Conformidade', color: 'bg-blue-500', textColor: 'text-blue-600' },
};

export function DiscProfileBars({ profile, size = 'md', showLabels = false }: DiscProfileBarsProps) {
  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }[size];

  const gapClass = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2',
  }[size];

  const values = [
    { key: 'D', value: profile.dom },
    { key: 'I', value: profile.inf },
    { key: 'S', value: profile.est },
    { key: 'C', value: profile.conf },
  ];

  return (
    <div className={cn('flex flex-col', gapClass)}>
      {values.map(({ key, value }) => {
        const config = DISC_CONFIG[key as keyof typeof DISC_CONFIG];
        return (
          <div key={key} className="flex items-center gap-2">
            {showLabels && (
              <span className={cn('text-xs font-medium w-4', config.textColor)}>
                {key}
              </span>
            )}
            <div className={cn('flex-1 bg-muted rounded-full overflow-hidden', heightClass)}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={cn('h-full rounded-full', config.color)}
              />
            </div>
            {showLabels && (
              <span className="text-xs text-muted-foreground w-8 text-right">
                {value}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface TeamDistributionChartProps {
  distribution: {
    D: number;
    I: number;
    S: number;
    C: number;
    total?: number;
    percentages: {
      D: number;
      I: number;
      S: number;
      C: number;
    };
  };
}

export function TeamDistributionChart({ distribution }: TeamDistributionChartProps) {
  const items = [
    { key: 'D' as const, label: 'Dominância', ...DISC_CONFIG.D },
    { key: 'I' as const, label: 'Influência', ...DISC_CONFIG.I },
    { key: 'S' as const, label: 'Estabilidade', ...DISC_CONFIG.S },
    { key: 'C' as const, label: 'Conformidade', ...DISC_CONFIG.C },
  ];

  return (
    <div className="space-y-3">
      {items.map(({ key, label, color, textColor }) => {
        const percentage = distribution.percentages[key];
        const count = distribution[key];
        
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className={cn('font-medium', textColor)}>
                {key} - {label}
              </span>
              <span className="text-muted-foreground">
                {count} ({percentage}%)
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={cn('h-full rounded-full', color)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
