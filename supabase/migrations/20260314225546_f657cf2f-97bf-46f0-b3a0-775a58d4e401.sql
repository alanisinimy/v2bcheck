DROP POLICY "Members can read their projects" ON public.projects;
CREATE POLICY "Members can read their projects"
  ON public.projects FOR SELECT
  TO public
  USING (
    is_project_member(auth.uid(), id)
    OR created_by = auth.uid()
  );