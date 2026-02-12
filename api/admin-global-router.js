const { query } = require("../lib/db");
const { requireAdmin } = require("../lib/auth");
const { ensureSalesTables } = require("../lib/ensure-sales");
const { ensureProductSchema } = require("../lib/ensure-products");
const { ensureAnalyticsTables } = require("../lib/ensure-analytics");

function getPathSegments(req) {
  const raw = req.query?.path;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.length) return raw.split("/").filter(Boolean);
  const cleaned = (req.url || "").split("?")[0].replace(/^\/api\/admin\/?/, "");
  return cleaned ? cleaned.split("/").filter(Boolean) : [];
}

async function handleSummary(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  await Promise.all([ensureProductSchema(), ensureSalesTables(), ensureAnalyticsTables()]);

  const [usersRes, ordersRes, analyticsRes] = await Promise.all([
    query("select count(*)::int as total_users from users"),
    query(
      `select
         count(*)::int as total_orders,
         count(*) filter (where status = 'paid')::int as paid_orders,
         count(*) filter (where status = 'pending')::int as pending_orders
       from checkout_orders`
    ),
    query(
      `select
         count(*) filter (where event_type = 'page_view')::int as total_visitors,
         count(*) filter (where event_type = 'checkout_start')::int as checkout_starts,
         count(*) filter (where event_type = 'purchase')::int as purchases
       from analytics_events`
    ),
  ]);

  const totalUsers = Number(usersRes.rows?.[0]?.total_users || 0);
  const totalOrders = Number(ordersRes.rows?.[0]?.total_orders || 0);
  const paidOrders = Number(ordersRes.rows?.[0]?.paid_orders || 0);
  const pendingOrders = Number(ordersRes.rows?.[0]?.pending_orders || 0);
  const totalVisitors = Number(analyticsRes.rows?.[0]?.total_visitors || 0);
  const checkoutStarts = Number(analyticsRes.rows?.[0]?.checkout_starts || 0);
  const purchases = Number(analyticsRes.rows?.[0]?.purchases || 0);
  const conversionRate = checkoutStarts > 0 ? (purchases / checkoutStarts) * 100 : 0;

  res.json({
    total_users: totalUsers,
    total_orders: totalOrders,
    paid_orders: paidOrders,
    pending_orders: pendingOrders,
    total_visitors: totalVisitors,
    conversion_rate: conversionRate,
  });
}

async function handleByUser(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  await Promise.all([ensureProductSchema(), ensureSalesTables(), ensureAnalyticsTables()]);

  const result = await query(
    `select
       u.id,
       u.email,
       u.is_admin,
       u.created_at,
       coalesce(v.visitors, 0)::int as visitors,
       coalesce(o.total_orders, 0)::int as orders,
       coalesce(o.paid_orders, 0)::int as paid_orders,
       case
         when coalesce(v.checkout_starts, 0) > 0
           then (coalesce(v.purchases, 0)::numeric / v.checkout_starts::numeric) * 100
         else 0
       end as conversion_rate
     from users u
     left join (
       select
         owner_user_id,
         count(*) filter (where event_type = 'page_view') as visitors,
         count(*) filter (where event_type = 'checkout_start') as checkout_starts,
         count(*) filter (where event_type = 'purchase') as purchases
       from analytics_events
       where owner_user_id is not null
       group by owner_user_id
     ) v on v.owner_user_id = u.id
     left join (
       select
         owner_user_id,
         count(*) as total_orders,
         count(*) filter (where status = 'paid') as paid_orders
       from checkout_orders
       group by owner_user_id
     ) o on o.owner_user_id = u.id
     order by u.created_at desc`
  );

  res.json({ users: result.rows || [] });
}

async function handleOrders(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  await ensureSalesTables();

  const result = await query(
    `select
       o.id,
       o.owner_user_id,
       u.email as owner_email,
       o.status,
       o.total_cents,
       o.summary,
       o.customer,
       o.pix,
       o.created_at
     from checkout_orders o
     left join users u on u.id = o.owner_user_id
     order by o.created_at desc
     limit 500`
  );

  res.json({ orders: result.rows || [] });
}

async function handleSetAdmin(req, res, userId) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  let body = {};
  try {
    body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
  } catch (_error) {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const isAdmin = body.is_admin === true;
  const result = await query(
    "update users set is_admin = $2 where id = $1 returning id, email, is_admin, created_at",
    [userId, isAdmin]
  );
  const row = result.rows?.[0];
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ ok: true, user: row });
}

module.exports = async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) {
    return;
  }

  try {
    const segments = getPathSegments(req);
    const [root, action, maybeId, maybeAction] = segments;

    if (root !== "global") {
      res.status(404).json({ error: "Not found" });
      return;
    }

    if (action === "summary") {
      await handleSummary(req, res);
      return;
    }

    if (action === "by-user") {
      await handleByUser(req, res);
      return;
    }

    if (action === "orders") {
      await handleOrders(req, res);
      return;
    }

    if (action === "users" && maybeId && maybeAction === "set-admin") {
      await handleSetAdmin(req, res, maybeId);
      return;
    }

    res.status(404).json({ error: "Not found" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
