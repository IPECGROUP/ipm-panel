// درخواست پرداخت
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { useAuth } from "../components/AuthProvider";
import { todayJalaliYmd } from "../utils/date";
import { toEnglishDigits } from "../utils/format";
import { useFeatureVisibility } from "../hooks/useFeatureAccess.js";
import TenkhahPage from "./TenkhahPage.jsx";

const DOC_OPTIONS = [
  ["pre_invoice", "پیش فاکتور"], ["invoice", "فاکتور"],
  ["goods_services", "صورت حساب رسمی کالا و خدمات"],
  ["other_invoice", "صورت حساب غیر رسمی"], ["status_invoice", "صورت وضعیت"],
  ["internal_list", "لیست پرداخت داخلی"], ["gov_salary", "فیش بدهی دولتی"], ["other", "سایر"],
];
const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const STATUS_LABELS = { pending: "در انتظار بررسی", approved: "تأیید شده", rejected: "رد شده", returned: "برگشت خورده", tenkhah_pending: "در انتظار بررسی", tenkhah_charged: "تنخواه" };
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
  { index: 2, label: "تایید نهایی (مدیریت پروژه)" },
  { index: 3, label: "بررسی اسناد (واحد مالی)" },
  { index: 4, label: "دستور پرداخت (مدیریت ارشد)" },
  { index: 5, label: "ثبت پرداخت (واحد مالی)" },
];
const PAYMENT_METHOD_OPTIONS = ["واریز بانکی - فیش", "واریز بانکی - اینترنت بانک", "صدور چک", "بصورت نقدی"];
const PAGE_ICON = "/images/icons/darkhast-pardakht.svg";
const inputClass = "w-full h-11 rounded-xl border border-black/10 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-white";
const today = () => todayJalaliYmd().replaceAll("-", "/");
const emptyForm = () => ({
  dateJalali: today(), scope: "projects", projectId: "", budgetCode: "", title: "", description: "",
  amount: "", cashAmount: "", cashDateJalali: "", creditPay: "", beneficiaryName: "", bankInfo: "",
  docId: "pre_invoice", docOther: "", docNumber: "", docDateJalali: "",
  currencyTypeId: "", currencySourceId: "", attachments: [], relatedLetterIds: [], hasSupplyRequest: "no", supplyRequestId: "", targetAssigneeUserId: "",
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
  relatedLetterIds: Array.isArray(item.relatedLetterIds) ? item.relatedLetterIds.map(String) : [],
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
function displayPaymentSerial(item, projects = []) {
  const savedSerial = String(item?.serial || "").trim();
  const serial = normalizeDigits(savedSerial).replace(/\s+/g, "");
  const project = projects.find((row) => String(row?.id) === String(item?.projectId));
  const projectCode = normalizeProjectCode(project?.code || item?.projectCode || "");
  if (!projectCode || /^\d{2}\/\d{3}\/\d{4}$/.test(serial)) return savedSerial || "—";
  const legacyMatch = serial.match(/^(\d{2})\/(\d{4})$/);
  return legacyMatch ? `${legacyMatch[1]}/${projectCode}/${legacyMatch[2]}` : (savedSerial || "—");
}
function isActiveProject(project) {
  const value = project?.isActive ?? project?.is_active ?? project?.active;
  return value === true || value === 1 || String(value).toLowerCase() === "true" || String(value) === "1";
}
// Only genuine three-digit project codes are main projects. Do not normalize
// before this check: legacy codes such as `IMP-489dbv` would otherwise become
// `489` and incorrectly appear as a selectable project.
function isMainProject(project) {
  return /^\d{3}$/.test(toEnglishDigits(String(project?.code ?? "")).trim());
}
function normalizeWorkflowUnitName(value = "") {
  return String(value).replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[‌\s]+/g, " ").trim().toLowerCase();
}
const WORKFLOW_UNIT_NAMES = {
  project_control: "برنامه ریزی",
  project_manager: "مدیریت پروژه ها",
  accounting: "مالی و حسابداری",
  management: "مدیریت",
};
function roleIdsForWorkflowUnit(unitRoleItems, roleKey) {
  const expected = normalizeWorkflowUnitName(WORKFLOW_UNIT_NAMES[roleKey]);
  const unit = (Array.isArray(unitRoleItems) ? unitRoleItems : []).find((item) => normalizeWorkflowUnitName(item?.name || item?.label) === expected);
  return new Set((unit?.roles || []).map((role) => String(role?.id)).filter(Boolean));
}
function usersForWorkflowUnit(unitRoleItems, assignments, roleKey) {
  const roleIds = roleIdsForWorkflowUnit(unitRoleItems, roleKey);
  if (!roleIds.size) return [];
  return (Array.isArray(assignments) ? assignments : [])
    .filter((candidate) => candidate?.isActive !== false && (candidate?.roles || []).some((role) => roleIds.has(String(role?.id))))
    .map((candidate) => ({ id: candidate.id, name: candidate.name, username: candidate.username, email: candidate.email }));
}
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

function tenkhahTableRow(item) {
  const status = item?.status === "charged"
    ? "tenkhah_charged"
    : ["approved", "rejected", "returned"].includes(item?.status)
      ? item.status
      : "tenkhah_pending";
  return {
    ...item,
    id: `tenkhah-${item.id}`,
    sourceId: item.id,
    requestType: "tenkhah",
    serial: item.requestNumber || `TNK-${item.id}`,
    dateFa: item.requestDate || "",
    amount: item.chargedAmount || item.requestedAmount || 0,
    title: "تنخواه",
    createdByName: item.requesterName || item.createdByName || "—",
    currencyName: item.currency || "ریال",
    displayStatus: status,
    projectName: item.projectName || "",
    projectCode: item.projectCode || "",
  };
}

function escapePdfHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
  useFeatureVisibility("درخواست پرداخت", { "افزودن": "افزودن" });
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRequestId = searchParams.get("request") || "";
  const openedRequestRef = useRef("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [requestType, setRequestType] = useState("normal");
  const [items, setItems] = useState([]);
  const [tenkhahItems, setTenkhahItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [numberSortDir, setNumberSortDir] = useState("desc");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);
  const [projects, setProjects] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [projectLiquidityRemaining, setProjectLiquidityRemaining] = useState(null);
  const [projectLiquidityLoading, setProjectLiquidityLoading] = useState(false);
  const [supplyRequests, setSupplyRequests] = useState([]);
  const [supplyPickerOpen, setSupplyPickerOpen] = useState(false);
  const [supplyPickerQuery, setSupplyPickerQuery] = useState("");
  const [supplyPickerPage, setSupplyPickerPage] = useState(1);
  const [supplyPickerLoading, setSupplyPickerLoading] = useState(false);
  const [supplyPickerHasMore, setSupplyPickerHasMore] = useState(false);
  const [letterPickerOpen, setLetterPickerOpen] = useState(false);
  const [letterPickerQuery, setLetterPickerQuery] = useState("");
  const [letters, setLetters] = useState([]);
  const [lettersLoading, setLettersLoading] = useState(false);
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
  const [selectedTenkhah, setSelectedTenkhah] = useState(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [filterQuick, setFilterQuick] = useState("");
  const [filterOwnership, setFilterOwnership] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
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
  const [deletingSelected, setDeletingSelected] = useState(false);
  const tableMenuRef = useRef(null);
  const [createRecipients, setCreateRecipients] = useState({ targetRoleKey: null, users: [] });
  const [createRecipientsLoading, setCreateRecipientsLoading] = useState(false);
  const selectedProject = useMemo(
    () => projects.find((project) => String(project.id) === String(form.projectId)),
    [form.projectId, projects]
  );
  const serial = useMemo(() => {
    const yy = jalaliYY(form.dateJalali);
    const projectCode = normalizeProjectCode(selectedProject?.code);
    let maxSeq = 0;
    const re = new RegExp(`^${yy}/(?:\\d{3}/)?(\\d{4})$`);
    [...items, ...tenkhahItems.map(tenkhahTableRow)].forEach((item) => {
      const match = normalizeDigits(item?.serial || "").match(re);
      if (match) maxSeq = Math.max(maxSeq, Number(match[1]) || 0);
    });
    const sequence = String(maxSeq + 1).padStart(4, "0");
    return projectCode ? `${yy}/${projectCode}/${sequence}` : `${yy}/${sequence}`;
  }, [form.dateJalali, items, selectedProject?.code, tenkhahItems]);
  const amount = parseAmount(form.amount);

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
      const [paymentData, tenkhahData] = await Promise.all([
        api("/requests"),
        api("/tenkhah").catch(() => ({ items: [] })),
      ]);
      setItems(Array.isArray(paymentData.items) ? paymentData.items : []);
      setTenkhahItems(Array.isArray(tenkhahData.items) ? tenkhahData.items : []);
    } catch { setError("دریافت درخواست‌ها انجام نشد."); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => {
    const refreshTenkhahRows = () => loadItems();
    window.addEventListener("tenkhah-notifications-refresh", refreshTenkhahRows);
    return () => window.removeEventListener("tenkhah-notifications-refresh", refreshTenkhahRows);
  }, [loadItems]);
  useEffect(() => {
    if (!requestedRequestId || loading || openedRequestRef.current === requestedRequestId) return;
    const requested = items.find((item) => String(item.id) === String(requestedRequestId));
    if (!requested) return;
    openedRequestRef.current = requestedRequestId;
    openPreview(requested);
  }, [items, loading, requestedRequestId]);
  useEffect(() => {
    let cancelled = false;
    setCreateRecipientsLoading(true);
    Promise.all([
      api(`/requests?nextRecipientsForCreate=1&projectId=${encodeURIComponent(form.projectId || "")}`).catch(() => ({})),
      api("/base/unit-roles").catch(() => ({ items: [] })),
      api("/base/user-role-assignments").catch(() => ({ items: [] })),
    ])
      .then(([workflowData, unitRoleData, assignmentData]) => {
        if (cancelled) return;
        const unitRoleItems = Array.isArray(unitRoleData?.items) ? unitRoleData.items : [];
        const assignments = Array.isArray(assignmentData?.items) ? assignmentData.items : [];
        const currentAssignment = assignments.find((candidate) => Number(candidate?.id) === Number(user?.id));
        const financeRoleIds = roleIdsForWorkflowUnit(unitRoleItems, "accounting");
        const currentUserIsFinance = (currentAssignment?.roles || []).some((role) => financeRoleIds.has(String(role?.id)));
        const targetRoleKey = workflowData?.targetRoleKey || (currentUserIsFinance ? "management" : "project_control");
        const apiUsers = Array.isArray(workflowData?.users) ? workflowData.users : [];
        const derivedUsers = usersForWorkflowUnit(unitRoleItems, assignments, targetRoleKey)
          .filter((candidate) => Number(candidate.id) !== Number(user?.id));
        setCreateRecipients({ targetRoleKey, users: apiUsers.length ? apiUsers : derivedUsers });
      })
      .catch(() => { if (!cancelled) setCreateRecipients({ targetRoleKey: "project_control", users: [] }); })
      .finally(() => { if (!cancelled) setCreateRecipientsLoading(false); });
    return () => { cancelled = true; };
  }, [api, form.projectId, user?.id]);
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
    Promise.allSettled([api("/projects?isActive=true"), api("/base/currencies/types"), api("/base/currencies/sources")]).then(([pr, t, s]) => {
      if (pr.status === "fulfilled") {
        const mainProjects = (Array.isArray(pr.value.items) ? pr.value.items : pr.value.projects || [])
          .filter((project) => isActiveProject(project) && isMainProject(project))
          .sort((a, b) => normalizeProjectCode(a.code).localeCompare(normalizeProjectCode(b.code), "fa", { numeric: true }));
        setProjects(mainProjects);
      } else setProjects([]);
      if (t.status === "fulfilled") setCurrencyTypes(t.value.items || []);
      if (s.status === "fulfilled") setCurrencySources(s.value.items || []);
    });
  }, [api]);
  useEffect(() => {
    if (!supplyPickerOpen) return undefined;
    const timer = setTimeout(async () => {
      setSupplyPickerLoading(true);
      try {
        const params = new URLSearchParams({ owner: "me", page: String(supplyPickerPage), pageSize: "50" });
        if (supplyPickerQuery.trim()) params.set("search", supplyPickerQuery.trim());
        const data = await api(`/supply-requests?${params}`);
        const rows = Array.isArray(data?.items) ? data.items : [];
        setSupplyRequests((previous) => supplyPickerPage === 1 ? rows : [...previous, ...rows.filter((row) => !previous.some((old) => String(old.id) === String(row.id)))]);
        setSupplyPickerHasMore(Boolean(data?.pagination?.hasMore));
      } catch {
        setSupplyRequests([]);
        setSupplyPickerHasMore(false);
      } finally { setSupplyPickerLoading(false); }
    }, supplyPickerQuery ? 250 : 0);
    return () => clearTimeout(timer);
  }, [api, supplyPickerOpen, supplyPickerPage, supplyPickerQuery]);
  useEffect(() => {
    if (!letterPickerOpen || letters.length || lettersLoading) return;
    setLettersLoading(true);
    api("/letters")
      .then((data) => setLetters(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []))
      .catch(() => setLetters([]))
      .finally(() => setLettersLoading(false));
  }, [api, letterPickerOpen, letters.length, lettersLoading]);
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
    api(`/liquidity-allocations?projectId=${encodeURIComponent(form.projectId)}`)
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

  const saveOwnRequestEdit = async (item, updates) => {
    if (!item || actionBusy) return;
    if (!updates.projectId) return setActionError("پروژه را انتخاب کنید.");
    if (!updates.budgetCode) return setActionError("کد بودجه را انتخاب کنید.");
    if (!String(updates.title || "").trim()) return setActionError("موضوع درخواست را وارد کنید.");
    if (updates.hasSupplyRequest === "yes" && !updates.supplyRequestId) return setActionError("درخواست تامین را انتخاب کنید.");

    setActionBusy(true);
    setActionError("");
    try {
      const data = await api(`/requests/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...updates,
          scope: "projects",
          cashAmount: null,
          creditAmount: null,
          currencyTypeId: updates.currencyTypeId || null,
          currencySourceId: updates.currencySourceId || null,
          projectId: updates.projectId || null,
        }),
      });
      setSelected((current) => current ? { ...current, ...(data.item || {}) } : current);
      await loadItems();
    } catch (err) {
      setActionError(err?.message === "forbidden" ? "شما اجازه ویرایش این درخواست را ندارید." : "ویرایش درخواست انجام نشد.");
    } finally {
      setActionBusy(false);
    }
  };

  const isIncomingForUser = (item) => item.requestType !== "tenkhah" && item.canAct && Number(item.createdById) !== Number(user?.id);
  const isUnreadForUser = (item) => item.requestType !== "tenkhah" && (manualUnreadIds.has(String(item.id)) || (isIncomingForUser(item) && !seenIncomingIds.has(String(item.id))));
  const tableItems = useMemo(() => [...items, ...tenkhahItems.map(tenkhahTableRow)], [items, tenkhahItems]);
  const filteredItems = useMemo(() => filterRequestRows(tableItems, {
    query: filterQuery,
    quick: filterQuick,
    tagIds: filterTagIds,
    ownership: filterOwnership,
    status: filterStatus,
    fromDate: filterFromDate,
    toDate: filterToDate,
    userId: user?.id,
  }).filter((item) => !filterUnread || isUnreadForUser(item)), [tableItems, filterFromDate, filterOwnership, filterQuery, filterQuick, filterStatus, filterTagIds, filterToDate, filterUnread, manualUnreadIds, seenIncomingIds, user?.id]);
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

  const deleteSelectedRequests = async () => {
    const ids = [...selectedIds].map(String);
    if (!ids.length || deletingSelected) return;
    if (!window.confirm(`آیا ${toFa(ids.length)} درخواست انتخاب‌شده حذف شود؟ این عملیات قابل بازگشت نیست.`)) return;

    setDeletingSelected(true);
    setError("");
    try {
      const results = await Promise.allSettled(ids.map((id) => api(`/requests/${encodeURIComponent(id)}`, { method: "DELETE" })));
      const deletedIds = ids.filter((_, index) => results[index].status === "fulfilled");
      if (deletedIds.length) {
        const deleted = new Set(deletedIds);
        setItems((previous) => previous.filter((item) => !deleted.has(String(item.id))));
        setSelectedIds((previous) => new Set([...previous].filter((id) => !deleted.has(String(id)))));
        setManualUnreadIds((previous) => new Set([...previous].filter((id) => !deleted.has(String(id)))));
        setSeenIncomingIds((previous) => new Set([...previous].filter((id) => !deleted.has(String(id)))));
        setSelected((previous) => deleted.has(String(previous?.id)) ? null : previous);
      }
      if (deletedIds.length !== ids.length) setError("برخی از موارد انتخاب‌شده حذف نشدند؛ حذف فقط برای درخواست‌های مجاز امکان‌پذیر است.");
      else setSuccess(`${toFa(deletedIds.length)} درخواست انتخاب‌شده حذف شد.`);
    } finally {
      setDeletingSelected(false);
      setTableMenuOpen(false);
    }
  };

  return <div dir="rtl" className="mx-auto max-w-[1400px]">
    <Card className="overflow-hidden rounded-3xl border border-black/10 bg-white p-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-neutral-900">
      <div className="p-3 md:p-4">
        <div className="mb-5 flex min-w-0 items-center justify-between gap-3 border-b border-black/[0.07] pb-4 dark:border-white/10">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 shadow-sm dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04]">
              <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold tracking-tight md:text-lg">درخواست پرداخت</span>
              <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت مالی</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setShowForm((old) => !old); setError(""); setSuccess(""); }} className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-black/15 transition hover:bg-black/5 dark:ring-neutral-800 dark:hover:bg-white/10" title={showForm ? "نمایش لیست" : "افزودن درخواست"}>
              <img src={showForm ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" />
            </button>
          </div>
        </div>

        {showForm && <div className="mb-5 w-fit rounded-2xl border border-black/10 bg-neutral-100/80 p-1.5 shadow-inner shadow-black/[0.03] dark:border-white/10 dark:bg-white/[.06]">
          <div className="flex items-center gap-1" role="tablist" aria-label="نوع درخواست پرداخت">
            {[['normal', 'عادی'], ['tenkhah', 'تنخواه']].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={requestType === value} onClick={() => setRequestType(value)} className={`h-9 rounded-xl px-4 text-sm font-semibold transition-all duration-200 ${requestType === value ? "bg-white text-neutral-950 shadow-sm ring-1 ring-black/[0.06] dark:bg-white dark:text-neutral-900" : "text-neutral-500 hover:bg-white/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[.08] dark:hover:text-white"}`}>{label}</button>)}
          </div>
        </div>}

        {showForm && <div className={requestType === "tenkhah" ? "" : "hidden"}><TenkhahPage embedded active={requestType === "tenkhah"} /></div>}

        {showForm && <form onSubmit={submit} className={`mb-5 space-y-4 rounded-2xl border border-black/10 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[.03] md:p-5 ${requestType === "normal" ? "" : "hidden"}`}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(260px,1fr)_minmax(220px,1fr)_minmax(210px,0.8fr)]">
            <Field label="پروژه" required><select className={inputClass} value={form.projectId} onChange={(e) => setForm((old) => ({ ...old, projectId: e.target.value, budgetCode: "", targetAssigneeUserId: "" }))}><option value="">انتخاب پروژه</option>{projects.map((item) => <option key={item.id} value={item.id}>{projectLabel(item)}</option>)}</select></Field>
            <Field label="کد بودجه" required><select className={inputClass} value={form.budgetCode} disabled={!form.projectId} onChange={(e) => setField("budgetCode", e.target.value)}><option value="">{form.projectId ? "انتخاب کد بودجه" : "ابتدا پروژه را انتخاب کنید"}</option>{budgetItems.map((item) => { const code = normalizeBudgetCode(item.code || item.center_code); const description = item.center_desc || item.last_desc || item.name || item.description || ""; return <option key={code || item.id} value={code}>{code}{description ? ` - ${description}` : ""}</option>; })}</select></Field>
            <div className="flex min-h-11 items-end pb-2 text-sm text-neutral-700 dark:text-neutral-200">باقی‌مانده نقدینگی پروژه: <span className="mr-1 font-medium tabular-nums">{projectLiquidityLoading ? "در حال دریافت..." : money(projectLiquidityRemaining) || "۰"}</span></div>
          </div>

          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-[minmax(230px,1.2fr)_minmax(210px,0.85fr)_minmax(360px,1.35fr)]">
            <Field label="موضوع درخواست" required><input className={`${inputClass} h-12 text-[15px]`} value={form.title} onChange={(e) => setField("title", e.target.value)} /></Field>
            <Field label="مبلغ درخواست" required>
              <div className="relative min-w-0">
                <MoneyInput className="!pl-[72px]" value={form.amount} onChange={(value) => setField("amount", value)} />
                <select aria-label="ارز مبلغ درخواست" title="انتخاب ارز" className="absolute left-1 top-1 h-9 !w-[64px] cursor-pointer appearance-auto rounded-lg border border-neutral-200 bg-neutral-100 px-1 text-center text-xs font-semibold text-neutral-700 shadow-sm outline-none transition hover:bg-neutral-200 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/10 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/[.15] dark:focus:border-white/30 dark:focus:ring-white/10" value={form.currencyTypeId} onChange={(e) => setField("currencyTypeId", e.target.value)}>
                  <option value="" className="bg-white text-neutral-900">ریال</option>{currencyTypes.filter((item) => String(itemLabel(item)).replace(/ي/g, "ی").replace(/ك/g, "ک").trim() !== "ریال").map((item) => <option key={item.id} value={item.id} className="bg-white text-neutral-900">{itemLabel(item)}</option>)}
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
              {form.hasSupplyRequest === "yes" && <Field label="انتخاب درخواست تامین" required><button type="button" onClick={() => { setSupplyPickerQuery(""); setSupplyPickerPage(1); setSupplyPickerOpen(true); }} className={`${inputClass} flex items-center justify-between text-right`}><span className={form.supplyRequestId ? "truncate" : "text-neutral-400"}>{supplyRequests.find((item) => String(item.id) === String(form.supplyRequestId))?.serial || (form.supplyRequestId ? `#${form.supplyRequestId}` : "انتخاب کنید")}</span><span className="text-lg leading-none">•••</span></button></Field>}
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
              <div className="flex items-center gap-2"><button type="button" onClick={() => setUploadOpen(true)} className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title={uploading ? "در حال آپلود" : "بارگذاری"} aria-label={uploading ? "در حال آپلود" : "بارگذاری"}>
                <img src="/images/icons/Uplod.svg" alt="" className={`h-5 w-5 dark:invert ${uploading ? "animate-pulse opacity-60" : ""}`} />
              </button><button type="button" onClick={() => setLetterPickerOpen(true)} className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white text-lg transition hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="انتخاب نامه" aria-label="انتخاب نامه">•••</button></div>
              {!!form.attachments.length && <div className="mt-1 text-[11px] text-neutral-500">{toFa(form.attachments.length)} فایل ضمیمه شده</div>}
              {!!form.relatedLetterIds.length && <div className="mt-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-300">{toFa(form.relatedLetterIds.length)} نامه مرتبط انتخاب شده</div>}
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="شرایط پرداخت"><input className={inputClass} value={form.creditPay} onChange={(e) => setField("creditPay", e.target.value)} /></Field>
            <Field label="نام ذینفع"><input className={inputClass} value={form.beneficiaryName} onChange={(e) => setField("beneficiaryName", e.target.value)} /></Field>
            <Field label="شماره شبا"><input dir="ltr" inputMode="numeric" maxLength={33} className={`${inputClass} text-left font-sans tabular-nums`} value={form.bankInfo || "IR"} onChange={(e) => setField("bankInfo", formatSheba(e.target.value))} onFocus={() => { if (!form.bankInfo) setField("bankInfo", "IR"); }} placeholder="IR" /></Field>
          </div>
          <div className="flex flex-col gap-3 border-t border-black/[0.07] pt-4 sm:flex-row sm:items-end sm:justify-end dark:border-white/10">
            <Field label="انتخاب کاربر" required={!!createRecipients.targetRoleKey} className="w-full sm:w-[20rem]">
              <select className={inputClass} value={form.targetAssigneeUserId} onChange={(e) => setField("targetAssigneeUserId", e.target.value)} disabled={createRecipientsLoading}>
                <option value="">{createRecipientsLoading ? "در حال دریافت..." : "انتخاب کاربر"}</option>
                {createRecipients.users.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name || recipient.username || recipient.email || `کاربر #${recipient.id}`}</option>)}
              </select>
            </Field>
            <button type="submit" disabled={submitting || uploading} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-900 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-md disabled:translate-y-0 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-white/90" title="ثبت" aria-label="ثبت"><img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" /></button>
          </div>
          {(error || success) && <div className={`rounded-xl px-3 py-2 text-sm ${error ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"}`}>{error || success}</div>}
        </form>}
        {uploadOpen && <PaymentUploadModal files={form.attachments} uploading={uploading} onUpload={uploadFiles} onClose={() => setUploadOpen(false)} />}
        {supplyPickerOpen && <RequestChoiceModal
          title="انتخاب درخواست تامین"
          query={supplyPickerQuery}
          onQueryChange={(value) => { setSupplyPickerQuery(value); setSupplyPickerPage(1); }}
          loading={supplyPickerLoading}
          items={supplyRequests}
          hasMore={supplyPickerHasMore}
          selectedId={form.supplyRequestId}
          onLoadMore={() => setSupplyPickerPage((value) => value + 1)}
          onSelect={(item) => { setField("supplyRequestId", String(item.id)); setSupplyPickerOpen(false); }}
          onClose={() => setSupplyPickerOpen(false)}
        />}
        {letterPickerOpen && <LetterChoiceModal
          query={letterPickerQuery}
          onQueryChange={setLetterPickerQuery}
          loading={lettersLoading}
          items={letters}
          selectedIds={form.relatedLetterIds}
          onToggle={(id) => setField("relatedLetterIds", form.relatedLetterIds.includes(String(id)) ? form.relatedLetterIds.filter((value) => value !== String(id)) : [...form.relatedLetterIds, String(id)])}
          onClose={() => setLetterPickerOpen(false)}
        />}

        {!showForm && <RequestFilterBar query={filterQuery} setQuery={setFilterQuery} quick={filterQuick} setQuick={setFilterQuick} ownership={filterOwnership} setOwnership={setFilterOwnership} status={filterStatus} setStatus={setFilterStatus} unread={filterUnread} setUnread={setFilterUnread} fromDate={filterFromDate} setFromDate={setFilterFromDate} toDate={filterToDate} setToDate={setFilterToDate} tags={tags} pinnedTagIds={pinnedFilterTagIds} setPinnedTagIds={setPinnedFilterTagIds} activeTagIds={filterTagIds} setActiveTagIds={setFilterTagIds} tagPickOpen={tagPickOpen} setTagPickOpen={setTagPickOpen} tagPickSearch={tagPickSearch} setTagPickSearch={setTagPickSearch} />}

        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
          <div className="relative hidden max-h-[55vh] overflow-y-auto overflow-x-hidden pb-0 md:block" dir="ltr"><table dir="rtl" className="w-full min-w-full table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:min-w-0 [&_td]:text-center [&_th]:!py-2 [&_td]:!py-2">
            <colgroup><col style={{ width: 40 }} /><col style={{ width: 18 }} /><col style={{ width: 90 }} /><col style={{ width: 100 }} /><col style={{ width: 205 }} /><col /><col style={{ width: 165 }} /><col style={{ width: 105 }} /><col style={{ width: 105 }} /><col style={{ width: 120 }} /></colgroup>
            <thead><tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-white/10 dark:text-neutral-100">
              <th className="sticky top-0 z-40 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]"><input ref={selectAllRef} type="checkbox" className="h-4 w-4 accent-black dark:accent-neutral-200" checked={allVisibleSelected} onChange={toggleSelectAll} aria-label="انتخاب همه" /></th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 dark:bg-neutral-800" aria-label="خوانده‌نشده" /><th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]"><button type="button" onClick={() => { setNumberSortDir((old) => old === "asc" ? "desc" : "asc"); setPage(0); }} className="mx-auto inline-flex items-center gap-1 transition hover:opacity-90" title={numberSortDir === "desc" ? "نمایش قدیمی‌ترین موارد" : "نمایش جدیدترین موارد"}><span>شماره</span><img src={numberSortDir === "desc" ? "/images/icons/bozorgbekochik.svg" : "/images/icons/kochikbebozorg.svg"} alt="" className="h-4 w-4 dark:invert" /></button></th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">تاریخ</th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 !text-right text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">پروژه</th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 !text-right text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">موضوع</th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">مبلغ</th>
              <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">درخواست‌کننده</th>
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
                      <button type="button" disabled={!selectedIds.size || deletingSelected} onClick={deleteSelectedRequests} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45 dark:text-red-300 dark:hover:bg-red-500/10">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-100 transition group-hover:scale-105 dark:bg-red-500/15"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1 text-sm font-semibold">{deletingSelected ? "در حال حذف..." : "حذف موارد انتخاب‌شده"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </th>
            </tr></thead>
            <tbody className="text-black dark:text-neutral-100">
              {loading ? <tr><td colSpan={10} className="py-8 text-black/60 dark:text-neutral-400">در حال دریافت...</td></tr> : pageItems.length === 0 ? <tr><td colSpan={10} className="py-8 text-black/60 dark:text-neutral-400">هنوز درخواستی ثبت نشده است.</td></tr> : pageItems.map((item) => <tr key={item.id} className={`group transition-colors ${item.requestType === "tenkhah" ? "bg-violet-50/90 hover:bg-violet-100/80 dark:bg-violet-500/[0.12] dark:hover:bg-violet-500/[0.18]" : "bg-black/[0.02] hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10"}`}>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><input type="checkbox" className="h-4 w-4 accent-black dark:accent-neutral-200" checked={selectedIds.has(String(item.id))} onChange={() => toggleSelected(item.id)} aria-label="انتخاب" /></td>
                <td className="border-b border-neutral-300 px-0 dark:border-neutral-700">{isUnreadForUser(item) && <span className="mx-auto block h-2 w-2 rounded-full bg-sky-500 ring-2 ring-sky-100 dark:ring-sky-500/25" title="درخواست خوانده‌نشده" aria-label="درخواست خوانده‌نشده" />}</td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{item.requestType === "tenkhah" ? <button type="button" onClick={() => setSelectedTenkhah(item)} className="mx-auto inline-flex items-center text-[13px] font-normal text-neutral-900 underline-offset-4 transition hover:underline dark:text-neutral-100" title="نمایش درخواست">{toFa(item.serial)}</button> : <button type="button" onClick={() => openPreview(item)} className="mx-auto inline-flex items-center justify-center text-[13px] font-normal underline-offset-4 transition hover:underline" title="نمایش درخواست">{toFa(displayPaymentSerial(item, projects))}</button>}</td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFa(String(item.dateFa || item.date_jalali || "—").replaceAll("-", "/"))}</td>
                <td className="border-b border-neutral-300 px-3 !text-right dark:border-neutral-700"><span className="block truncate text-right">{projectLabel(projects.find((row) => String(row.id) === String(item.projectId))) || item.projectName || item.projectCode || "—"}</span></td>
                <td className="border-b border-neutral-300 px-3 !text-right dark:border-neutral-700"><span className="block truncate text-right">{item.title || "—"}</span></td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="mx-auto block truncate tabular-nums">{toFa(money(item.amount) || "0")} {item.requestType === "tenkhah" ? item.currencyName : currencyNameOf(item.currencyTypeId, currencyTypes)}</span></td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="mx-auto block truncate">{item.createdByName || `کاربر #${toFa(item.createdById)}`}</span></td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><StatusBadge status={item.displayStatus || item.status} /></td>
                <td className="border-b border-neutral-300 !pl-10 !pr-2 dark:border-neutral-700">{item.requestType === "tenkhah" ? <div className="pointer-events-none flex w-full items-center justify-center opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"><button type="button" onClick={() => setSelectedTenkhah(item)} className="inline-grid h-10 w-10 place-items-center border-0 bg-transparent shadow-none transition hover:opacity-80" aria-label="نمایش درخواست تنخواه" title="نمایش درخواست تنخواه"><img src="/images/icons/list.svg" alt="" className="h-4 w-4 dark:invert" /></button></div> : <div className="pointer-events-none flex w-full items-center justify-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"><button type="button" onClick={() => openPreview(item)} className="inline-grid h-10 w-10 place-items-center border-0 bg-transparent shadow-none transition hover:opacity-80" aria-label={item.canAct ? "اقدامات" : "نمایش"} title={item.canAct ? "اقدامات" : "نمایش"}><img src="/images/icons/list.svg" alt="" className="h-4 w-4 dark:invert" /></button>{Number(item.createdById) === Number(user?.id) && <button type="button" onClick={() => openPreview({ ...item, __editing: true })} className="inline-grid h-10 w-10 place-items-center border-0 bg-transparent shadow-none transition hover:opacity-80" aria-label="ویرایش درخواست" title="ویرایش درخواست"><img src="/images/icons/pencil.svg" alt="" className="h-4 w-4 dark:invert" /></button>}</div>}</td>
              </tr>)}
            </tbody>
          </table></div>
          <div className="grid gap-3 p-3 md:hidden">{pageItems.map((item) => <button key={item.id} type="button" onClick={() => item.requestType === "tenkhah" ? setSelectedTenkhah(item) : openPreview(item)} className={`rounded-xl border p-3 text-right ${item.requestType === "tenkhah" ? "border-violet-200 bg-violet-50 dark:border-violet-400/20 dark:bg-violet-500/10" : "border-black/10 dark:border-white/10"}`}><div className="flex items-center justify-between gap-2"><b>{item.requestType === "tenkhah" ? item.serial : displayPaymentSerial(item, projects)}</b><StatusBadge status={item.displayStatus || item.status} /></div><div className="mt-2 truncate text-sm">{item.title || "—"}</div><div className="mt-2 text-xs text-neutral-500">مبلغ: {toFa(money(item.amount) || "0")} {item.requestType === "tenkhah" ? item.currencyName : currencyNameOf(item.currencyTypeId, currencyTypes)}</div><div className="mt-1 text-xs text-neutral-500">{toFa(String(item.dateFa || item.date_jalali || "—").replaceAll("-", "/"))}</div></button>)}</div>
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
      onEdit={saveOwnRequestEdit}
      onClose={() => {
        setSelected(null);
        if (requestedRequestId) {
          openedRequestRef.current = "";
          setSearchParams({}, { replace: true });
        }
      }}
    />}
    {selectedTenkhah && <TenkhahPreviewV4 item={selectedTenkhah} userId={user?.id} api={api} onRefresh={loadItems} onClose={() => setSelectedTenkhah(null)} />}
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

