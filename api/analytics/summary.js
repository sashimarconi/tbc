const { query } = require("../../lib/db");
const { requireAuth } = require("../../lib/auth");
const { ensureAnalyticsTables } = require("../../lib/ensure-analytics");

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await ensureAnalyticsTables();

    // Mock: sessões online (para o globo)
    const onlineSessions = [
      { lat: -23.5505, lng: -46.6333, city: 'São Paulo, Brasil', color: '#00FF85' },
      { lat: 40.7128, lng: -74.0060, city: 'Nova York, EUA', color: '#00FF85' }
    ];
    // Mock: cidades do dia (para a lista)
    const cityCounts = [
      { city: 'São Paulo, Brasil', count: 4 },
      { city: 'Nova York, EUA', count: 7 },
      { city: 'Brasília, Brasil', count: 6 }
    ];
    // ...existing code...
    res.json({
      onlineNow: 2,
      visitorsToday: 13,
      checkoutVisitsToday: 9,
      checkoutStartsToday: 7,
      pixGeneratedToday: 3,
      purchasesToday: 6,
      conversionRate: 46,
      timeline: [],
      liveView: {
        onlineSessions,
        cityCounts
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
