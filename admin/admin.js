const loginSection = document.getElementById("login");
const panelSection = document.getElementById("panel");
const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("login-error");
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
const productsTableBody = document.getElementById("products-table-body");
const productsSearchInput = document.getElementById("products-search");
const createProductBtn = document.getElementById("create-product-btn");
const productModal = document.getElementById("product-modal");
const productModalTitle = document.getElementById("product-modal-title");
const productForm = document.getElementById("product-form");
const productNameInput = document.getElementById("product-name");
const productDescriptionInput = document.getElementById("product-description");
const productPriceInput = document.getElementById("product-price");
const productCompareInput = document.getElementById("product-compare");
const productActiveSelect = document.getElementById("product-active");
const productSortInput = document.getElementById("product-sort");
const formFactorButtons = document.querySelectorAll("[data-form-factor]");
const logisticsSection = document.getElementById("logistics-section");
const logHeightInput = document.getElementById("log-height");
const logWidthInput = document.getElementById("log-width");
const logLengthInput = document.getElementById("log-length");
const logWeightInput = document.getElementById("log-weight");
const mediaTabs = document.querySelectorAll("[data-image-mode]");
const mediaPanels = document.querySelectorAll("[data-image-panel]");
const productImageUpload = document.getElementById("product-image-upload");
const productImageUrl = document.getElementById("product-image-url");
const productImagePreview = document.querySelector("#product-image-preview img");
const productUploadLabel = document.querySelector("#product-upload-tile span");
const productSubmitBtn = document.getElementById("product-submit");
const orderBumpsView = document.getElementById("order-bumps-view");
const orderBumpsSearchInput = document.getElementById("order-bumps-search");
const orderBumpsList = document.getElementById("order-bumps-list");
const orderBumpsEmpty = document.getElementById("order-bumps-empty");
const orderBumpsEmptyBtn = document.getElementById("order-bumps-empty-btn");
const bumpsActiveCount = document.getElementById("bumps-active-count");
const bumpsInactiveCount = document.getElementById("bumps-inactive-count");
const bumpsTotalCount = document.getElementById("bumps-total-count");
const createBumpBtn = document.getElementById("create-bump-btn");
const bumpModal = document.getElementById("order-bump-modal");
const bumpModalTitle = document.getElementById("order-bump-modal-title");
const bumpForm = document.getElementById("order-bump-form");
const bumpTitleInput = document.getElementById("bump-title");
const bumpDescriptionInput = document.getElementById("bump-description");
const bumpPriceInput = document.getElementById("bump-price");
const bumpCompareInput = document.getElementById("bump-compare");
const bumpActiveInput = document.getElementById("bump-active");
const bumpApplyAllInput = document.getElementById("bump-apply-all");
const bumpTriggersList = document.getElementById("bump-triggers-list");
const bumpSubmitBtn = document.getElementById("bump-submit");
const bumpMediaTabs = document.querySelectorAll("[data-bump-image-mode]");
const bumpMediaPanels = document.querySelectorAll("[data-bump-image-panel]");
const bumpImageUpload = document.getElementById("bump-image-upload");
const bumpImageUrlInput = document.getElementById("bump-image-url");
const bumpImagePreview = document.querySelector("#bump-image-preview img");
const bumpUploadLabel = document.querySelector("#bump-upload-tile span");
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
let productsCache = [];
let productModalMode = "create";
let editingProductId = null;
let editingProductType = "base";
let selectedFormFactor = "physical";
let currentImageMode = "upload";
let currentImageValue = "";
let bumpModalMode = "create";
let editingBumpId = null;
let currentBumpImageMode = "upload";
let currentBumpImageValue = "";
let editingBumpSort = 0;
const fallbackProductImage = "https://dummyimage.com/200x200/ede9df/8a8277&text=Produto";

function setAuthHeader() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function buildCheckoutLink(slug) {
  if (!slug) {
    return "";
  }
  const origin = window.location?.origin?.replace(/\/$/, "") || "";
  return `${origin}/checkout/${slug}`;
}

