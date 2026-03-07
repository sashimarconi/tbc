const { parseJson } = require("../lib/parse-json");

const DEFAULT_PARADISE_API_URL =
  process.env.PARADISE_API_URL || "https://multi.paradisepags.com/api/create-charge";

function extractProviderError(data, fallback) {
  if (!data || typeof data !== "object") return fallback;
  return data.error || data.message || fallback;
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

  const amount = Number(body.amount || 0);
  const customer = body.customer || {};
  if (!amount || amount < 100 || !customer.name || !customer.email) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const apiUrl = String(process.env.PARADISE_API_URL || DEFAULT_PARADISE_API_URL).trim();
  const apiKey = String(process.env.PARADISE_API_KEY || "").trim();
  if (!apiKey) {
    res.status(400).json({ error: "Provider API key not configured (PARADISE_API_KEY)" });
    return;
  }

  const payload = {
    amount,
    currency: "BRL",
    description: body.description || "Pedido",
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.cellphone || "",
      document: customer.taxId || "",
    },
    external_ref: String(body.cart_id || body.cartId || "").trim() || undefined,
    utm: body.tracking?.utm || {},
    source: body.tracking?.src || req.headers.referer || "",
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": body.user_agent || req.headers["user-agent"] || "TheBlackCheckout",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[create-paradise-pix] provider error", { status: response.status, error: extractProviderError(data, "Pix error"), raw: data, apiUrl });
      res.status(response.status || 400).json({ error: extractProviderError(data, "Pix error"), raw: data });
      return;
    }

    const txid = String(data.txid || data.transactionId || data.id || "").trim();
    const rawQr = data.pix_qr_code || data.pixQrCode || data.qr || data.qr_code || "";
    const pixCode = data.pix_code || data.pixCode || data.copyPaste || data.code || "";
    let pixQr = "";
    if (rawQr) {
      pixQr = rawQr.startsWith("data:image") ? rawQr : /^https?:\/\//i.test(rawQr) ? rawQr : `data:image/png;base64,${rawQr}`;
    } else if (data.qr_base64) {
      pixQr = `data:image/png;base64,${data.qr_base64}`;
    }

    res.json({ pix_qr_code: pixQr || "", pix_code: pixCode || "", txid: txid || "", expires_at: data.expires_at || data.expiresAt || null });
  } catch (error) {
    console.error("[create-paradise-pix] connection error", error?.message || error);
    res.status(502).json({ error: "Pix connection error" });
  }
};
