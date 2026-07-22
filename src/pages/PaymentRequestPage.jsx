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
const PAYMENT_WORKFLOW_STEPS = [
  { index: 0, label: "ثبت درخواست" },
  { index: 1, label: "بررسی اولیه (واحد برنامه‌ریزی)" },
  { index: 2, label: "بررسی نهایی (مدیریت پروژه)" },
  { index: 3, label: "بررسی اسناد (واحد مالی)" },
  { index: 4, label: "دستور پرداخت (واحد مدیریت ارشد)" },
  { index: 5, label: "انجام پرداخت (واحد مالی)" },
];
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
  const { user, isAdmin } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [numberSortDir, setNumberSortDir] = useState("desc");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);
  const [projects, setProjects] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [projectLiquidityRemaining, setProjectLiquidityRemaining] = useState(null);
  const [projectLiquidityLoading, setProjectLiquidityLoading] = useState(false);
  const [supplyRequests, setSupplyRequests] = useState([]);
  const [currencyTypes, setCurrencyTypes] = useState([]);
  const [currencySources, setCurrencySources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitNotice, setSubmitNotice] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [filterQuick, setFilterQuick] = useState("");
  const [filterOwnership, setFilterOwnership] = useState("");
  const [filterTagIds, setFilterTagIds] = useState([]);
  const [pinnedFilterTagIds, setPinnedFilterTagIds] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagPickOpen, setTagPickOpen] = useState(false);
  const [tagPickSearch, setTagPickSearch] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [seenIncomingIds, setSeenIncomingIds] = useState(() => new Set());
  const [manualUnreadIds, setManualUnreadIds] = useState(() => new Set());
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const tableMenuRef = useRef(null);
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
  const selectedBudgetItem = useMemo(
    () => budgetItems.find((item) => normalizeBudgetCode(item.code || item.center_code) === normalizeBudgetCode(form.budgetCode)),
    [budgetItems, form.budgetCode]
  );
  const selectedBaseBudget = parseAmount(selectedBudgetItem?.last_amount ?? selectedBudgetItem?.baseBudget ?? 0);

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

  const resetPaymentRequests = async () => {
    if (!window.confirm("همه درخواست‌های پرداخت و فایل‌های بارگذاری‌شده این صفحه حذف شوند؟ این عملیات قابل بازگشت نیست.")) return;
    setResetting(true);
    setError("");
    try {
      await api("/requests/reset", { method: "DELETE" });
      setItems([]);
      setSelected(null);
      setSelectedIds(new Set());
      setSuccess("اطلاعات مدیریت درخواست‌ها پاک شد.");
    } catch {
      setError("پاک‌سازی اطلاعات انجام نشد.");
    } finally {
      setResetting(false);
    }
  };

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
    if (!user?.id) return;
    try {
      const stored = JSON.parse(localStorage.getItem(`payment_request_seen_incoming:u${user.id}`) || "[]");
      setSeenIncomingIds(new Set(Array.isArray(stored) ? stored.map(String) : []));
    } catch { setSeenIncomingIds(new Set()); }
  }, [user?.id]);
  useEffect(() => {
    if (!user?.id) return;
    try {
      const stored = JSON.parse(localStorage.getItem(`payment_request_manual_unread:u${user.id}`) || "[]");
      setManualUnreadIds(new Set(Array.isArray(stored) ? stored.map(String) : []));
    } catch { setManualUnreadIds(new Set()); }
  }, [user?.id]);
  useEffect(() => {
    if (!user?.id) return;
    try { localStorage.setItem(`payment_request_manual_unread:u${user.id}`, JSON.stringify([...manualUnreadIds])); } catch {}
  }, [manualUnreadIds, user?.id]);
  useEffect(() => {
    if (!tableMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!tableMenuRef.current?.contains(event.target)) setTableMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setTableMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [tableMenuOpen]);
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
  useEffect(() => {
    if (!form.projectId) {
      setProjectLiquidityRemaining(null);
      setProjectLiquidityLoading(false);
      return;
    }
    let cancelled = false;
    setProjectLiquidityLoading(true);
    api("/liquidity-allocations")
      .then((data) => {
        if (cancelled) return;
        const key = String(form.projectId);
        const budget = parseAmount(data?.allocations?.[key] || 0);
        const commitments = parseAmount(data?.committed?.[key] || 0);
        setProjectLiquidityRemaining(Math.max(0, budget - commitments));
      })
      .catch(() => { if (!cancelled) setProjectLiquidityRemaining(null); })
      .finally(() => { if (!cancelled) setProjectLiquidityLoading(false); });
    return () => { cancelled = true; };
  }, [api, form.projectId]);

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
    if (projectLiquidityLoading) return setError("در حال دریافت مانده نقدینگی پروژه هستیم.");
    if (projectLiquidityRemaining == null) return setError("مانده نقدینگی پروژه در دسترس نیست.");
    if (amount > projectLiquidityRemaining) return setError("مبلغ درخواست نمی‌تواند بیشتر از مانده نقدینگی پروژه باشد.");
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
    } catch (submitError) {
      setError(submitError?.message === "amount_exceeds_project_liquidity"
        ? "مبلغ درخواست نمی‌تواند بیشتر از مانده نقدینگی پروژه باشد."
        : "ثبت درخواست انجام نشد.");
    }
    finally { setSubmitting(false); }
  };

  const openPreview = (item) => {
    if (item?.canAct && Number(item?.createdById) !== Number(user?.id)) {
      setSeenIncomingIds((previous) => {
        const next = new Set(previous);
        next.add(String(item.id));
        try { localStorage.setItem(`payment_request_seen_incoming:u${user.id}`, JSON.stringify([...next])); } catch {}
        return next;
      });
    }
    setManualUnreadIds((previous) => {
      const key = String(item.id);
      if (!previous.has(key)) return previous;
      const next = new Set(previous);
      next.delete(key);
      return next;
    });
    setSelected(item);
    setActionNote("");
    setActionError("");
  };

  const recordAction = async (status, noteOverride = "", extraPayload = {}) => {
    if (!selected || actionBusy) return;
    setActionBusy(true);
    setActionError("");
    try {
      const finalNote = String(noteOverride || actionNote || "").trim();
      const data = await api("/requests/status", {
        method: "POST",
        body: JSON.stringify({ id: selected.id, status, note: finalNote, ...extraPayload }),
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

  const resubmitReturned = async (item, updates, note = "", extraPayload = {}) => {
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
        body: JSON.stringify({ id: item.id, status: "approved", note: finalNote, ...extraPayload }),
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

  const filteredItems = useMemo(() => filterRequestRows(items, { query: filterQuery, quick: filterQuick, tagIds: filterTagIds, ownership: filterOwnership, userId: user?.id }), [items, filterOwnership, filterQuery, filterQuick, filterTagIds, user?.id]);
  const sortedItems = useMemo(() => [...filteredItems].sort((a, b) => {
    const timeOf = (item) => {
      const value = Date.parse(item?.createdAt || item?.created_at || item?.updatedAt || item?.updated_at || "");
      return Number.isFinite(value) ? value : 0;
    };
    const byTime = timeOf(a) - timeOf(b);
    if (byTime) return numberSortDir === "asc" ? byTime : -byTime;
    const byId = Number(a?.id || 0) - Number(b?.id || 0);
    if (byId) return numberSortDir === "asc" ? byId : -byId;
    const bySerial = String(a?.serial || "").localeCompare(String(b?.serial || ""), "fa", { numeric: true, sensitivity: "base" });
    return numberSortDir === "asc" ? bySerial : -bySerial;
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
  const isIncomingForUser = (item) => item.canAct && Number(item.createdById) !== Number(user?.id);
  const isUnreadForUser = (item) =>
    manualUnreadIds.has(String(item.id)) || (isIncomingForUser(item) && !seenIncomingIds.has(String(item.id)));
  const setSelectedReadStatus = (unread) => {
    const ids = [...selectedIds].map(String);
    if (!ids.length) return;

    if (unread) {
      setManualUnreadIds((previous) => {
        const next = new Set(previous);
        ids.forEach((id) => next.add(id));
        return next;
      });
    } else {
      setSeenIncomingIds((previous) => {
        const next = new Set(previous);
        ids.forEach((id) => next.add(id));
        try { localStorage.setItem(`payment_request_seen_incoming:u${user.id}`, JSON.stringify([...next])); } catch {}
        return next;
      });
      setManualUnreadIds((previous) => {
        const next = new Set(previous);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }

    setSelectedIds(new Set());
    setTableMenuOpen(false);
  };

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
          <div className="flex items-center gap-2">
            {isAdmin && <button type="button" onClick={resetPaymentRequests} disabled={resetting} className="grid h-9 w-9 place-items-center rounded-xl border border-red-500/40 text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/30" title="پاک‌سازی همه درخواست‌ها و فایل‌ها" aria-label="پاک‌سازی همه درخواست‌ها و فایل‌ها"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" /></button>}
            <button type="button" onClick={() => { setShowForm((old) => !old); setError(""); setSuccess(""); }} className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-black/15 transition hover:bg-black/5 dark:ring-neutral-800 dark:hover:bg-white/10" title={showForm ? "نمایش لیست" : "افزودن درخواست"}>
              <img src={showForm ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" />
            </button>
          </div>
        </div>

        {showForm && <form onSubmit={submit} className="mb-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(150px,0.75fr)_minmax(140px,0.7fr)_minmax(220px,1fr)_minmax(220px,1fr)]">
            <ReadField label="شماره درخواست" value={serial} ltr />
            <ReadField label="تاریخ درخواست" value={toFa(form.dateJalali)} />
            <Field label="پروژه" required><select className={inputClass} value={form.projectId} onChange={(e) => setForm((old) => ({ ...old, projectId: e.target.value, budgetCode: "" }))}><option value="">انتخاب پروژه</option>{projects.map((item) => <option key={item.id} value={item.id}>{projectLabel(item)}</option>)}</select></Field>
            <Field label="کد بودجه" required><select className={inputClass} value={form.budgetCode} disabled={!form.projectId} onChange={(e) => setField("budgetCode", e.target.value)}><option value="">{form.projectId ? "انتخاب کد بودجه" : "ابتدا پروژه را انتخاب کنید"}</option>{budgetItems.map((item) => { const code = normalizeBudgetCode(item.code || item.center_code); const description = item.center_desc || item.last_desc || item.name || item.description || ""; return <option key={code || item.id} value={code}>{code}{description ? ` - ${description}` : ""}</option>; })}</select></Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ReadField label="بودجه مبنا" value={money(selectedBaseBudget) || "0"} ltr />
            <ReadField label="باقی‌مانده نقدینگی پروژه" value={projectLiquidityLoading ? "در حال دریافت..." : money(projectLiquidityRemaining) || "0"} ltr />
          </div>

          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-[minmax(230px,1.2fr)_minmax(210px,0.85fr)_minmax(360px,1.35fr)]">
            <Field label="موضوع درخواست" required><input className={`${inputClass} h-12 text-[15px]`} value={form.title} onChange={(e) => setField("title", e.target.value)} /></Field>
            <Field label="مبلغ درخواست" required>
              <div className="relative min-w-0">
                <MoneyInput className="!pl-[64px]" value={form.amount} onChange={(value) => setField("amount", value)} />
                <select aria-label="ارز مبلغ درخواست" title="انتخاب ارز" className="absolute left-1 top-1 h-9 !w-[56px] cursor-pointer rounded-lg border border-[#ECA265] bg-gradient-to-b from-[#f6c18a] via-[#ECA265] to-[#d98b48] px-0.5 text-center text-[11px] font-bold text-white shadow-sm outline-none transition hover:from-[#f9ce9f] hover:via-[#ECA265] hover:to-[#cf7f3f] focus:border-[#ECA265] focus:ring-2 focus:ring-[#ECA265]/45 dark:border-[#ECA265] dark:from-[#f6c18a] dark:via-[#ECA265] dark:to-[#d98b48] dark:text-white" value={form.currencyTypeId} onChange={(e) => setField("currencyTypeId", e.target.value)}>
                  <option value="" className="bg-white text-black">ریال</option>{currencyTypes.map((item) => <option key={item.id} value={item.id} className="bg-white text-black">{itemLabel(item)}</option>)}
                </select>
              </div>
            </Field>
            <div className={`grid min-w-0 grid-cols-1 items-start gap-2 ${form.hasSupplyRequest === "yes" ? "sm:grid-cols-[auto_minmax(190px,1fr)]" : "sm:grid-cols-1"}`}>
              <Field label="درخواست تامین">
                <div className="flex h-11 items-center gap-4 whitespace-nowrap px-1">
                  {[["no", "ندارد"], ["yes", "دارد"]].map(([value, label]) => {
                    const checked = form.hasSupplyRequest === value;
                    return (
                      <button key={value} type="button" onClick={() => setForm((old) => ({ ...old, hasSupplyRequest: value, supplyRequestId: value === "yes" ? old.supplyRequestId : "" }))} className="inline-flex items-center gap-1.5 text-sm text-neutral-900 transition hover:opacity-75 dark:text-white">
                        <span>{label}</span>
                        <span className={`grid h-5 w-5 place-items-center rounded-full border ${checked ? "border-neutral-950 dark:border-white" : "border-neutral-400 dark:border-neutral-500"}`}>{checked && <span className="h-3 w-3 rounded-full bg-neutral-950 dark:bg-white" />}</span>
                      </button>
                    );
                  })}
                </div>
              </Field>
              {form.hasSupplyRequest === "yes" && <Field label="انتخاب درخواست تامین" required><select className={inputClass} value={form.supplyRequestId} onChange={(e) => setField("supplyRequestId", e.target.value)}><option value="">انتخاب کنید</option>{supplyRequests.map((item) => <option key={item.id} value={item.id}>{item.serial || `#${item.id}`}{item.title ? ` - ${item.title}` : ""}</option>)}</select></Field>}
            </div>
          </div>

          <Field label="شرح درخواست"><textarea className={`${inputClass} min-h-24 py-2 leading-7`} value={form.description} onChange={(e) => setField("description", e.target.value)} /></Field>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(180px,1fr)_minmax(150px,0.9fr)_minmax(120px,0.65fr)_auto]">
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
              <button type="button" onClick={() => setUploadOpen(true)} className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title={uploading ? "در حال آپلود" : "بارگذاری"} aria-label={uploading ? "در حال آپلود" : "بارگذاری"}>
                <img src="/images/icons/Uplod.svg" alt="" className={`h-5 w-5 dark:invert ${uploading ? "animate-pulse opacity-60" : ""}`} />
              </button>
              {!!form.attachments.length && <div className="mt-1 text-[11px] text-neutral-500">{toFa(form.attachments.length)} فایل ضمیمه شده</div>}
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1.7fr)_minmax(130px,0.65fr)_minmax(150px,0.8fr)_minmax(155px,0.7fr)]">
            <Field label="شرایط پرداخت"><input className={inputClass} value={form.creditPay} onChange={(e) => setField("creditPay", e.target.value)} /></Field>
            <Field label="نام ذینفع"><input className={inputClass} value={form.beneficiaryName} onChange={(e) => setField("beneficiaryName", e.target.value)} /></Field>
            <Field label="شماره شبا"><input dir="ltr" inputMode="numeric" maxLength={33} className={`${inputClass} text-left font-sans tabular-nums`} value={form.bankInfo || "IR"} onChange={(e) => setField("bankInfo", formatSheba(e.target.value))} onFocus={() => { if (!form.bankInfo) setField("bankInfo", "IR"); }} placeholder="IR" /></Field>
            <Field label="ارسال درخواست پرداخت به" required={!!createRecipients.targetRoleKey}>
              <select className={inputClass} value={form.targetAssigneeUserId} onChange={(e) => setField("targetAssigneeUserId", e.target.value)} disabled={createRecipientsLoading || !createRecipients.targetRoleKey}>
                <option value="">{createRecipientsLoading ? "در حال دریافت..." : createRecipients.targetRoleKey ? "انتخاب کنید" : "ارسال مستقیم برای اقدام"}</option>
                {createRecipients.users.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name || recipient.username || recipient.email || `کاربر #${recipient.id}`}</option>)}
              </select>
            </Field>
          </div>
          {(error || success) && <div className={`rounded-xl px-3 py-2 text-sm ${error ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"}`}>{error || success}</div>}
          <div className="flex justify-end"><button type="submit" disabled={submitting || uploading} className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-900 text-white transition hover:bg-neutral-900/85 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-white/90" title="ثبت" aria-label="ثبت"><img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" /></button></div>
        </form>}
        {uploadOpen && <PaymentUploadModal files={form.attachments} uploading={uploading} onUpload={uploadFiles} onClose={() => setUploadOpen(false)} />}

        {!showForm && <RequestFilterBar query={filterQuery} setQuery={setFilterQuery} quick={filterQuick} setQuick={setFilterQuick} ownership={filterOwnership} setOwnership={setFilterOwnership} tags={tags} pinnedTagIds={pinnedFilterTagIds} setPinnedTagIds={setPinnedFilterTagIds} activeTagIds={filterTagIds} setActiveTagIds={setFilterTagIds} tagPickOpen={tagPickOpen} setTagPickOpen={setTagPickOpen} tagPickSearch={tagPickSearch} setTagPickSearch={setTagPickSearch} />}

        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
          <div className="relative hidden max-h-[55vh] overflow-y-auto overflow-x-hidden pb-0 md:block" dir="ltr"><table dir="rtl" className="w-full min-w-full table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:min-w-0 [&_td]:text-center [&_th]:py-0.5 [&_td]:py-0.5">
            <colgroup><col style={{ width: 40 }} /><col style={{ width: 18 }} /><col style={{ width: 90 }} /><col style={{ width: 100 }} /><col style={{ width: 205 }} /><col /><col style={{ width: 105 }} /><col style={{ width: 120 }} /></colgroup>
            <thead><tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-white/10 dark:text-neutral-100">
              <th className="sticky top-0 z-40 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]"><input ref={selectAllRef} type="checkbox" className="h-4 w-4 accent-black dark:accent-neutral-200" checked={allVisibleSelected} onChange={toggleSelectAll} aria-label="انتخاب همه" /></th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 dark:bg-neutral-800" aria-label="خوانده‌نشده" /><th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]"><button type="button" onClick={() => { setNumberSortDir((old) => old === "asc" ? "desc" : "asc"); setPage(0); }} className="mx-auto inline-flex items-center gap-1 transition hover:opacity-90" title={numberSortDir === "desc" ? "نمایش قدیمی‌ترین موارد" : "نمایش جدیدترین موارد"}><span>شماره</span><img src={numberSortDir === "desc" ? "/images/icons/bozorgbekochik.svg" : "/images/icons/kochikbebozorg.svg"} alt="" className="h-4 w-4 dark:invert" /></button></th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">تاریخ</th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">پروژه</th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">موضوع</th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">آخرین وضعیت</th>
              <th className="sticky top-0 z-40 bg-neutral-200 !py-2 !pl-10 !pr-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">
                <span>اقدامات</span>
                <div ref={tableMenuRef} className="absolute left-1 top-1/2 z-50 -translate-y-1/2">
                  <button
                    type="button"
                    onClick={() => setTableMenuOpen((open) => !open)}
                    className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/[0.08] dark:hover:bg-white/10"
                    title="مدیریت وضعیت خواندن"
                    aria-label="مدیریت وضعیت خواندن"
                    aria-expanded={tableMenuOpen}
                  >
                    <img src="/images/icons/menu-table.svg" alt="" className={`h-4 w-3 transition-transform duration-200 ${tableMenuOpen ? "scale-110" : ""} dark:invert`} />
                  </button>
                  {tableMenuOpen && (
                    <div className="table-menu-popover absolute left-0 top-[calc(100%+8px)] w-60 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 text-right text-neutral-900 shadow-[0_18px_45px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100">
                      <div className="px-2.5 pb-2 pt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                        {selectedIds.size ? `${toFa(selectedIds.size)} مورد انتخاب شده` : "ابتدا موارد موردنظر را انتخاب کنید"}
                      </div>
                      <button type="button" disabled={!selectedIds.size} onClick={() => setSelectedReadStatus(false)} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-emerald-500/10">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700 transition group-hover:scale-105 dark:bg-emerald-500/15 dark:text-emerald-300">✓</span>
                        <span className="min-w-0 flex-1 text-sm font-semibold">خوانده شده</span>
                      </button>
                      <button type="button" disabled={!selectedIds.size} onClick={() => setSelectedReadStatus(true)} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-sky-500/10">
                        <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-100 text-sky-700 transition group-hover:scale-105 dark:bg-sky-500/15 dark:text-sky-300"><span className="h-2.5 w-2.5 rounded-full bg-sky-500 ring-2 ring-sky-200 dark:ring-sky-400/30" /></span>
                        <span className="min-w-0 flex-1 text-sm font-semibold">خوانده نشده</span>
                      </button>
                    </div>
                  )}
                </div>
              </th>
            </tr></thead>
            <tbody className="text-black dark:text-neutral-100">
              {loading ? <tr><td colSpan={8} className="py-8 text-black/60 dark:text-neutral-400">در حال دریافت...</td></tr> : pageItems.length === 0 ? <tr><td colSpan={8} className="py-8 text-black/60 dark:text-neutral-400">هنوز درخواستی ثبت نشده است.</td></tr> : pageItems.map((item, index) => <tr key={item.id} className="group bg-black/[0.02] transition-colors hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10">
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><input type="checkbox" className="h-4 w-4 accent-black dark:accent-neutral-200" checked={selectedIds.has(String(item.id))} onChange={() => toggleSelected(item.id)} aria-label="انتخاب" /></td>
                <td className="border-b border-neutral-300 px-0 dark:border-neutral-700">{isUnreadForUser(item) && <span className="mx-auto block h-2 w-2 rounded-full bg-sky-500 ring-2 ring-sky-100 dark:ring-sky-500/25" title="درخواست خوانده‌نشده" aria-label="درخواست خوانده‌نشده" />}</td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><button type="button" onClick={() => openPreview(item)} className="mx-auto inline-flex items-center justify-center text-[13px] font-semibold underline-offset-4 transition hover:underline" title="نمایش درخواست">{item.serial || "—"}</button></td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFa(String(item.dateFa || item.date_jalali || "—").replaceAll("-", "/"))}</td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="mx-auto block truncate">{projectLabel(projects.find((row) => String(row.id) === String(item.projectId))) || item.projectName || item.projectCode || "—"}</span></td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="mx-auto block truncate">{item.title || "—"}</span></td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><StatusBadge status={item.status} /></td>
                <td className="border-b border-neutral-300 !pl-10 !pr-2 dark:border-neutral-700"><div className="flex w-full items-center justify-center opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"><button type="button" onClick={() => openPreview(item)} className="inline-grid h-10 w-10 place-items-center border-0 bg-transparent shadow-none transition hover:opacity-80" aria-label={item.canAct ? "اقدامات" : "نمایش"} title={item.canAct ? "اقدامات" : "نمایش"}><img src="/images/icons/list.svg" alt="" className="h-4 w-4 dark:invert" /></button></div></td>
              </tr>)}
            </tbody>
          </table></div>
          <div className="grid gap-3 p-3 md:hidden">{pageItems.map((item) => <button key={item.id} type="button" onClick={() => openPreview(item)} className="rounded-xl border border-black/10 p-3 text-right dark:border-white/10"><div className="flex items-center justify-between gap-2"><b>{item.serial || "—"}</b><StatusBadge status={item.status} /></div><div className="mt-2 truncate text-sm">{item.title || "—"}</div><div className="mt-2 text-xs text-neutral-500">{toFa(String(item.dateFa || item.date_jalali || "—").replaceAll("-", "/"))}</div></button>)}</div>
          <div className="border-t border-neutral-300 px-3 py-2 dark:border-neutral-800"><div className="flex flex-col items-stretch gap-2 md:flex-row md:flex-wrap md:items-center md:justify-between">
            <div className="flex items-center justify-between gap-2 text-sm md:justify-start"><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((old) => Math.max(0, old - 1))} disabled={safePage <= 0} className="inline-grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white transition hover:bg-black/[0.04] disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" aria-label="صفحه قبل"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 18l6-6-6-6" /></svg></button><button type="button" onClick={() => setPage((old) => Math.min(pageCount - 1, old + 1))} disabled={safePage >= pageCount - 1} className="inline-grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white transition hover:bg-black/[0.04] disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" aria-label="صفحه بعد"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 18l-6-6 6-6" /></svg></button></div><div className="whitespace-nowrap text-black/70 dark:text-neutral-400">{total === 0 ? "۰ از ۰" : `${toFa(startIndex + 1)}–${toFa(endIndex)} از ${toFa(total)}`}</div></div>
            <div className="flex items-center justify-between gap-2 text-sm md:justify-start"><span className="text-black/70 dark:text-neutral-400">تعداد در هر صفحه:</span><div className="inline-flex h-9 overflow-hidden rounded-lg border border-black/10 bg-white dark:border-white/15 dark:bg-white/5">{[10, 25, 100].map((count) => <button key={count} type="button" onClick={() => { setRowsPerPage(count); setPage(0); }} className={`min-w-10 px-3 text-sm font-semibold transition ${rowsPerPage === count ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-700 hover:bg-black/[0.04] dark:text-white/75 dark:hover:bg-white/10"}`}>{toFa(count)}</button>)}</div></div>
          </div></div>
        </div>
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

function filterRequestRows(rows, { query, quick, tagIds, ownership, userId }) {
  const q = normalizeDigits(query).trim().toLowerCase();
  const start = quickStartDate(quick);
  const selectedTags = Array.isArray(tagIds) ? tagIds.map(String).filter(Boolean) : [];
  return (Array.isArray(rows) ? rows : []).filter((item) => {
    const isMine = Number(item?.createdById) === Number(userId);
    const isIncoming = item?.canAct === true && !isMine;
    if (ownership === "mine" && !isMine) return false;
    if (ownership === "incoming" && !isIncoming) return false;
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

function RequestFilterBar({ query, setQuery, quick, setQuick, ownership, setOwnership, tags, pinnedTagIds, setPinnedTagIds, activeTagIds, setActiveTagIds, tagPickOpen, setTagPickOpen, tagPickSearch, setTagPickSearch }) {
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

  return <div className="mb-4 space-y-2 rounded-2xl border border-neutral-200 bg-neutral-100/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-full md:min-w-[280px] md:flex-1">
        <div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">جست و جو</div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder="جستجو در شماره، موضوع، تاریخ، پروژه و ..." />
      </div>
    </div>
    <div>
      <div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">برچسب ها</div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOwnership(ownership === "mine" ? "" : "mine")} className={`h-9 rounded-full border px-4 text-xs transition ${ownership === "mine" ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/10 bg-white hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"}`}>درخواست‌های من</button>
        <button type="button" onClick={() => setOwnership(ownership === "incoming" ? "" : "incoming")} className={`h-9 rounded-full border px-4 text-xs transition ${ownership === "incoming" ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/10 bg-white hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"}`}>موارد ارسال‌شده به من</button>
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

function PaymentUploadModal({ files, uploading, onUpload, onClose }) {
  const inputRef = useRef(null);
  const list = Array.isArray(files) ? files : [];
  const handleFiles = (fileList) => {
    if (!fileList?.length || uploading) return;
    onUpload(fileList);
  };
  return createPortal(
    <div className="fixed inset-0 z-[10000]" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-5">
        <div className="flex max-h-[min(88vh,640px)] w-[min(720px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white" onClick={(event) => event.stopPropagation()}>
          <div className="relative shrink-0 border-b border-black/10 px-4 py-4 dark:border-white/10">
            <button type="button" onClick={onClose} className="absolute left-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl bg-black text-white transition hover:bg-black/85 dark:bg-white dark:text-black" title="بستن" aria-label="بستن">
              <img src="/images/icons/bastan.svg" alt="" className="h-5 w-5 invert dark:invert-0" />
            </button>
            <div className="pl-12 text-sm font-bold leading-6">بارگذاری اسناد (درخواست پرداخت)</div>
          </div>
          <div className="space-y-4 overflow-y-auto p-4">
            <div>
              <div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">فایل‌های انتخاب‌شده</div>
              <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
                <div className="border-b border-black/10 px-3 py-2 text-xs font-semibold text-neutral-700 dark:border-white/10 dark:text-white/80">وارده</div>
                <div className="min-h-16 p-3 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  {list.length ? <div className="space-y-2 text-right">{list.map((file, index) => <div key={file.id || file.serverId || file.url || index} className="truncate rounded-lg bg-black/[0.03] px-3 py-2 text-xs text-neutral-700 dark:bg-white/5 dark:text-neutral-200">{file.name || `فایل ${toFa(index + 1)}`}</div>)}</div> : "فایلی انتخاب نشده است."}
                </div>
                <div className="p-3">
                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => { event.preventDefault(); handleFiles(event.dataTransfer?.files); }}
                    className={`flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 bg-neutral-50 px-4 py-5 text-center dark:border-white/15 dark:bg-white/[0.04] ${uploading ? "pointer-events-none opacity-65" : ""}`}
                  >
                    <div className="text-sm font-bold">فایل را اینجا رها کنید</div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">هر نوع فایلی را می‌توانید انتخاب کنید</div>
                    <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-sm font-bold text-white transition hover:bg-black/85 disabled:opacity-50 dark:bg-white dark:text-black" disabled={uploading}>
                      <img src="/images/icons/Uplod.svg" alt="" className="h-5 w-5 invert dark:invert-0" />
                      {uploading ? "در حال بارگذاری..." : "انتخاب فایل"}
                    </button>
                    <input ref={inputRef} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={(event) => { handleFiles(event.target.files); event.target.value = ""; }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 justify-end border-t border-black/10 p-3 dark:border-white/10">
            <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white transition hover:bg-black/85 dark:bg-white dark:text-black" title="تایید" aria-label="تایید"><img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" /></button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
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
function MoneyInput({ value, onChange, className = "" }) { return <input dir="ltr" inputMode="numeric" className={`${inputClass} ${className}`} value={toFa(value)} onChange={(e) => onChange(money(e.target.value))} placeholder="۰" />; }
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
  const [nextRecipients, setNextRecipients] = useState({ targetRoleKey: null, users: [] });
  const [nextRecipientsLoading, setNextRecipientsLoading] = useState(false);
  const [targetAssigneeUserId, setTargetAssigneeUserId] = useState("");
  const [liquidityRemaining, setLiquidityRemaining] = useState("");
  const amountNumber = Number(item.amount || 0);
  const liquidityNumber = parseAmount(liquidityRemaining);
  const hasEnoughLiquidity = liquidityNumber > 0 && amountNumber <= liquidityNumber;
  const editProject = projects.find((row) => String(row.id) === String(editForm.projectId));
  const editCurrency = currencyTypes.find((row) => String(row.id) === String(editForm.currencyTypeId));
  const editCurrencyName = editCurrency ? itemLabel(editCurrency) : "ریال";

  useEffect(() => {
    if (!item.projectId) {
      setLiquidityRemaining("");
      return;
    }
    let cancelled = false;
    fetch("/api/liquidity-allocations", {
      credentials: "include",
      headers: userId != null ? { "x-user-id": String(userId) } : {},
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || "liquidity_failed");
        const key = String(item.projectId);
        const totalBudget = Number(data?.allocations?.[key] || 0);
        const commitments = Number(data?.committed?.[key] || 0);
        if (!cancelled) setLiquidityRemaining(money(Math.max(0, totalBudget - commitments)));
      })
      .catch(() => { if (!cancelled) setLiquidityRemaining(""); });
    return () => { cancelled = true; };
  }, [item.projectId, userId]);
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
    if (!canDecide && !canEditReturned) return undefined;
    let cancelled = false;
    setNextRecipientsLoading(true);
    fetch(`/api/requests?nextRecipientsForItem=${encodeURIComponent(item.id)}`, {
      credentials: "include",
      headers: userId != null ? { "x-user-id": String(userId) } : {},
    })
      .then((response) => (response.ok ? response.json() : { targetRoleKey: null, users: [] }))
      .then((data) => {
        if (!cancelled) {
          setNextRecipients({ targetRoleKey: data?.targetRoleKey || null, users: Array.isArray(data?.users) ? data.users : [] });
          setTargetAssigneeUserId("");
        }
      })
      .catch(() => { if (!cancelled) setNextRecipients({ targetRoleKey: null, users: [] }); })
      .finally(() => { if (!cancelled) setNextRecipientsLoading(false); });
    return () => { cancelled = true; };
  }, [canDecide, canEditReturned, item.id, userId]);

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
    onAction(status, note, {
      targetAssigneeUserId: targetAssigneeUserId || null,
      ...(finalAccounting ? {
        cashAmount: parseAmount(cashPayAmount),
        creditAmount: parseAmount(creditPayAmount),
      } : {}),
    });
  };

  const supplyRequestControl = canEditReturned ? (
    <div className="space-y-2">
      <div className="flex h-9 items-center gap-6 px-1">
        {[['no', 'ندارد'], ['yes', 'دارد']].map(([value, label]) => {
          const checked = editForm.hasSupplyRequest === value;
          return <button key={value} type="button" onClick={() => setEditForm((old) => ({ ...old, hasSupplyRequest: value, supplyRequestId: value === "yes" ? old.supplyRequestId : "" }))} className="inline-flex items-center gap-2 text-sm text-neutral-900 transition hover:opacity-75 dark:text-white">
            <span>{label}</span>
            <span className={`grid h-5 w-5 place-items-center rounded-full border ${checked ? "border-neutral-950 dark:border-white" : "border-neutral-400 dark:border-neutral-500"}`}>{checked && <span className="h-3 w-3 rounded-full bg-neutral-950 dark:bg-white" />}</span>
          </button>;
        })}
      </div>
      {editForm.hasSupplyRequest === "yes" && <select className={inputClass} value={editForm.supplyRequestId} onChange={(event) => setEditField("supplyRequestId", event.target.value)}><option value="">انتخاب کنید</option>{supplyRequests.map((row) => <option key={row.id} value={row.id}>{row.serial || `#${row.id}`}{row.title ? ` - ${row.title}` : ""}</option>)}</select>}
    </div>
  ) : (item.hasSupplyRequest === "yes" ? (supplyRequests.find((row) => String(row.id) === String(item.supplyRequestId))?.serial || `#${item.supplyRequestId || "—"}`) : "ندارد");

  return createPortal(<div className="fixed inset-0 z-[9999]">
    <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
    <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">
      <div dir="rtl" className="flex h-[min(90vh,860px)] w-[min(1180px,calc(100vw-20px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
          <div className="text-sm font-bold">اقدامات پرداخت</div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white ring-1 ring-black/15 transition hover:bg-black/80 dark:bg-transparent dark:ring-neutral-800 dark:hover:bg-white/10" aria-label="بستن" title="بستن"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.55fr)]">
          <aside className="flex items-start border-b border-black/10 p-4 dark:border-white/10 lg:border-b-0 lg:border-l">
            <section className="w-full self-start overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
              <div className="border-b border-black/10 bg-neutral-50 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/5">فرآیند پرداخت</div>
              <div className="px-4">
                <PaymentWorkflowTimeline history={history} item={item} />
              </div>
            </section>
          </aside>
          <main className="min-h-0 overflow-y-auto p-4 md:p-5">
            <div className="space-y-4">
              <PreviewSection title="جزئیات درخواست پرداخت" flush>
                <div className="grid grid-cols-1 divide-y divide-black/10 md:grid-cols-3 md:divide-y-0 md:[&>*+*]:border-r md:[&>*+*]:border-black/20 dark:md:[&>*+*]:border-white/15 dark:divide-white/10">
                  <PreviewRow compact fixedLabel colon leader label="شماره درخواست" value={item.serial || "—"} ltr />
                  <PreviewRow compact fixedLabel colon leader label="تاریخ درخواست" value={toFa(String(item.dateFa || item.date_jalali || "—").replaceAll("-", "/"))} />
                  <PreviewRow compact fixedLabel colon leader label="درخواست کننده" value={item.createdByName || `کاربر #${toFa(item.createdById)}`} />
                </div>
                <div className="grid grid-cols-1 divide-y divide-black/10 md:grid-cols-[minmax(0,1fr)_minmax(190px,0.55fr)] md:divide-y-0 md:[&>*+*]:border-r md:[&>*+*]:border-black/20 dark:md:[&>*+*]:border-white/15 dark:divide-white/10">
                  <PreviewRow compact colon leader={!canEditReturned} label="پروژه" value={canEditReturned ? (
                    <select className={inputClass} value={editForm.projectId} onChange={(event) => setEditForm((old) => ({ ...old, projectId: event.target.value, budgetCode: "" }))}>
                      <option value="">انتخاب پروژه</option>
                      {projects.map((row) => <option key={row.id} value={row.id}>{projectLabel(row)}</option>)}
                    </select>
                  ) : (project ? projectLabel(project) : (item.projectName || item.projectCode || item.projectId || "—"))} />
                  <PreviewRow compact colon leader={!canEditReturned} label="کد بودجه" ltr={!canEditReturned} value={canEditReturned ? (
                    <select className={inputClass} value={editForm.budgetCode} disabled={!editForm.projectId || editBudgetLoading} onChange={(event) => setEditField("budgetCode", event.target.value)}>
                      <option value="">{editBudgetLoading ? "در حال دریافت..." : editForm.projectId ? "انتخاب کد بودجه" : "ابتدا پروژه را انتخاب کنید"}</option>
                      {editBudgetOptions.map((row) => {
                        const code = normalizeBudgetCode(row.code || row.center_code);
                        const desc = row.center_desc || row.last_desc || row.name || row.description || "";
                        return <option key={code || row.id} value={code}>{code}{desc ? ` - ${desc}` : ""}</option>;
                      })}
                    </select>
                  ) : (item.budgetCode || "—")} />
                </div>
                <div className="grid grid-cols-1 divide-y divide-black/10 md:grid-cols-[minmax(0,0.7fr)_minmax(0,0.3fr)] md:divide-y-0 md:[&>*+*]:border-r md:[&>*+*]:border-black/20 dark:md:[&>*+*]:border-white/15 dark:divide-white/10">
                  <PreviewRow compact colon label="موضوع درخواست" value={canEditReturned ? <input className={inputClass} value={editForm.title} onChange={(event) => setEditField("title", event.target.value)} /> : (item.title || "—")} />
                  <PreviewRow compact colon valueClassName={!canEditReturned ? "whitespace-nowrap" : ""} label="درخواست تامین" value={supplyRequestControl} />
                </div>
                <PreviewRow colon label="شرح درخواست" value={canEditReturned ? <textarea className={`${inputClass} min-h-24 py-2 leading-7`} value={editForm.description} onChange={(event) => setEditField("description", event.target.value)} /> : (item.description || "—")} />
                <div className="grid grid-cols-1 divide-y divide-black/10 md:grid-cols-3 md:divide-y-0 md:[&>*+*]:border-r md:[&>*+*]:border-black/20 dark:md:[&>*+*]:border-white/15 dark:divide-white/10">
                  <PreviewRow compact colon leader={!canEditReturned} label="مبلغ درخواست" ltr={!canEditReturned} value={canEditReturned ? <MoneyInput value={editForm.amount} onChange={(value) => setEditField("amount", value)} /> : toFa(Number(item.amount || 0).toLocaleString("en-US"))} />
                  <PreviewRow compact colon leader={!canEditReturned} label="باقی مانده بودجه مبنا" value={budgetLoading ? "در حال دریافت..." : baseBudget ? toFa(baseBudget) : "—"} ltr />
                  <PreviewRow compact colon leader={!canEditReturned} label="باقی مانده نقدینگی پروژه" value={liquidityRemaining || "—"} ltr />
                </div>
                <div className="grid grid-cols-1 divide-y divide-black/10 md:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] md:divide-y-0 md:[&>*+*]:border-r md:[&>*+*]:border-black/20 dark:md:[&>*+*]:border-white/15 dark:divide-white/10">
                  <PreviewRow compact colon leader={!canEditReturned} label="نام ذینفع" value={canEditReturned ? <input className={inputClass} value={editForm.beneficiaryName} onChange={(event) => setEditField("beneficiaryName", event.target.value)} /> : (item.beneficiaryName || "—")} />
                  <PreviewRow compact colon leader={!canEditReturned} label="شماره شبا" ltr={!canEditReturned} value={canEditReturned ? <input dir="ltr" inputMode="numeric" className={`${inputClass} text-left font-sans tabular-nums`} value={editForm.bankInfo || "IR"} onChange={(event) => setEditField("bankInfo", formatSheba(event.target.value))} onFocus={() => { if (!editForm.bankInfo) setEditField("bankInfo", "IR"); }} placeholder="IR" /> : (item.bankInfo || "—")} />
                </div>
                <div className="grid grid-cols-1 divide-y divide-black/10 md:grid-cols-4 md:divide-y-0 md:[&>*+*]:border-r md:[&>*+*]:border-black/20 dark:md:[&>*+*]:border-white/15 dark:divide-white/10">
                  <PreviewRow compact colon leader={!canEditReturned} label="نوع سند" value={canEditReturned ? (
                  <div className="space-y-2">
                    <select className={inputClass} value={editForm.docId} onChange={(event) => setEditForm((old) => ({ ...old, docId: event.target.value, docOther: event.target.value === "other" ? old.docOther : "" }))}>{DOC_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                    {editForm.docId === "other" && <input className={inputClass} value={editForm.docOther} onChange={(event) => setEditField("docOther", event.target.value)} placeholder="نوع سند را وارد کنید" />}
                  </div>
                ) : docName} />
                  <PreviewRow compact colon leader={!canEditReturned} label="شماره سند" value={canEditReturned ? <input className={inputClass} value={editForm.docNumber} onChange={(event) => setEditField("docNumber", event.target.value)} /> : (item.docNumber || "—")} />
                  <PreviewRow compact colon leader={!canEditReturned} label="تاریخ سند" value={canEditReturned ? <JalaliPopupDatePicker value={editForm.docDateJalali} onChange={(value) => setEditField("docDateJalali", value)} /> : toFa(item.docDate || item.docDateJalali || "—")} />
                  <PreviewRow compact colon leader={!canEditReturned} label="پیوست‌ها" value={canEditReturned ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    {editAttachments.map((file, index) => <span key={file.id || file.serverId || file.url || index} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-black/10 px-2 py-1 text-xs dark:border-white/10">
                      <a href={file.url || "#"} target="_blank" rel="noreferrer" className="max-w-[220px] truncate hover:underline">{file.name || `فایل ${toFa(index + 1)}`}</a>
                      <button type="button" onClick={() => removeEditAttachment(index)} className="grid h-6 w-6 place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/10" aria-label="حذف پیوست" title="حذف پیوست">×</button>
                    </span>)}
                    <label className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-black/10 bg-white transition hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title={editUploading ? "در حال آپلود" : "بارگذاری"} aria-label={editUploading ? "در حال آپلود" : "بارگذاری"}>
                      <img src="/images/icons/Uplod.svg" alt="" className={`h-4 w-4 dark:invert ${editUploading ? "animate-pulse opacity-60" : ""}`} />
                      <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={(event) => uploadEditFiles(event.target.files)} />
                    </label>
                  </div>
                ) : (attachments.length ? <div className="flex flex-wrap justify-end gap-2">{attachments.map((file, index) => <a key={file.id || file.serverId || index} href={file.url || "#"} target="_blank" rel="noreferrer" className="rounded-lg border border-black/10 px-2 py-1 text-xs hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">{file.name || `فایل ${toFa(index + 1)}`}</a>)}</div> : "—")} />
                </div>
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
                nextRecipients={nextRecipients}
                nextRecipientsLoading={nextRecipientsLoading}
                targetAssigneeUserId={targetAssigneeUserId}
                setTargetAssigneeUserId={setTargetAssigneeUserId}
              />}
              {canEditReturned && <div className="rounded-2xl border border-black/10 px-4 py-3 dark:border-white/10">
                {editUploadError && <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{editUploadError}</div>}
                <NextRecipientSelect recipients={nextRecipients} loading={nextRecipientsLoading} value={targetAssigneeUserId} onChange={setTargetAssigneeUserId} />
                <ActionFooter actionBusy={actionBusy} actionError={actionError} disabled={editUploading || (!!nextRecipients.targetRoleKey && !targetAssigneeUserId)} onSubmit={() => onResubmit(item, editForm, actionNote, { targetAssigneeUserId: targetAssigneeUserId || null })} />
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
  currencyTypes, nextRecipients, nextRecipientsLoading, targetAssigneeUserId, setTargetAssigneeUserId,
}) {
  const finalAccounting = stepKey === "accounting" && Number(stepIndex) >= 5;
  const targetRequired = choice === "approve" && !!nextRecipients?.targetRoleKey;
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
        <NextRecipientSelect recipients={nextRecipients} loading={nextRecipientsLoading} value={targetAssigneeUserId} onChange={setTargetAssigneeUserId} visible={choice === "approve"} />
        <ActionFooter actionBusy={actionBusy} actionError={actionError} disabled={!choice || (targetRequired && !targetAssigneeUserId)} onSubmit={onSubmit} />
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
        <NextRecipientSelect recipients={nextRecipients} loading={nextRecipientsLoading} value={targetAssigneeUserId} onChange={setTargetAssigneeUserId} visible={choice === "approve"} />
        <ActionFooter actionBusy={actionBusy} actionError={actionError} disabled={!choice || (targetRequired && !targetAssigneeUserId)} onSubmit={onSubmit} />
      </div>
    </PreviewSection>;
  }

  return <PreviewSection title={stepKey === "management" ? "نتیجه بررسی مدیریت" : "نتیجه بررسی مالی و حسابداری"}>
    <div className="space-y-3 py-4">
      <ActionOption checked={choice === "approve"} onClick={() => setChoice("approve")} label={stepKey === "management" ? "درخواست پرداخت" : "تایید درخواست"} />
      <ActionOption checked={choice === "return"} onClick={() => setChoice("return")} label="ارجاع به درخواست کننده" />
      {choice === "return" && <textarea value={actionNote} onChange={(event) => setActionNote(event.target.value)} className={`${inputClass} min-h-24 py-3`} placeholder="توضیح..." />}
      <NextRecipientSelect recipients={nextRecipients} loading={nextRecipientsLoading} value={targetAssigneeUserId} onChange={setTargetAssigneeUserId} visible={choice === "approve"} />
      <ActionFooter actionBusy={actionBusy} actionError={actionError} disabled={!choice || (targetRequired && !targetAssigneeUserId)} onSubmit={onSubmit} />
    </div>
  </PreviewSection>;
}

function ActionOption({ checked, disabled, onClick, label }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`flex h-11 w-full items-center justify-between rounded-xl border px-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-45 ${checked ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/10 bg-white hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"}`}>
    <span>{label}</span>
    <span className={`grid h-5 w-5 place-items-center rounded-md border ${checked ? "border-white dark:border-black" : "border-neutral-400"}`}>{checked && <img src="/images/icons/check.svg" alt="" className={`h-3.5 w-3.5 ${checked ? "invert dark:invert-0" : ""}`} />}</span>
  </button>;
}

function NextRecipientSelect({ recipients, loading, value, onChange, visible = true }) {
  if (!visible) return null;
  const targetRoleKey = recipients?.targetRoleKey;
  if (!targetRoleKey && !loading) return null;
  return <Field label="ارسال به کاربر مرحله بعد" required>
    <select className={inputClass} value={value || ""} onChange={(event) => onChange(event.target.value)} disabled={loading || !targetRoleKey}>
      <option value="">{loading ? "در حال دریافت کاربران..." : "انتخاب کنید"}</option>
      {(recipients?.users || []).map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name || recipient.username || recipient.email || `کاربر #${recipient.id}`}</option>)}
    </select>
  </Field>;
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

function paymentWorkflowStageState(step, history, item) {
  const entries = Array.isArray(history) ? history : [];
  const entry = step.index === 0
    ? entries.find((row) => row?.type === "created")
    : [...entries].reverse().find((row) => Number(row?.index) === step.index && ["approved", "rejected", "returned"].includes(row?.type));
  if (Number(item?.currentStepIndex) === step.index && item?.currentStepRoleKey) return { kind: "active", entry };
  if (entry?.type === "rejected") return { kind: "rejected", entry };
  if (entry?.type === "returned") return { kind: "returned", entry };
  if (entry?.type === "created" || entry?.type === "approved") return { kind: "completed", entry };
  return { kind: "waiting", entry: null };
}

function paymentWorkflowStyle(kind) {
  if (kind === "active") return { marker: "border-sky-500 bg-sky-500 text-white shadow-[0_0_0_5px_rgba(14,165,233,0.13)]", line: "bg-sky-200 dark:bg-sky-500/30", card: "bg-sky-50/90 dark:bg-sky-500/10", title: "text-sky-700 dark:text-sky-300" };
  if (kind === "rejected") return { marker: "border-rose-500 bg-rose-500 text-white", line: "bg-rose-200 dark:bg-rose-500/25", card: "bg-rose-50/80 dark:bg-rose-500/10", title: "text-rose-700 dark:text-rose-300" };
  if (kind === "returned") return { marker: "border-amber-500 bg-amber-500 text-white", line: "bg-amber-200 dark:bg-amber-500/25", card: "bg-amber-50/80 dark:bg-amber-500/10", title: "text-amber-700 dark:text-amber-300" };
  if (kind === "completed") return { marker: "border-neutral-300 bg-white text-neutral-500 shadow-[0_0_0_4px_rgba(115,115,115,0.08)] dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300", line: "bg-neutral-200 dark:bg-white/10", card: "", title: "text-neutral-800 dark:text-neutral-100" };
  return { marker: "border-neutral-300 bg-white text-neutral-400 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-500", line: "bg-neutral-200 dark:bg-white/10", card: "", title: "text-neutral-400 dark:text-neutral-500" };
}

function PaymentWorkflowTimeline({ history, item }) {
  const completedAll = !item?.currentStepRoleKey && item?.status === "approved";
  return <ol className="flex flex-col justify-start px-1 pb-2 pt-2" aria-label="مراحل فرآیند پرداخت">
    {PAYMENT_WORKFLOW_STEPS.map((step, index) => {
      const state = paymentWorkflowStageState(step, history, item);
      const kind = state.kind === "completed" && completedAll && index === PAYMENT_WORKFLOW_STEPS.length - 1 ? "final_completed" : state.kind;
      const style = kind === "final_completed" ? { ...paymentWorkflowStyle("completed"), marker: "border-emerald-500 bg-emerald-500 text-white shadow-[0_0_0_5px_rgba(16,185,129,0.13)]", line: "bg-emerald-200 dark:bg-emerald-500/25", title: "text-emerald-700 dark:text-emerald-300" } : paymentWorkflowStyle(kind);
      return <li key={step.index} className="relative grid grid-cols-[minmax(0,1fr)_32px] gap-2 pb-2 last:pb-0">
        <div className={`min-w-0 ${style.card ? `rounded-2xl px-3 py-2.5 ${style.card}` : "px-3 py-1"}`}>
          <div className={`text-sm font-bold leading-6 ${style.title}`}>{step.label}</div>
          {state.entry?.at ? <div className="mt-1 text-[11px] leading-5 text-neutral-500 dark:text-neutral-400">{step.index === 0 ? item?.createdByName || "درخواست‌کننده" : "انجام‌دهنده"} · {formatDateTime(state.entry.at)}</div> : null}
          {state.entry?.note ? <div className="mt-2 border-t border-black/5 pt-2 text-[11px] leading-5 text-neutral-500 dark:border-white/10 dark:text-neutral-400">توضیح: {state.entry.note}</div> : null}
        </div>
        <div className="relative flex justify-center" aria-hidden="true">
          {index < PAYMENT_WORKFLOW_STEPS.length - 1 ? <span className={`absolute bottom-[-12px] top-[22px] z-0 w-px ${style.line}`} /> : null}
          <span className={`relative z-10 mt-0.5 grid h-7 w-7 place-items-center rounded-full border-2 ${style.marker}`}>
            {kind === "completed" || kind === "final_completed" ? <span className="text-base font-bold leading-none">✓</span> : kind === "rejected" ? <span className="text-base font-bold leading-none">×</span> : kind === "returned" ? <span className="text-sm font-bold leading-none">↶</span> : kind === "active" ? <span className="h-2.5 w-2.5 rounded-full bg-white" /> : <span className="text-[11px] font-bold leading-none">{toFa(index + 1)}</span>}
          </span>
        </div>
      </li>;
    })}
  </ol>;
}

function PreviewSection({ title, children, flush = false }) { return <section className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10"><div className="border-b border-black/10 bg-neutral-50 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/5">{title}</div><div className={`divide-y divide-black/10 dark:divide-white/10 ${flush ? "" : "px-4"}`}>{children}</div></section>; }
function PreviewRow({ label, value, ltr, compact = false, valueClassName = "", colon = false, fixedLabel = false }) { return <div className={`min-w-0 ${compact ? `grid items-start gap-2 px-3 py-3 text-xs ${fixedLabel ? "grid-cols-[92px_minmax(0,1fr)]" : "grid-cols-[auto_minmax(0,1fr)]"}` : "grid grid-cols-[135px_1fr] gap-3 px-4 py-2.5 text-sm"}`}><div className={`text-neutral-500 dark:text-neutral-400 ${compact ? "whitespace-nowrap" : ""}`}>{label}{colon ? ":" : ""}</div><div dir={ltr ? "ltr" : "rtl"} className={`min-w-0 break-words font-medium ${ltr ? "text-left" : "text-right"} ${valueClassName}`}>{value}</div></div>; }
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
