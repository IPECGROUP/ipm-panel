const LIMITED_USERNAMES = new Set(["maali", "chamanara"]);

const ROUTE_PERMISSION_PAGES = [
  ["/letters", "مدیریت اسناد"],
  ["/contracts/info", "قراردادها"],
  ["/projects/daily-log", "روزنگار پروژه"],
  ["/projects/cost-breakdown", "ساختار شکست هزینه‌ها"],
  ["/projects/financial-commitments", "تعهدات و مصارف مالی"],
  ["/projects/financial-worksheet", "کاربرگ مالی"],
  ["/finance/payment-request", "درخواست پرداخت"],
  ["/requests", "درخواست پرداخت"],
  ["/payment", "درخواست پرداخت"],
  ["/finance/liquidity-allocation", "تخصیص نقدینگی"],
  ["/finance/cash-flow-forecast", "پیش‌بینی جریان نقدی"],
  ["/supply/request", "درخواست تأمین"],
  ["/supply/actions", "درخواست تأمین"],
];

const PAGE_INDEX = {
  "مدیریت اسناد": 1,
  "قراردادها": 2,
  "روزنگار پروژه": 4,
  "ساختار شکست هزینه‌ها": 5,
  "تعهدات و مصارف مالی": 6,
  "کاربرگ مالی": 7,
  "درخواست پرداخت": 9,
  "تخصیص نقدینگی": 10,
  "پیش‌بینی جریان نقدی": 11,
  "درخواست تأمین": 13,
};

export function hasLimitedPageAccess(user) {
  const username = String(user?.username || "").trim().toLowerCase();
  return LIMITED_USERNAMES.has(username);
}

export function canOpenPage(user, pathname) {
  const path = String(pathname || "/").replace(/\/+$/, "") || "/";
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const matched = ROUTE_PERMISSION_PAGES.find(([route]) => path === route || path.startsWith(`${route}/`));
  if (matched && !isAdmin) {
    const page = matched[1];
    const access = new Set(Array.isArray(user?.access) ? user.access.map(String) : []);
    if (!access.has(`page-access:${PAGE_INDEX[page]}:همه`) && !access.has(`page-access:${PAGE_INDEX[page]}:نمایش منو`)) return false;
  }

  if (!hasLimitedPageAccess(user)) return true;

  return [
    "/",
    "/dashboard",
    "/requests",
    "/payment",
    "/finance/payment-request",
    "/finance/tenkhah",
    "/supply/request",
    "/supply/actions",
  ].includes(path) || path.startsWith("/requests/");
}
