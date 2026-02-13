const { query } = require("./db");

let ensured = false;

async function ensureSalesTables() {
  if (ensured) return;

  await query(`
    create table if not exists checkout_carts (
      id uuid primary key default gen_random_uuid(),
      owner_user_id uuid,
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

  await query("alter table checkout_carts add column if not exists owner_user_id uuid");
  await query("alter table checkout_carts add column if not exists address jsonb");
  await query("alter table checkout_carts add column if not exists items jsonb");
  await query("alter table checkout_carts add column if not exists shipping jsonb");
  await query("alter table checkout_carts add column if not exists summary jsonb");
  await query("alter table checkout_carts add column if not exists stage text not null default 'contact'");
  await query("alter table checkout_carts add column if not exists stage_level integer not null default 1");
  await query("alter table checkout_carts add column if not exists status text not null default 'open'");
  await query("alter table checkout_carts add column if not exists total_cents integer default 0");
  await query("alter table checkout_carts add column if not exists subtotal_cents integer default 0");
  await query("alter table checkout_carts add column if not exists shipping_cents integer default 0");
  await query("alter table checkout_carts add column if not exists utm jsonb");
  await query("alter table checkout_carts add column if not exists source text");
  await query("alter table checkout_carts add column if not exists tracking jsonb");
  await query("alter table checkout_carts add column if not exists updated_at timestamptz not null default now()");
  await query("alter table checkout_carts add column if not exists last_seen timestamptz not null default now()");
  await query("alter table checkout_carts add column if not exists last_stage_at timestamptz not null default now()");
  await query(`
    do $$
    begin
      if not exists (
        select 1 from pg_constraint where conname = 'checkout_carts_owner_user_id_fkey'
      ) then
        alter table checkout_carts
          add constraint checkout_carts_owner_user_id_fkey
          foreign key (owner_user_id) references users(id) on delete cascade;
      end if;
    end $$;
  `);
  await query(
    "create index if not exists checkout_carts_stage_idx on checkout_carts (owner_user_id, stage, status, last_seen desc)"
  );
  await query(
    "create unique index if not exists checkout_carts_owner_cart_key_idx on checkout_carts (owner_user_id, cart_key)"
  );

  await query(`
    create table if not exists checkout_orders (
      id uuid primary key default gen_random_uuid(),
      owner_user_id uuid,
      cart_key text unique,
      customer jsonb not null,
      address jsonb,
      items jsonb,
      shipping jsonb,
      summary jsonb,
      status text not null default 'waiting_payment' check (status in ('waiting_payment','pending','paid','refused','refunded','cancelled')),
      pix jsonb,
      total_cents integer default 0,
      subtotal_cents integer default 0,
      shipping_cents integer default 0,
      tracking_parameters jsonb,
      utm jsonb,
      source text,
      tracking jsonb,
      paid_at timestamptz,
      created_at timestamptz not null default now()
    )
  `);

  await query("alter table checkout_orders add column if not exists owner_user_id uuid");
  await query("alter table checkout_orders add column if not exists cart_key text");
  await query("alter table checkout_orders add column if not exists address jsonb");
  await query("alter table checkout_orders add column if not exists items jsonb");
  await query("alter table checkout_orders add column if not exists shipping jsonb");
  await query("alter table checkout_orders add column if not exists summary jsonb");
  await query("alter table checkout_orders add column if not exists pix jsonb");
  await query("alter table checkout_orders add column if not exists total_cents integer default 0");
  await query("alter table checkout_orders add column if not exists subtotal_cents integer default 0");
  await query("alter table checkout_orders add column if not exists shipping_cents integer default 0");
  await query("alter table checkout_orders add column if not exists tracking_parameters jsonb");
  await query("alter table checkout_orders add column if not exists utm jsonb");
  await query("alter table checkout_orders add column if not exists source text");
  await query("alter table checkout_orders add column if not exists tracking jsonb");
  await query("alter table checkout_orders add column if not exists paid_at timestamptz");
  await query("alter table checkout_orders alter column status set default 'waiting_payment'");
  await query(`
    do $$
    begin
      if exists (
        select 1
        from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        where t.relname = 'checkout_orders'
          and c.contype = 'c'
          and c.conname = 'checkout_orders_status_check'
      ) then
        alter table checkout_orders drop constraint checkout_orders_status_check;
      end if;
    end $$;
  `);
  await query(`
    do $$
    begin
      if not exists (
        select 1
        from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        where t.relname = 'checkout_orders'
          and c.contype = 'c'
          and c.conname = 'checkout_orders_status_check'
      ) then
        alter table checkout_orders
          add constraint checkout_orders_status_check
          check (status in ('waiting_payment','pending','paid','refused','refunded','cancelled'));
      end if;
    end $$;
  `);
  await query(`
    do $$
    begin
      if not exists (
        select 1 from pg_constraint where conname = 'checkout_orders_owner_user_id_fkey'
      ) then
        alter table checkout_orders
          add constraint checkout_orders_owner_user_id_fkey
          foreign key (owner_user_id) references users(id) on delete cascade;
      end if;
    end $$;
  `);

  await query(
    "create index if not exists checkout_orders_created_idx on checkout_orders (owner_user_id, created_at desc)"
  );
  await query(
    "create unique index if not exists checkout_orders_owner_cart_key_idx on checkout_orders (owner_user_id, cart_key)"
  );

  ensured = true;
}

module.exports = { ensureSalesTables };
