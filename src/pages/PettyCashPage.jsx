import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { Crop, ImagePlus, RotateCcw, RotateCw, Check, X, RefreshCw, LoaderCircle } from "lucide-react";
import { useAuth } from "../components/AuthProvider.jsx";
import BudgetTreePickerModal from "../components/BudgetTreePickerModal.jsx";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import Card from "../components/ui/Card.jsx";
import { todayJalaliYmd } from "../utils/date.js";
import { format3, toEnglishDigits } from "../utils/format.js";

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

  return <section className="rounded-b-2xl border border-neutral-200 bg-white px-4 py-7 text-neutral-900 sm:px-7 lg:px-10">
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
        <nav className="mx-auto grid w-fit max-w-full grid-cols-3 overflow-x-auto rounded-t-2xl border border-neutral-200 bg-white" aria-label="بخش‌های تنخواه‌گردان">
          {tabs.map((tab, index) => <button key={tab} type="button" onClick={() => setActiveTab(index)}
            aria-current={activeTab === index ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap border-l border-neutral-200 px-4 py-3 text-sm font-bold transition last:border-l-0 sm:px-6 sm:text-base ${activeTab === index ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-50"}`}>{tab}</button>)}
        </nav>
        {activeTab === 0 && <MyPettyCashSummary />}
        {activeTab === 1 && <PettyCashExpenseTab />}
        {activeTab === 2 && <div className="min-h-80 rounded-b-2xl border border-neutral-200 bg-white" />}
      </div>
    </Card>
  </div>;
}

const inputClass = "h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400";
const emptyForm = () => ({ expenseDate: todayJalaliYmd().replaceAll("-", "/"), description: "", budgetCode: "", amount: "" });
const toFa = (value) => String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
const english = (value) => toEnglishDigits(String(value ?? "")).replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));

function Field({ label, children }) {
  return <label className="block min-w-0">
    <span className="mb-1 block text-xs font-medium text-neutral-600">{label}</span>
    {children}
  </label>;
}

function PettyCashExpenseTab() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [budgetItems, setBudgetItems] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [form, setForm] = useState(emptyForm);
  const [attachment, setAttachment] = useState(null);
  const [budgetPickerOpen, setBudgetPickerOpen] = useState(false);
  const [budgetPickerQuery, setBudgetPickerQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [attachmentEditorOpen, setAttachmentEditorOpen] = useState(false);
  const formRef = useRef(null);
  const menuButtonRef = useRef(null);
  const menuPopoverRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);

  useEffect(() => {
    if (!menuPosition) return;
    const closeOutside = (event) => {
      if (!menuButtonRef.current?.contains(event.target) && !menuPopoverRef.current?.contains(event.target)) setMenuPosition(null);
    };
    const close = () => setMenuPosition(null);
    document.addEventListener("mousedown", closeOutside);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menuPosition]);

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(`/api${path}`, {
      credentials: "include",
      ...options,
      headers: { "Content-Type": "application/json", "x-user-id": String(user?.id || ""), ...options.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "دریافت اطلاعات انجام نشد.");
    return data;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    api("/projects?isActive=true")
      .then((data) => setProjects((data.items || data.projects || []).filter((project) =>
        project.isActive !== false && /^\d{3}$/.test(english(project.code).trim()))))
      .catch((reason) => setError(reason.message));
  }, [api, user?.id]);

  const loadExpenses = useCallback(async (id) => {
    if (!id || !user?.id) { setItems([]); return; }
    const data = await api(`/petty-cash-expenses?projectId=${encodeURIComponent(id)}`);
    setItems((data.items || []).filter((item) => Number(item.createdById) === Number(user.id)));
  }, [api, user?.id]);

  useEffect(() => {
    loadExpenses(projectId).catch((reason) => setError(reason.message));
  }, [loadExpenses, projectId]);

  const selectProject = async (id) => {
    setProjectId(id);
    setPage(0);
    setSelectedIds(new Set());
    setEditingExpense(null);
    setMenuPosition(null);
    setForm(emptyForm());
    setAttachment(null);
    setBudgetItems([]);
    setError("");
    if (!id) return;
    try {
      const data = await api(`/cost-breakdown?project_id=${encodeURIComponent(id)}`);
      setBudgetItems(data.items || []);
    } catch (reason) {
      setError(reason.message);
    }
  };

  const addExpense = async () => {
    if (!projectId) return setError("ابتدا پروژه را انتخاب کنید.");
    if (!form.expenseDate || !form.description.trim() || !form.budgetCode || !toEnglishDigits(form.amount).replace(/[^\d]/g, "")) {
      return setError("تاریخ، شرح، کد بودجه و مبلغ را تکمیل کنید.");
    }
    setSaving(true);
    setError("");
    try {
      let file = editingExpense?.fileUrl ? { name: editingExpense.fileName, url: editingExpense.fileUrl } : null;
      if (attachment) {
        const payload = new FormData();
        payload.append("file", attachment);
        const response = await fetch("/api/petty-cash-expenses/upload", {
          method: "POST", credentials: "include", headers: { "x-user-id": String(user?.id || "") }, body: payload,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "بارگذاری پیوست انجام نشد.");
        file = data.file;
      }
      await api("/petty-cash-expenses", {
        method: editingExpense ? "PATCH" : "POST",
        body: JSON.stringify({ projectId, ...form, fileName: file?.name, fileUrl: file?.url,
          ...(editingExpense ? { action: "update", id: editingExpense.id } : {}) }),
      });
      await loadExpenses(projectId);
      setForm(emptyForm());
      setAttachment(null);
      setEditingExpense(null);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(items.length / rowsPerPage));
  const safePage = Math.min(page, pageCount - 1);
  const startIndex = safePage * rowsPerPage;
  const endIndex = Math.min(items.length, startIndex + rowsPerPage);
  const pageItems = items.slice(startIndex, endIndex);
  const visibleIds = pageItems.map((item) => item.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected;
  const toggleSelected = (id) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const toggleVisible = () => setSelectedIds((current) => {
    const next = new Set(current);
    visibleIds.forEach((id) => { if (allVisibleSelected) next.delete(id); else next.add(id); });
    return next;
  });
  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const canEdit = selectedItems.length === 1 && selectedItems[0].stage === "planning" && !selectedItems[0].settlementReportId;
  const canDelete = selectedItems.length > 0 && selectedItems.every((item) => item.stage === "planning" && !item.settlementReportId);
  const editSelected = () => {
    if (!canEdit) return;
    const item = selectedItems[0];
    setEditingExpense(item);
    setForm({ expenseDate: item.expenseDate, description: item.description, budgetCode: item.budgetCode, amount: format3(item.amount) });
    setAttachment(null);
    setMenuPosition(null);
    setError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const cancelEdit = () => {
    setEditingExpense(null);
    setForm(emptyForm());
    setAttachment(null);
    setError("");
  };
  const deleteSelected = async () => {
    if (!canDelete || !window.confirm(`آیا ${toFa(selectedItems.length)} ردیف انتخاب‌شده حذف شود؟`)) return;
    setSaving(true);
    setError("");
    setMenuPosition(null);
    try {
      await api("/petty-cash-expenses", { method: "DELETE", body: JSON.stringify({ ids: selectedItems.map((item) => item.id) }) });
      if (editingExpense && selectedIds.has(editingExpense.id)) cancelEdit();
      setSelectedIds(new Set());
      await loadExpenses(projectId);
    } catch (reason) {
      setError(reason.message === "not_allowed" ? "این ردیف‌ها قابل حذف نیستند." : reason.message);
    } finally {
      setSaving(false);
    }
  };
  return <section className="rounded-b-2xl border border-neutral-200 bg-white p-3 sm:p-4">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <Field label="پروژه">
        <select value={projectId} onChange={(event) => selectProject(event.target.value)} className={`${inputClass} min-w-64`}>
          <option value="">انتخاب کنید</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{english(project.code)} - {project.name}</option>)}
        </select>
      </Field>
      <button type="button" disabled className="h-11 rounded-xl border border-neutral-300 bg-neutral-100 px-4 text-sm font-semibold text-neutral-500 opacity-65">
        فراخوانی از اکسل
      </button>
    </div>

    <div ref={formRef} className="mb-3 grid grid-cols-1 items-end gap-3 rounded-2xl border border-neutral-200 bg-neutral-100 p-3 sm:grid-cols-2 xl:grid-cols-[150px_minmax(180px,1fr)_minmax(180px,1fr)_170px_auto]">
      <Field label="تاریخ">
        <JalaliPopupDatePicker value={form.expenseDate} onChange={(expenseDate) => setForm((current) => ({ ...current, expenseDate }))}
          buttonClassName={`${inputClass} flex items-center justify-between`} />
      </Field>
      <Field label="شرح">
        <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className={inputClass} />
      </Field>
      <Field label="کد بودجه">
        <button type="button" disabled={!projectId} onClick={() => { setBudgetPickerQuery(""); setBudgetPickerOpen(true); }}
          className={`${inputClass} flex items-center justify-between gap-2 text-right disabled:opacity-50`}>
          <span className="truncate">{form.budgetCode || "انتخاب کد بودجه"}</span><span>⌄</span>
        </button>
      </Field>
      <Field label="مبلغ (ریال)">
        <input dir="ltr" inputMode="numeric" value={toFa(form.amount)}
          onChange={(event) => setForm((current) => ({ ...current, amount: format3(toEnglishDigits(event.target.value).replace(/[^\d]/g, "")) }))}
          className={`${inputClass} text-left tabular-nums`} />
      </Field>
      <div className="flex items-end gap-3">
        <Field label="پیوست">
          <button type="button" onClick={() => setAttachmentEditorOpen(true)} disabled={saving}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border bg-white outline-none focus:border-neutral-400 disabled:opacity-50 ${attachment ? "border-emerald-400 bg-emerald-50" : "border-neutral-200"}`} title={attachment?.name || editingExpense?.fileName || "بارگذاری"} aria-label="بارگذاری پیوست">
            <img src="/images/icons/upload.svg" alt="" className="h-5 w-5" />
          </button>
        </Field>
        <button type="button" onClick={addExpense} disabled={saving} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-black text-2xl text-white disabled:opacity-50"
          title={editingExpense ? "ذخیره ویرایش" : "افزودن ردیف"} aria-label={editingExpense ? "ذخیره ویرایش" : "افزودن ردیف"}>
          {editingExpense ? <img src="/images/icons/finishing-check.svg" alt="" className="h-5 w-5" /> : "+"}
        </button>
        {editingExpense && <button type="button" onClick={cancelEdit} disabled={saving} title="انصراف از ویرایش" aria-label="انصراف از ویرایش"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-200 bg-white disabled:opacity-50">
          <img src="/images/icons/bastan.svg" alt="" className="h-4 w-4" />
        </button>}
      </div>
    </div>
    {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed text-center text-sm">
          <colgroup>
            <col className="w-12" /><col className="w-16" /><col className="w-32" />
            <col /><col className="w-36" /><col className="w-40" /><col className="w-28" />
            <col className="w-12" />
          </colgroup>
          <thead className="bg-neutral-200 text-neutral-900">
            <tr className="h-12">
              <th className="px-3">
                <input type="checkbox" checked={allVisibleSelected}
                  ref={(element) => { if (element) element.indeterminate = someVisibleSelected; }}
                  onChange={toggleVisible} aria-label="انتخاب همه ردیف‌های این صفحه"
                  className="h-4 w-4 accent-black" />
              </th>
              {["ردیف", "تاریخ", "شرح", "کد بودجه", "مبلغ", "پیوست"].map((label) =>
                <th key={label} className="px-3 text-[14px] font-semibold md:text-[15px]">{label}</th>)}
              <th className="p-0">
                <button ref={menuButtonRef} type="button" aria-label="مدیریت ردیف‌ها" title="مدیریت ردیف‌ها"
                  aria-expanded={Boolean(menuPosition)} onClick={() => {
                    if (menuPosition) return setMenuPosition(null);
                    const rect = menuButtonRef.current.getBoundingClientRect();
                    setMenuPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 248)), top: Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 160)) });
                  }}
                  className="mx-auto grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/[0.08]">
                  <img src="/images/icons/menu-table.svg" alt="" className={`h-4 w-3 transition-transform duration-200 ${menuPosition ? "scale-110" : ""}`} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="text-[13px] text-neutral-900 [&>tr]:h-9 [&>tr>td]:!py-0">
            {pageItems.map((item, index) => <tr key={item.id}
              className={`border-t border-neutral-300 bg-black/[0.02] transition hover:bg-black/[0.04] ${selectedIds.has(item.id) ? "bg-neutral-100" : ""}`}>
              <td className="px-3"><input type="checkbox" checked={selectedIds.has(item.id)}
                onChange={() => toggleSelected(item.id)} aria-label={`انتخاب ردیف ${toFa(startIndex + index + 1)}`}
                className="h-4 w-4 accent-black" /></td>
              <td className="px-3">{toFa(startIndex + index + 1)}</td>
              <td className="px-3">{toFa(item.expenseDate)}</td>
              <td className="truncate px-3 text-right" title={item.description}>{item.description}</td>
              <td className="px-3">{toFa(item.budgetCode)}</td>
              <td className="px-3 tabular-nums">{toFa(format3(item.amount))}</td>
              <td className="px-3">{item.fileUrl
                ? <a href={item.fileUrl} target="_blank" rel="noreferrer" className="text-sky-700 underline" title={item.fileName || "مشاهده پیوست"}>مشاهده</a>
                : "—"}</td>
              <td />
            </tr>)}
            {!pageItems.length && <tr><td colSpan={8} className="px-3 text-neutral-500">ردیفی ثبت نشده است.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2 border-t border-neutral-300 px-3 py-2 text-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={safePage === 0} aria-label="صفحه قبل" title="صفحه قبل"
            className="grid h-9 w-9 place-items-center rounded-lg border-0 bg-transparent shadow-none transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <button type="button" onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            disabled={safePage >= pageCount - 1} aria-label="صفحه بعد" title="صفحه بعد"
            className="grid h-9 w-9 place-items-center rounded-lg border-0 bg-transparent shadow-none transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="whitespace-nowrap text-neutral-600">{items.length ? `${toFa(startIndex + 1)}–${toFa(endIndex)} از ${toFa(items.length)}` : "۰ از ۰"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-neutral-600">تعداد در هر صفحه:</span>
          <div className="inline-flex h-9 overflow-hidden rounded-lg border border-neutral-200 bg-white">
            {[10, 25, 100].map((count) => <button key={count} type="button" onClick={() => { setRowsPerPage(count); setPage(0); }}
              aria-pressed={rowsPerPage === count}
              className={`min-w-10 px-3 font-semibold transition ${rowsPerPage === count ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}>{toFa(count)}</button>)}
          </div>
        </div>
      </div>
    </div>
    {menuPosition && createPortal(
      <div ref={menuPopoverRef} dir="rtl" style={menuPosition}
        className="table-menu-popover fixed z-[100] w-60 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 text-right text-neutral-900 shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
        <div className="px-2.5 pb-2 pt-1.5 text-xs text-neutral-500">
          {selectedItems.length ? `${toFa(selectedItems.length)} مورد انتخاب شده` : "ابتدا یک ردیف را انتخاب کنید"}
        </div>
        <button type="button" disabled={!canEdit || saving} onClick={editSelected}
          title={selectedItems.length === 1 && !canEdit ? "این ردیف از مرحله ثبت اولیه عبور کرده است." : "ویرایش ردیف"}
          className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-45">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 transition group-hover:scale-105">
            <img src="/images/icons/pencil.svg" alt="" className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold">ویرایش ردیف</span>
        </button>
        <button type="button" disabled={!canDelete || saving} onClick={deleteSelected}
          title={selectedItems.length && !canDelete ? "فقط ردیف‌های مرحله ثبت اولیه قابل حذف‌اند." : "حذف ردیف‌های انتخاب‌شده"}
          className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-100 transition group-hover:scale-105">
            <img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold">حذف ردیف‌های انتخاب‌شده</span>
        </button>
      </div>, document.body
    )}
    {budgetPickerOpen && <BudgetTreePickerModal
      items={budgetItems.map((item) => ({ code: item.budgetCode, value: item.budgetCode, center_desc: item.budgetName }))}
      selectedCode={form.budgetCode} query={budgetPickerQuery} onQueryChange={setBudgetPickerQuery}
      onSelect={(budgetCode) => { setForm((current) => ({ ...current, budgetCode })); setBudgetPickerOpen(false); }}
      onClose={() => setBudgetPickerOpen(false)} />}
    {attachmentEditorOpen && <PettyCashPhotoEditor
      initialFile={attachment}
      initialUrl={editingExpense?.fileUrl}
      initialName={editingExpense?.fileName}
      onClose={() => setAttachmentEditorOpen(false)}
      onConfirm={(file) => { setAttachment(file); setAttachmentEditorOpen(false); }} />}
  </section>;
}

