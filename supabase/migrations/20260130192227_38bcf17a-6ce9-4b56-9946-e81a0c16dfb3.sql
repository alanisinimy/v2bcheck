-- Drop the old constraint
ALTER TABLE public.evidences DROP CONSTRAINT IF EXISTS evidences_impact_check;

-- Add updated constraint that includes 'cultura'
ALTER TABLE public.evidences ADD CONSTRAINT evidences_impact_check 
CHECK (impact IS NULL OR impact = ANY(ARRAY['receita', 'eficiencia', 'risco', 'cultura']::text[]));