const token = localStorage.getItem("admin_token") || "";

if (!token) {
  window.location.href = "/admin/";
}

const state = {
  themes: [],
  themesByKey: new Map(),
  theme_key: "solarys",
  savedThemeKey: "solarys",
  overridesDraft: {},
  savedOverrides: {},
  effectiveDraft: {},
  isDirty: false,
  previewSlug: "",
  activeSection: "modelos",
};

const sectionMeta = {
  modelos: {
    title: "Modelos",
    subtitle: "Escolha o modelo visual base do seu checkout",
  },
  aparencia: {
    title: "Aparencia",
    subtitle: "Configure cores, tipografia e composicao visual",
  },
  conversao: {
    title: "Conversao",
    subtitle: "Ajustes de conversao do checkout",
  },
  pagamentos: {
    title: "Pagamentos",
    subtitle: "Ajustes de metodos e exibicao de pagamentos",
  },
  layout: {
    title: "Layout",
    subtitle: "Estrutura e distribuicao da pagina",
  },
  elementos: {
    title: "Elementos",
    subtitle: "Controle de blocos e componentes",
  },
  efeitos: {
    title: "Efeitos e Animacoes",
    subtitle: "Configure animacoes e efeitos visuais do seu checkout",
  },
  configuracoes: {
    title: "Configuracoes",
    subtitle: "Campos e preferencias gerais",
  },
};

const DEFAULT_ELEMENTS_ORDER = [
  "header",
  "country",
  "offer",
  "form",
  "bumps",
  "shipping",
  "payment",
  "footer",
];
const MAX_LOGO_UPLOAD_BYTES = 4 * 1024 * 1024;

const ELEMENT_LABELS = {
  header: "Cabecalho",
  country: "Pais",
  offer: "Oferta",
  form: "Formulario",
  bumps: "Order Bumps",
  shipping: "Frete",
  payment: "Pagamento",
  footer: "Rodape",
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepMerge(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? override.slice() : base.slice();
  }

  const baseIsObject = base && typeof base === "object";
  const overrideIsObject = override && typeof override === "object";

  if (!baseIsObject) {
    if (Array.isArray(override)) return override.slice();
    if (overrideIsObject) return { ...override };
    return override !== undefined ? override : base;
  }

  const result = { ...base };
  if (!overrideIsObject || Array.isArray(override)) {
    return result;
  }

  Object.keys(override).forEach((key) => {
    const nextOverride = override[key];
    const nextBase = result[key];
    if (
      nextOverride &&
      typeof nextOverride === "object" &&
      !Array.isArray(nextOverride) &&
      nextBase &&
      typeof nextBase === "object" &&
      !Array.isArray(nextBase)
    ) {
      result[key] = deepMerge(nextBase, nextOverride);
      return;
    }
    result[key] = Array.isArray(nextOverride) ? nextOverride.slice() : nextOverride;
  });

  return result;
}

function isEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function getPath(obj, path) {
  return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function setPath(obj, path, value) {
  let ref = obj;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    if (!ref[key] || typeof ref[key] !== "object" || Array.isArray(ref[key])) {
      ref[key] = {};
    }
    ref = ref[key];
  }
  ref[path[path.length - 1]] = value;
}

function deletePath(obj, path) {
  let ref = obj;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    if (!ref[key] || typeof ref[key] !== "object") {
      return;
    }
    ref = ref[key];
  }
  delete ref[path[path.length - 1]];
}

function cleanupObject(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return obj;
  }
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      cleanupObject(value);
      if (!Object.keys(value).length) {
        delete obj[key];
      }
    }
  });
  return obj;
}

function radiusTokenToValue(token) {
  if (token === "sm") return "8px";
  if (token === "md") return "12px";
  if (token === "lg") return "16px";
  if (token === "xl") return "24px";
  return "12px";
}

