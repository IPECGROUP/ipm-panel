// تنخواه گردان
import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Card from "../components/ui/Card.jsx";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { todayJalaliYmd } from "../utils/date.js";
import { format3, toEnglishDigits } from "../utils/format.js";

const PAGE_ICON = "/images/icons/tenkhah.svg";
const tabs = ["تنخواه‌های من", "ثبت هزینه‌ها", "گزارش تسویه تنخواه"];
const inputClass =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-right text-sm text-neutral-900 outline-none transition focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-white";
const toFa = (value) =>
  String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
const today = () => todayJalaliYmd().replaceAll("-", "/");
const emptyExpense = () => ({
  expenseDate: today(),
  description: "",
  budgetCode: "",
  amount: "",
});
const normalizeDigits = (value = "") =>
  toEnglishDigits(String(value ?? "")).replace(/[٠-٩]/g, (digit) =>
    String(digit.charCodeAt(0) - 1632),
  );
const isMainProject = (project) =>
  /^\d{3}$/.test(normalizeDigits(project?.code).trim());

function displayBudgetCode(projectCode = "", budgetCode = "") {
  const project = normalizeDigits(projectCode).trim();
  const budget = normalizeDigits(budgetCode).trim();
  if (!project || !budget) return budget;
  const comparable = (value) =>
    value.replace(/[.-]+/g, ".").replace(/^\.|\.$/g, "");
  const normalizedProject = comparable(project);
  const normalizedBudget = comparable(budget);
  if (
    normalizedBudget === normalizedProject ||
    normalizedBudget.startsWith(`${normalizedProject}.`)
  )
    return budget;
  const separator = budget.includes(".") && !budget.includes("-") ? "." : "-";
  return `${project}${separator}${budget}`;
}

function isSettlementEligible(item) {
  return (
    !item.settlementReportId &&
    item.stage === "completed" &&
    item.projectManagerStatus === "approved"
  );
}

function expenseWorkflowStatus(item) {
  if (item.settlementReportId) return "ثبت‌شده در گزارش تسویه";
  if (item.stage === "completed" && item.projectManagerStatus === "approved")
    return "تأیید مدیر پروژه";
  if (
    item.stage === "rejected" ||
    item.planningStatus === "rejected" ||
    item.projectManagerStatus === "rejected"
  )
    return "رد شده";
  if (item.stage === "project_manager") return "مدیر پروژه";
  return "واحد برنامه‌ریزی";
}

function printSettlementReport() {
  const sheet = document.getElementById("settlement-report-sheet");
  if (!sheet) return;
  const printWindow = window.open("", "_blank", "width=1000,height=850");
  if (!printWindow) return;
  const styles = Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style'),
  )
    .map((node) => node.outerHTML)
    .join("");
  printWindow.addEventListener(
    "load",
    () => {
      const runPrint = () => {
        printWindow.focus();
        printWindow.print();
      };
      if (printWindow.document.fonts?.ready)
        printWindow.document.fonts.ready.then(runPrint, runPrint);
      else runPrint();
    },
    { once: true },
  );
  printWindow.document.open();
  printWindow.document.write(
    `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><base href="${document.baseURI}"><title>گزارش تسویه تنخواه</title>${styles}<style>@page{size:A4 portrait;margin:10mm}html,body{margin:0;background:#fff}body{direction:rtl;-webkit-print-color-adjust:exact;print-color-adjust:exact}#settlement-report-sheet{width:auto!important;min-height:auto!important;max-width:none!important;margin:0!important;padding:0!important;box-shadow:none!important}.settlement-expense-table{break-inside:auto}.settlement-expense-table thead{display:table-header-group}.settlement-expense-table tr{break-inside:avoid}</style></head><body>${sheet.outerHTML}</body></html>`,
  );
  printWindow.document.close();
}

export default function PettyCashPage() {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <Card className="rounded-2xl border border-black/10 bg-white p-0 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        <div className="p-3 md:p-4">
          <header className="mb-5 flex min-w-0 items-center gap-3 border-b border-black/[0.07] pb-4 dark:border-white/10">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 shadow-sm dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04]">
              <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
            </span>
            <span className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight md:text-lg">
                تنخواه گردان
              </h1>
              <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                مدیریت مالی
              </span>
            </span>
          </header>
          <nav
            className="mb-0 grid grid-cols-3 overflow-hidden rounded-t-2xl border border-black/10 dark:border-white/10"
            aria-label="بخش‌های تنخواه گردان"
          >
            {tabs.map((tab, index) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(index)}
                className={`min-w-0 border-r border-black/10 px-3 py-3 text-sm font-semibold transition first:border-r-0 dark:border-white/10 md:px-5 ${activeTab === index ? "bg-black text-white dark:bg-white dark:text-black" : "bg-white text-neutral-900 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-white dark:hover:bg-white/[.04]"}`}
              >
                {tab}
              </button>
            ))}
          </nav>
          {activeTab === 0 && <MyPettyCashTable />}
          {activeTab === 1 && (
            <ExpenseRegistrationTab onReportCreated={() => setActiveTab(2)} />
          )}
          {activeTab === 2 && <PettyCashSettlementReportsTable />}
        </div>
      </Card>
    </div>
  );
}

