import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Paperclip, X } from "lucide-react";

const INPUT_CLASS = [
  "h-11 w-full rounded-xl border border-black/10 bg-white px-3",
  "text-right text-sm outline-none transition",
  "focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-neutral-100",
].join(" ");

const IMPACT_OPTIONS = [
  ["time", "زمان"],
  ["cost", "هزینه"],
  ["quality", "کیفیت"],
  ["satisfaction", "رضایت کارفرما"],
];

const IMPORTANCE_OPTIONS = [
  ["low", "کم"],
  ["medium", "متوسط"],
  ["high", "زیاد"],
];

function createDraft(item) {
  return {
    projectId: String(item.projectId),
    category: item.category,
    challenge: item.challenge,
    solution: item.solution,
    importance: item.importance,
    impacts: item.impacts || [],
    tagIds: (item.tagIds || []).map(String),
    files: item.files || [],
  };
}

function isDraftComplete(draft) {
  return Boolean(
    draft.projectId &&
    draft.category.trim() &&
    draft.challenge.trim() &&
    draft.solution.trim() &&
    draft.importance &&
    draft.impacts.length &&
    draft.tagIds.length,
  );
}

function Field({ label, required = false, children }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
        {label}
        {required && <span className="mr-1 text-red-600">*</span>}
      </div>
      {children}
    </div>
  );
}

export default function LessonReviewModal({
  item,
  projects,
  tags,
  headers,
  onClose,
  onDecision,
}) {
  const [draft, setDraft] = useState(() => createDraft(item));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const updateDraft = (changes) => {
    setDraft((current) => ({ ...current, ...changes }));
  };

  const toggleImpact = (impactId) => {
    const nextImpacts = draft.impacts.includes(impactId)
      ? draft.impacts.filter((id) => id !== impactId)
      : [...draft.impacts, impactId];
    updateDraft({ impacts: nextImpacts });
  };

  const toggleTag = (tagId) => {
    const normalizedId = String(tagId);
    const nextTagIds = draft.tagIds.includes(normalizedId)
      ? draft.tagIds.filter((id) => id !== normalizedId)
      : [...draft.tagIds, normalizedId];
    updateDraft({ tagIds: nextTagIds });
  };

  const removeFile = (fileIndex) => {
    updateDraft({
      files: draft.files.filter((_, index) => index !== fileIndex),
    });
  };

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setUploading(true);
    setError("");

    try {
      const uploadedFiles = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/project-lessons/upload", {
          method: "POST",
          credentials: "include",
          headers,
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "upload_failed");
        uploadedFiles.push(data.file);
      }

      setDraft((current) => ({
        ...current,
        files: [...current.files, ...uploadedFiles],
      }));
    } catch (uploadError) {
      setError(uploadError.message || "بارگذاری فایل انجام نشد.");
    } finally {
      setUploading(false);
    }
  };

  const decide = async (action) => {
    if (action === "approve" && !isDraftComplete(draft)) {
      setError("همه فیلدها به‌جز بارگذاری اجباری هستند.");
      return;
    }

    if (
      action === "reject" &&
      !window.confirm(
        "این درس‌آموخته رد شود؟ مورد ردشده در جدول ذخیره نخواهد شد.",
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onDecision(item, action, draft);
    } catch (decisionError) {
      setError(decisionError.message || "انجام عملیات ممکن نشد.");
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999]" dir="rtl">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">
        <article className="relative flex max-h-[calc(100dvh-24px)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-sky-200 bg-white text-neutral-900 shadow-[0_30px_90px_rgba(15,23,42,.4)] dark:border-sky-500/20 dark:bg-neutral-900 dark:text-white">
          <ReviewHeader onClose={onClose} disabled={saving} />

          <div className="overflow-y-auto px-5 py-5 md:px-7">
            <LessonFields
              draft={draft}
              projects={projects}
              tags={tags}
              updateDraft={updateDraft}
              toggleImpact={toggleImpact}
              toggleTag={toggleTag}
            />

            <FileEditor
              files={draft.files}
              uploading={uploading}
              disabled={saving}
              fileInputRef={fileInputRef}
              onSelectFiles={uploadFiles}
              onRemoveFile={removeFile}
            />

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            )}
          </div>

          <ReviewActions
            saving={saving}
            uploading={uploading}
            onApprove={() => decide("approve")}
            onReject={() => decide("reject")}
          />
        </article>
      </div>
    </div>,
    document.body,
  );
}

function ReviewHeader({ onClose, disabled }) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-black/[.07] px-5 py-5 dark:border-white/10 md:px-7">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,.13)]" />
        <div>
          <h2 className="text-base font-extrabold md:text-lg">
            بررسی درس‌آموخته جدید
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            تمام فیلدها قابل ویرایش هستند؛ پس از بازبینی تأیید یا رد کنید.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        disabled={disabled}
        className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-900 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        aria-label="بستن"
      >
        <X className="h-5 w-5" />
      </button>
    </header>
  );
}

