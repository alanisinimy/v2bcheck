import { cn } from '@/lib/utils';

interface RoleFitBadgeProps {
  level: 'alto' | 'medio' | 'baixo' | null;
  className?: string;
}

const FIT_CONFIG = {
  alto: {
    label: 'Fit Alto',
    emoji: '🟢',
    className: 'bg-success/15 text-success border-success/30',
  },
  medio: {
    label: 'Fit Médio',
    emoji: '🟡',
    className: 'bg-warning/15 text-warning border-warning/30',
  },
  baixo: {
    label: 'Fit Baixo',
    emoji: '🔴',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
};

export function RoleFitBadge({ level, className }: RoleFitBadgeProps) {
  if (!level) return null;

  const config = FIT_CONFIG[level];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border',
        config.className,
        className
      )}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
}
