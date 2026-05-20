ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS files_expire_at timestamptz,
  ADD COLUMN IF NOT EXISTS files_deleted_at timestamptz;
