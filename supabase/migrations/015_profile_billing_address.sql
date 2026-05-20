-- 015_profile_billing_address.sql
-- Adresse de facturation et TVA sur le profil client
-- Permet de pré-remplir le panier à la prochaine commande

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_line1       text,
  ADD COLUMN IF NOT EXISTS billing_line2       text,
  ADD COLUMN IF NOT EXISTS billing_city        text,
  ADD COLUMN IF NOT EXISTS billing_postal_code text,
  ADD COLUMN IF NOT EXISTS billing_country     text DEFAULT 'BE',
  ADD COLUMN IF NOT EXISTS vat_number          text,
  ADD COLUMN IF NOT EXISTS vat_country         text;
