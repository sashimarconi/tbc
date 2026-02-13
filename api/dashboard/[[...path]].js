module.exports = async (req, res) => {
  try {
    const handler = require("../../routers/admin-router");
    await handler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  }
};
