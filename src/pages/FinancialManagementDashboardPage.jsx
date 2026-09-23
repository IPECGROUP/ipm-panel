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
  const colors = ["#64748b", "#3b82f6", "#f59e0b", "#22c55e", "#ef4444"];
  const values = [metrics.total, metrics.active, metrics.approved, metrics.rejected, metrics.completed];
  const chartValues = values.slice(1, 4);
  const chartTotal = chartValues.reduce((sum, value) => sum + Number(value || 0), 0);
  let cursor = 0;
  const innerChart = chartTotal ? `conic-gradient(${chartValues.map((value, index) => {
    const next = cursor + (Number(value || 0) / chartTotal) * 360;
    const segment = `${colors[index + 1]} ${cursor}deg ${next}deg`;
    cursor = next;
    return segment;
  }).join(", ")})` : "conic-gradient(#e5e7eb 0deg 360deg)";
  const completedShare = values[0] ? Math.min(360, (Number(values[4] || 0) / Number(values[0])) * 360) : 0;
  const outerChart = completedShare ? `conic-gradient(${colors[4]} 0deg ${completedShare}deg, #e5e7eb ${completedShare}deg 360deg)` : "conic-gradient(#e5e7eb 0deg 360deg)";
  return <Card className="min-h-[280px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800"><div className="mb-4"><span className="block text-sm font-bold">{title}</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">{subtitle}</span></div><div className="flex min-h-[180px] flex-col-reverse items-center gap-5 sm:flex-row sm:justify-between"><div className="w-full space-y-1.5 sm:min-w-0 sm:flex-1">{labels.map((label, index) => { const value = Number(values[index] || 0); const share = values[0] ? Math.round((value / values[0]) * 100) : 0; return <div key={label} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs"><span className="flex min-w-0 items-center gap-2 text-neutral-600 dark:text-neutral-300"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[index] }} /><span className="truncate">{label}</span></span><span className="shrink-0 whitespace-nowrap font-bold tabular-nums">{faNumber(value)} <span className="text-[10px] font-medium text-neutral-400">({faNumber(share)}٪)</span></span></div>; })}</div><div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full p-1.5" style={{ background: outerChart }}><div className="grid h-full w-full place-items-center rounded-full" style={{ background: innerChart }}><div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-white text-center shadow-inner dark:bg-neutral-900"><span><span className="block text-2xl font-bold leading-none tabular-nums">{faNumber(values[0])}</span><span className="mt-1 block text-[10px] text-neutral-500 dark:text-neutral-400">درخواست</span></span></div></div></div></div></Card>;
}

function timestampOf(entry) {
  const time = Date.parse(String(entry?.at || entry?.createdAt || ""));
  return Number.isFinite(time) ? time : null;
}

function firstApprovalAt(history, roleKey, predicate = () => true) {
  const event = (Array.isArray(history) ? history : []).find((entry) =>
    entry?.type === "approved" && entry?.roleKey === roleKey && predicate(entry)
  );
  return timestampOf(event);
}

function durationOf(start, end) {
  return Number.isFinite(start) && Number.isFinite(end) && end >= start ? end - start : null;
}

function stageDurations(item) {
  const history = historyOf(item);
  const createdAt = timestampOf(history.find((entry) => entry?.type === "created")) ?? timestampOf({ createdAt: item?.createdAt });
  const projectControlAt = firstApprovalAt(history, "project_control");
  const projectManagerAt = firstApprovalAt(history, "project_manager");
  const managementAt = firstApprovalAt(history, "management");
  const finalAccountingAt = firstApprovalAt(history, "accounting", (entry) => Number(entry?.index) >= 5);
  return [
    durationOf(createdAt, projectControlAt),
    durationOf(projectControlAt, projectManagerAt),
    durationOf(projectManagerAt, managementAt),
    durationOf(managementAt, finalAccountingAt),
  ];
}

