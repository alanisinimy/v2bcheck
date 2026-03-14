
-- Table: quick_notes
CREATE TABLE public.quick_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content_type text NOT NULL DEFAULT 'texto',
  raw_content text NOT NULL,
  processed_content text,
  pilar_sugerido text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.quick_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read quick_notes"
  ON public.quick_notes FOR SELECT TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can insert quick_notes"
  ON public.quick_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_project_member(auth.uid(), project_id) AND user_id = auth.uid());

CREATE POLICY "Members can update quick_notes"
  ON public.quick_notes FOR UPDATE TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

-- Table: export_jobs
CREATE TABLE public.export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  formato text NOT NULL DEFAULT 'pdf',
  status text NOT NULL DEFAULT 'pendente',
  file_url text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read export_jobs"
  ON public.export_jobs FOR SELECT TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can insert export_jobs"
  ON public.export_jobs FOR INSERT TO authenticated
  WITH CHECK (public.is_project_member(auth.uid(), project_id) AND user_id = auth.uid());

CREATE POLICY "Members can update export_jobs"
  ON public.export_jobs FOR UPDATE TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

-- Storage bucket: exports (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', false);

-- Storage RLS: members can read their project exports
CREATE POLICY "Members can read exports"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'exports'
    AND public.is_project_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

-- Storage RLS: members can upload exports
CREATE POLICY "Members can upload exports"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'exports'
    AND public.is_project_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );
