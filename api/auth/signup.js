const bcrypt = require("bcryptjs");
const { query } = require("../../lib/db");
const { parseJson } = require("../../lib/parse-json");
const { signAuthToken } = require("../../lib/auth");

function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

function validatePassword(password = "") {
  return typeof password === "string" && password.length >= 6;
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

  if (!email || !validatePassword(password)) {
    res.status(400).json({ error: "Email valido e senha minima de 6 caracteres sao obrigatorios" });
    return;
  }

  try {
    await ensureUsersTable();

    const exists = await query("select id from users where email = $1 limit 1", [email]);
    if (exists.rows?.length) {
      res.status(409).json({ error: "Email ja cadastrado" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      "insert into users (email, password_hash) values ($1, $2) returning id, email",
      [email, passwordHash]
    );

    const user = result.rows?.[0];
    const token = signAuthToken(user);
    res.status(201).json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
