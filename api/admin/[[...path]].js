module.exports = async (req, res) => {
  try {
    const handler = require("../admin-global-router");
    await handler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  }
};