import React, { useState } from "react";
import { createPortal } from "react-dom";

const input =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-right text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-neutral-100";
const label = "mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300";

export function FormBadge({ value }) {
  return (
    <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[10px] text-white">
      {value}
    </span>
  );
}

export function TagButton({ count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative grid h-11 w-14 place-items-center rounded-xl border border-black/10 bg-white dark:border-white/15 dark:bg-white/5"
      title="انتخاب برچسب"
    >
      <span className="text-lg">•••</span>
      {count > 0 && <FormBadge value={count} />}
    </button>
  );
}

export function UploadButton({ count = 0, uploading = false, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || uploading}
      className="relative grid h-11 w-14 place-items-center rounded-xl border border-black/10 bg-white disabled:opacity-50 dark:border-white/15 dark:bg-white/5"
      title="بارگذاری فایل"
    >
      <img
        src="/images/icons/Uplod.svg"
        alt=""
        className={`h-5 w-5 dark:invert ${uploading ? "animate-pulse" : ""}`}
      />
      {count > 0 && <FormBadge value={count} />}
    </button>
  );
}

export function TagPicker({
  catalog,
  query,
  setQuery,
  selected,
  setSelected,
  onClose,
  onConfirm,
}) {
  const current = new Set(selected.map(String));
  const [kind, setKind] = useState("letters");
  const [categoryId, setCategoryId] = useState("");
  const tabs = [["projects", "پروژه‌ها"], ["letters", "نامه‌ها و مستندات"], ["execution", "اجرای پروژه‌ها"]];
  const activeGroup = catalog[kind] || { categories: [], tags: [] };
  const list = activeGroup.tags.filter((tag) => (!categoryId || String(tag.category_id) === String(categoryId)) && String(tag.label || "").toLowerCase().includes(query.toLowerCase()));

  return createPortal(
    <div className="fixed inset-0 z-[9999]" dir="rtl">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">
        <div className="flex h-[min(78vh,760px)] w-[min(980px,calc(100vw-20px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white">
          <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
            <b className="text-sm">انتخاب برچسب</b>
            <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 bg-white transition hover:bg-black/5 dark:border-white/15 dark:bg-white/5" title="بستن"><img src="/images/icons/bastan.svg" alt="" className="h-5 w-5 dark:invert" /></button>
          </div>
          <div className="px-4 pt-3">
            <div className="flex flex-wrap items-center gap-2">{tabs.map(([id, title]) => <button key={id} type="button" onClick={() => { setKind(id); setCategoryId(""); setQuery(""); }} className={`h-10 rounded-xl border px-4 text-sm font-semibold transition ${kind === id ? "border-black bg-black text-white" : "border-black/15 bg-white hover:bg-black/[.02] dark:border-white/15 dark:bg-transparent dark:hover:bg-white/5"}`}>{title}</button>)}</div>
            {kind !== "projects" && activeGroup.categories.length > 0 && <div className="mt-3"><div className={label}>دسته‌بندی‌ها</div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setCategoryId("")} className={`h-10 rounded-full border px-4 text-xs ${!categoryId ? "border-black bg-black text-white" : "border-black/15 dark:border-white/15"}`}>همه</button>{activeGroup.categories.map((category) => <button key={category.id} type="button" onClick={() => setCategoryId(String(category.id))} className={`h-10 rounded-full border px-4 text-xs ${String(categoryId) === String(category.id) ? "border-black bg-black text-white" : "border-black/15 dark:border-white/15"}`}>{category.label}</button>)}</div></div>}
            <div className="mt-3"><div className={label}>جستجو</div><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} className={input} placeholder="جستجو در برچسب‌ها..." /></div>
          </div>
          <div className="flex flex-1 flex-wrap content-start gap-2 overflow-auto px-4 py-3">
            {list.map((tag) => <button key={tag.id} type="button" onClick={() => setSelected((old) => current.has(String(tag.id)) ? old.filter((id) => String(id) !== String(tag.id)) : [...old, String(tag.id)])} className={`h-10 rounded-full border px-4 text-xs ${current.has(String(tag.id)) ? "border-black bg-black text-white" : "border-black/15 hover:bg-black/[.02] dark:border-white/15 dark:hover:bg-white/5"}`}>{tag.label}</button>)}
          </div>
          <div className="flex justify-end border-t border-black/10 px-4 py-3 dark:border-white/10"><button type="button" onClick={onConfirm} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white">✓</button></div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