function filterRequestRows(rows, { query, quick, tagIds, ownership, status, fromDate, toDate, userId }) {
  const q = normalizeDigits(query).trim().toLowerCase();
  const start = quickStartDate(quick);
  const from = normalizeDigits(fromDate).replaceAll("-", "/");
  const to = normalizeDigits(toDate).replaceAll("-", "/");
  const selectedTags = Array.isArray(tagIds) ? tagIds.map(String).filter(Boolean) : [];
  return (Array.isArray(rows) ? rows : []).filter((item) => {
    const isTenkhah = item?.requestType === "tenkhah";
    const isMine = Number(item?.createdById) === Number(userId);
    const isIncoming = !isTenkhah && item?.canAct === true && !isMine;
    if (ownership === "mine" && !isMine) return false;
    if (ownership === "incoming" && !isIncoming) return false;
    if (start && itemDateKey(item) < start) return false;
    if (from && itemDateKey(item) < from) return false;
    if (to && itemDateKey(item) > to) return false;
    const itemStatus = item.displayStatus || item.status;
    if (status === "tenkhah" && !isTenkhah) return false;
    if (status === "pending" ? !["pending", "tenkhah_pending"].includes(itemStatus) : status && status !== "tenkhah" && itemStatus !== status) return false;
    if (selectedTags.length) {
      const itemTags = tagIdListOf(item);
      if (!selectedTags.some((id) => itemTags.includes(id))) return false;
    }
    if (!q) return true;
    const hay = [item.serial, item.dateFa, item.dateJalali, item.title, item.description, item.budgetCode, item.projectName, item.projectCode, item.status, item.displayStatus, item.requestType]
      .map((value) => normalizeDigits(value).toLowerCase())
      .join(" ");
    return hay.includes(q);
  });
}

