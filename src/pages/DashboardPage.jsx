import React, { useEffect, useMemo, useState } from "react";
import { Check, Plus, Settings2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider.jsx";
import Card from "../components/ui/Card.jsx";
import { canOpenPage, hasLimitedPageAccess } from "../utils/pageAccess.js";

const activityViewers = new Set(["marandi", "nouri"]);
const formatDateTime = (value) => value ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";
const formatDuration = (from, to) => {
  if (!from) return "—";
  const milliseconds = (to ? new Date(to) : new Date()).getTime() - new Date(from).getTime();
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "—";
  const minutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(minutes / 60);
  return `${hours ? `${hours.toLocaleString("fa-IR")} ساعت و ` : ""}${(minutes % 60).toLocaleString("fa-IR")} دقیقه`;
};

const MAX_SHORTCUTS = 4;
const shortcutOptions = [
  ["/letters", "مدیریت اسناد", "nameha.svg"],
  ["/contracts/info", "قراردادها", "gharadad.svg"],
  ["/contracts/management-dashboard", "داشبورد قراردادها", "dashboard-12.svg"],
  ["/projects/daily-log", "روزنگار پروژه", "roznegar.svg"],
  ["/projects/cost-breakdown", "ساختار شکست هزینه‌ها", "sakhtar-shekast.svg"],
  ["/projects/financial-commitments", "تعهدات و مصارف مالی", "masaref-mali.svg"],
  ["/projects/financial-worksheet", "کاربرگ مالی", "karbarg-mali.svg"],
  ["/projects/project-management-dashboard", "داشبورد مدیریت پروژه", "dashboard-12.svg"],
  ["/finance/payment-request", "درخواست پرداخت", "darkhast-pardakht.svg"],
  ["/finance/tenkhah", "تنخواه گردان", "tankhah-gardan.svg"],
  ["/finance/liquidity-allocation", "تخصیص نقدینگی", "modiriat-nagdinegi.svg"],
  ["/finance/cash-flow-forecast", "پیش‌بینی جریان نقدی", "pishbini-naghdi.svg"],
  ["/finance/financial-management-dashboard", "داشبورد مدیریت مالی", "dashboard-12.svg"],
  ["/supply/request", "درخواست تأمین", "darkhast-tamin.svg"],
  ["/supply/dashboard", "داشبورد مدیریت تأمین", "dashboard-12.svg"],
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
const faNumber = (value) => Number(value || 0).toLocaleString("fa-IR");
const amountOf = (value) => {
  const parsed = Number(String(value ?? "").replace(/[،,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};
const historyOf = (item) => Array.isArray(item?.historyJson ?? item?.history ?? item?.workflowHistory) ? (item.historyJson ?? item.history ?? item.workflowHistory) : [];
const timestampOf = (entry) => {
  const value = Date.parse(String(entry?.at || entry?.createdAt || ""));
  return Number.isFinite(value) ? value : null;
};
const durationOf = (from, to) => Number.isFinite(from) && Number.isFinite(to) && to >= from ? to - from : null;
const approvalAt = (history, roleKey, predicate = () => true) => timestampOf(history.find((entry) => entry?.type === "approved" && entry?.roleKey === roleKey && predicate(entry)));
const stageDurations = (item) => {
  const history = historyOf(item);
  const createdAt = timestampOf(history.find((entry) => entry?.type === "created")) ?? timestampOf({ createdAt: item?.createdAt });
  const projectControlAt = approvalAt(history, "project_control");
  const projectManagerAt = approvalAt(history, "project_manager");
  const managementAt = approvalAt(history, "management");
  const accountingAt = approvalAt(history, "accounting", (entry) => Number(entry?.index) >= 5);
  return [durationOf(createdAt, projectControlAt), durationOf(projectControlAt, projectManagerAt), durationOf(projectManagerAt, managementAt), durationOf(managementAt, accountingAt)];
};
const formatReviewDuration = (milliseconds) => {
  if (!Number.isFinite(milliseconds)) return "—";
  const hours = Math.round(milliseconds / 3600000);
  const days = Math.floor(hours / 24);
  return days ? `${faNumber(days)} روز${hours % 24 ? ` و ${faNumber(hours % 24)} ساعت` : ""}` : `${faNumber(hours)} ساعت`;
};
const dailyLogUnits = (entry) => {
  const values = entry?.user_units ?? entry?.userUnits;
  const units = Array.isArray(values) ? values : [];
  const labels = [...new Set(units.map((unit) => String(unit || "").trim()).filter(Boolean))];
  return labels.length ? labels.join("، ") : String(entry?.user_department ?? entry?.userDepartment ?? "بدون واحد");
};

function HomeTopDailyLogUsers({ rows, loading }) {
  return <Card className="min-h-[350px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800"><div className="mb-4"><span className="block text-sm font-bold">کاربران پرثبت روزنگار</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">۵ کاربر با بیشترین تعداد ثبت</span></div><div className="space-y-2">{rows.length ? rows.map((person, index) => <div key={person.key} className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-3 dark:bg-white/[0.045]"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-neutral-500 shadow-sm dark:bg-neutral-800 dark:text-neutral-300">{faNumber(index + 1)}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{person.label}</span><span className="mt-1 block truncate text-[10px] text-neutral-500 dark:text-neutral-400">{person.unit}</span></span><span className="shrink-0 text-sm font-bold tabular-nums">{faNumber(person.value)}</span></div>) : <div className="py-24 text-center text-xs text-neutral-400">{loading ? "در حال دریافت اطلاعات..." : "داده‌ای برای نمایش وجود ندارد."}</div>}</div></Card>;
}

function HomeReviewTiming({ timings }) {
  const stages = ["برنامه‌ریزی و کنترل پروژه", "مدیر پروژه", "مدیریت / دستور پرداخت", "مالی و تأیید نهایی"];
  return <Card className="min-h-[410px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800"><div className="mb-4"><span className="block text-sm font-bold">مدت زمان بررسی درخواست‌ها</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">بر اساس زمان ثبت‌شده در گردش‌کار درخواست‌های عادی</span></div><div className="grid gap-2 sm:grid-cols-2">{stages.map((label, index) => { const values = timings[index] || []; const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; const maximum = values.length ? Math.max(...values) : null; return <div key={label} className="rounded-xl bg-neutral-50 p-3 dark:bg-white/[0.045]"><span className="flex items-center gap-2 text-xs font-semibold"><span className={`h-2.5 w-2.5 rounded-full ${["bg-sky-500", "bg-amber-500", "bg-violet-500", "bg-emerald-500"][index]}`} />{label}</span><div className="mt-3 flex items-end justify-between gap-2"><span className="text-[11px] text-neutral-500 dark:text-neutral-400">میانگین</span><span className="text-sm font-bold tabular-nums">{formatReviewDuration(average)}</span></div><div className="mt-2 flex items-end justify-between gap-2 border-t border-black/[0.06] pt-2 dark:border-white/[0.08]"><span className="text-[11px] text-neutral-500 dark:text-neutral-400">بیشترین</span><span className="text-sm font-bold tabular-nums">{formatReviewDuration(maximum)}</span></div></div>; })}</div></Card>;
}

function HomeUnsettledTenkhah({ rows, loading }) {
  return <Card className="min-h-[350px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800"><div className="mb-4"><span className="block text-sm font-bold">مانده‌های تسویه‌نشدهٔ تنخواه</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">۵ نفر اول بر اساس بیشترین ماندهٔ تسویه‌نشده</span></div><div className="space-y-2">{rows.length ? rows.map((person, index) => <div key={person.key} className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-3 dark:bg-white/[0.045]"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-neutral-500 shadow-sm dark:bg-neutral-800 dark:text-neutral-300">{faNumber(index + 1)}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{person.label}</span><span className="mt-1 block text-[10px] text-neutral-500 dark:text-neutral-400">مانده تسویه‌نشده: {faNumber(person.unsettled)} ریال</span></span><span className="shrink-0 text-sm font-bold tabular-nums">{faNumber(person.unsettled)} <span className="text-[10px] font-medium text-neutral-400">ریال</span></span></div>) : <div className="py-24 text-center text-xs text-neutral-400">{loading ? "در حال دریافت اطلاعات..." : "داده‌ای برای نمایش وجود ندارد."}</div>}</div></Card>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);
  const [dailyLogEntries, setDailyLogEntries] = useState([]);
  const [normalRequests, setNormalRequests] = useState([]);
  const [tenkhahRequests, setTenkhahRequests] = useState([]);
  const [dashboardWidgetsLoading, setDashboardWidgetsLoading] = useState(true);
  const storageKey = `ipm-dashboard-shortcuts:${user?.id || user?.username || "guest"}`;
  const canViewActivity = activityViewers.has(String(user?.username || "").toLowerCase());
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

  useEffect(() => {
    if (!canViewActivity || !user?.id) { setActivityLogs([]); return; }
    let cancelled = false;
    fetch("/api/home/user-activity", { credentials: "include", headers: { "x-user-id": String(user.id) } })
      .then((response) => response.ok ? response.json() : { items: [] })
      .then((data) => { if (!cancelled) setActivityLogs(Array.isArray(data?.items) ? data.items : []); })
      .catch(() => { if (!cancelled) setActivityLogs([]); });
    return () => { cancelled = true; };
  }, [canViewActivity, user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    const options = { credentials: "include", headers: { "x-user-id": String(user.id) } };
    setDashboardWidgetsLoading(true);
    Promise.all([
      fetch("/api/roznegar?activeProjects=true", options).then((response) => response.ok ? response.json() : { items: [] }),
      fetch("/api/requests?dashboard=1", options).then((response) => response.ok ? response.json() : { items: [] }),
      fetch("/api/tenkhah?dashboard=1", options).then((response) => response.ok ? response.json() : { items: [] }),
    ]).then(([dailyLogsData, requestsData, tenkhahData]) => {
      if (cancelled) return;
      const requests = Array.isArray(requestsData?.items) ? requestsData.items : [];
      setDailyLogEntries(Array.isArray(dailyLogsData?.items) ? dailyLogsData.items : []);
      setNormalRequests(requests.filter((item) => String(item?.requestType || item?.docId || "").toLowerCase() !== "tenkhah_request" && String(item?.scope || "").toLowerCase() !== "tenkhah"));
      setTenkhahRequests(Array.isArray(tenkhahData?.items) ? tenkhahData.items : []);
    }).catch(() => {
      if (cancelled) return;
      setDailyLogEntries([]);
      setNormalRequests([]);
      setTenkhahRequests([]);
    }).finally(() => { if (!cancelled) setDashboardWidgetsLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const topDailyLogUsers = useMemo(() => {
    const people = new Map();
    dailyLogEntries.forEach((entry) => {
      const key = String(entry?.user_id ?? entry?.userId ?? entry?.user_name ?? entry?.userName ?? "");
      if (!key) return;
      const current = people.get(key) || { key, label: String(entry?.user_name ?? entry?.userName ?? `کاربر #${key}`).trim(), unit: dailyLogUnits(entry), value: 0 };
      current.value += 1;
      people.set(key, current);
    });
    return [...people.values()].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "fa")).slice(0, 5);
  }, [dailyLogEntries]);
  const reviewTimings = useMemo(() => {
    const groups = [[], [], [], []];
    normalRequests.forEach((request) => stageDurations(request).forEach((duration, index) => { if (duration != null) groups[index].push(duration); }));
    return groups;
  }, [normalRequests]);
  const unsettledTenkhah = useMemo(() => {
    const people = new Map();
    tenkhahRequests.forEach((item) => {
      const key = String(item?.beneficiaryUserId ?? item?.createdById ?? item?.beneficiaryName ?? item?.requesterName ?? "");
      if (!key) return;
      const current = people.get(key) || { key, label: String(item?.beneficiaryName ?? item?.requesterName ?? item?.beneficiaryUsername ?? `کاربر #${key}`).trim(), unsettled: 0 };
      current.unsettled += amountOf(item?.unsettledBalance);
      people.set(key, current);
    });
    return [...people.values()].filter((person) => person.unsettled > 0).sort((a, b) => b.unsettled - a.unsettled || a.label.localeCompare(b.label, "fa")).slice(0, 5);
  }, [tenkhahRequests]);

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
            <h1 className="text-base font-bold md:text-lg">خانه</h1>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">دسترسی سریع به صفحه‌های پرکاربرد</p>
          </div>
          {selectedShortcuts.length > 0 && <button type="button" onClick={() => setPickerOpen(true)} className="grid h-9 w-9 place-items-center rounded-xl border border-neutral-200 text-neutral-500 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-amber-500/10" aria-label="ویرایش میانبرها" title="ویرایش میانبرها"><Settings2 className="h-4 w-4" /></button>}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {selectedShortcuts.map((item) => <button key={item.to} type="button" onClick={() => navigate(item.to)} className="group flex w-[104px] flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-gradient-to-b from-white to-neutral-50 px-2 py-3 text-center transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-300 dark:border-white/10 dark:from-white/[0.07] dark:to-white/[0.02] dark:hover:border-amber-400/60" title={item.label}><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 transition group-hover:bg-amber-100 dark:bg-amber-500/10 dark:group-hover:bg-amber-500/20"><img src={item.icon} alt="" className="h-5 w-5 opacity-75 dark:invert" /></span><span className="line-clamp-2 min-h-8 text-[11px] font-semibold leading-4">{item.label}</span></button>)}
          {selectedShortcuts.length < MAX_SHORTCUTS && <button type="button" onClick={() => setPickerOpen(true)} className="flex min-h-[102px] w-[104px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/70 px-2 text-neutral-500 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:border-white/20 dark:bg-white/[0.03] dark:text-neutral-300 dark:hover:bg-amber-500/10" aria-label="افزودن میانبر"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-sm dark:bg-white/10"><Plus className="h-5 w-5" /></span><span className="text-[11px] font-semibold">افزودن میانبر</span></button>}
        </div>
      </section>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <HomeTopDailyLogUsers rows={topDailyLogUsers} loading={dashboardWidgetsLoading} />
        <HomeReviewTiming timings={reviewTimings} />
        <HomeUnsettledTenkhah rows={unsettledTenkhah} loading={dashboardWidgetsLoading} />
      </div>

      {canViewActivity && <section className="mt-3 rounded-2xl border border-black/10 bg-white p-4 text-neutral-900 shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 sm:p-5">
        <div className="mb-4"><h2 className="text-sm font-bold">لاگ حضور کاربران</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">زمان ورود، مدت حضور و زمان خروج از سامانه</p></div>
        <div className="max-h-[350px] overflow-auto rounded-xl border border-black/[0.07] dark:border-white/[0.08]"><table className="w-full min-w-[700px] text-right text-xs"><thead className="sticky top-0 bg-neutral-50 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300"><tr><th className="px-3 py-2.5 font-medium">کاربر</th><th className="px-3 py-2.5 font-medium">ورود</th><th className="px-3 py-2.5 font-medium">مدت حضور</th><th className="px-3 py-2.5 font-medium">خروج</th></tr></thead><tbody>{activityLogs.length ? activityLogs.map((item) => <tr key={item.id} className="border-t border-black/[0.06] dark:border-white/[0.08]"><td className="px-3 py-3 font-medium">{item.name || item.username}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{formatDateTime(item.loggedInAt)}</td><td className="whitespace-nowrap px-3 py-3 font-bold tabular-nums">{formatDuration(item.loggedInAt, item.loggedOutAt)}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{item.loggedOutAt ? formatDateTime(item.loggedOutAt) : <span className="text-emerald-600 dark:text-emerald-400">در حال حضور</span>}</td></tr>) : <tr><td colSpan="4" className="px-3 py-16 text-center text-neutral-400">لاگ حضوری برای نمایش وجود ندارد.</td></tr>}</tbody></table></div>
      </section>}

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
