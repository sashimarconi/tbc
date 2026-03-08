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

function asArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

function asString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeTrackingParameters(order = {}) {
  const utm = asObject(order.utm);
  const tracking = asObject(order.tracking);
  const params = {
    src: null,
    sck: null,
    utm_source: null,
    utm_campaign: null,
    utm_medium: null,
    utm_content: null,
    utm_term: null,
  };

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
  const raw = configured || process.env.UTMIFY_API_URL || "https://api.utmify.com.br/api-credentials/orders";
  return raw.replace(/\/api\/events\/?$/i, "/api-credentials/orders");
}

function getApiToken(integration) {
  const cfg = asObject(integration.config);
  const token = typeof cfg.api_token === "string" ? cfg.api_token.trim() : "";
  return token || asString(process.env.UTMIFY_API_TOKEN);
}

function normalizeStatus(status, order) {
  const raw = asString(status || order?.status).toLowerCase();
  const accepted = new Set(["waiting_payment", "paid", "refused", "refunded", "chargedback"]);
  if (accepted.has(raw)) return raw;
  if (raw === "approved" || raw === "success" || raw === "succeeded" || raw === "completed") {
    return "paid";
  }
  return "waiting_payment";
}

function normalizePaymentMethod(order = {}) {
  const summary = asObject(order.summary);
  const shipping = asObject(order.shipping);
  const tracking = asObject(order.tracking);
  const raw = asString(
    order.payment_method ||
      order.paymentMethod ||
      summary.payment_method ||
      summary.paymentMethod ||
      shipping.payment_method ||
      shipping.paymentMethod ||
      tracking.payment_method ||
      tracking.paymentMethod
  ).toLowerCase();

  if (raw === "credit_card" || raw === "boleto" || raw === "pix" || raw === "paypal" || raw === "free_price") {
    return raw;
  }
  if (raw === "card" || raw === "credito" || raw === "cartao" || raw === "cartao_de_credito") return "credit_card";
  if (raw === "billet") return "boleto";
  if (raw === "free" || raw === "gratis") return "free_price";
  if (order.pix) return "pix";
  return "pix";
}

function buildCustomer(order = {}) {
  const customer = asObject(order.customer);
  const tracking = asObject(order.tracking);
  return {
    name: asString(customer.name),
    email: asString(customer.email),
    phone: asString(customer.phone || customer.cellphone || customer.mobile) || null,
    document: asString(customer.document || customer.taxId || customer.cpf || customer.cnpj) || null,
    country: asString(customer.country || customer.country_code || "BR") || undefined,
    ip: asString(customer.ip || tracking.ip || tracking.client_ip || tracking.user_ip) || undefined,
  };
}

function buildProducts(order = {}) {
  const items = asArray(order.items);
  return items
    .map((item, index) => {
      const row = asObject(item);
      const quantity = Number(row.quantity || 1);
      const unitPrice = Number(row.price_cents || row.unit_price_cents || row.unitPriceCents || row.priceInCents || 0);
      const validQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
      const priceInCents = Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0;
      return {
        id: asString(row.id || row.product_id || `item-${index + 1}`),
        name: asString(row.name || row.title || `Item ${index + 1}`),
        planId: asString(row.plan_id || row.planId) || null,
        planName: asString(row.plan_name || row.planName) || null,
        quantity: validQuantity,
        priceInCents,
      };
    })
    .filter((item) => item.id && item.name);
}

function buildCommission(order = {}) {
  const summary = asObject(order.summary);
  const total = Number(order.total_cents || summary.total_cents || 0);
  const gatewayFee = Number(order.gateway_fee_cents || summary.gateway_fee_cents || 0);
  const safeTotal = Number.isFinite(total) && total >= 0 ? total : 0;
  const safeGatewayFee = Number.isFinite(gatewayFee) && gatewayFee >= 0 ? gatewayFee : 0;
  const remainder = safeTotal - safeGatewayFee;
  const userCommission = remainder > 0 ? remainder : safeTotal;
  const currency = asString(order.currency || summary.currency || "BRL").toUpperCase();

  return {
    totalPriceInCents: safeTotal,
    gatewayFeeInCents: safeGatewayFee,
    userCommissionInCents: userCommission,
    ...(currency && currency !== "BRL" ? { currency } : {}),
  };
}

function buildPayload(order, status, integration) {
  const cfg = asObject(integration?.config);
  const normalizedStatus = normalizeStatus(status, order);
  const products = buildProducts(order);
  const platform = asString(cfg.platform || process.env.UTMIFY_PLATFORM || "TheBlackCheckout");

  return {
    orderId: String(order.id || ""),
    platform,
    paymentMethod: normalizePaymentMethod(order),
    status: normalizedStatus,
    createdAt: formatUtcDateTime(order.created_at),
    approvedDate: order.paid_at ? formatUtcDateTime(order.paid_at) : null,
    refundedAt: order.refunded_at ? formatUtcDateTime(order.refunded_at) : null,
    customer: buildCustomer(order),
    products,
    trackingParameters: normalizeTrackingParameters(order),
    commission: buildCommission(order),
    ...(cfg.is_test === true ? { isTest: true } : {}),
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
  const payload = buildPayload(order, status, integration);
  const endpoint = getEndpoint(integration);
  const apiToken = getApiToken(integration);
  if (!apiToken) {
    return { sent: false, reason: "missing-token" };
  }

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

  let responseBody = null;
  let httpStatus = 0;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-token": apiToken,
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
