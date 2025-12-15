// src/utils/api.js
const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

function mapError(data, fallback = "request_failed") {
  const e = data?.error || data?.message || fallback;

  if (e === "invalid_credentials") return "نام کاربری یا رمز اشتباه است";
  if (e === "username_password_required") return "نام کاربری و رمز را وارد کنید";
  if (e === "user_has_no_password") return "برای این کاربر رمز ثبت نشده است";
  if (e === "not_found") return "سرویس مورد نظر روی سرور پیدا نشد";

  return String(e);
}

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
  try { data = txt ? JSON.parse(txt) : {}; } catch {}

  if (!res.ok) {
    throw new Error(mapError(data, `http_${res.status}`));
  }

  return data;
}
