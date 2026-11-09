import React, { useEffect, useMemo, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useAuth } from "../components/AuthProvider.jsx";
import Card from "../components/ui/Card.jsx";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import { canOpenPage, hasLimitedPageAccess } from "../utils/pageAccess.js";
import { countExpertRequests, SupplyExpertsPanel } from "./SupplyManagementDashboardPage.jsx";
import { KnowledgeDashboardWidgets, ShareChart } from "./KnowledgeManagementDashboardPage.jsx";

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

const shortcutOptions = [
  ["/letters", "دبیرخانه", "dabirkhaneh.svg"],
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
const shortcutColors = ["bg-amber-100 dark:bg-amber-500/20", "bg-sky-100 dark:bg-sky-500/20", "bg-emerald-100 dark:bg-emerald-500/20", "bg-violet-100 dark:bg-violet-500/20", "bg-rose-100 dark:bg-rose-500/20", "bg-indigo-100 dark:bg-indigo-500/20", "bg-teal-100 dark:bg-teal-500/20", "bg-orange-100 dark:bg-orange-500/20"];
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
const workflowStageTimings = (requests, stages, keyField, approvalType) => {
  const groups = stages.map(() => []);
  requests.forEach((request) => {
    const history = historyOf(request);
    stages.forEach((stage, index) => {
      const startIndex = history.findIndex((entry) => entry?.type === "step_set" && entry?.[keyField] === stage);
      if (startIndex < 0) return;
      const start = timestampOf(history[startIndex]);
      const end = timestampOf(history.slice(startIndex + 1).find((entry) => entry?.type === approvalType && entry?.[keyField] === stage));
      const duration = durationOf(start, end);
      if (duration != null) groups[index].push(duration);
    });
  });
  return groups;
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
const supplyStatusOf = (item) => {
  if (String(item?.status || "").toLowerCase() === "rejected") return "rejected";
  if (item?.workflowStatus === "done" || String(item?.status || "").toLowerCase() === "approved") return "done";
  return item?.workflowStatus === "in_progress" ? "in_progress" : "pending";
};

function HomeTopDailyLogUsers({ rows, loading }) {
  const [hover, setHover] = useState(null);
  return <Card className="min-h-[350px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800"><div className="mb-4"><span className="block text-sm font-bold">کاربران فعال روزنگار</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">روند ماهانه ثبت‌ها در پروژه‌های فعال</span></div><div className="h-[320px] space-y-2 overflow-y-auto">{rows.length ? rows.map((person, index) => {
    const max = Math.max(1, ...person.trend);
    const values = person.trend.length === 1 ? [person.trend[0], person.trend[0]] : person.trend;
    const points = values.map((value, i) => `${2 + i * 96 / Math.max(1, values.length - 1)},${27 - value / max * 23}`).join(" ");
    return <div key={person.key} className="rounded-xl bg-neutral-50 px-3 py-3 dark:bg-white/[0.045]"><div className="flex items-center gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-neutral-500 shadow-sm dark:bg-neutral-800 dark:text-neutral-300">{faNumber(index + 1)}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{person.label}</span><span className="mt-1 block truncate text-[10px] text-neutral-500 dark:text-neutral-400">{person.unit}</span></span><span className="shrink-0 text-sm font-bold tabular-nums">{faNumber(person.value)}</span></div><svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-2 h-8 w-full" role="img" aria-label={`روند ماهانه ثبت‌های ${person.label}`} onPointerMove={(event) => { if (!person.monthLabels.length) return; const rect = event.currentTarget.getBoundingClientRect(); const position = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)); const monthIndex = Math.round(position * (person.monthLabels.length - 1)); setHover({ name: person.label, month: person.monthLabels[monthIndex], value: person.trend[monthIndex], x: Math.max(8, Math.min(event.clientX + 14, window.innerWidth - 190)), y: Math.max(8, Math.min(event.clientY + 14, window.innerHeight - 80)) }); }} onPointerLeave={() => setHover(null)}><polyline points={points} fill="none" stroke="#0ea5e9" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />{person.trend.map((value, i) => value > 0 && <circle key={person.monthLabels[i]} cx={person.trend.length === 1 ? 50 : 2 + i * 96 / (person.trend.length - 1)} cy={27 - value / max * 23} r="0.01" fill="none" stroke="#0284c7" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}<rect width="100" height="30" fill="transparent" /></svg></div>;
  }) : <div className="py-24 text-center text-xs text-neutral-400">{loading ? "در حال دریافت اطلاعات..." : "داده‌ای برای نمایش وجود ندارد."}</div>}</div>{hover && <div role="tooltip" style={{ left: hover.x, top: hover.y }} className="pointer-events-none fixed z-50 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-800"><b className="block">{hover.name}</b><span className="mt-1 block text-neutral-500 dark:text-neutral-300">{hover.month.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)])}: {faNumber(hover.value)} ثبت</span></div>}</Card>;
}

