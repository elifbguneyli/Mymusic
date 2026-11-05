const SUNO_API_BASE = process.env.SUNO_API_BASE || "https://api.sunoapi.org";

function getApiKey() {
  const key = process.env.SUNO_API_KEY;
  if (!key) {
    throw new Error(
      "SUNO_API_KEY is not configured. Set it in the Netlify site's environment variables."
    );
  }
  return key;
}

async function sunoFetch(path, options = {}) {
  const res = await fetch(`${SUNO_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { code: res.status, msg: text };
  }

  return { status: res.status, body };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

module.exports = { sunoFetch, json, getApiKey };
