-- Add new audit columns to evidences table
ALTER TABLE public.evidences 
ADD COLUMN IF NOT EXISTS benchmark text,
ADD COLUMN IF NOT EXISTS impact text,
ADD COLUMN IF NOT EXISTS criticality text DEFAULT 'media',
ADD COLUMN IF NOT EXISTS sequential_id integer;

-- Add check constraints
ALTER TABLE public.evidences 
ADD CONSTRAINT evidences_impact_check CHECK (impact IS NULL OR impact IN ('receita', 'eficiencia', 'risco')),
ADD CONSTRAINT evidences_criticality_check CHECK (criticality IS NULL OR criticality IN ('alta', 'media', 'baixa'));

-- Create function to generate sequential ID per project
CREATE OR REPLACE FUNCTION public.generate_evidence_sequential_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sequential_id IS NULL THEN
    SELECT COALESCE(MAX(sequential_id), 0) + 1
    INTO NEW.sequential_id
    FROM public.evidences
    WHERE project_id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for auto-increment
DROP TRIGGER IF EXISTS set_evidence_sequential_id ON public.evidences;
CREATE TRIGGER set_evidence_sequential_id
BEFORE INSERT ON public.evidences
FOR EACH ROW
EXECUTE FUNCTION public.generate_evidence_sequential_id();

-- Update existing records with sequential IDs
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) as seq
  FROM public.evidences
  WHERE sequential_id IS NULL
)
UPDATE public.evidences e
SET sequential_id = n.seq
FROM numbered n
WHERE e.id = n.id;