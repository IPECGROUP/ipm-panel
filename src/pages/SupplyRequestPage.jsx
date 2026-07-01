// درخواست تامین
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/ui/Card.jsx";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { api } from "../utils/api.js";
import { todayJalaliYmd } from "../utils/date.js";
import { toEnglishDigits } from "../utils/format.js";

const PAGE_ICON = "/images/icons/darkhast-tamin.svg";
const REQUEST_DOC_ID = "supply_request";

const inputCls =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-right text-sm text-neutral-900 outline-none transition " +
  "placeholder:text-neutral-400 focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-neutral-100 dark:placeholder:text-neutral-500";

const labelCls = "mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300";

const tableWrapCls =
  "overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100";

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

export default function SupplyRequestPage() {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [relatedDocsOpen, setRelatedDocsOpen] = useState(false);
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
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);

  const selectedProject = useMemo(
    () => projects.find((project) => String(project.id) === String(form.projectId)),
    [form.projectId, projects]
  );

  const previewSerial = useMemo(() => {
    const yy = jalaliYY(form.dateJalali);
    const pcode = normalizeProjectCode(selectedProject?.code);
    if (!pcode) return `${yy}/---/---`;

    let maxSeq = 0;
    const re = new RegExp(`^${yy}/${pcode}/(\\d{3})$`);
    items.forEach((item) => {
      const m = normalizeDigits(item?.serial || "").match(re);
      if (m) maxSeq = Math.max(maxSeq, Number(m[1]) || 0);
    });
    return `${yy}/${pcode}/${String(maxSeq + 1).padStart(3, "0")}`;
  }, [form.dateJalali, items, selectedProject?.code]);

  const loadItems = useCallback(async () => {
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
  }, []);

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
  }, []);

  useEffect(() => {
    loadItems();
    loadProjects();
  }, [loadItems, loadProjects]);

  useEffect(() => {
    let cancelled = false;
    if (!form.projectId) {
      setBudgetItems([]);
      return undefined;
    }

    (async () => {
      try {
        const data = await api(`/cost-breakdown?project_id=${encodeURIComponent(form.projectId)}`);
        const rows = Array.isArray(data?.items) ? data.items : [];
        if (!cancelled) setBudgetItems(rows);
      } catch {
        if (!cancelled) setBudgetItems([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [form.projectId]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErr("");
    setOk("");
  };

  const openFreshForm = () => {
    setForm(emptyForm());
    setRelatedDocsOpen(false);
    setFormOpen(true);
    setErr("");
    setOk("");
  };

  const closeForm = () => {
    setFormOpen(false);
    setForm(emptyForm());
    setRelatedDocsOpen(false);
    setErr("");
  };

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
      };
      const data = await api("/supply-requests", { method: "POST", body: JSON.stringify(payload) });
      if (data?.item) setItems((prev) => [data.item, ...prev]);
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
    return items.filter((item) => {
      if (filterStatus && item.status !== filterStatus) return false;
      if (filterProjectId && String(item.projectId) !== String(filterProjectId)) return false;
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
  }, [filterProjectId, filterQuery, filterStatus, items, projects]);

  const total = filteredItems.length;
  const pageCount = Math.max(1, Math.ceil(total / rowsPerPage));
  const safePage = Math.min(page, pageCount - 1);
  const startIndex = safePage * rowsPerPage;
  const endIndex = Math.min(total, startIndex + rowsPerPage);
  const pageItems = filteredItems.slice(startIndex, endIndex);

  useEffect(() => {
    setPage(0);
  }, [filterProjectId, filterQuery, filterStatus, rowsPerPage]);

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
            <div className="mb-4 rounded-2xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-transparent">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(240px,1fr)_minmax(180px,0.7fr)_minmax(180px,0.8fr)_auto] md:items-end">
                <label className="block">
                  <div className={labelCls}>جست و جو</div>
                  <input
                    value={filterQuery}
                    onChange={(event) => setFilterQuery(event.target.value)}
                    className={inputCls}
                    placeholder="شماره، موضوع، پروژه یا کد بودجه"
                  />
                </label>
                <label className="block">
                  <div className={labelCls}>پروژه</div>
                  <select value={filterProjectId} onChange={(event) => setFilterProjectId(event.target.value)} className={inputCls}>
                    <option value="">همه پروژه‌ها</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {projectLabel(project)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <div className={labelCls}>آخرین وضعیت</div>
                  <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className={inputCls}>
                    <option value="">همه وضعیت‌ها</option>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setFilterQuery("");
                    setFilterProjectId("");
                    setFilterStatus("");
                  }}
                  className="h-11 rounded-xl border border-black/10 px-4 text-sm transition hover:bg-black/[0.03] dark:border-white/15 dark:hover:bg-white/10"
                >
                  پاک کردن
                </button>
              </div>
            </div>
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
                      const code = item.budgetCode ?? item.budget_code ?? "";
                      const name = item.budgetName ?? item.budget_name ?? "";
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
                  onClick={() => setRelatedDocsOpen((prev) => !prev)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm transition hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
                  title="اسناد مرتبط"
                >
                  <img src="/images/icons/namayeshname.svg" alt="" className="h-5 w-5 dark:invert" />
                  اسناد مرتبط
                  <span className="text-xs text-neutral-500">({toFaDigits(form.attachments.length)})</span>
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
                  {form.attachments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {form.attachments.map((file, index) => (
                        <a
                          key={file.id || file.serverId || index}
                          href={file.url || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-black/10 px-2 py-1 hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/10"
                        >
                          {file.name || file.originalName || `فایل ${toFaDigits(index + 1)}`}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2 text-center text-neutral-500 dark:text-neutral-400">سندی بارگذاری نشده است.</div>
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
