-- O problema: ao fazer INSERT com RETURNING, o Supabase valida a política de SELECT
-- Mas o trigger que adiciona o usuário como membro só executa DEPOIS do INSERT
-- Solução: permitir que o usuário veja projetos durante a transação de criação

-- Opção 1: Adicionar política de SELECT para o criador
-- Como não temos created_by na tabela, usamos uma abordagem diferente

-- Primeiro, adicionar coluna created_by para rastrear o criador
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Atualizar projetos existentes com o owner atual
UPDATE public.projects p
SET created_by = (
  SELECT pm.user_id 
  FROM public.project_members pm 
  WHERE pm.project_id = p.id AND pm.role = 'owner'
  LIMIT 1
)
WHERE p.created_by IS NULL;

-- Criar política que permite ao criador ver seus projetos (mesmo antes do trigger)
CREATE POLICY "Creators can view their own projects"
ON public.projects
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Atualizar a política de INSERT para definir o created_by automaticamente
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;

CREATE POLICY "Authenticated users can create projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (created_by IS NULL OR created_by = auth.uid())
);

-- Trigger para definir created_by automaticamente
CREATE OR REPLACE FUNCTION public.set_project_creator()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger BEFORE INSERT para definir created_by
DROP TRIGGER IF EXISTS set_project_creator_trigger ON public.projects;
CREATE TRIGGER set_project_creator_trigger
BEFORE INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION set_project_creator();