async function copyToClipboard(value) {
  if (!value) {
    return;
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const tempInput = document.createElement("textarea");
  tempInput.value = value;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);
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

function escapeHtml(value = "") {
  return value
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseCurrencyInput(value) {
  if (!value) {
    return 0;
  }
  const normalized = value
    .toString()
    .replace(/[^0-9,.-]/g, "")
    .replace(/,/g, ".");
  const amount = Number(normalized);
  if (Number.isNaN(amount)) {
    return 0;
  }
  return Math.round(amount * 100);
}

function formatCentsForField(cents) {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function updateImagePreview(src) {
  if (!productImagePreview) {
    return;
  }
  productImagePreview.src = src || fallbackProductImage;
}

function isStoredMediaUrl(value) {
  return typeof value === "string" && value.includes("/api/public/media");
}

function setFormFactor(factor) {
  selectedFormFactor = factor === "digital" ? "digital" : "physical";
  formFactorButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.formFactor === selectedFormFactor);
  });
  if (logisticsSection) {
    logisticsSection.classList.toggle("hidden", selectedFormFactor === "digital");
  }
}

function setImageMode(mode) {
  currentImageMode = mode;
  mediaTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.imageMode === mode);
  });
  mediaPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.imagePanel !== mode);
  });
}

function updateUploadState(uploading, labelEl) {
  const label = labelEl || document.querySelector(".upload-tile span");
  if (!label) {
    return;
  }
  label.textContent = uploading ? "Enviando..." : "Arraste ou clique para enviar";
}

function uploadMediaFile(file, { labelEl, onSuccess }) {
  if (!file) {
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    alert("Envie imagens de até 2MB.");
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      updateUploadState(true, labelEl);
      const uploaded = await uploadProductImage(reader.result, file.name);
      const url = uploaded?.file?.url || uploaded?.url || "";
      onSuccess(url);
    } catch (error) {
      console.error(error);
      alert(error.message || "Não foi possível enviar a imagem.");
    } finally {
      updateUploadState(false, labelEl);
    }
  };
  reader.readAsDataURL(file);
}

function handleImageUploadChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  uploadMediaFile(file, {
    labelEl: productUploadLabel,
    onSuccess: (url) => {
      currentImageValue = url;
      if (productImageUrl) {
        productImageUrl.value = "";
      }
      setImageMode("upload");
      updateImagePreview(currentImageValue);
    },
  });
  event.target.value = "";
}

function setBumpImageMode(mode) {
  currentBumpImageMode = mode;
  bumpMediaTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.bumpImageMode === mode);
  });
  bumpMediaPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.bumpImagePanel !== mode);
  });
}

function updateBumpImagePreview(src) {
  if (!bumpImagePreview) {
    return;
  }
  bumpImagePreview.src = src || fallbackProductImage;
}

function handleBumpImageUploadChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  uploadMediaFile(file, {
    labelEl: bumpUploadLabel,
    onSuccess: (url) => {
      currentBumpImageValue = url;
      if (bumpImageUrlInput) {
        bumpImageUrlInput.value = "";
      }
      setBumpImageMode("upload");
      updateBumpImagePreview(currentBumpImageValue);
    },
  });
  event.target.value = "";
}

function updateUploadState(uploading) {
  const label = document.querySelector(".upload-tile span");
  if (!label) {
    return;
  }
  label.textContent = uploading ? "Enviando..." : "Arraste ou clique para enviar";
}

async function uploadProductImage(dataUrl, filename) {
  const res = await fetch("/api/admin/uploads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...setAuthHeader(),
    },
    body: JSON.stringify({ data_url: dataUrl, filename }),
  });
  const raw = await res.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (error) {
      data = null;
    }
  }
  if (!res.ok) {
    const message = data?.error || raw || "Falha no upload";
    throw new Error(message);
  }
  return data || {};
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
  } else if (targetId === "order-bumps-view") {
    loadItems();
    renderOrderBumpsList();
  }
}

function renderItems(items = []) {
  productsCache = Array.isArray(items) ? items : [];
  renderProductsTable();
  renderOrderBumpsList();
}

function getBaseProducts() {
  return productsCache.filter((product) => product.type === "base");
}

function getBumpProducts() {
  return productsCache.filter((product) => product.type === "bump");
}

