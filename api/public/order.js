const { parseJson } = require("../../lib/parse-json");
const { query } = require("../../lib/db");
const { ensureSalesTables } = require("../../lib/ensure-sales");

function asObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value;
}

function sanitizeText(value) {
  return typeof value === "string" ? value.trim().slice(0, 255) : "";
}

function asNumber(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? Math.max(0, Math.round(num)) : 0;
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
  if (!cartKey) {
    res.status(400).json({ error: "Missing cart_id" });
    return;
  }

  const customer = asObject(body.customer);
  if (!customer) {
    res.status(400).json({ error: "Missing customer" });
    return;
  }

  const address = asObject(body.address);
  const items = Array.isArray(body.items) ? body.items : [];
  const itemsJson = JSON.stringify(items);
  const shipping = asObject(body.shipping);
  const summary = asObject(body.summary);
  const utm = asObject(body.utm);
  const tracking = asObject(body.tracking);
  const pix = asObject(body.pix) || {};
  const status = sanitizeText(body.status) || "pending";
  const source = sanitizeText(body.source || (tracking && tracking.src) || req.headers.referer || "");

  const totalCents = asNumber(body.total_cents || (summary && summary.total_cents));
  const subtotalCents = asNumber(body.subtotal_cents || (summary && summary.subtotal_cents));
  const shippingCents = asNumber(body.shipping_cents || (summary && summary.shipping_cents));

  try {
    await ensureSalesTables();

    const result = await query(
      `insert into checkout_orders (
         cart_key, customer, address, items, shipping, summary,
         status, pix, total_cents, subtotal_cents, shipping_cents,
         utm, source, tracking
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       on conflict (cart_key)
       do update set
         customer = excluded.customer,
         address = excluded.address,
         items = excluded.items,
         shipping = excluded.shipping,
         summary = excluded.summary,
         status = excluded.status,
         pix = excluded.pix,
         total_cents = excluded.total_cents,
         subtotal_cents = excluded.subtotal_cents,
         shipping_cents = excluded.shipping_cents,
         utm = coalesce(checkout_orders.utm, excluded.utm),
         source = case when checkout_orders.source is null or checkout_orders.source = '' then excluded.source else checkout_orders.source end,
         tracking = coalesce(checkout_orders.tracking, excluded.tracking),
         created_at = checkout_orders.created_at
       returning id
      `,
      [
        cartKey,
        customer,
        address,
        itemsJson,
        shipping,
        summary,
        status,
        pix,
        totalCents,
        subtotalCents,
        shippingCents,
        utm,
        source || null,
        tracking,
      ]
    );

    await query(
      `update checkout_carts
         set status = 'converted',
             stage = 'payment',
             stage_level = 3,
             summary = coalesce($2, summary),
             items = case when coalesce(jsonb_array_length($3),0) > 0 then $3 else items end,
             shipping = coalesce($4, shipping),
             total_cents = greatest(total_cents, $5),
             subtotal_cents = greatest(subtotal_cents, $6),
             shipping_cents = greatest(shipping_cents, $7),
             updated_at = now(),
             last_stage_at = now()
       where cart_key = $1`,
      [cartKey, summary, itemsJson, shipping, totalCents, subtotalCents, shippingCents]
    );

    res.json({ orderId: result.rows[0]?.id || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
