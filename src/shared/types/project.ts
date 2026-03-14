export type Pilar = 'pessoas' | 'processos' | 'dados' | 'tecnologia' | 'gestao';

export interface Project {
  id: string;
  name: string;
  client_name: string;
  description?: string;
  start_date: string;
  client_context?: string;
  main_pain_points?: string;
  project_goals?: string;
  sector?: string;
  company_size?: string;
  custom_pilares?: any;
  created_at: string;
  updated_at: string;
}

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
