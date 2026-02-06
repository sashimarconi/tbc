const { query } = require("./db");
const { ensureProductSchema } = require("./ensure-products");

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB

function parseDataUrl(dataUrl = "") {
  const match = /^data:(.+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) {
    throw new Error("Formato de imagem inválido");
  }
  const mime = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length) {
    throw new Error("Imagem vazia");
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error("A imagem deve ter até 2MB");
  }
  return { mime, buffer };
}

async function saveProductFile({ dataUrl, filename }) {
  await ensureProductSchema();
  const { mime, buffer } = parseDataUrl(dataUrl);
  const result = await query(
    "insert into product_files (filename, mime_type, data) values ($1, $2, $3) returning id, mime_type",
    [filename || null, mime, buffer]
  );
  const file = result.rows?.[0];
  return {
    id: file.id,
    mime_type: file.mime_type,
    url: `/api/public/media?id=${file.id}`,
  };
}

async function getProductFile(id) {
  if (!id) {
    return null;
  }
  await ensureProductSchema();
  const result = await query("select id, filename, mime_type, data from product_files where id = $1", [id]);
  return result.rows?.[0] || null;
}

module.exports = {
  saveProductFile,
  getProductFile,
};
