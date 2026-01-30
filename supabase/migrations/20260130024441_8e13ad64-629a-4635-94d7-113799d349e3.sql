-- Add collaborator_id column to assets table
ALTER TABLE public.assets
ADD COLUMN collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL;