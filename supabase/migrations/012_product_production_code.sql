-- 012_product_production_code.sql
-- Ajout du code production à 6 caractères alphanumériques sur les produits

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS production_code text;

-- Index unique (nullable — deux produits sans code ne conflictuent pas)
CREATE UNIQUE INDEX IF NOT EXISTS products_production_code_unique
  ON public.products (production_code)
  WHERE production_code IS NOT NULL;

-- Générer des codes pour les produits existants qui n'en ont pas
UPDATE public.products
SET production_code = upper(
  substring(md5(random()::text || id::text) for 3) ||
  substring(md5(random()::text || id::text || 'x') for 3)
)
WHERE production_code IS NULL;
