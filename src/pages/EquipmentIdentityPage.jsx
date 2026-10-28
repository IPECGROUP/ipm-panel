import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { createPortal } from "react-dom";
import Card from "../components/ui/Card.jsx";
import BaseTablePager from "../components/ui/BaseTablePager.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { api } from "../utils/api.js";
import { equipmentDefinitionsFromResponse } from "../utils/equipmentDefinitions.js";
import RelatedLettersPickerModal from "../components/RelatedLettersPickerModal.jsx";
import LibraryItemsPickerModal from "../components/LibraryItemsPickerModal.jsx";
import DocumentPreviewModal from "../components/DocumentPreviewModal.jsx";
import { AttachmentImageEditor } from "./PettyCashPage.jsx";

const inputClass = "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-right text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-neutral-100 dark:placeholder:text-neutral-500";
const labelClass = "mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300";
const toFa = (value) => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
const emptyForm = () => ({ categoryId: "", fieldValues: {}, relatedLetterIds: [], libraryItemIds: [], files: [] });

function identityFieldValue(item, fields, kind) {
  const field = fields.find((candidate) => String(candidate.categoryId) === String(item.categoryId) && (kind === "name"
    ? candidate.persianName === "نام تجهیز" || candidate.englishName === "Equipment Name"
    : candidate.persianName === "کد تجهیز" || candidate.englishName === "Equipment No."));
  const value = field ? String(item.fieldValues?.[String(field.id)] || "").trim() : "";
  if (value) return value;
  if (kind === "name" && item.name && item.name !== `تجهیز ${item.category}`) return item.name;
  if (kind === "code" && item.code && !/^EQ-[\da-f-]{36}$/i.test(item.code)) return item.code;
  return "—";
}

