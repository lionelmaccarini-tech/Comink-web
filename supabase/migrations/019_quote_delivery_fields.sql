-- ── Quote delivery & blind-shipping fields — Migration 019 ───────────────────

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS user_id          uuid    REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_country text    DEFAULT 'BE',
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS delivery_km      integer,
  ADD COLUMN IF NOT EXISTS blind_shipping   boolean NOT NULL DEFAULT false;

-- Index for looking up quotes by client profile
CREATE INDEX IF NOT EXISTS quotes_user_id_idx ON public.quotes(user_id);
