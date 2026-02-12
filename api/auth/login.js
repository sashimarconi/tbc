const bcrypt = require("bcryptjs");
const { query } = require("../../lib/db");
const { parseJson } = require("../../lib/parse-json");
const { signAuthToken } = require("../../lib/auth");

function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

async function ensureUsersTable() {
  await query(`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      email text unique not null,
      password_hash text not null,
      created_at timestamptz not null default now()
    )
  `);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = {};
  try {
    body = await parseJson(req);
  } catch (error) {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const email = normalizeEmail(body.email);
  const password = body.password || "";

  if (!email || !password) {
    res.status(400).json({ error: "Email e senha sao obrigatorios" });
    return;
  }

  try {
    await ensureUsersTable();

    const result = await query("select id, email, password_hash from users where email = $1 limit 1", [email]);
    const user = result.rows?.[0];
    if (!user) {
      res.status(401).json({ error: "Credenciais invalidas" });
      return;
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      res.status(401).json({ error: "Credenciais invalidas" });
      return;
    }

    const authUser = { id: user.id, email: user.email };
    const token = signAuthToken(authUser);
    res.json({ token, user: authUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
