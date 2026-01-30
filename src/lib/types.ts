// Type definitions for Vendas2B Intelligence

export type Pilar = 'pessoas' | 'processos' | 'dados' | 'tecnologia' | 'gestao';

export type EvidenceStatus = 'pendente' | 'validado' | 'rejeitado' | 'investigar';

export type AssetStatus = 'uploading' | 'processing' | 'completed' | 'error';

export type SourceType = 
  | 'entrevista_diretoria'
  | 'entrevista_operacao'
  | 'reuniao_kickoff'
  | 'reuniao_vendas'
  | 'briefing'
  | 'documentacao'
  | 'observacao_consultor'
  | 'perfil_disc';

export type EvidenceType = 'fato' | 'divergencia' | 'ponto_forte';

export const SOURCE_TYPES: Record<SourceType, { label: string; icon: string }> = {
  entrevista_diretoria: { label: 'Entrevista (CEO/Diretoria)', icon: '🎤' },
  entrevista_operacao: { label: 'Entrevista (Time/Operação)', icon: '👥' },
  reuniao_kickoff: { label: 'Reunião de Kick-off', icon: '🚀' },
  reuniao_vendas: { label: 'Reunião de Vendas (Gravada)', icon: '📞' },
  briefing: { label: 'Briefing / Formulário', icon: '📝' },
  documentacao: { label: 'Documentação Técnica', icon: '📄' },
  observacao_consultor: { label: 'Observação do Consultor', icon: '👁️' },
  perfil_disc: { label: 'Perfil DISC', icon: '📋' },
};

export const EVIDENCE_TYPES: Record<EvidenceType, { label: string; icon: string; color: string }> = {
  fato: { label: 'Fato', icon: '📌', color: 'bg-primary/10 text-primary border-primary/30' },
  divergencia: { label: 'Divergência', icon: '⚠️', color: 'bg-warning/10 text-warning border-warning/30' },
  ponto_forte: { label: 'Ponto Forte', icon: '✨', color: 'bg-success/10 text-success border-success/30' },
};

export interface Project {
  id: string;
  name: string;
  client_name: string;
  description?: string;
  start_date: string;
  client_context?: string;
  main_pain_points?: string;
  project_goals?: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  project_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  status: AssetStatus;
  source_type?: SourceType;
  collaborator_id?: string;
  duration_seconds?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

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
  created_at: string;
  updated_at: string;
}

// Pilar configuration
export const PILARES: Record<Pilar, { label: string; icon: string; description: string }> = {
  pessoas: {
    label: 'Pessoas',
    icon: '👥',
    description: 'DISC, Skills, Motivação, Liderança',
  },
  processos: {
    label: 'Processos',
    icon: '⚙️',
    description: 'Fluxo, Cadência, Gargalos',
  },
  dados: {
    label: 'Dados',
    icon: '📊',
    description: 'KPIs, Metas, Conversão',
  },
  tecnologia: {
    label: 'Tecnologia',
    icon: '💻',
    description: 'CRM, Stack, Automação',
  },
  gestao: {
    label: 'Gestão & Cultura',
    icon: '🏛️',
    description: 'Rituais, Crenças, Alinhamento',
  },
};

// Status configuration
export const STATUS_CONFIG: Record<EvidenceStatus, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: 'bg-muted text-muted-foreground' },
  validado: { label: 'Validado', color: 'bg-success/15 text-success' },
  rejeitado: { label: 'Rejeitado', color: 'bg-destructive/15 text-destructive' },
  investigar: { label: 'Investigar', color: 'bg-warning/15 text-warning' },
};
