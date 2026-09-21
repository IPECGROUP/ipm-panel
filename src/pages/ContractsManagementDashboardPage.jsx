import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../components/AuthProvider.jsx";

const PAGE_ICON = "/images/icons/dashboard-12.svg";

function toEnglishDigits(value = "") {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function contractAmount(value) {
  const normalized = toEnglishDigits(value).replace(/[٬,\s]/g, "").replace(/٫/g, ".").replace(/[^\d.-]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function isTerminated(contract) {
  const status = String(contract?.insurance?.lastStatus || contract?.insurance?.branchStatus || "").toLowerCase();
  return /خاتمه|مفاصا|پایان|terminated|completed|closed/.test(status);
}

function money(value) {
  return Number(value || 0).toLocaleString("fa-IR", { maximumFractionDigits: 2 });
}

function ContractCountsPanel({ total, main, sub }) {
  const mainAngle = total ? (main / total) * 360 : 0;
  const chart = total
    ? `conic-gradient(#22c55e 0deg ${mainAngle}deg, #3b82f6 ${mainAngle}deg 360deg)`
    : "conic-gradient(#e5e7eb 0deg 360deg)";
  const items = [
    ["کل قراردادها", total, "#64748b"],
    ["قراردادهای اصلی", main, "#22c55e"],
    ["قراردادهای فرعی", sub, "#3b82f6"],
  ];
  return <Card className="min-h-[230px] rounded-2xl border-neutral-200 p-5 shadow-none dark:border-neutral-800"><div className="mb-5"><span className="block text-base font-bold">آمار کل قراردادها</span><span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">تعداد قراردادهای ثبت‌شده</span></div><div className="flex min-h-[146px] flex-col-reverse items-center gap-5 sm:flex-row sm:justify-between"><div className="w-full space-y-2 sm:flex-1">{items.map(([label, value, color]) => <div key={label} className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-xs hover:bg-neutral-50 dark:hover:bg-white/[0.04]"><span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{label}</span><span className="font-bold tabular-nums">{Number(value).toLocaleString("fa-IR")}</span></div>)}</div><div className="grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: chart }}><div className="grid h-[92px] w-[92px] place-items-center rounded-full bg-white text-center shadow-inner dark:bg-neutral-900"><span><span className="block text-2xl font-bold leading-none tabular-nums">{Number(total).toLocaleString("fa-IR")}</span><span className="mt-1 block text-[10px] text-neutral-500 dark:text-neutral-400">قرارداد</span></span></div></div></div></Card>;
}

function MetricPanel({ title, subtitle, items, tone = "indigo" }) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
  };
  return <Card className="min-h-[230px] rounded-2xl border-neutral-200 p-5 shadow-none dark:border-neutral-800"><div className="mb-5 flex items-start justify-between gap-3"><span><span className="block text-base font-bold">{title}</span><span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</span></span><span className={`h-3 w-3 rounded-full ${tones[tone]}`} /></div><div className="grid gap-3 sm:grid-cols-2">{items.map((item) => <div key={item.label} className="rounded-2xl bg-neutral-50 px-4 py-5 dark:bg-white/[0.045]"><span className="block text-xs text-neutral-500 dark:text-neutral-400">{item.label}</span><span className="mt-2 block text-2xl font-bold tabular-nums">{Number(item.value || 0).toLocaleString("fa-IR")}</span></div>)}</div></Card>;
}

