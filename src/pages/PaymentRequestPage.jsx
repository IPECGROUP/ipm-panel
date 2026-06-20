import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card } from "../components/ui/Card";
import { useAuth } from "../components/AuthProvider";
import { todayJalaliYmd } from "../utils/date";
import { toEnglishDigits } from "../utils/format";

const SCOPE_OPTIONS = [
  ["office", "دفتر مرکزی"], ["site", "سایت"], ["finance", "مالی"],
  ["cash", "نقدی"], ["capex", "سرمایه‌ای"], ["projects", "پروژه‌ها"],
];
const DOC_OPTIONS = [
  ["pre_invoice", "پیش فاکتور"], ["invoice", "فاکتور"],
  ["goods_services", "صورت حساب رسمی کالا و خدمات"],
  ["other_invoice", "صورت حساب غیر رسمی"], ["status_invoice", "صورت وضعیت"],
  ["internal_list", "لیست پرداخت داخلی"], ["gov_salary", "فیش بدهی دولتی"], ["other", "سایر"],
];
const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const STATUS_LABELS = { pending: "در انتظار بررسی", approved: "تأییدشده", rejected: "ردشده", returned: "برگشت‌خورده" };
const inputClass = "w-full h-11 rounded-xl border border-black/10 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-white";
const today = () => todayJalaliYmd().replaceAll("-", "/");
const emptyForm = () => ({
  dateJalali: today(), scope: "office", projectId: "", budgetCode: "", title: "", description: "",
  amount: "", cashAmount: "", cashDateJalali: "", creditPay: "", beneficiaryName: "", bankInfo: "",
  docId: "pre_invoice", docOther: "", docNumber: "", docDateJalali: "",
  currencyTypeId: "", currencySourceId: "", attachments: [],
});

function toFa(value) { return String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]); }
function parseAmount(value) {
  const digits = toEnglishDigits(String(value || "")).replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}
function money(value) { const amount = parseAmount(value); return amount ? amount.toLocaleString("en-US") : ""; }
function normalizeCode(value) { return toEnglishDigits(String(value || "")).trim(); }
function coreOf(value) {
  const raw = normalizeCode(value);
  const noPrefix = raw.replace(/^[A-Za-z]+[^0-9]*/, "");
  const normalized = noPrefix.replace(/[^0-9.]+/g, ".");
  return normalized.replace(/\.+/g, ".").replace(/^\./, "").replace(/\.$/, "");
}
function isActiveProject(project) {
  const value = project?.isActive ?? project?.is_active ?? project?.active;
  return value === undefined || value === null || value === true || value === 1 || String(value).toLowerCase() === "true" || String(value) === "1";
}
function isMainProject(project) { return /^\d{3}$/.test(normalizeCode(project?.code)); }
function isMarandi(user) {
  return String(user?.username || "").toLowerCase() === "marandi" || String(user?.email || "").toLowerCase() === "marandi@ipecgroup.net";
}
function itemLabel(item) { return item?.title || item?.name || item?.label || item?.code || `#${item?.id}`; }

