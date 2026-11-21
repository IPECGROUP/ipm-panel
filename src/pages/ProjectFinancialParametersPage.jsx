import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import { api } from "../utils/api.js";
import { useAuth } from "../components/AuthProvider.jsx";
import ProjectExchangeRatesTab from "./ProjectExchangeRatesTab.jsx";
import MonthEditButton from "../components/MonthEditButton.jsx";

const months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const tabs = [{ id: "rates", label: "نرخ های تبدیل ارز" }, { id: "allocation", label: "تسهیم هزینه های پروژه" }];
const digits = (value) => String(value).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
const fa = (value) => String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
const display = (value) => fa(String(value ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, ","));
const currentYear = () => Number(digits(new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date())));
const keyOf = (year, projectId, month) => `${year}:${projectId}:${month}`;
const isGeneral = (project) => String(project.name || "").trim().replace(/ي/g, "ی").replace(/ك/g, "ک") === "عمومی";

export default function ProjectFinancialParametersPage() {
  const { user } = useAuth();
  const draftKey = `project-cost-allocation-drafts:${user?.id}`;
  const [tab, setTab] = useState("rates");
  const [year, setYear] = useState(() => Math.min(1420, Math.max(1401, currentYear())));
  const [half, setHalf] = useState(0);
  const [projects, setProjects] = useState([]);
  const [values, setValues] = useState({});
  const [savedValues, setSavedValues] = useState({});
  const [editingMonths, setEditingMonths] = useState(new Set());
  const [focusedKey, setFocusedKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState({});
  const drafts = useRef({});
  const timers = useRef({});
  const running = useRef({});
  const blocked = useRef(new Set());
  const mounted = useRef(true);

  const persistDrafts = () => {
    try { localStorage.setItem(draftKey, JSON.stringify(drafts.current)); } catch { /* Server saves still work. */ }
  };
  const mark = (key, value) => { if (mounted.current) setStatus((prev) => ({ ...prev, [key]: value })); };

  const saveCell = useCallback(async (key) => {
    clearTimeout(timers.current[key]);
    if (running.current[key]) return running.current[key];
    const task = (async () => {
      while (Object.hasOwn(drafts.current, key)) {
        const amount = drafts.current[key];
        const [saveYear, projectId, month] = key.split(":").map(Number);
        mark(key, "saving");
        try {
          await api("/project-cost-allocation", { method: "PUT", body: JSON.stringify({ year: saveYear, projectId, month, amount }), keepalive: true });
          if (mounted.current) setSavedValues((prev) => ({ ...prev, [key]: amount }));
          if (drafts.current[key] === amount) {
            delete drafts.current[key];
            persistDrafts();
            mark(key, "saved");
            blocked.current.delete(key);
            for (const pendingKey of blocked.current) {
              const [pendingYear, , pendingMonth] = pendingKey.split(":").map(Number);
              if (pendingYear === saveYear && pendingMonth === month) {
                blocked.current.delete(pendingKey);
                setTimeout(() => saveCell(pendingKey), 0);
              }
            }
          }
        } catch (error) {
          if (error.message === "percentage_limit") {
            blocked.current.add(key);
            mark(key, "limit");
          } else mark(key, "error");
          return false;
        }
      }
      return true;
    })();
    running.current[key] = task;
    try { return await task; } finally { delete running.current[key]; }
  }, []);

  useEffect(() => {
    mounted.current = true;
    try { drafts.current = JSON.parse(localStorage.getItem(draftKey) || "{}") || {}; } catch { drafts.current = {}; }
    const beforeUnload = (event) => {
      if (Object.keys(drafts.current).length) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      mounted.current = false;
      window.removeEventListener("beforeunload", beforeUnload);
      Object.keys(timers.current).forEach((key) => { clearTimeout(timers.current[key]); saveCell(key); });
    };
  }, [draftKey, saveCell]);

  useEffect(() => {
    let cancelled = false;
    setEditingMonths(new Set());
    setLoading(true); setError("");
    Promise.all(Object.keys(drafts.current).map(saveCell)).then(() => api(`/project-cost-allocation?year=${year}`)).then((data) => {
      if (cancelled) return;
      const next = {};
      (data.values || []).forEach((row) => { next[keyOf(year, row.projectId, row.month)] = row.amount; });
      setSavedValues({ ...next });
      Object.entries(drafts.current).forEach(([key, value]) => { if (key.startsWith(`${year}:`)) next[key] = value; });
      setValues(next); setProjects([...(data.projects || [])].sort((a, b) => Number(isGeneral(b)) - Number(isGeneral(a))));
    }).catch(() => { if (!cancelled) setError("دریافت اطلاعات انجام نشد. دوباره تلاش کنید."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year, saveCell]);

  const changeValue = (key, raw) => {
    const value = digits(raw).replace(/[^\d]/g, "").slice(0, 18);
    setValues((prev) => ({ ...prev, [key]: value }));
    drafts.current[key] = value;
    persistDrafts();
    mark(key, "pending");
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => saveCell(key), 600);
  };

  const saveAll = async () => {
    setError("");
    const results = await Promise.all(Object.keys(drafts.current).map(saveCell));
    if (results.some((result) => !result) && blocked.current.size === 0) setError("ذخیره برخی مقادیر انجام نشد؛ برای تلاش دوباره دکمه ذخیره را بزنید.");
    if (results.every(Boolean) && blocked.current.size === 0) setEditingMonths(new Set());
  };
  const years = Array.from({ length: 20 }, (_, index) => 1401 + index);
  const monthTotals = months.map((_, index) => projects.filter((project) => !isGeneral(project)).reduce((sum, project) => sum + BigInt(values[keyOf(year, project.id, index + 1)] || "0"), 0n));
  const overLimitMonths = monthTotals.map((total, index) => total > 100n ? months[index] : null).filter(Boolean);

  return (
    <Card dir="rtl" className="mx-auto max-w-[1400px] rounded-2xl border border-black/10 bg-white p-2.5 text-neutral-900 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 sm:rounded-3xl sm:p-3 md:p-4">
      <div className="mb-4 flex min-w-0 items-center gap-3 border-b border-black/[0.07] px-0.5 pb-3 dark:border-white/10 sm:mb-5 sm:pb-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 shadow-sm dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04] sm:h-11 sm:w-11 sm:rounded-2xl"><span aria-hidden="true" className="h-5 w-5 bg-[#184a6b] dark:bg-[#8fc4e3] sm:h-6 sm:w-6" style={{ WebkitMask: "url(/images/icons/parametr.svg) center / contain no-repeat", mask: "url(/images/icons/parametr.svg) center / contain no-repeat" }} /></span>
        <span className="min-w-0"><span className="block truncate text-base font-bold tracking-tight text-[#184a6b] dark:text-[#8fc4e3] md:text-lg">پارامتر های مالی پروژه ها</span><span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت پروژه</span></span>
      </div>
      <div dir="rtl">
        <div className="overflow-visible px-0 sm:px-2">
          <div className="mx-auto mb-2 flex w-full max-w-[360px] items-center justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-xl border border-black/10 bg-black/[0.03] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mb-px md:max-w-[780px] md:items-stretch md:justify-center md:gap-0 md:rounded-b-none md:rounded-t-2xl md:border-b-0 md:bg-white md:p-0 md:shadow-sm dark:border-neutral-800 dark:bg-white/[0.04] md:dark:bg-neutral-900" role="tablist" aria-label="پارامترهای مالی پروژه">
            {tabs.map((item, index) => <button key={item.id} type="button" role="tab" onClick={() => setTab(item.id)} aria-selected={tab === item.id} className={`relative z-10 h-10 min-w-[104px] flex-none rounded-lg px-3 text-[11px] font-semibold transition whitespace-nowrap md:h-11 md:min-w-[132px] md:flex-1 md:rounded-none md:px-4 md:text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20 ${index > 0 ? "md:border-r md:border-black/10 md:dark:border-neutral-800" : "md:rounded-tr-2xl"} ${index === tabs.length - 1 ? "md:rounded-tl-2xl" : ""} ${tab === item.id ? "bg-[#184a6b] text-white shadow-sm dark:bg-[#184a6b] dark:text-white" : "bg-white text-[#1f2937] hover:bg-neutral-50 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-black/15 dark:bg-neutral-900 dark:text-neutral-100 dark:after:bg-neutral-700 dark:hover:bg-neutral-800"}`}>{item.label}</button>)}
          </div>
        </div>
        <div hidden={tab !== "rates"}><ProjectExchangeRatesTab /></div>
        <div hidden={tab !== "allocation"}><div className="rounded-2xl border border-black/10 bg-white pt-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="grid grid-cols-1 items-center gap-3 px-4 pb-4 sm:grid-cols-[1fr_auto_1fr]">
            <label className="flex items-center gap-2 text-sm font-semibold">سال <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="h-10 rounded-xl border border-black/15 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-900">{years.map((item) => <option key={item} value={item}>{fa(item)}</option>)}</select></label>
            <div className="flex items-center justify-center gap-2">
              <button type="button" disabled={half === 0} onClick={() => setHalf(0)} aria-label="شش ماه اول" className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 bg-white disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900"><ChevronRight size={18} /></button>
              <span className="min-w-[150px] text-center text-sm font-semibold">{half === 0 ? "فروردین تا شهریور" : "مهر تا اسفند"}</span>
              <button type="button" disabled={half === 1} onClick={() => setHalf(1)} aria-label="شش ماه دوم" className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 bg-white disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900"><ChevronLeft size={18} /></button>
            </div>
          </div>
          {error && <p role="alert" className="px-4 pb-3 text-sm text-red-600">{error}</p>}
          {(overLimitMonths.length > 0 || Object.values(status).includes("limit")) && <p role="alert" className="px-4 pb-3 text-sm text-red-600 dark:text-red-400">جمع درصد ها از ۱۰۰ نمی‌تواند بیشتر شود؛ مقادیر ذخیره‌نشده را اصلاح کنید.{overLimitMonths.length > 0 ? ` (${overLimitMonths.join("، ")})` : ""}</p>}
          <div className="mx-4 mb-4 overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"><div className="relative h-[55vh] overflow-auto" dir="ltr"><table className="w-full min-w-[800px] table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:min-w-0 [&_td]:text-center" dir="rtl"><colgroup><col style={{ width: "34%" }} />{months.slice(half * 6, half * 6 + 6).map((month) => <col key={month} style={{ width: "11%" }} />)}</colgroup><thead><tr className="border-b border-[#184a6b] bg-[#184a6b] text-white"><th className="sticky top-0 z-30 bg-[#184a6b] px-3 py-2 !text-right text-[14px] font-semibold md:text-[15px]">پروژه</th>{months.slice(half * 6, half * 6 + 6).map((month, index) => { const monthNumber = half * 6 + index + 1; return <th key={month} className="sticky top-0 z-30 bg-[#184a6b] py-2 !text-center text-[14px] font-semibold md:text-[15px]"><span className="inline-flex items-center justify-center gap-1">{month}<MonthEditButton month={month} editing={editingMonths.has(monthNumber)} onClick={() => setEditingMonths((current) => { const next = new Set(current); if (next.has(monthNumber)) next.delete(monthNumber); else next.add(monthNumber); return next; })} /></span></th>; })}</tr></thead><tbody className="text-[13px] text-black [&>tr]:h-9 dark:text-neutral-100">
            {loading ? <tr><td colSpan={7} className="py-8 text-black/60 dark:text-neutral-400">در حال بارگذاری...</td></tr> : projects.length === 0 ? <tr><td colSpan={7} className="py-8 text-black/60 dark:text-neutral-400">پروژه فعالی وجود ندارد.</td></tr> : projects.map((project) => <tr key={project.id} className="bg-black/[0.02] transition-colors hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10"><td className="border-b border-neutral-300 px-3 !text-right dark:border-neutral-700"><span className="block truncate" title={`${project.code} - ${project.name}`}>{fa(project.code)} - {project.name}</span></td>{months.slice(half * 6, half * 6 + 6).map((month, index) => {
              const monthNumber = half * 6 + index + 1;
              const key = keyOf(year, project.id, monthNumber);
              const total = isGeneral(project) ? monthTotals[monthNumber - 1] : null;
              const overLimit = monthTotals[monthNumber - 1] > 100n || Object.keys(status).some((entry) => status[entry] === "limit" && entry.startsWith(`${year}:`) && entry.endsWith(`:${monthNumber}`));
              return <td key={key} className={`border-b border-neutral-300 px-1 dark:border-neutral-700 ${overLimit ? "bg-red-50 dark:bg-red-950/30" : ""}`}>{total !== null ? <span className={`inline-flex h-6 items-center justify-center gap-1 font-semibold ${overLimit ? "text-red-600 dark:text-red-400" : ""}`} dir="ltr">{display(total)}<span>٪</span></span> : <div className="relative"><input aria-label={`${project.name}، ${month} ${fa(year)}، درصد`} aria-invalid={overLimit || status[key] === "error"} inputMode="numeric" readOnly={savedValues[key] != null && savedValues[key] !== "" && !editingMonths.has(Number(key.split(":").at(-1))) && focusedKey !== key && !Object.hasOwn(drafts.current, key)} onFocus={(event) => { if (!event.target.readOnly) setFocusedKey(key); }} value={display(values[key] ?? "")} onChange={(event) => changeValue(key, event.target.value)} onBlur={() => { setFocusedKey(null); if (Object.hasOwn(drafts.current, key)) saveCell(key); }} className={`h-6 w-full rounded-lg border bg-white px-5 text-center outline-none focus:border-blue-400 read-only:cursor-default read-only:bg-neutral-100 dark:read-only:bg-neutral-800 dark:bg-neutral-900 ${status[key] === "error" || overLimit ? "border-red-500" : "border-black/15 dark:border-neutral-700"}`} /><span aria-hidden="true" className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">٪</span></div>}<span className="sr-only" role="status">{status[key] === "error" ? "خطا در ذخیره" : status[key] === "saving" ? "در حال ذخیره" : ""}</span></td>;
            })}</tr>)}
          </tbody></table></div></div>
          <div className="mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-black/10 pb-4 pt-3 dark:border-white/10">{Object.values(status).includes("error") && <span role="alert" className="text-xs text-red-600">ذخیره برخی مقادیر انجام نشد؛ برای تلاش دوباره دکمه ذخیره را بزنید.</span>}<button type="button" onClick={saveAll} aria-label="ذخیره" title="ذخیره" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black text-white transition hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"><img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" /></button></div>
        </div></div>
      </div>
    </Card>
  );
}
