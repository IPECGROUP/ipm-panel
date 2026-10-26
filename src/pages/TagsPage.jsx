import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { THead, TH, TR, TD } from "../components/ui/Table.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";

const SCOPES = ["letters", "projects", "execution"];
const projectLabel = (category) => category.scope === "projects" && category.label === "پروژه‌ها" ? "نام پروژه‌ها" : category.label;

function AddIconBtn({ title, disabled }) {
  return <button type="submit" disabled={disabled} aria-label={title} title={title} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white text-black hover:bg-black/5 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"><img src="/images/icons/afzodan.svg" alt="" className="h-5 w-5" /></button>;
}

function CategoryCombobox({ categories, value, onValueChange, selectedId, onSelect, inputRef, disabled }) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => categories.filter((category) => projectLabel(category).toLocaleLowerCase("fa").includes(value.trim().toLocaleLowerCase("fa"))), [categories, value]);
  return <div className="relative">
    <input ref={inputRef} value={value} onChange={(event) => { onValueChange(event.target.value); onSelect(null); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} disabled={disabled} placeholder="انتخاب/جستجو…" aria-label="دسته‌بندی‌ها" autoComplete="off" className="h-10 w-full rounded-xl border border-black/15 bg-white px-3 pe-10 text-black outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100" />
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"><img src="/images/icons/dropdown.svg" alt="" className="w-4 opacity-70 dark:invert" /></span>
    {open && filtered.length > 0 && <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-black/10 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">{filtered.map((category) => <button key={category.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onSelect(category.id); onValueChange(projectLabel(category)); setOpen(false); }} className={`w-full px-3 py-2 text-right text-sm ${String(selectedId) === String(category.id) ? "bg-black text-white" : "text-black hover:bg-black/5 dark:text-neutral-100 dark:hover:bg-white/10"}`}>{projectLabel(category)}</button>)}</div>}
  </div>;
}

function TagChip({ tag, onRemove, disabled }) {
  return <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-neutral-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"><span className="whitespace-nowrap">{tag.label || "—"}</span><button type="button" onClick={() => onRemove(tag)} disabled={disabled} className="grid h-4 w-4 place-items-center rounded-full hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10" aria-label={`حذف ${tag.label}`} title="حذف"><img src="/images/icons/bastan.svg" alt="" className="w-3 opacity-70 dark:invert" /></button></span>;
}

export default function TagsPage() {
  const API_BASE = (window.API_URL || "/api").replace(/\/+$/, "");
  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(API_BASE + path, { credentials: "include", cache: "no-store", ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    const text = await response.text();
    let result;
    try { result = text ? JSON.parse(text) : {}; }
    catch { throw new Error(`bad_json_response: ${response.status}`); }
    if (!response.ok) throw new Error(result?.error || result?.message || "request_failed");
    return result;
  }, [API_BASE]);

  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newTag, setNewTag] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const categoryInputRef = useRef(null);
  const tagInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    Promise.all(SCOPES.map(async (scope) => {
      const result = await api(`/tags?scope=${scope}`);
      return { categories: Array.isArray(result.categories) ? result.categories : [], tags: Array.isArray(result.tags) ? result.tags : [] };
    })).then((results) => {
      if (!active) return;
      setCategories(results.flatMap((result) => result.categories));
      setTags(results.flatMap((result) => result.tags));
    }).catch((reason) => { if (active) setError(reason.message || "دریافت برچسب‌ها انجام نشد."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api]);

  const visibleCategories = useMemo(() => {
    return [...categories].sort((a, b) => projectLabel(a).localeCompare(projectLabel(b), "fa", { numeric: true }));
  }, [categories]);
  const selectedCategory = visibleCategories.find((category) => String(category.id) === String(selectedCategoryId));
  const tagsByCategory = useMemo(() => {
    const map = new Map();
    for (const tag of tags) {
      const key = String(tag.category_id ?? tag.categoryId ?? "");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(tag);
    }
    for (const list of map.values()) list.sort((a, b) => String(a.label || "").localeCompare(String(b.label || ""), "fa", { numeric: true }));
    return map;
  }, [tags]);

  async function addCategory(event) {
    event.preventDefault();
    const label = newCategory.trim();
    if (!label) { setError("نام دسته‌بندی را وارد کنید."); return; }
    if (visibleCategories.some((category) => projectLabel(category) === label)) { setError("این دسته‌بندی قبلاً ثبت شده است."); return; }
    setSaving(true);
    setError("");
    try {
      const scope = label === "نام پروژه‌ها" ? "projects" : "letters";
      const result = await api("/tags", { method: "POST", body: JSON.stringify({ scope, type: "category", label: scope === "projects" ? "پروژه‌ها" : label }) });
      const category = result.item;
      setCategories((current) => [...current, category]);
      setNewCategory("");
      setSelectedCategoryId(category.id);
      setCategoryQuery(projectLabel(category));
      requestAnimationFrame(() => categoryInputRef.current?.focus());
    } catch (reason) { setError(reason.message || "ثبت دسته‌بندی انجام نشد."); }
    finally { setSaving(false); }
  }

  async function addTag(event) {
    event.preventDefault();
    const label = newTag.trim();
    if (!selectedCategory) { setError("ابتدا یک دسته‌بندی را انتخاب کنید."); return; }
    if (!label) { setError("نام برچسب را وارد کنید."); return; }
    if (tagsByCategory.get(String(selectedCategory.id))?.some((tag) => tag.label === label)) { setError("این برچسب قبلاً ثبت شده است."); return; }
    setSaving(true);
    setError("");
    try {
      const category = selectedCategory;
      const result = await api("/tags", { method: "POST", body: JSON.stringify({ scope: category.scope, type: "tag", category_id: category.id, label }) });
      setTags((current) => [...current, result.item]);
      setNewTag("");
      requestAnimationFrame(() => tagInputRef.current?.focus());
    } catch (reason) { setError(reason.message || "ثبت برچسب انجام نشد."); }
    finally { setSaving(false); }
  }

  async function deleteTag(tag) {
    setSaving(true);
    setError("");
    try {
      await api("/tags", { method: "DELETE", body: JSON.stringify({ id: tag.id }) });
      setTags((current) => current.filter((item) => String(item.id) !== String(tag.id)));
    } catch (reason) { setError(reason.message || "حذف برچسب انجام نشد."); }
    finally { setSaving(false); }
  }

  async function deleteCategory(category) {
    setSaving(true);
    setError("");
    try {
      const relatedTags = tagsByCategory.get(String(category.id)) || [];
      for (const tag of relatedTags) await api("/tags", { method: "DELETE", body: JSON.stringify({ id: tag.id }) });
      await api("/tags", { method: "DELETE", body: JSON.stringify({ id: category.id, type: "category" }) });
      setTags((current) => current.filter((tag) => String(tag.category_id ?? tag.categoryId) !== String(category.id)));
      setCategories((current) => current.filter((item) => String(item.id) !== String(category.id)));
      if (String(selectedCategoryId) === String(category.id)) { setSelectedCategoryId(null); setCategoryQuery(""); }
    } catch (reason) { setError(reason.message || "حذف دسته‌بندی انجام نشد."); }
    finally { setSaving(false); }
  }

  return <Card className="rounded-2xl border border-black/10 bg-white p-7 text-neutral-900 md:p-8 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100" dir="rtl">
    <div className="mb-5 flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]"><img src="/images/icons/tags.svg" alt="" className="h-6 w-6 dark:invert" /></span><span className="min-w-0"><span className="block truncate text-base font-bold md:text-lg">برچسب‌ها</span><span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">تنظیمات</span></span></div>
    <div className="rounded-2xl border border-black/10 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <form onSubmit={addCategory} className="rounded-2xl border border-black/10 bg-black/[0.02] p-3 dark:border-neutral-800 dark:bg-white/[0.03]"><label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-300">دسته‌بندی جدید</label><div className="flex flex-row-reverse items-center gap-2"><AddIconBtn title="افزودن دسته‌بندی" disabled={saving} /><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="نام دسته‌بندی..." className="h-10 min-w-0 flex-1 rounded-xl border border-black/15 bg-white px-3 text-black outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100" /></div></form>
        <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-3 dark:border-neutral-800 dark:bg-white/[0.03] md:col-span-2"><div className="flex flex-col gap-3 md:flex-row-reverse"><form onSubmit={addTag} className="md:flex-1"><label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-300">برچسب جدید</label><div className="flex flex-row-reverse items-center gap-2"><AddIconBtn title="افزودن برچسب" disabled={saving || !selectedCategoryId} /><input ref={tagInputRef} value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder="نام برچسب..." className="h-10 min-w-0 flex-1 rounded-xl border border-black/15 bg-white px-3 text-black outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100" /></div></form><div className="md:flex-1"><label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-300">دسته‌بندی‌ها</label><CategoryCombobox categories={visibleCategories} value={categoryQuery} onValueChange={setCategoryQuery} selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} inputRef={categoryInputRef} disabled={saving || loading} />{!selectedCategoryId && categoryQuery.trim() && <p className="mt-1 text-[11px] text-neutral-500">یک دسته‌بندی معتبر انتخاب کنید.</p>}</div></div></div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-3 overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"><div className="overflow-x-auto" dir="ltr"><table dir="rtl" className="w-full min-w-[700px] table-fixed text-xs sm:text-sm [&_td]:text-center [&_th]:text-center"><THead><tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-white/10 dark:text-neutral-100"><TH className="w-44 !py-2 !text-center !font-semibold !text-neutral-900 dark:!text-neutral-100">دسته‌بندی</TH><TH className="!py-2 !text-center !font-semibold !text-neutral-900 dark:!text-neutral-100">برچسب‌ها</TH><TH className="w-28 !py-2 !text-center !font-semibold !text-neutral-900 dark:!text-neutral-100">اقدامات</TH></tr></THead><tbody className="[&_td]:text-black dark:[&_td]:text-neutral-100">{loading ? <TR><TD colSpan={3} className="py-4 text-center">در حال بارگذاری…</TD></TR> : visibleCategories.map((category, index) => { const list = tagsByCategory.get(String(category.id)) || []; const border = index === visibleCategories.length - 1 ? "" : "border-b border-neutral-300 dark:border-neutral-700"; return <TR key={category.id} className="bg-white transition-colors hover:bg-black/[0.04] dark:bg-neutral-900 dark:hover:bg-white/10"><TD className={`px-3 py-2 font-semibold ${border}`}>{projectLabel(category)}</TD><TD className={`px-3 !py-[6px] ${border}`}>{list.length ? <div className="flex flex-wrap items-center justify-start gap-2">{list.map((tag) => <TagChip key={tag.id} tag={tag} onRemove={deleteTag} disabled={saving} />)}</div> : <span className="text-neutral-500 dark:text-neutral-400">—</span>}</TD><TD className={`px-3 ${border}`}><div className="flex justify-center"><RowActionIconBtn action="delete" onClick={() => deleteCategory(category)} disabled={saving} size={36} iconSize={17} /></div></TD></TR>; })}</tbody></table></div></div>
    </div>
  </Card>;
}
