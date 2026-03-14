import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { SOURCE_TYPES, type SourceType } from '@/shared/types/vault';
import { PILARES, type Pilar } from '@/shared/types/project';

interface VaultFiltersProps {
  sourceTypeFilter: SourceType | 'all';
  pilarFilter: Pilar | 'all';
  onSourceTypeChange: (value: SourceType | 'all') => void;
  onPilarChange: (value: Pilar | 'all') => void;
}

const SOURCE_CATEGORIES: { label: string; types: SourceType[] }[] = [
  { label: 'Perfil DISC', types: ['perfil_disc'] },
  { label: 'Entrevista', types: ['entrevista_diretoria', 'entrevista_operacao'] },
  { label: 'Reunião', types: ['reuniao_kickoff', 'reuniao_vendas', 'reuniao_diagnostico', 'reuniao_planejamento'] },
  { label: 'Documento', types: ['briefing', 'documentacao', 'observacao_consultor'] },
  { label: 'Pesquisa', types: ['pesquisa_clima'] },
];

export function VaultFilters({ sourceTypeFilter, pilarFilter, onSourceTypeChange, onPilarChange }: VaultFiltersProps) {
  const hasFilters = sourceTypeFilter !== 'all' || pilarFilter !== 'all';

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={sourceTypeFilter} onValueChange={(v) => onSourceTypeChange(v as SourceType | 'all')}>
        <SelectTrigger className="w-[200px] h-9 text-sm">
          <SelectValue placeholder="Tipo de fonte" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          {Object.entries(SOURCE_TYPES).map(([key, config]) => (
            <SelectItem key={key} value={key}>
              <span className="flex items-center gap-2">
                <span>{config.icon}</span>
                <span>{config.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={pilarFilter} onValueChange={(v) => onPilarChange(v as Pilar | 'all')}>
        <SelectTrigger className="w-[180px] h-9 text-sm">
          <SelectValue placeholder="Pilar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os pilares</SelectItem>
          {Object.entries(PILARES).map(([key, config]) => (
            <SelectItem key={key} value={key}>
              <span className="flex items-center gap-2">
                <span>{config.icon}</span>
                <span>{config.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-xs text-muted-foreground gap-1"
          onClick={() => { onSourceTypeChange('all'); onPilarChange('all'); }}
        >
          <X className="w-3 h-3" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
