const { parseJson } = require("../lib/parse-json");
const { query } = require("../lib/db");
const { ensurePaymentGatewayTable } = require("../lib/ensure-payment-gateway");
const { decryptText } = require("../lib/credentials-crypto");
const { resolvePublicOwnerContext } = require("../lib/public-owner-context");
const DEFAULT_SEALPAY_API_URL =
  process.env.SEALPAY_API_URL || "https://abacate-5eo1.onrender.com/create-pix4";
const DEFAULT_BLACKCAT_API_URL =
  process.env.BLACKCAT_API_URL || "https://api.blackcatpagamentos.online/api/sales/create-sale";
const DEFAULT_BRUTALCASH_API_URL =
  process.env.BRUTALCASH_API_URL || "https://api.brutalcash.com/v1/payment-transaction/create";
const PAYMENT_PROVIDER_OPTIONS = new Set(["sealpay", "blackcat", "brutalcash"]);
const GATEWAY_CACHE_TTL_MS = 60 * 1000;
const gatewayCache = new Map();

function normalizeSealpayApiUrl(url = "") {
  return String(url || "").trim();
}
function normalizeBlackcatApiUrl(url = "") {
  return String(url || "").trim();
}
function normalizeBrutalcashApiUrl(url = "") {
  return String(url || "").trim();
}
function normalizeProvider(value = "") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return PAYMENT_PROVIDER_OPTIONS.has(normalized) ? normalized : "sealpay";
}
function normalizePaymentApiUrl(provider, url = "") {
  if (provider === "blackcat") {
    return normalizeBlackcatApiUrl(url);
  }
  if (provider === "brutalcash") {
    return normalizeBrutalcashApiUrl(url);
  }
  return normalizeSealpayApiUrl(url);
}
function getDefaultApiUrl(provider) {
  if (provider === "blackcat") return DEFAULT_BLACKCAT_API_URL;
  if (provider === "brutalcash") return DEFAULT_BRUTALCASH_API_URL;
  return DEFAULT_SEALPAY_API_URL;
}

function readGatewayCache(slug) {
  const cached = gatewayCache.get(slug);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    gatewayCache.delete(slug);
    return undefined;
  }
  return cached.value;
}

function writeGatewayCache(slug, value) {
  if (!slug) return;
  gatewayCache.set(slug, {
    value,
    expiresAt: Date.now() + GATEWAY_CACHE_TTL_MS,
  });
}

async function resolveGatewayBySlug(req, slug) {
  if (!slug) {
    return null;
  }

  const cached = readGatewayCache(slug);
  if (cached !== undefined) {
    return cached;
  }

  const ownerContext = await resolvePublicOwnerContext(req, slug, { activeOnlyBase: true });
  const ownerUserId = ownerContext?.ownerUserId;
  if (!ownerUserId) {
    writeGatewayCache(slug, null);
    return null;
  }

  await ensurePaymentGatewayTable();
  const [settingsRes, gatewayRes] = await Promise.all([
    query(
      `select selected_provider
         from user_payment_gateway_settings
        where owner_user_id = $1
        limit 1`,
      [ownerUserId]
    ),
    query(
      `select provider, api_url, api_key_encrypted, is_active
       from user_payment_gateways
       where owner_user_id = $1 and provider = any($2::text[])`,
      [ownerUserId, Array.from(PAYMENT_PROVIDER_OPTIONS)]
    ),
  ]);

  const selectedProvider = normalizeProvider(settingsRes.rows?.[0]?.selected_provider || "sealpay");
  const gatewayByProvider = new Map(
    (gatewayRes.rows || []).map((row) => [normalizeProvider(row.provider), row])
  );
  const gateway = gatewayByProvider.get(selectedProvider);

  if (!gateway || gateway.is_active === false) {
    writeGatewayCache(slug, null);
    return null;
  }

  const resolved = {
    provider: selectedProvider,
    apiUrl: normalizePaymentApiUrl(selectedProvider, gateway.api_url),
    apiKey: decryptText(gateway.api_key_encrypted || ""),
  };
  writeGatewayCache(slug, resolved);
  return resolved;
}

function normalizeDocument(taxId = "") {
  const digits = String(taxId || "").replace(/\D/g, "");
  if (!digits) return { number: "", type: "cpf" };
  if (digits.length === 14) return { number: digits, type: "cnpj" };
  return { number: digits, type: "cpf" };
}

function normalizePhone(value = "") {
  return String(value || "").replace(/\D/g, "");
}

