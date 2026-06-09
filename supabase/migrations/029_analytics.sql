-- ── Analytics — Sessions & Page Views ───────────────────────────────────────

-- Sessions (une par onglet/visite)
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id    TEXT        UNIQUE NOT NULL,          -- UUID généré côté client
  user_id       UUID,                                  -- null si non connecté
  user_email    TEXT,
  -- Géolocalisation (headers Vercel)
  country       TEXT,
  country_code  TEXT,
  city          TEXT,
  region        TEXT,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  -- Device / Browser
  device_type   TEXT,        -- desktop | mobile | tablet | bot
  browser       TEXT,        -- Chrome | Firefox | Safari | Edge | …
  browser_ver   TEXT,
  os            TEXT,        -- Windows | macOS | Linux | iOS | Android | …
  os_ver        TEXT,
  -- Traffic
  referrer      TEXT,
  referrer_host TEXT,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  landing_page  TEXT,
  -- Durée
  first_seen    TIMESTAMPTZ  DEFAULT now(),
  last_seen     TIMESTAMPTZ  DEFAULT now(),
  page_count    INT          DEFAULT 1,
  is_bot        BOOLEAN      DEFAULT false
);

CREATE INDEX IF NOT EXISTS analytics_sessions_last_seen_idx ON analytics_sessions (last_seen DESC);
CREATE INDEX IF NOT EXISTS analytics_sessions_user_id_idx   ON analytics_sessions (user_id);
CREATE INDEX IF NOT EXISTS analytics_sessions_country_idx   ON analytics_sessions (country_code);

-- Page views (une par page visitée)
CREATE TABLE IF NOT EXISTS analytics_pageviews (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  TEXT        NOT NULL,
  user_id     UUID,
  page        TEXT        NOT NULL,
  title       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_pageviews_session_idx    ON analytics_pageviews (session_id);
CREATE INDEX IF NOT EXISTS analytics_pageviews_created_at_idx ON analytics_pageviews (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_pageviews_page_idx       ON analytics_pageviews (page);

-- RLS : écriture libre (tracker anonyme), lecture réservée au service role (admin)
ALTER TABLE analytics_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_pageviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_sessions_insert"  ON analytics_sessions  FOR INSERT WITH CHECK (true);
CREATE POLICY "analytics_pageviews_insert" ON analytics_pageviews FOR INSERT WITH CHECK (true);

CREATE POLICY "analytics_sessions_service"  ON analytics_sessions  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "analytics_pageviews_service" ON analytics_pageviews FOR ALL USING (auth.role() = 'service_role');

-- ── Enrichissement du profil : genre + année de naissance ────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender     TEXT CHECK (gender IN ('M','F','NB','NS'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_year SMALLINT CHECK (birth_year BETWEEN 1920 AND 2015);
-- M=Homme, F=Femme, NB=Non-binaire, NS=Préfère ne pas préciser
