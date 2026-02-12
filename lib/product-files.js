const { query } = require("./db");
const { ensureProductSchema } = require("./ensure-products");

const MAX_FILE_BYTES = 2 * 1024 * 1024;

function parseDataUrl(dataUrl = "") {
  const match = /^data:(.+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) {
    throw new Error("Formato de imagem invalido");
  }
  const mime = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length) {
    throw new Error("Imagem vazia");
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error("A imagem deve ter ate 2MB");
  }
  return { mime, buffer };
}

async function saveProductFile({ ownerUserId, dataUrl, filename }) {
  if (!ownerUserId) {
    throw new Error("ownerUserId obrigatorio");
  }
  await ensureProductSchema();
  const { mime, buffer } = parseDataUrl(dataUrl);
  const result = await query(
    "insert into product_files (owner_user_id, filename, mime_type, data) values ($1, $2, $3, $4) returning id, mime_type",
    [ownerUserId, filename || null, mime, buffer]
  );
  const file = result.rows?.[0];
  return {
    id: file.id,
    mime_type: file.mime_type,
    url: `/api/public/media?id=${file.id}`,
  };
}

async function getProductFile(id, ownerUserId = null) {
  if (!id) {
    return null;
  }
  await ensureProductSchema();

  let result;
  if (ownerUserId) {
    result = await query(
      "select id, filename, mime_type, data from product_files where id = $1 and owner_user_id = $2",
      [id, ownerUserId]
    );
  } else {
    result = await query("select id, filename, mime_type, data from product_files where id = $1", [id]);
  }

  return result.rows?.[0] || null;
}

module.exports = {
  saveProductFile,
  getProductFile,
};
