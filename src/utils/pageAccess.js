const ROUTE_PERMISSION_PAGES = [
  ["/letters", "مدیریت اسناد"],
  ["/documents/delivery-receipts", "رسیدهای تحویل"],
  ["/documents/management-dashboard", "مدیریت اسناد", "داشبورد مدیریت اسناد"],
  ["/contracts/info", "قراردادها"],
  ["/contracts/management-dashboard", "قراردادها", "داشبورد مدیریت قراردادها"],
  ["/projects/daily-log", "روزنگار پروژه"],
  ["/projects/cost-breakdown", "ساختار شکست هزینه‌ها"],
  ["/projects/financial-commitments", "تعهدات و مصارف مالی"],
  ["/projects/financial-worksheet", "کاربرگ مالی"],
  ["/projects/financial-parameters", "پارامترهای مالی پروژه‌ها"],
  ["/projects/project-management-dashboard", "کاربرگ مالی", "داشبورد مدیریت پروژه"],
  ["/finance/tenkhah", "تنخواه گردان"],
  ["/finance/payment-request", "درخواست پرداخت"],
  ["/requests", "درخواست پرداخت"],
  ["/payment", "درخواست پرداخت"],
  ["/finance/liquidity-allocation", "تخصیص نقدینگی"],
  ["/finance/cash-flow-forecast", "پیش‌بینی جریان نقدی"],
  ["/finance/financial-management-dashboard", "پیش‌بینی جریان نقدی", "داشبورد مدیریت مالی"],
  ["/supply/request", "درخواست تأمین"],
  ["/supply/supplier-evaluation", "ارزیابی تأمین‌کنندگان"],
  ["/supply/actions", "درخواست تأمین"],
  ["/supply/dashboard", "درخواست تأمین", "داشبورد مدیریت تأمین"],
  ["/knowledge-management/dashboard", "داشبورد مدیریت دانش"],
  ["/knowledge-management/project-lessons-learned", "درس‌آموخته‌ها"],
  ["/knowledge-management/equipment-library", "کتابخانه‌ها"],
  ["/knowledge-management/training-resources", "منابع آموزشی"],
  ["/equipment/identity", "شناسنامه تجهیزات"],
  ["/equipment/service-maintenance", "سرویس و نگهداری"],
  ["/equipment/dashboard", "داشبورد مدیریت تجهیزات"],
  ["/executive-operations/daily-work-report", "گزارش کارکرد روزانه"],
  ["/executive-operations/operation-history", "سوابق عملیات‌ها"],
  ["/executive-operations/equipment-calibration", "کالیبراسیون تجهیزات"],
  ["/quality-management/systems", "مدیریت سیستم‌ها"],
  ["/quality-management/requirements", "الزامات و انطباق‌ها"],
  ["/quality-management/audits", "ممیزی و اقدام اصلاحی"],
  ["/quality-management/dashboard", "داشبورد مدیریت سیستم‌ها"],
  ["/base/units", "ساختار سازمانی"],
  ["/admin/users", "ساختار سازمانی"],
  ["/base/access-management", "دسترسی‌ها"],
  ["/centers/projects", "پروژه‌ها"],
  ["/base/tags", "برچسب‌ها"],
  ["/base/information", "اطلاعات پایه"],
  ["/base/currencies", "اطلاعات پایه"],
  ["/base/budget-codes", "اطلاعات پایه"],
];

const PAGE_INDEX = {
  "مدیریت اسناد": 1,
  "قراردادها": 2,
  "روزنگار پروژه": 4,
  "ساختار شکست هزینه‌ها": 5,
  "تعهدات و مصارف مالی": 6,
  "کاربرگ مالی": 7,
  "تنخواه گردان": 8,
  "درخواست پرداخت": 9,
  "تخصیص نقدینگی": 10,
  "پیش‌بینی جریان نقدی": 11,
  "درخواست تأمین": 13,
  "درس‌آموخته‌ها": 14,
  "کتابخانه‌ها": 15,
  "منابع آموزشی": 16,
  "داشبورد مدیریت دانش": 17,
  "شناسنامه تجهیزات": 18,
  "سرویس و نگهداری": 19,
  "داشبورد مدیریت تجهیزات": 20,
  "گزارش کارکرد روزانه": 21,
  "سوابق عملیات‌ها": 22,
  "کالیبراسیون تجهیزات": 23,
  "مدیریت سیستم‌ها": 24,
  "الزامات و انطباق‌ها": 25,
  "ممیزی و اقدام اصلاحی": 26,
  "داشبورد مدیریت سیستم‌ها": 27,
  "ساختار سازمانی": 28,
  "دسترسی‌ها": 29,
  "پروژه‌ها": 30,
  "برچسب‌ها": 31,
  "اطلاعات پایه": 32,
  "رسیدهای تحویل": 33,
  "پارامترهای مالی پروژه‌ها": 34,
  "ارزیابی تأمین‌کنندگان": 35,
};

const LEGACY_PAGE_INDEX = { 33: 1, 34: 7, 35: 13 };
const INDEPENDENT_ACCESS_MARKER = "page-access-independent:v1";

const SETTINGS_USERS = new Set(["ali", "marandi", "nouri"]);

export function canAccessSettings(user) {
  return SETTINGS_USERS.has(String(user?.username || "").trim().toLowerCase());
}

function isSettingsRoute(path) {
  return path === "/base" || path.startsWith("/base/") || path === "/centers/projects";
}

export function hasLimitedPageAccess(user) {
  return false;
}

export function canOpenPage(user, pathname) {
  const path = String(pathname || "/").replace(/\/+$/, "") || "/";
  // Settings are intentionally limited to the three named accounts. This is
  // checked before the general role/page-permission rules so administrators
  // outside that list cannot open a settings URL directly.
  if (isSettingsRoute(path) && !canAccessSettings(user)) return false;

  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const matched = ROUTE_PERMISSION_PAGES.find(([route]) => path === route || path.startsWith(`${route}/`));
  if (matched && !isAdmin) {
    const [, page, feature] = matched;
    const access = new Set(Array.isArray(user?.access) ? user.access.map(String) : []);
    const requiredAccess = feature || "نمایش منو";
    const index = PAGE_INDEX[page];
    const legacyIndex = LEGACY_PAGE_INDEX[index];
    const hasLegacyAccess = legacyIndex && !access.has(INDEPENDENT_ACCESS_MARKER) &&
      (access.has(`page-access:${legacyIndex}:همه`) || access.has(`page-access:${legacyIndex}:${requiredAccess}`));
    if (!hasLegacyAccess && !access.has(`page-access:${index}:همه`) && !access.has(`page-access:${index}:${requiredAccess}`)) return false;
  }

  return true;
}
