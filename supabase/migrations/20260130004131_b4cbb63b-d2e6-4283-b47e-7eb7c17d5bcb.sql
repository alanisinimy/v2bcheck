-- Create source_type ENUM
CREATE TYPE public.source_type AS ENUM (
  'entrevista_diretoria',
  'entrevista_operacao',
  'reuniao_kickoff',
  'reuniao_vendas',
  'briefing',
  'documentacao'
);

-- Add source_type column to assets table
ALTER TABLE public.assets 
ADD COLUMN source_type public.source_type;