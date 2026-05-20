-- ── CRM — Migration 017 ───────────────────────────────────────────────────────

-- 1. Add vendeur role to the enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'vendeur';

-- 2. Extend quotes table with CRM fields
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS pipeline_stage   text DEFAULT 'lead'
    CHECK (pipeline_stage IN ('lead','contacted','quoted','negotiation','won','lost')),
  ADD COLUMN IF NOT EXISTS assigned_to      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS probability      integer DEFAULT 20
    CHECK (probability >= 0 AND probability <= 100),
  ADD COLUMN IF NOT EXISTS expected_amount  numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_action_date date,
  ADD COLUMN IF NOT EXISTS next_action_note text,
  ADD COLUMN IF NOT EXISTS source           text DEFAULT 'web'
    CHECK (source IN ('web','phone','email','referral','event','other')),
  ADD COLUMN IF NOT EXISTS lost_reason      text;

-- 3. CRM Activities (interaction timeline per deal)
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id     uuid        REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  type         text        NOT NULL
    CHECK (type IN ('note','call','email','meeting','status_change')),
  content      text,
  old_stage    text,
  new_stage    text,
  created_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS crm_activities_quote_id_idx ON public.crm_activities(quote_id);
CREATE INDEX IF NOT EXISTS quotes_assigned_to_idx      ON public.quotes(assigned_to);
CREATE INDEX IF NOT EXISTS quotes_pipeline_stage_idx   ON public.quotes(pipeline_stage);

-- RLS
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_activities_service ON public.crm_activities;
CREATE POLICY crm_activities_service ON public.crm_activities
  USING (true) WITH CHECK (true);
