-- Create enum for pilares
CREATE TYPE public.pilar AS ENUM ('pessoas', 'processos', 'dados', 'tecnologia', 'gestao');

-- Create enum for evidence status
CREATE TYPE public.evidence_status AS ENUM ('pendente', 'validado', 'rejeitado', 'investigar');

-- Create enum for asset status
CREATE TYPE public.asset_status AS ENUM ('uploading', 'processing', 'completed', 'error');

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assets table (files uploaded to the vault)
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  status public.asset_status NOT NULL DEFAULT 'uploading',
  duration_seconds INTEGER, -- For audio/video files
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create evidences table
CREATE TABLE public.evidences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  pilar public.pilar NOT NULL,
  content TEXT NOT NULL,
  source_description TEXT, -- e.g., "Reunião de Kick-off" or "Documento de Processos"
  timecode_start INTEGER, -- In seconds, for audio/video references
  timecode_end INTEGER,
  status public.evidence_status NOT NULL DEFAULT 'pendente',
  is_divergence BOOLEAN NOT NULL DEFAULT false,
  divergence_description TEXT, -- Description of what conflicts
  notes TEXT, -- Consultant notes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_assets_project_id ON public.assets(project_id);
CREATE INDEX idx_assets_status ON public.assets(status);
CREATE INDEX idx_evidences_project_id ON public.evidences(project_id);
CREATE INDEX idx_evidences_pilar ON public.evidences(pilar);
CREATE INDEX idx_evidences_status ON public.evidences(status);
CREATE INDEX idx_evidences_is_divergence ON public.evidences(is_divergence);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evidences_updated_at
  BEFORE UPDATE ON public.evidences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security (public access for MVP - no auth required)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidences ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (MVP without authentication)
CREATE POLICY "Allow public read access to projects"
  ON public.projects FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to projects"
  ON public.projects FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to projects"
  ON public.projects FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete access to projects"
  ON public.projects FOR DELETE
  USING (true);

CREATE POLICY "Allow public read access to assets"
  ON public.assets FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to assets"
  ON public.assets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to assets"
  ON public.assets FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete access to assets"
  ON public.assets FOR DELETE
  USING (true);

CREATE POLICY "Allow public read access to evidences"
  ON public.evidences FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to evidences"
  ON public.evidences FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to evidences"
  ON public.evidences FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete access to evidences"
  ON public.evidences FOR DELETE
  USING (true);

-- Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  true,
  104857600, -- 100MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'video/mp4', 'video/webm', 'application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
);

-- Create storage policies for public access
CREATE POLICY "Allow public read access to project-files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-files');

CREATE POLICY "Allow public insert access to project-files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-files');

CREATE POLICY "Allow public update access to project-files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'project-files');

CREATE POLICY "Allow public delete access to project-files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-files');