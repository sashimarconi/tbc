const { parseJson } = require("../lib/parse-json");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = await parseJson(req);
  const amount = Number(body.amount || 0);
  const customer = body.customer || {};

  if (!amount || amount < 100 || !customer.name || !customer.email) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const apiUrl =
    process.env.SEALPAY_API_URL ||
    "https://abacate-5eo1.onrender.com/create-pix";
  const apiKey = process.env.SEALPAY_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: "Missing SEALPAY_API_KEY" });
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
