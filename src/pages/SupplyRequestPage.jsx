// درخواست تامین
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import Card from "../components/ui/Card.jsx";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { SupplyActionsPanel } from "./SupplyActionsPage.jsx";
import { todayJalaliYmd } from "../utils/date.js";
import { toEnglishDigits } from "../utils/format.js";

const PAGE_ICON = "/images/icons/darkhast-tamin.svg";
const REQUEST_DOC_ID = "supply_request";
const RELATED_PICK_LIMIT = 200;

const inputCls =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-right text-sm text-neutral-900 outline-none transition " +
  "placeholder:text-neutral-400 focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-neutral-100 dark:placeholder:text-neutral-500";

const labelCls = "mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300";

const tableWrapCls =
  "overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100";
const STATUS_FILTERS = [
  ["final_approval", "در انتظار تایید"],
  ["in_progress", "در حال اقدام"],
  ["done", "انجام شد"],
  ["canceled", "لغو شد"],
];

const statusLabels = {
  pending: "در انتظار تایید",
  final_approval: "در انتظار تایید",
  approved: "در انتظار تایید",
  in_progress: "در حال اقدام",
  done: "انجام شد",
  completed: "انجام شد",
  canceled: "لغو شد",
  cancelled: "لغو شد",
  rejected: "لغو شد",
  returned: "در حال اقدام",
};

const STEP_LABELS = {
  requester: "درخواست کننده",
  project_manager: "مدیر پروژه",
  commercial: "تامین",
};

function toFaDigits(value = "") {
  return String(value ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function escapeSupplyPdfHtml(value = "") {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char]);
}