function JalaliPopupDatePicker({ value, onChange, disablePast = false }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const popupRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const current = useMemo(() => {
    const [y, m, d] = today().split("/").map(Number);
    return { y, m, d };
  }, []);
  const parts = String(value || "").match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/);
  const [year, setYear] = useState(parts ? Number(parts[1]) : current.y);
  const [month, setMonth] = useState(parts ? Number(parts[2]) : current.m);
  const [day, setDay] = useState(parts ? Number(parts[3]) : current.d);
  const daysInMonth = month <= 6 ? 31 : month <= 11 ? 30 : 29;

  useEffect(() => { if (day > daysInMonth) setDay(daysInMonth); }, [day, daysInMonth]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!popupRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  useEffect(() => {
    if (!open || !buttonRef.current) return undefined;
    const place = () => {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: Math.min(rect.bottom + 8, window.innerHeight - 330), right: Math.max(8, window.innerWidth - rect.right) });
    };
    place();
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); document.removeEventListener("scroll", place, true); };
  }, [open]);

  const confirm = () => {
    const picked = `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
    if (disablePast && picked <= today()) return;
    onChange(picked);
    setOpen(false);
  };
  return <>
    <button ref={buttonRef} type="button" onClick={() => setOpen((old) => !old)} className={`${inputClass} flex items-center justify-between text-right`}>
      <span className={value ? "" : "text-neutral-400"}>{value ? toFa(value) : "انتخاب تاریخ..."}</span>
      <img src="/images/icons/calendar.svg" alt="" className="h-5 w-5 dark:invert" />
    </button>
    {open && createPortal(
      <div ref={popupRef} dir="rtl" style={{ top: position.top, right: position.right }} className="fixed z-[9999] w-[min(420px,calc(100vw-24px))] rounded-2xl border border-black/10 bg-white p-4 text-neutral-900 shadow-xl dark:border-white/10 dark:bg-neutral-900 dark:text-white">
        <div className="mb-3 flex items-center justify-between"><b className="text-sm">انتخاب تاریخ</b><button type="button" onClick={() => setOpen(false)} className="h-9 w-9 rounded-xl border border-black/10 dark:border-white/10">×</button></div>
        <div className="grid grid-cols-3 gap-3">
          <DateSelect label="روز" value={day} onChange={setDay} items={Array.from({ length: daysInMonth }, (_, i) => [i + 1, toFa(i + 1)])} />
          <DateSelect label="ماه" value={month} onChange={setMonth} items={MONTHS.map((label, i) => [i + 1, label])} />
          <DateSelect label="سال" value={year} onChange={setYear} items={Array.from({ length: 31 }, (_, i) => [current.y - 10 + i, toFa(current.y - 10 + i)])} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="rounded-xl border border-black/10 px-4 py-2 text-sm dark:border-white/10">پاک کردن</button>
          <button type="button" onClick={confirm} className="rounded-xl bg-neutral-900 px-5 py-2 text-sm text-white dark:bg-white dark:text-neutral-900">تأیید</button>
        </div>
      </div>, document.body
    )}
  </>;
}

function DateSelect({ label, value, onChange, items }) {
  return <label className="text-xs text-neutral-600 dark:text-neutral-300">{label}
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} className={`${inputClass} mt-1`}>
      {items.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
    </select>
  </label>;
}

export default function PaymentRequestPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [numberSortDir, setNumberSortDir] = useState("desc");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);
  const [projects, setProjects] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [currencyTypes, setCurrencyTypes] = useState([]);
  const [currencySources, setCurrencySources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selected, setSelected] = useState(null);
  const [actionNote, setActionNote] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const mainAdmin = useMemo(() => isMarandi(user), [user]);
  const serial = useMemo(() => `PR-${Date.now().toString().slice(-8)}`, [showForm]);
  const amount = parseAmount(form.amount);
  const cashAmount = parseAmount(form.cashAmount);
  const creditAmount = Math.max(0, amount - cashAmount);
  const selectedCurrency = currencyTypes.find((item) => String(item.id) === String(form.currencyTypeId));
  const currencyLabel = selectedCurrency ? itemLabel(selectedCurrency) : "ریال";

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(`/api${path}`, {
      credentials: "include", ...options,
      headers: { "Content-Type": "application/json", ...(user?.id != null ? { "x-user-id": String(user.id) } : {}), ...(options.headers || {}) },
    });
    const text = await response.text();
    let data = {}; try { data = text ? JSON.parse(text) : {}; } catch {}
    if (!response.ok) throw new Error(data.error || data.message || "request_failed");
    return data;
  }, [user?.id]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api(mainAdmin ? "/requests" : "/requests?view=mine");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch { setError("دریافت درخواست‌ها انجام نشد."); }
    finally { setLoading(false); }
  }, [api, mainAdmin]);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => {
    Promise.allSettled([api("/projects?isActive=true"), api("/base/currencies/types"), api("/base/currencies/sources")]).then(([p, t, s]) => {
      if (p.status === "fulfilled") {
        const rawProjects = p.value.items || p.value.projects || [];
        const mainProjects = rawProjects
          .filter((project) => isActiveProject(project) && isMainProject(project))
          .sort((a, b) => normalizeCode(a.code).localeCompare(normalizeCode(b.code), "fa", { numeric: true }));
        setProjects(mainProjects);
      }
      if (t.status === "fulfilled") setCurrencyTypes(t.value.items || []);
      if (s.status === "fulfilled") setCurrencySources(s.value.items || []);
    });
  }, [api]);
  useEffect(() => {
    if (form.scope === "projects" && !form.projectId) { setBudgetItems([]); return; }
    let cancelled = false;
    (async () => {
      const query = new URLSearchParams({ kind: form.scope });
      if (form.projectId) query.set("project_id", form.projectId);

      if (form.scope === "projects") {
        const selectedProject = projects.find((item) => String(item.id) === String(form.projectId));
        const projectCore = coreOf(selectedProject?.code);
        try {
          const [estimateData, centersData] = await Promise.all([
            api(`/budget-estimates?${query}`).catch(() => ({ items: [] })),
            api("/centers/projects").catch(() => ({ items: [] })),
          ]);
          const estimateItems = Array.isArray(estimateData?.items) ? estimateData.items : [];
          const centerItems = Array.isArray(centersData?.items) ? centersData.items : [];
          const byCode = new Map();

          centerItems.forEach((item) => {
            const code = normalizeCode(item?.suffix ?? item?.code);
            const codeCore = coreOf(code);
            if (!code || !projectCore || (codeCore !== projectCore && !codeCore.startsWith(`${projectCore}.`))) return;
            byCode.set(code, {
              code,
              center_desc: String(item?.description ?? item?.center_desc ?? item?.name ?? ""),
              last_amount: Number(item?.last_amount || 0),
            });
          });

          estimateItems.forEach((item) => {
            const code = normalizeCode(item?.code);
            const codeCore = coreOf(code);
            if (!code || !projectCore || (codeCore !== projectCore && !codeCore.startsWith(`${projectCore}.`))) return;
            const previous = byCode.get(code) || { code, center_desc: "", last_amount: 0 };
            byCode.set(code, {
              ...previous,
              center_desc: previous.center_desc || String(item?.center_desc ?? item?.last_desc ?? item?.name ?? ""),
              last_amount: Number(item?.last_amount ?? item?.amount ?? previous.last_amount ?? 0),
            });
          });

          if (!byCode.size && selectedProject?.code) {
            const code = normalizeCode(selectedProject.code);
            byCode.set(code, { code, center_desc: selectedProject.name || "", last_amount: 0 });
          }

          const merged = Array.from(byCode.values()).sort((a, b) =>
            coreOf(a.code).localeCompare(coreOf(b.code), "fa", { numeric: true, sensitivity: "base" })
          );
          if (!cancelled) setBudgetItems(merged);
        } catch {
          if (!cancelled) setBudgetItems([]);
        }
        return;
      }

      try {
        const data = await api(`/budget-estimates?${query}`);
        const estimateItems = Array.isArray(data.items) ? data.items : [];
        if (estimateItems.length) {
          if (!cancelled) setBudgetItems(estimateItems);
          return;
        }
      } catch {}

      try {
        const data = await api(`/centers/${form.scope}`);
        let rows = Array.isArray(data.items) ? data.items : [];
        const mapped = rows.map((item) => ({
          ...item,
          code: item.code || item.center_code || item.suffix || "",
          center_desc: item.center_desc || item.description || item.name || "",
        })).filter((item) => item.code);
        if (!cancelled) setBudgetItems(mapped);
      } catch {
        if (!cancelled) setBudgetItems([]);
      }
    })();
    return () => { cancelled = true; };
  }, [api, form.scope, form.projectId, projects]);

  const setField = (name, value) => { setForm((old) => ({ ...old, [name]: value })); setError(""); setSuccess(""); };
  const changeScope = (scope) => setForm((old) => ({ ...old, scope, projectId: "", budgetCode: "" }));

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true); setError("");
    try {
      const uploaded = [];
      for (const file of files) {
        const body = new FormData(); body.append("file", file);
        const response = await fetch("/api/upload/payment-doc", { method: "POST", credentials: "include", headers: user?.id != null ? { "x-user-id": String(user.id) } : {}, body });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "upload_failed");
        uploaded.push(data.file || data);
      }
      setForm((old) => ({ ...old, attachments: [...old.attachments, ...uploaded] }));
    } catch { setError("آپلود فایل انجام نشد."); }
    finally { setUploading(false); }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return setError("عنوان درخواست را وارد کنید.");
    if (!form.budgetCode) return setError("کد بودجه را انتخاب کنید.");
    if (amount <= 0) return setError("مبلغ درخواست باید بیشتر از صفر باشد.");
    if (cashAmount > amount) return setError("مبلغ نقدی نمی‌تواند از مبلغ درخواست بیشتر باشد.");
    if (cashAmount > 0 && !form.cashDateJalali) return setError("تاریخ پرداخت را انتخاب کنید.");
    if (creditAmount > 0 && !form.creditPay.trim()) return setError("شرح پرداخت اعتباری را وارد کنید.");
    setSubmitting(true); setError(""); setSuccess("");
    try {
      await api("/requests", { method: "POST", body: JSON.stringify({
        ...form, serial, amount, cashAmount, creditAmount,
        currencyTypeId: form.currencyTypeId || null, currencySourceId: form.currencySourceId || null,
        projectId: form.projectId || null,
      }) });
      setForm(emptyForm()); setSuccess("درخواست با موفقیت ثبت شد."); setShowForm(false); await loadItems();
    } catch (err) { setError(err.message === "marandi_user_not_found" ? "کاربر مرندی در سامانه پیدا نشد." : "ثبت درخواست انجام نشد."); }
    finally { setSubmitting(false); }
  };

  const openPreview = (item) => {
    setSelected(item);
    setActionNote("");
    setActionError("");
  };

  const recordAction = async (status) => {
    if (!selected || actionBusy) return;
    setActionBusy(true);
    setActionError("");
    try {
      const data = await api("/requests/status", {
        method: "POST",
        body: JSON.stringify({ id: selected.id, status, note: actionNote.trim() }),
      });
      setSelected((current) => current ? { ...current, ...(data.item || {}) } : current);
      setActionNote("");
      await loadItems();
    } catch (err) {
      setActionError(err?.message === "forbidden" ? "شما اجازه انجام این اقدام را ندارید." : "ثبت اقدام انجام نشد.");
    } finally {
      setActionBusy(false);
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm("این درخواست حذف شود؟")) return;
    try {
      await api(`/requests/${item.id}`, { method: "DELETE" });
      setItems((current) => current.filter((row) => String(row.id) !== String(item.id)));
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(String(item.id));
        return next;
      });
    } catch {
      setError("حذف درخواست انجام نشد.");
    }
  };

  const sortedItems = useMemo(() => [...items].sort((a, b) => {
    const result = String(a.serial || a.id || "").localeCompare(String(b.serial || b.id || ""), "fa", { numeric: true, sensitivity: "base" });
    return numberSortDir === "asc" ? result : -result;
  }), [items, numberSortDir]);
  const total = sortedItems.length;
  const pageCount = Math.max(1, Math.ceil(total / rowsPerPage));
  const safePage = Math.min(page, pageCount - 1);
  const startIndex = safePage * rowsPerPage;
  const endIndex = Math.min(total, startIndex + rowsPerPage);
  const pageItems = sortedItems.slice(startIndex, endIndex);
  const visibleIds = pageItems.map((item) => String(item.id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected;
  const selectAllRef = useRef(null);
  useEffect(() => { if (selectAllRef.current) selectAllRef.current.indeterminate = someVisibleSelected; }, [someVisibleSelected]);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);
  const toggleSelectAll = () => setSelectedIds((current) => {
    const next = new Set(current);
    if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
    else visibleIds.forEach((id) => next.add(id));
    return next;
  });
  const toggleSelected = (id) => setSelectedIds((current) => {
    const next = new Set(current);
    const key = String(id);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  return <div dir="rtl" className="mx-auto max-w-[1400px]">
    <Card className="overflow-hidden rounded-2xl border border-black/10 bg-white p-0 dark:border-white/10 dark:bg-neutral-900">
      <div className="p-3 md:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-lg font-bold md:text-xl">مدیریت درخواست ها</div>
          <button type="button" onClick={() => { setShowForm((old) => !old); setError(""); setSuccess(""); }} className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-black/15 transition hover:bg-black/5 dark:ring-neutral-800 dark:hover:bg-white/10" title={showForm ? "نمایش لیست" : "افزودن درخواست"}>
            <img src={showForm ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" />
          </button>
        </div>

        {showForm && <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ReadField label="شماره درخواست" value={serial} ltr />
            <ReadField label="تاریخ" value={toFa(form.dateJalali)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {SCOPE_OPTIONS.map(([value, label]) => <button key={value} type="button" onClick={() => changeScope(value)} className={`rounded-xl border px-4 py-2 text-sm transition ${form.scope === value ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-black/10 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"}`}>{label}</button>)}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {form.scope === "projects" && <Field label="پروژه"><select className={inputClass} value={form.projectId} onChange={(e) => setForm((old) => ({ ...old, projectId: e.target.value, budgetCode: "" }))}><option value="">انتخاب پروژه</option>{projects.map((item) => <option key={item.id} value={item.id}>{normalizeCode(item.code)}{item.name || item.title ? ` - ${item.name || item.title}` : ""}</option>)}</select></Field>}
            <Field label="کد بودجه" required><select className={inputClass} value={form.budgetCode} disabled={form.scope === "projects" && !form.projectId} onChange={(e) => setField("budgetCode", e.target.value)}><option value="">{form.scope === "projects" && !form.projectId ? "ابتدا پروژه را انتخاب کنید" : "انتخاب کد بودجه"}</option>{budgetItems.map((item) => { const code = normalizeCode(item.code || item.center_code); const description = item.center_desc || item.last_desc || item.name || item.description || ""; return <option key={code || item.id} value={code}>{code}{description ? ` - ${description}` : ""}</option>; })}</select></Field>
          </div>
          <Field label="عنوان درخواست" required><input className={inputClass} value={form.title} onChange={(e) => setField("title", e.target.value)} /></Field>
          <Field label="شرح"><textarea className={`${inputClass} min-h-24 py-2`} value={form.description} onChange={(e) => setField("description", e.target.value)} /></Field>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="نوع سند"><select className={inputClass} value={form.docId} onChange={(e) => setField("docId", e.target.value)}>{DOC_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="شماره سند"><input className={inputClass} value={form.docNumber} onChange={(e) => setField("docNumber", e.target.value)} /></Field>
            <Field label="تاریخ سند"><JalaliPopupDatePicker value={form.docDateJalali} onChange={(value) => setField("docDateJalali", value)} /></Field>
            <Field label={form.docId === "other" ? "آپلود سند" : "آپلود درخواست"}>
              {form.docId === "other" && <input className={`${inputClass} mb-2`} value={form.docOther} onChange={(e) => setField("docOther", e.target.value)} placeholder="عنوان دلخواه" />}
              <label className={`${inputClass} flex cursor-pointer items-center justify-center gap-2`}><img src="/images/icons/upload.svg" alt="" className="h-4 w-4 dark:invert" />{uploading ? "در حال آپلود..." : "آپلود و الصاق فایل‌ها"}<input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={(e) => uploadFiles(e.target.files)} /></label>
              {!!form.attachments.length && <div className="mt-1 text-[11px] text-neutral-500">{toFa(form.attachments.length)} فایل ضمیمه شده</div>}
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="نوع ارز"><select className={inputClass} value={form.currencyTypeId} onChange={(e) => setField("currencyTypeId", e.target.value)}><option value="">ریال</option>{currencyTypes.map((item) => <option key={item.id} value={item.id}>{itemLabel(item)}</option>)}</select></Field>
            <Field label="منشا ارز"><select className={inputClass} value={form.currencySourceId} onChange={(e) => setField("currencySourceId", e.target.value)}><option value="">انتخاب منشا ارز</option>{currencySources.map((item) => <option key={item.id} value={item.id}>{itemLabel(item)}</option>)}</select></Field>
            <Field label={`مبلغ درخواست (${currencyLabel})`} required><MoneyInput value={form.amount} onChange={(value) => setField("amount", value)} /></Field>
            <Field label={`نقدی (${currencyLabel})`}><MoneyInput value={form.cashAmount} onChange={(value) => setField("cashAmount", value)} /></Field>
            <Field label="تاریخ پرداخت"><JalaliPopupDatePicker value={form.cashDateJalali} onChange={(value) => setField("cashDateJalali", value)} disablePast /></Field>
            <ReadField label={`مانده اعتباری (${currencyLabel})`} value={toFa(creditAmount.toLocaleString("en-US"))} ltr />
          </div>
          <Field label="شرح پرداخت اعتباری"><input className={inputClass} value={creditAmount === 0 ? "-" : form.creditPay} disabled={creditAmount === 0} onChange={(e) => setField("creditPay", e.target.value)} /></Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="نام ذینفع"><input className={inputClass} value={form.beneficiaryName} onChange={(e) => setField("beneficiaryName", e.target.value)} placeholder="نام ذینفع را وارد کنید..." /></Field>
            <Field label="اطلاعات بانکی ذینفع"><input className={inputClass} value={form.bankInfo} onChange={(e) => setField("bankInfo", e.target.value)} placeholder="نام بانک، شماره شبا/کارت، صاحب حساب و ..." /></Field>
          </div>
          {(error || success) && <div className={`rounded-xl px-3 py-2 text-sm ${error ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"}`}>{error || success}</div>}
          <div className="flex justify-end"><button type="submit" disabled={submitting || uploading} className="h-10 w-12 rounded-xl bg-neutral-900 text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900" title="ثبت"><img src="/images/icons/sabtdarkhast.svg" alt="ثبت" className="mx-auto h-5 w-5 invert dark:invert-0" /></button></div>
        </form>}

        {!showForm && <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
          <div className="relative hidden max-h-[55vh] overflow-y-auto overflow-x-hidden pb-0 md:block" dir="ltr"><table dir="rtl" className="w-full min-w-full table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:min-w-0 [&_td]:text-center [&_th]:py-0.5 [&_td]:py-0.5">
            <colgroup><col style={{ width: 48 }} /><col style={{ width: 125 }} /><col style={{ width: 100 }} /><col /><col style={{ width: 125 }} />{mainAdmin && <col style={{ width: 145 }} />}<col style={{ width: 150 }} /><col style={{ width: 135 }} /><col style={{ width: 145 }} /></colgroup>
            <thead><tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-white/10 dark:text-neutral-100">
              <th className="sticky top-0 z-40 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]"><input ref={selectAllRef} type="checkbox" className="h-4 w-4 accent-black dark:accent-neutral-200" checked={allVisibleSelected} onChange={toggleSelectAll} aria-label="انتخاب همه" /></th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]"><button type="button" onClick={() => setNumberSortDir((old) => old === "asc" ? "desc" : "asc")} className="mx-auto inline-flex items-center gap-1 transition hover:opacity-90"><span>شماره</span><img src={numberSortDir === "desc" ? "/images/icons/bozorgbekochik.svg" : "/images/icons/kochikbebozorg.svg"} alt="" className="h-4 w-4 dark:invert" /></button></th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">تاریخ</th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">موضوع</th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">مرکز بودجه</th>
              {mainAdmin && <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">ثبت کننده</th>}
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">مبلغ درخواست</th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">آخرین وضعیت</th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 !pl-6 !pr-3 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">اقدامات</th>
            </tr></thead>
            <tbody className="text-black dark:text-neutral-100">
              {loading ? <tr><td colSpan={mainAdmin ? 9 : 8} className="py-8 text-black/60 dark:text-neutral-400">در حال دریافت...</td></tr> : pageItems.length === 0 ? <tr><td colSpan={mainAdmin ? 9 : 8} className="py-8 text-black/60 dark:text-neutral-400">هنوز درخواستی ثبت نشده است.</td></tr> : pageItems.map((item, index) => <tr key={item.id} className="group bg-black/[0.02] transition-colors hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10">
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><input type="checkbox" className="h-4 w-4 accent-black dark:accent-neutral-200" checked={selectedIds.has(String(item.id))} onChange={() => toggleSelected(item.id)} aria-label="انتخاب" /></td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><button type="button" onClick={() => openPreview(item)} className="mx-auto inline-flex items-center justify-center text-[13px] font-semibold underline-offset-4 transition hover:underline" title="نمایش درخواست">{item.serial || "—"}</button></td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFa(String(item.dateFa || item.date_jalali || "—").replaceAll("-", "/"))}</td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="mx-auto block truncate">{item.title || "—"}</span></td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{SCOPE_OPTIONS.find(([value]) => value === item.scope)?.[1] || "—"}</td>
                {mainAdmin && <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="mx-auto block truncate">{item.createdByName || `کاربر #${toFa(item.createdById)}`}</span></td>}
                <td className="border-b border-neutral-300 px-3 ltr dark:border-neutral-700">{toFa(Number(item.amount || 0).toLocaleString("en-US"))}</td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><StatusBadge status={item.status} /></td>
                <td className="border-b border-neutral-300 !pl-6 !pr-3 dark:border-neutral-700"><div className="flex w-full items-center justify-start gap-2 pl-3 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"><button type="button" onClick={() => openPreview(item)} className="inline-grid h-10 w-10 place-items-center border-0 bg-transparent shadow-none transition hover:opacity-80" aria-label="نمایش" title="نمایش"><img src="/images/icons/namayeshname.svg" alt="" className="h-4 w-4 dark:invert" /></button>{String(item.createdById) === String(user?.id) && <button type="button" onClick={() => deleteItem(item)} className="inline-grid h-10 w-10 place-items-center border-0 bg-transparent shadow-none transition hover:opacity-80" aria-label="حذف" title="حذف"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" style={{ filter: "brightness(0) saturate(100%) invert(25%) sepia(95%) saturate(4870%) hue-rotate(355deg) brightness(95%) contrast(110%)" }} /></button>}</div></td>
              </tr>)}
            </tbody>
          </table></div>
          <div className="grid gap-3 p-3 md:hidden">{pageItems.map((item) => <button key={item.id} type="button" onClick={() => openPreview(item)} className="rounded-xl border border-black/10 p-3 text-right dark:border-white/10"><div className="flex items-center justify-between gap-2"><b>{item.serial || "—"}</b><StatusBadge status={item.status} /></div><div className="mt-2 truncate text-sm">{item.title || "—"}</div><div className="mt-2 text-xs text-neutral-500">{toFa(String(item.dateFa || item.date_jalali || "—").replaceAll("-", "/"))}</div></button>)}</div>
          <div className="border-t border-neutral-300 px-3 py-2 dark:border-neutral-800"><div className="flex flex-col items-stretch gap-2 md:flex-row md:flex-wrap md:items-center md:justify-between">
            <div className="flex items-center justify-between gap-2 text-sm md:justify-start"><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((old) => Math.max(0, old - 1))} disabled={safePage <= 0} className="inline-grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white transition hover:bg-black/[0.04] disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" aria-label="صفحه قبل"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 18l6-6-6-6" /></svg></button><button type="button" onClick={() => setPage((old) => Math.min(pageCount - 1, old + 1))} disabled={safePage >= pageCount - 1} className="inline-grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white transition hover:bg-black/[0.04] disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" aria-label="صفحه بعد"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 18l-6-6 6-6" /></svg></button></div><div className="whitespace-nowrap text-black/70 dark:text-neutral-400">{total === 0 ? "۰ از ۰" : `${toFa(startIndex + 1)}–${toFa(endIndex)} از ${toFa(total)}`}</div></div>
            <div className="flex items-center justify-between gap-2 text-sm md:justify-start"><span className="text-black/70 dark:text-neutral-400">تعداد در هر صفحه:</span><div className="inline-flex h-9 overflow-hidden rounded-lg border border-black/10 bg-white dark:border-white/15 dark:bg-white/5">{[10, 25, 100].map((count) => <button key={count} type="button" onClick={() => { setRowsPerPage(count); setPage(0); }} className={`min-w-10 px-3 text-sm font-semibold transition ${rowsPerPage === count ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-700 hover:bg-black/[0.04] dark:text-white/75 dark:hover:bg-white/10"}`}>{toFa(count)}</button>)}</div></div>
          </div></div>
        </div>}
      </div>
    </Card>
    {selected && <PaymentPreview
      item={selected}
      projects={projects}
      currencyTypes={currencyTypes}
      currencySources={currencySources}
      mainAdmin={mainAdmin}
      actionNote={actionNote}
      setActionNote={setActionNote}
      actionBusy={actionBusy}
      actionError={actionError}
      onAction={recordAction}
      onClose={() => setSelected(null)}
    />}
  </div>;
}