function LessonFields({
  draft,
  projects,
  tags,
  updateDraft,
  toggleImpact,
  toggleTag,
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Field label="پروژه" required>
        <select
          value={draft.projectId}
          onChange={(event) => updateDraft({ projectId: event.target.value })}
          className={INPUT_CLASS}
        >
          <option value="">انتخاب کنید</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.code} - {project.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="دسته‌بندی درس‌آموخته" required>
        <input
          value={draft.category}
          onChange={(event) => updateDraft({ category: event.target.value })}
          className={INPUT_CLASS}
        />
      </Field>

      <Field label="اهمیت" required>
        <div className="flex h-11 items-center gap-3 rounded-xl border border-black/10 bg-white px-3 dark:border-white/15 dark:bg-white/5">
          {IMPORTANCE_OPTIONS.map(([id, name]) => (
            <label key={id} className="flex items-center gap-1.5 text-xs">
              <input
                type="radio"
                name="review-importance"
                checked={draft.importance === id}
                onChange={() => updateDraft({ importance: id })}
              />
              {name}
            </label>
          ))}
        </div>
      </Field>

      <div className="grid gap-4 md:col-span-3 md:grid-cols-2">
        <Field label="چالش" required>
          <textarea
            value={draft.challenge}
            onChange={(event) => updateDraft({ challenge: event.target.value })}
            className={`${INPUT_CLASS} min-h-32 py-3`}
          />
        </Field>
        <Field label="راهکار" required>
          <textarea
            value={draft.solution}
            onChange={(event) => updateDraft({ solution: event.target.value })}
            className={`${INPUT_CLASS} min-h-32 py-3`}
          />
        </Field>
      </div>

      <Field label="اثر" required>
        <div className="flex min-h-11 flex-wrap items-center gap-3 rounded-xl border border-black/10 bg-white px-3 py-2 dark:border-white/15 dark:bg-white/5">
          {IMPACT_OPTIONS.map(([id, name]) => (
            <label key={id} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={draft.impacts.includes(id)}
                onChange={() => toggleImpact(id)}
              />
              {name}
            </label>
          ))}
        </div>
      </Field>

      <div className="md:col-span-2">
        <Field label="برچسب‌ها" required>
          <div className="flex min-h-11 flex-wrap gap-2 rounded-xl border border-black/10 bg-white p-2 dark:border-white/15 dark:bg-white/5">
            {tags.map((tag) => {
              const selected = draft.tagIds.includes(String(tag.id));
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    selected
                      ? "border-sky-600 bg-sky-600 text-white"
                      : "border-black/10 hover:border-sky-300 dark:border-white/15"
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </Field>
      </div>
    </div>
  );
}

function FileEditor({
  files,
  uploading,
  disabled,
  fileInputRef,
  onSelectFiles,
  onRemoveFile,
}) {
  return (
    <section className="mt-4 rounded-2xl border border-black/10 p-3 dark:border-white/10">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold">فایل‌های مرتبط</h3>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || disabled}
          className="h-9 rounded-xl border border-black/10 px-3 text-xs font-semibold disabled:opacity-50 dark:border-white/15"
        >
          {uploading ? "در حال بارگذاری..." : "افزودن فایل"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.csv,.rtf"
          className="hidden"
          onChange={(event) => {
            onSelectFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {files.length ? (
          files.map((file, index) => (
            <span
              key={file.url || index}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-xs dark:bg-white/5"
            >
              <Paperclip className="h-4 w-4" />
              <span className="max-w-52 truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => onRemoveFile(index)}
                className="text-red-600"
                aria-label={`حذف ${file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-xs text-neutral-400">
            فایلی بارگذاری نشده است.
          </span>
        )}
      </div>
    </section>
  );
}

function ReviewActions({ saving, uploading, onApprove, onReject }) {
  const disabled = saving || uploading;

  return (
    <footer className="flex items-center justify-end gap-3 border-t border-black/10 px-5 py-4 dark:border-white/10 md:px-7">
      <button
        type="button"
        onClick={onReject}
        disabled={disabled}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-100 disabled:translate-y-0 disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
      >
        <X className="h-5 w-5" />
        رد
      </button>

      <button
        type="button"
        onClick={onApprove}
        disabled={disabled}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(5,150,105,.25)] transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:translate-y-0 disabled:opacity-50"
      >
        <Check className="h-5 w-5" />
        {saving ? "در حال ثبت..." : "تأیید"}
      </button>
    </footer>
  );
}
