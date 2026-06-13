-- Migration 032 : file_analysis_cache + références sur production_lines
-- À appliquer manuellement via le Dashboard Supabase > SQL Editor

-- 1. Colonnes références sur production_lines
ALTER TABLE production_lines
  ADD COLUMN IF NOT EXISTS line_reference  text,
  ADD COLUMN IF NOT EXISTS order_reference text;

-- 2. Table cache des analyses fichiers (clé = file_url)
--    Permet au webhook Stripe de retrouver l'analyse faite au moment du panier
CREATE TABLE IF NOT EXISTS file_analysis_cache (
  file_url   text PRIMARY KEY,
  analysis   jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index pour les lookups en masse (webhook)
CREATE INDEX IF NOT EXISTS idx_file_analysis_cache_created_at
  ON file_analysis_cache (created_at);

-- RLS : accessible uniquement via service_role (clé secrète serveur)
ALTER TABLE file_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Politique : aucun accès public — uniquement via service_role
-- (les routes API utilisent createServiceClient() qui bypass RLS)
