-- Migration 034 : Code comptable Odoo sur les produits
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS odoo_account_code text;

COMMENT ON COLUMN public.products.odoo_account_code IS
  'Code du compte comptable Odoo (ex: 700000) — utilisé lors de la création des factures pour cibler le bon compte de produits.';
