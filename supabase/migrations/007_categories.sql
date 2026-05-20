-- Categories table
create table if not exists public.categories (
  id text primary key,               -- slug: 'banderoles', 'roll_up', etc.
  label text not null,               -- display name: 'Banderoles', 'Roll-up', etc.
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- Seed with existing categories
insert into public.categories (id, label, display_order) values
  ('banderoles',             'Banderoles',                1),
  ('roll_up',                'Roll-up',                   2),
  ('drapeaux',               'Drapeaux',                  3),
  ('adhesifs',               'Adhésifs',                  4),
  ('toiles',                 'Toiles',                    5),
  ('baches',                 'Bâches',                    6),
  ('panneaux',               'Panneaux',                  7),
  ('textile',                'Textile',                   8),
  ('papier',                 'Papier',                    9),
  ('accessoires',            'Accessoires',               10),
  ('supports_evenementiels', 'Supports évènementiels',    11),
  ('vinyle_autocollant',     'Vinyle autocollant',        12),
  ('autre',                  'Autre',                     13)
on conflict (id) do nothing;

-- RLS: service role only (admin API uses service key)
alter table public.categories enable row level security;

create policy "Service role full access on categories" on public.categories
  for all using (true) with check (true);
