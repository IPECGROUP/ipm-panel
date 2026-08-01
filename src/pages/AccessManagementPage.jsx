import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { api } from "../utils/api.js";
import { baseCurrenciesTablePreset as tableUi } from "../components/ui/tablePresets.js";

// ترتیب این تب‌ها دقیقاً مطابق ترتیب صفحات در منوی اصلی است.
const pageTabs = [
  "داشبورد",
  "مدیریت اسناد",
  "قراردادها",
  "داشبورد مدیریت قراردادها",
  "روزنگار پروژه",
  "ساختار شکست هزینه‌ها",
  "تعهدات و مصارف مالی",
  "کاربرگ مالی",
  "داشبورد مدیریت پروژه",
  "درخواست پرداخت",
  "تخصیص نقدینگی",
  "پیش‌بینی جریان نقدی",
  "داشبورد مدیریت مالی",
  "درخواست تأمین",
  "داشبورد مدیریت تأمین",
  "ماشین‌آلات و تجهیزات",
  "سوابق عملیات",
  "مدیریت دانش",
  "ساختار سازمانی",
  "مدیریت دسترسی‌ها",
  "پروژه‌ها",
  "ارزها",
  "برچسب‌ها",
];

const accessColumnsByTab = {
  "مدیریت اسناد": ["نمایش منو", "همه", "افزودن", "بارگذاری سند پیوست", "نمایش سند پیوست", "ارسال", "ویرایش"],
  "قراردادها": ["نمایش منو", "همه", "افزودن", "پیش‌نمایش", "ویرایش", "عمومی", "تقویم قرارداد", "دامنه کار", "مالی و تضامین", "تأمین اجتماعی"],
  "روزنگار پروژه": ["نمایش منو", "همه", "افزودن"],
  "ساختار شکست هزینه‌ها": ["نمایش منو"],
  "تعهدات و مصارف مالی": ["نمایش منو"],
  "کاربرگ مالی": ["نمایش منو", "همه", "صورت وضعیت‌ها", "دریافتی‌ها"],
  "درخواست پرداخت": ["نمایش منو", "همه", "افزودن"],
  "تخصیص نقدینگی": ["نمایش منو", "همه", "افزودن"],
  "پیش‌بینی جریان نقدی": ["نمایش منو", "همه", "پیش‌بینی هزینه‌ها", "پیش‌بینی درآمدها", "نمودار جریان نقدی"],
  "درخواست تأمین": ["نمایش منو", "همه", "افزودن"],
};

export default function AccessManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(pageTabs[0]);
  const tabsRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const accessColumns = accessColumnsByTab[activeTab] || [];

  const slideTabs = (direction) => {
    tabsRef.current?.scrollBy({ left: direction * 280, behavior: "smooth" });
  };

  useEffect(() => {
    api("/admin/users", { credentials: "include" })
      .then((data) => setUsers((Array.isArray(data?.users) ? data.users : []).filter((item) => item?.isActive !== false)))
      .catch((err) => setError(err?.message || "خطا در دریافت کاربران"))
      .finally(() => setLoading(false));
  }, []);

  if (user?.role !== "admin") {
    return (
      <Card className="mx-auto max-w-6xl text-center py-8">
        دسترسی به این بخش فقط برای مدیر سیستم مجاز است.
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-6xl" dir="rtl">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
          <img src="/images/icons/dastresiha.svg" alt="" className="h-6 w-6 dark:invert" />
        </span>
        <span className="min-w-0">
          <span className="block text-base font-bold md:text-lg">مدیریت دسترسی‌ها</span>
          <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">تنظیمات</span>
        </span>
      </div>

      <div className="mb-4 flex items-center gap-2" dir="ltr">
        <button
          type="button"
          onClick={() => slideTabs(-1)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/10 bg-white text-black transition hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
          aria-label="تب قبلی"
          title="تب قبلی"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div ref={tabsRef} className="flex min-w-0 flex-1 overflow-x-auto rounded-2xl border border-black/10 bg-white scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:border-neutral-800 dark:bg-neutral-900" dir="rtl">
          <div className="flex min-w-max">
          {pageTabs.map((tab, index) => {
            const selected = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={[
                  "relative z-10 h-10 min-w-[104px] flex-none rounded-lg px-3 text-[11px] font-semibold whitespace-nowrap transition md:h-11 md:min-w-[132px] md:px-4 md:text-sm",
                  index > 0 ? "border-r border-black/10 dark:border-neutral-800" : "",
                  selected
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800",
                ].join(" ")}
              >
                {tab}
              </button>
            );
          })}
          </div>
        </div>
        <button
          type="button"
          onClick={() => slideTabs(1)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/10 bg-white text-black transition hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
          aria-label="تب بعدی"
          title="تب بعدی"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className={tableUi.frame}>
            <div className="overflow-x-auto">
              <table className={`${tableUi.table} table-fixed`} style={{ minWidth: Math.max(760, (accessColumns.length + 1) * 150) }}>
                <thead>
                  <tr className={tableUi.headRow}>
                    <th className={`${tableUi.th} border-l border-neutral-300 dark:border-neutral-700`}>کاربران</th>
                    {accessColumns.map((column, index) => (
                      <th key={column} className={`${tableUi.th} ${index < accessColumns.length - 1 ? "border-l border-neutral-300 dark:border-neutral-700" : ""}`}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={tableUi.body}>
                  {loading ? (
                    <tr><td colSpan={accessColumns.length + 1} className={tableUi.emptyRow}>در حال دریافت کاربران…</td></tr>
                  ) : error ? (
                    <tr><td colSpan={accessColumns.length + 1} className="py-4 text-center text-sm text-red-600 dark:text-red-400">{error}</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={accessColumns.length + 1} className={tableUi.emptyRow}>کاربری ثبت نشده است.</td></tr>
                  ) : (
                    users.map((item) => (
                      <tr key={item.id} className="transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
                        <td className="border-l border-neutral-300 px-4 py-3 text-center text-sm dark:border-neutral-700">{item.name || "—"}</td>
                        {accessColumns.map((column, index) => (
                          <td key={column} className={index < accessColumns.length - 1 ? "border-l border-neutral-300 px-4 py-3 dark:border-neutral-700" : "px-4 py-3"}>&nbsp;</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
      </div>
    </Card>
  );
}