function HomeReviewTiming({ timings }) {
  const stages = ["برنامه‌ریزی و کنترل پروژه", "مدیر پروژه", "مدیریت / دستور پرداخت", "مالی و تأیید نهایی"];
  const chartData = stages.map((name, index) => {
    const values = timings[index] || [];
    return { name, maximum: values.length ? Math.max(...values) : null, average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null };
  });
  return <Card className="min-h-[410px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800">
    <div className="mb-4"><span className="block text-sm font-bold">مدت زمان بررسی درخواست‌های پرداخت / تأمین / تنخواه گردان</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">بر اساس زمان ثبت‌شده در گردش‌کار درخواست‌های عادی</span></div>
    <div className="flex justify-center gap-5 text-xs"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />بیشترین</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" />میانگین</span></div>
    <div className="mt-4 h-[280px]" dir="ltr"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 12, right: 4, left: 4, bottom: 12 }} barGap={1} barCategoryGap="25%">
      <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
      <XAxis dataKey="name" tick={false} axisLine={false} tickLine={false} />
      <Tooltip cursor={{ fill: "rgba(148,163,184,0.1)" }} content={({ active, payload, label }) => active && payload?.length ? <div dir="rtl" className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-800"><b className="block">{label}</b>{payload.map((entry) => <span key={entry.dataKey} className="mt-1 block" style={{ color: entry.color }}>{entry.name}: {formatReviewDuration(entry.value)}</span>)}</div> : null} />
      <Bar dataKey="maximum" name="بیشترین" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={32} />
      <Bar dataKey="average" name="میانگین" fill="#38bdf8" radius={[5, 5, 0, 0]} maxBarSize={32} />
    </BarChart></ResponsiveContainer></div>
    <div className="grid gap-1 text-center text-[10px] leading-4 text-neutral-500 dark:text-neutral-400" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }} dir="ltr">{chartData.map((item) => <span key={item.name} dir="rtl">{item.name}</span>)}</div>
  </Card>;
}

function HomeUnsettledTenkhah({ rows, loading }) {
  const total = rows.reduce((sum, row) => sum + row.unsettled, 0);
  return <Card className="min-h-[350px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800"><div className="mb-4"><span className="block text-sm font-bold">مانده‌های تسویه‌نشدهٔ تنخواه</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">سهم هر فرد از مانده تسویه‌نشده</span></div><ShareChart rows={rows.map((row) => ({ id: row.key, name: row.label, count: row.unsettled }))} total={total} totalLabel="کل مانده تسویه‌نشده" unit="ریال" showValues={false} large empty={loading ? "در حال دریافت اطلاعات..." : "مانده تسویه‌نشده‌ای وجود ندارد."} /></Card>;
}

