import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";
import { baseCurrenciesTablePreset as tableUi } from "../components/ui/tablePresets.js";
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
  const [year, setYear] = useState(currentYear);
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
      setValues(next); setProjects(data.projects || []);
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
  const yearNow = currentYear();
  const years = Array.from({ length: 41 }, (_, index) => yearNow - 20 + index);

  return (
    <Card className="rounded-2xl border bg-white p-7 text-neutral-900 border-neutral-200 md:p-8 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
      <div className="mb-5 flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]"><img src="/images/icons/parametr.svg" alt="" className="h-6 w-6 dark:invert" /></span>
        <span className="min-w-0"><span className="block truncate text-base font-bold md:text-lg">پارامتر های مالی پروژه ها</span><span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت پروژه</span></span>
      </div>
      <div dir="rtl">
        <div className="overflow-visible px-0 sm:px-2">
          <div className="mb-0 flex w-full items-center justify-start gap-1 overflow-x-auto rounded-xl border border-black/10 bg-black/[0.03] p-1 md:mx-auto md:-mb-px md:max-w-[780px] md:items-stretch md:justify-center md:gap-0 md:rounded-b-none md:rounded-t-2xl md:border-b-0 md:bg-white md:p-0 md:shadow-sm dark:border-neutral-800 dark:bg-white/[0.04] md:dark:bg-neutral-900">
            {tabs.map((item, index) => <button key={item.id} type="button" onClick={() => setTab(item.id)} aria-pressed={tab === item.id} className={`relative z-10 h-10 min-w-[150px] flex-none rounded-lg px-3 text-xs font-semibold transition whitespace-nowrap md:h-11 md:flex-1 md:rounded-none md:px-4 md:text-sm ${index ? "md:border-r md:border-black/10 md:dark:border-neutral-800 md:rounded-tl-2xl" : "md:rounded-tr-2xl"} ${tab === item.id ? "bg-black text-white shadow-sm dark:bg-black" : "bg-white text-[#1f2937] hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"}`}>{item.label}</button>)}
          </div>
        </div>
        {tab === "rates" ? <div className="min-h-[320px] rounded-2xl border border-black/10 bg-white dark:border-neutral-800 dark:bg-neutral-900" /> : <div className="rounded-2xl border border-black/10 bg-white pt-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center gap-4 px-4 pb-4">
            <label className="flex items-center gap-2 text-sm font-semibold">سال <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="h-10 rounded-xl border border-black/15 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-900">{years.map((item) => <option key={item} value={item}>{fa(item)}</option>)}</select></label>
            <div className="flex items-center gap-2">
              <button type="button" disabled={half === 0} onClick={() => setHalf(0)} aria-label="شش ماه اول" className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 bg-white disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900"><ChevronRight size={18} /></button>
              <span className="min-w-[150px] text-center text-sm font-semibold">{half === 0 ? "فروردین تا شهریور" : "مهر تا اسفند"}</span>
              <button type="button" disabled={half === 1} onClick={() => setHalf(1)} aria-label="شش ماه دوم" className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 bg-white disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900"><ChevronLeft size={18} /></button>
            </div>
          </div>
          {error && <p role="alert" className="px-4 pb-3 text-sm text-red-600">{error}</p>}
          <TableWrap><div className={tableUi.outer}><div className={tableUi.innerPad}><div className={`${tableUi.frame} shadow-sm`}><div className="overflow-x-auto"><table className="w-full min-w-[900px] table-fixed text-sm" dir="rtl"><THead><tr className={tableUi.headRow}><TH className={tableUi.th}>پروژه</TH>{months.slice(half * 6, half * 6 + 6).map((month) => <TH key={month} className={tableUi.th}>{month}</TH>)}</tr></THead><tbody className={tableUi.body}>
            {loading ? <TR><TD className={tableUi.emptyRow}>در حال بارگذاری...</TD></TR> : projects.length === 0 ? <TR><TD className={tableUi.emptyRow}>پروژه فعالی وجود ندارد.</TD></TR> : projects.map((project) => <TR key={project.id}><TD className="px-3 py-2 text-center font-semibold">{project.name}</TD>{months.slice(half * 6, half * 6 + 6).map((month, index) => { const key = keyOf(year, project.id, half * 6 + index + 1); return <TD key={key} className="px-1 py-2 text-center"><input aria-label={`${project.name}، ${month} ${fa(year)}`} inputMode="numeric" value={display(values[key] ?? "")} onChange={(event) => changeValue(key, event.target.value)} onBlur={() => { if (Object.hasOwn(drafts.current, key)) saveCell(key); }} className={`h-9 w-full rounded-lg border bg-white px-2 text-center outline-none focus:border-blue-400 dark:bg-neutral-900 ${status[key] === "error" ? "border-red-500" : "border-black/15 dark:border-neutral-700"}`} /><span className="sr-only" role="status">{status[key] === "error" ? "خطا در ذخیره" : status[key] === "saving" ? "در حال ذخیره" : ""}</span></TD>; })}</TR>)}
          </tbody></table></div></div></div></div></TableWrap>
          <div className="flex flex-wrap items-center gap-3 px-4 pb-4"><button type="button" onClick={saveAll} className="rounded-xl bg-black px-6 py-2 text-sm font-semibold text-white hover:bg-neutral-800">ذخیره</button><span className="text-xs text-neutral-500 dark:text-neutral-400">مقادیر به صورت خودکار ذخیره می‌شوند.</span>{Object.values(status).includes("error") && <span role="alert" className="text-xs text-red-600">ذخیره برخی مقادیر انجام نشد؛ برای تلاش دوباره دکمه ذخیره را بزنید.</span>}</div>
        </div>}
      </div>
    </Card>
  );
}
