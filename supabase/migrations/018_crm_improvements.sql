-- ── CRM improvements — Migration 018 ─────────────────────────────────────────

-- 1. Track which staff member manages a client profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_staff uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Delivery info on quotes
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS delivery_method text
    CHECK (delivery_method IN ('pickup','parcel','express') OR delivery_method IS NULL),
  ADD COLUMN IF NOT EXISTS delivery_cost   numeric(10,2) DEFAULT 0;

-- Index for looking up clients by assigned staff
CREATE INDEX IF NOT EXISTS profiles_assigned_staff_idx ON public.profiles(assigned_staff);
