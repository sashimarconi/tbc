const { query } = require("../../lib/db");
const { parseJson } = require("../../lib/parse-json");
const { ensureAnalyticsTables } = require("../../lib/ensure-analytics");

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

  const sessionId = sanitizeString(body.session_id || body.sessionId);
  const eventType = normalizeEventType(body.type || body.event_type);
  const page = sanitizeString(body.page, FALLBACK_PAGE) || FALLBACK_PAGE;

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
    await query(
      "insert into analytics_events (session_id, event_type, page, payload) values ($1, $2, $3, $4)",
      [sessionId, eventType, page, payload]
    );

    await query(
      `insert into analytics_sessions (session_id, last_page, last_event, source, user_agent, utm)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (session_id)
       do update set
         last_seen = now(),
         last_page = excluded.last_page,
         last_event = excluded.last_event,
         source = coalesce(analytics_sessions.source, excluded.source),
         user_agent = coalesce(analytics_sessions.user_agent, excluded.user_agent),
         utm = case
                 when analytics_sessions.utm is null or jsonb_typeof(analytics_sessions.utm) = 'null'
                   then excluded.utm
                 else analytics_sessions.utm
               end`,
      [sessionId, page, eventType, source || null, userAgent || null, utm]
    );

    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
