import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
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
  "مدیریت اسناد": ["همه", "نمایش منو", "افزودن", "بارگذاری سند پیوست", "نمایش سند پیوست", "ارسال", "ویرایش"],
  "قراردادها": ["همه", "نمایش منو", "افزودن", "پیش‌نمایش", "ویرایش", "عمومی", "تقویم قرارداد", "دامنه کار", "مالی و تضامین", "تأمین اجتماعی"],
  "روزنگار پروژه": ["همه", "نمایش منو", "افزودن"],
  "ساختار شکست هزینه‌ها": ["همه", "نمایش منو"],
  "تعهدات و مصارف مالی": ["همه", "نمایش منو"],
  "کاربرگ مالی": ["همه", "نمایش منو", "صورت وضعیت‌ها", "دریافتی‌ها"],
  "درخواست پرداخت": ["همه", "نمایش منو", "افزودن"],
  "تخصیص نقدینگی": ["همه", "نمایش منو", "افزودن"],
  "پیش‌بینی جریان نقدی": ["همه", "نمایش منو", "پیش‌بینی هزینه‌ها", "پیش‌بینی درآمدها", "نمودار جریان نقدی"],
  "درخواست تأمین": ["همه", "نمایش منو", "افزودن"],
};

const ALL_ACCESS = "همه";
const MENU_ACCESS = "نمایش منو";
const accessTokenPrefix = "page-access:";

const permissionKey = (tab, userId, column) => `${tab}:${userId}:${column}`;
const permissionToken = (tab, column) => `${accessTokenPrefix}${pageTabs.indexOf(tab)}:${column}`;