function valueToRadiusToken(value) {
  const map = {
    "8px": "sm",
    "10px": "sm",
    "12px": "md",
    "14px": "md",
    "16px": "lg",
    "18px": "lg",
    "20px": "xl",
    "24px": "xl",
    "999px": "xl",
  };
  return map[value] || "md";
}

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.href = "/admin/";
    throw new Error("Unauthorized");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Erro na requisicao");
  }
  return data;
}

function getCurrentThemeDefaults() {
  return state.themesByKey.get(state.theme_key)?.defaults || {};
}

function setOverride(path, value) {
  const defaults = getCurrentThemeDefaults();
  const defaultValue = getPath(defaults, path);
  if (isEqual(defaultValue, value)) {
    deletePath(state.overridesDraft, path);
    cleanupObject(state.overridesDraft);
  } else {
    setPath(state.overridesDraft, path, value);
  }
  recomputeDraft();
}

function recomputeDraft() {
  state.effectiveDraft = deepMerge(getCurrentThemeDefaults(), state.overridesDraft);
  state.isDirty =
    state.theme_key !== state.savedThemeKey ||
    !isEqual(state.overridesDraft, state.savedOverrides);
  renderDirtyState();
  pushPreview();
}

function renderDirtyState() {
  const badge = document.getElementById("dirty-badge");
  const publishBtn = document.getElementById("publish-btn");
  if (state.isDirty) {
    badge.textContent = "Alteracoes pendentes";
    badge.classList.add("is-dirty");
    publishBtn.disabled = false;
  } else {
    badge.textContent = "Sem alteracoes";
    badge.classList.remove("is-dirty");
    publishBtn.disabled = true;
  }
}

function pushPreview() {
  const iframe = document.getElementById("preview-iframe");
  if (!iframe?.contentWindow) {
    return;
  }

  iframe.contentWindow.postMessage(
    {
      type: "appearance:preview",
      configEffective: state.effectiveDraft,
    },
    "*"
  );
}

function setFieldValue(id, value, fallback = "") {
  const field = document.getElementById(id);
  if (!field) return;
  if (field.type === "checkbox") {
    field.checked = Boolean(value);
  } else {
    const fallbackValue = fallback ?? "";
    const nextValue =
      value === null ||
      value === undefined ||
      value === "null" ||
      value === "undefined"
        ? fallbackValue
        : value;
    field.value = nextValue;
  }
}

function getElementsOrder(config = state.effectiveDraft) {
  const order = config?.elements?.order;
  if (!Array.isArray(order) || !order.length) {
    return DEFAULT_ELEMENTS_ORDER.slice();
  }
  const known = order.filter((item) => DEFAULT_ELEMENTS_ORDER.includes(item));
  DEFAULT_ELEMENTS_ORDER.forEach((item) => {
    if (!known.includes(item)) {
      known.push(item);
    }
  });
  return known;
}

function renderElementsOrderList() {
  const list = document.getElementById("elements-order-list");
  if (!list) return;
  const order = getElementsOrder();
  list.innerHTML = order
    .map(
      (item, index) => `
        <li class="elements-order-item" data-order-item="${item}">
          <span class="elements-order-label">${ELEMENT_LABELS[item] || item}</span>
          <div class="elements-order-actions">
            <button class="order-btn" type="button" data-order-move="up" data-order-index="${index}" aria-label="Mover para cima">↑</button>
            <button class="order-btn" type="button" data-order-move="down" data-order-index="${index}" aria-label="Mover para baixo">↓</button>
          </div>
        </li>
      `
    )
    .join("");

  list.querySelectorAll("button[data-order-move]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.getAttribute("data-order-index"));
      const direction = btn.getAttribute("data-order-move");
      const nextOrder = getElementsOrder();
      if (direction === "up" && index > 0) {
        [nextOrder[index - 1], nextOrder[index]] = [nextOrder[index], nextOrder[index - 1]];
      } else if (direction === "down" && index < nextOrder.length - 1) {
        [nextOrder[index + 1], nextOrder[index]] = [nextOrder[index], nextOrder[index + 1]];
      } else {
        return;
      }
      setOverride(["elements", "order"], nextOrder);
      renderElementsOrderList();
    });
  });
}

