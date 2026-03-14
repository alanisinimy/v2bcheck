import type { Pilar } from './project';

export type EvidenceStatus = 'pendente' | 'validado' | 'rejeitado' | 'investigar';
export type EvidenceType = 'fato' | 'divergencia' | 'ponto_forte';
export type ImpactType = 'receita' | 'eficiencia' | 'risco' | 'cultura';
export type CriticalityType = 'alta' | 'media' | 'baixa';

export interface Evidence {
  id: string;
  project_id: string;
  asset_id?: string;
  pilar: Pilar;
  content: string;
  source_description?: string;
  timecode_start?: number;
  timecode_end?: number;
  status: EvidenceStatus;
  is_divergence: boolean;
  divergence_description?: string;
  evidence_type?: EvidenceType;
  notes?: string;
  benchmark?: string;
  impact?: ImpactType;
  criticality?: CriticalityType;
  sequential_id?: number;
  created_at: string;
  updated_at: string;
}

export const EVIDENCE_TYPES: Record<EvidenceType, { label: string; icon: string; color: string }> = {
  fato: { label: 'Fato', icon: '📌', color: 'bg-primary/10 text-primary border-primary/30' },
  divergencia: { label: 'Divergência', icon: '⚠️', color: 'bg-warning/10 text-warning border-warning/30' },
  ponto_forte: { label: 'Ponto Forte', icon: '✨', color: 'bg-success/10 text-success border-success/30' },
};

export const IMPACT_CONFIG: Record<ImpactType, { label: string; icon: string }> = {
  receita: { label: 'Receita', icon: 'TrendingUp' },
  eficiencia: { label: 'Eficiência', icon: 'Zap' },
  risco: { label: 'Risco', icon: 'AlertTriangle' },
  cultura: { label: 'Cultura', icon: 'Users' },
};

export const CRITICALITY_CONFIG: Record<CriticalityType, { label: string; color: string }> = {
  alta: { label: 'Alta', color: 'bg-destructive/15 text-destructive border-destructive/30' },
  media: { label: 'Média', color: 'bg-warning/15 text-warning border-warning/30' },
  baixa: { label: 'Baixa', color: 'bg-success/15 text-success border-success/30' },
};

export const STATUS_CONFIG: Record<EvidenceStatus, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: 'bg-muted text-muted-foreground' },
  validado: { label: 'Validado', color: 'bg-success/15 text-success' },
  rejeitado: { label: 'Rejeitado', color: 'bg-destructive/15 text-destructive' },
  investigar: { label: 'Investigar', color: 'bg-warning/15 text-warning' },
};
