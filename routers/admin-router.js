const { query } = require("../lib/db");
const { parseJson } = require("../lib/parse-json");
const { requireAuth } = require("../lib/auth");
const { ensureSalesTables } = require("../lib/ensure-sales");
const {
  ensureProductSchema,
  ensureBaseSlugs,
  generateUniqueSlug,
} = require("../lib/ensure-products");
const { saveProductFile, saveProductFileBuffer } = require("../lib/product-files");
const { ensurePaymentGatewayTable } = require("../lib/ensure-payment-gateway");
const { encryptText } = require("../lib/credentials-crypto");
const { ensureIntegrationsSchema } = require("../lib/ensure-integrations");
const { dispatchUtmifyEvent } = require("../lib/utmify");
const { ensureAnalyticsTables } = require("../lib/ensure-analytics");
const { ensureShippingMethodsTable } = require("../lib/ensure-shipping-methods");
const {
  ensureCustomDomainsTable,
  normalizeCustomDomain,
  isValidCustomDomain,
} = require("../lib/ensure-custom-domains");
const { addProjectDomain, verifyProjectDomain, removeProjectDomain } = require("../lib/vercel-domains");
const DEFAULT_SEALPAY_API_URL =
  process.env.SEALPAY_API_URL || "https://abacate-5eo1.onrender.com/create-pix";
const DASHBOARD_TZ = process.env.DASHBOARD_TZ || "America/Sao_Paulo";
const LOGO_MAX_BYTES = Number(process.env.LOGO_UPLOAD_MAX_BYTES || 4 * 1024 * 1024);
const LOGO_MAX_MB_LABEL = `${Math.round(LOGO_MAX_BYTES / (1024 * 1024))}MB`;
const authHandler = require("../api/auth/[[...path]]");
const analyticsHandler = require("../api/analytics/[[...path]]");

function resolvePeriodFilter(periodRaw) {
  const period = String(periodRaw || "today").trim().toLowerCase();
  if (period === "7d") {
    return {
      sql: "and created_at >= now() - interval '7 days'",
      params: [],
    };
  }
  if (period === "30d") {
    return {
      sql: "and created_at >= now() - interval '30 days'",
      params: [],
    };
  }
  return {
    sql: "and created_at >= (date_trunc('day', now() at time zone $2) at time zone $2)",
    params: [DASHBOARD_TZ],
  };
}

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

function normalizeThemeDefaults(defaults = {}) {
  const next = deepMerge(
    {
      palette: {
        primary: "#f5a623",
        button: "#f39c12",
        buttons: "#f39c12",
        background: "#f4f6fb",
        text: "#1c2431",
        card: "#ffffff",
        border: "#dde3ee",
        muted: "#6b7280",
      },
      typography: { fontFamily: "Poppins", headingWeight: 700, bodyWeight: 500, baseSize: 16 },
      radius: { card: "16px", button: "14px", field: "12px", cards: "16px", buttons: "14px", fields: "12px" },
      header: {},
      securitySeal: {},
      effects: {
        primaryButton: { animation: "none", speed: "normal" },
        secondaryButton: { animation: "none", speed: "normal" },
      },
      settings: {
        fields: { fullName: true, email: true, phone: true, cpf: true, custom: [] },
        i18n: { language: "pt-BR", currency: "BRL" },
      },
      layout: { type: "singleColumn" },
      ui: { variant: "solarys" },
      elements: {
        showCountrySelector: true,
        showProductImage: true,
        showOrderBumps: true,
        showShipping: true,
        showFooterSecurityText: true,
        order: ["header", "country", "offer", "form", "bumps", "shipping", "payment", "footer"],
      },
    },
    defaults
  );

  if (!next.header || typeof next.header !== "object") {
    next.header = {};
  }
  if (!next.header.style || !["logo", "texto", "logo+texto"].includes(next.header.style)) {
    next.header.style = "logo";
  }
  if (typeof next.header.text !== "string") {
    next.header.text = "";
  }
  if (!next.layout || typeof next.layout !== "object") {
    next.layout = { type: "singleColumn" };
  }
  if (!next.layout.type) {
    next.layout.type = "singleColumn";
  }
  if (!next.ui || typeof next.ui !== "object") {
    next.ui = { variant: "solarys" };
  }
  if (!next.ui.variant) {
    next.ui.variant = "solarys";
  }
  if (!next.palette.button && next.palette.buttons) {
    next.palette.button = next.palette.buttons;
  }
  if (!next.palette.buttons && next.palette.button) {
    next.palette.buttons = next.palette.button;
  }
  next.radius.card = next.radius.card || next.radius.cards || "16px";
  next.radius.button = next.radius.button || next.radius.buttons || "14px";
  next.radius.field = next.radius.field || next.radius.fields || "12px";
  return next;
}

