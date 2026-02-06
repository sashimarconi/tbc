const { query } = require("../../lib/db");
const { ensureProductSchema, ensureBaseSlugs } = require("../../lib/ensure-products");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await ensureProductSchema();
    await ensureBaseSlugs();

    const slug = (req.query?.slug || "").toString().trim();
    if (!slug) {
      res.status(400).json({ error: "Checkout não encontrado" });
      return;
    }

    const baseRes = await query(
      "select * from products where type = 'base' and active = true and slug = $1 limit 1",
      [slug]
    );
    if (!baseRes.rows?.length) {
      res.status(404).json({ error: "Checkout não encontrado" });
      return;
    }
    const bumpRes = await query(
      "select * from products where type = $1 and active = true order by sort asc, created_at asc",
      ["bump"]
    );
    const upsellRes = await query(
      "select * from products where type = $1 and active = true order by sort asc, created_at asc",
      ["upsell"]
    );
    const shippingRes = await query(
      "select * from products where type = $1 and active = true order by sort asc, created_at asc",
      ["shipping"]
    );

    res.json({
      base: baseRes.rows?.[0] || null,
      bumps: bumpRes.rows || [],
      upsells: upsellRes.rows || [],
      shipping: shippingRes.rows || [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
