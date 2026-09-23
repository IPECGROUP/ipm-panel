import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../components/AuthProvider.jsx";

const PAGE_ICON = "/images/icons/dashboard-12.svg";

/*
 * Legacy financial dashboard
 * --------------------------
 * This implementation is intentionally kept as a comment at the user's
 * request. Remove these comment markers to restore it later.
 *
const COLUMNS = [
  "ردیف",
  "پروژه",
  "کل بودجه",
  "کل تعهدات",
  "کل مصارف",
  "مصارف / تعداد",
  "مانده بودجه",
  "تعهدات / کل بودجه",
  "مصارف / کل بودجه",
];

function number(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return number(value).toLocaleString("en-US");
}

function percent(value, total) {
  return total > 0 ? `${((value / total) * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪` : "—";
}

export default function FinancialManagementDashboardPage() {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/liquidity-allocations?dashboard=1", {
        credentials: "include",
        headers: user?.id != null ? { "x-user-id": String(user.id) } : {},
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.error || "dashboard_failed");
      setRows(Array.isArray(data?.projects) ? data.projects : []);
    } catch {
      setRows([]);
      setError("دریافت اطلاعات داشبورد انجام نشد.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const resetDashboard = async () => {
    if (!window.confirm("فقط داده‌های نمایشی داشبورد مدیریت مالی از نو شروع شوند؟ داده‌های تخصیص نقدینگی و درخواست پرداخت حذف نمی‌شوند.")) return;
    setResetting(true);
    try {
      const response = await fetch("/api/liquidity-allocations/dashboard", { method: "DELETE", credentials: "include", headers: user?.id != null ? { "x-user-id": String(user.id) } : {} });
      if (!response.ok) throw new Error("reset_failed");
      await loadDashboard();
    } catch {
      setError("پاک‌سازی داشبورد انجام نشد.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="mb-5 flex min-w-0 items-center justify-between gap-3" dir="rtl">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
            <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold md:text-lg">داشبورد مدیریت مالی</span>
            <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">نمای کلی شاخص‌های مالی</span>
          </span>
        </div>
        {isAdmin && <button type="button" onClick={resetDashboard} disabled={resetting} className="grid h-9 w-9 place-items-center rounded-xl border border-red-500/40 text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/30" title="شروع دوباره داشبورد" aria-label="شروع دوباره داشبورد"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" /></button>}
      </div>

      <div className="overflow-x-auto" dir="rtl">
        <table className="w-full min-w-[1060px] border-collapse text-xs text-neutral-800 dark:text-neutral-100 sm:text-sm">
          <thead className="bg-black/[0.04] dark:bg-white/[0.06]">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} className="h-14 border border-black/10 px-3 text-center font-semibold whitespace-nowrap dark:border-white/10">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => {
              const totalBudget = number(row.totalBudget);
              const totalCommitments = number(row.totalCommitments);
              const totalExpenses = number(row.totalExpenses);
              const budgetRemaining = totalBudget - totalCommitments;
              const cells = [
                (index + 1).toLocaleString("fa-IR"),
                `${row.code ? `${row.code} - ` : ""}${row.name || "پروژه بدون نام"}`,
                money(totalBudget),
                money(totalCommitments),
                money(totalExpenses),
                `${money(totalExpenses)} / ${number(row.expenseCount).toLocaleString("fa-IR")}`,
                money(budgetRemaining),
                percent(totalCommitments, totalBudget),
                percent(totalExpenses, totalBudget),
              ];
              return <tr key={row.id} className="bg-white dark:bg-neutral-900">
                {cells.map((cell, cellIndex) => <td key={cellIndex} className={`h-14 border border-black/10 px-3 text-center dark:border-white/10 ${cellIndex === 1 ? "min-w-[240px] font-medium" : "whitespace-nowrap"}`}>{cell}</td>)}
              </tr>;
            }) : <tr className="bg-white dark:bg-neutral-900">
              <td colSpan={COLUMNS.length} className="h-28 border border-black/10 px-3 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
                {loading ? "در حال دریافت اطلاعات..." : error || "هنوز پروژه‌ای از صفحه تخصیص نقدینگی اضافه نشده است."}
              </td>
            </tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
*/

const faNumber = (value) => Number(value || 0).toLocaleString("fa-IR");

function historyOf(item) {
  const history = item?.historyJson ?? item?.history ?? item?.workflowHistory ?? [];
  return Array.isArray(history) ? history : [];
}

