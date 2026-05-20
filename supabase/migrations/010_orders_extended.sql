-- Migration 010 : colonnes étendues pour la table orders
-- Paiement, livraison, suivi transporteur, métadonnées

-- 1. Remplacer la contrainte status pour inclure 'pending_wire'
alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check check (
    status in (
      'pending', 'pending_wire', 'confirmed', 'in_production',
      'ready', 'shipped', 'delivered', 'cancelled'
    )
  );

-- 2. Colonnes paiement
alter table public.orders
  add column if not exists payment_method text
    check (payment_method in ('card','alma','wire'));

-- 3. Colonnes livraison
alter table public.orders
  add column if not exists delivery_method text
    check (delivery_method in ('pickup','parcel','express'));

alter table public.orders
  add column if not exists delivery_cost numeric(10,2) default 0;

alter table public.orders
  add column if not exists delivery_status text default 'pending'
    check (delivery_status in ('pending','ready','picked_up','handed_to_carrier','in_transit','delivered'));

-- 4. Enlèvement atelier
alter table public.orders
  add column if not exists pickup_signed_by text;

alter table public.orders
  add column if not exists pickup_signature text;  -- data-URL base64

alter table public.orders
  add column if not exists pickup_signed_at timestamptz;

-- 5. Transporteur / colis
alter table public.orders
  add column if not exists carrier_name text;

alter table public.orders
  add column if not exists carrier_handoff_at timestamptz;

alter table public.orders
  add column if not exists carrier_handoff_note text;

-- (tracking_number existe déjà dans le schéma initial)

-- 6. Métadonnées libres (adresses, TVA, référence…)
alter table public.orders
  add column if not exists metadata jsonb;

-- 7. Index utiles
create index if not exists idx_orders_delivery_method on public.orders(delivery_method);
create index if not exists idx_orders_delivery_status on public.orders(delivery_status);
create index if not exists idx_orders_payment_method  on public.orders(payment_method);
