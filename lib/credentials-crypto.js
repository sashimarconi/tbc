const crypto = require("crypto");

function getSecret() {
  return process.env.CREDENTIALS_SECRET || process.env.JWT_SECRET || "";
}

function getKey() {
  const secret = getSecret();
  if (!secret) {
    throw new Error("Missing CREDENTIALS_SECRET or JWT_SECRET");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptText(plainText = "") {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptText(value = "") {
  const key = getKey();
  const parts = String(value).split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload");
  }
  const [ivB64, tagB64, encryptedB64] = parts;
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const encrypted = Buffer.from(encryptedB64, "base64url");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

module.exports = {
  encryptText,
  decryptText,
};

