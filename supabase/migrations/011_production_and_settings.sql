-- Migration 011 : tables production, adresses de livraison, paramètres

-- ─── 1. Statuts de production ────────────────────────────────────────────────

create table if not exists public.production_statuses (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  color       text not null default '#94a3b8',
  sort_order  int  not null default 0,
  is_initial  boolean not null default false,
  is_final    boolean not null default false,
  created_at  timestamptz default now()
);

-- Statuts par défaut
insert into public.production_statuses (name, color, sort_order, is_initial, is_final)
values
  ('Nouvelle commande', '#3b82f6', 0, true,  false),
  ('En préparation',    '#f59e0b', 1, false, false),
  ('En impression',     '#8b5cf6', 2, false, false),
  ('Finition',          '#ec4899', 3, false, false),
  ('Prêt',              '#10b981', 4, false, false),
  ('Livré / Clôturé',   '#64748b', 5, false, true)
on conflict do nothing;

alter table public.production_statuses enable row level security;
create policy "Staff read statuses" on public.production_statuses for select using (true);
create policy "Admins manage statuses" on public.production_statuses for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','collaborateur'))
);

-- ─── 2. Lignes de production ─────────────────────────────────────────────────

create table if not exists public.production_lines (
  id           uuid primary key default uuid_generate_v4(),
  order_id     uuid references public.orders(id) on delete set null,
  order_number text not null,
  user_id      uuid references public.profiles(id) on delete set null,
  client_name  text not null default '',
  client_email text not null default '',
  product_name text not null,
  product_id   uuid references public.products(id) on delete set null,
  width_cm     numeric(10,2),
  height_cm    numeric(10,2),
  quantity     int  not null default 1,
  file_url     text,
  file_name    text,
  file_thumb   text,
  status_id    uuid references public.production_statuses(id) on delete set null,
  assignee_id  uuid references public.profiles(id) on delete set null,
  due_date     date,
  notes        text,
  sort_order   int  not null default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists idx_production_lines_order    on public.production_lines(order_id);
create index if not exists idx_production_lines_status   on public.production_lines(status_id);
create index if not exists idx_production_lines_assignee on public.production_lines(assignee_id);
create index if not exists idx_production_lines_due_date on public.production_lines(due_date);

create trigger set_production_lines_updated_at
  before update on public.production_lines
  for each row execute function public.handle_updated_at();

alter table public.production_lines enable row level security;
create policy "Staff read lines" on public.production_lines for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','collaborateur','producteur'))
);
create policy "Staff manage lines" on public.production_lines for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','collaborateur','producteur'))
);
-- Le client peut voir ses propres lignes
create policy "Client read own lines" on public.production_lines for select using (
  auth.uid() = user_id
);

-- ─── 3. Adresses de livraison client ─────────────────────────────────────────

create table if not exists public.shipping_addresses (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  label        text,               -- ex. "Bureau", "Entrepôt"
  line1        text not null,
  line2        text,
  city         text not null,
  postal_code  text,
  country      text not null default 'BE',
  is_default   boolean not null default false,
  created_at   timestamptz default now()
);

create index if not exists idx_shipping_addresses_user on public.shipping_addresses(user_id);

alter table public.shipping_addresses enable row level security;
create policy "Users manage own addresses" on public.shipping_addresses for all using (
  auth.uid() = user_id
);

-- ─── 4. Paramètres applicatifs (clé-valeur) ──────────────────────────────────

create table if not exists public.app_settings (
  key         text primary key,
  value       text,
  updated_at  timestamptz default now()
);

alter table public.app_settings enable row level security;
create policy "Admins manage settings" on public.app_settings for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
-- Lecture publique pour les clés non-sensibles (frais de port, etc.)
create policy "Public read settings" on public.app_settings for select using (true);

-- ─── 5. Colonnes supplémentaires sur profiles ─────────────────────────────────

alter table public.profiles
  add column if not exists payment_methods_override  text[],   -- ex. ['card','wire']
  add column if not exists delivery_methods_override text[],   -- ex. ['pickup','parcel']
  add column if not exists payment_deadline_days     int;      -- délai paiement en jours