const fullPhotoCrop = () => ({ x: 0, y: 0, width: 1, height: 1 });
const fullPhotoArea = fullPhotoCrop();
const isFullPhotoCrop = (crop) => crop.x === 0 && crop.y === 0 && crop.width === 1 && crop.height === 1;
const photoSize = (bytes) => bytes >= 1024 * 1024
  ? `${toFa((bytes / (1024 * 1024)).toFixed(2))} مگابایت`
  : `${toFa(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت`;

async function decodeExpensePhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("این عکس قابل نمایش نیست. عکس JPG، PNG یا WebP انتخاب کنید."));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function expensePhotoCanvas(image, turns, crop, maxEdge = 3000) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const orientedWidth = turns % 2 ? height : width;
  const orientedHeight = turns % 2 ? width : height;
  const cropWidth = orientedWidth * crop.width;
  const cropHeight = orientedHeight * crop.height;
  const scale = Math.min(1, maxEdge / Math.max(cropWidth, cropHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(cropWidth * scale));
  canvas.height = Math.max(1, Math.round(cropHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("ویرایش عکس در این مرورگر در دسترس نیست.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.scale(scale, scale);
  context.translate(-crop.x * orientedWidth, -crop.y * orientedHeight);
  context.translate(orientedWidth / 2, orientedHeight / 2);
  context.rotate(turns * Math.PI / 2);
  context.drawImage(image, -width / 2, -height / 2);
  return canvas;
}

function encodeExpensePhoto(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("آماده‌سازی عکس انجام نشد. دوباره تلاش کنید.")), type, quality,
  ));
}

