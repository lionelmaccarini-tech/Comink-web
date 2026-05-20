-- Add finitions and delai_options to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS finitions jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS delai_options jsonb DEFAULT '[]';

-- Allow service role and admins to manage all profiles
DROP POLICY IF EXISTS "Service role full access profiles" ON public.profiles;
CREATE POLICY "Service role full access profiles" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Allow admins to read all profiles
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','collaborateur'))
  );
