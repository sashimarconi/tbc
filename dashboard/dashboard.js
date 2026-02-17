// LIVE VIEW GLOBE (Globe.gl)
window.addEventListener('DOMContentLoaded', () => {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons({
      attrs: { "stroke-width": 1.9 }
    });
  }
  const globeEl = document.getElementById('live-globe');
  if (!globeEl || typeof Globe !== 'function') return;

  // Fetch liveView data
  async function updateLiveView() {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return;
      const res = await fetch('/api/dashboard/analytics/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const { onlineSessions = [], cityCounts = [] } = data.liveView || {};
      // Renderizar lista de cidades do dia
      const listEl = document.getElementById('live-view-list');
      if (listEl) {
        const rows = Array.isArray(cityCounts) ? cityCounts : [];
        listEl.innerHTML = rows
          .map((session) => {
            const city = (session?.city || "Sem cidade").toString();
            const count = Number(session?.count) || 0;
            return `<li><span style="color:#A100FF;font-weight:700;">•</span> ${count} ${city}</li>`;
          })
          .join("");
      }
      // Atualizar pontos do globo
      if (window.liveGlobe && typeof window.liveGlobe.pointsData === 'function') {
        window.liveGlobe.pointsData(onlineSessions);
      }
    } catch (e) { /* ignore */ }
  }
  // Inicializar globo
  const globe = Globe()(globeEl)
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
    .backgroundColor('rgba(0,0,0,0)')
    .pointOfView({ lat: 0, lng: -30, altitude: 2.2 })
    .pointsData([])
    .pointLat('lat')
    .pointLng('lng')
    .pointColor('color')
    .pointAltitude(0.08)
    .pointRadius(0.22)
    .pointLabel('city')
    .showAtmosphere(true)
    .atmosphereColor('#A100FF')
    .atmosphereAltitude(0.18);
  window.liveGlobe = globe;
  // Responsivo
  function resizeGlobe() {
    const containerWidth = globeEl.parentElement?.offsetWidth || globeEl.offsetWidth || 360;
    const w = Math.max(220, Math.min(420, Math.floor(containerWidth - 16)));
    globe.width(w);
    globe.height(w);
  }
  resizeGlobe();
  window.addEventListener('resize', resizeGlobe);
  // Atualizar live view a cada 20s
  updateLiveView();
  setInterval(updateLiveView, 20000);
});
const loginSection = document.getElementById("login");
const panelSection = document.getElementById("panel");
const authLoadingSection = document.getElementById("auth-loading");
const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const emailInput = document.getElementById("email");
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
  visitors: document.getElementById("funnel-bar-segment-visitors"),
  checkout: document.getElementById("funnel-bar-segment-checkout"),
  starts: document.getElementById("funnel-bar-segment-starts"),
  purchases: document.getElementById("funnel-bar-segment-purchases"),
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
const integrationsRefreshBtn = document.getElementById("integrations-refresh");
const dashboardRefreshBtn = document.getElementById("dashboard-refresh");
const dashboardPeriodSelect = document.getElementById("dashboard-period");
const dashboardOrdersBody = document.getElementById("dashboard-orders-body");
const dashboardSeeAllOrdersBtn = document.getElementById("dashboard-see-all-orders");
const statRevenueEl = document.getElementById("stat-revenue");
const statOrdersTotalEl = document.getElementById("stat-orders-total");
const integrationForm = document.getElementById("integration-form");
const integrationIdInput = document.getElementById("integration-id");
const integrationProviderInput = document.getElementById("integration-provider");
const integrationNameInput = document.getElementById("integration-name");
const integrationActiveInput = document.getElementById("integration-active");
const integrationCancelBtn = document.getElementById("integration-cancel");
const integrationProviderButtons = document.querySelectorAll(".integration-provider");
const integrationMetaFields = document.getElementById("integration-fields-meta");
const integrationTikTokFields = document.getElementById("integration-fields-tiktok");
const integrationUtmifyFields = document.getElementById("integration-fields-utmify");
const metaPixelIdInput = document.getElementById("meta-pixel-id");
const tiktokPixelIdInput = document.getElementById("tiktok-pixel-id");
const utmifyApiUrlInput = document.getElementById("utmify-api-url");
const utmifyApiTokenInput = document.getElementById("utmify-api-token");
const utmifyFireOnOrderCreatedInput = document.getElementById("utmify-fire-on-order-created");
const utmifyFireOnlyWhenPaidInput = document.getElementById("utmify-fire-only-when-paid");
const integrationsTableBody = document.getElementById("integrations-table-body");
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
const shippingRefreshBtn = document.getElementById("shipping-refresh");
const shippingCreateBtn = document.getElementById("shipping-create-btn");
const shippingMethodsList = document.getElementById("shipping-methods-list");
const shippingModal = document.getElementById("shipping-modal");
const shippingModalTitle = document.getElementById("shipping-modal-title");
const shippingForm = document.getElementById("shipping-form");
const shippingNameInput = document.getElementById("shipping-name");
const shippingPriceInput = document.getElementById("shipping-price");
const shippingMinOrderInput = document.getElementById("shipping-min-order");
const shippingMinDaysInput = document.getElementById("shipping-min-days");
const shippingMaxDaysInput = document.getElementById("shipping-max-days");
const shippingDescriptionInput = document.getElementById("shipping-description");
const shippingDefaultInput = document.getElementById("shipping-default");
const shippingActiveInput = document.getElementById("shipping-active");
const domainsRefreshBtn = document.getElementById("domains-refresh");
const domainsForm = document.getElementById("domains-form");
const domainsInput = document.getElementById("domains-input");
const domainsConnectBtn = document.getElementById("domains-connect-btn");
const domainsList = document.getElementById("domains-list");
const domainsFeedback = document.getElementById("domains-feedback");
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
const IS_DEV =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.endsWith(".local");
const DASHBOARD_ROUTE_TO_VIEW = {
  "": "dashboard-view",
  orders: "orders-view",
  carts: "carts-view",
  integrations: "integrations-view",
  products: "products-view",
  shipping: "shipping-view",
  domains: "domains-view",
  "order-bumps": "order-bumps-view",
};
const DASHBOARD_VIEW_TO_ROUTE = Object.fromEntries(
  Object.entries(DASHBOARD_ROUTE_TO_VIEW).map(([route, view]) => [view, route])
);

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
const fallbackProductImage = "https://dummyimage.com/200x200/ede9df/8a8277&text=Produto";
let integrationsCache = [];
let shippingMethodsCache = [];
let shippingModalMode = "create";
let editingShippingId = null;
let domainsCache = [];
let authStatus = "loading";