function resolveClientIp(req, body) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const fallback = String(req.socket?.remoteAddress || "").trim();
  return String(body.ip || forwardedFor || fallback || "").trim();
}

function extractProviderError(data, fallback) {
  if (!data || typeof data !== "object") return fallback;
  return data.error || data.message || fallback;
}

function looksLikeBase64Image(raw = "") {
  const normalized = String(raw || "").trim();
  if (!normalized) return false;
  if (normalized.startsWith("iVBOR")) return true;
  if (normalized.startsWith("/9j/")) return true;
  if (normalized.startsWith("R0lGOD")) return true;
  if (normalized.startsWith("PHN2Zy")) return true;
  if (normalized.startsWith("PD94bWwg")) return true;
  return false;
}

function isPixCopyCode(value = "") {
  const normalized = String(value || "").trim();
  return normalized.startsWith("000201");
}

function buildPixQrImage(candidates = [], pixCode = "") {
  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (!value) continue;
    if (value.startsWith("data:image")) return value;
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith("<svg") || value.startsWith("<?xml")) {
      return `data:image/svg+xml;utf8,${encodeURIComponent(value)}`;
    }
    if (looksLikeBase64Image(value)) {
      return `data:image/png;base64,${value}`;
    }
  }

  if (!pixCode) return "";
  return `https://quickchart.io/qr?size=340&text=${encodeURIComponent(pixCode)}`;
}

function resolveRequestBaseUrl(req) {
  const protoRaw = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const host =
    String(req.headers["x-forwarded-host"] || "").split(",")[0].trim() ||
    String(req.headers.host || "").trim();
  if (!host) return "";
  const proto = protoRaw || "https";
  return `${proto}://${host}`;
}

function appendWebhookTokenIfNeeded(url) {
  const base = String(url || "").trim();
  if (!base) return "";
  const secret = String(process.env.BLACKCAT_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || "").trim();
  if (!secret) return base;
  try {
    const parsed = new URL(base);
    if (!parsed.searchParams.get("token")) {
      parsed.searchParams.set("token", secret);
    }
    return parsed.toString();
  } catch (_error) {
    return base;
  }
}

async function requestSealpay({ apiUrl, apiKey, amount, body, req, customer }) {
  const tracking = body.tracking || {};
  const payload = {
    amount,
    description: body.description || "",
    customer: {
      name: customer.name,
      email: customer.email,
      cellphone: customer.cellphone || "",
      taxId: customer.taxId || "",
    },
    tracking: {
      utm: tracking.utm || {},
      src: tracking.src || req.headers.referer || "",
    },
    api_key: apiKey,
    fbp: body.fbp || "",
    fbc: body.fbc || "",
    user_agent: body.user_agent || req.headers["user-agent"],
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return { ok: false, status: response.status, error: extractProviderError(data, "Pix error") };
  }

  const rawQr = data.pix_qr_code || data.pixQrCode || "";
  const pixQr = rawQr ? (rawQr.startsWith("data:image") ? rawQr : `data:image/png;base64,${rawQr}`) : "";
  return {
    ok: true,
    data: {
      pix_qr_code: pixQr,
      pix_code: data.pix_code || data.pixCode || "",
      txid: data.txid || "",
      expires_at: data.expires_at || null,
    },
  };
}

