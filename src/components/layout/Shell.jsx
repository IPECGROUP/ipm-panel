// src/components/layout/Shell.jsx
import React from "react";
import { Link, Outlet } from "react-router-dom";
import RightNav from "../RightNav.jsx";

export default function Shell() {
  // ===== تم (dark|light) فقط برای همین سشن، بدون localStorage =====
  const [theme] = React.useState("light"); 

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

            {/* دکمه اعلان */}
            <button
              aria-label="اعلان‌ها"
              title="اعلان‌ها"
              className={
                "h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-xl border flex items-center justify-center p-0 transition " +
                (theme === "dark"
                  ? "border-neutral-700 text-neutral-200 hover:bg-neutral-800/60"
                  : "border-neutral-300 text-neutral-800 hover:bg-neutral-50")
              }
              onClick={() => {}}
            >
              <img
                src="/images/icons/notif.svg"
                alt="اعلان"
                className="w-4 h-4 sm:w-5 sm:h-5 dark:invert"
              />
            </button>

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
