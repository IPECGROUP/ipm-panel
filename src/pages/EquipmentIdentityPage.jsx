import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import BaseTablePager from "../components/ui/BaseTablePager.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { api } from "../utils/api.js";
import RelatedLettersPickerModal from "../components/RelatedLettersPickerModal.jsx";
import { AttachmentImageEditor } from "./PettyCashPage.jsx";
import { FileText } from "lucide-react";

const inputClass = "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-right text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-neutral-100 dark:placeholder:text-neutral-500";
const labelClass = "mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300";
const toFa = (value) => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
const emptyForm = () => ({ categoryId: "", fieldValues: {}, relatedLetterIds: [], files: [] });

export default function EquipmentIdentityPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [definitions, setDefinitions] = useState({ categories: [], titles: [], fields: [] });
  const [letters, setLetters] = useState([]);
  const [letterPickerOpen, setLetterPickerOpen] = useState(false);
  const [letterQuery, setLetterQuery] = useState("");
  const [draftLetterIds, setDraftLetterIds] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    const headers = user?.id != null ? { "x-user-id": String(user.id) } : {};
    Promise.allSettled([api("/equipment-identities", { headers }), api("/base/equipment-fields", { headers }), api("/letters", { headers })])
      .then(([equipment, definitionData, letterData]) => {
        if (!active) return;
        if (equipment.status === "fulfilled") setItems(Array.isArray(equipment.value?.items) ? equipment.value.items : []);
        else setError(equipment.reason?.message || "دریافت اطلاعات تجهیزات انجام نشد.");
        if (definitionData.status === "fulfilled") setDefinitions({
          categories: Array.isArray(definitionData.value?.categories) ? definitionData.value.categories : [],
          titles: Array.isArray(definitionData.value?.titles) ? definitionData.value.titles : [],
          fields: Array.isArray(definitionData.value?.fields) ? definitionData.value.fields : [],
        });
        else setError(definitionData.reason?.message || "دریافت دسته‌بندی‌ها و فیلدهای تجهیزات انجام نشد.");
        if (letterData.status === "fulfilled") setLetters(Array.isArray(letterData.value?.items) ? letterData.value.items : []);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authLoading, user?.id]);

  const categorySections = useMemo(() => definitions.titles.map((title) => ({
    title,
    fields: definitions.fields.filter((field) => String(field.categoryId) === String(form.categoryId) && String(field.titleId) === String(title.id)),
  })).filter((section) => section.fields.length), [definitions, form.categoryId]);
  const filteredItems = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("fa");
    return items.filter((item) => {
      const matchesText = !term || [item.code, item.name, item.category].join(" ").toLocaleLowerCase("fa").includes(term);
      return matchesText;
    });
  }, [items, query]);
  const safePage = Math.min(page, Math.max(0, Math.ceil(filteredItems.length / pageSize) - 1));
  const pageItems = filteredItems.slice(safePage * pageSize, (safePage + 1) * pageSize);

  async function save(event) {
    event.preventDefault();
    if (!form.categoryId) { setError("دسته‌بندی تجهیز را انتخاب کنید."); return; }
    if (uploading) { setError("تا پایان بارگذاری فایل صبر کنید."); return; }
    setSaving(true);
    setError("");
    try {
      const result = await api("/equipment-identities", {
        method: "POST",
        headers: user?.id != null ? { "x-user-id": String(user.id) } : {},
        body: JSON.stringify(form),
      });
      setItems((current) => [result.item, ...current]);
      setForm(emptyForm());
      setFormOpen(false);
      setPage(0);
    } catch (err) {
      setError(err.message || "ثبت تجهیز انجام نشد.");
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
        <div className="mb-5 flex min-w-0 items-center justify-between gap-3 border-b border-black/[0.07] pb-4 dark:border-white/10">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 shadow-sm dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04]">
              <img src="/images/icons/shenasnameh-taghizat.svg" alt="" className="h-6 w-6 dark:invert" />
            </span>
            <span className="block truncate text-base font-bold tracking-tight md:text-lg">شناسنامه تجهیزات</span>
          </div>
          <button type="button" onClick={() => { setFormOpen((open) => !open); setError(""); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white transition hover:bg-black/5 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title={formOpen ? "بستن فرم" : "افزودن"} aria-label={formOpen ? "بستن فرم" : "افزودن"} aria-expanded={formOpen}>
            <img src={formOpen ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" />
          </button>
        </div>

        {formOpen ? <form onSubmit={save} className="mb-4 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
          <label className="mb-3 block max-w-sm"><span className={`block ${labelClass}`}>دسته‌بندی *</span><select required value={form.categoryId} onChange={(event) => setForm((old) => ({ ...old, categoryId: event.target.value, fieldValues: {} }))} className={inputClass}><option value="">انتخاب دسته‌بندی</option>{definitions.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <div className="mt-4 flex flex-wrap items-start gap-3">
            <label className="block"><span className={`block ${labelClass}`}>بارگذاری</span><button type="button" onClick={() => setUploadOpen(true)} className="relative grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="بارگذاری فایل"><img src="/images/icons/upload.svg" alt="" className={`h-5 w-5 dark:invert ${uploading ? "animate-pulse" : ""}`} />{form.files.length > 0 && <span className="absolute -left-1 -top-1 rounded-full bg-black px-1 text-[10px] text-white">{toFa(form.files.length)}</span>}</button></label>
            <label className="block"><span className={`block ${labelClass}`}>اسناد مرتبط</span><button type="button" onClick={() => { setDraftLetterIds(form.relatedLetterIds.map(String)); setLetterQuery(""); setLetterPickerOpen(true); }} className="relative grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="انتخاب اسناد مرتبط"><img src="/images/icons/asnad-mortabet.svg" alt="" className="h-5 w-5 dark:invert" />{form.relatedLetterIds.length > 0 && <span className="absolute -left-1 -top-1 rounded-full bg-black px-1 text-[10px] text-white">{toFa(form.relatedLetterIds.length)}</span>}</button></label>
            <label className="block"><span className={`block ${labelClass}`}>مستندات</span><button type="button" disabled className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white text-neutral-400 dark:border-white/15 dark:bg-white/5" title="اتصال مستندات در مرحله بعد مشخص می‌شود"><FileText className="h-5 w-5" /></button></label>
          </div>
          {form.files.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{form.files.map((file, index) => <span key={file.url} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-black/10 bg-white px-2 py-1 text-xs dark:border-white/15 dark:bg-white/5"><a href={file.url} target="_blank" rel="noreferrer" className="max-w-40 truncate hover:underline">{file.name}</a><button type="button" onClick={() => setForm((old) => ({ ...old, files: old.files.filter((_, position) => position !== index) }))} aria-label="حذف فایل">×</button></span>)}</div>}
          {categorySections.map(({ title, fields }) => <section key={title.id} className="mt-4 rounded-2xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-white/[.03]"><h3 className="mb-3 border-b border-black/10 pb-2 text-sm font-bold dark:border-white/10">{title.name}</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map((field) => <label key={field.id} className="block"><span className={`block ${labelClass}`}>{field.name}</span><input type="text" value={form.fieldValues[String(field.id)] || ""} onChange={(event) => setForm((old) => ({ ...old, fieldValues: { ...old.fieldValues, [String(field.id)]: event.target.value } }))} maxLength={10000} className={inputClass} /></label>)}</div></section>)}
          <div className="mt-4 flex justify-end"><button type="submit" disabled={saving || uploading} className="grid h-11 w-11 place-items-center rounded-xl bg-black text-white transition hover:bg-black/90 disabled:opacity-50" title={saving ? "در حال ثبت..." : "ثبت تجهیز"} aria-label="ثبت تجهیز"><img src="/images/icons/check.svg" alt="" className="h-5 w-5 brightness-0 invert" /></button></div>
        </form> : <div className="mb-4 rounded-2xl border border-neutral-200 bg-neutral-100/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
          <label className="block"><span className={`block ${labelClass}`}>جست و جو</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} className={inputClass} placeholder="جستجو در کد تجهیز، نام تجهیز و دسته‌بندی..." /></label>
        </div>}

        {error && <div role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
          <div className="overflow-auto" dir="ltr"><table dir="rtl" className="w-full min-w-[600px] table-fixed text-sm [&_td]:text-center [&_th]:text-center"><colgroup><col style={{ width: 80 }} /><col style={{ width: "24%" }} /><col /><col style={{ width: "25%" }} /></colgroup><thead><tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">{["ردیف", "کد تجهیز", "نام تجهیز", "دسته‌بندی"].map((heading) => <th key={heading} className="px-3 py-2 text-[14px] font-semibold md:text-[15px]">{heading}</th>)}</tr></thead><tbody className="text-[13px]">{loading || !pageItems.length ? <tr><td colSpan={4} className="py-8 text-black/60 dark:text-neutral-400">{loading ? "در حال دریافت..." : items.length ? "موردی مطابق فیلتر پیدا نشد." : "هنوز تجهیزی ثبت نشده است."}</td></tr> : pageItems.map((item, index) => <tr key={item.id} className="h-10 bg-black/[0.02] transition-colors hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10"><td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFa(safePage * pageSize + index + 1)}</td><td className="border-b border-neutral-300 px-3 dark:border-neutral-700" dir="auto">{item.code}</td><td className="border-b border-neutral-300 px-3 font-medium dark:border-neutral-700">{item.name}</td><td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{item.category || "—"}</td></tr>)}</tbody></table></div>
          <BaseTablePager total={filteredItems.length} page={safePage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>
    </Card>
    {letterPickerOpen && <RelatedLettersPickerModal api={api} title="انتخاب اسناد مرتبط" query={letterQuery} onQueryChange={setLetterQuery} loading={false} items={letters} selectedIds={draftLetterIds} onToggle={(id) => setDraftLetterIds((old) => old.includes(String(id)) ? old.filter((value) => value !== String(id)) : [...old, String(id)])} onConfirm={() => { setForm((old) => ({ ...old, relatedLetterIds: draftLetterIds })); setLetterPickerOpen(false); }} onClose={() => setLetterPickerOpen(false)} blackActions />}
    {uploadOpen && <AttachmentImageEditor title="پیوست تجهیز" onClose={() => setUploadOpen(false)} onConfirm={uploadFile} />}
  </div>;
}
