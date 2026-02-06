const { query } = require("../../lib/db");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const baseRes = await query(
      "select * from products where type = $1 and active = true order by sort asc, created_at asc limit 1",
      ["base"]
    );
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
