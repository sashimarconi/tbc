const form = document.getElementById("checkout-form");
const payBtn = document.getElementById("pay-btn");
const pixResult = document.getElementById("pix-result");
const pixQr = document.getElementById("pix-qr");
const pixCode = document.getElementById("pix-code");
const copyBtn = document.getElementById("copy-btn");
const pixOrderTotal = document.getElementById("pix-order-total");
const pixCountdown = document.getElementById("pix-countdown");
const pixStatusText = document.querySelector(".pix-screen__status span:last-child");
const pixLoadingModal = document.getElementById("pix-loading-modal");
const pixCopyFeedback = document.getElementById("pix-copy-feedback");
const productCover = document.getElementById("product-cover");
const productTitle = document.getElementById("product-title");
const productDescription = document.getElementById("product-description");
const productPrice = document.getElementById("product-price");
const productComparePrice = document.getElementById("product-compare-price");
const addonsSection = document.getElementById("addons-section");
const addonsList = document.getElementById("addons-list");
const selectAll = document.getElementById("select-all");
const selectAllText = document.getElementById("select-all-text");
const selectAllWrap = selectAll?.closest(".select-all") || null;
const summaryLines = document.getElementById("summary-lines");
const summarySubtotal = document.getElementById("summary-subtotal");
const summaryShipping = document.getElementById("summary-shipping");
const summaryTotal = document.getElementById("summary-total");
const summaryCount = document.getElementById("summary-count");
const summaryToggle = document.getElementById("summary-toggle");
const summaryHeaderTotal = document.getElementById("summary-header-total");
const summaryTitle = document.getElementById("summary-title");
const summarySubtitle = document.getElementById("summary-subtitle");
const headerWrap = document.getElementById("checkout-header");
const headerBrandBlock = document.getElementById("header-brand-block");
const headerLogo = document.getElementById("header-logo");
const headerText = document.getElementById("header-text");
const securitySeal = document.getElementById("security-seal");
const securitySealIcon = document.getElementById("security-seal-icon");
const securitySealText = document.getElementById("security-seal-text");
const checkoutLayout = document.getElementById("checkout-layout");
const checkoutPrimary = document.getElementById("checkout-primary");
const checkoutSide = document.getElementById("checkout-side");
const countrySwitcher = document.getElementById("country-switcher");
const productCard = document.getElementById("product-card");
const productImageWrap = document.getElementById("product-image-wrap");
const formFieldsBlock = document.getElementById("form-fields-block");
const paymentBlock = document.getElementById("payment-block");
const footerBlock = document.getElementById("footer-block");
const footerSecurityText = document.getElementById("footer-security-text");
const summaryCard = document.getElementById("summary-card");
const summaryHeader = summaryCard?.querySelector(".summary__header");
const fieldWraps = {
  fullName: document.getElementById("field-wrap-name"),
  email: document.getElementById("field-wrap-email"),
  phone: document.getElementById("field-wrap-phone"),
  cpf: document.getElementById("field-wrap-cpf"),
};
const cepInput = document.getElementById("cep");
const cepError = document.getElementById("cep-error");
const addressCard = document.getElementById("address-card");
const addressToggle = document.getElementById("address-toggle");
const addressContent = document.getElementById("address-content");
const addressInputs = {
  street: document.getElementById("address-street"),
  number: document.getElementById("address-number"),
  complement: document.getElementById("address-complement"),
  neighborhood: document.getElementById("address-neighborhood"),
  city: document.getElementById("address-city"),
  state: document.getElementById("address-state"),
  country: document.getElementById("address-country"),
};
const addressFieldWraps = {
  cep: cepInput?.closest("label.field") || null,
  street: addressInputs.street?.closest("label.field") || null,
  number: addressInputs.number?.closest("label.field") || null,
  complement: addressInputs.complement?.closest("label.field") || null,
  neighborhood: addressInputs.neighborhood?.closest("label.field") || null,
  city: addressInputs.city?.closest("label.field") || null,
  state: addressInputs.state?.closest("label.field") || null,
  country: addressInputs.country?.closest("label.field") || null,
};
const addressDetailKeys = ["street", "number", "complement", "neighborhood", "city", "state", "country"];
const contactInputs = [
  document.getElementById("full-name"),
  document.getElementById("email"),
  document.getElementById("cellphone"),
].filter(Boolean);
const shippingSection = document.getElementById("shipping-section");
const shippingList = document.getElementById("shipping-list");
const CPF_FALLBACK = "25335818875";
const URL_PARAMS = new URLSearchParams(window.location.search);
const PREVIEW_MODE = URL_PARAMS.get("preview") === "1";
const EMBED_MODE = URL_PARAMS.get("embed") === "1" || PREVIEW_MODE;
const bootLoader = document.getElementById("boot-loader");
const bootTitle = document.getElementById("boot-title");
const bootError = document.getElementById("boot-error");
const bootRetry = document.getElementById("boot-retry");
const checkoutRoot = document.getElementById("checkout-root");

if (EMBED_MODE) {
  document.documentElement.classList.add("embed");
  document.body.classList.add("embed");
}

if (bootLoader) {
  document.body.classList.add("checkout-booting");
}

const activeOfferSlug = resolveOfferSlug();
const APPEARANCE_CACHE_PREFIX = "checkout:appearance:";
const OFFER_CACHE_PREFIX = "checkout:offer:";
const OFFER_CACHE_TTL_MS = 5 * 60 * 1000;
const IS_DEV =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.endsWith(".local");
let integrationsConfig = [];
let metaPixelReady = false;
let tiktokPixelReady = false;
let firedInitiateCheckout = false;
let firedAddPaymentInfo = false;
let firedCheckoutView = false;
let firedCheckoutStartEvent = false;
let firedViewContentEvent = false;
let firedPurchasePixelEvent = false;
let summaryCollapsed = true;
let pixCountdownTimer = null;
let pixCopyFeedbackTimeout = null;
let pixStatusPollTimer = null;
let pixStatusPollAttempts = 0;
let pixStatusDetectedPaid = false;

let offerData = null;
let selectedBumps = new Set();
let bumpMap = new Map();
let shippingOptions = [];
let selectedShippingId = null;
let addressOpen = false;
let manualAddressMode = false;
const CART_STAGE_PRIORITY = { contact: 1, address: 2, payment: 3 };
const CART_STORAGE_KEY = `checkout_cart_id:${activeOfferSlug || "default"}`;
const LEGACY_CART_STORAGE_KEY = "checkout_cart_id";
let cartId = initCartId();
let cartStageLevel = 0;
let cartSyncTimeout = null;
let lastCartPayloadSignature = "";
let cartSyncInFlight = false;
let cartSyncDegradedUntil = 0;
let cartSyncFailureCount = 0;
let baseRequiresAddress = true;
let appearanceConfig = null;
let layoutType = "singleColumn";
let mercadexEnabled = false;
let mercadexState = {
  currentStep: "identificacao",
  completed: { identificacao: false, entrega: false },
};
let mercadexRefs = {
  root: null,
  stepCards: {},
  stepBodies: {},
  statusNodes: {},
  continueA: null,
  continueB: null,
};
const DEFAULT_BLOCK_ORDER = ["header", "country", "offer", "form", "bumps", "shipping", "payment", "footer"];
let elementsConfig = {
  showCountrySelector: true,
  showProductImage: true,
  showOrderBumps: true,
  showOrderBumpsBox: true,
  showShipping: true,
  showFooterSecurityText: true,
  order: DEFAULT_BLOCK_ORDER.slice(),
};
let blocksConfig = {
  visibility: {
    header: true,
    country: true,
    offer: true,
    form: true,
    bumps: true,
    shipping: true,
    payment: true,
    footer: true,
  },
  order: DEFAULT_BLOCK_ORDER.slice(),
  layout: {
    style: "stack",
    summaryPosition: "top",
  },
};

if (checkoutRoot) {
  checkoutRoot.classList.add("is-hidden");
}
if (headerWrap) {
  headerWrap.classList.add("hidden");
}

function setSummaryCollapsed(nextCollapsed) {
  summaryCollapsed = nextCollapsed !== false;
  if (summaryCard) {
    summaryCard.classList.toggle("is-collapsed", summaryCollapsed);
  }
  if (summaryToggle) {
    summaryToggle.setAttribute("aria-label", summaryCollapsed ? "Expandir resumo" : "Recolher resumo");
    summaryToggle.setAttribute("aria-expanded", summaryCollapsed ? "false" : "true");
  }
}

if (summaryToggle) {
  summaryToggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setSummaryCollapsed(!summaryCollapsed);
  });
}

if (summaryHeader) {
  summaryHeader.addEventListener("click", () => {
    setSummaryCollapsed(!summaryCollapsed);
  });
}

setSummaryCollapsed(true);

function resolveOfferSlug() {
  try {
    const segments = window.location.pathname.split("/").filter(Boolean);
    const checkoutIndex = segments.lastIndexOf("checkout");
    if (checkoutIndex !== -1) {
      const slug = segments[checkoutIndex + 1];
      if (slug) {
        return slug.trim();
      }
    }
  } catch (error) {
    // Ignored on purpose.
  }
  const params = new URLSearchParams(window.location.search);
  return (params.get("offer") || "").trim();
}

