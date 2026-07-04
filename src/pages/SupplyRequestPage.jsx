// درخواست تامین
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Card from "../components/ui/Card.jsx";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
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
const QUICK_FILTERS = [["week", "هفته قبل"], ["2w", "2 هفته قبل"], ["1m", "ماه قبل"], ["3m", "3 ماه قبل"], ["6m", "6 ماه قبل"]];

const statusLabels = {
  pending: "در انتظار بررسی",
  approved: "تأییدشده",
  rejected: "ردشده",
  returned: "برگشت‌خورده",
};

function toFaDigits(value = "") {
  return String(value ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function normalizeDigits(value = "") {
  return toEnglishDigits(String(value ?? "")).replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

function todayFa() {
  return normalizeDigits(todayJalaliYmd()).replaceAll("-", "/");
}

function jalaliYY(value = todayFa()) {
  const year = normalizeDigits(value).match(/^(\d{4})/)?.[1] || "1400";
  return year.slice(-2);
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
  const raw = normalizeDigits(value).trim();
  const exact = raw.match(/^\d{3}$/);
  if (exact) return raw;
  return raw.match(/^(\d{3})/)?.[1] || "";
}

function normalizeCode(value = "") {
  return toEnglishDigits(String(value || "")).trim();
}

function coreOf(value) {
  const raw = normalizeCode(value);
  const noPrefix = raw.replace(/^[A-Za-z]+[^0-9]*/, "");
  const normalized = noPrefix.replace(/[^0-9.]+/g, ".");
  return normalized.replace(/\.+/g, ".").replace(/^\./, "").replace(/\.$/, "");
}

function isActiveProject(project) {
  const value = project?.isActive ?? project?.is_active ?? project?.active;
  return value === undefined || value === null || value === true || value === 1 || String(value).toLowerCase() === "true";
}

function isMainProject(project) {
  return /^\d{3}$/.test(normalizeProjectCode(project?.code));
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
  const date = info.dateJalali || info.date || "";
  const time = info.time || "";
  const userName = info.userName || info.username || "کاربر";
  const unitName = info.unitName || "نامشخص";
  const roleName = info.roleName || "";
  return `درخواست شما در تاریخ ${toFaDigits(String(date).replaceAll("-", "/"))} در ساعت ${toFaDigits(time)} توسط ${userName}${roleName ? ` با نقش ${roleName}` : ""} واحد ${unitName} ثبت گردید`;
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

function StatusBadge({ status }) {
  const cls =
    status === "approved"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
      : status === "rejected"
        ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
        : status === "returned"
          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
          : "bg-neutral-100 text-neutral-700 dark:bg-white/10 dark:text-neutral-200";

  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${cls}`}>{statusLabels[status] || "—"}</span>;
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

export default function SupplyRequestPage() {
  const { user, loading: authLoading } = useAuth();
  const fileRef = useRef(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [relatedDocsOpen, setRelatedDocsOpen] = useState(false);
  const [letters, setLetters] = useState([]);
  const [relatedPickOpen, setRelatedPickOpen] = useState(false);
  const [relatedPickQuery, setRelatedPickQuery] = useState("");
  const [relatedPickIds, setRelatedPickIds] = useState([]);
  const [submitNotice, setSubmitNotice] = useState(null);
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
  const [filterProjectId, setFilterProjectId] = useState("");
  const [filterQuick, setFilterQuick] = useState("");
  const [filterTagIds, setFilterTagIds] = useState([]);
  const [pinnedFilterTagIds, setPinnedFilterTagIds] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagPickOpen, setTagPickOpen] = useState(false);
  const [tagPickSearch, setTagPickSearch] = useState("");
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

  const previewSerial = useMemo(() => {
    const yy = jalaliYY(form.dateJalali);
    let maxSeq = 0;
    const re = new RegExp(`^${yy}/(?:\\d{3}/)?(\\d{3})$`);
    items.forEach((item) => {
      const m = normalizeDigits(item?.serial || "").match(re);
      if (m) maxSeq = Math.max(maxSeq, Number(m[1]) || 0);
    });
    return `${yy}/${String(maxSeq + 1).padStart(3, "0")}`;
  }, [form.dateJalali, items]);

  const loadItems = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    setErr("");
    try {
      const data = await api("/supply-requests");
      const rows = Array.isArray(data?.items) ? data.items : [];
      setItems(rows);
    } catch (ex) {
      setErr(ex.message || "دریافت درخواست‌های تامین انجام نشد.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [api, authLoading]);

  const loadProjects = useCallback(async () => {
    try {
      const data = await api("/projects?isActive=true");
      const raw = Array.isArray(data?.items) ? data.items : Array.isArray(data?.projects) ? data.projects : [];
      const clean = raw
        .filter((project) => isActiveProject(project) && isMainProject(project))
        .map((project) => ({ ...project, code: normalizeProjectCode(project.code) }))
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
    let cancelled = false;
    if (!form.projectId) {
      setBudgetItems([]);
      return undefined;
    }

    (async () => {
      const query = new URLSearchParams({ kind: "projects" });
      query.set("project_id", form.projectId);
      const projectCore = coreOf(selectedProject?.code);

      try {
        const [estimateData, centersData, costData] = await Promise.all([
          api(`/budget-estimates?${query}`).catch(() => ({ items: [] })),
          api("/centers/projects").catch(() => ({ items: [] })),
          api(`/cost-breakdown?project_id=${encodeURIComponent(form.projectId)}`).catch(() => ({ items: [] })),
        ]);

        const estimateItems = Array.isArray(estimateData?.items) ? estimateData.items : [];
        const centerItems = Array.isArray(centersData?.items) ? centersData.items : [];
        const costItems = Array.isArray(costData?.items) ? costData.items : [];
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

        costItems.forEach((item) => {
          const code = normalizeCode(item?.budgetCode ?? item?.budget_code ?? item?.code);
          if (!code) return;
          const previous = byCode.get(code) || { code, center_desc: "", last_amount: 0 };
          byCode.set(code, {
            ...previous,
            center_desc: previous.center_desc || String(item?.budgetName ?? item?.budget_name ?? item?.name ?? ""),
            last_amount: Number(item?.baseBudget ?? item?.base_budget ?? previous.last_amount ?? 0),
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

    setSaving(true);
    setErr("");
    setOk("");
    try {
      const payload = {
        ...form,
        serial: previewSerial,
        docId: REQUEST_DOC_ID,
        scope: "projects",
        amount,
        relatedLetterIds: form.relatedLetterIds,
        clientRegistrationInfo: clientRegistrationInfo(),
      };
      const data = await api("/supply-requests", { method: "POST", body: JSON.stringify(payload) });
      if (data?.item) setItems((prev) => [data.item, ...prev]);
      setSubmitNotice(data?.item?.registrationInfo || null);
      setOk("درخواست تامین با موفقیت ثبت شد.");
      closeForm();
      await loadItems();
    } catch (ex) {
      setErr(ex.message || "ثبت درخواست تامین انجام نشد.");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm("این درخواست تامین حذف شود؟")) return;
    try {
      await api(`/supply-requests?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      setItems((prev) => prev.filter((row) => String(row.id) !== String(item.id)));
    } catch (ex) {
      setErr(ex.message || "حذف درخواست انجام نشد.");
    }
  };

  const filteredItems = useMemo(() => {
    const q = normalizeDigits(filterQuery).trim().toLowerCase();
    const start = quickStartDate(filterQuick);
    const selectedTags = Array.isArray(filterTagIds) ? filterTagIds.map(String).filter(Boolean) : [];
    const letterById = new Map((Array.isArray(letters) ? letters : []).map((letter) => [letterIdOf(letter), letter]));
    return items.filter((item) => {
      if (filterStatus && item.status !== filterStatus) return false;
      if (filterProjectId && String(item.projectId) !== String(filterProjectId)) return false;
      if (start && itemDateKey(item) < start) return false;
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
      ]
        .map((value) => normalizeDigits(value).toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [filterProjectId, filterQuery, filterQuick, filterStatus, filterTagIds, items, letters, projects]);

  const total = filteredItems.length;
  const pageCount = Math.max(1, Math.ceil(total / rowsPerPage));
  const safePage = Math.min(page, pageCount - 1);
  const startIndex = safePage * rowsPerPage;
  const endIndex = Math.min(total, startIndex + rowsPerPage);
  const pageItems = filteredItems.slice(startIndex, endIndex);

  useEffect(() => {
    setPage(0);
  }, [filterProjectId, filterQuery, filterQuick, filterStatus, filterTagIds, rowsPerPage]);

  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <Card className="overflow-hidden rounded-2xl border border-black/10 bg-white p-0 dark:border-white/10 dark:bg-neutral-900">
        <div className="p-3 md:p-4">
          <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
                <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-bold md:text-lg">درخواست تامین</span>
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
              tags={tags}
              pinnedTagIds={pinnedFilterTagIds}
              setPinnedTagIds={setPinnedFilterTagIds}
              activeTagIds={filterTagIds}
              setActiveTagIds={setFilterTagIds}
              tagPickOpen={tagPickOpen}
              setTagPickOpen={setTagPickOpen}
              tagPickSearch={tagPickSearch}
              setTagPickSearch={setTagPickSearch}
            />
          )}

          {formOpen && (
            <form onSubmit={submit} className="mb-4 rounded-2xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-transparent">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(150px,0.75fr)_minmax(140px,0.7fr)_minmax(220px,1fr)_minmax(220px,1fr)]">
                <Field label="شماره درخواست">
                  <div dir="ltr" className={`${inputCls} flex items-center justify-start bg-neutral-50 font-sans tabular-nums dark:bg-white/5`}>
                    {previewSerial}
                  </div>
                </Field>
                <Field label="تاریخ">
                  <div className={`${inputCls} flex items-center justify-between bg-neutral-50 dark:bg-white/5`}>
                    <span>{toFaDigits(form.dateJalali)}</span>
                    <img src="/images/icons/calendar.svg" alt="" className="h-5 w-5 dark:invert" />
                  </div>
                </Field>
                <Field label="پروژه" required>
                  <select
                    value={form.projectId}
                    onChange={(event) => setForm((prev) => ({ ...prev, projectId: event.target.value, budgetCode: "" }))}
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
                      const code = normalizeCode(item.code ?? item.budgetCode ?? item.budget_code ?? item.center_code);
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
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[minmax(260px,1.4fr)_minmax(150px,0.7fr)_minmax(190px,0.8fr)]">
                <Field label="موضوع درخواست" required>
                  <input value={form.title} onChange={(event) => setField("title", event.target.value)} className={`${inputCls} h-12 text-[15px]`} />
                </Field>
                <Field label="تاریخ نیاز">
                  <JalaliPopupDatePicker
                    value={form.needDateJalali}
                    onChange={(value) => setField("needDateJalali", value)}
                    buttonClassName={`${inputCls} flex items-center justify-between`}
                    placeholder="انتخاب تاریخ"
                  />
                </Field>
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
              </div>

              <div className="mt-3">
                <Field label="شرح درخواست">
                  <textarea
                    value={form.description}
                    onChange={(event) => setField("description", event.target.value)}
                    className={`${inputCls} min-h-28 resize-y py-3 leading-7`}
                  />
                </Field>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRelatedPickIds((Array.isArray(form.relatedLetterIds) ? form.relatedLetterIds : []).map(String));
                    setRelatedPickQuery("");
                    setRelatedPickOpen(true);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm transition hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
                  title="اسناد مرتبط"
                >
                  <img src="/images/icons/namayeshname.svg" alt="" className="h-5 w-5 dark:invert" />
                  اسناد مرتبط
                  <span className="text-xs text-neutral-500">({toFaDigits(form.relatedLetterIds.length)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
                  title="بارگذاری"
                  aria-label="بارگذاری"
                >
                  <img src="/images/icons/upload.svg" alt="" className="h-5 w-5 dark:invert" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    uploadFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="mr-auto grid h-10 w-10 place-items-center rounded-xl bg-black text-white transition hover:bg-black/85 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90"
                  title="ثبت"
                  aria-label="ثبت"
                >
                  <img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" />
                </button>
              </div>

              {relatedDocsOpen && (
                <div className="mt-3 rounded-xl border border-black/10 p-3 text-xs dark:border-white/10">
                  {selectedRelatedLetters.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedRelatedLetters.map((letter) => (
                        <span
                          key={letterIdOf(letter)}
                          className="rounded-lg border border-black/10 px-2 py-1 hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/10"
                        >
                          {toFaDigits(letterNoOf(letter) || letterIdOf(letter))}
                          {subjectOf(letter) ? ` - ${subjectOf(letter)}` : ""}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2 text-center text-neutral-500 dark:text-neutral-400">نامه‌ای انتخاب نشده است.</div>
                  )}
                </div>
              )}
            </form>
          )}

          {err && <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{err}</div>}
          {ok && <div className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{ok}</div>}

          <div className={tableWrapCls}>
            <div className="hidden overflow-x-auto md:block" dir="ltr">
              <table dir="rtl" className="w-full min-w-[860px] table-fixed text-sm [&_td]:py-1.5 [&_td]:text-center [&_th]:py-2 [&_th]:text-center">
                <colgroup>
                  <col style={{ width: 130 }} />
                  <col style={{ width: 120 }} />
                  <col />
                  <col style={{ width: 180 }} />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 120 }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-white/10 dark:text-neutral-100">
                    <th>شماره</th>
                    <th>تاریخ</th>
                    <th>موضوع</th>
                    <th>پروژه</th>
                    <th>آخرین وضعیت</th>
                    <th>اقدامات</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-black/60 dark:text-neutral-400">در حال دریافت...</td>
                    </tr>
                  ) : pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-black/60 dark:text-neutral-400">هنوز درخواست تامینی ثبت نشده است.</td>
                    </tr>
                  ) : (
                    pageItems.map((item) => (
                      <tr key={item.id} className="group bg-black/[0.02] transition-colors hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10">
                        <td dir="ltr" className="border-b border-neutral-300 px-3 font-sans tabular-nums dark:border-neutral-700">{item.serial || "—"}</td>
                        <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFaDigits(String(item.dateJalali || item.dateFa || "—").replaceAll("-", "/"))}</td>
                        <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="mx-auto block truncate">{item.title || "—"}</span></td>
                        <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="mx-auto block truncate">{itemProjectLabel(item, projects)}</span></td>
                        <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><StatusBadge status={item.status} /></td>
                        <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">
                          <div className="flex min-h-9 items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                            <RowActionIconBtn action="delete" onClick={() => deleteItem(item)} size={34} iconSize={16} />
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
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="mt-2 truncate text-sm">{item.title || "—"}</div>
                    <div className="mt-2 text-xs text-neutral-500">{toFaDigits(String(item.dateJalali || item.dateFa || "—").replaceAll("-", "/"))}</div>
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
            setRelatedDocsOpen(clean.length > 0);
            setRelatedPickOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block min-w-0">
      <div className={labelCls}>
        {label}
        {required && <span className="mr-1 text-red-500">*</span>}
      </div>
      {children}
    </label>
  );
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

  return (
    <div className="mb-4 space-y-2 rounded-2xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-transparent">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full md:min-w-[280px] md:flex-1">
          <div className={labelCls}>جست و جو</div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} className={inputCls} placeholder="جستجو در شماره، موضوع، تاریخ، پروژه و ..." />
        </div>
      </div>
      <div>
        <div className={labelCls}>برچسب ها</div>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_FILTERS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setQuick(quick === key ? "" : key)} className={`h-9 rounded-full border px-4 text-xs transition ${quick === key ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/10 bg-white hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"}`}>
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
          <button type="button" onClick={() => { setTagPickSearch(""); setTagPickOpen(true); }} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white transition hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" aria-label="انتخاب برچسب" title="انتخاب برچسب">
            <img src="/images/icons/sayer.svg" alt="" className="h-5 w-5 dark:invert" />
          </button>
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