function renderProductsTable() {
  if (!productsTableBody) {
    return;
  }
  const searchTerm = (productsSearchInput?.value || "").trim().toLowerCase();
  const bases = getBaseProducts();
  const filtered = bases.filter((product) => {
    if (!searchTerm) {
      return true;
    }
    const haystack = `${product.name || ""} ${product.description || ""}`.toLowerCase();
    return haystack.includes(searchTerm);
  });

  if (!filtered.length) {
    productsTableBody.innerHTML = `<tr><td colspan="5">Nenhum produto base encontrado.</td></tr>`;
    return;
  }

  const typeMap = {
    base: "Oferta base",
    bump: "Bump",
    upsell: "Upsell",
    shipping: "Frete",
  };

  const rows = filtered
    .map((item) => {
      const image = item.image_url || fallbackProductImage;
      const typeLabel = typeMap[item.type] || item.type;
      const formFactorLabel = item.form_factor === "digital" ? "Digital" : "Físico";
      const formFactorClass = item.form_factor === "digital" ? "pill pill--digital" : "pill";
      const priceHtml = `
        <div class="product-price">
          <strong>${formatCurrency(item.price_cents)}</strong>
          ${
            item.compare_price_cents
              ? `<small>De ${formatCurrency(item.compare_price_cents)}</small>`
              : ""
          }
        </div>`;
      const statusClass = item.active
        ? "product-status product-status--active"
        : "product-status product-status--draft";
      const statusLabel = item.active ? "Publicado" : "Rascunho";
      const shareLink = item.type === "base" && item.slug ? buildCheckoutLink(item.slug) : "";
      const shareButton = shareLink
        ? `<button type="button" class="ghost" data-action="share" data-product-id="${item.id}">Copiar link</button>`
        : "";
      return `
        <tr data-product-id="${item.id}">
          <td>
            <div class="product-cell">
              <img src="${image}" alt="${escapeHtml(item.name || "Produto")}" />
              <div>
                <strong>${escapeHtml(item.name || "Produto")}</strong>
                <span>${escapeHtml(typeLabel)}</span>
              </div>
            </div>
          </td>
          <td><span class="${formFactorClass}">${formFactorLabel}</span></td>
          <td>${priceHtml}</td>
          <td><span class="${statusClass}">${statusLabel}</span></td>
          <td>
            <div class="product-actions">
              <button type="button" class="ghost" data-action="edit" data-product-id="${item.id}">Editar</button>
              ${shareButton}
              <button type="button" class="ghost" data-action="delete" data-product-id="${item.id}">Excluir</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  productsTableBody.innerHTML = rows;
}

function renderOrderBumpsList() {
  if (!orderBumpsList) {
    return;
  }
  const baseProducts = getBaseProducts();
  const bumps = getBumpProducts();
  const activeCount = bumps.filter((item) => item.active).length;
  const totalCount = bumps.length;
  const inactiveCount = Math.max(totalCount - activeCount, 0);
  if (bumpsActiveCount) bumpsActiveCount.textContent = activeCount;
  if (bumpsInactiveCount) bumpsInactiveCount.textContent = inactiveCount;
  if (bumpsTotalCount) bumpsTotalCount.textContent = totalCount;

  if (!totalCount) {
    orderBumpsEmpty?.classList.remove("hidden");
    orderBumpsList.innerHTML = "";
    return;
  }

  orderBumpsEmpty?.classList.add("hidden");
  const searchTerm = (orderBumpsSearchInput?.value || "").trim().toLowerCase();
  const filtered = bumps
    .filter((item) => {
      if (!searchTerm) {
        return true;
      }
      const haystack = `${item.name || ""} ${item.description || ""}`.toLowerCase();
      return haystack.includes(searchTerm);
    })
    .sort((a, b) => {
      if (a.sort !== b.sort) {
        return Number(a.sort || 0) - Number(b.sort || 0);
      }
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });

  if (!filtered.length) {
    orderBumpsList.innerHTML = `<div class="bump-empty-row">Nenhum order bump corresponde à busca.</div>`;
    return;
  }

  orderBumpsList.innerHTML = filtered
    .map((item) => {
      const image = item.image_url || fallbackProductImage;
      const statusLabel = item.active ? "Ativo" : "Inativo";
      const pillClass = item.active ? "bump-pill bump-pill--active" : "bump-pill bump-pill--inactive";
      const compareHtml = item.compare_price_cents
        ? `<small>De ${formatCurrency(item.compare_price_cents)}</small>`
        : "";
      const rule = item.bump_rule || { apply_to_all: true, trigger_product_ids: [] };
      const triggerNames = Array.isArray(rule.trigger_product_ids)
        ? baseProducts
            .filter((product) => rule.trigger_product_ids.includes(product.id))
            .map((product) => product.name || "Produto")
        : [];
      const ruleDetail = rule.apply_to_all !== false
        ? "Mostrado em todos os checkouts"
        : triggerNames.length
        ? `Mostrado em ${triggerNames.join(", ")}`
        : `Mostrado em ${rule.trigger_product_ids.length} produto(s)`;
      const safeRuleText = escapeHtml(ruleDetail);
      return `
        <article class="bump-card" data-bump-id="${item.id}">
          <div class="bump-card__header">
            <img src="${image}" alt="${escapeHtml(item.name || "Order bump")}" />
            <div>
              <strong>${escapeHtml(item.name || "Order bump")}</strong>
              <span class="muted">${escapeHtml(item.description || "Sem descrição")}</span>
            </div>
          </div>
          <div class="bump-meta">
            <div>
              <strong>${formatCurrency(item.price_cents)}</strong>
              ${compareHtml}
            </div>
            <span class="${pillClass}">${statusLabel}</span>
          </div>
          <p class="muted">${safeRuleText}</p>
          <div class="bump-actions">
            <button type="button" class="ghost" data-bump-action="edit" data-bump-id="${item.id}">Editar</button>
            <button type="button" class="ghost" data-bump-action="delete" data-bump-id="${item.id}">Excluir</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function resetProductForm() {
  if (!productForm) {
    return;
  }
  productForm.reset();
  productDescriptionInput.value = "";
  productSortInput.value = "0";
  productCompareInput.value = "";
  editingProductType = "base";
  if (productImageUrl) {
    productImageUrl.value = "";
  }
  logHeightInput.value = "";
  logWidthInput.value = "";
  logLengthInput.value = "";
  logWeightInput.value = "";
  currentImageValue = "";
  if (productImageUpload) {
    productImageUpload.value = "";
  }
  if (productImageUrl) {
    productImageUrl.value = "";
  }
  updateImagePreview("");
  setFormFactor("physical");
  setImageMode("upload");
}

function fillProductForm(item) {
  editingProductType = item.type || "base";
  productNameInput.value = item.name || "";
  productDescriptionInput.value = item.description || "";
  productPriceInput.value = formatCentsForField(item.price_cents);
  productCompareInput.value = item.compare_price_cents
    ? formatCentsForField(item.compare_price_cents)
    : "";
  productActiveSelect.value = item.active ? "true" : "false";
  productSortInput.value = Number(item.sort || 0);
  logHeightInput.value = Number(item.height_cm || 0) || "";
  logWidthInput.value = Number(item.width_cm || 0) || "";
  logLengthInput.value = Number(item.length_cm || 0) || "";
  logWeightInput.value = Number(item.weight_grams || 0) || "";
  setFormFactor(item.form_factor === "digital" ? "digital" : "physical");
  currentImageValue = item.image_url || "";
  updateImagePreview(currentImageValue);
  const storedUpload = isStoredMediaUrl(currentImageValue);
  if (productImageUrl) {
    productImageUrl.value = storedUpload ? "" : currentImageValue;
  }
  const mode = storedUpload ? "upload" : currentImageValue ? "url" : "upload";
  setImageMode(mode);
}

function openProductModal(mode, product) {
  if (!productModal || !productForm) {
    return;
  }
  productModalMode = mode;
  editingProductId = product?.id || null;
  productModalTitle.textContent =
    mode === "edit" ? `Editar ${product?.name || "produto"}` : "Criar produto";
  resetProductForm();
  if (mode === "edit" && product) {
    fillProductForm(product);
  }
  productModal.classList.remove("hidden");
  productModal.hidden = false;
  setTimeout(() => {
    productNameInput?.focus();
  }, 60);
}

function closeProductModal() {
  if (!productModal) {
    return;
  }
  productModal.classList.add("hidden");
  productModal.hidden = true;
  editingProductId = null;
}

function resolveImageValue() {
  const manualValue = productImageUrl?.value.trim() || "";
  if (currentImageMode === "url") {
    return manualValue;
  }
  if (currentImageValue) {
    return currentImageValue;
  }
  return manualValue;
}

function collectProductPayload() {
  const priceCents = parseCurrencyInput(productPriceInput.value);
  const compareCents = productCompareInput.value
    ? parseCurrencyInput(productCompareInput.value)
    : null;
  const itemType = editingProductType || "base";
  const payload = {
    type: itemType,
    name: productNameInput.value.trim(),
    description: productDescriptionInput.value.trim(),
    price_cents: priceCents,
    compare_price_cents: compareCents,
    active: productActiveSelect.value !== "false",
    sort: Number(productSortInput.value || 0),
    image_url: resolveImageValue(),
    form_factor: selectedFormFactor,
    requires_address: selectedFormFactor !== "digital",
    weight_grams: selectedFormFactor === "digital" ? 0 : Number(logWeightInput.value || 0),
    length_cm: selectedFormFactor === "digital" ? 0 : Number(logLengthInput.value || 0),
    width_cm: selectedFormFactor === "digital" ? 0 : Number(logWidthInput.value || 0),
    height_cm: selectedFormFactor === "digital" ? 0 : Number(logHeightInput.value || 0),
  };
  return payload;
}

function resetBumpForm() {
  if (!bumpForm) {
    return;
  }
  bumpForm.reset();
  bumpTitleInput.value = "";
  bumpDescriptionInput.value = "";
  bumpPriceInput.value = "";
  bumpCompareInput.value = "";
  bumpActiveInput.checked = true;
  bumpApplyAllInput.checked = true;
  editingBumpSort = 0;
  currentBumpImageValue = "";
  if (bumpImageUpload) {
    bumpImageUpload.value = "";
  }
  if (bumpImageUrlInput) {
    bumpImageUrlInput.value = "";
  }
  setBumpImageMode("upload");
  updateBumpImagePreview("");
  renderBumpTriggerOptions([]);
  toggleBumpTriggerList(true);
}

function renderBumpTriggerOptions(selectedIds = []) {
  if (!bumpTriggersList) {
    return;
  }
  const baseProducts = getBaseProducts();
  if (!baseProducts.length) {
    bumpTriggersList.innerHTML = '<p class="muted">Cadastre um produto base para usar gatilhos.</p>';
    return;
  }
  bumpTriggersList.innerHTML = baseProducts
    .map((product) => {
      const checked = selectedIds.includes(product.id) ? "checked" : "";
      return `
        <label>
          <input type="checkbox" value="${product.id}" ${checked} />
          <span>${escapeHtml(product.name || "Produto")}</span>
        </label>
      `;
    })
    .join("");
}

function toggleBumpTriggerList(applyAll) {
  if (!bumpTriggersList) {
    return;
  }
  const hasBaseProducts = getBaseProducts().length > 0;
  bumpTriggersList.classList.toggle("hidden", applyAll && hasBaseProducts);
}

function getSelectedTriggerIds() {
  if (!bumpTriggersList) {
    return [];
  }
  return Array.from(bumpTriggersList.querySelectorAll('input[type="checkbox"]:checked')).map(
    (input) => input.value
  );
}

function resolveBumpImageValue() {
  const manualValue = bumpImageUrlInput?.value.trim() || "";
  if (currentBumpImageMode === "url") {
    return manualValue;
  }
  if (currentBumpImageValue) {
    return currentBumpImageValue;
  }
  return manualValue;
}

function fillBumpForm(item) {
  bumpTitleInput.value = item.name || "";
  bumpDescriptionInput.value = item.description || "";
  bumpPriceInput.value = formatCentsForField(item.price_cents);
  bumpCompareInput.value = item.compare_price_cents
    ? formatCentsForField(item.compare_price_cents)
    : "";
  bumpActiveInput.checked = item.active !== false;
  editingBumpSort = Number(item.sort || 0);
  const rule = item.bump_rule || { apply_to_all: true, trigger_product_ids: [] };
  bumpApplyAllInput.checked = rule.apply_to_all !== false;
  renderBumpTriggerOptions(rule.trigger_product_ids || []);
  toggleBumpTriggerList(bumpApplyAllInput.checked);
  currentBumpImageValue = item.image_url || "";
  updateBumpImagePreview(currentBumpImageValue);
  const storedUpload = isStoredMediaUrl(currentBumpImageValue);
  if (bumpImageUrlInput) {
    bumpImageUrlInput.value = storedUpload ? "" : currentBumpImageValue;
  }
  const mode = storedUpload ? "upload" : currentBumpImageValue ? "url" : "upload";
  setBumpImageMode(mode);
}

function openBumpModal(mode, bump) {
  if (!bumpModal || !bumpForm) {
    return;
  }
  bumpModalMode = mode;
  editingBumpId = bump?.id || null;
  bumpModalTitle.textContent =
    mode === "edit" ? `Editar ${bump?.name || "order bump"}` : "Criar order bump";
  resetBumpForm();
  if (mode === "edit" && bump) {
    fillBumpForm(bump);
  }
  bumpModal.classList.remove("hidden");
  bumpModal.hidden = false;
  setTimeout(() => {
    bumpTitleInput?.focus();
  }, 60);
}

function closeBumpModal() {
  if (!bumpModal) {
    return;
  }
  bumpModal.classList.add("hidden");
  bumpModal.hidden = true;
  editingBumpId = null;
}

function collectBumpPayload() {
  const priceCents = parseCurrencyInput(bumpPriceInput.value);
  const compareCents = bumpCompareInput.value ? parseCurrencyInput(bumpCompareInput.value) : null;
  const applyAll = bumpApplyAllInput?.checked !== false;
  return {
    type: "bump",
    name: bumpTitleInput.value.trim(),
    description: bumpDescriptionInput.value.trim(),
    price_cents: priceCents,
    compare_price_cents: compareCents,
    active: bumpActiveInput?.checked !== false,
    sort: editingBumpSort || 0,
    image_url: resolveBumpImageValue(),
    form_factor: "digital",
    requires_address: false,
    weight_grams: 0,
    length_cm: 0,
    width_cm: 0,
    height_cm: 0,
    bump_rule: {
      apply_to_all: applyAll,
      trigger_product_ids: applyAll ? [] : getSelectedTriggerIds(),
    },
  };
}

async function handleBumpSubmit(event) {
  event.preventDefault();
  if (!bumpForm) {
    return;
  }
  const applyAll = bumpApplyAllInput?.checked !== false;
  if (!applyAll) {
    const selectedTriggers = getSelectedTriggerIds();
    if (!selectedTriggers.length) {
      alert("Selecione pelo menos um produto gatilho ou deixe a opção de aplicar em todos.");
      return;
    }
  }
  const payload = collectBumpPayload();
  if (!payload.name) {
    alert("Informe o título do order bump.");
    return;
  }
  const originalText = bumpSubmitBtn?.textContent;
  if (bumpSubmitBtn) {
    bumpSubmitBtn.disabled = true;
    bumpSubmitBtn.textContent = "Salvando...";
  }
  try {
    if (bumpModalMode === "edit" && editingBumpId) {
      await updateItem(editingBumpId, payload);
    } else {
      await fetch("/api/admin/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...setAuthHeader(),
        },
        body: JSON.stringify(payload),
      });
    }
    closeBumpModal();
    loadItems();
  } catch (error) {
    alert("Não foi possível salvar o order bump.");
  } finally {
    if (bumpSubmitBtn) {
      bumpSubmitBtn.disabled = false;
      bumpSubmitBtn.textContent = originalText || "Salvar order bump";
    }
  }
}

async function handleProductSubmit(event) {
  event.preventDefault();
  if (!productForm) {
    return;
  }
  const payload = collectProductPayload();
  if (!payload.name || !payload.type) {
    alert("Preencha os campos obrigatórios.");
    return;
  }
  const originalText = productSubmitBtn?.textContent;
  if (productSubmitBtn) {
    productSubmitBtn.disabled = true;
    productSubmitBtn.textContent = "Salvando...";
  }
  try {
    if (productModalMode === "edit" && editingProductId) {
      await updateItem(editingProductId, payload);
    } else {
      await fetch("/api/admin/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...setAuthHeader(),
        },
        body: JSON.stringify(payload),
      });
    }
    closeProductModal();
    loadItems();
  } catch (error) {
    alert("Não foi possível salvar o produto.");
  } finally {
    if (productSubmitBtn) {
      productSubmitBtn.disabled = false;
      productSubmitBtn.textContent = originalText || "Salvar produto";
    }
  }
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
}