function readRawBody(req, maxBytes = LOGO_MAX_BYTES + 512 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error(`Arquivo excede o limite de ${LOGO_MAX_MB_LABEL}`));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseMultipartFile(bodyBuffer, boundary, fieldName = "logo") {
  const boundaryText = `--${boundary}`;
  const raw = bodyBuffer.toString("binary");
  const parts = raw.split(boundaryText);

  for (const part of parts) {
    if (!part || part === "--\r\n" || part === "--") continue;
    const [headersRaw, bodyRawWithSuffix] = part.split("\r\n\r\n");
    if (!headersRaw || !bodyRawWithSuffix) continue;
    const headers = headersRaw.toLowerCase();
    if (!headers.includes(`name=\"${fieldName}\"`)) continue;
    if (!headers.includes("filename=\"")) continue;

    const filenameMatch = /filename=\"([^\"]*)\"/i.exec(headersRaw);
    const mimeMatch = /content-type:\s*([^\r\n;]+)/i.exec(headersRaw);
    const filename = filenameMatch?.[1] || "logo";
    const mimeType = (mimeMatch?.[1] || "").trim().toLowerCase();

    const cleanedBody = bodyRawWithSuffix.replace(/\r\n--$/, "").replace(/\r\n$/, "");
    const fileBuffer = Buffer.from(cleanedBody, "binary");
    if (!fileBuffer.length) {
      throw new Error("Arquivo vazio");
    }

    return {
      filename,
      mimeType,
      buffer: fileBuffer,
    };
  }

  throw new Error("Arquivo de logo nao encontrado no campo 'logo'");
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

function sanitizeProductRow(row) {
  if (!row || typeof row !== "object") {
    return row;
  }
  const { sort, display_order, vitrine_order, ...safe } = row;
  return safe;
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

  const baseDefaults = normalizeThemeDefaults({
    palette: {
      primary: "#f5a623",
      button: "#f39c12",
      background: "#f4f6fb",
      text: "#1c2431",
      card: "#ffffff",
      border: "#dde3ee",
      muted: "#6b7280",
    },
    typography: { fontFamily: "Poppins", headingWeight: 700, bodyWeight: 500, baseSize: 16 },
    radius: {
      card: "16px",
      button: "14px",
      field: "12px",
      steps: "999px",
    },
    header: {
      style: "logo",
      text: "",
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
    ui: { variant: "solarys" },
  });

  const ensureTheme = async (key, name, description, defaults) => {
    const exists = await query("select id from checkout_themes where key = $1 limit 1", [key]);
    if (exists.rows?.length) return;
    await query(
      `insert into checkout_themes (key, name, description, defaults)
       values ($1, $2, $3, $4::jsonb)`,
      [key, name, description, defaults]
    );
  };

  await ensureTheme("solarys", "Solarys", "Tema Solarys", JSON.stringify(baseDefaults));

  await ensureTheme(
    "minimal",
    "Minimal",
    "Tema Minimal",
    JSON.stringify(
      normalizeThemeDefaults({
        ...baseDefaults,
        palette: {
          primary: "#111827",
          button: "#111827",
          background: "#f8fafc",
          text: "#0f172a",
          card: "#ffffff",
          border: "#e2e8f0",
          muted: "#64748b",
        },
        typography: { fontFamily: "Inter", headingWeight: 700, bodyWeight: 500, baseSize: 16 },
        radius: { card: "12px", button: "10px", field: "10px", steps: "10px" },
        ui: { variant: "minimal" },
      })
    )
  );

  await ensureTheme(
    "dark",
    "Dark",
    "Tema escuro",
    JSON.stringify(
      normalizeThemeDefaults({
        ...baseDefaults,
        palette: {
          primary: "#22c55e",
          button: "#16a34a",
          background: "#0b1020",
          text: "#e2e8f0",
          card: "#111827",
          border: "#24314b",
          muted: "#9aa5b8",
        },
        typography: { fontFamily: "Montserrat", headingWeight: 700, bodyWeight: 500, baseSize: 16 },
        radius: { card: "18px", button: "14px", field: "12px", steps: "999px" },
        header: {
          ...baseDefaults.header,
          centerLogo: true,
          bgColor: "#0b1020",
          textColor: "#e2e8f0",
        },
        ui: { variant: "dark" },
      })
    )
  );

  await ensureTheme(
    "mercadex",
    "Mercadex",
    "Estilo marketplace claro e confiavel.",
    JSON.stringify(
      normalizeThemeDefaults({
        ...baseDefaults,
        palette: {
          background: "#F5F6F8",
          card: "#ffffff",
          text: "#111318",
          mutedText: "#5B616E",
          border: "rgba(17,19,24,0.10)",
          primary: "#FFE600",
          primaryText: "#111318",
          primaryHover: "#FFD500",
          button: "#FFE600",
          link: "#2D68C4",
          linkHover: "#1F56AD",
          buttonSecondaryBg: "#EEF0F3",
          buttonSecondaryText: "#111318",
          success: "#00A650",
          warning: "#FFB020",
          danger: "#E53935",
        },
        typography: { fontFamily: "Inter", headingWeight: 700, bodyWeight: 500, baseSize: 16 },
        radius: { card: "16px", button: "14px", field: "12px", steps: "999px" },
        header: { ...baseDefaults.header, bgColor: "#FFE600", textColor: "#111318", logoUrl: "" },
        securitySeal: {
          ...baseDefaults.securitySeal,
          enabled: true,
          style: "somente_texto",
          text: "Ambiente seguro",
          size: "medio",
          bgColor: "rgba(17,19,24,0.08)",
          textColor: "#111318",
          radius: "arredondado",
        },
        layout: { type: "twoColumn" },
        ui: { variant: "mercadex" },
      })
    )
  );

  await ensureTheme(
    "tiktex",
    "TikTex",
    "E-commerce social moderno com contraste forte.",
    JSON.stringify(
      normalizeThemeDefaults({
        ...baseDefaults,
        palette: {
          primary: "#9f5bff",
          button: "#ff375f",
          background: "#0b0b13",
          text: "#f8f9ff",
          card: "#111220",
          border: "#2f3258",
          muted: "#b0b6dc",
        },
        typography: { fontFamily: "Montserrat", headingWeight: 800, bodyWeight: 500, baseSize: 16 },
        radius: { card: "18px", button: "16px", field: "14px", steps: "999px" },
        header: { ...baseDefaults.header, bgColor: "#0f1020", textColor: "#f8f9ff", logoUrl: "" },
        securitySeal: {
          ...baseDefaults.securitySeal,
          textColor: "#f8f9ff",
          bgColor: "#181a30",
          iconColor: "#9f5bff",
        },
        layout: { type: "twoColumn" },
        ui: { variant: "tiktex" },
      })
    )
  );

  await ensureTheme(
    "vegex",
    "Vegex",
    "Checkout minimal premium com tipografia forte.",
    JSON.stringify(
      normalizeThemeDefaults({
        ...baseDefaults,
        palette: {
          primary: "#24452e",
          button: "#1a1a16",
          background: "#f7f7f5",
          text: "#1a1a16",
          card: "#ffffff",
          border: "#dcdacf",
          muted: "#6f6b60",
        },
        typography: { fontFamily: "Plus Jakarta Sans", headingWeight: 800, bodyWeight: 500, baseSize: 16 },
        radius: { card: "22px", button: "999px", field: "14px", steps: "999px" },
        header: { ...baseDefaults.header, bgColor: "#ffffff", textColor: "#1a1a16", logoUrl: "" },
        securitySeal: {
          ...baseDefaults.securitySeal,
          textColor: "#1a1a16",
          bgColor: "#f0efe9",
          iconColor: "#24452e",
        },
        layout: { type: "singleColumn" },
        ui: { variant: "vegex" },
      })
    )
  );

  await query(`
    delete from checkout_themes t
    using checkout_themes d
    where t.key = d.key
      and t.id > d.id
  `);
  await query(`
    delete from checkout_appearance a
    using checkout_appearance b
    where a.owner_user_id = b.owner_user_id
      and a.id > b.id
  `);
  await query("create unique index if not exists checkout_themes_key_uidx on checkout_themes (key)");
  await query(
    "create unique index if not exists checkout_appearance_owner_uidx on checkout_appearance (owner_user_id)"
  );

  const themesResult = await query("select id, defaults from checkout_themes");
  for (const row of themesResult.rows || []) {
    const currentDefaults = row.defaults || {};
    const normalizedDefaults = normalizeThemeDefaults(currentDefaults);
    if (JSON.stringify(currentDefaults) !== JSON.stringify(normalizedDefaults)) {
      await query("update checkout_themes set defaults = $1::jsonb where id = $2", [
        JSON.stringify(normalizedDefaults),
        row.id,
      ]);
    }
  }
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

      const updateRes = await query(
        `update checkout_appearance
         set theme_key = $2,
             overrides = $3::jsonb,
             updated_at = now()
         where owner_user_id = $1
         returning id`,
        [user.id, themeKey, JSON.stringify(overrides)]
      );

      if (!updateRes.rows?.length) {
        await query(
          `insert into checkout_appearance (owner_user_id, theme_key, overrides, updated_at)
           values ($1, $2, $3::jsonb, now())`,
          [user.id, themeKey, JSON.stringify(overrides)]
        );
      }

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
        "select * from products where owner_user_id = $1 order by created_at desc",
        [user.id]
      );
      const items = result.rows || [];
      const bumpIds = items.filter((item) => item.type === "bump").map((item) => item.id);
      const rulesMap = await fetchBumpRulesFor(user.id, bumpIds);
      const enriched = items.map((rawItem) => {
        const item = sanitizeProductRow(rawItem);
        return item.type === "bump"
          ? {
              ...item,
              bump_rule: rulesMap.get(item.id) || {
                apply_to_all: true,
                trigger_product_ids: [],
              },
            }
          : item;
      });
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
           image_url,
           slug,
           form_factor,
           requires_address,
           weight_grams,
           length_cm,
           width_cm,
           height_cm
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning *`,
        [
          user.id,
          item.type,
          item.name,
          item.description,
          item.price_cents,
          item.compare_price_cents,
          item.active,
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
      const saved = sanitizeProductRow(result.rows[0]);
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
           image_url = $7,
           form_factor = $8,
           requires_address = $9,
           weight_grams = $10,
           length_cm = $11,
           width_cm = $12,
           height_cm = $13
         where id = $14 and owner_user_id = $15 returning *`,
        [
          updates.type,
          updates.name,
          updates.description,
          updates.price_cents,
          updates.compare_price_cents,
          updates.active,
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
      const saved = sanitizeProductRow(result.rows[0]);
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
    console.log("[dashboard/orders] filtering by owner_user_id", user.id);

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

    const periodFilter = resolvePeriodFilter(req.query?.period);
    const baseParams = [user.id, ...periodFilter.params];

    const [ordersResult, statsResult] = await Promise.all([
      query(
        `select id, cart_key, customer, items, summary, status, pix, total_cents, created_at
         from checkout_orders
         where owner_user_id = $1
           ${periodFilter.sql}
         order by created_at desc
         limit 150`,
        baseParams
      ),
      query(
        `select
           count(*) as total,
           count(*) filter (where status in ('waiting_payment','pending')) as pending,
           count(*) filter (where status = 'paid') as paid,
           count(*) filter (where status in ('refused','refunded','cancelled')) as failed,
           coalesce(sum(total_cents) filter (where status = 'paid'),0) as revenue_paid
         from checkout_orders
         where owner_user_id = $1
           ${periodFilter.sql}`,
        baseParams
      ),
    ]);

    const orders = (ordersResult.rows || []).map((row) => {
      const items = Array.isArray(row.items) ? row.items : [];
      const firstItem = items.find((item) => item && typeof item === "object") || null;
      return {
        ...row,
        product_name:
          firstItem?.name || row.summary?.product_name || row.summary?.title || "Produto",
      };
    });

    res.json({
      orders,
      stats: statsResult.rows?.[0] || { total: 0, pending: 0, paid: 0, failed: 0, revenue_paid: 0 },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handleRecentOrders(req, res, user) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await ensureSalesTables();
    console.log("[dashboard/recent-orders] filtering by owner_user_id", user.id);
    const result = await query(
      `select id, cart_key, customer, items, summary, status, pix, total_cents, created_at
       from checkout_orders
       where owner_user_id = $1
       order by created_at desc
       limit 10`,
      [user.id]
    );

    const orders = (result.rows || []).map((row) => {
      const items = Array.isArray(row.items) ? row.items : [];
      const firstItem = items.find((item) => item && typeof item === "object") || null;
      return {
        ...row,
        product_name:
          firstItem?.name || row.summary?.product_name || row.summary?.title || "Produto",
      };
    });
    res.json({ orders });
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

async function handleLogoUpload(req, res, user) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const contentType = String(req.headers["content-type"] || "");
    const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
    const boundary = boundaryMatch?.[1] || boundaryMatch?.[2];
    if (!contentType.includes("multipart/form-data") || !boundary) {
      res.status(400).json({ error: "Use multipart/form-data com o campo 'logo'" });
      return;
    }

    const body = await readRawBody(req);
    const file = parseMultipartFile(body, boundary, "logo");
    const saved = await saveProductFileBuffer({
      ownerUserId: user.id,
      buffer: file.buffer,
      mimeType: file.mimeType,
      filename: file.filename,
    });

    res.json({ ok: true, url: saved.url, file: saved });
  } catch (error) {
    res.status(400).json({ error: error.message || "Falha no upload do logo" });
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
        api_url: row?.api_url || DEFAULT_SEALPAY_API_URL,
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
      const apiUrl = String(body.api_url || "").trim() || DEFAULT_SEALPAY_API_URL;
      const apiKey = String(body.api_key || "").trim();
      const isActive = body.is_active !== false;

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

      const updateRes = await query(
        `update user_payment_gateways
         set api_url = $3,
             api_key_encrypted = $4,
             is_active = $5,
             updated_at = now()
         where owner_user_id = $1 and provider = $2
         returning id`,
        [user.id, provider, apiUrl, encryptedKey, isActive]
      );

      if (!updateRes.rows?.length) {
        await query(
          `insert into user_payment_gateways (owner_user_id, provider, api_url, api_key_encrypted, is_active, updated_at)
           values ($1, $2, $3, $4, $5, now())`,
          [user.id, provider, apiUrl, encryptedKey, isActive]
        );
      }

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

function normalizeIntegrationProvider(value) {
  const provider = String(value || "")
    .trim()
    .toLowerCase();
  return ["meta", "tiktok", "utmify"].includes(provider) ? provider : "";
}

function normalizeIntegrationPayload(body = {}) {
  const provider = normalizeIntegrationProvider(body.provider);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const isActive = body.is_active !== false;
  const rawConfig = body.config && typeof body.config === "object" && !Array.isArray(body.config) ? body.config : {};
  const config = { ...rawConfig };

  if (provider === "meta" || provider === "tiktok") {
    config.pixel_id = typeof config.pixel_id === "string" ? config.pixel_id.trim() : "";
    config.access_token = typeof config.access_token === "string" ? config.access_token.trim() : "";
    config.test_event_code = typeof config.test_event_code === "string" ? config.test_event_code.trim() : "";
  }

  if (provider === "utmify") {
    config.api_url = typeof config.api_url === "string" ? config.api_url.trim() : "";
    config.api_token = typeof config.api_token === "string" ? config.api_token.trim() : "";
    config.fire_on_order_created = config.fire_on_order_created !== false;
    config.fire_only_when_paid = config.fire_only_when_paid === true;
    config.fire_on_paid = config.fire_on_paid !== false;
  }

  return { provider, name, isActive, config };
}

function sanitizeIntegrationRow(row = {}) {
  const provider = row.provider;
  const config = row.config && typeof row.config === "object" ? { ...row.config } : {};
  if (provider !== "utmify") {
    delete config.api_token;
  }
  return {
    id: row.id,
    owner_user_id: row.owner_user_id,
    provider,
    name: row.name || "",
    is_active: row.is_active !== false,
    config,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function sanitizeShippingRow(row = {}) {
  return {
    id: row.id,
    tenantId: row.owner_user_id,
    storeId: row.owner_user_id,
    name: row.name || "",
    priceCents: Number(row.price_cents) || 0,
    minOrderCents: Number(row.min_order_cents) || 0,
    minDays: Number(row.min_days) || 0,
    maxDays: Number(row.max_days) || 0,
    description: row.description || "",
    isDefault: row.is_default === true,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeShippingNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.round(num));
}

function parseShippingPayload(body = {}) {
  const name = String(body.name || "").trim();
  const minDays = normalizeShippingNumber(body.minDays, 0);
  const maxDaysInput = normalizeShippingNumber(body.maxDays, 0);
  return {
    name,
    priceCents: normalizeShippingNumber(body.priceCents, 0),
    minOrderCents: normalizeShippingNumber(body.minOrderCents, 0),
    minDays,
    maxDays: Math.max(maxDaysInput, minDays),
    description: String(body.description || "").trim(),
    isDefault: body.isDefault === true,
    isActive: body.isActive !== false,
  };
}

async function handleShippingMethods(req, res, user) {
  try {
    await ensureShippingMethodsTable();
    const { id } = req.query || {};

    if (req.method === "GET") {
      const rows = await query(
        `select id, owner_user_id, name, price_cents, min_order_cents, min_days, max_days,
                description, is_default, is_active, created_at, updated_at
           from shipping_methods
          where owner_user_id = $1
          order by is_default desc, updated_at desc, created_at desc`,
        [user.id]
      );
      res.json({ shippingMethods: (rows.rows || []).map((row) => sanitizeShippingRow(row)) });
      return;
    }

    if (req.method === "POST") {
      const payload = parseShippingPayload(await parseJson(req));
      if (!payload.name) {
        res.status(400).json({ error: "Nome do método é obrigatório." });
        return;
      }

      if (payload.isDefault) {
        await query("update shipping_methods set is_default = false, updated_at = now() where owner_user_id = $1", [
          user.id,
        ]);
      }

      const created = await query(
        `insert into shipping_methods (
           owner_user_id, name, price_cents, min_order_cents, min_days, max_days, description, is_default, is_active, updated_at
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
         returning id, owner_user_id, name, price_cents, min_order_cents, min_days, max_days,
                   description, is_default, is_active, created_at, updated_at`,
        [
          user.id,
          payload.name,
          payload.priceCents,
          payload.minOrderCents,
          payload.minDays,
          payload.maxDays,
          payload.description || null,
          payload.isDefault,
          payload.isActive,
        ]
      );
      res.status(201).json({ shippingMethod: sanitizeShippingRow(created.rows?.[0] || {}) });
      return;
    }

    if (req.method === "PUT") {
      if (!id) {
        res.status(400).json({ error: "Missing id" });
        return;
      }
      const payload = parseShippingPayload(await parseJson(req));
      if (!payload.name) {
        res.status(400).json({ error: "Nome do método é obrigatório." });
        return;
      }
      if (payload.isDefault) {
        await query(
          "update shipping_methods set is_default = false, updated_at = now() where owner_user_id = $1 and id <> $2",
          [user.id, id]
        );
      }
      const updated = await query(
        `update shipping_methods
            set name = $3,
                price_cents = $4,
                min_order_cents = $5,
                min_days = $6,
                max_days = $7,
                description = $8,
                is_default = $9,
                is_active = $10,
                updated_at = now()
          where id = $1 and owner_user_id = $2
          returning id, owner_user_id, name, price_cents, min_order_cents, min_days, max_days,
                    description, is_default, is_active, created_at, updated_at`,
        [
          id,
          user.id,
          payload.name,
          payload.priceCents,
          payload.minOrderCents,
          payload.minDays,
          payload.maxDays,
          payload.description || null,
          payload.isDefault,
          payload.isActive,
        ]
      );
      if (!updated.rows?.length) {
        res.status(404).json({ error: "Método de frete não encontrado." });
        return;
      }
      res.json({ shippingMethod: sanitizeShippingRow(updated.rows[0]) });
      return;
    }

    if (req.method === "DELETE") {
      if (!id) {
        res.status(400).json({ error: "Missing id" });
        return;
      }
      await query("delete from shipping_methods where id = $1 and owner_user_id = $2", [id, user.id]);
      res.json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function sanitizeDomainRow(row = {}) {
  return {
    id: row.id,
    owner_user_id: row.owner_user_id,
    domain: row.domain || "",
    is_verified: row.is_verified === true,
    verification_data: row.verification_data || null,
    last_verified_at: row.last_verified_at || null,
    last_error: row.last_error || "",
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function extractVerificationData(payload = {}) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const verification = payload.verification || payload.config || payload.dnsRecords || null;
  if (!verification) {
    return null;
  }
  if (Array.isArray(verification)) {
    return verification;
  }
  if (typeof verification !== "object") {
    return null;
  }
  if (Array.isArray(verification.verification)) {
    return verification.verification;
  }
  if (Array.isArray(verification.dnsRecords)) {
    return verification.dnsRecords;
  }
  const hasDnsShape =
    typeof verification.type === "string" ||
    typeof verification.recordType === "string" ||
    typeof verification.value === "string" ||
    typeof verification.target === "string";
  return hasDnsShape ? verification : null;
}

async function handleCustomDomains(req, res, user) {
  try {
    await ensureCustomDomainsTable();
    const domainParam = normalizeCustomDomain(req.query?.id || "");
    const action = String(req.query?.action || "").trim().toLowerCase();

    if (req.method === "GET") {
      const rows = await query(
        `select id, owner_user_id, domain, is_verified, verification_data, last_verified_at, last_error, created_at, updated_at
           from custom_domains
          where owner_user_id = $1
          order by updated_at desc, created_at desc`,
        [user.id]
      );
      res.json({ domains: (rows.rows || []).map((row) => sanitizeDomainRow(row)) });
      return;
    }

    if (req.method === "POST" && action === "verify") {
      if (!domainParam || !isValidCustomDomain(domainParam)) {
        res.status(400).json({ error: "Dominio invalido." });
        return;
      }

      const existing = await query(
        "select * from custom_domains where owner_user_id = $1 and lower(domain) = lower($2) limit 1",
        [user.id, domainParam]
      );
      if (!existing.rows?.length) {
        res.status(404).json({ error: "Dominio nao encontrado." });
        return;
      }

      try {
        const payload = await verifyProjectDomain(domainParam);
        const verified = payload?.verified === true;
        const verificationData = extractVerificationData(payload);
        const updated = await query(
          `update custom_domains
              set is_verified = $3,
                  verification_data = $4::jsonb,
                  last_verified_at = now(),
                  last_error = '',
                  updated_at = now()
            where owner_user_id = $1 and domain = $2
            returning *`,
          [user.id, domainParam, verified, verificationData ? JSON.stringify(verificationData) : null]
        );
        res.json({
          domain: sanitizeDomainRow(updated.rows?.[0] || {}),
          verified,
          payload,
        });
      } catch (error) {
        await query(
          `update custom_domains
              set is_verified = false,
                  last_error = $3,
                  updated_at = now()
            where owner_user_id = $1 and domain = $2`,
          [user.id, domainParam, String(error?.message || "Falha na verificacao").slice(0, 400)]
        );
        res.status(400).json({ error: error.message || "Falha ao verificar dominio." });
      }
      return;
    }

    if (req.method === "POST") {
      const body = await parseJson(req);
      const domain = normalizeCustomDomain(body?.domain || "");
      if (!domain || !isValidCustomDomain(domain)) {
        res.status(400).json({ error: "Dominio invalido. Use algo como pay.seudominio.com" });
        return;
      }

      const ownerCollision = await query(
        "select owner_user_id from custom_domains where lower(domain) = lower($1) limit 1",
        [domain]
      );
      const collisionOwnerId = ownerCollision.rows?.[0]?.owner_user_id || null;
      if (collisionOwnerId && String(collisionOwnerId) !== String(user.id)) {
        res.status(409).json({ error: "Este dominio ja esta conectado a outro usuario." });
        return;
      }

      let payload = null;
      try {
        payload = await addProjectDomain(domain);
      } catch (error) {
        res.status(error?.statusCode || 400).json({ error: error.message || "Falha ao conectar dominio." });
        return;
      }

      const verified = payload?.verified === true;
      const verificationData = extractVerificationData(payload);
      const upsert = await query(
        `insert into custom_domains (owner_user_id, domain, is_verified, verification_data, last_verified_at, last_error, updated_at)
         values ($1, $2, $3, $4::jsonb, case when $3 then now() else null end, '', now())
         on conflict (domain)
         do update set owner_user_id = excluded.owner_user_id,
                       is_verified = excluded.is_verified,
                       verification_data = excluded.verification_data,
                       last_verified_at = case when excluded.is_verified then now() else custom_domains.last_verified_at end,
                       last_error = '',
                       updated_at = now()
         returning *`,
        [user.id, domain, verified, verificationData ? JSON.stringify(verificationData) : null]
      );

      res.status(201).json({
        domain: sanitizeDomainRow(upsert.rows?.[0] || {}),
        verified,
        payload,
      });
      return;
    }

    if (req.method === "DELETE") {
      if (!domainParam || !isValidCustomDomain(domainParam)) {
        res.status(400).json({ error: "Dominio invalido." });
        return;
      }

      const existing = await query(
        "select * from custom_domains where owner_user_id = $1 and lower(domain) = lower($2) limit 1",
        [user.id, domainParam]
      );
      if (!existing.rows?.length) {
        res.status(404).json({ error: "Dominio nao encontrado." });
        return;
      }

      try {
        await removeProjectDomain(domainParam);
      } catch (_error) {
        // Keep local removal resilient if domain no longer exists in project.
      }

      await query("delete from custom_domains where owner_user_id = $1 and lower(domain) = lower($2)", [
        user.id,
        domainParam,
      ]);
      res.json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handleIntegrations(req, res, user) {
  try {
    await ensureIntegrationsSchema();
    const { id } = req.query || {};

    if (req.method === "GET") {
      const rows = await query(
        `select id, owner_user_id, provider, name, is_active, config, created_at, updated_at
         from user_integrations
         where owner_user_id = $1
         order by provider asc, updated_at desc`,
        [user.id]
      );
      res.json({ integrations: (rows.rows || []).map((row) => sanitizeIntegrationRow(row)) });
      return;
    }

    if (req.method === "POST") {
      const body = await parseJson(req);
      const payload = normalizeIntegrationPayload(body);
      if (!payload.provider) {
        res.status(400).json({ error: "provider invalido" });
        return;
      }
      const created = await query(
        `insert into user_integrations (owner_user_id, provider, name, is_active, config, updated_at)
         values ($1,$2,$3,$4,$5::jsonb, now())
         returning id, owner_user_id, provider, name, is_active, config, created_at, updated_at`,
        [user.id, payload.provider, payload.name || null, payload.isActive, JSON.stringify(payload.config)]
      );
      res.json({ integration: sanitizeIntegrationRow(created.rows?.[0] || {}) });
      return;
    }

    if (req.method === "PUT") {
      if (!id) {
        res.status(400).json({ error: "Missing id" });
        return;
      }
      const body = await parseJson(req);
      const payload = normalizeIntegrationPayload(body);
      if (!payload.provider) {
        res.status(400).json({ error: "provider invalido" });
        return;
      }
      const updated = await query(
        `update user_integrations
           set provider = $3,
               name = $4,
               is_active = $5,
               config = $6::jsonb,
               updated_at = now()
         where id = $1 and owner_user_id = $2
         returning id, owner_user_id, provider, name, is_active, config, created_at, updated_at`,
        [id, user.id, payload.provider, payload.name || null, payload.isActive, JSON.stringify(payload.config)]
      );
      if (!updated.rows?.length) {
        res.status(404).json({ error: "Integration not found" });
        return;
      }
      res.json({ integration: sanitizeIntegrationRow(updated.rows[0]) });
      return;
    }

    if (req.method === "DELETE") {
      if (!id) {
        res.status(400).json({ error: "Missing id" });
        return;
      }
      await query("delete from user_integrations where id = $1 and owner_user_id = $2", [id, user.id]);
      res.json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handleMarkOrderPaid(req, res, user) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { id } = req.query || {};
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  try {
    await ensureSalesTables();
    await ensureIntegrationsSchema();
    const updated = await query(
      `update checkout_orders
         set status = 'paid',
             paid_at = coalesce(paid_at, now())
       where id = $1 and owner_user_id = $2
       returning *`,
      [id, user.id]
    );
    const order = updated.rows?.[0];
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    try {
      await ensureAnalyticsTables();
      await query(
        `insert into analytics_events (owner_user_id, session_id, event_type, page, payload)
         values ($1, $2, 'purchase', 'checkout', $3::jsonb)`,
        [
          user.id,
          order.cart_key || String(order.id),
          JSON.stringify({ order_id: order.id, total_cents: order.total_cents || 0, status: "paid" }),
        ]
      );
      await dispatchUtmifyEvent({ order, status: "paid" });
    } catch (_error) {
      // Keep manual status update resilient.
    }

    res.json({ ok: true, order });
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
  const cleaned = url.split("?")[0].replace(/^\/api\/(?:admin|dashboard)\/?/, "");
  if (!cleaned) {
    return [];
  }
  return cleaned.split("/").filter(Boolean);
}

module.exports = async (req, res) => {
  try {
    const segments = getPathSegments(req);
    const path = segments[0] || "";

    req.query = req.query || {};
    if (
      ["items", "orders", "carts", "upload", "integrations", "shipping-methods", "custom-domains"].includes(path) &&
      segments.length > 1 &&
      !req.query.id
    ) {
      req.query.id = segments[1];
    }
    if (path === "orders" && segments.length > 2 && !req.query.action) {
      req.query.action = segments[2];
    }
    if (path === "custom-domains" && segments.length > 2 && !req.query.action) {
      req.query.action = segments[2];
    }

    if (path === "login") {
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
        if (req.query?.action === "mark-paid") {
          await handleMarkOrderPaid(req, res, user);
          return;
        }
        await handleOrders(req, res, user);
        return;
      case "recent-orders":
        await handleRecentOrders(req, res, user);
        return;
      case "carts":
        await handleCarts(req, res, user);
        return;
      case "uploads":
        await handleUploads(req, res, user);
        return;
      case "upload":
        if (req.query?.id === "logo") {
          await handleLogoUpload(req, res, user);
          return;
        }
        res.status(404).json({ error: "Not found" });
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
      case "integrations":
        await handleIntegrations(req, res, user);
        return;
      case "shipping-methods":
        await handleShippingMethods(req, res, user);
        return;
      case "custom-domains":
        await handleCustomDomains(req, res, user);
        return;
      case "analytics":
        req.query.path = segments.slice(1);
        await analyticsHandler(req, res);
        return;
      case "metrics":
        req.query.path = ["summary"];
        await analyticsHandler(req, res);
        return;
      default:
        res.status(404).json({ error: "Not found" });
    }
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  }
};
