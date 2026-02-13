const { query } = require("./db");
const { ensureSalesTables } = require("./ensure-sales");

let ensured = false;

async function ensureIntegrationsSchema() {
  if (ensured) return;
  await ensureSalesTables();

  await query(`
    create table if not exists user_integrations (
      id serial primary key,
      owner_user_id uuid not null references users(id) on delete cascade,
      provider text not null check (provider in ('meta', 'tiktok', 'utmify')),
      name text,
      is_active boolean not null default true,
      config jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query(`
    create index if not exists user_integrations_owner_provider_idx
      on user_integrations (owner_user_id, provider, updated_at desc)
  `);

  await query(`
    create table if not exists utmify_events_log (
      id serial primary key,
      owner_user_id uuid not null references users(id) on delete cascade,
      order_id uuid not null references checkout_orders(id) on delete cascade,
      status text not null,
      request_payload jsonb,
      response_payload jsonb,
      http_status integer,
      created_at timestamptz not null default now(),
      unique(order_id, status)
    )
  `);

  await query(`
    create index if not exists utmify_events_log_owner_created_idx
      on utmify_events_log (owner_user_id, created_at desc)
  `);

  ensured = true;
}

module.exports = {
  ensureIntegrationsSchema,
};