async function deleteItem(id) {
  await fetch(`/api/admin/items?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...setAuthHeader() },
  });
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

productsSearchInput?.addEventListener("input", () => renderProductsTable());
createProductBtn?.addEventListener("click", () => openProductModal("create"));
productForm?.addEventListener("submit", handleProductSubmit);
formFactorButtons.forEach((btn) => {
  btn.addEventListener("click", () => setFormFactor(btn.dataset.formFactor));
});
mediaTabs.forEach((tab) => {
  tab.addEventListener("click", () => setImageMode(tab.dataset.imageMode));
});
productImageUpload?.addEventListener("change", handleImageUploadChange);
productImageUrl?.addEventListener("input", () => {
  setImageMode("url");
  currentImageValue = productImageUrl.value.trim();
  updateImagePreview(currentImageValue);
});
orderBumpsSearchInput?.addEventListener("input", () => renderOrderBumpsList());
createBumpBtn?.addEventListener("click", () => openBumpModal("create"));
orderBumpsEmptyBtn?.addEventListener("click", () => openBumpModal("create"));
bumpForm?.addEventListener("submit", handleBumpSubmit);
bumpMediaTabs.forEach((tab) => {
  tab.addEventListener("click", () => setBumpImageMode(tab.dataset.bumpImageMode));
});
bumpImageUpload?.addEventListener("change", handleBumpImageUploadChange);
bumpImageUrlInput?.addEventListener("input", () => {
  setBumpImageMode("url");
  currentBumpImageValue = bumpImageUrlInput.value.trim();
  updateBumpImagePreview(currentBumpImageValue);
});
bumpApplyAllInput?.addEventListener("change", () => {
  toggleBumpTriggerList(bumpApplyAllInput.checked);
});
document.querySelectorAll("[data-close-product]").forEach((btn) => {
  btn.addEventListener("click", closeProductModal);
});
productModal?.addEventListener("click", (event) => {
  if (event.target === productModal) {
    closeProductModal();
  }
});
document.querySelectorAll("[data-close-bump]").forEach((btn) => {
  btn.addEventListener("click", closeBumpModal);
});
bumpModal?.addEventListener("click", (event) => {
  if (event.target === bumpModal) {
    closeBumpModal();
  }
});
productsTableBody?.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }
  const { productId } = target.dataset;
  const product = productsCache.find((item) => item.id === productId);
  const action = target.dataset.action;
  if (action === "edit" && product) {
    openProductModal("edit", product);
    return;
  }
  if (action === "delete" && productId) {
    if (!confirm("Excluir este produto?")) {
      return;
    }
    await deleteItem(productId);
    loadItems();
    return;
  }
  if (action === "share" && product && product.slug) {
    const link = buildCheckoutLink(product.slug);
    if (link) {
      await copyToClipboard(link);
      target.textContent = "Copiado";
      setTimeout(() => {
        target.textContent = "Copiar link";
      }, 1200);
    }
  }
});
orderBumpsList?.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-bump-action]");
  if (!target) {
    return;
  }
  const { bumpId } = target.dataset;
  const bump = getBumpProducts().find((item) => item.id === bumpId);
  if (target.dataset.bumpAction === "edit" && bump) {
    openBumpModal("edit", bump);
    return;
  }
  if (target.dataset.bumpAction === "delete" && bumpId) {
    if (!confirm("Excluir este order bump?")) {
      return;
    }
    await deleteItem(bumpId);
    loadItems();
  }
});

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
    closeProductModal();
    closeBumpModal();
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

if (productImagePreview) {
  updateImagePreview("");
}
if (productForm) {
  setFormFactor("physical");
  setImageMode("upload");
}

if (token) {
  showPanel();
} else {
  showLogin();
}

// Sidebar toggle para minimizar/expandir
const sidebar = document.getElementById("sidebar");
const mainContent = document.getElementById("main-content");
const sidebarToggle = document.getElementById("sidebar-toggle");

if (sidebar && sidebarToggle && mainContent) {
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("minimized");
    if (sidebar.classList.contains("minimized")) {
      mainContent.style.marginLeft = "72px";
    } else {
      mainContent.style.marginLeft = "250px";
    }
  });
}

// Sidebar highlight ativo e navegação acessível
const navBtns = document.querySelectorAll('.sidebar__nav-btn');
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Troca de view
    const target = btn.getAttribute('data-target');
    document.querySelectorAll('.panel-view').forEach(view => {
      view.classList.add('hidden');
      view.hidden = true;
    });
    const view = document.getElementById(target);
    if (view) {
      view.classList.remove('hidden');
      view.hidden = false;
    }
  });
});
