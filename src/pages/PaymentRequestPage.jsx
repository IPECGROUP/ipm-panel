// درخواست پرداخت
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card } from "../components/ui/Card";
import { useAuth } from "../components/AuthProvider";
import { todayJalaliYmd } from "../utils/date";
import { toEnglishDigits } from "../utils/format";

const DOC_OPTIONS = [
  ["pre_invoice", "پیش فاکتور"], ["invoice", "فاکتور"],
  ["goods_services", "صورت حساب رسمی کالا و خدمات"],
  ["other_invoice", "صورت حساب غیر رسمی"], ["status_invoice", "صورت وضعیت"],
  ["internal_list", "لیست پرداخت داخلی"], ["gov_salary", "فیش بدهی دولتی"], ["other", "سایر"],
];
const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const STATUS_LABELS = { pending: "در انتظار بررسی", approved: "تأییدشده", rejected: "ردشده", returned: "برگشت‌خورده" };
const STEP_LABELS = {
  requester: "درخواست‌کننده",
  project_control: "برنامه‌ریزی و کنترل پروژه",
  project_manager: "مدیر پروژه",
  accounting: "مالی و حسابداری",
  management: "مدیریت",
  finance_manager: "مدیریت مالی",
  payment_order: "دستور پرداخت",
};
const PAYMENT_METHOD_OPTIONS = ["واریز بانکی - فیش", "واریز بانکی - اینترنت بانک", "صدور چک", "بصورت نقدی"];
const PAGE_ICON = "/images/icons/darkhast-pardakht.svg";
const inputClass = "w-full h-11 rounded-xl border border-black/10 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-white";
const today = () => todayJalaliYmd().replaceAll("-", "/");
const emptyForm = () => ({
  dateJalali: today(), scope: "projects", projectId: "", budgetCode: "", title: "", description: "",
  amount: "", cashAmount: "", cashDateJalali: "", creditPay: "", beneficiaryName: "", bankInfo: "",
  docId: "pre_invoice", docOther: "", docNumber: "", docDateJalali: "",
  currencyTypeId: "", currencySourceId: "", attachments: [], hasSupplyRequest: "no", supplyRequestId: "", targetAssigneeUserId: "",
});
const formFromItem = (item = {}) => ({
  dateJalali: String(item.dateFa || item.dateJalali || item.date_jalali || today()).replaceAll("-", "/"),
  scope: "projects",
  projectId: item.projectId != null ? String(item.projectId) : "",
  budgetCode: item.budgetCode || "",
  title: item.title || "",
  description: item.description || "",
  amount: money(item.amount || ""),
  cashAmount: money(item.cashText || item.cashAmount || ""),
  cashDateJalali: item.cashDate || item.cashDateJalali || "",
  creditPay: item.creditPay || "",
  beneficiaryName: item.beneficiaryName || "",
  bankInfo: item.bankInfo || "",
  docId: item.docId || "pre_invoice",
  docOther: item.docOther || "",
  docNumber: item.docNumber || "",
  docDateJalali: item.docDateJalali || item.docDate || "",
  currencyTypeId: item.currencyTypeId != null ? String(item.currencyTypeId) : "",
  currencySourceId: item.currencySourceId != null ? String(item.currencySourceId) : "",
  attachments: Array.isArray(item.attachments) ? item.attachments : [],
  hasSupplyRequest: item.hasSupplyRequest === "yes" || item.supplyRequestId ? "yes" : "no",
  supplyRequestId: item.supplyRequestId != null ? String(item.supplyRequestId) : "",
});

function toFa(value) { return String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]); }
function parseAmount(value) {
  const digits = toEnglishDigits(String(value || "")).replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}
function money(value) { const amount = parseAmount(value); return amount ? amount.toLocaleString("en-US") : ""; }
function normalizeCode(value) { return toEnglishDigits(String(value || "")).trim(); }
function normalizeBudgetCode(value = "") {
  return normalizeCode(value)
    .toUpperCase()
    .replace(/[^\d.-]/g, "-")
    .replace(/[.-]+/g, "-")
    .replace(/^-/, "")
    .replace(/-$/, "");
}
function budgetCodeForProject(value = "", projectCode = "") {
  const code = normalizeBudgetCode(value);
  const prefix = normalizeBudgetCode(projectCode);
  if (!code || !prefix) return code;
  if (code === prefix || code.startsWith(`${prefix}-`)) return code;
  return `${prefix}-${code}`;
}
function normalizeDigits(value = "") { return toEnglishDigits(String(value ?? "")).replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)); }
function jalaliYY(value = today()) {
  const year = normalizeDigits(value).match(/^(\d{4})/)?.[1] || "1400";
  return year.slice(-2);
}
function normalizeProjectCode(value = "") {
  return normalizeBudgetCode(value);
}
function isActiveProject(project) {
  const value = project?.isActive ?? project?.is_active ?? project?.active;
  return value === undefined || value === null || value === true || value === 1 || String(value).toLowerCase() === "true" || String(value) === "1";
}
function isMainProject(project) { return /^\d{3}$/.test(normalizeProjectCode(project?.code)); }
function itemLabel(item) { return item?.title || item?.name || item?.label || item?.code || `#${item?.id}`; }
function projectLabel(project) {
  const code = normalizeProjectCode(project?.code);
  return `${code}${project?.name || project?.title ? ` - ${project.name || project.title}` : ""}`;
}
function formatSheba(value) {
  const raw = normalizeDigits(value).toUpperCase().replace(/^IR/i, "").replace(/[^0-9]/g, "").slice(0, 24);
  const groups = [];
  if (raw.slice(0, 2)) groups.push(raw.slice(0, 2));
  for (let i = 2; i < 22; i += 4) {
    const part = raw.slice(i, i + 4);
    if (part) groups.push(part);
  }
  const tail = raw.slice(22, 24);
  if (tail) groups.push(tail);
  return `IR${groups.length ? `-${groups.join("-")}` : ""}`;
}

function registrationMessage(info) {
  if (!info) return "";
  const date = info.dateJalali || info.date || "";
  const time = info.time || "";
  const userName = info.userName || info.username || "کاربر";
  const unitName = info.unitName || "نامشخص";
  const roleName = info.roleName || "";
  return `درخواست شما در تاریخ ${toFa(String(date).replaceAll("-", "/"))} در ساعت ${toFa(time)} توسط ${userName}${roleName ? ` با نقش ${roleName}` : ""} واحد ${unitName} ثبت گردید`;
}

