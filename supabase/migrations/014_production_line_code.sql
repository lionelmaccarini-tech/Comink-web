ALTER TABLE public.production_lines
  ADD COLUMN IF NOT EXISTS production_code text;