function bindAppearanceFields() {
  const colorBindings = [
    ["color-primary", ["palette", "primary"]],
    ["color-buttons", ["palette", "buttons"]],
    ["color-background", ["palette", "background"]],
    ["color-card", ["palette", "card"]],
    ["color-border", ["palette", "border"]],
    ["color-text", ["palette", "text"]],
    ["header-bg-color", ["header", "bgColor"]],
    ["header-text-color", ["header", "textColor"]],
    ["seal-text-color", ["securitySeal", "textColor"]],
    ["seal-bg-color", ["securitySeal", "bgColor"]],
    ["seal-icon-color", ["securitySeal", "iconColor"]],
  ];

  colorBindings.forEach(([id, path]) => {
    const field = document.getElementById(id);
    field?.addEventListener("input", () => setOverride(path, field.value));
  });

  const textBindings = [
    ["font-family", ["typography", "fontFamily"]],
    ["header-style", ["header", "style"]],
    ["header-logo-url", ["header", "logoUrl"]],
    ["header-logo-width", ["header", "logoWidthPx"], "number"],
    ["header-logo-height", ["header", "logoHeightPx"], "number"],
    ["seal-style", ["securitySeal", "style"]],
    ["seal-size", ["securitySeal", "size"]],
    ["seal-radius", ["securitySeal", "radius"]],
    ["seal-text", ["securitySeal", "text"]],
    ["effect-primary-animation", ["effects", "primaryButton", "animation"]],
    ["effect-primary-speed", ["effects", "primaryButton", "speed"]],
    ["effect-secondary-animation", ["effects", "secondaryButton", "animation"]],
    ["effect-secondary-speed", ["effects", "secondaryButton", "speed"]],
    ["setting-language", ["settings", "i18n", "language"]],
    ["setting-currency", ["settings", "i18n", "currency"]],
    ["layout-type", ["layout", "type"]],
  ];

  textBindings.forEach(([id, path, cast]) => {
    const field = document.getElementById(id);
    field?.addEventListener("change", () => {
      const raw = field.value;
      const value = cast === "number" ? Number(raw || 0) : raw;
      setOverride(path, value);
      if (id === "header-logo-url") {
        renderLogoPreview(value);
      }
    });
  });

  const checkBindings = [
    ["header-center-logo", ["header", "centerLogo"]],
    ["seal-enabled", ["securitySeal", "enabled"]],
    ["field-full-name", ["settings", "fields", "fullName"]],
    ["field-email", ["settings", "fields", "email"]],
    ["field-phone", ["settings", "fields", "phone"]],
    ["field-cpf", ["settings", "fields", "cpf"]],
  ];

  checkBindings.forEach(([id, path]) => {
    const field = document.getElementById(id);
    field?.addEventListener("change", () => setOverride(path, field.checked));
  });

  document.getElementById("radius-cards")?.addEventListener("change", (event) => {
    setOverride(["radius", "cards"], radiusTokenToValue(event.target.value));
  });
  document.getElementById("radius-buttons")?.addEventListener("change", (event) => {
    setOverride(["radius", "buttons"], radiusTokenToValue(event.target.value));
  });
  document.getElementById("radius-fields")?.addEventListener("change", (event) => {
    setOverride(["radius", "fields"], radiusTokenToValue(event.target.value));
  });
  document.getElementById("radius-steps")?.addEventListener("change", (event) => {
    setOverride(["radius", "steps"], event.target.value === "rounded" ? "999px" : "6px");
  });

  document.getElementById("add-custom-field")?.addEventListener("click", () => {
    alert("Campos personalizados serao implementados na proxima etapa.");
  });

  const elementChecks = [
    ["el-show-country", ["elements", "showCountrySelector"]],
    ["el-show-product-image", ["elements", "showProductImage"]],
    ["el-show-bumps", ["elements", "showOrderBumps"]],
    ["el-show-shipping", ["elements", "showShipping"]],
    ["el-show-footer-security", ["elements", "showFooterSecurityText"]],
  ];

  elementChecks.forEach(([id, path]) => {
    const field = document.getElementById(id);
    field?.addEventListener("change", () => setOverride(path, field.checked));
  });

  const uploadBtn = document.getElementById("header-logo-upload-btn");
  const fileInput = document.getElementById("header-logo-file");
  uploadBtn?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowed.includes(file.type.toLowerCase())) {
      alert("Formato invalido. Use PNG, JPG, JPEG ou WEBP.");
      fileInput.value = "";
      return;
    }
    if (file.size > MAX_LOGO_UPLOAD_BYTES) {
      alert("A imagem deve ter no maximo 4MB.");
      fileInput.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("logo", file);
    uploadBtn.disabled = true;
    uploadBtn.textContent = "Enviando...";
    try {
      const response = await fetch("/api/admin/upload?id=logo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (error) {
        data = {};
      }
      if (!response.ok || !data?.url) {
        throw new Error(data.error || raw || `Falha no upload do logo (HTTP ${response.status})`);
      }
      setFieldValue("header-logo-url", data.url, "");
      setOverride(["header", "logoUrl"], data.url);
      renderLogoPreview(data.url);
    } catch (error) {
      alert(error.message || "Falha no upload do logo.");
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Enviar logo";
      fileInput.value = "";
    }
  });
}

