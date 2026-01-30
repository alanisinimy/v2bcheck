-- Add role fit columns to collaborators table
ALTER TABLE public.collaborators
ADD COLUMN role_fit_level TEXT CHECK (role_fit_level IN ('alto', 'medio', 'baixo')),
ADD COLUMN role_fit_reason TEXT;