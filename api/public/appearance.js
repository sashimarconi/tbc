const { query } = require("../../lib/db");

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

  const solarysDefaults = {
    palette: {
      primary: "#f5a623",
      buttons: "#f39c12",
      background: "#f4f6fb",
      text: "#1c2431",
      card: "#ffffff",
      border: "#dde3ee",
    },
    typography: { fontFamily: "Poppins" },
    radius: { cards: "16px", buttons: "14px", fields: "12px", steps: "999px" },
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
    ["solarys", "Solarys", "Tema Solarys", JSON.stringify(solarysDefaults)]
  );
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

  try {
    await ensureThemesAndAppearanceSchema();

    const ownerResult = await query(
      "select owner_user_id from products where slug = $1 and type = 'base' limit 1",
      [slug]
    );
    const ownerUserId = ownerResult.rows?.[0]?.owner_user_id;

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

    res.json({
      theme_key: appearance.theme_key,
      overrides: appearance.overrides || {},
      effectiveConfig,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
