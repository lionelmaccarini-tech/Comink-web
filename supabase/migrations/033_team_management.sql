-- Migration 033 : Gestion d'équipe multi-utilisateurs
-- À appliquer via Supabase Dashboard > SQL Editor

-- ─── 1. Table invitations en attente (pour l'UI) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.pending_invitations (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         text NOT NULL,
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  invited_by    uuid REFERENCES public.profiles(id),
  created_at    timestamptz DEFAULT now(),
  UNIQUE(email, client_account_id)
);

ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- Owners peuvent voir les invitations de leur compte
CREATE POLICY "Owners see own invitations" ON public.pending_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.client_account_members
      WHERE client_account_id = public.pending_invitations.client_account_id
        AND profile_id = auth.uid()
        AND role = 'owner'
    )
  );

-- Owners peuvent inviter
CREATE POLICY "Owners manage invitations" ON public.pending_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.client_account_members
      WHERE client_account_id = public.pending_invitations.client_account_id
        AND profile_id = auth.uid()
        AND role = 'owner'
    )
  );

-- Admins Comink voient tout
CREATE POLICY "Admins manage all invitations" ON public.pending_invitations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','collaborateur'))
  );

-- ─── 2. Policy manquante : owner peut modifier les membres de son compte ──────
-- (la policy INSERT pour les owners n'existe pas encore)
DROP POLICY IF EXISTS "Owners insert members" ON public.client_account_members;
CREATE POLICY "Owners insert members" ON public.client_account_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_account_members m2
      WHERE m2.client_account_id = client_account_id
        AND m2.profile_id = auth.uid()
        AND m2.role = 'owner'
    )
  );

-- ─── 3. Trigger mis à jour : handle_new_user crée un client_account ──────────
-- Lors de l'inscription normale → crée un compte + membership owner
-- Lors d'une invitation → lie l'utilisateur au compte existant
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_account_id          uuid;
  v_invitation_account  uuid;
  v_invitation_role     text;
BEGIN
  -- Créer le profil (comme avant)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;

  -- Vérifier si c'est un utilisateur invité
  v_invitation_account := (NEW.raw_user_meta_data->>'invitation_account_id')::uuid;
  v_invitation_role    := COALESCE(NEW.raw_user_meta_data->>'invitation_role', 'member');

  IF v_invitation_account IS NOT NULL THEN
    -- ── Invitation : lier au compte existant ──────────────────────────────────
    UPDATE public.profiles
    SET client_account_id = v_invitation_account
    WHERE id = NEW.id;

    INSERT INTO public.client_account_members (client_account_id, profile_id, role)
    VALUES (v_invitation_account, NEW.id, v_invitation_role)
    ON CONFLICT (client_account_id, profile_id) DO UPDATE SET role = v_invitation_role;

    -- Supprimer l'invitation en attente
    DELETE FROM public.pending_invitations
    WHERE email = NEW.email AND client_account_id = v_invitation_account;

  ELSE
    -- ── Nouvelle inscription : créer un compte client ─────────────────────────
    INSERT INTO public.client_accounts (name, email, created_by)
    VALUES (
      COALESCE(
        NEW.raw_user_meta_data->>'company',
        split_part(NEW.email, '@', 1)
      ),
      NEW.email,
      NEW.id
    )
    RETURNING id INTO v_account_id;

    UPDATE public.profiles
    SET client_account_id = v_account_id
    WHERE id = NEW.id;

    INSERT INTO public.client_account_members (client_account_id, profile_id, role)
    VALUES (v_account_id, NEW.id, 'owner');
  END IF;

  RETURN NEW;
END;
$$;

-- Le trigger existe déjà — juste mettre à jour la fonction suffit
-- (on_auth_user_created est déjà créé en migration 001)

-- ─── 4. Remplissage rétroactif pour les users existants ───────────────────────
-- Crée un client_account pour chaque profil qui n'en a pas encore
DO $$
DECLARE
  p RECORD;
  v_account_id uuid;
BEGIN
  FOR p IN SELECT id, email, company FROM public.profiles WHERE client_account_id IS NULL LOOP
    INSERT INTO public.client_accounts (name, email, created_by)
    VALUES (COALESCE(p.company, split_part(p.email, '@', 1)), p.email, p.id)
    RETURNING id INTO v_account_id;

    UPDATE public.profiles SET client_account_id = v_account_id WHERE id = p.id;

    INSERT INTO public.client_account_members (client_account_id, profile_id, role)
    VALUES (v_account_id, p.id, 'owner')
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;
