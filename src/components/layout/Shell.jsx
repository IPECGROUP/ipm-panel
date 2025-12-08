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
  const LOGO_SRC = "images/4.webp";

  // ===== تم (dark|light) فقط برای همین سشن، بدون localStorage =====
  const [theme, setTheme] = React.useState("light"); // همیشه لایت شروع می‌کنه

  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  const toggleTheme = () =>
    setTheme((t) => (t === "dark" ? "light" : "dark"));

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
        <div className="mx-auto max-w-[1400px] flex items-center justify-between p-3 md:p-4">
          <Link
            to="/"
            className="font-semibold tracking-tight flex items-center gap-2 hover:opacity-90 transition"
          >
            {/* لوگو لایت/دارک (کمی بزرگ‌تر) */}
            <img
              src="/images/light.png"
              alt="logo"
              className="h-8 w-auto object-contain block dark:hidden"
            />
            <img
              src="/images/dark.JPG"
              alt="logo"
              className="h-8 w-auto object-contain hidden dark:block"
            />

            <span
              className={
                "text-base md:text-lg " +
                (theme === "dark"
                  ? "bg-clip-text text-transparent bg-gradient-to-tr from-amber-200 via-white to-purple-200"
                  : "text-neutral-900")
              }
            >
              مدیریت یکپارچه فرآیند های شرکت ایده پویان انرژی
            </span>
          </Link>

          <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm">
            <span
              className={
                theme === "dark" ? "text-white/80" : "text-neutral-700"
              }
            >
              {(user?.name || user?.username || user?.email || "بدون نام") +
                (user?.role ? ` • ${user.role}` : "")}
            </span>

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

            {/* دکمهٔ تغییر تم */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={theme === "dark" ? "حالت روشن" : "حالت تیره"}
              className={
                "h-9 w-9 rounded-xl border flex items-center justify-center transition " +
                (theme === "dark"
                  ? "border-neutral-700 text-neutral-200 hover:bg-neutral-800/60"
                  : "border-neutral-300 text-neutral-800 hover:bg-neutral-50")
              }
            >
              {theme === "dark" ? (
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12.6A8.5 8.5 0 1 1 11.4 3a7 7 0 1 0 9.6 9.6Z" />
                </svg>
              )}
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
      </header>

      <main className="grid grid-cols-[1fr_92px] min-h-[calc(100dvh-64px)] md:min-h-[calc(100dvh-80px)]">
        <div dir="ltr" className="px-4 md:px-6 py-4 md:py-6">
          <div dir="rtl" className="mx-auto max-w-[1400px]">
            {/* اینجا روت‌های داخلی رندر می‌شن */}
            <Outlet />
          </div>
        </div>
        <div dir="rtl" className="shrink-0">
          <RightNav />
        </div>
      </main>
    </div>
  );
}