function Field({ label, required, children }) { return <label className="block text-xs text-neutral-600 dark:text-neutral-300">{label}{required && <span className="mr-1 text-red-500">*</span>}<div className="mt-1">{children}</div></label>; }
function ReadField({ label, value, ltr }) { return <Field label={label}><div dir={ltr ? "ltr" : "rtl"} className={`${inputClass} flex items-center ${ltr ? "justify-end" : ""}`}>{value || "—"}</div></Field>; }
function MoneyInput({ value, onChange }) { return <input dir="ltr" inputMode="numeric" className={inputClass} value={toFa(value)} onChange={(e) => onChange(money(e.target.value))} placeholder="۰" />; }
function StatusBadge({ status }) {
  const colors = status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" : status === "returned" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-neutral-100 text-neutral-700 dark:bg-white/10 dark:text-neutral-200";
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${colors}`}>{STATUS_LABELS[status] || status || "—"}</span>;
}

function PaymentPreview({ item, projects, currencyTypes, currencySources, mainAdmin, actionNote, setActionNote, actionBusy, actionError, onAction, onClose }) {
  const scopeLabel = SCOPE_OPTIONS.find(([value]) => value === item.scope)?.[1] || "—";
  const project = projects.find((row) => String(row.id) === String(item.projectId));
  const currency = currencyTypes.find((row) => String(row.id) === String(item.currencyTypeId));
  const source = currencySources.find((row) => String(row.id) === String(item.currencySourceId));
  const currencyName = currency ? itemLabel(currency) : "ریال";
  const cash = Number(item.cashText ?? item.cashAmount ?? 0);
  const credit = Number(item.creditSection ?? item.creditAmount ?? Math.max(0, Number(item.amount || 0) - cash));
  const docName = item.docId === "other" ? (item.docOther || "سایر") : (DOC_OPTIONS.find(([value]) => value === item.docId)?.[1] || "—");
  const attachments = Array.isArray(item.attachments) ? item.attachments : [];
  const history = Array.isArray(item.historyJson) ? item.historyJson : Array.isArray(item.history_json) ? item.history_json : [];
  const canDecide = mainAdmin && item.status === "pending" && item.canAct !== false;

  return createPortal(<div className="fixed inset-0 z-[9999]">
    <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
    <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">
      <div dir="rtl" className="flex h-[min(88vh,840px)] w-[min(1100px,calc(100vw-20px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
          <div className="text-sm font-bold">نمایش درخواست پرداخت <span className="font-normal text-neutral-500">— {item.serial || "—"}</span></div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white ring-1 ring-black/15 transition hover:bg-black/80 dark:bg-transparent dark:ring-neutral-800 dark:hover:bg-white/10" aria-label="بستن" title="بستن"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.25fr]">
            <div className="space-y-4">
              <PreviewSection title="مشخصات درخواست">
                <PreviewRow label="شماره درخواست" value={item.serial || "—"} ltr />
                <PreviewRow label="تاریخ درخواست" value={toFa(String(item.dateFa || item.date_jalali || "—").replaceAll("-", "/"))} />
                <PreviewRow label="درخواست کننده" value={item.createdByName || `کاربر #${toFa(item.createdById)}`} />
                <PreviewRow label="مرکز بودجه" value={scopeLabel} />
                {item.scope === "projects" && <PreviewRow label="پروژه" value={project ? `${normalizeCode(project.code)} - ${project.name || ""}` : (item.projectId || "—")} />}
                <PreviewRow label="کد بودجه" value={item.budgetCode || "—"} ltr />
                <PreviewRow label="آخرین وضعیت" value={<StatusBadge status={item.status} />} />
              </PreviewSection>
              <PreviewSection title="اطلاعات سند">
                <PreviewRow label="نوع سند" value={docName} />
                <PreviewRow label="شماره سند" value={item.docNumber || "—"} />
                <PreviewRow label="تاریخ سند" value={toFa(item.docDate || item.docDateJalali || "—")} />
                <PreviewRow label="پیوست‌ها" value={attachments.length ? <div className="flex flex-wrap justify-end gap-2">{attachments.map((file, index) => <a key={file.id || file.serverId || index} href={file.url || "#"} target="_blank" rel="noreferrer" className="rounded-lg border border-black/10 px-2 py-1 text-xs hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">{file.name || `فایل ${toFa(index + 1)}`}</a>)}</div> : "—"} />
              </PreviewSection>
            </div>
            <div className="space-y-4">
              <PreviewSection title="جزئیات پرداخت">
                <PreviewRow label="عنوان درخواست" value={item.title || "—"} />
                <PreviewRow label="شرح" value={item.description || "—"} />
                <PreviewRow label={`مبلغ درخواست (${currencyName})`} value={toFa(Number(item.amount || 0).toLocaleString("en-US"))} ltr />
                <PreviewRow label={`مبلغ نقدی (${currencyName})`} value={toFa(cash.toLocaleString("en-US"))} ltr />
                <PreviewRow label={`مانده اعتباری (${currencyName})`} value={toFa(credit.toLocaleString("en-US"))} ltr />
                <PreviewRow label="تاریخ پرداخت" value={toFa(item.cashDate || item.cashDateJalali || "—")} />
                <PreviewRow label="شرح پرداخت اعتباری" value={item.creditPay || "—"} />
                <PreviewRow label="منشا ارز" value={source ? itemLabel(source) : "—"} />
                <PreviewRow label="نام ذینفع" value={item.beneficiaryName || "—"} />
                <PreviewRow label="اطلاعات بانکی ذینفع" value={item.bankInfo || "—"} />
              </PreviewSection>
            </div>
          </div>

          {!!history.length && <div className="mt-4"><PreviewSection title="سوابق درخواست"><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="bg-neutral-100 dark:bg-white/10"><th className="p-2 text-right">اقدام</th><th className="p-2 text-right">شرح</th><th className="p-2 text-right">تاریخ و ساعت</th></tr></thead><tbody>{history.filter((entry) => !["step_set", "step_clear"].includes(entry?.type)).map((entry, index) => <tr key={index} className="border-t border-black/10 dark:border-white/10"><td className="p-2">{historyLabel(entry?.type || entry?.status)}</td><td className="p-2">{entry?.note || "—"}</td><td className="p-2">{formatDateTime(entry?.at)}</td></tr>)}</tbody></table></div></PreviewSection></div>}

          {canDecide && <div className="mt-4 rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <div className="mb-2 text-sm font-semibold">اقدام روی درخواست</div>
            <textarea value={actionNote} onChange={(event) => setActionNote(event.target.value)} className="min-h-20 w-full rounded-xl border border-black/10 bg-white p-3 text-sm outline-none dark:border-white/15 dark:bg-white/5" placeholder="شرح اقدام (اختیاری)" />
            {actionError && <div className="mt-2 text-xs text-red-600 dark:text-red-400">{actionError}</div>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => onAction("rejected")} disabled={actionBusy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm text-white transition hover:bg-red-700 disabled:opacity-50"><img src="/images/icons/raddarkhast.svg" alt="" className="h-5 w-5 invert" />رد درخواست</button>
              <button type="button" onClick={() => onAction("approved")} disabled={actionBusy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm text-white transition hover:bg-emerald-700 disabled:opacity-50"><img src="/images/icons/taeid.svg" alt="" className="h-5 w-5 invert" />تأیید درخواست</button>
            </div>
          </div>}
        </div>
      </div>
    </div>
  </div>, document.body);
}

function PreviewSection({ title, children }) { return <section className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10"><div className="border-b border-black/10 bg-neutral-50 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/5">{title}</div><div className="divide-y divide-black/10 px-4 dark:divide-white/10">{children}</div></section>; }
function PreviewRow({ label, value, ltr }) { return <div className="grid grid-cols-[135px_1fr] gap-3 py-2.5 text-sm"><div className="text-neutral-500 dark:text-neutral-400">{label}</div><div dir={ltr ? "ltr" : "rtl"} className={`break-words font-medium ${ltr ? "text-left" : "text-right"}`}>{value}</div></div>; }
function historyLabel(value) { return ({ created: "ثبت درخواست", approved: "تأیید", rejected: "رد", returned: "برگشت", edited: "ویرایش" })[value] || value || "—"; }
function formatDateTime(value) { if (!value) return "—"; try { return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); } catch { return "—"; } }
