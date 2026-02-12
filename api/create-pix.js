const { parseJson } = require("../lib/parse-json");
const { query } = require("../lib/db");
const { ensurePaymentGatewayTable } = require("../lib/ensure-payment-gateway");
const { decryptText } = require("../lib/credentials-crypto");
const DEFAULT_SEALPAY_API_URL =
  process.env.SEALPAY_API_URL || "https://abacate-5eo1.onrender.com/create-pix";

async function resolveGatewayBySlug(slug) {
  if (!slug) {
    return null;
  }

  const ownerRes = await query(
    "select owner_user_id from products where slug = $1 and type = 'base' limit 1",
    [slug]
  );
  const ownerUserId = ownerRes.rows?.[0]?.owner_user_id;
  if (!ownerUserId) {
    return null;
  }

  await ensurePaymentGatewayTable();
  const gatewayRes = await query(
    `select api_url, api_key_encrypted, is_active
     from user_payment_gateways
     where owner_user_id = $1 and provider = 'sealpay'
     limit 1`,
    [ownerUserId]
  );

  const gateway = gatewayRes.rows?.[0];
  if (!gateway || gateway.is_active === false) {
    return null;
  }

  return {
    apiUrl: gateway.api_url,
    apiKey: decryptText(gateway.api_key_encrypted || ""),
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

  let apiUrl = "";
  let apiKey = "";
  try {
    const gateway = await resolveGatewayBySlug(slug);
    if (gateway) {
      apiUrl = gateway.apiUrl;
      apiKey = gateway.apiKey;
    }
  } catch (error) {
    res.status(500).json({ error: "Falha ao carregar configuracao de pagamento" });
    return;
  }

  if (!apiUrl) {
    apiUrl = DEFAULT_SEALPAY_API_URL;
  }
  if (!apiKey) {
    apiKey = process.env.SEALPAY_API_KEY || "";
  }
  if (!apiKey) {
    res.status(400).json({ error: "Pagamento nao configurado para este checkout" });
    return;
  }

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

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ error: data.error || "Pix error" });
      return;
    }

    const rawQr = data.pix_qr_code || data.pixQrCode || "";
    const pixQr = rawQr.startsWith("data:image")
      ? rawQr
      : `data:image/png;base64,${rawQr}`;

    res.json({
      pix_qr_code: pixQr,
      pix_code: data.pix_code || data.pixCode || "",
      txid: data.txid || "",
    });
  } catch (error) {
    res.status(500).json({ error: "Pix connection error" });
  }
};
