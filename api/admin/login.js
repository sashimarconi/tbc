module.exports = async (_req, res) => {
  res.status(403).json({ error: "Use /api/auth/login" });
};
