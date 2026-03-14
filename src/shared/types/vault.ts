export type AssetStatus = 'uploading' | 'processing' | 'completed' | 'error';

export type SourceType =
  | 'entrevista_diretoria'
  | 'entrevista_operacao'
  | 'reuniao_kickoff'
  | 'reuniao_vendas'
  | 'reuniao_diagnostico'
  | 'reuniao_planejamento'
  | 'briefing'
  | 'documentacao'
  | 'observacao_consultor'
  | 'perfil_disc'
  | 'pesquisa_clima';

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

export const SOURCE_TYPES: Record<SourceType, { label: string; icon: string }> = {
  entrevista_diretoria: { label: 'Entrevista (CEO/Diretoria)', icon: '🎤' },
  entrevista_operacao: { label: 'Entrevista (Time/Operação)', icon: '👥' },
  reuniao_kickoff: { label: 'Reunião de Kick-off', icon: '🚀' },
  reuniao_vendas: { label: 'Reunião de Vendas (Gravada)', icon: '📞' },
  reuniao_diagnostico: { label: 'Reunião de Diagnóstico', icon: '🔍' },
  reuniao_planejamento: { label: 'Reunião de Planejamento', icon: '📋' },
  briefing: { label: 'Briefing / Formulário', icon: '📝' },
  documentacao: { label: 'Documentação Técnica', icon: '📄' },
  observacao_consultor: { label: 'Observação do Consultor', icon: '👁️' },
  perfil_disc: { label: 'Perfil DISC', icon: '📊' },
  pesquisa_clima: { label: 'Pesquisa de Clima', icon: '🌡️' },
};
