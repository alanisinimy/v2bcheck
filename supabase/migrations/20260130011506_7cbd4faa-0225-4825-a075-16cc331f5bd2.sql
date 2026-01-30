-- Create new ENUMs for the system
CREATE TYPE public.profile_source_type AS ENUM ('pdf_auto', 'ai_inferred', 'manual');
CREATE TYPE public.initiative_impact AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.initiative_effort AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.initiative_status AS ENUM ('draft', 'approved', 'in_progress', 'done');

-- Add 'perfil_disc' to existing source_type enum
ALTER TYPE public.source_type ADD VALUE 'perfil_disc';

-- Create collaborators table
CREATE TABLE public.collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  disc_profile JSONB,
  profile_source public.profile_source_type NOT NULL DEFAULT 'manual',
  primary_style TEXT CHECK (primary_style IN ('D', 'I', 'S', 'C')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create initiatives table
CREATE TABLE public.initiatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reasoning TEXT,
  impact public.initiative_impact NOT NULL DEFAULT 'medium',
  effort public.initiative_effort NOT NULL DEFAULT 'medium',
  status public.initiative_status NOT NULL DEFAULT 'draft',
  target_pilar public.pilar,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;

-- RLS policies for collaborators
CREATE POLICY "Allow public read access to collaborators"
ON public.collaborators FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access to collaborators"
ON public.collaborators FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update access to collaborators"
ON public.collaborators FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete access to collaborators"
ON public.collaborators FOR DELETE
USING (true);

-- RLS policies for initiatives
CREATE POLICY "Allow public read access to initiatives"
ON public.initiatives FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access to initiatives"
ON public.initiatives FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update access to initiatives"
ON public.initiatives FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete access to initiatives"
ON public.initiatives FOR DELETE
USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_collaborators_updated_at
BEFORE UPDATE ON public.collaborators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_initiatives_updated_at
BEFORE UPDATE ON public.initiatives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique constraint on collaborator name per project
CREATE UNIQUE INDEX collaborators_name_project_idx ON public.collaborators (project_id, LOWER(name));