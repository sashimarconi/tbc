const { query } = require("../../lib/db");
const { requireAuth } = require("../../lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const authUser = requireAuth(req, res);
  if (!authUser) {
    return;
  }

  try {
    const result = await query("select id, email, created_at from users where id = $1 limit 1", [authUser.id]);
    const user = result.rows?.[0];
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
