const { query } = require("../../lib/db");
const { parseJson } = require("../../lib/parse-json");
const { ensureAnalyticsTables } = require("../../lib/ensure-analytics");
const { getGeoFromIp } = require("../../lib/geoip");

const FALLBACK_PAGE = "unknown";
const MAX_STRING = 512;

function sanitizeString(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  return value.trim().slice(0, MAX_STRING);
}

function normalizeEventType(value) {
  const raw = sanitizeString(value).toLowerCase();
  if (!raw) {
    return null;
  }
  return raw.replace(/[^a-z0-9_\-]/g, "");
}

function asObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value;
}

function extractSlugFromContext(body = {}, page = "", href = "") {
  const direct = sanitizeString(body.slug || body.offer_slug || "");
  if (direct) {
    return direct;
  }

  const candidates = [page, href, sanitizeString(body.href || "")].filter(Boolean);
  for (const raw of candidates) {
    const match = String(raw).match(/\/checkout\/([^/?#]+)/i);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return "";
}

async function resolveOwnerUserIdBySlug(slug) {
  if (!slug) {
    return null;
  }
  const result = await query(
    "select owner_user_id from products where type = 'base' and slug = $1 limit 1",
    [slug]
  );
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

  await ensureAnalyticsTables();
  // Captura IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection?.remoteAddress || req.socket?.remoteAddress || null;
  let geo = null;
  if (ip && typeof getGeoFromIp === 'function') {
    geo = await getGeoFromIp(ip);
  }

  const sessionId = sanitizeString(body.session_id || body.sessionId);
  const eventType = normalizeEventType(body.type || body.event_type);
  const page = sanitizeString(body.page, FALLBACK_PAGE) || FALLBACK_PAGE;
  const href = sanitizeString(body.href || "");
  const slug = extractSlugFromContext(body, page, href);

  if (!sessionId) {
    res.status(400).json({ error: "Missing session_id" });
    return;
  }

  if (!eventType) {
    res.status(400).json({ error: "Missing event type" });
    return;
  }

  const payload =
    asObject(body.metadata) ||
    asObject(body.meta) ||
    asObject(body.payload) ||
    null;
  const utm = asObject(body.utm) || null;
  const source = sanitizeString(body.source || req.headers.referer || "");
  const userAgent = sanitizeString(body.user_agent || req.headers["user-agent"] || "");

  try {
    const ownerUserId = await resolveOwnerUserIdBySlug(slug);

    await query(
      "insert into analytics_events (owner_user_id, session_id, event_type, page, payload) values ($1, $2, $3, $4, $5)",
      [ownerUserId, sessionId, eventType, page, payload]
    );

    await query(
      `insert into analytics_sessions (session_id, owner_user_id, last_page, last_event, source, user_agent, utm, city, lat, lng)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       on conflict (session_id)
       do update set
         last_seen = now(),
         owner_user_id = coalesce(analytics_sessions.owner_user_id, excluded.owner_user_id),
         last_page = excluded.last_page,
         last_event = excluded.last_event,
         source = coalesce(analytics_sessions.source, excluded.source),
         user_agent = coalesce(analytics_sessions.user_agent, excluded.user_agent),
         utm = case
                 when analytics_sessions.utm is null or jsonb_typeof(analytics_sessions.utm) = 'null'
                   then excluded.utm
                 else analytics_sessions.utm
               end,
         city = coalesce(excluded.city, analytics_sessions.city),
         lat = coalesce(excluded.lat, analytics_sessions.lat),
         lng = coalesce(excluded.lng, analytics_sessions.lng)
      `,
      [
        sessionId,
        ownerUserId,
        page,
        eventType,
        source || null,
        userAgent || null,
        utm,
        geo?.city || null,
        geo?.lat || null,
        geo?.lng || null,
      ]
    );

    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
