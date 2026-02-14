const { parseJson } = require("../../lib/parse-json");
const { query } = require("../../lib/db");
const { ensureSalesTables } = require("../../lib/ensure-sales");
const { dispatchUtmifyEvent, normalizeTrackingParameters } = require("../../lib/utmify");
const { ensureAnalyticsTables } = require("../../lib/ensure-analytics");

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

function toJsonb(value) {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

function normalizeOrderStatus(value) {
  const raw = sanitizeText(value).toLowerCase();
  if (!raw || raw === "pending") return "waiting_payment";
  const allowed = new Set([
    "waiting_payment",
    "paid",
    "refused",
    "refunded",
    "cancelled",
    "pending",
  ]);
  return allowed.has(raw) ? raw : "waiting_payment";
}

async function registerOrderAnalytics({ ownerUserId, cartKey, status, totalCents }) {
  try {
    await ensureAnalyticsTables();
    await query(
      `insert into analytics_events (owner_user_id, session_id, event_type, page, payload)
       values ($1, $2, 'pix_generated', 'checkout', $3::jsonb)`,
      [ownerUserId, cartKey, JSON.stringify({ total_cents: totalCents || 0, status })]
    );

    if (status === "paid") {
      await query(
        `insert into analytics_events (owner_user_id, session_id, event_type, page, payload)
         values ($1, $2, 'purchase', 'checkout', $3::jsonb)`,
        [ownerUserId, cartKey, JSON.stringify({ total_cents: totalCents || 0, status })]
      );
    }
  } catch (error) {
    console.warn("[public/order] analytics sync failed", {
      ownerUserId,
      cartKey,
      status,
      error: error?.message,
    });
  }
}

async function resolveOwnerBySlug(slug) {
  const result = await query(
    "select owner_user_id from products where slug = $1 and owner_user_id is not null order by case when type = 'base' then 0 else 1 end, created_at desc limit 1",
    [slug]
  );
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

  const customer = asObject(body.customer);
  if (!customer) {
    res.status(400).json({ error: "Missing customer" });
    return;
  }

  const address = asObject(body.address);
  const items = Array.isArray(body.items) ? body.items : [];
  const shipping = asObject(body.shipping);
  const summary = asObject(body.summary);
  const utm = asObject(body.utm);
  const tracking = asObject(body.tracking);
  const pix = asObject(body.pix) || {};
  const status = normalizeOrderStatus(body.status);
  const source = sanitizeText(body.source || (tracking && tracking.src) || req.headers.referer || "");
  const trackingParameters = normalizeTrackingParameters({
    utm,
    tracking,
    source,
  });

  const totalCents = asNumber(body.total_cents || (summary && summary.total_cents));
  const subtotalCents = asNumber(body.subtotal_cents || (summary && summary.subtotal_cents));
  const shippingCents = asNumber(body.shipping_cents || (summary && summary.shipping_cents));

  try {
    await ensureSalesTables();

    const params = [
      ownerUserId,
      cartKey,
      toJsonb(customer),
      toJsonb(address),
      toJsonb(items),
      toJsonb(shipping),
      toJsonb(summary),
      status,
      toJsonb(pix),
      totalCents,
      subtotalCents,
      shippingCents,
      toJsonb(trackingParameters),
      toJsonb(utm),
      source || null,
      toJsonb(tracking),
    ];

    let result = await query(
      `update checkout_orders
         set owner_user_id = $1,
             customer = $3::jsonb,
             address = $4::jsonb,
             items = $5::jsonb,
             shipping = $6::jsonb,
             summary = $7::jsonb,
             status = $8,
             pix = $9::jsonb,
             total_cents = $10,
             subtotal_cents = $11,
             shipping_cents = $12,
             tracking_parameters = coalesce($13::jsonb, tracking_parameters),
             utm = coalesce(utm, $14::jsonb),
             source = case when source is null or source = '' then $15 else source end,
             tracking = coalesce(tracking, $16::jsonb)
       where cart_key = $2 and (owner_user_id = $1 or owner_user_id is null)
       returning *`,
      params
    );

    if (!result.rows?.length) {
      result = await query(
        `insert into checkout_orders (
           owner_user_id, cart_key, customer, address, items, shipping, summary,
           status, pix, total_cents, subtotal_cents, shipping_cents,
           tracking_parameters, utm, source, tracking
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         returning *`,
        params
      );
    }

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
       where owner_user_id = $8 and cart_key = $1`,
      [cartKey, toJsonb(summary), toJsonb(items), toJsonb(shipping), totalCents, subtotalCents, shippingCents, ownerUserId]
    );

    const savedOrder = result.rows?.[0] || null;
    if (savedOrder && (!savedOrder.owner_user_id || String(savedOrder.owner_user_id) !== String(ownerUserId))) {
      console.error("[public/order] owner_user_id mismatch", {
        expectedOwnerUserId: ownerUserId,
        actualOwnerUserId: savedOrder.owner_user_id,
        slug,
        cartKey,
      });
    }
    if (savedOrder) {
      await registerOrderAnalytics({
        ownerUserId,
        cartKey,
        status,
        totalCents,
      });
      try {
        await dispatchUtmifyEvent({ order: savedOrder, status: "waiting_payment" });
      } catch (_error) {
        // Keep order creation resilient even if integration fails.
      }
    }

    res.json({ orderId: savedOrder?.id || null });
  } catch (error) {
    console.error("[public/order] failed to persist order", {
      ownerUserId,
      slug,
      cartKey,
      status,
      error: error?.message,
    });
    res.status(500).json({ error: error.message });
  }
};
