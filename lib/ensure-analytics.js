const { query } = require("./db");

let ensured = false;

async function ensureAnalyticsTables() {
  if (ensured) {
    return;
  }

  await query(`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      email text unique not null,
      password_hash text not null,
      is_admin boolean not null default false,
      created_at timestamptz not null default now()
    )
  `);
  await query("alter table users add column if not exists is_admin boolean not null default false");

  await query(`
    create table if not exists analytics_sessions (
      session_id text primary key,
      owner_user_id uuid references users(id) on delete cascade,
      first_seen timestamptz not null default now(),
      last_seen timestamptz not null default now(),
      last_page text,
      last_event text,
      source text,
      user_agent text,
      utm jsonb,
      city text,
      lat double precision,
      lng double precision
    )
  `);
  // Migração: adicionar colunas se não existirem
  await query("alter table analytics_sessions add column if not exists city text");
  await query("alter table analytics_sessions add column if not exists lat double precision");
  await query("alter table analytics_sessions add column if not exists lng double precision");
  await query("alter table analytics_sessions add column if not exists owner_user_id uuid references users(id) on delete cascade");

  await query(`
    create table if not exists analytics_events (
      id uuid primary key default gen_random_uuid(),
      owner_user_id uuid references users(id) on delete cascade,
      session_id text not null,
      event_type text not null,
      page text,
      payload jsonb,
      created_at timestamptz not null default now()
    )
  `);
  await query("alter table analytics_events add column if not exists owner_user_id uuid references users(id) on delete cascade");

  await query(
    "create index if not exists analytics_events_created_at_idx on analytics_events (created_at)"
  );
  await query(
    "create index if not exists analytics_events_owner_created_idx on analytics_events (owner_user_id, created_at)"
  );
  await query(
    "create index if not exists analytics_sessions_owner_last_seen_idx on analytics_sessions (owner_user_id, last_seen desc)"
  );

  await query(
    "create index if not exists analytics_events_type_idx on analytics_events (event_type, page, created_at)"
  );

  ensured = true;
}

module.exports = { ensureAnalyticsTables };
