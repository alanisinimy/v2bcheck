import { motion } from 'framer-motion';
import { Filter, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Pilar, EvidenceStatus } from '@/lib/types';
import { PILARES, STATUS_CONFIG } from '@/lib/types';

interface FilterBarProps {
  selectedPilar: Pilar | 'all';
  selectedStatus: EvidenceStatus | 'all';
  showDivergences: boolean;
  onPilarChange: (pilar: Pilar | 'all') => void;
  onStatusChange: (status: EvidenceStatus | 'all') => void;
  onDivergenceToggle: () => void;
}

const pilares: (Pilar | 'all')[] = ['all', 'pessoas', 'processos', 'dados', 'tecnologia', 'gestao'];
const statuses: (EvidenceStatus | 'all')[] = ['all', 'pendente', 'validado', 'rejeitado', 'investigar'];

export function FilterBar({
  selectedPilar,
  selectedStatus,
  showDivergences,
  onPilarChange,
  onStatusChange,
  onDivergenceToggle,
}: FilterBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="glass rounded-2xl p-4 mb-6 space-y-4"
    >
      {/* Pilar Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <Filter className="w-4 h-4" />
          Pilar:
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {pilares.map((pilar) => (
            <Button
              key={pilar}
              size="sm"
              variant={selectedPilar === pilar ? 'default' : 'outline'}
              className="active-scale"
              onClick={() => onPilarChange(pilar)}
            >
              {pilar === 'all' ? 'Todos' : `${PILARES[pilar].icon} ${PILARES[pilar].label}`}
            </Button>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Status:</span>
        <div className="flex gap-1.5 flex-wrap">
          {statuses.map((status) => (
            <Button
              key={status}
              size="sm"
              variant={selectedStatus === status ? 'default' : 'outline'}
              className="active-scale"
              onClick={() => onStatusChange(status)}
            >
              {status === 'all' ? 'Todos' : STATUS_CONFIG[status].label}
            </Button>
          ))}
        </div>
        
        {/* Divergence toggle */}
        <Button
          size="sm"
          variant={showDivergences ? 'default' : 'outline'}
          className={cn(
            'active-scale ml-auto',
            showDivergences && 'bg-warning hover:bg-warning/90 text-warning-foreground'
          )}
          onClick={onDivergenceToggle}
        >
          <AlertTriangle className="w-4 h-4 mr-1" />
          Divergências
        </Button>
      </div>
    </motion.div>
  );
}
