// src/pages/TestEditorPage.jsx
import React, { useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { isMainAdminUser } from "../utils/auth";

export default function TestEditorPage() {
  const { user } = useAuth();
  const isMainAdmin = isMainAdminUser(user);

  // آدرس OnlyOffice (برای لوکال/سرور)
  const OO_BASE = useMemo(() => {
    // اگر خواستی از env بگیری:
    // return (import.meta?.env?.VITE_ONLYOFFICE_URL || "http://localhost:8080").replace(/\/+$/, "");
    return "http://localhost:8080"; // ← اینو برای سرور خودت عوض کن
  }, []);

  const welcomeUrl = `${OO_BASE}/welcome`;
  const [iframeFailed, setIframeFailed] = useState(false);

  if (!isMainAdmin) {
    return (
      <div className="p-4">
        <Card className="rounded-2xl border border-black/10 bg-white p-4 text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
          <div className="text-sm">دسترسی ندارید.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card className="rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
        <div className="px-4 py-3 border-b border-black/10 dark:border-neutral-800 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm md:text-base font-semibold">تست OnlyOffice (دمو)</div>
            <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
              فقط برای تست ابزارها — ذخیره/بایگانی فعلاً نداریم
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="h-10 px-3 rounded-xl bg-white text-black border border-black/15 hover:bg-black/5 text-sm
                         dark:bg-neutral-100 dark:text-neutral-900"
              onClick={() => window.open(welcomeUrl, "_blank", "noopener,noreferrer")}
              type="button"
            >
              باز کردن در تب جدید
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="rounded-2xl border border-black/10 overflow-hidden bg-white dark:bg-neutral-900 dark:border-neutral-800">
            {!iframeFailed ? (
              <iframe
                title="ONLYOFFICE Demo"
                src={welcomeUrl}
                className="w-full"
                style={{ height: "78vh", border: 0 }}
                onError={() => setIframeFailed(true)}
              />
            ) : (
              <div className="p-4 text-sm text-neutral-700 dark:text-neutral-300">
                نمایش داخل صفحه محدود شد. از دکمه «باز کردن در تب جدید» استفاده کن.
              </div>
            )}
          </div>

          <div className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">
            داخل صفحه /welcome روی <span className="font-semibold">GO TO TEST EXAMPLE</span> بزن تا ادیتور باز بشه. :contentReference[oaicite:2]{index=2}
          </div>
        </div>
      </Card>
    </div>
  );
}
