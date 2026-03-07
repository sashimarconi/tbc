const { parseJson } = require("../lib/parse-json");
const { query } = require("../lib/db");

function sanitizeText(value) {
  return typeof value === "string" ? value.trim().slice(0, 255) : "";
}

function normalizeOrderStatus(value) {
  const raw = sanitizeText(value).toLowerCase();
  if (!raw || raw === "pending") return "waiting_payment";
  const allowed = new Set(["waiting_payment", "paid", "refused", "refunded", "cancelled", "pending"]);
  return allowed.has(raw) ? raw : "waiting_payment";
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

  const txid = sanitizeText(body.txid || body.transactionId || "");
  if (!txid) {
    res.status(400).json({ error: "Missing txid" });
    return;
  }

  try {
    const result = await query(
      `select id, owner_user_id, status, pix, items
         from checkout_orders
        where coalesce(pix->>'txid','') = $1
        limit 1`,
      [txid]
    );

    const row = result.rows?.[0];
    if (!row) {
      res.json({ found: false });
      return;
    }

    const status = normalizeOrderStatus(row.status || "waiting_payment");
    const response = { found: true, status };

    if (status === "paid") {
      // Attempt to resolve a product-level thank_you_url from first item
      try {
        const items = Array.isArray(row.items) ? row.items : JSON.parse(String(row.items || "[]"));
        const first = items && items[0];
        const productId = first && (first.id || first.product_id || first.productId) ? String(first.id || first.product_id || first.productId) : null;
        if (productId) {
          const prod = await query(
            `select thank_you_url from products where id = $1 and owner_user_id = $2 limit 1`,
            [productId, row.owner_user_id]
          );
          const p = prod.rows?.[0];
          if (p && p.thank_you_url) response.redirect_url = String(p.thank_you_url || "").trim();
        }
      } catch (_error) {
        // ignore resolution errors
      }
    }

    res.json(response);
  } catch (error) {
    console.error('[check-paradise-status] db error', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal error' });
  }
};
