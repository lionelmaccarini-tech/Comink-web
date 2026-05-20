-- =============================================
-- CLIENT ACCOUNTS (comptes clients multi-utilisateurs)
-- =============================================

CREATE TABLE IF NOT EXISTS public.client_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  vat_number text,
  address_line1 text,
  address_line2 text,
  city text,
  postal_code text,
  country text DEFAULT 'BE',
  price_list_id uuid REFERENCES public.price_lists(id) ON DELETE SET NULL,
  discount_percent numeric(5,2) DEFAULT 0,
  notes text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;

-- Admins can manage all client accounts
DROP POLICY IF EXISTS "Admins manage client accounts" ON public.client_accounts;
CREATE POLICY "Admins manage client accounts" ON public.client_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','collaborateur'))
  );

-- =============================================
-- CLIENT ACCOUNT MEMBERS (créé AVANT la policy qui le référence)
-- =============================================

CREATE TABLE IF NOT EXISTS public.client_account_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  invited_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_account_id, profile_id)
);

ALTER TABLE public.client_account_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage members" ON public.client_account_members;
CREATE POLICY "Admins manage members" ON public.client_account_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','collaborateur'))
  );

DROP POLICY IF EXISTS "Members read own membership" ON public.client_account_members;
CREATE POLICY "Members read own membership" ON public.client_account_members
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Owners manage their team" ON public.client_account_members;
CREATE POLICY "Owners manage their team" ON public.client_account_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.client_account_members m2
      WHERE m2.client_account_id = client_account_id
        AND m2.profile_id = auth.uid()
        AND m2.role = 'owner'
    )
  );

-- =============================================
-- Policy sur client_accounts qui référence client_account_members
-- (créée APRÈS que la table existe)
-- =============================================

DROP POLICY IF EXISTS "Members read own client account" ON public.client_accounts;
CREATE POLICY "Members read own client account" ON public.client_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.client_account_members
      WHERE client_account_id = public.client_accounts.id AND profile_id = auth.uid()
    )
  );

-- =============================================
-- Colonnes sur les tables existantes
-- =============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS client_account_id uuid REFERENCES public.client_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_account_id uuid REFERENCES public.client_accounts(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_members_account ON public.client_account_members(client_account_id);
CREATE INDEX IF NOT EXISTS idx_client_members_profile ON public.client_account_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_profiles_client_account ON public.profiles(client_account_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_client_accounts_updated_at ON public.client_accounts;
CREATE TRIGGER set_client_accounts_updated_at
  BEFORE UPDATE ON public.client_accounts
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
