const { query } = require("./db");
const { ensureIntegrationsSchema } = require("./ensure-integrations");

function formatUtcDateTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(
    date.getUTCHours()
  )}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function asObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function normalizeTrackingParameters(order = {}) {
  const utm = asObject(order.utm);
  const tracking = asObject(order.tracking);
  const params = {};

  Object.entries(utm).forEach(([key, value]) => {
    if (!key.startsWith("utm_")) return;
    if (value === null || value === undefined || value === "") return;
    params[key] = String(value);
  });

  const src = tracking.src || order.source;
  const sck = tracking.sck || tracking.subid || tracking.click_id || "";
  if (src) params.src = String(src);
  if (sck) params.sck = String(sck);

  return params;
}

function shouldFireWaitingPayment(integration) {
  if (!integration || integration.is_active === false) return false;
  const cfg = asObject(integration.config);
  if (cfg.fire_only_when_paid === true) return false;
  return cfg.fire_on_order_created !== false;
}

function shouldFirePaid(integration) {
  if (!integration || integration.is_active === false) return false;
  const cfg = asObject(integration.config);
  return cfg.fire_on_paid !== false;
}

function getEndpoint(integration) {
  const cfg = asObject(integration.config);
  const configured = typeof cfg.api_url === "string" ? cfg.api_url.trim() : "";
  return configured || process.env.UTMIFY_API_URL || "https://api.utmify.com.br/api/events";
}

function getAuthHeader(integration) {
  const cfg = asObject(integration.config);
  const token = typeof cfg.api_token === "string" ? cfg.api_token.trim() : "";
  if (!token) return null;
  return `Bearer ${token}`;
}

function buildPayload(order, status) {
  return {
    orderId: String(order.id || ""),
    status,
    createdAt: formatUtcDateTime(order.created_at),
    paidAt: order.paid_at ? formatUtcDateTime(order.paid_at) : null,
    totalCents: Number(order.total_cents || 0),
    subtotalCents: Number(order.subtotal_cents || 0),
    shippingCents: Number(order.shipping_cents || 0),
    trackingParameters: normalizeTrackingParameters(order),
    customer: asObject(order.customer),
    items: Array.isArray(order.items) ? order.items : asObject(order.items),
  };
}

async function findUtmifyIntegration(ownerUserId) {
  await ensureIntegrationsSchema();
  const result = await query(
    `select id, owner_user_id, provider, is_active, config
     from user_integrations
     where owner_user_id = $1 and provider = 'utmify'
     order by updated_at desc
     limit 1`,
    [ownerUserId]
  );
  return result.rows?.[0] || null;
}

async function dispatchUtmifyEvent({ order, status }) {
  if (!order?.id || !order?.owner_user_id) {
    return { sent: false, reason: "missing-order" };
  }
  const integration = await findUtmifyIntegration(order.owner_user_id);
  if (!integration) {
    return { sent: false, reason: "integration-not-found" };
  }
  if (status === "waiting_payment" && !shouldFireWaitingPayment(integration)) {
    return { sent: false, reason: "waiting-disabled" };
  }
  if (status === "paid" && !shouldFirePaid(integration)) {
    return { sent: false, reason: "paid-disabled" };
  }

  await ensureIntegrationsSchema();
  const payload = buildPayload(order, status);
  const inserted = await query(
    `insert into utmify_events_log (owner_user_id, order_id, status, request_payload)
     values ($1, $2, $3, $4::jsonb)
     on conflict (order_id, status) do nothing
     returning id`,
    [order.owner_user_id, order.id, status, JSON.stringify(payload)]
  );
  const logId = inserted.rows?.[0]?.id || null;
  if (!logId) {
    return { sent: false, deduped: true };
  }

  const endpoint = getEndpoint(integration);
  const auth = getAuthHeader(integration);
  let responseBody = null;
  let httpStatus = 0;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify(payload),
    });
    httpStatus = response.status;
    const raw = await response.text();
    try {
      responseBody = raw ? JSON.parse(raw) : { ok: response.ok };
    } catch (_error) {
      responseBody = { raw };
    }
  } catch (error) {
    responseBody = { error: error?.message || "request-failed" };
  }

  await query(
    `update utmify_events_log
       set response_payload = $2::jsonb,
           http_status = $3
     where id = $1`,
    [logId, JSON.stringify(responseBody || {}), httpStatus || 0]
  );

  return { sent: true, status: httpStatus || 0 };
}

module.exports = {
  formatUtcDateTime,
  normalizeTrackingParameters,
  dispatchUtmifyEvent,
};
