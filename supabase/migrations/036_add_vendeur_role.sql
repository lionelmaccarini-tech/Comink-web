-- Ajoute le rôle 'vendeur' à la contrainte CHECK de profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin', 'collaborateur', 'producteur', 'vendeur'));