async function requestBlackcat({ apiUrl, apiKey, amount, body, req, customer, slug }) {
  const tracking = body.tracking || {};
  const utm = tracking.utm || {};
  const cartId = String(body.cart_id || body.cartId || "").trim();
  const document = normalizeDocument(customer.taxId);
  if (!document.number) {
    return { ok: false, status: 400, error: "CPF/CNPJ obrigatorio para gerar PIX na BlackCat" };
  }

  const shippingAddress = body.shipping?.address || body.address || customer.address || null;
  const hasShippingAddress = Boolean(shippingAddress?.street && shippingAddress?.city && shippingAddress?.state);
  const payload = {
    amount,
    currency: "BRL",
    paymentMethod: "pix",
    items: [
      {
        title: String(body.description || "Pedido").trim() || "Pedido",
        unitPrice: amount,
        quantity: 1,
        tangible: hasShippingAddress,
      },
    ],
    customer: {
      name: customer.name,
      email: customer.email,
      phone: normalizePhone(customer.cellphone),
      document,
    },
    pix: { expiresInDays: 1 },
    metadata: String(body.description || "").trim() || undefined,
    externalRef: cartId ? `${slug || "checkout"}:${cartId}` : `${slug || "checkout"}-${Date.now()}`,
    utm_source: utm.utm_source || "",
    utm_medium: utm.utm_medium || "",
    utm_campaign: utm.utm_campaign || "",
    utm_content: utm.utm_content || "",
    utm_term: utm.utm_term || "",
  };
  if (hasShippingAddress) {
    payload.shipping = {
      name: customer.name,
      street: shippingAddress.street || "",
      number: shippingAddress.number || "S/N",
      complement: shippingAddress.complement || "",
      neighborhood: shippingAddress.neighborhood || "",
      city: shippingAddress.city || "",
      state: shippingAddress.state || "",
      zipCode: String(shippingAddress.cep || shippingAddress.zipCode || "").replace(/\D/g, ""),
    };
  }
  const postbackUrlRaw =
    String(process.env.BLACKCAT_POSTBACK_URL || "").trim() ||
    `${resolveRequestBaseUrl(req)}/api/webhooks/payment`;
  const postbackUrl = appendWebhookTokenIfNeeded(postbackUrlRaw);
  if (postbackUrl) {
    payload.postbackUrl = postbackUrl;
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      "User-Agent": body.user_agent || req.headers["user-agent"] || "TheBlackCheckout",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    return {
      ok: false,
      status: response.status || 400,
      error: extractProviderError(data, "Pix error"),
    };
  }

  const transaction = data.data || {};
  const paymentData = transaction.paymentData || {};
  const copyPaste = String(paymentData.copyPaste || paymentData.pixCode || paymentData.code || "").trim();
  const qrCodeText = String(paymentData.qrCode || "").trim();
  const pixCode = copyPaste || (isPixCopyCode(qrCodeText) ? qrCodeText : "");
  const pixQr = buildPixQrImage(
    [
      paymentData.qrCodeBase64,
      paymentData.qrcodeBase64,
      paymentData.qrCodeImage,
      paymentData.qrcodeImage,
      paymentData.qrCode,
    ],
    pixCode
  );

  return {
    ok: true,
    data: {
      pix_qr_code: pixQr,
      pix_code: pixCode,
      txid: transaction.transactionId || "",
      expires_at: paymentData.expiresAt || null,
    },
  };
}

function buildBrutalcashAuthHeader(apiKey = "") {
  const raw = String(apiKey || "").trim();
  if (!raw) return "";

  const withoutPrefix = raw.replace(/^basic\s+/i, "").trim();
  if (!withoutPrefix) return "";

  const normalizePair = (value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";
    const separators = [":", "|", ";", ","];
    for (const separator of separators) {
      if (trimmed.includes(separator)) {
        const [left, ...rest] = trimmed.split(separator);
        const right = rest.join(separator);
        if (left?.trim() && right?.trim()) {
          return `${left.trim()}:${right.trim()}`;
        }
      }
    }
    const wsParts = trimmed.split(/\s+/).filter(Boolean);
    if (wsParts.length === 2) {
      return `${wsParts[0]}:${wsParts[1]}`;
    }
    return "";
  };

  const pair = normalizePair(withoutPrefix);
  if (pair) {
    return `Basic ${Buffer.from(pair, "utf8").toString("base64")}`;
  }

  // If no pair was found, only accept already-base64 credentials that decode to "user:pass".
  try {
    const decoded = Buffer.from(withoutPrefix, "base64").toString("utf8");
    if (decoded.includes(":")) {
      return `Basic ${withoutPrefix}`;
    }
  } catch (_error) {
    // ignore and fallback to invalid
  }

  return "";
}