function clientRegistrationInfo() {
  const now = new Date();
  const dateJalali = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const time = new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  return {
    dateJalali: normalizeDigits(dateJalali).replaceAll("-", "/"),
    time: normalizeDigits(time),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
  };
}

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
  const [supplyRequests, setSupplyRequests] = useState([]);
  const [currencyTypes, setCurrencyTypes] = useState([]);
  const [currencySources, setCurrencySources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitNotice, setSubmitNotice] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [filterQuick, setFilterQuick] = useState("");
  const [filterTagIds, setFilterTagIds] = useState([]);
  const [pinnedFilterTagIds, setPinnedFilterTagIds] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagPickOpen, setTagPickOpen] = useState(false);
  const [tagPickSearch, setTagPickSearch] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [createRecipients, setCreateRecipients] = useState({ targetRoleKey: null, users: [] });
  const [createRecipientsLoading, setCreateRecipientsLoading] = useState(false);
  const selectedProject = useMemo(
    () => projects.find((project) => String(project.id) === String(form.projectId)),
    [form.projectId, projects]
  );
  const serial = useMemo(() => {
    const yy = jalaliYY(form.dateJalali);
    let maxSeq = 0;
    const re = new RegExp(`^${yy}/(?:\\d{3}/)?(\\d{4})$`);
    items.forEach((item) => {
      const match = normalizeDigits(item?.serial || "").match(re);
      if (match) maxSeq = Math.max(maxSeq, Number(match[1]) || 0);
    });
    return `${yy}/${String(maxSeq + 1).padStart(4, "0")}`;
  }, [form.dateJalali, items]);
  const amount = parseAmount(form.amount);
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
      const data = await api("/requests");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch { setError("دریافت درخواست‌ها انجام نشد."); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => {
    let cancelled = false;
    setCreateRecipientsLoading(true);
    api("/requests?nextRecipientsForCreate=1")
      .then((data) => { if (!cancelled) setCreateRecipients({ targetRoleKey: data?.targetRoleKey || null, users: Array.isArray(data?.users) ? data.users : [] }); })
      .catch(() => { if (!cancelled) setCreateRecipients({ targetRoleKey: null, users: [] }); })
      .finally(() => { if (!cancelled) setCreateRecipientsLoading(false); });
    return () => { cancelled = true; };
  }, [api]);
  useEffect(() => {
    api("/tags?scope=letters").then((data) => {
      const rows = Array.isArray(data?.tags) ? data.tags : Array.isArray(data?.items) ? data.items : [];
      setTags(rows);
    }).catch(() => setTags([]));
  }, [api]);
  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(`request_filter_tags:payment:u${user.id}`);
      const ids = raw ? JSON.parse(raw) : [];
      setPinnedFilterTagIds(Array.isArray(ids) ? ids.map(String) : []);
    } catch {
      setPinnedFilterTagIds([]);
    }
  }, [user?.id]);
  useEffect(() => {
    if (!user?.id) return;
    try {
      localStorage.setItem(`request_filter_tags:payment:u${user.id}`, JSON.stringify((pinnedFilterTagIds || []).map(String)));
    } catch {}
  }, [pinnedFilterTagIds, user?.id]);
  useEffect(() => {
    Promise.allSettled([api("/cost-breakdown"), api("/base/currencies/types"), api("/base/currencies/sources"), api("/supply-requests")]).then(([p, t, s, sr]) => {
      if (p.status === "fulfilled") {
        const rows = Array.isArray(p.value.items) ? p.value.items : [];
        const byProject = new Map();
        rows.forEach((item) => {
          const project = item?.project || {};
          const id = project.id ?? item.projectId ?? item.project_id;
          const code = normalizeProjectCode(project.code ?? item.projectCode ?? item.project_code);
          if (!id || !code) return;
          if (!byProject.has(String(id))) {
            byProject.set(String(id), {
              id,
              code,
              name: String(project.name ?? item.projectName ?? item.project_name ?? "").trim(),
              isActive: project.isActive ?? item.projectIsActive ?? item.project_is_active ?? true,
            });
          }
        });
        const mainProjects = Array.from(byProject.values())
          .filter((project) => isActiveProject(project) && isMainProject(project))
          .sort((a, b) => normalizeProjectCode(a.code).localeCompare(normalizeProjectCode(b.code), "fa", { numeric: true }));
        setProjects(mainProjects);
      }
      if (t.status === "fulfilled") setCurrencyTypes(t.value.items || []);
      if (s.status === "fulfilled") setCurrencySources(s.value.items || []);
      if (sr.status === "fulfilled") setSupplyRequests(Array.isArray(sr.value.items) ? sr.value.items : []);
    });
  }, [api]);
  useEffect(() => {
    if (!form.projectId) { setBudgetItems([]); return; }
    let cancelled = false;
    (async () => {
      const selectedProject = projects.find((item) => String(item.id) === String(form.projectId));
      const projectCode = normalizeBudgetCode(selectedProject?.code);
      try {
        const costData = await api(`/cost-breakdown?project_id=${encodeURIComponent(form.projectId)}`).catch(() => ({ items: [] }));
        const costItems = Array.isArray(costData?.items) ? costData.items : [];
        const byCode = new Map();

        costItems.forEach((item) => {
          const code = budgetCodeForProject(item?.budgetCode ?? item?.budget_code ?? item?.code, projectCode);
          if (!code) return;
          const previous = byCode.get(code) || { code, center_desc: "", last_amount: 0 };
          byCode.set(code, {
            ...previous,
            center_desc: previous.center_desc || String(item?.budgetName ?? item?.budget_name ?? item?.name ?? ""),
            last_amount: Number(item?.baseBudget ?? item?.base_budget ?? previous.last_amount ?? 0),
          });
        });

        if (!byCode.size && selectedProject?.code) {
          const code = normalizeBudgetCode(selectedProject.code);
          byCode.set(code, { code, center_desc: selectedProject.name || "", last_amount: 0 });
        }

        const merged = Array.from(byCode.values()).sort((a, b) =>
          normalizeBudgetCode(a.code).localeCompare(normalizeBudgetCode(b.code), "fa", { numeric: true, sensitivity: "base" })
        );
        if (!cancelled) setBudgetItems(merged);
      } catch {
        if (!cancelled) setBudgetItems([]);
      }
    })();
    return () => { cancelled = true; };
  }, [api, form.projectId, projects]);

  const setField = (name, value) => { setForm((old) => ({ ...old, [name]: value })); setError(""); setSuccess(""); };

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
    if (!form.projectId) return setError("پروژه را انتخاب کنید.");
    if (!form.budgetCode) return setError("کد بودجه را انتخاب کنید.");
    if (!form.title.trim()) return setError("موضوع درخواست را وارد کنید.");
    if (amount <= 0) return setError("مبلغ درخواست باید بیشتر از صفر باشد.");
    if (form.hasSupplyRequest === "yes" && !form.supplyRequestId) return setError("درخواست تامین را انتخاب کنید.");
    if (createRecipients.targetRoleKey && !form.targetAssigneeUserId) return setError("گیرنده درخواست پرداخت را انتخاب کنید.");
    setSubmitting(true); setError(""); setSuccess("");
    try {
      const data = await api("/requests", { method: "POST", body: JSON.stringify({
        ...form, serial, scope: "projects", amount, cashAmount: null, creditAmount: null,
        currencyTypeId: form.currencyTypeId || null, currencySourceId: form.currencySourceId || null,
        projectId: form.projectId || null,
        targetAssigneeUserId: form.targetAssigneeUserId || null,
        clientRegistrationInfo: clientRegistrationInfo(),
      }) });
      setSubmitNotice(data?.item?.registrationInfo || null);
      setForm(emptyForm()); setSuccess("درخواست با موفقیت ثبت شد."); setShowForm(false); await loadItems();
    } catch { setError("ثبت درخواست انجام نشد."); }
    finally { setSubmitting(false); }
  };

  const openPreview = (item) => {
    setSelected(item);
    setActionNote("");
    setActionError("");
  };

  const recordAction = async (status, noteOverride = "") => {
    if (!selected || actionBusy) return;
    setActionBusy(true);
    setActionError("");
    try {
      const finalNote = String(noteOverride || actionNote || "").trim();
      const data = await api("/requests/status", {
        method: "POST",
        body: JSON.stringify({ id: selected.id, status, note: finalNote }),
      });
      setSelected((current) => current ? { ...current, ...(data.item || {}) } : current);
      setActionNote("");
      setSubmitNotice({
        dateJalali: normalizeDigits(new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())),
        time: normalizeDigits(new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date())),
        userName: user?.name || user?.username || "کاربر",
        unitName: STEP_LABELS[selected.currentStepRoleKey] || "واحد مربوطه",
        roleName: status === "approved" ? "تایید کننده" : status === "returned" ? "ارجاع دهنده" : "رد کننده",
      });
      await loadItems();
      return data;
    } catch (err) {
      setActionError(["forbidden", "reject_not_allowed_for_step", "return_not_allowed_for_step"].includes(err?.message) ? "شما اجازه انجام این اقدام را ندارید." : "ثبت اقدام انجام نشد.");
    } finally {
      setActionBusy(false);
    }
  };

  const resubmitReturned = async (item, updates, note = "") => {
    if (!item || actionBusy) return;
    if (!updates.projectId) return setActionError("پروژه را انتخاب کنید.");
    if (!updates.budgetCode) return setActionError("کد بودجه را انتخاب کنید.");
    if (!String(updates.title || "").trim()) return setActionError("موضوع درخواست را وارد کنید.");
    if (parseAmount(updates.amount) <= 0) return setActionError("مبلغ درخواست باید بیشتر از صفر باشد.");
    if (updates.hasSupplyRequest === "yes" && !updates.supplyRequestId) return setActionError("درخواست تامین را انتخاب کنید.");

    setActionBusy(true);
    setActionError("");
    try {
      const patchPayload = {
        ...updates,
        scope: "projects",
        amount: parseAmount(updates.amount),
        cashAmount: null,
        creditAmount: null,
        currencyTypeId: updates.currencyTypeId || null,
        currencySourceId: updates.currencySourceId || null,
        projectId: updates.projectId || null,
      };
      const patched = await api(`/requests/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify(patchPayload),
      });
      const finalNote = String(note || "").trim() || "اصلاح و ارسال مجدد درخواست";
      const submitted = await api("/requests/status", {
        method: "POST",
        body: JSON.stringify({ id: item.id, status: "approved", note: finalNote }),
      });
      setSelected((current) => current ? { ...current, ...(submitted.item || patched.item || {}) } : current);
      setActionNote("");
      setSubmitNotice({
        dateJalali: normalizeDigits(new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())),
        time: normalizeDigits(new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date())),
        userName: user?.name || user?.username || "کاربر",
        unitName: "درخواست کننده",
        roleName: "ارسال کننده مجدد",
      });
      await loadItems();
    } catch (err) {
      setActionError(err?.message === "forbidden" ? "شما اجازه انجام این اقدام را ندارید." : "ارسال مجدد درخواست انجام نشد.");
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

  const filteredItems = useMemo(() => filterRequestRows(items, { query: filterQuery, quick: filterQuick, tagIds: filterTagIds }), [items, filterQuery, filterQuick, filterTagIds]);
  const sortedItems = useMemo(() => [...filteredItems].sort((a, b) => {
    const result = String(a.serial || a.id || "").localeCompare(String(b.serial || b.id || ""), "fa", { numeric: true, sensitivity: "base" });
    return numberSortDir === "asc" ? result : -result;
  }), [filteredItems, numberSortDir]);
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
        <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
              <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold md:text-lg">مدیریت درخواست ها</span>
              <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">درخواست پرداخت</span>
            </span>
          </div>
          <button type="button" onClick={() => { setShowForm((old) => !old); setError(""); setSuccess(""); }} className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-black/15 transition hover:bg-black/5 dark:ring-neutral-800 dark:hover:bg-white/10" title={showForm ? "نمایش لیست" : "افزودن درخواست"}>
            <img src={showForm ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" />
          </button>
        </div>

        {showForm && <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(150px,0.75fr)_minmax(140px,0.7fr)_minmax(220px,1fr)_minmax(220px,1fr)]">
            <ReadField label="شماره درخواست" value={serial} ltr />
            <ReadField label="تاریخ درخواست" value={toFa(form.dateJalali)} />
            <Field label="پروژه" required><select className={inputClass} value={form.projectId} onChange={(e) => setForm((old) => ({ ...old, projectId: e.target.value, budgetCode: "" }))}><option value="">انتخاب پروژه</option>{projects.map((item) => <option key={item.id} value={item.id}>{projectLabel(item)}</option>)}</select></Field>
            <Field label="کد بودجه" required><select className={inputClass} value={form.budgetCode} disabled={!form.projectId} onChange={(e) => setField("budgetCode", e.target.value)}><option value="">{form.projectId ? "انتخاب کد بودجه" : "ابتدا پروژه را انتخاب کنید"}</option>{budgetItems.map((item) => { const code = normalizeBudgetCode(item.code || item.center_code); const description = item.center_desc || item.last_desc || item.name || item.description || ""; return <option key={code || item.id} value={code}>{code}{description ? ` - ${description}` : ""}</option>; })}</select></Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(260px,1.4fr)_minmax(160px,0.75fr)_minmax(160px,0.7fr)]">
            <Field label="موضوع درخواست" required><input className={`${inputClass} h-12 text-[15px]`} value={form.title} onChange={(e) => setField("title", e.target.value)} /></Field>
            <Field label={`مبلغ درخواست (${currencyLabel})`} required><MoneyInput value={form.amount} onChange={(value) => setField("amount", value)} /></Field>
            <Field label="ارز"><select className={inputClass} value={form.currencyTypeId} onChange={(e) => setField("currencyTypeId", e.target.value)}><option value="">ریال</option>{currencyTypes.map((item) => <option key={item.id} value={item.id}>{itemLabel(item)}</option>)}</select></Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(180px,0.6fr)_minmax(260px,1fr)]">
            <Field label="درخواست تامین">
              <div className="flex h-9 items-center gap-6 px-1">
                {[["no", "ندارد"], ["yes", "دارد"]].map(([value, label]) => {
                  const checked = form.hasSupplyRequest === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm((old) => ({ ...old, hasSupplyRequest: value, supplyRequestId: value === "yes" ? old.supplyRequestId : "" }))}
                      className="inline-flex items-center gap-2 text-sm text-neutral-900 transition hover:opacity-75 dark:text-white"
                    >
                      <span>{label}</span>
                      <span className={`grid h-5 w-5 place-items-center rounded-full border ${checked ? "border-neutral-950 dark:border-white" : "border-neutral-400 dark:border-neutral-500"}`}>
                        {checked && <span className="h-3 w-3 rounded-full bg-neutral-950 dark:bg-white" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>
            {form.hasSupplyRequest === "yes" && <Field label="انتخاب درخواست تامین" required><select className={inputClass} value={form.supplyRequestId} onChange={(e) => setField("supplyRequestId", e.target.value)}><option value="">انتخاب کنید</option>{supplyRequests.map((item) => <option key={item.id} value={item.id}>{item.serial || `#${item.id}`}{item.title ? ` - ${item.title}` : ""}</option>)}</select></Field>}
          </div>

          <Field label="ارسال درخواست پرداخت به" required={!!createRecipients.targetRoleKey}>
            <select className={inputClass} value={form.targetAssigneeUserId} onChange={(e) => setField("targetAssigneeUserId", e.target.value)} disabled={createRecipientsLoading || !createRecipients.targetRoleKey}>
              <option value="">{createRecipientsLoading ? "در حال دریافت..." : createRecipients.targetRoleKey ? "انتخاب کنید" : "ارسال مستقیم برای اقدام"}</option>
              {createRecipients.users.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name || recipient.username || recipient.email || `کاربر #${recipient.id}`}</option>)}
            </select>
          </Field>

          <Field label="شرح درخواست"><textarea className={`${inputClass} min-h-24 py-2 leading-7`} value={form.description} onChange={(e) => setField("description", e.target.value)} /></Field>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="نوع سند">
              {form.docId === "other" ? (
                <input className={inputClass} value={form.docOther} onChange={(e) => setField("docOther", e.target.value)} placeholder="نوع سند را وارد کنید" autoFocus />
              ) : (
                <select className={inputClass} value={form.docId} onChange={(e) => {
                  const value = e.target.value;
                  setForm((old) => ({ ...old, docId: value, docOther: value === "other" ? "" : old.docOther }));
                }}>{DOC_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              )}
            </Field>
            <Field label="شماره سند"><input className={inputClass} value={form.docNumber} onChange={(e) => setField("docNumber", e.target.value)} /></Field>
            <Field label="تاریخ سند"><JalaliPopupDatePicker value={form.docDateJalali} onChange={(value) => setField("docDateJalali", value)} /></Field>
            <Field label="بارگذاری">
              <label className="grid h-11 w-11 cursor-pointer place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title={uploading ? "در حال آپلود" : "بارگذاری"} aria-label={uploading ? "در حال آپلود" : "بارگذاری"}>
                <img src="/images/icons/upload.svg" alt="" className={`h-5 w-5 dark:invert ${uploading ? "animate-pulse opacity-60" : ""}`} />
                <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
              </label>
              {!!form.attachments.length && <div className="mt-1 text-[11px] text-neutral-500">{toFa(form.attachments.length)} فایل ضمیمه شده</div>}
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="شرایط پرداخت"><input className={inputClass} value={form.creditPay} onChange={(e) => setField("creditPay", e.target.value)} /></Field>
            <Field label="نام ذینفع"><input className={inputClass} value={form.beneficiaryName} onChange={(e) => setField("beneficiaryName", e.target.value)} /></Field>
            <Field label="شماره شبا"><input dir="ltr" inputMode="numeric" className={`${inputClass} text-left font-sans tabular-nums`} value={form.bankInfo || "IR"} onChange={(e) => setField("bankInfo", formatSheba(e.target.value))} onFocus={() => { if (!form.bankInfo) setField("bankInfo", "IR"); }} placeholder="IR" /></Field>
          </div>
          {(error || success) && <div className={`rounded-xl px-3 py-2 text-sm ${error ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"}`}>{error || success}</div>}
          <div className="flex justify-end"><button type="submit" disabled={submitting || uploading} className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-900 text-white transition hover:bg-neutral-900/85 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-white/90" title="ثبت" aria-label="ثبت"><img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" /></button></div>
        </form>}

        {!showForm && <RequestFilterBar query={filterQuery} setQuery={setFilterQuery} quick={filterQuick} setQuick={setFilterQuick} tags={tags} pinnedTagIds={pinnedFilterTagIds} setPinnedTagIds={setPinnedFilterTagIds} activeTagIds={filterTagIds} setActiveTagIds={setFilterTagIds} tagPickOpen={tagPickOpen} setTagPickOpen={setTagPickOpen} tagPickSearch={tagPickSearch} setTagPickSearch={setTagPickSearch} />}

        {!showForm && <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
          <div className="relative hidden max-h-[55vh] overflow-y-auto overflow-x-hidden pb-0 md:block" dir="ltr"><table dir="rtl" className="w-full min-w-full table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:min-w-0 [&_td]:text-center [&_th]:py-0.5 [&_td]:py-0.5">
            <colgroup><col style={{ width: 48 }} /><col style={{ width: 125 }} /><col style={{ width: 100 }} /><col /><col style={{ width: 125 }} /><col style={{ width: 135 }} /><col style={{ width: 145 }} /></colgroup>
            <thead><tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-white/10 dark:text-neutral-100">
              <th className="sticky top-0 z-40 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]"><input ref={selectAllRef} type="checkbox" className="h-4 w-4 accent-black dark:accent-neutral-200" checked={allVisibleSelected} onChange={toggleSelectAll} aria-label="انتخاب همه" /></th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]"><button type="button" onClick={() => setNumberSortDir((old) => old === "asc" ? "desc" : "asc")} className="mx-auto inline-flex items-center gap-1 transition hover:opacity-90"><span>شماره</span><img src={numberSortDir === "desc" ? "/images/icons/bozorgbekochik.svg" : "/images/icons/kochikbebozorg.svg"} alt="" className="h-4 w-4 dark:invert" /></button></th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">تاریخ</th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">موضوع</th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">پروژه</th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">آخرین وضعیت</th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 !pl-6 !pr-3 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">اقدامات</th>
            </tr></thead>
            <tbody className="text-black dark:text-neutral-100">
              {loading ? <tr><td colSpan={7} className="py-8 text-black/60 dark:text-neutral-400">در حال دریافت...</td></tr> : pageItems.length === 0 ? <tr><td colSpan={7} className="py-8 text-black/60 dark:text-neutral-400">هنوز درخواستی ثبت نشده است.</td></tr> : pageItems.map((item, index) => <tr key={item.id} className="group bg-black/[0.02] transition-colors hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10">
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><input type="checkbox" className="h-4 w-4 accent-black dark:accent-neutral-200" checked={selectedIds.has(String(item.id))} onChange={() => toggleSelected(item.id)} aria-label="انتخاب" /></td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><button type="button" onClick={() => openPreview(item)} className="mx-auto inline-flex items-center justify-center text-[13px] font-semibold underline-offset-4 transition hover:underline" title="نمایش درخواست">{item.serial || "—"}</button></td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFa(String(item.dateFa || item.date_jalali || "—").replaceAll("-", "/"))}</td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="mx-auto block truncate">{item.title || "—"}</span></td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="mx-auto block truncate">{projectLabel(projects.find((row) => String(row.id) === String(item.projectId))) || item.projectName || item.projectCode || "—"}</span></td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><StatusBadge status={item.status} /></td>
                <td className="border-b border-neutral-300 !pl-6 !pr-3 dark:border-neutral-700"><div className="flex w-full items-center justify-start gap-2 pl-3 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"><button type="button" onClick={() => openPreview(item)} className="inline-grid h-10 w-10 place-items-center border-0 bg-transparent shadow-none transition hover:opacity-80" aria-label={item.canAct ? "اقدامات" : "نمایش"} title={item.canAct ? "اقدامات" : "نمایش"}><img src="/images/icons/namayeshname.svg" alt="" className="h-4 w-4 dark:invert" /></button>{item.canDelete && <button type="button" onClick={() => deleteItem(item)} className="inline-grid h-10 w-10 place-items-center border-0 bg-transparent shadow-none transition hover:opacity-80" aria-label="حذف" title="حذف"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" style={{ filter: "brightness(0) saturate(100%) invert(25%) sepia(95%) saturate(4870%) hue-rotate(355deg) brightness(95%) contrast(110%)" }} /></button>}</div></td>
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
      supplyRequests={supplyRequests}
      currencyTypes={currencyTypes}
      currencySources={currencySources}
      userId={user?.id}
      actionNote={actionNote}
      setActionNote={setActionNote}
      actionBusy={actionBusy}
      actionError={actionError}
      onAction={recordAction}
      onResubmit={resubmitReturned}
      onClose={() => setSelected(null)}
    />}
    {submitNotice && <RegistrationNotice info={submitNotice} onClose={() => setSubmitNotice(null)} />}
  </div>;
}

const QUICK_FILTERS = [["week", "هفته قبل"], ["2w", "2 هفته قبل"], ["1m", "ماه قبل"], ["3m", "3 ماه قبل"], ["6m", "6 ماه قبل"]];

function tagLabelOf(tag) {
  return String(tag?.label ?? tag?.name ?? tag?.title ?? tag?.text ?? tag?.id ?? "").trim();
}

function tagIdListOf(item) {
  const history = Array.isArray(item?.historyJson) ? item.historyJson : Array.isArray(item?.history_json) ? item.history_json : [];
  const created = history.find((entry) => entry?.type === "created") || {};
  const raw = item?.tagIds ?? item?.tag_ids ?? created?.tagIds ?? created?.tag_ids ?? [];
  return Array.isArray(raw) ? raw.map((id) => String(id)) : [];
}

function quickStartDate(key) {
  if (!key) return "";
  const date = new Date();
  if (key === "week") date.setDate(date.getDate() - 7);
  else if (key === "2w") date.setDate(date.getDate() - 14);
  else if (key === "1m") date.setMonth(date.getMonth() - 1);
  else if (key === "3m") date.setMonth(date.getMonth() - 3);
  else if (key === "6m") date.setMonth(date.getMonth() - 6);
  else return "";
  return normalizeDigits(new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date));
}

