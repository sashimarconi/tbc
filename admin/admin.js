const loginSection = document.getElementById("login");
const panelSection = document.getElementById("panel");
const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("login-error");
const newItemForm = document.getElementById("new-item");
const itemsContainer = document.getElementById("items");
const panelTabs = document.querySelectorAll(".panel-tab");
const panelViews = document.querySelectorAll(".panel-view");
const statsUpdated = document.getElementById("stats-updated");
const timelineBody = document.getElementById("timeline-body");
const statElements = {
  online: document.getElementById("stat-online"),
  visitors: document.getElementById("stat-visitors"),
  checkoutVisits: document.getElementById("stat-checkout-visits"),
  checkoutStarts: document.getElementById("stat-checkout-starts"),
  pix: document.getElementById("stat-pix"),
  purchases: document.getElementById("stat-purchases"),
  conversion: document.getElementById("stat-conversion"),
};
const funnelValues = {
  visitors: document.getElementById("funnel-visitors"),
  checkout: document.getElementById("funnel-checkout"),
  starts: document.getElementById("funnel-starts"),
  purchases: document.getElementById("funnel-purchases"),
};
const funnelBars = {
  visitors: document.getElementById("funnel-visitors-bar"),
  checkout: document.getElementById("funnel-checkout-bar"),
  starts: document.getElementById("funnel-starts-bar"),
  purchases: document.getElementById("funnel-purchases-bar"),
};
const ordersStatsElements = {
  total: document.getElementById("orders-total"),
  pending: document.getElementById("orders-pending"),
  paid: document.getElementById("orders-paid"),
  amount: document.getElementById("orders-amount"),
};
const cartsStatsElements = {
  total: document.getElementById("carts-total"),
  open: document.getElementById("carts-open"),
  converted: document.getElementById("carts-converted"),
  value: document.getElementById("carts-value"),
};
const ordersTableBody = document.getElementById("orders-table-body");
const cartsTableBody = document.getElementById("carts-table-body");
const ordersRefreshBtn = document.getElementById("orders-refresh");
const cartsRefreshBtn = document.getElementById("carts-refresh");
const inspector = document.getElementById("inspector");
const inspectorType = document.getElementById("inspector-type");
const inspectorTitle = document.getElementById("inspector-title");
const inspectorBody = document.getElementById("inspector-body");
const inspectorClose = document.getElementById("inspector-close");
const numberFormatter = new Intl.NumberFormat("pt-BR");
const percentFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});
const DASHBOARD_INTERVAL = 15000;
const ORDERS_INTERVAL = 20000;
const CARTS_INTERVAL = 20000;

let token = localStorage.getItem("admin_token") || "";
let summaryInterval = null;
let ordersInterval = null;
let cartsInterval = null;

function setAuthHeader() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function login() {
  loginError.textContent = "";
  const password = passwordInput.value;
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  const data = await res.json();
  if (!res.ok) {
    loginError.textContent = data.error || "Erro no login";
    return;
  }

  token = data.token;
  localStorage.setItem("admin_token", token);
  showPanel();
}

function showPanel() {
  loginSection.classList.add("hidden");
  loginSection.hidden = true;
  panelSection.classList.remove("hidden");
  panelSection.hidden = false;
  startSummaryPolling();
  activateView("dashboard-view");
  loadItems();
}

function showLogin() {
  loginSection.classList.remove("hidden");
  loginSection.hidden = false;
  panelSection.classList.add("hidden");
  panelSection.hidden = true;
  stopSummaryPolling();
  stopOrdersPolling();
  stopCartsPolling();
  closeInspector();
}

function startSummaryPolling() {
  stopSummaryPolling();
  loadSummary();
  summaryInterval = setInterval(loadSummary, DASHBOARD_INTERVAL);
}

function stopSummaryPolling() {
  if (summaryInterval) {
    clearInterval(summaryInterval);
    summaryInterval = null;
  }
}

async function loadItems() {
  const res = await fetch("/api/admin/items", {
    headers: { ...setAuthHeader() },
  });
  const data = await res.json();
  if (!res.ok) {
    showLogin();
    return;
  }
  renderItems(data.items || []);
}

async function loadSummary() {
  const res = await fetch("/api/analytics/summary", {
    headers: { ...setAuthHeader() },
  });

  if (!res.ok) {
    if (res.status === 401) {
      showLogin();
    }
    return;
  }

  const data = await res.json();
  renderSummary(data);
}

