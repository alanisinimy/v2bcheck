-- Adicionar novos tipos de reunião ao ENUM source_type
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'reuniao_diagnostico';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'reuniao_planejamento';