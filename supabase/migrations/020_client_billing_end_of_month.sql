-- ── Facturation fin de mois — Migration 020 ──────────────────────────────────
-- Permet de marquer un client comme "facturation regroupée fin du mois"
-- au lieu d'une facturation à la commande.

ALTER TABLE public.client_accounts
  ADD COLUMN IF NOT EXISTS billing_end_of_month boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.client_accounts.billing_end_of_month
  IS 'Si true, les commandes sont regroupées et facturées en fin de mois au lieu d'être facturées individuellement.';
