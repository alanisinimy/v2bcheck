-- Adicionar novas colunas para rastreabilidade de iniciativas
ALTER TABLE public.initiatives 
ADD COLUMN IF NOT EXISTS related_gaps text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS expected_impact text,
ADD COLUMN IF NOT EXISTS sequential_id integer;

-- Trigger para sequential_id automático (IE01, IE02...)
CREATE OR REPLACE FUNCTION set_initiative_sequential_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sequential_id := COALESCE(
    (SELECT MAX(sequential_id) + 1 FROM initiatives WHERE project_id = NEW.project_id),
    1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER tr_initiative_sequential_id
BEFORE INSERT ON initiatives
FOR EACH ROW
WHEN (NEW.sequential_id IS NULL)
EXECUTE FUNCTION set_initiative_sequential_id();