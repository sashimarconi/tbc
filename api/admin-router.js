const { query } = require("../lib/db");
const { parseJson } = require("../lib/parse-json");
const { signToken, requireAuth } = require("../lib/auth");
const { ensureSalesTables } = require("../lib/ensure-sales");
const {
  ensureProductSchema,
  ensureBaseSlugs,
  generateUniqueSlug,
} = require("../lib/ensure-products");
const { saveProductFile } = require("../lib/product-files");

function normalizeItemPayload(body = {}) {
  const formFactor = body.form_factor === "digital" ? "digital" : "physical";
  const requiresAddress =
    body.requires_address === undefined ? formFactor !== "digital" : Boolean(body.requires_address);
  return {
    type: body.type,
    name: body.name,
    description: body.description || "",
    price_cents: Number(body.price_cents || 0),
    compare_price_cents:
      body.compare_price_cents === undefined ||
      body.compare_price_cents === null ||
      body.compare_price_cents === ""
        ? null
        : Number(body.compare_price_cents),
    active: body.active !== false,
    sort: Number(body.sort || 0),
    image_url: body.image_url || "",
    form_factor: formFactor,
    requires_address: requiresAddress,
    weight_grams: Number(body.weight_grams || 0),
    length_cm: Number(body.length_cm || 0),
    width_cm: Number(body.width_cm || 0),
    height_cm: Number(body.height_cm || 0),
  };
}

async function handleLogin(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = await parseJson(req);
  const password = body.password || "";
  const expected = process.env.ADMIN_PASSWORD || "";

  if (!expected || password !== expected) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  const token = signToken({
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  });

  res.json({ token });
}

async function handleItems(req, res) {
  await ensureProductSchema();
  const { id } = req.query || {};

  if (req.method === "GET") {
    try {
      await ensureBaseSlugs();
      const result = await query(
        "select * from products order by type asc, sort asc, created_at asc"
      );
      res.json({ items: result.rows || [] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  if (req.method === "POST") {
    const item = normalizeItemPayload(await parseJson(req));
    if (!item.type || !item.name) {
      res.status(400).json({ error: "Missing type or name" });
      return;
    }

    try {
      const slug = item.type === "base" ? await generateUniqueSlug() : null;
      const result = await query(
        `insert into products (
           type,
           name,
           description,
           price_cents,
           compare_price_cents,
           active,
           sort,
           image_url,
           slug,
           form_factor,
           requires_address,
           weight_grams,
           length_cm,
           width_cm,
           height_cm
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning *`,
        [
          item.type,
          item.name,
          item.description,
          item.price_cents,
          item.compare_price_cents,
          item.active,
          item.sort,
          item.image_url,
          slug,
          item.form_factor,
          item.requires_address,
          item.weight_grams,
          item.length_cm,
          item.width_cm,
          item.height_cm,
        ]
      );
      res.json({ item: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  if (req.method === "PUT") {
    const updates = normalizeItemPayload(await parseJson(req));
    try {
      const result = await query(
        `update products set
           type = $1,
           name = $2,
           description = $3,
           price_cents = $4,
           compare_price_cents = $5,
           active = $6,
           sort = $7,
           image_url = $8,
           form_factor = $9,
           requires_address = $10,
           weight_grams = $11,
           length_cm = $12,
           width_cm = $13,
           height_cm = $14
         where id = $15 returning *`,
        [
          updates.type,
          updates.name,
          updates.description,
          updates.price_cents,
          updates.compare_price_cents,
          updates.active,
          updates.sort,
          updates.image_url,
          updates.form_factor,
          updates.requires_address,
          updates.weight_grams,
          updates.length_cm,
          updates.width_cm,
          updates.height_cm,
          id,
        ]
      );
      res.json({ item: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      await query("delete from products where id = $1", [id]);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}

async function handleOrders(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { id } = req.query || {};

  try {
    await ensureSalesTables();

    if (id) {
      const detail = await query(
        "select * from checkout_orders where id = $1 limit 1",
        [id]
      );
      if (!detail.rows?.length) {
        res.status(404).json({ error: "Order not found" });
        return;
      }
      res.json({ order: detail.rows[0] });
      return;
    }

    const [ordersResult, statsResult] = await Promise.all([
      query(
        `select id, cart_key, customer, summary, status, pix, created_at
         from checkout_orders
         order by created_at desc
         limit 150`
      ),
      query(
        `select
           count(*) as total,
           count(*) filter (where status = 'pending') as pending,
           count(*) filter (where status = 'paid') as paid,
           coalesce(sum(total_cents),0) as total_amount
         from checkout_orders`
      ),
    ]);

    res.json({
      orders: ordersResult.rows || [],
      stats: statsResult.rows?.[0] || { total: 0, pending: 0, paid: 0, total_amount: 0 },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handleCarts(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { id } = req.query || {};

  try {
    await ensureSalesTables();

    if (id) {
      const detail = await query(
        "select * from checkout_carts where id = $1 limit 1",
        [id]
      );
      if (!detail.rows?.length) {
        res.status(404).json({ error: "Cart not found" });
        return;
      }
      res.json({ cart: detail.rows[0] });
      return;
    }

    const [cartsResult, statsResult] = await Promise.all([
      query(
        `select id, cart_key, customer, summary, stage, status, total_cents, last_seen, created_at
         from checkout_carts
         order by last_seen desc
         limit 200`
      ),
      query(
        `select
           count(*) as total,
           count(*) filter (where status = 'open') as open,
           count(*) filter (where status = 'converted') as converted,
           coalesce(sum(total_cents),0) as total_value
         from checkout_carts`
      ),
    ]);

    res.json({
      carts: cartsResult.rows || [],
      stats: statsResult.rows?.[0] || { total: 0, open: 0, converted: 0, total_value: 0 },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function getPathSegments(req) {
  const raw = req.query?.path;
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === "string" && raw.length > 0) {
    return raw.split("/").filter(Boolean);
  }
  const url = req.url || "";
  const cleaned = url.split("?")[0].replace(/^\/api\/admin\/?/, "");
  if (!cleaned) {
    return [];
  }
  return cleaned.split("/").filter(Boolean);
}

module.exports = async (req, res) => {
  const segments = getPathSegments(req);
  const path = segments[0] || "";

  if (segments.length > 1 && !req.query.id) {
    req.query.id = segments[1];
  }

  if (path === "login") {
    await handleLogin(req, res);
    return;
  }

  if (!requireAuth(req, res)) {
    return;
  }

  switch (path) {
    case "items":
      await handleItems(req, res);
      return;
    case "orders":
      await handleOrders(req, res);
      return;
    case "carts":
      await handleCarts(req, res);
      return;
    case "uploads":
      await handleUploads(req, res);
      return;
    default:
      res.status(404).json({ error: "Not found" });
  }
};

async function handleUploads(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const body = await parseJson(req);
    if (!body?.data_url) {
      res.status(400).json({ error: "Missing data_url" });
      return;
    }
    const file = await saveProductFile({ dataUrl: body.data_url, filename: body.filename || null });
    res.json({ file });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
