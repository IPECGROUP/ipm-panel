import { createPortal } from "react-dom";

export default function DocumentUploadModal({ title = "بارگذاری اسناد", files = [], fileRef, uploading = false, onUpload, onRemove, onClose }) {
  const handleDrop = (event) => {
    event.preventDefault();
    if (event.dataTransfer?.files?.length) onUpload(event.dataTransfer.files);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999]" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3">
        <section className="w-[min(640px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-xl dark:border-white/10 dark:bg-neutral-900 dark:text-white" onClick={(event) => event.stopPropagation()}>
          <header className="flex items-center justify-between gap-3 px-4 py-3">
            <h2 className="min-w-0 truncate text-sm font-bold">{title}</h2>
            <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black text-xl text-white dark:bg-white dark:text-black" aria-label="بستن">×</button>
          </header>
          <div className="h-px bg-black/10 dark:bg-white/10" />
          <div className="space-y-3 p-3 sm:p-4">
            <div>
              <div className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">فایل‌های انتخاب‌شده</div>
              <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
                <div className="divide-y divide-black/10 dark:divide-white/10">
                  {files.length ? files.map((file, index) => (
                    <div key={file.id || `${file.name}_${index}`} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold" title={file.name}>{file.name || `فایل ${index + 1}`}</span>
                      <button type="button" onClick={() => onRemove(file.id)} disabled={uploading} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10" aria-label={`حذف ${file.name || "فایل"}`} title="حذف">
                        <img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" />
                      </button>
                    </div>
                  )) : <div className="py-6 text-center text-sm text-neutral-500">فایلی انتخاب نشده است.</div>}
                </div>
              </div>
            </div>
            <div onDrop={handleDrop} onDragOver={(event) => event.preventDefault()} className="rounded-2xl border border-dashed border-black/15 bg-black/[.01] px-4 py-7 text-center dark:border-white/15 dark:bg-white/[.03]">
              <div className="text-sm font-semibold">فایل را اینجا رها کنید</div>
              <div className="mt-1 text-xs text-neutral-500">هر نوع فایلی را می‌توانید انتخاب کنید</div>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black">
                <img src="/images/icons/upload.svg" alt="" className="h-5 w-5 invert dark:invert-0" />
                {uploading ? "در حال بارگذاری..." : "انتخاب فایل"}
              </button>
              <input ref={fileRef} type="file" multiple accept=".pdf,image/*,.xls,.xlsx,.doc,.docx" className="hidden" onChange={(event) => { onUpload(event.target.files); event.target.value = ""; }} />
            </div>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