async function compressExpensePhoto(source, image, turns, crop) {
  const unchanged = turns === 0 && isFullPhotoCrop(crop);
  const withinSize = Math.max(image.naturalWidth, image.naturalHeight) <= 3000;
  if (unchanged && withinSize && source.pettyCashPhotoPrepared) {
    return { file: source, width: image.naturalWidth, height: image.naturalHeight };
  }
  const canvas = expensePhotoCanvas(image, turns, crop);
  const candidates = [await encodeExpensePhoto(canvas, "image/webp", 0.9)];
  // Keep transparent PNG/WebP images transparent; JPEG is also compared for photos.
  if (/\.jpe?g$/i.test(source.name) || source.type === "image/jpeg") {
    candidates.push(await encodeExpensePhoto(canvas, "image/jpeg", 0.9));
  }
  let blob = candidates.reduce((smallest, candidate) => candidate.size < smallest.size ? candidate : smallest);
  if (blob.size > 1500 * 1024) {
    const lighter = await encodeExpensePhoto(canvas, "image/webp", 0.86);
    if (lighter.size < blob.size) blob = lighter;
  }
  let file;
  if (unchanged && withinSize && source.size <= blob.size) file = source;
  else {
    const extension = blob.type === "image/webp" ? "webp" : blob.type === "image/jpeg" ? "jpg" : "png";
    file = new File([blob], `${source.name.replace(/\.[^.]+$/, "") || "receipt"}.${extension}`, { type: blob.type, lastModified: Date.now() });
  }
  file.pettyCashPhotoPrepared = true;
  return { file, width: canvas.width, height: canvas.height };
}

