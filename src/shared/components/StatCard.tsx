import { motion } from 'framer-motion';
import { cn } from '@/shared/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: 'default' | 'warning' | 'success';
  index: number;
}

const variantClasses = {
  default: 'bg-card border-border/50',
  warning: 'bg-warning/5 border-warning/20',
  success: 'bg-success/5 border-success/20',
};

const iconClasses = {
  default: 'bg-muted text-muted-foreground',
  warning: 'bg-warning/15 text-warning',
  success: 'bg-success/15 text-success',
};

export function StatCard({ title, value, icon: Icon, variant = 'default', index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn('rounded-2xl p-5 border shadow-soft flex items-center gap-4', variantClasses[variant])}
    >
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconClasses[variant])}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </motion.div>
  );
}