function formatNumber(value) {
  return numberFormatter.format(value || 0);
}

function formatPercent(value) {
  return `${percentFormatter.format(value || 0)}%`;
}

function renderSummary(data = {}) {
  statElements.online.textContent = formatNumber(data.onlineNow);
  statElements.visitors.textContent = formatNumber(data.visitorsToday);
  statElements.checkoutVisits.textContent = formatNumber(data.checkoutVisitsToday);
  statElements.checkoutStarts.textContent = formatNumber(data.checkoutStartsToday);
  statElements.pix.textContent = formatNumber(data.pixGeneratedToday);
  statElements.purchases.textContent = formatNumber(data.purchasesToday);
  statElements.conversion.textContent = formatPercent(data.conversionRate);

  if (statsUpdated) {
    const updatedAt = new Date();
    statsUpdated.textContent = `Atualizado às ${updatedAt.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  updateFunnel(data);
  renderTimeline(data.timeline || []);
}

function updateFunnel(data) {
  const visitors = Number(data.visitorsToday) || 0;
  const checkout = Number(data.checkoutVisitsToday) || 0;
  const starts = Number(data.checkoutStartsToday) || 0;
  const purchases = Number(data.purchasesToday) || 0;
  const base = Math.max(visitors, 1);

  funnelValues.visitors.textContent = formatNumber(visitors);
  funnelValues.checkout.textContent = formatNumber(checkout);
  funnelValues.starts.textContent = formatNumber(starts);
  funnelValues.purchases.textContent = formatNumber(purchases);

  funnelBars.visitors.style.width = "100%";
  funnelBars.checkout.style.width = `${Math.min(100, (checkout / base) * 100).toFixed(2)}%`;
  funnelBars.starts.style.width = `${Math.min(100, (starts / base) * 100).toFixed(2)}%`;
  funnelBars.purchases.style.width = `${Math.min(100, (purchases / base) * 100).toFixed(2)}%`;
}

function renderTimeline(rows) {
  if (!timelineBody) {
    return;
  }

  if (!rows.length) {
    timelineBody.innerHTML = `<tr><td colspan="5">Sem dados nas últimas horas.</td></tr>`;
    return;
  }

  const html = rows
    .map((row) => {
      const date = row.bucket ? new Date(row.bucket) : null;
      const label = date
        ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : "--";
      return `
        <tr>
          <td>${label}</td>
          <td>${formatNumber(row.visits)}</td>
          <td>${formatNumber(row.checkoutViews)}</td>
          <td>${formatNumber(row.checkoutStarts)}</td>
          <td>${formatNumber(row.pix)}</td>
        </tr>
      `;
    })
    .join("");

  timelineBody.innerHTML = html;
}

function renderTableMessage(tbody, columns, message) {
  if (!tbody) {
    return;
  }
  tbody.innerHTML = `<tr><td colspan="${columns}">${message}</td></tr>`;
}

function formatCurrency(value) {
  const cents = Number(value || 0);
  return currencyFormatter.format(cents / 100);
}

function formatDateTime(value) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function mapOrderStatus(status) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "paid") {
    return { label: "Pago", tone: "paid" };
  }
  if (normalized === "failed") {
    return { label: "Falhou", tone: "pending" };
  }
  return { label: "Pendente", tone: "pending" };
}

function mapCartStatus(status) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "converted") {
    return { label: "Convertido", tone: "converted" };
  }
  if (normalized === "expired") {
    return { label: "Expirado", tone: "pending" };
  }
  return { label: "Aberto", tone: "open" };
}

function formatStageLabel(stage) {
  const normalized = (stage || "").toLowerCase();
  if (normalized === "address") return "Endereço";
  if (normalized === "payment") return "Pagamento";
  return "Contato";
}

function createStatusPill(config) {
  const span = document.createElement("span");
  span.className = `status-pill status-pill--${config.tone}`;
  span.textContent = config.label;
  return span;
}

function renderOrdersStats(stats = {}) {
  if (!ordersStatsElements.total) {
    return;
  }
  ordersStatsElements.total.textContent = formatNumber(Number(stats.total) || 0);
  ordersStatsElements.pending.textContent = formatNumber(Number(stats.pending) || 0);
  ordersStatsElements.paid.textContent = formatNumber(Number(stats.paid) || 0);
  ordersStatsElements.amount.textContent = formatCurrency(stats.total_amount);
}

function renderCartsStats(stats = {}) {
  if (!cartsStatsElements.total) {
    return;
  }
  cartsStatsElements.total.textContent = formatNumber(Number(stats.total) || 0);
  cartsStatsElements.open.textContent = formatNumber(Number(stats.open) || 0);
  cartsStatsElements.converted.textContent = formatNumber(Number(stats.converted) || 0);
  cartsStatsElements.value.textContent = formatCurrency(stats.total_value);
}

function renderOrdersTable(orders = []) {
  if (!ordersTableBody) {
    return;
  }
  if (!orders.length) {
    renderTableMessage(ordersTableBody, 5, "Nenhum pedido por enquanto.");
    return;
  }
  ordersTableBody.innerHTML = "";
  const fragment = document.createDocumentFragment();
  orders.forEach((order) => {
    const tr = document.createElement("tr");
    tr.dataset.orderId = order.id;

    const customerCell = document.createElement("td");
    const customerStack = document.createElement("div");
    customerStack.className = "cell-stack";
    const customerName = document.createElement("strong");
    customerName.textContent = order.customer?.name || "Cliente";
    const customerEmail = document.createElement("small");
    customerEmail.textContent = order.customer?.email || "--";
    customerStack.append(customerName, customerEmail);
    customerCell.appendChild(customerStack);

    const valueCell = document.createElement("td");
    valueCell.textContent = formatCurrency(order.total_cents ?? order.summary?.total_cents ?? 0);

    const statusCell = document.createElement("td");
    statusCell.appendChild(createStatusPill(mapOrderStatus(order.status)));

    const pixCell = document.createElement("td");
    pixCell.textContent = order.pix?.txid || "--";

    const createdCell = document.createElement("td");
    createdCell.textContent = formatDateTime(order.created_at);

    tr.append(customerCell, valueCell, statusCell, pixCell, createdCell);
    fragment.appendChild(tr);
  });
  ordersTableBody.appendChild(fragment);
}

function renderCartsTable(carts = []) {
  if (!cartsTableBody) {
    return;
  }
  if (!carts.length) {
    renderTableMessage(cartsTableBody, 6, "Nenhum carrinho capturado ainda.");
    return;
  }
  cartsTableBody.innerHTML = "";
  const fragment = document.createDocumentFragment();
  carts.forEach((cart) => {
    const tr = document.createElement("tr");
    tr.dataset.cartId = cart.id;

    const customerCell = document.createElement("td");
    const stack = document.createElement("div");
    stack.className = "cell-stack";
    const name = document.createElement("strong");
    name.textContent = cart.customer?.name || "Lead";
    const email = document.createElement("small");
    email.textContent = cart.customer?.email || "--";
    stack.append(name, email);
    customerCell.appendChild(stack);

    const stageCell = document.createElement("td");
    stageCell.textContent = formatStageLabel(cart.stage);

    const statusCell = document.createElement("td");
    statusCell.appendChild(createStatusPill(mapCartStatus(cart.status)));

    const totalCell = document.createElement("td");
    totalCell.textContent = formatCurrency(cart.total_cents ?? cart.summary?.total_cents ?? 0);

    const seenCell = document.createElement("td");
    seenCell.textContent = formatDateTime(cart.last_seen);

    const createdCell = document.createElement("td");
    createdCell.textContent = formatDateTime(cart.created_at);

    tr.append(customerCell, stageCell, statusCell, totalCell, seenCell, createdCell);
    fragment.appendChild(tr);
  });
  cartsTableBody.appendChild(fragment);
}

function startOrdersPolling() {
  if (ordersInterval) {
    return;
  }
  loadOrders();
  ordersInterval = setInterval(loadOrders, ORDERS_INTERVAL);
}

function stopOrdersPolling() {
  if (ordersInterval) {
    clearInterval(ordersInterval);
    ordersInterval = null;
  }
}

function startCartsPolling() {
  if (cartsInterval) {
    return;
  }
  loadCarts();
  cartsInterval = setInterval(loadCarts, CARTS_INTERVAL);
}

function stopCartsPolling() {
  if (cartsInterval) {
    clearInterval(cartsInterval);
    cartsInterval = null;
  }
}

async function loadOrders() {
  if (!ordersTableBody) {
    return;
  }
  try {
    const res = await fetch("/api/admin/orders", {
      headers: { ...setAuthHeader() },
    });
    if (!res.ok) {
      if (res.status === 401) {
        showLogin();
      }
      renderTableMessage(ordersTableBody, 5, "Não foi possível carregar os pedidos.");
      return;
    }
    const data = await res.json();
    renderOrdersStats(data.stats || {});
    renderOrdersTable(data.orders || []);
  } catch (error) {
    renderTableMessage(ordersTableBody, 5, "Erro ao carregar pedidos.");
  }
}

async function loadCarts() {
  if (!cartsTableBody) {
    return;
  }
  try {
    const res = await fetch("/api/admin/carts", {
      headers: { ...setAuthHeader() },
    });
    if (!res.ok) {
      if (res.status === 401) {
        showLogin();
      }
      renderTableMessage(cartsTableBody, 6, "Não foi possível carregar os carrinhos.");
      return;
    }
    const data = await res.json();
    renderCartsStats(data.stats || {});
    renderCartsTable(data.carts || []);
  } catch (error) {
    renderTableMessage(cartsTableBody, 6, "Erro ao carregar carrinhos.");
  }
}

function activateView(targetId) {
  if (!targetId) {
    return;
  }
  panelTabs.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.target === targetId);
  });
  panelViews.forEach((section) => {
    const isTarget = section.id === targetId;
    section.classList.toggle("hidden", !isTarget);
    section.hidden = !isTarget;
  });

  if (targetId === "orders-view") {
    startOrdersPolling();
    stopCartsPolling();
  } else if (targetId === "carts-view") {
    startCartsPolling();
    stopOrdersPolling();
  } else {
    stopOrdersPolling();
    stopCartsPolling();
  }

  if (targetId === "products-view") {
    loadItems();
  }
}

function renderItems(items) {
  itemsContainer.innerHTML = "";
  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div><strong>${item.type.toUpperCase()}</strong> - ${item.name}</div>
      <div class="item__row">
        <input data-field="name" value="${item.name || ""}" />
        <input data-field="description" value="${item.description || ""}" />
        <input data-field="price_cents" type="number" value="${
          item.price_cents || 0
        }" />
        <input data-field="compare_price_cents" type="number" value="${
          item.compare_price_cents || ""
        }" placeholder="Preço antigo" />
        <input data-field="sort" type="number" value="${item.sort || 0}" />
        <input data-field="image_url" value="${item.image_url || ""}" />
      </div>
      <div class="item__row">
        <select data-field="type">
          <option value="base" ${item.type === "base" ? "selected" : ""}>Base</option>
          <option value="bump" ${item.type === "bump" ? "selected" : ""}>Bump</option>
          <option value="upsell" ${item.type === "upsell" ? "selected" : ""}>Upsell</option>
          <option value="shipping" ${item.type === "shipping" ? "selected" : ""}>Frete</option>
        </select>
        <select data-field="active">
          <option value="true" ${item.active ? "selected" : ""}>Ativo</option>
          <option value="false" ${!item.active ? "selected" : ""}>Inativo</option>
        </select>
      </div>
      <div class="item__actions">
        <button data-action="save">Salvar</button>
        <button data-action="delete" class="ghost">Excluir</button>
      </div>
    `;

    el.querySelector("[data-action=save]").addEventListener("click", async () => {
      const payload = collectItem(el);
      await updateItem(item.id, payload);
    });

    el.querySelector("[data-action=delete]").addEventListener("click", async () => {
      if (!confirm("Excluir item?")) {
        return;
      }
      await deleteItem(item.id);
    });

    itemsContainer.appendChild(el);
  });
}

