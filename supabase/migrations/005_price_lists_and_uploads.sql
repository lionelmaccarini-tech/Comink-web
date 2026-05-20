-- Certificats sur les produits
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS certificates jsonb DEFAULT '[]';
-- format: [{"name": "Certificat feu", "url": "...", "type": "fire|tech|it"}]

-- Visibilité produit restreinte à des listes de prix
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS restricted_to_price_lists uuid[] DEFAULT '{}';
-- si vide = visible par tous ; si rempli = visible uniquement aux clients avec ces listes de prix

-- Amélioration des listes de prix
ALTER TABLE public.price_lists
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS free_shipping boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_shipping_threshold numeric(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Règles tarifaires par produit ou par catégorie
CREATE TABLE IF NOT EXISTS public.price_list_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_list_id uuid NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  rule_type text NOT NULL CHECK (rule_type IN ('product', 'category')),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  category text,
  custom_price_per_m2 numeric(10,2),
  discount_percent numeric(5,2),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.price_list_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage price list rules" ON public.price_list_rules;
CREATE POLICY "Admins manage price list rules" ON public.price_list_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','collaborateur'))
);

CREATE INDEX IF NOT EXISTS idx_price_list_rules_list ON public.price_list_rules(price_list_id);
CREATE INDEX IF NOT EXISTS idx_price_list_rules_product ON public.price_list_rules(product_id);