function itemDateKey(item) {
  return normalizeDigits(String(item?.dateFa || item?.dateJalali || item?.date_jalali || "")).replaceAll("-", "/");
}

function filterRequestRows(rows, { query, quick, tagIds }) {
  const q = normalizeDigits(query).trim().toLowerCase();
  const start = quickStartDate(quick);
  const selectedTags = Array.isArray(tagIds) ? tagIds.map(String).filter(Boolean) : [];
  return (Array.isArray(rows) ? rows : []).filter((item) => {
    if (start && itemDateKey(item) < start) return false;
    if (selectedTags.length) {
      const itemTags = tagIdListOf(item);
      if (!selectedTags.some((id) => itemTags.includes(id))) return false;
    }
    if (!q) return true;
    const hay = [item.serial, item.dateFa, item.dateJalali, item.title, item.description, item.budgetCode, item.projectName, item.projectCode, item.status]
      .map((value) => normalizeDigits(value).toLowerCase())
      .join(" ");
    return hay.includes(q);
  });
}

function RequestFilterBar({ query, setQuery, quick, setQuick, tags, pinnedTagIds, setPinnedTagIds, activeTagIds, setActiveTagIds, tagPickOpen, setTagPickOpen, tagPickSearch, setTagPickSearch }) {
  const active = new Set((activeTagIds || []).map(String));
  const tagMap = new Map((Array.isArray(tags) ? tags : []).map((tag) => [String(tag?.id ?? ""), tag]));
  const visibleTags = (Array.isArray(pinnedTagIds) ? pinnedTagIds : []).map((id) => tagMap.get(String(id))).filter(Boolean);
  const toggleActiveTag = (id) => {
    const sid = String(id);
    setActiveTagIds((prev) => {
      const cur = (Array.isArray(prev) ? prev : []).map(String);
      return cur.includes(sid) ? cur.filter((x) => x !== sid) : [...cur, sid];
    });
  };
  const togglePinnedTag = (id) => {
    const sid = String(id);
    setPinnedTagIds((prev) => {
      const cur = (Array.isArray(prev) ? prev : []).map(String);
      if (cur.includes(sid)) {
        setActiveTagIds((activePrev) => (Array.isArray(activePrev) ? activePrev.map(String).filter((x) => x !== sid) : []));
        return cur.filter((x) => x !== sid);
      }
      return [...cur, sid];
    });
  };

  return <div className="mb-4 space-y-2 rounded-2xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-transparent">
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-full md:min-w-[280px] md:flex-1">
        <div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">جست و جو</div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder="جستجو در شماره، موضوع، تاریخ، پروژه و ..." />
      </div>
    </div>
    <div>
      <div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">برچسب ها</div>
      <div className="flex flex-wrap items-center gap-2">
        {QUICK_FILTERS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setQuick(quick === key ? "" : key)} className={`h-9 rounded-full border px-4 text-xs transition ${quick === key ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/10 bg-white hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"}`}>{label}</button>
        ))}
        {visibleTags.map((tag) => {
          const id = String(tag?.id ?? "");
          const isActive = active.has(id);
          return <button key={id} type="button" onClick={() => toggleActiveTag(id)} className={`h-9 rounded-full border px-4 text-xs transition ${isActive ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/10 bg-white hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"}`}>{tagLabelOf(tag)}</button>;
        })}
        <button type="button" onClick={() => { setTagPickSearch(""); setTagPickOpen(true); }} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white transition hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" aria-label="انتخاب برچسب" title="انتخاب برچسب">
          <img src="/images/icons/sayer.svg" alt="" className="h-5 w-5 dark:invert" />
        </button>
      </div>
    </div>
    {tagPickOpen && <TagPicker tags={tags} selectedIds={pinnedTagIds} onToggle={togglePinnedTag} query={tagPickSearch} setQuery={setTagPickSearch} onClose={() => setTagPickOpen(false)} />}
  </div>;
}