function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds)) return "—";
  const totalHours = Math.round(milliseconds / 3600000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return days ? `${faNumber(days)} روز${hours ? ` و ${faNumber(hours)} ساعت` : ""}` : `${faNumber(hours)} ساعت`;
}

function TimingPanel({ timings }) {
  const stages = [
    "برنامه‌ریزی و کنترل پروژه",
    "مدیر پروژه",
    "مدیریت / دستور پرداخت",
    "مالی و تأیید نهایی",
  ];
  const values = stages.map((label, index) => ({
    label,
    average: timings[index]?.length ? timings[index].reduce((sum, value) => sum + value, 0) / timings[index].length : null,
    maximum: timings[index]?.length ? Math.max(...timings[index]) : null,
  }));
  return <Card className="min-h-[410px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800"><div className="mb-4"><span className="block text-sm font-bold">مدت زمان بررسی درخواست‌ها</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">بر اساس زمان ثبت‌شده در گردش‌کار درخواست‌های عادی</span></div><div className="grid gap-2 sm:grid-cols-2">{values.map((stage, index) => <div key={stage.label} className="rounded-xl bg-neutral-50 p-3 dark:bg-white/[0.045]"><span className="flex items-center gap-2 text-xs font-semibold"><span className={`h-2.5 w-2.5 rounded-full ${["bg-sky-500", "bg-amber-500", "bg-violet-500", "bg-emerald-500"][index]}`} />{stage.label}</span><div className="mt-3 flex items-end justify-between gap-2"><span className="text-[11px] text-neutral-500 dark:text-neutral-400">میانگین</span><span className="text-sm font-bold tabular-nums">{formatDuration(stage.average)}</span></div><div className="mt-2 flex items-end justify-between gap-2 border-t border-black/[0.06] pt-2 dark:border-white/[0.08]"><span className="text-[11px] text-neutral-500 dark:text-neutral-400">بیشترین</span><span className="text-sm font-bold tabular-nums">{formatDuration(stage.maximum)}</span></div></div>)}</div></Card>;
}

function amountOf(value) {
  const normalized = String(value ?? "").replace(/[٬,\s]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function tenkhahRankings(items) {
  const people = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const key = String(item?.beneficiaryUserId ?? item?.createdById ?? item?.beneficiaryName ?? item?.requesterName ?? "");
    if (!key) return;
    const current = people.get(key) || {
      key,
      label: String(item?.beneficiaryName ?? item?.requesterName ?? item?.beneficiaryUsername ?? `کاربر #${key}`).trim(),
      received: 0,
      unregistered: 0,
      unsettled: 0,
    };
    current.received += amountOf(item?.chargedAmount ?? item?.requestedAmount);
    current.unregistered += amountOf(item?.unregisteredBalance);
    current.unsettled += amountOf(item?.unsettledBalance);
    people.set(key, current);
  });
  const rows = [...people.values()];
  return {
    unregistered: rows.filter((person) => person.unregistered > 0).sort((a, b) => b.received - a.received).slice(0, 5),
    unsettled: rows.filter((person) => person.unsettled > 0).sort((a, b) => b.unsettled - a.unsettled).slice(0, 5),
  };
}

function tenkhahProjects(items) {
  const projects = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const id = String(item?.projectId ?? item?.project_id ?? "");
    if (!id) return;
    const current = projects.get(id) || {
      id,
      label: `${item?.projectCode ? `${item.projectCode} - ` : ""}${item?.projectName || `پروژه #${id}`}`,
      received: 0,
      unregistered: 0,
      unsettled: 0,
    };
    current.received += amountOf(item?.chargedAmount);
    current.unregistered += amountOf(item?.unregisteredBalance);
    current.unsettled += amountOf(item?.unsettledBalance);
    projects.set(id, current);
  });
  return [...projects.values()].sort((a, b) => b.received - a.received || a.label.localeCompare(b.label, "fa"));
}

