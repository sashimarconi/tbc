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

    const metricsResult = await query(
      `with day_start as (select date_trunc('day', now()) as start_ts)
       select
         (select count(*) from analytics_sessions where last_seen >= now() - interval '3 minutes') as online_now,
         (select count(*) from analytics_sessions where first_seen >= (select start_ts from day_start)) as visitors_today,
         (select count(distinct session_id) from analytics_events where event_type = 'page_view' and page = 'checkout' and created_at >= (select start_ts from day_start)) as checkout_visits_today,
         (select count(distinct session_id) from analytics_events where event_type = 'checkout_start' and created_at >= (select start_ts from day_start)) as checkout_starts_today,
         (select count(*) from analytics_events where event_type = 'pix_generated' and created_at >= (select start_ts from day_start)) as pix_generated_today,
         (select count(distinct session_id) from analytics_events where event_type = 'pix_generated' and created_at >= (select start_ts from day_start)) as purchases_today`
    );

    const summary = metricsResult.rows[0] || {};

    const timelineResult = await query(
      `with time_window as (
         select generate_series(
           date_trunc('hour', now()) - interval '11 hour',
           date_trunc('hour', now()),
           interval '1 hour'
         ) as bucket
       ),
       agg as (
         select
           date_trunc('hour', created_at) as bucket,
           count(distinct session_id) filter (where event_type = 'page_view') as visits,
           count(distinct session_id) filter (where event_type = 'page_view' and page = 'checkout') as checkout_views,
           count(distinct session_id) filter (where event_type = 'checkout_start') as checkout_starts,
           count(*) filter (where event_type = 'pix_generated') as pix,
           count(distinct session_id) filter (where event_type = 'pix_generated') as purchases
         from analytics_events
         where created_at >= date_trunc('hour', now()) - interval '11 hour'
         group by 1
        )
        select
          time_window.bucket,
         coalesce(agg.visits, 0) as visits,
         coalesce(agg.checkout_views, 0) as checkout_views,
         coalesce(agg.checkout_starts, 0) as checkout_starts,
         coalesce(agg.pix, 0) as pix,
         coalesce(agg.purchases, 0) as purchases
        from time_window
        left join agg on agg.bucket = time_window.bucket
        order by time_window.bucket`
    );

    const checkoutStarts = Number(summary.checkout_starts_today) || 0;
    const purchases = Number(summary.purchases_today) || 0;

    res.json({
      onlineNow: Number(summary.online_now) || 0,
      visitorsToday: Number(summary.visitors_today) || 0,
      checkoutVisitsToday: Number(summary.checkout_visits_today) || 0,
      checkoutStartsToday: checkoutStarts,
      pixGeneratedToday: Number(summary.pix_generated_today) || 0,
      purchasesToday: purchases,
      conversionRate: checkoutStarts ? (purchases / checkoutStarts) * 100 : 0,
      timeline: timelineResult.rows.map((row) => ({
        bucket: row.bucket instanceof Date ? row.bucket.toISOString() : row.bucket,
        visits: Number(row.visits) || 0,
        checkoutViews: Number(row.checkout_views) || 0,
        checkoutStarts: Number(row.checkout_starts) || 0,
        pix: Number(row.pix) || 0,
        purchases: Number(row.purchases) || 0,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
