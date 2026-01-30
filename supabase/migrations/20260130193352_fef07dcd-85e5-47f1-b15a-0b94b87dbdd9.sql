-- Add pesquisa_clima to the source_type enum for climate survey data
ALTER TYPE source_type ADD VALUE IF NOT EXISTS 'pesquisa_clima';