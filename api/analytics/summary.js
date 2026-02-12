const { query } = require("../../lib/db");
const { requireAuth } = require("../../lib/auth");
const { ensureAnalyticsTables } = require("../../lib/ensure-analytics");

module.exports = async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) {
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await ensureAnalyticsTables();

    const [summaryResult, timelineResult, liveResult] = await Promise.all([
      query(
        `select
           count(*) filter (where event_type = 'page_view') as visitors_today,
           count(*) filter (where event_type = 'checkout_view') as checkout_visits_today,
           count(*) filter (where event_type = 'checkout_start') as checkout_starts_today,
           count(*) filter (where event_type = 'pix_generated') as pix_generated_today,
           count(*) filter (where event_type = 'purchase') as purchases_today
         from analytics_events
         where owner_user_id = $1
           and created_at >= date_trunc('day', now())`,
        [user.id]
      ),
      query(
        `select
           date_trunc('hour', created_at) as bucket,
           count(*) filter (where event_type = 'page_view') as visits,
           count(*) filter (where event_type = 'checkout_view') as "checkoutViews",
           count(*) filter (where event_type = 'checkout_start') as "checkoutStarts",
           count(*) filter (where event_type = 'pix_generated') as pix
         from analytics_events
         where owner_user_id = $1
           and created_at >= now() - interval '12 hours'
         group by 1
         order by 1 asc`,
        [user.id]
      ),
      query(
        `select city, lat, lng
         from analytics_sessions
         where owner_user_id = $1
           and last_seen >= now() - interval '5 minutes'
         order by last_seen desc
         limit 200`,
        [user.id]
      ),
    ]);

    const summary = summaryResult.rows?.[0] || {};
    const visitorsToday = Number(summary.visitors_today || 0);
    const checkoutVisitsToday = Number(summary.checkout_visits_today || 0);
    const checkoutStartsToday = Number(summary.checkout_starts_today || 0);
    const pixGeneratedToday = Number(summary.pix_generated_today || 0);
    const purchasesToday = Number(summary.purchases_today || 0);
    const conversionRate = checkoutStartsToday > 0 ? (purchasesToday / checkoutStartsToday) * 100 : 0;

    const liveRows = liveResult.rows || [];
    const onlineSessions = liveRows
      .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng))
      .map((row) => ({
        lat: Number(row.lat),
        lng: Number(row.lng),
        city: row.city || "Online",
        color: "#00FF85",
      }));

    const cityMap = new Map();
    for (const row of liveRows) {
      const key = row.city || "Online";
      cityMap.set(key, (cityMap.get(key) || 0) + 1);
    }
    const cityCounts = Array.from(cityMap.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    res.json({
      onlineNow: liveRows.length,
      visitorsToday,
      checkoutVisitsToday,
      checkoutStartsToday,
      pixGeneratedToday,
      purchasesToday,
      conversionRate,
      timeline: timelineResult.rows || [],
      liveView: {
        onlineSessions,
        cityCounts,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
