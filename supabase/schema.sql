create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('base', 'bump', 'upsell', 'shipping')),
  slug text unique,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  compare_price_cents integer check (compare_price_cents >= 0),
  active boolean not null default true,
  sort integer not null default 0,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists products_type_active_sort_idx
  on products (type, active, sort, created_at);

create unique index if not exists products_slug_idx
  on products (slug)
  where slug is not null;

create table if not exists analytics_sessions (
  session_id text primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  last_page text,
  last_event text,
  source text,
  user_agent text,
  utm jsonb
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  event_type text not null,
  page text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx
  on analytics_events (created_at);

create index if not exists analytics_events_type_idx
  on analytics_events (event_type, page, created_at);

create table if not exists checkout_carts (
  id uuid primary key default gen_random_uuid(),
  cart_key text unique not null,
  customer jsonb,
  address jsonb,
  items jsonb,
  shipping jsonb,
  summary jsonb,
  stage text not null default 'contact',
  stage_level integer not null default 1,
  status text not null default 'open' check (status in ('open', 'converted', 'expired')),
  total_cents integer default 0,
  subtotal_cents integer default 0,
  shipping_cents integer default 0,
  utm jsonb,
  source text,
  tracking jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  last_stage_at timestamptz not null default now()
);

create index if not exists checkout_carts_stage_idx
  on checkout_carts (stage, status, last_seen desc);

create table if not exists checkout_orders (
  id uuid primary key default gen_random_uuid(),
  cart_key text unique,
  customer jsonb not null,
  address jsonb,
  items jsonb,
  shipping jsonb,
  summary jsonb,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  pix jsonb,
  total_cents integer default 0,
  subtotal_cents integer default 0,
  shipping_cents integer default 0,
  utm jsonb,
  source text,
  tracking jsonb,
  created_at timestamptz not null default now()
);

create index if not exists checkout_orders_created_idx
  on checkout_orders (created_at desc);
