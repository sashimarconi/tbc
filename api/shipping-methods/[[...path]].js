const { query } = require("../../lib/db");
const { parseJson } = require("../../lib/parse-json");
const { requireAuth } = require("../../lib/auth");
const { ensureShippingMethodsTable } = require("../../lib/ensure-shipping-methods");

function getPathSegments(req) {
  const raw = req.query?.path;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.length) return raw.split("/").filter(Boolean);
  return [];
}

function normalizeCurrencyToCents(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.round(num));
}

function normalizeInt(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.round(num));
}

function sanitizeRow(row) {
  return {
    id: row.id,
    tenantId: row.owner_user_id,
    storeId: row.owner_user_id,
    name: row.name || "",
    priceCents: Number(row.price_cents) || 0,
    minOrderCents: Number(row.min_order_cents) || 0,
    minDays: Number(row.min_days) || 0,
    maxDays: Number(row.max_days) || 0,
    description: row.description || "",
    isDefault: row.is_default === true,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parsePayload(body = {}) {
  const name = String(body.name || "").trim();
  const minDays = normalizeInt(body.minDays, 0);
  const maxDays = normalizeInt(body.maxDays, 0);
  return {
    name,
    priceCents: normalizeCurrencyToCents(body.priceCents, 0),
    minOrderCents: normalizeCurrencyToCents(body.minOrderCents, 0),
    minDays,
    maxDays: Math.max(maxDays, minDays),
    description: String(body.description || "").trim(),
    isDefault: body.isDefault === true,
    isActive: body.isActive !== false,
  };
}

async function handleGet(req, res, user) {
  const rows = await query(
    `select id, owner_user_id, name, price_cents, min_order_cents, min_days, max_days,
            description, is_default, is_active, created_at, updated_at
       from shipping_methods
      where owner_user_id = $1
      order by is_default desc, updated_at desc, created_at desc`,
    [user.id]
  );
  res.json({ shippingMethods: (rows.rows || []).map(sanitizeRow) });
}

async function handleCreate(req, res, user) {
  const payload = parsePayload(await parseJson(req));
  if (!payload.name) {
    res.status(400).json({ error: "Nome do método é obrigatório." });
    return;
  }

  if (payload.isDefault) {
    await query("update shipping_methods set is_default = false, updated_at = now() where owner_user_id = $1", [
      user.id,
    ]);
  }

  const created = await query(
    `insert into shipping_methods (
       owner_user_id, name, price_cents, min_order_cents, min_days, max_days, description, is_default, is_active, updated_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
     returning id, owner_user_id, name, price_cents, min_order_cents, min_days, max_days,
               description, is_default, is_active, created_at, updated_at`,
    [
      user.id,
      payload.name,
      payload.priceCents,
      payload.minOrderCents,
      payload.minDays,
      payload.maxDays,
      payload.description || null,
      payload.isDefault,
      payload.isActive,
    ]
  );
  res.status(201).json({ shippingMethod: sanitizeRow(created.rows[0]) });
}

async function handleUpdate(req, res, user, id) {
  if (!id) {
    res.status(400).json({ error: "ID do frete é obrigatório." });
    return;
  }

  const payload = parsePayload(await parseJson(req));
  if (!payload.name) {
    res.status(400).json({ error: "Nome do método é obrigatório." });
    return;
  }

  if (payload.isDefault) {
    await query(
      "update shipping_methods set is_default = false, updated_at = now() where owner_user_id = $1 and id <> $2",
      [user.id, id]
    );
  }

  const updated = await query(
    `update shipping_methods
        set name = $3,
            price_cents = $4,
            min_order_cents = $5,
            min_days = $6,
            max_days = $7,
            description = $8,
            is_default = $9,
            is_active = $10,
            updated_at = now()
      where id = $1 and owner_user_id = $2
      returning id, owner_user_id, name, price_cents, min_order_cents, min_days, max_days,
                description, is_default, is_active, created_at, updated_at`,
    [
      id,
      user.id,
      payload.name,
      payload.priceCents,
      payload.minOrderCents,
      payload.minDays,
      payload.maxDays,
      payload.description || null,
      payload.isDefault,
      payload.isActive,
    ]
  );

  if (!updated.rows?.length) {
    res.status(404).json({ error: "Método de frete não encontrado." });
    return;
  }

  res.json({ shippingMethod: sanitizeRow(updated.rows[0]) });
}

async function handleDelete(req, res, user, id) {
  if (!id) {
    res.status(400).json({ error: "ID do frete é obrigatório." });
    return;
  }
  await query("delete from shipping_methods where id = $1 and owner_user_id = $2", [id, user.id]);
  res.json({ ok: true });
}

module.exports = async (req, res) => {
  try {
    const user = requireAuth(req, res);
    if (!user) return;

    await ensureShippingMethodsTable();

    const segments = getPathSegments(req);
    const id = segments[0] || req.query?.id || null;

    if (req.method === "GET") {
      await handleGet(req, res, user);
      return;
    }
    if (req.method === "POST" && !id) {
      await handleCreate(req, res, user);
      return;
    }
    if (req.method === "PUT") {
      await handleUpdate(req, res, user, id);
      return;
    }
    if (req.method === "DELETE") {
      await handleDelete(req, res, user, id);
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  }
};
