import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";

const inputClass = "h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-right text-sm outline-none transition focus:border-neutral-400 dark:border-white/15 dark:bg-white/5";

const categoryEndpoint = "/api/base/project-lesson-categories";
const descriptionEndpoint = "/api/base/project-lesson-descriptions";

async function request(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "عملیات انجام نشد.");
  return data;
}

export default function ProjectLessonCategoryDescriptionsTable() {
  const [categories, setCategories] = useState([]);
  const [descriptions, setDescriptions] = useState([]);
  const [categoryTitle, setCategoryTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [descriptionTitle, setDescriptionTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [editingId, setEditingId] = useState(null);
  const [editingCategoryTitle, setEditingCategoryTitle] = useState("");
  const [editingDescriptionTitle, setEditingDescriptionTitle] = useState("");
  const menuRef = useRef(null);

  const loadCategories = () => request(categoryEndpoint).then((data) => setCategories(data.items || []));
  const loadDescriptions = () => request(descriptionEndpoint).then((data) => setDescriptions(data.items || []));

  useEffect(() => {
    Promise.all([loadCategories(), loadDescriptions()]).catch((err) => setError(err.message));
    const refresh = (event) => {
      if (event.detail?.endpoint === categoryEndpoint) loadCategories().catch((err) => setError(err.message));
      if (event.detail?.endpoint === descriptionEndpoint) loadDescriptions().catch((err) => setError(err.message));
    };
    window.addEventListener("base-options-updated", refresh);
    return () => window.removeEventListener("base-options-updated", refresh);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => { if (!menuRef.current?.contains(event.target)) setMenuOpen(false); };
    const escape = (event) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, [menuOpen]);

  const descriptionsByCategory = useMemo(() => {
    const result = new Map();
    descriptions.forEach((item) => {
      const key = String(item.categoryId || "");
      if (!key) return;
      result.set(key, [...(result.get(key) || []), item.title]);
    });
    return result;
  }, [descriptions]);

  const toggleSelected = (id) => setSelectedIds((current) => {
    const next = new Set(current);
    const key = String(id);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const allSelected = categories.length > 0 && categories.every((category) => selectedIds.has(String(category.id)));
  const selectedCategory = selectedIds.size === 1
    ? categories.find((category) => selectedIds.has(String(category.id)))
    : null;

  const addCategory = async (event) => {
    event.preventDefault();
    const title = categoryTitle.trim();
    if (!title) return;
    setBusy(true); setError("");
    try {
      const data = await request(categoryEndpoint, { method: "POST", body: JSON.stringify({ title }) });
      setCategories((items) => [...items, data.item]);
      setCategoryTitle("");
      window.dispatchEvent(new CustomEvent("base-options-updated", { detail: { endpoint: categoryEndpoint } }));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const addDescription = async (event) => {
    event.preventDefault();
    const title = descriptionTitle.trim();
    if (!categoryId || !title) return;
    setBusy(true); setError("");
    try {
      const data = await request(descriptionEndpoint, { method: "POST", body: JSON.stringify({ categoryId, title }) });
      setDescriptions((items) => [...items, data.item]);
      setDescriptionTitle("");
      window.dispatchEvent(new CustomEvent("base-options-updated", { detail: { endpoint: descriptionEndpoint } }));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const startEdit = () => {
    if (!selectedCategory) return;
    const linkedDescriptions = descriptions.filter((item) => String(item.categoryId) === String(selectedCategory.id));
    setEditingId(selectedCategory.id);
    setEditingCategoryTitle(selectedCategory.title);
    setEditingDescriptionTitle(linkedDescriptions.map((item) => item.title).filter(Boolean).join("، "));
    setMenuOpen(false);
  };

  const saveEdit = async () => {
    const category = categories.find((item) => String(item.id) === String(editingId));
    const nextCategoryTitle = editingCategoryTitle.trim();
    const nextDescriptionTitle = editingDescriptionTitle.trim();
    if (!category || !nextCategoryTitle) return;
    setBusy(true); setError("");
    try {
      const categoryResult = await request(categoryEndpoint, { method: "PATCH", body: JSON.stringify({ id: category.id, title: nextCategoryTitle }) });
      setCategories((items) => items.map((item) => item.id === categoryResult.item.id ? categoryResult.item : item));
      const linkedDescriptions = descriptions.filter((item) => String(item.categoryId) === String(category.id));
      if (nextDescriptionTitle) {
        const firstDescription = linkedDescriptions[0];
        const descriptionResult = firstDescription
          ? await request(descriptionEndpoint, { method: "PATCH", body: JSON.stringify({ id: firstDescription.id, categoryId: category.id, title: nextDescriptionTitle }) })
          : await request(descriptionEndpoint, { method: "POST", body: JSON.stringify({ categoryId: category.id, title: nextDescriptionTitle }) });
        setDescriptions((items) => firstDescription ? items.map((item) => item.id === descriptionResult.item.id ? descriptionResult.item : item) : [...items, descriptionResult.item]);
      }
      setEditingId(null);
      window.dispatchEvent(new CustomEvent("base-options-updated", { detail: { endpoint: categoryEndpoint } }));
      window.dispatchEvent(new CustomEvent("base-options-updated", { detail: { endpoint: descriptionEndpoint } }));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const deleteSelected = async () => {
    if (!selectedIds.size || !window.confirm(`آیا از حذف ${selectedIds.size} دسته‌بندی انتخاب‌شده مطمئن هستید؟`)) return;
    setBusy(true); setError("");
    try {
      await request(categoryEndpoint, { method: "DELETE", body: JSON.stringify({ ids: [...selectedIds] }) });
      setCategories((items) => items.filter((item) => !selectedIds.has(String(item.id))));
      setDescriptions((items) => items.filter((item) => !selectedIds.has(String(item.categoryId))));
      setSelectedIds(new Set()); setMenuOpen(false);
      window.dispatchEvent(new CustomEvent("base-options-updated", { detail: { endpoint: categoryEndpoint } }));
      window.dispatchEvent(new CustomEvent("base-options-updated", { detail: { endpoint: descriptionEndpoint } }));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const openMenu = (event) => {
    if (menuOpen) return setMenuOpen(false);
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 8, left: Math.max(8, rect.right - 240) });
    setMenuOpen(true);
  };

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900" dir="rtl">
      <h2 className="mb-4 text-sm font-bold">دسته‌بندی درس‌آموخته</h2>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <form onSubmit={addCategory} className="grid grid-cols-[1fr_auto] items-center gap-3">
          <input className={inputClass} value={categoryTitle} onChange={(event) => setCategoryTitle(event.target.value)} placeholder="دسته‌بندی درس‌آموخته..." />
          <button type="submit" disabled={busy} className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 bg-white transition hover:bg-black/5 disabled:opacity-50 dark:bg-neutral-100" aria-label="افزودن دسته‌بندی"><img src="/images/icons/afzodan.svg" alt="" className="h-5 w-5" /></button>
        </form>
        <form onSubmit={addDescription} className="grid grid-cols-[minmax(170px,0.85fr)_minmax(0,1.15fr)_auto] items-center gap-3">
          <select className={inputClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
            <option value="">دسته‌بندی درس‌آموخته را انتخاب کنید</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
          </select>
          <input className={inputClass} value={descriptionTitle} onChange={(event) => setDescriptionTitle(event.target.value)} placeholder="توضیح..." />
          <button type="submit" disabled={busy} className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 bg-white transition hover:bg-black/5 disabled:opacity-50 dark:bg-neutral-100" aria-label="افزودن توضیح"><img src="/images/icons/afzodan.svg" alt="" className="h-5 w-5" /></button>
        </form>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
        <div className="overflow-x-auto" dir="ltr">
          <table dir="rtl" className="w-full min-w-[700px] table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:text-center [&_th]:!py-2 [&_td]:!py-2">
            <colgroup><col style={{ width: 48 }} /><col style={{ width: 80 }} /><col style={{ width: "40%" }} /><col /><col style={{ width: 96 }} /></colgroup>
            <thead><tr className="border-b border-neutral-300 bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800"><th><input type="checkbox" className="h-4 w-4 rounded border-neutral-400 accent-black dark:accent-neutral-200" checked={allSelected} onChange={() => setSelectedIds(allSelected ? new Set() : new Set(categories.map((category) => String(category.id))))} aria-label="انتخاب همه" /></th><th>#</th><th>دسته‌بندی درس‌آموخته</th><th>توضیح</th><th><button type="button" onClick={openMenu} className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/[.08] dark:hover:bg-white/10" aria-label="عملیات"><img src="/images/icons/menu-table.svg" alt="" className="h-4 w-3 dark:invert" /></button></th></tr></thead>
            <tbody className="text-[13px] [&>tr]:h-10">
              {categories.map((category, index) => {
                const editing = String(editingId) === String(category.id);
                return <tr key={category.id} className="bg-black/[0.02] hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10"><td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><input type="checkbox" className="h-4 w-4 rounded border-neutral-400 accent-black dark:accent-neutral-200" checked={selectedIds.has(String(category.id))} onChange={() => toggleSelected(category.id)} /></td><td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{index + 1}</td><td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{editing ? <input className="h-7 w-full rounded-xl border border-black/15 bg-white px-3 text-center outline-none dark:border-white/15 dark:bg-white/5" value={editingCategoryTitle} onChange={(event) => setEditingCategoryTitle(event.target.value)} /> : category.title}</td><td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{editing ? <input className="h-7 w-full rounded-xl border border-black/15 bg-white px-3 text-center outline-none dark:border-white/15 dark:bg-white/5" value={editingDescriptionTitle} onChange={(event) => setEditingDescriptionTitle(event.target.value)} /> : (descriptionsByCategory.get(String(category.id)) || []).filter(Boolean).join("، ") || "—"}</td><td className="border-b border-neutral-300 px-2 dark:border-neutral-700">{editing && <div className="flex items-center justify-center gap-1" dir="ltr"><RowActionIconBtn action="cancel" onClick={() => setEditingId(null)} size={30} iconSize={14} /><RowActionIconBtn action="save" onClick={saveEdit} disabled={busy} size={30} iconSize={15} /></div>}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>
      {menuOpen && createPortal(
        <div ref={menuRef} className="fixed z-[10001] w-60 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 text-right text-neutral-900 shadow-[0_18px_45px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100" style={menuPosition} dir="rtl">
          <div className="px-2.5 pb-2 pt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{selectedIds.size ? `${selectedIds.size} مورد انتخاب شده` : "ابتدا موارد موردنظر را انتخاب کنید"}</div>
          <button type="button" disabled={!selectedCategory || busy} onClick={startEdit} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-amber-500/10"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 transition group-hover:scale-105 dark:bg-amber-500/15"><img src="/images/icons/pencil.svg" alt="" className="h-4 w-4 dark:invert" /></span><span className="flex-1 text-sm font-semibold">ویرایش</span></button>
          <button type="button" disabled={!selectedIds.size || busy} onClick={deleteSelected} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45 dark:text-red-300 dark:hover:bg-red-500/10"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-100 transition group-hover:scale-105 dark:bg-red-500/15"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" /></span><span className="flex-1 text-sm font-semibold">حذف موارد انتخاب‌شده</span></button>
        </div>,
        document.body,
      )}
    </section>
  );
}
