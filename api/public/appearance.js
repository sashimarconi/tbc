const { query } = require("../../lib/db");
const { resolvePublicOwnerContext } = require("../../lib/public-owner-context");

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
  const merged = deepMerge(
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

  if (!merged.header || typeof merged.header !== "object") {
    merged.header = {};
  }
  if (!merged.header.style || !["logo", "texto", "logo+texto"].includes(merged.header.style)) {
    merged.header.style = "logo";
  }
  if (typeof merged.header.text !== "string") {
    merged.header.text = "";
  }
  if (!merged.layout?.type) {
    merged.layout = { type: "singleColumn" };
  }
  if (!merged.ui || typeof merged.ui !== "object") {
    merged.ui = { variant: "solarys" };
  }
  if (!merged.ui.variant) {
    merged.ui.variant = "solarys";
  }
  if (!merged.palette.button && merged.palette.buttons) {
    merged.palette.button = merged.palette.buttons;
  }
  if (!merged.palette.buttons && merged.palette.button) {
    merged.palette.buttons = merged.palette.button;
  }
  merged.radius.card = merged.radius.card || merged.radius.cards || "16px";
  merged.radius.button = merged.radius.button || merged.radius.buttons || "14px";
  merged.radius.field = merged.radius.field || merged.radius.fields || "12px";

  return merged;
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

  const solarysDefaults = normalizeThemeDefaults({
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
    radius: { card: "16px", button: "14px", field: "12px", steps: "999px" },
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
      [key, name, description, JSON.stringify(normalizeThemeDefaults(defaults))]
    );
  };

  await ensureTheme("solarys", "Solarys", "Tema Solarys", solarysDefaults);

  await ensureTheme("minimal", "Minimal", "Tema claro e minimalista.", {
    ...solarysDefaults,
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
  });

  await ensureTheme("dark", "Dark", "Tema escuro com alto contraste.", {
    ...solarysDefaults,
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
      ...solarysDefaults.header,
      centerLogo: true,
      bgColor: "#0b1020",
      textColor: "#e2e8f0",
    },
    ui: { variant: "dark" },
  });

  await ensureTheme("mercadex", "Mercadex", "Estilo marketplace claro e confiavel.", {
    ...solarysDefaults,
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
    header: { ...solarysDefaults.header, bgColor: "#FFE600", textColor: "#111318", logoUrl: "" },
    securitySeal: {
      ...solarysDefaults.securitySeal,
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
  });

  await ensureTheme("tiktex", "TikTex", "E-commerce social moderno com contraste forte.", {
    ...solarysDefaults,
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
    header: { ...solarysDefaults.header, bgColor: "#0f1020", textColor: "#f8f9ff", logoUrl: "" },
    securitySeal: {
      ...solarysDefaults.securitySeal,
      textColor: "#f8f9ff",
      bgColor: "#181a30",
      iconColor: "#9f5bff",
    },
    layout: { type: "twoColumn" },
    ui: { variant: "tiktex" },
  });

  await ensureTheme("vegex", "Vegex", "Checkout minimal premium com tipografia forte.", {
    ...solarysDefaults,
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
    header: { ...solarysDefaults.header, bgColor: "#ffffff", textColor: "#1a1a16", logoUrl: "" },
    securitySeal: {
      ...solarysDefaults.securitySeal,
      textColor: "#1a1a16",
      bgColor: "#f0efe9",
      iconColor: "#24452e",
    },
    layout: { type: "singleColumn" },
    ui: { variant: "vegex" },
  });

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

  const themes = await query("select id, defaults from checkout_themes");
  for (const row of themes.rows || []) {
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

const PUBLIC_APPEARANCE_CACHE_TTL_MS = 45 * 1000;
const publicAppearanceCache = new Map();

function getAppearanceCacheKey(req, slug) {
  const host = String(req.headers?.host || "").toLowerCase();
  return `${host}::${slug}`;
}

function setAppearanceCacheHeaders(res) {
  res.setHeader("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120");
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const slug = (req.query?.slug || "").toString().trim();
  if (!slug) {
    res.status(400).json({ error: "Missing slug" });
    return;
  }
  setAppearanceCacheHeaders(res);

  const cacheKey = getAppearanceCacheKey(req, slug);
  const cached = publicAppearanceCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.payload);
    return;
  }

  try {
    await ensureThemesAndAppearanceSchema();

    const ownerContext = await resolvePublicOwnerContext(req, slug, { activeOnlyBase: true });
    const ownerUserId = ownerContext?.ownerUserId;

    if (!ownerUserId) {
      res.status(404).json({ error: "Checkout nao encontrado" });
      return;
    }

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

    const appearance = appearanceResult.rows[0];
    let themeResult = await query("select * from checkout_themes where key = $1 limit 1", [appearance.theme_key]);
    if (!themeResult.rows?.length) {
      themeResult = await query("select * from checkout_themes where key = 'solarys' limit 1");
    }

    const theme = themeResult.rows?.[0];
    const effectiveConfig = deepMerge(theme?.defaults || {}, appearance?.overrides || {});

    const payload = {
      theme_key: appearance.theme_key,
      overrides: appearance.overrides || {},
      effectiveConfig,
    };

    publicAppearanceCache.set(cacheKey, {
      payload,
      expiresAt: Date.now() + PUBLIC_APPEARANCE_CACHE_TTL_MS,
    });

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


