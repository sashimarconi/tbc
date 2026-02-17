const { query } = require("../../lib/db");
const { ensureIntegrationsSchema } = require("../../lib/ensure-integrations");
const { resolvePublicOwnerContext } = require("../../lib/public-owner-context");

function sanitizeProvider(value) {
  const provider = String(value || "")
    .trim()
    .toLowerCase();
  return ["meta", "tiktok", "utmify"].includes(provider) ? provider : "";
}

function sanitizePublicConfig(provider, configValue) {
  const config = configValue && typeof configValue === "object" ? { ...configValue } : {};
  if (provider === "meta" || provider === "tiktok") {
    return {
      pixel_id: typeof config.pixel_id === "string" ? config.pixel_id.trim() : "",
      test_event_code: typeof config.test_event_code === "string" ? config.test_event_code.trim() : "",
    };
  }
  if (provider === "utmify") {
    return {
      fire_on_order_created: config.fire_on_order_created !== false,
      fire_only_when_paid: config.fire_only_when_paid === true,
      fire_on_paid: config.fire_on_paid !== false,
    };
  }
  return {};
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await ensureIntegrationsSchema();
    const slug = String(req.query?.slug || "").trim();
    if (!slug) {
      res.status(400).json({ error: "Missing slug" });
      return;
    }
    const ownerContext = await resolvePublicOwnerContext(req, slug, { activeOnlyBase: true });
    const ownerUserId = ownerContext?.ownerUserId;
    if (!ownerUserId) {
      res.status(404).json({ error: "Checkout nao encontrado" });
      return;
    }

    const providerFilter = sanitizeProvider(req.query?.provider);
    const params = [ownerUserId];
    let sql = `select id, provider, name, is_active, config
               from user_integrations
               where owner_user_id = $1 and is_active = true`;
    if (providerFilter) {
      params.push(providerFilter);
      sql += " and provider = $2";
    }
    sql += " order by provider asc, updated_at desc";
    const result = await query(sql, params);
    const integrations = (result.rows || []).map((row) => ({
      id: row.id,
      provider: row.provider,
      name: row.name || "",
      is_active: row.is_active !== false,
      config: sanitizePublicConfig(row.provider, row.config),
    }));
    res.json({ integrations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


