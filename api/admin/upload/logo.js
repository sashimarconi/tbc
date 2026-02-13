module.exports = async (req, res) => {
  try {
    req.query = req.query || {};
    req.query.path = ["upload", "logo"];
    req.query.id = "logo";
    const handler = require("../../admin-router");
    await handler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  }
};
