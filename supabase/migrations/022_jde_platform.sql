-- JDE clients
CREATE TABLE IF NOT EXISTS public.jde_clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  company text,
  email text NOT NULL UNIQUE,
  points_balance integer NOT NULL DEFAULT 0,
  logo_url text,
  logo_name text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- JDE products catalog
CREATE TABLE IF NOT EXISTS public.jde_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text,
  point_cost integer NOT NULL,
  template_url text,
  logo_zone jsonb DEFAULT '{"x":0.1,"y":0.1,"width":0.3,"height":0.3}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- JDE orders
CREATE TABLE IF NOT EXISTS public.jde_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  client_id uuid REFERENCES public.jde_clients(id),
  total_points integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- JDE order items
CREATE TABLE IF NOT EXISTS public.jde_order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.jde_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.jde_products(id),
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  point_cost_each integer NOT NULL,
  logo_url text,
  generated_visual_url text,
  production_line_id uuid,
  created_at timestamptz DEFAULT now()
);

-- JDE point transactions
CREATE TABLE IF NOT EXISTS public.jde_point_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.jde_clients(id),
  type text NOT NULL CHECK (type IN ('credit','debit','purchase')),
  amount integer NOT NULL,
  description text,
  reference_id uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- RLS: enable but allow service role full access
ALTER TABLE public.jde_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jde_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jde_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jde_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jde_point_transactions ENABLE ROW LEVEL SECURITY;

-- Products: readable by authenticated users
CREATE POLICY "jde_products_read" ON public.jde_products FOR SELECT USING (active = true);
-- Clients can read their own data
CREATE POLICY "jde_clients_self_read" ON public.jde_clients FOR SELECT USING (auth.uid() = user_id);
-- Clients can read their own orders
CREATE POLICY "jde_orders_self_read" ON public.jde_orders FOR SELECT USING (
  client_id IN (SELECT id FROM public.jde_clients WHERE user_id = auth.uid())
);
CREATE POLICY "jde_order_items_self_read" ON public.jde_order_items FOR SELECT USING (
  order_id IN (SELECT id FROM public.jde_orders WHERE client_id IN (SELECT id FROM public.jde_clients WHERE user_id = auth.uid()))
);
CREATE POLICY "jde_transactions_self_read" ON public.jde_point_transactions FOR SELECT USING (
  client_id IN (SELECT id FROM public.jde_clients WHERE user_id = auth.uid())
);