function normalizeDigits(value = "") {
  return toEnglishDigits(String(value ?? "")).replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

function todayFa() {
  return normalizeDigits(todayJalaliYmd()).replaceAll("-", "/");
}

function parseMoney(value) {
  const digits = normalizeDigits(value).replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function formatMoney(value) {
  const digits = normalizeDigits(value).replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("en-US") : "";
}

function normalizeProjectCode(value = "") {
  return normalizeBudgetCode(value);
}

function normalizeCode(value = "") {
  return toEnglishDigits(String(value || "")).trim();
}

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

function isActiveProject(project) {
  const value = project?.isActive ?? project?.is_active ?? project?.active;
  return value === true || value === 1 || String(value).toLowerCase() === "true" || String(value) === "1";
}

function isMainProject(project) {
  return /^\d{3}$/.test(toEnglishDigits(String(project?.code ?? "")).trim());
}

function projectLabel(project) {
  if (!project) return "";
  const code = normalizeProjectCode(project.code);
  return `${code}${project.name ? ` - ${project.name}` : ""}`;
}

function itemProjectLabel(item, projects) {
  const project = projects.find((row) => String(row.id) === String(item.projectId));
  return project ? projectLabel(project) : item.projectName || item.projectCode || "—";
}

function emptyForm() {
  return {
    serial: "",
    dateJalali: todayFa(),
    projectId: "",
    budgetCode: "",
    title: "",
    needDateJalali: "",
    amount: "",
    description: "",
    attachments: [],
    relatedLetterIds: [],
    targetAssigneeUserId: "",
  };
}

function letterIdOf(letter) {
  const raw = letter?.id ?? letter?.letter_id ?? letter?.letterId ?? letter?._id;
  const id = Number(raw);
  return id && Number.isFinite(id) ? String(id) : String(raw || "");
}

function pickFirstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function letterNoOf(letter) {
  return pickFirstNonEmpty(letter?.secretariat_no, letter?.secretariatNo, letter?.letter_no, letter?.letterNo, letter?.no, letter?.number);
}

function letterDateOf(letter) {
  return pickFirstNonEmpty(letter?.letter_date, letter?.letterDate, letter?.secretariat_date, letter?.secretariatDate, letter?.date);
}

function subjectOf(letter) {
  return String(letter?.subject ?? letter?.title ?? "");
}

function fromToOf(letter) {
  const from = String(letter?.from_name ?? letter?.fromName ?? letter?.from ?? "");
  const to = String(letter?.to_name ?? letter?.toName ?? letter?.to ?? "");
  return `${from}${from && to ? " / " : ""}${to}`.trim();
}

function registrationMessage(info) {
  if (!info) return "";
  if (info.message) return info.message;
  const rawDate = normalizeDigits(info.dateJalali || info.date || "").replaceAll("-", "/");
  const dateParts = rawDate.split("/");
  const date =
    dateParts.length === 3
      ? `${dateParts[0]}/${String(dateParts[1]).padStart(2, "0")}/${String(dateParts[2]).padStart(2, "0")}`
      : rawDate;
  const time = normalizeDigits(info.time || "");
  const userName = info.userName || info.username || "کاربر";
  const unitName = info.unitName || "";
  const roleName = info.roleName || "";
  const serial = info.serial || info.requestSerial || info.requestNo || info.number || "";
  return `درخواست${serial ? ` شماره ${toFaDigits(serial)}` : ""} در تاریخ ${toFaDigits(date)} در ساعت ${toFaDigits(time)} توسط ${userName}${roleName ? ` با نقش ${roleName}` : ""}${unitName ? ` واحد ${unitName}` : ""} ثبت گردید`;
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

function statusBadgeClass(status) {
  return (
    status === "done" || status === "completed"
      ? "border border-emerald-200/90 bg-emerald-100 text-emerald-700 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-300"
      : status === "canceled" || status === "cancelled" || status === "rejected"
        ? "border border-red-200/90 bg-red-100 text-red-700 shadow-sm dark:border-red-400/20 dark:bg-red-500/15 dark:text-red-300"
        : status === "in_progress"
          ? "border border-sky-200/90 bg-sky-100 text-sky-700 shadow-sm dark:border-sky-400/20 dark:bg-sky-500/15 dark:text-sky-300"
          : status === "final_approval" || status === "approved"
            ? "border border-amber-200/90 bg-amber-100 text-amber-700 shadow-sm dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-300"
            : status === "returned"
          ? "border border-amber-200/90 bg-amber-100 text-amber-700 shadow-sm dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-300"
          : "border border-neutral-200 bg-neutral-100 text-neutral-700 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-neutral-200"
  );
}

function StatusBadge({ status }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${statusBadgeClass(status)}`}>{statusLabels[status] || "—"}</span>;
}

function tagLabelOf(tag) {
  return String(tag?.label ?? tag?.name ?? tag?.title ?? tag?.text ?? tag?.id ?? "").trim();
}

function tagIdListOf(item, letterById = new Map()) {
  const raw = item?.tagIds ?? item?.tag_ids ?? [];
  const own = Array.isArray(raw) ? raw.map((id) => String(id)) : [];
  const related = Array.isArray(item?.relatedLetterIds) ? item.relatedLetterIds : [];
  const fromLetters = related.flatMap((id) => {
    const letter = letterById.get(String(id));
    const ids = letter?.tag_ids ?? letter?.tagIds ?? [];
    return Array.isArray(ids) ? ids.map((x) => String(x)) : [];
  });
  return Array.from(new Set([...own, ...fromLetters]));
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
  return normalizeDigits(String(item?.dateJalali || item?.dateFa || "")).replaceAll("-", "/");
}

function statusGroup(status) {
  if (status === "approved") return "final_approval";
  if (status === "completed") return "done";
  if (status === "cancelled" || status === "rejected") return "canceled";
  if (status === "returned") return "pending";
  return status || "";
}

function displayStatusOf(item) {
  return item?.workflowStatus || item?.status || "";
}

function friendlyError(message, fallback) {
  const text = String(message || "");
  if (text === "database_unreachable") return "ارتباط با پایگاه داده برقرار نیست. سرویس دیتابیس را بررسی کنید.";
  if (text === "database_auth_failed") return "احراز هویت پایگاه داده ناموفق است.";
  if (text === "project_manager_user_not_found") return "کاربری با نقش مدیر پروژه پیدا نشد.";
  if (text === "commercial_user_not_found") return "کاربری در واحد تامین پیدا نشد.";
  if (text === "target_assignee_required") return "گیرنده درخواست تامین را انتخاب کنید.";
  if (text === "target_assignee_invalid") return "گیرنده انتخاب شده برای این مرحله معتبر نیست.";
  if (text === "note_required") return "برای برگشت یا رد درخواست، وارد کردن توضیح الزامی است.";
  return text || fallback;
}

function normalizeYmd(value = "") {
  const text = normalizeDigits(value).trim().replaceAll("-", "/");
  const match = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return text;
  return `${match[1]}/${match[2].padStart(2, "0")}/${match[3].padStart(2, "0")}`;
}

export default function SupplyRequestPage() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRequestId = searchParams.get("request") || searchParams.get("supplyRequest") || "";
  const openedRequestRef = useRef("");
  const fileRef = useRef(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [relatedDocsOpen, setRelatedDocsOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [letters, setLetters] = useState([]);
  const [relatedPickOpen, setRelatedPickOpen] = useState(false);
  const [relatedPickQuery, setRelatedPickQuery] = useState("");
  const [relatedPickIds, setRelatedPickIds] = useState([]);
  const [submitNotice, setSubmitNotice] = useState(null);
  const [selected, setSelected] = useState(null);
  const [actionNote, setActionNote] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOwnership, setFilterOwnership] = useState("");
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterProjectId, setFilterProjectId] = useState("");
  const [filterQuick, setFilterQuick] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterTagIds, setFilterTagIds] = useState([]);
  const [pinnedFilterTagIds, setPinnedFilterTagIds] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagPickOpen, setTagPickOpen] = useState(false);
  const [tagPickSearch, setTagPickSearch] = useState("");
  const [createRecipients, setCreateRecipients] = useState({ targetRoleKey: null, users: [] });
  const [createRecipientsLoading, setCreateRecipientsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [seenIncomingIds, setSeenIncomingIds] = useState(() => new Set());
  const [manualUnreadIds, setManualUnreadIds] = useState(() => new Set());
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const tableMenuRef = useRef(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);

  const selectedProject = useMemo(
    () => projects.find((project) => String(project.id) === String(form.projectId)),
    [form.projectId, projects]
  );

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(`/api${path}`, {
      credentials: "include",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(user?.id != null ? { "x-user-id": String(user.id) } : {}),
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {}
    if (!response.ok) throw new Error(data.error || data.message || "request_failed");
    return data;
  }, [user?.id]);

  const loadItems = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    setErr("");
    try {
      const data = await api("/supply-requests");
      const rows = Array.isArray(data?.items) ? data.items : [];
      setItems(rows);
    } catch (ex) {
      setErr(friendlyError(ex.message, "دریافت درخواست‌های تامین انجام نشد."));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [api, authLoading]);

  const loadProjects = useCallback(async () => {
    try {
      const data = await api("/projects?isActive=true");
      const raw = Array.isArray(data?.items) ? data.items : data?.projects || [];
      const clean = raw
        .filter((project) => isActiveProject(project) && isMainProject(project))
        .sort((a, b) => String(a.code).localeCompare(String(b.code), "fa", { numeric: true }));
      setProjects(clean);
    } catch {
      setProjects([]);
    }
  }, [api]);

  useEffect(() => {
    loadItems();
    loadProjects();
  }, [loadItems, loadProjects]);

  useEffect(() => {
    if (authLoading) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const data = await api("/letters/mine");
        const rows = Array.isArray(data?.items) ? data.items : [];
        if (!cancelled) setLetters(rows);
      } catch {
        if (!cancelled) setLetters([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, authLoading]);

  useEffect(() => {
    api("/tags?scope=letters").then((data) => {
      const rows = Array.isArray(data?.tags) ? data.tags : Array.isArray(data?.items) ? data.items : [];
      setTags(rows);
    }).catch(() => setTags([]));
  }, [api]);

  useEffect(() => {
    if (authLoading) return undefined;
    let cancelled = false;
    setCreateRecipientsLoading(true);
    api(`/supply-requests?nextRecipientsForCreate=1&projectId=${encodeURIComponent(form.projectId || "")}`)
      .then((data) => {
        if (cancelled) return;
        setCreateRecipients({
          targetRoleKey: data?.targetRoleKey || null,
          users: Array.isArray(data?.users) ? data.users : [],
        });
      })
      .catch(() => {
        if (!cancelled) setCreateRecipients({ targetRoleKey: null, users: [] });
      })
      .finally(() => {
        if (!cancelled) setCreateRecipientsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, authLoading, form.projectId]);
  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(`request_filter_tags:supply:u${user.id}`);
      const ids = raw ? JSON.parse(raw) : [];
      setPinnedFilterTagIds(Array.isArray(ids) ? ids.map(String) : []);
    } catch {
      setPinnedFilterTagIds([]);
    }
  }, [user?.id]);
  useEffect(() => {
    if (!user?.id) return;
    try {
      localStorage.setItem(`request_filter_tags:supply:u${user.id}`, JSON.stringify((pinnedFilterTagIds || []).map(String)));
    } catch {}
  }, [pinnedFilterTagIds, user?.id]);
  useEffect(() => {
    if (!user?.id) return;
    try {
      const stored = JSON.parse(localStorage.getItem(`supply_request_seen_incoming:u${user.id}`) || "[]");
      setSeenIncomingIds(new Set(Array.isArray(stored) ? stored.map(String) : []));
    } catch {
      setSeenIncomingIds(new Set());
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      const stored = JSON.parse(localStorage.getItem(`supply_request_manual_unread:u${user.id}`) || "[]");
      setManualUnreadIds(new Set(Array.isArray(stored) ? stored.map(String) : []));
    } catch {
      setManualUnreadIds(new Set());
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      localStorage.setItem(`supply_request_manual_unread:u${user.id}`, JSON.stringify([...manualUnreadIds]));
    } catch {}
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
    let cancelled = false;
    if (!form.projectId) {
      setBudgetItems([]);
      return undefined;
    }

    (async () => {
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

    return () => {
      cancelled = true;
    };
  }, [api, form.projectId, selectedProject]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErr("");
    setOk("");
  };

  const openFreshForm = () => {
    setForm(emptyForm());
    setRelatedDocsOpen(false);
    setRelatedPickOpen(false);
    setFormOpen(true);
    setErr("");
    setOk("");
  };

  const closeForm = () => {
    setFormOpen(false);
    setForm(emptyForm());
    setRelatedDocsOpen(false);
    setRelatedPickOpen(false);
    setErr("");
  };

  const openPreview = (item) => {
    if (Number(item?.currentAssigneeUserId) === Number(user?.id) && Number(item?.createdById) !== Number(user?.id)) {
      setSeenIncomingIds((previous) => {
        const next = new Set(previous);
        next.add(String(item.id));
        try { localStorage.setItem(`supply_request_seen_incoming:u${user.id}`, JSON.stringify([...next])); } catch {}
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

  useEffect(() => {
    if (!requestedRequestId || loading || openedRequestRef.current === requestedRequestId) return;
    const requested = items.find((item) => String(item.id) === String(requestedRequestId));
    if (!requested) return;
    openedRequestRef.current = requestedRequestId;
    openPreview(requested);
  }, [items, loading, requestedRequestId]);

  const selectedRelatedLetters = useMemo(() => {
    const map = new Map((Array.isArray(letters) ? letters : []).map((letter) => [letterIdOf(letter), letter]));
    return (Array.isArray(form.relatedLetterIds) ? form.relatedLetterIds : []).map((id) => map.get(String(id))).filter(Boolean);
  }, [form.relatedLetterIds, letters]);

  const relatedPickList = useMemo(() => {
    if (!relatedPickOpen) return [];
    const q = normalizeDigits(relatedPickQuery).trim().toLowerCase();
    const rows = Array.isArray(letters) ? letters : [];
    const indexed = rows.map((letter) => ({
      letter,
      hay: normalizeDigits([letterIdOf(letter), letterNoOf(letter), subjectOf(letter), fromToOf(letter)].join(" ")).toLowerCase(),
    }));
    if (!q) return indexed.slice(0, RELATED_PICK_LIMIT).map((item) => item.letter);
    return indexed.filter((item) => item.hay.includes(q)).slice(0, 800).map((item) => item.letter);
  }, [letters, relatedPickOpen, relatedPickQuery]);

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true);
    setErr("");
    try {
      const uploaded = [];
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/upload/payment-doc", {
          method: "POST",
          credentials: "include",
          headers: user?.id != null ? { "x-user-id": String(user.id) } : undefined,
          body,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || "upload_failed");
        uploaded.push(data.file || data);
      }
      setForm((prev) => ({ ...prev, attachments: [...prev.attachments, ...uploaded] }));
    } catch {
      setErr("بارگذاری فایل انجام نشد.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const amount = parseMoney(form.amount);
    if (!form.projectId) return setErr("پروژه را انتخاب کنید.");
    if (!form.budgetCode) return setErr("کد بودجه را انتخاب کنید.");
    if (!form.title.trim()) return setErr("موضوع درخواست را وارد کنید.");
    if (amount <= 0) return setErr("برآورد هزینه اولیه باید بیشتر از صفر باشد.");
    if (createRecipients.targetRoleKey && !form.targetAssigneeUserId) return setErr("گیرنده درخواست تامین را انتخاب کنید.");

    setSaving(true);
    setErr("");
    setOk("");
    try {
      const payload = {
        ...form,
        docId: REQUEST_DOC_ID,
        scope: "projects",
        amount,
        relatedLetterIds: form.relatedLetterIds,
        targetAssigneeUserId: form.targetAssigneeUserId || null,
        clientRegistrationInfo: clientRegistrationInfo(),
      };
      const data = await api("/supply-requests", { method: "POST", body: JSON.stringify(payload) });
      if (data?.item) setItems((prev) => [data.item, ...prev]);
      setSubmitNotice(data?.item?.registrationInfo ? { ...data.item.registrationInfo, serial: data.item.serial } : null);
      setOk("درخواست تامین با موفقیت ثبت شد.");
      closeForm();
      await loadItems();
    } catch (ex) {
      setErr(friendlyError(ex?.message, "ثبت درخواست تامین انجام نشد."));
    } finally {
      setSaving(false);
    }
  };

  const recordWorkflowAction = async (workflowAction, extraPayload = {}) => {
    if (!selected || actionBusy) return;
    setActionBusy(true);
    setActionError("");
    try {
      const data = await api("/supply-requests", {
        method: "POST",
        body: JSON.stringify({
          id: selected.id,
          workflowAction,
          note: actionNote,
          clientRegistrationInfo: clientRegistrationInfo(),
          ...extraPayload,
        }),
      });
      const nextItem = data?.item || null;
      if (nextItem) {
        setSelected(nextItem);
        setItems((prev) => prev.map((row) => (String(row.id) === String(nextItem.id) ? nextItem : row)));
      }
      setActionNote("");
      const actionMessage = workflowAction === "approve" ? "تایید شد." : workflowAction === "return" ? "برگشت داده شد." : "رد شد.";
      setSubmitNotice({
        message: `در تاریخ ${toFaDigits(normalizeDigits(new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())))} ساعت ${toFaDigits(normalizeDigits(new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date())))} توسط ${user?.name || user?.username || "کاربر"} ${actionMessage}`,
      });
      await loadItems();
    } catch (ex) {
      const message = String(ex?.message || "");
      setActionError(
        message === "project_manager_user_not_found"
          ? "کاربری با نقش مدیر پروژه پیدا نشد."
          : message === "commercial_user_not_found"
              ? "کاربری در واحد تامین پیدا نشد."
            : message === "target_assignee_required"
              ? "گیرنده درخواست تامین را انتخاب کنید."
              : message === "target_assignee_invalid"
                ? "گیرنده انتخاب شده برای این مرحله معتبر نیست."
                : message === "note_required"
                  ? "برای برگشت یا رد درخواست، وارد کردن توضیح الزامی است."
                : ["forbidden", "return_not_allowed_for_step", "reject_not_allowed_for_step"].includes(message)
                  ? "شما اجازه انجام این اقدام را ندارید."
                  : "ثبت اقدام انجام نشد."
      );
    } finally {
      setActionBusy(false);
    }
  };

  const saveOwnRequestEdit = async (item, updates) => {
    if (!item || actionBusy) return;
    if (!updates.projectId) return setActionError("پروژه را انتخاب کنید.");
    if (!String(updates.budgetCode || "").trim()) return setActionError("کد بودجه را وارد کنید.");
    if (!String(updates.title || "").trim()) return setActionError("موضوع درخواست را وارد کنید.");
    if (parseMoney(updates.amount) <= 0) return setActionError("برآورد هزینه باید بیشتر از صفر باشد.");
    setActionBusy(true);
    setActionError("");
    try {
      const data = await api(`/supply-requests?id=${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ ...updates, amount: parseMoney(updates.amount) }),
      });
      const nextItem = data?.item;
      if (nextItem) {
        setItems((prev) => prev.map((row) => String(row.id) === String(nextItem.id) ? nextItem : row));
        setSelected((current) => String(current?.id) === String(nextItem.id) ? nextItem : current);
      }
      await loadItems();
      return true;
    } catch (ex) {
      setActionError(ex?.message === "forbidden" ? "شما اجازه ویرایش این درخواست را ندارید." : "ویرایش درخواست تامین انجام نشد.");
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  const filteredItems = useMemo(() => {
    const q = normalizeDigits(filterQuery).trim().toLowerCase();
    const quickStart = quickStartDate(filterQuick);
    const fromDate = normalizeYmd(filterFromDate || quickStart);
    const toDate = normalizeYmd(filterToDate);
    const selectedTags = Array.isArray(filterTagIds) ? filterTagIds.map(String).filter(Boolean) : [];
    const letterById = new Map((Array.isArray(letters) ? letters : []).map((letter) => [letterIdOf(letter), letter]));
    return items.filter((item) => {
      const isMine = Number(item?.createdById) === Number(user?.id);
      const isIncoming = Number(item?.currentAssigneeUserId) === Number(user?.id) && !isMine;
      if (filterOwnership === "mine" && !isMine) return false;
      if (filterOwnership === "incoming" && !isIncoming) return false;
      if (filterUnread && !(manualUnreadIds.has(String(item.id)) || (isIncoming && !seenIncomingIds.has(String(item.id))))) return false;
      if (filterStatus && statusGroup(displayStatusOf(item)) !== filterStatus) return false;
      if (filterProjectId && String(item.projectId) !== String(filterProjectId)) return false;
      const dateKey = normalizeYmd(itemDateKey(item));
      if ((fromDate || toDate) && !dateKey) return false;
      if (fromDate && dateKey < fromDate) return false;
      if (toDate && dateKey > toDate) return false;
      if (selectedTags.length) {
        const itemTags = tagIdListOf(item, letterById);
        if (!selectedTags.some((id) => itemTags.includes(id))) return false;
      }
      if (!q) return true;
      const haystack = [
        item.serial,
        item.dateJalali,
        item.dateFa,
        item.title,
        item.description,
        item.budgetCode,
        itemProjectLabel(item, projects),
        item.status,
        displayStatusOf(item),
        statusLabels[displayStatusOf(item)],
        item.currentAssigneeName,
      ]
        .map((value) => normalizeDigits(value).toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [filterFromDate, filterOwnership, filterProjectId, filterQuery, filterQuick, filterStatus, filterTagIds, filterToDate, filterUnread, items, letters, manualUnreadIds, projects, seenIncomingIds, user?.id]);

  const total = filteredItems.length;
  const pageCount = Math.max(1, Math.ceil(total / rowsPerPage));
  const safePage = Math.min(page, pageCount - 1);
  const startIndex = safePage * rowsPerPage;
  const endIndex = Math.min(total, startIndex + rowsPerPage);
  const pageItems = filteredItems.slice(startIndex, endIndex);
  const pageItemIds = pageItems.map((item) => String(item.id));
  const allPageItemsSelected = pageItemIds.length > 0 && pageItemIds.every((id) => selectedIds.has(id));
  const toggleSelected = (id) => setSelectedIds((previous) => {
    const next = new Set(previous);
    const key = String(id);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const toggleAllPageItems = () => setSelectedIds((previous) => {
    const next = new Set(previous);
    if (allPageItemsSelected) pageItemIds.forEach((id) => next.delete(id));
    else pageItemIds.forEach((id) => next.add(id));
    return next;
  });

  const isIncomingForUser = (item) =>
    Number(item.currentAssigneeUserId) === Number(user?.id) && Number(item.createdById) !== Number(user?.id);

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
        try { localStorage.setItem(`supply_request_seen_incoming:u${user.id}`, JSON.stringify([...next])); } catch {}
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
    if (!window.confirm(`آیا ${toFaDigits(ids.length)} درخواست انتخاب‌شده حذف شود؟ این عملیات قابل بازگشت نیست.`)) return;

    setDeletingSelected(true);
    setErr("");
    try {
      const results = await Promise.allSettled(ids.map((id) => api(`/supply-requests?id=${encodeURIComponent(id)}`, { method: "DELETE" })));
      const deletedIds = ids.filter((_, index) => results[index].status === "fulfilled");
      if (deletedIds.length) {
        const deleted = new Set(deletedIds);
        setItems((previous) => previous.filter((item) => !deleted.has(String(item.id))));
        setSelectedIds((previous) => new Set([...previous].filter((id) => !deleted.has(String(id)))));
        setManualUnreadIds((previous) => new Set([...previous].filter((id) => !deleted.has(String(id)))));
        setSeenIncomingIds((previous) => new Set([...previous].filter((id) => !deleted.has(String(id)))));
        setSelected((previous) => deleted.has(String(previous?.id)) ? null : previous);
      }
      if (deletedIds.length !== ids.length) setErr("برخی از موارد انتخاب‌شده حذف نشدند؛ حذف فقط برای درخواست‌های مجاز امکان‌پذیر است.");
      else setOk(`${toFaDigits(deletedIds.length)} درخواست انتخاب‌شده حذف شد.`);
    } finally {
      setDeletingSelected(false);
      setTableMenuOpen(false);
    }
  };

  useEffect(() => {
    setPage(0);
  }, [filterFromDate, filterOwnership, filterProjectId, filterQuery, filterQuick, filterStatus, filterTagIds, filterToDate, filterUnread, rowsPerPage]);

  const handleExportExcel = async () => {
    if (!filteredItems.length) return;
    const xlsxMod = await import("xlsx");
    const XLSX = xlsxMod?.default || xlsxMod;
    const rows = [
      ["درخواست تامین - خروجی جدول"],
      [""],
      ["ردیف", "شماره", "تاریخ", "موضوع", "پروژه", "کد بودجه", "مبلغ", "تاریخ نیاز", "آخرین وضعیت", "شرح"],
      ...filteredItems.map((item, index) => [
        toFaDigits(index + 1),
        item.serial || "",
        toFaDigits(String(item.dateJalali || item.dateFa || "").replaceAll("-", "/")),
        item.title || "",
        itemProjectLabel(item, projects),
        item.budgetCode || "",
        toFaDigits(Number(item.amount || 0).toLocaleString("en-US")),
        toFaDigits(String(item.needDateJalali || item.docDateJalali || "").replaceAll("-", "/")),
        statusLabels[displayStatusOf(item)] || item.status || "",
        item.description || "",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 36 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 44 }];
    ws["!rtl"] = true;
    const wb = XLSX.utils.book_new();
    wb.Workbook = wb.Workbook || {};
    wb.Workbook.Views = [{ RTL: true }];
    XLSX.utils.book_append_sheet(wb, ws, "SupplyRequests");
    XLSX.writeFile(wb, `supply-requests-${String(todayJalaliYmd()).replaceAll("/", "-").replaceAll("\\", "-")}.xlsx`);
  };

  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <Card className="overflow-hidden rounded-3xl border border-black/10 bg-white p-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-neutral-900">
        <div className="p-3 md:p-4">
          <div className="mb-5 flex min-w-0 items-center justify-between gap-3 border-b border-black/[0.07] pb-4 dark:border-white/10">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 shadow-sm dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04]">
                <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
              </span>
              <span className="min-w-0">
              <span className="block truncate text-base font-bold tracking-tight md:text-lg">درخواست تامین</span>
                <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت تامین و پشتیبانی</span>
              </span>
            </div>
            <button
              type="button"
              onClick={formOpen ? closeForm : openFreshForm}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white transition hover:bg-black/5 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
              title={formOpen ? "بستن فرم" : "افزودن"}
              aria-label={formOpen ? "بستن فرم" : "افزودن"}
            >
              <img src={formOpen ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" />
            </button>
          </div>

          {!formOpen && (
            <RequestFilterBar
              query={filterQuery}
              setQuery={setFilterQuery}
              quick={filterQuick}
              setQuick={setFilterQuick}
              fromDate={filterFromDate}
              setFromDate={setFilterFromDate}
              toDate={filterToDate}
              setToDate={setFilterToDate}
              status={filterStatus}
              setStatus={setFilterStatus}
              ownership={filterOwnership}
              setOwnership={setFilterOwnership}
              unread={filterUnread}
              setUnread={setFilterUnread}
              tags={tags}
              pinnedTagIds={pinnedFilterTagIds}
              setPinnedTagIds={setPinnedFilterTagIds}
              activeTagIds={filterTagIds}
              setActiveTagIds={setFilterTagIds}
              tagPickOpen={tagPickOpen}
              setTagPickOpen={setTagPickOpen}
              tagPickSearch={tagPickSearch}
              setTagPickSearch={setTagPickSearch}
              onExport={handleExportExcel}
              canExport={filteredItems.length > 0}
            />
          )}

          {formOpen && (
            <form onSubmit={submit} className="mb-4 rounded-2xl border border-black/10 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[.03] md:p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label="پروژه" required>
                  <select
                    value={form.projectId}
                    onChange={(event) => setForm((prev) => ({ ...prev, projectId: event.target.value, budgetCode: "", targetAssigneeUserId: "" }))}
                    className={inputCls}
                  >
                    <option value="">انتخاب کنید</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {projectLabel(project)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="کد بودجه" required>
                  <select value={form.budgetCode} onChange={(event) => setField("budgetCode", event.target.value)} className={inputCls} disabled={!form.projectId}>
                    <option value="">{form.projectId ? "انتخاب کنید" : "ابتدا پروژه را انتخاب کنید"}</option>
                    {budgetItems.map((item) => {
                      const code = normalizeBudgetCode(item.code ?? item.budgetCode ?? item.budget_code ?? item.center_code);
                      const name = item.center_desc ?? item.last_desc ?? item.budgetName ?? item.budget_name ?? item.name ?? item.description ?? "";
                      return (
                        <option key={item.id || code} value={code}>
                          {code}
                          {name ? ` - ${name}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </Field>
                <Field label="موضوع درخواست" required>
                  <input value={form.title} onChange={(event) => setField("title", event.target.value)} className={`${inputCls} h-12 text-[15px]`} />
                </Field>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[minmax(180px,0.6fr)_minmax(360px,1.5fr)]">
                <div className="space-y-3">
                <Field label="برآورد هزینه اولیه" required>
                  <div className="relative">
                    <input
                      dir="ltr"
                      inputMode="numeric"
                      value={toFaDigits(form.amount)}
                      onChange={(event) => setField("amount", formatMoney(event.target.value))}
                      className={`${inputCls} pl-12 text-left font-sans tabular-nums`}
                      placeholder="۰"
                    />
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 dark:text-neutral-400">ریال</span>
                  </div>
                </Field>
                <Field label="تاریخ نیاز">
                  <JalaliPopupDatePicker
                    value={form.needDateJalali}
                    onChange={(value) => setField("needDateJalali", value)}
                    buttonClassName={`${inputCls} flex items-center justify-between`}
                    placeholder="انتخاب تاریخ"
                    disableTodayAndPast
                  />
                </Field>
                </div>
                <Field label="شرح درخواست" className="h-full">
                  <textarea
                    value={form.description}
                    onChange={(event) => setField("description", event.target.value)}
                    className={`${inputCls} min-h-24 resize-y py-3 leading-7`}
                  />
                </Field>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[minmax(180px,0.6fr)_minmax(360px,1.5fr)]">
                <div className="flex flex-wrap items-end gap-3">
                <div>
                  <div className={labelCls}>اسناد مرتبط</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRelatedPickIds((Array.isArray(form.relatedLetterIds) ? form.relatedLetterIds : []).map(String));
                        setRelatedPickQuery("");
                        setRelatedPickOpen(true);
                      }}
                      className="inline-flex h-10 w-[56px] items-center justify-center rounded-xl border border-black/10 bg-white text-sm transition hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
                      title="اسناد مرتبط"
                      aria-label="اسناد مرتبط"
                    >
                      <img src="/images/icons/sayer.svg" alt="" className="h-5 w-5 dark:invert" />
                    </button>
                    {selectedRelatedLetters.length > 0 && (
                      <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
                        {selectedRelatedLetters.map((letter) => {
                          const id = letterIdOf(letter);
                          return (
                            <span key={id} className="inline-flex h-10 max-w-[220px] items-center gap-2 rounded-xl border border-black/10 bg-white px-3 dark:border-white/10 dark:bg-white/5">
                              <button
                                type="button"
                                onClick={() => setForm((prev) => ({ ...prev, relatedLetterIds: (prev.relatedLetterIds || []).filter((x) => String(x) !== String(id)) }))}
                                className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                                aria-label="حذف سند مرتبط"
                                title="حذف سند مرتبط"
                              >
                                ×
                              </button>
                              <span dir="ltr" className="truncate font-sans font-semibold tabular-nums">
                                {toFaDigits(letterNoOf(letter) || id)}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className={labelCls}>بارگذاری</div>
                  <button
                    type="button"
                    onClick={() => setUploadOpen(true)}
                    disabled={uploading}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
                    title="بارگذاری"
                    aria-label="بارگذاری"
                  >
                    <img src="/images/icons/Uplod.svg" alt="" className="h-5 w-5 dark:invert" />
                  </button>
                </div>
                </div>
                <div className="flex flex-col gap-3 border-t border-black/[0.07] pt-4 sm:flex-row sm:items-end sm:justify-end md:col-span-2 dark:border-white/10">
                <Field label="ارسال درخواست تامین به" required={!!createRecipients.targetRoleKey} className="w-full sm:w-[20rem]">
                    <select
                      value={form.targetAssigneeUserId}
                      onChange={(event) => setField("targetAssigneeUserId", event.target.value)}
                      disabled={createRecipientsLoading || !createRecipients.targetRoleKey}
                      className={inputCls}
                    >
                      <option value="">
                        {createRecipientsLoading
                          ? "در حال دریافت..."
                          : createRecipients.targetRoleKey
                            ? "انتخاب کنید"
                            : "ارسال مستقیم برای اقدام"}
                      </option>
                      {createRecipients.users.map((recipient) => (
                        <option key={recipient.id} value={recipient.id}>
                          {recipient.name || recipient.username || recipient.email || `کاربر #${recipient.id}`}
                        </option>
                      ))}
                    </select>
                </Field>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-900 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-md disabled:translate-y-0 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-white/90"
                  title="ثبت"
                  aria-label="ثبت"
                >
                  <img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" />
                </button>
                </div>
              </div>
            </form>
          )}

          {err && <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{err}</div>}
          {ok && <div className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{ok}</div>}

          <div className={tableWrapCls}>
            <div className="hidden overflow-x-auto md:block" dir="ltr">
              <table dir="rtl" className="w-full min-w-[860px] table-fixed text-sm [&_td]:py-1.5 [&_td]:text-center [&_th]:py-2 [&_th]:text-center">
                <colgroup>
                  <col style={{ width: 40 }} />
                  <col style={{ width: 16 }} />
                  <col style={{ width: 130 }} />
                  <col style={{ width: 120 }} />
                  <col style={{ width: 180 }} />
                  <col />
                  <col style={{ width: 130 }} />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 132 }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-white/10 dark:text-neutral-100">
                    <th><input type="checkbox" className="h-4 w-4 accent-black dark:accent-white" checked={allPageItemsSelected} onChange={toggleAllPageItems} aria-label="انتخاب همه" /></th>
                    <th aria-label="خوانده‌نشده" />
                    <th>شماره</th>
                    <th>تاریخ</th>
                    <th>پروژه</th>
                    <th>موضوع</th>
                    <th>درخواست‌کننده</th>
                    <th>آخرین وضعیت</th>
                    <th className="relative">
                      <span>اقدامات</span>
                      <div ref={tableMenuRef} className="absolute left-1 top-1/2 z-30 -translate-y-1/2">
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
                              {selectedIds.size ? `${toFaDigits(selectedIds.size)} مورد انتخاب شده` : "ابتدا موارد موردنظر را انتخاب کنید"}
                            </div>
                            <button
                              type="button"
                              disabled={!selectedIds.size}
                              onClick={() => setSelectedReadStatus(false)}
                              className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-emerald-500/10"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold">خوانده شده</span>
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={!selectedIds.size}
                              onClick={() => setSelectedReadStatus(true)}
                              className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-sky-500/10"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold">خوانده نشده</span>
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={!selectedIds.size || deletingSelected}
                              onClick={deleteSelectedRequests}
                              className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45 dark:text-red-300 dark:hover:bg-red-500/10"
                            >
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-100 transition group-hover:scale-105 dark:bg-red-500/15"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" /></span>
                              <span className="min-w-0 flex-1 text-sm font-semibold">{deletingSelected ? "در حال حذف..." : "حذف موارد انتخاب‌شده"}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-black/60 dark:text-neutral-400">در حال دریافت...</td>
                    </tr>
                  ) : pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-black/60 dark:text-neutral-400">هنوز درخواست تامینی ثبت نشده است.</td>
                    </tr>
                  ) : (
                    pageItems.map((item) => (
                      <tr key={item.id} className="group bg-black/[0.02] transition-colors hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10">
                        <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><input type="checkbox" className="h-4 w-4 accent-black dark:accent-white" checked={selectedIds.has(String(item.id))} onChange={() => toggleSelected(item.id)} aria-label={`انتخاب درخواست ${item.serial || item.id}`} /></td>
                        <td className="border-b border-neutral-300 px-0 dark:border-neutral-700">{isUnreadForUser(item) && <span className="mx-auto block h-2 w-2 rounded-full bg-sky-500 ring-2 ring-sky-100 dark:ring-sky-500/25" title="درخواست خوانده‌نشده" aria-label="درخواست خوانده‌نشده" />}</td>
                        <td dir="ltr" className="border-b border-neutral-300 px-3 font-sans tabular-nums dark:border-neutral-700">
                          <button type="button" onClick={() => openPreview(item)} className="mx-auto inline-flex underline-offset-4 transition hover:underline" title="نمایش درخواست">
                            {item.serial || "—"}
                          </button>
                        </td>
                        <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFaDigits(String(item.dateJalali || item.dateFa || "—").replaceAll("-", "/"))}</td>
                        <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="mx-auto block truncate">{itemProjectLabel(item, projects)}</span></td>
                        <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="mx-auto block truncate">{item.title || "—"}</span></td>
                        <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="mx-auto block truncate">{item.createdByName || `کاربر #${toFaDigits(item.createdById)}`}</span></td>
                        <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><StatusBadge status={displayStatusOf(item)} /></td>
                        <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">
                          <div className="flex min-h-9 items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                            <button type="button" onClick={() => openPreview(item)} className="grid h-[34px] w-[34px] place-items-center rounded-lg transition hover:bg-black/[0.04] dark:hover:bg-white/10" aria-label={item.canAct ? "اقدامات" : "نمایش"} title={item.canAct ? "اقدامات" : "نمایش"}>
                              <img src="/images/icons/list.svg" alt="" className="h-4 w-4 dark:invert" />
                            </button>
                            {Number(item.createdById) === Number(user?.id) && <button type="button" onClick={() => openPreview({ ...item, __editing: true })} className="grid h-[34px] w-[34px] place-items-center rounded-lg transition hover:bg-black/[0.04] dark:hover:bg-white/10" aria-label="ویرایش درخواست" title="ویرایش درخواست"><img src="/images/icons/pencil.svg" alt="" className="h-4 w-4 dark:invert" /></button>}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-3 md:hidden">
              {loading ? (
                <div className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">در حال دریافت...</div>
              ) : pageItems.length === 0 ? (
                <div className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">هنوز درخواست تامینی ثبت نشده است.</div>
              ) : (
                pageItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                    <div className="flex items-center justify-between gap-2">
                      <b dir="ltr" className="font-sans tabular-nums">{item.serial || "—"}</b>
                      <StatusBadge status={displayStatusOf(item)} />
                    </div>
                    <div className="mt-2 truncate text-sm">{item.title || "—"}</div>
                    <div className="mt-2 text-xs text-neutral-500">{toFaDigits(String(item.dateJalali || item.dateFa || "—").replaceAll("-", "/"))}</div>
                    <button type="button" onClick={() => openPreview(item)} className="mt-3 grid h-9 w-9 place-items-center rounded-lg border border-black/10 dark:border-white/10" aria-label={item.canAct ? "اقدامات" : "نمایش"} title={item.canAct ? "اقدامات" : "نمایش"}>
                      <img src="/images/icons/list.svg" alt="" className="h-4 w-4 dark:invert" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-neutral-300 px-3 py-2 dark:border-neutral-800">
              <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center justify-between gap-2 text-sm md:justify-start">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPage((old) => Math.max(0, old - 1))} disabled={safePage <= 0} className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white transition hover:bg-black/[0.04] disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" aria-label="صفحه قبل">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                    <button type="button" onClick={() => setPage((old) => Math.min(pageCount - 1, old + 1))} disabled={safePage >= pageCount - 1} className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white transition hover:bg-black/[0.04] disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" aria-label="صفحه بعد">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                  </div>
                  <div className="whitespace-nowrap text-black/70 dark:text-neutral-400">
                    {total === 0 ? "۰ از ۰" : `${toFaDigits(startIndex + 1)}–${toFaDigits(endIndex)} از ${toFaDigits(total)}`}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-sm md:justify-start">
                  <span className="text-black/70 dark:text-neutral-400">تعداد در هر صفحه:</span>
                  <div className="inline-flex h-9 overflow-hidden rounded-lg border border-black/10 bg-white dark:border-white/15 dark:bg-white/5">
                    {[10, 25, 100].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setRowsPerPage(count)}
                        className={`min-w-10 px-3 text-sm font-semibold transition ${rowsPerPage === count ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-700 hover:bg-black/[0.04] dark:text-white/75 dark:hover:bg-white/10"}`}
                      >
                        {toFaDigits(count)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      {selected && (
        <SupplyRequestPreview
          item={selected}
          projects={projects}
          letters={letters}
          actionNote={actionNote}
          setActionNote={setActionNote}
          actionBusy={actionBusy}
          actionError={actionError}
          onAction={recordWorkflowAction}
          onEdit={saveOwnRequestEdit}
          onSupplyActionsChanged={loadItems}
          onClose={() => {
            setSelected(null);
            if (requestedRequestId) {
              openedRequestRef.current = "";
              setSearchParams({}, { replace: true });
            }
          }}
        />
      )}
      {submitNotice && <RegistrationNotice info={submitNotice} onClose={() => setSubmitNotice(null)} />}
      {relatedPickOpen && (
        <RelatedLettersPicker
          query={relatedPickQuery}
          setQuery={setRelatedPickQuery}
          letters={relatedPickList}
          selectedIds={relatedPickIds}
          setSelectedIds={setRelatedPickIds}
          onClose={() => setRelatedPickOpen(false)}
          onConfirm={() => {
            const clean = (Array.isArray(relatedPickIds) ? relatedPickIds : []).map((id) => String(id).trim()).filter(Boolean);
            setForm((prev) => ({ ...prev, relatedLetterIds: clean }));
            setRelatedDocsOpen(false);
            setRelatedPickOpen(false);
          }}
        />
      )}
      {uploadOpen && (
        <SupplyUploadModal
          fileRef={fileRef}
          files={form.attachments}
          uploading={uploading}
          onUpload={uploadFiles}
          onRemove={(index) => setForm((prev) => ({ ...prev, attachments: (prev.attachments || []).filter((_, i) => i !== index) }))}
          onClose={() => setUploadOpen(false)}
        />
      )}
    </div>
  );
}

function SupplyRequestEditForm({ item, projects, busy, error, onSave, onCancel }) {
  const { user } = useAuth();
  const [form, setForm] = useState(() => ({
    projectId: String(item.projectId || ""),
    budgetCode: item.budgetCode || "",
    title: item.title || "",
    needDateJalali: item.needDateJalali || "",
    amount: formatMoney(item.amount || ""),
    description: item.description || "",
    attachments: Array.isArray(item.attachments) ? item.attachments : [],
  }));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true);
    setUploadError("");
    try {
      const uploaded = [];
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/upload/payment-doc", {
          method: "POST",
          credentials: "include",
          headers: user?.id != null ? { "x-user-id": String(user.id) } : {},
          body,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "upload_failed");
        uploaded.push(data.file || data);
      }
      setForm((current) => ({ ...current, attachments: [...current.attachments, ...uploaded] }));
    } catch {
      setUploadError("بارگذاری فایل انجام نشد.");
    } finally {
      setUploading(false);
    }
  };
  const removeAttachment = (index) => setForm((current) => ({ ...current, attachments: current.attachments.filter((_, itemIndex) => itemIndex !== index) }));

  return <form dir="rtl" onSubmit={async (event) => { event.preventDefault(); if (await onSave(item, form)) onCancel(); }} className="space-y-4 py-4">
        <div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold">ویرایش درخواست تامین</h2><button type="button" onClick={onCancel} disabled={busy} className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 transition hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/10" aria-label="انصراف"><img src="/images/icons/bastan.svg" alt="" className="h-4 w-4 dark:invert" /></button></div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="پروژه"><select className={inputCls} value={form.projectId} onChange={(event) => setField("projectId", event.target.value)}><option value="">انتخاب پروژه</option>{projects.map((project) => <option key={project.id} value={project.id}>{projectLabel(project)}</option>)}</select></Field>
          <Field label="کد بودجه"><input className={inputCls} value={form.budgetCode} onChange={(event) => setField("budgetCode", event.target.value)} /></Field>
          <Field label="موضوع"><input className={inputCls} value={form.title} onChange={(event) => setField("title", event.target.value)} /></Field>
          <Field label="برآورد هزینه"><input dir="ltr" inputMode="numeric" className={`${inputCls} text-left`} value={toFaDigits(form.amount)} onChange={(event) => setField("amount", formatMoney(event.target.value))} /></Field>
          <Field label="تاریخ نیاز"><JalaliPopupDatePicker value={form.needDateJalali} onChange={(value) => setField("needDateJalali", value)} /></Field>
          <Field label="پیوست‌ها"><div className="flex flex-wrap gap-2"><label className="grid h-11 w-11 cursor-pointer place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[0.04] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title={uploading ? "در حال بارگذاری" : "بارگذاری فایل"} aria-label={uploading ? "در حال بارگذاری" : "بارگذاری فایل"}><img src="/images/icons/Uplod.svg" alt="" className={`h-4 w-4 dark:invert ${uploading ? "animate-pulse opacity-60" : ""}`} /><input type="file" multiple accept="image/*,.pdf" className="hidden" disabled={uploading} onChange={(event) => uploadFiles(event.target.files)} /></label>{form.attachments.map((file, index) => <span key={file.id || file.serverId || file.url || index} className="inline-flex max-w-full items-center gap-1 rounded-lg border border-black/10 px-2 py-1 text-xs dark:border-white/10"><a href={file.url || "#"} target="_blank" rel="noreferrer" className="max-w-32 truncate hover:underline">{file.name || `فایل ${toFaDigits(index + 1)}`}</a><button type="button" onClick={() => removeAttachment(index)} disabled={uploading} className="grid h-5 w-5 place-items-center rounded hover:bg-black/[0.05] dark:hover:bg-white/10" title="حذف پیوست" aria-label="حذف پیوست">×</button></span>)}</div></Field>
          <div className="md:col-span-2"><Field label="شرح"><textarea className={`${inputCls} min-h-24 py-3`} value={form.description} onChange={(event) => setField("description", event.target.value)} /></Field></div>
        </div>
        {(error || uploadError) && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{uploadError || error}</div>}
        <div className="flex justify-end"><button type="submit" disabled={busy || uploading} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white disabled:opacity-50 dark:bg-white dark:text-black" title="ذخیره" aria-label="ذخیره"><img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" /></button></div>
      </form>;
}

export function SupplyRequestPreview({ item, projects, letters = [], actionNote, setActionNote, actionBusy, actionError, onAction, onEdit, onSupplyActionsChanged, onClose }) {
  const { user } = useAuth();
  const project = projects.find((row) => String(row.id) === String(item.projectId));
  const attachments = Array.isArray(item.attachments) ? item.attachments : [];
  const history = Array.isArray(item.historyJson) ? item.historyJson : [];
  const isRequester = Number(item.createdById) === Number(user?.id);
  const [isEditing, setIsEditing] = useState(!!item.__editing);
  const [commercialActions, setCommercialActions] = useState([]);
  const [commercialActionsLoading, setCommercialActionsLoading] = useState(false);
  const isCompletedCommercialOwner =
    !item.currentStepRoleKey &&
    ["approved", "rejected"].includes(item.status) &&
    Number(item.currentAssigneeUserId) === Number(user?.id) &&
    Number(item.createdById) !== Number(user?.id);
  const stepKey = item.currentStepRoleKey || (isCompletedCommercialOwner ? "commercial" : "");
  const canAct = item.canAct === true || isCompletedCommercialOwner;
  const latestAction = [...history].reverse().find((entry) => ["approved", "returned", "rejected"].includes(entry?.type));
  const canResubmitReturned = stepKey === "requester" && latestAction?.type === "returned" && canAct;
  const meta = item.workflowMeta || {};
  const [choice, setChoice] = useState("");
  const [budgetCodeDraft, setBudgetCodeDraft] = useState(item.budgetCode || "");
  const [actionBudgetItems, setActionBudgetItems] = useState([]);
  const [finalAmount, setFinalAmount] = useState(formatMoney(meta.finalAmount ?? item.amount ?? ""));
  const [deadlineDate, setDeadlineDate] = useState(meta.deadlineDate || "");
  const [ccOpen, setCcOpen] = useState(false);
  const [ccUsers, setCcUsers] = useState([]);
  const [ccLoading, setCcLoading] = useState(false);
  const [ccUserIds, setCcUserIds] = useState(Array.isArray(item.ccUserIds) ? item.ccUserIds.map(String) : []);
  const [nextRecipients, setNextRecipients] = useState({ targetRoleKey: null, users: [] });
  const [nextRecipientsLoading, setNextRecipientsLoading] = useState(false);
  const [targetAssigneeUserId, setTargetAssigneeUserId] = useState("");

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  useEffect(() => {
    setIsEditing(!!item.__editing);
    setChoice("");
    setBudgetCodeDraft(item.budgetCode || "");
    setFinalAmount(formatMoney(item.workflowMeta?.finalAmount ?? item.amount ?? ""));
    setDeadlineDate(item.workflowMeta?.deadlineDate || "");
    setCcUserIds(Array.isArray(item.ccUserIds) ? item.ccUserIds.map(String) : []);
    setTargetAssigneeUserId("");
  }, [item.id, item.budgetCode, item.amount, item.workflowMeta, item.ccUserIds, item.__editing]);

  useEffect(() => {
    let cancelled = false;
    if (!item.projectId) return undefined;
    fetch(`/api/cost-breakdown?project_id=${encodeURIComponent(item.projectId)}`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((data) => {
        if (cancelled) return;
        const projectCode = normalizeBudgetCode(project?.code || item.projectCode || "");
        const byCode = new Map();
        (Array.isArray(data?.items) ? data.items : []).forEach((budgetItem) => {
          const code = budgetCodeForProject(budgetItem?.budgetCode ?? budgetItem?.budget_code ?? budgetItem?.code, projectCode);
          if (!code) return;
          byCode.set(code, { ...budgetItem, code });
        });
        if (item.budgetCode && !byCode.has(item.budgetCode)) byCode.set(item.budgetCode, { code: item.budgetCode });
        setActionBudgetItems(Array.from(byCode.values()).sort((a, b) => String(a.code).localeCompare(String(b.code), "fa", { numeric: true })));
      })
      .catch(() => { if (!cancelled) setActionBudgetItems(item.budgetCode ? [{ code: item.budgetCode }] : []); });
    return () => { cancelled = true; };
  }, [item.budgetCode, item.projectId, item.projectCode, project?.code]);

  useEffect(() => {
    if (!canAct) return undefined;
    let cancelled = false;
    setNextRecipientsLoading(true);
    fetch(`/api/supply-requests?nextRecipientsForItem=${encodeURIComponent(item.id)}`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : { targetRoleKey: null, users: [] }))
      .then((data) => {
        if (cancelled) return;
        const users = Array.isArray(data?.users) ? data.users : [];
        setNextRecipients({ targetRoleKey: data?.targetRoleKey || null, users });
        setTargetAssigneeUserId(users.length === 1 ? String(users[0].id) : "");
      })
      .catch(() => {
        if (!cancelled) setNextRecipients({ targetRoleKey: null, users: [] });
      })
      .finally(() => {
        if (!cancelled) setNextRecipientsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canAct, item.id]);

  useEffect(() => {
    if (!item?.id) {
      setCommercialActions([]);
      return undefined;
    }
    let cancelled = false;
    setCommercialActionsLoading(true);
    fetch(`/api/supply-actions?requestId=${encodeURIComponent(item.id)}`, {
      credentials: "include",
      headers: user?.id != null ? { "x-user-id": String(user.id) } : {},
    })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((data) => {
        if (!cancelled) setCommercialActions(Array.isArray(data?.items?.[0]?.actions) ? data.items[0].actions : []);
      })
      .catch(() => { if (!cancelled) setCommercialActions([]); })
      .finally(() => { if (!cancelled) setCommercialActionsLoading(false); });
    return () => { cancelled = true; };
  }, [item?.id, user?.id]);

  useEffect(() => {
    if (!ccOpen || ccUsers.length || ccLoading) return undefined;
    let cancelled = false;
    setCcLoading(true);
    fetch("/api/supply-requests?users=1", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : { users: [] }))
      .then((data) => {
        if (!cancelled) setCcUsers(Array.isArray(data?.users) ? data.users : []);
      })
      .catch(() => {
        if (!cancelled) setCcUsers([]);
      })
      .finally(() => {
        if (!cancelled) setCcLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ccLoading, ccOpen, ccUsers.length]);

  const submitSelectedAction = () => {
    if (!choice || actionBusy) return;
    const payload =
      stepKey === "project_manager"
          ? {
              finalAmount: parseMoney(finalAmount),
              budgetCode: budgetCodeDraft,
            }
          : {};
    onAction(choice, choice === "approve" ? { ...payload, targetAssigneeUserId: targetAssigneeUserId || null } : payload);
  };

  const targetRequired = choice === "approve" && !!nextRecipients.targetRoleKey;
  const budgetLabelCls = "flex min-h-[34px] items-end text-[11px] leading-4";
  const reviewSectionTitle =
    stepKey === "project_manager"
      ? "بررسی نهایی(مدیر پروژه)"
      : stepKey === "commercial"
          ? "اقدامات تامین"
          : `بررسی (${STEP_LABELS[stepKey] || "مرحله جاری"})`;
  const noteRequired = ["return", "reject"].includes(choice);
  const actionSubmitDisabled =
    !choice ||
        (noteRequired && !actionNote.trim()) ||
    (choice === "approve" &&
      ((stepKey === "project_manager" && (parseMoney(finalAmount) <= 0 || !budgetCodeDraft || !targetAssigneeUserId)) ||
        (targetRequired && !targetAssigneeUserId)));

  const toggleCcUser = (id) => {
    const sid = String(id);
    setCcUserIds((prev) => (prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]));
  };

  const openPdfPreview = () => {
    const value = (content, fallback = "—") => escapeSupplyPdfHtml(String(content ?? "").trim() || fallback);
    const amount = (content) => {
      const number = Number(content || 0);
      return number > 0 ? `${toFaDigits(number.toLocaleString("en-US"))} ریال` : "—";
    };
    const projectName = project ? projectLabel(project) : item.projectName || item.projectCode || "—";
    const currentStage = SUPPLY_WORKFLOW_STEPS.find((step) => step.key === item.currentStepRoleKey);
    const currentStatus = statusLabels[displayStatusOf(item)] || "—";
    const printDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const printTime = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
    const actionStatus = (status) => ({ in_progress: "در حال اقدام", done: "انجام شد", canceled: "لغو شد" })[status] || "—";
    const workflowKind = (kind) => ({ active: "در حال بررسی", completed: "تکمیل شده", waiting: "در انتظار", returned: "برگشت داده شده", rejected: "رد شده" })[kind] || "—";
    const historyType = (type) => ({ created: "ثبت درخواست", step_set: "ارسال به مرحله", step_clear: "پایان مرحله", approved: "تایید", returned: "برگشت", rejected: "رد" })[type] || type || "—";
    const actionRows = [...commercialActions]
      .filter((action) => !action?.isNew)
      .sort((a, b) => String(a?.createdAt || a?.date || "").localeCompare(String(b?.createdAt || b?.date || "")))
      .map((action, index) => {
        const fileNames = (Array.isArray(action.files) ? action.files : []).map((file) => file.name || file.originalName || file.filename).filter(Boolean).join("، ");
        return `<tr><td>${value(toFaDigits(index + 1))}</td><td>${value(toFaDigits(String(action.date || "—").replaceAll("-", "/")))}</td><td>${value(toFaDigits(action.time || "—"))}</td><td>${value(action.description || "بدون توضیح")}</td><td><span class="status status-${value(action.status, "in_progress")}">${value(actionStatus(action.status))}</span></td><td>${value(fileNames)}</td></tr>`;
      }).join("");
    const workflowRows = SUPPLY_WORKFLOW_STEPS.map((step, index) => {
      const state = workflowStageState(step, history, item);
      const actor = state.entry
        ? (state.entry.type === "step_set" ? item.currentAssigneeName || "مسئول مرحله" : historyActorName(state.entry, item))
        : "—";
      const dateTime = state.entry ? `${formatHistoryDate(state.entry.at, state.entry)} - ${formatHistoryTime(state.entry.at, state.entry)}` : "—";
      return `<tr><td>${value(toFaDigits(index + 1))}</td><td>${value(step.label)}</td><td><span class="status status-${value(state.kind)}">${value(workflowKind(state.kind))}</span></td><td>${value(actor)}</td><td>${value(dateTime)}</td></tr>`;
    }).join("");
    const historyRows = history.map((entry, index) => {
      const role = STEP_LABELS[entry?.roleKey] || entry?.roleName || "—";
      return `<tr><td>${value(toFaDigits(index + 1))}</td><td>${value(historyType(entry?.type || entry?.status))}</td><td>${value(role)}</td><td>${value(historyActorName(entry, item))}</td><td>${value(`${formatHistoryDate(entry?.at, entry)} - ${formatHistoryTime(entry?.at, entry)}`)}</td><td>${value(entry?.note || entry?.description)}</td></tr>`;
    }).join("");
    const requestFiles = attachments.map((file) => ({ ...file, sourceLabel: "پیوست درخواست" }));
    const actionFiles = commercialActions.flatMap((action, actionIndex) => (Array.isArray(action?.files) ? action.files : []).map((file) => ({ ...file, sourceLabel: `پیوست اقدام ${toFaDigits(actionIndex + 1)}` })));
    const allFiles = [...requestFiles, ...actionFiles];
    const attachmentList = allFiles.map((file, index) => `<li><span class="number">${value(toFaDigits(index + 1))}</span><strong>${value(file.name || file.originalName || file.filename || `فایل ${toFaDigits(index + 1)}`)}</strong><span>${value(file.sourceLabel)}</span></li>`).join("");
    const attachmentPreviewPages = allFiles.map((file, index) => {
      const name = file.name || file.originalName || file.filename || `فایل ${toFaDigits(index + 1)}`;
      const rawUrl = String(file.url || file.path || "");
      let url = "";
      try { url = rawUrl ? new URL(rawUrl, window.location.origin).href : ""; } catch { url = rawUrl; }
      const type = String(file.type || file.mimeType || file.mime_type || "").toLowerCase();
      const isImage = type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg)(?:\?|#|$)/i.test(rawUrl);
      const isPdf = type.includes("pdf") || /\.pdf(?:\?|#|$)/i.test(rawUrl) || /\.pdf$/i.test(name);
      const preview = !url
        ? `<div class="no-preview">آدرس فایل برای پیش‌نمایش در دسترس نیست.</div>`
        : isImage
          ? `<img class="attachment-image" src="${value(url, "")}" alt="${value(name)}" />`
          : isPdf
            ? `<object class="attachment-pdf" data="${value(url, "")}#view=FitH&toolbar=1" type="application/pdf"><iframe title="${value(name)}" src="${value(url, "")}#view=FitH&toolbar=1"></iframe></object><a class="original-file" href="${value(url, "")}" target="_blank" rel="noreferrer">باز کردن فایل PDF اصلی</a>`
            : `<div class="no-preview">پیش‌نمایش این نوع فایل در مرورگر پشتیبانی نمی‌شود.</div><a class="original-file" href="${value(url, "")}" target="_blank" rel="noreferrer">باز کردن فایل اصلی</a>`;
      return `<article class="sheet attachment-page"><div class="attachment-header"><span>${value(file.sourceLabel)}</span><strong>${value(name)}</strong></div><div class="attachment-body">${preview}</div><footer class="footer"><span>سامانه فرآیندهای یکپارچه شرکت ایده پویان انرژی</span><span>پیوست ${value(toFaDigits(index + 1))}</span></footer></article>`;
    }).join("");
    const infoCard = (label, content, className = "") => `<div class="info-card ${className}"><div class="label">${value(label)}</div><div class="value">${value(content)}</div></div>`;
    const relatedLetterIds = Array.isArray(item.relatedLetterIds) ? item.relatedLetterIds : [];
    const relatedLetterMap = new Map((Array.isArray(letters) ? letters : []).map((letter) => [letterIdOf(letter), letter]));
    const relatedLetters = relatedLetterIds.length ? relatedLetterIds.map((id) => {
      const letter = relatedLetterMap.get(String(id));
      return letter ? `${toFaDigits(letterNoOf(letter) || id)}${subjectOf(letter) ? ` - ${subjectOf(letter)}` : ""}` : toFaDigits(id);
    }).join("، ") : "—";
    const relatedLetterRows = relatedLetterIds.map((id, index) => {
      const letter = relatedLetterMap.get(String(id));
      return `<tr><td>${value(toFaDigits(index + 1))}</td><td>${value(toFaDigits(letter ? letterNoOf(letter) || id : id))}</td><td>${value(letter ? toFaDigits(letterDateOf(letter)) : "—")}</td><td>${value(letter ? subjectOf(letter) : "—")}</td><td>${value(letter ? fromToOf(letter) : "—")}</td></tr>`;
    }).join("");
    const copiedUsers = Array.isArray(item.ccUserIds) && item.ccUserIds.length ? item.ccUserIds.map(toFaDigits).join("، ") : "—";
    const logoUrl = `${window.location.origin}/images/light%20mode.png`;
    const fontRegularUrl = `${window.location.origin}/fonts/Vazir.woff2`;
    const fontBoldUrl = `${window.location.origin}/fonts/Vazir-Bold.woff2`;
    const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>درخواست تامین ${value(item.serial, "")}</title><style>
@font-face{font-family:Vazir;src:url("${fontRegularUrl}") format("woff2");font-weight:400}@font-face{font-family:Vazir;src:url("${fontBoldUrl}") format("woff2");font-weight:700}@page{size:A4;margin:8mm}*{box-sizing:border-box}body{margin:0;background:#eef1f4;color:#16202a;font-family:Vazir,Tahoma,Arial,sans-serif;font-size:9.5px;line-height:1.55}.toolbar{position:sticky;top:0;z-index:20;display:flex;justify-content:center;gap:8px;padding:12px;background:rgba(238,241,244,.96);border-bottom:1px solid #d7dde3}.toolbar button{min-height:38px;border:1px solid #17212b;border-radius:9px;padding:0 16px;background:#17212b;color:#fff;font:700 12px Vazir;cursor:pointer}.toolbar .secondary{background:#fff;color:#17212b}.sheet{width:210mm;min-height:297mm;margin:14px auto;padding:8mm;background:#fff;box-shadow:0 10px 35px rgba(20,30,40,.12)}.header{display:grid;grid-template-columns:44mm 1fr 44mm;align-items:center;min-height:21mm;border:1.5px solid #182531;border-radius:11px;overflow:hidden}.logo{display:flex;height:100%;align-items:center;justify-content:center;padding:4px;border-left:1px solid #d5dbe0}.logo img{width:38mm;max-height:18mm;object-fit:contain}.title{text-align:center;padding:5px 10px}.title h1{margin:0;font-size:17px}.title p{margin:2px 0 0;color:#61707d;font-size:9px}.document-meta{height:100%;display:grid;align-content:center;gap:3px;padding:5px 8px;border-right:1px solid #d5dbe0}.document-meta div{display:flex;justify-content:space-between;gap:6px}.document-meta span,.label{color:#6b7782}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:6px}.summary-card{padding:5px 8px;border-radius:8px;background:#f4f7f9;border:1px solid #dce3e8}.summary-card .value{margin-top:2px;font-size:11px;font-weight:700}section{margin-top:7px;break-inside:avoid}.section-title{display:flex;align-items:center;gap:6px;margin:0 0 4px;font-size:10.5px}.section-title:before{content:"";width:3px;height:14px;border-radius:4px;background:#1b6c91}.info-grid{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #d8e0e6;border-radius:11px;overflow:hidden}.info-card{min-height:38px;padding:4px 7px;border-left:1px solid #e1e6ea;border-bottom:1px solid #e1e6ea;break-inside:avoid}.info-card:nth-child(3n){border-left:0}.info-card.full{grid-column:1/-1;border-left:0}.label{font-size:9px;font-weight:700}.value{margin-top:1px;font-weight:700;overflow-wrap:anywhere;white-space:pre-wrap}table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid #d7dfe5;border-radius:11px;overflow:hidden}th,td{padding:4px 6px;text-align:right;vertical-align:top;border-bottom:1px solid #e3e8ec;border-left:1px solid #e3e8ec;overflow-wrap:anywhere}th{background:#eef3f6;font-size:9px}td{font-size:9px}tr:last-child td{border-bottom:0}th:last-child,td:last-child{border-left:0}.status{display:inline-block;white-space:nowrap;padding:2px 6px;border-radius:99px;background:#e8eef2;color:#354653;font-size:8.5px;font-weight:700}.status-active,.status-in_progress{background:#e1f1fa;color:#126087}.status-completed,.status-done{background:#e3f5ea;color:#15713a}.status-rejected,.status-canceled{background:#fde7e7;color:#a32929}.status-returned{background:#fff0d8;color:#965b00}.attachment-list{margin:5px 0 0;padding:0;list-style:none;border:1px solid #d9e0e5;border-radius:8px;overflow:hidden}.attachment-list li{display:grid;grid-template-columns:9mm 1fr 34mm;gap:6px;padding:4px 8px;border-bottom:1px solid #e4e8eb}.attachment-list li:last-child{border-bottom:0}.attachment-list .number{color:#1b6c91;font-weight:700}.attachment-page{break-before:page;page-break-before:always;display:flex;flex-direction:column}.attachment-header{display:grid;grid-template-columns:35mm 1fr;gap:10px;padding:8px 11px;border:1px solid #d6dee4;border-radius:11px;background:#f4f7f9}.attachment-header span{color:#1b6c91;font-weight:700}.attachment-body{display:flex;min-height:235mm;flex:1;flex-direction:column;align-items:center;justify-content:center;margin-top:9px;overflow:hidden;border:1px solid #d9e0e5;border-radius:11px;background:#fafbfc}.attachment-image{display:block;width:100%;max-height:235mm;object-fit:contain}.attachment-pdf,.attachment-pdf iframe{display:block;width:100%;min-height:225mm;border:0}.original-file{margin:8px;border-radius:8px;background:#17212b;color:#fff;padding:6px 12px;text-decoration:none;font-weight:700}.no-preview{padding:25px;color:#697680;text-align:center}.footer{display:flex;justify-content:space-between;margin-top:13px;padding-top:7px;border-top:1px solid #d9e0e5;color:#75818b;font-size:8.5px}@media print{body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.toolbar{display:none}.sheet{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}.original-file{display:none}}@media screen and (max-width:900px){.sheet{width:calc(100% - 20px);min-height:auto;padding:18px}.header,.summary,.info-grid{grid-template-columns:1fr}.logo,.document-meta{border:0;border-bottom:1px solid #d5dbe0}.info-card,.info-card:nth-child(3n){border-left:0}}
</style></head><body><div class="toolbar"><button onclick="window.print()">چاپ / ذخیره PDF</button><button class="secondary" onclick="window.close()">بستن پیش‌نمایش</button></div><article class="sheet"><header class="header"><div class="logo"><img src="${logoUrl}" alt="IPEC"/></div><div class="title"><h1>فرم درخواست تامین</h1><p>گزارش رسمی جزئیات، فرآیند و اقدامات درخواست</p></div><div class="document-meta"><div><span>شماره:</span><strong dir="ltr">${value(item.serial)}</strong></div><div><span>تاریخ:</span><strong>${value(toFaDigits(String(item.dateJalali || item.dateFa || "—").replaceAll("-", "/")))}</strong></div></div></header>
<div class="summary"><div class="summary-card"><div class="label">وضعیت فعلی</div><div class="value">${value(currentStatus)}</div></div><div class="summary-card"><div class="label">مرحله فعلی</div><div class="value">${value(currentStage?.label || (["done", "completed"].includes(displayStatusOf(item)) ? "فرآیند تکمیل شده" : "—"))}</div></div><div class="summary-card"><div class="label">تاریخ تهیه گزارش</div><div class="value">${value(printDate)} · ${value(printTime)}</div></div></div>
<section><h2 class="section-title">مشخصات درخواست</h2><div class="info-grid">${infoCard("درخواست‌کننده", item.createdByName || `کاربر #${toFaDigits(item.createdById)}`)}${infoCard("پروژه", projectName)}${infoCard("کد بودجه", item.budgetCode)}${infoCard("موضوع درخواست", item.title)}${infoCard("برآورد هزینه اولیه", amount(item.amount))}${infoCard("تاریخ نیاز", toFaDigits(String(item.needDateJalali || "—").replaceAll("-", "/")))}${infoCard("شرح درخواست", item.description, "full")}${infoCard("برآورد هزینه نهایی", amount(meta.finalAmount))}${infoCard("مهلت اقدام", toFaDigits(String(meta.deadlineDate || "—").replaceAll("-", "/")))}${infoCard("مسئول فعلی", item.currentAssigneeName)}${infoCard("اسناد مرتبط (شناسه)", relatedLetters)}${infoCard("رونوشت کاربران (شناسه)", copiedUsers)}${infoCard("شناسه سیستمی درخواست", toFaDigits(item.id))}</div></section>
<section><h2 class="section-title">فرآیند تامین</h2><table><thead><tr><th>ردیف</th><th>مرحله</th><th>وضعیت</th><th>انجام‌دهنده</th><th>تاریخ و ساعت</th></tr></thead><tbody>${workflowRows}</tbody></table></section>
<section><h2 class="section-title">سوابق کامل گردش درخواست</h2><table><thead><tr><th>ردیف</th><th>رویداد</th><th>مرحله</th><th>کاربر</th><th>تاریخ و ساعت</th><th>توضیح</th></tr></thead><tbody>${historyRows || '<tr><td colspan="6">سابقه‌ای ثبت نشده است.</td></tr>'}</tbody></table></section>
<section><h2 class="section-title">اقدامات انجام‌شده در واحد تامین</h2><table><thead><tr><th>ردیف</th><th>تاریخ</th><th>ساعت</th><th>شرح اقدام / توضیح</th><th>در حال اقدام</th><th>پیوست‌ها</th></tr></thead><tbody>${actionRows || '<tr><td colspan="6">هنوز اقدامی ثبت نشده است.</td></tr>'}</tbody></table></section>
<section><h2 class="section-title">اسناد مرتبط</h2><table><thead><tr><th>ردیف</th><th>شماره سند</th><th>تاریخ</th><th>موضوع</th><th>فرستنده / گیرنده</th></tr></thead><tbody>${relatedLetterRows || '<tr><td colspan="5">سند مرتبطی ثبت نشده است.</td></tr>'}</tbody></table></section>
<section><h2 class="section-title">پیوست‌ها و اسناد مرتبط</h2><div class="summary-card">تعداد کل پیوست‌ها: <strong>${value(toFaDigits(allFiles.length))}</strong></div>${allFiles.length ? `<ul class="attachment-list">${attachmentList}</ul>` : ""}</section><footer class="footer"><span>سامانه فرآیندهای یکپارچه شرکت ایده پویان انرژی</span><span>درخواست تامین ${value(item.serial)}</span></footer></article>${attachmentPreviewPages}</body></html>`;
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

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">
        <div dir="rtl" className="flex h-[min(88vh,760px)] w-[min(1180px,calc(100vw-20px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
            <div className="flex min-w-0 items-center gap-2">
              <div className="text-base font-bold md:text-lg">اقدامات تامین</div>
              <button type="button" onClick={openPdfPreview} className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/10 px-3 text-xs font-semibold transition hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/10" title="مشاهده PDF" aria-label="مشاهده PDF">
                <img src="/images/icons/print.svg" alt="" className="h-4 w-4 dark:invert" />
                <span>مشاهده PDF</span>
              </button>
            </div>
            <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white transition hover:bg-black/85 dark:bg-white dark:text-black" aria-label="بستن" title="بستن">
              <img src="/images/icons/bastan.svg" alt="" className="h-5 w-5 invert dark:invert-0" />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.55fr)]">
            <aside className="flex items-start border-b border-black/10 p-4 dark:border-white/10 lg:border-b-0 lg:border-l">
              <section className="w-full self-start overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
                <div className="shrink-0 border-b border-black/10 bg-neutral-50 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/5">فرآیند تامین</div>
                <div className="px-4">
                  {history.length ? (
                    <SupplyWorkflowTimeline history={history} item={item} />
                  ) : (
                    <div className="py-5 text-center text-sm text-neutral-500">سابقه‌ای ثبت نشده است.</div>
                  )}
                </div>
              </section>
            </aside>

            <main className="min-h-0 overflow-y-auto p-4 md:p-5">
              <div className="space-y-4">
                {isEditing && isRequester ? (
                  <PreviewSection title="ویرایش درخواست تامین">
                    <SupplyRequestEditForm item={item} projects={projects} busy={actionBusy} error={actionError} onSave={onEdit} onCancel={() => setIsEditing(false)} />
                  </PreviewSection>
                ) : <>
                <PreviewSection title="جزئیات درخواست تامین" flush>
                  <div className="grid grid-cols-1 divide-y divide-black/10 md:grid-cols-3 md:divide-x md:divide-y-0 dark:divide-white/10">
                    <PreviewRow compact label="شماره درخواست" value={item.serial || "—"} ltr />
                    <PreviewRow compact label="تاریخ درخواست" value={toFaDigits(String(item.dateJalali || item.dateFa || "—").replaceAll("-", "/"))} />
                    <PreviewRow compact label="درخواست کننده" value={item.createdByName || `کاربر #${toFaDigits(item.createdById)}`} />
                  </div>
                  <div className="grid grid-cols-1 divide-y divide-black/10 md:grid-cols-2 md:divide-x md:divide-y-0 dark:divide-white/10">
                    <PreviewRow compact label="پروژه" value={project ? projectLabel(project) : item.projectName || item.projectCode || "—"} />
                    <PreviewRow compact label="کد بودجه" value={item.budgetCode || "—"} />
                  </div>
                  <PreviewRow label="موضوع" value={item.title || "—"} />
                  <PreviewRow label="شرح" value={item.description || "—"} />
                  <div className="grid grid-cols-1 divide-y divide-black/10 md:grid-cols-3 md:divide-x md:divide-y-0 dark:divide-white/10">
                    <PreviewRow compact label="برآورد هزینه" value={toFaDigits(Number(item.amount || 0).toLocaleString("en-US"))} ltr />
                    <PreviewRow compact label="تاریخ نیاز" value={toFaDigits(String(item.needDateJalali || "—").replaceAll("-", "/"))} />
                    <PreviewRow compact label="پیوست‌ها" value={attachments.length ? <div className="flex flex-wrap justify-end gap-1.5">{attachments.map((file, index) => <a key={file.id || file.serverId || index} href={file.url || "#"} target="_blank" rel="noreferrer" className="max-w-full truncate rounded-lg border border-black/10 px-2 py-1 text-xs hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">{file.name || `فایل ${toFaDigits(index + 1)}`}</a>)}</div> : "—"} />
                  </div>
                </PreviewSection>

                {isRequester && <SupplyActionHistory actions={commercialActions} loading={commercialActionsLoading} />}

                {canAct ? (
                  stepKey === "project_manager" ? (
                    <>
                      <PreviewSection title={reviewSectionTitle}>
                        <div className="space-y-3 py-4">
                          <div className="grid items-end gap-3 md:grid-cols-[minmax(180px,240px)_1fr]">
                            <Field label="برآورد هزینه نهایی">
                              <div className="flex h-11 overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/15 dark:bg-white/5">
                                <input dir="ltr" inputMode="numeric" value={toFaDigits(finalAmount)} onChange={(event) => setFinalAmount(formatMoney(event.target.value))} className="min-w-0 flex-1 bg-transparent px-3 text-left text-sm outline-none" placeholder="۰" />
                                <span className="flex h-full shrink-0 items-center border-r border-black/10 px-3 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-300">ریال</span>
                              </div>
                            </Field>
                            <div>
                              <div className={labelCls}>الزامات تایید</div>
                              <div className="flex h-11 items-center rounded-xl border border-black/10 bg-neutral-50 px-3 text-sm text-neutral-500 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300">—</div>
                            </div>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label="کد بودجه" required labelClassName={budgetLabelCls}>
                              <select dir="ltr" value={budgetCodeDraft} onChange={(event) => setBudgetCodeDraft(event.target.value)} className={inputCls}>
                                <option value="">انتخاب کنید</option>
                                {actionBudgetItems.map((budgetItem) => {
                                  const code = normalizeBudgetCode(budgetItem.code ?? budgetItem.budgetCode ?? budgetItem.budget_code ?? budgetItem.center_code);
                                  const name = budgetItem.center_desc ?? budgetItem.last_desc ?? budgetItem.budgetName ?? budgetItem.budget_name ?? budgetItem.name ?? budgetItem.description ?? "";
                                  return <option key={budgetItem.id || code} value={code}>{code}{name ? ` - ${name}` : ""}</option>;
                                })}
                              </select>
                            </Field>
                            <ReadOnlyBox label="باقی مانده نقدینگی تخصیص یافته" value="—" ltr labelClassName={budgetLabelCls} />
                          </div>
                          <div className="grid gap-3 md:grid-cols-3">
                            <ActionOptionRow kind="approve" checked={choice === "approve"} onClick={() => setChoice("approve")} label="تایید درخواست تامین" disabled={actionBusy}>
                              <select value={targetAssigneeUserId} onClick={(event) => event.stopPropagation()} onChange={(event) => setTargetAssigneeUserId(event.target.value)} disabled={choice !== "approve" || actionBusy || nextRecipientsLoading || nextRecipients.targetRoleKey !== "commercial"} className={`${inputCls} mt-2 h-9 text-center text-xs`}>
                                <option value="">{nextRecipientsLoading ? "در حال دریافت..." : "انتخاب کاربر"}</option>
                                {nextRecipients.users.map((user) => <option key={user.id} value={user.id}>{user.name || user.username || user.email || `کاربر #${user.id}`}</option>)}
                              </select>
                            </ActionOptionRow>
                            <ActionOptionRow kind="return" checked={choice === "return"} onClick={() => setChoice("return")} label="برگشت درخواست تامین" disabled={actionBusy} noteValue={actionNote} onNoteChange={setActionNote} showNote />
                            <ActionOptionRow kind="reject" checked={choice === "reject"} onClick={() => setChoice("reject")} label="رد درخواست تامین" disabled={actionBusy} noteValue={actionNote} onNoteChange={setActionNote} showNote />
                          </div>
                          <div className="flex justify-end pt-2">
                            <ActionFooter actionBusy={actionBusy} actionError={actionError} disabled={actionSubmitDisabled} onSubmit={submitSelectedAction} />
                          </div>
                        </div>
                      </PreviewSection>
                    </>
                  ) : stepKey === "commercial" ? (
                    <PreviewSection title={reviewSectionTitle}>
                      <SupplyActionsPanel requestId={item.id} onChanged={(nextItem) => {
                        setCommercialActions(Array.isArray(nextItem?.actions) ? nextItem.actions : []);
                        onSupplyActionsChanged?.(nextItem);
                      }} />
                    </PreviewSection>
                  ) : canResubmitReturned ? (
                    <PreviewSection title="ارسال مجدد درخواست">
                      <div className="space-y-3 py-4">
                        <textarea value={actionNote} onChange={(event) => setActionNote(event.target.value)} className={`${inputCls} min-h-24 py-3`} placeholder="توضیح اصلاحات..." />
                        <TargetAssigneePicker
                          targetRoleKey={nextRecipients.targetRoleKey}
                          users={nextRecipients.users}
                          loading={nextRecipientsLoading}
                          value={targetAssigneeUserId}
                          onChange={setTargetAssigneeUserId}
                        />
                        <ActionFooter actionBusy={actionBusy} actionError={actionError} disabled={!!nextRecipients.targetRoleKey && !targetAssigneeUserId} onSubmit={() => onAction("approve", { targetAssigneeUserId: targetAssigneeUserId || null })} />
                      </div>
                    </PreviewSection>
                  ) : (
                    <div className="rounded-2xl border border-black/10 p-4 text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
                      در این مرحله اقدامی برای شما فعال نیست.
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-black/10 p-4 text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
                    در این مرحله اقدامی برای شما فعال نیست.
                  </div>
                )}
                </>}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function fileNameOf(file, index) {
  return file?.name || file?.originalName || file?.filename || `فایل ${toFaDigits(index + 1)}`;
}

function formatBytes(value) {
  const size = Number(value || 0);
  if (!size) return "";
  if (size < 1024) return `${toFaDigits(size)} بایت`;
  if (size < 1024 * 1024) return `${toFaDigits((size / 1024).toFixed(size >= 10240 ? 0 : 1))} KB`;
  return `${toFaDigits((size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1))} MB`;
}

function SupplyUploadModal({ fileRef, files, uploading, onUpload, onRemove, onClose }) {
  const list = Array.isArray(files) ? files : [];
  const handleDrop = async (event) => {
    event.preventDefault();
    const dropped = event.dataTransfer?.files;
    if (dropped?.length) await onUpload(dropped);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
        <div
          dir="rtl"
          className="flex max-h-[calc(100dvh-16px)] w-[min(720px,calc(100vw-16px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-xl dark:border-white/10 dark:bg-neutral-900 dark:text-white sm:max-h-[calc(100dvh-32px)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 p-3 sm:p-4">
            <div className="min-w-0 truncate text-sm font-bold leading-6">بارگذاری اسناد (درخواست تامین)</div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white ring-1 ring-black/15 transition hover:bg-black/90"
              aria-label="بستن"
              title="بستن"
            >
              <img src="/images/icons/bastan.svg" alt="" className="h-4 w-4 invert" />
            </button>
          </div>

          <div className="h-px bg-black/10 dark:bg-white/10" />

          <div className="grid grid-cols-1 gap-4 overflow-y-auto overscroll-contain p-3 sm:p-4">
            <div>
              <div className={labelCls}>فایل‌های انتخاب‌شده</div>
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/5">
                <div className="border-b border-black/10 px-3 py-2 text-xs font-semibold text-neutral-700 dark:border-white/10 dark:text-white/80">
                  درخواست تامین
                </div>

                <div className="space-y-2 p-2 sm:p-3">
                  {list.length === 0 ? (
                    <div className="py-6 text-center text-sm text-black/60 dark:text-white/50">فایلی انتخاب نشده است.</div>
                  ) : (
                    list.map((file, index) => (
                      <div key={file.id || file.serverId || file.url || `${fileNameOf(file, index)}_${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold leading-6">{fileNameOf(file, index)}</div>
                          {formatBytes(file.size) ? <div className="mt-1 text-[11px] text-neutral-600 dark:text-white/60">{formatBytes(file.size)}</div> : null}
                        </div>
                        {file.url ? (
                          <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center justify-center rounded-lg border border-black/10 px-3 text-xs transition hover:bg-black/[0.03] dark:border-white/15 dark:hover:bg-white/10">
                            باز کردن
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onRemove(index)}
                          className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-red-50 dark:hover:bg-red-500/10"
                          title="حذف"
                          aria-label="حذف"
                        >
                          <img src="/images/icons/hazf.svg" alt="" className="h-5 w-5" style={{ filter: "brightness(0) saturate(100%) invert(25%) sepia(95%) saturate(4870%) hue-rotate(355deg) brightness(95%) contrast(110%)" }} />
                        </button>
                      </div>
                    ))
                  )}

                  <div
                    className="mt-3 rounded-2xl border border-dashed border-black/15 bg-black/[0.01] px-4 py-7 text-center transition dark:border-white/15 dark:bg-white/[0.03]"
                    onDrop={handleDrop}
                    onDragOver={(event) => event.preventDefault()}
                  >
                    <div className="text-sm font-semibold text-neutral-800 dark:text-white/80">فایل را اینجا رها کنید</div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-white/50">هر نوع فایلی را می‌توانید انتخاب کنید</div>
                    <div className="mt-3 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-black/15 bg-black px-4 text-white transition hover:bg-black/90 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90"
                      >
                        <img src="/images/icons/upload.svg" alt="" className="h-5 w-5 invert dark:invert-0" />
                        {uploading ? "در حال بارگذاری..." : "انتخاب فایل"}
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                          onUpload(event.target.files);
                          event.target.value = "";
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-black text-white transition hover:bg-black/90 dark:border-white/15 dark:bg-white dark:text-black dark:hover:bg-white/90"
                      aria-label="تایید"
                      title="تایید"
                    >
                      <img src="/images/icons/check.svg" alt="" className="h-5 w-5 invert dark:invert-0" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PreviewSection({ title, children, flush = false }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="border-b border-black/[0.08] bg-gradient-to-l from-neutral-50 to-white px-4 py-3 text-sm font-semibold text-neutral-800 dark:border-white/10 dark:from-white/[0.07] dark:to-white/[0.03] dark:text-neutral-100">{title}</div>
      <div className={`divide-y divide-black/[0.06] bg-white dark:divide-white/[0.08] dark:bg-neutral-900 ${flush ? "" : "px-4"}`}>{children}</div>
    </section>
  );
}

function PreviewRow({ label, value, ltr, compact = false }) {
  return (
    <div className={`flex min-w-0 items-center ${compact ? "gap-1.5 px-3 py-3 text-xs" : "gap-2 px-4 py-3 text-sm"}`}>
      <div className={`font-medium text-neutral-500 dark:text-neutral-400 ${compact ? "whitespace-nowrap" : ""}`}>{label}:</div>
      <div dir={ltr ? "ltr" : "rtl"} className={`min-w-0 flex-1 break-words rounded-lg bg-neutral-50 px-2.5 py-2 font-medium text-neutral-800 dark:bg-white/[0.05] dark:text-neutral-100 ${ltr ? "text-left" : "text-right"}`}>{value}</div>
    </div>
  );
}

function ReadOnlyBox({ label, value, ltr, labelClassName }) {
  return (
    <Field label={label} labelClassName={labelClassName}>
      <div dir={ltr ? "ltr" : "rtl"} className={`${inputCls} flex items-center ${ltr ? "justify-end" : "justify-start"} bg-neutral-50 dark:bg-white/5`}>
        {value || "—"}
      </div>
    </Field>
  );
}

function ActionOptionRow({ kind, checked, disabled, onClick, label, showNote, noteValue, onNoteChange, children }) {
  const appearance = {
    approve: { icon: "✓", iconClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300", ring: "border-emerald-300 bg-emerald-50/50 shadow-[0_0_0_2px_rgba(52,211,153,.12)] dark:border-emerald-400/40 dark:bg-emerald-500/10", description: "تایید درخواست و ارسال به کارشناس تامین" },
    return: { icon: "↶", iconClass: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300", ring: "border-amber-200 bg-amber-50/30 dark:border-amber-500/25 dark:bg-amber-500/5", description: "برگشت به درخواست کننده جهت اصلاح" },
    reject: { icon: "×", iconClass: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300", ring: "border-rose-200 bg-rose-50/30 dark:border-rose-500/25 dark:bg-rose-500/5", description: "رد درخواست و پایان فرآیند" },
  }[kind] || {};
  return (
    <div role="button" tabIndex={disabled ? -1 : 0} onClick={() => !disabled && onClick()} onKeyDown={(event) => { if (!disabled && (event.key === "Enter" || event.key === " ")) onClick(); }} className={`relative min-h-[168px] cursor-pointer rounded-2xl border p-4 text-center transition ${checked ? appearance.ring : "border-black/10 bg-white hover:border-black/20 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20"} ${disabled ? "cursor-not-allowed opacity-55" : ""}`}>
      <div className={`mx-auto grid h-10 w-10 place-items-center rounded-full text-2xl font-bold ${appearance.iconClass}`}>{appearance.icon}</div>
      <div className="mt-2 text-sm font-bold text-neutral-800 dark:text-neutral-100">{label}</div>
      <p className="mt-1 min-h-8 text-[11px] leading-5 text-neutral-500 dark:text-neutral-400">{appearance.description}</p>
      {showNote && (
        <input
          value={checked ? noteValue : ""}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onNoteChange(event.target.value)}
          disabled={!checked || disabled}
          className={`${inputCls} mt-2 h-9 text-center text-xs disabled:bg-neutral-50 disabled:text-transparent disabled:placeholder:text-neutral-300 dark:disabled:bg-white/5 dark:disabled:placeholder:text-neutral-600`}
          placeholder={kind === "reject" ? "دلیل رد را وارد کنید..." : "دلیل برگشت را وارد کنید..."}
        />
      )}
      {children}
    </div>
  );
}

function TargetAssigneePicker({ targetRoleKey, users, loading, value, onChange, inline, disabled }) {
  if (!targetRoleKey && !loading) return null;
  if (inline) {
    return (
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">ارسال به</span>
        <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled || loading || !targetRoleKey} className={`${inputCls} h-9 max-w-[210px] disabled:bg-neutral-50 disabled:text-transparent disabled:placeholder:text-neutral-300 dark:disabled:bg-white/5`}>
          <option value="">{loading ? "در حال دریافت..." : "انتخاب کنید"}</option>
          {(Array.isArray(users) ? users : []).map((user) => (
            <option key={user.id} value={user.id}>
              {user.name || user.username || user.email || `کاربر #${user.id}`}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <Field label="ارسال درخواست تامین به">
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={loading || !targetRoleKey} className={inputCls}>
        <option value="">{loading ? "در حال دریافت..." : "انتخاب کنید"}</option>
        {(Array.isArray(users) ? users : []).map((user) => (
          <option key={user.id} value={user.id}>
            {user.name || user.username || user.email || `کاربر #${user.id}`}
          </option>
        ))}
      </select>
    </Field>
  );
}

function ActionFooter({ actionBusy, actionError, disabled, onSubmit }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <div className="text-xs text-red-600 dark:text-red-400">{actionError || ""}</div>
      <button type="button" onClick={onSubmit} disabled={disabled || actionBusy} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white transition hover:bg-black/85 disabled:opacity-50 dark:bg-white dark:text-black" title="ثبت" aria-label="ثبت">
        <img src="/images/icons/check.svg" alt="" className="h-5 w-5 invert dark:invert-0" />
      </button>
    </div>
  );
}

function historyActionText(value) {
  return ({ created: "ثبت شد", approved: "تایید شد", rejected: "رد شد", returned: "برگشت خورد" })[value] || "ثبت شد";
}

function historyActorName(entry, item) {
  return (
    entry?.actorName ||
    (Number(entry?.byUserId) === Number(item?.createdById) ? item?.createdByName : "") ||
    entry?.userName ||
    entry?.registrationInfo?.userName ||
    (entry?.byUserId ? `کاربر #${toFaDigits(entry.byUserId)}` : "کاربر")
  );
}

function historyClientInfo(entry) {
  return entry?.clientRegistrationInfo || entry?.registrationInfo || null;
}

function formatHistoryDate(value, entry) {
  const clientInfo = historyClientInfo(entry);
  if (clientInfo?.dateJalali || clientInfo?.date) return toFaDigits(normalizeDigits(String(clientInfo.dateJalali || clientInfo.date)).replaceAll("-", "/"));
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "numeric", day: "numeric" }).format(new Date(value));
  } catch {
    return "—";
  }
}

function formatHistoryTime(value, entry) {
  const clientInfo = historyClientInfo(entry);
  if (clientInfo?.time) return toFaDigits(normalizeDigits(String(clientInfo.time)));
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
  } catch {
    return "—";
  }
}

function historySentence(entry, item) {
  const actor = historyActorName(entry, item);
  const action = historyActionText(entry?.type || entry?.status);
  return `درخواست توسط ${actor} ${action}.`;
}

function SupplyActionHistory({ actions, loading }) {
  const rows = Array.isArray(actions) ? actions : [];
  const statusLabel = (status) => ({ done: "انجام شد", canceled: "لغو شد", in_progress: "در حال اقدام" })[status] || "در حال اقدام";
  const statusClass = (status) => status === "done"
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
    : status === "canceled"
      ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
      : "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300";
  return <PreviewSection title="اقدامات انجام‌شده در واحد تامین">
    {loading ? <div className="px-4 py-4 text-sm text-neutral-500">در حال دریافت اقدامات...</div> : rows.length === 0 ? <div className="px-4 py-4 text-sm text-neutral-500">هنوز اقدامی توسط واحد تامین ثبت نشده است.</div> : <div className="divide-y divide-black/10 dark:divide-white/10">
      {rows.map((action, index) => <div key={action.id || index} className="grid gap-2 px-4 py-3 md:grid-cols-[110px_90px_120px_minmax(0,1fr)] md:items-center">
        <div className="text-xs text-neutral-500">{toFaDigits(String(action.date || "—").replaceAll("-", "/"))}{action.time ? ` · ${toFaDigits(action.time)}` : ""}</div>
        <span className={`justify-self-start rounded-full px-2.5 py-1 text-xs ${statusClass(action.status)}`}>{statusLabel(action.status)}</span>
        <div className="min-w-0 text-sm text-neutral-700 dark:text-neutral-200">{action.description || "بدون توضیح"}</div>
        <div className="flex flex-wrap gap-1.5 md:justify-end">{(Array.isArray(action.files) ? action.files : []).map((file, fileIndex) => <a key={file.id || file.serverId || fileIndex} href={file.url || "#"} target="_blank" rel="noreferrer" className="max-w-full truncate rounded-lg border border-black/10 px-2 py-1 text-xs hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">{file.name || `فایل ${toFaDigits(fileIndex + 1)}`}</a>)}</div>
      </div>)}
    </div>}
  </PreviewSection>;
}

const SUPPLY_WORKFLOW_STEPS = [
  { key: "requester", label: "ثبت درخواست", emptyLabel: "ثبت درخواست" },
  { key: "project_manager", label: "بررسی نهایی (مدیریت پروژه)" },
  { key: "commercial", label: "ارسال به کارشناس (واحد تامین)" },
];

function latestEntryForStep(history, stepKey) {
  const entries = Array.isArray(history) ? history : [];
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (stepKey === "requester" && entry?.type === "created") return entry;
    if (entry?.roleKey === stepKey && ["approved", "returned", "rejected"].includes(entry?.type)) return entry;
  }
  return null;
}

function currentStepEntry(history, stepKey) {
  const entries = Array.isArray(history) ? history : [];
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry?.type === "step_clear") return null;
    if (entry?.type === "step_set" && entry?.roleKey === stepKey) return entry;
  }
  return null;
}

function workflowStageState(step, history, item) {
  const currentKey = item?.currentStepRoleKey || "";
  const action = latestEntryForStep(history, step.key);
  if (currentKey === step.key) return { kind: "active", entry: currentStepEntry(history, step.key) || action };
  if (action?.type === "rejected") return { kind: "rejected", entry: action };
  if (action?.type === "returned") return { kind: "returned", entry: action };
  if (action?.type === "approved" || action?.type === "created") return { kind: "completed", entry: action };
  if (step.key === "commercial" && !currentKey && item?.workflowStatus === "done") return { kind: "completed", entry: null };
  return { kind: "waiting", entry: null };
}

function workflowStageStyle(kind) {
  if (kind === "active") return {
    marker: "border-sky-500 bg-sky-500 text-white shadow-[0_0_0_5px_rgba(14,165,233,0.13)]",
    line: "bg-sky-200 dark:bg-sky-500/30",
    card: "bg-sky-50/90 dark:bg-sky-500/10",
    title: "text-sky-700 dark:text-sky-300",
  };
  if (kind === "completed") return {
    marker: "border-neutral-300 bg-white text-neutral-500 shadow-[0_0_0_4px_rgba(115,115,115,0.08)] dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300",
    line: "bg-neutral-200 dark:bg-white/10",
    card: "",
    title: "text-neutral-800 dark:text-neutral-100",
  };
  if (kind === "final_completed") return {
    marker: "border-emerald-500 bg-emerald-500 text-white shadow-[0_0_0_5px_rgba(16,185,129,0.13)]",
    line: "bg-emerald-200 dark:bg-emerald-500/25",
    card: "bg-emerald-50/80 dark:bg-emerald-500/10",
    title: "text-emerald-700 dark:text-emerald-300",
  };
  if (kind === "rejected") return {
    marker: "border-rose-500 bg-rose-500 text-white shadow-[0_0_0_4px_rgba(244,63,94,0.10)]",
    line: "bg-rose-200 dark:bg-rose-500/25",
    card: "bg-rose-50/80 dark:bg-rose-500/10",
    title: "text-rose-700 dark:text-rose-300",
  };
  if (kind === "returned") return {
    marker: "border-amber-500 bg-amber-500 text-white shadow-[0_0_0_4px_rgba(245,158,11,0.10)]",
    line: "bg-amber-200 dark:bg-amber-500/25",
    card: "bg-amber-50/80 dark:bg-amber-500/10",
    title: "text-amber-700 dark:text-amber-300",
  };
  return {
    marker: "border-neutral-300 bg-white text-neutral-400 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-500",
    line: "bg-neutral-200 dark:bg-white/10",
    card: "",
    title: "text-neutral-400 dark:text-neutral-500",
  };
}

function workflowStageMeta(stage, item, entry, state) {
  if (!entry) {
    if (stage.key === "commercial" && state?.kind === "active") return "در حال بررسی واحد تامین";
    if (stage.key === "commercial" && state?.kind === "completed") return "تأیید نهایی واحد تامین انجام شد";
    return "در انتظار شروع مرحله";
  }
  const actor = entry?.type === "step_set"
    ? item?.currentAssigneeName || "مسئول مرحله"
    : historyActorName(entry, item);
  const date = formatHistoryDate(entry?.at, entry);
  const time = formatHistoryTime(entry?.at, entry);
  return `${actor} · ${date} · ${time}`;
}

function workflowStageDescription(stage, state, item) {
  if (state.kind === "active") return stage.key === "commercial" ? "در حال بررسی واحد تامین" : `در انتظار اقدام ${item?.currentAssigneeName || "مسئول این مرحله"}`;
  if (state.kind === "completed") return stage.key === "requester" ? "درخواست ثبت و ارسال شد" : "مرحله با تأیید انجام شد";
  if (state.kind === "rejected") return "درخواست در این مرحله لغو شد";
  if (state.kind === "returned") return "درخواست برای اصلاح برگشت داده شد";
  return "";
}

function WorkflowMarker({ kind, index }) {
  if (kind === "completed" || kind === "final_completed") return <span className="text-base font-bold leading-none">✓</span>;
  if (kind === "rejected") return <span className="text-base font-bold leading-none">×</span>;
  if (kind === "returned") return <span className="text-sm font-bold leading-none">↶</span>;
  if (kind === "active") return <span className="h-2.5 w-2.5 rounded-full bg-white" />;
  return <span className="text-[11px] font-bold leading-none">{toFaDigits(index + 1)}</span>;
}

function SupplyWorkflowTimeline({ history, item }) {
  const workflowFinished = !item?.currentStepRoleKey && item?.status === "approved";
  return (
    <ol className="supply-workflow-timeline flex flex-col justify-start px-1 pb-2 pt-2" aria-label="مراحل فرآیند درخواست تامین">
      {SUPPLY_WORKFLOW_STEPS.map((step, index) => {
        const state = workflowStageState(step, history, item);
        const markerKind = state.kind === "completed" && workflowFinished && index === SUPPLY_WORKFLOW_STEPS.length - 1 ? "final_completed" : state.kind;
        const style = workflowStageStyle(markerKind);
        const isLast = index === SUPPLY_WORKFLOW_STEPS.length - 1;
        const description = workflowStageDescription(step, state, item);
        return (
          <li key={step.key} data-state={markerKind} className="supply-workflow-stage relative grid grid-cols-[minmax(0,1fr)_32px] gap-2 pb-2 last:pb-0" style={{ "--workflow-delay": `${Math.min(index * 110, 440)}ms` }}>
            <div className={`min-w-0 ${style.card ? `rounded-2xl px-3 py-2.5 ${style.card}` : "px-3 py-1"}`}>
              <div className={`text-sm font-bold leading-6 ${style.title}`}>{step.label}</div>
              {(state.kind !== "waiting" || description) && <div className="mt-0.5 text-xs leading-5 text-neutral-500 dark:text-neutral-400">{description}</div>}
              <div className={`mt-1 text-[11px] leading-5 ${state.kind === "waiting" ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-500 dark:text-neutral-400"}`} dir="rtl">
                {workflowStageMeta(step, item, state.entry, state)}
              </div>
              {state.entry?.note ? <div className="mt-2 border-t border-black/5 pt-2 text-[11px] leading-5 text-neutral-500 dark:border-white/10 dark:text-neutral-400">توضیح: {state.entry.note}</div> : null}
            </div>
            <div className="relative flex justify-center" aria-hidden="true">
              {!isLast ? <span className={`absolute bottom-[-12px] top-[22px] z-0 w-px ${style.line}`} /> : null}
              <span className={`supply-workflow-marker relative z-10 mt-0.5 grid h-7 w-7 place-items-center rounded-full border-2 ${style.marker}`}>
                <WorkflowMarker kind={markerKind} index={index} />
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Field({ label, required, children, labelClassName, className = "" }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <div className={`${labelCls} ${labelClassName || ""}`}>
        {label}
        {required && <span className="mr-1 text-red-500">*</span>}
      </div>
      {children}
    </label>
  );
}

function RequestFilterBar({
  query,
  setQuery,
  quick,
  setQuick,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  status,
  setStatus,
  ownership,
  setOwnership,
  unread,
  setUnread,
  tags,
  pinnedTagIds,
  setPinnedTagIds,
  activeTagIds,
  setActiveTagIds,
  tagPickOpen,
  setTagPickOpen,
  tagPickSearch,
  setTagPickSearch,
  onExport,
  canExport,
}) {
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

  return (
    <div className="mb-4 space-y-2 rounded-2xl border border-neutral-200 bg-neutral-100/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full md:min-w-[280px] md:flex-1">
          <div className={labelCls}>جست و جو</div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} className={inputCls} placeholder="جستجو در شماره، موضوع، تاریخ، پروژه و ..." />
        </div>
        <div className="w-[calc(50%-0.25rem)] md:w-auto md:min-w-[140px]">
          <div className={labelCls}>از</div>
          <JalaliPopupDatePicker
            value={fromDate}
            onChange={(value) => {
              setFromDate(value);
              setQuick("");
            }}
            buttonClassName={`${inputCls} flex items-center justify-between gap-2`}
          />
        </div>
        <div className="w-[calc(50%-0.25rem)] md:w-auto md:min-w-[140px]">
          <div className={labelCls}>تا</div>
          <JalaliPopupDatePicker
            value={toDate}
            onChange={(value) => {
              setToDate(value);
              setQuick("");
            }}
            buttonClassName={`${inputCls} flex items-center justify-between gap-2`}
          />
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={!canExport}
          className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
          title="خروجی اکسل"
          aria-label="خروجی اکسل"
        >
          <img src="/images/icons8-excel-50.png" alt="" className="h-5 w-5" />
        </button>
      </div>
      <div>
        <div className={labelCls}>برچسب ها</div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setOwnership(ownership === "mine" ? "" : "mine")} className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ring-1 transition ${ownership === "mine" ? "bg-neutral-900 text-white ring-neutral-900 dark:bg-white dark:text-neutral-900 dark:ring-white" : "bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200/80 text-neutral-700 ring-neutral-200 hover:from-neutral-200 hover:to-neutral-300 dark:from-white/10 dark:via-white/[0.07] dark:to-white/[0.13] dark:text-neutral-200 dark:ring-white/10"}`}>درخواست‌های من</button>
          <button type="button" onClick={() => setOwnership(ownership === "incoming" ? "" : "incoming")} className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ring-1 transition ${ownership === "incoming" ? "bg-neutral-900 text-white ring-neutral-900 dark:bg-white dark:text-neutral-900 dark:ring-white" : "bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200/80 text-neutral-700 ring-neutral-200 hover:from-neutral-200 hover:to-neutral-300 dark:from-white/10 dark:via-white/[0.07] dark:to-white/[0.13] dark:text-neutral-200 dark:ring-white/10"}`}>موارد ارسال‌شده به من</button>
          <button type="button" onClick={() => setUnread(!unread)} className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ring-1 transition ${unread ? "bg-neutral-900 text-white ring-neutral-900 dark:bg-white dark:text-neutral-900 dark:ring-white" : "bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200/80 text-neutral-700 ring-neutral-200 hover:from-neutral-200 hover:to-neutral-300 dark:from-white/10 dark:via-white/[0.07] dark:to-white/[0.13] dark:text-neutral-200 dark:ring-white/10"}`}>خوانده نشده</button>
          {STATUS_FILTERS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setStatus(status === key ? "" : key)} className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs transition ${status === key ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : statusBadgeClass(key)} `}>
              {label}
            </button>
          ))}
          {visibleTags.map((tag) => {
            const id = String(tag?.id ?? "");
            const isActive = active.has(id);
            return (
              <button key={id} type="button" onClick={() => toggleActiveTag(id)} className={`h-9 rounded-full border px-4 text-xs transition ${isActive ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/10 bg-white hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"}`}>
                {tagLabelOf(tag)}
              </button>
            );
          })}
        </div>
      </div>
      {tagPickOpen && <TagPicker tags={tags} selectedIds={pinnedTagIds} onToggle={togglePinnedTag} query={tagPickSearch} setQuery={setTagPickSearch} onClose={() => setTagPickOpen(false)} />}
    </div>
  );
}

function TagPicker({ tags, selectedIds, onToggle, query, setQuery, onClose }) {
  const selected = new Set((selectedIds || []).map(String));
  const q = String(query || "").trim().toLowerCase();
  const list = (Array.isArray(tags) ? tags : []).filter((tag) => !q || tagLabelOf(tag).toLowerCase().includes(q));
  return createPortal(
    <div className="fixed inset-0 z-[9999]" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="flex h-[min(70vh,620px)] w-[min(760px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-black/10 p-4 dark:border-white/10">
            <b className="text-sm">انتخاب برچسب</b>
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 dark:border-white/10" aria-label="بستن" title="بستن">
              <img src="/images/icons/bastan.svg" alt="" className="h-5 w-5 dark:invert" />
            </button>
          </div>
          <div className="p-4">
            <input value={query} onChange={(event) => setQuery(event.target.value)} className={inputCls} placeholder="جستجو در برچسب‌ها..." />
          </div>
          <div className="flex-1 overflow-auto px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {list.map((tag) => {
                const id = String(tag?.id ?? "");
                const active = selected.has(id);
                return (
                  <button key={id} type="button" onClick={() => onToggle(id)} className={`h-10 rounded-full border px-4 text-sm transition ${active ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/10 hover:bg-black/[0.03] dark:border-white/15 dark:hover:bg-white/10"}`}>
                    {tagLabelOf(tag)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function RegistrationNotice({ info, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 px-3" onClick={onClose}>
      <div dir="rtl" className="w-[min(520px,calc(100vw-24px))] rounded-2xl border border-black/10 bg-white p-4 text-sm text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white" onClick={(event) => event.stopPropagation()}>
        <div className="leading-7">{registrationMessage(info)}</div>
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-black text-white transition hover:bg-black/85 dark:bg-white dark:text-black" aria-label="بستن" title="بستن">
            <img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function RelatedLettersPicker({ query, setQuery, letters, selectedIds, setSelectedIds, onClose, onConfirm }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div dir="rtl" className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-xl dark:border-white/10 dark:bg-neutral-900 dark:text-white">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="text-sm font-semibold">
            انتخاب اسناد مرتبط
            {selectedIds.length ? <span className="mr-2 text-neutral-500 dark:text-white/60">({toFaDigits(selectedIds.length)})</span> : null}
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 transition hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/10" aria-label="بستن" title="بستن">
            <img src="/images/icons/bastan.svg" alt="" className="h-5 w-5 dark:invert" />
          </button>
        </div>
        <div className="px-4 pb-3">
          <input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputCls} h-10 text-sm`} placeholder="جستجو با شماره / موضوع / فرستنده ..." autoFocus />
        </div>
        <div className="h-px bg-black/10 dark:bg-white/10" />
        <div className="max-h-[55vh] overflow-auto p-2">
          {!letters.length ? (
            <div className="p-4 text-sm text-neutral-600 dark:text-white/60">موردی پیدا نشد.</div>
          ) : (
            letters.map((letter) => {
              const id = letterIdOf(letter);
              const no = letterNoOf(letter) || id;
              const subject = subjectOf(letter);
              const date = letterDateOf(letter);
              const checked = selectedIds.includes(id);
              return (
                <button key={id} type="button" onClick={() => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-right transition hover:bg-black/[0.04] dark:hover:bg-white/10">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold">{toFaDigits(no)}</span>
                      {date ? <span className="text-xs text-neutral-600 dark:text-white/60">{toFaDigits(date)}</span> : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-neutral-600 dark:text-white/60">{subject || "—"}</span>
                  </span>
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${checked ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/15 dark:border-white/15"}`}>{checked ? "✓" : ""}</span>
                </button>
              );
            })
          )}
        </div>
        <div className="h-px bg-black/10 dark:bg-white/10" />
        <div className="flex justify-end gap-2 p-4">
          <button type="button" onClick={onConfirm} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white transition hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90" aria-label="تأیید" title="تأیید">
            <img src="/images/icons/check.svg" alt="" className="h-5 w-5 invert dark:invert-0" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
