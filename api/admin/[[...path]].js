const { requireAdmin } = require("../../lib/auth");

module.exports = async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) {
      return;
    }

    const raw = req.query?.path;
    const segments = Array.isArray(raw)
      ? raw
      : typeof raw === "string" && raw.length
        ? raw.split("/").filter(Boolean)
        : (() => {
            const cleaned = (req.url || "").split("?")[0].replace(/^\/api\/admin\/?/, "");
            return cleaned ? cleaned.split("/").filter(Boolean) : [];
          })();
    const isGlobalRoute = (segments[0] || "") === "global";
    const handler = require(isGlobalRoute ? "../../routers/admin-global-router" : "../../routers/admin-router");
    await handler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  }
};