function MyPettyCashTable() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    setLoading(true);
    setError("");
    fetch("/api/petty-cash-expenses?summary=mine", {
      credentials: "include",
      headers: { "x-user-id": String(user.id) },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(data.error || "خطا در دریافت اطلاعات تنخواه");
        return data;
      })
      .then((data) => {
        if (active) setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const money = (value) => {
    const amount = BigInt(value || "0");
    const absolute = amount < 0n ? -amount : amount;
    return `${amount < 0n ? "−" : ""}${toFa(format3(absolute.toString()))}`;
  };

  return (
    <section className="overflow-hidden rounded-b-2xl border-x border-b border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
      <div
        className="relative hidden max-h-[55vh] overflow-y-auto overflow-x-hidden md:block"
        dir="ltr"
      >
        <table
          dir="rtl"
          className="w-full min-w-[920px] table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:text-center [&_th]:!py-2 [&_td]:!py-2"
        >
          <colgroup>
            <col style={{ width: "6%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "23%" }} />
            <col style={{ width: "23.5%" }} />
            <col style={{ width: "23.5%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-white/10 dark:text-neutral-100">
              <Header>ردیف</Header>
              <Header right>پروژه</Header>
              <Header>مجموع تنخواه دریافت‌شده</Header>
              <Header>
                <span className="block">مجموع هزینه‌های ثبت‌شده</span>
                <span className="mt-0.5 block text-[11px] font-normal text-neutral-600 dark:text-neutral-300">
                  باقی‌مانده هزینه‌های ثبت‌شده
                </span>
              </Header>
              <Header>
                <span className="block">مجموع هزینه‌های تأییدشده</span>
                <span className="mt-0.5 block text-[11px] font-normal text-neutral-600 dark:text-neutral-300">
                  باقی‌مانده هزینه‌های تأییدنشده
                </span>
              </Header>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={item.projectId}
                className="border-b border-black/[0.07] last:border-b-0 dark:border-white/10"
              >
                <td>{toFa(index + 1)}</td>
                <td className="!text-right">
                  <span className="block font-semibold">
                    {normalizeDigits(item.projectCode)} - {item.projectName}
                  </span>
                </td>
                <td className="font-sans tabular-nums">
                  {money(item.receivedAmount)}
                </td>
                <td className="font-sans tabular-nums">
                  <span className="block font-semibold">
                    {money(item.registeredExpenses)}
                  </span>
                  <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">
                    {money(item.registeredBalance)}
                  </span>
                </td>
                <td className="font-sans tabular-nums">
                  <span className="block font-semibold">
                    {money(item.approvedExpenses)}
                  </span>
                  <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">
                    {money(item.unapprovedBalance)}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan="5" className="px-3 py-8 text-neutral-500">
                  هنوز تنخواه یا هزینه‌ای برای شما ثبت نشده است.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan="5" className="px-3 py-8 text-neutral-500">
                  در حال دریافت اطلاعات...
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan="5" className="px-3 py-8 text-red-600 dark:text-red-400">
                  {error}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 p-3 md:hidden">
        {items.map((item, index) => (
          <article
            key={item.projectId}
            className="rounded-xl border border-black/10 p-3 dark:border-white/10"
          >
            <div className="mb-3 font-semibold">
              {toFa(index + 1)}. {normalizeDigits(item.projectCode)} - {item.projectName}
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <SummaryAmount label="مجموع تنخواه دریافت‌شده" value={money(item.receivedAmount)} />
              <SummaryAmount label="مجموع هزینه‌های ثبت‌شده" value={money(item.registeredExpenses)} />
              <SummaryAmount label="باقی‌مانده هزینه‌های ثبت‌شده" value={money(item.registeredBalance)} />
              <SummaryAmount label="مجموع هزینه‌های تأییدشده" value={money(item.approvedExpenses)} />
              <SummaryAmount label="باقی‌مانده هزینه‌های تأییدنشده" value={money(item.unapprovedBalance)} />
            </div>
          </article>
        ))}
        {loading && <div className="py-6 text-center text-sm text-neutral-500">در حال دریافت اطلاعات...</div>}
        {!loading && !error && items.length === 0 && <div className="py-6 text-center text-sm text-neutral-500">هنوز تنخواه یا هزینه‌ای برای شما ثبت نشده است.</div>}
        {error && <div className="py-6 text-center text-sm text-red-600 dark:text-red-400">{error}</div>}
      </div>
    </section>
  );
}

function SummaryAmount({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-neutral-50 px-3 py-2 dark:bg-white/[.04]">
      <span className="text-neutral-600 dark:text-neutral-300">{label}</span>
      <span className="shrink-0 font-sans font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function reportPreparedDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
function PettyCashSettlementReportsTable() {
  const { user } = useAuth();
  const userId = user?.id;
  const [reports, setReports] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(null);
  const api = useCallback(
    async (path) => {
      const response = await fetch(`/api${path}`, {
        credentials: "include",
        headers: { ...(userId ? { "x-user-id": String(userId) } : {}) },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "خطا در دریافت گزارش‌ها");
      return data;
    },
    [userId],
  );
  useEffect(() => {
    let active = true;
    api("/petty-cash-expenses?reports=1")
      .then((data) => {
        if (active) setReports(Array.isArray(data.items) ? data.items : []);
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api]);
  const openReport = async (report) => {
    setError("");
    try {
      const data = await api(
        `/petty-cash-expenses?reports=1&reportId=${encodeURIComponent(report.id)}`,
      );
      setPreview(data);
    } catch (reason) {
      setError(reason.message);
    }
  };
  return (
    <section className="overflow-hidden rounded-b-2xl border-x border-b border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
      {error && (
        <div className="m-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:text-center [&_th]:!py-3 [&_td]:!py-3">
          <colgroup>
            <col style={{ width: "10%" }} />
            <col style={{ width: "35%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "23%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-white/10 dark:text-neutral-100">
              <Header>ردیف</Header>
              <Header right>پروژه</Header>
              <Header>شماره گزارش</Header>
              <Header>تاریخ تهیه گزارش</Header>
              <Header>تعداد</Header>
            </tr>
          </thead>
          <tbody>
            {reports.length ? (
              reports.map((report, index) => (
                <tr
                  key={report.id}
                  tabIndex={0}
                  role="button"
                  onClick={() => openReport(report)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ")
                      openReport(report);
                  }}
                  className="cursor-pointer border-b border-neutral-300 bg-white transition hover:bg-sky-50 focus:bg-sky-50 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-sky-500/10 dark:focus:bg-sky-500/10"
                >
                  <Cell>{toFa(index + 1)}</Cell>
                  <Cell right>
                    {toFa(report.projectCode)}
                    {report.projectName ? ` - ${report.projectName}` : ""}
                  </Cell>
                  <Cell dir="ltr" className="font-sans font-semibold">
                    {toFa(report.reportNumber)}
                  </Cell>
                  <Cell>{reportPreparedDate(report.preparedAt)}</Cell>
                  <Cell>
                    <span className="inline-grid min-w-8 place-items-center rounded-full bg-sky-100 px-2 py-1 font-bold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                      {toFa(report.itemCount)}
                    </span>
                  </Cell>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="5"
                  className="h-28 border-b border-neutral-300 text-center text-sm text-neutral-400 dark:border-neutral-700 dark:text-neutral-500"
                >
                  {loading
                    ? "در حال دریافت گزارش‌ها..."
                    : "گزارشی برای نمایش وجود ندارد."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {preview && (
        <SettlementReportPreview
          data={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </section>
  );
}

function ExpenseRegistrationTab({ onReportCreated }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]),
    [budgetItems, setBudgetItems] = useState([]),
    [items, setItems] = useState([]),
    [viewer, setViewer] = useState({}),
    [projectId, setProjectId] = useState(""),
    [formOpen, setFormOpen] = useState(false),
    [form, setForm] = useState(emptyExpense),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [managers, setManagers] = useState([]),
    [approval, setApproval] = useState(null),
    [selectedManagerId, setSelectedManagerId] = useState(""),
    [details, setDetails] = useState(null),
    [selectedIds, setSelectedIds] = useState(() => new Set()),
    [confirmingReport, setConfirmingReport] = useState(false);
  const api = useCallback(
    async (path, options = {}) => {
      const response = await fetch(`/api${path}`, {
        credentials: "include",
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(user?.id ? { "x-user-id": String(user.id) } : {}),
          ...(options.headers || {}),
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "خطا در انجام عملیات");
      return data;
    },
    [user?.id],
  );
  const loadExpenses = useCallback(
    async (nextProjectId = projectId) => {
      try {
        const data = await api(
          `/petty-cash-expenses${nextProjectId ? `?projectId=${encodeURIComponent(nextProjectId)}` : ""}`,
        );
        const nextItems = Array.isArray(data.items) ? data.items : [];
        setItems(nextItems);
        setSelectedIds(
          (current) =>
            new Set(
              [...current].filter((id) =>
                nextItems.some(
                  (item) =>
                    String(item.id) === String(id) &&
                    isSettlementEligible(item),
                ),
              ),
            ),
        );
        setViewer(data.viewer || {});
      } catch (reason) {
        setError(reason.message);
      }
    },
    [api, projectId],
  );
  useEffect(() => {
    api("/projects?isActive=true")
      .then((data) =>
        setProjects(
          (data.items || data.projects || []).filter(
            (project) => project.isActive !== false && isMainProject(project),
          ),
        ),
      )
      .catch((reason) => setError(reason.message));
  }, [api]);
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);
  const selectProject = async (value) => {
    setProjectId(value);
    setForm(emptyExpense());
    setBudgetItems([]);
    setError("");
    if (!value) return loadExpenses("");
    try {
      const [budgets] = await Promise.all([
        api(`/cost-breakdown?project_id=${encodeURIComponent(value)}`),
        loadExpenses(value),
      ]);
      setBudgetItems(budgets.items || []);
    } catch (reason) {
      setError(reason.message);
    }
  };
  const addExpense = async () => {
    if (!projectId) return setError("ابتدا پروژه را انتخاب کنید.");
    if (
      !form.expenseDate ||
      !form.description.trim() ||
      !form.budgetCode ||
      !toEnglishDigits(form.amount).replace(/[^\d]/g, "")
    )
      return setError("تمام فیلدهای هزینه را تکمیل کنید.");
    setSaving(true);
    setError("");
    try {
      await api("/petty-cash-expenses", {
        method: "POST",
        body: JSON.stringify({ projectId, ...form }),
      });
      setForm(emptyExpense());
      setFormOpen(false);
      await loadExpenses(projectId);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  };
  const openPlanningApproval = async (item) => {
    setError("");
    try {
      const data = await api("/petty-cash-expenses?recipients=project_manager");
      setManagers(data.users || []);
      setSelectedManagerId("");
      setApproval(item);
    } catch (reason) {
      setError(reason.message);
    }
  };
  const decide = async (id, decision, projectManagerId) => {
    setSaving(true);
    setError("");
    try {
      await api("/petty-cash-expenses", {
        method: "PATCH",
        body: JSON.stringify({
          id,
          decision,
          ...(projectManagerId ? { projectManagerId } : {}),
        }),
      });
      setApproval(null);
      await loadExpenses(projectId);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  };
  const createSettlementReport = async () => {
    if (selectedIds.size < 2) return;
    setConfirmingReport(false);
    setSaving(true);
    setError("");
    try {
      await api("/petty-cash-expenses", {
        method: "POST",
        body: JSON.stringify({
          action: "create_settlement_report",
          expenseIds: [...selectedIds],
        }),
      });
      setSelectedIds(new Set());
      await loadExpenses(projectId);
      onReportCreated?.();
    } catch (reason) {
      const messages = {
        expenses_must_have_same_project:
          "همه ردیف‌های یک گزارش باید متعلق به یک پروژه باشند.",
        expense_already_grouped:
          "حداقل یکی از ردیف‌ها قبلاً وارد گزارش تسویه شده است.",
        expenses_not_project_manager_approved:
          "فقط ردیف‌های تأییدشده توسط مدیر پروژه قابل ارسال هستند.",
        at_least_two_expenses_required: "حداقل دو ردیف را انتخاب کنید.",
        not_allowed: "اجازه ایجاد گزارش از این ردیف‌ها را ندارید.",
      };
      setError(messages[reason.message] || reason.message);
    } finally {
      setSaving(false);
    }
  };
  const showManagerColumn = viewer.isProjectManager && !viewer.isPlanning,
    showPlanningColumn = viewer.isPlanning || showManagerColumn;
  const selectedProject = projects.find(
    (project) => String(project.id) === String(projectId),
  );
  const selectableItems = items.filter(isSettlementEligible);
  const toggleItem = (id) => {
    if (!isSettlementEligible(items.find((item) => item.id === id))) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const allSelected =
    selectableItems.length > 0 &&
    selectableItems.every((item) => selectedIds.has(item.id));
  const toggleAll = () =>
    setSelectedIds(
      allSelected ? new Set() : new Set(selectableItems.map((item) => item.id)),
    );
  return (
    <section className="rounded-b-2xl border-x border-b border-black/10 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900 md:p-4">
      <div className="mb-4 flex w-full items-end justify-between gap-4">
        <Field label="پروژه" className="min-w-0 flex-1 sm:max-w-[22rem]">
          <select
            value={projectId}
            onChange={(event) => selectProject(event.target.value)}
            className={inputClass}
          >
            <option value="">انتخاب کنید</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {normalizeDigits(project.code)} - {project.name}
              </option>
            ))}
          </select>
        </Field>
        <button
          type="button"
          onClick={() => {
            setError("");
            setFormOpen((open) => !open);
          }}
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-neutral-300 bg-white text-neutral-500 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50 dark:border-white/20 dark:bg-white/5 dark:text-neutral-300"
          title="افزودن هزینه"
          aria-label="افزودن هزینه"
        >
          <span className="absolute h-px w-5 bg-current" />
          <span className="absolute h-5 w-px bg-current" />
        </button>
      </div>
      {formOpen && (
        <div className="mb-4 grid grid-cols-1 items-end gap-3 rounded-2xl border border-black/10 bg-neutral-50/70 p-3 dark:border-white/10 dark:bg-white/[.03] md:grid-cols-[150px_minmax(180px,1fr)_minmax(180px,1fr)_170px_44px]">
          <Field label="تاریخ">
            <JalaliPopupDatePicker
              value={form.expenseDate}
              onChange={(expenseDate) =>
                setForm((current) => ({ ...current, expenseDate }))
              }
              buttonClassName={`${inputClass} flex items-center justify-between`}
            />
          </Field>
          <Field label="شرح">
            <input
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="کد بودجه">
            <select
              value={form.budgetCode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  budgetCode: event.target.value,
                }))
              }
              className={inputClass}
              disabled={!projectId}
            >
              <option value="">
                {projectId ? "انتخاب کنید" : "ابتدا پروژه را انتخاب کنید"}
              </option>
              {budgetItems.map((item) => (
                <option key={item.id} value={item.budgetCode}>
                  {displayBudgetCode(selectedProject?.code, item.budgetCode)}
                  {item.budgetName ? ` - ${item.budgetName}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="مبلغ (ریال)">
            <input
              dir="ltr"
              inputMode="numeric"
              value={toFa(form.amount)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  amount: format3(
                    toEnglishDigits(event.target.value).replace(/[^\d]/g, ""),
                  ),
                }))
              }
              className={`${inputClass} text-left font-sans tabular-nums`}
            />
          </Field>
          <button
            type="button"
            onClick={addExpense}
            disabled={saving}
            className="grid h-11 w-11 place-items-center rounded-xl bg-neutral-900 text-2xl leading-none text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
            title="ثبت هزینه"
          >
            +
          </button>
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}
      <ExpenseTable
        items={items}
        selectedIds={selectedIds}
        allSelected={allSelected}
        selectableCount={selectableItems.length}
        showPlanningColumn={showPlanningColumn}
        showManagerColumn={showManagerColumn}
        viewer={viewer}
        onToggleItem={toggleItem}
        onToggleAll={toggleAll}
        onPlanningApprove={openPlanningApproval}
        onPlanningReject={(item) => decide(item.id, "reject")}
        onManagerApprove={(item) => decide(item.id, "approve")}
        onManagerReject={(item) => decide(item.id, "reject")}
        onDetails={setDetails}
        saving={saving}
      />
      {selectedIds.size > 1 && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => setConfirmingReport(true)}
            disabled={saving}
            className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-900 text-lg font-bold text-white shadow-sm disabled:opacity-50 dark:bg-white dark:text-neutral-900"
            title="ایجاد گزارش تسویه از موارد انتخاب‌شده"
            aria-label="ایجاد گزارش تسویه از موارد انتخاب‌شده"
          >
            ✓
          </button>
        </div>
      )}
      {confirmingReport && (
        <SettlementConfirmationModal
          count={selectedIds.size}
          saving={saving}
          onCancel={() => setConfirmingReport(false)}
          onConfirm={createSettlementReport}
        />
      )}
      {approval && (
        <ManagerModal
          item={approval}
          managers={managers}
          selectedManagerId={selectedManagerId}
          setSelectedManagerId={setSelectedManagerId}
          onClose={() => setApproval(null)}
          onConfirm={() => decide(approval.id, "approve", selectedManagerId)}
          saving={saving}
        />
      )}
      {details && (
        <ApprovalDetailsModal item={details} onClose={() => setDetails(null)} />
      )}
    </section>
  );
}

function LockIcon({ reportNumber }) {
  return (
    <span
      className="mx-auto grid h-7 w-7 place-items-center rounded-lg bg-neutral-200 text-neutral-600 dark:bg-white/10 dark:text-neutral-300"
      title={`ارسال‌شده در گزارش ${reportNumber || "تسویه"}`}
      aria-label="این ردیف قبلاً وارد گزارش تسویه شده است"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    </span>
  );
}
function ExpenseTable({
  items,
  selectedIds,
  allSelected,
  selectableCount,
  showPlanningColumn,
  showManagerColumn,
  viewer,
  onToggleItem,
  onToggleAll,
  onPlanningApprove,
  onPlanningReject,
  onManagerApprove,
  onManagerReject,
  onDetails,
  saving,
}) {
  const colSpan = 8 + Number(showPlanningColumn) + Number(showManagerColumn);
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
      <div className="overflow-x-auto" dir="ltr">
        <table
          dir="rtl"
          className="w-full min-w-[1050px] table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:text-center [&_th]:!py-2 [&_td]:!py-2"
        >
          <thead>
            <tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-white/10 dark:text-neutral-100">
              <Header>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  disabled={!selectableCount}
                  className="h-4 w-4 rounded border-neutral-400 align-middle accent-neutral-900 disabled:opacity-40 dark:accent-white"
                  aria-label="انتخاب همه ردیف‌های تأییدشده"
                />
              </Header>
              <Header>ردیف</Header>
              <Header>تاریخ</Header>
              <Header right>شرح هزینه</Header>
              <Header>کد بودجه</Header>
              <Header>مبلغ (ریال)</Header>
              <Header>وضعیت</Header>
              {showPlanningColumn && <Header>برنامه‌ریزی</Header>}
              {showManagerColumn && <Header>مدیر پروژه</Header>}
              <Header>
                <span className="sr-only">اطلاعات تأیید</span>
              </Header>
            </tr>
          </thead>
          <tbody className="text-[13px] text-black [&>tr]:h-10 dark:text-neutral-100">
            {items.length ? (
              items.map((item, index) => (
                <tr
                  key={item.id}
                  className={`bg-black/[0.02] hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10 ${item.settlementReportId ? "text-neutral-500 dark:text-neutral-400" : ""}`}
                >
                  <Cell>
                    {item.settlementReportId ? (
                      <LockIcon reportNumber={item.settlementReportNumber} />
                    ) : isSettlementEligible(item) ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => onToggleItem(item.id)}
                        className="h-4 w-4 rounded border-neutral-400 align-middle accent-neutral-900 dark:accent-white"
                        aria-label={`انتخاب ردیف ${toFa(index + 1)}`}
                      />
                    ) : (
                      <span
                        className="text-neutral-300 dark:text-neutral-600"
                        title="پس از تأیید مدیر پروژه قابل انتخاب است"
                      >
                        —
                      </span>
                    )}
                  </Cell>
                  <Cell>{toFa(index + 1)}</Cell>
                  <Cell>{toFa(item.expenseDate)}</Cell>
                  <Cell right>{item.description}</Cell>
                  <Cell dir="ltr">
                    {toFa(displayBudgetCode(item.projectCode, item.budgetCode))}
                  </Cell>
                  <Cell dir="ltr" className="font-sans tabular-nums">
                    {toFa(format3(item.amount))}
                  </Cell>
                  <Cell>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.stage === "completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : item.stage === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}
                    >
                      {expenseWorkflowStatus(item)}
                    </span>
                  </Cell>
                  {showPlanningColumn && (
                    <Cell>
                      <WorkflowCell
                        status={item.planningStatus}
                        canAct={viewer.isPlanning && item.stage === "planning"}
                        onApprove={() => onPlanningApprove(item)}
                        onReject={() => onPlanningReject(item)}
                        disabled={saving}
                      />
                    </Cell>
                  )}
                  {showManagerColumn && (
                    <Cell>
                      <WorkflowCell
                        status={item.projectManagerStatus}
                        canAct={
                          item.stage === "project_manager" &&
                          Number(item.projectManagerId) ===
                            Number(viewer.userId)
                        }
                        onApprove={() => onManagerApprove(item)}
                        onReject={() => onManagerReject(item)}
                        disabled={saving}
                      />
                    </Cell>
                  )}
                  <Cell>
                    <button
                      type="button"
                      onClick={() => onDetails(item)}
                      className="mx-auto grid h-7 w-7 place-items-center rounded-full border border-neutral-400 bg-white font-serif text-sm font-bold italic text-neutral-600 transition hover:border-neutral-700 hover:text-neutral-900 dark:border-neutral-500 dark:bg-white/5 dark:text-neutral-300"
                      title="جزئیات تأییدها"
                      aria-label="نمایش جزئیات تأییدها"
                    >
                      i
                    </button>
                  </Cell>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={colSpan} className="p-8" />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function WorkflowCell({ status, canAct, onApprove, onReject, disabled }) {
  if (status === "approved")
    return (
      <span className="inline-grid h-7 w-7 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
        ✓
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-grid h-7 w-7 place-items-center rounded-full bg-red-100 font-bold text-red-700 dark:bg-red-500/15 dark:text-red-300">
        ×
      </span>
    );
  if (!canAct) return <span className="text-neutral-400">—</span>;
  return (
    <span className="inline-flex items-center justify-center gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={onApprove}
        className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-600 font-bold text-white disabled:opacity-50"
        title="تأیید"
      >
        ✓
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onReject}
        className="grid h-7 w-7 place-items-center rounded-lg bg-red-600 font-bold text-white disabled:opacity-50"
        title="رد"
      >
        ×
      </button>
    </span>
  );
}
function ManagerModal({
  item,
  managers,
  selectedManagerId,
  setSelectedManagerId,
  onClose,
  onConfirm,
  saving,
}) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
        <h2 className="text-base font-bold">ارسال به مدیر پروژه</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          مدیر پروژهٔ مسئول برای هزینه «{item.description}» را انتخاب کنید.
        </p>
        <Field label="مدیر پروژه" className="mt-4">
          <select
            value={selectedManagerId}
            onChange={(event) => setSelectedManagerId(event.target.value)}
            className={inputClass}
          >
            <option value="">انتخاب کنید</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name || manager.username || `کاربر ${manager.id}`}
              </option>
            ))}
          </select>
        </Field>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-black/10 px-4 text-sm font-semibold dark:border-white/15"
          >
            انصراف
          </button>
          <button
            type="button"
            disabled={!selectedManagerId || saving}
            onClick={onConfirm}
            className="h-10 rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            تأیید و ارسال
          </button>
        </div>
      </div>
    </div>
  );
}
function SettlementConfirmationModal({ count, saving, onCancel, onConfirm }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[1150] flex items-center justify-center bg-black/45 p-4"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settlement-confirm-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onCancel}
        aria-label="بستن"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-black/10 bg-white p-5 text-center shadow-2xl dark:border-white/10 dark:bg-neutral-900">
        <h2 id="settlement-confirm-title" className="text-base font-bold">
          تأیید ارسال
        </h2>
        <p className="mt-3 text-sm leading-7 text-neutral-600 dark:text-neutral-300">
          شما {toFa(count)} ردیف انتخاب کرده‌اید. از ارسال آن‌ها مطمئن هستید؟
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="grid h-11 w-11 place-items-center rounded-xl bg-red-600 text-xl font-bold text-white disabled:opacity-50"
            title="انصراف"
            aria-label="انصراف"
          >
            ×
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-600 text-lg font-bold text-white disabled:opacity-50"
            title="تأیید و ارسال"
            aria-label="تأیید و ارسال"
          >
            ✓
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
function approvalStatusText(status) {
  return status === "approved"
    ? "تأیید شده"
    : status === "rejected"
      ? "رد شده"
      : "در انتظار بررسی";
}
function approvalActor(item, prefix) {
  return (
    item[`${prefix}ByName`] ||
    item[`${prefix}ByUsername`] ||
    (item[`${prefix}ById`] ? `کاربر ${toFa(item[`${prefix}ById`])}` : "—")
  );
}
function approvalDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    jalali: new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date),
    gregorian: new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date),
    time: new Intl.DateTimeFormat("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date),
  };
}
function ApprovalDetailRow({ label, status, actor, at }) {
  const date = approvalDateTime(at);
  const decided = status === "approved" || status === "rejected";
  return (
    <div className="rounded-xl border border-black/10 bg-neutral-50 px-4 py-3 dark:border-white/10 dark:bg-white/[.04]">
      <div className="text-sm leading-7">
        <span className="font-bold">{label}:</span>{" "}
        <span>{approvalStatusText(status)}</span>
        {decided && <span> توسط {actor}</span>}
      </div>
      {date && (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          <span>{date.jalali}</span>
          <span aria-hidden="true">•</span>
          <span dir="ltr" className="font-sans tabular-nums">
            {date.gregorian}
          </span>
          <span aria-hidden="true">•</span>
          <span>ساعت {date.time}</span>
        </div>
      )}
    </div>
  );
}
function ApprovalDetailsModal({ item, onClose }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/45 p-4"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="approval-details-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="بستن"
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-black/10 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="approval-details-title" className="text-base font-bold">
              جزئیات تأیید هزینه
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {item.description || "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-black/10 text-xl dark:border-white/15"
            aria-label="بستن"
          >
            ×
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <ApprovalDetailRow
            label="برنامه‌ریزی"
            status={item.planningStatus}
            actor={approvalActor(item, "planning")}
            at={item.planningAt}
          />
          <ApprovalDetailRow
            label="مدیر پروژه"
            status={item.projectManagerStatus}
            actor={approvalActor(item, "projectManager")}
            at={item.projectManagerAt}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
function ReportInfoCell({ label, children }) {
  return (
    <div className="min-h-14 border-b border-l border-slate-200 px-3 py-2 last:border-l-0">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-900">
        {children || "—"}
      </div>
    </div>
  );
}
function SettlementExpenseTable({ items }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
        <span className="h-5 w-1 rounded-full bg-sky-700" />
        جزئیات هزینه‌ها
      </h3>
      <div className="overflow-hidden rounded-xl border border-slate-300">
        <table className="settlement-expense-table w-full table-fixed border-collapse text-[11px]">
          <colgroup>
            <col className="w-[6%]" />
            <col className="w-[14%]" />
            <col className="w-[28%]" />
            <col className="w-[14%]" />
            <col className="w-[15%]" />
            <col className="w-[11.5%]" />
            <col className="w-[11.5%]" />
          </colgroup>
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="border-b border-l border-slate-300 px-2 py-2">
                ردیف
              </th>
              <th className="border-b border-l border-slate-300 px-2 py-2">
                تاریخ
              </th>
              <th className="border-b border-l border-slate-300 px-2 py-2 text-center">
                شرح هزینه
              </th>
              <th className="border-b border-l border-slate-300 px-2 py-2">
                کد بودجه
              </th>
              <th className="border-b border-l border-slate-300 px-2 py-2">
                مبلغ (ریال)
              </th>
              <th className="border-b border-l border-slate-300 px-2 py-2">
                برنامه‌ریزی
              </th>
              <th className="border-b border-slate-300 px-2 py-2">
                مدیر پروژه
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="align-middle text-slate-900">
                <td className="border-b border-l border-slate-200 px-2 py-2 text-center">
                  {toFa(index + 1)}
                </td>
                <td className="border-b border-l border-slate-200 px-2 py-2 text-center">
                  {toFa(item.expenseDate)}
                </td>
                <td className="border-b border-l border-slate-200 px-2 py-2 text-center leading-5">
                  {item.description || "—"}
                </td>
                <td
                  dir="ltr"
                  className="border-b border-l border-slate-200 px-2 py-2 text-center"
                >
                  {toFa(displayBudgetCode(item.projectCode, item.budgetCode))}
                </td>
                <td
                  dir="ltr"
                  className="border-b border-l border-slate-200 px-2 py-2 text-center font-sans tabular-nums"
                >
                  {toFa(format3(item.amount))}
                </td>
                <td className="border-b border-l border-slate-200 px-2 py-2 text-center">
                  {approvalStatusText(item.planningStatus)}
                </td>
                <td className="border-b border-slate-200 px-2 py-2 text-center">
                  {approvalStatusText(item.projectManagerStatus)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function SettlementReportPreview({ data, onClose }) {
  const report = data.report || {};
  const items = Array.isArray(data.items) ? data.items : [];
  const total = items.reduce(
    (sum, item) =>
      sum + BigInt(String(item.amount || "0").replace(/[^\d]/g, "") || "0"),
    0n,
  );
  const prepared = approvalDateTime(report.preparedAt);
  return createPortal(
    <div
      className="fixed inset-0 z-[1200] bg-slate-200/95"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settlement-report-title"
    >
      <div className="sticky top-0 z-10 flex items-center justify-center gap-3 border-b border-slate-300 bg-slate-100/95 p-3 backdrop-blur">
        <button
          type="button"
          onClick={printSettlementReport}
          className="h-11 rounded-xl bg-sky-800 px-5 text-sm font-bold text-white shadow-sm"
        >
          خروجی PDF
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-xl border border-slate-800 bg-white px-5 text-sm font-bold text-slate-900 shadow-sm"
        >
          بستن پیش‌نمایش
        </button>
      </div>
      <div className="h-[calc(100vh-69px)] overflow-y-auto p-3 md:p-6">
        <article
          id="settlement-report-sheet"
          className="mx-auto min-h-[297mm] w-[210mm] max-w-full bg-white px-5 py-7 text-slate-900 shadow-2xl md:px-10 md:py-10"
        >
          <header className="grid min-h-24 grid-cols-1 overflow-hidden rounded-2xl border border-slate-800 md:grid-cols-[1fr_2.3fr_1fr]">
            <div className="flex items-center justify-center gap-2 border-b border-slate-300 p-4 md:border-b-0 md:border-l">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-800">
                <img src={PAGE_ICON} alt="" className="h-6 w-6 invert" />
              </span>
              <div>
                <div className="text-xs font-bold">
                  سامانه فرآیندهای یکپارچه
                </div>
                <div className="mt-1 text-[10px] text-orange-600">
                  مدیریت مالی و پروژه
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center border-b border-slate-300 p-4 text-center md:border-b-0 md:border-l">
              <h2 id="settlement-report-title" className="text-xl font-black">
                گزارش تسویه تنخواه
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                گزارش تجمیعی هزینه‌های انتخاب‌شده
              </p>
            </div>
            <div className="flex flex-col justify-center gap-2 p-4 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">شماره:</span>
                <b dir="ltr">{toFa(report.reportNumber || "—")}</b>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">تاریخ:</span>
                <b>{prepared?.jalali || "—"}</b>
              </div>
            </div>
          </header>
          <section className="mt-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <span className="h-5 w-1 rounded-full bg-sky-700" />
              مشخصات گزارش
            </h3>
            <div className="overflow-hidden rounded-2xl border border-slate-300">
              <div className="grid grid-cols-1 md:grid-cols-4">
                <ReportInfoCell label="پروژه">
                  {toFa(report.projectCode)}
                  {report.projectName ? ` - ${report.projectName}` : ""}
                </ReportInfoCell>
                <ReportInfoCell label="تعداد ردیف‌های گزارش">
                  {toFa(items.length)}
                </ReportInfoCell>
                <ReportInfoCell label="تهیه‌کننده">
                  {report.createdByName || report.createdByUsername || "—"}
                </ReportInfoCell>
                <ReportInfoCell label="مجموع مبلغ گزارش">
                  <span dir="ltr" className="flex items-center gap-1">
                    <span>ریال</span>
                    <span className="font-sans tabular-nums">
                      {toFa(format3(total.toString()))}
                    </span>
                  </span>
                </ReportInfoCell>
              </div>
            </div>
          </section>
          <SettlementExpenseTable items={items} />
          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 pt-3 text-[11px] text-slate-500">
            <span>سامانه فرآیندهای یکپارچه مدیریت مالی</span>
            <span>
              {prepared ? `${prepared.jalali} • ${prepared.time}` : ""}
            </span>
          </footer>
        </article>
      </div>
    </div>,
    document.body,
  );
}
function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
        {label}
      </span>
      {children}
    </label>
  );
}
function Header({ children, right = false }) {
  return (
    <th
      className={`bg-neutral-200 px-3 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px] ${right ? "!text-right" : ""}`}
    >
      {children}
    </th>
  );
}
function Cell({ children, right = false, className = "", ...props }) {
  return (
    <td
      {...props}
      className={`border-b border-neutral-300 px-3 dark:border-neutral-700 ${right ? "!text-right" : ""} ${className}`}
    >
      {children}
    </td>
  );
}