export default function EquipmentIdentityPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [definitions, setDefinitions] = useState({ categories: [], titles: [], fields: [] });
  const [letters, setLetters] = useState([]);
  const [libraryItems, setLibraryItems] = useState([]);
  const [letterPickerOpen, setLetterPickerOpen] = useState(false);
  const [letterQuery, setLetterQuery] = useState("");
  const [draftLetterIds, setDraftLetterIds] = useState([]);
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [draftLibraryItemIds, setDraftLibraryItemIds] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [definitionsLoading, setDefinitionsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    const headers = user?.id != null ? { "x-user-id": String(user.id) } : {};
    api("/equipment-identities", { headers })
      .then((result) => { if (active) setItems(Array.isArray(result?.items) ? result.items : []); })
      .catch((err) => { if (active) setError(err.message || "دریافت اطلاعات تجهیزات انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    api("/base/equipment-fields", { headers })
      .then((result) => { if (active) setDefinitions(equipmentDefinitionsFromResponse(result)); })
      .catch((err) => { if (active) setError(err.message || "دریافت دسته‌بندی‌ها و فیلدهای تجهیزات انجام نشد."); })
      .finally(() => { if (active) setDefinitionsLoading(false); });
    api("/letters", { headers })
      .then((result) => { if (active) setLetters(Array.isArray(result?.items) ? result.items : []); })
      .catch(() => {});
    api("/library-items", { headers })
      .then((result) => { if (active) setLibraryItems(Array.isArray(result?.items) ? result.items : []); })
      .catch((err) => { if (active) setError(err.message || "دریافت مستندات کتابخانه انجام نشد."); });
    return () => { active = false; };
  }, [authLoading, user?.id]);

  const categorySections = useMemo(() => definitions.titles.map((title) => ({
    title,
    fields: definitions.fields.filter((field) => String(field.categoryId) === String(form.categoryId) && String(field.titleId) === String(title.id)),
  })).filter((section) => section.fields.length), [definitions, form.categoryId]);
  const availableCategories = definitions.categories;
  const filteredItems = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase("fa").split(/\s+/).filter(Boolean);
    return items.filter((item) => {
      const values = item.fieldValues && typeof item.fieldValues === "object" ? Object.values(item.fieldValues) : [];
       const text = [item.category, identityFieldValue(item, definitions.fields, "name"), identityFieldValue(item, definitions.fields, "code"), ...values].join(" ").toLocaleLowerCase("fa");
      return terms.every((term) => text.includes(term));
    });
  }, [items, query, definitions.fields]);
  const safePage = Math.min(page, Math.max(0, Math.ceil(filteredItems.length / pageSize) - 1));
  const pageItems = filteredItems.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const visibleIds = pageItems.map((item) => String(item.id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const detailItem = items.find((item) => String(item.id) === String(detailId));

  function editItem(item) {
    setForm({ categoryId: String(item.categoryId || ""), fieldValues: { ...item.fieldValues }, relatedLetterIds: [...(item.relatedLetterIds || [])], libraryItemIds: [...(item.libraryItemIds || [])], files: [...(item.files || [])] });
    setEditingId(String(item.id));
    setFormOpen(true);
    setDetailId(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleSelected(id) {
    setSelectedIds((old) => {
      const next = new Set(old);
      const key = String(id);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((old) => {
      const next = new Set(old);
      visibleIds.forEach((id) => { if (allVisibleSelected) next.delete(id); else next.add(id); });
      return next;
    });
  }

  async function deleteSelected() {
    const ids = [...selectedIds].filter((id) => items.some((item) => String(item.id) === id));
    if (!ids.length || !window.confirm(`آیا ${toFa(ids.length)} شناسنامه انتخاب‌شده حذف شود؟ این عملیات قابل بازگشت نیست.`)) return;
    setDeleting(true);
    setError("");
    try {
      await api("/equipment-identities", { method: "DELETE", headers: user?.id != null ? { "x-user-id": String(user.id) } : {}, body: JSON.stringify({ ids }) });
      const deleted = new Set(ids);
      setItems((old) => old.filter((item) => !deleted.has(String(item.id))));
      setSelectedIds(new Set());
    } catch (err) { setError(err.message || "حذف شناسنامه‌های انتخاب‌شده انجام نشد."); }
    finally { setDeleting(false); }
  }

  async function save(event) {
    event.preventDefault();
    if (!form.categoryId) { setError("دسته‌بندی تجهیز را انتخاب کنید."); return; }
    if (uploading) { setError("تا پایان بارگذاری فایل صبر کنید."); return; }
    setSaving(true);
    setError("");
    try {
      const result = await api("/equipment-identities", {
        method: editingId ? "PATCH" : "POST",
        headers: user?.id != null ? { "x-user-id": String(user.id) } : {},
        body: JSON.stringify(editingId ? { ...form, id: editingId } : form),
      });
      setItems((current) => editingId ? current.map((item) => String(item.id) === editingId ? result.item : item) : [result.item, ...current]);
      setForm(emptyForm());
      setEditingId(null);
      setSelectedIds(new Set());
      setFormOpen(false);
      setPage(0);
    } catch (err) {
      setError(err.message || (editingId ? "ویرایش تجهیز انجام نشد." : "ثبت تجهیز انجام نشد."));
    } finally { setSaving(false); }
  }

  async function uploadFile(file) {
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`${String(import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "")}/equipment-identities/upload`, {
        method: "POST", credentials: "include", headers: user?.id != null ? { "x-user-id": String(user.id) } : {}, body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "بارگذاری فایل انجام نشد.");
      setForm((old) => ({ ...old, files: [...old.files, data.file] }));
      setUploadOpen(false);
    } catch (err) { setError(err.message || "بارگذاری فایل انجام نشد."); }
    finally { setUploading(false); }
  }

  return <div dir="rtl" className="mx-auto max-w-[1400px]">
    <Card className="overflow-hidden rounded-3xl border border-black/10 bg-white p-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-neutral-900">
      <div className="p-3 md:p-4">
        <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 shadow-sm dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04]">
              <span aria-hidden="true" className="h-6 w-6 bg-[#184a6b] dark:bg-[#8fc4e3]" style={{ WebkitMask: "url('/images/icons/shenasnameh-taghizat.svg') center / contain no-repeat", mask: "url('/images/icons/shenasnameh-taghizat.svg') center / contain no-repeat" }} />
            </span>
             <span className="min-w-0"><span className="block truncate text-base font-bold tracking-tight text-[#184a6b] dark:text-[#8fc4e3] md:text-lg">شناسنامه تجهیزات</span><span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت تجهیزات</span></span>
          </div>
          <button type="button" onClick={() => { setForm(emptyForm()); setEditingId(null); setFormOpen((open) => !open); setLetterPickerOpen(false); setLibraryPickerOpen(false); setUploadOpen(false); setError(""); }} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition ${formOpen ? "border-black/15 bg-white hover:bg-black/5 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" : "border-[#f48120] bg-[#f48120] hover:bg-[#d97018]"}`} title={formOpen ? "بستن فرم" : "افزودن"} aria-label={formOpen ? "بستن فرم" : "افزودن"} aria-expanded={formOpen}>
            {formOpen ? <img src="/images/icons/listdarkhast.svg" alt="" className="h-5 w-5 dark:invert" /> : <Plus aria-hidden="true" className="h-5 w-5 text-white" strokeWidth={2.5} />}
          </button>
        </div>

        {formOpen ? <form onSubmit={save} className="mb-4 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-semibold">{editingId ? "ویرایش شناسنامه تجهیز" : "افزودن شناسنامه تجهیز"}</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block w-full sm:w-80"><span className={`block ${labelClass}`}>دسته‌بندی *</span><select required disabled={definitionsLoading} value={form.categoryId} onChange={(event) => setForm((old) => ({ ...old, categoryId: event.target.value, fieldValues: {} }))} className={inputClass}><option value="">{definitionsLoading ? "در حال دریافت دسته‌بندی‌ها..." : "انتخاب دسته‌بندی"}</option>{availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          </div>
          {form.files.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{form.files.map((file, index) => <span key={file.url} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-black/10 bg-white px-2 py-1 text-xs dark:border-white/15 dark:bg-white/5"><a href={file.url} target="_blank" rel="noreferrer" className="max-w-40 truncate hover:underline">{file.name}</a><button type="button" onClick={() => setForm((old) => ({ ...old, files: old.files.filter((_, position) => position !== index) }))} aria-label="حذف فایل">×</button></span>)}</div>}
           <EquipmentFieldsForm sections={categorySections} values={form.fieldValues}
             onValueChange={(id, value) => setForm((old) => ({ ...old, fieldValues: { ...old.fieldValues, [id]: value } }))} />
          <div className="mt-4 flex flex-wrap items-end justify-end gap-3 border-t border-black/10 pt-4 dark:border-white/10">
            <label className="block"><span className={`block ${labelClass}`}>بارگذاری</span><button type="button" onClick={() => setUploadOpen(true)} className="relative grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="بارگذاری فایل"><img src="/images/icons/upload.svg" alt="" className={`h-5 w-5 dark:invert ${uploading ? "animate-pulse" : ""}`} />{form.files.length > 0 && <span className="absolute -left-1 -top-1 rounded-full bg-black px-1 text-[10px] text-white">{toFa(form.files.length)}</span>}</button></label>
            <label className="block"><span className={`block ${labelClass}`}>کتابخانه</span><button type="button" onClick={() => { setDraftLibraryItemIds(form.libraryItemIds.map(String)); setLibraryQuery(""); setLibraryPickerOpen(true); }} className="relative grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="انتخاب از کتابخانه‌ها"><img src="/images/icons/ketabkhane.svg" alt="" className="h-5 w-5 dark:invert" />{form.libraryItemIds.length > 0 && <span className="absolute -left-1 -top-1 rounded-full bg-black px-1 text-[10px] text-white">{toFa(form.libraryItemIds.length)}</span>}</button></label>
            <label className="block"><span className={`block ${labelClass}`}>اسناد مرتبط</span><button type="button" onClick={() => { setDraftLetterIds(form.relatedLetterIds.map(String)); setLetterQuery(""); setLetterPickerOpen(true); }} className="relative grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="انتخاب اسناد مرتبط"><img src="/images/icons/asnad-mortabet.svg" alt="" className="h-5 w-5 dark:invert" />{form.relatedLetterIds.length > 0 && <span className="absolute -left-1 -top-1 rounded-full bg-black px-1 text-[10px] text-white">{toFa(form.relatedLetterIds.length)}</span>}</button></label>
            <button type="submit" disabled={saving || uploading} className="grid h-11 w-11 place-items-center rounded-xl bg-black text-white transition hover:bg-black/90 disabled:opacity-50" title={saving ? "در حال ثبت..." : editingId ? "ذخیره تغییرات" : "ثبت تجهیز"} aria-label={editingId ? "ذخیره تغییرات" : "ثبت تجهیز"}><img src="/images/icons/check.svg" alt="" className="h-5 w-5 brightness-0 invert" /></button></div>
        </form> : <div className="mb-4 rounded-2xl border border-neutral-200 bg-neutral-100/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
          <label className="block"><span className={`block ${labelClass}`}>جست و جو</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} className={inputClass} placeholder="جستجو در دسته‌بندی و اطلاعات ثبت‌شده تجهیز..." /></label>
        </div>}

        {error && <div role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
          <div className="overflow-auto" dir="ltr"><table dir="rtl" className="w-full min-w-[640px] table-fixed text-sm [&_td]:text-center [&_th]:text-center">
            <colgroup><col style={{ width: 44 }} /><col style={{ width: 80 }} /><col style={{ width: "25%" }} /><col /><col style={{ width: "25%" }} /></colgroup>
            <thead className="border-b border-[#184a6b] bg-[#184a6b] text-white">
              <tr><th className="px-2 py-2"><input type="checkbox" className="h-4 w-4 accent-black dark:accent-neutral-200" checked={allVisibleSelected} onChange={toggleSelectAll} aria-label="انتخاب همه شناسنامه‌های صفحه" /></th><th className="px-3 py-2 text-[14px] font-semibold">ردیف</th><th className="px-3 py-2 text-[14px] font-semibold">دسته‌بندی</th><th className="px-3 py-2 text-[14px] font-semibold">نام تجهیز</th><th className="relative py-2 pl-10 pr-3 text-[14px] font-semibold">کد تجهیز<EquipmentTableMenu selectedCount={selectedIds.size} deleting={deleting} onEdit={() => { const item = items.find((row) => selectedIds.has(String(row.id))); if (item) editItem(item); }} onDelete={deleteSelected} /></th></tr>
            </thead>
            <tbody className="text-[13px]">{loading || !pageItems.length ? <tr><td colSpan={5} className="py-8 text-black/60 dark:text-neutral-400">{loading ? "در حال دریافت..." : items.length ? "موردی مطابق فیلتر پیدا نشد." : "هنوز تجهیزی ثبت نشده است."}</td></tr> : pageItems.map((item, index) => <tr key={item.id} tabIndex={0} role="button" aria-label={`مشاهده شناسنامه ${identityFieldValue(item, definitions.fields, "name")}`} onClick={() => setDetailId(String(item.id))} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setDetailId(String(item.id)); } }} className="h-10 cursor-pointer bg-black/[0.02] transition-colors hover:bg-black/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] dark:bg-white/5 dark:hover:bg-white/10">
              <td className="border-b border-neutral-300 px-2 dark:border-neutral-700"><input type="checkbox" className="h-4 w-4 accent-black dark:accent-neutral-200" checked={selectedIds.has(String(item.id))} onClick={(event) => event.stopPropagation()} onChange={() => toggleSelected(item.id)} aria-label={`انتخاب شناسنامه ${identityFieldValue(item, definitions.fields, "name")}`} /></td>
              <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFa(safePage * pageSize + index + 1)}</td>
              <td className="border-b border-neutral-300 px-3 font-medium dark:border-neutral-700">{definitions.categories.find((category) => String(category.id) === String(item.categoryId))?.name || item.category || "—"}</td>
              <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="block break-words" dir="auto">{identityFieldValue(item, definitions.fields, "name")}</span></td>
              <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="block break-words" dir="auto">{identityFieldValue(item, definitions.fields, "code")}</span></td>
            </tr>)}</tbody>
          </table></div>
          <BaseTablePager branded total={filteredItems.length} page={safePage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>
    </Card>
    {detailItem && <EquipmentIdentityDetail item={detailItem} definitions={definitions} letters={letters} libraryItems={libraryItems} onClose={() => setDetailId(null)} />}
    {letterPickerOpen && <RelatedLettersPickerModal api={api} title="انتخاب اسناد مرتبط" query={letterQuery} onQueryChange={setLetterQuery} loading={false} items={letters} selectedIds={draftLetterIds} onToggle={(id) => setDraftLetterIds((old) => old.includes(String(id)) ? old.filter((value) => value !== String(id)) : [...old, String(id)])} onConfirm={() => { setForm((old) => ({ ...old, relatedLetterIds: draftLetterIds })); setLetterPickerOpen(false); }} onClose={() => setLetterPickerOpen(false)} blackActions />}
    {libraryPickerOpen && <LibraryItemsPickerModal title="انتخاب از کتابخانه‌ها" query={libraryQuery} onQueryChange={setLibraryQuery} items={libraryItems} selectedIds={draftLibraryItemIds} onToggle={(id) => setDraftLibraryItemIds((old) => old.includes(String(id)) ? old.filter((value) => value !== String(id)) : [...old, String(id)])} onConfirm={() => { setForm((old) => ({ ...old, libraryItemIds: draftLibraryItemIds })); setLibraryPickerOpen(false); }} onClose={() => setLibraryPickerOpen(false)} />}
    {uploadOpen && <AttachmentImageEditor title="پیوست تجهیز" onClose={() => setUploadOpen(false)} onConfirm={uploadFile} />}
  </div>;
}

function EquipmentTableMenu({ selectedCount, deleting, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 248)), top: rect.bottom + 8 });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (event) => { if (!triggerRef.current?.contains(event.target) && !popoverRef.current?.contains(event.target)) setOpen(false); };
    const closeOnEscape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  return <span className="absolute left-2 top-1/2 -translate-y-1/2" dir="rtl">
    <button ref={triggerRef} type="button" onClick={() => { if (open) setOpen(false); else { updatePosition(); setOpen(true); } }} className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/[0.08] dark:hover:bg-white/10" title="مدیریت وضعیت" aria-label="مدیریت وضعیت" aria-expanded={open}><img src="/images/icons/menu-table.svg" alt="" className="h-4 w-3 invert" /></button>
    {open && position && createPortal(<div ref={popoverRef} className="fixed z-[100] w-60 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 text-right text-neutral-900 shadow-[0_18px_45px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100" style={position}>
      <div className="px-2.5 pb-2 pt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{selectedCount ? `${toFa(selectedCount)} مورد انتخاب شده` : "ابتدا موارد موردنظر را انتخاب کنید"}</div>
      <button type="button" disabled={selectedCount !== 1 || deleting} onClick={() => { setOpen(false); onEdit(); }} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-amber-500/10"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 transition group-hover:scale-105 dark:bg-amber-500/15"><img src="/images/icons/pencil.svg" alt="" className="h-4 w-4 dark:invert" /></span><span className="min-w-0 flex-1 text-sm font-semibold">ویرایش</span></button>
      <button type="button" disabled={!selectedCount || deleting} onClick={() => { setOpen(false); onDelete(); }} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45 dark:text-red-300 dark:hover:bg-red-500/10"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-100 dark:bg-red-500/15"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" /></span><span className="min-w-0 flex-1 text-sm font-semibold">{deleting ? "در حال حذف..." : "حذف موارد انتخاب‌شده"}</span></button>
    </div>, document.body)}
  </span>;
}

function EquipmentIdentityDetail({ item, definitions, letters, libraryItems, onClose }) {
  const [previewLetter, setPreviewLetter] = useState(null);
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === "Escape" && !previewLetter) onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, previewLetter]);
  const sections = definitions.titles.map((title) => ({
    title,
    fields: definitions.fields.filter((field) => String(field.categoryId) === String(item.categoryId) && String(field.titleId) === String(title.id)),
  })).filter((section) => section.fields.length);
  const selectedLetters = (item.relatedLetterIds || []).map((id) => letters.find((letter) => String(letter.id) === String(id))).filter(Boolean);
  const selectedLibraryItems = (item.libraryItemIds || []).map((id) => libraryItems.find((libraryItem) => String(libraryItem.id) === String(id))).filter(Boolean);
  return createPortal(<div dir="rtl" className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <section role="dialog" aria-modal="true" aria-label="شناسنامه تجهیز" className="relative flex max-h-[90vh] w-[min(900px,100%)] flex-col overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black/10 p-4 dark:border-white/10"><div className="min-w-0"><h2 className="truncate text-lg font-bold">{identityFieldValue(item, definitions.fields, "name")}</h2><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category} · {identityFieldValue(item, definitions.fields, "code")}</p></div><button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black text-xl text-white transition hover:bg-black/90 dark:bg-black dark:text-white" aria-label="بستن">×</button></header>
      <div className="space-y-5 overflow-y-auto p-4 text-sm">
        {sections.map(({ title, fields }) => <section key={title.id}><h3 className="mb-2 font-semibold">{title.name}</h3><dl className="grid gap-2 sm:grid-cols-2">{fields.map((field) => <div key={field.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10"><dt className="text-xs text-neutral-500 dark:text-neutral-400">{field.name}{field.englishName ? ` - ${field.englishName}` : ""}</dt><dd dir="auto" className="mt-1 whitespace-pre-wrap break-words">{item.fieldValues?.[String(field.id)] || "—"}</dd></div>)}</dl></section>)}
        <section><h3 className="mb-2 font-semibold">فایل‌های پیوست</h3>{item.files?.length ? <div className="space-y-2">{item.files.map((file, index) => <a key={`${file.url}-${index}`} href={file.url} target="_blank" rel="noopener noreferrer" className="block break-all rounded-xl border border-black/10 p-3 text-blue-700 hover:underline dark:border-white/10 dark:text-blue-300">{file.name || `فایل ${toFa(index + 1)}`}</a>)}</div> : <p className="text-neutral-500">فایلی ثبت نشده است.</p>}</section>
        <section><h3 className="mb-2 font-semibold">اسناد مرتبط</h3>{selectedLetters.length ? <div className="space-y-2">{selectedLetters.map((letter) => <button type="button" key={letter.id} onClick={() => setPreviewLetter(letter)} className="block w-full rounded-xl border border-black/10 p-3 text-right hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">{letter.subject || letter.title || letter.letterNo || `سند ${toFa(letter.id)}`} — مشاهده سند</button>)}</div> : <p className="text-neutral-500">سندی ثبت نشده است.</p>}</section>
        <section><h3 className="mb-2 font-semibold">مستندات کتابخانه</h3>{selectedLibraryItems.length ? <div className="space-y-3">{selectedLibraryItems.map((libraryItem) => <div key={libraryItem.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10"><div className="font-medium">{libraryItem.title}</div>{libraryItem.files?.length ? libraryItem.files.map((file, index) => <a key={`${file.url}-${index}`} href={file.url} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-blue-700 hover:underline dark:text-blue-300">{file.name || `فایل ${toFa(index + 1)}`}</a>) : <p className="mt-1 text-neutral-500">فایلی ثبت نشده است.</p>}</div>)}</div> : <p className="text-neutral-500">مستندی ثبت نشده است.</p>}</section>
      </div>
    </section>
    {previewLetter && <DocumentPreviewModal letter={previewLetter} api={api} onClose={() => setPreviewLetter(null)} />}
  </div>, document.body);
}

function EquipmentFieldsForm({ sections, values, onValueChange }) {
  if (!sections.length) return null;
  return <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
    <div className="max-h-[60vh] overflow-auto">
      <table className="w-full min-w-[760px] table-fixed text-sm" dir="rtl">
        <colgroup><col className="w-36" /><col /><col className="w-1/2" /></colgroup>
        <thead className="sticky top-0 z-10 bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
          <tr><th className="border-b border-neutral-300 px-3 py-3 text-center font-semibold dark:border-neutral-700">کد مشخصات</th><th className="border-b border-neutral-300 px-3 py-3 text-center font-semibold dark:border-neutral-700">مشخصات (فارسی - انگلیسی)</th><th className="border-b border-neutral-300 px-3 py-3 text-center font-semibold dark:border-neutral-700">مقدار</th></tr>
        </thead>
        {sections.map(({ title, fields }) => <tbody key={title.id}>
          <tr className="bg-neutral-100 font-semibold text-neutral-800 dark:bg-white/10 dark:text-neutral-100"><th colSpan={3} className="border-b border-neutral-300 px-3 py-2 text-right dark:border-neutral-700">{title.name}</th></tr>
          {fields.map((field) => {
            const id = String(field.id);
            const depth = field.code ? String(field.code).split("-").length - 1 : 0;
            const hasChildren = Boolean(field.code && fields.some((candidate) => candidate !== field && String(candidate.code || "").startsWith(`${field.code}-`)));
            const isGroup = /^\d+$/.test(String(field.code || ""));
            const label = field.persianName || field.name;
            return <tr key={id} className={`border-b border-neutral-200 last:border-b-0 dark:border-neutral-700 ${isGroup || hasChildren ? "bg-neutral-50/80 dark:bg-white/5" : "bg-white dark:bg-neutral-900"}`}>
              <td className="px-3 py-1.5 font-semibold tabular-nums"><div className="text-center" style={depth ? { transform: `translateX(-${Math.min(depth, 4) * 20}px)` } : undefined}>{field.code ? toFa(field.code) : "—"}</div></td>
              <td className="px-3 py-1.5"><div id={`equipment-label-${id}`} className="min-w-0 text-right" style={{ paddingRight: Math.min(depth, 5) * 16 }}><span className={isGroup || hasChildren ? "font-semibold" : ""}>{label}</span>{field.englishName && <span className="mr-1 text-xs font-normal text-neutral-400 dark:text-neutral-500">- <bdi dir="ltr">{field.englishName}</bdi></span>}</div></td>
              <td className="px-3 py-1.5 text-right">{!isGroup && <input type="text" dir="ltr" aria-labelledby={`equipment-label-${id}`} value={values[id] || ""} onChange={(event) => onValueChange(id, event.target.value)} maxLength={10000} className="h-9 w-full rounded-lg border border-black/10 bg-white px-3 text-left text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-neutral-100" />}</td>
            </tr>;
          })}
        </tbody>)}
      </table>
    </div>
  </div>;
}
