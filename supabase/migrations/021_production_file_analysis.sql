-- ── Rapport d'analyse fichier sur les lignes de production — Migration 021 ───
ALTER TABLE public.production_lines
  ADD COLUMN IF NOT EXISTS file_analysis jsonb;

COMMENT ON COLUMN public.production_lines.file_analysis
  IS 'Résultat JSON de l''analyse Claude du fichier client (score, checks, recommendations)';

CREATE INDEX IF NOT EXISTS production_lines_file_analysis_idx
  ON public.production_lines USING gin(file_analysis)
  WHERE file_analysis IS NOT NULL;
