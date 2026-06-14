-- Migration 035 : Ajouter 'chat_angelo' comme source valide dans la table quotes
-- Nécessaire pour les leads créés depuis le chat Angelo (handoff humain + create_crm_lead)

ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_source_check;

ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_source_check
  CHECK (source IN ('web','phone','email','referral','event','other','chat_angelo'));
