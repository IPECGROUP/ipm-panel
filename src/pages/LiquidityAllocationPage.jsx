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

const tableCellClass = "h-14 border border-black/10 px-2 text-center align-middle dark:border-white/10";

export default function LiquidityAllocationPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    allocationDate: todayFa(),
    source: "",
    amount: "",
    description: "",
  });
  const [customSource, setCustomSource] = useState(false);
  const [rows, setRows] = useState([{ id: "reserve", label: "ذخیره احتیاطی", allocationToDate: "", spent: "", committed: "", newAllocation: "", fixed: true }]);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [summary, setSummary] = useState({ allocations: {}, spent: {}, committed: {} });
  const [allocationError, setAllocationError] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
      const response = await fetch("/api/liquidity-allocations/summary", {
        credentials: "include",
        headers: user?.id != null ? { "x-user-id": String(user.id) } : {},
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "summary_failed");
      setSummary({ allocations: data.allocations || {}, spent: data.spent || {}, committed: data.committed || {} });
    } catch {
      setSummary({ allocations: {}, spent: {}, committed: {} });
    }
  }, [user?.id]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const updateRow = (id, key, value) => {
    const nextValue = formatSignedAmount(value);
    setRows((current) => {
      const nextRows = current.map((row) => row.id === id ? { ...row, [key]: nextValue } : row);
      const nextTotal = nextRows.reduce((total, row) => total + money(row.newAllocation), 0);
      if (nextTotal > money(form.amount)) {
        setAllocationError("جمع تخصیص جدید نمی‌تواند از مبلغ قابل تخصیص بیشتر باشد.");
        return current;
      }
      setAllocationError("");
      return nextRows;
    });
  };

  const addProject = (projectId) => {
    const project = projects.find((item) => String(item.id) === String(projectId));
    if (!project || rows.some((row) => String(row.projectId) === String(project.id))) return;
    setRows((current) => [...current, { id: `project-${project.id}`, projectId: project.id, label: projectLabel(project), allocationToDate: "", spent: "", committed: "", newAllocation: "" }]);
    setAddProjectOpen(false);
  };

  const removeRow = (id) => setRows((current) => current.filter((row) => row.id !== id));

  const money = (value) => {
    const normalized = toEnglishDigits(String(value ?? "")).replace(/,/g, "").trim();
    const negative = normalized.startsWith("-");
    const digits = normalized.replace(/[^\d]/g, "");
    return (negative ? -1 : 1) * (Number(digits) || 0);
  };
  const displayMoney = (value) => value ? Number(value).toLocaleString("en-US") : "—";
  const newAllocationTotal = useMemo(() => rows.reduce((total, row) => total + money(row.newAllocation), 0), [rows]);
  const availableAmount = money(form.amount);
  const availableRemaining = availableAmount - newAllocationTotal;
  const summaryKey = (row) => row.projectId != null ? String(row.projectId) : "reserve";

  const saveAllocation = async () => {
    const nonZeroRows = rows.filter((row) => money(row.newAllocation) !== 0);
    if (!form.source.trim() || !availableAmount || !nonZeroRows.length) {
      setSubmitMessage("منبع نقدینگی، مبلغ قابل تخصیص و حداقل یک تخصیص جدید الزامی است.");
      return;
    }
    if (newAllocationTotal > availableAmount) {
      setAllocationError("جمع تخصیص جدید نمی‌تواند از مبلغ قابل تخصیص بیشتر باشد.");
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

  return (
    <Card className="rounded-2xl border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="mb-5 flex min-w-0 items-center gap-3" dir="rtl">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
          <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-bold md:text-lg">تخصیص نقدینگی</span>
          <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت مالی</span>
        </span>
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
                  const nextAmount = formatAmount(event.target.value);
                  updateForm("amount", nextAmount);
                  if (newAllocationTotal > money(nextAmount)) setAllocationError("جمع تخصیص جدید نمی‌تواند از مبلغ قابل تخصیص بیشتر باشد.");
                  else setAllocationError("");
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
          {allocationError || `مانده قابل تخصیص: ${displayMoney(availableRemaining)} ریال`}
        </span>
        <span className="text-neutral-500 dark:text-neutral-400">جمع تخصیص جدید: {displayMoney(newAllocationTotal)} ریال</span>
      </div>

      <div className="mt-5 overflow-x-auto" dir="rtl">
        <table className="w-full min-w-[1180px] border-collapse text-xs text-neutral-800 dark:text-neutral-100 sm:text-sm">
          <thead className="bg-black/[0.04] dark:bg-white/[0.06]">
            <tr>
              {["مرکز/پروژه", "جمع تخصیص تاکنون", "مصرف شده", "تعهد شده", "مانده فعلی", "تخصیص جدید", "کل تخصیص", "مانده نهایی پس از تخصیص", "اقدامات"].map((title) => (
                <th key={title} className="h-14 border border-black/10 px-2 text-center font-semibold dark:border-white/10">{title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = summaryKey(row);
              const allocationToDate = money(summary.allocations[key]);
              const spent = money(summary.spent[key]);
              const committed = money(summary.committed[key]);
              const newAllocation = money(row.newAllocation);
              const currentBalance = allocationToDate - spent - committed;
              return (
                <tr key={row.id} className="bg-white dark:bg-neutral-900">
                  <td className={tableCellClass + " min-w-[175px] font-medium"}>{row.label}</td>
                  <td className={tableCellClass}>{displayMoney(allocationToDate)}</td>
                  <td className={tableCellClass}>{displayMoney(spent)}</td>
                  <td className={tableCellClass}>{displayMoney(committed)}</td>
                  <td className={tableCellClass}>{displayMoney(currentBalance)}</td>
                  <td className={tableCellClass + " min-w-[150px]"}>
                    <input value={row.newAllocation} onChange={(event) => updateRow(row.id, "newAllocation", event.target.value)} inputMode="numeric" placeholder="۰" className={inputClass + " h-9 ltr text-left"} aria-label={`تخصیص جدید ${row.label}`} />
                  </td>
                  <td className={tableCellClass}>{displayMoney(allocationToDate + newAllocation)}</td>
                  <td className={tableCellClass}>{displayMoney(currentBalance + newAllocation)}</td>
                  <td className={tableCellClass}>
                    {row.fixed ? "—" : <button type="button" onClick={() => removeRow(row.id)} className="rounded-lg border border-red-500/40 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30">حذف</button>}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-white dark:bg-neutral-900">
              <td className={tableCellClass}>
                {addProjectOpen ? (
                  <select autoFocus defaultValue={projects.find((project) => !rows.some((row) => String(row.projectId) === String(project.id)))?.id || ""} onChange={(event) => addProject(event.target.value)} className={inputClass + " h-9"} disabled={projectsLoading}>
                    {projects.filter((project) => !rows.some((row) => String(row.projectId) === String(project.id))).map((project) => <option key={project.id} value={project.id}>{projectLabel(project)}</option>)}
                  </select>
                ) : (
                  <button type="button" onClick={() => setAddProjectOpen(true)} className="inline-grid h-8 w-8 place-items-center rounded-lg border border-black/15 text-lg leading-none transition hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/10" aria-label="افزودن پروژه" title="افزودن پروژه فعال">+</button>
                )}
              </td>
              {Array.from({ length: 8 }, (_, index) => <td key={index} className={tableCellClass} />)}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3" dir="rtl">
        {submitMessage && <span className={submitMessage.includes("شد.") ? "text-xs text-emerald-600 dark:text-emerald-300" : "text-xs text-red-600 dark:text-red-300"}>{submitMessage}</span>}
        <button type="button" onClick={saveAllocation} disabled={submitting || !!allocationError} className="h-10 rounded-xl bg-neutral-900 px-5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
          {submitting ? "در حال ثبت..." : "ثبت تخصیص"}
        </button>
      </div>
    </Card>
  );
}