function TagPicker({ tags, selectedIds, onToggle, query, setQuery, onClose }) {
  const selected = new Set((selectedIds || []).map(String));
  const q = String(query || "").trim().toLowerCase();
  const list = (Array.isArray(tags) ? tags : []).filter((tag) => !q || tagLabelOf(tag).toLowerCase().includes(q));
  return createPortal(<div className="fixed inset-0 z-[9999]" dir="rtl">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className="flex h-[min(70vh,620px)] w-[min(760px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-black/10 p-4 dark:border-white/10"><b className="text-sm">انتخاب برچسب</b><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 dark:border-white/10"><img src="/images/icons/bastan.svg" alt="" className="h-5 w-5 dark:invert" /></button></div>
        <div className="p-4"><input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder="جستجو در برچسب‌ها..." /></div>
        <div className="flex-1 overflow-auto px-4 pb-4"><div className="flex flex-wrap gap-2">{list.map((tag) => { const id = String(tag?.id ?? ""); const active = selected.has(id); return <button key={id} type="button" onClick={() => onToggle(id)} className={`h-10 rounded-full border px-4 text-sm transition ${active ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/10 hover:bg-black/[0.03] dark:border-white/15 dark:hover:bg-white/10"}`}>{tagLabelOf(tag)}</button>; })}</div></div>
      </div>
    </div>
  </div>, document.body);
}

