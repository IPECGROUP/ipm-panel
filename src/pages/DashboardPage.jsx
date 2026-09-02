import React, { useEffect, useMemo, useState } from "react";
import { Check, Plus, Settings2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider.jsx";
import { canOpenPage, hasLimitedPageAccess } from "../utils/pageAccess.js";

const MAX_SHORTCUTS = 4;
const shortcutOptions = [
  ["/letters", "مدیریت اسناد", "nameha.svg"],
  ["/contracts/info", "قراردادها", "gharadad.svg"],
  ["/contracts/management-dashboard", "داشبورد قراردادها", "dashboard-modirirat.svg"],
  ["/projects/daily-log", "روزنگار پروژه", "roznegar.svg"],
  ["/projects/cost-breakdown", "ساختار شکست هزینه‌ها", "sakhtar-shekast.svg"],
  ["/projects/financial-commitments", "تعهدات و مصارف مالی", "masaref-mali.svg"],
  ["/projects/financial-worksheet", "کاربرگ مالی", "karbarg-mali.svg"],
  ["/projects/project-management-dashboard", "داشبورد مدیریت پروژه", "dashboard-modirirat.svg"],
  ["/finance/payment-request", "درخواست پرداخت", "darkhast-pardakht.svg"],
  ["/finance/tenkhah", "تنخواه گردان", "tankhah-gardan.svg"],
  ["/finance/liquidity-allocation", "تخصیص نقدینگی", "modiriat-nagdinegi.svg"],
  ["/finance/cash-flow-forecast", "پیش‌بینی جریان نقدی", "pishbini-naghdi.svg"],
  ["/finance/financial-management-dashboard", "داشبورد مدیریت مالی", "dashboard-modirirat.svg"],
  ["/supply/request", "درخواست تأمین", "darkhast-tamin.svg"],
  ["/supply/dashboard", "داشبورد مدیریت تأمین", "dashboard-modirirat.svg"],
  ["/operations/equipment", "ماشین‌آلات و تجهیزات", "tanzimat.svg"],
  ["/operations/history", "سوابق عملیات", "gozareshrozane.svg"],
  ["/knowledge-management/project-lessons-learned", "درس‌آموخته‌ها", "darsamokhteha.svg"],
  ["/knowledge-management/equipment-library", "کتابخانه‌ها", "ketabkhane.svg"],
  ["/knowledge-management/training-resources", "منابع آموزشی", "manabeamozeshi.svg"],
  ["/base/units", "ساختار سازمانی", "unit.svg"],
  ["/base/access-management", "دسترسی‌ها", "dastresiha.svg"],
  ["/centers/projects", "پروژه‌ها", "modiriat-projects.svg"],
  ["/base/tags", "برچسب‌ها", "tags.svg"],
  ["/base/information", "اطلاعات پایه", "etelaat-paye.svg"],
].map(([to, label, icon]) => ({ to, label, icon: `/images/icons/${icon}` }));

const limitedShortcuts = new Set(["/finance/payment-request", "/finance/tenkhah", "/supply/request"]);

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const storageKey = `ipm-dashboard-shortcuts:${user?.id || user?.username || "guest"}`;
  const availableOptions = useMemo(
    () => shortcutOptions.filter((item) => hasLimitedPageAccess(user) ? limitedShortcuts.has(item.to) : canOpenPage(user, item.to)),
    [user]
  );
  const [selectedPaths, setSelectedPaths] = useState([]);

  useEffect(() => {
    try {
      const availablePaths = new Set(availableOptions.map((item) => item.to));
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setSelectedPaths(Array.isArray(saved) ? saved.filter((path) => availablePaths.has(path)).slice(0, MAX_SHORTCUTS) : []);
    } catch {
      setSelectedPaths([]);
    }
  }, [storageKey, availableOptions]);

  const selectedShortcuts = selectedPaths.map((path) => availableOptions.find((item) => item.to === path)).filter(Boolean);
  const updateSelection = (path) => setSelectedPaths((current) => {
    const next = current.includes(path) ? current.filter((item) => item !== path) : current.length < MAX_SHORTCUTS ? [...current, path] : current;
    localStorage.setItem(storageKey, JSON.stringify(next));
    return next;
  });

  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <section className="rounded-2xl border border-black/10 bg-white p-4 text-neutral-900 shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold md:text-lg">داشبورد</h1>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">دسترسی سریع به صفحه‌های پرکاربرد</p>
          </div>
          {selectedShortcuts.length > 0 && <button type="button" onClick={() => setPickerOpen(true)} className="grid h-9 w-9 place-items-center rounded-xl border border-neutral-200 text-neutral-500 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-amber-500/10" aria-label="ویرایش میانبرها" title="ویرایش میانبرها"><Settings2 className="h-4 w-4" /></button>}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {selectedShortcuts.map((item) => <button key={item.to} type="button" onClick={() => navigate(item.to)} className="group flex w-[104px] flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-gradient-to-b from-white to-neutral-50 px-2 py-3 text-center transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-300 dark:border-white/10 dark:from-white/[0.07] dark:to-white/[0.02] dark:hover:border-amber-400/60" title={item.label}><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 transition group-hover:bg-amber-100 dark:bg-amber-500/10 dark:group-hover:bg-amber-500/20"><img src={item.icon} alt="" className="h-5 w-5 opacity-75 dark:invert" /></span><span className="line-clamp-2 min-h-8 text-[11px] font-semibold leading-4">{item.label}</span></button>)}
          {selectedShortcuts.length < MAX_SHORTCUTS && <button type="button" onClick={() => setPickerOpen(true)} className="flex min-h-[102px] w-[104px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/70 px-2 text-neutral-500 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:border-white/20 dark:bg-white/[0.03] dark:text-neutral-300 dark:hover:bg-amber-500/10" aria-label="افزودن میانبر"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-sm dark:bg-white/10"><Plus className="h-5 w-5" /></span><span className="text-[11px] font-semibold">افزودن میانبر</span></button>}
        </div>
      </section>

      {pickerOpen && <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="shortcut-picker-title">
        <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900">
          <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4 dark:border-white/10">
            <button type="button" onClick={() => setPickerOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-white/10" aria-label="بستن"><X className="h-4 w-4" /></button>
            <div className="text-right"><h2 id="shortcut-picker-title" className="text-sm font-bold">انتخاب میانبرها</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">حداکثر {MAX_SHORTCUTS} صفحه از دسترسی‌های شما</p></div>
          </div>
          <div className="grid max-h-[55vh] grid-cols-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2">
            {availableOptions.map((item) => {
              const selected = selectedPaths.includes(item.to);
              const disabled = !selected && selectedPaths.length >= MAX_SHORTCUTS;
              return <button key={item.to} type="button" disabled={disabled} onClick={() => updateSelection(item.to)} className={`flex items-center gap-3 rounded-xl border p-3 text-right transition ${selected ? "border-amber-400 bg-amber-50 text-neutral-900 dark:bg-amber-500/10 dark:text-white" : "border-neutral-200 hover:border-amber-200 hover:bg-neutral-50 dark:border-white/10 dark:hover:bg-white/[0.05]"} ${disabled ? "cursor-not-allowed opacity-45" : ""}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-neutral-100 dark:bg-white/10"><img src={item.icon} alt="" className="h-5 w-5 opacity-75 dark:invert" /></span><span className="min-w-0 flex-1 truncate text-xs font-semibold">{item.label}</span><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? "border-amber-500 bg-amber-500 text-white" : "border-neutral-300 dark:border-white/25"}`}>{selected && <Check className="h-3.5 w-3.5" />}</span></button>;
            })}
          </div>
          <div className="flex items-center justify-between border-t border-black/10 px-5 py-3 dark:border-white/10"><span className="text-xs text-neutral-500 dark:text-neutral-400">{selectedPaths.length} از {MAX_SHORTCUTS} انتخاب شده</span><button type="button" onClick={() => setPickerOpen(false)} className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900">تأیید</button></div>
        </div>
      </div>}
    </div>
  );
}
