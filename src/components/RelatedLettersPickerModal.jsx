import React, { useState } from "react";
import { createPortal } from "react-dom";
import { toEnglishDigits } from "../utils/format";
import DocumentPreviewModal from "./DocumentPreviewModal.jsx";

const inputClass = "w-full h-11 rounded-xl border border-black/10 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-white";

function toFa(value) {
  return String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function normalizeDigits(value = "") {
  return toEnglishDigits(String(value ?? "")).replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

function normalizeSearchText(value = "") {
  return normalizeDigits(value)
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200d]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function ChoiceModal({ title, query, onQueryChange, loading, children, footer, onClose, blackActions = false, searchPlaceholder = "جستجو با شماره، موضوع یا شرح..." }) {
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex max-h-[min(88vh,700px)] w-[min(760px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10"><b className="text-sm">{title}</b><button type="button" onClick={onClose} className={`grid h-10 w-10 place-items-center rounded-xl text-xl transition ${blackActions ? "bg-black text-white hover:bg-black/90" : "border border-black/10 dark:border-white/10"}`} aria-label="بستن">×</button></div>
        <div className="border-b border-black/10 p-3 dark:border-white/10"><input autoFocus value={query} onChange={(event) => onQueryChange(event.target.value)} className={inputClass} placeholder={searchPlaceholder} /></div>
        <div className="min-h-40 flex-1 overflow-y-auto p-2">{loading ? <div className="p-5 text-center text-sm text-neutral-500">در حال دریافت...</div> : children}</div>
        {footer}
      </div>
    </div>, document.body
  );
}

export default function RelatedLettersPickerModal({ api, title = "انتخاب نامه مرتبط", query, onQueryChange, loading, items, selectedIds, onToggle, onConfirm, onClose, blackActions = false }) {
  const [previewLetter, setPreviewLetter] = useState(null);
  const terms = normalizeSearchText(query).split(" ").filter(Boolean);
  const rows = (Array.isArray(items) ? items : []).filter((item) => {
    if (!terms.length) return true;
    const searchableText = normalizeSearchText([item.letterNo, item.letter_no, item.secretariatNo, item.secretariat_no, item.subject, item.title, item.description, item.organization, item.companyName].join(" "));
    return terms.every((term) => searchableText.includes(term));
  });
  const visibleRows = rows.slice(0, 200);

  const confirmFooter = typeof onConfirm === "function" ? <div className="flex shrink-0 justify-end border-t border-black/10 p-3 dark:border-white/10"><button type="button" onClick={onConfirm} className={`grid h-10 min-w-10 place-items-center rounded-xl bg-black px-3 text-sm font-semibold text-white transition hover:bg-black/90 ${blackActions ? "dark:bg-black dark:text-white" : "dark:bg-white dark:text-black"}`} title="تأیید انتخاب نامه" aria-label="تأیید انتخاب نامه"><img src="/images/icons/check.svg" alt="" className={`h-5 w-5 ${blackActions ? "brightness-0 invert" : "brightness-0 invert dark:invert-0"}`} /></button></div> : null;
  return <ChoiceModal title={title} query={query} onQueryChange={onQueryChange} loading={loading} footer={confirmFooter} onClose={onClose} blackActions={blackActions}>
    {rows.length ? <div className="space-y-1">{visibleRows.map((item) => {
      const id = String(item.id);
      const checked = selectedIds.includes(id);
      const number = item.secretariatNo || item.secretariat_no || item.letterNo || item.letter_no || `#${id}`;
      return <div key={id} className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-right transition ${checked ? "border-emerald-200 bg-emerald-50 text-emerald-950 shadow-sm dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100" : "border-transparent hover:bg-black/[0.04] dark:hover:bg-white/10"}`}><button type="button" onClick={() => onToggle(id)} className="min-w-0 flex-1 text-right"><span className="block font-bold">{toFa(number)}</span><span className={`mt-1 block truncate text-xs ${checked ? "text-emerald-700/80 dark:text-emerald-200/80" : "text-neutral-500 dark:text-neutral-400"}`}>{item.subject || item.title || "بدون موضوع"}</span></button><button type="button" onClick={() => setPreviewLetter(item)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition hover:bg-emerald-100/80 dark:hover:bg-emerald-400/15" title="پیش‌نمایش نامه" aria-label="پیش‌نمایش نامه"><img src="/images/icons/namayesh.svg" alt="" className="h-4 w-4 dark:invert" /></button><button type="button" onClick={() => onToggle(id)} className={`grid h-5 w-5 shrink-0 place-items-center rounded border text-xs font-bold ${checked ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-300 dark:bg-emerald-300 dark:text-emerald-950" : "border-neutral-300 dark:border-neutral-600"}`} aria-label="انتخاب نامه">{checked ? "✓" : ""}</button></div>;
    })}{rows.length > visibleRows.length && <div className="px-3 py-2 text-center text-xs text-neutral-500 dark:text-neutral-400">۲۰۰ مورد نخست نمایش داده شده است؛ برای یافتن سایر اسناد، شماره یا موضوع را جستجو کنید.</div>}</div> : <div className="p-5 text-center text-sm text-neutral-500">نامه‌ای پیدا نشد.</div>}
    {previewLetter && <DocumentPreviewModal letter={previewLetter} api={api} onClose={() => setPreviewLetter(null)} />}
  </ChoiceModal>;
}
