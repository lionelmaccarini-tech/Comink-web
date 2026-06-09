-- Add subcontracted flag to products
alter table public.products
  add column if not exists is_subcontracted boolean not null default false;

-- Add subcontracted flag to production_lines (propagated from product at creation)
alter table public.production_lines
  add column if not exists is_subcontracted boolean not null default false;

-- Index for efficient filtering
create index if not exists idx_production_lines_subcontracted on public.production_lines(is_subcontracted);