async function requestBrutalcash({ apiUrl, apiKey, amount, body, req, customer, slug }) {
  const document = normalizeDocument(customer.taxId);
  const phone = normalizePhone(customer.cellphone);
  if (!document.number || !phone) {
    return { ok: false, status: 400, error: "CPF/CNPJ e telefone sao obrigatorios para gerar PIX na BrutalCash" };
  }

  const shippingAddress = body.shipping?.address || body.address || customer.address || null;
  const hasShippingAddress = Boolean(shippingAddress?.street && shippingAddress?.city && shippingAddress?.state);
  const postbackUrlRaw =
    String(process.env.BRUTALCASH_POSTBACK_URL || process.env.BLACKCAT_POSTBACK_URL || "").trim() ||
    `${resolveRequestBaseUrl(req)}/api/webhooks/payment`;
  const postbackUrl = appendWebhookTokenIfNeeded(postbackUrlRaw);
  const cartId = String(body.cart_id || body.cartId || "").trim();
  const externalRef = cartId ? `${slug || "checkout"}:${cartId}` : `${slug || "checkout"}-${Date.now()}`;
  const payload = {
    amount,
    payment_method: "pix",
    postback_url: postbackUrl,
    customer: {
      name: customer.name,
      email: customer.email,
      phone,
      document: {
        number: document.number,
        type: document.type,
      },
      external_ref: externalRef,
    },
    items: [
      {
        title: String(body.description || "Pedido").trim() || "Pedido",
        unit_price: amount,
        quantity: 1,
        tangible: hasShippingAddress,
        external_ref: externalRef,
      },
    ],
    pix: {
      expires_in_days: 1,
    },
    metadata: {
      slug: slug || "checkout",
      cart_id: cartId || "",
    },
    traceable: true,
    ip: resolveClientIp(req, body),
  };

  if (hasShippingAddress) {
    payload.shipping = {
      fee: 0,
      address: {
        street: String(shippingAddress.street || "").trim(),
        street_number: String(shippingAddress.number || shippingAddress.street_number || "S/N").trim(),
        complement: String(shippingAddress.complement || "").trim(),
        zip_code: String(shippingAddress.cep || shippingAddress.zipCode || shippingAddress.zip_code || "")
          .replace(/\D/g, "")
          .trim(),
        neighborhood: String(shippingAddress.neighborhood || "").trim(),
        city: String(shippingAddress.city || "").trim(),
        state: String(shippingAddress.state || "").trim(),
        country: String(shippingAddress.country || "BR").trim().toUpperCase(),
      },
    };
  }

  const authHeader = buildBrutalcashAuthHeader(apiKey);
  if (!authHeader) {
    return {
      ok: false,
      status: 400,
      error: "Credencial da BrutalCash invalida. Use public_key:secret_key no campo API Key.",
    };
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
      "User-Agent": body.user_agent || req.headers["user-agent"] || "TheBlackCheckout",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: response.status || 400,
      error: extractProviderError(data, "Pix error"),
    };
  }

  const transactionRaw = Array.isArray(data.data) ? data.data[0] : data.data || {};
  const pixRaw = Array.isArray(transactionRaw.pix) ? transactionRaw.pix[0] : transactionRaw.pix || {};
  const qrCodeText = String(pixRaw.qr_code || "").trim();
  const copyPaste = String(pixRaw.e2_e || "").trim();
  const pixCode = copyPaste || qrCodeText;
  const pixQr = buildPixQrImage([pixRaw.url, transactionRaw.qr_code], pixCode);

  return {
    ok: true,
    data: {
      pix_qr_code: pixQr,
      pix_code: pixCode,
      txid: String(transactionRaw.id || transactionRaw.transactionId || transactionRaw.transaction_id || "").trim(),
      expires_at: pixRaw.expiration_date || null,
    },
  };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = await parseJson(req);
  const amount = Number(body.amount || 0);
  const customer = body.customer || {};
  const slug = String(body.slug || "").trim();

  if (!amount || amount < 100 || !customer.name || !customer.email) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  let provider = "sealpay";
  let apiUrl = "";
  let apiKey = "";
  try {
    const gateway = await resolveGatewayBySlug(req, slug);
    if (gateway) {
      provider = normalizeProvider(gateway.provider || "sealpay");
      apiUrl = gateway.apiUrl;
      apiKey = gateway.apiKey;
    }
  } catch (error) {
    res.status(500).json({ error: "Falha ao carregar configuracao de pagamento" });
    return;
  }

  if (!apiUrl) apiUrl = getDefaultApiUrl(provider);
  apiUrl = normalizePaymentApiUrl(provider, apiUrl);
  if (!apiKey) {
    if (provider === "blackcat") {
      apiKey = process.env.BLACKCAT_API_KEY || "";
    } else if (provider === "brutalcash") {
      apiKey = process.env.BRUTALCASH_API_KEY || "";
    } else {
      apiKey = process.env.SEALPAY_API_KEY || "";
    }
  }
  if (!apiKey) {
    res.status(400).json({ error: "Pagamento nao configurado para este checkout" });
    return;
  }

  try {
    const result =
      provider === "blackcat"
        ? await requestBlackcat({ apiUrl, apiKey, amount, body, req, customer, slug })
        : provider === "brutalcash"
          ? await requestBrutalcash({ apiUrl, apiKey, amount, body, req, customer, slug })
        : await requestSealpay({ apiUrl, apiKey, amount, body, req, customer });

    if (!result.ok) {
      res.status(result.status || 400).json({ error: result.error || "Pix error" });
      return;
    }

    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: "Pix connection error" });
  }
};
