// src/utils/api.js

// همان رفتار قبلی: از window.API_URL یا '/api'
const API_URL = (window.API_URL || "/api").replace(/\/+$/, "");

export async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };

  const res = await fetch(API_URL + path, {
    credentials: "include", // سشن
    ...opts,
    headers,
  });

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text().catch(() => "");
    const msg = text
      ? `server returned non-json: ${text.slice(0, 160)}`
      : "server returned non-json";
    throw new Error(msg);
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "error");
  return data;
}
