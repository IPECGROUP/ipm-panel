// تخصیص نقدینگی
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { todayJalaliYmd } from "../utils/date.js";
import { toEnglishDigits } from "../utils/format.js";
import { useFeatureVisibility } from "../hooks/useFeatureAccess.js";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const PAGE_ICON = "/images/icons/modiriat-nagdinegi.svg";
const HISTORY_QUICK_FILTERS = [["week", "هفته قبل"], ["2w", "2 هفته قبل"], ["1m", "یک ماه قبل"], ["3m", "3 ماه قبل"], ["6m", "6 ماه قبل"]];

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
  return digits ? toFaDigits(Number(digits).toLocaleString("en-US")) : "";
}

function toFaDigits(value) {
  return String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function formatSignedAmount(value) {
  const normalized = toEnglishDigits(String(value ?? "")).replace(/,/g, "");
  const negative = normalized.trim().startsWith("-");
  const digits = normalized.replace(/[^\d]/g, "");
  if (!digits) return negative ? "-" : "";
  return `${negative ? "-" : ""}${toFaDigits(Number(digits).toLocaleString("en-US"))}`;
}

function activeProject(project) {
  const value = project?.isActive ?? project?.is_active ?? project?.active;
  return value === true || value === 1 || String(value).toLowerCase() === "true" || String(value) === "1";
}

function mainProject(project) {
  return /^\d+$/.test(toEnglishDigits(String(project?.code || "")).trim());
}

function projectLabel(project) {
  return `${project?.code ? `${project.code} - ` : ""}${project?.name || project?.title || "پروژه بدون نام"}`;
}

function dateKey(value) {
  const parts = toEnglishDigits(String(value ?? "")).replaceAll("-", "/").split("/");
  if (parts.length !== 3) return "";
  return `${parts[0].padStart(4, "0")}${parts[1].padStart(2, "0")}${parts[2].padStart(2, "0")}`;
}

function quickHistoryStartDate(key) {
  if (!key) return "";
  const date = new Date();
  if (key === "week") date.setDate(date.getDate() - 7);
  else if (key === "2w") date.setDate(date.getDate() - 14);
  else if (key === "1m") date.setMonth(date.getMonth() - 1);
  else if (key === "3m") date.setMonth(date.getMonth() - 3);
  else if (key === "6m") date.setMonth(date.getMonth() - 6);
  else return "";
  return toEnglishDigits(new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date));
}

const tableCellClass = "h-10 border-b border-l border-neutral-300 px-3 text-center align-middle dark:border-neutral-700";
const moneyTableCellClass = tableCellClass + " !text-right font-[Vazir]";
const historyTableCellClass = "h-9 border-b border-neutral-300 px-3 text-center align-middle dark:border-neutral-700";
const paginationIconBtnCls = "grid h-9 w-9 place-items-center rounded-lg border border-black/10 text-neutral-700 transition hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:text-neutral-100 dark:hover:bg-white/10";

function HistoryActionMenu({ open, setOpen, selectedCount, deleting, onDelete }) {
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [position, setPosition] = useState(null);
  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 248)), top: rect.bottom + 8 });
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => { if (!triggerRef.current?.contains(event.target) && !popoverRef.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", escape); window.removeEventListener("resize", updatePosition); window.removeEventListener("scroll", updatePosition, true); };
  }, [open, setOpen, updatePosition]);
  return <div className="absolute left-2 top-1/2 z-50 -translate-y-1/2" dir="rtl">
    <button ref={triggerRef} type="button" onClick={() => { if (!open) updatePosition(); setOpen(!open); }} className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/[0.08] dark:hover:bg-white/10" title="مدیریت موارد انتخاب‌شده" aria-label="مدیریت موارد انتخاب‌شده" aria-expanded={open}><img src="/images/icons/menu-table.svg" alt="" className={`h-4 w-3 transition-transform duration-200 ${open ? "scale-110" : ""} invert`} /></button>
    {open && position && createPortal(<div ref={popoverRef} dir="rtl" className="table-menu-popover fixed z-[100] w-60 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 text-right text-neutral-900 shadow-[0_18px_45px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100" style={position}>
      <div className="px-2.5 pb-2 pt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{selectedCount ? `${toFaDigits(selectedCount)} مورد انتخاب شده` : "ابتدا موارد موردنظر را انتخاب کنید"}</div>
      <button type="button" disabled={!selectedCount || deleting} onClick={() => { setOpen(false); onDelete(); }} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45 dark:text-red-300 dark:hover:bg-red-500/10"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-100 transition group-hover:scale-105 dark:bg-red-500/15"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" /></span><span className="min-w-0 flex-1 text-sm font-semibold">{deleting ? "در حال حذف..." : "حذف موارد انتخاب‌شده"}</span></button>
    </div>, document.body)}
  </div>;
}