function setDashboardChromeVisible(visible) {
  const sidebarNode = document.getElementById("sidebar");
  const topbarNode = document.querySelector(".mobile-topbar");
  const overlayNode = document.getElementById("sidebar-overlay");
  if (sidebarNode) {
    sidebarNode.classList.toggle("hidden", !visible);
  }
  if (topbarNode) {
    topbarNode.classList.toggle("hidden", !visible);
  }
  if (overlayNode && !visible) {
    overlayNode.classList.remove("is-visible");
    overlayNode.setAttribute("aria-hidden", "true");
  }
}

function setAuthStatus(nextStatus) {
  authStatus = nextStatus;
  const isLoading = authStatus === "loading";
  const isAuthenticated = authStatus === "authenticated";
  const isUnauthenticated = authStatus === "unauthenticated";

  if (authLoadingSection) {
    authLoadingSection.classList.toggle("hidden", !isLoading);
    authLoadingSection.hidden = !isLoading;
  }
  if (loginSection) {
    loginSection.classList.toggle("hidden", !isUnauthenticated);
    loginSection.hidden = !isUnauthenticated;
  }
  if (panelSection) {
    panelSection.classList.toggle("hidden", !isAuthenticated);
    panelSection.hidden = !isAuthenticated;
  }
  setDashboardChromeVisible(isAuthenticated);
}

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
  const email = emailInput?.value?.trim() || "";
  const password = passwordInput.value;
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    loginError.textContent = data.error || "Erro no login";
    return;
  }

  token = data.token;
  localStorage.setItem("admin_token", token);
  if (data?.user?.is_admin === true) {
    window.location.href = "/admin";
    return;
  }
  showPanel();
}

function showPanel() {
  setAuthStatus("authenticated");
  startSummaryPolling();
  activateView(getViewFromPathname(), { replacePath: true });
  loadItems();
  loadDashboardOrdersPreview();
}

function showLogin() {
  setAuthStatus("unauthenticated");
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
  const res = await fetch("/api/dashboard/items", {
    headers: { ...setAuthHeader() },
  });
  let data = {};
  try {
    data = await res.json();
  } catch (_error) {
    data = {};
  }
  if (!res.ok) {
    if (res.status === 401) {
      showLogin();
    } else {
      console.error("Falha ao carregar itens", data);
    }
    return;
  }
  renderItems(data.items || []);
}