export default function AccessManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(pageTabs[0]);
  const tabsRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState(() => new Set());
  const [savingPermissions, setSavingPermissions] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const accessColumns = accessColumnsByTab[activeTab] || [];

  const slideTabs = (direction) => {
    tabsRef.current?.scrollBy({ left: direction * 280, behavior: "smooth" });
  };

  const togglePermission = async (targetUser, column) => {
    const userId = targetUser.id;
    const currentKey = permissionKey(activeTab, userId, column);
    if (savingPermissions.has(currentKey)) return;

    const next = new Set(selectedPermissions);
    const isEnabling = !next.has(currentKey);
    const allColumns = accessColumns.filter((item) => item !== ALL_ACCESS);
    const setColumn = (name, enabled) => {
      const key = permissionKey(activeTab, userId, name);
      enabled ? next.add(key) : next.delete(key);
    };

    if (column === ALL_ACCESS) {
      accessColumns.forEach((name) => setColumn(name, isEnabling));
    } else {
      setColumn(column, isEnabling);
      if (isEnabling && column !== MENU_ACCESS) setColumn(MENU_ACCESS, true);
      if (column === MENU_ACCESS && !isEnabling) {
        allColumns.forEach((name) => setColumn(name, false));
      }
      if (activeTab === "مدیریت اسناد") {
        if (column === "بارگذاری سند پیوست" && isEnabling) setColumn("نمایش سند پیوست", true);
        if (column === "نمایش سند پیوست" && !isEnabling) setColumn("بارگذاری سند پیوست", false);
      }
      const hasAll = allColumns.every((name) => next.has(permissionKey(activeTab, userId, name)));
      setColumn(ALL_ACCESS, hasAll);
    }

    setSelectedPermissions(next);
    setSavingPermissions((current) => new Set(current).add(currentKey));
    try {
      const baseAccess = Array.isArray(targetUser.access) ? targetUser.access : [];
      const preservedAccess = baseAccess.filter((item) => !String(item).startsWith(accessTokenPrefix));
      const currentUserTokens = [];
      pageTabs.forEach((tab) => {
        (accessColumnsByTab[tab] || []).forEach((name) => {
          if (next.has(permissionKey(tab, userId, name))) currentUserTokens.push(permissionToken(tab, name));
        });
      });
      const access = [...preservedAccess, ...currentUserTokens];
      await api("/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ id: userId, access }),
      });
      setUsers((current) => current.map((item) => (String(item.id) === String(userId) ? { ...item, access } : item)));
    } catch (err) {
      setSelectedPermissions(selectedPermissions);
      setError(err?.message || "خطا در ذخیره سطح دسترسی");
    } finally {
      setSavingPermissions((current) => {
        const updated = new Set(current);
        updated.delete(currentKey);
        return updated;
      });
    }
  };

  useEffect(() => {
    api("/admin/users", { credentials: "include" })
      .then((data) => {
        const activeUsers = (Array.isArray(data?.users) ? data.users : []).filter((item) => item?.isActive !== false);
        const restoredPermissions = new Set();
        activeUsers.forEach((item) => {
          (Array.isArray(item.access) ? item.access : []).forEach((token) => {
            const match = String(token).match(/^page-access:(\d+):(.*)$/);
            if (!match) return;
            const tab = pageTabs[Number(match[1])];
            const column = match[2];
            if (tab && (accessColumnsByTab[tab] || []).includes(column)) {
              restoredPermissions.add(permissionKey(tab, item.id, column));
            }
          });
        });
        setUsers(activeUsers);
        setSelectedPermissions(restoredPermissions);
      })
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

      <div className="flex items-center gap-1" dir="ltr">
        <button
          type="button"
          onClick={() => slideTabs(-1)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-neutral-600 transition hover:bg-black/[0.05] dark:text-neutral-300 dark:hover:bg-white/[0.08]"
          aria-label="تب قبلی"
          title="تب قبلی"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div ref={tabsRef} className="mx-auto flex w-full min-w-0 flex-1 items-center justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-xl border border-black/10 bg-black/[0.03] p-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mb-px md:items-stretch md:gap-0 md:rounded-b-none md:rounded-t-2xl md:border-b-0 md:bg-white md:p-0 md:shadow-sm dark:border-neutral-800 dark:bg-white/[0.04] md:dark:bg-neutral-900" dir="rtl">
          <div className="flex min-w-max">
          {pageTabs.map((tab, index) => {
            const selected = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={[
                  "relative z-10 h-10 min-w-[104px] flex-none rounded-lg px-3 text-[11px] font-semibold transition whitespace-nowrap md:h-11 md:min-w-[132px] md:flex-1 md:rounded-none md:px-4 md:text-sm",
                  index > 0 ? "md:border-r md:border-black/10 md:dark:border-neutral-800" : "",
                  index === 0 ? "md:rounded-tr-2xl" : "",
                  index === pageTabs.length - 1 ? "md:rounded-tl-2xl" : "",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20",
                  selected
                    ? "bg-black text-white shadow-sm dark:bg-black dark:text-white"
                    : "bg-white text-[#1f2937] hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800",
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
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-neutral-600 transition hover:bg-black/[0.05] dark:text-neutral-300 dark:hover:bg-white/[0.08]"
          aria-label="تب بعدی"
          title="تب بعدی"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className={`${tableUi.frame} rounded-t-none`}>
            <div className="overflow-x-auto">
              <table className={`${tableUi.table} table-fixed`} style={{ minWidth: Math.max(420, 240 + accessColumns.length * 72) }}>
                <thead>
                  <tr className={tableUi.headRow}>
                    <th className={`${tableUi.th} w-[240px] border-l border-neutral-300 dark:border-neutral-700`}>کاربران</th>
                    {accessColumns.map((column, index) => (
                      <th key={column} className={`${tableUi.th} w-[72px] px-1 ${index < accessColumns.length - 1 ? "border-l border-neutral-300 dark:border-neutral-700" : ""}`}>
                        <span className="block whitespace-normal break-words text-center leading-5">{column}</span>
                      </th>
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
                        {accessColumns.map((column, index) => {
                          const currentPermissionKey = permissionKey(activeTab, item.id, column);
                          const isSelected = selectedPermissions.has(currentPermissionKey);
                          return (
                            <td key={column} className={index < accessColumns.length - 1 ? "border-l border-neutral-300 px-1 py-3 dark:border-neutral-700" : "px-1 py-3"}>
                              <button
                                type="button"
                                onClick={() => togglePermission(item, column)}
                                disabled={savingPermissions.has(currentPermissionKey)}
                                className={`mx-auto grid h-5 w-5 place-items-center rounded-[6px] border transition ${
                                  isSelected
                                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                                    : "border-black/25 bg-transparent text-transparent hover:border-black/50 dark:border-white/25 dark:hover:border-white/50"
                                } disabled:cursor-wait disabled:opacity-60`}
                                aria-label={`${column} برای ${item.name || item.username || "کاربر"}`}
                                aria-pressed={isSelected}
                                title={isSelected ? "فعال" : "غیرفعال"}
                              >
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                              </button>
                            </td>
                          );
                        })}
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