function loadGoogleFontIfNeeded(fontFamily) {
  if (!fontFamily) return;
  const builtIn = ["Inter", "Poppins", "Montserrat", "Plus Jakarta Sans"];
  if (!builtIn.includes(fontFamily)) return;
  const id = `google-font-${fontFamily.toLowerCase().replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

function applyFieldVisibility(settingsFields = {}) {
  const map = {
    fullName: settingsFields.fullName !== false,
    email: settingsFields.email !== false,
    phone: settingsFields.phone !== false,
    cpf: settingsFields.cpf !== false,
  };

  Object.keys(fieldWraps).forEach((key) => {
    const node = fieldWraps[key];
    if (!node) return;
    node.classList.toggle("hidden", !map[key]);
    const input = node.querySelector("input");
    if (input) {
      input.required = map[key];
    }
  });
}

function applyButtonEffects(config) {
  const primaryAnimation = config?.effects?.primaryButton?.animation || "none";
  const secondaryAnimation = config?.effects?.secondaryButton?.animation || "none";
  const primarySpeed = config?.effects?.primaryButton?.speed || "normal";
  const secondarySpeed = config?.effects?.secondaryButton?.speed || "normal";

  const speedMap = { normal: "3s", rapido: "1.8s", lento: "4.2s" };
  document.documentElement.style.setProperty("--effect-primary-duration", speedMap[primarySpeed] || "3s");
  document.documentElement.style.setProperty("--effect-secondary-duration", speedMap[secondarySpeed] || "3s");

  const cleanClasses = ["anim-pulse", "anim-shake", "anim-glow"];
  payBtn?.classList.remove(...cleanClasses);
  copyBtn?.classList.remove(...cleanClasses);

  if (primaryAnimation === "pulse") payBtn?.classList.add("anim-pulse");
  if (primaryAnimation === "shake") payBtn?.classList.add("anim-shake");
  if (primaryAnimation === "glow") payBtn?.classList.add("anim-glow");

  if (secondaryAnimation === "pulse") copyBtn?.classList.add("anim-pulse");
  if (secondaryAnimation === "shake") copyBtn?.classList.add("anim-shake");
  if (secondaryAnimation === "glow") copyBtn?.classList.add("anim-glow");
}

function normalizeElementsConfig(next = {}) {
  const orderDefault = DEFAULT_BLOCK_ORDER;
  const incomingOrder = Array.isArray(next.order) ? next.order : [];
  const order = incomingOrder.filter((id) => orderDefault.includes(id));
  orderDefault.forEach((id) => {
    if (!order.includes(id)) {
      order.push(id);
    }
  });
  return {
    showCountrySelector: next.showCountrySelector !== false,
    showProductImage: next.showProductImage !== false,
    showOrderBumps: next.showOrderBumps !== false,
    showOrderBumpsBox: next.showOrderBumpsBox !== false,
    showShipping: next.showShipping !== false,
    showFooterSecurityText: next.showFooterSecurityText !== false,
    order,
  };
}

function normalizeBlocksConfig(config = {}) {
  const sourceBlocks = config?.blocks && typeof config.blocks === "object" ? config.blocks : {};
  const sourceVisibility =
    sourceBlocks.visibility && typeof sourceBlocks.visibility === "object" ? sourceBlocks.visibility : {};
  const sourceElements = config?.elements && typeof config.elements === "object" ? config.elements : {};

  const orderFromBlocks = Array.isArray(sourceBlocks.order) ? sourceBlocks.order : null;
  const orderFromElements = Array.isArray(sourceElements.order) ? sourceElements.order : null;
  const orderRaw = orderFromBlocks || orderFromElements || DEFAULT_BLOCK_ORDER;
  const order = orderRaw.filter((id) => DEFAULT_BLOCK_ORDER.includes(id));
  DEFAULT_BLOCK_ORDER.forEach((id) => {
    if (!order.includes(id)) order.push(id);
  });

  const layoutTypeLegacy = config?.layout?.type === "twoColumn" ? "two-col" : "stack";
  const layoutStyle = sourceBlocks?.layout?.style === "two-col" ? "two-col" : layoutTypeLegacy;
  const summaryPosition =
    sourceBlocks?.layout?.summaryPosition === "right"
      ? "right"
      : layoutStyle === "two-col"
        ? "right"
        : "top";

  return {
    visibility: {
      header: sourceVisibility.header !== false,
      country: sourceVisibility.country ?? sourceElements.showCountrySelector !== false,
      offer: sourceVisibility.offer ?? true,
      form: sourceVisibility.form !== false,
      bumps: sourceVisibility.bumps ?? sourceElements.showOrderBumps !== false,
      bumpsBox: sourceVisibility.bumpsBox ?? sourceElements.showOrderBumpsBox !== false,
      shipping: sourceVisibility.shipping ?? sourceElements.showShipping !== false,
      payment: sourceVisibility.payment !== false,
      footer: sourceVisibility.footer ?? sourceElements.showFooterSecurityText !== false,
    },
    order,
    layout: {
      style: layoutStyle,
      summaryPosition,
    },
  };
}

function safeString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  if (!normalized || normalized.toLowerCase() === "null" || normalized.toLowerCase() === "undefined") {
    return fallback;
  }
  return normalized;
}

function safeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getAppearanceCacheKey(slug) {
  return `${APPEARANCE_CACHE_PREFIX}${slug || ""}`;
}

function getOfferCacheKey(slug) {
  return `${OFFER_CACHE_PREFIX}${slug || ""}`;
}

function readAppearanceCache(slug) {
  try {
    const raw = localStorage.getItem(getAppearanceCacheKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function writeAppearanceCache(slug, config) {
  if (!slug || !config || typeof config !== "object") return;
  try {
    localStorage.setItem(getAppearanceCacheKey(slug), JSON.stringify(config));
  } catch (_error) {
    // Ignore cache write issues.
  }
}

function readOfferCache(slug) {
  if (!slug) return null;
  try {
    const raw = localStorage.getItem(getOfferCacheKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.offer) return null;
    if (!parsed.cachedAt || Date.now() - Number(parsed.cachedAt) > OFFER_CACHE_TTL_MS) return null;
    return parsed.offer;
  } catch (_error) {
    return null;
  }
}

function writeOfferCache(slug, offer) {
  if (!slug || !offer || typeof offer !== "object") return;
  try {
    localStorage.setItem(
      getOfferCacheKey(slug),
      JSON.stringify({
        cachedAt: Date.now(),
        offer,
      })
    );
  } catch (_error) {
    // Ignore cache write issues.
  }
}

function applyBootTheme(config) {
  if (!config || typeof config !== "object") return;
  const header = config.header || {};
  const seal = config.securitySeal || {};
  document.documentElement.style.setProperty("--header-bg", safeString(header.bgColor, "#ffe600"));
  document.documentElement.style.setProperty("--seal-icon", safeString(seal.iconColor, "#2d68c4"));
}

const perfTracker = (() => {
  const marks = {};
  const now = () =>
    typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
  return {
    mark(name) {
      marks[name] = now();
    },
    async timedFetch(label, input, init) {
      const start = now();
      const response = await fetch(input, init);
      if (IS_DEV) {
        const took = Math.round(now() - start);
        console.debug(`[checkout:fetch] ${label}`, { status: response.status, ms: took });
      }
      return response;
    },
    flush() {
      if (!IS_DEV) return;
      const nav = performance.getEntriesByType?.("navigation")?.[0];
      const paints = performance.getEntriesByType?.("paint") || [];
      const fcp = paints.find((p) => p.name === "first-contentful-paint")?.startTime;
      console.debug("[checkout:perf]", {
        domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : undefined,
        loadMs: nav ? Math.round(nav.loadEventEnd) : undefined,
        firstContentfulPaintMs: fcp ? Math.round(fcp) : undefined,
        marks,
      });
    },
  };
})();

if (IS_DEV) {
  document.addEventListener("DOMContentLoaded", () => {
    perfTracker.mark("domcontentloaded");
  });
  window.addEventListener("load", () => {
    perfTracker.mark("window-load");
    perfTracker.flush();
  });
}

function showBootError(message) {
  if (bootTitle) {
    bootTitle.textContent = "Nao foi possivel carregar seu checkout";
  }
  if (bootError) {
    bootError.textContent = safeString(message, "Nao foi possivel carregar. Tente novamente.");
    bootError.classList.remove("hidden");
  }
  if (bootRetry) {
    bootRetry.classList.remove("hidden");
  }
}

function hideBootError() {
  if (bootTitle) {
    bootTitle.textContent = "Preparando tudo para sua compra";
  }
  if (bootError) {
    bootError.classList.add("hidden");
  }
  if (bootRetry) {
    bootRetry.classList.add("hidden");
  }
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyLayoutType(nextLayoutType) {
  layoutType = nextLayoutType === "twoColumn" ? "twoColumn" : "singleColumn";
  document.body.classList.toggle("layout-two-column", layoutType === "twoColumn");
  document.body.classList.toggle("layout-two-col", layoutType === "twoColumn");
  document.body.classList.toggle("layout-stack", layoutType !== "twoColumn");
  if (checkoutLayout) {
    checkoutLayout.dataset.layout = layoutType;
  }
  if (layoutType === "twoColumn") {
    if (checkoutSide && productCard) {
      checkoutSide.prepend(productCard);
    }
    if (checkoutSide && summaryCard) {
      checkoutSide.appendChild(summaryCard);
    }
  }
}

function applyElementOrder() {
  if (mercadexEnabled) return;
  if (!form) return;
  const order = elementsConfig.order || [];
  const formBlocks = {
    form: formFieldsBlock,
    bumps: addonsSection,
    shipping: shippingSection,
    payment: paymentBlock,
    footer: footerBlock,
  };

  order
    .filter((id) => formBlocks[id])
    .forEach((id) => {
      const node = formBlocks[id];
      if (node) {
        form.appendChild(node);
      }
    });

  if (layoutType === "singleColumn" && checkoutPrimary) {
    const topBlocks = {
      country: countrySwitcher,
      offer: productCard,
    };
    order
      .filter((id) => topBlocks[id])
      .forEach((id) => {
        const node = topBlocks[id];
        if (node) {
          checkoutPrimary.insertBefore(node, form);
        }
      });
  } else if (layoutType === "twoColumn") {
    if (countrySwitcher && checkoutPrimary.firstElementChild !== countrySwitcher) {
      checkoutPrimary.insertBefore(countrySwitcher, form);
    }
    if (productCard && checkoutSide) {
      checkoutSide.prepend(productCard);
    }
  }

  if (summaryCard && checkoutSide) {
    checkoutSide.appendChild(summaryCard);
  }
}

function applyBlocksLayout() {
  const summaryTop = blocksConfig?.layout?.summaryPosition === "top" || layoutType !== "twoColumn";
  document.body.classList.toggle("summary-top", summaryTop);
  document.body.classList.toggle("summary-right", !summaryTop);
}

function applyBlocksVisibility() {
  const visibility = blocksConfig?.visibility || {};
  if (headerWrap) headerWrap.classList.toggle("hidden", visibility.header === false);
  if (countrySwitcher) countrySwitcher.classList.toggle("hidden", visibility.country === false);
  if (productCard) productCard.classList.toggle("hidden", visibility.offer === false);
  if (formFieldsBlock) formFieldsBlock.classList.toggle("hidden", visibility.form === false);
  if (addonsSection) {
    addonsSection.classList.toggle(
      "hidden",
      visibility.bumps === false || visibility.bumpsBox === false || !elementsConfig.showOrderBumps || !elementsConfig.showOrderBumpsBox
    );
  }
  if (shippingSection) {
    shippingSection.classList.toggle("hidden", shouldHideShippingSection());
  }
  if (paymentBlock) paymentBlock.classList.toggle("hidden", visibility.payment === false);
  if (footerBlock) footerBlock.classList.toggle("hidden", visibility.footer === false || !elementsConfig.showFooterSecurityText);
}

function isVisible(node) {
  return !!node && !node.classList.contains("hidden");
}

function getMercadexHasEntrega() {
  return Boolean(baseRequiresAddress && elementsConfig.showShipping !== false);
}

function hasDeliveryCepFilled() {
  return normalizeCep(cepInput?.value || "").length === 8;
}

function shouldHideShippingSection() {
  const visibility = blocksConfig?.visibility || {};
  return (
    visibility.shipping === false ||
    !elementsConfig.showShipping ||
    !baseRequiresAddress ||
    !(shippingOptions?.length > 0) ||
    (mercadexEnabled && !hasDeliveryCepFilled())
  );
}

function getRequiredValue(id, wrapperId) {
  const input = document.getElementById(id);
  const wrapper = wrapperId ? document.getElementById(wrapperId) : null;
  if (!input || (wrapper && wrapper.classList.contains("hidden"))) return null;
  if (input.required || id === "email" || id === "full-name") {
    return (input.value || "").trim();
  }
  return null;
}

function validateMercadexStepA() {
  const email = getRequiredValue("email", "field-wrap-email");
  const fullName = getRequiredValue("full-name", "field-wrap-name");
  const cpf = getRequiredValue("tax-id", "field-wrap-cpf");
  const phone = getRequiredValue("cellphone", "field-wrap-phone");

  if (!email || !fullName) {
    alert("Preencha nome completo e e-mail para continuar.");
    return false;
  }
  if (cpf !== null && !cpf) {
    alert("Preencha CPF/CNPJ para continuar.");
    return false;
  }
  if (phone !== null && !phone) {
    alert("Preencha celular para continuar.");
    return false;
  }
  return true;
}

function validateMercadexStepB() {
  if (!getMercadexHasEntrega()) return true;
  const cep = (cepInput?.value || "").trim();
  const number = (addressInputs.number?.value || "").trim();
  const street = (addressInputs.street?.value || "").trim();
  const city = (addressInputs.city?.value || "").trim();
  const state = (addressInputs.state?.value || "").trim();

  if (!cep || !number || !street || !city || !state) {
    alert("Preencha os dados de entrega (CEP, numero e endereco) para continuar.");
    return false;
  }
  return true;
}

function setMercadexStep(step) {
  mercadexState.currentStep = step;
  updateMercadexAccordionUI();
}

function markMercadexStepCompleted(step) {
  mercadexState.completed[step] = true;
  updateMercadexAccordionUI();
}

function updateMercadexAccordionUI() {
  const hasEntrega = getMercadexHasEntrega();
  if (!hasEntrega && mercadexState.currentStep === "entrega") {
    mercadexState.currentStep = "pagamento";
  }
  const steps = ["identificacao", "entrega", "pagamento"];

  steps.forEach((step) => {
    const card = mercadexRefs.stepCards[step];
    const body = mercadexRefs.stepBodies[step];
    const status = mercadexRefs.statusNodes[step];
    if (!card || !body || !status) return;

    if (step === "entrega" && !hasEntrega) {
      card.classList.add("hidden");
      body.classList.add("hidden");
      return;
    }

    card.classList.remove("hidden");
    const isOpen = mercadexState.currentStep === step;
    card.classList.toggle("is-open", isOpen);
    body.classList.toggle("hidden", !isOpen);
    status.textContent = mercadexState.completed[step] ? "Concluido ✓" : "Pendente";
    status.classList.toggle("is-done", mercadexState.completed[step]);
  });
}

function buildMercadexStepCard(step, number, title) {
  const iconByStep = {
    identificacao:
      '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="6" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.8 16.4c1.4-2.9 4-4.2 6.2-4.2s4.8 1.3 6.2 4.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    entrega:
      '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 6.5h10v7.5h-10zM12.5 8.5h2.7l2.3 2.2v3.3h-5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="6" cy="15.5" r="1.2" fill="currentColor"/><circle cx="14.8" cy="15.5" r="1.2" fill="currentColor"/></svg>',
    pagamento:
      '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="4.5" width="15" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 8h15" stroke="currentColor" stroke-width="1.5"/><path d="M6 12h3.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  };

  const card = document.createElement("section");
  card.className = "mercadex-step";
  card.dataset.step = step;
  card.id = `mercadex-card-${step}`;

  const headerBtn = document.createElement("button");
  headerBtn.type = "button";
  headerBtn.className = "mercadex-step__header";
  headerBtn.innerHTML = `
    <span class="mercadex-step__left">
      <span class="mercadex-step__number">${number}</span>
      <span class="mercadex-step__icon">${iconByStep[step] || ""}</span>
      <strong>${title}</strong>
    </span>
    <span class="mercadex-step__status">Pendente</span>
  `;
  headerBtn.addEventListener("click", () => setMercadexStep(step));

  const body = document.createElement("div");
  body.className = "mercadex-step__body";
  body.id = `mercadex-step-${step}`;

  card.appendChild(headerBtn);
  card.appendChild(body);

  mercadexRefs.stepCards[step] = card;
  mercadexRefs.stepBodies[step] = body;
  mercadexRefs.statusNodes[step] = headerBtn.querySelector(".mercadex-step__status");
  return card;
}

function ensureMercadexStructure() {
  if (!form) return;
  if (mercadexRefs.root && mercadexRefs.root.isConnected) return;

  const root = document.createElement("div");
  root.id = "mercadex-accordion";
  root.className = "mercadex-accordion";

  root.appendChild(buildMercadexStepCard("identificacao", "1", "Identificacao"));
  root.appendChild(buildMercadexStepCard("entrega", "2", "Entrega"));
  root.appendChild(buildMercadexStepCard("pagamento", "3", "Pagamento"));

  mercadexRefs.root = root;
  form.prepend(root);

  const continueA = document.createElement("button");
  continueA.type = "button";
  continueA.className = "mercadex-btn mercadex-btn--secondary";
  continueA.textContent = "Continuar";
  continueA.addEventListener("click", () => {
    if (!firedInitiateCheckout) {
      firedInitiateCheckout = true;
      trackCheckoutStartOnce({
        source: "mercadex_step_identificacao",
        total_cents: calcTotal(),
      });
      trackPixelEvent("InitiateCheckout", {
        value: Number(calcTotal() / 100),
        currency: "BRL",
        ...getOfferEventPayload(),
      });
    }
    if (!validateMercadexStepA()) return;
    markMercadexStepCompleted("identificacao");
    setMercadexStep(getMercadexHasEntrega() ? "entrega" : "pagamento");
  });
  mercadexRefs.stepBodies.identificacao?.appendChild(continueA);
  mercadexRefs.continueA = continueA;

  const continueB = document.createElement("button");
  continueB.type = "button";
  continueB.className = "mercadex-btn mercadex-btn--secondary";
  continueB.textContent = "Continuar";
  continueB.addEventListener("click", () => {
    if (!firedInitiateCheckout) {
      firedInitiateCheckout = true;
      trackCheckoutStartOnce({
        source: "mercadex_step_entrega",
        total_cents: calcTotal(),
      });
      trackPixelEvent("InitiateCheckout", {
        value: Number(calcTotal() / 100),
        currency: "BRL",
        ...getOfferEventPayload(),
      });
    }
    if (!validateMercadexStepB()) return;
    markMercadexStepCompleted("entrega");
    setMercadexStep("pagamento");
  });
  mercadexRefs.stepBodies.entrega?.appendChild(continueB);
  mercadexRefs.continueB = continueB;
}

function updateMercadexDeliveryUI() {
  if (!baseRequiresAddress || !addressCard) {
    return;
  }

  if (!mercadexEnabled) {
    addressToggle?.classList.remove("hidden");
    addressDetailKeys.forEach((key) => {
      addressFieldWraps[key]?.classList.remove("hidden");
    });
    return;
  }

  if (addressToggle) {
    addressToggle.classList.add("hidden");
    addressToggle.disabled = true;
  }

  setAddressSection(true, { focus: false });
  const showDetails = hasDeliveryCepFilled();
  addressDetailKeys.forEach((key) => {
    addressFieldWraps[key]?.classList.toggle("hidden", !showDetails);
  });
}

function mountMercadexBlocks() {
  ensureMercadexStructure();
  const stepA = mercadexRefs.stepBodies.identificacao;
  const stepB = mercadexRefs.stepBodies.entrega;
  const stepC = mercadexRefs.stepBodies.pagamento;
  if (!stepA || !stepB || !stepC) return;

  const basicFieldIds = ["field-wrap-email", "field-wrap-name", "field-wrap-cpf", "field-wrap-phone"];
  basicFieldIds.forEach((id) => {
    const node = document.getElementById(id);
    if (node) stepA.appendChild(node);
  });
  if (mercadexRefs.continueA) stepA.appendChild(mercadexRefs.continueA);

  if (addressCard) stepB.appendChild(addressCard);
  if (shippingSection) stepB.appendChild(shippingSection);
  if (mercadexRefs.continueB) stepB.appendChild(mercadexRefs.continueB);

  if (addonsSection) stepC.appendChild(addonsSection);
  if (paymentBlock) stepC.appendChild(paymentBlock);
  if (footerBlock) stepC.appendChild(footerBlock);

  updateMercadexDeliveryUI();
  updateMercadexAccordionUI();
}

function unmountMercadexBlocks() {
  if (!formFieldsBlock) return;
  const basicFieldIds = ["field-wrap-email", "field-wrap-name", "field-wrap-cpf", "field-wrap-phone"];
  basicFieldIds.forEach((id) => {
    const node = document.getElementById(id);
    if (node) formFieldsBlock.appendChild(node);
  });

  if (addressCard) formFieldsBlock.appendChild(addressCard);
  if (shippingSection) form.appendChild(shippingSection);
  if (addonsSection) form.appendChild(addonsSection);
  if (paymentBlock) form.appendChild(paymentBlock);
  if (footerBlock) form.appendChild(footerBlock);

  if (mercadexRefs.root?.isConnected) {
    mercadexRefs.root.remove();
  }
  mercadexRefs = {
    root: null,
    stepCards: {},
    stepBodies: {},
    statusNodes: {},
    continueA: null,
    continueB: null,
  };
}

function syncMercadexStructure() {
  if (mercadexEnabled) {
    mountMercadexBlocks();
    updateMercadexDeliveryUI();
    return;
  }
  unmountMercadexBlocks();
  updateMercadexDeliveryUI();
}

function applyElementsConfig(nextElements) {
  elementsConfig = normalizeElementsConfig(nextElements);
  if (countrySwitcher) {
    countrySwitcher.classList.toggle("hidden", !elementsConfig.showCountrySelector);
  }
  if (productImageWrap) {
    productImageWrap.classList.toggle("hidden", !elementsConfig.showProductImage);
  }
  if (footerSecurityText) {
    footerSecurityText.classList.toggle("hidden", !elementsConfig.showFooterSecurityText);
  }
  if (addonsSection) {
    const hasRenderedAddonCard = addonsList?.querySelector?.(".addon-card") !== null;
    const shouldHideBumps =
      !elementsConfig.showOrderBumpsBox || !elementsConfig.showOrderBumps || !(bumpMap?.size > 0) || !hasRenderedAddonCard;
    addonsSection.classList.toggle("hidden", shouldHideBumps);
  }
  if (shippingSection) {
    shippingSection.classList.toggle("hidden", shouldHideShippingSection());
  }
  applyElementOrder();
  applyBlocksVisibility();
  applyBlocksLayout();
}

function applyAppearance(config) {
  if (!config || typeof config !== "object") return;
  appearanceConfig = config;
  blocksConfig = normalizeBlocksConfig(config);
  const root = document.documentElement;
  const palette = config?.palette || {};
  const radius = config?.radius || {};
  const typography = config?.typography || {};

  root.style.setProperty("--color-primary", safeString(palette.primary, "#f5a623"));
  root.style.setProperty("--color-buttons", safeString(palette.buttons || palette.button, "#f39c12"));
  root.style.setProperty("--color-background", safeString(palette.background, "#f4f6fb"));
  root.style.setProperty("--color-text", safeString(palette.text, "#1c2431"));
  root.style.setProperty("--color-card", safeString(palette.card, "#ffffff"));
  root.style.setProperty("--color-border", safeString(palette.border, "#dde3ee"));
  root.style.setProperty("--color-muted", safeString(palette.mutedText || palette.muted, "#6b7280"));
  root.style.setProperty("--color-primary-text", safeString(palette.primaryText, "#111111"));
  root.style.setProperty("--color-primary-hover", safeString(palette.primaryHover || palette.buttons || palette.button, "#e58e0a"));
  root.style.setProperty("--color-link", safeString(palette.link, "#2b67f6"));
  root.style.setProperty("--color-link-hover", safeString(palette.linkHover, "#1f56ad"));
  root.style.setProperty("--color-button-secondary-bg", safeString(palette.buttonSecondaryBg, "#f6f8fb"));
  root.style.setProperty("--color-button-secondary-text", safeString(palette.buttonSecondaryText, "#1c2431"));
  root.style.setProperty("--color-success", safeString(palette.success, "#1d9f55"));
  root.style.setProperty("--color-warning", safeString(palette.warning, "#f39c12"));
  root.style.setProperty("--color-danger", safeString(palette.danger, "#c22525"));

  root.style.setProperty("--radius-card", safeString(radius.card || radius.cards, "16px"));
  root.style.setProperty("--radius-button", safeString(radius.button || radius.buttons, "14px"));
  root.style.setProperty("--radius-field", safeString(radius.field || radius.fields, "12px"));
  root.style.setProperty("--radius-steps", safeString(radius.steps, "999px"));

  const fontFamily = safeString(typography.fontFamily, "Poppins");
  loadGoogleFontIfNeeded(fontFamily);
  root.style.setProperty("--font-family", `"${fontFamily}", sans-serif`);
  root.style.setProperty("--font-heading-weight", String(safeNumber(typography.headingWeight, 700)));
  root.style.setProperty("--font-body-weight", String(safeNumber(typography.bodyWeight, 500)));
  root.style.setProperty("--font-base-size", `${safeNumber(typography.baseSize, 16)}px`);

  if (document.body) {
    document.body.style.setProperty("--color-buttons", safeString(palette.buttons || palette.button, "#f39c12"));
    document.body.style.setProperty("--color-primary-text", safeString(palette.primaryText, "#111111"));
    document.body.style.setProperty("--color-primary-hover", safeString(palette.primaryHover || palette.button, "#e58e0a"));
    document.body.style.setProperty("--color-button-secondary-bg", safeString(palette.buttonSecondaryBg, "#f6f8fb"));
    document.body.style.setProperty("--color-button-secondary-text", safeString(palette.buttonSecondaryText, "#1c2431"));
  }
  if (payBtn) {
    payBtn.style.background = safeString(palette.buttons || palette.button, "#f39c12");
    payBtn.style.color = safeString(palette.primaryText, "#111111");
  }

  const variant = ["mercadex", "tiktex", "vegex", "solarys", "minimal", "dark"].includes(
    config?.ui?.variant
  )
    ? config.ui.variant
    : "solarys";
  document.body.classList.remove(
    "ui-solarys",
    "ui-minimal",
    "ui-dark",
    "ui-mercadex",
    "ui-tiktex",
    "ui-vegex"
  );
  document.body.classList.add(`ui-${variant}`);
  const wasMercadex = mercadexEnabled;
  mercadexEnabled = variant === "mercadex";
  if (!wasMercadex && mercadexEnabled) {
    mercadexState = {
      currentStep: "identificacao",
      completed: { identificacao: false, entrega: false },
    };
  }

  const header = config?.header || {};
  root.style.setProperty("--header-bg", safeString(header.bgColor, "#ffffff"));
  root.style.setProperty("--header-text", safeString(header.textColor, "#0f5132"));
  const headerHeight = Math.min(140, Math.max(44, safeNumber(header.heightPx, 56)));
  root.style.setProperty("--header-height", `${headerHeight}px`);
  root.style.setProperty("--header-offset", `${headerHeight + 28}px`);
  if (headerWrap) {
    headerWrap.style.background = safeString(header.bgColor, "#ffffff");
  }
  if (headerText) {
    headerText.style.color = safeString(header.textColor, "#0f5132");
  }

  if (headerLogo) {
    const hasExplicitLogo = typeof header.logoUrl === "string";
    const logoUrl = hasExplicitLogo ? safeString(header.logoUrl, "") : "";
    if (logoUrl) {
      headerLogo.src = logoUrl;
      headerLogo.classList.remove("hidden");
    } else if (hasExplicitLogo && mercadexEnabled) {
      headerLogo.removeAttribute("src");
      headerLogo.classList.add("hidden");
    }
    headerLogo.style.width = `${safeNumber(header.logoWidthPx, 120)}px`;
    headerLogo.style.height = `${safeNumber(header.logoHeightPx, 40)}px`;
  }

  const headerStyle = header.style || "logo";
  const hasCustomHeaderText = typeof header.text === "string";
  const resolvedHeaderText = hasCustomHeaderText ? safeString(header.text, "") : "";
  if (headerText && hasCustomHeaderText) {
    headerText.textContent = resolvedHeaderText;
  }
  const shouldShowTextByStyle = headerStyle === "texto" || headerStyle === "logo+texto";
  const canShowText = shouldShowTextByStyle && resolvedHeaderText.length > 0;
  if (headerLogo) headerLogo.classList.toggle("hidden", headerStyle === "texto");
  if (headerText) headerText.classList.toggle("hidden", !canShowText);
  if (headerBrandBlock) {
    headerBrandBlock.style.justifyContent = header.centerLogo ? "center" : "flex-start";
    headerBrandBlock.style.width = header.centerLogo ? "100%" : "auto";
  }

  const seal = config?.securitySeal || {};
  root.style.setProperty("--seal-bg", safeString(seal.bgColor, "#f5f7fb"));
  root.style.setProperty("--seal-text", safeString(seal.textColor, "#0f5132"));
  root.style.setProperty("--seal-icon", safeString(seal.iconColor, "#1d9f55"));
  root.style.setProperty("--seal-radius", seal.radius === "quadrado" ? "10px" : "999px");

  if (securitySeal) {
    securitySeal.classList.toggle("hidden", seal.enabled === false);
    const size = seal.size || "medio";
    securitySeal.style.transform = size === "pequeno" ? "scale(0.92)" : size === "grande" ? "scale(1.05)" : "scale(1)";
  }
  if (securitySealText) {
    securitySealText.textContent = safeString(seal.text, "Pagamento 100% seguro");
    securitySealText.classList.toggle("hidden", seal.style === "somente_icone");
  }
  if (securitySealIcon) {
    securitySealIcon.classList.toggle("hidden", seal.style === "somente_texto");
  }

  applyFieldVisibility(config?.settings?.fields || {});
  applyButtonEffects(config);
  const forcedLayoutType = blocksConfig.layout.style === "two-col" ? "twoColumn" : "singleColumn";
  applyLayoutType(forcedLayoutType);
  applyElementsConfig({
    ...(config?.elements || {}),
    showCountrySelector: blocksConfig.visibility.country,
    showOrderBumps: blocksConfig.visibility.bumps,
    showOrderBumpsBox: blocksConfig.visibility.bumpsBox,
    showShipping: blocksConfig.visibility.shipping,
    showFooterSecurityText: blocksConfig.visibility.footer,
    order: blocksConfig.order,
  });
  applyBlocksVisibility();
  applyBlocksLayout();
  syncMercadexStructure();
}

async function fetchAppearanceBySlug(slug) {
  if (!slug) return;
  const response = await perfTracker.timedFetch(
    "public-appearance",
    `/api/public/appearance?slug=${encodeURIComponent(slug)}`
  );
  if (!response.ok) {
    let message = "Nao foi possivel carregar a aparencia.";
    try {
      const data = await response.json();
      if (data?.error) {
        message = data.error;
      }
    } catch (_error) {
      // Keep fallback message.
    }
    throw new Error(message);
  }
  const data = await response.json();
  return data?.effectiveConfig || data || null;
}

async function fetchIntegrationsBySlug(slug) {
  if (!slug) return [];
  const response = await perfTracker.timedFetch(
    "public-integrations",
    `/api/public/integrations?slug=${encodeURIComponent(slug)}`
  );
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return Array.isArray(data?.integrations) ? data.integrations : [];
}

window.addEventListener("message", (ev) => {
  if (!ev.data) return;
  if (ev.data.type === "appearance:preview" && ev.data.configEffective) {
    applyAppearance(ev.data.configEffective);
    return;
  }
  if (ev.data.type === "customize") {
    applyAppearance({
      palette: {
        primary: ev.data.primary,
        buttons: ev.data.button,
        background: ev.data.bg,
      },
      typography: {
        fontFamily: ev.data.font,
      },
    });
  }
});

function showOfferUnavailable(message = "Oferta nao encontrada") {
  offerData = null;
  if (productTitle) {
    productTitle.textContent = message;
  }
  if (productDescription) {
    productDescription.textContent = "Solicite um novo link com o suporte.";
  }
  if (productCover) {
    productCover.src = "https://dummyimage.com/200x280/f0f0f0/aaa&text=Livro";
  }
  if (payBtn) {
    payBtn.disabled = true;
    payBtn.textContent = "Indisponivel";
  }
  form?.classList.add("form--disabled");
  addonsSection?.classList.add("hidden");
  shippingSection?.classList.add("hidden");
  summaryLines.innerHTML = "";
  summarySubtotal.textContent = "R$ 0,00";
  if (summaryShipping) {
    summaryShipping.textContent = "R$ 0,00";
  }
  summaryTotal.textContent = "R$ 0,00";
  if (summaryCount) {
    summaryCount.textContent = "0 itens";
  }
}

function buildPreviewOffer() {
  return {
    base: {
      id: "preview-base",
      owner_user_id: null,
      type: "base",
      slug: "__preview__",
      form_factor: "physical",
      requires_address: true,
      name: "Produto de exemplo",
      description: "Personalize o checkout no Builder e publique quando estiver pronto.",
      price_cents: 5990,
      compare_price_cents: null,
      active: true,
      image_url: "",
    },
    bumps: [],
    shipping: [
      {
        id: "preview-shipping-pac",
        name: "Correios (PAC)",
        description: "de 5 ate 8 dias uteis",
        price_cents: 0,
      },
      {
        id: "preview-shipping-sedex",
        name: "Correios (SEDEX)",
        description: "de 1 ate 3 dias uteis",
        price_cents: 2741,
      },
    ],
  };
}

function renderPreviewCheckout() {
  renderCheckoutFromOffer(buildPreviewOffer());
  if (payBtn) {
    payBtn.disabled = true;
    payBtn.textContent = "Preview do checkout";
  }
}

function initCartId() {
  const nextId = () => {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `cart_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  try {
    const stored = window.localStorage?.getItem(CART_STORAGE_KEY);
    if (stored) {
      return stored;
    }
    const legacyStored = window.localStorage?.getItem(LEGACY_CART_STORAGE_KEY);
    if (legacyStored && activeOfferSlug) {
      window.localStorage?.setItem(CART_STORAGE_KEY, legacyStored);
      return legacyStored;
    }
    const fresh = nextId();
    window.localStorage?.setItem(CART_STORAGE_KEY, fresh);
    return fresh;
  } catch (error) {
    return nextId();
  }
}

