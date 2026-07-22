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

function formatAmount(value) {
  const digits = toEnglishDigits(String(value ?? "")).replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("en-US") : "";
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

export default function LiquidityAllocationPage() {
  const { user, isAdmin } = useAuth();
  const [form, setForm] = useState({
    allocationDate: todayFa(),
    source: "",
    amount: "",
    description: "",
  });
  const [customSource, setCustomSource] = useState(false);
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [summary, setSummary] = useState({ allocations: {}, spent: {}, committed: {} });
  const [allocationError, setAllocationError] = useState("");
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
      const selectedProjects = Array.isArray(data?.projects) ? data.projects : [];
      setRows((current) => selectedProjects.map((project) => {
        const existing = current.find((row) => String(row.projectId) === String(project.id));
        return existing || { id: `project-${project.id}`, projectId: project.id, label: projectLabel(project), newAllocation: "" };
      }));
    } catch {
      setSummary({ allocations: {}, spent: {}, committed: {} });
    }
  }, [user?.id]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const updateRow = (id, key, value) => {
    const nextValue = formatSignedAmount(value);
    setRows((current) => current.map((row) => row.id === id ? { ...row, [key]: nextValue } : row));
    setAllocationError("");
  };

  const addProject = async (projectId) => {
    const project = projects.find((item) => String(item.id) === String(projectId));
    if (!project || rows.some((row) => String(row.projectId) === String(project.id))) return;
    setRows((current) => [...current, { id: `project-${project.id}`, projectId: project.id, label: projectLabel(project), newAllocation: "" }]);
    setAddProjectOpen(false);
    try {
      const response = await fetch("/api/liquidity-allocations/projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(user?.id != null ? { "x-user-id": String(user.id) } : {}) },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.error || "project_save_failed");
    } catch {
      setSubmitMessage("پروژه به جدول اضافه شد؛ ذخیره دائمی آن پس از برقراری ارتباط با سرور انجام می‌شود.");
    }
  };

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

  const saveAllocation = async () => {
    const nonZeroRows = rows.filter((row) => money(row.newAllocation) !== 0);
    if (!form.source.trim() || !availableAmount || !nonZeroRows.length) {
      setSubmitMessage("منبع نقدینگی، مبلغ قابل تخصیص و حداقل یک مبلغ تخصیص الزامی است.");
      return;
    }
    setSubmitting(true);
    setSubmitMessage("");
    try {
      const response = await fetch("/api/liquidity-allocations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(user?.id != null ? { "x-user-id": String(user.id) } : {}) },
        body: JSON.stringify({
          allocationDate: form.allocationDate,
          source: form.source,
          availableAmount,
          description: form.description,
          rows: nonZeroRows.map((row) => ({ projectId: row.projectId ?? null, amount: money(row.newAllocation) })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.error || "save_failed");
      setRows((current) => current.map((row) => ({ ...row, newAllocation: "" })));
      setSubmitMessage("تخصیص نقدینگی ثبت شد.");
      await loadSummary();
    } catch (error) {
      setSubmitMessage(error?.message || "ثبت تخصیص انجام نشد.");
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
        {isAdmin && <button type="button" onClick={resetLiquidityData} disabled={resetting} className="grid h-9 w-9 place-items-center rounded-xl border border-red-500/40 text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/30" title="پاک‌سازی تخصیص نقدینگی" aria-label="پاک‌سازی تخصیص نقدینگی"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" /></button>}
      </div>

      <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]" dir="rtl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(150px,0.8fr)_minmax(230px,1.2fr)_minmax(210px,1fr)_minmax(260px,1.5fr)]">
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">تاریخ تخصیص</span>
            <JalaliPopupDatePicker
              value={form.allocationDate}
              onChange={(value) => updateForm("allocationDate", value)}
              placeholder="انتخاب تاریخ"
              buttonClassName={inputClass + " flex items-center justify-between gap-2"}
            />
          </label>

          <div className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">منبع نقدینگی</span>
            {customSource ? (
              <input value={form.source} onChange={(event) => updateForm("source", event.target.value)} placeholder="منبع نقدینگی را وارد کنید" className={inputClass} autoFocus />
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
              >
                <option value="">انتخاب کنید</option>
                {LIQUIDITY_SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}
              </select>
            )}
          </div>

          <label className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">مبلغ قابل تخصیص</span>
            <div className="relative">
              <input
                value={form.amount}
                onChange={(event) => {
                  updateForm("amount", formatAmount(event.target.value));
                }}
                inputMode="numeric"
                placeholder="۰"
                className={inputClass + " pl-14 ltr text-left"}
                aria-label="مبلغ قابل تخصیص به ریال"
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 dark:text-neutral-400">ریال</span>
            </div>
          </label>

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
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs" dir="rtl">
        <span className={allocationError ? "text-red-600 dark:text-red-300" : "text-neutral-500 dark:text-neutral-400"}>
          {allocationError || `نقدینگی ذخیره احتیاطی: ${displayMoney(availableRemaining)} ریال`}
        </span>
        <span className="text-neutral-500 dark:text-neutral-400">جمع مبلغ تخصیص: {displayMoney(newAllocationTotal)} ریال</span>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-900" dir="rtl">
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
                  <td className={tableCellClass}>
                    <input value={row.newAllocation} onChange={(event) => updateRow(row.id, "newAllocation", event.target.value)} inputMode="numeric" placeholder="۰" className={inputClass + " !h-9 !rounded-lg ltr text-left"} aria-label={`مبلغ تخصیص ${row.label}`} />
                  </td>
                  <td className={tableCellClass}>{displayMoney(budgetRemaining + allocationAmount)}</td>
                </tr>
              );
            })}
            <tr className="bg-neutral-50/80 dark:bg-white/[0.025]">
              <td className={tableCellClass}>
                {addProjectOpen ? (
                  <select autoFocus defaultValue="" onChange={(event) => addProject(event.target.value)} className={inputClass + " !h-9 !rounded-lg !py-0 text-xs"} disabled={projectsLoading}>
                    <option value="">{projectsLoading ? "در حال دریافت پروژه‌ها..." : "انتخاب پروژه"}</option>
                    {projects.filter((project) => !rows.some((row) => String(row.projectId) === String(project.id))).map((project) => <option key={project.id} value={project.id}>{projectLabel(project)}</option>)}
                  </select>
                ) : (
                  <button type="button" onClick={() => setAddProjectOpen(true)} className="inline-grid h-8 w-8 place-items-center rounded-lg border border-black/15 text-lg leading-none transition hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/10" aria-label="افزودن پروژه" title="افزودن پروژه فعال">+</button>
                )}
              </td>
              {Array.from({ length: 4 }, (_, index) => <td key={index} className={tableCellClass} />)}
            </tr>
            <tr className="bg-amber-50/60 dark:bg-amber-400/[0.05]">
              <td className={tableCellClass + " font-medium"}>ذخیره احتیاطی</td>
              <td className={tableCellClass}>{displayMoney(availableAmount)}</td>
              <td className={tableCellClass}>{displayMoney(availableAmount)}</td>
              <td className={tableCellClass}>{displayMoney(projectAllocationTotal)}</td>
              <td className={tableCellClass}>{displayMoney(availableRemaining)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3" dir="rtl">
        {submitMessage && <span className={submitMessage.includes("شد.") ? "text-xs text-emerald-600 dark:text-emerald-300" : "text-xs text-red-600 dark:text-red-300"}>{submitMessage}</span>}
        <button type="button" onClick={saveAllocation} disabled={submitting || !!allocationError} className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-900 text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200" aria-label="ثبت تخصیص" title="ثبت تخصیص">
          {submitting ? <span className="text-xs">...</span> : <img src="/images/icons/check.svg" alt="" className="h-5 w-5 invert dark:invert-0" />}
        </button>
      </div>
    </Card>
  );
}
