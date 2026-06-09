-- Migration 030 — Produits accessoires liés
-- Ajoute une colonne pour stocker les IDs des accessoires liés à un produit

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS linked_accessory_ids uuid[] DEFAULT '{}';

COMMENT ON COLUMN public.products.linked_accessory_ids IS
  'IDs des produits accessoires (category=accessoires) proposés lors de l''ajout au panier';
