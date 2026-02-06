const { query } = require("./db");

let ensured = false;

async function ensureSalesTables() {
  if (ensured) return;

  await query(`
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
      status text not null default 'open' check (status in ('open','converted','expired')),
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
    )
  `);

  await query(
    "create index if not exists checkout_carts_stage_idx on checkout_carts (stage, status, last_seen desc)"
  );

  await query(`
    create table if not exists checkout_orders (
      id uuid primary key default gen_random_uuid(),
      cart_key text unique,
      customer jsonb not null,
      address jsonb,
      items jsonb,
      shipping jsonb,
      summary jsonb,
      status text not null default 'pending' check (status in ('pending','paid','cancelled')),
      pix jsonb,
      total_cents integer default 0,
      subtotal_cents integer default 0,
      shipping_cents integer default 0,
      utm jsonb,
      source text,
      tracking jsonb,
      created_at timestamptz not null default now()
    )
  `);

  await query(
    "create index if not exists checkout_orders_created_idx on checkout_orders (created_at desc)"
  );

  ensured = true;
}

module.exports = { ensureSalesTables };
