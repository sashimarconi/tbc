const { requireAdmin } = require("../../lib/auth");

function normalizeSegments(raw) {
  if (Array.isArray(raw)) {
    return raw
      .flatMap((part) => String(part || "").split(/[\/,]+/))
      .map((part) => part.trim())
      .filter(Boolean);
  }
  if (typeof raw === "string" && raw.length) {
    return raw
      .split(/[\/,]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}

module.exports = async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) {
      return;
    }

    const urlPath = (req.url || "").split("?")[0];
    const isGlobalByUrl = /^\/api\/admin\/global(?:\/|$)/.test(urlPath);

    const raw = req.query?.path;
    let segments = normalizeSegments(raw);
    if (!segments.length) {
      const cleaned = urlPath.replace(/^\/api\/admin\/?/, "");
      segments = normalizeSegments(cleaned);
    }

    req.query = req.query || {};
    req.query.path = segments;

    const handler = isGlobalByUrl
      ? require("../../routers/admin-global-router")
      : require("../../routers/admin-router");
    await handler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  }
};