function MoneyByProjectPanel({ title, subtitle, rows, columns, emptyText = "داده‌ای برای نمایش وجود ندارد." }) {
  return <Card className="min-h-[330px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800"><div className="mb-4"><span className="block text-sm font-bold">{title}</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">{subtitle}</span></div><div className="max-h-[250px] overflow-auto rounded-xl border border-black/[0.07] dark:border-white/[0.08]"><table className="w-full min-w-[560px] text-right text-xs"><thead className="sticky top-0 bg-neutral-50 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300"><tr><th className="px-3 py-2.5 font-medium">پروژه</th>{columns.map((column) => <th key={column.key} className="px-3 py-2.5 text-center font-medium">{column.label}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id} className="border-t border-black/[0.06] dark:border-white/[0.08]"><td className="max-w-[190px] truncate px-3 py-3 font-medium">{row.label}</td>{columns.map((column) => <td key={column.key} className="whitespace-nowrap px-3 py-3 text-center tabular-nums">{faNumber(row[column.key])}</td>)}</tr>) : <tr><td colSpan={columns.length + 1} className="px-3 py-20 text-center text-neutral-400">{emptyText}</td></tr>}</tbody></table></div></Card>;
}

function TenkhahRankingPanel({ title, subtitle, rows, valueKey, valueLabel, primaryKey = "received" }) {
  return <Card className="min-h-[330px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800"><div className="mb-4"><span className="block text-sm font-bold">{title}</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">{subtitle}</span></div><div className="space-y-2">{rows.length ? rows.map((person, index) => <div key={person.key} className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-3 dark:bg-white/[0.045]"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-neutral-500 shadow-sm dark:bg-neutral-800 dark:text-neutral-300">{faNumber(index + 1)}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{person.label}</span><span className="mt-1 block text-[10px] text-neutral-500 dark:text-neutral-400">{valueLabel}: {faNumber(person[valueKey])} ریال</span></span><span className="shrink-0 text-sm font-bold tabular-nums">{faNumber(person[primaryKey])} <span className="text-[10px] font-medium text-neutral-400">ریال</span></span></div>) : <div className="py-24 text-center text-xs text-neutral-400">موردی برای نمایش وجود ندارد.</div>}</div></Card>;
}

function EmptyPanel() {
  return <Card className="min-h-[180px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800" />;
}

