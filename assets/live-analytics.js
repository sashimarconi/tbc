(function () {
  const ENDPOINT = "/api/analytics/event";
  const SESSION_KEY = "live_analytics_session";
  const UTM_KEY = "live_analytics_utm";
  const HEARTBEAT_INTERVAL = 20000;
  const number = new Intl.NumberFormat("pt-BR");

  let heartbeatId = null;
  let cachedSessionId = null;

  function uuid() {
    if (crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 0xf) >> (char === "x" ? 0 : 2);
      const v = char === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function safeStorage(type) {
    try {
      return window[type];
    } catch (error) {
      return null;
    }
  }

  function getSessionId() {
    if (cachedSessionId) {
      return cachedSessionId;
    }
    const store = safeStorage("localStorage");
    cachedSessionId = store?.getItem(SESSION_KEY) || uuid();
    store?.setItem(SESSION_KEY, cachedSessionId);

    if (!store) {
      document.cookie = `${SESSION_KEY}=${cachedSessionId}; path=/; max-age=31536000`;
    }
    return cachedSessionId;
  }

  function extractUtm() {
    const params = new URLSearchParams(window.location.search);
    const utm = {};
    params.forEach((value, key) => {
      if (key.startsWith("utm_") && value) {
        utm[key] = value;
      }
    });
    return Object.keys(utm).length ? utm : null;
  }

  function getStoredUtm() {
    const store = safeStorage("sessionStorage");
    if (!store) return null;
    try {
      const raw = store.getItem(UTM_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function rememberUtm(data) {
    if (!data) return;
    const store = safeStorage("sessionStorage");
    if (!store) return;
    try {
      store.setItem(UTM_KEY, JSON.stringify(data));
    } catch (error) {
      // ignore storage quota errors
    }
  }

  function getUtm() {
    const stored = getStoredUtm();
    if (stored) {
      return stored;
    }
    const current = extractUtm();
    if (current) {
      rememberUtm(current);
    }
    return current;
  }

  function buildPayload(type, options = {}) {
    const metadata =
      (options.metadata && typeof options.metadata === "object" && !Array.isArray(options.metadata)
        ? options.metadata
        : null) || null;

    return {
      type,
      session_id: getSessionId(),
      page: options.page || document.body?.dataset.analyticsPage || window.location.pathname,
      metadata,
      utm: options.utm || getUtm(),
      source: options.source || document.referrer || "",
      href: window.location.href,
      referrer: document.referrer || "",
      user_agent: navigator.userAgent,
    };
  }

  function dispatch(type, options = {}) {
    const keepalive = Boolean(options.keepalive || type === "heartbeat");
    const payload = buildPayload(type, options);
    if (!payload.metadata) {
      delete payload.metadata;
    }
    const body = JSON.stringify(payload);

    if (keepalive && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(ENDPOINT, blob)) {
        return Promise.resolve(true);
      }
    }

    return fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive,
    }).catch(() => {});
  }

  function trackPage(pageName, metadata) {
    return dispatch("page_view", { page: pageName, metadata });
  }

  function sendEvent(type, options) {
    return dispatch(type, options);
  }

  function startHeartbeat() {
    if (heartbeatId) {
      clearInterval(heartbeatId);
    }

    const beat = () => {
      if (document.visibilityState === "hidden") {
        return;
      }
      dispatch("heartbeat", { keepalive: true });
    };

    beat();
    heartbeatId = setInterval(beat, HEARTBEAT_INTERVAL);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        beat();
      }
    });
  }

  const LiveAnalytics = {
    trackPage,
    sendEvent,
    startHeartbeat,
    getSessionId,
    format: (value) => number.format(value || 0),
  };

  window.LiveAnalytics = LiveAnalytics;

  document.addEventListener("DOMContentLoaded", () => {
    const pageName = document.body?.dataset.analyticsPage;
    if (pageName) {
      trackPage(pageName);
      startHeartbeat();
    }
  });
})();
