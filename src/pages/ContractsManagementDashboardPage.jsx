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

function MetricPanel({ title, subtitle, items, tone = "indigo" }) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
  };
  return <Card className="min-h-[230px] rounded-2xl border-neutral-200 p-5 shadow-none dark:border-neutral-800"><div className="mb-5 flex items-start justify-between gap-3"><span><span className="block text-base font-bold">{title}</span><span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</span></span><span className={`h-3 w-3 rounded-full ${tones[tone]}`} /></div><div className="grid gap-3 sm:grid-cols-2">{items.map((item) => <div key={item.label} className="rounded-2xl bg-neutral-50 px-4 py-5 dark:bg-white/[0.045]"><span className="block text-xs text-neutral-500 dark:text-neutral-400">{item.label}</span><span className="mt-2 block text-2xl font-bold tabular-nums">{Number(item.value || 0).toLocaleString("fa-IR")}</span></div>)}</div></Card>;
}

function CurrencyTotalsPanel({ title, totals }) {
  return <div className="min-w-0 flex-1 rounded-2xl bg-neutral-50 p-3 dark:bg-white/[0.045]"><span className="mb-3 block text-xs font-semibold text-neutral-600 dark:text-neutral-300">{title}</span>{totals.length ? <div className="space-y-2">{totals.map((item) => <div key={item.currency} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs dark:bg-neutral-800"><span className="truncate text-neutral-500 dark:text-neutral-400">{item.currency}</span><span className="shrink-0 font-bold tabular-nums">{money(item.amount)}</span></div>)}</div> : <div className="py-8 text-center text-xs text-neutral-400">مبلغی ثبت نشده است</div>}</div>;
}

function ContractAmountsPanel({ mainTotals, subTotals }) {
  return <Card className="min-h-[230px] rounded-2xl border-neutral-200 p-5 shadow-none dark:border-neutral-800"><div className="mb-5"><span className="block text-base font-bold">مبالغ قراردادها</span><span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">مجموع مبلغ با تفکیک ارز</span></div><div className="flex flex-col gap-3 sm:flex-row"><CurrencyTotalsPanel title="قراردادهای اصلی" totals={mainTotals} /><CurrencyTotalsPanel title="قراردادهای فرعی" totals={subTotals} /></div></Card>;
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

  return <div className="mx-auto w-full max-w-[1440px] text-neutral-900 dark:text-neutral-100" dir="rtl"><Card className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-none dark:border-neutral-800 dark:bg-neutral-900 sm:p-5"><div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]"><img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" /></span><span><span className="block text-base font-bold md:text-lg">داشبورد مدیریت قراردادها</span><span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت قراردادها</span></span></div><div className="grid grid-cols-1 gap-3 xl:grid-cols-3"><MetricPanel title="آمار کل قراردادها" subtitle="تعداد قراردادهای ثبت‌شده" tone="indigo" items={[{ label: "کل قراردادها", value: metrics.all.length }, { label: "قراردادهای اصلی", value: metrics.main.length }, { label: "قراردادهای فرعی", value: metrics.sub.length }]} /><MetricPanel title="وضعیت قراردادها" subtitle="وضعیت جاری قراردادهای اصلی و فرعی" tone="emerald" items={[{ label: "در حال انجام", value: metrics.inProgress.length }, { label: "خاتمه‌یافته", value: metrics.terminated.length }]} /><ContractAmountsPanel mainTotals={metrics.mainTotals} subTotals={metrics.subTotals} /></div></Card></div>;
}
