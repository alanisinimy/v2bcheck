-- Fix: A política de INSERT precisa também de uma cláusula USING
-- Isso é necessário para que o Supabase valide corretamente

-- Drop e recria a política com as duas cláusulas
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;

CREATE POLICY "Authenticated users can create projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);