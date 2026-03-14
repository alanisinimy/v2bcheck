import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PILARES, CRITICALITY_CONFIG, STATUS_CONFIG } from '@/lib/types';
import type { Pilar, CriticalityType, EvidenceStatus } from '@/lib/types';

interface TableFiltersProps {
  selectedPilar: Pilar | 'all';
  selectedCriticality: CriticalityType | 'all';
  selectedStatus: EvidenceStatus | 'all';
  searchTerm: string;
  onPilarChange: (pilar: Pilar | 'all') => void;
  onCriticalityChange: (criticality: CriticalityType | 'all') => void;
  onStatusChange: (status: EvidenceStatus | 'all') => void;
  onSearchChange: (search: string) => void;
  totalCount: number;
  filteredCount: number;
}

const pilares: Pilar[] = ['pessoas', 'processos', 'dados', 'tecnologia', 'gestao'];
const criticalities: CriticalityType[] = ['alta', 'media', 'baixa'];
const statuses: EvidenceStatus[] = ['pendente', 'validado', 'rejeitado', 'investigar'];

export function TableFilters({
  selectedPilar,
  selectedCriticality,
  selectedStatus,
  searchTerm,
  onPilarChange,
  onCriticalityChange,
  onStatusChange,
  onSearchChange,
  totalCount,
  filteredCount,
}: TableFiltersProps) {
  return (
    <div className="flex items-center gap-4 mb-4 flex-wrap">
      <Select value={selectedPilar} onValueChange={(v) => onPilarChange(v as Pilar | 'all')}>
        <SelectTrigger className="w-[160px] h-9 text-sm">
          <SelectValue placeholder="Pilar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Pilares</SelectItem>
          {pilares.map((p) => (
            <SelectItem key={p} value={p}>
              {PILARES[p].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedCriticality} onValueChange={(v) => onCriticalityChange(v as CriticalityType | 'all')}>
        <SelectTrigger className="w-[160px] h-9 text-sm">
          <SelectValue placeholder="Criticidade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {criticalities.map((c) => (
            <SelectItem key={c} value={c}>
              {CRITICALITY_CONFIG[c].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedStatus} onValueChange={(v) => onStatusChange(v as EvidenceStatus | 'all')}>
        <SelectTrigger className="w-[160px] h-9 text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Status</SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_CONFIG[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar gaps..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      <span className="text-sm text-muted-foreground ml-auto">
        Mostrando {filteredCount} de {totalCount} gaps
      </span>
    </div>
  );
}
