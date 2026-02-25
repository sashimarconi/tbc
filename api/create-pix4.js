const { parseJson } = require("../lib/parse-json");
const { query } = require("../lib/db");
const { ensurePaymentGatewayTable } = require("../lib/ensure-payment-gateway");
const { decryptText } = require("../lib/credentials-crypto");
const { resolvePublicOwnerContext } = require("../lib/public-owner-context");
const DEFAULT_SEALPAY_API_URL =
  process.env.SEALPAY_API_URL || "https://abacate-5eo1.onrender.com/create-pix4";
const DEFAULT_BLACKCAT_API_URL =
  process.env.BLACKCAT_API_URL || "https://api.blackcatpagamentos.online/api/sales/create-sale";
const PAYMENT_PROVIDER_OPTIONS = new Set(["sealpay", "blackcat"]);
const GATEWAY_CACHE_TTL_MS = 60 * 1000;
const gatewayCache = new Map();

function normalizeSealpayApiUrl(url = "") {
  return String(url || "").trim();
}
function normalizeBlackcatApiUrl(url = "") {
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
  return normalizeSealpayApiUrl(url);
}
function getDefaultApiUrl(provider) {
  return provider === "blackcat" ? DEFAULT_BLACKCAT_API_URL : DEFAULT_SEALPAY_API_URL;
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
    externalRef: `${slug || "checkout"}-${Date.now()}`,
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
  const postbackUrl = String(process.env.BLACKCAT_POSTBACK_URL || "").trim();
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
    apiKey = provider === "blackcat" ? process.env.BLACKCAT_API_KEY || "" : process.env.SEALPAY_API_KEY || "";
  }
  if (!apiKey) {
    res.status(400).json({ error: "Pagamento nao configurado para este checkout" });
    return;
  }

  try {
    const result =
      provider === "blackcat"
        ? await requestBlackcat({ apiUrl, apiKey, amount, body, req, customer, slug })
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
