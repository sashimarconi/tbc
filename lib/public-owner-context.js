const { query } = require("./db");
const { ensureProductSchema } = require("./ensure-products");
const { ensureCustomDomainsTable, normalizeCustomDomain } = require("./ensure-custom-domains");

function getRequestHost(req) {
  const forwardedHost = req?.headers?.["x-forwarded-host"];
  const directHost = req?.headers?.host;
  const rawHost = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || directHost || "";
  const host = String(rawHost).split(",")[0].trim().toLowerCase();
  return normalizeCustomDomain(host);
}

async function resolveDomainOwner(host) {
  if (!host) {
    return null;
  }
  await ensureCustomDomainsTable();
  const result = await query(
    "select owner_user_id from custom_domains where domain = $1 and is_verified = true limit 1",
    [host]
  );
  return result.rows?.[0]?.owner_user_id || null;
}

async function resolveBaseBySlug(slug, ownerUserId = null, activeOnly = true) {
  if (!slug) {
    return null;
  }
  const params = [slug];
  let sql = "select * from products where slug = $1 and type = 'base'";
  if (activeOnly) {
    sql += " and active = true";
  }
  if (ownerUserId) {
    params.push(ownerUserId);
    sql += ` and owner_user_id = $${params.length}`;
  }
  sql += " order by created_at desc limit 1";
  const result = await query(sql, params);
  return result.rows?.[0] || null;
}

async function resolvePublicOwnerContext(req, slug, options = {}) {
  const { activeOnlyBase = true } = options;
  await ensureProductSchema();

  const host = getRequestHost(req);
  const domainOwnerUserId = await resolveDomainOwner(host);
  const normalizedSlug = String(slug || "").trim();

  if (!normalizedSlug) {
    return {
      host,
      domainOwnerUserId,
      ownerUserId: domainOwnerUserId || null,
      baseProduct: null,
    };
  }

  const baseProduct = await resolveBaseBySlug(normalizedSlug, domainOwnerUserId, activeOnlyBase);
  if (!baseProduct) {
    return null;
  }

  return {
    host,
    domainOwnerUserId,
    ownerUserId: baseProduct.owner_user_id || null,
    baseProduct,
  };
}

module.exports = {
  getRequestHost,
  resolvePublicOwnerContext,
};

