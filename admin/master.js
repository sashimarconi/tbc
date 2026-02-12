const tokenKey = "admin_token";
let token = localStorage.getItem(tokenKey) || "";

const loginCard = document.getElementById("login-card");
const panel = document.getElementById("panel");
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const refreshBtn = document.getElementById("refresh-btn");
const summaryCards = document.getElementById("summary-cards");
const usersBody = document.getElementById("users-body");
const ordersBody = document.getElementById("orders-body");

function authHeaders() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function showLogin() {
  window.location.href = "/admin/index.html";
}

function showPanel() {
  loginCard.classList.add("hidden");
  panel.classList.remove("hidden");
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error("forbidden");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Erro na requisição");
  }
  return data;
}

function formatCurrency(cents = 0) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((Number(cents) || 0) / 100);
}

function formatDate(value) {
  if (!value) return "--";
  return new Date(value).toLocaleString("pt-BR");
}

function renderSummary(summary) {
  const cards = [
    ["Usuários", summary.total_users || 0],
    ["Pedidos", summary.total_orders || 0],
    ["Pagos", summary.paid_orders || 0],
    ["Pendentes", summary.pending_orders || 0],
    ["Visitors", summary.total_visitors || 0],
    ["Conversão", `${(Number(summary.conversion_rate) || 0).toFixed(2)}%`],
  ];
  summaryCards.innerHTML = cards
    .map(([label, value]) => `<article class="stat"><span>${label}</span><b>${value}</b></article>`)
    .join("");
}

function renderUsers(rows) {
  usersBody.innerHTML = rows
    .map((u) => {
      const nextAdmin = u.is_admin !== true;
      return `
        <tr>
          <td>${u.email || "--"}</td>
          <td>${formatDate(u.created_at)}</td>
          <td>${u.visitors || 0}</td>
          <td>${u.orders || 0}</td>
          <td>${u.paid_orders || 0}</td>
          <td>${(Number(u.conversion_rate) || 0).toFixed(2)}%</td>
          <td><span class="role ${u.is_admin ? "admin" : ""}">${u.is_admin ? "admin" : "user"}</span></td>
          <td><button class="btn-ghost" data-user-id="${u.id}" data-next-admin="${nextAdmin}">${nextAdmin ? "Promover" : "Rebaixar"}</button></td>
        </tr>
      `;
    })
    .join("");
}

function renderOrders(rows) {
  ordersBody.innerHTML = rows
    .map(
      (o) => `
      <tr>
        <td>${o.id}</td>
        <td>${o.owner_email || o.owner_user_id || "--"}</td>
        <td>${o.status || "--"}</td>
        <td>${formatCurrency(o.total_cents)}</td>
        <td>${formatDate(o.created_at)}</td>
      </tr>
    `
    )
    .join("");
}

async function loadData() {
  const [summary, byUser, orders] = await Promise.all([
    api("/api/admin/global/summary"),
    api("/api/admin/global/by-user"),
    api("/api/admin/global/orders"),
  ]);
  renderSummary(summary);
  renderUsers(byUser.users || []);
  renderOrders(orders.orders || []);
}

async function login(event) {
  event.preventDefault();
  loginError.textContent = "";
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      headers: {},
      body: JSON.stringify({
        email: (emailInput.value || "").trim(),
        password: passwordInput.value || "",
      }),
    });
    token = data.token || "";
    localStorage.setItem(tokenKey, token);
    if (data?.user?.is_admin !== true) {
      window.location.href = "/dashboard";
      return;
    }
    showPanel();
    await loadData();
  } catch (error) {
    loginError.textContent = error.message || "Falha no login";
  }
}

async function bootstrap() {
  if (!token) {
    showLogin();
    return;
  }

  try {
    const me = await api("/api/auth/me", { method: "GET" });
    if (me?.user?.is_admin !== true) {
      window.location.href = "/dashboard";
      return;
    }
    showPanel();
    await loadData();
  } catch (_error) {
    token = "";
    localStorage.removeItem(tokenKey);
    showLogin();
  }
}

loginForm.addEventListener("submit", login);
logoutBtn?.addEventListener("click", () => {
  token = "";
  localStorage.removeItem(tokenKey);
  window.location.href = "/admin/index.html";
});
refreshBtn?.addEventListener("click", () => loadData().catch(() => {}));

usersBody?.addEventListener("click", async (event) => {
  const btn = event.target.closest("button[data-user-id]");
  if (!btn) return;
  const userId = btn.getAttribute("data-user-id");
  const nextAdmin = btn.getAttribute("data-next-admin") === "true";
  try {
    await api(`/api/admin/global/users/${encodeURIComponent(userId)}/set-admin`, {
      method: "POST",
      body: JSON.stringify({ is_admin: nextAdmin }),
    });
    await loadData();
  } catch (error) {
    alert(error.message || "Não foi possível atualizar role");
  }
});

bootstrap();
