// src/utils/api.js
const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

function mapError(data, fallback = "request_failed") {
  const e = data?.error || data?.message || fallback;

  if (e === "captcha_invalid") return "اعتبارسنجی کپچا ناموفق بود؛ دوباره تلاش کنید";
  if (e === "captcha_unavailable") return "سرویس کپچا در دسترس نیست یا تنظیم نشده است";
  if (e === "invalid_credentials") return "نام کاربری یا رمز اشتباه است";
  if (e === "username_password_required") return "نام کاربری و رمز را وارد کنید";
  if (e === "user_has_no_password") return "برای این کاربر رمز ثبت نشده است";
  if (e === "user_expired") return "اعتبار این کاربر منقضی شده است";
  if (e === "user_inactive") return "این حساب کاربری غیرفعال است";
  if (e === "too_many_login_attempts") return "تلاش‌های ورود بیش از حد است؛ ۱۵ دقیقه بعد دوباره امتحان کنید";
  if (e === "protected_super_admin") return "حساب سوپرادمین محافظت شده و قابل تغییر نیست";
  if (e === "user_in_use") return "این کاربر در سوابق سیستم استفاده شده و قابل حذف کامل نیست";
  if (e === "not_found") return "سرویس مورد نظر روی سرور پیدا نشد";
  if (e === "invalid_service_data") return "تاریخ سرویس یا تجهیز انتخاب‌شده معتبر نیست";
  if (e === "equipment_not_found") return "تجهیز انتخاب‌شده پیدا نشد";
  if (e === "equipment_service_maintenance_get_failed") return "دریافت اطلاعات سرویس و نگهداری انجام نشد";
  if (e === "equipment_service_maintenance_post_failed") return "ثبت سرویس و نگهداری انجام نشد";
  if (e === "invalid_delivery_receipt_type") return "نوع مرسوله انتخاب‌شده دیگر معتبر نیست. صفحه را دوباره بارگذاری کنید.";

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
