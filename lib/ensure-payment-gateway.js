const { query } = require("./db");

let ensured = false;

async function ensurePaymentGatewayTable() {
  if (ensured) return;

  await query(`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      email text unique not null,
      password_hash text not null,
      created_at timestamptz not null default now()
    )
  `);

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

  ensured = true;
}

module.exports = { ensurePaymentGatewayTable };