function Field({ label, required, children }) { return <label className="block text-xs text-neutral-600 dark:text-neutral-300">{label}{required && <span className="mr-1 text-red-500">*</span>}<div className="mt-1">{children}</div></label>; }
function ReadField({ label, value, ltr }) { return <Field label={label}><div dir={ltr ? "ltr" : "rtl"} className={`${inputClass} flex items-center ${ltr ? "justify-end" : ""}`}>{value || "—"}</div></Field>; }
function MoneyInput({ value, onChange }) { return <input dir="ltr" inputMode="numeric" className={inputClass} value={toFa(value)} onChange={(e) => onChange(money(e.target.value))} placeholder="۰" />; }
function StatusBadge({ status }) {
  const colors = status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" : status === "returned" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-neutral-100 text-neutral-700 dark:bg-white/10 dark:text-neutral-200";
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${colors}`}>{STATUS_LABELS[status] || status || "—"}</span>;
}

function PaymentPreview({ item, projects, supplyRequests, currencyTypes, currencySources, userId, actionNote, setActionNote, actionBusy, actionError, onAction, onResubmit, onClose }) {
  const project = projects.find((row) => String(row.id) === String(item.projectId));
  const currency = currencyTypes.find((row) => String(row.id) === String(item.currencyTypeId));
  const source = currencySources.find((row) => String(row.id) === String(item.currencySourceId));
  const currencyName = currency ? itemLabel(currency) : "ریال";
  const docName = item.docId === "other" ? (item.docOther || "سایر") : (DOC_OPTIONS.find(([value]) => value === item.docId)?.[1] || "—");
  const attachments = Array.isArray(item.attachments) ? item.attachments : [];
  const history = Array.isArray(item.historyJson) ? item.historyJson : Array.isArray(item.history_json) ? item.history_json : [];
  const currentStepRoleKey = item.currentStepRoleKey || "";
  const canDecide = item.status === "pending" && item.canAct === true;
  const canEditReturned = item.status === "returned" && item.canAct === true && currentStepRoleKey === "requester";
  const currentStepIndex = Number(item.currentStepIndex || 0);
  const finalAccounting = currentStepRoleKey === "accounting" && currentStepIndex >= 5;
  const [editForm, setEditForm] = useState(() => formFromItem(item));
  const [editBudgetItems, setEditBudgetItems] = useState([]);
  const [editBudgetLoading, setEditBudgetLoading] = useState(false);
  const [editUploading, setEditUploading] = useState(false);
  const [editUploadError, setEditUploadError] = useState("");
  const [baseBudget, setBaseBudget] = useState("");
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [choice, setChoice] = useState("");
  const [urgentCash, setUrgentCash] = useState(false);
  const [cashPayAmount, setCashPayAmount] = useState("");
  const [cashPayCurrencyId, setCashPayCurrencyId] = useState(item.currencyTypeId || "");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHOD_OPTIONS[0]);
  const [creditPayAmount, setCreditPayAmount] = useState("");
  const [creditPayCurrencyId, setCreditPayCurrencyId] = useState(item.currencyTypeId || "");
  const [creditPayDesc, setCreditPayDesc] = useState("");
  const liquidityRemaining = "";
  const amountNumber = Number(item.amount || 0);
  const liquidityNumber = parseAmount(liquidityRemaining);
  const hasEnoughLiquidity = liquidityNumber > 0 && amountNumber <= liquidityNumber;
  const editProject = projects.find((row) => String(row.id) === String(editForm.projectId));
  const editCurrency = currencyTypes.find((row) => String(row.id) === String(editForm.currencyTypeId));
  const editCurrencyName = editCurrency ? itemLabel(editCurrency) : "ریال";
  const editAttachments = Array.isArray(editForm.attachments) ? editForm.attachments : [];
  const previewBudgetProjectId = canEditReturned ? editForm.projectId : item.projectId;
  const previewBudgetCode = canEditReturned ? editForm.budgetCode : item.budgetCode;
  const previewProjectCode = canEditReturned ? editProject?.code : (project?.code || item.projectCode || "");
  const editBudgetOptions = useMemo(() => {
    const rows = Array.isArray(editBudgetItems) ? editBudgetItems : [];
    const hasCurrent = rows.some((row) => normalizeBudgetCode(row.code || row.center_code) === normalizeBudgetCode(editForm.budgetCode));
    return hasCurrent || !editForm.budgetCode ? rows : [{ code: editForm.budgetCode, center_desc: "" }, ...rows];
  }, [editBudgetItems, editForm.budgetCode]);

  useEffect(() => {
    setEditForm(formFromItem(item));
    setEditUploadError("");
  }, [item.id, item.updatedAt]);

  useEffect(() => {
    if (!canEditReturned || !editForm.projectId) {
      setEditBudgetItems([]);
      return undefined;
    }
    let cancelled = false;
    const projectCode = normalizeBudgetCode(editProject?.code);
    setEditBudgetLoading(true);
    fetch(`/api/cost-breakdown?project_id=${encodeURIComponent(editForm.projectId)}`, { credentials: "include" })
      .then((response) => response.ok ? response.json() : { items: [] })
      .then((data) => {
        if (cancelled) return;
        const byCode = new Map();
        (Array.isArray(data?.items) ? data.items : []).forEach((row) => {
          const code = budgetCodeForProject(row?.budgetCode ?? row?.budget_code ?? row?.code, projectCode);
          if (!code) return;
          byCode.set(code, {
            code,
            center_desc: String(row?.budgetName ?? row?.budget_name ?? row?.name ?? row?.center_desc ?? ""),
          });
        });
        setEditBudgetItems(Array.from(byCode.values()).sort((a, b) =>
          normalizeBudgetCode(a.code).localeCompare(normalizeBudgetCode(b.code), "fa", { numeric: true, sensitivity: "base" })
        ));
      })
      .catch(() => { if (!cancelled) setEditBudgetItems([]); })
      .finally(() => { if (!cancelled) setEditBudgetLoading(false); });
    return () => { cancelled = true; };
  }, [canEditReturned, editForm.projectId, editProject?.code]);

  const setEditField = (name, value) => {
    setEditForm((old) => ({ ...old, [name]: value }));
    setEditUploadError("");
  };

  const uploadEditFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setEditUploading(true);
    setEditUploadError("");
    try {
      const uploaded = [];
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/upload/payment-doc", {
          method: "POST",
          credentials: "include",
          headers: userId != null ? { "x-user-id": String(userId) } : {},
          body,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "upload_failed");
        uploaded.push(data.file || data);
      }
      setEditForm((old) => ({ ...old, attachments: [...old.attachments, ...uploaded] }));
    } catch {
      setEditUploadError("آپلود فایل انجام نشد.");
    } finally {
      setEditUploading(false);
    }
  };

  const removeEditAttachment = (index) => {
    setEditForm((old) => ({ ...old, attachments: old.attachments.filter((_, i) => i !== index) }));
  };

  useEffect(() => {
    let cancelled = false;
    setBaseBudget("");
    if (!previewBudgetProjectId || !previewBudgetCode) return undefined;
    setBudgetLoading(true);
    fetch(`/api/cost-breakdown?project_id=${encodeURIComponent(previewBudgetProjectId)}`, { credentials: "include" })
      .then((response) => response.ok ? response.json() : { items: [] })
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data?.items) ? data.items : [];
        const target = normalizeBudgetCode(previewBudgetCode);
        const projectCode = normalizeProjectCode(previewProjectCode);
        const match = rows.find((row) => {
          const rawCode = row?.budgetCode ?? row?.budget_code ?? row?.code;
          return normalizeBudgetCode(rawCode) === target || budgetCodeForProject(rawCode, projectCode) === target;
        });
        const value = match?.baseBudget ?? match?.base_budget ?? "";
        setBaseBudget(value === "" || value == null ? "" : money(value));
      })
      .catch(() => { if (!cancelled) setBaseBudget(""); })
      .finally(() => { if (!cancelled) setBudgetLoading(false); });
    return () => { cancelled = true; };
  }, [previewBudgetCode, previewBudgetProjectId, previewProjectCode]);

  const submitWorkflow = () => {
    if (!choice && !finalAccounting) return;
    const note = buildWorkflowNote({
      stepKey: currentStepRoleKey,
      stepIndex: currentStepIndex,
      choice,
      note: actionNote,
      urgentCash,
      cashPayAmount,
      cashPayCurrency: currencyNameOf(cashPayCurrencyId, currencyTypes),
      paymentMethod,
      creditPayAmount,
      creditPayCurrency: currencyNameOf(creditPayCurrencyId, currencyTypes),
      creditPayDesc,
    });
    const status = finalAccounting ? "approved" : choice === "reject" || choice === "stop" ? "rejected" : choice === "return" ? "returned" : "approved";
    onAction(status, note);
  };

  return createPortal(<div className="fixed inset-0 z-[9999]">
    <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
    <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">
      <div dir="rtl" className="flex h-[min(90vh,860px)] w-[min(1180px,calc(100vw-20px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
          <div className="text-sm font-bold">اقدامات درخواست پرداخت <span className="font-normal text-neutral-500">— {item.serial || "—"}</span></div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white ring-1 ring-black/15 transition hover:bg-black/80 dark:bg-transparent dark:ring-neutral-800 dark:hover:bg-white/10" aria-label="بستن" title="بستن"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[0.9fr_1.35fr]">
          <aside className="min-h-0 overflow-y-auto border-b border-black/10 p-4 dark:border-white/10 lg:border-b-0 lg:border-l">
            <div className="space-y-4">
              <PreviewSection title="سابقه درخواست">
                <div className="space-y-2 py-3">
                  {history.filter((entry) => !["step_set", "step_clear"].includes(entry?.type)).length ? history.filter((entry) => !["step_set", "step_clear"].includes(entry?.type)).map((entry, index) => (
                    <div key={index} className="rounded-xl border border-black/10 p-3 text-xs leading-6 dark:border-white/10">
                      <div className="flex items-center justify-between gap-2"><b>{historyLabel(entry?.type || entry?.status)}</b><span className="text-neutral-500">{formatDateTime(entry?.at)}</span></div>
                      <div className="mt-1 text-neutral-600 dark:text-neutral-300">{entry?.note || "—"}</div>
                    </div>
                  )) : <div className="py-5 text-center text-sm text-neutral-500">سابقه‌ای ثبت نشده است.</div>}
                </div>
              </PreviewSection>
              <PreviewSection title="مشخصات درخواست">
                <PreviewRow label="شماره درخواست" value={item.serial || "—"} ltr />
                <PreviewRow label="تاریخ درخواست" value={toFa(String(item.dateFa || item.date_jalali || "—").replaceAll("-", "/"))} />
                <PreviewRow label="درخواست کننده" value={item.createdByName || `کاربر #${toFa(item.createdById)}`} />
                <PreviewRow label="پروژه" value={canEditReturned ? (
                  <select className={inputClass} value={editForm.projectId} onChange={(event) => setEditForm((old) => ({ ...old, projectId: event.target.value, budgetCode: "" }))}>
                    <option value="">انتخاب پروژه</option>
                    {projects.map((row) => <option key={row.id} value={row.id}>{projectLabel(row)}</option>)}
                  </select>
                ) : (project ? projectLabel(project) : (item.projectName || item.projectCode || item.projectId || "—"))} />
                <PreviewRow label="کد بودجه" ltr={!canEditReturned} value={canEditReturned ? (
                  <select className={inputClass} value={editForm.budgetCode} disabled={!editForm.projectId || editBudgetLoading} onChange={(event) => setEditField("budgetCode", event.target.value)}>
                    <option value="">{editBudgetLoading ? "در حال دریافت..." : editForm.projectId ? "انتخاب کد بودجه" : "ابتدا پروژه را انتخاب کنید"}</option>
                    {editBudgetOptions.map((row) => {
                      const code = normalizeBudgetCode(row.code || row.center_code);
                      const desc = row.center_desc || row.last_desc || row.name || row.description || "";
                      return <option key={code || row.id} value={code}>{code}{desc ? ` - ${desc}` : ""}</option>;
                    })}
                  </select>
                ) : (item.budgetCode || "—")} />
                <PreviewRow label="آخرین وضعیت" value={<StatusBadge status={item.status} />} />
                <PreviewRow label="مرحله فعلی" value={STEP_LABELS[currentStepRoleKey] || "—"} />
              </PreviewSection>
            </div>
          </aside>
          <main className="min-h-0 overflow-y-auto p-4 md:p-5">
            <div className="space-y-4">
              <PreviewSection title="بررسی درخواست">
                <PreviewRow label="کد بودجه" value={previewBudgetCode || "—"} ltr />
                <PreviewRow label="باقی مانده بودجه مبنا" value={budgetLoading ? "در حال دریافت..." : baseBudget ? toFa(baseBudget) : "—"} ltr />
                <PreviewRow label="باقی مانده نقدینگی تخصیص یافته به پروژه" value={liquidityRemaining || "—"} ltr />
                {currentStepRoleKey === "project_manager" && <PreviewRow label={`مبلغ درخواست پرداخت (${currencyName})`} value={toFa(Number(item.amount || 0).toLocaleString("en-US"))} ltr />}
              </PreviewSection>
              <PreviewSection title="جزئیات پرداخت و سند">
                <PreviewRow label="موضوع درخواست" value={canEditReturned ? <input className={inputClass} value={editForm.title} onChange={(event) => setEditField("title", event.target.value)} /> : (item.title || "—")} />
                <PreviewRow label="شرح درخواست" value={canEditReturned ? <textarea className={`${inputClass} min-h-24 py-2 leading-7`} value={editForm.description} onChange={(event) => setEditField("description", event.target.value)} /> : (item.description || "—")} />
                <PreviewRow label={`مبلغ درخواست (${canEditReturned ? editCurrencyName : currencyName})`} ltr={!canEditReturned} value={canEditReturned ? <MoneyInput value={editForm.amount} onChange={(value) => setEditField("amount", value)} /> : toFa(Number(item.amount || 0).toLocaleString("en-US"))} />
                <PreviewRow label="شرایط پرداخت" value={canEditReturned ? <input className={inputClass} value={editForm.creditPay} onChange={(event) => setEditField("creditPay", event.target.value)} /> : (item.creditPay || "—")} />
                <PreviewRow label="نام ذینفع" value={canEditReturned ? <input className={inputClass} value={editForm.beneficiaryName} onChange={(event) => setEditField("beneficiaryName", event.target.value)} /> : (item.beneficiaryName || "—")} />
                <PreviewRow label="شماره شبا" ltr={!canEditReturned} value={canEditReturned ? <input dir="ltr" inputMode="numeric" className={`${inputClass} text-left font-sans tabular-nums`} value={editForm.bankInfo || "IR"} onChange={(event) => setEditField("bankInfo", formatSheba(event.target.value))} onFocus={() => { if (!editForm.bankInfo) setEditField("bankInfo", "IR"); }} placeholder="IR" /> : (item.bankInfo || "—")} />
                <PreviewRow label="درخواست تامین" value={canEditReturned ? (
                  <div className="space-y-2">
                    <div className="flex h-9 items-center gap-6 px-1">
                      {[["no", "ندارد"], ["yes", "دارد"]].map(([value, label]) => {
                        const checked = editForm.hasSupplyRequest === value;
                        return <button key={value} type="button" onClick={() => setEditForm((old) => ({ ...old, hasSupplyRequest: value, supplyRequestId: value === "yes" ? old.supplyRequestId : "" }))} className="inline-flex items-center gap-2 text-sm text-neutral-900 transition hover:opacity-75 dark:text-white">
                          <span>{label}</span>
                          <span className={`grid h-5 w-5 place-items-center rounded-full border ${checked ? "border-neutral-950 dark:border-white" : "border-neutral-400 dark:border-neutral-500"}`}>{checked && <span className="h-3 w-3 rounded-full bg-neutral-950 dark:bg-white" />}</span>
                        </button>;
                      })}
                    </div>
                    {editForm.hasSupplyRequest === "yes" && <select className={inputClass} value={editForm.supplyRequestId} onChange={(event) => setEditField("supplyRequestId", event.target.value)}><option value="">انتخاب کنید</option>{supplyRequests.map((row) => <option key={row.id} value={row.id}>{row.serial || `#${row.id}`}{row.title ? ` - ${row.title}` : ""}</option>)}</select>}
                  </div>
                ) : (item.hasSupplyRequest === "yes" ? (supplyRequests.find((row) => String(row.id) === String(item.supplyRequestId))?.serial || `#${item.supplyRequestId || "—"}`) : "ندارد")} />
                <PreviewRow label="ارز" value={canEditReturned ? <select className={inputClass} value={editForm.currencyTypeId} onChange={(event) => setEditField("currencyTypeId", event.target.value)}><option value="">ریال</option>{currencyTypes.map((row) => <option key={row.id} value={row.id}>{itemLabel(row)}</option>)}</select> : currencyName} />
                <PreviewRow label="منشا ارز" value={canEditReturned ? <select className={inputClass} value={editForm.currencySourceId} onChange={(event) => setEditField("currencySourceId", event.target.value)}><option value="">انتخاب نشده</option>{currencySources.map((row) => <option key={row.id} value={row.id}>{itemLabel(row)}</option>)}</select> : (source ? itemLabel(source) : "—")} />
                <PreviewRow label="نوع سند" value={canEditReturned ? (
                  <div className="space-y-2">
                    <select className={inputClass} value={editForm.docId} onChange={(event) => setEditForm((old) => ({ ...old, docId: event.target.value, docOther: event.target.value === "other" ? old.docOther : "" }))}>{DOC_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                    {editForm.docId === "other" && <input className={inputClass} value={editForm.docOther} onChange={(event) => setEditField("docOther", event.target.value)} placeholder="نوع سند را وارد کنید" />}
                  </div>
                ) : docName} />
                <PreviewRow label="شماره سند" value={canEditReturned ? <input className={inputClass} value={editForm.docNumber} onChange={(event) => setEditField("docNumber", event.target.value)} /> : (item.docNumber || "—")} />
                <PreviewRow label="تاریخ سند" value={canEditReturned ? <JalaliPopupDatePicker value={editForm.docDateJalali} onChange={(value) => setEditField("docDateJalali", value)} /> : toFa(item.docDate || item.docDateJalali || "—")} />
                <PreviewRow label="پیوست‌ها" value={canEditReturned ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    {editAttachments.map((file, index) => <span key={file.id || file.serverId || file.url || index} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-black/10 px-2 py-1 text-xs dark:border-white/10">
                      <a href={file.url || "#"} target="_blank" rel="noreferrer" className="max-w-[220px] truncate hover:underline">{file.name || `فایل ${toFa(index + 1)}`}</a>
                      <button type="button" onClick={() => removeEditAttachment(index)} className="grid h-6 w-6 place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/10" aria-label="حذف پیوست" title="حذف پیوست">×</button>
                    </span>)}
                    <label className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-black/10 bg-white transition hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title={editUploading ? "در حال آپلود" : "بارگذاری"} aria-label={editUploading ? "در حال آپلود" : "بارگذاری"}>
                      <img src="/images/icons/upload.svg" alt="" className={`h-4 w-4 dark:invert ${editUploading ? "animate-pulse opacity-60" : ""}`} />
                      <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={(event) => uploadEditFiles(event.target.files)} />
                    </label>
                  </div>
                ) : (attachments.length ? <div className="flex flex-wrap justify-end gap-2">{attachments.map((file, index) => <a key={file.id || file.serverId || index} href={file.url || "#"} target="_blank" rel="noreferrer" className="rounded-lg border border-black/10 px-2 py-1 text-xs hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">{file.name || `فایل ${toFa(index + 1)}`}</a>)}</div> : "—")} />
              </PreviewSection>
              {canDecide && <WorkflowPanel
                stepKey={currentStepRoleKey}
                stepIndex={currentStepIndex}
                choice={choice}
                setChoice={setChoice}
                actionNote={actionNote}
                setActionNote={setActionNote}
                actionBusy={actionBusy}
                actionError={actionError}
                onSubmit={submitWorkflow}
                hasEnoughLiquidity={hasEnoughLiquidity}
                urgentCash={urgentCash}
                setUrgentCash={setUrgentCash}
                cashPayAmount={cashPayAmount}
                setCashPayAmount={setCashPayAmount}
                cashPayCurrencyId={cashPayCurrencyId}
                setCashPayCurrencyId={setCashPayCurrencyId}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                creditPayAmount={creditPayAmount}
                setCreditPayAmount={setCreditPayAmount}
                creditPayCurrencyId={creditPayCurrencyId}
                setCreditPayCurrencyId={setCreditPayCurrencyId}
                creditPayDesc={creditPayDesc}
                setCreditPayDesc={setCreditPayDesc}
                currencyTypes={currencyTypes}
              />}
              {canEditReturned && <div className="rounded-2xl border border-black/10 px-4 py-3 dark:border-white/10">
                {editUploadError && <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{editUploadError}</div>}
                <ActionFooter actionBusy={actionBusy} actionError={actionError} disabled={editUploading} onSubmit={() => onResubmit(item, editForm, actionNote)} />
              </div>}
              {!canDecide && !canEditReturned && <div className="rounded-2xl border border-black/10 p-4 text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
                در این مرحله اقدامی برای شما فعال نیست.
              </div>}
            </div>
          </main>
        </div>
      </div>
    </div>
  </div>, document.body);
}

