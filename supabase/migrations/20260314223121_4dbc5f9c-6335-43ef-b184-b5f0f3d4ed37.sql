
-- =============================================
-- PHASE 1: Foundation tables, alterations, triggers, RLS
-- =============================================

-- 1. project_templates table
CREATE TABLE public.project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor text NOT NULL,
  nome text NOT NULL,
  pilares jsonb NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2. activity_log table
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  actor_type text NOT NULL,
  actor_name text,
  action text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_activity_log_project ON public.activity_log(project_id, created_at DESC);

-- 3. processing_queue table
CREATE TABLE public.processing_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'na_fila',
  step_atual text,
  progress_pct integer DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_processing_queue_project ON public.processing_queue(project_id, status);

-- 4. Alter projects: add template_id, current_phase, pilares_config
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.project_templates(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS current_phase text DEFAULT 'vault';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS pilares_config jsonb;

-- 5. Alter evidences: add confidence_score, return_reason, source_chunks
ALTER TABLE public.evidences ADD COLUMN IF NOT EXISTS confidence_score float DEFAULT 1.0;
ALTER TABLE public.evidences ADD COLUMN IF NOT EXISTS return_reason text;
ALTER TABLE public.evidences ADD COLUMN IF NOT EXISTS source_chunks jsonb DEFAULT '[]';

-- 6. Alter assets: add processing_status, extracted_text, chunks, pilar_classificado
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'pendente';
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS extracted_text text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS chunks jsonb DEFAULT '[]';
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS pilar_classificado text;

-- =============================================
-- RLS Policies
-- =============================================

-- project_templates: public read for authenticated
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates visíveis para todos autenticados"
  ON public.project_templates FOR SELECT
  TO authenticated
  USING (true);

-- activity_log: read for project members
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activity log visível para membros"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "System can insert activity log"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_project_member(auth.uid(), project_id));

-- processing_queue: CRUD for project members
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read processing queue"
  ON public.processing_queue FOR SELECT
  TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can insert processing queue"
  ON public.processing_queue FOR INSERT
  TO authenticated
  WITH CHECK (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can update processing queue"
  ON public.processing_queue FOR UPDATE
  TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

-- =============================================
-- Triggers
-- =============================================

-- Trigger: log when evidence status changes
CREATE OR REPLACE FUNCTION public.fn_log_gap_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.activity_log (project_id, actor_type, actor_name, action, description, metadata)
    VALUES (
      NEW.project_id,
      CASE
        WHEN NEW.status IN ('validado', 'rejeitado') THEN 'consultor'
        ELSE 'ia'
      END,
      CASE
        WHEN NEW.status IN ('validado', 'rejeitado') THEN 'Consultor'
        ELSE 'IA'
      END,
      CASE
        WHEN NEW.status = 'validado' THEN 'gap_validado'
        WHEN NEW.status = 'rejeitado' THEN 'gap_rejeitado'
        ELSE 'gap_atualizado'
      END,
      CASE
        WHEN NEW.status = 'validado' THEN 'validou gap "' || left(NEW.content, 60) || '..."'
        WHEN NEW.status = 'rejeitado' THEN 'rejeitou gap "' || left(NEW.content, 60) || '..."'
        ELSE 'atualizou gap "' || left(NEW.content, 60) || '..."'
      END,
      jsonb_build_object('gap_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_gap_change
  AFTER UPDATE ON public.evidences
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_gap_change();

-- Trigger: recalculate project phase
CREATE OR REPLACE FUNCTION public.fn_recalculate_project_phase()
RETURNS trigger AS $$
DECLARE
  v_project_id uuid;
  v_total_files int;
  v_total_gaps int;
  v_pending_gaps int;
  v_has_plan boolean;
  v_new_phase text;
BEGIN
  v_project_id := COALESCE(NEW.project_id, OLD.project_id);

  SELECT count(*) INTO v_total_files
  FROM public.assets WHERE project_id = v_project_id AND status = 'completed';

  SELECT count(*), count(*) FILTER (WHERE status = 'pendente')
  INTO v_total_gaps, v_pending_gaps
  FROM public.evidences WHERE project_id = v_project_id;

  SELECT EXISTS(SELECT 1 FROM public.initiatives WHERE project_id = v_project_id)
  INTO v_has_plan;

  v_new_phase := CASE
    WHEN v_total_files = 0 THEN 'vault'
    WHEN v_total_gaps = 0 THEN 'diagnostico'
    WHEN v_pending_gaps > 0 THEN 'validacao'
    WHEN NOT v_has_plan THEN 'sintese'
    ELSE 'plano'
  END;

  UPDATE public.projects SET current_phase = v_new_phase WHERE id = v_project_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_recalc_phase_evidences
  AFTER INSERT OR UPDATE OR DELETE ON public.evidences
  FOR EACH ROW EXECUTE FUNCTION public.fn_recalculate_project_phase();

CREATE TRIGGER trg_recalc_phase_assets
  AFTER INSERT OR UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.fn_recalculate_project_phase();

-- Trigger: auto-queue file on upload
CREATE OR REPLACE FUNCTION public.fn_file_upload_queue()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.processing_queue (project_id, file_id, status)
  VALUES (NEW.project_id, NEW.id, 'na_fila');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_file_upload_queue
  AFTER INSERT ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.fn_file_upload_queue();

-- =============================================
-- Seed data: project_templates
-- =============================================

INSERT INTO public.project_templates (setor, nome, pilares, is_default) VALUES
('saas', 'SaaS — Diagnóstico Comercial', '[
  {"nome": "Processos Comerciais", "descricao": "Playbooks, cadência, funil, follow-up, pipeline management", "peso_default": 25},
  {"nome": "Tecnologia & CRM", "descricao": "Adoção de ferramentas, configuração CRM, automações, integrações", "peso_default": 20},
  {"nome": "Pessoas & Capacitação", "descricao": "Perfil do time, treinamento, onboarding, desenvolvimento", "peso_default": 25},
  {"nome": "Gestão & Cultura", "descricao": "Liderança, rituais de gestão, alinhamento entre áreas, cultura comercial", "peso_default": 20},
  {"nome": "Dados & Métricas", "descricao": "KPIs, dashboards, relatórios, data-driven decisions", "peso_default": 10}
]', true),
('industria', 'Indústria — Diagnóstico Comercial', '[
  {"nome": "Processos de Venda", "descricao": "Ciclo de vendas, propostas, negociação, contratos", "peso_default": 25},
  {"nome": "Canais de Distribuição", "descricao": "Representantes, distribuidores, e-commerce, venda direta", "peso_default": 20},
  {"nome": "Força de Vendas", "descricao": "Equipe interna e externa, territórios, metas", "peso_default": 20},
  {"nome": "Gestão Comercial", "descricao": "Liderança, forecast, rituais, reporting", "peso_default": 20},
  {"nome": "Pricing & Margem", "descricao": "Política de preços, descontos, margem por canal", "peso_default": 15}
]', true),
('servicos', 'Serviços — Diagnóstico Comercial', '[
  {"nome": "Pipeline & Funil", "descricao": "Geração de oportunidades, qualificação, conversão", "peso_default": 25},
  {"nome": "Relacionamento", "descricao": "Gestão de contas, upsell, cross-sell, retenção", "peso_default": 20},
  {"nome": "Equipe Comercial", "descricao": "Perfil, capacitação, especialização", "peso_default": 20},
  {"nome": "Processos", "descricao": "Propostas, contratos, SLA, onboarding de clientes", "peso_default": 20},
  {"nome": "Inteligência de Mercado", "descricao": "Segmentação, ICP, análise competitiva", "peso_default": 15}
]', true);
