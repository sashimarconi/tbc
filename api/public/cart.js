const { parseJson } = require("../../lib/parse-json");
const { query } = require("../../lib/db");
const { ensureSalesTables } = require("../../lib/ensure-sales");

const STAGE_PRIORITY = {
  contact: 1,
  address: 2,
  payment: 3,
};

const STATUS_VALUES = new Set(["open", "converted", "expired"]);

function sanitizeText(value) {
  return typeof value === "string" ? value.trim().slice(0, 255) : "";
}

function ensureStage(stage) {
  const key = typeof stage === "string" ? stage.toLowerCase() : "";
  return STAGE_PRIORITY[key] ? key : "contact";
}

function ensureStatus(status) {
  const key = typeof status === "string" ? status.toLowerCase() : "open";
  return STATUS_VALUES.has(key) ? key : "open";
}

function asObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value;
}

function asNumber(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? Math.max(0, Math.round(num)) : 0;
}

async function resolveOwnerBySlug(slug) {
  const result = await query("select owner_user_id from products where slug = $1 and type = 'base' limit 1", [slug]);
  return result.rows?.[0]?.owner_user_id || null;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = {};
  try {
    body = await parseJson(req);
  } catch (error) {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const cartKey = sanitizeText(body.cart_id || body.cartKey);
  const slug = sanitizeText(body.slug);
  if (!cartKey) {
    res.status(400).json({ error: "Missing cart_id" });
    return;
  }
  if (!slug) {
    res.status(400).json({ error: "Missing slug" });
    return;
  }

  const ownerUserId = await resolveOwnerBySlug(slug);
  if (!ownerUserId) {
    res.status(404).json({ error: "Checkout nao encontrado" });
    return;
  }

  const stage = ensureStage(body.stage);
  const stageLevel = STAGE_PRIORITY[stage];
  const status = ensureStatus(body.status);

  const customer = asObject(body.customer) || {};
  const address = asObject(body.address) || null;
  const items = Array.isArray(body.items) ? body.items : [];
  const itemsJson = JSON.stringify(items);
  const shipping = asObject(body.shipping) || null;
  const summary = asObject(body.summary) || null;
  const utm = asObject(body.utm) || null;
  const tracking = asObject(body.tracking) || null;
  const source = sanitizeText(body.source || (tracking && tracking.src) || req.headers.referer || "");

  const totalCents = asNumber(body.total_cents || (summary && summary.total_cents));
  const subtotalCents = asNumber(body.subtotal_cents || (summary && summary.subtotal_cents));
  const shippingCents = asNumber(body.shipping_cents || (summary && summary.shipping_cents));

  try {
    await ensureSalesTables();

    await query(
      `insert into checkout_carts (
         owner_user_id, cart_key, customer, address, items, shipping, summary,
         stage, stage_level, status,
         total_cents, subtotal_cents, shipping_cents,
         utm, source, tracking,
         last_seen, last_stage_at
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now(),now())
       on conflict (owner_user_id, cart_key)
       do update set
         owner_user_id = excluded.owner_user_id,
         customer = coalesce(excluded.customer, checkout_carts.customer),
         address = coalesce(excluded.address, checkout_carts.address),
         items = case when coalesce(jsonb_array_length(excluded.items),0) > 0 then excluded.items else checkout_carts.items end,
         shipping = coalesce(excluded.shipping, checkout_carts.shipping),
         summary = coalesce(excluded.summary, checkout_carts.summary),
         stage = case when excluded.stage_level > checkout_carts.stage_level then excluded.stage else checkout_carts.stage end,
         stage_level = greatest(checkout_carts.stage_level, excluded.stage_level),
         status = case
            when checkout_carts.status = 'converted' then checkout_carts.status
            when excluded.status = 'converted' then 'converted'
            else excluded.status
          end,
         total_cents = greatest(excluded.total_cents, checkout_carts.total_cents),
         subtotal_cents = greatest(excluded.subtotal_cents, checkout_carts.subtotal_cents),
         shipping_cents = greatest(excluded.shipping_cents, checkout_carts.shipping_cents),
         utm = coalesce(checkout_carts.utm, excluded.utm),
         source = case when checkout_carts.source is null or checkout_carts.source = '' then excluded.source else checkout_carts.source end,
         tracking = coalesce(checkout_carts.tracking, excluded.tracking),
         updated_at = now(),
         last_seen = now(),
         last_stage_at = case when excluded.stage_level > checkout_carts.stage_level then now() else checkout_carts.last_stage_at end
       `,
      [
        ownerUserId,
        cartKey,
        customer,
        address,
        itemsJson,
        shipping,
        summary,
        stage,
        stageLevel,
        status,
        totalCents,
        subtotalCents,
        shippingCents,
        utm,
        source || null,
        tracking,
      ]
    );

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
