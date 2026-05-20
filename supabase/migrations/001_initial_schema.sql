-- =============================================
-- COMINK - Migration initiale Supabase
-- =============================================

-- Extensions
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILES (étend auth.users)
-- =============================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  company text,
  phone text,
  role text not null default 'client' check (role in ('client', 'admin', 'production', 'collaborateur')),
  price_list_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins have full access" on public.profiles for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Trigger: créer profil à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- PRODUCTS
-- =============================================
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique,
  description text,
  category text not null,
  product_type text not null check (product_type in ('sur_mesure', 'taille_standard')),
  images text[] default '{}',
  image_url text,
  price_per_m2 numeric(10,2),
  standard_sizes jsonb default '[]',
  min_width_cm numeric(8,2),
  max_width_cm numeric(8,2),
  min_height_cm numeric(8,2),
  max_height_cm numeric(8,2),
  available boolean default true,
  jde_enabled boolean default false,
  visibility_group text,
  seo_title text,
  seo_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.products enable row level security;
create policy "Products are public" on public.products for select using (true);
create policy "Admins manage products" on public.products for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'collaborateur'))
);

-- =============================================
-- ORDERS
-- =============================================
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text unique not null,
  user_id uuid references public.profiles(id),
  client_name text not null,
  client_email text not null,
  client_phone text,
  items jsonb default '[]',
  subtotal numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  status text not null default 'pending'
    check (status in ('pending','confirmed','in_production','ready','shipped','delivered','cancelled')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','refunded')),
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  delivery_type text default 'shipping' check (delivery_type in ('shipping','pickup')),
  shipping_address jsonb,
  tracking_number text,
  notes text,
  production_notes text,
  estimated_delivery date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.orders enable row level security;
create policy "Users see own orders" on public.orders for select using (
  auth.uid() = user_id or
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'production', 'collaborateur'))
);
create policy "Admins manage orders" on public.orders for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'production', 'collaborateur'))
);

-- =============================================
-- QUOTES (Devis)
-- =============================================
create table if not exists public.quotes (
  id uuid primary key default uuid_generate_v4(),
  quote_number text unique not null,
  client_name text not null,
  client_email text not null,
  client_company text,
  client_phone text,
  items jsonb default '[]',
  subtotal numeric(10,2) default 0,
  tax numeric(10,2) default 0,
  total numeric(10,2) default 0,
  status text default 'draft'
    check (status in ('draft','sent','accepted','refused','expired')),
  valid_until date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.quotes enable row level security;
create policy "Admins manage quotes" on public.quotes for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'collaborateur'))
);
create policy "Public can insert quotes" on public.quotes for insert with check (true);

-- =============================================
-- PRICE LISTS
-- =============================================
create table if not exists public.price_lists (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  discount_percent numeric(5,2) default 0,
  is_default boolean default false,
  created_at timestamptz default now()
);

alter table public.price_lists enable row level security;
create policy "Price lists visible to admins" on public.price_lists for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- =============================================
-- USE CASES (Tout pour...)
-- =============================================
create table if not exists public.use_cases (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text,
  icon text,
  image_url text,
  product_ids uuid[] default '{}',
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table public.use_cases enable row level security;
create policy "Use cases are public" on public.use_cases for select using (true);
create policy "Admins manage use cases" on public.use_cases for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- =============================================
-- BLOG POSTS
-- =============================================
create table if not exists public.blog_posts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text,
  cover_image text,
  published boolean default false,
  published_at timestamptz,
  author text,
  tags text[] default '{}',
  seo_title text,
  seo_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.blog_posts enable row level security;
create policy "Published posts are public" on public.blog_posts for select using (published = true);
create policy "Admins manage posts" on public.blog_posts for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- =============================================
-- INDEXES
-- =============================================
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_type on public.products(product_type);
create index if not exists idx_products_available on public.products(available);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_email on public.orders(client_email);
create index if not exists idx_blog_published on public.blog_posts(published, published_at);

-- =============================================
-- UPDATED_AT triggers
-- =============================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger set_products_updated_at before update on public.products
  for each row execute procedure public.set_updated_at();
create trigger set_orders_updated_at before update on public.orders
  for each row execute procedure public.set_updated_at();
create trigger set_quotes_updated_at before update on public.quotes
  for each row execute procedure public.set_updated_at();
create trigger set_blog_updated_at before update on public.blog_posts
  for each row execute procedure public.set_updated_at();
