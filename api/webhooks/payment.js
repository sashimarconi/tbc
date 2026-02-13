module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Placeholder for tomorrow's payment provider webhook integration.
  res.json({
    ok: true,
    message: "Webhook endpoint reservado. Implementacao pendente.",
  });
};
