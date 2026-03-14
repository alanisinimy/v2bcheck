
ALTER TABLE projects ADD COLUMN sector text;
ALTER TABLE projects ADD COLUMN company_size text;
ALTER TABLE projects ADD COLUMN custom_pilares jsonb DEFAULT NULL;

CREATE TABLE project_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read invites" ON project_invites
  FOR SELECT TO authenticated
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Owners/admins can manage invites" ON project_invites
  FOR ALL TO authenticated
  USING (is_project_owner_or_admin(auth.uid(), project_id));
