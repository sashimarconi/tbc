const bcrypt = require("bcryptjs");
const { query } = require("../../lib/db");
const { parseJson } = require("../../lib/parse-json");
const { signAuthToken, requireAuth } = require("../../lib/auth");

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
      name text not null,
      email text unique not null,
      phone text,
      password_hash text not null,
      is_admin boolean not null default false,
      created_at timestamptz not null default now()
    )
  `);
  await query("alter table users add column if not exists name text");
  await query("alter table users add column if not exists phone text");
  await query("update users set name = 'Usuario' where name is null or btrim(name) = ''");
  await query("alter table users alter column name set not null");
  await query("alter table users add column if not exists is_admin boolean not null default false");
}

function getPathSegments(req) {
  const raw = req.query?.path;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.length) return raw.split("/").filter(Boolean);
  const cleaned = (req.url || "").split("?")[0].replace(/^\/api\/auth\/?/, "");
  return cleaned ? cleaned.split("/").filter(Boolean) : [];
}

async function handleSignup(req, res) {
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
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const password = body.password || "";
  if (!name || !phone || !email || !validatePassword(password)) {
    res.status(400).json({ error: "Nome, telefone, email valido e senha minima de 6 caracteres sao obrigatorios" });
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
      "insert into users (name, email, phone, password_hash, is_admin) values ($1, $2, $3, $4, false) returning id, name, email, phone, is_admin",
      [name, email, phone, passwordHash]
    );
    const user = result.rows?.[0];
    const token = signAuthToken(user);
    res.status(201).json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handleLogin(req, res) {
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
    const result = await query(
      "select id, name, email, phone, password_hash, is_admin from users where email = $1 limit 1",
      [email]
    );
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

    const authUser = {
      id: user.id,
      name: user.name || "",
      email: user.email,
      phone: user.phone || "",
      is_admin: user.is_admin === true,
    };
    const token = signAuthToken(authUser);
    res.json({ token, user: authUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handleMe(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const authUser = requireAuth(req, res);
  if (!authUser) return;

  try {
    const result = await query("select id, name, email, phone, is_admin, created_at from users where id = $1 limit 1", [
      authUser.id,
    ]);
    const user = result.rows?.[0];
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = async (req, res) => {
  const path = getPathSegments(req)[0] || "";

  if (path === "signup") {
    await handleSignup(req, res);
    return;
  }
  if (path === "login") {
    await handleLogin(req, res);
    return;
  }
  if (path === "me") {
    await handleMe(req, res);
    return;
  }

  res.status(404).json({ error: "Not found" });
};
