import { motion } from 'framer-motion';
import { FolderOpen, Search, AlertTriangle, Users } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatItem {
  label: string;
  value: number;
  detail: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

interface StatsGridProps {
  totalAssets: number;
  pdfs: number;
  entrevistas: number;
  totalEvidences: number;
  validados: number;
  pendentes: number;
  criticalidadeAlta: number;
  totalCollaborators: number;
  dominantStyle: string | null;
}

export function StatsGrid({
  totalAssets, pdfs, entrevistas,
  totalEvidences, validados, pendentes,
  criticalidadeAlta, totalCollaborators, dominantStyle,
}: StatsGridProps) {
  const pctAlta = totalEvidences > 0 ? Math.round((criticalidadeAlta / totalEvidences) * 100) : 0;

  const items: StatItem[] = [
    {
      label: 'Arquivos no Vault',
      value: totalAssets,
      detail: `${pdfs} PDFs · ${entrevistas} entrevistas`,
      icon: FolderOpen,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      label: 'Gaps Identificados',
      value: totalEvidences,
      detail: `${validados} validados · ${pendentes} pendentes`,
      icon: Search,
      iconBg: 'bg-accent',
      iconColor: 'text-accent-foreground',
    },
    {
      label: 'Criticidade Alta',
      value: criticalidadeAlta,
      detail: `${pctAlta}% dos gaps são bloqueios estruturais`,
      icon: AlertTriangle,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
    {
      label: 'Colaboradores Mapeados',
      value: totalCollaborators,
      detail: dominantStyle ? `Perfil dominante: ${dominantStyle}` : 'Sem perfil dominante',
      icon: Users,
      iconBg: 'bg-secondary',
      iconColor: 'text-secondary-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 + i * 0.05 }}
          className="rounded-2xl border border-border/50 bg-card p-5 shadow-soft hover:-translate-y-0.5 hover:shadow-soft-lg transition-all duration-200 cursor-default"
        >
          <div className="flex items-start gap-4">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', item.iconBg)}>
              <item.icon className={cn('w-5 h-5', item.iconColor)} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-[28px] font-extrabold text-foreground leading-tight">{item.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.detail}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