function RequestFilterBar({ query, setQuery, quick, setQuick, ownership, setOwnership, status, setStatus, unread, setUnread, fromDate, setFromDate, toDate, setToDate, tags, pinnedTagIds, setPinnedTagIds, activeTagIds, setActiveTagIds, tagPickOpen, setTagPickOpen, tagPickSearch, setTagPickSearch }) {
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
      <div className="w-[calc(50%-0.25rem)] md:w-36"><div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">از</div><JalaliPopupDatePicker value={fromDate} onChange={(value) => { setFromDate(value); setQuick(""); }} /></div>
      <div className="w-[calc(50%-0.25rem)] md:w-36"><div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">تا</div><JalaliPopupDatePicker value={toDate} onChange={(value) => { setToDate(value); setQuick(""); }} /></div>
    </div>
    <div>
      <div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">برچسب ها</div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOwnership(ownership === "mine" ? "" : "mine")} className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ring-1 transition ${paymentTagClass(ownership === "mine")}`}>درخواست‌های من</button>
        <button type="button" onClick={() => setOwnership(ownership === "incoming" ? "" : "incoming")} className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ring-1 transition ${paymentTagClass(ownership === "incoming")}`}>موارد ارسال‌شده به من</button>
        <button type="button" onClick={() => setUnread(!unread)} className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ring-1 transition ${paymentTagClass(unread)}`}>خوانده نشده</button>
        {[['pending', 'در انتظار بررسی'], ['approved', 'تأیید شده'], ['returned', 'برگشت خورده'], ['rejected', 'رد شده'], ['tenkhah', 'تنخواه']].map(([key, label]) => <button key={key} type="button" onClick={() => setStatus(status === key ? "" : key)} className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${statusBadgeClass(key)} ${status === key ? "ring-2 ring-black/20 dark:ring-white/25" : "hover:brightness-95"}`}>{label}</button>)}
        {QUICK_FILTERS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setQuick(quick === key ? "" : key)} className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ring-1 transition ${paymentTagClass(quick === key)}`}>{label}</button>
        ))}
        {visibleTags.map((tag) => {
          const id = String(tag?.id ?? "");
          const isActive = active.has(id);
          return <button key={id} type="button" onClick={() => toggleActiveTag(id)} className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ring-1 transition ${paymentTagClass(isActive)}`}>{tagLabelOf(tag)}</button>;
        })}
      </div>
    </div>
    {tagPickOpen && <TagPicker tags={tags} selectedIds={pinnedTagIds} onToggle={togglePinnedTag} query={tagPickSearch} setQuery={setTagPickSearch} onClose={() => setTagPickOpen(false)} />}
  </div>;
}

function ChoiceModal({ title, query, onQueryChange, loading, children, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex max-h-[min(88vh,700px)] w-[min(760px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10"><b className="text-sm">{title}</b><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 text-xl dark:border-white/10" aria-label="بستن">×</button></div>
        <div className="border-b border-black/10 p-3 dark:border-white/10"><input autoFocus value={query} onChange={(event) => onQueryChange(event.target.value)} className={inputClass} placeholder="جستجو با شماره، موضوع یا شرح..." /></div>
        <div className="min-h-40 flex-1 overflow-y-auto p-2">{loading ? <div className="p-5 text-center text-sm text-neutral-500">در حال دریافت...</div> : children}</div>
      </div>
    </div>, document.body
  );
}

function RequestChoiceModal({ title, query, onQueryChange, loading, items, selectedId, hasMore, onLoadMore, onSelect, onClose }) {
  return <ChoiceModal title={title} query={query} onQueryChange={onQueryChange} loading={loading} onClose={onClose}>
    {items.length ? <div className="space-y-1">{items.map((item) => {
      const selected = String(item.id) === String(selectedId);
      return <button key={item.id} type="button" onClick={() => onSelect(item)} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-right transition ${selected ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-black/[0.04] dark:hover:bg-white/10"}`}>
        <span className="min-w-0"><span className="block font-bold">{toFa(item.serial || `#${item.id}`)}</span><span className={`mt-1 block truncate text-xs ${selected ? "text-white/70 dark:text-black/60" : "text-neutral-500 dark:text-neutral-400"}`}>{item.title || item.description || "بدون موضوع"}</span></span><span className="text-sm">{selected ? "✓" : ""}</span>
      </button>;
    })}{hasMore && <button type="button" onClick={onLoadMore} className="mx-auto mt-2 block rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/10">نمایش موارد بیشتر</button>}</div> : <div className="p-5 text-center text-sm text-neutral-500">درخواستی پیدا نشد.</div>}
  </ChoiceModal>;
}

