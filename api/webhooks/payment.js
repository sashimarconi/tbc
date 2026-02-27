const { parseJson } = require("../../lib/parse-json");
const { query } = require("../../lib/db");
const { ensureSalesTables } = require("../../lib/ensure-sales");
const { ensureAnalyticsTables } = require("../../lib/ensure-analytics");
const { dispatchUtmifyEvent } = require("../../lib/utmify");

const PAID_STATUS_KEYWORDS = [
  "paid",
  "approved",
  "success",
  "succeeded",
  "completed",
  "confirmed",
  "pago",
  "aprovado",
  "liquidado",
];

function asObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

function asString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function isPaidStatus(payload = {}) {
  const data = asObject(payload.data) || {};
  const nestedEvent = asObject(data.event) || {};
  const candidates = [
    payload.status,
    payload.event,
    payload.type,
    payload.action,
    payload.event_name,
    payload.eventType,
    payload.payment_status,
    payload.paymentStatus,
    payload.sale_status,
    payload.saleStatus,
    data.status,
    data.event,
    data.type,
    data.paymentStatus,
    data.payment_status,
    nestedEvent.status,
    nestedEvent.type,
    nestedEvent.name,
  ]
    .map((value) => asString(value).toLowerCase())
    .filter(Boolean);

  if (!candidates.length) return false;
  return candidates.some((value) => PAID_STATUS_KEYWORDS.some((token) => value.includes(token)));
}

function parseExternalRefCartKey(value = "") {
  const raw = asString(value);
  if (!raw) return "";
  const byColon = raw.split(":");
  if (byColon.length > 1) {
    const key = asString(byColon[byColon.length - 1]);
    if (key) return key;
  }
  return raw;
}

function extractIdentifiers(payload = {}) {
  const data = asObject(payload.data) || {};
  const paymentData = asObject(data.paymentData) || {};
  const txid = asString(
    payload.txid ||
      payload.transactionId ||
      payload.transaction_id ||
      payload.id ||
      payload.chargeId ||
      payload.saleId ||
      payload.sale_id ||
      data.txid ||
      data.transactionId ||
      data.transaction_id ||
      data.id ||
      data.chargeId ||
      data.saleId ||
      data.sale_id ||
      paymentData.txid ||
      paymentData.transactionId ||
      paymentData.transaction_id
  );

  const externalRef = asString(
    payload.externalRef ||
      payload.external_ref ||
      payload.reference ||
      data.externalRef ||
      data.external_ref ||
      data.reference
  );

  const cartKeyFromPayload = asString(payload.cart_id || payload.cartId || data.cart_id || data.cartId);
  const cartKey = cartKeyFromPayload || parseExternalRefCartKey(externalRef);

  return { txid, cartKey, externalRef };
}

function hasValidWebhookSecret(req) {
  const secret = asString(process.env.BLACKCAT_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET);
  if (!secret) return true;
  const token = asString(req.query?.token || req.query?.secret);
  if (token && token === secret) return true;
  const received = asString(
    req.headers["x-webhook-secret"] ||
      req.headers["x-blackcat-secret"] ||
      req.headers["x-api-key"] ||
      req.headers.authorization
  ).replace(/^Bearer\s+/i, "");
  return received && received === secret;
}

async function markOrderPaidByTxid(txid) {
  return query(
    `update checkout_orders
       set status = 'paid',
           paid_at = coalesce(paid_at, now())
     where coalesce(pix->>'txid','') = $1
       and status <> 'paid'
     returning *`,
    [txid]
  );
}

async function markOrderPaidByCartKey(cartKey) {
  return query(
    `update checkout_orders
       set status = 'paid',
           paid_at = coalesce(paid_at, now())
     where cart_key = $1
       and status <> 'paid'
     returning *`,
    [cartKey]
  );
}

async function registerPaidSideEffects(order) {
  if (!order?.id || !order?.owner_user_id) return;
  await ensureAnalyticsTables();
  await query(
    `insert into analytics_events (owner_user_id, session_id, event_type, page, payload)
     values ($1, $2, 'purchase', 'checkout', $3::jsonb)`,
    [
      order.owner_user_id,
      order.cart_key || String(order.id),
      JSON.stringify({ order_id: order.id, total_cents: order.total_cents || 0, status: "paid" }),
    ]
  );
  await dispatchUtmifyEvent({ order, status: "paid" });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!hasValidWebhookSecret(req)) {
    res.status(401).json({ error: "Unauthorized webhook" });
    return;
  }

  let body = {};
  try {
    body = await parseJson(req);
  } catch (_error) {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  if (!isPaidStatus(body)) {
    res.json({ ok: true, ignored: true, reason: "status-not-paid" });
    return;
  }

  const { txid, cartKey } = extractIdentifiers(body);
  if (!txid && !cartKey) {
    res.status(400).json({ error: "Missing transaction reference" });
    return;
  }

  try {
    await ensureSalesTables();

    let updatedRows = [];
    if (txid) {
      const byTxid = await markOrderPaidByTxid(txid);
      updatedRows = byTxid.rows || [];
    }
    if (!updatedRows.length && cartKey) {
      const byCart = await markOrderPaidByCartKey(cartKey);
      updatedRows = byCart.rows || [];
    }

    for (const order of updatedRows) {
      try {
        await registerPaidSideEffects(order);
      } catch (_error) {
        // Keep webhook resilient; order status already persisted.
      }
    }

    res.json({
      ok: true,
      paid_orders: updatedRows.length,
      txid: txid || null,
      cart_key: cartKey || null,
    });
  } catch (error) {
    res.status(500).json({ error: error?.message || "Webhook processing failed" });
  }
};
