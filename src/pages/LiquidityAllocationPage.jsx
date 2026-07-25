// تخصیص نقدینگی
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { todayJalaliYmd } from "../utils/date.js";
import { toEnglishDigits } from "../utils/format.js";

const PAGE_ICON = "/images/icons/modiriat-nagdinegi.svg";

const LIQUIDITY_SOURCES = [
  "کارکرد پروژه‌ها",
  "استفاده از ذخیره احتیاطی",
  "وام بانکی",
  "آورده شرکا و سهامداران",
  "فروش دارایی",
  "سایر",
];

const inputClass =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-right text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-neutral-100 dark:placeholder:text-neutral-500";

function todayFa() {
  return todayJalaliYmd().replaceAll("-", "/");
}

function emptyAllocationForm() {
  return { allocationDate: todayFa(), source: "", amount: "", description: "" };
}

function createBatchId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `allocation-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatAmount(value) {
  const digits = toEnglishDigits(String(value ?? "")).replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("en-US") : "";
}

function toFaDigits(value) {
  return String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function formatSignedAmount(value) {
  const normalized = toEnglishDigits(String(value ?? "")).replace(/,/g, "");
  const negative = normalized.trim().startsWith("-");
  const digits = normalized.replace(/[^\d]/g, "");
  if (!digits) return negative ? "-" : "";
  return `${negative ? "-" : ""}${Number(digits).toLocaleString("en-US")}`;
}

function activeProject(project) {
  const value = project?.isActive ?? project?.is_active ?? project?.active;
  return value === true || value === 1 || String(value).toLowerCase() === "true" || String(value) === "1";
}

function isTopProject(project) {
  return /^\d{3}$/.test(toEnglishDigits(String(project?.code || "")).trim());
}

function projectLabel(project) {
  return `${project?.code ? `${project.code} - ` : ""}${project?.name || project?.title || "پروژه بدون نام"}`;
}

const tableCellClass = "h-14 border-b border-l border-black/10 px-2 text-center align-middle dark:border-white/10";
const historyTableCellClass = "h-11 border-b border-l border-neutral-300 px-3 text-center align-middle dark:border-white/10";
const paginationIconBtnCls = "grid h-9 w-9 place-items-center rounded-lg border border-black/10 text-neutral-700 transition hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:text-neutral-100 dark:hover:bg-white/10";

export default function LiquidityAllocationPage() {
  const { user, isAdmin } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [form, setForm] = useState(emptyAllocationForm);
  const [customSource, setCustomSource] = useState(false);
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [draftProjectId, setDraftProjectId] = useState("");
  const [draftAllocation, setDraftAllocation] = useState("");
  const [summary, setSummary] = useState({ allocations: {}, spent: {}, committed: {} });
  const [history, setHistory] = useState([]);
  const [previewAllocation, setPreviewAllocation] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const response = await fetch("/api/projects", {
        credentials: "include",
        headers: user?.id != null ? { "x-user-id": String(user.id) } : {},
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "projects_failed");
      const items = Array.isArray(data?.items) ? data.items : [];
      setProjects(items.filter((project) => activeProject(project) && isTopProject(project)));
    } catch {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const loadSummary = useCallback(async () => {
    try {
      const response = await fetch("/api/liquidity-allocations", {
        credentials: "include",
        headers: user?.id != null ? { "x-user-id": String(user.id) } : {},
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "summary_failed");
      setSummary({ allocations: data.allocations || {}, spent: data.spent || {}, committed: data.committed || {} });
      setHistory(Array.isArray(data?.history) ? data.history : []);
      const selectedProjects = Array.isArray(data?.projects) ? data.projects : [];
      setRows((current) => selectedProjects.map((project) => {
        const existing = current.find((row) => String(row.projectId) === String(project.id));
        return existing || { id: `project-${project.id}`, projectId: project.id, label: projectLabel(project), newAllocation: "" };
      }));
    } catch {
      setSummary({ allocations: {}, spent: {}, committed: {} });
      setHistory([]);
    }
  }, [user?.id]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const historyTotal = history.length;
  const historyPageCount = Math.max(1, Math.ceil(historyTotal / Math.max(1, rowsPerPage)));
  const safeHistoryPage = Math.min(Math.max(0, page), historyPageCount - 1);
  const historyStartIndex = safeHistoryPage * rowsPerPage;
  const historyEndIndex = Math.min(historyTotal, historyStartIndex + rowsPerPage);
  const pagedHistory = history.slice(historyStartIndex, historyEndIndex);

  useEffect(() => { setPage(0); }, [rowsPerPage]);
  useEffect(() => { if (page !== safeHistoryPage) setPage(safeHistoryPage); }, [page, safeHistoryPage]);

  const money = (value) => {
    const normalized = toEnglishDigits(String(value ?? "")).replace(/,/g, "").trim();
    const negative = normalized.startsWith("-");
    const digits = normalized.replace(/[^\d]/g, "");
    return (negative ? -1 : 1) * (Number(digits) || 0);
  };
  const displayMoney = (value) => value ? Number(value).toLocaleString("en-US") : "—";
  const projectAllocationTotal = useMemo(() => rows.reduce((total, row) => total + money(row.newAllocation), 0), [rows]);
  const newAllocationTotal = projectAllocationTotal;
  const availableAmount = money(form.amount);
  const availableRemaining = availableAmount - newAllocationTotal;
  const hasPendingAllocation = rows.some((row) => money(row.newAllocation) !== 0);
  const allocationError = newAllocationTotal > availableAmount
    ? "جمع مبلغ تخصیص نمی‌تواند بیشتر از مبلغ قابل تخصیص باشد."
    : "";

  const addAllocationRow = async () => {
    const project = projects.find((item) => String(item.id) === String(draftProjectId));
    const allocationAmount = money(draftAllocation);
    if (!form.source.trim() || availableAmount <= 0) {
      setSubmitMessage("منبع نقدینگی و مبلغ قابل تخصیص را وارد کنید.");
      return;
    }
    if (!project) {
      setSubmitMessage("پروژه را انتخاب کنید.");
      return;
    }
    if (!allocationAmount) {
      setSubmitMessage("مبلغ تخصیص را وارد کنید.");
      return;
    }
    const nextTotal = newAllocationTotal + allocationAmount;
    if (nextTotal > availableAmount) {
      setSubmitMessage("جمع مبلغ تخصیص نمی‌تواند بیشتر از مبلغ قابل تخصیص باشد.");
      return;
    }
    setSubmitMessage("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/liquidity-allocations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(user?.id != null ? { "x-user-id": String(user.id) } : {}) },
        body: JSON.stringify({
          allocationDate: form.allocationDate,
          batchId,
          source: form.source,
          availableAmount,
          description: form.description,
          rows: [{ projectId: project.id, amount: allocationAmount }],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.error || "save_failed");
      setRows((current) => {
        const found = current.some((row) => String(row.projectId) === String(project.id));
        if (found) {
          return current.map((row) => String(row.projectId) === String(project.id)
            ? { ...row, newAllocation: formatSignedAmount(money(row.newAllocation) + allocationAmount) }
            : row);
        }
        return [...current, {
          id: `project-${project.id}`,
          projectId: project.id,
          label: projectLabel(project),
          newAllocation: formatSignedAmount(allocationAmount),
        }];
      });
      setDraftProjectId("");
      setDraftAllocation("");
      setSubmitMessage("تخصیص نقدینگی ثبت شد.");
      await loadSummary();
    } catch (error) {
      setSubmitMessage(error?.message === "allocation_total_exceeds_available_amount"
        ? "جمع مبلغ تخصیص نمی‌تواند بیشتر از مبلغ قابل تخصیص باشد."
        : error?.message || "ثبت تخصیص انجام نشد.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetLiquidityData = async () => {
    if (!window.confirm("همه سوابق تخصیص نقدینگی این صفحه حذف شوند؟ این عملیات قابل بازگشت نیست.")) return;
    setResetting(true);
    try {
      const response = await fetch("/api/liquidity-allocations", { method: "DELETE", credentials: "include", headers: user?.id != null ? { "x-user-id": String(user.id) } : {} });
      if (!response.ok) throw new Error("reset_failed");
      setRows([]);
      setSummary({ allocations: {}, spent: {}, committed: {} });
      setHistory([]);
      setPreviewAllocation(null);
      setSubmitMessage("اطلاعات تخصیص نقدینگی پاک شد.");
    } catch {
      setSubmitMessage("پاک‌سازی تخصیص نقدینگی انجام نشد.");
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
            <span className="block truncate text-base font-bold md:text-lg">تخصیص نقدینگی</span>
            <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت مالی</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && <button type="button" onClick={resetLiquidityData} disabled={resetting} className="grid h-9 w-9 place-items-center rounded-xl border border-red-500/40 text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/30" title="پاک‌سازی تخصیص نقدینگی" aria-label="پاک‌سازی تخصیص نقدینگی"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" /></button>}
          <button
            type="button"
            onClick={() => {
              if (formOpen) {
                setFormOpen(false);
                setBatchId("");
                setForm(emptyAllocationForm());
                setCustomSource(false);
                setDraftProjectId("");
                setDraftAllocation("");
                setRows((current) => current.map((row) => ({ ...row, newAllocation: "" })));
              } else {
                setBatchId(createBatchId());
                setFormOpen(true);
              }
              setSubmitMessage("");
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-black/15 transition hover:bg-black/5 dark:ring-neutral-800 dark:hover:bg-white/10"
            title={formOpen ? "نمایش جدول" : "افزودن تخصیص"}
            aria-label={formOpen ? "نمایش جدول" : "افزودن تخصیص"}
          >
            <img src={formOpen ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" />
          </button>
        </div>
      </div>

      {formOpen && <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]" dir="rtl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(150px,0.8fr)_minmax(230px,1.2fr)_minmax(210px,1fr)_minmax(260px,1.5fr)]">
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">تاریخ تخصیص</span>
            <JalaliPopupDatePicker
              value={form.allocationDate}
              onChange={(value) => updateForm("allocationDate", value)}
              placeholder="انتخاب تاریخ"
              buttonClassName={inputClass + " flex items-center justify-between gap-2"}
              disabled={hasPendingAllocation}
            />
          </label>

          <label className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">مبلغ قابل تخصیص</span>
            <div className="relative">
              <input
                value={form.amount}
                onChange={(event) => {
                  updateForm("amount", formatAmount(event.target.value));
                }}
                disabled={hasPendingAllocation}
                inputMode="numeric"
                placeholder="۰"
                className={inputClass + " pl-14 ltr text-left"}
                aria-label="مبلغ قابل تخصیص به ریال"
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 dark:text-neutral-400">ریال</span>
            </div>
          </label>

          <div className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">منبع نقدینگی</span>
            {customSource ? (
              <input value={form.source} onChange={(event) => updateForm("source", event.target.value)} placeholder="منبع نقدینگی را وارد کنید" className={inputClass} autoFocus disabled={hasPendingAllocation} />
            ) : (
              <select
                value={form.source}
                onChange={(event) => {
                  if (event.target.value === "سایر") {
                    setCustomSource(true);
                    updateForm("source", "");
                  } else updateForm("source", event.target.value);
                }}
                className={inputClass}
                disabled={hasPendingAllocation}
              >
                <option value="">انتخاب کنید</option>
                {LIQUIDITY_SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}
              </select>
            )}
          </div>

          <label className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">توضیحات</span>
            <input
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              placeholder="توضیحات تخصیص را وارد کنید"
              className={inputClass}
            />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(260px,1fr)_minmax(210px,0.7fr)_auto]">
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">پروژه</span>
            <select value={draftProjectId} onChange={(event) => { setDraftProjectId(event.target.value); setSubmitMessage(""); }} className={inputClass} disabled={projectsLoading}>
              <option value="">{projectsLoading ? "در حال دریافت پروژه‌ها..." : "انتخاب پروژه"}</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{projectLabel(project)}</option>)}
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">مبلغ تخصیص</span>
            <div className="relative">
              <input value={draftAllocation} onChange={(event) => { setDraftAllocation(formatSignedAmount(event.target.value)); setSubmitMessage(""); }} inputMode="numeric" placeholder="۰" className={inputClass + " pl-14 ltr text-left"} />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 dark:text-neutral-400">ریال</span>
            </div>
          </label>
          <button type="button" onClick={addAllocationRow} disabled={submitting} className="grid h-11 w-11 place-items-center rounded-xl bg-neutral-900 text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900" title="افزودن به جدول" aria-label="افزودن به جدول">
            {submitting ? <span className="text-xs">...</span> : <img src="/images/icons/afzodan.svg" alt="" className="h-5 w-5 invert dark:invert-0" />}
          </button>
        </div>
      </div>}

      {formOpen && <div className="mt-3 flex items-center justify-between gap-3 text-xs" dir="rtl">
        <span className={allocationError ? "text-red-600 dark:text-red-300" : "text-neutral-500 dark:text-neutral-400"}>
          {allocationError || `نقدینگی ذخیره احتیاطی: ${displayMoney(availableRemaining)} ریال`}
        </span>
        <span className="text-neutral-500 dark:text-neutral-400">جمع مبلغ تخصیص: {displayMoney(newAllocationTotal)} ریال</span>
      </div>}

      {formOpen ? <div className="mt-5 overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-900" dir="rtl">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-xs text-neutral-800 dark:text-neutral-100 sm:text-sm">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[16.5%]" />
            <col className="w-[16.5%]" />
            <col className="w-[16.5%]" />
            <col className="w-[16.5%]" />
          </colgroup>
          <thead className="bg-neutral-100 text-neutral-700 dark:bg-white/[0.08] dark:text-neutral-100">
            <tr>
              {["مرکز/پروژه", "کل بودجه", "مانده بودجه", "مبلغ تخصیص", "نقدینگی"].map((title) => (
                <th key={title} className="h-12 border-b border-l border-black/10 px-2 text-center font-semibold dark:border-white/10">{title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = String(row.projectId);
              const totalBudget = money(summary.allocations[key]);
              const budgetRemaining = totalBudget - money(summary.committed[key]);
              const allocationAmount = money(row.newAllocation);
              return (
                <tr key={row.id} className="bg-white transition-colors hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-white/[0.03]">
                  <td className={tableCellClass + " truncate font-medium"} title={row.label}>{row.label}</td>
                  <td className={tableCellClass}>{displayMoney(totalBudget)}</td>
                  <td className={tableCellClass}>{displayMoney(budgetRemaining)}</td>
                  <td className={tableCellClass}>{displayMoney(allocationAmount)}</td>
                  <td className={tableCellClass}>{displayMoney(budgetRemaining + allocationAmount)}</td>
                </tr>
              );
            })}
            <tr className="bg-amber-50/60 dark:bg-amber-400/[0.05]">
              <td className={tableCellClass + " font-medium"}>ذخیره احتیاطی</td>
              <td className={tableCellClass}>{displayMoney(availableAmount)}</td>
              <td className={tableCellClass}>{displayMoney(availableAmount)}</td>
              <td className={tableCellClass}>{displayMoney(projectAllocationTotal)}</td>
              <td className={tableCellClass}>{displayMoney(availableRemaining)}</td>
            </tr>
          </tbody>
        </table>
      </div> : <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-300 bg-[#fbfbf8] shadow-sm dark:border-white/10 dark:bg-neutral-900" dir="rtl">
        <div dir="ltr" className="max-h-[55vh] overflow-y-auto overflow-x-auto">
        <table dir="rtl" className="w-full min-w-[760px] table-fixed border-collapse text-xs text-neutral-800 dark:text-neutral-100 sm:text-sm">
          <colgroup>
            <col className="w-[8%]" />
            <col className="w-[18%]" />
            <col className="w-[20%]" />
            <col className="w-[24%]" />
            <col className="w-[30%]" />
          </colgroup>
          <thead className="bg-neutral-200 text-neutral-900 dark:bg-white/[0.08] dark:text-neutral-100">
            <tr>
              {["ردیف", "تاریخ تخصیص", "مبلغ تخصیص", "منبع نقدینگی", "توضیحات"].map((title) => (
                <th key={title} className="sticky top-0 z-10 h-10 border-b border-l border-neutral-400 bg-neutral-200 px-3 text-center font-bold dark:border-white/10 dark:bg-neutral-900">{title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedHistory.length ? pagedHistory.map((item, index) => (
              <tr key={item.id} className="bg-[#fbfbf8] transition-colors hover:bg-neutral-100/80 dark:bg-neutral-900 dark:hover:bg-white/[0.03]">
                <td className={historyTableCellClass}>{toFaDigits(historyStartIndex + index + 1)}</td>
                <td className={historyTableCellClass}>{item.allocationDate || "—"}</td>
                <td className={historyTableCellClass}>{displayMoney(money(item.allocatedAmount))}</td>
                <td className={historyTableCellClass + " truncate"} title={item.source}>{item.source || "—"}</td>
                <td className={historyTableCellClass}>
                  <div className="flex min-w-0 items-center justify-between gap-2 text-right">
                    <span className="min-w-0 flex-1 truncate" title={item.description || ""}>{item.description || "—"}</span>
                    <button type="button" onClick={() => setPreviewAllocation(item)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-black/10 transition hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/10" title="پیش‌نمایش جزئیات تخصیص" aria-label="پیش‌نمایش جزئیات تخصیص">
                      <img src="/images/icons/namayeshname.svg" alt="" className="h-4 w-4 dark:invert" />
                    </button>
                  </div>
                </td>
              </tr>
            )) : <tr><td colSpan={5} className="h-24 px-4 text-center text-neutral-500 dark:text-neutral-400">هنوز تخصیصی ثبت نشده است.</td></tr>}
          </tbody>
        </table>
        </div>
        <div className="border-t border-neutral-300 px-3 py-2 dark:border-neutral-800">
          <div className="flex flex-col items-stretch gap-2 md:flex-row md:flex-wrap md:items-center md:justify-between">
            <div className="flex items-center justify-between gap-2 text-sm md:justify-start">
              <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={safeHistoryPage <= 0} className={paginationIconBtnCls} aria-label="صفحه قبل" title="صفحه قبل">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
              <button type="button" onClick={() => setPage((current) => Math.min(historyPageCount - 1, current + 1))} disabled={safeHistoryPage >= historyPageCount - 1} className={paginationIconBtnCls} aria-label="صفحه بعد" title="صفحه بعد">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <div className="whitespace-nowrap text-black/70 dark:text-neutral-400">
                {historyTotal === 0 ? "۰ از ۰" : `${toFaDigits(historyStartIndex + 1)}–${toFaDigits(historyEndIndex)} از ${toFaDigits(historyTotal)}`}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm md:justify-start">
              <span className="text-black/70 dark:text-neutral-400">تعداد در هر صفحه:</span>
              <div className="inline-flex h-9 overflow-hidden rounded-lg border border-black/10 bg-white dark:border-white/15 dark:bg-white/5">
                {[10, 25, 100].map((count) => {
                  const active = rowsPerPage === count;
                  return <button key={count} type="button" onClick={() => setRowsPerPage(count)} className={`min-w-10 px-3 text-sm font-semibold transition ${active ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-700 hover:bg-black/[0.04] dark:text-white/75 dark:hover:bg-white/10"}`} aria-pressed={active}>{toFaDigits(count)}</button>;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>}

      <div className="mt-4 flex items-center justify-end gap-3" dir="rtl">
        {submitMessage && <span className={submitMessage.includes("شد.") ? "text-xs text-emerald-600 dark:text-emerald-300" : "text-xs text-red-600 dark:text-red-300"}>{submitMessage}</span>}
      </div>

      {previewAllocation && <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/55 p-3 backdrop-blur-sm" dir="rtl" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewAllocation(null); }}>
        <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
            <div>
              <div className="font-bold">جزئیات تخصیص نقدینگی</div>
              <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{previewAllocation.allocationDate} • {previewAllocation.source}</div>
            </div>
            <button type="button" onClick={() => setPreviewAllocation(null)} className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 text-xl dark:border-white/15" aria-label="بستن">×</button>
          </div>
          <div className="max-h-[70vh] overflow-auto p-4">
            <table className="w-full min-w-[720px] table-fixed border-collapse text-xs sm:text-sm">
              <thead className="bg-neutral-100 text-neutral-700 dark:bg-white/[0.08] dark:text-neutral-100">
                <tr>{["مرکز/پروژه", "کل بودجه", "مانده بودجه", "مبلغ تخصیص", "نقدینگی"].map((title) => <th key={title} className="h-12 border-b border-l border-black/10 px-2 text-center font-semibold dark:border-white/10">{title}</th>)}</tr>
              </thead>
              <tbody>
                {(previewAllocation.details || []).map((detail, index) => {
                  const key = String(detail.projectId);
                  const totalBudget = money(summary.allocations[key]);
                  const budgetRemaining = totalBudget - money(summary.committed[key]);
                  const projectAmount = money(detail.amount);
                  const label = detail.project ? projectLabel(detail.project) : "پروژه حذف‌شده";
                  return <tr key={`${key}-${index}`} className="bg-white dark:bg-neutral-900">
                    <td className={tableCellClass + " truncate font-medium"} title={label}>{label}</td>
                    <td className={tableCellClass}>{displayMoney(totalBudget)}</td>
                    <td className={tableCellClass}>{displayMoney(budgetRemaining)}</td>
                    <td className={tableCellClass}>{displayMoney(projectAmount)}</td>
                    <td className={tableCellClass}>{displayMoney(budgetRemaining)}</td>
                  </tr>;
                })}
                <tr className="bg-amber-50/60 dark:bg-amber-400/[0.05]">
                  <td className={tableCellClass + " font-medium"}>ذخیره احتیاطی</td>
                  <td className={tableCellClass}>{displayMoney(money(previewAllocation.availableAmount))}</td>
                  <td className={tableCellClass}>{displayMoney(money(previewAllocation.availableAmount))}</td>
                  <td className={tableCellClass}>{displayMoney(money(previewAllocation.allocatedAmount))}</td>
                  <td className={tableCellClass}>{displayMoney(money(previewAllocation.availableAmount) - money(previewAllocation.allocatedAmount))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>}
    </Card>
  );
}
