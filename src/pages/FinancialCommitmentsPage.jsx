import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import { api } from "../utils/api.js";

const months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const digits = (value = "") => String(value).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
const fa = (value) => String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
const normalizeCode = (value = "") => digits(value).trim().replace(/[^\d.-]/g, "-").replace(/[.-]+/g, "-").replace(/^-|-$/g, "");
const parseStart = (value) => {
  const match = digits(value).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > (month <= 6 ? 31 : 30)) return null;
  return { year, month, day };
};
const inputClass = "h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-[#184a6b] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100";

export default function FinancialCommitmentsPage() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [rows, setRows] = useState([]);
  const [start, setStart] = useState(null);
  const [year, setYear] = useState(null);
  const [half, setHalf] = useState(0);
  const [expanded, setExpanded] = useState(new Set());
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api("/projects").then((result) => {
      const source = Array.isArray(result) ? result : result?.items || [];
      if (active) setProjects(source.filter((p) => p && (p.isActive ?? true) && /^\d{3}$/.test(digits(p.code || "").trim())).map((p) => ({ id: String(p.id), code: digits(p.code).trim(), name: String(p.name || "").trim() })).sort((a, b) => a.code.localeCompare(b.code, "fa", { numeric: true })));
    }).catch(() => { if (active) setError("دریافت فهرست پروژه‌ها انجام نشد."); })
      .finally(() => { if (active) setLoadingProjects(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setRows([]); setStart(null); setYear(null); setQuery(""); setSelectedTag(""); setError("");
    if (!projectId) { setLoading(false); return () => { active = false; }; }
    setLoading(true);
    Promise.all([api(`/cost-breakdown?project_id=${encodeURIComponent(projectId)}`), api(`/contracts?projectId=${encodeURIComponent(projectId)}&documentType=main`)])
      .then(([breakdown, contracts]) => {
        if (!active) return;
        setRows(Array.isArray(breakdown?.items) ? breakdown.items : []);
        const starts = (Array.isArray(contracts?.items) ? contracts.items : [])
          .filter((item) => String(item.projectId ?? item.project_id) === projectId && (item.documentType ?? item.document_type) === "main" && !(item.parentContractId ?? item.parent_contract_id))
          .map((item) => parseStart(item.calendar?.startDate)).filter(Boolean)
          .sort((a, b) => a.year - b.year || a.month - b.month || a.day - b.day);
        if (starts.length) { setStart(starts[0]); setYear(starts[0].year); setHalf(starts[0].month > 6 ? 1 : 0); }
      }).catch(() => { if (active) setError("دریافت ساختار هزینه یا اطلاعات قرارداد اصلی انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  const project = projects.find((item) => item.id === projectId);
  const projectCode = normalizeCode(project?.code);
  const displayRows = useMemo(() => rows.map((row) => {
    const code = normalizeCode(row.budgetCode ?? row.budget_code ?? "");
    return { id: row.id, code: projectCode && code !== projectCode && !code.startsWith(`${projectCode}-`) ? `${projectCode}-${code}` : code, name: String(row.budgetName ?? row.budget_name ?? "") };
  }).filter((row) => row.code).sort((a, b) => a.code.localeCompare(b.code, "fa", { numeric: true })), [rows, projectCode]);
  const parents = useMemo(() => {
    const codes = new Set(displayRows.map((row) => row.code));
    const result = new Set();
    displayRows.forEach(({ code }) => { const parts = code.split("-"); for (let i = 1; i < parts.length; i += 1) { const parent = parts.slice(0, i).join("-"); if (codes.has(parent)) result.add(parent); } });
    return result;
  }, [displayRows]);
  const budgetTags = useMemo(() => displayRows.filter((row) => !row.code.includes("-")), [displayRows]);
  useEffect(() => setExpanded(new Set(parents)), [parents]);
  const normalizedQuery = digits(query).trim().toLocaleLowerCase("fa");
  const matchingCodes = useMemo(() => {
    const directMatches = new Set(displayRows.filter((row) => {
      const tagMatches = !selectedTag || row.code === selectedTag || row.code.startsWith(`${selectedTag}-`);
      const text = `${row.code} ${row.name}`.toLocaleLowerCase("fa");
      return tagMatches && (!normalizedQuery || text.includes(normalizedQuery));
    }).map((row) => row.code));
    const result = new Set(directMatches);
    directMatches.forEach((code) => {
      const parts = code.split("-");
      for (let index = 1; index < parts.length; index += 1) result.add(parts.slice(0, index).join("-"));
    });
    return result;
  }, [displayRows, normalizedQuery, selectedTag]);
  const visibleRows = displayRows.filter(({ code }) => {
    if (!matchingCodes.has(code)) return false;
    const parts = code.split("-");
    for (let i = 1; i < parts.length; i += 1) { const parent = parts.slice(0, i).join("-"); if (parents.has(parent) && !expanded.has(parent)) return false; }
    return true;
  });
  const visibleMonths = months.map((name, index) => ({ name, number: index + 1 })).filter(({ number }) => Math.floor((number - 1) / 6) === half && (year > start?.year || number >= start?.month));
  const changeYear = (next) => { setYear(next); if (next === start.year && start.month > 6) setHalf(1); };

  return <Card dir="rtl" className="mx-auto max-w-[1400px] rounded-2xl border border-black/10 bg-white p-2.5 text-neutral-900 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 sm:rounded-3xl sm:p-3 md:p-4">
    <div className="mb-4 flex min-w-0 items-center gap-3 border-b border-black/[0.07] px-0.5 pb-3 dark:border-white/10 sm:mb-5 sm:pb-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04]"><span aria-hidden="true" className="h-6 w-6 bg-[#184a6b] dark:bg-[#8fc4e3]" style={{ WebkitMask: "url(/images/icons/control-hazine.svg) center / contain no-repeat", mask: "url(/images/icons/control-hazine.svg) center / contain no-repeat" }} /></span>
      <span><span className="block text-base font-bold text-[#184a6b] dark:text-[#8fc4e3] md:text-lg">کنترل هزینه ها</span><span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت پروژه</span></span>
    </div>
    <div className="rounded-2xl border border-black/10 bg-white pt-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="grid gap-3 px-4 pb-4 sm:grid-cols-[minmax(220px,1fr)_auto] sm:items-end">
        <label className="flex max-w-md flex-col gap-1 text-sm font-semibold">پروژه<select value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={loadingProjects} className={inputClass}><option value="">{loadingProjects ? "در حال دریافت..." : "انتخاب کنید"}</option>{projects.map((item) => <option key={item.id} value={item.id}>{fa(item.code)} - {item.name}</option>)}</select></label>
        {start && <div className="text-sm text-neutral-600 dark:text-neutral-400">تاریخ شروع قرارداد اصلی: <span dir="ltr" className="font-semibold">{fa(`${start.year}/${String(start.month).padStart(2, "0")}/${String(start.day).padStart(2, "0")}`)}</span></div>}
      </div>
      {error && <p role="alert" className="px-4 pb-3 text-sm text-red-600">{error}</p>}
      {!error && !projectId && <p className="px-4 pb-5 text-sm text-neutral-500">پروژه را انتخاب کنید.</p>}
      {!error && projectId && loading && <p className="px-4 pb-5 text-sm text-neutral-500">در حال بارگذاری...</p>}
      {!error && projectId && !loading && !start && <p className="px-4 pb-5 text-sm text-neutral-500">تاریخ شروع قرارداد اصلی برای این پروژه ثبت نشده است.</p>}
      {!error && start && !loading && <>
        <div className="flex flex-col gap-3 border-t border-black/10 px-4 py-4 dark:border-white/10">
          <label className="w-full text-sm font-semibold sm:max-w-md">جستجو در کد و نام بودجه<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="نام یا کد بودجه را وارد کنید" className={`${inputClass} mt-1`} /></label>
          {budgetTags.length > 0 && <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">برچسب‌ها:</span><button type="button" onClick={() => setSelectedTag("")} className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${!selectedTag ? "border-[#184a6b] bg-[#184a6b] text-white" : "border-black/15 hover:bg-black/5 dark:border-neutral-700 dark:hover:bg-white/10"}`}>همه</button>{budgetTags.map((tag) => <button key={tag.code} type="button" onClick={() => setSelectedTag(tag.code)} title={tag.name} className={`max-w-[220px] truncate rounded-full border px-3 py-1 text-xs font-semibold transition ${selectedTag === tag.code ? "border-[#184a6b] bg-[#184a6b] text-white" : "border-black/15 hover:bg-black/5 dark:border-neutral-700 dark:hover:bg-white/10"}`}>{tag.name || fa(tag.code)}</button>)}</div>}
        </div>
        <div className="grid grid-cols-1 items-center gap-3 px-4 pb-4 sm:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-2 text-sm font-semibold"><span>سال</span><button type="button" onClick={() => changeYear(year - 1)} disabled={year <= start.year} aria-label="سال قبل" className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 disabled:opacity-40 dark:border-neutral-700"><ChevronRight size={18} /></button><span className="min-w-14 text-center tabular-nums">{fa(year)}</span><button type="button" onClick={() => changeYear(year + 1)} aria-label="سال بعد" className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 dark:border-neutral-700"><ChevronLeft size={18} /></button></div>
          <div className="flex items-center justify-center gap-2"><button type="button" disabled={half === 0 || (year === start.year && start.month > 6)} onClick={() => setHalf(0)} aria-label="شش ماه اول" className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 disabled:opacity-40 dark:border-neutral-700"><ChevronRight size={18} /></button><span className="min-w-[150px] text-center text-sm font-semibold">{half === 0 ? "فروردین تا شهریور" : "مهر تا اسفند"}</span><button type="button" disabled={half === 1} onClick={() => setHalf(1)} aria-label="شش ماه دوم" className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 disabled:opacity-40 dark:border-neutral-700"><ChevronLeft size={18} /></button></div>
        </div>
        <div className="mx-4 mb-4 overflow-hidden rounded-2xl border border-black/10 dark:border-neutral-800"><div className="relative max-h-[55vh] overflow-auto" dir="ltr"><table dir="rtl" className="w-full min-w-[800px] table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:text-center"><colgroup><col style={{ width: "34%" }} />{visibleMonths.map((month) => <col key={month.number} />)}</colgroup><thead><tr className="bg-[#184a6b] text-white"><th className="sticky top-0 z-10 bg-[#184a6b] px-3 py-2 !text-right text-[14px] font-semibold md:text-[15px]">کد و نام بودجه</th>{visibleMonths.map((month) => <th key={month.number} className="sticky top-0 z-10 bg-[#184a6b] py-2 text-[14px] font-semibold md:text-[15px]">{month.name}</th>)}</tr></thead><tbody className="text-[13px] text-black dark:text-neutral-100">{visibleRows.length === 0 ? <tr><td colSpan={visibleMonths.length + 1} className="py-8 text-neutral-500">{query || selectedTag ? "موردی مطابق جستجو یا برچسب انتخاب‌شده یافت نشد." : "ساختار هزینه‌ای برای این پروژه ثبت نشده است."}</td></tr> : visibleRows.map((row) => <tr key={row.id ?? row.code} className="h-9 bg-black/[0.02] hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10"><td className="border-b border-neutral-300 px-3 !text-right dark:border-neutral-700"><div className="flex items-center gap-1" style={{ paddingRight: `${Math.max(0, row.code.split('-').length - projectCode.split('-').length - 1) * 16}px` }}>{parents.has(row.code) ? <button type="button" aria-label={`${expanded.has(row.code) ? "بستن" : "باز کردن"} ${row.name}`} onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(row.code)) next.delete(row.code); else next.add(row.code); return next; })} className="w-5 text-center">{expanded.has(row.code) ? "−" : "+"}</button> : <span className="w-5" />}<span dir="ltr" className="shrink-0">{fa(row.code)}</span><span className="truncate">{row.name}</span></div></td>{visibleMonths.map((month) => <td key={month.number} className="border-b border-neutral-300 dark:border-neutral-700">—</td>)}</tr>)}</tbody></table></div></div>
      </>}
    </div>
  </Card>;
}