function LetterChoiceModal({ query, onQueryChange, loading, items, selectedIds, onToggle, onClose }) {
  const normalizedQuery = normalizeDigits(query).trim().toLowerCase();
  const rows = (Array.isArray(items) ? items : []).filter((item) => !normalizedQuery || [item.letterNo, item.letter_no, item.secretariatNo, item.secretariat_no, item.subject, item.title, item.organization, item.companyName].map((value) => normalizeDigits(value).toLowerCase()).join(" ").includes(normalizedQuery));
  return <ChoiceModal title="انتخاب نامه مرتبط" query={query} onQueryChange={onQueryChange} loading={loading} onClose={onClose}>
    {rows.length ? <div className="space-y-1">{rows.slice(0, 150).map((item) => {
      const id = String(item.id);
      const checked = selectedIds.includes(id);
      const number = item.secretariatNo || item.secretariat_no || item.letterNo || item.letter_no || `#${id}`;
      return <button key={id} type="button" onClick={() => onToggle(id)} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-right transition ${checked ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-black/[0.04] dark:hover:bg-white/10"}`}><span className="min-w-0"><span className="block font-bold">{toFa(number)}</span><span className={`mt-1 block truncate text-xs ${checked ? "text-white/70 dark:text-black/60" : "text-neutral-500 dark:text-neutral-400"}`}>{item.subject || item.title || "بدون موضوع"}</span></span><span className={`grid h-5 w-5 place-items-center rounded border ${checked ? "border-current" : "border-neutral-300 dark:border-neutral-600"}`}>{checked ? "✓" : ""}</span></button>;
    })}</div> : <div className="p-5 text-center text-sm text-neutral-500">نامه‌ای پیدا نشد.</div>}
  </ChoiceModal>;
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

function Field({ label, required, children, className = "" }) { return <label className={`block text-xs text-neutral-600 dark:text-neutral-300 ${className}`}>{label}{required && <span className="mr-1 text-red-500">*</span>}<div className="mt-1">{children}</div></label>; }
function ReadField({ label, value, ltr }) { return <Field label={label}><div dir={ltr ? "ltr" : "rtl"} className={`${inputClass} flex items-center ${ltr ? "justify-end" : ""}`}>{value || "—"}</div></Field>; }
function MoneyInput({ value, onChange, className = "" }) { return <input dir="ltr" inputMode="numeric" className={`${inputClass} ${className}`} value={toFa(value)} onChange={(e) => onChange(money(e.target.value))} placeholder="۰" />; }
function paymentTagClass(active) {
  return active
    ? "bg-neutral-900 text-white ring-neutral-900 dark:bg-white dark:text-neutral-900 dark:ring-white"
    : "bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200/80 text-neutral-700 ring-neutral-200 hover:from-neutral-200 hover:to-neutral-300 dark:from-white/10 dark:via-white/[0.07] dark:to-white/[0.13] dark:text-neutral-200 dark:ring-white/10";
}

function statusBadgeClass(status) {
  return status === "approved" ? "border border-emerald-200/90 bg-emerald-100 text-emerald-700 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-300" : status === "tenkhah" || status === "tenkhah_charged" ? "border border-violet-200/90 bg-violet-100 text-violet-700 shadow-sm dark:border-violet-400/20 dark:bg-violet-500/15 dark:text-violet-300" : status === "pending" || status === "tenkhah_pending" ? "border border-sky-200/90 bg-sky-100 text-sky-700 shadow-sm dark:border-sky-400/20 dark:bg-sky-500/15 dark:text-sky-300" : status === "rejected" ? "border border-red-200/90 bg-red-100 text-red-700 shadow-sm dark:border-red-400/20 dark:bg-red-500/15 dark:text-red-300" : status === "returned" ? "border border-amber-200/90 bg-amber-100 text-amber-700 shadow-sm dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-300" : "border border-neutral-200 bg-neutral-100 text-neutral-700 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-neutral-200";
}

function StatusBadge({ status }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${statusBadgeClass(status)}`}>{STATUS_LABELS[status] || status || "—"}</span>;
}

function tenkhahCreatedAt(item) {
  const value = item?.workflowHistory?.find?.((event) => event?.type === "created")?.at || item?.createdAt;
  if (!value) return toFa(String(item?.dateFa || "—").replaceAll("-", "/"));
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return toFa(String(item?.dateFa || "—").replaceAll("-", "/"));
  const day = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const time = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  return `${day}، ${time}`;
}
function TenkhahActionOption({ kind, checked, onClick, label, children }) {
  const appearance = {
    approve: { icon: "✓", iconClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300", selected: "border-emerald-300 bg-emerald-50/60 shadow-[0_0_0_2px_rgba(52,211,153,.12)] dark:border-emerald-400/40 dark:bg-emerald-500/10", description: "تایید و ارسال به مرحله بعد" },
    return: { icon: "↶", iconClass: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300", selected: "border-amber-300 bg-amber-50/60 shadow-[0_0_0_2px_rgba(245,158,11,.12)] dark:border-amber-400/40 dark:bg-amber-500/10", description: "بازگشت برای اصلاح" },
    reject: { icon: "×", iconClass: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300", selected: "border-rose-300 bg-rose-50/60 shadow-[0_0_0_2px_rgba(244,63,94,.12)] dark:border-rose-400/40 dark:bg-rose-500/10", description: "رد درخواست و پایان فرایند" },
  }[kind];
  return <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onClick(); }} className={`min-h-[154px] cursor-pointer rounded-2xl border p-4 text-center transition ${checked ? appearance.selected : "border-black/10 bg-white hover:border-black/20 hover:shadow-sm dark:border-white/10 dark:bg-white/[.03] dark:hover:border-white/20"}`}><div className={`mx-auto grid h-10 w-10 place-items-center rounded-full text-2xl font-bold ${appearance.iconClass}`}>{appearance.icon}</div><div className="mt-2 text-sm font-bold text-neutral-800 dark:text-neutral-100">{label}</div><p className="mt-1 text-[11px] leading-5 text-neutral-500 dark:text-neutral-400">{appearance.description}</p>{checked && children && <div className="mt-2 text-right" onClick={(event) => event.stopPropagation()}>{children}</div>}</div>;
}

function TenkhahDetailCards({ details }) {
  return <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[.03]">
    <div className="mb-2 flex items-center gap-2 px-1 text-sm font-bold"><span className="h-2 w-2 rounded-full bg-sky-500" />جزئیات درخواست تنخواه</div>
    <div className="grid gap-2 sm:grid-cols-2">
      {details.map(([label, value]) => <div key={label} className="min-h-[74px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,.04)] dark:border-white/10 dark:bg-neutral-900"><div className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">{label}</div><div className="mt-1 truncate text-sm font-bold text-slate-800 dark:text-neutral-100" title={typeof value === "string" ? value : undefined}>{value || "—"}</div></div>)}
    </div>
  </section>;
}

function TenkhahPreviewV4({ item, userId, api, onRefresh, onClose }) {
  const [choice, setChoice] = useState("approve");
  const [note, setNote] = useState("");
  const [nextUserId, setNextUserId] = useState("");
  const [recipients, setRecipients] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canAct = Number(item.currentAssigneeUserId) === Number(userId) && item.status === "pending";
  const steps = [["created", "ثبت درخواست"], ["project_manager", "تایید نهایی (مدیریت پروژه)"], ["management", "دستور پرداخت (مدیریت ارشد)"], ["finance", "ثبت پرداخت (واحد مالی)"]];
  const activeStep = item.stage === "finance" ? 4 : item.stage === "management" ? 3 : 2;
  const details = [["شماره درخواست", item.serial || item.requestNumber || "—"], ["تاریخ درخواست", toFa(String(item.dateFa || item.requestDate || "—").replaceAll("-", "/"))], ["پروژه", `${item.projectCode || ""}${item.projectName ? ` - ${item.projectName}` : ""}` || "—"], ["درخواست‌کننده", item.createdByName || item.requesterName || "—"], ["ذینفع", item.beneficiaryName || item.beneficiaryUsername || "—"]];
  useEffect(() => {
    if (!canAct || !["project_manager", "management"].includes(item.stage)) return;
    api(`/tenkhah?recipients=${item.stage === "project_manager" ? "management" : "finance"}`).then((data) => setRecipients(data.users || [])).catch(() => setRecipients([]));
  }, [api, canAct, item.stage]);
  const submit = async () => {
    if (choice === "approve" && ["project_manager", "management"].includes(item.stage) && !nextUserId) return setError("کاربر مرحله بعد را انتخاب کنید.");
    setBusy(true); setError("");
    try {
      const payload = { id: item.sourceId || item.id, action: choice, note };
      if (choice === "approve" && item.stage === "project_manager") Object.assign(payload, { managementUserId: nextUserId, approvedDate: today() });
      if (choice === "approve" && item.stage === "management") Object.assign(payload, { financeUserId: nextUserId });
      if (choice === "approve" && item.stage === "finance") Object.assign(payload, { chargedDate: today(), chargedAmount: item.chargedAmount || item.requestedAmount || item.amount });
      await api("/tenkhah", { method: "PATCH", body: JSON.stringify(payload) });
      await onRefresh(); onClose();
    } catch (err) { setError(err?.message || "ثبت اقدام انجام نشد."); } finally { setBusy(false); }
  };
  return createPortal(<div className="fixed inset-0 z-[9999]" dir="rtl"><div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} /><div className="absolute inset-0 flex items-center justify-center p-3 md:p-6"><div className="flex max-h-[88vh] w-[min(1040px,calc(100vw-20px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white"><div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10"><b>جزئیات درخواست تنخواه</b><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black">×</button></div><div className="grid gap-4 overflow-y-auto p-4 md:grid-cols-[260px_minmax(0,1fr)]"><section className="self-start overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-900"><div className="border-b border-black/10 bg-neutral-50 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/5">فرآیند تنخواه</div><ol className="p-3">{steps.map(([key, label], index) => { const step = index + 1; const complete = key === "created" || step < activeStep || item.status === "charged"; const current = step === activeStep && item.status === "pending"; return <li key={key} className="grid grid-cols-[minmax(0,1fr)_30px] gap-2 pb-3 last:pb-0"><div className={current ? "rounded-2xl bg-sky-50 px-3 py-2 dark:bg-sky-500/10" : "px-3 py-1"}><b className={current ? "text-sm text-sky-700 dark:text-sky-300" : complete ? "text-sm text-emerald-700 dark:text-emerald-300" : "text-sm text-neutral-400"}>{label}</b><div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{key === "created" ? `${item.createdByName || item.requesterName || "—"}، ${tenkhahCreatedAt(item)}` : current ? "مرحله جاری" : complete ? "مرحله انجام شده" : "در انتظار شروع مرحله"}</div></div><span className={`grid h-7 w-7 place-items-center rounded-full border text-xs font-bold ${current ? "border-sky-500 bg-sky-500 text-white" : complete ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-300 text-neutral-400"}`}>{complete ? "✓" : toFa(step)}</span></li>; })}</ol></section><div className="space-y-4"><TenkhahDetailCards details={details} />{canAct && <section className="rounded-2xl border border-black/10 p-4 dark:border-white/10"><div className="mb-3 text-sm font-bold">اقدام روی درخواست</div><div className="grid gap-3 md:grid-cols-3"><TenkhahActionOption kind="approve" checked={choice === "approve"} onClick={() => setChoice("approve")} label="تایید و ارسال">{["project_manager", "management"].includes(item.stage) && <select className={`${inputClass} h-9 text-center text-xs`} value={nextUserId} onChange={(event) => setNextUserId(event.target.value)}><option value="">انتخاب کاربر مرحله بعد</option>{recipients.map((person) => <option key={person.id} value={person.id}>{person.name || person.username || person.email}</option>)}</select>}</TenkhahActionOption><TenkhahActionOption kind="return" checked={choice === "return"} onClick={() => setChoice("return")} label="برگشت درخواست"><textarea rows={1} className={`${inputClass} h-9 min-h-9 resize-none py-2 text-xs`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="دلیل برگشت..." /></TenkhahActionOption><TenkhahActionOption kind="reject" checked={choice === "reject"} onClick={() => setChoice("reject")} label="رد درخواست"><textarea rows={1} className={`${inputClass} h-9 min-h-9 resize-none py-2 text-xs`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="دلیل رد..." /></TenkhahActionOption></div>{error && <div className="mt-3 text-sm text-red-600">{error}</div>}<div className="mt-3 flex justify-end"><button type="button" onClick={submit} disabled={busy} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white disabled:opacity-50 dark:bg-white dark:text-black">✓</button></div></section>}</div></div></div></div></div>, document.body);
}

function TenkhahPreviewV3({ item, userId, api, onRefresh, onClose }) {
  const [choice, setChoice] = useState("approve");
  const [note, setNote] = useState("");
  const [nextUserId, setNextUserId] = useState("");
  const [recipients, setRecipients] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canAct = Number(item.currentAssigneeUserId) === Number(userId) && item.status === "pending";
  const steps = [["created", "ثبت درخواست"], ["project_manager", "تایید نهایی (مدیریت پروژه)"], ["management", "دستور پرداخت (مدیریت ارشد)"], ["finance", "ثبت پرداخت (واحد مالی)"]];
  const activeStep = item.stage === "finance" ? 4 : item.stage === "management" ? 3 : 2;
  useEffect(() => {
    if (!canAct || !["project_manager", "management"].includes(item.stage)) return;
    api(`/tenkhah?recipients=${item.stage === "project_manager" ? "management" : "finance"}`).then((data) => setRecipients(data.users || [])).catch(() => setRecipients([]));
  }, [api, canAct, item.stage]);
  const submit = async () => {
    if (choice === "approve" && ["project_manager", "management"].includes(item.stage) && !nextUserId) return setError("کاربر مرحله بعد را انتخاب کنید.");
    setBusy(true); setError("");
    try {
      const payload = { id: item.sourceId || item.id, action: choice, note };
      if (choice === "approve" && item.stage === "project_manager") Object.assign(payload, { managementUserId: nextUserId, approvedDate: today() });
      if (choice === "approve" && item.stage === "management") Object.assign(payload, { financeUserId: nextUserId });
      if (choice === "approve" && item.stage === "finance") Object.assign(payload, { chargedDate: today(), chargedAmount: item.chargedAmount || item.requestedAmount || item.amount });
      await api("/tenkhah", { method: "PATCH", body: JSON.stringify(payload) });
      await onRefresh(); onClose();
    } catch (err) { setError(err?.message || "ثبت اقدام انجام نشد."); } finally { setBusy(false); }
  };
  const details = [["شماره درخواست", item.serial || item.requestNumber], ["تاریخ درخواست", toFa(String(item.dateFa || item.requestDate || "—").replaceAll("-", "/"))], ["پروژه", `${item.projectCode || ""}${item.projectName ? ` - ${item.projectName}` : ""}`], ["درخواست‌کننده", item.createdByName || item.requesterName], ["ذینفع", item.beneficiaryName || item.beneficiaryUsername]];
  return createPortal(<div className="fixed inset-0 z-[9999]" dir="rtl"><div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} /><div className="absolute inset-0 flex items-center justify-center p-3 md:p-6"><div className="flex max-h-[88vh] w-[min(1040px,calc(100vw-20px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white"><div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10"><b>جزئیات درخواست تنخواه</b><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black">×</button></div><div className="grid gap-4 overflow-y-auto p-4 md:grid-cols-[260px_minmax(0,1fr)]"><section className="self-start overflow-hidden rounded-2xl border border-black/10 dark:border-white/10"><div className="border-b border-black/10 px-4 py-3 text-sm font-bold dark:border-white/10">فرآیند تنخواه</div><ol className="p-3">{steps.map(([key, label], index) => { const step = index + 1; const complete = key === "created" || step < activeStep || item.status === "charged"; const active = step === activeStep && item.status === "pending"; return <li key={key} className="grid grid-cols-[minmax(0,1fr)_30px] gap-2 pb-3 last:pb-0"><div className={`${active ? "rounded-2xl bg-sky-50 px-3 py-2 dark:bg-sky-500/10" : "px-3 py-1"}`}><b className={active ? "text-sm text-sky-700 dark:text-sky-300" : complete ? "text-sm text-emerald-700 dark:text-emerald-300" : "text-sm text-neutral-400"}>{label}</b><div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{key === "created" ? `${item.createdByName || item.requesterName || "—"}، ${tenkhahCreatedAt(item)}` : active ? "مرحله جاری" : complete ? "مرحله انجام شده" : "در انتظار شروع مرحله"}</div></div><span className={`grid h-7 w-7 place-items-center rounded-full border text-xs font-bold ${active ? "border-sky-500 bg-sky-500 text-white" : complete ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-300 text-neutral-400"}`}>{complete ? "✓" : toFa(step)}</span></li>; })}</ol></section><div className="space-y-4"><section className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10"><div className="border-b border-black/10 px-4 py-3 text-sm font-bold dark:border-white/10">جزئیات درخواست تنخواه</div><div className="grid grid-cols-1 divide-y divide-black/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 dark:divide-white/10">{details.map(([label, value]) => <PreviewRow key={label} compact label={label} value={value || "—"} />)}</div></section>{canAct && <section className="rounded-2xl border border-black/10 p-4 dark:border-white/10"><div className="mb-3 text-sm font-bold">اقدام روی درخواست</div><div className="grid gap-3 md:grid-cols-3"><TenkhahActionOption kind="approve" checked={choice === "approve"} onClick={() => setChoice("approve")} label="تایید و ارسال">{["project_manager", "management"].includes(item.stage) && <select className={`${inputClass} h-9 text-center text-xs`} value={nextUserId} onChange={(event) => setNextUserId(event.target.value)}><option value="">انتخاب کاربر مرحله بعد</option>{recipients.map((person) => <option key={person.id} value={person.id}>{person.name || person.username || person.email}</option>)}</select>}</TenkhahActionOption><TenkhahActionOption kind="return" checked={choice === "return"} onClick={() => setChoice("return")} label="برگشت درخواست"><textarea rows={1} className={`${inputClass} h-9 min-h-9 resize-none py-2 text-xs`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="دلیل برگشت..." /></TenkhahActionOption><TenkhahActionOption kind="reject" checked={choice === "reject"} onClick={() => setChoice("reject")} label="رد درخواست"><textarea rows={1} className={`${inputClass} h-9 min-h-9 resize-none py-2 text-xs`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="دلیل رد..." /></TenkhahActionOption></div>{error && <div className="mt-3 text-sm text-red-600">{error}</div>}<div className="mt-3 flex justify-end"><button type="button" onClick={submit} disabled={busy} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white disabled:opacity-50 dark:bg-white dark:text-black">✓</button></div></section>}</div></div></div></div></div>, document.body);
}

