ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sides_finitions jsonb DEFAULT NULL;
-- Structure: {
--   "enabled": true,
--   "sides": [{"id":"gauche","label":"Côté gauche"},{"id":"droit","label":"Côté droit"},{"id":"haut","label":"Haut"},{"id":"bas","label":"Bas"}],
--   "options": [{"id":"uuid","label":"Coupe franche","price_type":"fixed","price_supplement":0},...]
-- }
