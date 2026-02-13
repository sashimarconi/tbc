module.exports = async (req, res) => {
  try {
    const raw = req.query?.path;
    const segments = Array.isArray(raw)
      ? raw
      : typeof raw === "string" && raw.length
        ? raw.split("/").filter(Boolean)
        : [];
    const isGlobalRoute = (segments[0] || "") === "global";
    const handler = require(isGlobalRoute ? "../admin-global-router" : "../admin-router");
    await handler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  }
};
