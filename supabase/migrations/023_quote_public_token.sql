-- Migration 023 : Ajout du public_token sur les devis
-- Permet d'envoyer un lien de validation public au client (sans login)

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS public_token text UNIQUE;

CREATE INDEX IF NOT EXISTS quotes_public_token_idx
  ON public.quotes(public_token)
  WHERE public_token IS NOT NULL;
