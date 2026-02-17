const { query } = require("./db");

let ensured = false;

function normalizeCustomDomain(value = "") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/:\d+$/, "")
    .replace(/\/.*$/, "")
    .replace(/\.+$/, "");
  return normalized;
}

function isValidCustomDomain(value = "") {
  const domain = normalizeCustomDomain(value);
  if (!domain || domain.length < 4 || domain.length > 253) {
    return false;
  }
  if (domain.includes("..")) {
    return false;
  }
  // Require at least one dot and valid DNS labels.
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return false;
  }
  return domain
    .split(".")
    .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
}

async function ensureCustomDomainsTable() {
  if (ensured) return;

  await query(`
    create table if not exists custom_domains (
      id uuid primary key default gen_random_uuid(),
      owner_user_id uuid not null references users(id) on delete cascade,
      domain text not null unique,
      is_verified boolean not null default false,
      verification_data jsonb,
      last_verified_at timestamptz,
      last_error text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query("alter table custom_domains add column if not exists owner_user_id uuid");
  await query("alter table custom_domains add column if not exists domain text");
  await query("alter table custom_domains add column if not exists is_verified boolean not null default false");
  await query("alter table custom_domains add column if not exists verification_data jsonb");
  await query("alter table custom_domains add column if not exists last_verified_at timestamptz");
  await query("alter table custom_domains add column if not exists last_error text");
  await query("alter table custom_domains add column if not exists created_at timestamptz not null default now()");
  await query("alter table custom_domains add column if not exists updated_at timestamptz not null default now()");

  await query(`
    do $$
    begin
      if not exists (
        select 1 from pg_constraint where conname = 'custom_domains_owner_user_id_fkey'
      ) then
        alter table custom_domains
          add constraint custom_domains_owner_user_id_fkey
          foreign key (owner_user_id) references users(id) on delete cascade;
      end if;
    end $$;
  `);

  await query("create unique index if not exists custom_domains_domain_uidx on custom_domains (domain)");
  await query("create index if not exists custom_domains_owner_idx on custom_domains (owner_user_id, updated_at desc)");

  ensured = true;
}

module.exports = {
  ensureCustomDomainsTable,
  normalizeCustomDomain,
  isValidCustomDomain,
};
