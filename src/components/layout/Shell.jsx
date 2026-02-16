// src/components/layout/Shell.jsx
import React from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../AuthProvider.jsx";
import { isMainAdminUser } from "../../utils/auth.js";
import RightNav from "../RightNav.jsx";

export default function Shell() {
  // useAuth ممکنه موقتاً null بده → امنش می‌کنیم
  const auth = useAuth() || {};
  const { user, logout } = auth;
  const isMainAdmin = isMainAdminUser(user);

  // ===== تم (dark|light) فقط برای همین سشن، بدون localStorage =====
  const [theme] = React.useState("light"); // همیشه لایت شروع می‌کنه

  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  // ===== Date (Jalali + Gregorian) =====
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const jalaliDate = React.useMemo(() => {
    try {
      return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(now);
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

  const displayName = user?.name || user?.username || user?.email || "کاربر";
  const displayRole = user?.role ? String(user.role) : "";

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
        <div className="mx-auto max-w-[1400px] flex items-center justify-between gap-2 p-2.5 md:p-3 pr-[72px] sm:pr-[88px] lg:pr-[104px]">
          <Link
            to="/"
            className="flex items-center justify-start hover:opacity-95 transition shrink-0"
            aria-label="خانه"
            title="خانه"
          >
            {/* لوگو لایت/دارک */}
            <img
              src="/images/light%20mode.png"
              alt="logo"
              className="h-7 md:h-8 w-auto object-contain block dark:hidden"
            />
            <img
              src="/images/dark%20mode.png"
              alt="logo (dark)"
              className="h-7 md:h-8 w-auto object-contain hidden dark:block"
            />
          </Link>

          <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm">
            {/* تاریخ */}
            <div
              className={
                "hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border " +
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

            {/* خوش‌آمد + نقش */}
            <div
              className={
                "flex items-center gap-2 px-3 py-1.5 rounded-xl border " +
                (theme === "dark"
                  ? "border-white/15 bg-white/5 text-white/90"
                  : "border-black/10 bg-white/70 text-neutral-800")
              }
              title="حساب کاربری"
            >
              <span className={theme === "dark" ? "text-white/70" : "text-neutral-600"}>
                خوش آمدید،
              </span>
              <span className="font-semibold">{displayName}</span>
              {displayRole ? (
                <>
                  <span className={theme === "dark" ? "text-white/30" : "text-black/20"}>
                    •
                  </span>
                  <span
                    className={
                      "px-2 py-0.5 rounded-lg text-[11px] border " +
                      (theme === "dark"
                        ? "border-white/15 bg-white/5 text-white/80"
                        : "border-black/10 bg-black/[0.03] text-neutral-700")
                    }
                  >
                    {displayRole}
                  </span>
                </>
              ) : null}
            </div>

            {isMainAdmin && (
              <span
                className={
                  "px-2 py-1 rounded-lg border " +
                  (theme === "dark"
                    ? "border-white/20 bg-white/5 text-white/90"
                    : "border-black/10 bg-black/5 text-neutral-700")
                }
              >
                ادمین اصلی
              </span>
            )}

            {/* دکمه اعلان */}
            <button
              aria-label="اعلان‌ها"
              title="اعلان‌ها"
              className={
                "h-9 w-9 rounded-xl border flex items-center justify-center transition " +
                (theme === "dark"
                  ? "border-neutral-700 text-neutral-200 hover:bg-neutral-800/60"
                  : "border-neutral-300 text-neutral-800 hover:bg-neutral-50")
              }
              onClick={() => {}}
            >
              <img
                src="/images/icons/notif.svg"
                alt="اعلان"
                className="w-5 h-5 dark:invert"
              />
            </button>

            {/* دکمه خروج با کنتراست بالا (خوانا در هر دو تم) */}
            <button
              onClick={logout || (() => {})}
              className={
                "h-9 px-4 rounded-xl transition " +
                (theme === "dark"
                  ? "ring-1 ring-neutral-700 text-neutral-100 hover:bg-white/10"
                  : "ring-1 ring-neutral-300 text-neutral-800 hover:bg-neutral-100")
              }
              title="خروج از حساب"
            >
              خروج
            </button>
          </div>
        </div>

        {/* تاریخ برای موبایل/تبلت */}
        <div className="mx-auto max-w-[1400px] px-3 pb-3 md:px-4 pr-[72px] sm:pr-[88px] lg:hidden">
          <div
            className={
              "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-2xl border text-xs " +
              (theme === "dark"
                ? "border-white/10 bg-white/5 text-white/80"
                : "border-black/10 bg-white/70 text-neutral-700")
            }
          >
            <span className="whitespace-nowrap">{jalaliDate || "—"}</span>
            <span className={theme === "dark" ? "text-white/30" : "text-black/20"}>
              •
            </span>
            <span className="whitespace-nowrap">{gregorianDate || "—"}</span>
          </div>
        </div>
      </header>

      <main className="relative min-h-[calc(100dvh-64px)] md:min-h-[calc(100dvh-80px)]">
        <div
          dir="ltr"
          className="px-2 sm:px-3 md:px-6 py-3 md:py-6 pr-[72px] sm:pr-[88px] lg:pr-[104px]"
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
