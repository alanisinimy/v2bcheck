-- =====================================================
-- SECURITY FIX: Authentication & RLS Implementation
-- =====================================================

-- 1. Create project_members table for user-project associations
CREATE TABLE public.project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS on project_members
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Create policy for project_members (users can see their own memberships)
CREATE POLICY "Users can see their project memberships"
  ON project_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owners/admins can manage project members"
  ON project_members FOR ALL
  USING (
    auth.uid() IN (
      SELECT pm.user_id FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.role IN ('owner', 'admin')
    )
  );

-- 2. Create helper function to check project membership (avoid recursion)
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE user_id = _user_id
      AND project_id = _project_id
  )
$$;

-- 3. Create helper function to check project ownership/admin
CREATE OR REPLACE FUNCTION public.is_project_owner_or_admin(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE user_id = _user_id
      AND project_id = _project_id
      AND role IN ('owner', 'admin')
  )
$$;

-- =====================================================
-- DROP OLD PUBLIC POLICIES
-- =====================================================

-- Projects
DROP POLICY IF EXISTS "Allow public read access to projects" ON projects;
DROP POLICY IF EXISTS "Allow public insert access to projects" ON projects;
DROP POLICY IF EXISTS "Allow public update access to projects" ON projects;
DROP POLICY IF EXISTS "Allow public delete access to projects" ON projects;

-- Collaborators
DROP POLICY IF EXISTS "Allow public read access to collaborators" ON collaborators;
DROP POLICY IF EXISTS "Allow public insert access to collaborators" ON collaborators;
DROP POLICY IF EXISTS "Allow public update access to collaborators" ON collaborators;
DROP POLICY IF EXISTS "Allow public delete access to collaborators" ON collaborators;

-- Evidences
DROP POLICY IF EXISTS "Allow public read access to evidences" ON evidences;
DROP POLICY IF EXISTS "Allow public insert access to evidences" ON evidences;
DROP POLICY IF EXISTS "Allow public update access to evidences" ON evidences;
DROP POLICY IF EXISTS "Allow public delete access to evidences" ON evidences;

-- Initiatives
DROP POLICY IF EXISTS "Allow public read access to initiatives" ON initiatives;
DROP POLICY IF EXISTS "Allow public insert access to initiatives" ON initiatives;
DROP POLICY IF EXISTS "Allow public update access to initiatives" ON initiatives;
DROP POLICY IF EXISTS "Allow public delete access to initiatives" ON initiatives;

-- Assets
DROP POLICY IF EXISTS "Allow public read access to assets" ON assets;
DROP POLICY IF EXISTS "Allow public insert access to assets" ON assets;
DROP POLICY IF EXISTS "Allow public update access to assets" ON assets;
DROP POLICY IF EXISTS "Allow public delete access to assets" ON assets;

-- Storage policies
DROP POLICY IF EXISTS "Allow public read access to project-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert access to project-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update access to project-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete access to project-files" ON storage.objects;

-- =====================================================
-- CREATE NEW AUTHENTICATED POLICIES
-- =====================================================

-- PROJECTS: Users can see/manage their own projects via membership
CREATE POLICY "Members can read their projects"
  ON projects FOR SELECT
  USING (public.is_project_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners/admins can update projects"
  ON projects FOR UPDATE
  USING (public.is_project_owner_or_admin(auth.uid(), id));

CREATE POLICY "Owners can delete projects"
  ON projects FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members
      WHERE project_id = projects.id AND role = 'owner'
    )
  );

-- COLLABORATORS: Scoped to project membership
CREATE POLICY "Members can read collaborators"
  ON collaborators FOR SELECT
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can create collaborators"
  ON collaborators FOR INSERT
  WITH CHECK (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can update collaborators"
  ON collaborators FOR UPDATE
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Owners/admins can delete collaborators"
  ON collaborators FOR DELETE
  USING (public.is_project_owner_or_admin(auth.uid(), project_id));

-- EVIDENCES: Scoped to project membership
CREATE POLICY "Members can read evidences"
  ON evidences FOR SELECT
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can create evidences"
  ON evidences FOR INSERT
  WITH CHECK (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can update evidences"
  ON evidences FOR UPDATE
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Owners/admins can delete evidences"
  ON evidences FOR DELETE
  USING (public.is_project_owner_or_admin(auth.uid(), project_id));

-- INITIATIVES: Scoped to project membership
CREATE POLICY "Members can read initiatives"
  ON initiatives FOR SELECT
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can create initiatives"
  ON initiatives FOR INSERT
  WITH CHECK (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can update initiatives"
  ON initiatives FOR UPDATE
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Owners/admins can delete initiatives"
  ON initiatives FOR DELETE
  USING (public.is_project_owner_or_admin(auth.uid(), project_id));

-- ASSETS: Scoped to project membership
CREATE POLICY "Members can read assets"
  ON assets FOR SELECT
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can create assets"
  ON assets FOR INSERT
  WITH CHECK (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can update assets"
  ON assets FOR UPDATE
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Owners/admins can delete assets"
  ON assets FOR DELETE
  USING (public.is_project_owner_or_admin(auth.uid(), project_id));

-- =====================================================
-- STORAGE BUCKET: Make private and add authenticated policies
-- =====================================================

UPDATE storage.buckets
SET public = false
WHERE id = 'project-files';

-- Storage policies for authenticated users with project membership
CREATE POLICY "Members can read project files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-files' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM assets a
      JOIN project_members pm ON pm.project_id = a.project_id
      WHERE a.storage_path = name
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can upload project files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Members can update project files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-files' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM assets a
      JOIN project_members pm ON pm.project_id = a.project_id
      WHERE a.storage_path = name
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners/admins can delete project files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-files' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM assets a
      JOIN project_members pm ON pm.project_id = a.project_id
      WHERE a.storage_path = name
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- TRIGGER: Auto-add creator as project owner
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_project();