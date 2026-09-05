import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  BriefcaseBusiness,
  Check,
  Download,
  Grid2X2,
  Lightbulb,
  Paperclip,
  Star,
  Tag,
  TriangleAlert,
} from "lucide-react";
import Card from "../components/ui/Card.jsx";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import LessonReviewModal from "../components/project-lessons/LessonReviewModal.jsx";
import LessonsTable from "../components/project-lessons/LessonsTable.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { api } from "../utils/api.js";
import { dayjs } from "../utils/date.js";

const input =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-right text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-neutral-100";
const label = "mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300";

const impacts = [
  ["time", "زمان"],
  ["cost", "هزینه"],
  ["quality", "کیفیت"],
  ["satisfaction", "رضایت کارفرما"],
];

const importance = [
  ["low", "کم"],
  ["medium", "متوسط"],
  ["high", "زیاد"],
];

const empty = () => ({
  projectId: "",
  category: "",
  challenge: "",
  solution: "",
  importance: "",
  impacts: [],
  tagIds: [],
  files: [],
});

const fa = (value = "") =>
  String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

const dateKey = (value) => {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.calendar("jalali").format("YYYY/MM/DD") : "";
};

const normalizeDate = (value) =>
  String(value || "")
    .replace(/[\u06F0-\u06F9]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x06f0),
    )
    .replaceAll("-", "/")
    .trim();

function isSelectableProject(project) {
  const hasThreeDigitCode = /^\d{3}$/.test(String(project.code || "").trim());
  const active =
    project.isActive === true ||
    project.is_active === true ||
    project.isActive === "true" ||
    project.is_active === "true";
  return hasThreeDigitCode && active;
}

function matchesFilters(item, query, from, to, selectedTagIds) {
  const createdAt = dateKey(item.createdAt);
  if (from && (!createdAt || createdAt < from)) return false;
  if (to && (!createdAt || createdAt > to)) return false;

  const itemTagIds = (item.tagIds || []).map(String);
  const matchesTags =
    !selectedTagIds.length ||
    selectedTagIds.some((id) => itemTagIds.includes(String(id)));
  if (!matchesTags) return false;

  const searchableText = [
    item.projectName,
    item.projectCode,
    item.category,
    item.challenge,
    item.solution,
  ]
    .join(" ")
    .toLowerCase();
  return !query || searchableText.includes(query);
}

function isFormComplete(form) {
  return Boolean(
    form.projectId &&
    form.category.trim() &&
    form.challenge.trim() &&
    form.solution.trim() &&
    form.importance &&
    form.impacts.length &&
    form.tagIds.length,
  );
}

function createFormFromItem(item) {
  return {
    projectId: String(item.projectId),
    category: item.category,
    challenge: item.challenge,
    solution: item.solution,
    importance: item.importance,
    impacts: item.impacts || [],
    tagIds: item.tagIds || [],
    files: item.files || [],
  };
}

function canDisplayLesson(item, canReview) {
  return item.status === "approved" || (canReview && item.status === "pending");
}

