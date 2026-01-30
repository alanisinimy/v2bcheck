-- Fix infinite recursion in project_members policies
-- The problem: storage policy queries project_members, which has a policy that queries itself

-- Drop the problematic policy first
DROP POLICY IF EXISTS "Owners/admins can manage project members" ON public.project_members;

-- Drop existing storage policies that cause recursion
DROP POLICY IF EXISTS "Members can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Members can read project files" ON storage.objects;
DROP POLICY IF EXISTS "Members can update project files" ON storage.objects;
DROP POLICY IF EXISTS "Owners/admins can delete project files" ON storage.objects;

-- Create non-recursive policies for project_members using existing security definer functions
CREATE POLICY "Owners/admins can insert project members" 
ON public.project_members 
FOR INSERT 
WITH CHECK (public.is_project_owner_or_admin(auth.uid(), project_id));

CREATE POLICY "Owners/admins can update project members" 
ON public.project_members 
FOR UPDATE 
USING (public.is_project_owner_or_admin(auth.uid(), project_id));

CREATE POLICY "Owners/admins can delete project members" 
ON public.project_members 
FOR DELETE 
USING (public.is_project_owner_or_admin(auth.uid(), project_id));

-- Recreate storage policies using the security definer function to avoid recursion
CREATE POLICY "Members can upload project files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'project-files' 
  AND auth.uid() IS NOT NULL 
  AND public.is_project_member(auth.uid(), (split_part(name, '/', 1))::uuid)
);

CREATE POLICY "Members can read project files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'project-files' 
  AND auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.assets a
    WHERE a.storage_path = name 
    AND public.is_project_member(auth.uid(), a.project_id)
  )
);

CREATE POLICY "Members can update project files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'project-files' 
  AND auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.assets a
    WHERE a.storage_path = name 
    AND public.is_project_member(auth.uid(), a.project_id)
  )
);

CREATE POLICY "Owners/admins can delete project files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'project-files' 
  AND auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.assets a
    WHERE a.storage_path = name 
    AND public.is_project_owner_or_admin(auth.uid(), a.project_id)
  )
);