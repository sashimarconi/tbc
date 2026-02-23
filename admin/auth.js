const TOKEN_KEY = "admin_token";

function isValidEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function setFieldError(id, message = "") {
  const el = document.getElementById(`error-${id}`);
  if (el) {
    el.textContent = message;
  }
}

function clearErrors(scope) {
  scope.querySelectorAll(".field-error").forEach((el) => {
    el.textContent = "";
  });
  const globalErr = scope.querySelector(".global-error");
  if (globalErr) {
    globalErr.textContent = "";
  }
}

function setGlobalError(scope, message = "") {
  const globalErr = scope.querySelector(".global-error");
  if (globalErr) {
    globalErr.textContent = message;
  }
}

function getRedirectPath(user) {
  return user?.is_admin === true ? "/admin/dashboard.html" : "/dashboard";
}

async function authFetch(path, payload) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Falha na autenticacao");
  }
  return data;
}

async function bootstrapRedirectIfLoggedIn() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return;
  }
  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    const data = await res.json();
    if (data?.user?.is_admin === true) {
      window.location.href = getRedirectPath(data.user);
      return;
    }
    localStorage.removeItem(TOKEN_KEY);
  } catch (_error) {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function bindLogin() {
  const form = document.getElementById("login-form");
  if (!form) {
    return;
  }

  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const submitBtn = document.getElementById("login-submit");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(form);

    const email = (emailInput?.value || "").trim().toLowerCase();
    const password = passwordInput?.value || "";

    let invalid = false;
    if (!isValidEmail(email)) {
      setFieldError("login-email", "Informe um e-mail valido.");
      invalid = true;
    }
    if (!password) {
      setFieldError("login-password", "Informe sua senha.");
      invalid = true;
    }
    if (invalid) {
      return;
    }

    submitBtn.disabled = true;
    try {
      const data = await authFetch("/api/auth/login", { email, password });
      if (data?.user?.is_admin !== true) {
        localStorage.removeItem(TOKEN_KEY);
        setGlobalError(form, "Acesso restrito a administradores.");
        return;
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      window.location.href = getRedirectPath(data.user);
    } catch (error) {
      setGlobalError(form, error.message || "Nao foi possivel entrar.");
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function bindSignup() {
  const form = document.getElementById("signup-form");
  if (!form) {
    return;
  }

  const nameInput = document.getElementById("signup-name");
  const emailInput = document.getElementById("signup-email");
  const phoneInput = document.getElementById("signup-phone");
  const passwordInput = document.getElementById("signup-password");
  const confirmInput = document.getElementById("signup-password-confirm");
  const termsInput = document.getElementById("signup-terms");
  const submitBtn = document.getElementById("signup-submit");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(form);

    const name = (nameInput?.value || "").trim();
    const email = (emailInput?.value || "").trim().toLowerCase();
    const phone = (phoneInput?.value || "").trim();
    const password = passwordInput?.value || "";
    const confirm = confirmInput?.value || "";
    const agreed = Boolean(termsInput?.checked);

    let invalid = false;

    if (!name) {
      setFieldError("signup-name", "Informe seu nome completo.");
      invalid = true;
    }
    if (!isValidEmail(email)) {
      setFieldError("signup-email", "Informe um e-mail valido.");
      invalid = true;
    }
    if (!phone) {
      setFieldError("signup-phone", "Telefone e obrigatorio.");
      invalid = true;
    }
    if (password.length < 6) {
      setFieldError("signup-password", "A senha deve ter pelo menos 6 caracteres.");
      invalid = true;
    }
    if (password !== confirm) {
      setFieldError("signup-password-confirm", "As senhas nao conferem.");
      invalid = true;
    }
    if (!agreed) {
      setFieldError("signup-terms", "Voce precisa aceitar os termos para continuar.");
      invalid = true;
    }

    if (invalid) {
      return;
    }

    submitBtn.disabled = true;
    try {
      const data = await authFetch("/api/auth/signup", { name, email, phone, password });
      if (data?.user?.is_admin !== true) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = "/login";
        return;
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      window.location.href = getRedirectPath(data.user);
    } catch (error) {
      setGlobalError(form, error.message || "Nao foi possivel criar a conta.");
    } finally {
      submitBtn.disabled = false;
    }
  });
}

bootstrapRedirectIfLoggedIn();
bindLogin();
bindSignup();
