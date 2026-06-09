-- ── Angelo Knowledge Base ────────────────────────────────────────────────────
-- Stocke les questions/réponses et informations génériques qu'Angelo peut
-- utiliser pour répondre aux clients. JAMAIS de données client (nom, email,
-- numéro de devis) — uniquement de l'information produit/processus générique.

CREATE TABLE IF NOT EXISTS angelo_knowledge (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  category     TEXT        NOT NULL DEFAULT 'general',
  -- Catégories : produits | délais | pose | matériaux | prix | commande |
  --              formats | finitions | livraison | faq | general
  question     TEXT        NOT NULL,
  answer       TEXT        NOT NULL,
  keywords     TEXT[]      DEFAULT '{}',
  source       TEXT        DEFAULT 'manual',
  -- Sources : manual (admin) | blog (tiré d'un article) | conversation (auto-extrait)
  source_ref   TEXT,       -- ex: slug d'article blog, ou date de conversation
  is_active    BOOLEAN     DEFAULT true,
  approved     BOOLEAN     DEFAULT true,
  -- approved=false → en attente de validation admin (pour les suggestions d'Angelo)
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Index full-text pour la recherche rapide
CREATE INDEX IF NOT EXISTS angelo_knowledge_search_idx
  ON angelo_knowledge USING gin(to_tsvector('french', question || ' ' || answer));

CREATE INDEX IF NOT EXISTS angelo_knowledge_keywords_idx
  ON angelo_knowledge USING gin(keywords);

CREATE INDEX IF NOT EXISTS angelo_knowledge_category_idx
  ON angelo_knowledge (category);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_angelo_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_angelo_knowledge_updated_at ON angelo_knowledge;
CREATE TRIGGER trg_angelo_knowledge_updated_at
  BEFORE UPDATE ON angelo_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_angelo_knowledge_updated_at();

-- RLS
ALTER TABLE angelo_knowledge ENABLE ROW LEVEL SECURITY;

-- Lecture publique des connaissances actives et approuvées
CREATE POLICY "angelo_knowledge_public_read"
  ON angelo_knowledge FOR SELECT
  USING (is_active = true AND approved = true);

-- Service role : accès complet (admin + Angelo API)
CREATE POLICY "angelo_knowledge_service_all"
  ON angelo_knowledge FOR ALL
  USING (auth.role() = 'service_role');

-- Quelques entrées initiales pour démarrer
INSERT INTO angelo_knowledge (category, question, answer, keywords, source) VALUES
(
  'commande',
  'Comment fonctionne la commande rapide ?',
  'La commande rapide sur comink.be vous permet de configurer votre produit en quelques clics : choisissez votre produit, entrez vos dimensions, sélectionnez vos finitions et votre délai, puis ajoutez au panier. Vous recevez un récapitulatif détaillé avant de confirmer.',
  ARRAY['commande rapide', 'commander', 'panier', 'configurer'],
  'manual'
),
(
  'délais',
  'Quels sont les délais de production chez Comink ?',
  'Comink propose plusieurs délais selon l''urgence : Express (24-48h), Standard (3-5 jours ouvrables), Économique (7-10 jours ouvrables). Les délais exacts sont affichés lors de la configuration du produit et dépendent du type de produit commandé.',
  ARRAY['délai', 'délais', 'production', 'express', 'urgent', 'livraison'],
  'manual'
),
(
  'matériaux',
  'Quels matériaux proposez-vous pour les bâches ?',
  'Comink propose plusieurs types de bâches : bâche PVC 510g/m² (standard extérieur), bâche mesh (perforée, idéale pour les vitrines), bâche rétroéclairée pour les caissons lumineux. Chaque matériau a ses avantages selon l''utilisation finale.',
  ARRAY['bâche', 'PVC', 'mesh', 'matériau', 'matériaux', 'tissu'],
  'manual'
),
(
  'pose',
  'Comment poser les adhésifs muraux ?',
  'Pour poser un adhésif mural : 1) Nettoyez la surface avec de l''alcool isopropylique, 2) Laissez sécher complètement, 3) Retirez le liner en commençant par un coin, 4) Appliquez progressivement en chassant les bulles avec une raclette, 5) Réchauffez légèrement les bords avec un sèche-cheveux pour une meilleure adhérence.',
  ARRAY['adhésif', 'pose', 'installation', 'sticker', 'vinyle', 'mur'],
  'manual'
),
(
  'formats',
  'Quels formats standards proposez-vous pour les roll-ups ?',
  'Les formats standards de roll-up chez Comink sont : 85×200cm, 100×200cm, 120×200cm et 150×200cm. Nous proposons également des roll-ups sur mesure pour des dimensions spécifiques. Le roll-up 85×200cm est le format le plus courant pour les salons et événements.',
  ARRAY['roll-up', 'rollup', 'format', 'dimension', 'taille', 'salon', 'événement'],
  'manual'
),
(
  'prix',
  'Comment sont calculés les prix d''impression grand format ?',
  'Les prix chez Comink sont calculés au m² pour les produits sur mesure (bâches, adhésifs, etc.) ou à l''unité pour les produits standards (roll-ups, kakémonos). Le prix final dépend des dimensions, des finitions choisies (ourlets, illets, etc.) et du délai de production sélectionné.',
  ARRAY['prix', 'tarif', 'calcul', 'devis', 'coût', 'm²'],
  'manual'
),
(
  'livraison',
  'Livrez-vous partout en Belgique et en France ?',
  'Comink livre dans toute la Belgique (délai 1-2 jours ouvrables après expédition) et en France (2-3 jours). La livraison est gratuite à partir d''un certain montant de commande. Nous proposons également le retrait en atelier à Liège.',
  ARRAY['livraison', 'expédition', 'Belgique', 'France', 'retrait', 'Liège', 'transport'],
  'manual'
);
