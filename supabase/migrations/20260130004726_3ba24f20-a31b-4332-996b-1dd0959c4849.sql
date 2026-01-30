-- Feature 1: Add context columns to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS client_context TEXT,
ADD COLUMN IF NOT EXISTS main_pain_points TEXT,
ADD COLUMN IF NOT EXISTS project_goals TEXT;

-- Feature 2: Add 'observacao_consultor' to source_type ENUM
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'observacao_consultor';

-- Feature 2: Create evidence_type ENUM
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evidence_type') THEN
    CREATE TYPE public.evidence_type AS ENUM ('fato', 'divergencia', 'ponto_forte');
  END IF;
END
$$;

-- Feature 2: Add evidence_type column to evidences table
ALTER TABLE public.evidences
ADD COLUMN IF NOT EXISTS evidence_type public.evidence_type DEFAULT 'fato';