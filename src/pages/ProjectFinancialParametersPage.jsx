import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import { api } from "../utils/api.js";
import { useAuth } from "../components/AuthProvider.jsx";

const months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const tabs = [{ id: "rates", label: "نرخ های تبدیل ارز" }, { id: "allocation", label: "تسهیم هزینه های پروژه" }];
const digits = (value) => String(value).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
const fa = (value) => String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
const display = (value) => fa(String(value ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, ","));
const currentYear = () => Number(digits(new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date())));
const keyOf = (year, projectId, month) => `${year}:${projectId}:${month}`;

export default function ProjectFinancialParametersPage() {
  const { user } = useAuth();
  const draftKey = `project-cost-allocation-drafts:${user?.id}`;
  const [tab, setTab] = useState("allocation");
  const [year, setYear] = useState(() => Math.min(1420, Math.max(1401, currentYear())));
  const [half, setHalf] = useState(0);
  const [projects, setProjects] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState({});
  const drafts = useRef({});
  const timers = useRef({});
  const running = useRef({});
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
          if (drafts.current[key] === amount) {
            delete drafts.current[key];
            persistDrafts();
            mark(key, "saved");
          }
        } catch {
          mark(key, "error");
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
    setLoading(true); setError("");
    Promise.all(Object.keys(drafts.current).map(saveCell)).then(() => api(`/project-cost-allocation?year=${year}`)).then((data) => {
      if (cancelled) return;
      const next = {};
      (data.values || []).forEach((row) => { next[keyOf(year, row.projectId, row.month)] = row.amount; });
      Object.entries(drafts.current).forEach(([key, value]) => { if (key.startsWith(`${year}:`)) next[key] = value; });
      const isGeneral = (project) => String(project.name || "").trim().replace(/ي/g, "ی").replace(/ك/g, "ک") === "عمومی";
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
    if (results.some((result) => !result)) setError("ذخیره برخی مقادیر انجام نشد؛ برای تلاش دوباره دکمه ذخیره را بزنید.");
  };
  const years = Array.from({ length: 20 }, (_, index) => 1401 + index);

  return (
    <Card dir="rtl" className="mx-auto max-w-[1400px] rounded-2xl border border-black/10 bg-white p-2.5 text-neutral-900 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 sm:rounded-3xl sm:p-3 md:p-4">
      <div className="mb-4 flex min-w-0 items-center gap-3 border-b border-black/[0.07] px-0.5 pb-3 dark:border-white/10 sm:mb-5 sm:pb-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 shadow-sm dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04] sm:h-11 sm:w-11 sm:rounded-2xl"><span aria-hidden="true" className="h-5 w-5 bg-[#184a6b] dark:bg-[#8fc4e3] sm:h-6 sm:w-6" style={{ WebkitMask: "url(/images/icons/parametr.svg) center / contain no-repeat", mask: "url(/images/icons/parametr.svg) center / contain no-repeat" }} /></span>
        <span className="min-w-0"><span className="block truncate text-base font-bold tracking-tight text-[#184a6b] dark:text-[#8fc4e3] md:text-lg">پارامتر های مالی پروژه ها</span><span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت پروژه</span></span>
      </div>
      <div dir="rtl">
        <div className="overflow-visible px-0 sm:px-2">
          <div className="mb-4 flex w-full items-center gap-1 overflow-x-auto rounded-2xl border border-black/10 bg-neutral-100/80 p-1.5 shadow-inner shadow-black/[0.03] dark:border-white/10 dark:bg-white/[.06] sm:mb-5 sm:w-fit" role="tablist" aria-label="پارامترهای مالی پروژه">
            {tabs.map((item) => <button key={item.id} type="button" role="tab" onClick={() => setTab(item.id)} aria-selected={tab === item.id} className={`h-10 shrink-0 rounded-xl px-4 text-sm font-semibold transition-all duration-200 sm:h-9 ${tab === item.id ? "bg-white text-neutral-950 shadow-sm ring-1 ring-black/[0.06] dark:bg-white dark:text-neutral-900" : "text-neutral-500 hover:bg-white/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[.08] dark:hover:text-white"}`}>{item.label}</button>)}
          </div>
        </div>
        {tab === "rates" ? <div className="min-h-[320px] rounded-2xl border border-black/10 bg-white dark:border-neutral-800 dark:bg-neutral-900" /> : <div className="rounded-2xl border border-black/10 bg-white pt-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="grid grid-cols-1 items-center gap-3 px-4 pb-4 sm:grid-cols-[1fr_auto_1fr]">
            <label className="flex items-center gap-2 text-sm font-semibold">سال <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="h-10 rounded-xl border border-black/15 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-900">{years.map((item) => <option key={item} value={item}>{fa(item)}</option>)}</select></label>
            <div className="flex items-center justify-center gap-2">
              <button type="button" disabled={half === 0} onClick={() => setHalf(0)} aria-label="شش ماه اول" className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 bg-white disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900"><ChevronRight size={18} /></button>
              <span className="min-w-[150px] text-center text-sm font-semibold">{half === 0 ? "فروردین تا شهریور" : "مهر تا اسفند"}</span>
              <button type="button" disabled={half === 1} onClick={() => setHalf(1)} aria-label="شش ماه دوم" className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 bg-white disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900"><ChevronLeft size={18} /></button>
            </div>
          </div>
          {error && <p role="alert" className="px-4 pb-3 text-sm text-red-600">{error}</p>}
          <div className="mx-4 mb-4 overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"><div className="relative max-h-[55vh] overflow-auto" dir="ltr"><table className="w-full min-w-[800px] table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:min-w-0 [&_td]:text-center" dir="rtl"><colgroup><col style={{ width: "5%" }} /><col style={{ width: "29%" }} />{months.slice(half * 6, half * 6 + 6).map((month) => <col key={month} style={{ width: "11%" }} />)}</colgroup><thead><tr className="border-b border-[#184a6b] bg-[#184a6b] text-white"><th className="sticky top-0 z-30 bg-[#184a6b] py-2 text-[14px] font-semibold md:text-[15px]">ردیف</th><th className="sticky top-0 z-30 bg-[#184a6b] px-3 py-2 !text-right text-[14px] font-semibold md:text-[15px]">پروژه</th>{months.slice(half * 6, half * 6 + 6).map((month) => <th key={month} className="sticky top-0 z-30 bg-[#184a6b] py-2 text-[14px] font-semibold md:text-[15px]">{month}</th>)}</tr></thead><tbody className="text-[13px] text-black [&>tr]:h-9 dark:text-neutral-100">
            {loading ? <tr><td colSpan={8} className="py-8 text-black/60 dark:text-neutral-400">در حال بارگذاری...</td></tr> : projects.length === 0 ? <tr><td colSpan={8} className="py-8 text-black/60 dark:text-neutral-400">پروژه فعالی وجود ندارد.</td></tr> : projects.map((project, rowIndex) => <tr key={project.id} className="bg-black/[0.02] transition-colors hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10"><td className="border-b border-neutral-300 px-1 dark:border-neutral-700">{fa(rowIndex + 1)}</td><td className="border-b border-neutral-300 px-3 !text-right dark:border-neutral-700"><span className="block truncate" title={project.name}>{project.name}</span></td>{months.slice(half * 6, half * 6 + 6).map((month, index) => { const key = keyOf(year, project.id, half * 6 + index + 1); return <td key={key} className="border-b border-neutral-300 px-1 dark:border-neutral-700"><input aria-label={`${project.name}، ${month} ${fa(year)}`} inputMode="numeric" value={display(values[key] ?? "")} onChange={(event) => changeValue(key, event.target.value)} onBlur={() => { if (Object.hasOwn(drafts.current, key)) saveCell(key); }} className={`h-7 w-full rounded-lg border bg-white px-2 text-center outline-none focus:border-blue-400 dark:bg-neutral-900 ${status[key] === "error" ? "border-red-500" : "border-black/15 dark:border-neutral-700"}`} /><span className="sr-only" role="status">{status[key] === "error" ? "خطا در ذخیره" : status[key] === "saving" ? "در حال ذخیره" : ""}</span></td>; })}</tr>)}
          </tbody></table></div></div>
          <div className="mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-black/10 pb-4 pt-3 dark:border-white/10">{Object.values(status).includes("error") && <span role="alert" className="text-xs text-red-600">ذخیره برخی مقادیر انجام نشد؛ برای تلاش دوباره دکمه ذخیره را بزنید.</span>}<button type="button" onClick={saveAll} aria-label="ذخیره" title="ذخیره" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black text-white transition hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"><img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" /></button></div>
        </div>}
      </div>
    </Card>
  );
}