function populateFieldsFromEffective() {
  const cfg = state.effectiveDraft || {};

  setFieldValue("color-primary", cfg.palette?.primary, "#f5a623");
  setFieldValue("color-buttons", cfg.palette?.buttons, "#f39c12");
  setFieldValue("color-background", cfg.palette?.background, "#f4f6fb");
  setFieldValue("color-card", cfg.palette?.card, "#ffffff");
  setFieldValue("color-border", cfg.palette?.border, "#dde3ee");
  setFieldValue("color-text", cfg.palette?.text, "#1c2431");
  setFieldValue("font-family", cfg.typography?.fontFamily, "Poppins");

  setFieldValue("radius-cards", valueToRadiusToken(cfg.radius?.cards || "12px"), "md");
  setFieldValue("radius-buttons", valueToRadiusToken(cfg.radius?.buttons || "12px"), "md");
  setFieldValue("radius-fields", valueToRadiusToken(cfg.radius?.fields || "12px"), "md");
  setFieldValue("radius-steps", cfg.radius?.steps === "999px" ? "rounded" : "square", "square");

  setFieldValue("header-style", cfg.header?.style, "logo");
  setFieldValue("header-center-logo", cfg.header?.centerLogo, false);
  setFieldValue("header-logo-url", cfg.header?.logoUrl, "");
  setFieldValue("header-logo-width", cfg.header?.logoWidthPx, 120);
  setFieldValue("header-logo-height", cfg.header?.logoHeightPx, 40);
  setFieldValue("header-bg-color", cfg.header?.bgColor, "#ffffff");
  setFieldValue("header-text-color", cfg.header?.textColor, "#0f5132");

  setFieldValue("seal-enabled", cfg.securitySeal?.enabled, true);
  setFieldValue("seal-style", cfg.securitySeal?.style, "padrao_bolinha_texto");
  setFieldValue("seal-size", cfg.securitySeal?.size, "medio");
  setFieldValue("seal-radius", cfg.securitySeal?.radius, "arredondado");
  setFieldValue("seal-text", cfg.securitySeal?.text, "Pagamento 100% seguro");
  setFieldValue("seal-text-color", cfg.securitySeal?.textColor, "#0f5132");
  setFieldValue("seal-bg-color", cfg.securitySeal?.bgColor, "#f5f7fb");
  setFieldValue("seal-icon-color", cfg.securitySeal?.iconColor, "#1d9f55");

  setFieldValue("effect-primary-animation", cfg.effects?.primaryButton?.animation, "none");
  setFieldValue("effect-primary-speed", cfg.effects?.primaryButton?.speed, "normal");
  setFieldValue("effect-secondary-animation", cfg.effects?.secondaryButton?.animation, "none");
  setFieldValue("effect-secondary-speed", cfg.effects?.secondaryButton?.speed, "normal");

  setFieldValue("field-full-name", cfg.settings?.fields?.fullName, true);
  setFieldValue("field-email", cfg.settings?.fields?.email, true);
  setFieldValue("field-phone", cfg.settings?.fields?.phone, true);
  setFieldValue("field-cpf", cfg.settings?.fields?.cpf, true);
  setFieldValue("setting-language", cfg.settings?.i18n?.language, "pt-BR");
  setFieldValue("setting-currency", cfg.settings?.i18n?.currency, "BRL");
  setFieldValue("layout-type", cfg.layout?.type, "singleColumn");
  setFieldValue("el-show-country", cfg.elements?.showCountrySelector, true);
  setFieldValue("el-show-product-image", cfg.elements?.showProductImage, true);
  setFieldValue("el-show-bumps", cfg.elements?.showOrderBumps, true);
  setFieldValue("el-show-shipping", cfg.elements?.showShipping, true);
  setFieldValue("el-show-footer-security", cfg.elements?.showFooterSecurityText, true);

  document.getElementById("current-theme-pill").textContent =
    state.themesByKey.get(state.theme_key)?.name || state.theme_key;
  renderLogoPreview(cfg.header?.logoUrl || "");
  renderElementsOrderList();
}