export default function FinancialManagementDashboardPage() {
  const { user } = useAuth();
  const [normalRequests, setNormalRequests] = useState([]);
  const [tenkhahRequests, setTenkhahRequests] = useState([]);
  const [liquidityProjects, setLiquidityProjects] = useState([]);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    const options = { credentials: "include", headers: { "x-user-id": String(user.id) } };
    Promise.all([
      fetch("/api/requests", options).then((response) => response.ok ? response.json() : { items: [] }),
      fetch("/api/tenkhah", options).then((response) => response.ok ? response.json() : { items: [] }),
      fetch("/api/liquidity-allocations?dashboard=1", options).then((response) => response.ok ? response.json() : { projects: [] }),
    ]).then(([normalData, tenkhahData, liquidityData]) => {
      if (cancelled) return;
      const normalItems = Array.isArray(normalData?.items) ? normalData.items : [];
      setNormalRequests(normalItems.filter((item) => String(item?.requestType || item?.docId || "").toLowerCase() !== "tenkhah_request" && String(item?.scope || "").toLowerCase() !== "tenkhah"));
      setTenkhahRequests(Array.isArray(tenkhahData?.items) ? tenkhahData.items : []);
      setLiquidityProjects(Array.isArray(liquidityData?.projects) ? liquidityData.projects : []);
    }).catch(() => { if (!cancelled) { setNormalRequests([]); setTenkhahRequests([]); setLiquidityProjects([]); } });
    return () => { cancelled = true; };
  }, [user?.id]);

  const normalMetrics = useMemo(() => requestMetrics(normalRequests, "normal"), [normalRequests]);
  const tenkhahMetrics = useMemo(() => requestMetrics(tenkhahRequests, "tenkhah"), [tenkhahRequests]);
  const operationTimings = useMemo(() => {
    const timingGroups = [[], [], [], []];
    normalRequests.forEach((request) => stageDurations(request).forEach((duration, index) => {
      if (duration != null) timingGroups[index].push(duration);
    }));
    return timingGroups;
  }, [normalRequests]);
  const rankedTenkhah = useMemo(() => tenkhahRankings(tenkhahRequests), [tenkhahRequests]);
  const tenkhahProjectRows = useMemo(() => tenkhahProjects(tenkhahRequests), [tenkhahRequests]);
  const liquidityProjectRows = useMemo(() => (Array.isArray(liquidityProjects) ? liquidityProjects : []).map((project) => {
    const allocated = amountOf(project?.totalBudget);
    const commitments = amountOf(project?.totalCommitments);
    return { id: project.id, label: `${project?.code ? `${project.code} - ` : ""}${project?.name || `پروژه #${project?.id}`}`, allocated, remaining: allocated - commitments };
  }).sort((a, b) => b.allocated - a.allocated || a.label.localeCompare(b.label, "fa")), [liquidityProjects]);

  return (
    <div className="mx-auto w-full max-w-[1440px] text-neutral-900 dark:text-neutral-100" dir="rtl"><Card className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-none dark:border-neutral-800 dark:bg-neutral-900 sm:p-5"><div className="mb-5 flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]"><img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" /></span><span className="min-w-0"><span className="block truncate text-base font-bold md:text-lg">داشبورد مدیریت مالی</span><span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">نمای کلی درخواست‌های مالی و تنخواه</span></span></div><div className="grid grid-cols-1 gap-3 xl:grid-cols-2"><RequestStatsPanel title="درخواست‌های عادی" subtitle="وضعیت درخواست‌های پرداخت عادی" metrics={normalMetrics} labels={["کل درخواست‌ها", "اتمام‌نیافته", "تأییدشده", "ردشده", "اتمام‌یافته"]} /><RequestStatsPanel title="درخواست‌های تنخواه" subtitle="وضعیت درخواست‌های تنخواه" metrics={tenkhahMetrics} labels={["کل درخواست‌ها", "در دست بررسی", "تأییدشده", "ردشده", "اتمام‌یافته"]} /></div><div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3"><TimingPanel timings={operationTimings} /><TenkhahRankingPanel title="تنخواه‌های دریافت‌شده و ثبت‌نشده" subtitle="۵ نفر اول بر اساس بیشترین مجموع تنخواه دریافتی" rows={rankedTenkhah.unregistered} valueKey="unregistered" valueLabel="مانده ثبت‌نشده" /><TenkhahRankingPanel title="مانده‌های تسویه‌نشدهٔ تنخواه" subtitle="۵ نفر اول بر اساس بیشترین ماندهٔ تسویه‌نشده" rows={rankedTenkhah.unsettled} valueKey="unsettled" valueLabel="مانده تسویه‌نشده" primaryKey="unsettled" /><MoneyByProjectPanel title="تنخواه به تفکیک پروژه" subtitle="مبالغ دریافت‌شده، ثبت‌نشده و تسویه‌نشده" rows={tenkhahProjectRows} columns={[{ key: "received", label: "دریافت‌شده" }, { key: "unregistered", label: "ثبت‌نشده" }, { key: "unsettled", label: "تسویه‌نشده" }]} /><MoneyByProjectPanel title="بودجه و نقدینگی پروژه‌ها" subtitle="بودجه تخصیص‌یافته و نقدینگی باقی‌مانده" rows={liquidityProjectRows} columns={[{ key: "allocated", label: "تخصیص‌یافته" }, { key: "remaining", label: "نقدینگی باقی‌مانده" }]} /><EmptyPanel /></div></Card></div>
  );
}