export default function LiquidityAllocationPage() {
  useFeatureVisibility("تخصیص نقدینگی", { "افزودن": "افزودن" });
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [form, setForm] = useState(emptyAllocationForm);
  const [liquiditySources, setLiquiditySources] = useState([]);
  const [liquiditySourcesLoading, setLiquiditySourcesLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [summary, setSummary] = useState({ allocations: {}, spent: {}, committed: {} });
  const [history, setHistory] = useState([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyFromDate, setHistoryFromDate] = useState("");
  const [historyToDate, setHistoryToDate] = useState("");
  const [historyQuick, setHistoryQuick] = useState("");
  const [previewAllocation, setPreviewAllocation] = useState(null);
  const [budgetOverviewOpen, setBudgetOverviewOpen] = useState(false);
  const [selectedOverviewProjectId, setSelectedOverviewProjectId] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(() => new Set());
  const [historyMenuOpen, setHistoryMenuOpen] = useState(false);
  const [deletingHistory, setDeletingHistory] = useState(false);
  const canDeleteHistory = ["ali", "marandi"].includes(String(user?.username || "").trim().toLowerCase());

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
      setProjects(items.filter((project) => activeProject(project) && mainProject(project)));
    } catch {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, [user?.id]);

  const loadLiquiditySources = useCallback(async () => {
    setLiquiditySourcesLoading(true);
    try {
      const response = await fetch("/api/base/financial-options?category=liquidity", {
        credentials: "include",
        headers: user?.id != null ? { "x-user-id": String(user.id) } : {},
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "liquidity_sources_failed");
      setLiquiditySources(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setLiquiditySources([]);
    } finally {
      setLiquiditySourcesLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadLiquiditySources(); }, [loadLiquiditySources]);
  useEffect(() => {
    if (!projects.length) return;
    setRows((current) => projects.map((project) => {
      const existing = current.find((row) => String(row.projectId) === String(project.id));
      return existing || { id: `project-${project.id}`, projectId: project.id, label: projectLabel(project), newAllocation: "" };
    }));
  }, [projects]);

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
      const selectedProjects = projects.length ? projects : (Array.isArray(data?.projects) ? data.projects : []);
      setRows((current) => selectedProjects.map((project) => {
        const existing = current.find((row) => String(row.projectId) === String(project.id));
        return existing || { id: `project-${project.id}`, projectId: project.id, label: projectLabel(project), newAllocation: "" };
      }));
    } catch {
      setSummary({ allocations: {}, spent: {}, committed: {} });
      setHistory([]);
    }
  }, [projects, user?.id]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const filteredHistory = useMemo(() => {
    const query = toEnglishDigits(historyQuery).trim().toLocaleLowerCase("fa-IR");
    const fromKey = dateKey(historyFromDate);
    const toKey = dateKey(historyToDate);
    const quickFromKey = dateKey(quickHistoryStartDate(historyQuick));
    return history.filter((item) => {
      const itemDateKey = dateKey(item.allocationDate);
      if (quickFromKey && (!itemDateKey || itemDateKey < quickFromKey)) return false;
      if (fromKey && (!itemDateKey || itemDateKey < fromKey)) return false;
      if (toKey && (!itemDateKey || itemDateKey > toKey)) return false;
      if (!query) return true;
      const details = (item.details || []).map((detail) => projectLabel(detail.project || {})).join(" ");
      const searchable = [item.allocationDate, item.source, item.description, item.allocatedAmount, details]
        .map((value) => toEnglishDigits(String(value ?? "")).toLocaleLowerCase("fa-IR"))
        .join(" ");
      return searchable.includes(query);
    });
  }, [history, historyFromDate, historyQuery, historyQuick, historyToDate]);

  const historyTotal = filteredHistory.length;
  const historyPageCount = Math.max(1, Math.ceil(historyTotal / Math.max(1, rowsPerPage)));
  const safeHistoryPage = Math.min(Math.max(0, page), historyPageCount - 1);
  const historyStartIndex = safeHistoryPage * rowsPerPage;
  const historyEndIndex = Math.min(historyTotal, historyStartIndex + rowsPerPage);
  const pagedHistory = filteredHistory.slice(historyStartIndex, historyEndIndex);
  const allPageSelected = pagedHistory.length > 0 && pagedHistory.every((item) => selectedHistory.has(String(item.id)));

  async function deleteSelectedHistory() {
    if (!canDeleteHistory || !selectedHistory.size || deletingHistory) return;
    if (!window.confirm(`آیا ${toFaDigits(selectedHistory.size)} تخصیص انتخاب‌شده حذف شود؟ مبالغ تخصیص پروژه‌ها نیز حذف می‌شوند و این عملیات قابل بازگشت نیست.`)) return;
    setDeletingHistory(true);
    setHistoryMenuOpen(false);
    setSubmitMessage("");
    try {
      const response = await fetch("/api/liquidity-allocations", { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...selectedHistory] }) });
      if (!response.ok) throw new Error("delete_failed");
      setSelectedHistory(new Set());
      await loadSummary();
      setSubmitMessage("تخصیص‌های انتخاب‌شده حذف شد.");
    } catch {
      setSubmitMessage("حذف تخصیص‌های انتخاب‌شده انجام نشد.");
    } finally {
      setDeletingHistory(false);
    }
  }

  useEffect(() => { setPage(0); }, [rowsPerPage]);
  useEffect(() => { setPage(0); }, [historyFromDate, historyQuery, historyQuick, historyToDate]);
  useEffect(() => { if (page !== safeHistoryPage) setPage(safeHistoryPage); }, [page, safeHistoryPage]);

  const money = (value) => {
    const normalized = toEnglishDigits(String(value ?? "")).replace(/,/g, "").trim();
    if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) return 0;
    return Number(normalized) || 0;
  };
  const displayMoney = (value) => value ? toFaDigits(Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })) : "—";
  const displayOverviewMoney = (value) => toFaDigits(Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 }));
  const formatChartAmount = (value) => {
    const amount = Number(value) || 0;
    const magnitude = Math.abs(amount);
    if (magnitude >= 1_000_000_000_000) return `${toFaDigits((amount / 1_000_000_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 }))} هزار میلیارد`;
    if (magnitude >= 1_000_000_000) return `${toFaDigits((amount / 1_000_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 }))} میلیارد`;
    if (magnitude >= 1_000_000) return `${toFaDigits((amount / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 }))} میلیون`;
    return toFaDigits(amount.toLocaleString("en-US", { maximumFractionDigits: 0 }));
  };
  const projectOverview = useMemo(() => {
    const byId = new Map();
    const addProject = (project) => {
      if (project?.id == null) return;
      const key = String(project.id);
      if (!byId.has(key)) byId.set(key, { id: key, label: projectLabel(project), total: 0, allocations: [] });
    };
    projects.forEach(addProject);
    for (const batch of history) {
      for (const detail of batch.details || []) {
        const key = String(detail.projectId);
        if (!byId.has(key)) byId.set(key, { id: key, label: detail.project ? projectLabel(detail.project) : `پروژه ${toFaDigits(key)}`, total: 0, allocations: [] });
        byId.get(key).allocations.push({
          id: batch.id,
          date: batch.allocationDate || "—",
          createdAt: batch.createdAt || "",
          source: batch.source || "—",
          description: batch.description || "",
          amount: money(detail.amount),
        });
      }
    }
    for (const project of byId.values()) {
      project.total = money(summary.allocations[project.id]);
      project.committed = money(summary.committed[project.id]);
      project.spent = money(summary.spent[project.id]);
      project.remaining = project.total - project.committed;
      project.allocations.sort((a, b) => dateKey(a.date).localeCompare(dateKey(b.date)) || a.createdAt.localeCompare(b.createdAt) || String(a.id).localeCompare(String(b.id)));
      let cumulative = 0;
      project.allocations = project.allocations.map((entry, index) => ({ ...entry, sequence: index + 1, cumulative: (cumulative += entry.amount) }));
    }
    return [...byId.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "fa"));
  }, [history, projects, summary.allocations, summary.committed, summary.spent]);
  const selectedOverviewProject = projectOverview.find((project) => project.id === selectedOverviewProjectId) || projectOverview[0];
  const overviewMax = Math.max(0, ...projectOverview.map((project) => Math.abs(project.total)));
  const displayMoneyWithRial = (value) => (
    <span dir="ltr" className="inline-flex w-full items-center justify-end gap-1 whitespace-nowrap">
      <span className="text-xs font-normal">ریال</span>
      <span>{displayMoney(value)}</span>
    </span>
  );
  const projectAllocationTotal = useMemo(() => rows.reduce((total, row) => total + money(row.newAllocation), 0), [rows]);
  const projectTotalBudget = useMemo(
    () => rows.reduce((total, row) => total + money(summary.allocations[String(row.projectId)]), 0),
    [rows, summary.allocations],
  );
  const projectBudgetRemaining = useMemo(
    () => rows.reduce((total, row) => {
      const key = String(row.projectId);
      return total + money(summary.allocations[key]) - money(summary.committed[key]);
    }, 0),
    [rows, summary.allocations, summary.committed],
  );
  const newAllocationTotal = projectAllocationTotal;
  const availableAmount = money(form.amount);
  const amountMissing = showValidation && availableAmount <= 0;
  const sourceMissing = showValidation && !form.source.trim();
  const hasPendingAllocation = rows.some((row) => money(row.newAllocation) !== 0);
  const hasBudgetUnderflow = rows.some((row) => {
    const key = String(row.projectId);
    const budgetRemaining = money(summary.allocations[key]) - money(summary.committed[key]);
    return money(row.newAllocation) < 0 && budgetRemaining + money(row.newAllocation) < 0;
  });
  const allocationError = newAllocationTotal > availableAmount
    ? "جمع مبلغ تخصیص نمی‌تواند بیشتر از مبلغ قابل تخصیص باشد."
    : hasBudgetUnderflow
      ? "مبلغ تخصیص منفی نمی‌تواند مانده بودجه پروژه را منفی کند."
    : "";

  const updateRow = (id, value) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, newAllocation: formatSignedAmount(value) } : row));
    setSubmitMessage("");
  };

  const saveAllocation = async () => {
    const nonZeroRows = rows.filter((row) => money(row.newAllocation) !== 0);
    setShowValidation(true);
    if (!form.source.trim() || availableAmount <= 0) {
      setSubmitMessage("منبع نقدینگی و مبلغ قابل تخصیص را وارد کنید.");
      return;
    }
    if (!nonZeroRows.length) {
      setSubmitMessage("حداقل یک مبلغ تخصیص وارد کنید.");
      return;
    }
    if (newAllocationTotal > availableAmount) {
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
          rows: nonZeroRows.map((row) => ({ projectId: row.projectId, amount: money(row.newAllocation) })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.error || "save_failed");
      setRows((current) => current.map((row) => ({ ...row, newAllocation: "" })));
      setSubmitMessage("تخصیص نقدینگی ثبت شد.");
      await loadSummary();
      setForm(emptyAllocationForm());
      setBatchId("");
      setShowValidation(false);
      setFormOpen(false);
    } catch (error) {
      setSubmitMessage(error?.message === "allocation_total_exceeds_available_amount"
        ? "جمع مبلغ تخصیص نمی‌تواند بیشتر از مبلغ قابل تخصیص باشد."
        : error?.message === "allocation_below_commitments"
          ? "کاهش تخصیص نمی‌تواند مانده پروژه را از تعهدات ثبت‌شده کمتر کند."
        : error?.message || "ثبت تخصیص انجام نشد.");
    } finally {
      setSubmitting(false);
    }
  };

  const exportExcel = async () => {
    try {
      const excelModule = await import("exceljs");
      const ExcelJS = excelModule.default || excelModule;
      const data = formOpen
        ? rows.map((row) => {
          const key = String(row.projectId);
          const total = money(summary.allocations[key]);
          const committed = money(summary.committed[key]);
          const allocation = money(row.newAllocation);
          return [row.label, total, committed, total - committed, allocation, total - committed + allocation];
        })
        : filteredHistory.map((item, index) => [index + 1, item.allocationDate || "", money(item.allocatedAmount), item.source || "", item.description || ""]);
      const headers = formOpen
        ? ["پروژه", "کل تخصیص (ریال)", "تعهدات (ریال)", "مانده (ریال)", "تخصیص جدید (ریال)", "نقدینگی (ریال)"]
        : ["ردیف", "تاریخ تخصیص", "مبلغ تخصیص (ریال)", "منبع نقدینگی", "توضیحات"];
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("تخصیص نقدینگی", { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
      sheet.columns = (formOpen ? [45, 22, 22, 22, 22, 22] : [8, 18, 24, 25, 45]).map((width) => ({ width }));
      sheet.addRow(headers);
      data.forEach((row) => sheet.addRow(row));
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
      sheet.eachRow((row, rowNumber) => {
        row.height = rowNumber === 1 ? 30 : 25;
        row.eachCell((cell, columnNumber) => {
          cell.font = { name: "Tahoma", size: rowNumber === 1 ? 11 : 10, bold: rowNumber === 1, color: { argb: rowNumber === 1 ? "FFFFFFFF" : "FF243746" } };
          cell.alignment = { vertical: "middle", horizontal: rowNumber === 1 ? "center" : (formOpen ? columnNumber === 1 : columnNumber >= 4) ? "right" : "center", readingOrder: "rtl" };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowNumber === 1 ? "FF184A6B" : rowNumber % 2 === 0 ? "FFF2F7FA" : "FFFFFFFF" } };
          cell.border = { bottom: { style: "thin", color: { argb: "FFDCE5EA" } } };
          if (rowNumber > 1 && (formOpen ? columnNumber > 1 : columnNumber === 3)) cell.numFmt = '#,##0.##;[Red]-#,##0.##;0';
        });
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = formOpen ? "liquidity-projects.xlsx" : "liquidity-allocations.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Liquidity Excel export failed", error);
      window.alert("ساخت فایل اکسل انجام نشد. لطفاً دوباره تلاش کنید.");
    }
  };

  return (
    <Card className="liquidity-allocation-page mx-auto min-w-0 max-w-[1400px] rounded-2xl border border-neutral-200 bg-white p-2.5 text-neutral-900 sm:p-3 md:p-4 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-black/[0.07] px-3 pb-3 pt-1 dark:border-white/10 sm:px-4 sm:pb-4 md:mb-5" dir="rtl">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
            <span aria-hidden="true" className="h-6 w-6 bg-[#184a6b] dark:bg-[#8fc4e3]" style={{ WebkitMask: `url(${PAGE_ICON}) center / contain no-repeat`, mask: `url(${PAGE_ICON}) center / contain no-repeat` }} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold text-[#184a6b] dark:text-[#8fc4e3] md:text-lg">تخصیص نقدینگی</span>
            <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت مالی</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={exportExcel} disabled={formOpen ? !rows.length : !filteredHistory.length} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="خروجی اکسل" aria-label="خروجی اکسل">
            <img src="/images/icons8-excel-50.png" alt="" className="h-5 w-5 object-contain" />
          </button>
          <button type="button" onClick={() => setBudgetOverviewOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 px-3 text-xs font-semibold transition hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/10 sm:text-sm" title="بودجه و نقدینگی پروژه‌ها">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19V5M4 19h16M8 15l4-4 3 2 5-6" /></svg>
            <span>بودجه و نقدینگی پروژه‌ها</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (formOpen) {
                setFormOpen(false);
                setBatchId("");
                setForm(emptyAllocationForm());
                setShowValidation(false);
                setRows((current) => current.map((row) => ({ ...row, newAllocation: "" })));
              } else {
                setBatchId(createBatchId());
                setFormOpen(true);
              }
              setSubmitMessage("");
            }}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${formOpen ? "ring-1 ring-black/15 hover:bg-black/5 dark:ring-neutral-800 dark:hover:bg-white/10" : "border border-[#f48120] bg-[#f48120] hover:bg-[#d97018]"}`}
            title={formOpen ? "نمایش جدول" : "افزودن تخصیص"}
            aria-label={formOpen ? "نمایش جدول" : "افزودن تخصیص"}
          >
            {formOpen ? <img src="/images/icons/listdarkhast.svg" alt="" className="h-5 w-5 dark:invert" /> : <Plus aria-hidden="true" className="h-5 w-5 text-white" strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      {formOpen && <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]" dir="rtl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(150px,0.8fr)_minmax(190px,0.96fr)_minmax(210px,1fr)_minmax(300px,1.74fr)]">
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
            <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">نقدینگی قابل تخصیص <span className="text-red-600">*</span></span>
            <div className="relative">
              <input
                value={form.amount}
                onChange={(event) => {
                  updateForm("amount", formatAmount(event.target.value));
                }}
                disabled={hasPendingAllocation}
                inputMode="numeric"
                placeholder="۰"
                className={inputClass + " pl-14 ltr text-left" + (amountMissing ? " !border-red-500 focus:!border-red-500" : "")}
                aria-label="نقدینگی قابل تخصیص به ریال"
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 dark:text-neutral-400">ریال</span>
            </div>
          </label>

          <div className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">منبع نقدینگی <span className="text-red-600">*</span></span>
            <select
              value={liquiditySources.some((option) => String(option.title) === form.source) ? form.source : ""}
              onChange={(event) => updateForm("source", event.target.value)}
              disabled={liquiditySourcesLoading}
              className={inputClass + (sourceMissing ? " !border-red-500 focus:!border-red-500" : "")}
            >
              <option value="">{liquiditySourcesLoading ? "در حال دریافت..." : "انتخاب کنید"}</option>
              {liquiditySources.map((option) => <option key={option.id} value={option.title}>{option.title}</option>)}
            </select>
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

      </div>}

      {formOpen && allocationError && <div className="mt-2 text-xs text-red-600 dark:text-red-300" dir="rtl">{allocationError}</div>}

      {formOpen ? <div className="mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100" dir="rtl">
        <div className="relative max-h-[55vh] overflow-y-auto overflow-x-auto" dir="ltr">
        <table dir="rtl" className="w-full min-w-[860px] table-fixed border-collapse text-sm text-neutral-800 [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:min-w-0 [&_td]:text-center dark:text-neutral-100">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead className="text-neutral-700 dark:text-neutral-100">
            <tr>
              {["پروژه", "کل تخصیص", "تعهدات", "مانده", "تخصیص جدید", "نقدینگی"].map((title) => (
                <th key={title} className={`sticky top-0 z-10 h-9 border-b border-l border-white/10 bg-[#184a6b] px-3 text-[14px] font-semibold text-white md:text-[15px] ${title === "پروژه" ? "!text-right" : "text-center"}`}>{title}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[13px] text-black dark:text-neutral-100">
            {rows.map((row) => {
              const key = String(row.projectId);
              const totalBudget = money(summary.allocations[key]);
              const committed = money(summary.committed[key]);
               const budgetRemaining = totalBudget - committed;
              const allocationAmount = money(row.newAllocation);
              return (
                <tr key={row.id} className="bg-black/[0.02] transition-colors hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10">
                  <td className={tableCellClass + " truncate !text-right font-medium"} title={row.label}>{row.label}</td>
                  <td className={moneyTableCellClass + " bg-sky-50/80 font-medium text-sky-950 dark:bg-sky-500/[0.08] dark:text-sky-100"}>{displayMoneyWithRial(totalBudget)}</td>
                   <td className={moneyTableCellClass}>{displayMoneyWithRial(committed)}</td>
                  <td className={moneyTableCellClass + " bg-orange-50/80 font-medium text-orange-950 dark:bg-orange-500/[0.08] dark:text-orange-100"}>{displayMoneyWithRial(budgetRemaining)}</td>
                  <td className={moneyTableCellClass}>
                    <input value={row.newAllocation} onChange={(event) => updateRow(row.id, event.target.value)} inputMode="numeric" placeholder="۰" className={inputClass + " !h-8 !rounded-lg ltr text-right font-[Vazir]"} aria-label={`مبلغ تخصیص ${row.label}`} />
                  </td>
                  <td className={moneyTableCellClass + " bg-emerald-50/80 font-medium text-emerald-950 dark:bg-emerald-500/[0.08] dark:text-emerald-100"}>{displayMoneyWithRial(budgetRemaining + allocationAmount)}</td>
                </tr>
              );
            })}
            <tr className="bg-neutral-100 dark:bg-white/[0.08]">
              <td className={tableCellClass + " font-medium"}>جمع</td>
              <td className={moneyTableCellClass + " bg-sky-100/80 font-semibold text-sky-950 dark:bg-sky-500/[0.15] dark:text-sky-100"}>{displayMoneyWithRial(projectTotalBudget)}</td>
               <td className={moneyTableCellClass}>{displayMoneyWithRial(rows.reduce((total, row) => total + money(summary.committed[String(row.projectId)]), 0))}</td>
              <td className={moneyTableCellClass + " bg-orange-100/80 font-semibold text-orange-950 dark:bg-orange-500/[0.15] dark:text-orange-100"}>{displayMoneyWithRial(projectBudgetRemaining)}</td>
              <td className={moneyTableCellClass}>{displayMoney(projectAllocationTotal)}</td>
              <td className={moneyTableCellClass + " bg-emerald-100/80 font-semibold text-emerald-950 dark:bg-emerald-500/[0.15] dark:text-emerald-100"}>{displayMoneyWithRial(projectBudgetRemaining + projectAllocationTotal)}</td>
            </tr>
          </tbody>
        </table>
        </div>
        <div className="mt-4 px-3 pb-3">
          <div className="mx-1 h-px bg-neutral-200 dark:bg-white/15" />
          <div className="mt-4 flex items-center justify-end">
            <button type="button" onClick={saveAllocation} disabled={submitting || !!allocationError || projectsLoading} className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-900 text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900" title="ثبت تخصیص" aria-label="ثبت تخصیص">
              {submitting ? <span className="text-xs">...</span> : <img src="/images/icons/check.svg" alt="" className="h-5 w-5 invert dark:invert-0" />}
            </button>
          </div>
        </div>
      </div> : <>
        <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-100/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.06]" dir="rtl">
          <div className="flex flex-wrap items-end gap-2">
            <label className="w-full md:min-w-[280px] md:flex-1">
              <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">جست و جو</span>
              <input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} className={inputClass} placeholder="جستجو در تاریخ، منبع، پروژه و توضیحات..." />
            </label>
            <label className="w-[calc(50%-0.25rem)] md:w-auto md:min-w-[150px]">
              <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">از</span>
              <JalaliPopupDatePicker value={historyFromDate} onChange={setHistoryFromDate} buttonClassName={inputClass + " flex items-center justify-between gap-2"} />
            </label>
            <label className="w-[calc(50%-0.25rem)] md:w-auto md:min-w-[150px]">
              <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">تا</span>
              <JalaliPopupDatePicker value={historyToDate} onChange={setHistoryToDate} buttonClassName={inputClass + " flex items-center justify-between gap-2"} />
            </label>
            {(historyQuery || historyFromDate || historyToDate || historyQuick) && <button type="button" onClick={() => { setHistoryQuery(""); setHistoryFromDate(""); setHistoryToDate(""); setHistoryQuick(""); }} className="h-11 rounded-xl border border-black/10 px-3 text-xs font-medium transition hover:bg-white dark:border-white/15 dark:hover:bg-white/10">پاک کردن فیلتر</button>}
          </div>
          <div className="mt-3">
            <div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">بازه سریع</div>
            <div className="flex flex-wrap gap-2">
              {HISTORY_QUICK_FILTERS.map(([key, label]) => <button key={key} type="button" onClick={() => { setHistoryQuick((current) => current === key ? "" : key); setHistoryFromDate(""); setHistoryToDate(""); }} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${historyQuick === key ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-white text-neutral-700 ring-1 ring-black/10 hover:bg-neutral-50 dark:bg-white/5 dark:text-neutral-200 dark:ring-white/15 dark:hover:bg-white/10"}`}>{label}</button>)}
            </div>
          </div>
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-300 bg-[#fbfbf8] shadow-sm dark:border-white/10 dark:bg-neutral-900" dir="rtl">
        <div dir="ltr" className="max-h-[55vh] overflow-y-auto overflow-x-auto">
        <table dir="rtl" className="w-full min-w-[760px] table-fixed border-collapse text-[13px] text-neutral-800 dark:text-neutral-100">
          <colgroup>
            {canDeleteHistory && <col style={{ width: 40 }} />}
            <col className="w-[8%]" />
            <col className="w-[18%]" />
            <col className="w-[20%]" />
            <col className="w-[24%]" />
            <col className="w-[30%]" />
          </colgroup>
          <thead className="bg-neutral-200 text-neutral-900 dark:bg-white/[0.08] dark:text-neutral-100">
            <tr>
              {canDeleteHistory && <th className="sticky top-0 z-40 bg-[#184a6b] text-white"><input type="checkbox" aria-label="انتخاب همه ردیف‌های این صفحه" className="h-4 w-4 accent-black dark:accent-neutral-200" checked={allPageSelected} onChange={() => setSelectedHistory((current) => { const next = new Set(current); pagedHistory.forEach((item) => allPageSelected ? next.delete(String(item.id)) : next.add(String(item.id))); return next; })} /></th>}
              {["ردیف", "تاریخ تخصیص", "مبلغ تخصیص", "منبع نقدینگی", "توضیحات"].map((title) => (
                 <th key={title} className="sticky top-0 z-10 h-9 bg-[#184a6b] px-3 text-center text-[14px] font-semibold text-white md:text-[15px]">{title}{title === "توضیحات" && canDeleteHistory && <HistoryActionMenu open={historyMenuOpen} setOpen={setHistoryMenuOpen} selectedCount={selectedHistory.size} deleting={deletingHistory} onDelete={deleteSelectedHistory} />}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedHistory.length ? pagedHistory.map((item, index) => (
               <tr key={item.id} onClick={() => setPreviewAllocation(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setPreviewAllocation(item); } }} tabIndex={0} aria-label={`نمایش جزئیات تخصیص ${item.allocationDate || ""}`} className="cursor-pointer bg-black/[0.02] transition-colors hover:bg-black/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-500 dark:bg-white/5 dark:hover:bg-white/10">
                {canDeleteHistory && <td className="border-b border-neutral-300 px-3 text-center dark:border-neutral-700" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`انتخاب تخصیص ${item.allocationDate || ""}`} checked={selectedHistory.has(String(item.id))} onChange={() => setSelectedHistory((current) => { const next = new Set(current); next.has(String(item.id)) ? next.delete(String(item.id)) : next.add(String(item.id)); return next; })} className="h-4 w-4 accent-black dark:accent-neutral-200" /></td>}
                <td className={historyTableCellClass}>{toFaDigits(historyStartIndex + index + 1)}</td>
                <td className={historyTableCellClass}>{toFaDigits(item.allocationDate || "—")}</td>
                <td className={historyTableCellClass}>{displayMoney(money(item.allocatedAmount))}</td>
                <td className={historyTableCellClass + " truncate"} title={item.source}>{item.source || "—"}</td>
                <td className={historyTableCellClass}>
                   <span className="block truncate text-right" title={item.description || ""}>{item.description || "—"}</span>
                </td>
              </tr>
            )) : <tr><td colSpan={canDeleteHistory ? 6 : 5} className="h-24 px-4 text-center text-neutral-500 dark:text-neutral-400">هنوز تخصیصی ثبت نشده است.</td></tr>}
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
                  return <button key={count} type="button" onClick={() => setRowsPerPage(count)} className={`min-w-10 px-3 text-sm font-semibold transition ${active ? "bg-[#184a6b] text-white" : "bg-[#184a6b]/10 text-[#184a6b] hover:bg-[#184a6b]/20 dark:text-sky-200"}`} aria-pressed={active}>{toFaDigits(count)}</button>;
                })}
              </div>
            </div>
          </div>
        </div>
        </div>
      </>}

      <div className="mt-4 flex items-center justify-end gap-3" dir="rtl">
        {submitMessage && <span className={submitMessage.includes("شد.") ? "text-xs text-emerald-600 dark:text-emerald-300" : "text-xs text-red-600 dark:text-red-300"}>{submitMessage}</span>}
      </div>

      {budgetOverviewOpen && <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/55 p-3 backdrop-blur-sm" dir="rtl" onMouseDown={(event) => { if (event.target === event.currentTarget) setBudgetOverviewOpen(false); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="budget-overview-title" className="flex h-[92vh] w-[min(1320px,calc(100vw-20px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
            <div>
              <div id="budget-overview-title" className="font-bold">بودجه و نقدینگی پروژه‌ها</div>
              <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">مجموع تخصیص هر پروژه و ریز نوبت‌های تخصیص</div>
            </div>
            <button type="button" onClick={() => setBudgetOverviewOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-800 text-white shadow-sm transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200" aria-label="بستن" title="بستن"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:p-6">
            <div className="grid h-[clamp(320px,48vh,480px)] min-h-0 shrink-0 grid-cols-2 gap-3 sm:gap-5">
            <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
              <div className="flex items-center justify-between gap-3 bg-[#5d92b7] px-3 py-2 text-white"><h3 className="text-sm font-bold">کل تخصیص پروژه‌ها</h3><span className="text-xs text-white/90">ریال</span></div>
              {projectOverview.length ? <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {projectOverview.map((project) => <button key={project.id} type="button" onClick={() => setSelectedOverviewProjectId(project.id)} className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2 text-right transition ${selectedOverviewProject?.id === project.id ? "bg-sky-50 dark:bg-sky-500/10" : "hover:bg-neutral-50 dark:hover:bg-white/5"}`} aria-pressed={selectedOverviewProject?.id === project.id}>
                  <span className="min-w-0 truncate text-xs font-medium sm:text-sm" title={project.label}>{project.label}</span>
                  <span className="whitespace-nowrap text-xs font-semibold tabular-nums sm:text-sm">{displayOverviewMoney(project.total)}</span>
                  <span className="col-span-2 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10"><span className={`block h-full rounded-full ${project.total < 0 ? "bg-rose-500" : "bg-sky-600 dark:bg-sky-400"}`} style={{ width: `${overviewMax ? Math.max(2, Math.abs(project.total) / overviewMax * 100) : 0}%` }} /></span>
                </button>)}
              </div> : <div className="rounded-xl border border-black/10 p-8 text-center text-sm text-neutral-500 dark:border-white/10">پروژه‌ای برای نمایش وجود ندارد.</div>}
            </section>
              <section className="flex min-h-0 min-w-0 flex-col gap-2">
                {selectedOverviewProject && <h3 className="shrink-0 rounded-t-xl bg-[#5d92b7] px-3 py-2 text-sm font-bold text-white">خلاصه تخصیص</h3>}
                {selectedOverviewProject && <div className="min-w-0"><h3 className="truncate font-bold" title={selectedOverviewProject.label}>{selectedOverviewProject.label}</h3><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{toFaDigits(selectedOverviewProject.allocations.length)} نوبت تخصیص</p></div>}
            {selectedOverviewProject && <section className="shrink-0">
              <div className="grid grid-cols-2 gap-2">
                {[["کل تخصیص", selectedOverviewProject.total, "bg-sky-100 dark:bg-sky-900/60"], ["تعهدات", selectedOverviewProject.committed, "bg-neutral-50 dark:bg-white/[0.04]"], ["مصرف", selectedOverviewProject.spent, "bg-red-100 dark:bg-red-900/60"], ["مانده نقدینگی", selectedOverviewProject.remaining, "bg-emerald-100 dark:bg-emerald-900/60"]].map(([label, value, background]) => <div key={label} className={`rounded-xl border border-black/10 p-2 dark:border-white/10 ${background}`}><div className="text-xs">{label}</div><div className="mt-1 text-xs font-bold tabular-nums sm:text-sm">{displayOverviewMoney(value)} <span className="text-xs font-normal">ریال</span></div></div>)}
              </div>
            </section>}
              {selectedOverviewProject?.allocations.length > 0 ? <>
                <h3 className="rounded-t-xl bg-[#5d92b7] px-3 py-2 text-sm font-bold text-white">روند تخصیص پروژه</h3>
                <div className="min-h-0 flex-1 rounded-b-xl border border-black/10 px-2 pb-2 pt-2 dark:border-white/10" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%"><AreaChart data={[{ sequence: 0, cumulative: 0 }, ...selectedOverviewProject.allocations]} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d4d4d8" vertical={false} />
                    <XAxis dataKey="sequence" tickFormatter={toFaDigits} tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis tickFormatter={formatChartAmount} tickLine={false} axisLine={false} width={92} fontSize={10} />
                    <Tooltip formatter={(value) => [`${displayOverviewMoney(value)} ریال`, "جمع تخصیص"]} labelFormatter={(value) => `نوبت ${toFaDigits(value)}`} />
                    <Area type="stepAfter" dataKey="cumulative" stroke="#0284c7" fill="#0ea5e9" fillOpacity={0.12} strokeWidth={2} dot={selectedOverviewProject.allocations.length < 20} />
                  </AreaChart></ResponsiveContainer>
                </div>
              </> : selectedOverviewProject && <div className="rounded-xl border border-black/10 p-6 text-center text-sm text-neutral-500 dark:border-white/10">برای این پروژه تخصیصی ثبت نشده است.</div>}
              </section>
            </div>
            {selectedOverviewProject?.allocations.length > 0 && <section className="flex min-h-0 flex-1 flex-col">
              <h3 className="rounded-t-xl bg-[#5d92b7] px-3 py-2 text-sm font-bold text-white">ریز تخصیص‌ها</h3>
                <div className="min-h-0 flex-1 overflow-auto rounded-b-xl border border-black/10 dark:border-white/10">
                  <table className="w-full min-w-[680px] text-right text-xs sm:text-sm"><thead className="sticky top-0 z-10 bg-[#184a6b] text-white"><tr>{["نوبت", "تاریخ", "منبع نقدینگی", "مبلغ این نوبت", "جمع تا این نوبت", "توضیحات"].map((title) => <th key={title} className="border-b border-white/10 px-3 py-2 font-semibold">{title}</th>)}</tr></thead>
                    <tbody>{[...selectedOverviewProject.allocations].reverse().map((entry) => <tr key={entry.id} className="border-b border-black/10 last:border-b-0 dark:border-white/10"><td className="px-3 py-2">{toFaDigits(entry.sequence)}</td><td className="whitespace-nowrap px-3 py-2">{toFaDigits(entry.date)}</td><td className="px-3 py-2">{entry.source}</td><td className="whitespace-nowrap px-3 py-2 font-semibold tabular-nums">{displayOverviewMoney(entry.amount)}</td><td className="whitespace-nowrap px-3 py-2 tabular-nums">{displayOverviewMoney(entry.cumulative)}</td><td className="max-w-48 truncate px-3 py-2" title={entry.description}>{entry.description || "—"}</td></tr>)}</tbody>
                  </table>
                </div>
            </section>}
          </div>
        </div>
      </div>}

      {previewAllocation && <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/55 p-3 backdrop-blur-sm" dir="rtl" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewAllocation(null); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="liquidity-detail-title" className="flex max-h-[88vh] w-[min(1040px,calc(100vw-20px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
            <div className="min-w-0">
              <div id="liquidity-detail-title" className="font-bold">جزئیات تخصیص نقدینگی</div>
              <div className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">{toFaDigits(previewAllocation.allocationDate)} • {previewAllocation.source}</div>
            </div>
            <button type="button" onClick={() => setPreviewAllocation(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-800 text-white shadow-sm transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200" aria-label="بستن" title="بستن"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
          </div>
          <div className="min-h-0 overflow-auto p-4 sm:p-5">
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ["نقدینگی قابل تخصیص", money(previewAllocation.availableAmount), "text-neutral-900 dark:text-white"],
                ["جمع مبلغ تخصیص", money(previewAllocation.allocatedAmount), "text-sky-700 dark:text-sky-300"],
              ].map(([label, value, color]) => <div key={label} className="rounded-xl border border-black/10 bg-neutral-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]"><div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div><div className={`mt-1 text-base font-bold ${color}`}>{displayMoney(value)} <span className="text-xs font-normal">ریال</span></div></div>)}
            </div>
            <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
            <table className="w-full min-w-[860px] table-fixed border-collapse text-xs sm:text-sm">
              <thead className="bg-neutral-100 text-neutral-700 dark:bg-white/[0.08] dark:text-neutral-100">
                <tr>{["پروژه", "کل تخصیص", "تعهدات", "مانده", "تخصیص این نوبت", "نقدینگی فعلی"].map((title) => <th key={title} className={`h-12 border-b border-l border-black/10 px-2 font-semibold dark:border-white/10 ${title === "پروژه" ? "text-right" : "text-center"} ${title === "کل تخصیص" ? "bg-sky-100 text-sky-950 dark:bg-sky-500/20 dark:text-sky-100" : title === "مانده" || title === "نقدینگی فعلی" ? "bg-emerald-100 text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-100" : ""}`}>{title}</th>)}</tr>
              </thead>
              <tbody>
                {(previewAllocation.details || []).map((detail, index) => {
                  const key = String(detail.projectId);
                  const totalBudget = money(summary.allocations[key]);
                  const committed = money(summary.committed[key]);
                   const budgetRemaining = totalBudget - committed;
                  const projectAmount = money(detail.amount);
                  const label = detail.project ? projectLabel(detail.project) : "پروژه حذف‌شده";
                  return <tr key={`${key}-${index}`} className="bg-white dark:bg-neutral-900">
                    <td className={tableCellClass + " truncate !text-right font-medium"} title={label}>{label}</td>
                    <td className={moneyTableCellClass + " bg-sky-50/80 font-medium text-sky-950 dark:bg-sky-500/[0.08] dark:text-sky-100"}>{displayMoneyWithRial(totalBudget)}</td>
                     <td className={moneyTableCellClass}>{displayMoneyWithRial(committed)}</td>
                    <td className={moneyTableCellClass + " bg-emerald-50/80 font-medium text-emerald-950 dark:bg-emerald-500/[0.08] dark:text-emerald-100"}>{displayMoneyWithRial(budgetRemaining)}</td>
                    <td className={moneyTableCellClass}>{displayMoney(projectAmount)}</td>
                     <td className={moneyTableCellClass + " bg-emerald-50/80 font-medium text-emerald-950 dark:bg-emerald-500/[0.08] dark:text-emerald-100"}>{displayMoneyWithRial(budgetRemaining)}</td>
                  </tr>;
                })}
                <tr className="bg-neutral-100/80 dark:bg-white/[0.06]">
                  <td className={tableCellClass + " font-medium"}>جمع</td>
                  <td className={moneyTableCellClass + " bg-sky-100/80 font-semibold text-sky-950 dark:bg-sky-500/[0.15] dark:text-sky-100"}>{displayMoneyWithRial((previewAllocation.details || []).reduce((total, detail) => total + money(summary.allocations[String(detail.projectId)]), 0))}</td>
                   <td className={moneyTableCellClass}>{displayMoneyWithRial((previewAllocation.details || []).reduce((total, detail) => total + money(summary.committed[String(detail.projectId)]), 0))}</td>
                  <td className={moneyTableCellClass + " bg-emerald-100/80 font-semibold text-emerald-950 dark:bg-emerald-500/[0.15] dark:text-emerald-100"}>{displayMoneyWithRial((previewAllocation.details || []).reduce((total, detail) => {
                    const key = String(detail.projectId);
                    return total + money(summary.allocations[key]) - money(summary.committed[key]);
                  }, 0))}</td>
                   <td className={moneyTableCellClass}>{displayMoney(money(previewAllocation.allocatedAmount))}</td>
                  <td className={moneyTableCellClass + " bg-emerald-100/80 font-semibold text-emerald-950 dark:bg-emerald-500/[0.15] dark:text-emerald-100"}>{displayMoneyWithRial((previewAllocation.details || []).reduce((total, detail) => {
                    const key = String(detail.projectId);
                     return total + money(summary.allocations[key]) - money(summary.committed[key]);
                  }, 0))}</td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>}
    </Card>
  );
}
