create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  phone text,
  password_hash text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('base', 'bump', 'upsell', 'shipping')),
  slug text unique,
  form_factor text not null default 'physical' check (form_factor in ('physical', 'digital')),
  requires_address boolean not null default true,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  compare_price_cents integer check (compare_price_cents >= 0),
  active boolean not null default true,
  image_url text,
  weight_grams integer default 0,
  length_cm integer default 0,
  width_cm integer default 0,
  height_cm integer default 0,
  created_at timestamptz not null default now()
);

create index if not exists products_owner_type_active_created_idx
  on products (owner_user_id, type, active, created_at desc);

create unique index if not exists products_slug_idx
  on products (slug)
  where slug is not null;

create table if not exists product_files (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  filename text,
  mime_type text not null,
  data bytea not null,
  created_at timestamptz not null default now()
);

create index if not exists product_files_owner_created_idx
  on product_files (owner_user_id, created_at desc);

create table if not exists order_bump_rules (
  bump_id uuid primary key references products(id) on delete cascade,
  owner_user_id uuid not null references users(id) on delete cascade,
  apply_to_all boolean not null default true,
  trigger_product_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_bump_rules_owner_idx
  on order_bump_rules (owner_user_id, updated_at desc);

create table if not exists analytics_sessions (
  session_id text primary key,
  owner_user_id uuid references users(id) on delete cascade,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  last_page text,
  last_event text,
  source text,
  user_agent text,
  utm jsonb,
  city text,
  lat double precision,
  lng double precision
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references users(id) on delete cascade,
  session_id text not null,
  event_type text not null,
  page text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx
  on analytics_events (created_at);

create index if not exists analytics_events_owner_created_idx
  on analytics_events (owner_user_id, created_at);

create index if not exists analytics_sessions_owner_last_seen_idx
  on analytics_sessions (owner_user_id, last_seen desc);

create index if not exists analytics_events_type_idx
  on analytics_events (event_type, page, created_at);

create table if not exists checkout_carts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  cart_key text not null,
  customer jsonb,
  address jsonb,
  items jsonb,
  shipping jsonb,
  summary jsonb,
  stage text not null default 'contact',
  stage_level integer not null default 1,
  status text not null default 'open' check (status in ('open', 'converted', 'expired')),
  total_cents integer default 0,
  subtotal_cents integer default 0,
  shipping_cents integer default 0,
  utm jsonb,
  source text,
  tracking jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  last_stage_at timestamptz not null default now(),
  unique(owner_user_id, cart_key)
);

create index if not exists checkout_carts_stage_idx
  on checkout_carts (owner_user_id, stage, status, last_seen desc);

create table if not exists checkout_orders (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  cart_key text,
  customer jsonb not null,
  address jsonb,
  items jsonb,
  shipping jsonb,
  summary jsonb,
  status text not null default 'waiting_payment' check (status in ('waiting_payment', 'pending', 'paid', 'refused', 'refunded', 'cancelled')),
  pix jsonb,
  total_cents integer default 0,
  subtotal_cents integer default 0,
  shipping_cents integer default 0,
  tracking_parameters jsonb,
  utm jsonb,
  source text,
  tracking jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique(owner_user_id, cart_key)
);

create index if not exists checkout_orders_created_idx
  on checkout_orders (owner_user_id, created_at desc);

create table if not exists shipping_methods (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  name text not null,
  price_cents integer not null default 0 check (price_cents >= 0),
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  min_days integer not null default 0 check (min_days >= 0),
  max_days integer not null default 0 check (max_days >= 0),
  description text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shipping_methods_owner_updated_idx
  on shipping_methods (owner_user_id, updated_at desc);

create table if not exists checkout_themes (
  id serial primary key,
  key text unique not null,
  name text not null,
  description text,
  preview_image text,
  defaults jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists checkout_appearance (
  id serial primary key,
  owner_user_id uuid not null references users(id) on delete cascade,
  theme_key text not null references checkout_themes(key),
  overrides jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(owner_user_id)
);

create table if not exists user_payment_gateways (
  id serial primary key,
  owner_user_id uuid not null references users(id) on delete cascade,
  provider text not null default 'sealpay',
  api_url text not null,
  api_key_encrypted text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id, provider)
);

create index if not exists user_payment_gateways_owner_idx
  on user_payment_gateways (owner_user_id, provider, updated_at desc);

create table if not exists user_integrations (
  id serial primary key,
  owner_user_id uuid not null references users(id) on delete cascade,
  provider text not null check (provider in ('meta', 'tiktok', 'utmify')),
  name text,
  is_active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_integrations_owner_provider_idx
  on user_integrations (owner_user_id, provider, updated_at desc);

create table if not exists utmify_events_log (
  id serial primary key,
  owner_user_id uuid not null references users(id) on delete cascade,
  order_id uuid not null references checkout_orders(id) on delete cascade,
  status text not null,
  request_payload jsonb,
  response_payload jsonb,
  http_status integer,
  created_at timestamptz not null default now(),
  unique(order_id, status)
);

create index if not exists utmify_events_log_owner_created_idx
  on utmify_events_log (owner_user_id, created_at desc);

insert into checkout_themes (key, name, description, preview_image, defaults)
values
(
  'solarys',
  'Solarys',
  'Tema com tons quentes focado em conversao.',
  null,
  '{
    "palette": {
      "primary": "#f5a623",
      "button": "#f39c12",
      "background": "#f4f6fb",
      "text": "#1c2431",
      "card": "#ffffff",
      "border": "#dde3ee",
      "muted": "#6b7280"
    },
    "typography": {
      "fontFamily": "Poppins",
      "headingWeight": 700,
      "bodyWeight": 500,
      "baseSize": 16
    },
    "radius": {
      "card": "16px",
      "button": "14px",
      "field": "12px",
      "steps": "999px"
    },
    "header": {
      "style": "logo",
      "text": "",
      "centerLogo": false,
      "logoUrl": "/assets/logo-blackout.png",
      "logoWidthPx": 120,
      "logoHeightPx": 40,
      "bgColor": "#ffffff",
      "textColor": "#0f5132"
    },
    "securitySeal": {
      "enabled": true,
      "style": "padrao_bolinha_texto",
      "text": "Pagamento 100% seguro",
      "size": "medio",
      "textColor": "#0f5132",
      "bgColor": "#f5f7fb",
      "iconColor": "#1d9f55",
      "radius": "arredondado"
    },
    "effects": {
      "primaryButton": { "animation": "none", "speed": "normal" },
      "secondaryButton": { "animation": "none", "speed": "normal" }
    },
    "settings": {
      "fields": {
        "fullName": true,
        "email": true,
        "phone": true,
        "cpf": true,
        "custom": []
      },
      "i18n": {
        "language": "pt-BR",
        "currency": "BRL"
      }
    },
    "layout": {
      "type": "singleColumn"
    },
    "ui": {
      "variant": "solarys"
    },
    "elements": {
      "showCountrySelector": true,
      "showProductImage": true,
      "showOrderBumps": true,
      "showShipping": true,
      "showFooterSecurityText": true,
      "order": ["header", "country", "offer", "form", "bumps", "shipping", "payment", "footer"]
    }
  }'::jsonb
),
(
  'minimal',
  'Minimal',
  'Tema claro e minimalista.',
  null,
  '{
    "palette": {
      "primary": "#111827",
      "button": "#111827",
      "background": "#f8fafc",
      "text": "#0f172a",
      "card": "#ffffff",
      "border": "#e2e8f0",
      "muted": "#64748b"
    },
    "typography": {
      "fontFamily": "Inter",
      "headingWeight": 700,
      "bodyWeight": 500,
      "baseSize": 16
    },
    "radius": {
      "card": "12px",
      "button": "10px",
      "field": "10px",
      "steps": "10px"
    },
    "header": {
      "style": "logo",
      "text": "",
      "centerLogo": false,
      "logoUrl": "/assets/logo-blackout.png",
      "logoWidthPx": 120,
      "logoHeightPx": 40,
      "bgColor": "#ffffff",
      "textColor": "#0f172a"
    },
    "securitySeal": {
      "enabled": true,
      "style": "somente_texto",
      "text": "Ambiente de pagamento protegido",
      "size": "pequeno",
      "textColor": "#0f172a",
      "bgColor": "#f1f5f9",
      "iconColor": "#0f172a",
      "radius": "quadrado"
    },
    "effects": {
      "primaryButton": { "animation": "pulse", "speed": "normal" },
      "secondaryButton": { "animation": "none", "speed": "normal" }
    },
    "settings": {
      "fields": {
        "fullName": true,
        "email": true,
        "phone": true,
        "cpf": true,
        "custom": []
      },
      "i18n": {
        "language": "pt-BR",
        "currency": "BRL"
      }
    },
    "layout": {
      "type": "singleColumn"
    },
    "ui": {
      "variant": "minimal"
    },
    "elements": {
      "showCountrySelector": true,
      "showProductImage": true,
      "showOrderBumps": true,
      "showShipping": true,
      "showFooterSecurityText": true,
      "order": ["header", "country", "offer", "form", "bumps", "shipping", "payment", "footer"]
    }
  }'::jsonb
),
(
  'dark',
  'Dark',
  'Tema escuro com alto contraste.',
  null,
  '{
    "palette": {
      "primary": "#22c55e",
      "button": "#16a34a",
      "background": "#0b1020",
      "text": "#e2e8f0",
      "card": "#111827",
      "border": "#24314b",
      "muted": "#9aa5b8"
    },
    "typography": {
      "fontFamily": "Montserrat",
      "headingWeight": 700,
      "bodyWeight": 500,
      "baseSize": 16
    },
    "radius": {
      "card": "18px",
      "button": "14px",
      "field": "12px",
      "steps": "999px"
    },
    "header": {
      "style": "logo",
      "text": "",
      "centerLogo": true,
      "logoUrl": "/assets/logo-blackout.png",
      "logoWidthPx": 120,
      "logoHeightPx": 40,
      "bgColor": "#0b1020",
      "textColor": "#e2e8f0"
    },
    "securitySeal": {
      "enabled": true,
      "style": "somente_icone",
      "text": "Pagamento 100% seguro",
      "size": "medio",
      "textColor": "#e2e8f0",
      "bgColor": "#111827",
      "iconColor": "#22c55e",
      "radius": "arredondado"
    },
    "effects": {
      "primaryButton": { "animation": "glow", "speed": "rapido" },
      "secondaryButton": { "animation": "shake", "speed": "normal" }
    },
    "settings": {
      "fields": {
        "fullName": true,
        "email": true,
        "phone": true,
        "cpf": true,
        "custom": []
      },
      "i18n": {
        "language": "pt-BR",
        "currency": "BRL"
      }
    },
    "layout": {
      "type": "singleColumn"
    },
    "ui": {
      "variant": "dark"
    },
    "elements": {
      "showCountrySelector": true,
      "showProductImage": true,
      "showOrderBumps": true,
      "showShipping": true,
      "showFooterSecurityText": true,
      "order": ["header", "country", "offer", "form", "bumps", "shipping", "payment", "footer"]
    }
  }'::jsonb
),
(
  'mercadex',
  'Mercadex',
  'Estilo marketplace claro e confiavel.',
  null,
  '{
    "palette": {
      "background": "#F5F6F8",
      "card": "#ffffff",
      "text": "#111318",
      "mutedText": "#5B616E",
      "border": "rgba(17,19,24,0.10)",
      "primary": "#FFE600",
      "primaryText": "#111318",
      "primaryHover": "#FFD500",
      "button": "#FFE600",
      "link": "#2D68C4",
      "linkHover": "#1F56AD",
      "buttonSecondaryBg": "#EEF0F3",
      "buttonSecondaryText": "#111318",
      "success": "#00A650",
      "warning": "#FFB020",
      "danger": "#E53935"
    },
    "typography": {
      "fontFamily": "Inter",
      "headingWeight": 700,
      "bodyWeight": 500,
      "baseSize": 16
    },
    "radius": {
      "card": "16px",
      "button": "14px",
      "field": "12px",
      "steps": "999px"
    },
    "header": {
      "style": "logo",
      "text": "",
      "centerLogo": false,
      "logoUrl": "",
      "logoWidthPx": 120,
      "logoHeightPx": 40,
      "bgColor": "#FFE600",
      "textColor": "#111318"
    },
    "securitySeal": {
      "enabled": true,
      "style": "somente_texto",
      "text": "Ambiente seguro",
      "size": "medio",
      "bgColor": "rgba(17,19,24,0.08)",
      "textColor": "#111318",
      "radius": "arredondado"
    },
    "layout": {
      "type": "twoColumn"
    },
    "ui": {
      "variant": "mercadex"
    }
  }'::jsonb
),
(
  'tiktex',
  'TikTex',
  'E-commerce social moderno com contraste forte.',
  null,
  '{
    "palette": {
      "primary": "#9f5bff",
      "button": "#ff375f",
      "background": "#0b0b13",
      "text": "#f8f9ff",
      "card": "#111220",
      "border": "#2f3258",
      "muted": "#b0b6dc"
    },
    "typography": {
      "fontFamily": "Montserrat",
      "headingWeight": 800,
      "bodyWeight": 500,
      "baseSize": 16
    },
    "radius": {
      "card": "18px",
      "button": "16px",
      "field": "14px",
      "steps": "999px"
    },
    "header": {
      "style": "logo",
      "text": "",
      "centerLogo": false,
      "logoUrl": "",
      "logoWidthPx": 120,
      "logoHeightPx": 40,
      "bgColor": "#0f1020",
      "textColor": "#f8f9ff"
    },
    "layout": {
      "type": "twoColumn"
    },
    "ui": {
      "variant": "tiktex"
    }
  }'::jsonb
),
(
  'vegex',
  'Vegex',
  'Checkout minimal premium com tipografia forte.',
  null,
  '{
    "palette": {
      "primary": "#24452e",
      "button": "#1a1a16",
      "background": "#f7f7f5",
      "text": "#1a1a16",
      "card": "#ffffff",
      "border": "#dcdacf",
      "muted": "#6f6b60"
    },
    "typography": {
      "fontFamily": "Plus Jakarta Sans",
      "headingWeight": 800,
      "bodyWeight": 500,
      "baseSize": 16
    },
    "radius": {
      "card": "22px",
      "button": "999px",
      "field": "14px",
      "steps": "999px"
    },
    "header": {
      "style": "logo",
      "text": "",
      "centerLogo": false,
      "logoUrl": "",
      "logoWidthPx": 120,
      "logoHeightPx": 40,
      "bgColor": "#ffffff",
      "textColor": "#1a1a16"
    },
    "layout": {
      "type": "singleColumn"
    },
    "ui": {
      "variant": "vegex"
    }
  }'::jsonb
)
on conflict (key) do nothing;
