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
  await query("alter table products add column if not exists slug text unique");
  await query(
    "alter table products add column if not exists form_factor text not null default 'physical'"
  );
  await query(
    "alter table products add column if not exists requires_address boolean not null default true"
  );
  await query(
    "alter table products add column if not exists weight_grams integer default 0"
  );
  await query("alter table products add column if not exists length_cm integer default 0");
  await query("alter table products add column if not exists width_cm integer default 0");
  await query("alter table products add column if not exists height_cm integer default 0");
  await query(
    "create unique index if not exists products_slug_idx on products (slug) where slug is not null"
  );
  await query(`
    create table if not exists product_files (
      id uuid primary key default gen_random_uuid(),
      filename text,
      mime_type text not null,
      data bytea not null,
      created_at timestamptz not null default now()
    )
  `);
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
  throw new Error("Não foi possível gerar o link do checkout");
}

async function ensureBaseSlugs() {
  await ensureProductSchema();
  const pending = await query(
    "select id from products where type = 'base' and (slug is null or slug = '')"
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