function TenkhahPreviewV2({ item, userId, api, onRefresh, onClose }) {
  const [choice, setChoice] = useState("approve");
  const [note, setNote] = useState("");
  const [nextUserId, setNextUserId] = useState("");
  const [recipients, setRecipients] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canAct = Number(item.currentAssigneeUserId) === Number(userId) && item.status === "pending";
  const active = item.status === "charged" ? 4 : item.stage === "finance" ? 4 : item.stage === "management" ? 3 : 2;
  const steps = [["created", "ثبت درخواست"], ["project_manager", "تایید نهایی (مدیریت پروژه)"], ["management", "دستور پرداخت (مدیریت ارشد)"], ["finance", "ثبت پرداخت (واحد مالی)"]];
  useEffect(() => {
    if (!canAct || !["project_manager", "management"].includes(item.stage)) return;
    api(`/tenkhah?recipients=${item.stage === "project_manager" ? "management" : "finance"}`).then((data) => setRecipients(data.users || [])).catch(() => setRecipients([]));
  }, [api, canAct, item.stage]);
  const submit = async () => {
    if (choice === "approve" && ["project_manager", "management"].includes(item.stage) && !nextUserId) return setError("کاربر مرحله بعد را انتخاب کنید.");
    setBusy(true); setError("");
    try {
      const payload = { id: item.sourceId || item.id, action: choice, note };
      if (choice === "approve" && item.stage === "project_manager") Object.assign(payload, { managementUserId: nextUserId, approvedDate: today() });
      else if (choice === "approve" && item.stage === "management") Object.assign(payload, { financeUserId: nextUserId });
      else if (choice === "approve" && item.stage === "finance") Object.assign(payload, { chargedDate: today(), chargedAmount: item.chargedAmount || item.requestedAmount || item.amount });
      await api("/tenkhah", { method: "PATCH", body: JSON.stringify(payload) });
      await onRefresh(); onClose();
    } catch (err) { setError(err.message || "ثبت اقدام انجام نشد."); } finally { setBusy(false); }
  };
  return createPortal(<div className="fixed inset-0 z-[9999]" dir="rtl"><div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} /><div className="absolute inset-0 flex items-center justify-center p-3 md:p-6"><div className="flex max-h-[88vh] w-[min(1040px,calc(100vw-20px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white"><div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10"><b>جزئیات درخواست تنخواه</b><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black">×</button></div><div className="grid gap-4 overflow-y-auto p-4 md:grid-cols-[260px_minmax(0,1fr)]"><section className="self-start overflow-hidden rounded-2xl border border-black/10 dark:border-white/10"><div className="border-b border-black/10 px-4 py-3 text-sm font-bold dark:border-white/10">فرآیند تنخواه</div><ol className="p-3">{steps.map(([key, label], index) => { const step = index + 1; const completed = key === "created" || step < active || item.status === "charged"; const current = step === active && item.status === "pending"; return <li key={key} className="relative grid grid-cols-[minmax(0,1fr)_30px] gap-2 pb-3 last:pb-0"><div className={`${current ? "rounded-2xl bg-sky-50 px-3 py-2 dark:bg-sky-500/10" : "px-3 py-1"}`}><div className={`text-sm font-bold ${current ? "text-sky-700 dark:text-sky-300" : completed ? "text-emerald-700 dark:text-emerald-300" : "text-neutral-400"}`}>{label}</div><div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{key === "created" ? `${item.createdByName || item.requesterName || `کاربر #${toFa(item.createdById || "")}`}، ${tenkhahCreatedAt(item)}` : current ? "مرحله جاری" : completed ? "مرحله انجام شده" : "در انتظار شروع مرحله"}</div></div><span className={`grid h-7 w-7 place-items-center rounded-full border text-xs font-bold ${current ? "border-sky-500 bg-sky-500 text-white" : completed ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_0_0_5px_rgba(16,185,129,.13)]" : "border-neutral-300 text-neutral-400"}`}>{completed ? "✓" : toFa(step)}</span></li>; })}</ol></section><div className="space-y-4"><section className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10"><div className="border-b border-black/10 px-4 py-3 text-sm font-bold dark:border-white/10">جزئیات درخواست تنخواه</div><div className="grid grid-cols-2 divide-x divide-y divide-black/10 dark:divide-white/10"><PreviewRow compact label="شماره درخواست" value={item.serial || item.requestNumber || "—"} /><PreviewRow compact label="تاریخ درخواست" value={toFa(String(item.dateFa || item.requestDate || "—").replaceAll("-", "/"))} /><PreviewRow compact label="پروژه" value={`${item.projectCode || ""}${item.projectName ? ` - ${item.projectName}` : ""}`} /><PreviewRow compact label="درخواست‌کننده" value={item.createdByName || item.requesterName || "—"} /></div></section>{canAct && <section className="rounded-2xl border border-black/10 p-4 dark:border-white/10"><div className="mb-3 text-sm font-bold">اقدام روی درخواست</div><div className="grid gap-3 md:grid-cols-3"><TenkhahActionOption kind="approve" checked={choice === "approve"} onClick={() => setChoice("approve")} label="تایید و ارسال">{["project_manager", "management"].includes(item.stage) && <select className={`${inputClass} h-9 text-center text-xs`} value={nextUserId} onChange={(event) => setNextUserId(event.target.value)}><option value="">انتخاب کاربر مرحله بعد</option>{recipients.map((person) => <option key={person.id} value={person.id}>{person.name || person.username || person.email}</option>)}</select>}</TenkhahActionOption><TenkhahActionOption kind="return" checked={choice === "return"} onClick={() => setChoice("return")} label="برگشت درخواست"><textarea rows={1} className={`${inputClass} h-9 min-h-9 resize-none py-2 text-xs`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="دلیل برگشت..." /></TenkhahActionOption><TenkhahActionOption kind="reject" checked={choice === "reject"} onClick={() => setChoice("reject")} label="رد درخواست"><textarea rows={1} className={`${inputClass} h-9 min-h-9 resize-none py-2 text-xs`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="دلیل رد..." /></TenkhahActionOption></div>{error && <div className="mt-3 text-sm text-red-600">{error}</div>}<div className="mt-3 flex justify-end"><button type="button" onClick={submit} disabled={busy} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white disabled:opacity-50 dark:bg-white dark:text-black" title="ثبت اقدام">✓</button></div></section>}</div></div></div></div></div>, document.body);
}

function TenkhahPreview({ item, onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  const activeStep = item.status === "charged" ? 3 : item.stage === "finance" ? 3 : item.stage === "management" ? 2 : 1;
  const steps = ["تایید نهایی (مدیریت پروژه)", "دستور پرداخت (مدیریت ارشد)", "ثبت پرداخت (واحد مالی)"];
  return createPortal(<div className="fixed inset-0 z-[9999]" dir="rtl">
    <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
    <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">
      <div className="flex max-h-[min(88vh,720px)] w-[min(1040px,calc(100vw-20px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10"><div className="text-base font-bold">جزئیات درخواست تنخواه</div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white transition hover:bg-black/85 dark:bg-white dark:text-black" title="بستن" aria-label="بستن"><img src="/images/icons/bastan.svg" alt="" className="h-5 w-5 invert dark:invert-0" /></button></div>
        <div className="grid min-h-0 gap-4 overflow-y-auto p-4 md:grid-cols-[260px_minmax(0,1fr)] md:p-5">
          <section className="self-start overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-900"><div className="border-b border-black/10 bg-neutral-50 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/5">فرآیند تنخواه</div><ol className="px-4 py-3">{steps.map((label, index) => { const step = index + 1; const completed = step < activeStep || item.status === "charged"; const active = step === activeStep && item.status !== "charged"; const finalCompleted = item.status === "charged" && index === steps.length - 1; return <li key={label} className="relative grid grid-cols-[minmax(0,1fr)_32px] gap-2 pb-3 last:pb-0"><div className={`min-w-0 ${active ? "rounded-2xl bg-sky-50 px-3 py-2.5 dark:bg-sky-500/10" : finalCompleted ? "rounded-2xl bg-emerald-50 px-3 py-2.5 dark:bg-emerald-500/10" : "px-3 py-1"}`}><div className={`text-sm font-bold ${finalCompleted ? "text-emerald-700 dark:text-emerald-300" : active ? "text-sky-700 dark:text-sky-300" : completed ? "text-neutral-800 dark:text-neutral-100" : "text-neutral-400 dark:text-neutral-500"}`}>{label}</div><div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{active ? "مرحله جاری" : completed ? "مرحله انجام شده" : "در انتظار شروع مرحله"}</div></div><div className="relative flex justify-center">{index < steps.length - 1 && <span className={`absolute bottom-[-6px] top-8 w-px ${completed ? "bg-sky-200 dark:bg-sky-500/30" : "bg-neutral-200 dark:bg-white/10"}`} />}<span className={`relative z-10 grid h-7 w-7 place-items-center rounded-full border text-xs font-bold ${finalCompleted ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_0_0_5px_rgba(16,185,129,.13)]" : active ? "border-sky-500 bg-sky-500 text-white shadow-[0_0_0_5px_rgba(14,165,233,.13)]" : completed ? "border-neutral-300 bg-white text-neutral-600 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200" : "border-neutral-300 bg-white text-neutral-400 dark:border-neutral-600 dark:bg-neutral-900"}`}>{completed ? "✓" : toFa(step)}</span></div></li>; })}</ol></section>
          <div className="space-y-4"><section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-900"><div className="border-b border-black/10 bg-neutral-50 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/5">جزئیات درخواست تنخواه</div><div className="grid grid-cols-1 divide-y divide-black/10 dark:divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0"><PreviewRow compact label="شماره درخواست" value={item.serial || "—"} ltr /><PreviewRow compact label="تاریخ درخواست" value={toFa(String(item.dateFa || "—").replaceAll("-", "/"))} /><PreviewRow compact label="پروژه" value={`${item.projectCode || ""}${item.projectName ? ` - ${item.projectName}` : ""}` || "—"} /><PreviewRow compact label="درخواست‌کننده" value={item.createdByName || "—"} /><PreviewRow compact label="مبلغ" value={`${toFa(money(item.amount) || "0")} ${item.currencyName || "ریال"}`} ltr /><PreviewRow compact label="وضعیت" value={<StatusBadge status={item.displayStatus || item.status} />} /></div></section><section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-900"><div className="border-b border-black/10 bg-neutral-50 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/5">اطلاعات تنخواه</div><div className="grid grid-cols-1 divide-y divide-black/10 dark:divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0"><PreviewRow compact label="مجموع تنخواه های دریافت شده:" value={toFa(money(item.unregisteredBalance) || "0")} ltr /><PreviewRow compact label="مانده تسویه‌نشده" value={toFa(money(item.unsettledBalance) || "0")} ltr /></div></section></div>
        </div>
      </div>
    </div>
  </div>, document.body);
}

function PaymentPreview({ item, projects, supplyRequests, currencyTypes, currencySources, userId, actionNote, setActionNote, actionBusy, actionError, onAction, onResubmit, onEdit, onClose }) {
  const project = projects.find((row) => String(row.id) === String(item.projectId));
  const currency = currencyTypes.find((row) => String(row.id) === String(item.currencyTypeId));
  const source = currencySources.find((row) => String(row.id) === String(item.currencySourceId));
  const currencyName = currency ? itemLabel(currency) : "ریال";
  const docName = item.docId === "other" ? (item.docOther || "سایر") : (DOC_OPTIONS.find(([value]) => value === item.docId)?.[1] || "—");
  const attachments = Array.isArray(item.attachments) ? item.attachments : [];
  const history = Array.isArray(item.historyJson) ? item.historyJson : Array.isArray(item.history_json) ? item.history_json : [];
  const currentStepRoleKey = item.currentStepRoleKey || "";
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  const canDecide = item.status === "pending" && item.canAct === true;
  const canEditReturned = item.status === "returned" && item.canAct === true && currentStepRoleKey === "requester";
  const isOwner = item.canEdit === true || Number(item.createdById) === Number(userId);
  const [isEditing, setIsEditing] = useState(!!item.__editing);
  const canEditRequest = isOwner && isEditing;
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
    fetch(`/api/liquidity-allocations?projectId=${encodeURIComponent(item.projectId)}`, {
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
  const previewBudgetProjectId = canEditRequest ? editForm.projectId : item.projectId;
  const previewBudgetCode = canEditRequest ? editForm.budgetCode : item.budgetCode;
  const previewProjectCode = canEditRequest ? editProject?.code : (project?.code || item.projectCode || "");
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
    setIsEditing(!!item.__editing);
  }, [item.id, item.updatedAt]);

  useEffect(() => {
    if (!canEditRequest || !editForm.projectId) {
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
  }, [canEditRequest, editForm.projectId, editProject?.code]);

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

  const supplyRequestControl = canEditRequest ? (
    <div className="space-y-1">
      <div className="flex h-8 items-center gap-3 overflow-hidden px-1">
        {[['no', 'ندارد'], ['yes', 'دارد']].map(([value, label]) => {
          const checked = editForm.hasSupplyRequest === value;
          return <button key={value} type="button" onClick={() => setEditForm((old) => ({ ...old, hasSupplyRequest: value, supplyRequestId: value === "yes" ? old.supplyRequestId : "" }))} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-neutral-900 transition hover:opacity-75 dark:text-white">
            <span>{label}</span>
            <span className={`grid h-5 w-5 place-items-center rounded-full border ${checked ? "border-neutral-950 dark:border-white" : "border-neutral-400 dark:border-neutral-500"}`}>{checked && <span className="h-3 w-3 rounded-full bg-neutral-950 dark:bg-white" />}</span>
          </button>;
        })}
      </div>
      {editForm.hasSupplyRequest === "yes" && <select className={inputClass} value={editForm.supplyRequestId} onChange={(event) => setEditField("supplyRequestId", event.target.value)}><option value="">انتخاب کنید</option>{supplyRequests.map((row) => <option key={row.id} value={row.id}>{row.serial || `#${row.id}`}{row.title ? ` - ${row.title}` : ""}</option>)}</select>}
    </div>
  ) : (item.hasSupplyRequest === "yes" ? (supplyRequests.find((row) => String(row.id) === String(item.supplyRequestId))?.serial || `#${item.supplyRequestId || "—"}`) : "ندارد");

  const openPdfPreview = () => {
    const value = (input, fallback = "—") => {
      const text = String(input ?? "").trim();
      const normalized = toFa(text || fallback).replace(/,/g, "٬");
      return escapePdfHtml(normalized);
    };
    const amount = (input) => {
      const parsed = Number(input || 0);
      return parsed > 0 ? `${escapePdfHtml(toFa(parsed.toLocaleString("en-US")))} ریال` : "—";
    };
    const projectName = project ? projectLabel(project) : (item.projectName || item.projectCode || item.projectId || "—");
    const supplyRequestName = item.hasSupplyRequest === "yes"
      ? (supplyRequests.find((row) => String(row.id) === String(item.supplyRequestId))?.serial || `#${item.supplyRequestId || "—"}`)
      : "ندارد";
    const attachmentNames = attachments.map((file, index) =>
      file?.name || file?.originalName || file?.filename || `فایل ${toFa(index + 1)}`
    );
    const now = new Date();
    const reportDate = normalizeDigits(new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(now)).replaceAll("-", "/");
    const reportTime = normalizeDigits(new Intl.DateTimeFormat("fa-IR", {
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(now));
    const reportDateTime = `${reportTime} - ${reportDate}`;
    const workflowRows = PAYMENT_WORKFLOW_STEPS.map((step) => ({
      step,
      state: paymentWorkflowStageState(step, history, item),
    })).filter(({ state }) => state.kind !== "waiting").map(({ step, state }, index) => {
      const stateLabel = state.kind === "active" ? "مرحله جاری" : state.kind === "rejected" ? "رد شده" : state.kind === "returned" ? "برگشت داده شده" : "انجام شده";
      return `<tr>
        <td>${toFa(index + 1)}</td>
        <td>${value(step.label)}</td>
        <td><span class="status status-${escapePdfHtml(state.kind)}">${value(stateLabel)}</span></td>
        <td>${state.entry ? value(paymentHistoryActorName(state.entry, item)) : "—"}</td>
        <td>${state.entry?.at ? value(formatDateTime(state.entry.at)) : "—"}</td>
      </tr>`;
    }).join("");
    const attachmentPreviewPages = attachments.map((file, index) => {
      const name = attachmentNames[index];
      const rawUrl = String(file?.url || file?.path || "").trim();
      let url = "";
      try {
        const parsed = new URL(rawUrl, window.location.origin);
        if (["http:", "https:"].includes(parsed.protocol)) url = parsed.href;
      } catch {
        url = "";
      }
      const type = String(file?.type || file?.mimeType || "").toLowerCase();
      const isImage = type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg)(?:\?|#|$)/i.test(rawUrl);
      const isPdf = type.includes("pdf") || /\.pdf(?:\?|#|$)/i.test(rawUrl) || /\.pdf$/i.test(name);
      const preview = !url
        ? `<div class="no-preview">آدرس فایل برای پیش‌نمایش در دسترس نیست.</div>`
        : isImage
          ? `<img class="attachment-image" src="${escapePdfHtml(url)}" alt="${value(name)}" />`
          : isPdf
            ? `<object class="attachment-pdf" data="${escapePdfHtml(url)}#view=FitH&toolbar=1" type="application/pdf"><iframe title="${value(name)}" src="${escapePdfHtml(url)}#view=FitH&toolbar=1"></iframe></object><a class="original-file" href="${escapePdfHtml(url)}" target="_blank" rel="noreferrer">باز کردن و چاپ فایل PDF اصلی</a>`
            : `<div class="no-preview">پیش‌نمایش این نوع فایل در مرورگر پشتیبانی نمی‌شود.</div><a class="original-file" href="${escapePdfHtml(url)}" target="_blank" rel="noreferrer">باز کردن فایل اصلی</a>`;
      return `<article class="sheet attachment-preview-page">
        <div class="attachment-preview-header"><span>پیوست ${toFa(index + 1)}</span><strong>${value(name)}</strong></div>
        <div class="attachment-preview-body">${preview}</div>
        <footer class="footer"><span>سامانه فرآیندهای یکپارچه شرکت ایده پویان انرژی</span><span>پیش‌نمایش پیوست ${toFa(index + 1)}</span></footer>
      </article>`;
    }).join("");
    const infoCard = (label, content, className = "") => `<div class="info-card ${className}"><div class="label">${escapePdfHtml(label)}</div><div class="value">${value(content)}</div></div>`;
    const logoUrl = `${window.location.origin}/images/light%20mode.png`;
    const fontRegularUrl = `${window.location.origin}/fonts/Vazir.woff2`;
    const fontBoldUrl = `${window.location.origin}/fonts/Vazir-Bold.woff2`;

    const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>درخواست پرداخت ${value(displayPaymentSerial(item, projects), "")}</title>
  <style>
    @font-face { font-family: Vazir; src: url("${fontRegularUrl}") format("woff2"); font-weight: 400; }
    @font-face { font-family: Vazir; src: url("${fontBoldUrl}") format("woff2"); font-weight: 700; }
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef1f4; color: #16202a; font-family: Vazir, Tahoma, Arial, sans-serif; font-size: 9.5px; line-height: 1.55; }
    .toolbar { position: sticky; top: 0; z-index: 20; display: flex; justify-content: center; gap: 8px; padding: 12px; background: rgba(238,241,244,.96); border-bottom: 1px solid #d7dde3; }
    .toolbar button { min-height: 38px; border: 1px solid #17212b; border-radius: 9px; padding: 0 16px; background: #17212b; color: #fff; font-family: inherit; font-weight: 700; cursor: pointer; }
    .toolbar button.secondary { background: #fff; color: #17212b; }
    .sheet { width: 210mm; min-height: 297mm; margin: 14px auto; padding: 8mm; background: #fff; box-shadow: 0 10px 35px rgba(20,30,40,.12); }
    .header { display: grid; grid-template-columns: 44mm 1fr 44mm; align-items: center; min-height: 21mm; border: 1.5px solid #182531; border-radius: 11px; overflow: hidden; }
    .logo { display: flex; height: 100%; align-items: center; justify-content: center; padding: 4px; border-left: 1px solid #d5dbe0; }
    .logo img { width: 38mm; max-height: 18mm; object-fit: contain; }
    .title { padding: 5px 10px; text-align: center; }
    .title h1 { margin: 0; color: #13212d; font-size: 17px; line-height: 1.4; }
    .title p { margin: 2px 0 0; color: #61707d; font-size: 9px; }
    .document-meta { height: 100%; display: grid; align-content: center; gap: 2px; padding: 5px 8px; border-right: 1px solid #d5dbe0; }
    .document-meta div { display: flex; justify-content: space-between; gap: 6px; }
    .document-meta span { color: #6b7782; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-top: 6px; }
    .summary-card { padding: 5px 8px; border-radius: 8px; background: #f4f7f9; border: 1px solid #dce3e8; }
    .summary-card .label { font-size: 9px; }
    .summary-card .value { margin-top: 2px; color: #14232f; font-size: 11px; }
    section { margin-top: 6px; break-inside: avoid; }
    .section-title { display: flex; align-items: center; gap: 6px; margin: 0 0 4px; color: #172734; font-size: 10.5px; font-weight: 700; }
    .section-title::before { content: ""; width: 3px; height: 14px; border-radius: 4px; background: #1b6c91; }
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #d8e0e6; border-radius: 11px; overflow: hidden; }
    .info-card { min-height: 38px; padding: 4px 7px; border-left: 1px solid #e1e6ea; border-bottom: 1px solid #e1e6ea; break-inside: avoid; }
    .info-card:nth-child(3n) { border-left: 0; }
    .info-card.full { grid-column: 1 / -1; border-left: 0; }
    .label { color: #6c7882; font-size: 9px; font-weight: 700; }
    .value { margin-top: 1px; color: #17232d; font-family: Vazir, Tahoma, Arial, sans-serif !important; font-size: 9.5px; font-weight: 700; font-feature-settings: "ss01" 1; font-variant-numeric: normal; letter-spacing: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #d7dfe5; border-radius: 11px; overflow: hidden; }
    th, td { padding: 4px 6px; text-align: right; vertical-align: top; border-bottom: 1px solid #e3e8ec; border-left: 1px solid #e3e8ec; overflow-wrap: anywhere; }
    th { background: #eef3f6; color: #293945; font-size: 9px; font-weight: 700; }
    td { font-family: Vazir, Tahoma, Arial, sans-serif !important; font-size: 9px; font-feature-settings: "ss01" 1; font-variant-numeric: normal; }
    tr:last-child td { border-bottom: 0; }
    th:last-child, td:last-child { border-left: 0; }
    .status { display: inline-block; min-width: 44px; padding: 2px 6px; border-radius: 99px; text-align: center; background: #e8eef2; color: #354653; font-size: 8.5px; font-weight: 700; }
    .status-approved { background: #e3f5ea; color: #15713a; }
    .status-rejected { background: #fde7e7; color: #a32929; }
    .status-returned { background: #fff0d8; color: #965b00; }
    .status-completed { background: #e3f5ea; color: #15713a; }
    .status-active { background: #e1f1fa; color: #126087; }
    .attachment-state { display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 7px; background: ${attachments.length ? "#e4f5eb" : "#f1f3f5"}; color: ${attachments.length ? "#176c3a" : "#53606b"}; font-weight: 700; }
    .attachment-list { margin: 5px 0 0; padding: 0; list-style: none; border: 1px solid #d9e0e5; border-radius: 8px; overflow: hidden; }
    .attachment-list li { display: grid; grid-template-columns: 9mm 1fr; gap: 6px; padding: 4px 8px; border-bottom: 1px solid #e4e8eb; }
    .attachment-list li:last-child { border-bottom: 0; }
    .attachment-list .number { color: #1b6c91; font-weight: 700; }
    .attachment-preview-page { break-before: page; page-break-before: always; display: flex; flex-direction: column; }
    .attachment-preview-header { display: grid; grid-template-columns: 28mm 1fr; align-items: center; gap: 10px; min-height: 15mm; padding: 8px 11px; border: 1px solid #d6dee4; border-radius: 11px; background: #f4f7f9; }
    .attachment-preview-header span { color: #1b6c91; font-weight: 700; }
    .attachment-preview-header strong { overflow-wrap: anywhere; }
    .attachment-preview-body { display: flex; min-height: 235mm; flex: 1; flex-direction: column; align-items: center; justify-content: center; margin-top: 9px; overflow: hidden; border: 1px solid #d9e0e5; border-radius: 11px; background: #fafbfc; }
    .attachment-image { display: block; width: 100%; max-height: 235mm; object-fit: contain; }
    .attachment-pdf, .attachment-pdf iframe { display: block; width: 100%; min-height: 225mm; border: 0; }
    .original-file { display: inline-flex; margin: 8px; border-radius: 8px; background: #17212b; color: #fff; padding: 6px 12px; text-decoration: none; font-weight: 700; }
    .no-preview { padding: 25px; color: #697680; text-align: center; }
    .footer { display: flex; justify-content: space-between; gap: 10px; margin-top: 13px; padding-top: 7px; border-top: 1px solid #d9e0e5; color: #75818b; font-size: 8.5px; }
    @media print {
      body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .toolbar { display: none; }
      .sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
      .sheet + .sheet { margin-top: 0; }
      .original-file { display: none; }
    }
    @media screen and (max-width: 900px) {
      .sheet { width: calc(100% - 20px); min-height: auto; padding: 18px; }
      .header { grid-template-columns: 1fr; }
      .logo, .document-meta { border: 0; border-bottom: 1px solid #d5dbe0; }
      .summary, .info-grid { grid-template-columns: 1fr; }
      .info-card, .info-card:nth-child(3n) { border-left: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">چاپ / ذخیره PDF</button>
    <button class="secondary" onclick="window.close()">بستن پیش‌نمایش</button>
  </div>
  <article class="sheet">
    <header class="header">
      <div class="logo"><img src="${logoUrl}" alt="IPEC" /></div>
      <div class="title"><h1>فرم درخواست پرداخت</h1><p>گزارش رسمی گردش و وضعیت درخواست</p></div>
      <div class="document-meta">
        <div><span>شماره:</span><strong dir="ltr">${value(displayPaymentSerial(item, projects))}</strong></div>
        <div><span>تاریخ:</span><strong>${value(toFa(String(item.dateFa || item.date_jalali || "—").replaceAll("-", "/")))}</strong></div>
      </div>
    </header>
    <section>
      <h2 class="section-title">مشخصات درخواست</h2>
      <div class="info-grid">
        ${infoCard("درخواست‌کننده", item.createdByName || `کاربر #${toFa(item.createdById)}`)}
        ${infoCard("پروژه", projectName)}
        ${infoCard("کد بودجه", item.budgetCode)}
        ${infoCard("موضوع درخواست", item.title)}
        ${infoCard("درخواست تأمین", supplyRequestName)}
        ${infoCard("مبلغ درخواست", `${toFa(Number(item.amount || 0).toLocaleString("en-US"))} ریال`)}
        ${infoCard("شرح درخواست", item.description, "full")}
      </div>
    </section>

    <section>
      <h2 class="section-title">اطلاعات مالی و پرداخت</h2>
      <div class="info-grid">
        ${infoCard("نام ذینفع", item.beneficiaryName)}
        ${infoCard("شماره شبا", item.bankInfo)}
        ${infoCard("شرایط پرداخت", item.creditPay)}
        ${infoCard("پرداخت نقدی ثبت‌شده", amount(item.cashText || item.cashAmount))}
        ${infoCard("تاریخ پرداخت نقدی", toFa(item.cashDate || item.cashDateJalali || "—"))}
        ${infoCard("پرداخت اعتباری ثبت‌شده", amount(item.creditSection || item.creditAmount))}
      </div>
    </section>

    <section>
      <h2 class="section-title">اطلاعات سند</h2>
      <div class="info-grid">
        ${infoCard("نوع سند", docName)}
        ${infoCard("شماره سند", item.docNumber)}
        ${infoCard("تاریخ سند", toFa(item.docDate || item.docDateJalali || "—"))}
      </div>
    </section>

    <section>
      <h2 class="section-title">فرآیند پرداخت</h2>
      <table>
        <thead><tr><th>ردیف</th><th>مرحله</th><th>وضعیت</th><th>انجام‌دهنده</th><th>تاریخ و ساعت</th></tr></thead>
        <tbody>${workflowRows || `<tr><td colspan="5">هنوز مرحله‌ای انجام نشده است.</td></tr>`}</tbody>
      </table>
    </section>
    <section>
      <h2 class="section-title">پیوست‌های درخواست پرداخت</h2>
      <div class="attachment-state">پیوست: ${attachments.length ? "دارد" : "ندارد"}</div>
      ${attachments.length ? `<ul class="attachment-list">${attachmentNames.map((name, index) => `<li><span class="number">${value(index + 1)}</span><strong>${value(name)}</strong></li>`).join("")}</ul>` : ""}
    </section>
    <footer class="footer"><span>سامانه فرآیندهای یکپارچه شرکت ایده پویان انرژی</span><span>${escapePdfHtml(reportDateTime)}</span></footer>
  </article>
  ${attachmentPreviewPages}
</body>
</html>`;

    const pdfWindow = window.open("", "_blank", "width=1150,height=850");
    if (!pdfWindow) {
      alert("امکان باز کردن پیش‌نمایش وجود ندارد. لطفاً نمایش پنجره‌های بازشو را برای این سایت فعال کنید.");
      return;
    }
    pdfWindow.document.open();
    pdfWindow.document.write(html);
    pdfWindow.document.close();
    pdfWindow.focus();
  };

  return createPortal(<div className="fixed inset-0 z-[9999]">
    <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
    <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">
      <div dir="rtl" className="flex h-[min(90vh,860px)] w-[min(1180px,calc(100vw-20px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold">اقدامات پرداخت</div>
            <button type="button" onClick={openPdfPreview} className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/10 px-3 text-xs font-semibold transition hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/10" title="مشاهده PDF" aria-label="مشاهده PDF"><img src="/images/icons/print.svg" alt="" className="h-4 w-4 dark:invert" /><span>مشاهده PDF</span></button>
          </div>
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
                  <PreviewRow compact fixedLabel colon leader label="شماره درخواست" value={displayPaymentSerial(item, projects)} ltr />
                  <PreviewRow compact fixedLabel colon leader label="تاریخ درخواست" value={toFa(String(item.dateFa || item.date_jalali || "—").replaceAll("-", "/"))} />
                  <PreviewRow compact fixedLabel colon leader label="درخواست کننده" value={item.createdByName || `کاربر #${toFa(item.createdById)}`} />
                </div>
                <div className="grid grid-cols-1 divide-y divide-black/10 md:grid-cols-[minmax(0,0.5fr)_minmax(260px,1fr)] md:divide-y-0 md:[&>*+*]:border-r md:[&>*+*]:border-black/20 dark:md:[&>*+*]:border-white/15 dark:divide-white/10">
                  <PreviewRow compact editing={canEditRequest} colon leader={!canEditRequest} label="پروژه" value={canEditRequest ? (
                    <select className={inputClass} value={editForm.projectId} onChange={(event) => setEditForm((old) => ({ ...old, projectId: event.target.value, budgetCode: "" }))}>
                      <option value="">انتخاب پروژه</option>
                      {projects.map((row) => <option key={row.id} value={row.id}>{projectLabel(row)}</option>)}
                    </select>
                  ) : (project ? projectLabel(project) : (item.projectName || item.projectCode || item.projectId || "—"))} />
                  <PreviewRow compact editing={canEditRequest} colon leader={!canEditRequest} label="کد بودجه" ltr={!canEditRequest} value={canEditRequest ? (
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
                  <PreviewRow compact editing={canEditRequest} colon label="موضوع درخواست" value={canEditRequest ? <input className={inputClass} value={editForm.title} onChange={(event) => setEditField("title", event.target.value)} /> : (item.title || "—")} />
                  <PreviewRow compact editing={canEditRequest} colon valueClassName={!canEditRequest ? "whitespace-nowrap" : ""} label="درخواست تامین" value={supplyRequestControl} />
                </div>
                <PreviewRow editing={canEditRequest} colon label="شرح درخواست" value={canEditRequest ? <textarea className={`${inputClass} h-[68px] min-h-[68px] resize-y py-1.5 leading-6`} value={editForm.description} onChange={(event) => setEditField("description", event.target.value)} /> : (item.description || "—")} />
                <div className="grid grid-cols-1 divide-y divide-black/10 md:grid-cols-2 md:divide-y-0 md:[&>*+*]:border-r md:[&>*+*]:border-black/20 dark:md:[&>*+*]:border-white/15 dark:divide-white/10">
                  <PreviewRow compact colon leader={!canEditRequest} label="مبلغ درخواست" ltr={!canEditRequest} value={toFa(Number(item.amount || 0).toLocaleString("en-US"))} />
                  <PreviewRow compact colon leader={!canEditRequest} label="باقی مانده نقدینگی پروژه" value={liquidityRemaining || "—"} ltr />
                </div>
                <div className="grid grid-cols-1 divide-y divide-black/10 md:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] md:divide-y-0 md:[&>*+*]:border-r md:[&>*+*]:border-black/20 dark:md:[&>*+*]:border-white/15 dark:divide-white/10">
                  <PreviewRow compact editing={canEditRequest} colon leader={!canEditRequest} label="نام ذینفع" value={canEditRequest ? <input className={inputClass} value={editForm.beneficiaryName} onChange={(event) => setEditField("beneficiaryName", event.target.value)} /> : (item.beneficiaryName || "—")} />
                  <PreviewRow compact editing={canEditRequest} colon leader={!canEditRequest} label="شماره شبا" ltr={!canEditRequest} value={canEditRequest ? <input dir="ltr" inputMode="numeric" className={`${inputClass} text-left font-sans tabular-nums`} value={editForm.bankInfo || "IR"} onChange={(event) => setEditField("bankInfo", formatSheba(event.target.value))} onFocus={() => { if (!editForm.bankInfo) setEditField("bankInfo", "IR"); }} placeholder="IR" /> : (item.bankInfo || "—")} />
                </div>
                <div className="grid grid-cols-1 divide-y divide-black/10 md:grid-cols-4 md:divide-y-0 md:[&>*+*]:border-r md:[&>*+*]:border-black/20 dark:md:[&>*+*]:border-white/15 dark:divide-white/10">
                  <PreviewRow compact editing={canEditRequest} colon leader={!canEditRequest} label="نوع سند" value={canEditRequest ? (
                  <div className="space-y-2">
                    <select className={inputClass} value={editForm.docId} onChange={(event) => setEditForm((old) => ({ ...old, docId: event.target.value, docOther: event.target.value === "other" ? old.docOther : "" }))}>{DOC_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                    {editForm.docId === "other" && <input className={inputClass} value={editForm.docOther} onChange={(event) => setEditField("docOther", event.target.value)} placeholder="نوع سند را وارد کنید" />}
                  </div>
                ) : docName} />
                  <PreviewRow compact editing={canEditRequest} colon leader={!canEditRequest} label="شماره سند" value={canEditRequest ? <input className={inputClass} value={editForm.docNumber} onChange={(event) => setEditField("docNumber", event.target.value)} /> : (item.docNumber || "—")} />
                  <PreviewRow compact editing={canEditRequest} colon leader={!canEditRequest} label="تاریخ سند" value={canEditRequest ? <JalaliPopupDatePicker value={editForm.docDateJalali} onChange={(value) => setEditField("docDateJalali", value)} /> : toFa(item.docDate || item.docDateJalali || "—")} />
                  <PreviewRow compact editing={canEditRequest} colon leader={!canEditRequest} label="پیوست‌ها" value={canEditRequest ? (
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
              {canEditRequest && <>
                {editUploadError && <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{editUploadError}</div>}
                {canEditReturned ? <>
                  <NextRecipientSelect recipients={nextRecipients} loading={nextRecipientsLoading} value={targetAssigneeUserId} onChange={setTargetAssigneeUserId} />
                  <ActionFooter actionBusy={actionBusy} actionError={actionError} disabled={editUploading || (!!nextRecipients.targetRoleKey && !targetAssigneeUserId)} onSubmit={() => onResubmit(item, editForm, actionNote, { targetAssigneeUserId: targetAssigneeUserId || null })} />
                </> : <ActionFooter actionBusy={actionBusy} actionError={actionError} disabled={editUploading} onSubmit={() => onEdit(item, editForm)} />}
              </>}
              {!canDecide && !canEditRequest && !isOwner && <div className="rounded-2xl border border-black/10 p-4 text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">در این مرحله اقدامی برای شما فعال نیست.</div>}
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
        <div className="grid gap-3 md:grid-cols-3">
          <ActionOption kind="approve" checked={choice === "approve"} disabled={!hasEnoughLiquidity} onClick={() => setChoice("approve")} label="تایید درخواست">
            <NextRecipientSelect recipients={nextRecipients} loading={nextRecipientsLoading} value={targetAssigneeUserId} onChange={setTargetAssigneeUserId} disabled={choice !== "approve" || actionBusy} compact />
          </ActionOption>
          <ActionOption kind="return" checked={choice === "return"} onClick={() => setChoice("return")} label="برگشت درخواست"><textarea value={actionNote} onChange={(event) => setActionNote(event.target.value)} className={`${inputClass} mt-2 min-h-20 py-2 text-xs`} placeholder="توضیح..." /></ActionOption>
          <ActionOption kind="reject" checked={choice === "reject"} onClick={() => setChoice("reject")} label="رد درخواست"><textarea value={actionNote} onChange={(event) => setActionNote(event.target.value)} className={`${inputClass} mt-2 min-h-20 py-2 text-xs`} placeholder="توضیح..." /></ActionOption>
          {!hasEnoughLiquidity && <ActionOption kind="reject" checked={choice === "stop"} onClick={() => setChoice("stop")} label="توقف پرداخت به دلیل عدم نقدینگی"><textarea value={actionNote} onChange={(event) => setActionNote(event.target.value)} className={`${inputClass} mt-2 min-h-20 py-2 text-xs`} placeholder="توضیح..." /></ActionOption>}
        </div>
        <ActionFooter actionBusy={actionBusy} actionError={actionError} disabled={!choice || (targetRequired && !targetAssigneeUserId)} onSubmit={onSubmit} />
      </div>
    </PreviewSection>;
  }

  if (stepKey === "project_control") {
    return <PreviewSection title="نتیجه بررسی اولیه">
      <div className="space-y-3 py-4">
        <div className="grid gap-3 md:grid-cols-3">
          <ActionOption kind="approve" checked={choice === "approve"} onClick={() => setChoice("approve")} label="تایید درخواست پرداخت">
            <NextRecipientSelect recipients={nextRecipients} loading={nextRecipientsLoading} value={targetAssigneeUserId} onChange={setTargetAssigneeUserId} disabled={choice !== "approve" || actionBusy} compact />
          </ActionOption>
          <ActionOption kind="return" checked={choice === "return"} onClick={() => setChoice("return")} label="برگشت درخواست پرداخت">
            <input value={actionNote} onClick={(event) => event.stopPropagation()} onChange={(event) => setActionNote(event.target.value)} disabled={choice !== "return" || actionBusy} className={`${inputClass} mt-2 h-9 text-center text-xs`} placeholder="دلیل برگشت را وارد کنید..." />
          </ActionOption>
          <ActionOption kind="reject" checked={choice === "reject"} onClick={() => setChoice("reject")} label="رد درخواست پرداخت">
            <input value={actionNote} onClick={(event) => event.stopPropagation()} onChange={(event) => setActionNote(event.target.value)} disabled={choice !== "reject" || actionBusy} className={`${inputClass} mt-2 h-9 text-center text-xs`} placeholder="دلیل رد را وارد کنید..." />
          </ActionOption>
        </div>
        <ActionFooter actionBusy={actionBusy} actionError={actionError} disabled={!choice || (targetRequired && !targetAssigneeUserId)} onSubmit={onSubmit} />
      </div>
    </PreviewSection>;
  }

  return <PreviewSection title={stepKey === "management" ? "نتیجه بررسی مدیریت" : "نتیجه بررسی مالی و حسابداری"}>
    <div className="space-y-3 py-4">
      <div className="grid gap-3 md:grid-cols-2">
        <ActionOption kind="approve" checked={choice === "approve"} onClick={() => setChoice("approve")} label={stepKey === "management" ? "تایید درخواست پرداخت" : "تایید درخواست"}>
          <NextRecipientSelect recipients={nextRecipients} loading={nextRecipientsLoading} value={targetAssigneeUserId} onChange={setTargetAssigneeUserId} disabled={choice !== "approve" || actionBusy} compact />
        </ActionOption>
        <ActionOption kind="return" checked={choice === "return"} onClick={() => setChoice("return")} label="برگشت درخواست پرداخت"><textarea value={actionNote} onChange={(event) => setActionNote(event.target.value)} className={`${inputClass} mt-2 min-h-20 py-2 text-xs`} placeholder="توضیح..." /></ActionOption>
      </div>
      <ActionFooter actionBusy={actionBusy} actionError={actionError} disabled={!choice || (targetRequired && !targetAssigneeUserId)} onSubmit={onSubmit} />
    </div>
  </PreviewSection>;
}

function ActionOption({ kind = "approve", checked, disabled, onClick, label, children }) {
  const appearance = {
    approve: { icon: "✓", iconClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300", selected: "border-emerald-300 bg-emerald-50/60 shadow-[0_0_0_2px_rgba(52,211,153,.12)] dark:border-emerald-400/40 dark:bg-emerald-500/10", description: "تایید و ارسال به مرحله بعد" },
    return: { icon: "↶", iconClass: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300", selected: "border-amber-300 bg-amber-50/60 shadow-[0_0_0_2px_rgba(245,158,11,.12)] dark:border-amber-400/40 dark:bg-amber-500/10", description: "برگشت به درخواست کننده جهت اصلاح" },
    reject: { icon: "×", iconClass: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300", selected: "border-rose-300 bg-rose-50/60 shadow-[0_0_0_2px_rgba(244,63,94,.12)] dark:border-rose-400/40 dark:bg-rose-500/10", description: "رد درخواست و پایان فرآیند" },
  }[kind];
  return <div role="button" tabIndex={disabled ? -1 : 0} onClick={() => !disabled && onClick()} onKeyDown={(event) => { if (!disabled && (event.key === "Enter" || event.key === " ")) onClick(); }} className={`min-h-[154px] cursor-pointer rounded-2xl border p-4 text-center transition ${checked ? appearance.selected : "border-black/10 bg-white hover:border-black/20 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20"} ${disabled ? "cursor-not-allowed opacity-45" : ""}`}>
    <div className={`mx-auto grid h-10 w-10 place-items-center rounded-full text-2xl font-bold ${appearance.iconClass}`}>{appearance.icon}</div>
    <div className="mt-2 text-sm font-bold text-neutral-800 dark:text-neutral-100">{label}</div>
    <p className="mt-1 text-[11px] leading-5 text-neutral-500 dark:text-neutral-400">{appearance.description}</p>
    {checked && children && <div className="mt-2 text-right" onClick={(event) => event.stopPropagation()}>{children}</div>}
  </div>;
}

function NextRecipientSelect({ recipients, loading, value, onChange, visible = true, disabled = false, compact = false }) {
  if (!visible) return null;
  const targetRoleKey = recipients?.targetRoleKey;
  if (!targetRoleKey && !loading) return null;
  return <Field label="ارسال به کاربر مرحله بعد" required>
    <select className={`${inputClass} ${compact ? "h-9 text-center text-xs" : ""}`} value={value || ""} onChange={(event) => onChange(event.target.value)} disabled={disabled || loading || !targetRoleKey}>
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

function paymentHistoryActorName(entry, item) {
  return entry?.actorName || entry?.userName || entry?.registrationInfo?.userName || (Number(entry?.byUserId) === Number(item?.createdById) ? item?.createdByName : "") || (entry?.byUserId ? `کاربر #${toFa(entry.byUserId)}` : "انجام‌دهنده");
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
          {state.entry?.at ? <div className="mt-1 text-[11px] leading-5 text-neutral-500 dark:text-neutral-400">{paymentHistoryActorName(state.entry, item)} · {formatDateTime(state.entry.at)}</div> : null}
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
function PreviewRow({ label, value, ltr, compact = false, valueClassName = "", colon = false, fixedLabel = false, editing = false }) { return <div className={`min-w-0 ${compact ? `grid items-start gap-2 px-3 py-3 text-xs ${fixedLabel ? "grid-cols-[92px_minmax(0,1fr)]" : "grid-cols-[auto_minmax(0,1fr)]"}` : "grid grid-cols-[135px_1fr] gap-3 px-4 py-2.5 text-sm"} ${editing ? "[&_input]:h-8 [&_select]:h-8 [&_input]:rounded-lg [&_select]:rounded-lg [&_textarea]:rounded-lg [&_input]:border-transparent [&_select]:border-transparent [&_textarea]:border-transparent [&_input]:bg-neutral-50 [&_select]:bg-neutral-50 [&_textarea]:bg-neutral-50 [&_input]:px-2 [&_select]:px-2 focus-within:[&_input]:border-black/20 focus-within:[&_select]:border-black/20 focus-within:[&_textarea]:border-black/20 dark:[&_input]:bg-white/5 dark:[&_select]:bg-white/5 dark:[&_textarea]:bg-white/5" : ""}`}><div className={`text-neutral-500 dark:text-neutral-400 ${compact ? "whitespace-nowrap" : ""}`}>{label}{colon ? ":" : ""}</div><div dir={ltr ? "ltr" : "rtl"} className={`min-w-0 break-words font-medium ${ltr ? "text-left" : "text-right"} ${valueClassName}`}>{value}</div></div>; }
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