function PettyCashPhotoEditor({ initialFile, initialUrl, initialName, onClose, onConfirm }) {
  const [source, setSource] = useState(null);
  const [image, setImage] = useState(null);
  const [turns, setTurns] = useState(0);
  const [crop, setCrop] = useState(fullPhotoCrop);
  const [cropping, setCropping] = useState(false);
  const [draggingCrop, setDraggingCrop] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(null);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const cropDragRef = useRef(null);
  const loadTokenRef = useRef(0);
  const previewCrop = cropping ? fullPhotoArea : crop;

  const choosePhoto = useCallback(async (file) => {
    if (!file) return;
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {
      setError("عکس با فرمت JPG، PNG یا WebP انتخاب کنید.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("حجم عکس اولیه باید کمتر از ۲۵ مگابایت باشد.");
      return;
    }
    const token = ++loadTokenRef.current;
    setLoading(true);
    setError("");
    try {
      const decoded = await decodeExpensePhoto(file);
      if (loadTokenRef.current !== token) return;
      setSource(file);
      setImage(decoded);
      setTurns(0);
      setCrop(fullPhotoCrop());
      setCropping(false);
      setProcessed(null);
    } catch (reason) {
      if (loadTokenRef.current === token) setError(reason.message);
    } finally {
      if (loadTokenRef.current === token) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (initialFile) choosePhoto(initialFile);
    else if (initialUrl && /\.(jpe?g|png|webp)$/i.test(initialUrl)) {
      setLoading(true);
      fetch(initialUrl, { credentials: "include", signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("دریافت عکس قبلی انجام نشد.");
          const blob = await response.blob();
          return choosePhoto(new File([blob], initialName || initialUrl.split("/").pop(), { type: blob.type }));
        })
        .catch((reason) => { if (reason.name !== "AbortError") { setError(reason.message); setLoading(false); } });
    }
    return () => { controller.abort(); loadTokenRef.current += 1; };
  }, [initialFile, initialUrl, initialName, choosePhoto]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector("button")?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')].filter((element) => element.getClientRects().length);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const preview = expensePhotoCanvas(image, turns, previewCrop, 1400);
    const canvas = canvasRef.current;
    canvas.width = preview.width;
    canvas.height = preview.height;
    canvas.getContext("2d").drawImage(preview, 0, 0);
  }, [image, turns, previewCrop]);

  useEffect(() => {
    if (!image || !source || draggingCrop) return;
    let active = true;
    setProcessing(true);
    setProcessed(null);
    const timer = setTimeout(() => {
      compressExpensePhoto(source, image, turns, crop)
        .then((result) => { if (active) setProcessed({ ...result, url: URL.createObjectURL(result.file) }); })
        .catch((reason) => { if (active) setError(reason.message); })
        .finally(() => { if (active) setProcessing(false); });
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [source, image, turns, crop, draggingCrop]);

  useEffect(() => () => { if (processed?.url) URL.revokeObjectURL(processed.url); }, [processed]);

  const rotate = (step) => {
    setTurns((current) => (current + step + 4) % 4);
    setCrop((current) => step > 0
      ? { x: 1 - current.y - current.height, y: current.x, width: current.height, height: current.width }
      : { x: current.y, y: 1 - current.x - current.width, width: current.height, height: current.width });
  };
  const pointerPoint = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  };
  const startCropDrag = (event) => {
    if (!cropping || loading) return;
    event.preventDefault();
    const point = pointerPoint(event);
    const handle = event.target.closest("[data-crop-handle]")?.dataset.cropHandle;
    const inside = point.x >= crop.x && point.x <= crop.x + crop.width && point.y >= crop.y && point.y <= crop.y + crop.height;
    cropDragRef.current = { start: point, rect: crop, mode: handle || (inside ? "move" : "draw") };
    setDraggingCrop(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveCrop = (event) => {
    const drag = cropDragRef.current;
    if (!drag) return;
    const point = pointerPoint(event);
    if (drag.mode === "move") {
      setCrop({ ...drag.rect,
        x: Math.max(0, Math.min(1 - drag.rect.width, drag.rect.x + point.x - drag.start.x)),
        y: Math.max(0, Math.min(1 - drag.rect.height, drag.rect.y + point.y - drag.start.y)) });
      return;
    }
    const anchor = drag.mode === "draw" ? drag.start : {
      x: drag.mode.includes("w") ? drag.rect.x + drag.rect.width : drag.rect.x,
      y: drag.mode.includes("n") ? drag.rect.y + drag.rect.height : drag.rect.y,
    };
    setCrop({ x: Math.min(anchor.x, point.x), y: Math.min(anchor.y, point.y), width: Math.abs(point.x - anchor.x), height: Math.abs(point.y - anchor.y) });
  };
  const finishCropDrag = (event) => {
    if (!cropDragRef.current) return;
    const originalCrop = cropDragRef.current.rect;
    if (event.type === "pointercancel") setCrop(originalCrop);
    else setCrop((current) => current.width < 0.02 || current.height < 0.02 ? originalCrop : current);
    cropDragRef.current = null;
    setDraggingCrop(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const orientedWidth = image ? (turns % 2 ? image.naturalHeight : image.naturalWidth) * previewCrop.width : 1;
  const orientedHeight = image ? (turns % 2 ? image.naturalWidth : image.naturalHeight) * previewCrop.height : 1;
  const ratio = orientedWidth / Math.max(1, orientedHeight);
  const reduction = processed && source ? Math.max(0, Math.round((1 - processed.file.size / source.size) * 100)) : 0;
  const toolbarButton = "inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold transition hover:bg-neutral-50 disabled:opacity-40 sm:text-sm";

  return createPortal(
    <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="petty-cash-photo-title" dir="rtl"
        className="flex max-h-[92dvh] w-full max-w-[1000px] flex-col overflow-hidden rounded-3xl border border-white/30 bg-white text-neutral-900 shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-neutral-100"><img src="/images/icons/upload.svg" alt="" className="h-6 w-6" /></span>
            <div><h2 id="petty-cash-photo-title" className="font-bold">پیوست هزینه</h2><p className="mt-1 text-xs text-neutral-500">عکس رسید یا سند هزینه را آماده کنید</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="بستن پنجره پیوست" className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 hover:bg-neutral-200"><X className="h-4 w-4" /></button>
        </header>
        <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={(event) => { choosePhoto(event.target.files?.[0]); event.target.value = ""; }} />
          {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {image && <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" disabled={loading || draggingCrop} onClick={() => rotate(-1)} className={toolbarButton} aria-label="چرخش عکس به چپ"><RotateCcw className="h-4 w-4" />چرخش به چپ</button>
            <button type="button" disabled={loading || draggingCrop} onClick={() => rotate(1)} className={toolbarButton} aria-label="چرخش عکس به راست"><RotateCw className="h-4 w-4" />چرخش به راست</button>
            <button type="button" disabled={loading || draggingCrop} onClick={() => {
              if (!cropping && isFullPhotoCrop(crop)) setCrop({ x: 0.08, y: 0.08, width: 0.84, height: 0.84 });
              setCropping((current) => !current);
            }} className={`${toolbarButton} ${cropping ? "border-sky-300 bg-sky-50 text-sky-700" : ""}`}>
              {cropping ? <Check className="h-4 w-4" /> : <Crop className="h-4 w-4" />}{cropping ? "اعمال برش" : "برش عکس"}
            </button>
            <button type="button" disabled={loading || draggingCrop} onClick={() => { setTurns(0); setCrop(fullPhotoCrop()); setCropping(false); }} className={toolbarButton}><RefreshCw className="h-4 w-4" />بازنشانی</button>
            <button type="button" disabled={loading} onClick={() => inputRef.current?.click()} className={`${toolbarButton} mr-auto`}><ImagePlus className="h-4 w-4" />انتخاب عکس دیگر</button>
          </div>}
          <div className={image ? "grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]" : ""}>
            <div onDragOver={(event) => { event.preventDefault(); setDropActive(true); }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDropActive(false); }}
              onDrop={(event) => { event.preventDefault(); setDropActive(false); choosePhoto(event.dataTransfer.files?.[0]); }}
              className={`relative flex min-h-64 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 ${dropActive ? "border-sky-400 bg-sky-50" : image ? "border-neutral-200 bg-neutral-100" : "border-dashed border-neutral-300 bg-neutral-50"} p-4`}>
              {loading && <div role="status" className="absolute inset-0 z-20 grid place-items-center bg-white/80"><span className="flex items-center gap-2 text-sm"><LoaderCircle className="h-5 w-5 animate-spin" />در حال خواندن عکس...</span></div>}
              {!image ? <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center justify-center gap-4 py-9">
                <span className="grid h-16 w-16 place-items-center rounded-2xl border border-neutral-200 bg-white shadow-sm"><img src="/images/icons/upload.svg" alt="" className="h-8 w-8" /></span>
                <span className="text-sm font-bold sm:text-base">عکس را اینجا رها کنید یا برای انتخاب کلیک کنید</span>
                <span className="text-xs text-neutral-500">JPG، PNG یا WebP</span>
              </button> : <>
                <div dir="ltr" className={`relative overflow-hidden ${cropping ? "cursor-crosshair touch-none" : ""}`}
                  style={{ width: `min(100%, ${ratio * 44}vh)`, aspectRatio: ratio }}
                  onPointerDown={startCropDrag} onPointerMove={moveCrop} onPointerUp={finishCropDrag} onPointerCancel={finishCropDrag}>
                  <canvas ref={canvasRef} className="block h-full w-full" aria-label="پیش‌نمایش عکس و محدوده برش" />
                  {cropping && <div className="absolute cursor-move border-2 border-white"
                    style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%`, boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }}>
                    {[1, 2].map((line) => <div key={line} className="pointer-events-none absolute inset-0">
                      <span className="absolute inset-y-0 w-px bg-white/45" style={{ left: `${line * 100 / 3}%` }} />
                      <span className="absolute inset-x-0 h-px bg-white/45" style={{ top: `${line * 100 / 3}%` }} />
                    </div>)}
                    {["nw", "ne", "sw", "se"].map((handle) => <span key={handle} data-crop-handle={handle}
                      className={`absolute z-10 h-5 w-5 rounded-sm border-2 border-white bg-sky-500 ${handle.includes("n") ? "-top-2" : "-bottom-2"} ${handle.includes("w") ? "-left-2" : "-right-2"} ${handle === "nw" || handle === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize"}`} />)}
                  </div>}
                </div>
                <p className="mt-3 text-center text-xs leading-5 text-neutral-500">{cropping ? "گوشه‌های کادر را بکشید؛ برای جابه‌جایی، داخل کادر را بکشید." : "پیش‌نمایش عکس آماده‌شده"}</p>
              </>}
              {dropActive && <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-sky-50/95 text-sm font-bold text-sky-700">عکس جدید را رها کنید</div>}
            </div>
            {image && <aside className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="text-sm font-bold">نسخه کم‌حجم</h3>
              <p className="mt-2 text-xs leading-6 text-neutral-500">فشرده‌سازی با کیفیت بالا برای حفظ خوانایی رسید و سند</p>
              <p className="mt-3 truncate text-xs text-neutral-600" title={source?.name}>{source?.name}</p>
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between gap-2"><span className="text-neutral-500">حجم اولیه</span><strong>{source && photoSize(source.size)}</strong></div>
                <div className="flex justify-between gap-2"><span className="text-neutral-500">حجم آماده ارسال</span><strong>{processed ? photoSize(processed.file.size) : "..."}</strong></div>
              </div>
              {processing || draggingCrop ? <p role="status" className="mt-4 flex items-center gap-2 text-xs text-neutral-500"><LoaderCircle className="h-4 w-4 animate-spin" />در حال آماده‌سازی عکس...</p> : processed && <>
                <span className="mt-4 inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1.5 text-xs font-semibold text-emerald-800"><Check className="h-3 w-3" />{reduction > 0 ? `${toFa(reduction)}٪ حجم کمتر` : "حجم بهینه"}</span>
                <img src={processed.url} alt="پیش‌نمایش نسخه فشرده‌شده" className="mt-4 max-h-32 w-full rounded-lg border border-neutral-200 bg-white object-contain" />
                <p className="mt-2 text-center text-[11px] text-neutral-500">{toFa(processed.width)} × {toFa(processed.height)} پیکسل</p>
              </>}
            </aside>}
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-5 py-4">
          <p className="text-xs text-neutral-500">پیوست همراه با ثبت ردیف هزینه ذخیره می‌شود.</p>
          <button type="button" disabled={!processed || processing || loading || draggingCrop}
            onClick={() => onConfirm(processed.file)} className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"><Check className="h-4 w-4" />تأیید پیوست</button>
        </footer>
      </div>
    </div>, document.body
  );
}
