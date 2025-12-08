// src/pages/LoginPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../components/AuthProvider.jsx";
import Card from "../components/ui/Card.jsx";

const APP_VERSION = "1.0.0";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(""); // عمداً خالی
  const [err, setErr] = useState("");

  // فایل‌ها از public/images
  const LOGO_SRC = "/images/light.png";
  const slides = ["/images/1.webp", "/images/2.webp", "/images/3.webp"];

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(
      () => setIdx((i) => (i + 1) % slides.length),
      4000
    );
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await login(username.trim(), password.trim());
      nav(loc.state?.from?.pathname || "/", { replace: true });
    } catch (ex) {
      setErr(ex.message);
    }
  };

  return (
    <div
      className="min-h-screen bg-white text-neutral-900 dark:bg-[#0b0b0f] dark:text-white"
      dir="rtl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen">
        {/* ستون فرم */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6">
          <Card
            className="w-full max-w-md rounded-2xl border bg-white text-neutral-900 border-black/10
                       dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
            dir="rtl"
          >
            {/* لوگو و تیتر — راست‌چین */}
            <div className="mb-6 w-full text-right">
              <img
                src={LOGO_SRC}
                alt="IDE Poyan Energy"
                className="h-12 mb-3 object-contain inline-block"
              />
              <div
                className="text-xl md:text-2xl font-extrabold leading-snug
                              text-neutral-900
                              dark:bg-clip-text dark:text-transparent dark:bg-gradient-to-tr dark:from-amber-200 dark:via-white dark:to-purple-200"
              >
                <div>مدیریت یکپارچه فرآیندها</div>
                <div>شرکت ایده پویان انرژی</div>
              </div>
            </div>

            {/* تیتر ورود (راست‌چین) */}
            <div className="mb-4 text-right">
              <div className="text-lg font-semibold">ورود به سامانه</div>
            </div>

            {/* فرم — لیبل‌ها و ورودی‌ها چپ‌چین؛ ورودی‌ها LTR */}
            <form onSubmit={submit} className="space-y-3" autoComplete="off">
              <div className="text-left">
                <label className="block text-sm mb-1 text-neutral-700 dark:text-white/80">
                  نام کاربری
                </label>
                <input
                  required
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  dir="ltr"
                  className="w-full rounded-2xl border px-3 py-2 text-left
                             bg-white text-neutral-900 placeholder-neutral-400 border-black/10
                             focus:ring-2 focus:ring-neutral-300 outline-none
                             dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-700"
                />
              </div>

              <div className="text-left">
                <label className="block text-sm mb-1 text-neutral-700 dark:text-white/80">
                  رمز ورود
                </label>
                <input
                  type="password"
                  required
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full rounded-2xl border px-3 py-2 text-left
                             bg-white text-neutral-900 placeholder-neutral-400 border-black/10
                             focus:ring-2 focus:ring-neutral-300 outline-none
                             dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-700"
                />
              </div>

              {err && (
                <div className="text-sm text-red-500 dark:text-red-400">
                  {err}
                </div>
              )}

              <button
                type="submit"
                className="w-full h-10 rounded-2xl bg-neutral-900 text-white hover:bg-neutral-900 focus:bg-neutral-900 disabled:opacity-50
                           dark:bg-white dark:text-zinc-900 dark:hover:bg-white"
              >
                ورود
              </button>
            </form>

            <div className="mt-6 text-xs text-neutral-500 text-right dark:text-white/60">
              اگر حساب ندارید، با ادمین تماس بگیرید.
            </div>
          </Card>

          {/* نسخه (بیرون کارت، راست‌چین) */}
          <div
            className="mt-3 w-full max-w-md text-[10px] select-none text-right text-neutral-500 dark:text-white/50"
            dir="rtl"
          >
            نسخه: v{APP_VERSION}
          </div>
        </div>

        {/* ستون اسلایدر */}
        <div className="lg:col-span-5 relative overflow-hidden">
          {slides.map((src, i) => (
            <div
              key={src + i}
              className="absolute inset-0 transition-opacity duration-500"
              style={{
                backgroundImage: `url(${src})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: i === idx ? 1 : 0,
              }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/25 to-black/40 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
