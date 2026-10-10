import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../components/AuthProvider.jsx";
import Card from "../components/ui/Card.jsx";
import { format3 } from "../utils/format.js";
import PettyCashExpenseTab from "./PettyCashExpenseTab.jsx";

const tabs = ["تنخواه‌های من", "ثبت هزینه‌ها", "گزارش تسویه تنخواه"];
const colors = ["#1f2937", "#64748b", "#a78bfa", "#38bdf8", "#34d399", "#fbbf24", "#fb7185", "#818cf8"];
const amount = (value) => { try { return BigInt(value || 0); } catch { return 0n; } };
const money = (value) => {
  const number = amount(value);
  const absolute = number < 0n ? -number : number;
  const formatted = format3(absolute.toString()).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
  return number < 0n ? `(${formatted})` : formatted;
};
const percent = (part, total) => total > 0n
  ? Math.max(0, Math.min(100, Number((part * 1000n) / total) / 10))
  : 0;

function ProgressColumn({ label, filled, total, full = false }) {
  return <div className="flex w-16 shrink-0 flex-col items-center gap-3 sm:w-20">
    <div className="relative h-52 w-full overflow-hidden border border-neutral-300 bg-neutral-200 sm:h-60"
      role="img" aria-label={`${label}: ${money(filled)} از ${money(total)} ریال`}>
      <div className="absolute inset-x-0 bottom-0 bg-white transition-all duration-500" style={{ height: full ? "100%" : `${percent(filled, total)}%` }} />
    </div>
    <span className="text-center text-xs font-semibold text-neutral-700 sm:text-sm">{label}</span>
  </div>;
}

function SummaryLine({ label, value }) {
  return <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-b border-neutral-100 pb-3 last:border-b-0">
    <span>{label}:</span>
    <strong className="whitespace-nowrap font-semibold tabular-nums">{money(value)} ریال</strong>
  </div>;
}

function MyPettyCashSummary() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [balances, setBalances] = useState({ receivedAmount: "0", unregisteredBalance: "0", unsettledBalance: "0" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const options = {
      credentials: "include",
      headers: { "x-user-id": String(user.id) },
      signal: controller.signal,
    };
    const read = async (path) => {
      const response = await fetch(path, options);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "دریافت اطلاعات تنخواه انجام نشد.");
      return data;
    };
    Promise.all([
      read("/api/petty-cash-expenses?summary=mine"),
      read(`/api/tenkhah?beneficiaryId=${encodeURIComponent(user.id)}`),
    ])
      .then(([summary, balance]) => {
        setItems(Array.isArray(summary.items) ? summary.items : []);
        setBalances(balance);
      })
      .catch((reason) => { if (reason.name !== "AbortError") setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.id]);

  // The payment-request petty-cash form reads these beneficiary balances from
  // /api/tenkhah. They include both legacy settlement entries and newer expenses.
  const received = amount(balances.receivedAmount);
  const unregistered = amount(balances.unregisteredBalance);
  const unsettled = amount(balances.unsettledBalance);
  const totals = {
    received,
    registered: received - unregistered,
    approved: received - unsettled,
  };
  const projects = useMemo(() => items.filter((item) => amount(item.receivedAmount) > 0n), [items]);
  let angle = 0;
  const sectors = projects.map((project, index) => {
    const start = angle;
    angle += percent(amount(project.receivedAmount), totals.received);
    return `${colors[index % colors.length]} ${start}% ${angle}%`;
  });
  const pieBackground = sectors.length
    ? `conic-gradient(${sectors.join(", ")}${angle < 100 ? `, #e5e7eb ${angle}% 100%` : ""})`
    : "#e5e7eb";

  return <section className="rounded-b-2xl border border-t-0 border-neutral-200 bg-white px-4 py-7 text-neutral-900 sm:px-7 lg:px-10">
    {error && <p role="alert" className="mb-6 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading && <p role="status" className="mb-6 text-sm text-neutral-500">در حال دریافت اطلاعات...</p>}
    <div className="grid gap-9 lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
      <div className="flex items-end justify-center gap-0" aria-label="مقایسه تنخواه دریافت‌شده، هزینه ثبت‌شده و هزینه تأییدشده">
        <ProgressColumn label="تأییدشده" filled={totals.approved} total={totals.received} />
        <ProgressColumn label="ثبت‌شده" filled={totals.registered} total={totals.received} />
        <ProgressColumn label="کل تنخواه‌ها" filled={totals.received} total={totals.received} full />
      </div>
      <div className="self-center space-y-4 text-sm sm:text-base">
        <SummaryLine label="مجموع تنخواه‌های دریافت‌شده" value={totals.received} />
        <SummaryLine label="مجموع هزینه‌های ثبت‌شده" value={totals.registered} />
        <SummaryLine label="باقی‌مانده هزینه‌های ثبت‌شده" value={unregistered} />
        <SummaryLine label="مجموع هزینه‌های تأییدشده" value={totals.approved} />
        <SummaryLine label="باقی‌مانده تنخواه تسویه‌نشده" value={unsettled} />
      </div>
    </div>
    <hr className="my-9 border-neutral-200" />
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
      <div className="mx-auto aspect-square w-52 rounded-full border border-neutral-200 sm:w-64"
        style={{ background: pieBackground }} role="img" aria-label="سهم هر پروژه از مجموع تنخواه‌های دریافت‌شده" />
      <div>
        <h2 className="mb-5 text-base font-bold">تنخواه دریافت‌شده به تفکیک پروژه</h2>
        {projects.length ? <ul className="space-y-3">{projects.map((project, index) =>
          <li key={project.projectId} className="flex flex-wrap items-center justify-between gap-2 text-sm sm:text-base">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: colors[index % colors.length] }} />
              <span className="break-words">{project.projectName || project.projectCode || `پروژه ${index + 1}`}</span>
            </span>
            <strong className="whitespace-nowrap font-semibold tabular-nums">{money(project.receivedAmount)} ریال</strong>
          </li>)}</ul> : !loading && !error ? <p className="text-sm text-neutral-500">هنوز تنخواهی دریافت نشده است.</p> : null}
      </div>
    </div>
  </section>;
}

