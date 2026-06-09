-- Adresse de facturation sur le devis (snapshot au moment de la création)
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS billing_line1       text,
  ADD COLUMN IF NOT EXISTS billing_line2       text,
  ADD COLUMN IF NOT EXISTS billing_city        text,
  ADD COLUMN IF NOT EXISTS billing_postal_code text,
  ADD COLUMN IF NOT EXISTS billing_country     text;
