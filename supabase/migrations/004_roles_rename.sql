-- =============================================
-- Mise à jour des rôles utilisateurs
-- client → user (commandes externes, lié à un compte client)
-- production → producteur (production + pointage)
-- =============================================

-- 1. Drop the existing check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Rename existing values
UPDATE public.profiles SET role = 'user'       WHERE role = 'client';
UPDATE public.profiles SET role = 'producteur' WHERE role = 'production';

-- 3. New constraint with new role names
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin', 'collaborateur', 'producteur'));

-- 4. Update default
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';

-- =============================================
-- Update RLS policies that reference old roles
-- =============================================

-- profiles
DROP POLICY IF EXISTS "Admins have full access" ON public.profiles;
CREATE POLICY "Admins have full access" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','collaborateur'))
);

-- products
DROP POLICY IF EXISTS "Admins manage products" ON public.products;
CREATE POLICY "Admins manage products" ON public.products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'collaborateur'))
);

-- orders
DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'collaborateur', 'producteur'))
);

DROP POLICY IF EXISTS "Users see own orders" ON public.orders;
CREATE POLICY "Users see own orders" ON public.orders FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'collaborateur', 'producteur'))
);

-- quotes
DROP POLICY IF EXISTS "Admins manage quotes" ON public.quotes;
CREATE POLICY "Admins manage quotes" ON public.quotes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'collaborateur'))
);

-- client_accounts
DROP POLICY IF EXISTS "Admins manage client accounts" ON public.client_accounts;
CREATE POLICY "Admins manage client accounts" ON public.client_accounts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','collaborateur'))
);

DROP POLICY IF EXISTS "Admins manage members" ON public.client_account_members;
CREATE POLICY "Admins manage members" ON public.client_account_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','collaborateur'))
);

-- use_cases
DROP POLICY IF EXISTS "Admins manage use cases" ON public.use_cases;
CREATE POLICY "Admins manage use cases" ON public.use_cases FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- blog posts
DROP POLICY IF EXISTS "Admins manage posts" ON public.blog_posts;
CREATE POLICY "Admins manage posts" ON public.blog_posts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
