const { query } = require("../../lib/db");
const { parseJson } = require("../../lib/parse-json");
const { requireAuth } = require("../../lib/auth");
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

function getPathSegments(req) {
  const raw = req.query?.path;
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === "string" && raw.length) {
    return raw.split("/").filter(Boolean);
  }
  const cleaned = (req.url || "").split("?")[0].replace(/^\/api\/analytics\/?/, "");
  return cleaned ? cleaned.split("/").filter(Boolean) : [];
}

async function handleEvent(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = {};
  try {
    body = await parseJson(req);
  } catch (_error) {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  await ensureAnalyticsTables();

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    null;
  let geo = null;
  if (ip && typeof getGeoFromIp === "function") {
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

  const payload = asObject(body.metadata) || asObject(body.meta) || asObject(body.payload) || null;
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
}

async function handleSummary(req, res) {
  const user = requireAuth(req, res);
  if (!user) {
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await ensureAnalyticsTables();

    const [summaryResult, timelineResult, liveResult] = await Promise.all([
      query(
        `select
           count(*) filter (where event_type = 'page_view') as visitors_today,
           count(*) filter (where event_type = 'checkout_view') as checkout_visits_today,
           count(*) filter (where event_type = 'checkout_start') as checkout_starts_today,
           count(*) filter (where event_type = 'pix_generated') as pix_generated_today,
           count(*) filter (where event_type = 'purchase') as purchases_today
         from analytics_events
         where owner_user_id = $1
           and created_at >= date_trunc('day', now())`,
        [user.id]
      ),
      query(
        `select
           date_trunc('hour', created_at) as bucket,
           count(*) filter (where event_type = 'page_view') as visits,
           count(*) filter (where event_type = 'checkout_view') as "checkoutViews",
           count(*) filter (where event_type = 'checkout_start') as "checkoutStarts",
           count(*) filter (where event_type = 'pix_generated') as pix
         from analytics_events
         where owner_user_id = $1
           and created_at >= now() - interval '12 hours'
         group by 1
         order by 1 asc`,
        [user.id]
      ),
      query(
        `select city, lat, lng
         from analytics_sessions
         where owner_user_id = $1
           and last_seen >= now() - interval '5 minutes'
         order by last_seen desc
         limit 200`,
        [user.id]
      ),
    ]);

    const summary = summaryResult.rows?.[0] || {};
    const visitorsToday = Number(summary.visitors_today || 0);
    const checkoutVisitsToday = Number(summary.checkout_visits_today || 0);
    const checkoutStartsToday = Number(summary.checkout_starts_today || 0);
    const pixGeneratedToday = Number(summary.pix_generated_today || 0);
    const purchasesToday = Number(summary.purchases_today || 0);
    const conversionRate = checkoutStartsToday > 0 ? (purchasesToday / checkoutStartsToday) * 100 : 0;

    const liveRows = liveResult.rows || [];
    const onlineSessions = liveRows
      .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng))
      .map((row) => ({
        lat: Number(row.lat),
        lng: Number(row.lng),
        city: row.city || "Online",
        color: "#00FF85",
      }));

    const cityMap = new Map();
    for (const row of liveRows) {
      const key = row.city || "Online";
      cityMap.set(key, (cityMap.get(key) || 0) + 1);
    }
    const cityCounts = Array.from(cityMap.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    res.json({
      onlineNow: liveRows.length,
      visitorsToday,
      checkoutVisitsToday,
      checkoutStartsToday,
      pixGeneratedToday,
      purchasesToday,
      conversionRate,
      timeline: timelineResult.rows || [],
      liveView: {
        onlineSessions,
        cityCounts,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = async (req, res) => {
  const [path] = getPathSegments(req);
  if (path === "event") {
    await handleEvent(req, res);
    return;
  }
  if (path === "summary") {
    await handleSummary(req, res);
    return;
  }
  res.status(404).json({ error: "Not found" });
};
