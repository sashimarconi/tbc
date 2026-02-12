const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "";
const TOKEN_TTL = "7d";

function assertSecret() {
  if (!JWT_SECRET) {
    throw new Error("Missing JWT_SECRET");
  }
}

function signAuthToken(user) {
  assertSecret();
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
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

module.exports = {
  signAuthToken,
  verifyToken,
  requireAuth,
  getBearerToken,
};
