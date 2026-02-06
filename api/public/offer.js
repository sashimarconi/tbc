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
    const bumpRows = bumpRes.rows || [];
    const bumpIds = bumpRows.map((row) => row.id);
    let bumpRuleMap = new Map();
    if (bumpIds.length) {
      const ruleRes = await query(
        "select bump_id, apply_to_all, trigger_product_ids from order_bump_rules where bump_id = any($1::uuid[])",
        [bumpIds]
      );
      bumpRuleMap = new Map(
        (ruleRes.rows || []).map((row) => [
          row.bump_id,
          {
            apply_to_all: row.apply_to_all !== false,
            trigger_product_ids: Array.isArray(row.trigger_product_ids)
              ? row.trigger_product_ids
              : [],
          },
        ])
      );
    }
    const upsellRes = await query(
      "select * from products where type = $1 and active = true order by sort asc, created_at asc",
      ["upsell"]
    );
    const shippingRes = await query(
      "select * from products where type = $1 and active = true order by sort asc, created_at asc",
      ["shipping"]
    );

    const baseProduct = baseRes.rows?.[0] || null;
    const bumps = (bumpRows || []).filter((bump) => {
      const rule = bumpRuleMap.get(bump.id);
      if (!rule) {
        return true;
      }
      if (rule.apply_to_all !== false) {
        return true;
      }
      return Array.isArray(rule.trigger_product_ids) && rule.trigger_product_ids.includes(baseProduct?.id);
    });

    res.json({
      base: baseProduct,
      bumps: bumps.map((bump) => ({
        ...bump,
        bump_rule: bumpRuleMap.get(bump.id) || null,
      })),
      upsells: upsellRes.rows || [],
      shipping: shippingRes.rows || [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
