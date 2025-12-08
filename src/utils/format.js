// src/utils/format.js

// تبدیل اعداد فارسی به انگلیسی
export function toEnglishDigits(str = "") {
  return String(str)
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

// جداکننده سه‌تایی برای اعداد
export function format3(n) {
  const s = String(n || "").replace(/[^\d]/g, "");
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
