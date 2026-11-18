import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import UnifiedTagPicker from "../components/UnifiedTagPicker.jsx";
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
const amountToMinorUnits = (value) => {
  const match = String(value ?? "").match(/^(\d+)(?:\.(\d{1,2}))?$/);
  return match ? BigInt(match[1]) * 100n + BigInt(String(match[2] || "").padEnd(2, "0")) : null;
};
const formatMinorUnits = (amount) => {
  const whole = amount / 100n;
  const fraction = String(amount % 100n).padStart(2, "0");
  return fa(`${String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction === "00" ? "" : `.${fraction}`}`);
};
const inputClass = "h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-[#184a6b] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100";

export default function FinancialCommitmentsPage() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [rows, setRows] = useState([]);
  const [start, setStart] = useState(null);
  const [currencyLabels, setCurrencyLabels] = useState([]);
  const [contractCurrencies, setContractCurrencies] = useState([]);
  const [monthlyUsage, setMonthlyUsage] = useState({});
  const [exchangeRates, setExchangeRates] = useState([]);
  const [year, setYear] = useState(null);
  const [half, setHalf] = useState(0);
  const [expanded, setExpanded] = useState(new Set());
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [tagError, setTagError] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usageError, setUsageError] = useState("");

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
    api("/tags").then((result) => { if (active) setTags(Array.isArray(result?.items) ? result.items : []); })
      .catch(() => { if (active) setTagError("دریافت برچسب‌ها انجام نشد."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setRows([]); setStart(null); setCurrencyLabels([]); setContractCurrencies([]); setMonthlyUsage({}); setExchangeRates([]); setYear(null); setError(""); setUsageError("");
    if (!projectId) { setLoading(false); return () => { active = false; }; }
    setLoading(true);
    Promise.all([api(`/cost-breakdown?project_id=${encodeURIComponent(projectId)}`), api(`/contracts?projectId=${encodeURIComponent(projectId)}&documentType=main`), api("/base/currencies/types")])
      .then(([breakdown, contracts, currencies]) => {
        if (!active) return;
        setRows(Array.isArray(breakdown?.items) ? breakdown.items : []);
        const mainContracts = (Array.isArray(contracts?.items) ? contracts.items : [])
          .filter((item) => String(item.projectId ?? item.project_id) === projectId && (item.documentType ?? item.document_type) === "main" && !(item.parentContractId ?? item.parent_contract_id))
          .map((item) => ({ item, start: parseStart(item.calendar?.startDate) })).filter(({ start: date }) => date)
          .sort((a, b) => a.start.year - b.start.year || a.start.month - b.start.month || a.start.day - b.start.day);
        if (mainContracts.length) {
          const { item, start: contractStart } = mainContracts[0];
          setStart(contractStart); setYear(contractStart.year); setHalf(contractStart.month > 6 ? 1 : 0);
          const currencyById = new Map((Array.isArray(currencies?.items) ? currencies.items : []).map((currency) => [String(currency.id), String(currency.title ?? currency.label ?? "").trim()]));
          const contractAmounts = Array.isArray(item.financial?.contractAmounts) ? item.financial.contractAmounts : [];
          const contractCurrencyRows = contractAmounts.map((amount) => ({
            currencyId: String(amount.currencyId ?? amount.currency_id ?? ""),
            sourceId: String(amount.sourceId ?? amount.currencySourceId ?? amount.source_id ?? ""),
            label: String(amount.currencyLabel ?? amount.currency_label ?? "").trim() || currencyById.get(String(amount.currencyId ?? amount.currency_id ?? "")) || "",
            isRial: (amount.currencyIsRial ?? amount.currency_is_rial) === true,
          })).filter((currency) => currency.currencyId || currency.label);
          setContractCurrencies(contractCurrencyRows);
          const labels = contractCurrencyRows.map((currency) => currency.label).filter(Boolean);
          setCurrencyLabels([...new Set(labels)]);
        }
      }).catch(() => { if (active) setError("دریافت ساختار هزینه، قرارداد اصلی یا فهرست ارزها انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    let active = true;
    setMonthlyUsage({});
    setExchangeRates([]);
    setUsageError("");
    if (!projectId || !year) return () => { active = false; };
    api(`/cost-breakdown?project_id=${encodeURIComponent(projectId)}&consumption_year=${year}`)
      .then((result) => {
        if (!active) return;
        setMonthlyUsage(result?.monthlyRealizedUsageByCode || {});
        setExchangeRates(Array.isArray(result?.exchangeRates) ? result.exchangeRates : []);
      })
      .catch(() => { if (active) setUsageError("دریافت مصرف ماهانه یا نرخ‌های ارز انجام نشد."); });
    return () => { active = false; };
  }, [projectId, year]);

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
  useEffect(() => setExpanded(new Set(parents)), [parents]);
  const normalizedQuery = digits(query).trim().toLocaleLowerCase("fa");
  const matchingCodes = useMemo(() => {
    const directMatches = new Set(displayRows.filter((row) => {
      const text = digits(`${row.code} ${row.name} ${project?.code || ""} ${project?.name || ""}`).toLocaleLowerCase("fa");
      const tagMatches = selectedTagIds.every((id) => {
        const label = tags.find((tag) => String(tag.id) === id)?.label;
        return label && text.includes(digits(label).toLocaleLowerCase("fa"));
      });
      return tagMatches && (!normalizedQuery || text.includes(normalizedQuery));
    }).map((row) => row.code));
    const result = new Set(directMatches);
    directMatches.forEach((code) => {
      const parts = code.split("-");
      for (let index = 1; index < parts.length; index += 1) result.add(parts.slice(0, index).join("-"));
    });
    return result;
  }, [displayRows, normalizedQuery, selectedTagIds, tags, project]);
  const visibleRows = displayRows.filter(({ code }) => {
    if (!matchingCodes.has(code)) return false;
    const parts = code.split("-");
    for (let i = 1; i < parts.length; i += 1) { const parent = parts.slice(0, i).join("-"); if (!normalizedQuery && !selectedTagIds.length && parents.has(parent) && !expanded.has(parent)) return false; }
    return true;
  });
  const visibleMonths = months.map((name, index) => ({ name, number: index + 1 })).filter(({ number }) => Math.floor((number - 1) / 6) === half && (year > start?.year || number >= start?.month));
  const currencyLabel = currencyLabels.length === 1 ? currencyLabels[0] : "";
  const distinctCurrencies = [...new Map(contractCurrencies.map((currency) => [`${currency.currencyId}:${currency.sourceId}`, currency])).values()];
  const contractCurrency = distinctCurrencies.length === 1 ? distinctCurrencies[0] : null;
  const isRial = contractCurrency && (contractCurrency.isRial || /ریال|rial/i.test(contractCurrency.label));
  const monthlyUsageByCode = useMemo(() => {
    const result = new Map();
    Object.entries(monthlyUsage).forEach(([rawCode, values]) => {
      const code = normalizeCode(rawCode);
      const fullCode = projectCode && code !== projectCode && !code.startsWith(`${projectCode}-`) ? `${projectCode}-${code}` : code;
      if (fullCode) result.set(fullCode, values);
    });
    return result;
  }, [monthlyUsage, projectCode]);
  const consumptionFor = (code, month) => {
    const rialAmount = amountToMinorUnits(monthlyUsageByCode.get(code)?.[month]);
    if (rialAmount == null || !contractCurrency) return "";
    if (isRial) return formatMinorUnits(rialAmount);
    const rate = exchangeRates.find((item) => String(item.currencyId) === contractCurrency.currencyId && String(item.sourceId) === contractCurrency.sourceId && Number(item.month) === month)?.rate;
    if (!rate || !/^\d+$/.test(String(rate)) || BigInt(rate) === 0n) return "";
    const divisor = BigInt(rate);
    return formatMinorUnits((rialAmount + divisor / 2n) / divisor);
  };
  const missingRateMonths = contractCurrency && !isRial ? [...new Set(Object.values(monthlyUsage)
    .flatMap((values) => Object.keys(values || {}).map(Number))
    .filter((month) => {
      const rate = exchangeRates.find((item) => String(item.currencyId) === contractCurrency.currencyId && String(item.sourceId) === contractCurrency.sourceId && Number(item.month) === month)?.rate;
      return !rate || !/^\d+$/.test(String(rate)) || BigInt(rate) === 0n;
    }))].sort((a, b) => a - b) : [];
  const changeYear = (next) => { setYear(next); if (next === start.year && start.month > 6) setHalf(1); };

  return <Card dir="rtl" className="mx-auto max-w-[1400px] rounded-2xl border border-black/10 bg-white p-2.5 text-neutral-900 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 sm:rounded-3xl sm:p-3 md:p-4">
    <div className="mb-4 flex min-w-0 items-center gap-3 border-b border-black/[0.07] px-0.5 pb-3 dark:border-white/10 sm:mb-5 sm:pb-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04]"><span aria-hidden="true" className="h-6 w-6 bg-[#184a6b] dark:bg-[#8fc4e3]" style={{ WebkitMask: "url(/images/icons/control-hazine.svg) center / contain no-repeat", mask: "url(/images/icons/control-hazine.svg) center / contain no-repeat" }} /></span>
      <span><span className="block text-base font-bold text-[#184a6b] dark:text-[#8fc4e3] md:text-lg">کنترل هزینه ها</span><span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت پروژه</span></span>
    </div>
    <div className="mb-4 space-y-2 rounded-2xl border border-neutral-200 bg-neutral-100/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">جست و جو<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجو در پروژه، کد و نام بودجه..." className={`${inputClass} mt-1 h-11`} /></label>
      <div><div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">برچسب ها</div><div className="flex flex-wrap items-center gap-2">
        {selectedTagIds.map((id) => { const tag = tags.find((item) => String(item.id) === id); return <button key={id} type="button" onClick={() => setSelectedTagIds((current) => current.filter((value) => value !== id))} title="حذف برچسب از فیلتر" className="inline-flex rounded-full bg-[#184a6b] px-3 py-1.5 text-xs font-medium text-white shadow-sm">{tag?.label || `برچسب ${fa(id)}`} ×</button>; })}
        <button type="button" onClick={() => setTagPickerOpen(true)} aria-label="افزودن برچسب" title="افزودن برچسب" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"><img src="/images/icons/sayer.svg" alt="" className="h-5 w-5 dark:invert" /></button>
      </div></div>
      {tagError && <p role="alert" className="text-xs text-red-600">{tagError}</p>}
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
        <div className="grid grid-cols-1 items-center gap-3 px-4 pb-4 sm:grid-cols-[1fr_auto_1fr]">
          <label className="flex items-center gap-2 text-sm font-semibold">سال <select value={year} onChange={(event) => changeYear(Number(event.target.value))} className="h-10 rounded-xl border border-black/15 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-900">{Array.from({ length: Math.max(1420, start.year + 19) - start.year + 1 }, (_, index) => start.year + index).map((item) => <option key={item} value={item}>{fa(item)}</option>)}</select></label>
          <div className="flex items-center justify-center gap-2"><button type="button" disabled={half === 0 || (year === start.year && start.month > 6)} onClick={() => setHalf(0)} aria-label="شش ماه اول" className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 disabled:opacity-40 dark:border-neutral-700"><ChevronRight size={18} /></button><span className="min-w-[150px] text-center text-sm font-semibold">{half === 0 ? "فروردین تا شهریور" : "مهر تا اسفند"}</span><button type="button" disabled={half === 1} onClick={() => setHalf(1)} aria-label="شش ماه دوم" className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 disabled:opacity-40 dark:border-neutral-700"><ChevronLeft size={18} /></button></div>
        </div>
        <p className="px-4 pb-3 text-xs text-neutral-600 dark:text-neutral-400">{distinctCurrencies.length > 1 ? "در مبلغ قرارداد اصلی چند ترکیب ارز و منشأ ثبت شده است؛ واحد مصرف باید مشخص شود." : currencyLabel ? `واحد مبالغ این پروژه: ${currencyLabel}` : "ارز مبلغ قرارداد اصلی ثبت نشده است."}</p>
        {usageError && <p role="alert" className="px-4 pb-3 text-xs text-red-600">{usageError}</p>}
        {missingRateMonths.length > 0 && <p role="status" className="px-4 pb-3 text-xs text-amber-700 dark:text-amber-400">نرخ {currencyLabel} با منشأ قرارداد برای {missingRateMonths.map((month) => months[month - 1]).join("، ")} سال {fa(year)} در پارامترهای مالی پروژه‌ها ثبت نشده است؛ مبلغ این ماه‌ها نمایش داده نمی‌شود.</p>}
        <div className="mx-4 mb-4 overflow-hidden rounded-2xl border border-black/10 dark:border-neutral-800"><div className="relative max-h-[55vh] overflow-auto" dir="ltr"><table dir="rtl" className="w-full min-w-[800px] table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:text-center"><colgroup><col style={{ width: "34%" }} />{visibleMonths.map((month) => <col key={month.number} />)}</colgroup><thead><tr className="bg-[#184a6b] text-white"><th className="sticky top-0 z-10 bg-[#184a6b] px-3 py-2 !text-right text-[14px] font-semibold md:text-[15px]">کد و نام بودجه</th>{visibleMonths.map((month) => <th key={month.number} className="sticky top-0 z-10 bg-[#184a6b] py-2 text-[14px] font-semibold md:text-[15px]">{month.name}</th>)}</tr></thead><tbody className="text-[13px] text-black dark:text-neutral-100">{visibleRows.length === 0 ? <tr><td colSpan={visibleMonths.length + 1} className="py-8 text-neutral-500">{query || selectedTagIds.length ? "موردی مطابق جستجو یا برچسب انتخاب‌شده یافت نشد." : "ساختار هزینه‌ای برای این پروژه ثبت نشده است."}</td></tr> : visibleRows.map((row) => <tr key={row.id ?? row.code} className="h-9 bg-black/[0.02] hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10"><td className="border-b border-neutral-300 px-3 !text-right dark:border-neutral-700"><div className="flex items-center gap-1" style={{ paddingRight: `${Math.max(0, row.code.split('-').length - projectCode.split('-').length - 1) * 16}px` }}>{parents.has(row.code) ? <button type="button" aria-label={`${expanded.has(row.code) ? "بستن" : "باز کردن"} ${row.name}`} onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(row.code)) next.delete(row.code); else next.add(row.code); return next; })} className="w-5 text-center">{expanded.has(row.code) ? "−" : "+"}</button> : <span className="w-5" />}<span dir="ltr" className="shrink-0">{fa(row.code)}</span><span className="truncate">{row.name}</span></div></td>{visibleMonths.map((month) => <td key={month.number} className="border-b border-neutral-300 px-1 py-1 dark:border-neutral-700"><div className="relative"><input readOnly value={consumptionFor(row.code, month.number)} aria-label={`${row.name}، ${month.name} ${fa(year)}، ${currencyLabel || "ارز نامشخص"}`} className="h-7 w-full rounded-lg border border-black/10 bg-white px-2 pl-16 text-center text-xs text-neutral-900 outline-none dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100" /><span aria-hidden="true" className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-500 dark:text-neutral-400">{currencyLabel || "—"}</span></div></td>)}</tr>)}</tbody></table></div></div>
      </>}
    </div>
    {tagPickerOpen && <UnifiedTagPicker selectedIds={selectedTagIds} onClose={() => setTagPickerOpen(false)} onConfirm={(ids) => { setSelectedTagIds(ids); setTagPickerOpen(false); }} />}
  </Card>;
}
