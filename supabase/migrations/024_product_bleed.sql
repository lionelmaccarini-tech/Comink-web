-- Fonds perdus par produit (en mm)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS bleed_mm integer DEFAULT 3;