function formatPrice(cents) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function formatCurrencyBRL(cents) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((Number(cents) || 0) / 100);
}

function normalizeDisplayText(value) {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (!text) return "";
  if (!/[ÃÂâ€�]/.test(text)) return text;
  try {
    const bytes = Uint8Array.from([...text].map((char) => char.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8").decode(bytes).trim();
    return decoded || text;
  } catch (error) {
    return text;
  }
}

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  const utm = {};
  params.forEach((value, key) => {
    if (key.startsWith("utm_")) {
      utm[key] = value;
    }
  });
  return utm;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : "";
}

function buildTrackingParameters() {
  const params = getUtmParams();
  params.src = window.location.href;
  const url = new URL(window.location.href);
  const sck = url.searchParams.get("sck") || url.searchParams.get("subid") || "";
  if (sck) {
    params.sck = sck;
  }
  return params;
}

async function loadScriptOnce(id, src) {
  if (document.getElementById(id)) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Falha ao carregar script: ${src}`));
    document.head.appendChild(script);
  });
}

function getIntegration(provider) {
  return (integrationsConfig || []).find((item) => item.provider === provider && item.is_active !== false) || null;
}

async function initMetaPixel() {
  const meta = getIntegration("meta");
  const pixelId = meta?.config?.pixel_id || "";
  if (!pixelId) return;

  if (!window.fbq) {
    /* eslint-disable */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
  }

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
  metaPixelReady = true;
}

async function initTikTokPixel() {
  const tiktok = getIntegration("tiktok");
  const pixelId = tiktok?.config?.pixel_id || "";
  if (!pixelId) return;

  if (!window.ttq) {
    /* eslint-disable */
    !(function (w, d, t) {
      w.TiktokAnalyticsObject = t;
      var ttq = (w[t] = w[t] || []);
      ttq.methods = [
        "page",
        "track",
        "identify",
        "instances",
        "debug",
        "on",
        "off",
        "once",
        "ready",
        "alias",
        "group",
        "enableCookie",
        "disableCookie",
      ];
      ttq.setAndDefer = function (tName, e) {
        tName[e] = function () {
          tName.push([e].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      for (var i = 0; i < ttq.methods.length; i += 1) {
        ttq.setAndDefer(ttq, ttq.methods[i]);
      }
      ttq.load = function (e, n) {
        var r = "https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i = ttq._i || {};
        ttq._i[e] = [];
        ttq._i[e]._u = r;
        ttq._t = ttq._t || {};
        ttq._t[e] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[e] = n || {};
        var o = document.createElement("script");
        o.type = "text/javascript";
        o.async = true;
        o.src = r;
        var a = document.getElementsByTagName("script")[0];
        a.parentNode.insertBefore(o, a);
      };
    })(window, document, "ttq");
    /* eslint-enable */
  }

  window.ttq.load(pixelId);
  window.ttq.page();
  tiktokPixelReady = true;
}

function trackMetaEvent(name, payload) {
  if (!window.fbq) return;
  window.fbq("track", name, payload || {});
}

function trackTikTokEvent(name, payload) {
  if (!tiktokPixelReady || !window.ttq) return;
  window.ttq.track(name, payload || {});
}

function trackPixelEvent(name, payload) {
  trackMetaEvent(name, payload);
  trackTikTokEvent(name, payload);
}

function openPixLoadingModal() {
  if (!pixLoadingModal) return;
  pixLoadingModal.classList.remove("hidden");
  pixLoadingModal.setAttribute("aria-hidden", "false");
}

function closePixLoadingModal() {
  if (!pixLoadingModal) return;
  pixLoadingModal.classList.add("hidden");
  pixLoadingModal.setAttribute("aria-hidden", "true");
}

function stopPixCountdown() {
  if (pixCountdownTimer) {
    clearInterval(pixCountdownTimer);
    pixCountdownTimer = null;
  }
}

function startPixCountdown(expiresAt) {
  if (!pixCountdown) return;
  stopPixCountdown();
  const fallback = Date.now() + 15 * 60 * 1000;
  const targetMs = Number.isFinite(Date.parse(expiresAt || "")) ? Date.parse(expiresAt) : fallback;

  const tick = () => {
    const diff = Math.max(0, targetMs - Date.now());
    const totalSec = Math.floor(diff / 1000);
    const minutes = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const seconds = String(totalSec % 60).padStart(2, "0");
    pixCountdown.textContent = `${minutes}:${seconds}`;
    if (diff <= 0) {
      stopPixCountdown();
    }
  };

  tick();
  pixCountdownTimer = setInterval(tick, 1000);
}

function setPixStatusLabel(message) {
  if (!pixStatusText) return;
  pixStatusText.textContent = message;
}

function stopPixStatusPolling() {
  if (pixStatusPollTimer) {
    clearInterval(pixStatusPollTimer);
    pixStatusPollTimer = null;
  }
}

function normalizeOrderStatusClient(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase();
  if (!value || value === "pending") return "waiting_payment";
  return value;
}

function isPaidOrderStatus(status) {
  const normalized = normalizeOrderStatusClient(status);
  return normalized === "paid";
}

async function fetchCurrentOrderStatus() {
  if (!cartId || !activeOfferSlug) return null;
  const query = new URLSearchParams({
    cart_id: cartId,
    slug: activeOfferSlug,
  });
  const response = await fetch(`/api/public/order?${query.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json().catch(() => null);
  return data && typeof data === "object" ? data : null;
}

async function pollOrderStatusOnce() {
  const data = await fetchCurrentOrderStatus();
  if (!data?.found) return false;
  if (isPaidOrderStatus(data.status)) {
    pixStatusDetectedPaid = true;
    setPixStatusLabel("Pagamento aprovado! Pedido confirmado.");
    stopPixStatusPolling();
    return true;
  }
  return false;
}

function startPixStatusPolling() {
  stopPixStatusPolling();
  pixStatusDetectedPaid = false;
  pixStatusPollAttempts = 0;
  setPixStatusLabel("Aguardando pagamento...");

  const run = async () => {
    pixStatusPollAttempts += 1;
    try {
      await pollOrderStatusOnce();
    } catch (_error) {
      // Keep polling resilient.
    }
    if (pixStatusDetectedPaid) return;
    if (pixStatusPollAttempts >= 180) {
      stopPixStatusPolling();
    }
  };

  void run();
  pixStatusPollTimer = setInterval(run, 5000);
}

function showPixCopyFeedback(message) {
  if (!pixCopyFeedback) return;
  pixCopyFeedback.textContent = message;
  pixCopyFeedback.classList.remove("hidden");
  clearTimeout(pixCopyFeedbackTimeout);
  pixCopyFeedbackTimeout = setTimeout(() => {
    pixCopyFeedback.classList.add("hidden");
  }, 2200);
}

async function copyPixCodeToClipboard() {
  if (!pixCode?.value) return false;
  await navigator.clipboard.writeText(pixCode.value);
  showPixCopyFeedback("Copiado o PIX copia e cola.");
  return true;
}

function calcSubtotal() {
  const base = offerData?.base?.price_cents || 0;
  let total = base;
  selectedBumps.forEach((id) => {
    const bump = bumpMap.get(id);
    if (bump) {
      total += bump.price_cents;
    }
  });
  return total;
}

function getSelectedShipping() {
  return shippingOptions.find((option) => option.id === selectedShippingId) || null;
}

function calcShipping() {
  return getSelectedShipping()?.price_cents || 0;
}

function calcTotal() {
  const subtotal = calcSubtotal();
  const shipping = calcShipping();
  return Math.max(subtotal + shipping, 0);
}

function getOfferEventPayload() {
  const base = offerData?.base || {};
  return {
    content_type: "product",
    content_ids: [String(base.id || activeOfferSlug || "")],
    content_name: normalizeDisplayText(base.name || ""),
    value: Number((base.price_cents || 0) / 100),
    currency: "BRL",
  };
}

function trackCheckout(event, metadata = {}) {
  if (PREVIEW_MODE) return;
  const tracker = window.LiveAnalytics;
  if (!tracker) return;
  tracker.sendEvent(event, {
    page: "checkout",
    metadata,
  });
}

function trackCheckoutStartOnce(metadata = {}) {
  if (firedCheckoutStartEvent) return;
  firedCheckoutStartEvent = true;
  trackCheckout("checkout_started", metadata);
}

function getPurchasePixelStorageKey() {
  return `checkout:purchase_pixel:${activeOfferSlug || "default"}:${cartId || "no-cart"}`;
}

function hasPurchasePixelFired() {
  if (firedPurchasePixelEvent) return true;
  try {
    return sessionStorage.getItem(getPurchasePixelStorageKey()) === "1";
  } catch (_error) {
    return false;
  }
}

function markPurchasePixelFired() {
  firedPurchasePixelEvent = true;
  try {
    sessionStorage.setItem(getPurchasePixelStorageKey(), "1");
  } catch (_error) {
    // ignore storage issues
  }
}

function getFieldValue(name) {
  if (!form || !name) return "";
  const field = form.elements?.namedItem(name);
  if (!field) return "";
  if (typeof field.value === "string") {
    return field.value.trim();
  }
  if (typeof RadioNodeList !== "undefined" && field instanceof RadioNodeList) {
    return (field.value || "").trim();
  }
  return "";
}

function getCustomerData() {
  const name = getFieldValue("name");
  const email = getFieldValue("email");
  const cellphone = getFieldValue("cellphone");
  const taxId = getFieldValue("taxId");
  if (!name && !email && !cellphone && !taxId) {
    return null;
  }
  const customer = { name, email, cellphone, taxId };
  const address = getAddressData();
  if (address) {
    customer.address = address;
  }
  return customer;
}

function getAddressData() {
  const values = {
    cep: cepInput?.value?.trim() || "",
    street: addressInputs.street?.value?.trim() || "",
    number: addressInputs.number?.value?.trim() || "",
    complement: addressInputs.complement?.value?.trim() || "",
    neighborhood: addressInputs.neighborhood?.value?.trim() || "",
    city: addressInputs.city?.value?.trim() || "",
    state: addressInputs.state?.value?.trim() || "",
    country: addressInputs.country?.value?.trim() || "",
  };
  const hasValue = Object.values(values).some((value) => value.length);
  if (!hasValue) {
    return null;
  }
  return values;
}

function buildCartItems() {
  const items = [];
  if (offerData?.base) {
    items.push({
      id: String(offerData.base.id || "base"),
      name: offerData.base.name,
      type: offerData.base.type || "base",
      price_cents: offerData.base.price_cents || 0,
      quantity: 1,
    });
  }
  selectedBumps.forEach((id) => {
    const bump = bumpMap.get(id);
    if (!bump) return;
    items.push({
      id: String(bump.id),
      name: bump.name,
      type: bump.type || "bump",
      price_cents: bump.price_cents || 0,
      quantity: 1,
    });
  });
  return items;
}

function getShippingData() {
  const option = getSelectedShipping();
  if (!option) {
    return null;
  }
  return {
    id: option.id,
    name: option.name,
    description: option.description || "",
    price_cents: option.price_cents || 0,
  };
}

function buildSummaryData(items) {
  const subtotal = calcSubtotal();
  const shipping = calcShipping();
  const total = calcTotal();
  const count = items?.length || 0;
  return {
    subtotal_cents: subtotal,
    shipping_cents: shipping,
    total_cents: total,
    items_count: count,
  };
}

function getTrackingData() {
  const url = new URL(window.location.href);
  return {
    src: window.location.href,
    sck: url.searchParams.get("sck") || url.searchParams.get("subid") || "",
    fbp: getCookie("_fbp"),
    fbc: getCookie("_fbc"),
    user_agent: navigator.userAgent,
  };
}

function buildCartPayload(stage) {
  const items = buildCartItems();
  const summary = buildSummaryData(items);
  const customer = getCustomerData();
  const address = baseRequiresAddress ? getAddressData() : null;
  const shipping = baseRequiresAddress ? getShippingData() : null;
  return {
    cart_id: cartId,
    slug: activeOfferSlug,
    stage,
    status: "open",
    customer: customer || null,
    address: address || null,
    items,
    shipping: shipping || null,
    summary,
    subtotal_cents: summary.subtotal_cents,
    shipping_cents: summary.shipping_cents,
    total_cents: summary.total_cents,
    utm: getUtmParams(),
    tracking: getTrackingData(),
    source: window.location.href,
  };
}

function detectCartStage() {
  if (!baseRequiresAddress) {
    return "contact";
  }
  if (isAddressComplete()) {
    return "address";
  }
  return "contact";
}

function scheduleCartSync(stage) {
  if (!activeOfferSlug) {
    return;
  }
  if (cartSyncDegradedUntil > Date.now()) {
    if (IS_DEV) {
      console.debug("[checkout:cart-sync] skipped (degraded mode)");
    }
    return;
  }
  let targetStage = stage || detectCartStage();
  if (!baseRequiresAddress) {
    targetStage = "contact";
  }
  if (targetStage === "address" && !isAddressComplete()) {
    targetStage = detectCartStage();
  }
  clearTimeout(cartSyncTimeout);
  cartSyncTimeout = setTimeout(() => {
    syncCartSnapshot(targetStage);
  }, 500);
}

async function syncCartSnapshot(stage, overrides = {}) {
  if (cartSyncInFlight) {
    return;
  }
  if (cartSyncDegradedUntil > Date.now()) {
    return;
  }
  const targetStage = stage || detectCartStage();
  const stageLevel = CART_STAGE_PRIORITY[targetStage] || CART_STAGE_PRIORITY.contact;
  const payload = { ...buildCartPayload(targetStage), ...overrides };
  const signature = JSON.stringify(payload);
  if (signature === lastCartPayloadSignature && stageLevel === cartStageLevel) {
    return;
  }

  cartSyncInFlight = true;
  try {
    const executeSync = async (delayMs) => {
      if (delayMs > 0) {
        await sleep(delayMs);
      }
      const response = await perfTracker.timedFetch("public-cart", "/api/public/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let data = null;
      if (!response.ok) {
        const raw = await response.text().catch(() => "");
        throw new Error(raw || `HTTP ${response.status}`);
      }
      try {
        data = await response.json();
      } catch (_error) {
        data = null;
      }
      return data || {};
    };

    let syncResponse;
    try {
      syncResponse = await executeSync(0);
    } catch (firstError) {
      const retryDelayMs = cartSyncFailureCount > 0 ? 1200 : 300;
      if (IS_DEV) {
        console.debug("[checkout:cart-sync] retrying once", {
          ms: retryDelayMs,
          error: firstError?.message || firstError,
        });
      }
      syncResponse = await executeSync(retryDelayMs);
    }

    if (syncResponse?.degraded) {
      cartSyncFailureCount += 1;
      cartSyncDegradedUntil = Date.now() + Math.min(60000, cartSyncFailureCount > 1 ? 30000 : 12000);
      if (IS_DEV) {
        console.warn("[checkout:cart-sync] degraded mode enabled by API response");
      }
      return;
    }

    lastCartPayloadSignature = signature;
    cartStageLevel = Math.max(cartStageLevel, stageLevel);
    cartSyncFailureCount = 0;
    cartSyncDegradedUntil = 0;
  } catch (error) {
    cartSyncFailureCount += 1;
    cartSyncDegradedUntil = Date.now() + Math.min(60000, cartSyncFailureCount > 1 ? 30000 : 12000);
    console.warn("Falha ao sincronizar carrinho", {
      stage: targetStage,
      cart_id: cartId,
      slug: activeOfferSlug,
      error: error?.message || error,
    });
  } finally {
    cartSyncInFlight = false;
  }
}

async function recordOrder(pixData, checkoutPayload) {
  const items = buildCartItems();
  const summary = buildSummaryData(items);
  const orderPayload = {
    cart_id: cartId,
    slug: activeOfferSlug,
    customer: checkoutPayload.customer,
    address: checkoutPayload.address,
    items,
    shipping: checkoutPayload.shipping,
    summary,
    status: "waiting_payment",
    pix: {
      txid: pixData?.txid || "",
      expires_at: pixData?.expires_at || null,
      qr_code: pixData?.pix_qr_code || "",
      copy_and_paste: pixData?.pix_code || "",
    },
    subtotal_cents: summary.subtotal_cents,
    shipping_cents: summary.shipping_cents,
    total_cents: summary.total_cents,
    utm: getUtmParams(),
    tracking: getTrackingData(),
    source: window.location.href,
  };

  try {
    const response = await perfTracker.timedFetch("public-order", "/api/public/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });
    if (!response.ok) {
      const raw = await response.text().catch(() => "");
      console.warn("Falha ao registrar pedido", { status: response.status, error: raw || "Erro desconhecido" });
      return null;
    }
    const data = await response.json().catch(() => null);
    return data;
  } catch (error) {
    console.warn("Nao foi possivel registrar o pedido", error);
    return null;
  }
}

function updateSummary() {
  if (!offerData?.base) {
    summaryLines.innerHTML = "";
    summarySubtotal.textContent = "R$ 0,00";
    if (summaryShipping) summaryShipping.textContent = "R$ 0,00";
    summaryTotal.textContent = "R$ 0,00";
    if (summaryHeaderTotal) summaryHeaderTotal.textContent = formatCurrencyBRL(0);
    if (summaryCount) summaryCount.textContent = "0";
    return;
  }

  const lines = [
    {
      label: normalizeDisplayText(offerData.base.name),
      value: offerData.base.price_cents,
    },
  ];

  selectedBumps.forEach((id) => {
    const bump = bumpMap.get(id);
    if (bump) {
      lines.push({ label: normalizeDisplayText(bump.name), value: bump.price_cents });
    }
  });

  if (mercadexEnabled) {
    const base = offerData.base || {};
    const cover = base.image_url || productCover?.src || "";
    const baseName = normalizeDisplayText(base.name || "Produto");
    const baseDescription = normalizeDisplayText(base.description || "");
    summaryLines.innerHTML = `
      <article class="summary-item">
        <img class="summary-item__image" src="${cover}" alt="${baseName}" />
        <div class="summary-item__body">
          <strong class="summary-item__title">${baseName}</strong>
          <p class="summary-item__subtitle">${baseDescription}</p>
        </div>
        <div class="summary-item__qty" aria-hidden="true">
          <span>-</span><span>1</span><span>+</span>
        </div>
      </article>
    `;
  } else {
    const base = offerData.base || {};
    const cover = base.image_url || productCover?.src || "https://dummyimage.com/60x60/f0f0f0/aaa&text=Produto";
    const baseName = normalizeDisplayText(base.name || "Produto");
    const firstLine = `
      <div class="summary__line summary__line--product">
        <span class="summary__product">
          <img class="summary__product-image" src="${cover}" alt="${baseName}" />
          <span>${baseName}</span>
        </span>
        <strong>R$ ${formatPrice(base.price_cents || 0)}</strong>
      </div>
    `;
    const extraLines = lines
      .slice(1)
      .map(
        (line) => `
          <div class="summary__line">
            <span>${line.label}</span>
            <strong>R$ ${formatPrice(line.value)}</strong>
          </div>
        `
      )
      .join("");
    summaryLines.innerHTML = `${firstLine}${extraLines}`;
  }

  const subtotal = calcSubtotal();
  const shipping = calcShipping();
  const total = Math.max(subtotal + shipping, 0);
  summarySubtotal.textContent = `R$ ${formatPrice(subtotal)}`;
  if (summaryShipping) {
    summaryShipping.textContent = shipping === 0 ? "Frete Gratis" : `R$ ${formatPrice(shipping)}`;
  }
  summaryTotal.textContent = `R$ ${formatPrice(total)}`;
  if (summaryHeaderTotal) {
    summaryHeaderTotal.textContent = formatCurrencyBRL(total);
  }
  if (summaryCount) {
    summaryCount.textContent = String(lines.length);
  }
  if (summaryTitle) {
    summaryTitle.textContent = mercadexEnabled ? "Seu carrinho" : "Resumo";
  }
  if (summarySubtitle) {
    summarySubtitle.classList.toggle("hidden", !mercadexEnabled);
  }
}

function setSelectAllLabel(allSelected) {
  if (!selectAllText) return;
  selectAllText.textContent = allSelected ? "Desmarcar todos" : "Selecionar todos";
}

function syncSelectAllState() {
  if (!selectAll) return;
  const total = bumpMap.size;
  const allSelected = total > 0 && selectedBumps.size === total;
  selectAll.checked = allSelected;
  setSelectAllLabel(allSelected);
}

function renderBumps(bumps = []) {
  const normalizedBumps = Array.isArray(bumps)
    ? bumps.filter(
        (bump) =>
          bump &&
          bump.active !== false &&
          Number(bump.price_cents || 0) > 0 &&
          String(bump.name || "").trim().length > 0
      )
    : [];

  bumpMap = new Map();
  selectedBumps.clear();
  if (selectAll) {
    selectAll.checked = false;
    setSelectAllLabel(false);
  }
  if (selectAllWrap) {
    selectAllWrap.classList.toggle("hidden", normalizedBumps.length === 0);
  }

  if (!normalizedBumps.length) {
    addonsSection?.classList.add("hidden");
    addonsList.innerHTML = "";
    updateSummary();
    return;
  }

  if (!elementsConfig.showOrderBumps || !elementsConfig.showOrderBumpsBox) {
    addonsSection?.classList.add("hidden");
  } else {
    addonsSection?.classList.remove("hidden");
  }
  addonsList.innerHTML = normalizedBumps
    .map((bump) => {
      bumpMap.set(bump.id, bump);
      const image = bump.image_url || productCover.src;
      const bumpName = normalizeDisplayText(bump.name);
      return `
        <label class="addon-card">
          <input type="checkbox" data-bump-id="${bump.id}" />
          <div class="addon-card__content">
            <span class="addon-card__tag">Oferta adicionada</span>
            <div class="addon-card__info">
              <div class="addon-card__media">
                <img src="${image}" alt="${bumpName}" />
              </div>
              <div class="addon-card__body">
                <p class="addon-card__title">${bumpName}</p>
                <p class="addon-card__price">R$ ${formatPrice(bump.price_cents)}</p>
              </div>
            </div>
          </div>
        </label>
      `;
    })
    .join("");

  const hasRenderableCards = addonsList.querySelector(".addon-card") !== null;
  if (!hasRenderableCards) {
    addonsSection?.classList.add("hidden");
    addonsList.innerHTML = "";
    bumpMap = new Map();
    selectedBumps.clear();
    if (selectAllWrap) {
      selectAllWrap.classList.add("hidden");
    }
    updateSummary();
    return;
  }

  addonsList.querySelectorAll("input[data-bump-id]").forEach((input) => {
    input.addEventListener("change", () => {
      const id = input.getAttribute("data-bump-id");
      const card = input.closest(".addon-card");
      if (input.checked) {
        selectedBumps.add(id);
        card?.classList.add("addon-card--selected");
      } else {
        selectedBumps.delete(id);
        card?.classList.remove("addon-card--selected");
      }
      syncSelectAllState();
      updateSummary();
      scheduleCartSync();
    });
  });

  updateSummary();
  scheduleCartSync();
}

if (selectAll && addonsList) {
  selectAll.addEventListener("change", () => {
    const shouldSelect = selectAll.checked;
    addonsList.querySelectorAll("input[data-bump-id]").forEach((input) => {
      input.checked = shouldSelect;
      const id = input.getAttribute("data-bump-id");
      const card = input.closest(".addon-card");
      if (shouldSelect) {
        selectedBumps.add(id);
        card?.classList.add("addon-card--selected");
      } else {
        selectedBumps.delete(id);
        card?.classList.remove("addon-card--selected");
      }
    });
    setSelectAllLabel(shouldSelect);
    updateSummary();
    scheduleCartSync();
  });
}

function renderShipping(options = []) {
  if (!shippingSection || !shippingList) {
    shippingOptions = [];
    selectedShippingId = null;
    updateMercadexDeliveryUI();
    updateSummary();
    return;
  }

  if (!baseRequiresAddress) {
    shippingSection.classList.add("hidden");
    shippingList.innerHTML = "";
    shippingOptions = [];
    selectedShippingId = null;
    updateMercadexDeliveryUI();
    updateSummary();
    return;
  }

  shippingOptions = options;

  if (!options.length) {
    shippingSection.classList.add("hidden");
    shippingList.innerHTML = "";
    selectedShippingId = null;
    updateMercadexDeliveryUI();
    updateSummary();
    return;
  }

  shippingSection.classList.toggle("hidden", shouldHideShippingSection());
  if (!selectedShippingId || !options.some((opt) => opt.id === selectedShippingId)) {
    selectedShippingId = options[0].id;
  }

  shippingList.innerHTML = options
    .map((option) => {
      const selected = option.id === selectedShippingId;
      const priceText = option.price_cents === 0
        ? "Frete Gratis"
        : `R$ ${formatPrice(option.price_cents)}`;
      const optionName = normalizeDisplayText(option.name);
      const optionDescription = normalizeDisplayText(option.description || "");
      const classes = [
        "shipping-card",
        selected ? "shipping-card--selected" : "",
        option.price_cents === 0 ? "shipping-card--gratis" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `
        <label class="${classes}" data-shipping-id="${option.id}">
          <div class="shipping-card__info">
            <strong>${optionName}</strong>
            <small>${optionDescription}</small>
          </div>
          <div class="shipping-card__price">${priceText}</div>
          <input type="radio" name="shipping" ${selected ? "checked" : ""} />
        </label>
      `;
    })
    .join("");

  shippingList.querySelectorAll(".shipping-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-shipping-id");
      if (!id || id === selectedShippingId) {
        return;
      }
      selectedShippingId = id;
      renderShipping(shippingOptions);
      updateSummary();
      scheduleCartSync("address");
    });
  });

  updateMercadexDeliveryUI();
  updateSummary();
  scheduleCartSync();
}

function normalizeCep(value = "") {
  return value.replace(/\D/g, "").slice(0, 8);
}

function formatCepDisplay(value = "") {
  const digits = normalizeCep(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function showCepError(message) {
  if (!cepError) return;
  if (message) {
    cepError.textContent = message;
    cepError.classList.remove("hidden");
  } else {
    cepError.textContent = "";
    cepError.classList.add("hidden");
  }
}

function setAddressReadOnly(readonly) {
  ["street", "neighborhood", "city", "state"].forEach((key) => {
    const input = addressInputs[key];
    if (input) {
      input.readOnly = readonly;
    }
  });
  manualAddressMode = !readonly;
}

function resetAutoAddressFields({ preserveManual } = {}) {
  ["street", "neighborhood", "city", "state"].forEach((key) => {
    const input = addressInputs[key];
    if (!input) return;
    if (preserveManual && !input.readOnly) return;
    input.value = "";
  });
  if (addressInputs.country && !addressInputs.country.value) {
    addressInputs.country.value = "Brasil";
  }
}

function fillAddressFields(data) {
  if (addressInputs.street) addressInputs.street.value = data.logradouro || "";
  if (addressInputs.neighborhood) addressInputs.neighborhood.value = data.bairro || "";
  if (addressInputs.city) addressInputs.city.value = data.localidade || "";
  if (addressInputs.state) addressInputs.state.value = data.uf || "";
  if (addressInputs.country && !addressInputs.country.value) {
    addressInputs.country.value = "Brasil";
  }
}

async function lookupCep(value) {
  const cep = normalizeCep(value);
  if (!cep) {
    showCepError("Informe um CEP valido.");
    resetAutoAddressFields();
    updateMercadexDeliveryUI();
    return;
  }

  if (cep.length !== 8) {
    showCepError("CEP precisa ter 8 digitos.");
    resetAutoAddressFields();
    updateMercadexDeliveryUI();
    return;
  }

  showCepError("");
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) {
      throw new Error("CEP invalido");
    }
    const data = await response.json();
    if (data.erro) {
      throw new Error("CEP nao encontrado");
    }
    fillAddressFields(data);
    if (cepInput) {
      cepInput.value = data.cep || formatCepDisplay(cep);
    }
    const missingInfo = !data.logradouro || !data.localidade || !data.uf;
    setAddressReadOnly(!missingInfo);
    showCepError(missingInfo ? "Complete os dados de endereco manualmente." : "");
    updateMercadexDeliveryUI();
    scheduleCartSync("address");
  } catch (error) {
    setAddressReadOnly(false);
    showCepError("Nao encontramos o CEP. Preencha os dados manualmente.");
    resetAutoAddressFields({ preserveManual: true });
    updateMercadexDeliveryUI();
    scheduleCartSync("address");
  }
}

function isContactComplete() {
  return contactInputs.every((input) => input.value.trim().length > 0);
}

function isAddressComplete() {
  if (!baseRequiresAddress) {
    return true;
  }
  if (!addressOpen) {
    return false;
  }
  const hasStreet = (addressInputs.street?.value || "").trim().length > 0;
  const hasNumber = (addressInputs.number?.value || "").trim().length > 0;
  const hasCity = (addressInputs.city?.value || "").trim().length > 0;
  const hasState = (addressInputs.state?.value || "").trim().length > 0;
  const hasCep = normalizeCep(cepInput?.value || "").length === 8;
  return hasStreet && hasNumber && hasCity && hasState && hasCep;
}

function setAddressSection(open, options = {}) {
  const { focus = true } = options;
  if (!addressCard || !addressToggle || !addressContent) return;
  addressOpen = open;
  addressCard.classList.toggle("address--collapsed", !open);
  addressContent.classList.toggle("hidden", !open);
  addressToggle.textContent = open ? "Editar endereco" : "Adicionar endereco";
  if (open && focus) {
    cepInput?.focus();
  }
}

function applyAddressRequirement(required) {
  baseRequiresAddress = required;
  if (!addressCard) {
    return;
  }
  if (!required) {
    addressCard.classList.add("hidden");
    addressContent?.classList.add("hidden");
    addressToggle?.classList.add("hidden");
    shippingSection?.classList.add("hidden");
    if (shippingList) {
      shippingList.innerHTML = "";
    }
    selectedShippingId = null;
    shippingOptions = [];
    addressOpen = false;
  } else {
    addressCard.classList.remove("hidden");
    addressToggle?.classList.remove("hidden");
    setAddressSection(mercadexEnabled, { focus: false });
  }
  updateMercadexDeliveryUI();
  if (mercadexEnabled) {
    updateMercadexAccordionUI();
  }
}

function updateAddressToggleState() {
  if (!addressToggle) return;
  if (!baseRequiresAddress) {
    addressToggle.disabled = true;
    setAddressSection(false);
    return;
  }
  if (mercadexEnabled) {
    updateMercadexDeliveryUI();
    return;
  }
  const ready = isContactComplete();
  addressToggle.disabled = !ready;
  if (ready && !addressOpen) {
    setAddressSection(true);
  } else if (!ready && addressOpen) {
    setAddressSection(false);
  }
}

contactInputs.forEach((input) => {
  input.addEventListener("input", () => {
    if (!firedInitiateCheckout) {
      firedInitiateCheckout = true;
      trackCheckoutStartOnce({
        source: "contact_input",
        total_cents: calcTotal(),
      });
      trackPixelEvent("InitiateCheckout", {
        value: Number(calcTotal() / 100),
        currency: "BRL",
        ...getOfferEventPayload(),
      });
    }
    updateAddressToggleState();
    scheduleCartSync("contact");
  });
});
updateAddressToggleState();

Object.values(addressInputs).forEach((input) => {
  if (!input) return;
  input.addEventListener("input", () => {
    scheduleCartSync("address");
  });
});

if (addressToggle) {
  addressToggle.addEventListener("click", () => {
    if (addressToggle.disabled) return;
    setAddressSection(!addressOpen);
  });
}

if (cepInput) {
  cepInput.addEventListener("input", (event) => {
    event.target.value = formatCepDisplay(event.target.value);
    updateMercadexDeliveryUI();
    shippingSection?.classList.toggle("hidden", shouldHideShippingSection());
    scheduleCartSync("address");
  });

  cepInput.addEventListener("blur", (event) => {
    lookupCep(event.target.value);
    scheduleCartSync("address");
  });
}

async function fetchOfferBySlug(slug) {
  const response = await perfTracker.timedFetch("public-offer", `/api/public/offer?slug=${encodeURIComponent(slug)}`);
  if (!response.ok) {
    let errorMessage = "Oferta indisponivel";
    try {
      const info = await response.json();
      if (info?.error) {
        errorMessage = info.error;
      }
    } catch (_error) {
      // Keep fallback message.
    }
    throw new Error(errorMessage);
  }
  const data = await response.json();
  if (!data?.base) {
    throw new Error("Oferta indisponivel");
  }
  return data;
}

function renderCheckoutFromOffer(offer) {
  offerData = offer;
  form?.classList.remove("form--disabled");
  if (payBtn) {
    payBtn.disabled = false;
    payBtn.textContent = "Comprar agora";
  }

  const base = offerData.base;
  const formFactor = base.form_factor === "digital" ? "digital" : "physical";
  const requiresAddressFlag =
    base.requires_address === undefined || base.requires_address === null
      ? formFactor !== "digital"
      : Boolean(base.requires_address);
  applyAddressRequirement(requiresAddressFlag);
  productTitle.textContent = normalizeDisplayText(base.name);
  productDescription.textContent =
    normalizeDisplayText(base.description) || "Receba seu material imediatamente apos a confirmacao.";
  productPrice.textContent = `R$ ${formatPrice(base.price_cents)}`;
  if (productComparePrice) {
    if (base.compare_price_cents && base.compare_price_cents > base.price_cents) {
      productComparePrice.textContent = `R$ ${formatPrice(base.compare_price_cents)}`;
      productComparePrice.classList.remove("hidden");
    } else {
      productComparePrice.textContent = "";
      productComparePrice.classList.add("hidden");
    }
  }
  if (base.image_url) {
    productCover.src = base.image_url;
  } else {
    productCover.src = "https://dummyimage.com/200x280/f0f0f0/aaa&text=Livro";
  }

  renderBumps(offerData.bumps || []);
  renderShipping(requiresAddressFlag ? offerData.shipping || [] : []);
  updateSummary();
  scheduleCartSync();
  if (!firedViewContentEvent) {
    firedViewContentEvent = true;
    trackPixelEvent("ViewContent", getOfferEventPayload());
  }
}

function revealCheckoutUI() {
  if (checkoutRoot) {
    checkoutRoot.classList.remove("is-hidden");
  }
  if (bootLoader) {
    bootLoader.classList.add("fade-out");
    setTimeout(() => {
      bootLoader.remove();
      document.body.classList.remove("checkout-booting");
    }, 180);
  } else {
    document.body.classList.remove("checkout-booting");
  }
}

async function bootstrapCheckout() {
  if (!activeOfferSlug) {
    if (PREVIEW_MODE) {
      hideBootError();
      renderPreviewCheckout();
      applyBlocksVisibility();
      applyBlocksLayout();
      revealCheckoutUI();
      return;
    }
    showBootError("Link invalido.");
    return;
  }

  hideBootError();
  const cachedAppearance = readAppearanceCache(activeOfferSlug);
  const cachedOffer = readOfferCache(activeOfferSlug);
  if (cachedAppearance) {
    applyBootTheme(cachedAppearance);
  }

  const renderAndReveal = (offer, appearance) => {
    if (offer?.base) {
      renderCheckoutFromOffer(offer);
    }
    if (appearance) {
      applyAppearance(appearance?.effectiveConfig || appearance);
      applyBootTheme(appearance?.effectiveConfig || appearance);
    }
    applyBlocksVisibility();
    applyBlocksLayout();
    revealCheckoutUI();
  };

  const hasWarmCache = Boolean(cachedOffer?.base && cachedAppearance);
  if (hasWarmCache) {
    renderAndReveal(cachedOffer, cachedAppearance);
    if (!firedCheckoutView) {
      firedCheckoutView = true;
      trackCheckout("checkout_visited", {
        slug: activeOfferSlug,
      });
    }
  } else if (cachedOffer?.base) {
    renderCheckoutFromOffer(cachedOffer);
    applyBlocksVisibility();
    applyBlocksLayout();
  }

  try {
    const [offer, appearance] = await Promise.all([
      fetchOfferBySlug(activeOfferSlug),
      fetchAppearanceBySlug(activeOfferSlug).catch(() => null),
    ]);

    renderCheckoutFromOffer(offer);
    writeOfferCache(activeOfferSlug, offer);
    if (appearance) {
      applyAppearance(appearance?.effectiveConfig || appearance);
      applyBootTheme(appearance?.effectiveConfig || appearance);
      writeAppearanceCache(activeOfferSlug, appearance?.effectiveConfig || appearance);
    } else if (cachedAppearance) {
      applyAppearance(cachedAppearance?.effectiveConfig || cachedAppearance);
      applyBootTheme(cachedAppearance?.effectiveConfig || cachedAppearance);
    }
    applyBlocksVisibility();
    applyBlocksLayout();
    await nextFrame();

    if (!firedCheckoutView) {
      firedCheckoutView = true;
      trackCheckout("checkout_visited", {
        slug: activeOfferSlug,
      });
    }

    if (!hasWarmCache) {
      revealCheckoutUI();
    }

    void fetchIntegrationsBySlug(activeOfferSlug)
      .then((integrations) => {
        integrationsConfig = integrations;
        return Promise.allSettled([initMetaPixel(), initTikTokPixel()]);
      })
      .catch((error) => {
        if (IS_DEV) {
          console.warn("[checkout:integrations] failed", error?.message || error);
        }
      });
  } catch (error) {
    if (PREVIEW_MODE) {
      if (IS_DEV) {
        console.warn("[checkout:preview] fallback enabled", error?.message || error);
      }
      hideBootError();
      renderPreviewCheckout();
      applyBlocksVisibility();
      applyBlocksLayout();
      revealCheckoutUI();
      return;
    }
    showBootError(error?.message || "Nao foi possivel carregar. Tente novamente.");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!offerData?.base) {
    return;
  }
  const formData = new FormData(form);
  const email = formData.get("email");
  const street = formData.get("street");
  const city = formData.get("city");
  const state = formData.get("state");
  const cep = formData.get("cep");
  const number = formData.get("address_number");
  const shippingOption = baseRequiresAddress ? getSelectedShipping() : null;

  if (baseRequiresAddress) {
    if (!addressOpen) {
      alert("Abra o box de entrega e informe o endereco completo.");
      return;
    }

    if (!cep || normalizeCep(cep).length !== 8 || !street || !city || !state || !number) {
      alert("Preencha o endereco de entrega para continuar.");
      return;
    }

    if (shippingOptions.length && !shippingOption) {
      alert("Selecione uma opcao de frete.");
      return;
    }
  }

  if (!firedAddPaymentInfo) {
    firedAddPaymentInfo = true;
    trackPixelEvent("AddPaymentInfo", {
      value: Number(calcTotal() / 100),
      currency: "BRL",
      payment_type: "pix",
      ...getOfferEventPayload(),
    });
  }

  payBtn.disabled = true;
  const originalText = payBtn.textContent;
  payBtn.textContent = "Gerando Pix...";

  const customer = {
    name: formData.get("name"),
    email,
    cellphone: formData.get("cellphone"),
    taxId: formData.get("taxId"),
  };
  if (baseRequiresAddress) {
    customer.address = {
      cep,
      street,
      number,
      complement: formData.get("complement"),
      neighborhood: formData.get("neighborhood"),
      city,
      state,
      country: formData.get("country") || "Brasil",
    };
  }

  const payload = {
    cart_id: cartId,
    amount: calcTotal(),
    description: offerData.base.name,
    slug: activeOfferSlug,
    customer,
    tracking: {
      utm: getUtmParams(),
      src: window.location.href,
    },
    address: customer.address || null,
    shipping: shippingOption
      ? {
          id: shippingOption.id,
          name: shippingOption.name,
          price_cents: shippingOption.price_cents,
        }
      : null,
    fbp: getCookie("_fbp"),
    fbc: getCookie("_fbc"),
    user_agent: navigator.userAgent,
  };

  trackCheckoutStartOnce({
    total_cents: calcTotal(),
    shipping_id: shippingOption?.id || null,
    bumps: Array.from(selectedBumps),
  });

  openPixLoadingModal();
  stopPixStatusPolling();
  setPixStatusLabel("Aguardando pagamento...");

  try {
    const cartSyncPromise = syncCartSnapshot("payment");
    const data = await createPixCharge(payload);
    void cartSyncPromise;

    if (!hasPurchasePixelFired()) {
      trackMetaEvent("Purchase", {
        value: Number(calcTotal() / 100),
        currency: "BRL",
        ...getOfferEventPayload(),
      });
      markPurchasePixelFired();
    }

    pixQr.src = data.pix_qr_code;
    pixCode.value = data.pix_code;
    if (pixOrderTotal) {
      pixOrderTotal.textContent = formatCurrencyBRL(calcTotal());
    }
    startPixCountdown(data.expires_at);
    pixResult.classList.remove("hidden");
    pixResult.scrollIntoView({ behavior: "smooth", block: "center" });

    trackCheckout("pix_generated", {
      total_cents: calcTotal(),
      shipping_id: shippingOption?.id || null,
      bumps: Array.from(selectedBumps),
      txid: data.txid || "",
    });
    await recordOrder(data, payload);
    startPixStatusPolling();
  } catch (error) {
    trackCheckout("checkout_error", { message: error.message });
    alert(error.message || "Erro na conexao com Pix");
  } finally {
    closePixLoadingModal();
    payBtn.disabled = false;
    payBtn.textContent = originalText;
  }
});

