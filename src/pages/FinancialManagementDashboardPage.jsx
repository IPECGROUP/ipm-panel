import React, { useCallback, useEffect, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../components/AuthProvider.jsx";

const PAGE_ICON = "/images/icons/dashboard-modirirat.svg";

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
      const response = await fetch("/api/liquidity-allocations", {
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