function renderLogoPreview(url) {
  const preview = document.getElementById("header-logo-preview");
  if (!preview) return;
  const cleanUrl = typeof url === "string" ? url.trim() : "";
  if (!cleanUrl) {
    preview.removeAttribute("src");
    preview.classList.add("hidden");
    return;
  }
  preview.src = cleanUrl;
  preview.classList.remove("hidden");
}

function renderThemeSelect() {
  const select = document.getElementById("theme-select");
  select.innerHTML = state.themes
    .map((theme) => `<option value="${theme.key}">${theme.name}</option>`)
    .join("");
  select.value = state.theme_key;

  const info = state.themesByKey.get(state.theme_key);
  document.getElementById("theme-description").textContent = info?.description || "";
}

function showSection(sectionKey) {
  state.activeSection = sectionKey;
  const meta = sectionMeta[sectionKey] || sectionMeta.modelos;
  document.getElementById("section-title").textContent = meta.title;
  document.getElementById("section-subtitle").textContent = meta.subtitle;

  document.querySelectorAll(".menu-item").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.section === sectionKey);
  });

  document.querySelectorAll(".builder-section").forEach((section) => {
    section.classList.toggle("hidden", section.dataset.section !== sectionKey);
  });
}

function bindNavigation() {
  document.querySelectorAll(".menu-item").forEach((btn) => {
    btn.addEventListener("click", () => showSection(btn.dataset.section));
  });

  document.getElementById("menu-search")?.addEventListener("input", (event) => {
    const term = (event.target.value || "").trim().toLowerCase();
    const menuButtons = Array.from(document.querySelectorAll(".menu-item"));

    menuButtons.forEach((btn) => {
      const section = document.querySelector(`.builder-section[data-section="${btn.dataset.section}"]`);
      const searchable = `${btn.textContent} ${section?.dataset.search || ""}`.toLowerCase();
      const visible = !term || searchable.includes(term);
      btn.classList.toggle("hidden", !visible);
    });

    const activeButtonVisible = menuButtons
      .find((b) => b.dataset.section === state.activeSection)
      ?.classList.contains("hidden") === false;

    if (!activeButtonVisible) {
      const firstVisible = menuButtons.find((btn) => !btn.classList.contains("hidden"));
      if (firstVisible) {
        showSection(firstVisible.dataset.section);
      }
    }
  });
}