export default function PettyCashPage() {
  const [searchParams] = useSearchParams();
  const focusedExpenseId = searchParams.get("notificationTarget") === "petty_cash_expense" ? searchParams.get("request") || "" : "";
  const [activeTab, setActiveTab] = useState(() => focusedExpenseId ? 1 : 0);
  return <div dir="rtl" className="mx-auto min-w-0 max-w-[1400px]">
    <Card className="overflow-hidden rounded-2xl border border-black/10 bg-white p-0 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-neutral-900 sm:rounded-3xl sm:shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="p-2.5 sm:p-3 md:p-4">
        <header className="mb-4 flex min-w-0 items-center gap-3 border-b border-black/[0.07] px-0.5 pb-3 dark:border-white/10 sm:mb-5 sm:pb-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 shadow-sm dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04] sm:h-11 sm:w-11 sm:rounded-2xl">
            <img src="/images/icons/tenkhah.svg" alt="" className="h-5 w-5 dark:invert sm:h-6 sm:w-6" />
          </span>
          <span className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight md:text-lg">تنخواه‌گردان</h1>
            <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت مالی</span>
          </span>
        </header>
        <nav className="grid grid-cols-3 overflow-hidden rounded-t-2xl border border-neutral-200 bg-white" aria-label="بخش‌های تنخواه‌گردان">
          {tabs.map((tab, index) => <button key={tab} type="button" onClick={() => setActiveTab(index)}
            aria-current={activeTab === index ? "page" : undefined}
            className={`min-w-0 border-l border-neutral-200 px-2 py-3 text-xs font-bold transition last:border-l-0 sm:text-sm ${activeTab === index ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-50"}`}>{tab}</button>)}
        </nav>
        {activeTab === 0 && <MyPettyCashSummary />}
        {activeTab === 1 && <PettyCashExpenseTab />}
        {activeTab === 2 && <div className="min-h-80 rounded-b-2xl border border-t-0 border-neutral-200 bg-white" />}
      </div>
    </Card>
  </div>;
}