export default function ProjectLessonsLearnedPage() {
  const { user, loading: authLoading } = useAuth();
  const fileRef = useRef(null);

  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tags, setTags] = useState([]);
  const [lessonCategories, setLessonCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);

  const [form, setForm] = useState(empty);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filterTagIds, setFilterTagIds] = useState([]);
  const [tagOpen, setTagOpen] = useState(false);
  const [tagFor, setTagFor] = useState("form");
  const [tagDraft, setTagDraft] = useState([]);
  const [tagQuery, setTagQuery] = useState("");

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [viewItem, setViewItem] = useState(null);
  const [authorInfoItem, setAuthorInfoItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const headers = useMemo(
    () => (user?.id != null ? { "x-user-id": String(user.id) } : {}),
    [user?.id],
  );

  useEffect(() => {
    if (authLoading) return;

    // Never keep another user's review queue visible while the new session is
    // being loaded or if that request fails.
    setItems([]);
    setCanReview(false);
    setSelectedIds(new Set());
    setViewItem(null);
    setLoading(true);
    api("/project-lessons", { headers })
      .then((data) => {
        setItems(Array.isArray(data.items) ? data.items : []);
        setCanReview(data.canReview === true);
      })
      .catch((requestError) => {
        setError(requestError.message || "دریافت درس‌آموخته‌ها انجام نشد.");
      })
      .finally(() => setLoading(false));
  }, [authLoading, headers]);

  useEffect(() => {
    if (authLoading) return;

    Promise.all([
      api("/projects?isActive=true", { headers }),
      api("/tags", { headers }),
      api("/base/project-lesson-categories", { headers }),
    ])
      .then(([projectData, tagData, categoryData]) => {
        const allProjects = Array.isArray(projectData.items)
          ? projectData.items
          : [];
        setProjects(allProjects.filter(isSelectableProject));
        setTags(Array.isArray(tagData.items) ? tagData.items : []);
        setLessonCategories(
          Array.isArray(categoryData.items) ? categoryData.items : [],
        );
      })
      .catch(() => {});
  }, [authLoading, headers]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const fromDate = normalizeDate(from);
    const toDate = normalizeDate(to);
    const authorizedItems = items.filter((item) =>
      canDisplayLesson(item, canReview),
    );

    return authorizedItems.filter((item) =>
      matchesFilters(item, normalizedQuery, fromDate, toDate, filterTagIds),
    );
  }, [items, canReview, query, from, to, filterTagIds]);

  const allSelected =
    filtered.length > 0 &&
    filtered.every((item) => selectedIds.has(String(item.id)));

  const openTags = (target) => {
    const selectedTags = target === "form" ? form.tagIds : filterTagIds;
    setTagFor(target);
    setTagDraft(selectedTags.map(String));
    setTagQuery("");
    setTagOpen(true);
  };

  const reset = () => {
    setFormOpen(false);
    setUploadOpen(false);
    setForm(empty());
    setEditingId("");
    setError("");
  };

  const submit = async () => {
    setError("");
    setNotice("");
    if (!isFormComplete(form)) {
      setError("همه فیلدها به‌جز بارگذاری اجباری هستند.");
      return;
    }

    setSaving(true);
    try {
      const payload = editingId ? { ...form, id: editingId } : form;
      const data = await api("/project-lessons", {
        method: editingId ? "PATCH" : "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!editingId && data.pending !== true) {
        throw new Error(
          "پاسخ سرور معتبر نیست؛ مورد برای بازبینی ثبت نشده است.",
        );
      }
      if (editingId && data.item) updateEditedItem(data.item);
      reset();
      setSelectedIds(new Set());
      setNotice(
        editingId
          ? "درس‌آموخته با موفقیت ویرایش شد."
          : "درس‌آموخته برای بررسی به اعضای واحد مدیریت ارسال شد.",
      );
    } catch (requestError) {
      setError(requestError.message || "ثبت درس‌آموخته انجام نشد.");
    } finally {
      setSaving(false);
    }
  };

  const updateEditedItem = (updatedItem) => {
    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== editingId) return item;
        return {
          ...item,
          ...updatedItem,
          authorName:
            updatedItem.authorName && updatedItem.authorName !== "—"
              ? updatedItem.authorName
              : item.authorName,
          authorPostCount: updatedItem.authorPostCount || item.authorPostCount,
        };
      }),
    );
  };

  const toggleSelected = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const editSelected = () => {
    if (selectedIds.size !== 1) return;
    const item = items.find((row) => selectedIds.has(String(row.id)));
    if (!item) return;

    setForm(createFormFromItem(item));
    setEditingId(item.id);
    setFormOpen(true);
  };

  const deleteSelected = async () => {
    const confirmed =
      selectedIds.size &&
      !deleting &&
      window.confirm("موارد انتخاب‌شده حذف شوند؟");
    if (!confirmed) return;

    setDeleting(true);
    try {
      await api("/project-lessons", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      setItems((current) =>
        current.filter((item) => !selectedIds.has(String(item.id))),
      );
      setSelectedIds(new Set());
    } catch (requestError) {
      setError(requestError.message || "حذف انجام نشد.");
    } finally {
      setDeleting(false);
    }
  };

  const openView = async (item) => {
    setViewItem(item);
    try {
      const data = await api("/project-lessons/views", {
        method: "POST",
        headers,
        body: JSON.stringify({ id: item.id }),
      });
      const viewedItem = { viewCount: data.viewCount, isUnread: false };
      setItems((current) =>
        current.map((row) =>
          row.id === item.id ? { ...row, ...viewedItem } : row,
        ),
      );
      setViewItem((current) =>
        current?.id === item.id ? { ...current, ...viewedItem } : current,
      );
    } catch {
      // Opening the detail should not fail if updating the read receipt fails.
    }
  };

  const decideReview = async (item, action, draft) => {
    setError("");
    const data = await api("/project-lessons", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ ...draft, id: item.id, action }),
    });

    if (action === "reject") {
      setItems((current) => current.filter((row) => row.id !== item.id));
      setNotice("درس‌آموخته رد شد و در جدول ذخیره نشد.");
    } else {
      setItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? { ...row, ...data.item, status: "approved", isUnread: false }
            : row,
        ),
      );
      setNotice("درس‌آموخته تأیید شد و اکنون در جدول اصلی نمایش داده می‌شود.");
    }
    setViewItem(null);
  };

  const upload = async (files) => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;

    setUploading(true);
    try {
      const uploadedFiles = [];
      for (const file of selectedFiles) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/project-lessons/upload", {
          method: "POST",
          credentials: "include",
          headers,
          body,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "upload_failed");
        uploadedFiles.push(data.file);
      }
      setForm((current) => ({
        ...current,
        files: [...current.files, ...uploadedFiles],
      }));
    } catch (uploadError) {
      setError(uploadError.message || "بارگذاری فایل انجام نشد.");
    } finally {
      setUploading(false);
    }
  };

  const exportExcel = async () => {
    if (!filtered.length) return;
    const XLSX = await import("xlsx");
    const rows = filtered.map((item, index) => ({
      ردیف: index + 1,
      تاریخ: fa(dateKey(item.createdAt)),
      دسته‌بندی: item.category,
      دانش‌آفرین: item.authorName,
      اهمیت: importance.find(([id]) => id === item.importance)?.[1] || "",
      اثر: item.impacts
        .map((id) => impacts.find(([key]) => key === id)?.[1])
        .filter(Boolean)
        .join("، "),
      بازدید: item.viewCount || 0,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    book.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(book, sheet, "Lessons");
    XLSX.writeFile(book, "project-lessons.xlsx");
  };
  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <Card className="overflow-hidden rounded-3xl border border-black/10 bg-white p-0 shadow-[0_18px_50px_rgba(15,23,42,.08)] dark:border-white/10 dark:bg-neutral-900">
        <div className="p-3 md:p-4">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-black/[.07] pb-4 dark:border-white/10">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-black/10 bg-neutral-50 dark:border-white/10 dark:bg-white/5">
                <img
                  src="/images/icons/darsamokhteha.svg"
                  alt=""
                  className="h-6 w-6 dark:invert"
                />
              </span>
              <span>
                <span className="block text-base font-bold md:text-lg">
                  درس‌آموخته‌ها
                </span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  مدیریت دانش
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => (formOpen ? reset() : setFormOpen(true))}
              className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 bg-white dark:border-white/15 dark:bg-white/5"
              title={formOpen ? "بستن فرم" : "افزودن"}
            >
              <img
                src={
                  formOpen
                    ? "/images/icons/listdarkhast.svg"
                    : "/images/icons/afzodan.svg"
                }
                alt=""
                className="h-5 w-5 dark:invert"
              />
            </button>
          </div>
          {!formOpen && (
            <FilterBar
              query={query}
              setQuery={setQuery}
              from={from}
              setFrom={setFrom}
              to={to}
              setTo={setTo}
              tags={tags}
              selected={filterTagIds}
              openTags={() => openTags("filter")}
              onExport={exportExcel}
              canExport={filtered.length > 0}
            />
          )}
          {formOpen && (
            <div className="mb-4 rounded-2xl border border-black/10 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[.03]">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field text="پروژه" required>
                  <select
                    value={form.projectId}
                    onChange={(e) =>
                      setForm((x) => ({ ...x, projectId: e.target.value }))
                    }
                    className={input}
                  >
                    <option value="">انتخاب کنید</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field text="دسته‌بندی درس‌آموخته" required>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((x) => ({ ...x, category: e.target.value }))
                    }
                    className={input}
                  >
                    <option value="">انتخاب کنید</option>
                    {lessonCategories.map((category) => (
                      <option key={category.id} value={category.title}>
                        {category.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field text="اهمیت" required>
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 dark:border-white/15 dark:bg-white/5">
                    {importance.map(([id, name]) => (
                      <label
                        key={id}
                        className="flex items-center gap-1 text-xs"
                      >
                        <input
                          type="radio"
                          name="importance"
                          checked={form.importance === id}
                          onChange={() =>
                            setForm((x) => ({ ...x, importance: id }))
                          }
                        />
                        {name}
                      </label>
                    ))}
                  </div>
                </Field>
                <Field text="چالش" required>
                  <textarea
                    value={form.challenge}
                    onChange={(e) =>
                      setForm((x) => ({ ...x, challenge: e.target.value }))
                    }
                    className={`${input} min-h-24 py-3`}
                    placeholder="چه اتفاقی افتاد"
                  />
                </Field>
                <Field text="راهکار" required>
                  <textarea
                    value={form.solution}
                    onChange={(e) =>
                      setForm((x) => ({ ...x, solution: e.target.value }))
                    }
                    className={`${input} min-h-24 py-3`}
                  />
                </Field>
                <Field text="اثر" required>
                  <div className="flex min-h-11 flex-wrap items-center gap-3 rounded-xl border border-black/10 bg-white px-3 py-2 dark:border-white/15 dark:bg-white/5">
                    {impacts.map(([id, name]) => (
                      <label
                        key={id}
                        className="flex items-center gap-1 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={form.impacts.includes(id)}
                          onChange={() =>
                            setForm((x) => ({
                              ...x,
                              impacts: x.impacts.includes(id)
                                ? x.impacts.filter((v) => v !== id)
                                : [...x.impacts, id],
                            }))
                          }
                        />
                        {name}
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <Field text="برچسب‌ها" required>
                  <TagButton
                    count={form.tagIds.length}
                    onClick={() => openTags("form")}
                  />
                </Field>
                <Field text="بارگذاری">
                  <button
                    type="button"
                    onClick={() => setUploadOpen(true)}
                    className="relative grid h-11 w-14 place-items-center rounded-xl border border-black/10 bg-white dark:border-white/15 dark:bg-white/5"
                  >
                    <img
                      src="/images/icons/Uplod.svg"
                      alt=""
                      className={`h-5 w-5 dark:invert ${uploading ? "animate-pulse" : ""}`}
                    />
                    {form.files.length > 0 && (
                      <Badge value={form.files.length} />
                    )}
                  </button>
                </Field>
                <button
                  type="button"
                  onClick={submit}
                  disabled={saving || uploading}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white disabled:opacity-50 dark:border-white/15 dark:bg-white/5"
                  title="افزودن به جدول"
                >
                  <img
                    src="/images/icons/afzodan.svg"
                    alt=""
                    className="h-4 w-4 dark:invert"
                  />
                </button>
              </div>
            </div>
          )}
          {error && (
            <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {notice && (
            <div className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {notice}
            </div>
          )}
          <LessonsTable
            items={filtered}
            hasUnfilteredItems={items.some((item) =>
              canDisplayLesson(item, canReview),
            )}
            loading={loading}
            canReview={canReview}
            selectedIds={selectedIds}
            allSelected={allSelected}
            deleting={deleting}
            onToggleAll={() =>
              setSelectedIds(
                allSelected
                  ? new Set()
                  : new Set(filtered.map((item) => String(item.id))),
              )
            }
            onToggleSelected={toggleSelected}
            onOpenItem={openView}
            onEditSelected={editSelected}
            onDeleteSelected={deleteSelected}
            onOpenAuthorInfo={(item, rect) =>
              setAuthorInfoItem({
                item,
                top: rect.bottom + 7,
                left: Math.max(
                  8,
                  Math.min(rect.left - 120, window.innerWidth - 292),
                ),
              })
            }
          />
        </div>
      </Card>
      {tagOpen && (
        <TagPicker
          tags={tags}
          query={tagQuery}
          setQuery={setTagQuery}
          selected={tagDraft}
          setSelected={setTagDraft}
          onClose={() => setTagOpen(false)}
          onConfirm={() => {
            const ids = [...new Set(tagDraft.map(String))];
            tagFor === "form"
              ? setForm((x) => ({ ...x, tagIds: ids }))
              : setFilterTagIds(ids);
            setTagOpen(false);
          }}
        />
      )}
      {uploadOpen && (
        <LessonUploadModal
          fileRef={fileRef}
          files={form.files}
          uploading={uploading}
          onUpload={upload}
          onRemove={(index) =>
            setForm((old) => ({
              ...old,
              files: old.files.filter((_, position) => position !== index),
            }))
          }
          onClose={() => setUploadOpen(false)}
        />
      )}
      {viewItem &&
        (viewItem.status === "pending" && canReview ? (
          <LessonReviewModal
            item={viewItem}
            projects={projects}
            tags={tags}
            lessonCategories={lessonCategories}
            headers={headers}
            onClose={() => setViewItem(null)}
            onDecision={decideReview}
          />
        ) : (
          <LessonDetailModal
            item={viewItem}
            tags={tags}
            onClose={() => setViewItem(null)}
          />
        ))}
      {authorInfoItem && (
        <AuthorPopover
          data={authorInfoItem}
          onClose={() => setAuthorInfoItem(null)}
        />
      )}
    </div>
  );
}

function Field({ text, required, children }) {
  return (
    <div>
      <div className={label}>
        {text}
        {required && <span className="mr-1 text-red-600">*</span>}
      </div>
      {children}
    </div>
  );
}
function Badge({ value }) {
  return (
    <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[10px] text-white">
      {fa(value)}
    </span>
  );
}
function TagButton({ count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative grid h-11 w-14 place-items-center rounded-xl border border-black/10 bg-white dark:border-white/15 dark:bg-white/5"
      title="انتخاب برچسب"
    >
      <span className="text-lg">•••</span>
      {count > 0 && <Badge value={count} />}
    </button>
  );
}
function LessonDetailModal({ item, tags, onClose }) {
  const tagMap = new Map(tags.map((tag) => [String(tag.id), tag.label]));
  const importanceLabel =
    importance.find(([id]) => id === item.importance)?.[1] || "—";
  const importanceTone =
    item.importance === "high"
      ? "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20"
      : item.importance === "medium"
        ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"
        : "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20";
  const fileSize = (value) => {
    const size = Number(value || 0);
    if (!size) return "";
    return size >= 1024 * 1024
      ? `${(size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.round(size / 1024))} KB`;
  };
  return createPortal(
    <div className="fixed inset-0 z-[9999]" dir="rtl">
      <div
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">
        <article className="relative flex max-h-[calc(100dvh-24px)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-black/10 bg-white text-neutral-900 shadow-[0_30px_90px_rgba(15,23,42,.35)] dark:border-white/10 dark:bg-neutral-900 dark:text-white">
          <header className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 md:px-7 md:pt-6">
            <div className="flex min-w-0 items-start gap-3">
              <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <Check className="h-4 w-4" />
                ثبت‌شده
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-extrabold md:text-lg">
                  مشاهده درس‌آموخته
                </h2>
                <p className="mt-1 text-xs text-neutral-500">
                  جزئیات ثبت‌شده این مورد
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-900 text-white shadow-sm transition hover:bg-black dark:bg-white dark:text-black dark:hover:bg-neutral-100"
              aria-label="بستن"
            >
              <img
                src="/images/icons/bastan.svg"
                alt=""
                className="h-5 w-5 invert dark:invert-0"
              />
            </button>
          </header>

          <div className="overflow-y-auto px-5 pb-5 md:px-7 md:pb-6">
            <section className="grid overflow-hidden rounded-2xl border border-black/10 bg-neutral-50/40 md:grid-cols-3 dark:border-white/10 dark:bg-white/[.025]">
              <SummaryItem
                icon={<BriefcaseBusiness className="h-5 w-5" />}
                label="پروژه"
                value={`${item.projectCode || ""}${item.projectCode && item.projectName ? " - " : ""}${item.projectName || "—"}`}
              />
              <SummaryItem
                icon={<Grid2X2 className="h-5 w-5" />}
                label="دسته‌بندی درس‌آموخته"
                value={
                  <span className="inline-flex rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                    {item.category}
                  </span>
                }
                bordered
              />
              <SummaryItem
                icon={<Star className="h-5 w-5" />}
                label="اهمیت"
                value={
                  <span
                    className={`inline-flex rounded-xl px-4 py-2 text-sm font-bold ring-1 ${importanceTone}`}
                  >
                    {importanceLabel}
                  </span>
                }
                bordered
              />
            </section>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <LessonTextCard
                icon={<TriangleAlert className="h-6 w-6 text-amber-500" />}
                title="چالش"
                text={item.challenge}
              />
              <LessonTextCard
                icon={
                  <Lightbulb className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                }
                title="راهکار"
                text={item.solution}
              />
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <section>
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  اثر
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.impacts?.length ? (
                    item.impacts.map((id) => (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {impacts.find(([key]) => key === id)?.[1] || id}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-neutral-400">—</span>
                  )}
                </div>
              </section>
              <section>
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <Tag className="h-5 w-5" />
                  برچسب‌ها
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.tagIds?.length ? (
                    item.tagIds.map((id) => (
                      <span
                        key={id}
                        className="rounded-lg border border-black/10 bg-neutral-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/5"
                      >
                        {tagMap.get(String(id)) || id}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-neutral-400">—</span>
                  )}
                </div>
              </section>
            </div>

            {item.files?.length > 0 && (
              <section className="mt-5">
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <Paperclip className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  فایل‌های مرتبط
                </h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {item.files.map((file, index) => {
                    const extension =
                      String(file.name || "")
                        .split(".")
                        .pop()
                        ?.toUpperCase() || "FILE";
                    return (
                      <a
                        key={file.url || index}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[.03]"
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[10px] font-extrabold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                          {extension}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {file.name}
                          </span>
                          <span className="mt-1 block text-[11px] text-neutral-500">
                            {[extension, fileSize(file.size)]
                              .filter(Boolean)
                              .join(" • ")}
                          </span>
                        </span>
                        <Download className="h-5 w-5 shrink-0 text-neutral-500" />
                      </a>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-black/10 px-5 py-4 dark:border-white/10 md:px-7">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl bg-blue-600 px-7 text-xs font-bold text-white transition hover:bg-blue-700"
            >
              مشاهده کردم
            </button>
          </footer>
        </article>
      </div>
    </div>,
    document.body,
  );
}
function SummaryItem({ icon, label: title, value, bordered = false }) {
  return (
    <div
      className={`flex min-h-24 flex-col items-center justify-center px-5 py-4 text-center ${bordered ? "border-t border-black/10 md:border-r md:border-t-0 dark:border-white/10" : ""}`}
    >
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        {icon}
        {title}
      </div>
      <div className="mt-2 max-w-full text-sm font-bold">{value}</div>
    </div>
  );
}
function LessonTextCard({ icon, title, text }) {
  return (
    <section className="min-h-44 rounded-2xl border border-black/10 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.04)] dark:border-white/10 dark:bg-white/[.025]">
      <h3 className="flex items-center gap-2 text-base font-bold">
        {icon}
        {title}
      </h3>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-neutral-700 dark:text-neutral-200">
        {text || "—"}
      </p>
    </section>
  );
}
function DetailStat({ label: title, value }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-neutral-50/70 p-3 dark:border-white/10 dark:bg-white/[.04]">
      <div className="text-[11px] text-neutral-500">{title}</div>
      <div
        className="mt-1 truncate text-sm font-semibold"
        title={String(value || "")}
      >
        {value || "—"}
      </div>
    </div>
  );
}
function DetailText({ title, text }) {
  return (
    <section className="min-h-36 rounded-2xl border border-black/10 bg-neutral-50/50 p-4 dark:border-white/10 dark:bg-white/[.03]">
      <h3 className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
        {title}
      </h3>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
        {text || "—"}
      </p>
    </section>
  );
}
function LessonUploadModal({
  fileRef,
  files,
  uploading,
  onUpload,
  onRemove,
  onClose,
}) {
  const drop = (event) => {
    event.preventDefault();
    if (event.dataTransfer?.files?.length) onUpload(event.dataTransfer.files);
  };
  return createPortal(
    <div className="fixed inset-0 z-[9999]" dir="rtl">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-3">
        <div className="relative flex max-h-[calc(100dvh-24px)] w-[min(720px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-xl dark:border-white/10 dark:bg-neutral-900 dark:text-white">
          <header className="flex items-center justify-between gap-3 border-b border-black/10 p-4 dark:border-white/10">
            <div className="text-sm font-bold">
              بارگذاری فایل‌های درس‌آموخته
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black"
              aria-label="بستن"
            >
              <img
                src="/images/icons/bastan.svg"
                alt=""
                className="h-4 w-4 invert dark:invert-0"
              />
            </button>
          </header>
          <div className="overflow-y-auto p-4">
            <div className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">
              فایل‌های انتخاب‌شده
            </div>
            <div className="space-y-2">
              {files.length ? (
                files.map((file, index) => (
                  <div
                    key={file.url || index}
                    className="flex items-center gap-3 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10"
                  >
                    <img
                      src="/images/icons/Uplod.svg"
                      alt=""
                      className="h-5 w-5 dark:invert"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      className="grid h-8 w-8 place-items-center rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                      title="حذف"
                    >
                      <img
                        src="/images/icons/hazf.svg"
                        alt=""
                        className="h-4 w-4"
                      />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-5 text-center text-sm text-neutral-500">
                  فایلی انتخاب نشده است.
                </div>
              )}
            </div>
            <div
              onDrop={drop}
              onDragOver={(event) => event.preventDefault()}
              className="mt-3 rounded-2xl border border-dashed border-black/15 bg-black/[.01] px-4 py-8 text-center dark:border-white/15 dark:bg-white/[.03]"
            >
              <div className="text-sm font-semibold">
                فایل را اینجا رها کنید
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                فایل‌های مجاز: PDF، Word و Excel
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                <img
                  src="/images/icons/upload.svg"
                  alt=""
                  className="h-5 w-5 invert dark:invert-0"
                />
                {uploading ? "در حال بارگذاری..." : "انتخاب فایل"}
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.csv,.rtf"
                className="hidden"
                onChange={(event) => {
                  onUpload(event.target.files);
                  event.target.value = "";
                }}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white disabled:opacity-50 dark:bg-white dark:text-black"
                title="تأیید"
              >
                <img
                  src="/images/icons/check.svg"
                  alt=""
                  className="h-5 w-5 invert dark:invert-0"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
function AuthorPopover({ data, onClose }) {
  const { item, top, left } = data;
  return createPortal(
    <>
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 z-[9998] cursor-default"
        aria-label="بستن اطلاعات دانش‌آفرین"
      />
      <div
        dir="rtl"
        style={{ top, left }}
        className="fixed z-[9999] w-[284px] rounded-2xl border border-black/10 bg-white p-3.5 text-sm shadow-[0_14px_36px_rgba(0,0,0,.18)] dark:border-white/10 dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between">
          <b>{item.authorName}</b>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          >
            ×
          </button>
        </div>
        <div className="mt-3 space-y-2 text-xs text-neutral-700 dark:text-neutral-200">
          <p>
            تعداد بازدید این مورد: <b>{fa(item.viewCount || 0)}</b>
          </p>
          <p>
            موارد ثبت‌شده توسط کاربر: <b>{fa(item.authorPostCount || 0)}</b>
          </p>
        </div>
      </div>
    </>,
    document.body,
  );
}
function FilterBar({
  query,
  setQuery,
  from,
  setFrom,
  to,
  setTo,
  tags,
  selected,
  openTags,
  onExport,
  canExport,
}) {
  return (
    <div className="mb-4 rounded-2xl border border-neutral-200 bg-neutral-100/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[.06]">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full md:min-w-[280px] md:flex-1">
          <div className={label}>جست و جو</div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={input}
            placeholder="جستجو در پروژه، دسته‌بندی، چالش و راهکار..."
          />
        </div>
        <div className="w-[calc(50%-0.25rem)] md:w-auto md:min-w-[140px]">
          <div className={label}>از</div>
          <JalaliPopupDatePicker
            value={from}
            onChange={setFrom}
            buttonClassName={`${input} flex items-center justify-between gap-2`}
          />
        </div>
        <div className="w-[calc(50%-0.25rem)] md:w-auto md:min-w-[140px]">
          <div className={label}>تا</div>
          <JalaliPopupDatePicker
            value={to}
            onChange={setTo}
            buttonClassName={`${input} flex items-center justify-between gap-2`}
          />
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={!canExport}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-50 hover:shadow-md disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
          title="خروجی اکسل"
          aria-label="خروجی اکسل"
        >
          <img src="/images/icons8-excel-50.png" alt="" className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-2">
        <div className={label}>برچسب‌ها</div>
        <div className="flex flex-wrap items-center gap-2">
          <TagButton count={selected.length} onClick={openTags} />
          {selected
            .map((id) => tags.find((t) => String(t.id) === String(id)))
            .filter(Boolean)
            .map((tag) => (
              <span
                key={tag.id}
                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs dark:border-white/15 dark:bg-white/5"
              >
                {tag.label}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
function TagPicker({
  tags,
  query,
  setQuery,
  selected,
  setSelected,
  onClose,
  onConfirm,
}) {
  const current = new Set(selected.map(String));
  const list = tags.filter((t) =>
    String(t.label || "")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return createPortal(
    <div className="fixed inset-0 z-[9999]" dir="rtl">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="flex h-[min(75vh,680px)] w-full max-w-4xl flex-col rounded-2xl bg-white p-4 shadow-2xl dark:bg-neutral-900">
          <div className="mb-3 flex items-center justify-between">
            <b>انتخاب برچسب</b>
            <button type="button" onClick={onClose}>
              ×
            </button>
          </div>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={input}
            placeholder="جستجو در برچسب‌ها..."
          />
          <div className="mt-4 flex flex-1 flex-wrap content-start gap-2 overflow-auto">
            {list.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() =>
                  setSelected((old) =>
                    current.has(String(tag.id))
                      ? old.filter((id) => String(id) !== String(tag.id))
                      : [...old, String(tag.id)],
                  )
                }
                className={`h-10 rounded-full border px-4 text-xs ${current.has(String(tag.id)) ? "border-black bg-black text-white" : "border-black/10"}`}
              >
                {tag.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onConfirm}
              className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white"
            >
              ✓
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