function CurrencyTotalsPanel({ title, totals, tone }) {
  const tones = tone === "main"
    ? { shell: "border-sky-200 bg-sky-50/70 dark:border-sky-400/20 dark:bg-sky-500/[0.08]", dot: "bg-sky-500", value: "text-sky-700 dark:text-sky-300" }
    : { shell: "border-violet-200 bg-violet-50/70 dark:border-violet-400/20 dark:bg-violet-500/[0.08]", dot: "bg-violet-500", value: "text-violet-700 dark:text-violet-300" };
  return <div className={`min-w-0 flex-1 rounded-2xl border p-3 ${tones.shell}`}><span className="mb-3 flex items-center gap-2 text-xs font-bold"><span className={`h-2.5 w-2.5 rounded-full ${tones.dot}`} />{title}</span>{totals.length ? <div className="space-y-2">{totals.map((item) => <div key={item.currency} className="flex items-center justify-between gap-3 rounded-xl bg-white/90 px-3 py-2 text-xs shadow-sm dark:bg-neutral-900/70"><span className="truncate text-neutral-500 dark:text-neutral-400">{item.currency}</span><span className={`shrink-0 font-bold tabular-nums ${tones.value}`}>{money(item.amount)}</span></div>)}</div> : <div className="py-8 text-center text-xs text-neutral-400">مبلغی ثبت نشده است</div>}</div>;
}

function ContractAmountsPanel({ mainTotals, subTotals }) {
  return <Card className="min-h-[230px] rounded-2xl border-neutral-200 p-5 shadow-none dark:border-neutral-800"><div className="mb-5"><span className="block text-base font-bold">مبالغ قراردادها</span><span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">مجموع مبلغ با تفکیک ارز</span></div><div className="flex flex-col gap-3 sm:flex-row"><CurrencyTotalsPanel title="قراردادهای اصلی" totals={mainTotals} tone="main" /><CurrencyTotalsPanel title="قراردادهای فرعی" totals={subTotals} tone="sub" /></div></Card>;
}

function totalsByCurrency(contracts) {
  const totals = new Map();
  contracts.forEach((contract) => {
    const amounts = Array.isArray(contract?.financial?.contractAmounts) ? contract.financial.contractAmounts : [];
    amounts.forEach((row) => {
      const currency = String(row?.currencyLabel || row?.currency_label || row?.currencyId || row?.currency_id || "بدون ارز").trim() || "بدون ارز";
      totals.set(currency, (totals.get(currency) || 0) + contractAmount(row?.amount));
    });
  });
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount })).sort((a, b) => b.amount - a.amount);
}

export default function ContractsManagementDashboardPage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    fetch("/api/contracts", { credentials: "include", headers: { "x-user-id": String(user.id) } })
      .then((response) => response.ok ? response.json() : { items: [] })
      .then((data) => { if (!cancelled) setContracts(Array.isArray(data?.items) ? data.items : []); })
      .catch(() => { if (!cancelled) setContracts([]); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const metrics = useMemo(() => {
    const all = (Array.isArray(contracts) ? contracts : []).filter((contract) => ["main", "sub"].includes(String(contract?.documentType || "main")));
    const main = all.filter((contract) => String(contract?.documentType || "main") === "main");
    const sub = all.filter((contract) => String(contract?.documentType) === "sub");
    const terminated = all.filter(isTerminated);
    return { all, main, sub, terminated, inProgress: all.filter((contract) => !isTerminated(contract)), mainTotals: totalsByCurrency(main), subTotals: totalsByCurrency(sub) };
  }, [contracts]);

  return <div className="mx-auto w-full max-w-[1440px] text-neutral-900 dark:text-neutral-100" dir="rtl"><Card className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-none dark:border-neutral-800 dark:bg-neutral-900 sm:p-5"><div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]"><img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" /></span><span><span className="block text-base font-bold md:text-lg">داشبورد مدیریت قراردادها</span><span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت قراردادها</span></span></div><div className="grid grid-cols-1 gap-3 xl:grid-cols-3"><ContractCountsPanel total={metrics.all.length} main={metrics.main.length} sub={metrics.sub.length} /><MetricPanel title="وضعیت قراردادها" subtitle="وضعیت جاری قراردادهای اصلی و فرعی" tone="emerald" items={[{ label: "در حال انجام", value: metrics.inProgress.length }, { label: "خاتمه‌یافته", value: metrics.terminated.length }]} /><ContractAmountsPanel mainTotals={metrics.mainTotals} subTotals={metrics.subTotals} /></div></Card></div>;
}