function collectItem(el) {
  const payload = {};
  el.querySelectorAll("[data-field]").forEach((input) => {
    payload[input.dataset.field] = input.value;
  });
  payload.active = payload.active === "true";
  payload.price_cents = Number(payload.price_cents || 0);
  if (payload.compare_price_cents !== undefined) {
    payload.compare_price_cents = payload.compare_price_cents
      ? Number(payload.compare_price_cents)
      : null;
  }
  payload.sort = Number(payload.sort || 0);
  return payload;
}

async function updateItem(id, payload) {
  await fetch(`/api/admin/items?id=${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...setAuthHeader(),
    },
    body: JSON.stringify(payload),
  });
  loadItems();
}

async function deleteItem(id) {
  await fetch(`/api/admin/items?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...setAuthHeader() },
  });
  loadItems();
}

function closeInspector() {
  if (!inspector) {
    return;
  }
  inspector.classList.add("hidden");
  inspector.hidden = true;
}

async function openInspector(type, id) {
  if (!inspector || !id) {
    return;
  }
  inspector.classList.remove("hidden");
  inspector.hidden = false;
  inspectorType.textContent = type === "order" ? `Pedido #${id}` : `Carrinho #${id}`;
  inspectorTitle.textContent = "Carregando...";
  inspectorBody.innerHTML = '<p class="muted">Buscando detalhes...</p>';

  const endpoint =
    type === "order"
      ? `/api/admin/orders?id=${encodeURIComponent(id)}`
      : `/api/admin/carts?id=${encodeURIComponent(id)}`;
  try {
    const res = await fetch(endpoint, {
      headers: { ...setAuthHeader() },
    });
    if (!res.ok) {
      if (res.status === 401) {
        showLogin();
        return;
      }
      inspectorBody.innerHTML = '<p class="muted">Não foi possível carregar os detalhes.</p>';
      return;
    }
    const data = await res.json();
    if (type === "order") {
      renderInspectorOrder(data.order);
    } else {
      renderInspectorCart(data.cart);
    }
  } catch (error) {
    inspectorBody.innerHTML = '<p class="muted">Erro ao consultar o servidor.</p>';
  }
}

