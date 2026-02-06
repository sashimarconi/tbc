const { getProductFile } = require("../../lib/product-files");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const id = (req.query?.id || "").toString().trim();
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  try {
    const file = await getProductFile(id);
    if (!file) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.status(200).send(file.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
