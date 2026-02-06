const { Pool } = require("pg");

const connectionString =
  process.env.POSTGRES_URL || process.env.DATABASE_URL || "";

if (!connectionString) {
  throw new Error("Missing POSTGRES_URL or DATABASE_URL");
}

const pool = new Pool({
  connectionString,
});

async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

module.exports = { query };