function hasApproval(item) {
  return String(item?.status || "").toLowerCase() === "approved" || historyOf(item).some((event) => ["approved", "approve"].includes(String(event?.type || "").toLowerCase()));
}

function requestMetrics(items, kind) {
  const rows = Array.isArray(items) ? items : [];
  const statusOf = (item) => String(item?.status || "").toLowerCase();
  const completedStatus = kind === "tenkhah" ? "charged" : "approved";
  const finalStatuses = kind === "tenkhah" ? ["charged", "rejected"] : ["approved", "rejected", "canceled", "cancelled"];
  return {
    total: rows.length,
    active: rows.filter((item) => kind === "tenkhah" ? statusOf(item) === "pending" : !finalStatuses.includes(statusOf(item))).length,
    approved: rows.filter(hasApproval).length,
    rejected: rows.filter((item) => statusOf(item) === "rejected").length,
    completed: rows.filter((item) => statusOf(item) === completedStatus).length,
  };
}

function RequestStatsPanel({ title, subtitle, metrics, labels }) {
  const colors = ["bg-slate-500", "bg-sky-500", "bg-emerald-500", "bg-red-500", "bg-violet-500"];
  const values = [metrics.total, metrics.active, metrics.approved, metrics.rejected, metrics.completed];
  return <Card className="min-h-[330px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800"><div className="mb-5"><span className="block text-sm font-bold">{title}</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">{subtitle}</span></div><div className="space-y-2">{labels.map((label, index) => <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-3 dark:bg-white/[0.045]"><span className="flex min-w-0 items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors[index]}`} /><span className="truncate">{label}</span></span><span className="shrink-0 text-base font-bold tabular-nums">{faNumber(values[index])}</span></div>)}</div></Card>;
}

function EmptyPanel() {
  return <Card className="min-h-[180px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800" />;
}

export default function FinancialManagementDashboardPage() {
  const { user } = useAuth();
  const [normalRequests, setNormalRequests] = useState([]);
  const [tenkhahRequests, setTenkhahRequests] = useState([]);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    const options = { credentials: "include", headers: { "x-user-id": String(user.id) } };
    Promise.all([
      fetch("/api/requests", options).then((response) => response.ok ? response.json() : { items: [] }),
      fetch("/api/tenkhah", options).then((response) => response.ok ? response.json() : { items: [] }),
    ]).then(([normalData, tenkhahData]) => {
      if (cancelled) return;
      const normalItems = Array.isArray(normalData?.items) ? normalData.items : [];
      setNormalRequests(normalItems.filter((item) => String(item?.requestType || item?.docId || "").toLowerCase() !== "tenkhah_request" && String(item?.scope || "").toLowerCase() !== "tenkhah"));
      setTenkhahRequests(Array.isArray(tenkhahData?.items) ? tenkhahData.items : []);
    }).catch(() => { if (!cancelled) { setNormalRequests([]); setTenkhahRequests([]); } });
    return () => { cancelled = true; };
  }, [user?.id]);

  const normalMetrics = useMemo(() => requestMetrics(normalRequests, "normal"), [normalRequests]);
  const tenkhahMetrics = useMemo(() => requestMetrics(tenkhahRequests, "tenkhah"), [tenkhahRequests]);

  return (
    <div className="mx-auto w-full max-w-[1440px] text-neutral-900 dark:text-neutral-100" dir="rtl"><Card className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-none dark:border-neutral-800 dark:bg-neutral-900 sm:p-5"><div className="mb-5 flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]"><img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" /></span><span className="min-w-0"><span className="block truncate text-base font-bold md:text-lg">داشبورد مدیریت مالی</span><span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">نمای کلی درخواست‌های مالی و تنخواه</span></span></div><div className="grid grid-cols-1 gap-3 xl:grid-cols-2"><RequestStatsPanel title="درخواست‌های عادی" subtitle="وضعیت درخواست‌های پرداخت عادی" metrics={normalMetrics} labels={["کل درخواست‌ها", "اتمام‌نیافته", "تأییدشده", "ردشده", "اتمام‌یافته"]} /><RequestStatsPanel title="درخواست‌های تنخواه" subtitle="وضعیت درخواست‌های تنخواه" metrics={tenkhahMetrics} labels={["کل درخواست‌ها", "در دست بررسی", "تأییدشده", "ردشده", "اتمام‌یافته"]} /></div><div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2"><EmptyPanel /><EmptyPanel /><EmptyPanel /><EmptyPanel /><EmptyPanel /><EmptyPanel /></div></Card></div>
  );
}
