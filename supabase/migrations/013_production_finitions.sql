-- 013_production_finitions.sql
-- Stockage des finitions choisies et du délai sur les lignes de production

ALTER TABLE public.production_lines
  ADD COLUMN IF NOT EXISTS finitions_summary jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS delai_label        text;