function renderInspectorOrder(order) {
  if (!order) {
    inspectorBody.innerHTML = '<p class="muted">Pedido não encontrado.</p>';
    return;
  }
  inspectorType.textContent = `Pedido #${order.id}`;
  inspectorTitle.textContent = order.customer?.name || "Cliente";
  inspectorBody.innerHTML = "";

  const summaryRows = [
    ["Status", mapOrderStatus(order.status).label],
    ["Valor total", formatCurrency(order.total_cents ?? order.summary?.total_cents ?? 0)],
    ["Subtotal", formatCurrency(order.subtotal_cents ?? order.summary?.subtotal_cents ?? 0)],
    ["Frete", formatCurrency(order.shipping_cents ?? order.summary?.shipping_cents ?? 0)],
    ["Criado em", formatDateTime(order.created_at)],
  ];
  inspectorBody.appendChild(createDataSection("Resumo do pedido", summaryRows));

  if (order.pix) {
    const pixRows = [
      ["TXID", order.pix.txid || "--"],
      ["Expira", order.pix.expires_at ? formatDateTime(order.pix.expires_at) : "--"],
    ];
    inspectorBody.appendChild(createDataSection("Pix", pixRows));
  }

  if (order.customer) {
    const customerRows = [
      ["Nome", order.customer.name || "--"],
      ["Email", order.customer.email || "--"],
      ["Telefone", order.customer.cellphone || order.customer.phone || "--"],
      ["Documento", order.customer.taxId || order.customer.tax_id || "--"],
    ];
    inspectorBody.appendChild(createDataSection("Cliente", customerRows));
  }

  const address = order.address || order.customer?.address;
  if (address) {
    const addressRows = [
      ["Rua", address.street || "--"],
      ["Número", address.number || address.address_number || "--"],
      ["CEP", address.cep || "--"],
      ["Cidade", address.city || "--"],
      ["Estado", address.state || "--"],
      ["Complemento", address.complement || "--"],
    ];
    inspectorBody.appendChild(createDataSection("Entrega", addressRows));
  }

  if (Array.isArray(order.items) && order.items.length) {
    inspectorBody.appendChild(createItemsSection(order.items));
  }

  if (order.utm) {
    const utmRows = buildKeyValueRows(order.utm);
    if (utmRows.length) {
      inspectorBody.appendChild(createDataSection("UTM", utmRows));
    }
  }

  if (order.tracking?.src) {
    inspectorBody.appendChild(
      createDataSection("Origem", [["URL", order.tracking.src || "--"]])
    );
  }
}

