const { parseJson } = require("../../lib/parse-json");
const { query } = require("../../lib/db");
const { ensureSalesTables } = require("../../lib/ensure-sales");
const { ensureAnalyticsTables } = require("../../lib/ensure-analytics");

const STAGE_PRIORITY = {
  contact: 1,
  address: 2,
  payment: 3,
};

const STATUS_VALUES = new Set(["open", "converted", "expired"]);

function sanitizeText(value) {
  return typeof value === "string" ? value.trim().slice(0, 255) : "";
}

function ensureStage(stage) {
  const key = typeof stage === "string" ? stage.toLowerCase() : "";
  return STAGE_PRIORITY[key] ? key : "contact";
}

function ensureStatus(status) {
  const key = typeof status === "string" ? status.toLowerCase() : "open";
  return STATUS_VALUES.has(key) ? key : "open";
}

function asObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value;
}

function asNumber(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? Math.max(0, Math.round(num)) : 0;
}

function toJsonb(value) {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

function buildCartEventType(stage) {
  if (stage === "payment") {
    return "checkout_started";
  }
  return "checkout_view";
}

async function registerCartAnalytics({ ownerUserId, cartKey, stage, source, utm }) {
  try {
    await ensureAnalyticsTables();
    const eventType = buildCartEventType(stage);
    await query(
      `insert into analytics_events (owner_user_id, session_id, event_type, page, payload)
       select $1, $2, $3, 'checkout', $4::jsonb
       where not exists (
         select 1
         from analytics_events
         where owner_user_id = $1
           and session_id = $2
           and event_type = $3
           and created_at >= now() - interval '15 seconds'
       )`,
      [ownerUserId, cartKey, eventType, JSON.stringify({ stage })]
    );

    await query(
      `insert into analytics_sessions (session_id, owner_user_id, last_page, last_event, source, utm)
       values ($1, $2, 'checkout', $3, $4, $5::jsonb)
       on conflict (session_id)
       do update set
         last_seen = now(),
         owner_user_id = coalesce(analytics_sessions.owner_user_id, excluded.owner_user_id),
         last_page = 'checkout',
         last_event = excluded.last_event,
         source = coalesce(analytics_sessions.source, excluded.source),
         utm = case
                 when analytics_sessions.utm is null or jsonb_typeof(analytics_sessions.utm) = 'null'
                   then excluded.utm
                 else analytics_sessions.utm
               end`,
      [cartKey, ownerUserId, eventType, source || null, toJsonb(utm)]
    );
  } catch (error) {
    console.warn("[public/cart] analytics sync failed", {
      ownerUserId,
      cartKey,
      stage,
      error: error?.message,
    });
  }
}

async function resolveOwnerBySlug(slug) {
  const result = await query("select owner_user_id from products where slug = $1 and type = 'base' limit 1", [slug]);
  return result.rows?.[0]?.owner_user_id || null;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = {};
  try {
    body = await parseJson(req);
  } catch (error) {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const cartKey = sanitizeText(body.cart_id || body.cartKey);
  const slug = sanitizeText(body.slug);
  if (!cartKey) {
    res.status(400).json({ error: "Missing cart_id" });
    return;
  }
  if (!slug) {
    res.status(400).json({ error: "Missing slug" });
    return;
  }

  const ownerUserId = await resolveOwnerBySlug(slug);
  if (!ownerUserId) {
    res.status(404).json({ error: "Checkout nao encontrado" });
    return;
  }

  const stage = ensureStage(body.stage);
  const stageLevel = STAGE_PRIORITY[stage];
  const status = ensureStatus(body.status);

  const customer = asObject(body.customer) || {};
  const address = asObject(body.address) || null;
  const items = Array.isArray(body.items) ? body.items : [];
  const shipping = asObject(body.shipping) || null;
  const summary = asObject(body.summary) || null;
  const utm = asObject(body.utm) || null;
  const tracking = asObject(body.tracking) || null;
  const source = sanitizeText(body.source || (tracking && tracking.src) || req.headers.referer || "");

  const totalCents = asNumber(body.total_cents || (summary && summary.total_cents));
  const subtotalCents = asNumber(body.subtotal_cents || (summary && summary.subtotal_cents));
  const shippingCents = asNumber(body.shipping_cents || (summary && summary.shipping_cents));

  try {
    await ensureSalesTables();

    const params = [
      ownerUserId,
      cartKey,
      toJsonb(customer),
      toJsonb(address),
      toJsonb(items),
      toJsonb(shipping),
      toJsonb(summary),
      stage,
      stageLevel,
      status,
      totalCents,
      subtotalCents,
      shippingCents,
      toJsonb(utm),
      source || null,
      toJsonb(tracking),
    ];

    const updated = await query(
      `update checkout_carts
         set owner_user_id = $1,
             customer = coalesce($3::jsonb, customer),
             address = coalesce($4::jsonb, address),
             items = case
               when $5::jsonb is null then items
               when jsonb_typeof($5::jsonb) = 'array' and jsonb_array_length($5::jsonb) > 0 then $5::jsonb
               when jsonb_typeof($5::jsonb) = 'array' then $5::jsonb
               else items
             end,
             shipping = coalesce($6::jsonb, shipping),
             summary = coalesce($7::jsonb, summary),
             stage = case when $9 > stage_level then $8 else stage end,
             stage_level = greatest(stage_level, $9),
             status = case
               when status = 'converted' then status
               when $10 = 'converted' then 'converted'
               else $10
             end,
             total_cents = greatest($11, total_cents),
             subtotal_cents = greatest($12, subtotal_cents),
             shipping_cents = greatest($13, shipping_cents),
             utm = coalesce(utm, $14::jsonb),
             source = case when source is null or source = '' then $15 else source end,
             tracking = coalesce(tracking, $16::jsonb),
             updated_at = now(),
             last_seen = now(),
             last_stage_at = case when $9 > stage_level then now() else last_stage_at end
       where cart_key = $2 and (owner_user_id = $1 or owner_user_id is null)
       returning id`,
      params
    );

    if (!updated.rows?.length) {
      await query(
        `insert into checkout_carts (
           owner_user_id, cart_key, customer, address, items, shipping, summary,
           stage, stage_level, status,
           total_cents, subtotal_cents, shipping_cents,
           utm, source, tracking,
           last_seen, last_stage_at
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now(),now())`,
        params
      );
    }

    await registerCartAnalytics({
      ownerUserId,
      cartKey,
      stage,
      source,
      utm,
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("[public/cart] failed to upsert cart snapshot", {
      ownerUserId,
      slug,
      cartKey,
      stage,
      status,
      error: error?.message,
    });
    res.status(500).json({ error: error.message });
  }
};
