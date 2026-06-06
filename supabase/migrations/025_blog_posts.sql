-- Migration 025 : Table blog_posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title         text NOT NULL,
  slug          text UNIQUE NOT NULL,
  excerpt       text,
  content       text,
  cover_image   text,
  tags          text[] DEFAULT '{}',
  published     boolean DEFAULT false,
  published_at  timestamptz,
  seo_title     text,
  seo_description text,
  seo_keywords  text,
  reading_time_min integer,
  author_name   text DEFAULT 'Équipe Comink',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Index pour la recherche par slug (public)
CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts (slug);
-- Index pour la liste paginée (filtrée par published)
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts (published_at DESC) WHERE published = true;

-- RLS : lecture publique sur les articles publiés
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "blog_posts_public_read"
  ON public.blog_posts FOR SELECT
  USING (published = true);

CREATE POLICY IF NOT EXISTS "blog_posts_service_all"
  ON public.blog_posts FOR ALL
  USING (true)
  WITH CHECK (true);
