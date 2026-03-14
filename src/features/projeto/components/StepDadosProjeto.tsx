import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const SECTORS = [
  { value: 'saas', label: 'SaaS' },
  { value: 'industria', label: 'Indústria' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'varejo', label: 'Varejo' },
  { value: 'outros', label: 'Outros' },
] as const;

export const COMPANY_SIZES = [
  { value: '1-10', label: '1–10 funcionários' },
  { value: '11-50', label: '11–50 funcionários' },
  { value: '51-200', label: '51–200 funcionários' },
  { value: '200+', label: '200+ funcionários' },
] as const;

export interface ProjectFormData {
  name: string;
  clientName: string;
  sector: string;
  companySize: string;
}

interface StepDadosProjetoProps {
  data: ProjectFormData;
  onChange: (data: ProjectFormData) => void;
}

export function StepDadosProjeto({ data, onChange }: StepDadosProjetoProps) {
  const update = (field: keyof ProjectFormData, value: string) =>
    onChange({ ...data, [field]: value });

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">Dados do Projeto</h2>
        <p className="text-sm text-muted-foreground">Informações básicas do diagnóstico comercial.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="project-name">Nome do Projeto *</Label>
          <Input
            id="project-name"
            value={data.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Ex: Diagnóstico Comercial Q1 2026"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client-name">Nome do Cliente/Empresa *</Label>
          <Input
            id="client-name"
            value={data.clientName}
            onChange={(e) => update('clientName', e.target.value)}
            placeholder="Ex: TechCorp Brasil"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Setor de Atuação *</Label>
          <Select value={data.sector} onValueChange={(v) => update('sector', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o setor" />
            </SelectTrigger>
            <SelectContent>
              {SECTORS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tamanho da Empresa</Label>
          <Select value={data.companySize} onValueChange={(v) => update('companySize', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tamanho" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
