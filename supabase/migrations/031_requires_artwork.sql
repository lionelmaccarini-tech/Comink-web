-- Indique si un produit nécessite un fichier visuel du client
-- Par défaut true (tous les produits imprimés le requièrent)
-- Mettre à false pour : accessoires, produits sans impression, etc.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS requires_artwork boolean NOT NULL DEFAULT true;
