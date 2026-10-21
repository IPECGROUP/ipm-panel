import React, { useState } from "react";
import { ChoiceModal } from "./RelatedLettersPickerModal.jsx";

function normalize(value) {
  return String(value ?? "").toLocaleLowerCase("fa").replace(/[ي]/g, "ی").replace(/[ك]/g, "ک").replace(/[\u200c\u200d]/g, " ").replace(/\s+/g, " ").trim();
}

export default function LibraryItemsPickerModal({ title, query, onQueryChange, items, selectedIds, onToggle, onConfirm, onClose }) {
  const [previewItem, setPreviewItem] = useState(null);
  const terms = normalize(query).split(" ").filter(Boolean);
  const rows = (Array.isArray(items) ? items : []).filter((item) => terms.every((term) => normalize([item.title, item.libraryTitle, ...(item.files || []).map((file) => file.name)].join(" ")).includes(term)));
  const visibleRows = rows.slice(0, 200);
  const footer = <div className="flex shrink-0 justify-end border-t border-black/10 p-3 dark:border-white/10"><button type="button" onClick={onConfirm} className="grid h-10 min-w-10 place-items-center rounded-xl bg-black px-3 text-white transition hover:bg-black/90" title="تأیید انتخاب مستندات" aria-label="تأیید انتخاب مستندات"><img src="/images/icons/check.svg" alt="" className="h-5 w-5 brightness-0 invert" /></button></div>;

  return <ChoiceModal title={title} query={query} onQueryChange={onQueryChange} loading={false} footer={footer} onClose={onClose} blackActions searchPlaceholder="جستجو در عنوان مستند و کتابخانه...">
    {rows.length ? <div className="space-y-1">{visibleRows.map((item) => {
      const id = String(item.id);
      const checked = selectedIds.includes(id);
      return <div key={id} className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-right transition ${checked ? "border-emerald-200 bg-emerald-50 text-emerald-950 shadow-sm dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100" : "border-transparent hover:bg-black/[0.04] dark:hover:bg-white/10"}`}>
        <button type="button" onClick={() => onToggle(id)} className="min-w-0 flex-1 text-right"><span className="block truncate font-bold">{item.title}</span><span className={`mt-1 block truncate text-xs ${checked ? "text-emerald-700/80 dark:text-emerald-200/80" : "text-neutral-500 dark:text-neutral-400"}`}>{item.libraryTitle || "کتابخانه"}</span></button>
        {(item.files || []).length > 0 && <button type="button" onClick={() => setPreviewItem(previewItem?.id === item.id ? null : item)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition hover:bg-emerald-100/80 dark:hover:bg-emerald-400/15" title="نمایش فایل‌های مستند" aria-label="نمایش فایل‌های مستند"><img src="/images/icons/namayesh.svg" alt="" className="h-4 w-4 dark:invert" /></button>}
        <button type="button" onClick={() => onToggle(id)} className={`grid h-5 w-5 shrink-0 place-items-center rounded border text-xs font-bold ${checked ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-300 dark:bg-emerald-300 dark:text-emerald-950" : "border-neutral-300 dark:border-neutral-600"}`} aria-label="انتخاب مستند">{checked ? "✓" : ""}</button>
      </div>;
    })}{rows.length > visibleRows.length && <div className="px-3 py-2 text-center text-xs text-neutral-500">۲۰۰ مورد نخست نمایش داده شده است؛ برای یافتن سایر مستندات جستجو کنید.</div>}</div> : <div className="p-5 text-center text-sm text-neutral-500">مستندی پیدا نشد.</div>}
    {previewItem && <div className="mt-3 rounded-xl border border-black/10 bg-neutral-50 p-3 text-sm dark:border-white/10 dark:bg-white/5"><div className="mb-2 font-semibold">{previewItem.title}</div><div className="space-y-1">{previewItem.files.map((file, index) => <a key={`${file.url}-${index}`} href={file.url} target="_blank" rel="noreferrer" className="block truncate rounded-lg px-2 py-1 text-blue-700 hover:bg-black/5 hover:underline dark:text-blue-300 dark:hover:bg-white/10">{file.name || "مشاهده فایل"}</a>)}</div></div>}
  </ChoiceModal>;
}
