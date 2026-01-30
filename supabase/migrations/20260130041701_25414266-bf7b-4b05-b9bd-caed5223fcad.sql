-- =============================================
-- FIX 1: project_members INSERT policy
-- O problema: política ALL só tem USING, precisa de WITH CHECK para INSERT
-- =============================================

DROP POLICY IF EXISTS "Owners/admins can manage project members" ON public.project_members;

CREATE POLICY "Owners/admins can manage project members"
ON public.project_members
FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT pm.user_id FROM public.project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT pm.user_id FROM public.project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.role IN ('owner', 'admin')
  )
);

-- =============================================
-- FIX 2: Storage upload policy - validar membership
-- =============================================

DROP POLICY IF EXISTS "Members can upload project files" ON storage.objects;

CREATE POLICY "Members can upload project files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = auth.uid()
    AND storage.objects.name LIKE pm.project_id::text || '/%'
  )
);

-- =============================================
-- FIX 3: Remover política SELECT redundante de projects
-- A política "Creators can view" é redundante pois o trigger
-- já adiciona o criador como owner em project_members
-- =============================================

DROP POLICY IF EXISTS "Creators can view their own projects" ON public.projects;