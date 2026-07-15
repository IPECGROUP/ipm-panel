// src/components/layout/Shell.jsx
import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import RightNav from "../RightNav.jsx";
import { useAuth } from "../AuthProvider.jsx";

export default function Shell() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const notificationsRef = React.useRef(null);
  const [notifications, setNotifications] = React.useState([]);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [notificationsLoading, setNotificationsLoading] = React.useState(false);
  // ===== تم (dark|light) فقط برای همین سشن، بدون localStorage =====
  const [theme] = React.useState("light");

  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  const loadNotifications = React.useCallback(async ({ quiet = false } = {}) => {
    if (authLoading || !user?.id) return;
    if (!quiet) setNotificationsLoading(true);
    try {
      const requestOptions = { credentials: "include", headers: { "x-user-id": String(user.id) } };
      const [cartableResponse, actionsResponse] = await Promise.all([
        fetch("/api/supply-requests?cartable=1", requestOptions),
        fetch("/api/supply-actions", requestOptions),
      ]);
      const [cartableData, actionsData] = await Promise.all([
        cartableResponse.json().catch(() => ({})),
        actionsResponse.json().catch(() => ({})),
      ]);
      const dashboardItems = cartableResponse.ok && Array.isArray(cartableData?.items)
        ? cartableData.items.map((item) => ({ ...item, notificationTarget: "dashboard" }))
        : [];
      const actionItems = actionsResponse.ok && Array.isArray(actionsData?.items)
        ? actionsData.items
            .filter((item) => Number(item.currentAssigneeUserId) === Number(user.id) && item.workflowStatus === "in_progress")
            .map((item) => ({ ...item, notificationTarget: "supply_actions" }))
        : [];
      setNotifications([...dashboardItems, ...actionItems]);
    } catch {
      setNotifications([]);
    } finally {
      if (!quiet) setNotificationsLoading(false);
    }
  }, [authLoading, user?.id]);

  React.useEffect(() => {
    loadNotifications();
    const interval = setInterval(() => loadNotifications({ quiet: true }), 30000);
    const refresh = () => loadNotifications({ quiet: true });
    window.addEventListener("focus", refresh);
    window.addEventListener("supply-notifications-refresh", refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("supply-notifications-refresh", refresh);
    };
  }, [loadNotifications]);

  React.useEffect(() => {
    if (!notificationsOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!notificationsRef.current?.contains(event.target)) setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [notificationsOpen]);

  const openNotification = (item) => {
    setNotificationsOpen(false);
    const target = item.notificationTarget === "supply_actions" ? "/supply/request" : "/dashboard";
    const key = item.notificationTarget === "supply_actions" ? "request" : "supplyRequest";
    navigate(`${target}?${key}=${encodeURIComponent(item.id)}`);
  };

  // ===== Date (Jalali + Gregorian) =====
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const jalaliDate = React.useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).formatToParts(now);
      const getPart = (type) => parts.find((part) => part.type === type)?.value || "";
      return [getPart("day"), getPart("month"), getPart("year")]
        .filter(Boolean)
        .join(" ");
    } catch {
      return "";
    }
  }, [now]);

  const gregorianDate = React.useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);
    } catch {
      return "";
    }
  }, [now]);

  return (
    <div
      dir="rtl"
      className={
        "min-h-screen " +
        (theme === "dark"
          ? "bg-[#0b0b0f] text-white"
          : "bg-white text-neutral-900")
      }
    >
      <header
        className={
          "sticky top-0 z-40 border-b backdrop-blur " +
          (theme === "dark"
            ? "border-white/10 bg-gradient-to-l from-white/10 to-transparent"
            : "border-black/10 bg-gradient-to-l from-black/5 to-transparent")
        }
      >
        <div className="px-2 sm:px-3 md:px-6 py-2.5 md:py-3 lg:pr-[var(--right-nav-space)] lg:pl-8">
          <div className="mx-auto max-w-[1400px] flex min-w-0 items-center justify-between gap-2">
          <Link
            to="/"
            className="flex min-w-0 shrink-0 items-center justify-start hover:opacity-95 transition"
            aria-label="خانه"
            title="خانه"
          >
            {/* لوگو لایت/دارک */}
            <img
              src="/images/light%20mode.png"
              alt="logo"
              className="h-10 sm:h-8 md:h-9 max-w-[152px] sm:max-w-none w-auto object-contain block dark:hidden"
            />
            <img
              src="/images/dark%20mode.png"
              alt="logo (dark)"
              className="h-10 sm:h-8 md:h-9 max-w-[152px] sm:max-w-none w-auto object-contain hidden dark:block"
            />
          </Link>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2 md:gap-3 text-xs md:text-sm">
            {/* تاریخ */}
            <div
              className={
                "hidden lg:flex h-9 items-center gap-2 px-3 rounded-xl border " +
                (theme === "dark"
                  ? "border-white/15 bg-white/5 text-white/85"
                  : "border-black/10 bg-white/70 text-neutral-700")
              }
              title="تاریخ امروز"
            >
              <span className="whitespace-nowrap">{jalaliDate || "—"}</span>
              <span className={theme === "dark" ? "text-white/30" : "text-black/20"}>
                •
              </span>
              <span className="whitespace-nowrap">{gregorianDate || "—"}</span>
            </div>

            {/* تاریخ داخل هدر موبایل */}
            <div
              className={
                "flex md:hidden min-w-0 h-8 sm:h-9 items-center gap-1.5 px-2.5 rounded-xl border text-[11px] leading-none " +
                (theme === "dark"
                  ? "border-white/10 bg-white/5 text-white/80"
                  : "border-black/10 bg-white/70 text-neutral-700")
              }
              title="تاریخ امروز"
            >
              <span className="min-w-0 max-w-[5.75rem] truncate whitespace-nowrap">
                {jalaliDate || "—"}
              </span>
              <span className={theme === "dark" ? "text-white/30" : "text-black/20"}>
                •
              </span>
              <span className="hidden min-[380px]:inline shrink-0 whitespace-nowrap">
                {gregorianDate || "—"}
              </span>
            </div>

            <div ref={notificationsRef} className="relative shrink-0">
              <button
                type="button"
                aria-label={`اعلان‌ها${notifications.length ? `، ${notifications.length} مورد` : ""}`}
                title="اعلان‌ها"
                className={
                  "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border p-0 transition sm:h-9 sm:w-9 " +
                  (theme === "dark"
                    ? "border-neutral-700 text-neutral-200 hover:bg-neutral-800/60"
                    : "border-neutral-300 text-neutral-800 hover:bg-neutral-50")
                }
                onClick={() => {
                  setNotificationsOpen((open) => !open);
                  if (!notificationsOpen) loadNotifications();
                }}
              >
                {notifications.length ? <span className="notification-ring absolute inset-0 rounded-xl border border-rose-400/70" aria-hidden="true" /> : null}
                <img src="/images/icons/notif.svg" alt="" className={`h-4 w-4 dark:invert sm:h-5 sm:w-5 ${notifications.length ? "notification-bell" : ""}`} />
                {notifications.length ? (
                  <span className="notification-count absolute -left-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white shadow-md ring-2 ring-white dark:ring-neutral-900">
                    {notifications.length > 99 ? "+۹۹" : new Intl.NumberFormat("fa-IR").format(notifications.length)}
                  </span>
                ) : null}
              </button>

              {notificationsOpen ? (
                <div className="notification-popover absolute left-0 top-[calc(100%+10px)] z-[70] w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100">
                  <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
                    <div>
                      <div className="text-sm font-bold">اعلان‌ها</div>
                      <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">پیام‌ها و موارد نیازمند بررسی</div>
                    </div>
                    {notifications.length ? <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{new Intl.NumberFormat("fa-IR").format(notifications.length)} جدید</span> : null}
                  </div>
                  <div className="max-h-[min(420px,65vh)] overflow-y-auto p-2">
                    {notificationsLoading ? (
                      <div className="py-8 text-center text-xs text-neutral-500">در حال دریافت اعلان‌ها...</div>
                    ) : notifications.length ? (
                      notifications.map((item) => (
                        <button key={item.id} type="button" onClick={() => openNotification(item)} className="group flex w-full gap-3 rounded-xl p-3 text-right transition hover:bg-black/[0.04] dark:hover:bg-white/[0.07]">
                          <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 dark:bg-amber-500/10">
                            <img src="/images/icons/darkhast-tamin.svg" alt="" className="h-5 w-5 dark:invert" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold">{item.notificationTarget === "supply_actions" ? "کار جدید در انتظار انجام" : "درخواست جدید در انتظار بررسی"}</span>
                            <span className="mt-1 block truncate text-xs text-neutral-600 dark:text-neutral-300">{item.title || "بدون موضوع"}</span>
                            <span className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-neutral-400">
                              <span dir="ltr" className="font-sans tabular-nums">{item.serial || "—"}</span>
                              <span className="transition group-hover:text-neutral-700 dark:group-hover:text-neutral-200">{item.notificationTarget === "supply_actions" ? "مشاهده در کار های در دست انجام ←" : "مشاهده در داشبورد ←"}</span>
                            </span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="py-9 text-center">
                        <div className="text-sm font-medium">اعلان جدیدی ندارید</div>
                        <div className="mt-1 text-xs text-neutral-500">درخواست‌های ارجاع‌شده اینجا نمایش داده می‌شوند.</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

          </div>
          </div>
        </div>

        {/* تاریخ برای موبایل/تبلت */}
        <div className="hidden md:block px-2 sm:px-3 md:px-6 pb-3 lg:hidden">
          <div className="mx-auto max-w-[1400px]">
          <div
            className={
              "w-full min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 overflow-hidden px-2 sm:px-3 py-2 rounded-2xl border text-[11px] sm:text-xs " +
              (theme === "dark"
                ? "border-white/10 bg-white/5 text-white/80"
                : "border-black/10 bg-white/70 text-neutral-700")
            }
          >
            <span className="min-w-0 truncate whitespace-nowrap">{jalaliDate || "—"}</span>
            <span className={theme === "dark" ? "text-white/30" : "text-black/20"}>
              •
            </span>
            <span className="shrink-0 whitespace-nowrap">{gregorianDate || "—"}</span>
          </div>
        </div>
        </div>
      </header>

      <main className="relative min-h-[calc(100dvh-64px)] md:min-h-[calc(100dvh-80px)]">
        <div
          dir="ltr"
          className="px-2 sm:px-3 md:px-6 pt-3 md:pt-6 pb-28 lg:pb-6 lg:pr-[var(--right-nav-space)] lg:pl-8"
        >
          <div dir="rtl" className="mx-auto max-w-[1400px]">
            {/* اینجا روت‌های داخلی رندر می‌شن */}
            <Outlet />
          </div>
        </div>
        <RightNav />
      </main>
    </div>
  );
}
