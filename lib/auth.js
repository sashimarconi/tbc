const jwt = require("jsonwebtoken");
const { query } = require("./db");

const JWT_SECRET = process.env.JWT_SECRET || "";
const TOKEN_TTL = "7d";

function assertSecret() {
  if (!JWT_SECRET) {
    throw new Error("Missing JWT_SECRET");
  }
}

function signAuthToken(user) {
  assertSecret();
  return jwt.sign(
    { sub: user.id, email: user.email, is_admin: user.is_admin === true },
    JWT_SECRET,
    {
      expiresIn: TOKEN_TTL,
    }
  );
}

function verifyToken(token) {
  if (!token) {
    return null;
  }
  try {
    assertSecret();
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || !payload.sub || !payload.email) {
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      is_admin: payload.is_admin === true,
    };
  } catch (error) {
    return null;
  }
}

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return "";
  }
  return auth.slice(7).trim();
}

function requireAuth(req, res) {
  const token = getBearerToken(req);
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return user;
}

async function requireAdmin(req, res) {
  const authUser = requireAuth(req, res);
  if (!authUser) {
    return null;
  }

  try {
    const result = await query("select is_admin from users where id = $1 limit 1", [authUser.id]);
    const isAdmin = result.rows?.[0]?.is_admin === true;
    if (!isAdmin) {
      res.status(403).json({ error: "Forbidden" });
      return null;
    }
    return { ...authUser, is_admin: true };
  } catch (error) {
    res.status(500).json({ error: "Failed to validate admin role" });
    return null;
  }
}

module.exports = {
  signAuthToken,
  verifyToken,
  requireAuth,
  requireAdmin,
  getBearerToken,
};
