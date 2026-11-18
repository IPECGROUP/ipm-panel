import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../components/AuthProvider.jsx";
import { api } from "../utils/api.js";

const months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const digits = (value) => String(value).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
const fa = (value) => String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
const display = (value) => fa(String(value ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, ","));
const currentYear = () => Math.min(1420, Math.max(1401, Number(digits(new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date())))));
const cellKey = (year, currencyId, sourceId, month) => `${year}:${currencyId}:${sourceId}:${month}`;

export default function ProjectExchangeRatesTab() {
  const { user } = useAuth();
  const draftKey = `project-exchange-rate-drafts:${user?.id}`;
  const [year, setYear] = useState(currentYear);
  const [currencies, setCurrencies] = useState([]);
  const [sources, setSources] = useState([]);
  const [values, setValues] = useState({});
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const drafts = useRef({});
  const timers = useRef({});
  const running = useRef({});
  const mounted = useRef(true);

  const saveCell = useCallback(async (key) => {
    clearTimeout(timers.current[key]);
    if (running.current[key]) return running.current[key];
    const task = (async () => {
      while (Object.hasOwn(drafts.current, key)) {
        const rate = drafts.current[key];
        const [saveYear, currencyId, sourceId, month] = key.split(":").map(Number);
        if (mounted.current) setStatus((prev) => ({ ...prev, [key]: "saving" }));
        try {
          await api("/project-exchange-rates", { method: "PUT", body: JSON.stringify({ year: saveYear, currencyId, sourceId, month, rate }), keepalive: true });
          if (drafts.current[key] === rate) {
            delete drafts.current[key];
            try { localStorage.setItem(draftKey, JSON.stringify(drafts.current)); } catch { /* Server storage remains available. */ }
            if (mounted.current) setStatus((prev) => ({ ...prev, [key]: "saved" }));
          }
        } catch {
          if (mounted.current) setStatus((prev) => ({ ...prev, [key]: "error" }));
          return false;
        }
      }
      return true;
    })();
    running.current[key] = task;
    try { return await task; } finally { delete running.current[key]; }
  }, [draftKey]);

  useEffect(() => {
    mounted.current = true;
    try { drafts.current = JSON.parse(localStorage.getItem(draftKey) || "{}") || {}; } catch { drafts.current = {}; }
    const beforeUnload = (event) => { if (Object.keys(drafts.current).length) { event.preventDefault(); event.returnValue = ""; } };
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
    Promise.all(Object.keys(drafts.current).map(saveCell)).then(() => api(`/project-exchange-rates?year=${year}`)).then((data) => {
      if (cancelled) return;
      const next = {};
      (data.rates || []).forEach((row) => { next[cellKey(year, row.currencyId, row.sourceId, row.month)] = row.rate; });
      Object.entries(drafts.current).forEach(([key, value]) => { if (key.startsWith(`${year}:`)) next[key] = value; });
      setValues(next); setCurrencies(data.currencies || []); setSources(data.sources || []);
    }).catch(() => { if (!cancelled) setError("دریافت نرخ‌های تبدیل ارز انجام نشد."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year, saveCell]);

  const changeValue = (key, raw) => {
    const value = digits(raw).replace(/[^\d]/g, "").slice(0, 18);
    setValues((prev) => ({ ...prev, [key]: value }));
    drafts.current[key] = value;
    try { localStorage.setItem(draftKey, JSON.stringify(drafts.current)); } catch { /* Server storage remains available. */ }
    setStatus((prev) => ({ ...prev, [key]: "pending" }));
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => saveCell(key), 600);
  };
  const saveAll = async () => {
    setError("");
    const results = await Promise.all(Object.keys(drafts.current).map(saveCell));
    if (results.some((result) => !result)) setError("ذخیره برخی نرخ‌ها انجام نشد؛ برای تلاش دوباره دکمه ذخیره را بزنید.");
  };

  return <div className="rounded-2xl border border-black/10 bg-white pt-4 dark:border-neutral-800 dark:bg-neutral-900">
    <div className="px-4 pb-4"><label className="flex items-center gap-2 text-sm font-semibold">سال <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="h-10 rounded-xl border border-black/15 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-900">{Array.from({ length: 20 }, (_, index) => 1401 + index).map((item) => <option key={item} value={item}>{fa(item)}</option>)}</select></label></div>
    {error && <p role="alert" className="px-4 pb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    <div className="mx-4 mb-4 overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"><div className="relative max-h-[55vh] overflow-auto" dir="ltr"><table dir="rtl" className="w-full min-w-[1280px] table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:min-w-0 [&_td]:text-center"><colgroup><col style={{ width: 200 }} />{months.map((month) => <col key={month} style={{ width: 90 }} />)}</colgroup><thead><tr className="border-b border-[#184a6b] bg-[#184a6b] text-white"><th className="sticky top-0 z-30 bg-[#184a6b] px-3 py-2 !text-right text-[14px] font-semibold md:text-[15px]">ارز - منشأ</th>{months.map((month) => <th key={month} className="sticky top-0 z-30 bg-[#184a6b] py-2 text-[14px] font-semibold md:text-[15px]">{month}</th>)}</tr></thead><tbody className="text-[13px] text-black [&>tr]:h-9 dark:text-neutral-100">
      {loading ? <tr><td colSpan={13} className="py-8 text-black/60 dark:text-neutral-400">در حال بارگذاری...</td></tr> : !currencies.length || !sources.length ? <tr><td colSpan={13} className="py-8 text-black/60 dark:text-neutral-400">نوع ارز و منشأ ارز را در اطلاعات پایه ثبت کنید.</td></tr> : currencies.flatMap((currency) => sources.map((source) => <tr key={`${currency.id}:${source.id}`} className="bg-black/[0.02] transition-colors hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10"><td className="border-b border-neutral-300 px-3 !text-right dark:border-neutral-700"><span className="block truncate" title={`${currency.title} - ${source.title}`}><bdi>{currency.title}</bdi> - {source.title}</span></td>{months.map((month, index) => {
        const key = cellKey(year, currency.id, source.id, index + 1);
        return <td key={key} className="border-b border-neutral-300 px-1 dark:border-neutral-700"><input aria-label={`${currency.title}، ${source.title}، ${month} ${fa(year)}`} inputMode="numeric" value={display(values[key] ?? "")} onChange={(event) => changeValue(key, event.target.value)} onBlur={() => { if (Object.hasOwn(drafts.current, key)) saveCell(key); }} className={`h-6 w-full rounded-lg border bg-white px-2 text-center outline-none focus:border-blue-400 dark:bg-neutral-900 ${status[key] === "error" ? "border-red-500" : "border-black/15 dark:border-neutral-700"}`} /><span className="sr-only" role="status">{status[key] === "error" ? "خطا در ذخیره" : status[key] === "saving" ? "در حال ذخیره" : ""}</span></td>;
      })}</tr>))}
    </tbody></table></div></div>
    <div className="mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-black/10 pb-4 pt-3 dark:border-white/10">{Object.values(status).includes("error") && <span role="alert" className="text-xs text-red-600">ذخیره برخی نرخ‌ها انجام نشد؛ برای تلاش دوباره دکمه ذخیره را بزنید.</span>}<button type="button" onClick={saveAll} aria-label="ذخیره" title="ذخیره" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black text-white transition hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"><img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" /></button></div>
  </div>;
}