const activityDateFormatters = Object.fromEntries(["persian", "gregory"].map((calendar) => [calendar, new Intl.DateTimeFormat(`en-US-u-ca-${calendar}-nu-latn`, { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" })]));
const activityDay = (value, calendar = "persian") => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = activityDateFormatters[calendar].formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}/${part("month")}/${part("day")}`;
};

function ActivityPanels({ logs }) {
  const [userFilter, setUserFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [period, setPeriod] = useState("day");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const users = useMemo(() => [...new Map(logs.map((item) => [item.username, item.name || item.username])).entries()].sort((a, b) => a[1].localeCompare(b[1], "fa")), [logs]);
  const filtered = useMemo(() => logs.filter((item) => { const date = activityDay(item.loggedInAt); return (!userFilter || item.username === userFilter) && (!from || date >= from) && (!to || date <= to); }), [logs, userFilter, from, to]);
  const averages = useMemo(() => {
    const people = new Map();
    filtered.forEach((item) => {
      const start = Date.parse(item.loggedInAt);
      const end = item.loggedOutAt ? Date.parse(item.loggedOutAt) : item.sessionActive ? now : NaN;
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return;
      const person = people.get(item.username) || { key: item.username, name: item.name || item.username, intervals: [], buckets: new Map() };
      person.intervals.push([start, end]);
      people.set(item.username, person);
    });
    people.forEach((person) => {
      const merged = [];
      person.intervals.sort((a, b) => a[0] - b[0]).forEach(([start, end]) => {
        const previous = merged[merged.length - 1];
        if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], end);
        else merged.push([start, end]);
      });
      merged.forEach(([start, end]) => {
        let cursor = start;
        while (cursor < end) {
          const day = activityDay(cursor);
          let boundary = Math.min(end, cursor + 30 * 60 * 60 * 1000);
          if (activityDay(boundary) !== day) {
            let low = cursor, high = boundary;
            while (high - low > 1) { const middle = Math.floor((low + high) / 2); if (activityDay(middle) === day) low = middle; else high = middle; }
            boundary = high;
          }
          let bucket = day;
          if (period === "month") bucket = day.slice(0, 7);
          if (period === "week") {
            const gregorian = activityDay(cursor, "gregory").split("/").map(Number);
            const date = new Date(Date.UTC(gregorian[0], gregorian[1] - 1, gregorian[2]));
            date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 1) % 7);
            bucket = date.toISOString().slice(0, 10);
          }
          person.buckets.set(bucket, (person.buckets.get(bucket) || 0) + boundary - cursor);
          cursor = boundary;
        }
      });
    });
    return [...people.values()].filter((person) => person.buckets.size).map((person) => ({ ...person, average: [...person.buckets.values()].reduce((sum, value) => sum + value, 0) / person.buckets.size })).sort((a, b) => b.average - a.average);
  }, [filtered, period, now]);
  const duration = (value) => { const minutes = Math.floor(value / 60000); const hours = Math.floor(minutes / 60); return `${faNumber(hours)} ساعت و ${faNumber(minutes % 60)} دقیقه`; };
  const inputClass = "h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:focus:ring-sky-500/20";
  return <section className="mt-3 rounded-2xl border border-black/10 bg-white p-4 text-neutral-900 shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 sm:p-5">
    <div className="mb-4 flex min-w-0 flex-col items-stretch justify-between gap-4 lg:flex-row lg:items-end"><div><h2 className="text-sm font-bold">لاگ حضور کاربران</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">زمان ورود، مدت حضور و زمان خروج از سامانه</p></div><div className="grid min-w-0 grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap sm:gap-3"><label className="col-span-2 grid min-w-0 gap-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 sm:col-span-1">کاربر<select value={userFilter} onChange={(event) => setUserFilter(event.target.value)} className={`${inputClass} w-full sm:min-w-[144px]`}><option value="">همه کاربران</option>{users.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label className="grid gap-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">از تاریخ<JalaliPopupDatePicker value={from} onChange={setFrom} placeholder="از تاریخ" preventDefaultToday buttonClassName={`${inputClass} flex w-full sm:w-36 items-center justify-between gap-2 whitespace-nowrap text-right`} /></label><label className="grid gap-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">تا تاریخ<JalaliPopupDatePicker value={to} onChange={setTo} placeholder="تا تاریخ" preventDefaultToday buttonClassName={`${inputClass} flex w-full sm:w-36 items-center justify-between gap-2 whitespace-nowrap text-right`} /></label>{(from || to || userFilter) && <button type="button" onClick={() => { setFrom(""); setTo(""); setUserFilter(""); }} className="h-9 px-2 text-xs text-sky-600">پاک‌کردن فیلتر</button>}</div></div>
    <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-3 [&>*]:min-w-0"><div className="max-h-[350px] min-w-0 overflow-auto rounded-xl border border-black/[0.07] dark:border-white/[0.08] xl:col-span-2"><table className="w-full min-w-[590px] text-right text-xs"><thead className="sticky top-0 bg-neutral-50 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300"><tr><th className="px-3 py-2.5 font-medium">کاربر</th><th className="px-3 py-2.5 font-medium">ورود</th><th className="px-3 py-2.5 font-medium">مدت حضور</th><th className="px-3 py-2.5 font-medium">خروج</th></tr></thead><tbody>{filtered.length ? filtered.map((item) => <tr key={item.id} className="border-t border-black/[0.06] dark:border-white/[0.08]"><td className="px-3 py-3"><span className="flex items-center gap-2">{item.sessionActive && !item.loggedOutAt && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" aria-label="آنلاین" />}{item.name || item.username}</span></td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{formatDateTime(item.loggedInAt)}</td><td className="whitespace-nowrap px-3 py-3 font-bold tabular-nums">{item.loggedOutAt || item.sessionActive ? duration(Math.max(0, (item.loggedOutAt ? new Date(item.loggedOutAt).getTime() : now) - new Date(item.loggedInAt).getTime())) : "نامشخص"}</td><td className="px-3 py-3">{item.loggedOutAt ? <span className="whitespace-nowrap"><span className="text-neutral-500">آفلاین</span> · {formatDateTime(item.loggedOutAt)}</span> : item.sessionActive ? <span className="text-emerald-600 dark:text-emerald-400">آنلاین</span> : <span className="text-neutral-500">نامشخص</span>}</td></tr>) : <tr><td colSpan="4" className="px-3 py-16 text-center text-neutral-400">لاگ حضوری برای نمایش وجود ندارد.</td></tr>}</tbody></table></div>
    <div className="rounded-xl border border-black/[0.07] p-3 dark:border-white/[0.08]"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-bold">میانگین حضور کاربران</h3><select value={period} onChange={(event) => setPeriod(event.target.value)} className={inputClass} aria-label="دوره میانگین"><option value="day">روزانه</option><option value="week">هفتگی</option><option value="month">ماهانه</option></select></div><div className="mt-2 max-h-[265px] overflow-auto"><table className="w-full text-right text-xs"><thead className="sticky top-0 bg-neutral-50 text-neutral-500 dark:bg-neutral-800"><tr><th className="px-2 py-2 font-medium">کاربر</th><th className="px-2 py-2 text-left font-medium">میانگین حضور</th></tr></thead><tbody>{averages.length ? averages.map((person) => <tr key={person.key} className="border-t border-black/[0.06] dark:border-white/[0.08]"><td className="px-2 py-3">{person.name}</td><td className="whitespace-nowrap px-2 py-3 text-left tabular-nums">{duration(person.average)}</td></tr>) : <tr><td colSpan="2" className="px-2 py-12 text-center text-neutral-400">داده‌ای برای نمایش وجود ندارد.</td></tr>}</tbody></table></div></div></div>
  </section>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);
  const [dailyLogEntries, setDailyLogEntries] = useState([]);
  const [normalRequests, setNormalRequests] = useState([]);
  const [tenkhahRequests, setTenkhahRequests] = useState([]);
  const [supplyRequests, setSupplyRequests] = useState([]);
  const [supplyUsers, setSupplyUsers] = useState([]);
  const [knowledgeData, setKnowledgeData] = useState(null);
  const [dashboardWidgetsLoading, setDashboardWidgetsLoading] = useState(true);
  const storageKey = `ipm-dashboard-shortcuts:${user?.id || user?.username || "guest"}`;
  const canViewActivity = activityViewers.has(String(user?.username || "").toLowerCase());
  const availableOptions = useMemo(
    () => shortcutOptions.filter((item) => hasLimitedPageAccess(user) ? limitedShortcuts.has(item.to) : canOpenPage(user, item.to)),
    [user]
  );
  const [selectedPaths, setSelectedPaths] = useState([]);
  const [shortcutsLoading, setShortcutsLoading] = useState(true);
  const [shortcutError, setShortcutError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setShortcutsLoading(true);
    setShortcutError("");
    fetch("/api/home/shortcuts", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("load_failed");
        const data = await response.json();
        if (data.paths !== null) return data.paths;
        let oldPaths = [];
        try { oldPaths = JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch { /* No previous selection. */ }
        if (!Array.isArray(oldPaths) || !oldPaths.length) return [];
        const migrated = await fetch("/api/home/shortcuts", {
          method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paths: oldPaths, onlyIfMissing: true }),
        });
        if (!migrated.ok) throw new Error("load_failed");
        return (await migrated.json()).paths;
      })
      .then((paths) => { if (!cancelled) setSelectedPaths(Array.isArray(paths) ? paths : []); })
      .catch(() => { if (!cancelled) setShortcutError("دریافت میانبرها ناموفق بود. صفحه را بازنشانی کنید."); })
      .finally(() => { if (!cancelled) setShortcutsLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, storageKey]);

  useEffect(() => {
    if (!canViewActivity || !user?.id) { setActivityLogs([]); return; }
    let cancelled = false;
    const refresh = () => fetch("/api/home/user-activity", { credentials: "include", headers: { "x-user-id": String(user.id) } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("activity_fetch_failed")))
      .then((data) => { if (!cancelled) setActivityLogs(Array.isArray(data?.items) ? data.items : []); })
      .catch(() => {});
    refresh();
    const timer = setInterval(refresh, 60000);
    return () => { cancelled = true; clearInterval(timer); };
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
      fetch("/api/supply-requests?dashboard=1", options).then((response) => response.ok ? response.json() : { items: [], supplyUsers: [] }),
      fetch("/api/knowledge-dashboard", options).then((response) => response.ok ? response.json() : null),
    ]).then(([dailyLogsData, requestsData, tenkhahData, supplyData, knowledgeDashboardData]) => {
      if (cancelled) return;
      const requests = Array.isArray(requestsData?.items) ? requestsData.items : [];
      setDailyLogEntries(Array.isArray(dailyLogsData?.items) ? dailyLogsData.items : []);
      setNormalRequests(requests.filter((item) => String(item?.requestType || item?.docId || "").toLowerCase() !== "tenkhah_request" && String(item?.scope || "").toLowerCase() !== "tenkhah"));
      setTenkhahRequests(Array.isArray(tenkhahData?.items) ? tenkhahData.items : []);
      setSupplyRequests(Array.isArray(supplyData?.items) ? supplyData.items : []);
      setSupplyUsers(Array.isArray(supplyData?.supplyUsers) ? supplyData.supplyUsers : []);
      setKnowledgeData(knowledgeDashboardData);
    }).catch(() => {
      if (cancelled) return;
      setDailyLogEntries([]);
      setNormalRequests([]);
      setTenkhahRequests([]);
      setSupplyRequests([]);
      setSupplyUsers([]);
      setKnowledgeData(null);
    }).finally(() => { if (!cancelled) setDashboardWidgetsLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const topDailyLogUsers = useMemo(() => {
    const people = new Map();
    const months = [...new Set(dailyLogEntries.map((entry) => String(entry?.date_ymd ?? entry?.dateYmd ?? "").replaceAll("/", "-").slice(0, 7)).filter((month) => /^\d{4}-\d{2}$/.test(month)))].sort();
    dailyLogEntries.forEach((entry) => {
      const key = String(entry?.user_id ?? entry?.userId ?? entry?.user_name ?? entry?.userName ?? "");
      if (!key) return;
      const current = people.get(key) || { key, label: String(entry?.user_name ?? entry?.userName ?? `کاربر #${key}`).trim(), unit: dailyLogUnits(entry), value: 0, months: {} };
      current.value += 1;
      const month = String(entry?.date_ymd ?? entry?.dateYmd ?? "").replaceAll("/", "-").slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(month)) current.months[month] = (current.months[month] || 0) + 1;
      people.set(key, current);
    });
    return [...people.values()].map((person) => ({ ...person, monthLabels: months, trend: months.map((month) => person.months[month] || 0) })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "fa"));
  }, [dailyLogEntries]);
  const reviewTimings = useMemo(() => {
    const groups = [[], [], [], []];
    normalRequests.forEach((request) => stageDurations(request).forEach((duration, index) => { if (duration != null) groups[index].push(duration); }));
    return groups;
  }, [normalRequests]);
  const supplyReviewTimings = useMemo(() => workflowStageTimings(supplyRequests, ["project_manager", "commercial"], "roleKey", "approved"), [supplyRequests]);
  const tenkhahReviewTimings = useMemo(() => workflowStageTimings(tenkhahRequests, ["project_manager", "management", "finance"], "stage", "approve"), [tenkhahRequests]);
  const unsettledTenkhah = useMemo(() => {
    const people = new Map();
    tenkhahRequests.forEach((item) => {
      const key = String(item?.beneficiaryUserId ?? item?.createdById ?? item?.beneficiaryName ?? item?.requesterName ?? "");
      if (!key) return;
      const current = people.get(key) || { key, label: String(item?.beneficiaryName ?? item?.requesterName ?? item?.beneficiaryUsername ?? `کاربر #${key}`).trim(), unsettled: 0 };
      current.unsettled += amountOf(item?.unsettledBalance);
      people.set(key, current);
    });
    return [...people.values()].filter((person) => person.unsettled > 0).sort((a, b) => b.unsettled - a.unsettled || a.label.localeCompare(b.label, "fa"));
  }, [tenkhahRequests]);
  const supplyExperts = useMemo(() => supplyUsers.map((person) => {
    const id = Number(person.id);
    const owned = supplyRequests.filter((item) => Number(item.currentAssigneeUserId) === id);
    return {
      id,
      name: person.name || person.username || person.email || `کاربر #${id}`,
      total: countExpertRequests(supplyRequests, id),
      active: owned.filter((item) => ["pending", "in_progress"].includes(supplyStatusOf(item))).length,
      pending: owned.filter((item) => supplyStatusOf(item) === "pending").length,
      done: supplyRequests.filter((item) => (item.supplyActions || []).some((action) => Number(action.byUserId) === id && String(action.status) === "done") || (item.historyJson || []).some((event) => event?.type === "approved" && event?.roleKey === "commercial" && Number(event?.byUserId) === id)).length,
    };
  }).sort((a, b) => b.active - a.active || b.pending - a.pending || a.name.localeCompare(b.name, "fa")), [supplyRequests, supplyUsers]);

  const selectedShortcuts = selectedPaths.map((path) => availableOptions.find((item) => item.to === path)).filter(Boolean);
  const updateSelection = (path) => setSelectedPaths((current) =>
    current.includes(path) ? current.filter((item) => item !== path) : [...current, path]
  );
  const saveSelection = async () => {
    setShortcutsLoading(true);
    setShortcutError("");
    try {
      const response = await fetch("/api/home/shortcuts", {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: selectedPaths }),
      });
      if (!response.ok) throw new Error("save_failed");
      setPickerOpen(false);
    } catch {
      setShortcutError("ذخیره میانبرها ناموفق بود. دوباره تلاش کنید.");
    } finally { setShortcutsLoading(false); }
  };

  return (
    <div dir="rtl" className="mx-auto w-full min-w-0 max-w-[1400px]">
      <section className="rounded-2xl border border-black/10 bg-[#f8f7f2] p-4 text-neutral-900 shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 sm:p-5">
        {shortcutError && !pickerOpen && <p role="alert" className="mt-3 text-xs text-red-600">{shortcutError}</p>}
        <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3 sm:flex sm:flex-wrap sm:gap-3">
          {selectedShortcuts.map((item) => <button key={item.to} type="button" onClick={() => navigate(item.to)} className={`group flex w-full sm:w-[104px] flex-col items-center gap-2 rounded-2xl border border-neutral-200 px-2 py-3 text-center transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-300 dark:border-white/10 dark:hover:border-amber-400/60 ${shortcutColors[shortcutOptions.findIndex((option) => option.to === item.to) % shortcutColors.length]}`} title={item.label}><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/40 dark:bg-white/5"><img src={item.icon} alt="" className="h-7 w-7 opacity-75 dark:invert" /></span><span className="line-clamp-2 min-h-8 text-[11px] font-semibold leading-4">{item.label}</span></button>)}
          {<button type="button" disabled={shortcutsLoading} onClick={() => setPickerOpen(true)} className="flex min-h-[102px] w-full sm:w-[104px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/70 px-2 text-neutral-500 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:border-white/20 dark:bg-white/[0.03] dark:text-neutral-300 dark:hover:bg-amber-500/10" aria-label="افزودن میانبر"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-sm dark:bg-white/10"><Plus className="h-5 w-5" /></span><span className="text-[11px] font-semibold">افزودن میانبر</span></button>}
        </div>
      </section>

      <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
        <HomeTopDailyLogUsers rows={topDailyLogUsers} loading={dashboardWidgetsLoading} />
        <div className="min-w-0 md:col-span-2 xl:col-span-1"><HomeUnsettledTenkhah rows={unsettledTenkhah} loading={dashboardWidgetsLoading} /></div>
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
        <HomeReviewTiming title="??? ???? ????? ??????????? ??????" stages={["??????????? ? ????? ?????", "???? ?????", "?????? / ????? ??????", "???? ? ????? ?????"]} timings={reviewTimings} />
        <HomeReviewTiming title="??? ???? ????? ??????????? ?????" stages={["???? ?????", "???? ?????"]} timings={supplyReviewTimings} />
        <HomeReviewTiming title="??? ???? ????? ?????? ?????" stages={["???? ?????", "??????", "????"]} timings={tenkhahReviewTimings} />
      </div>

      <div className="mt-3 min-w-0">
        <SupplyExpertsPanel rows={supplyExperts} />
      </div>

      {canOpenPage(user, "/knowledge-management/dashboard") && <Card className="mt-3 rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800">
        <div className="mb-4"><span className="block text-sm font-bold">مدیریت دانش</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">نمای کلی درس‌آموخته‌ها، کتابخانه‌ها و منابع آموزشی</span></div>
        <KnowledgeDashboardWidgets data={knowledgeData} />
      </Card>}

      {canViewActivity && <ActivityPanels logs={activityLogs} />}

      {pickerOpen && <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="shortcut-picker-title">
        <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900">
          <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4 dark:border-white/10">
            <button type="button" onClick={saveSelection} disabled={shortcutsLoading} className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-white/10" aria-label="بستن"><X className="h-4 w-4" /></button>
            <div className="text-right"><h2 id="shortcut-picker-title" className="text-sm font-bold">انتخاب میانبرها</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">صفحه‌های مورد نظر را انتخاب کنید</p></div>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2">
            {availableOptions.map((item) => {
              const selected = selectedPaths.includes(item.to);
              return <button key={item.to} type="button" disabled={shortcutsLoading} onClick={() => updateSelection(item.to)} className={`flex items-center gap-3 rounded-xl border p-3 text-right transition ${selected ? "border-amber-400 bg-amber-50 text-neutral-900 dark:bg-amber-500/10 dark:text-white" : "border-neutral-200 hover:border-amber-200 hover:bg-neutral-50 dark:border-white/10 dark:hover:bg-white/[0.05]"}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-neutral-100 dark:bg-white/10"><img src={item.icon} alt="" className="h-5 w-5 opacity-75 dark:invert" /></span><span className="min-w-0 flex-1 truncate text-xs font-semibold">{item.label}</span><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? "border-amber-500 bg-amber-500 text-white" : "border-neutral-300 dark:border-white/25"}`}>{selected && <Check className="h-3.5 w-3.5" />}</span></button>;
            })}
          </div>
          {shortcutError && <p role="alert" className="px-5 py-2 text-xs text-red-600">{shortcutError}</p>}
          <div className="flex items-center justify-between border-t border-black/10 px-5 py-3 dark:border-white/10"><span className="text-xs text-neutral-500 dark:text-neutral-400">{selectedShortcuts.length} انتخاب شده</span><button type="button" onClick={saveSelection} disabled={shortcutsLoading} className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900">تأیید</button></div>
        </div>
      </div>}
    </div>
  );
}
