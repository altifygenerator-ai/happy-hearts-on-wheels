create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  phone text not null,
  email text,
  fulfillment text not null check (fulfillment in ('pickup', 'delivery')),
  address text,
  requested_time text,
  notes text,
  items jsonb not null,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  status text not null default 'new' check (
    status in ('new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled')
  ),
  payment_method text not null default 'pay_later' check (
    payment_method in ('pay_later', 'square')
  ),
  payment_status text not null default 'not_required' check (
    payment_status in ('not_required', 'pending', 'paid', 'failed', 'cancelled')
  ),
  square_payment_link_id text,
  square_order_id text,
  square_payment_id text,
  created_at timestamptz not null default now()
);

-- Safe upgrades for a database created with an earlier version of the site.
alter table public.orders add column if not exists payment_method text not null default 'pay_later';
alter table public.orders add column if not exists payment_status text not null default 'not_required';
alter table public.orders add column if not exists square_payment_link_id text;
alter table public.orders add column if not exists square_order_id text;
alter table public.orders add column if not exists square_payment_id text;

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_square_order_id_idx on public.orders (square_order_id);

alter table public.orders enable row level security;

-- No public policies are intentionally created. The website API uses the
-- server-only service-role key, and the private admin dashboard reads through
-- protected server routes.
