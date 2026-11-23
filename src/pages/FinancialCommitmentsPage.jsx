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
const amountToMinorUnits = (value) => {
  const match = String(value ?? "").match(/^(\d+)(?:\.(\d{1,2}))?$/);
  return match ? BigInt(match[1]) * 100n + BigInt(String(match[2] || "").padEnd(2, "0")) : null;
};
const formatMinorUnits = (amount) => {
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const whole = absolute / 100n;
  const fraction = String(absolute % 100n).padStart(2, "0");
  return fa(`${negative ? "-" : ""}${String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction === "00" ? "" : `.${fraction}`}`);
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
  const [showMonths, setShowMonths] = useState(false);
  const [expanded, setExpanded] = useState(new Set());
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usageError, setUsageError] = useState("");
  const [loadingUsage, setLoadingUsage] = useState(false);

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
          setStart(contractStart); setYear(contractStart.year);
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
    if (!projectId) { setLoadingUsage(false); return () => { active = false; }; }
    setLoadingUsage(true);
    api(`/cost-breakdown?project_id=${encodeURIComponent(projectId)}&consumption_all=1`)
      .then((result) => {
        if (!active) return;
        setMonthlyUsage(result?.datedRealizedUsageByCode || {});
        setExchangeRates(Array.isArray(result?.exchangeRates) ? result.exchangeRates : []);
      })
      .catch(() => { if (active) setUsageError("دریافت مصرف ماهانه یا نرخ‌های ارز انجام نشد."); })
      .finally(() => { if (active) setLoadingUsage(false); });
    return () => { active = false; };
  }, [projectId]);

  const project = projects.find((item) => item.id === projectId);
  const projectCode = normalizeCode(project?.code);
  const displayRows = useMemo(() => rows.map((row) => {
    const code = normalizeCode(row.budgetCode ?? row.budget_code ?? "");
    return { id: row.id, code: projectCode && code !== projectCode && !code.startsWith(`${projectCode}-`) ? `${projectCode}-${code}` : code, name: String(row.budgetName ?? row.budget_name ?? ""), budget: amountToMinorUnits(row.baseBudget ?? row.base_budget ?? "0") ?? 0n };
  }).filter((row) => row.code).sort((a, b) => a.code.localeCompare(b.code, "fa", { numeric: true })), [rows, projectCode]);
  const parents = useMemo(() => {
    const codes = new Set(displayRows.map((row) => row.code));
    const result = new Set();
    displayRows.forEach(({ code }) => { const parts = code.split("-"); for (let i = 1; i < parts.length; i += 1) { const parent = parts.slice(0, i).join("-"); if (codes.has(parent)) result.add(parent); } });
    return result;
  }, [displayRows]);
  useEffect(() => setExpanded(new Set(parents)), [parents]);
  const allRowsExpanded = parents.size > 0 && [...parents].every((code) => expanded.has(code));
  const visibleRows = displayRows.filter(({ code }) => {
    const parts = code.split("-");
    for (let i = 1; i < parts.length; i += 1) { const parent = parts.slice(0, i).join("-"); if (parents.has(parent) && !expanded.has(parent)) return false; }
    return true;
  });
  const budgets = useMemo(() => {
    const children = new Map(); const codes = new Set(displayRows.map((row) => row.code));
    displayRows.forEach((row) => { const parts = row.code.split("-"); for (let i = parts.length - 1; i > 0; i -= 1) { const parent = parts.slice(0, i).join("-"); if (codes.has(parent)) { children.set(parent, [...(children.get(parent) || []), row]); break; } } });
    const totals = new Map(); const calculate = (row) => { if (totals.has(row.code)) return totals.get(row.code); const list = children.get(row.code) || []; const value = list.length ? list.reduce((sum, child) => sum + calculate(child), 0n) : row.budget; totals.set(row.code, value); return value; }; displayRows.forEach(calculate); return totals;
  }, [displayRows]);
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
  const periods = useMemo(() => {
    const today = Object.fromEntries(new Intl.DateTimeFormat("en-US-u-ca-persian", { timeZone: "Asia/Tehran", year: "numeric", month: "numeric" }).formatToParts(new Date()).map(({ type, value }) => [type, Number(value)]));
    const values = []; Object.values(monthlyUsage).forEach((years) => Object.entries(years || {}).forEach(([y, months]) => Object.keys(months || {}).forEach((m) => values.push(Number(y) * 12 + Number(m) - 1))));
    if (start) values.push(start.year * 12 + start.month - 1);
    if (!values.length) return [];
    const first = Math.min(...values), last = today.year * 12 + today.month - 1;
    return Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => ({ year: Math.floor((first + i) / 12), month: (first + i) % 12 + 1 }));
  }, [monthlyUsage, start]);
  const consumptionFor = (code, year, month) => {
    if (loadingUsage || usageError) return null;
    const raw = monthlyUsageByCode.get(code)?.[year]?.[month];
    if (raw == null) return 0n;
    const rialAmount = amountToMinorUnits(raw);
    if (rialAmount == null || !contractCurrency) return null;
    if (isRial) return rialAmount;
    const rate = exchangeRates.find((item) => String(item.currencyId) === contractCurrency.currencyId && String(item.sourceId) === contractCurrency.sourceId && Number(item.year) === year && Number(item.month) === month)?.rate;
    if (!rate || !/^\d+$/.test(String(rate)) || BigInt(rate) === 0n) return null;
    const divisor = BigInt(rate); return (rialAmount + divisor / 2n) / divisor;
  };
  const totalFor = (code) => { if (loadingUsage || usageError) return null; let total = 0n; for (const { year, month } of periods) { const amount = consumptionFor(code, year, month); if (amount == null) return null; total += amount; } return total; };
  const money = (amount) => amount == null ? "?" : formatMinorUnits(amount);

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
        <p className="px-4 pb-3 text-xs text-neutral-600 dark:text-neutral-400">{distinctCurrencies.length > 1 ? "در مبلغ قرارداد اصلی چند ترکیب ارز و منشأ ثبت شده است؛ واحد مصرف باید مشخص شود." : currencyLabel ? `واحد مبالغ این پروژه: ${currencyLabel}` : "ارز مبلغ قرارداد اصلی ثبت نشده است."}</p>
        {usageError && <p role="alert" className="px-4 pb-3 text-xs text-red-600">{usageError}</p>}
        {!loadingUsage && !usageError && displayRows.some((row) => totalFor(row.code) == null) && <p role="status" className="px-4 pb-3 text-xs text-amber-700">نرخ ارز برخی ماه‌ها یا ارز قرارداد مشخص نیست؛ جمع و اختلاف ردیف‌های مربوط نمایش داده نمی‌شود.</p>}
        <div className="mx-4 mb-4 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700"><div className="max-h-[60vh] overflow-auto"><table className={`w-full border-collapse text-sm ${showMonths ? "min-w-max" : "min-w-[700px]"}`}><thead className="sticky top-0 z-10 bg-[#184a6b] text-white"><tr><th className="min-w-[300px] px-4 py-3 !text-right"><span className="flex items-center gap-1.5"><button type="button" onClick={() => setExpanded(allRowsExpanded ? new Set() : new Set(parents))} disabled={!parents.size} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-black/15 bg-white text-base font-semibold leading-none text-black transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/15 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-white/10" aria-label={allRowsExpanded ? "\u0628\u0633\u062a\u0646 \u0647\u0645\u0647 \u0632\u06cc\u0631\u0645\u062c\u0645\u0648\u0639\u0647\u200c\u0647\u0627" : "\u0628\u0627\u0632 \u06a9\u0631\u062f\u0646 \u0647\u0645\u0647 \u0632\u06cc\u0631\u0645\u062c\u0645\u0648\u0639\u0647\u200c\u0647\u0627"} title={allRowsExpanded ? "\u0628\u0633\u062a\u0646 \u0647\u0645\u0647 \u0632\u06cc\u0631\u0645\u062c\u0645\u0648\u0639\u0647\u200c\u0647\u0627" : "\u0628\u0627\u0632 \u06a9\u0631\u062f\u0646 \u0647\u0645\u0647 \u0632\u06cc\u0631\u0645\u062c\u0645\u0648\u0639\u0647\u200c\u0647\u0627"}>{allRowsExpanded ? "\u2212" : "+"}</button>کد و نام بودجه</span></th>{showMonths && periods.map(({ year, month }) => <th key={`${year}-${month}`} className="min-w-[160px] px-4 py-3 !text-center">{months[month - 1]} {fa(year)}</th>)}<th className="min-w-[160px] px-4 py-3 !text-center"><span className="inline-flex items-center gap-2">جمع هزینه‌ها <button type="button" onClick={() => setShowMonths((value) => !value)} aria-expanded={showMonths} aria-label={showMonths ? "بستن جزئیات ماهانه" : "نمایش جزئیات ماهانه"} title={showMonths ? "بستن جزئیات ماهانه" : "نمایش جزئیات ماهانه"} className="rounded-md border border-white/40 p-1 hover:bg-white/20">{showMonths ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}</button></span></th><th className="min-w-[150px] px-4 py-3 !text-center">بودجه مبنا</th><th className="min-w-[150px] px-4 py-3 !text-center">اختلافات</th></tr></thead><tbody>{visibleRows.length === 0 ? <tr><td colSpan={4 + (showMonths ? periods.length : 0)} className="p-8 text-center text-neutral-500">ساختار هزینه‌ای برای این پروژه ثبت نشده است.</td></tr> : visibleRows.map((row) => { const total = totalFor(row.code); const budget = budgets.get(row.code) ?? 0n; const cell = "border-b border-neutral-200 px-4 py-3 !text-center align-middle tabular-nums dark:border-neutral-700"; return <tr key={row.id ?? row.code} className="odd:bg-neutral-50/70 hover:bg-sky-50/70 dark:odd:bg-white/[0.03] dark:hover:bg-white/[0.07]"><td className={`${cell} !text-right`}><div className="flex items-center justify-start gap-2" style={{ paddingRight: `${Math.min(4, Math.max(0, row.code.split("-").length - projectCode.split("-").length - 1)) * 36}px` }}>{parents.has(row.code) ? <button type="button" onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(row.code)) next.delete(row.code); else next.add(row.code); return next; })} aria-label={`${expanded.has(row.code) ? "بستن" : "باز کردن"} ${row.name}`} aria-expanded={expanded.has(row.code)} title={`${expanded.has(row.code) ? "\u0628\u0633\u062a\u0646" : "\u0628\u0627\u0632 \u06a9\u0631\u062f\u0646"} ${row.name}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-black/15 bg-white text-base font-semibold leading-none text-black transition hover:bg-black/5 dark:border-white/15 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-white/10">{expanded.has(row.code) ? "\u2212" : "+"}</button> : <span className="h-7 w-7 shrink-0" />}<span dir="ltr" className="shrink-0 font-semibold">{fa(row.code)}</span><span>{row.name}</span></div></td>{showMonths && periods.map(({ year, month }) => <td key={`${year}-${month}`} className={cell} dir="ltr">{money(consumptionFor(row.code, year, month))}</td>)}<td className={`${cell} font-semibold`} dir="ltr">{money(total)}</td><td className={cell} dir="ltr">{money(budget)}</td><td className={`${cell} ${total != null && total > budget ? "text-red-600 dark:text-red-400" : ""}`} dir="ltr">{money(total == null ? null : total - budget)}</td></tr>; })}</tbody></table></div></div>
      </>}
    </div>

  </Card>;
}
