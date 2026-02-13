const { query } = require("./db");

let ensured = false;

async function ensurePaymentGatewayTable() {
  if (ensured) return;

  await query(`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      name text not null default 'Usuario',
      email text unique not null,
      phone text,
      password_hash text not null,
      is_admin boolean not null default false,
      created_at timestamptz not null default now()
    )
  `);
  await query("alter table users add column if not exists name text");
  await query("alter table users add column if not exists phone text");
  await query("update users set name = 'Usuario' where name is null or btrim(name) = ''");
  await query("alter table users alter column name set not null");
  await query("alter table users add column if not exists is_admin boolean not null default false");

  await query(`
    create table if not exists user_payment_gateways (
      id serial primary key,
      owner_user_id uuid not null references users(id) on delete cascade,
      provider text not null default 'sealpay',
      api_url text not null,
      api_key_encrypted text not null,
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(owner_user_id, provider)
    )
  `);

  await query(
    "create index if not exists user_payment_gateways_owner_idx on user_payment_gateways (owner_user_id, provider, updated_at desc)"
  );
  await query(
    "create unique index if not exists user_payment_gateways_owner_provider_uidx on user_payment_gateways (owner_user_id, provider)"
  );

  ensured = true;
}

module.exports = { ensurePaymentGatewayTable };
