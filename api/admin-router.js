const { query } = require("../lib/db");
const { parseJson } = require("../lib/parse-json");
const { requireAuth } = require("../lib/auth");
const { ensureSalesTables } = require("../lib/ensure-sales");
const {
  ensureProductSchema,
  ensureBaseSlugs,
  generateUniqueSlug,
} = require("../lib/ensure-products");
const { saveProductFile } = require("../lib/product-files");
const { ensurePaymentGatewayTable } = require("../lib/ensure-payment-gateway");
const { encryptText } = require("../lib/credentials-crypto");
const authHandler = require("./auth/[[...path]]");

function deepMerge(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? override.slice() : base.slice();
  }

  const baseIsObject = base && typeof base === "object";
  const overrideIsObject = override && typeof override === "object";

  if (!baseIsObject) {
    if (Array.isArray(override)) {
      return override.slice();
    }
    if (overrideIsObject) {
      return { ...override };
    }
    return override !== undefined ? override : base;
  }

  const result = { ...base };
  if (!overrideIsObject || Array.isArray(override)) {
    return result;
  }

  Object.keys(override).forEach((key) => {
    const nextOverride = override[key];
    const nextBase = result[key];
    if (
      nextOverride &&
      typeof nextOverride === "object" &&
      !Array.isArray(nextOverride) &&
      nextBase &&
      typeof nextBase === "object" &&
      !Array.isArray(nextBase)
    ) {
      result[key] = deepMerge(nextBase, nextOverride);
      return;
    }
    result[key] = Array.isArray(nextOverride) ? nextOverride.slice() : nextOverride;
  });

  return result;
}

function normalizeBumpRule(rule) {
  if (!rule || typeof rule !== "object") {
    return null;
  }
  const applyAll = rule.apply_to_all !== false;
  const triggers = Array.isArray(rule.trigger_product_ids)
    ? rule.trigger_product_ids.filter(Boolean)
    : [];
  return {
    apply_to_all: applyAll,
    trigger_product_ids: applyAll ? [] : triggers,
  };
}

function normalizeItemPayload(body = {}) {
  const formFactor = body.form_factor === "digital" ? "digital" : "physical";
  const requiresAddress =
    body.requires_address === undefined ? formFactor !== "digital" : Boolean(body.requires_address);
  const bumpRule = normalizeBumpRule(body.bump_rule);

  return {
    type: body.type,
    name: body.name,
    description: body.description || "",
    price_cents: Number(body.price_cents || 0),
    compare_price_cents:
      body.compare_price_cents === undefined ||
      body.compare_price_cents === null ||
      body.compare_price_cents === ""
        ? null
        : Number(body.compare_price_cents),
    active: body.active !== false,
    sort: Number(body.sort || 0),
    image_url: body.image_url || "",
    form_factor: formFactor,
    requires_address: requiresAddress,
    weight_grams: Number(body.weight_grams || 0),
    length_cm: Number(body.length_cm || 0),
    width_cm: Number(body.width_cm || 0),
    height_cm: Number(body.height_cm || 0),
    bump_rule: bumpRule,
  };
}

function mapRuleRow(row) {
  if (!row) {
    return null;
  }
  return {
    apply_to_all: row.apply_to_all !== false,
    trigger_product_ids: Array.isArray(row.trigger_product_ids) ? row.trigger_product_ids : [],
  };
}

async function fetchBumpRulesFor(ownerUserId, ids = []) {
  if (!ids.length) {
    return new Map();
  }
  const res = await query(
    "select bump_id, apply_to_all, trigger_product_ids from order_bump_rules where owner_user_id = $1 and bump_id = any($2::uuid[])",
    [ownerUserId, ids]
  );
  const map = new Map();
  res.rows?.forEach((row) => {
    map.set(row.bump_id, mapRuleRow(row));
  });
  return map;
}

async function getBumpRule(ownerUserId, bumpId) {
  if (!bumpId) {
    return null;
  }
  const res = await query(
    "select bump_id, apply_to_all, trigger_product_ids from order_bump_rules where owner_user_id = $1 and bump_id = $2",
    [ownerUserId, bumpId]
  );
  return mapRuleRow(res.rows?.[0]);
}