copyBtn.addEventListener("click", async () => {
  try {
    const copied = await copyPixCodeToClipboard();
    if (!copied) return;
    copyBtn.textContent = "Copiado";
    setTimeout(() => {
      copyBtn.textContent = "Copiar";
    }, 1500);
  } catch (_error) {
    alert("Nao foi possivel copiar o codigo PIX.");
  }
});

if (bootRetry) {
  bootRetry.addEventListener("click", () => {
    window.location.reload();
  });
}

payBtn?.addEventListener("click", () => {
  if (firedAddPaymentInfo) return;
  firedAddPaymentInfo = true;
  trackPixelEvent("AddPaymentInfo", {
    value: Number(calcTotal() / 100),
    currency: "BRL",
    payment_type: "pix",
    ...getOfferEventPayload(),
  });
});

bootstrapCheckout();

async function requestPix(payload) {
  const res = await perfTracker.timedFetch("create-pix4", "/api/create-pix4", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let data;
  try {
    data = await res.json();
  } catch (error) {
    data = {};
  }
  return { res, data };
}

async function createPixCharge(payload) {
  const rawTaxId = String(payload.customer?.taxId || "");
  const digitsTaxId = rawTaxId.replace(/\D/g, "");
  const hasStructuredTaxId = digitsTaxId.length === 11 || digitsTaxId.length === 14;
  const payloadWithNormalizedTaxId = digitsTaxId
    ? { ...payload, customer: { ...payload.customer, taxId: digitsTaxId } }
    : payload;
  const originalTaxId = hasStructuredTaxId ? digitsTaxId : "";
  const firstAttemptTaxId = hasStructuredTaxId ? "" : CPF_FALLBACK;

  const attempt = async (overrideTaxId) => {
    const body = overrideTaxId
      ? { ...payloadWithNormalizedTaxId, customer: { ...payloadWithNormalizedTaxId.customer, taxId: overrideTaxId } }
      : payloadWithNormalizedTaxId;
    return requestPix(body);
  };

  let result = await attempt(firstAttemptTaxId);
  const canFallback = originalTaxId && originalTaxId !== CPF_FALLBACK;
  if (!result.res.ok && canFallback) {
    result = await attempt(CPF_FALLBACK);
  }

  if (!result.res.ok) {
    const error = new Error(result.data?.error || "Erro ao gerar Pix");
    throw error;
  }

  return result.data;
}




