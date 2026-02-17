const { query } = require("../../lib/db");
const { ensureProductSchema, ensureBaseSlugs } = require("../../lib/ensure-products");
const { ensureShippingMethodsTable } = require("../../lib/ensure-shipping-methods");
const { resolvePublicOwnerContext } = require("../../lib/public-owner-context");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await ensureProductSchema();
    await ensureShippingMethodsTable();

    const slug = (req.query?.slug || "").toString().trim();
    if (!slug) {
      res.status(400).json({ error: "Checkout nao encontrado" });
      return;
    }

    const ownerContext = await resolvePublicOwnerContext(req, slug, { activeOnlyBase: true });
    if (!ownerContext?.baseProduct) {
      res.status(404).json({ error: "Checkout nao encontrado" });
      return;
    }

    const baseProduct = ownerContext.baseProduct;
    await ensureBaseSlugs(baseProduct.owner_user_id);

    const ownerUserId = baseProduct.owner_user_id;

    const bumpRes = await query(
      "select * from products where owner_user_id = $1 and type = $2 and active = true order by created_at desc",
      [ownerUserId, "bump"]
    );
    const bumpRows = bumpRes.rows || [];

    const bumpIds = bumpRows.map((row) => row.id);
    let bumpRuleMap = new Map();
    if (bumpIds.length) {
      const ruleRes = await query(
        "select bump_id, apply_to_all, trigger_product_ids from order_bump_rules where owner_user_id = $1 and bump_id = any($2::uuid[])",
        [ownerUserId, bumpIds]
      );
      bumpRuleMap = new Map(
        (ruleRes.rows || []).map((row) => [
          row.bump_id,
          {
            apply_to_all: row.apply_to_all !== false,
            trigger_product_ids: Array.isArray(row.trigger_product_ids) ? row.trigger_product_ids : [],
          },
        ])
      );
    }

    const upsellRes = await query(
      "select * from products where owner_user_id = $1 and type = $2 and active = true order by created_at desc",
      [ownerUserId, "upsell"]
    );
    const shippingRes = await query(
      `select id, owner_user_id, name, price_cents, min_order_cents, min_days, max_days, description, is_default, is_active
         from shipping_methods
        where owner_user_id = $1
          and is_active = true
        order by is_default desc, price_cents asc, created_at asc`,
      [ownerUserId]
    );

    const bumps = bumpRows.filter((bump) => {
      const rule = bumpRuleMap.get(bump.id);
      if (!rule) {
        return false;
      }
      if (rule.apply_to_all !== false) {
        return true;
      }
      return Array.isArray(rule.trigger_product_ids) && rule.trigger_product_ids.includes(baseProduct.id);
    });

    res.json({
      base: baseProduct,
      bumps: bumps.map((bump) => ({
        ...bump,
        bump_rule: bumpRuleMap.get(bump.id) || null,
      })),
      upsells: upsellRes.rows || [],
      shipping: (shippingRes.rows || []).map((row) => ({
        id: row.id,
        owner_user_id: row.owner_user_id,
        name: row.name || "",
        description: row.description || "",
        price_cents: Number(row.price_cents) || 0,
        min_order_cents: Number(row.min_order_cents) || 0,
        min_days: Number(row.min_days) || 0,
        max_days: Number(row.max_days) || 0,
        is_default: row.is_default === true,
        is_active: row.is_active !== false,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
