-- Ajoute l'option "franco de port" sur les comptes clients
ALTER TABLE public.client_accounts
  ADD COLUMN IF NOT EXISTS free_shipping boolean NOT NULL DEFAULT false;