function renderInspectorCart(cart) {
  if (!cart) {
    inspectorBody.innerHTML = '<p class="muted">Carrinho não encontrado.</p>';
    return;
  }
  inspectorType.textContent = `Carrinho #${cart.id}`;
  inspectorTitle.textContent = cart.customer?.name || cart.cart_key || "Carrinho";
  inspectorBody.innerHTML = "";

  const summaryRows = [
    ["Status", mapCartStatus(cart.status).label],
    ["Etapa", formatStageLabel(cart.stage)],
    ["Valor", formatCurrency(cart.total_cents ?? cart.summary?.total_cents ?? 0)],
    ["Último contato", formatDateTime(cart.last_seen)],
    ["Criado em", formatDateTime(cart.created_at)],
    ["Cart ID", cart.cart_key || "--"],
  ];
  inspectorBody.appendChild(createDataSection("Status do carrinho", summaryRows));

  if (cart.customer) {
    const customerRows = [
      ["Nome", cart.customer.name || "--"],
      ["Email", cart.customer.email || "--"],
      ["Telefone", cart.customer.cellphone || cart.customer.phone || "--"],
    ];
    inspectorBody.appendChild(createDataSection("Lead", customerRows));
  }

  if (cart.address) {
    const addressRows = [
      ["Rua", cart.address.street || "--"],
      ["Número", cart.address.number || cart.address.address_number || "--"],
      ["CEP", cart.address.cep || "--"],
      ["Cidade", cart.address.city || "--"],
      ["Estado", cart.address.state || "--"],
    ];
    inspectorBody.appendChild(createDataSection("Endereço informado", addressRows));
  }

  if (Array.isArray(cart.items) && cart.items.length) {
    inspectorBody.appendChild(createItemsSection(cart.items, "Itens do carrinho"));
  }

  if (cart.utm) {
    const utmRows = buildKeyValueRows(cart.utm);
    if (utmRows.length) {
      inspectorBody.appendChild(createDataSection("UTM", utmRows));
    }
  }

  if (cart.tracking?.src) {
    inspectorBody.appendChild(
      createDataSection("Origem", [["URL", cart.tracking.src || "--"]])
    );
  }
}