async function upsertBumpRule(ownerUserId, bumpId, rule) {
  if (!bumpId) {
    return;
  }
  if (!rule) {
    await query("delete from order_bump_rules where owner_user_id = $1 and bump_id = $2", [ownerUserId, bumpId]);
    return;
  }

  const applyAll = rule.apply_to_all !== false;
  const triggers = applyAll
    ? []
    : (Array.isArray(rule.trigger_product_ids) ? rule.trigger_product_ids.filter(Boolean) : []);

  await query(
    `insert into order_bump_rules (bump_id, owner_user_id, apply_to_all, trigger_product_ids, updated_at)
     values ($1, $2, $3, $4, now())
     on conflict (bump_id)
     do update set owner_user_id = excluded.owner_user_id,
                  apply_to_all = excluded.apply_to_all,
                  trigger_product_ids = excluded.trigger_product_ids,
                  updated_at = now()`,
    [bumpId, ownerUserId, applyAll, triggers]
  );
}

async function ensureThemesAndAppearanceSchema() {
  await query(`
    create table if not exists checkout_themes (
      id serial primary key,
      key text unique not null,
      name text not null,
      description text,
      preview_image text,
      defaults jsonb not null,
      created_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists checkout_appearance (
      id serial primary key,
      owner_user_id uuid not null references users(id) on delete cascade,
      theme_key text not null references checkout_themes(key),
      overrides jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now(),
      unique(owner_user_id)
    )
  `);

  const minimalDefaults = {
    palette: {
      primary: "#f5a623",
      buttons: "#f39c12",
      background: "#f4f6fb",
      text: "#1c2431",
      card: "#ffffff",
      border: "#dde3ee",
    },
    typography: { fontFamily: "Poppins" },
    radius: {
      cards: "16px",
      buttons: "14px",
      fields: "12px",
      steps: "999px",
    },
    header: {
      style: "logo+texto",
      centerLogo: false,
      logoUrl: "/assets/logo-blackout.png",
      logoWidthPx: 120,
      logoHeightPx: 40,
      bgColor: "#ffffff",
      textColor: "#0f5132",
    },
    securitySeal: {
      enabled: true,
      style: "padrao_bolinha_texto",
      text: "Pagamento 100% seguro",
      size: "medio",
      textColor: "#0f5132",
      bgColor: "#f5f7fb",
      iconColor: "#1d9f55",
      radius: "arredondado",
    },
    effects: {
      primaryButton: { animation: "none", speed: "normal" },
      secondaryButton: { animation: "none", speed: "normal" },
    },
    settings: {
      fields: { fullName: true, email: true, phone: true, cpf: true, custom: [] },
      i18n: { language: "pt-BR", currency: "BRL" },
    },
  };

  await query(
    `insert into checkout_themes (key, name, description, defaults)
     values ($1, $2, $3, $4::jsonb)
     on conflict (key) do nothing`,
    ["solarys", "Solarys", "Tema Solarys", JSON.stringify(minimalDefaults)]
  );

  await query(
    `insert into checkout_themes (key, name, description, defaults)
     values ($1, $2, $3, $4::jsonb)
     on conflict (key) do nothing`,
    [
      "minimal",
      "Minimal",
      "Tema Minimal",
      JSON.stringify({
        ...minimalDefaults,
        palette: {
          primary: "#111827",
          buttons: "#111827",
          background: "#f8fafc",
          text: "#0f172a",
          card: "#ffffff",
          border: "#e2e8f0",
        },
        typography: { fontFamily: "Inter" },
      }),
    ]
  );

  await query(
    `insert into checkout_themes (key, name, description, defaults)
     values ($1, $2, $3, $4::jsonb)
     on conflict (key) do nothing`,
    [
      "dark",
      "Dark",
      "Tema escuro",
      JSON.stringify({
        ...minimalDefaults,
        palette: {
          primary: "#22c55e",
          buttons: "#16a34a",
          background: "#0b1020",
          text: "#e2e8f0",
          card: "#111827",
          border: "#24314b",
        },
        typography: { fontFamily: "Montserrat" },
      }),
    ]
  );
}

