import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../utils/api.js";

const SCOPES = ["letters", "projects", "execution"];
const chipClass = "rounded-full border px-3 py-2 text-xs font-medium transition";
const idleClass = "border-black/10 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10";
const activeClass = "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black";
const categoryLabel = (category) => category.scope === "projects" && category.label === "پروژه‌ها" ? "نام پروژه‌ها" : category.label;

export default function UnifiedTagPicker({ selectedIds = [], onConfirm, onClose, title = "انتخاب برچسب" }) {
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [draftIds, setDraftIds] = useState(() => selectedIds.map(String));
  const [categoryIds, setCategoryIds] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all(SCOPES.map(async (scope) => {
      const result = await api(`/tags?scope=${scope}`);
      return { categories: Array.isArray(result.categories) ? result.categories : [], tags: Array.isArray(result.tags) ? result.tags : [] };
    })).then((groups) => {
      if (!active) return;
      setCategories(groups.flatMap((group) => group.categories));
      setTags(groups.flatMap((group) => group.tags));
    }).catch((reason) => { if (active) setError(reason.message || "دریافت برچسب‌ها انجام نشد."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const categoryOptions = useMemo(() => {
    const grouped = new Map();
    for (const category of categories) {
      const label = categoryLabel(category);
      if (!grouped.has(label)) grouped.set(label, []);
      grouped.get(label).push(String(category.id));
    }
    return [...grouped].sort(([a], [b]) => a.localeCompare(b, "fa", { numeric: true }));
  }, [categories]);
  const visibleTags = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("fa");
    return tags.filter((tag) => (!categoryIds.length || categoryIds.includes(String(tag.category_id ?? tag.categoryId))) && (!term || String(tag.label || "").toLocaleLowerCase("fa").includes(term)))
      .sort((a, b) => String(a.label || "").localeCompare(String(b.label || ""), "fa", { numeric: true }));
  }, [tags, categoryIds, query]);

  return createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 md:p-6" dir="rtl" role="dialog" aria-modal="true" aria-label={title}>
    <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
    <div className="relative flex h-[min(78vh,760px)] w-[min(980px,calc(100vw-20px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10"><strong className="text-sm">{title}</strong><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 bg-white text-black hover:bg-black/5" aria-label="بستن" title="بستن"><img src="/images/icons/bastan.svg" alt="" className="h-5 w-5 brightness-0" /></button></div>
      <div className="px-4 pt-3"><div className="mb-1 text-xs text-neutral-600 dark:text-neutral-300">دسته‌بندی‌ها</div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setCategoryIds([])} className={`${chipClass} ${!categoryIds.length ? activeClass : idleClass}`}>همه</button>{categoryOptions.map(([label, ids]) => <button key={label} type="button" onClick={() => setCategoryIds(categoryIds.length === ids.length && ids.every((id) => categoryIds.includes(id)) ? [] : ids)} className={`${chipClass} ${categoryIds.length === ids.length && ids.every((id) => categoryIds.includes(id)) ? activeClass : idleClass}`}>{label}</button>)}</div><div className="mt-3 mb-1 text-xs text-neutral-600 dark:text-neutral-300">جستجو</div><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجو در برچسب‌ها..." className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-right text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-white" /></div>
      <div className="min-h-0 flex-1 overflow-auto px-4 py-3">{loading ? <p className="py-10 text-center text-sm text-neutral-500">در حال بارگذاری…</p> : error ? <p role="alert" className="py-10 text-center text-sm text-red-600">{error}</p> : visibleTags.length ? <div className="flex flex-wrap gap-2">{visibleTags.map((tag) => { const id = String(tag.id); const active = draftIds.includes(id); return <button key={id} type="button" onClick={() => setDraftIds((current) => active ? current.filter((value) => value !== id) : [...current, id])} aria-pressed={active} className={`${chipClass} ${active ? activeClass : idleClass}`}>{tag.label}</button>; })}</div> : <p className="py-10 text-center text-sm text-neutral-500">چیزی پیدا نشد.</p>}</div>
      <div className="flex justify-end border-t border-black/10 px-4 py-3 dark:border-white/10"><button type="button" onClick={() => onConfirm(draftIds)} disabled={loading || !!error} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white hover:bg-black/90 disabled:opacity-50" aria-label="تأیید" title="تأیید"><img src="/images/icons/check.svg" alt="" className="h-5 w-5 invert" /></button></div>
    </div>
  </div>, document.body);
}