function createDataSection(title, rows = []) {
  const section = document.createElement("section");
  section.className = "data-section";
  const heading = document.createElement("h4");
  heading.textContent = title;
  section.appendChild(heading);
  if (rows.length) {
    const list = document.createElement("ul");
    list.className = "data-grid";
    rows.forEach(([label, value]) => {
      const li = document.createElement("li");
      li.className = "data-grid__row";
      const span = document.createElement("span");
      span.textContent = label;
      const strong = document.createElement("strong");
      strong.textContent = value;
      li.append(span, strong);
      list.appendChild(li);
    });
    section.appendChild(list);
  }
  return section;
}

function createItemsSection(items, title = "Itens") {
  const section = document.createElement("section");
  section.className = "data-section";
  const heading = document.createElement("h4");
  heading.textContent = title;
  section.appendChild(heading);
  const list = document.createElement("ul");
  list.className = "items-list";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "items-list__item";
    const name = document.createElement("strong");
    name.textContent = item.name || "Item";
    const meta = document.createElement("span");
    const typeLabel = (item.type || "produto").toString().toUpperCase();
    meta.textContent = `${typeLabel} • ${formatCurrency(item.price_cents ?? item.total_cents ?? 0)}`;
    li.append(name, meta);
    list.appendChild(li);
  });
  section.appendChild(list);
  return section;
}

function buildKeyValueRows(obj) {
  if (!obj || typeof obj !== "object") {
    return [];
  }
  return Object.entries(obj)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => [key.toUpperCase(), String(value)]);
}

newItemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(newItemForm);
  const payload = Object.fromEntries(formData.entries());
  payload.active = payload.active === "true";
  payload.price_cents = Number(payload.price_cents || 0);
  payload.compare_price_cents = payload.compare_price_cents
    ? Number(payload.compare_price_cents)
    : null;
  payload.sort = Number(payload.sort || 0);

  await fetch("/api/admin/items", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...setAuthHeader(),
    },
    body: JSON.stringify(payload),
  });

  newItemForm.reset();
  loadItems();
});

loginBtn.addEventListener("click", login);
loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  login();
});
logoutBtn.addEventListener("click", () => {
  token = "";
  localStorage.removeItem("admin_token");
  showLogin();
});

ordersRefreshBtn?.addEventListener("click", () => loadOrders());
cartsRefreshBtn?.addEventListener("click", () => loadCarts());

ordersTableBody?.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-order-id]");
  if (!row) {
    return;
  }
  openInspector("order", row.dataset.orderId);
});

cartsTableBody?.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-cart-id]");
  if (!row) {
    return;
  }
  openInspector("cart", row.dataset.cartId);
});

inspectorClose?.addEventListener("click", closeInspector);
inspector?.addEventListener("click", (event) => {
  if (event.target === inspector) {
    closeInspector();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeInspector();
  }
});

panelTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    if (tab.classList.contains("is-active")) {
      return;
    }
    activateView(tab.dataset.target);
  });
});

if (token) {
  showPanel();
} else {
  showLogin();
}
