import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ExternalLink, FileText, LoaderCircle, Trash2, Upload, X } from "lucide-react";

const defaultAccept = ".pdf,.doc,.docx,.rtf,.xls,.xlsx,.xlsm,.csv";

function fileLabel(file) {
  return file?.name || file?.originalName || "فایل انتخاب‌شده";
}

/**
 * Reusable attachment dialog for every area that uploads files.
 * `onUpload` owns the API call, so each screen can keep its own endpoint and permissions.
 */
export default function AdvancedFileUploadModal({
  title = "بارگذاری فایل",
  files = [],
  uploading = false,
  onUpload,
  onSelectFiles,
  onRemove,
  onClose,
  accept = defaultAccept,
  allowedTypes = "PDF، Word و Excel",
  multiple = true,
  confirmLabel = "تأیید پیوست",
}) {
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const [dropActive, setDropActive] = useState(false);

  const selectFiles = (fileList) => {
    if (!fileList?.length || uploading) return;
    const normalized = multiple ? fileList : [fileList[0]];
    if (onSelectFiles) onSelectFiles(normalized);
    else onUpload?.(normalized);
  };

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector("button")?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[9999]" dir="rtl">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onMouseDown={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
        <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="advanced-upload-title"
          className="relative flex max-h-[90dvh] w-[min(100%,1000px)] flex-col overflow-hidden rounded-3xl border border-white/30 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white"
          onMouseDown={(event) => event.stopPropagation()}>
          <header className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-4 dark:border-white/10">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-neutral-100 dark:bg-white/10"><Upload className="h-5 w-5" /></span>
              <h2 id="advanced-upload-title" className="font-bold">{title}</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="بستن پنجره بارگذاری" className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black"><X className="h-4 w-4" /></button>
          </header>

          <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
            <input ref={inputRef} type="file" className="hidden" accept={accept} multiple={multiple}
              onChange={(event) => { selectFiles(event.target.files); event.target.value = ""; }} />
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">فایل‌های پیوست‌شده</p>
              <div className="space-y-2">
                {files.length ? files.map((file, index) => <div key={file.url || `${fileLabel(file)}-${index}`} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[.03]">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white shadow-sm dark:bg-white/10"><FileText className="h-4 w-4 text-neutral-600 dark:text-neutral-300" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold" title={fileLabel(file)}>{fileLabel(file)}</span>{file.size ? <span className="mt-0.5 block text-[11px] text-neutral-500">{Math.ceil(file.size / 1024).toLocaleString("fa-IR")} کیلوبایت</span> : null}</span>
                  {file.url ? <a href={file.url} target="_blank" rel="noreferrer" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition hover:bg-black/[.06] dark:hover:bg-white/10" title="باز کردن فایل" aria-label="باز کردن فایل"><ExternalLink className="h-4 w-4" /></a> : null}
                  <button type="button" disabled={uploading} onClick={() => onRemove?.(index)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-500/10" title="حذف فایل" aria-label="حذف فایل"><Trash2 className="h-4 w-4" /></button>
                </div>) : <div className="rounded-xl border border-dashed border-neutral-200 py-5 text-center text-sm text-neutral-500 dark:border-white/10">هنوز فایلی انتخاب نشده است.</div>}
              </div>
            </div>

            <div onDragOver={(event) => { event.preventDefault(); setDropActive(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDropActive(false); }}
              onDrop={(event) => { event.preventDefault(); setDropActive(false); selectFiles(event.dataTransfer.files); }}
              className={`flex min-h-64 flex-col items-center justify-center rounded-2xl border-2 p-5 text-center transition ${dropActive ? "border-sky-400 bg-sky-50 dark:bg-sky-500/10" : "border-dashed border-neutral-300 bg-neutral-50 dark:border-white/20 dark:bg-white/[.03]"}`}>
              <span className="grid h-16 w-16 place-items-center rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/10"><Upload className="h-8 w-8" /></span>
              <p className="mt-4 text-sm font-bold sm:text-base">فایل را اینجا رها کنید یا برای انتخاب کلیک کنید</p>
              <p className="mt-2 text-xs text-neutral-500">فایل‌های مجاز: {allowedTypes}</p>
              <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-black">
                {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{uploading ? "در حال بارگذاری..." : "انتخاب فایل"}
              </button>
            </div>
          </div>

          <footer className="flex justify-end border-t border-neutral-100 px-5 py-4 dark:border-white/10">
            <button type="button" onClick={onClose} className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-5 text-sm font-bold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black"><Check className="h-4 w-4" />{confirmLabel}</button>
          </footer>
        </section>
      </div>
    </div>,
    document.body,
  );
}