async function loadSummary() {
  const period = (dashboardPeriodSelect?.value || "today").trim();
  const query = period && period !== "today" ? `?period=${encodeURIComponent(period)}` : "";
  const res = await fetch(`/api/dashboard/metrics${query}`, {
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
  if (statOrdersTotalEl) {
    const ordersTotal = Number(data.ordersToday ?? data.purchasesToday ?? 0);
    statOrdersTotalEl.textContent = formatNumber(ordersTotal);
  }
  if (statRevenueEl) {
    const revenueCents = Number(
      data.revenueTodayCents ?? data.revenueCents ?? data.totalRevenueCents ?? 0
    );
    statRevenueEl.textContent = formatCurrency(revenueCents);
  }

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

  // Calcular proporções para cada etapa
  const v = visitors;
  const c = Math.max(0, Math.min(checkout, v));
  const s = Math.max(0, Math.min(starts, c));
  const p = Math.max(0, Math.min(purchases, s));
  const total = v > 0 ? v : 1;
  const wV = (v / total) * 100;
  const wC = (c / total) * 100;
  const wS = (s / total) * 100;
  const wP = (p / total) * 100;
  funnelBars.visitors.style.width = wV + "%";
  funnelBars.checkout.style.width = (wC - wS > 0 ? wC - wS : 0) + "%";
  funnelBars.starts.style.width = (wS - wP > 0 ? wS - wP : 0) + "%";
  funnelBars.purchases.style.width = wP + "%";
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
  label.textContent = uploading ? "Enviando..." : "Arraste ou clique para enviar (PNG, JPG ou WEBP)";
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
  label.textContent = uploading ? "Enviando..." : "Arraste ou clique para enviar (PNG, JPG ou WEBP)";
}

async function uploadProductImage(dataUrl, filename) {
  const res = await fetch("/api/dashboard/uploads", {
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
  if (normalized === "waiting_payment" || normalized === "pending") {
    return { label: "Aguardando", tone: "waiting" };
  }
  if (normalized === "refused") {
    return { label: "Recusado", tone: "danger" };
  }
  if (normalized === "refunded") {
    return { label: "Reembolsado", tone: "danger" };
  }
  if (normalized === "cancelled") {
    return { label: "Cancelado", tone: "danger" };
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
  ordersStatsElements.amount.textContent = formatCurrency(stats.revenue_paid ?? stats.total_amount);
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
    const period = (dashboardPeriodSelect?.value || "today").trim();
    const query = period && period !== "today" ? `?period=${encodeURIComponent(period)}` : "";
    const res = await fetch(`/api/dashboard/orders${query}`, {
      headers: { ...setAuthHeader() },
    });
    if (!res.ok) {
      if (res.status === 401) {
        showLogin();
      }
      if (IS_DEV) {
        console.warn("[dashboard/orders] request failed", { status: res.status });
      }
      renderTableMessage(ordersTableBody, 5, "Não foi possível carregar os pedidos.");
      return;
    }
    const data = await res.json();
    renderOrdersStats(data.stats || {});
    renderOrdersTable(data.orders || []);
  } catch (error) {
    if (IS_DEV) {
      console.warn("[dashboard/orders] unexpected error", error);
    }
    renderTableMessage(ordersTableBody, 5, "Erro ao carregar pedidos.");
  }
}

async function loadCarts() {
  if (!cartsTableBody) {
    return;
  }
  try {
    const res = await fetch("/api/dashboard/carts", {
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

function getRouteKeyFromPathname(pathname = window.location.pathname) {
  if (!pathname.startsWith("/dashboard")) {
    return "";
  }
  const normalizedPath = pathname.replace(/\/+$/, "");
  const parts = normalizedPath.split("/");
  return parts.length >= 3 ? (parts[2] || "").toLowerCase() : "";
}

function getViewFromPathname(pathname = window.location.pathname) {
  const routeKey = getRouteKeyFromPathname(pathname);
  return DASHBOARD_ROUTE_TO_VIEW[routeKey] || "dashboard-view";
}

function getPathnameForView(viewId) {
  if (!viewId || !(viewId in DASHBOARD_VIEW_TO_ROUTE)) {
    return "/dashboard";
  }
  const route = DASHBOARD_VIEW_TO_ROUTE[viewId];
  return route ? `/dashboard/${route}` : "/dashboard";
}

function syncDashboardRoute(targetId, { replace = false } = {}) {
  const nextPath = getPathnameForView(targetId);
  const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
  if (nextPath === currentPath) {
    return;
  }
  const nextUrl = `${nextPath}${window.location.search}${window.location.hash}`;
  if (replace) {
    window.history.replaceState(null, "", nextUrl);
    return;
  }
  window.history.pushState(null, "", nextUrl);
}

function setActiveSidebarButton(targetId) {
  const navButtons = document.querySelectorAll(".sidebar__nav-btn");
  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-target") === targetId);
  });
}

function activateView(targetId, options = {}) {
  const { skipRouteSync = false, replacePath = false } = options;
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

  setActiveSidebarButton(targetId);

  if (targetId === "products-view") {
    loadItems();
  } else if (targetId === "order-bumps-view") {
    loadItems();
    renderOrderBumpsList();
  } else if (targetId === "integrations-view") {
    loadIntegrations();
  } else if (targetId === "shipping-view") {
    loadShippingMethods();
  } else if (targetId === "domains-view") {
    loadDomains();
  }

  if (!skipRouteSync) {
    syncDashboardRoute(targetId, { replace: replacePath });
  }
}

async function loadDashboardOrdersPreview() {
  if (!dashboardOrdersBody) return;
  try {
    const period = (dashboardPeriodSelect?.value || "today").trim();
    const query = period && period !== "today" ? `?period=${encodeURIComponent(period)}` : "";
    const res = await fetch(`/api/dashboard/orders${query}`, {
      headers: { ...setAuthHeader() },
    });
    if (!res.ok) {
      dashboardOrdersBody.innerHTML = `<tr><td colspan="4">Não foi possível carregar pedidos.</td></tr>`;
      return;
    }
    const data = await res.json();
    const rows = Array.isArray(data.orders) ? data.orders.slice(0, 5) : [];
    if (!rows.length) {
      dashboardOrdersBody.innerHTML = `<tr><td colspan="4">Nenhum pedido recente.</td></tr>`;
      return;
    }
    dashboardOrdersBody.innerHTML = rows
      .map((order) => {
        const customer = order?.customer?.name || "Cliente";
        const email = order?.customer?.email || "--";
        const statusConfig = mapOrderStatus(order?.status || "waiting_payment");
        const value = formatCurrency(order?.total_cents ?? order?.summary?.total_cents ?? 0);
        const dateLabel = formatDateTime(order?.created_at);
        const productName = order?.product_name || "Produto";
        return `
          <tr>
            <td>${escapeHtml(dateLabel)}</td>
            <td><strong>${escapeHtml(customer)}</strong><br/><small>${escapeHtml(email)}</small><br/><small>${escapeHtml(productName)}</small></td>
            <td><span class="status-pill status-pill--${escapeHtml(statusConfig.tone)}">${escapeHtml(statusConfig.label)}</span></td>
            <td>${escapeHtml(value)}</td>
          </tr>
        `;
      })
      .join("");
  } catch (_error) {
    dashboardOrdersBody.innerHTML = `<tr><td colspan="4">Erro ao carregar pedidos.</td></tr>`;
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
  const filtered = bases
    .filter((product) => {
      if (!searchTerm) {
        return true;
      }
      const haystack = `${product.name || ""} ${product.description || ""}`.toLowerCase();
      return haystack.includes(searchTerm);
    })
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

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
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

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
      await fetch("/api/dashboard/items", {
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
      await fetch("/api/dashboard/items", {
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
  await fetch(`/api/dashboard/items?id=${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...setAuthHeader(),
    },
    body: JSON.stringify(payload),
  });
}

async function deleteItem(id) {
  await fetch(`/api/dashboard/items?id=${encodeURIComponent(id)}`, {
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
      ? `/api/dashboard/orders?id=${encodeURIComponent(id)}`
      : `/api/dashboard/carts?id=${encodeURIComponent(id)}`;
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
integrationsRefreshBtn?.addEventListener("click", () => loadIntegrations());
dashboardRefreshBtn?.addEventListener("click", () => {
  loadSummary();
  loadDashboardOrdersPreview();
  const activeView = document.querySelector(".panel-view:not(.hidden)");
  if (!activeView) return;
  if (activeView.id === "orders-view") {
    loadOrders();
  } else if (activeView.id === "carts-view") {
    loadCarts();
  } else if (activeView.id === "integrations-view") {
    loadIntegrations();
  } else if (activeView.id === "shipping-view") {
    loadShippingMethods();
  } else if (activeView.id === "domains-view") {
    loadDomains();
  }
});
dashboardPeriodSelect?.addEventListener("change", () => {
  loadSummary();
  loadDashboardOrdersPreview();
});
dashboardSeeAllOrdersBtn?.addEventListener("click", () => {
  activateView("orders-view");
});
integrationProviderButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    updateIntegrationProviderUI(btn.dataset.provider || "meta");
  });
});
integrationCancelBtn?.addEventListener("click", () => {
  resetIntegrationForm();
  updateIntegrationProviderUI(getCurrentIntegrationProvider());
});
integrationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = integrationIdInput?.value || "";
  const payload = getIntegrationPayloadFromForm();
  const endpoint = id ? `/api/dashboard/integrations/${id}` : "/api/dashboard/integrations";
  const method = id ? "PUT" : "POST";
  try {
    const res = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...setAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Falha ao salvar integração.");
      return;
    }
    resetIntegrationForm();
    updateIntegrationProviderUI(payload.provider);
    await loadIntegrations();
  } catch (_error) {
    alert("Erro ao salvar integração.");
  }
});
integrationsTableBody?.addEventListener("click", async (event) => {
  const actionBtn = event.target.closest("[data-integration-action]");
  if (!actionBtn) return;
  const id = String(actionBtn.dataset.integrationId || "");
  const action = actionBtn.dataset.integrationAction;
  const row = integrationsCache.find((item) => String(item.id) === id);
  if (!row) return;
  if (action === "edit") {
    fillIntegrationForm(row);
    return;
  }
  if (action === "delete") {
    if (!confirm("Excluir esta integração?")) return;
    try {
      const res = await fetch(`/api/dashboard/integrations/${id}`, {
        method: "DELETE",
        headers: { ...setAuthHeader() },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Falha ao excluir.");
        return;
      }
      await loadIntegrations();
    } catch (_error) {
      alert("Erro ao excluir integração.");
    }
  }
});

shippingRefreshBtn?.addEventListener("click", () => loadShippingMethods());
shippingCreateBtn?.addEventListener("click", () => openShippingModal("create"));
shippingForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await saveShippingMethod();
  } catch (error) {
    alert(error?.message || "Erro ao salvar frete.");
  }
});
document.querySelectorAll("[data-close-shipping]").forEach((btn) => {
  btn.addEventListener("click", closeShippingModal);
});
shippingModal?.addEventListener("click", (event) => {
  if (event.target === shippingModal) {
    closeShippingModal();
  }
});
shippingMethodsList?.addEventListener("click", async (event) => {
  const actionNode = event.target.closest("[data-shipping-action]");
  if (!actionNode) return;
  const action = actionNode.dataset.shippingAction;
  const id = String(actionNode.dataset.shippingId || "");
  const method = shippingMethodsCache.find((item) => item.id === id);
  if (!id || !method) return;

  if (action === "edit") {
    openShippingModal("edit", method);
    return;
  }
  if (action === "delete") {
    if (!confirm("Remover este método de frete?")) return;
    try {
      await deleteShippingMethod(id);
    } catch (error) {
      alert(error?.message || "Erro ao remover frete.");
    }
  }
});
shippingMethodsList?.addEventListener("change", async (event) => {
  const input = event.target.closest('input[data-shipping-action="toggle"]');
  if (!input) return;
  const id = String(input.dataset.shippingId || "");
  try {
    await updateShippingMethod(id, { isActive: input.checked === true });
  } catch (error) {
    input.checked = !input.checked;
    alert(error?.message || "Erro ao atualizar status do frete.");
  }
});
domainsRefreshBtn?.addEventListener("click", () => loadDomains());
domainsForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const domain = (domainsInput?.value || "").trim();
  if (!domain) {
    setDomainsFeedback("Informe um domínio.", true);
    return;
  }
  setDomainsFeedback("Conectando domínio...");
  if (domainsConnectBtn) {
    domainsConnectBtn.disabled = true;
  }
  try {
    await connectDomain(domain);
    setDomainsFeedback("Domínio conectado. Configure o DNS e clique em verificar.");
    if (domainsInput) domainsInput.value = "";
    await loadDomains();
  } catch (error) {
    setDomainsFeedback(error?.message || "Falha ao conectar domínio.", true);
  } finally {
    if (domainsConnectBtn) {
      domainsConnectBtn.disabled = false;
    }
  }
});
domainsList?.addEventListener("click", async (event) => {
  const copyBtn = event.target.closest("[data-domain-copy]");
  if (copyBtn) {
    const value = String(copyBtn.dataset.copyValue || "").trim();
    if (!value) return;
    try {
      await copyToClipboard(value);
      const originalLabel = copyBtn.textContent;
      copyBtn.textContent = "Copiado";
      setTimeout(() => {
        copyBtn.textContent = originalLabel || "Copiar";
      }, 1200);
    } catch (_error) {
      setDomainsFeedback("Não foi possível copiar o valor DNS.", true);
    }
    return;
  }

  const actionNode = event.target.closest("[data-domain-action]");
  if (!actionNode) return;
  const action = actionNode.dataset.domainAction;
  const domain = String(actionNode.dataset.domain || "");
  if (!domain) return;

  if (action === "verify") {
    setDomainsFeedback(`Verificando ${domain}...`);
    try {
      const result = await verifyDomain(domain);
      setDomainsFeedback(
        result?.verified === true
          ? `Domínio ${domain} verificado com sucesso.`
          : `Domínio ${domain} ainda pendente de DNS.`
      );
    } catch (error) {
      setDomainsFeedback(error?.message || "Falha ao verificar domínio.", true);
    } finally {
      await loadDomains();
    }
    return;
  }

  if (action === "delete") {
    if (!confirm(`Remover o domínio ${domain}?`)) return;
    setDomainsFeedback(`Removendo ${domain}...`);
    try {
      await removeDomain(domain);
      setDomainsFeedback(`Domínio ${domain} removido.`);
    } catch (error) {
      setDomainsFeedback(error?.message || "Falha ao remover domínio.", true);
    } finally {
      await loadDomains();
    }
  }
});

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
    closeShippingModal();
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
resetIntegrationForm();
updateIntegrationProviderUI("meta");

async function bootstrapAuth() {
  setAuthStatus("loading");
  if (!token) {
    showLogin();
    return;
  }
  try {
    const res = await fetch("/api/auth/me", {
      headers: { ...setAuthHeader() },
    });
    if (!res.ok) {
      throw new Error("unauthorized");
    }
    const data = await res.json();
    if (data?.user?.is_admin === true) {
      window.location.href = "/admin";
      return;
    }
    showPanel();
  } catch (_error) {
    token = "";
    localStorage.removeItem("admin_token");
    showLogin();
  }
}

function getCurrentIntegrationProvider() {
  const provider = (integrationProviderInput?.value || "meta").trim().toLowerCase();
  return ["meta", "tiktok", "utmify"].includes(provider) ? provider : "meta";
}

function updateIntegrationProviderUI(provider) {
  integrationProviderButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.provider === provider);
  });
  if (integrationProviderInput) integrationProviderInput.value = provider;
  integrationMetaFields?.classList.toggle("hidden", provider !== "meta");
  integrationTikTokFields?.classList.toggle("hidden", provider !== "tiktok");
  integrationUtmifyFields?.classList.toggle("hidden", provider !== "utmify");
  renderIntegrationsTable();
}

function resetIntegrationForm() {
  if (integrationIdInput) integrationIdInput.value = "";
  if (integrationNameInput) integrationNameInput.value = "";
  if (integrationActiveInput) integrationActiveInput.checked = true;
  if (metaPixelIdInput) metaPixelIdInput.value = "";
  if (tiktokPixelIdInput) tiktokPixelIdInput.value = "";
  if (utmifyApiUrlInput) utmifyApiUrlInput.value = "";
  if (utmifyApiTokenInput) utmifyApiTokenInput.value = "";
  if (utmifyFireOnOrderCreatedInput) utmifyFireOnOrderCreatedInput.checked = true;
  if (utmifyFireOnlyWhenPaidInput) utmifyFireOnlyWhenPaidInput.checked = false;
}

function getIntegrationPayloadFromForm() {
  const provider = getCurrentIntegrationProvider();
  const payload = {
    provider,
    name: integrationNameInput?.value?.trim() || "",
    is_active: integrationActiveInput?.checked !== false,
    config: {},
  };

  if (provider === "meta") {
    payload.config.pixel_id = metaPixelIdInput?.value?.trim() || "";
  } else if (provider === "tiktok") {
    payload.config.pixel_id = tiktokPixelIdInput?.value?.trim() || "";
  } else if (provider === "utmify") {
    payload.config.api_url = utmifyApiUrlInput?.value?.trim() || "";
    payload.config.api_token = utmifyApiTokenInput?.value?.trim() || "";
    payload.config.fire_on_order_created = utmifyFireOnOrderCreatedInput?.checked !== false;
    payload.config.fire_only_when_paid = utmifyFireOnlyWhenPaidInput?.checked === true;
  }
  return payload;
}

function fillIntegrationForm(item) {
  if (!item) return;
  const provider = item.provider || "meta";
  if (integrationIdInput) integrationIdInput.value = item.id;
  if (integrationNameInput) integrationNameInput.value = item.name || "";
  if (integrationActiveInput) integrationActiveInput.checked = item.is_active !== false;
  updateIntegrationProviderUI(provider);
  if (provider === "meta" && metaPixelIdInput) {
    metaPixelIdInput.value = item?.config?.pixel_id || "";
  }
  if (provider === "tiktok" && tiktokPixelIdInput) {
    tiktokPixelIdInput.value = item?.config?.pixel_id || "";
  }
  if (provider === "utmify") {
    if (utmifyApiUrlInput) utmifyApiUrlInput.value = item?.config?.api_url || "";
    if (utmifyApiTokenInput) utmifyApiTokenInput.value = item?.config?.api_token || "";
    if (utmifyFireOnOrderCreatedInput) utmifyFireOnOrderCreatedInput.checked = item?.config?.fire_on_order_created !== false;
    if (utmifyFireOnlyWhenPaidInput) utmifyFireOnlyWhenPaidInput.checked = item?.config?.fire_only_when_paid === true;
  }
}

function renderIntegrationsTable() {
  if (!integrationsTableBody) return;
  const provider = getCurrentIntegrationProvider();
  const rows = integrationsCache.filter((item) => item.provider === provider);
  if (!rows.length) {
    integrationsTableBody.innerHTML = `<tr><td colspan="4">Nenhuma integração para ${provider}.</td></tr>`;
    return;
  }
  integrationsTableBody.innerHTML = rows
    .map((item) => {
      const statusLabel = item.is_active !== false ? "Ativa" : "Inativa";
      return `
        <tr data-integration-id="${item.id}">
          <td>${escapeHtml(item.provider || "")}</td>
          <td>${escapeHtml(item.name || "-")}</td>
          <td>${escapeHtml(statusLabel)}</td>
          <td>
            <button type="button" class="ghost" data-integration-action="edit" data-integration-id="${item.id}">Editar</button>
            <button type="button" class="ghost" data-integration-action="delete" data-integration-id="${item.id}">Excluir</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function loadIntegrations() {
  if (!integrationsTableBody) return;
  try {
    const res = await fetch("/api/dashboard/integrations", {
      headers: { ...setAuthHeader() },
    });
    if (!res.ok) {
      if (res.status === 401) showLogin();
      integrationsTableBody.innerHTML = `<tr><td colspan="4">Falha ao carregar integrações.</td></tr>`;
      return;
    }
    const data = await res.json();
    integrationsCache = Array.isArray(data.integrations) ? data.integrations : [];
    renderIntegrationsTable();
  } catch (_error) {
    integrationsTableBody.innerHTML = `<tr><td colspan="4">Erro ao carregar integrações.</td></tr>`;
  }
}

function resetShippingForm() {
  if (!shippingForm) return;
  shippingForm.reset();
  shippingNameInput.value = "";
  shippingPriceInput.value = "";
  shippingMinOrderInput.value = "";
  shippingMinDaysInput.value = "";
  shippingMaxDaysInput.value = "";
  shippingDescriptionInput.value = "";
  shippingDefaultInput.checked = false;
  shippingActiveInput.checked = true;
}

function fillShippingForm(method) {
  if (!method) return;
  shippingNameInput.value = method.name || "";
  shippingPriceInput.value = formatCentsForField(method.priceCents || 0);
  shippingMinOrderInput.value = formatCentsForField(method.minOrderCents || 0);
  shippingMinDaysInput.value = String(Number(method.minDays) || 0);
  shippingMaxDaysInput.value = String(Number(method.maxDays) || 0);
  shippingDescriptionInput.value = method.description || "";
  shippingDefaultInput.checked = method.isDefault === true;
  shippingActiveInput.checked = method.isActive !== false;
}

function openShippingModal(mode = "create", method = null) {
  if (!shippingModal || !shippingForm) return;
  shippingModalMode = mode;
  editingShippingId = method?.id || null;
  shippingModalTitle.textContent =
    mode === "edit" ? `Editar ${method?.name || "frete"}` : "Novo método de frete";
  resetShippingForm();
  if (mode === "edit" && method) {
    fillShippingForm(method);
  }
  shippingModal.classList.remove("hidden");
  shippingModal.hidden = false;
  setTimeout(() => shippingNameInput?.focus(), 60);
}

function closeShippingModal() {
  if (!shippingModal) return;
  shippingModal.classList.add("hidden");
  shippingModal.hidden = true;
  editingShippingId = null;
}

function getShippingPayloadFromForm() {
  const minDays = Math.max(0, Number(shippingMinDaysInput.value || 0));
  const maxDaysValue = Math.max(0, Number(shippingMaxDaysInput.value || 0));
  return {
    name: shippingNameInput.value.trim(),
    priceCents: parseCurrencyInput(shippingPriceInput.value || "0"),
    minOrderCents: parseCurrencyInput(shippingMinOrderInput.value || "0"),
    minDays,
    maxDays: Math.max(maxDaysValue, minDays),
    description: shippingDescriptionInput.value.trim(),
    isDefault: shippingDefaultInput.checked === true,
    isActive: shippingActiveInput.checked === true,
  };
}

function renderShippingMethods() {
  if (!shippingMethodsList) return;
  if (!shippingMethodsCache.length) {
    shippingMethodsList.innerHTML = `
      <article class="shipping-method-row shipping-method-row--empty">
        <p>Nenhum método de frete cadastrado ainda.</p>
      </article>
    `;
    return;
  }

  shippingMethodsList.innerHTML = shippingMethodsCache
    .map((method) => {
      const statusLabel = method.isActive !== false ? "Ativo" : "Inativo";
      const defaultBadge = method.isDefault ? '<span class="shipping-pill">Padrão</span>' : "";
      return `
        <article class="shipping-method-row" data-shipping-id="${escapeHtml(method.id)}">
          <div class="shipping-method-row__main">
            <h4>${escapeHtml(method.name || "Frete sem nome")} ${defaultBadge}</h4>
            <p class="shipping-method-row__meta">
              Prazo: ${escapeHtml(String(method.minDays ?? 0))}-${escapeHtml(String(method.maxDays ?? 0))} dias
              • Preço: ${escapeHtml(formatCurrency(method.priceCents || 0))}
              • Pedido mínimo: ${escapeHtml(formatCurrency(method.minOrderCents || 0))}
            </p>
            <small>${escapeHtml(method.description || "Sem descrição personalizada.")}</small>
          </div>
          <div class="shipping-method-row__actions">
            <label class="switch small">
              <input type="checkbox" data-shipping-action="toggle" data-shipping-id="${escapeHtml(
                method.id
              )}" ${method.isActive !== false ? "checked" : ""} />
              <span>${statusLabel}</span>
            </label>
            <button type="button" class="ghost" data-shipping-action="edit" data-shipping-id="${escapeHtml(
              method.id
            )}">Editar</button>
            <button type="button" class="ghost" data-shipping-action="delete" data-shipping-id="${escapeHtml(
              method.id
            )}">Remover</button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadShippingMethods() {
  if (!shippingMethodsList) return;
  try {
    const res = await fetch("/api/dashboard/shipping-methods", {
      headers: { ...setAuthHeader() },
    });
    if (!res.ok) {
      if (res.status === 401) showLogin();
      shippingMethodsList.innerHTML = `
        <article class="shipping-method-row shipping-method-row--empty">
          <p>Não foi possível carregar os fretes.</p>
        </article>
      `;
      return;
    }
    const data = await res.json();
    shippingMethodsCache = Array.isArray(data.shippingMethods) ? data.shippingMethods : [];
    renderShippingMethods();
  } catch (_error) {
    shippingMethodsList.innerHTML = `
      <article class="shipping-method-row shipping-method-row--empty">
        <p>Erro ao carregar métodos de frete.</p>
      </article>
    `;
  }
}

async function saveShippingMethod() {
  const payload = getShippingPayloadFromForm();
  if (!payload.name) {
    alert("Informe o nome do método de frete.");
    return;
  }

  const endpoint = editingShippingId
    ? `/api/dashboard/shipping-methods/${encodeURIComponent(editingShippingId)}`
    : "/api/dashboard/shipping-methods";
  const method = editingShippingId ? "PUT" : "POST";

  const res = await fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...setAuthHeader(),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Falha ao salvar método de frete.");
  }
  closeShippingModal();
  await loadShippingMethods();
}

async function deleteShippingMethod(id) {
  const res = await fetch(`/api/dashboard/shipping-methods/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...setAuthHeader() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Falha ao remover método de frete.");
  }
  await loadShippingMethods();
}

async function updateShippingMethod(id, patch = {}) {
  const method = shippingMethodsCache.find((item) => item.id === id);
  if (!method) return;

  const payload = {
    name: method.name || "",
    priceCents: Number(method.priceCents) || 0,
    minOrderCents: Number(method.minOrderCents) || 0,
    minDays: Number(method.minDays) || 0,
    maxDays: Number(method.maxDays) || 0,
    description: method.description || "",
    isDefault: method.isDefault === true,
    isActive: method.isActive !== false,
    ...patch,
  };

  const res = await fetch(`/api/dashboard/shipping-methods/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...setAuthHeader(),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Falha ao atualizar frete.");
  }
  await loadShippingMethods();
}

function setDomainsFeedback(message = "", isError = false) {
  if (!domainsFeedback) return;
  domainsFeedback.textContent = message;
  domainsFeedback.style.color = isError ? "#ff6b6b" : "";
}

function getDomainDnsRecords(domainItem) {
  const verification = domainItem?.verification_data;
  if (!verification || typeof verification !== "object") {
    return [];
  }

  const sanitizeDnsField = (value, { upper = false } = {}) => {
    const normalized = String(value ?? "")
      .trim()
      .replace(/\.$/, "");
    if (!normalized || normalized === "-" || /^null$/i.test(normalized) || /^undefined$/i.test(normalized)) {
      return "";
    }
    return upper ? normalized.toUpperCase() : normalized;
  };

  const candidates = [];
  if (Array.isArray(verification)) {
    verification.forEach((entry) => candidates.push(entry));
  } else if (Array.isArray(verification?.verification)) {
    verification.verification.forEach((entry) => candidates.push(entry));
  } else if (Array.isArray(verification?.dnsRecords)) {
    verification.dnsRecords.forEach((entry) => candidates.push(entry));
  } else {
    candidates.push(verification);
  }

  return candidates
    .map((entry) => ({
      type: sanitizeDnsField(entry?.type || entry?.recordType, { upper: true }),
      name: sanitizeDnsField(entry?.domain || entry?.name || entry?.host),
      value: sanitizeDnsField(entry?.value || entry?.target || entry?.data),
    }))
    .filter((record) => record.type && record.value);
}

function renderDomainVerificationRows(domainItem) {
  const records = getDomainDnsRecords(domainItem);
  if (!records.length) {
    if (domainItem?.is_verified === true) {
      return `<div class="domain-dns-empty">Domínio verificado. Nenhum ajuste DNS pendente.</div>`;
    }
    return `<div class="domain-dns-empty">Ainda sem registros DNS detalhados. Clique em Verificar para atualizar.</div>`;
  }

  return `
    <div class="domain-dns-table">
      <div class="domain-dns-head">
        <span>Tipo</span>
        <span>Nome</span>
        <span>Valor</span>
        <span></span>
      </div>
      ${records
        .map((record) => {
          const type = escapeHtml(record.type || "-");
          const name = escapeHtml(record.name || "-");
          const value = escapeHtml(record.value || "-");
          return `
            <div class="domain-dns-row">
              <span class="domain-dns-type">${type}</span>
              <span class="domain-dns-name">${name}</span>
              <span class="domain-dns-value">${value}</span>
              <button
                type="button"
                class="ghost domain-dns-copy"
                data-domain-copy="true"
                data-copy-value="${escapeHtml(record.value || "")}"
              >
                Copiar
              </button>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderDomains() {
  if (!domainsList) return;
  if (!domainsCache.length) {
    domainsList.innerHTML = `
      <article class="shipping-method-row shipping-method-row--empty domains-empty">
        <p>Nenhum domínio conectado ainda.</p>
      </article>
    `;
    return;
  }

  domainsList.innerHTML = domainsCache
    .map((item) => {
      const domainRaw = String(item.domain || "");
      const domain = escapeHtml(domainRaw);
      const statusLabel = item.is_verified === true ? "Verificado" : "Pendente";
      const statusToneClass = item.is_verified === true ? "is-ok" : "is-pending";
      return `
        <article class="shipping-method-row domain-card" data-domain="${domain}">
          <div class="shipping-method-row__main domain-card__main">
            <h4 class="domain-card__title">${domain}</h4>
            <div class="domain-card__status ${statusToneClass}">${escapeHtml(statusLabel)}</div>
            <div class="domain-card__dns">
              ${renderDomainVerificationRows(item)}
            </div>
            ${
              item.last_error
                ? `<small class="domain-card__error">${escapeHtml(item.last_error)}</small>`
                : ""
            }
          </div>
          <div class="shipping-method-row__actions domain-card__actions">
            <button type="button" class="ghost" data-domain-action="verify" data-domain="${domainRaw}">Verificar</button>
            <button type="button" class="ghost" data-domain-action="delete" data-domain="${domainRaw}">Remover</button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadDomains() {
  if (!domainsList) return;
  try {
    const res = await fetch("/api/dashboard/custom-domains?refresh=1", {
      headers: { ...setAuthHeader() },
    });
    if (!res.ok) {
      if (res.status === 401) showLogin();
      domainsList.innerHTML = `
        <article class="shipping-method-row shipping-method-row--empty">
          <p>Não foi possível carregar domínios.</p>
        </article>
      `;
      return;
    }
    const data = await res.json();
    domainsCache = Array.isArray(data.domains) ? data.domains : [];
    renderDomains();
  } catch (_error) {
    domainsList.innerHTML = `
      <article class="shipping-method-row shipping-method-row--empty">
        <p>Erro ao carregar domínios.</p>
      </article>
    `;
  }
}

async function connectDomain(domain) {
  const res = await fetch("/api/dashboard/custom-domains", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...setAuthHeader(),
    },
    body: JSON.stringify({ domain }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Falha ao conectar domínio.");
  }
  return data;
}

async function verifyDomain(domain) {
  const res = await fetch(`/api/dashboard/custom-domains?action=verify&id=${encodeURIComponent(domain)}`, {
    method: "POST",
    headers: {
      ...setAuthHeader(),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Falha ao verificar domínio.");
  }
  return data;
}

async function removeDomain(domain) {
  const endpoint = `/api/dashboard/custom-domains?action=delete&id=${encodeURIComponent(domain)}`;
  const parseResponsePayload = async (res) => {
    const text = await res.text().catch(() => "");
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (_error) {
      return { error: text };
    }
  };

  const resDelete = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...setAuthHeader(),
    },
  });
  const dataDelete = await parseResponsePayload(resDelete);
  if (resDelete.ok) {
    return dataDelete;
  }

  const resFallback = await fetch(`/api/dashboard/custom-domains/${encodeURIComponent(domain)}`, {
    method: "DELETE",
    headers: {
      ...setAuthHeader(),
    },
  });
  const dataFallback = await parseResponsePayload(resFallback);
  if (!resFallback.ok) {
    throw new Error(
      dataFallback.error || dataDelete.error || `Falha ao remover domínio (HTTP ${resFallback.status}).`
    );
  }
  return dataFallback;
}

bootstrapAuth();

const sidebar = document.getElementById("sidebar");
const mainContent = document.getElementById("main-content");
const sidebarToggle = document.getElementById("sidebar-toggle");
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const mobileSidebarMediaQuery = window.matchMedia("(max-width: 768px)");
let sidebarOpen = false;
let lastFocusedElement = null;

function getSidebarFocusableElements() {
  if (!sidebar) return [];
  return Array.from(
    sidebar.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    )
  ).filter((node) => !node.classList.contains("hidden"));
}

function setSidebarOpen(nextOpen) {
  if (!sidebar) {
    return;
  }
  const isMobile = mobileSidebarMediaQuery.matches;
  sidebarOpen = Boolean(nextOpen) && isMobile;
  sidebar.classList.toggle("is-open", sidebarOpen);
  if (sidebarOverlay) {
    sidebarOverlay.classList.toggle("is-visible", sidebarOpen);
    sidebarOverlay.setAttribute("aria-hidden", sidebarOpen ? "false" : "true");
  }
  if (mobileMenuBtn) {
    mobileMenuBtn.setAttribute("aria-expanded", sidebarOpen ? "true" : "false");
  }
  document.body.style.overflow = sidebarOpen ? "hidden" : "";

  if (sidebarOpen) {
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const [firstFocusable] = getSidebarFocusableElements();
    if (firstFocusable) {
      requestAnimationFrame(() => firstFocusable.focus());
    }
  } else if (mobileSidebarMediaQuery.matches) {
    (mobileMenuBtn || lastFocusedElement)?.focus?.();
  }
}

function closeSidebar() {
  setSidebarOpen(false);
}

function toggleSidebar() {
  setSidebarOpen(!sidebarOpen);
}

function syncSidebarForViewport() {
  if (!mobileSidebarMediaQuery.matches) {
    sidebarOpen = false;
    sidebar?.classList.remove("is-open");
    sidebarOverlay?.classList.remove("is-visible");
    if (sidebarOverlay) {
      sidebarOverlay.setAttribute("aria-hidden", "true");
    }
    if (mobileMenuBtn) {
      mobileMenuBtn.setAttribute("aria-expanded", "false");
    }
    document.body.style.overflow = "";
  }
}

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", toggleSidebar);
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener("click", closeSidebar);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && sidebarOpen) {
    closeSidebar();
    return;
  }
  if (event.key === "Tab" && sidebarOpen && mobileSidebarMediaQuery.matches) {
    const focusable = getSidebarFocusableElements();
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
      return;
    }
  }
});

window.addEventListener("hashchange", closeSidebar);
window.addEventListener("popstate", closeSidebar);
window.addEventListener("popstate", () => {
  activateView(getViewFromPathname(), { skipRouteSync: true });
});
window.addEventListener("beforeunload", closeSidebar);
mobileSidebarMediaQuery.addEventListener("change", syncSidebarForViewport);
syncSidebarForViewport();

if (sidebar && sidebarToggle && mainContent) {
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("minimized");
    const isMobile = window.matchMedia("(max-width: 900px)").matches;
    if (!isMobile) {
      if (sidebar.classList.contains("minimized")) {
        mainContent.style.marginLeft = "72px";
      } else {
        mainContent.style.marginLeft = "250px";
      }
    } else {
      mainContent.style.marginLeft = "";
    }
  });
}

const navBtns = document.querySelectorAll(".sidebar__nav-btn");
navBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    closeSidebar();
    const target = btn.getAttribute("data-target");
    if (target === "appearance-view") {
      window.location.href = "/dashboard/builder";
      return;
    }
    activateView(target);
  });
});








