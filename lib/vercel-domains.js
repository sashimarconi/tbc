function getVercelConfig() {
  const token = String(process.env.VERCEL_API_TOKEN || "").trim();
  const project = String(process.env.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_NAME || "").trim();
  const teamId = String(process.env.VERCEL_TEAM_ID || "").trim();

  if (!token) {
    throw new Error("Missing VERCEL_API_TOKEN");
  }
  if (!project) {
    throw new Error("Missing VERCEL_PROJECT_ID or VERCEL_PROJECT_NAME");
  }

  return { token, project, teamId };
}

function buildApiUrl(pathname, teamId) {
  const url = new URL(`https://api.vercel.com${pathname}`);
  if (teamId) {
    url.searchParams.set("teamId", teamId);
  }
  return url.toString();
}

async function vercelRequest(pathname, { method = "GET", body } = {}) {
  const { token, teamId } = getVercelConfig();
  const response = await fetch(buildApiUrl(pathname, teamId), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (_error) {
    data = {};
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      data?.error ||
      raw ||
      `Vercel API request failed (${response.status})`;
    const err = new Error(message);
    err.statusCode = response.status;
    err.payload = data;
    throw err;
  }

  return data;
}

async function addProjectDomain(domain) {
  const { project } = getVercelConfig();
  return vercelRequest(`/v10/projects/${encodeURIComponent(project)}/domains`, {
    method: "POST",
    body: { name: domain },
  });
}

async function verifyProjectDomain(domain) {
  const { project } = getVercelConfig();
  return vercelRequest(`/v9/projects/${encodeURIComponent(project)}/domains/${encodeURIComponent(domain)}/verify`, {
    method: "POST",
  });
}

async function removeProjectDomain(domain) {
  const { project } = getVercelConfig();
  return vercelRequest(`/v9/projects/${encodeURIComponent(project)}/domains/${encodeURIComponent(domain)}`, {
    method: "DELETE",
  });
}

module.exports = {
  addProjectDomain,
  verifyProjectDomain,
  removeProjectDomain,
};