function WorkflowPanel({
  stepKey, stepIndex, choice, setChoice, actionNote, setActionNote, actionBusy, actionError, onSubmit,
  hasEnoughLiquidity, urgentCash, setUrgentCash,
  cashPayAmount, setCashPayAmount, cashPayCurrencyId, setCashPayCurrencyId, paymentMethod, setPaymentMethod,
  creditPayAmount, setCreditPayAmount, creditPayCurrencyId, setCreditPayCurrencyId, creditPayDesc, setCreditPayDesc,
  currencyTypes,
}) {
  const finalAccounting = stepKey === "accounting" && Number(stepIndex) >= 5;
  if (finalAccounting) {
    return <PreviewSection title="ثبت پرداخت نهایی">
      <div className="space-y-4 py-4">
        <div className="rounded-xl border border-black/10 p-3 dark:border-white/10">
          <div className="mb-3 text-sm font-semibold">پرداخت نقدی</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="مبلغ"><MoneyInput value={cashPayAmount} onChange={setCashPayAmount} /></Field>
            <Field label="ارز"><CurrencySelect value={cashPayCurrencyId} onChange={setCashPayCurrencyId} currencyTypes={currencyTypes} /></Field>
            <Field label="روش پرداخت"><select className={inputClass} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{PAYMENT_METHOD_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
          </div>
        </div>
        <div className="rounded-xl border border-black/10 p-3 dark:border-white/10">
          <div className="mb-3 text-sm font-semibold">پرداخت اعتباری</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="مبلغ"><MoneyInput value={creditPayAmount} onChange={setCreditPayAmount} /></Field>
            <Field label="ارز"><CurrencySelect value={creditPayCurrencyId} onChange={setCreditPayCurrencyId} currencyTypes={currencyTypes} /></Field>
          </div>
          <div className="mt-3"><Field label="شرح پرداخت"><textarea className={`${inputClass} min-h-24 py-3`} value={creditPayDesc} onChange={(event) => setCreditPayDesc(event.target.value)} /></Field></div>
        </div>
        <ActionFooter actionBusy={actionBusy} actionError={actionError} disabled={!cashPayAmount && !creditPayAmount} onSubmit={onSubmit} />
      </div>
    </PreviewSection>;
  }

  if (stepKey === "project_manager") {
    return <PreviewSection title="نتیجه بررسی مدیر پروژه">
      <div className="space-y-3 py-4">
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={urgentCash} onChange={(event) => setUrgentCash(event.target.checked)} className="h-4 w-4 accent-black dark:accent-white" />پرداخت فوری و نقدی</label>
        <ActionOption checked={choice === "approve"} disabled={!hasEnoughLiquidity} onClick={() => setChoice("approve")} label="تایید درخواست" />
        <ActionOption checked={choice === "reject"} onClick={() => setChoice("reject")} label="رد درخواست" />
        <ActionOption checked={choice === "return"} onClick={() => setChoice("return")} label="ارجاع به درخواست کننده" />
        {!hasEnoughLiquidity && <ActionOption checked={choice === "stop"} onClick={() => setChoice("stop")} label="توقف پرداخت به دلیل عدم نقدینگی" />}
        {["reject", "return", "stop"].includes(choice) && <textarea value={actionNote} onChange={(event) => setActionNote(event.target.value)} className={`${inputClass} min-h-24 py-3`} placeholder="توضیح..." />}
        <ActionFooter actionBusy={actionBusy} actionError={actionError} disabled={!choice} onSubmit={onSubmit} />
      </div>
    </PreviewSection>;
  }

  if (stepKey === "project_control") {
    return <PreviewSection title="نتیجه بررسی اولیه">
      <div className="space-y-3 py-4">
        <ActionOption checked={choice === "approve"} onClick={() => setChoice("approve")} label="تایید درخواست پرداخت" />
        <ActionOption checked={choice === "reject"} onClick={() => setChoice("reject")} label="رد درخواست پرداخت" />
        <ActionOption checked={choice === "return"} onClick={() => setChoice("return")} label="ارجاع به درخواست کننده" />
        {["reject", "return"].includes(choice) && <textarea value={actionNote} onChange={(event) => setActionNote(event.target.value)} className={`${inputClass} min-h-24 py-3`} placeholder="توضیح..." />}
        <ActionFooter actionBusy={actionBusy} actionError={actionError} disabled={!choice} onSubmit={onSubmit} />
      </div>
    </PreviewSection>;
  }

  return <PreviewSection title={stepKey === "management" ? "نتیجه بررسی مدیریت" : "نتیجه بررسی مالی و حسابداری"}>
    <div className="space-y-3 py-4">
      <ActionOption checked={choice === "approve"} onClick={() => setChoice("approve")} label={stepKey === "management" ? "درخواست پرداخت" : "تایید درخواست"} />
      <ActionOption checked={choice === "return"} onClick={() => setChoice("return")} label="ارجاع به درخواست کننده" />
      {choice === "return" && <textarea value={actionNote} onChange={(event) => setActionNote(event.target.value)} className={`${inputClass} min-h-24 py-3`} placeholder="توضیح..." />}
      <ActionFooter actionBusy={actionBusy} actionError={actionError} disabled={!choice} onSubmit={onSubmit} />
    </div>
  </PreviewSection>;
}

function ActionOption({ checked, disabled, onClick, label }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`flex h-11 w-full items-center justify-between rounded-xl border px-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-45 ${checked ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/10 bg-white hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"}`}>
    <span>{label}</span>
    <span className={`grid h-5 w-5 place-items-center rounded-md border ${checked ? "border-white dark:border-black" : "border-neutral-400"}`}>{checked && <img src="/images/icons/check.svg" alt="" className={`h-3.5 w-3.5 ${checked ? "invert dark:invert-0" : ""}`} />}</span>
  </button>;
}

