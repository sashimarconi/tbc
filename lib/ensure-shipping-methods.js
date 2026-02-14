const { query } = require("./db");

let ensured = false;

async function ensureShippingMethodsTable() {
  if (ensured) return;

  await query(`
    create table if not exists shipping_methods (
      id uuid primary key default gen_random_uuid(),
      owner_user_id uuid not null references users(id) on delete cascade,
      name text not null,
      price_cents integer not null default 0 check (price_cents >= 0),
      min_order_cents integer not null default 0 check (min_order_cents >= 0),
      min_days integer not null default 1 check (min_days >= 0),
      max_days integer not null default 1 check (max_days >= 0),
      description text,
      is_default boolean not null default false,
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query("alter table shipping_methods add column if not exists owner_user_id uuid");
  await query("alter table shipping_methods add column if not exists name text");
  await query("alter table shipping_methods add column if not exists price_cents integer default 0");
  await query("alter table shipping_methods add column if not exists min_order_cents integer default 0");
  await query("alter table shipping_methods add column if not exists min_days integer default 1");
  await query("alter table shipping_methods add column if not exists max_days integer default 1");
  await query("alter table shipping_methods add column if not exists description text");
  await query("alter table shipping_methods add column if not exists is_default boolean not null default false");
  await query("alter table shipping_methods add column if not exists is_active boolean not null default true");
  await query("alter table shipping_methods add column if not exists created_at timestamptz not null default now()");
  await query("alter table shipping_methods add column if not exists updated_at timestamptz not null default now()");

  await query("update shipping_methods set name = 'Frete padrão' where coalesce(name, '') = ''");
  await query(`
    do $$
    begin
      if not exists (
        select 1 from pg_constraint where conname = 'shipping_methods_owner_user_id_fkey'
      ) then
        alter table shipping_methods
          add constraint shipping_methods_owner_user_id_fkey
          foreign key (owner_user_id) references users(id) on delete cascade;
      end if;
    end $$;
  `);

  await query("create index if not exists shipping_methods_owner_updated_idx on shipping_methods (owner_user_id, updated_at desc)");
  await query("create index if not exists shipping_methods_owner_default_idx on shipping_methods (owner_user_id, is_default)");

  ensured = true;
}

module.exports = { ensureShippingMethodsTable };
