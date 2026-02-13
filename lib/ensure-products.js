const crypto = require("crypto");
const { query } = require("./db");

let schemaEnsured = false;

function randomSegment() {
  if (typeof crypto.randomInt === "function") {
    return String(crypto.randomInt(100000, 1000000));
  }
  return String(100000 + Math.floor(Math.random() * 900000));
}

function buildSlugCandidate() {
  return [randomSegment(), randomSegment(), randomSegment()].join("-");
}

async function ensureProductSchema() {
  if (schemaEnsured) {
    return;
  }

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
    create table if not exists products (
      id uuid primary key default gen_random_uuid(),
      owner_user_id uuid,
      type text not null check (type in ('base', 'bump', 'upsell', 'shipping')),
      slug text unique,
      form_factor text not null default 'physical' check (form_factor in ('physical', 'digital')),
      requires_address boolean not null default true,
      name text not null,
      description text,
      price_cents integer not null check (price_cents >= 0),
      compare_price_cents integer check (compare_price_cents >= 0),
      active boolean not null default true,
      image_url text,
      weight_grams integer default 0,
      length_cm integer default 0,
      width_cm integer default 0,
      height_cm integer default 0,
      created_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists product_files (
      id uuid primary key default gen_random_uuid(),
      owner_user_id uuid,
      filename text,
      mime_type text not null,
      data bytea not null,
      created_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists order_bump_rules (
      bump_id uuid primary key,
      owner_user_id uuid,
      apply_to_all boolean not null default true,
      trigger_product_ids uuid[] not null default '{}'::uuid[],
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query("alter table products add column if not exists owner_user_id uuid");
  await query("alter table products add column if not exists slug text");
  await query(
    "alter table products add column if not exists form_factor text not null default 'physical'"
  );
  await query(
    "alter table products add column if not exists requires_address boolean not null default true"
  );
  await query("alter table products add column if not exists weight_grams integer default 0");
  await query("alter table products add column if not exists length_cm integer default 0");
  await query("alter table products add column if not exists width_cm integer default 0");
  await query("alter table products add column if not exists height_cm integer default 0");

  await query(`
    do $$
    begin
      if not exists (
        select 1 from pg_constraint where conname = 'products_owner_user_id_fkey'
      ) then
        alter table products
          add constraint products_owner_user_id_fkey
          foreign key (owner_user_id) references users(id) on delete cascade;
      end if;
    end $$;
  `);

  await query(
    "create unique index if not exists products_slug_idx on products (slug) where slug is not null"
  );
  await query("drop index if exists products_owner_type_active_sort_idx");
  await query(
    "create index if not exists products_owner_type_active_created_idx on products (owner_user_id, type, active, created_at desc)"
  );

  await query("alter table product_files add column if not exists owner_user_id uuid");
  await query(`
    do $$
    begin
      if not exists (
        select 1 from pg_constraint where conname = 'product_files_owner_user_id_fkey'
      ) then
        alter table product_files
          add constraint product_files_owner_user_id_fkey
          foreign key (owner_user_id) references users(id) on delete cascade;
      end if;
    end $$;
  `);
  await query(
    "create index if not exists product_files_owner_created_idx on product_files (owner_user_id, created_at desc)"
  );

  await query("alter table order_bump_rules add column if not exists owner_user_id uuid");
  await query(`
    do $$
    begin
      if not exists (
        select 1 from pg_constraint where conname = 'order_bump_rules_owner_user_id_fkey'
      ) then
        alter table order_bump_rules
          add constraint order_bump_rules_owner_user_id_fkey
          foreign key (owner_user_id) references users(id) on delete cascade;
      end if;
    end $$;
  `);
  await query(
    "create index if not exists order_bump_rules_owner_idx on order_bump_rules (owner_user_id, updated_at desc)"
  );

  schemaEnsured = true;
}

async function generateUniqueSlug(attempts = 8) {
  await ensureProductSchema();
  for (let i = 0; i < attempts; i += 1) {
    const slug = buildSlugCandidate();
    const exists = await query("select 1 from products where slug = $1 limit 1", [slug]);
    if (!exists.rows?.length) {
      return slug;
    }
  }
  throw new Error("Nao foi possivel gerar o link do checkout");
}

async function ensureBaseSlugs(ownerUserId = null) {
  await ensureProductSchema();
  const params = [];
  let whereOwner = "";
  if (ownerUserId) {
    params.push(ownerUserId);
    whereOwner = " and owner_user_id = $1";
  }
  const pending = await query(
    `select id from products where type = 'base' and (slug is null or slug = '')${whereOwner}`,
    params
  );
  if (!pending.rows?.length) {
    return;
  }
  for (const row of pending.rows) {
    const slug = await generateUniqueSlug();
    await query("update products set slug = $1 where id = $2", [slug, row.id]);
  }
}

module.exports = {
  ensureProductSchema,
  ensureBaseSlugs,
  generateUniqueSlug,
};