function ActionFooter({ actionBusy, actionError, disabled, onSubmit }) {
  return <div className="flex items-center justify-between gap-3 pt-2">
    <div className="text-xs text-red-600 dark:text-red-400">{actionError || ""}</div>
    <button type="button" onClick={onSubmit} disabled={disabled || actionBusy} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white transition hover:bg-black/85 disabled:opacity-50 dark:bg-white dark:text-black" title="ثبت" aria-label="ثبت">
      <img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" />
    </button>
  </div>;
}

function CurrencySelect({ value, onChange, currencyTypes }) {
  return <select className={inputClass} value={value || ""} onChange={(event) => onChange(event.target.value)}>
    <option value="">ریال</option>
    {(currencyTypes || []).map((item) => <option key={item.id} value={item.id}>{itemLabel(item)}</option>)}
  </select>;
}

function currencyNameOf(id, currencyTypes) {
  const item = (currencyTypes || []).find((row) => String(row.id) === String(id));
  return item ? itemLabel(item) : "ریال";
}

function buildWorkflowNote({ stepKey, stepIndex, choice, note, urgentCash, cashPayAmount, cashPayCurrency, paymentMethod, creditPayAmount, creditPayCurrency, creditPayDesc }) {
  const finalAccounting = stepKey === "accounting" && Number(stepIndex) >= 5;
  if (finalAccounting) {
    const parts = [];
    if (cashPayAmount) parts.push(`پرداخت نقدی: ${cashPayAmount} ${cashPayCurrency}، روش پرداخت: ${paymentMethod}`);
    if (creditPayAmount) parts.push(`پرداخت اعتباری: ${creditPayAmount} ${creditPayCurrency}${creditPayDesc ? `، شرح: ${creditPayDesc}` : ""}`);
    return parts.join(" | ") || "پرداخت ثبت شد";
  }
  const labels = {
    approve: "تایید درخواست",
    reject: "رد درخواست",
    return: "ارجاع به درخواست کننده",
    stop: "توقف پرداخت به دلیل عدم نقدینگی",
  };
  return [labels[choice] || "اقدام", urgentCash ? "پرداخت فوری و نقدی" : "", note].filter(Boolean).join(" - ");
}