function bindTopbar() {
  document.querySelectorAll(".device-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".device-btn").forEach((item) => item.classList.remove("is-active"));
      btn.classList.add("is-active");
      document.getElementById("preview-shell").dataset.device = btn.dataset.device;
    });
  });

  document.getElementById("publish-btn")?.addEventListener("click", async () => {
    try {
      await apiFetch("/api/admin/appearance", {
        method: "POST",
        body: JSON.stringify({
          theme_key: state.theme_key,
          overrides: state.overridesDraft,
        }),
      });

      state.savedThemeKey = state.theme_key;
      state.savedOverrides = deepClone(state.overridesDraft);
      recomputeDraft();
      populateFieldsFromEffective();
    } catch (error) {
      alert(error.message || "Nao foi possivel publicar");
    }
  });
}

function bindThemeActions() {
  const themeSelect = document.getElementById("theme-select");
  const applyBtn = document.getElementById("apply-theme-btn");

  themeSelect?.addEventListener("change", () => {
    const selected = state.themesByKey.get(themeSelect.value);
    document.getElementById("theme-description").textContent = selected?.description || "";
  });

  applyBtn?.addEventListener("click", () => {
    const nextTheme = themeSelect?.value || "solarys";
    state.theme_key = nextTheme;
    state.overridesDraft = {};
    recomputeDraft();
    populateFieldsFromEffective();
    renderThemeSelect();
  });
}

async function loadPaymentSettings() {
  const data = await apiFetch("/api/admin/payment-settings");
  const apiKeyHint = document.getElementById("payment-key-hint");
  const activeInput = document.getElementById("payment-active");
  if (activeInput) {
    activeInput.checked = data.is_active !== false;
  }
  if (apiKeyHint) {
    apiKeyHint.textContent = data.has_api_key
      ? "Chave cadastrada. Preencha novamente apenas se quiser substituir."
      : "Nenhuma chave cadastrada ainda.";
  }
}

function bindPaymentSettings() {
  const saveBtn = document.getElementById("save-payment-settings");
  const apiKeyInput = document.getElementById("payment-api-key");
  const activeInput = document.getElementById("payment-active");

  saveBtn?.addEventListener("click", async () => {
    try {
      await apiFetch("/api/admin/payment-settings", {
        method: "POST",
        body: JSON.stringify({
          api_key: apiKeyInput?.value?.trim() || "",
          is_active: activeInput?.checked !== false,
        }),
      });
      if (apiKeyInput) {
        apiKeyInput.value = "";
      }
      await loadPaymentSettings();
      alert("Credenciais de pagamento salvas com sucesso.");
    } catch (error) {
      alert(error.message || "Nao foi possivel salvar as credenciais.");
    }
  });
}

async function loadPreviewSlug() {
  const data = await apiFetch("/api/admin/items");
  const base = (data.items || []).find((item) => item.type === "base" && item.slug);
  state.previewSlug = base?.slug || "";

  const iframe = document.getElementById("preview-iframe");
  if (state.previewSlug) {
    iframe.src = `/checkout/${state.previewSlug}?preview=1&embed=1`;
  } else {
    iframe.src = "/checkout/index.html?preview=1&embed=1";
  }
}

async function loadInitialData() {
  const [themesData, appearanceData] = await Promise.all([
    apiFetch("/api/admin/themes"),
    apiFetch("/api/admin/appearance"),
    loadPreviewSlug(),
  ]);

  state.themes = themesData.themes || [];
  state.themesByKey = new Map(state.themes.map((theme) => [theme.key, theme]));

  state.theme_key = appearanceData.theme_key || "solarys";
  state.savedThemeKey = state.theme_key;
  state.overridesDraft = deepClone(appearanceData.overrides || {});
  state.savedOverrides = deepClone(appearanceData.overrides || {});

  recomputeDraft();
  renderThemeSelect();
  populateFieldsFromEffective();
}

function bindPreviewRefresh() {
  document.getElementById("preview-iframe")?.addEventListener("load", () => {
    pushPreview();
  });
}

(async function init() {
  bindNavigation();
  bindTopbar();
  bindThemeActions();
  bindPaymentSettings();
  bindAppearanceFields();
  bindPreviewRefresh();
  showSection("modelos");
  renderDirtyState();

  try {
    await loadInitialData();
    await loadPaymentSettings();
  } catch (error) {
    alert(error.message || "Erro ao carregar Builder");
  }
})();