async function getThemeByKey(key) {
  const result = await query("select * from checkout_themes where key = $1 limit 1", [key]);
  return result.rows?.[0] || null;
}

async function getOrCreateAppearance(ownerUserId) {
  await ensureThemesAndAppearanceSchema();

  let appearanceResult = await query(
    "select * from checkout_appearance where owner_user_id = $1 limit 1",
    [ownerUserId]
  );

  if (!appearanceResult.rows?.length) {
    await query(
      "insert into checkout_appearance (owner_user_id, theme_key, overrides, updated_at) values ($1, 'solarys', '{}'::jsonb, now())",
      [ownerUserId]
    );
    appearanceResult = await query(
      "select * from checkout_appearance where owner_user_id = $1 limit 1",
      [ownerUserId]
    );
  }

  const appearance = appearanceResult.rows?.[0];
  const theme = (await getThemeByKey(appearance.theme_key)) || (await getThemeByKey("solarys"));
  const effectiveConfig = deepMerge(theme?.defaults || {}, appearance?.overrides || {});

  return {
    appearance,
    theme,
    effectiveConfig,
  };
}

async function handleThemes(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await ensureThemesAndAppearanceSchema();
    const result = await query(
      "select id, key, name, description, preview_image, defaults, created_at from checkout_themes order by id asc"
    );
    res.json({ themes: result.rows || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handleAppearance(req, res, user) {
  try {
    if (req.method === "GET") {
      const data = await getOrCreateAppearance(user.id);
      res.json({
        theme_key: data.appearance.theme_key,
        overrides: data.appearance.overrides || {},
        effectiveConfig: data.effectiveConfig || {},
        updated_at: data.appearance.updated_at,
      });
      return;
    }

    if (req.method === "POST") {
      const body = await parseJson(req);
      const themeKey = (body.theme_key || "solarys").toString();
      const overrides = body.overrides && typeof body.overrides === "object" ? body.overrides : {};

      await ensureThemesAndAppearanceSchema();
      const theme = await getThemeByKey(themeKey);
      if (!theme) {
        res.status(400).json({ error: "Tema invalido" });
        return;
      }

      await query(
        `insert into checkout_appearance (owner_user_id, theme_key, overrides, updated_at)
         values ($1, $2, $3::jsonb, now())
         on conflict (owner_user_id)
         do update set theme_key = excluded.theme_key,
                       overrides = excluded.overrides,
                       updated_at = now()`,
        [user.id, themeKey, JSON.stringify(overrides)]
      );

      const saved = await getOrCreateAppearance(user.id);
      res.json({
        ok: true,
        theme_key: saved.appearance.theme_key,
        overrides: saved.appearance.overrides || {},
        effectiveConfig: saved.effectiveConfig || {},
      });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handleItems(req, res, user) {
  await ensureProductSchema();
  const { id } = req.query || {};

  if (req.method === "GET") {
    try {
      await ensureBaseSlugs(user.id);
      const result = await query(
        "select * from products where owner_user_id = $1 order by type asc, sort asc, created_at asc",
        [user.id]
      );
      const items = result.rows || [];
      const bumpIds = items.filter((item) => item.type === "bump").map((item) => item.id);
      const rulesMap = await fetchBumpRulesFor(user.id, bumpIds);
      const enriched = items.map((item) =>
        item.type === "bump"
          ? {
              ...item,
              bump_rule: rulesMap.get(item.id) || {
                apply_to_all: true,
                trigger_product_ids: [],
              },
            }
          : item
      );
      res.json({ items: enriched });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  if (req.method === "POST") {
    const item = normalizeItemPayload(await parseJson(req));
    if (!item.type || !item.name) {
      res.status(400).json({ error: "Missing type or name" });
      return;
    }

    try {
      const slug = item.type === "base" ? await generateUniqueSlug() : null;
      const result = await query(
        `insert into products (
           owner_user_id,
           type,
           name,
           description,
           price_cents,
           compare_price_cents,
           active,
           sort,
           image_url,
           slug,
           form_factor,
           requires_address,
           weight_grams,
           length_cm,
           width_cm,
           height_cm
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning *`,
        [
          user.id,
          item.type,
          item.name,
          item.description,
          item.price_cents,
          item.compare_price_cents,
          item.active,
          item.sort,
          item.image_url,
          slug,
          item.form_factor,
          item.requires_address,
          item.weight_grams,
          item.length_cm,
          item.width_cm,
          item.height_cm,
        ]
      );
      const saved = result.rows[0];
      if (saved?.type === "bump") {
        await upsertBumpRule(user.id, saved.id, item.bump_rule);
        saved.bump_rule = await getBumpRule(user.id, saved.id);
      }
      res.json({ item: saved });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  if (req.method === "PUT") {
    const updates = normalizeItemPayload(await parseJson(req));
    try {
      const result = await query(
        `update products set
           type = $1,
           name = $2,
           description = $3,
           price_cents = $4,
           compare_price_cents = $5,
           active = $6,
           sort = $7,
           image_url = $8,
           form_factor = $9,
           requires_address = $10,
           weight_grams = $11,
           length_cm = $12,
           width_cm = $13,
           height_cm = $14
         where id = $15 and owner_user_id = $16 returning *`,
        [
          updates.type,
          updates.name,
          updates.description,
          updates.price_cents,
          updates.compare_price_cents,
          updates.active,
          updates.sort,
          updates.image_url,
          updates.form_factor,
          updates.requires_address,
          updates.weight_grams,
          updates.length_cm,
          updates.width_cm,
          updates.height_cm,
          id,
          user.id,
        ]
      );
      const saved = result.rows[0];
      if (!saved) {
        res.status(404).json({ error: "Item not found" });
        return;
      }

      if (saved.type === "bump") {
        await upsertBumpRule(user.id, saved.id, updates.bump_rule);
        saved.bump_rule = await getBumpRule(user.id, saved.id);
      } else {
        await upsertBumpRule(user.id, saved.id, null);
      }
      res.json({ item: saved });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      await query("delete from products where id = $1 and owner_user_id = $2", [id, user.id]);
      await query("delete from order_bump_rules where bump_id = $1 and owner_user_id = $2", [id, user.id]);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}

async function handleOrders(req, res, user) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { id } = req.query || {};

  try {
    await ensureSalesTables();

    if (id) {
      const detail = await query(
        "select * from checkout_orders where id = $1 and owner_user_id = $2 limit 1",
        [id, user.id]
      );
      if (!detail.rows?.length) {
        res.status(404).json({ error: "Order not found" });
        return;
      }
      res.json({ order: detail.rows[0] });
      return;
    }

    const [ordersResult, statsResult] = await Promise.all([
      query(
        `select id, cart_key, customer, summary, status, pix, created_at
         from checkout_orders
         where owner_user_id = $1
         order by created_at desc
         limit 150`,
        [user.id]
      ),
      query(
        `select
           count(*) as total,
           count(*) filter (where status = 'pending') as pending,
           count(*) filter (where status = 'paid') as paid,
           coalesce(sum(total_cents),0) as total_amount
         from checkout_orders
         where owner_user_id = $1`,
        [user.id]
      ),
    ]);

    res.json({
      orders: ordersResult.rows || [],
      stats: statsResult.rows?.[0] || { total: 0, pending: 0, paid: 0, total_amount: 0 },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handleCarts(req, res, user) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { id } = req.query || {};

  try {
    await ensureSalesTables();

    if (id) {
      const detail = await query(
        "select * from checkout_carts where id = $1 and owner_user_id = $2 limit 1",
        [id, user.id]
      );
      if (!detail.rows?.length) {
        res.status(404).json({ error: "Cart not found" });
        return;
      }
      res.json({ cart: detail.rows[0] });
      return;
    }

    const [cartsResult, statsResult] = await Promise.all([
      query(
        `select id, cart_key, customer, summary, stage, status, total_cents, last_seen, created_at
         from checkout_carts
         where owner_user_id = $1
         order by last_seen desc
         limit 200`,
        [user.id]
      ),
      query(
        `select
           count(*) as total,
           count(*) filter (where status = 'open') as open,
           count(*) filter (where status = 'converted') as converted,
           coalesce(sum(total_cents),0) as total_value
         from checkout_carts
         where owner_user_id = $1`,
        [user.id]
      ),
    ]);

    res.json({
      carts: cartsResult.rows || [],
      stats: statsResult.rows?.[0] || { total: 0, open: 0, converted: 0, total_value: 0 },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handleUploads(req, res, user) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const body = await parseJson(req);
    if (!body?.data_url) {
      res.status(400).json({ error: "Missing data_url" });
      return;
    }
    const file = await saveProductFile({
      ownerUserId: user.id,
      dataUrl: body.data_url,
      filename: body.filename || null,
    });
    res.json({ file });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

function maskKey(value = "") {
  if (!value) return "";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}********${value.slice(-4)}`;
}

async function handlePaymentSettings(req, res, user) {
  try {
    await ensurePaymentGatewayTable();

    if (req.method === "GET") {
      const result = await query(
        `select provider, api_url, is_active, updated_at
         from user_payment_gateways
         where owner_user_id = $1 and provider = 'sealpay'
         limit 1`,
        [user.id]
      );
      const row = result.rows?.[0];
      res.json({
        provider: "sealpay",
        api_url: row?.api_url || "",
        is_active: row?.is_active !== false,
        has_api_key: Boolean(row),
        masked_api_key: row ? "********" : "",
        updated_at: row?.updated_at || null,
      });
      return;
    }

    if (req.method === "POST") {
      const body = await parseJson(req);
      const provider = "sealpay";
      const apiUrl = String(body.api_url || "").trim();
      const apiKey = String(body.api_key || "").trim();
      const isActive = body.is_active !== false;

      if (!apiUrl) {
        res.status(400).json({ error: "api_url obrigatorio" });
        return;
      }

      const currentRes = await query(
        `select api_key_encrypted
         from user_payment_gateways
         where owner_user_id = $1 and provider = $2
         limit 1`,
        [user.id, provider]
      );
      const currentEncrypted = currentRes.rows?.[0]?.api_key_encrypted || "";

      let encryptedKey = currentEncrypted;
      if (apiKey) {
        encryptedKey = encryptText(apiKey);
      }

      if (!encryptedKey) {
        res.status(400).json({ error: "api_key obrigatoria na primeira configuracao" });
        return;
      }

      await query(
        `insert into user_payment_gateways (owner_user_id, provider, api_url, api_key_encrypted, is_active, updated_at)
         values ($1, $2, $3, $4, $5, now())
         on conflict (owner_user_id, provider)
         do update set
           api_url = excluded.api_url,
           api_key_encrypted = excluded.api_key_encrypted,
           is_active = excluded.is_active,
           updated_at = now()`,
        [user.id, provider, apiUrl, encryptedKey, isActive]
      );

      res.json({
        ok: true,
        provider,
        api_url: apiUrl,
        is_active: isActive,
        has_api_key: true,
        masked_api_key: apiKey ? maskKey(apiKey) : "********",
      });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function getPathSegments(req) {
  const raw = req.query?.path;
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === "string" && raw.length > 0) {
    return raw.split("/").filter(Boolean);
  }
  const url = req.url || "";
  const cleaned = url.split("?")[0].replace(/^\/api\/admin\/?/, "");
  if (!cleaned) {
    return [];
  }
  return cleaned.split("/").filter(Boolean);
}

module.exports = async (req, res) => {
  const segments = getPathSegments(req);
  const path = segments[0] || "";

  if (segments.length > 1 && !req.query.id) {
    req.query.id = segments[1];
  }

  if (path === "login") {
    req.query = req.query || {};
    req.query.path = ["login"];
    await authHandler(req, res);
    return;
  }

  const user = requireAuth(req, res);
  if (!user) {
    return;
  }

  switch (path) {
    case "items":
      await handleItems(req, res, user);
      return;
    case "orders":
      await handleOrders(req, res, user);
      return;
    case "carts":
      await handleCarts(req, res, user);
      return;
    case "uploads":
      await handleUploads(req, res, user);
      return;
    case "themes":
      await handleThemes(req, res);
      return;
    case "appearance":
      await handleAppearance(req, res, user);
      return;
    case "payment-settings":
      await handlePaymentSettings(req, res, user);
      return;
    default:
      res.status(404).json({ error: "Not found" });
  }
};
