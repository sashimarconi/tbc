const { query } = require("./db");
const { ensureProductSchema } = require("./ensure-products");

const MAX_FILE_BYTES = Number(process.env.LOGO_UPLOAD_MAX_BYTES || 4 * 1024 * 1024);
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const MAX_MB_LABEL = `${Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB`;

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
    throw new Error(`A imagem deve ter ate ${MAX_MB_LABEL}`);
  }
  return { mime, buffer };
}

function validateImageFile(mime, buffer) {
  const normalizedMime = String(mime || "").toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
    throw new Error("Tipo de arquivo invalido. Use png, jpg, jpeg ou webp.");
  }
  if (!buffer?.length) {
    throw new Error("Imagem vazia");
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error(`A imagem deve ter ate ${MAX_MB_LABEL}`);
  }
  return normalizedMime === "image/jpg" ? "image/jpeg" : normalizedMime;
}

async function persistProductFile({ ownerUserId, filename, mime, buffer }) {
  if (!ownerUserId) {
    throw new Error("ownerUserId obrigatorio");
  }
  await ensureProductSchema();
  const normalizedMime = validateImageFile(mime, buffer);
  const result = await query(
    "insert into product_files (owner_user_id, filename, mime_type, data) values ($1, $2, $3, $4) returning id, mime_type",
    [ownerUserId, filename || null, normalizedMime, buffer]
  );
  const file = result.rows?.[0];
  return {
    id: file.id,
    mime_type: file.mime_type,
    url: `/api/public/media?id=${file.id}`,
  };
}

async function saveProductFile({ ownerUserId, dataUrl, filename }) {
  const { mime, buffer } = parseDataUrl(dataUrl);
  return persistProductFile({
    ownerUserId,
    filename,
    mime,
    buffer,
  });
}

async function saveProductFileBuffer({ ownerUserId, buffer, mimeType, filename }) {
  return persistProductFile({
    ownerUserId,
    filename,
    mime: mimeType,
    buffer,
  });
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
  saveProductFileBuffer,
  getProductFile,
};
