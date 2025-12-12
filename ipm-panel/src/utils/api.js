// src/utils/api.js
const API_BASE =
  import.meta.env.VITE_API_URL || "/api";

export async function api(path, opt = {}) {
  const res = await fetch(API_BASE + path, {
    credentials: "include",
    ...opt,
    headers: {
      "Content-Type": "application/json",
      ...(opt.headers || {}),
    },
  });

  const txt = await res.text();
  let data = {};
  try {
    data = txt ? JSON.parse(txt) : {};
  } catch {}

  if (!res.ok) {
    throw new Error(
      data?.error || data?.message || "request_failed"
    );
  }

  return data;
}