function PreviewSection({ title, children }) { return <section className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10"><div className="border-b border-black/10 bg-neutral-50 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/5">{title}</div><div className="divide-y divide-black/10 px-4 dark:divide-white/10">{children}</div></section>; }
function PreviewRow({ label, value, ltr }) { return <div className="grid grid-cols-[135px_1fr] gap-3 py-2.5 text-sm"><div className="text-neutral-500 dark:text-neutral-400">{label}</div><div dir={ltr ? "ltr" : "rtl"} className={`break-words font-medium ${ltr ? "text-left" : "text-right"}`}>{value}</div></div>; }
function historyLabel(value) { return ({ created: "ثبت درخواست", approved: "تأیید", rejected: "رد", returned: "برگشت", edited: "ویرایش" })[value] || value || "—"; }
function formatDateTime(value) { if (!value) return "—"; try { return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); } catch { return "—"; } }

function RegistrationNotice({ info, onClose }) {
  return createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 px-3" onClick={onClose}>
    <div dir="rtl" className="w-[min(520px,calc(100vw-24px))] rounded-2xl border border-black/10 bg-white p-4 text-sm text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white" onClick={(event) => event.stopPropagation()}>
      <div className="leading-7">{registrationMessage(info)}</div>
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-black text-white transition hover:bg-black/85 dark:bg-white dark:text-black" aria-label="بستن" title="بستن">
          <img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" />
        </button>
      </div>
    </div>
  </div>, document.body);
}
