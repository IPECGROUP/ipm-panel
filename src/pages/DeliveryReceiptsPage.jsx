import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import Card from "../components/ui/Card.jsx";
import BaseTablePager from "../components/ui/BaseTablePager.jsx";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import { AttachmentImageEditor } from "./PettyCashPage.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { api } from "../utils/api.js";

const inputClass = "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-right text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-neutral-100 dark:placeholder:text-neutral-500";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300";
const toFa = (value) => String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
const emptyForm = () => ({ date: "", type: "", title: "", recipient: "", files: [] });
const quickRanges = [["week", "هفته قبل"], ["2w", "۲ هفته قبل"], ["month", "ماه قبل"]];
const typeColors = [
  "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-300",
  "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-300",
  "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-700 dark:bg-teal-950 dark:text-teal-300",
];
const toEnglishDigits = (value) => String(value ?? "").replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit)).replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
const normalizeDate = (value) => {
  const match = toEnglishDigits(value).replaceAll("-", "/").match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  return match ? `${match[1]}/${match[2].padStart(2, "0")}/${match[3].padStart(2, "0")}` : "";
};
const persianDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, toEnglishDigits(part.value)]));
  return normalizeDate(`${values.year}/${values.month}/${values.day}`);
};

export default function DeliveryReceiptsPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [receiptTypes, setReceiptTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [menuPosition, setMenuPosition] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [quickRange, setQuickRange] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [recipientsOpen, setRecipientsOpen] = useState(false);
  const recipientsMenuRef = useRef(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    const headers = user?.id != null ? { "x-user-id": String(user.id) } : {};
    api("/documents/delivery-receipts", { headers })
      .then((result) => { if (active) setItems(Array.isArray(result?.items) ? result.items : []); })
      .catch((err) => { if (active) setError(err.message || "دریافت رسیدهای تحویل انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authLoading, user?.id]);

  useEffect(() => {
    let active = true;
    api("/base/delivery-receipt-types")
      .then((result) => { if (active) setReceiptTypes(Array.isArray(result?.items) ? result.items : []); })
      .catch(() => { if (active) setTypesError("دریافت نوع مرسوله انجام نشد. صفحه را دوباره بارگذاری کنید."); })
      .finally(() => { if (active) setTypesLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!recipientsOpen) return undefined;
    const closeOnOutsideClick = (event) => { if (!recipientsMenuRef.current?.contains(event.target)) setRecipientsOpen(false); };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [recipientsOpen]);

  const recipients = useMemo(() => [...new Set(items.map((item) => String(item.recipient || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fa")), [items]);
  const types = useMemo(() => [...new Set([...receiptTypes.map((type) => type.title), ...items.map((item) => item.type)].map((type) => String(type || "").trim()).filter(Boolean))], [receiptTypes, items]);
  const dateRange = useMemo(() => {
    if (!quickRange) return { from: normalizeDate(fromDate), to: normalizeDate(toDate) };
    const today = new Date();
    const start = new Date(today);
    if (quickRange === "month") start.setMonth(start.getMonth() - 1);
    else start.setDate(start.getDate() - (quickRange === "2w" ? 14 : 7));
    return { from: persianDate(start), to: persianDate(today) };
  }, [quickRange, fromDate, toDate]);
  const filteredItems = useMemo(() => {
    const terms = toEnglishDigits(query).trim().toLocaleLowerCase("fa").split(/\s+/).filter(Boolean);
    return items.filter((item) => {
      if (selectedType && item.type !== selectedType) return false;
      if (selectedRecipients.length && !selectedRecipients.includes(String(item.recipient || "").trim())) return false;
      if (dateRange.from || dateRange.to) {
        const dates = [normalizeDate(item.date), item.createdAt ? persianDate(new Date(item.createdAt)) : ""].filter(Boolean);
        if (!dates.some((date) => (!dateRange.from || date >= dateRange.from) && (!dateRange.to || date <= dateRange.to))) return false;
      }
      return terms.every((term) => toEnglishDigits([item.date, item.type, item.title, item.recipient, item.createdAt].join(" ")).toLocaleLowerCase("fa").includes(term));
    });
  }, [items, query, selectedType, selectedRecipients, dateRange]);
  const allFiltersClear = !query && !fromDate && !toDate && !quickRange && !selectedType && !selectedRecipients.length;
  const safePage = Math.min(page, Math.max(0, Math.ceil(filteredItems.length / pageSize) - 1));
  const pageItems = filteredItems.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const selectedItem = selectedIds.size === 1 ? items.find((item) => selectedIds.has(item.id)) : null;
  const canEditSelected = selectedItem && Number(selectedItem.createdById) === Number(user?.id);

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const rows = filteredItems.map((item) => ({ "تاریخ": item.date || "", "نوع": item.type || "", "شرح": item.title || "", "گیرنده": item.recipient || "", "زمان ثبت": item.createdAt ? new Date(item.createdAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" }) : "" }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "رسیدهای تحویل");
    XLSX.writeFile(workbook, "رسیدهای-تحویل.xlsx");
  }

  function startEditing() {
    if (!canEditSelected) return;
    setForm({ date: selectedItem.date || "", type: selectedItem.type || "", title: selectedItem.title || "", recipient: selectedItem.recipient || "", files: Array.isArray(selectedItem.files) ? [...selectedItem.files] : [] });
    setEditingId(selectedItem.id);
    setFormOpen(true);
    setMenuPosition(null);
    setError("");
  }

  async function save(event) {
    event.preventDefault();
    if (!form.date || !form.type || !form.title.trim() || !form.recipient.trim()) { setError("تاریخ، نوع مرسوله، شرح و گیرنده را وارد کنید."); return; }
    if (uploading) { setError("تا پایان بارگذاری فایل صبر کنید."); return; }
    setSaving(true);
    setError("");
    try {
      const result = await api("/documents/delivery-receipts", { method: editingId ? "PATCH" : "POST", headers: user?.id != null ? { "x-user-id": String(user.id) } : {}, body: JSON.stringify(editingId ? { ...form, id: editingId } : form) });
      setItems((old) => editingId ? old.map((item) => item.id === editingId ? result.item : item) : [result.item, ...old]);
      setForm(emptyForm());
      setEditingId(null);
      setSelectedIds(new Set());
      setFormOpen(false);
      setPage(0);
    } catch (err) { setError(err.message || (editingId ? "ویرایش رسید تحویل انجام نشد." : "ثبت رسید تحویل انجام نشد.")); }
    finally { setSaving(false); }
  }

  async function uploadFile(file) {
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`${String(import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "")}/documents/delivery-receipts/upload`, {
        method: "POST", credentials: "include", headers: user?.id != null ? { "x-user-id": String(user.id) } : {}, body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.file?.url) throw new Error(data.error || "بارگذاری پیوست انجام نشد.");
      setForm((old) => ({ ...old, files: [...old.files, data.file] }));
      setUploadOpen(false);
    } catch (err) { setError(err.message || "بارگذاری پیوست انجام نشد."); }
    finally { setUploading(false); }
  }

  return <div dir="rtl" className="mx-auto max-w-[1400px]">
    <Card className="overflow-hidden rounded-3xl border border-black/10 bg-white p-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-neutral-900">
      <div className="p-3 md:p-4">
        <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 shadow-sm dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04]"><img src="/images/icons/resid-hay-tahvil.svg" alt="" className="h-6 w-6 dark:invert" /></span>
            <span className="min-w-0"><span className="block truncate text-base font-bold tracking-tight md:text-lg">رسید های تحویل</span><span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">دبیرخانه</span></span>
          </div>
          <button type="button" onClick={() => { setForm(emptyForm()); setEditingId(null); setFormOpen((open) => !open); setUploadOpen(false); setError(""); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white transition hover:bg-black/5 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title={formOpen ? "بستن فرم" : "افزودن"} aria-label={formOpen ? "بستن فرم" : "افزودن"} aria-expanded={formOpen}><img src={formOpen ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" /></button>
        </div>

        {formOpen ? <form onSubmit={save} className="mb-4 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
          {editingId && <h2 className="mb-3 text-sm font-bold">ویرایش رسید تحویل</h2>}
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_minmax(220px,1.5fr)_minmax(180px,1fr)_auto]">
            <div className="min-w-0"><span className={labelClass}>تاریخ *</span><JalaliPopupDatePicker value={form.date} onChange={(date) => setForm((old) => ({ ...old, date }))} buttonClassName={`${inputClass} flex items-center justify-between gap-2`} /></div>
            <label className="block"><span className={labelClass}>نوع مرسوله *</span><select required value={form.type} onChange={(event) => setForm((old) => ({ ...old, type: event.target.value }))} className={inputClass} disabled={typesLoading || !!typesError}><option value="">{typesLoading ? "در حال دریافت..." : "انتخاب نوع مرسوله"}</option>{receiptTypes.map((type) => <option key={type.id} value={type.title}>{type.title}</option>)}</select></label>
            <label className="block"><span className={labelClass}>شرح *</span><input required value={form.title} onChange={(event) => setForm((old) => ({ ...old, title: event.target.value }))} className={inputClass} maxLength={300} /></label>
            <label className="block"><span className={labelClass}>گیرنده *</span><input required value={form.recipient} onChange={(event) => setForm((old) => ({ ...old, recipient: event.target.value }))} className={inputClass} maxLength={200} /></label>
            <div className="block"><span className={labelClass}>بارگذاری</span><button type="button" onClick={() => setUploadOpen(true)} disabled={uploading} className="relative grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[.03] disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="بارگذاری پیوست" aria-label="بارگذاری پیوست"><img src="/images/icons/upload.svg" alt="" className="h-5 w-5 dark:invert" />{form.files.length > 0 && <span className="absolute -left-1 -top-1 rounded-full bg-black px-1 text-[10px] text-white">{toFa(form.files.length)}</span>}</button></div>
          </div>
          {!!form.files.length && <div className="mt-3 flex flex-wrap gap-2">{form.files.map((file, index) => <span key={`${file.url}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-black/10 px-2 py-1 text-xs dark:border-white/15"><span className="max-w-48 truncate" title={file.name}>{file.name || `پیوست ${toFa(index + 1)}`}</span><button type="button" onClick={() => setForm((old) => ({ ...old, files: old.files.filter((_, fileIndex) => fileIndex !== index) }))} className="text-red-600" aria-label={`حذف ${file.name || `پیوست ${toFa(index + 1)}`}`}>×</button></span>)}</div>}
          {typesError && <p role="alert" className="mt-3 text-xs text-red-600">{typesError}</p>}
          {!typesLoading && !typesError && !receiptTypes.length && <p className="mt-3 text-xs text-neutral-500">ابتدا نوع مرسوله را در اطلاعات پایه، مدیریت اسناد ثبت کنید.</p>}
          <div className="mt-4 flex justify-end border-t border-black/10 pt-4 dark:border-white/10"><button type="submit" disabled={saving || uploading || typesLoading || !!typesError || !receiptTypes.length} className="grid h-11 w-11 place-items-center rounded-xl bg-black text-white transition hover:bg-black/90 disabled:opacity-50" title={saving ? "در حال ذخیره..." : editingId ? "ذخیره تغییرات" : "ثبت رسید تحویل"} aria-label={editingId ? "ذخیره تغییرات" : "ثبت رسید تحویل"}><img src="/images/icons/check.svg" alt="" className="h-5 w-5 brightness-0 invert" /></button></div>
        </form> : <div className="mb-4 rounded-2xl border border-neutral-200 bg-neutral-100/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[240px] flex-1"><span className={labelClass}>جست و جو</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} className={inputClass} placeholder="جستجو در همه فیلدها (تاریخ، نوع، شرح، گیرنده و ...)" /></label>
            <div className="w-[calc(50%-0.25rem)] sm:w-36"><span className={labelClass}>از</span><JalaliPopupDatePicker value={dateRange.from} onChange={(value) => { setFromDate(value); setToDate(dateRange.to); setQuickRange(""); setPage(0); }} buttonClassName={`${inputClass} flex items-center justify-between gap-2`} /></div>
            <div className="w-[calc(50%-0.25rem)] sm:w-36"><span className={labelClass}>تا</span><JalaliPopupDatePicker value={dateRange.to} onChange={(value) => { setFromDate(dateRange.from); setToDate(value); setQuickRange(""); setPage(0); }} buttonClassName={`${inputClass} flex items-center justify-between gap-2`} /></div>
            <button type="button" onClick={exportExcel} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-white hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="خروجی اکسل" aria-label="خروجی اکسل"><img src="/images/icons8-excel-50.png" alt="" className="h-5 w-5 object-contain" /></button>
          </div>
          <div className="mt-3"><span className={labelClass}>برچسب ها</span>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => { setQuery(""); setFromDate(""); setToDate(""); setQuickRange(""); setSelectedType(""); setSelectedRecipients([]); setPage(0); }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${allFiltersClear ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"}`}>همه</button>
              {quickRanges.map(([key, label]) => <button key={key} type="button" onClick={() => { setQuickRange((current) => current === key ? "" : key); setFromDate(""); setToDate(""); setPage(0); }} aria-pressed={quickRange === key} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${quickRange === key ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"}`}>{label}</button>)}
              {types.map((type, index) => <button key={type} type="button" onClick={() => { setSelectedType((current) => current === type ? "" : type); setPage(0); }} aria-pressed={selectedType === type} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${typeColors[index % typeColors.length]} ${selectedType === type ? "ring-2 ring-current ring-offset-1 dark:ring-offset-neutral-900" : "hover:brightness-95"}`}>{type}</button>)}
              <div ref={recipientsMenuRef} className="relative">
                <button type="button" onClick={() => setRecipientsOpen((open) => !open)} aria-expanded={recipientsOpen} aria-label="فیلتر گیرنده‌ها" title="فیلتر گیرنده‌ها" className={`grid h-9 w-9 place-items-center rounded-xl border text-lg leading-none transition ${selectedRecipients.length ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 bg-white hover:bg-neutral-50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"}`}>•••</button>
                {recipientsOpen && <div className="absolute left-0 top-full z-30 mt-2 max-h-64 min-w-52 overflow-auto rounded-xl border border-black/10 bg-white p-2 shadow-xl dark:border-white/15 dark:bg-neutral-900" role="group" aria-label="گیرنده‌ها">{recipients.length ? recipients.map((recipient) => <label key={recipient} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-white/10"><input type="checkbox" checked={selectedRecipients.includes(recipient)} onChange={() => { setSelectedRecipients((current) => current.includes(recipient) ? current.filter((value) => value !== recipient) : [...current, recipient]); setPage(0); }} className="accent-black" /><span>{recipient}</span></label>) : <span className="block px-2 py-1 text-xs text-neutral-500">گیرنده‌ای ثبت نشده است.</span>}</div>}
              </div>
              {selectedRecipients.map((recipient) => <button key={recipient} type="button" onClick={() => { setSelectedRecipients((current) => current.filter((value) => value !== recipient)); setPage(0); }} className="rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" title="حذف فیلتر گیرنده">{recipient} ×</button>)}
            </div>
          </div>
        </div>}

        {error && <div role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
          <div className="overflow-auto" dir="ltr"><table dir="rtl" className="w-full min-w-[700px] table-fixed text-sm [&_td]:text-center [&_th]:text-center">
            <colgroup><col style={{ width: 48 }} /><col style={{ width: 80 }} /><col style={{ width: 160 }} /><col style={{ width: 160 }} /><col /><col style={{ width: 210 }} /><col style={{ width: 48 }} /></colgroup>
            <thead className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"><tr><th className="px-2 py-3"><input type="checkbox" checked={pageItems.length > 0 && pageItems.every((item) => selectedIds.has(item.id))} onChange={(event) => setSelectedIds((old) => { const next = new Set(old); pageItems.forEach((item) => event.target.checked ? next.add(item.id) : next.delete(item.id)); return next; })} aria-label="انتخاب همه رسیدها" className="h-4 w-4 accent-black" /></th>{["ردیف", "تاریخ", "نوع", "شرح", "گیرنده"].map((label) => <th key={label} className="px-3 py-3 text-[14px] font-semibold">{label}</th>)}<th className="relative w-12 px-2 py-3"><button type="button" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setMenuPosition((old) => old ? null : { top: rect.bottom + 8, left: Math.max(8, Math.min(rect.left - 200, window.innerWidth - 248)) }); }} title="عملیات جدول" aria-label="عملیات جدول" aria-expanded={!!menuPosition} className="inline-grid h-8 w-8 place-items-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10"><img src="/images/icons/menu-table.svg" alt="" className="h-4 w-3 dark:invert" /></button></th></tr></thead>
            <tbody className="text-[13px]">{loading || !pageItems.length ? <tr><td colSpan={7} className="py-8 text-black/60 dark:text-neutral-400">{loading ? "در حال دریافت..." : items.length ? "موردی مطابق جست‌وجو پیدا نشد." : "هنوز رسید تحویلی ثبت نشده است."}</td></tr> : pageItems.map((item, index) => <tr key={item.id} onClick={() => setPreviewItem(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setPreviewItem(item); } }} tabIndex={0} role="button" aria-label={`پیش‌نمایش رسید ${item.title}`} className="h-10 cursor-pointer bg-black/[0.02] transition-colors hover:bg-black/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-black dark:bg-white/5 dark:hover:bg-white/10">
              <td className="border-b border-neutral-300 px-2 dark:border-neutral-700"><input type="checkbox" checked={selectedIds.has(item.id)} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onChange={() => setSelectedIds((old) => { const next = new Set(old); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} aria-label={`انتخاب رسید ${item.title}`} className="h-4 w-4 accent-black" /></td>
              <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFa(safePage * pageSize + index + 1)}</td>
              <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFa(String(item.date || "—").replaceAll("-", "/"))}</td>
              <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{item.type || "—"}</td>
              <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="block break-words">{item.title || "—"}</span></td>
              <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{item.recipient || "—"}</td>
              <td className="border-b border-neutral-300 px-2 dark:border-neutral-700" />
            </tr>)}</tbody>
          </table></div>
          <BaseTablePager total={filteredItems.length} page={safePage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>
    </Card>
    {uploadOpen && <AttachmentImageEditor title="پیوست رسید تحویل" onClose={() => setUploadOpen(false)} onConfirm={uploadFile} />}
    {menuPosition && createPortal(<><div className="fixed inset-0 z-[99]" onClick={() => setMenuPosition(null)} /><div dir="rtl" className="fixed z-[100] w-60 rounded-2xl border border-black/10 bg-white p-1.5 text-neutral-900 shadow-[0_18px_45px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100" style={menuPosition}><div className="px-2.5 pb-2 pt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{selectedIds.size ? `${toFa(selectedIds.size)} مورد انتخاب شده` : "ابتدا یک رسید را انتخاب کنید"}</div><button type="button" disabled={!canEditSelected} onClick={startEditing} title={canEditSelected ? "ویرایش رسید انتخاب‌شده" : "برای ویرایش، یک رسید متعلق به خودتان را انتخاب کنید"} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-amber-500/10"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 dark:bg-amber-500/15"><img src="/images/icons/pencil.svg" alt="" className="h-4 w-4 dark:invert" /></span><span className="text-sm font-semibold">ویرایش رسید</span></button></div></>, document.body)}
    {previewItem && <DeliveryReceiptPreview item={previewItem} onClose={() => setPreviewItem(null)} />}
  </div>;
}

function fileSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return "—";
  return size >= 1024 * 1024 ? `${toFa((size / (1024 * 1024)).toFixed(2))} مگابایت` : `${toFa(Math.max(1, Math.round(size / 1024)))} کیلوبایت`;
}

function isImage(file) {
  return /^image\//i.test(file?.type || "") || /\.(jpe?g|png|webp)(?:[?#]|$)/i.test(file?.url || "");
}

function isPdf(file) {
  return /pdf/i.test(file?.type || "") || /\.pdf(?:[?#]|$)/i.test(file?.url || "");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

async function openReceiptPrintPreview(item) {
  const files = Array.isArray(item.files) ? item.files : [];
  const printWindow = window.open("", "_blank", "width=1150,height=850");
  if (!printWindow) return;
  printWindow.document.write('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><body style="font-family:Tahoma;padding:30px">در حال آماده‌سازی پیش‌نمایش چاپ...</body></html>');
  printWindow.document.close();
  const attachmentRows = files.map((file, index) => {
    const name = String(file.name || `فایل ${index + 1}`);
    let url = "";
    try {
      const parsed = new URL(file.url, window.location.href);
      if (["http:", "https:"].includes(parsed.protocol)) url = parsed.href;
    } catch { /* The fallback page below explains an inaccessible attachment. */ }
    const attachmentPage = (content, caption = `پیوست ${toFa(index + 1)}`) => `<article class="sheet attachment-page"><div class="attachment-header"><span>${caption}</span><strong dir="auto">${escapeHtml(name)}</strong></div><div class="attachment-body">${content}</div><footer class="footer"><span>سامانه فرآیندهای یکپارچه شرکت ایده پویان انرژی</span><span>${caption}</span></footer></article>`;
    if (!url) return attachmentPage('<div class="no-preview">آدرس فایل برای پیش‌نمایش در دسترس نیست.</div>');
    if (isImage(file)) return attachmentPage(`<img class="attachment-image" src="${escapeHtml(url)}" alt="${escapeHtml(name)}" />`);
    if (isPdf(file)) return attachmentPage(`<object class="attachment-pdf" data="${escapeHtml(url)}#view=FitH&toolbar=1" type="application/pdf"><iframe title="${escapeHtml(name)}" src="${escapeHtml(url)}#view=FitH&toolbar=1"></iframe></object><a class="original-file" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">باز کردن و چاپ فایل PDF اصلی</a>`);
    return attachmentPage(`<div class="no-preview">پیش‌نمایش این نوع فایل در مرورگر پشتیبانی نمی‌شود.</div><a class="original-file" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">باز کردن فایل اصلی</a>`);
  });
  if (printWindow.closed) return;
  const now = new Date();
  const reportDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const reportTime = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  const infoCard = (label, value) => `<div class="info-card"><div class="label">${label}</div><div class="value">${escapeHtml(toFa(value || "—"))}</div></div>`;
  const origin = window.location.origin;
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>رسید تحویل - ${escapeHtml(item.title)}</title><style>
@font-face{font-family:Vazir;src:url("${origin}/fonts/Vazir.woff2") format("woff2");font-weight:400}
@font-face{font-family:Vazir;src:url("${origin}/fonts/Vazir-Bold.woff2") format("woff2");font-weight:700}
@page{size:A4;margin:8mm}*{box-sizing:border-box}body{margin:0;background:#eef1f4;color:#16202a;font:9.5px/1.55 Vazir,Tahoma,Arial,sans-serif}
.toolbar{position:sticky;top:0;z-index:20;display:flex;justify-content:center;gap:8px;padding:12px;background:rgba(238,241,244,.96);border-bottom:1px solid #d7dde3}
.toolbar button{min-height:38px;border:1px solid #17212b;border-radius:9px;padding:0 16px;background:#17212b;color:#fff;font:700 12px Vazir,Tahoma,sans-serif;cursor:pointer}.toolbar .secondary{background:#fff;color:#17212b}
.sheet{width:210mm;min-height:297mm;margin:14px auto;padding:8mm;background:#fff;box-shadow:0 10px 35px rgba(20,30,40,.12)}
.header{display:grid;grid-template-columns:44mm 1fr 44mm;align-items:center;min-height:21mm;border:1.5px solid #182531;border-radius:11px;overflow:hidden}
.logo{display:flex;height:100%;align-items:center;justify-content:center;padding:4px;border-left:1px solid #d5dbe0}.logo img{width:38mm;max-height:18mm;object-fit:contain}
.title{padding:5px 10px;text-align:center}.title h1{margin:0;color:#13212d;font-size:17px;line-height:1.4}.title p{margin:2px 0 0;color:#61707d;font-size:9px}
.document-meta{height:100%;display:grid;align-content:center;padding:5px 8px;border-right:1px solid #d5dbe0}.document-meta div{display:flex;justify-content:space-between;gap:6px}.document-meta span,.label{color:#6b7782}
section{margin-top:10px;break-inside:avoid}.section-title{display:flex;align-items:center;gap:6px;margin:0 0 4px;color:#172734;font-size:10.5px;font-weight:700}.section-title::before{content:"";width:3px;height:14px;border-radius:4px;background:#1b6c91}
.info-grid{display:grid;grid-template-columns:repeat(2,1fr);border:1px solid #d8e0e6;border-radius:11px;overflow:hidden}.info-card{min-height:43px;padding:5px 8px;border-left:1px solid #e1e6ea;border-bottom:1px solid #e1e6ea}.info-card:nth-child(2n){border-left:0}.info-card:nth-last-child(-n+2){border-bottom:0}.label{font-size:9px;font-weight:700}.value{margin-top:1px;color:#17232d;font-size:10px;font-weight:700;overflow-wrap:anywhere;white-space:pre-wrap}
.attachment-state{display:inline-flex;padding:4px 8px;border-radius:7px;background:#f1f3f5;color:#53606b;font-weight:700}.attachment-list{margin:5px 0 0;padding:0;list-style:none;border:1px solid #d9e0e5;border-radius:8px;overflow:hidden}.attachment-list li{display:grid;grid-template-columns:9mm 1fr;gap:6px;padding:4px 8px;border-bottom:1px solid #e4e8eb}.attachment-list li:last-child{border-bottom:0}.attachment-list .number{color:#1b6c91;font-weight:700}.attachment-list strong{direction:ltr;unicode-bidi:isolate;text-align:right;overflow-wrap:anywhere}
.attachment-page{break-before:page;page-break-before:always;display:flex;flex-direction:column}.attachment-header{display:grid;grid-template-columns:28mm 1fr;align-items:center;gap:10px;min-height:15mm;padding:8px 11px;border:1px solid #d6dee4;border-radius:11px;background:#f4f7f9}.attachment-header span{color:#1b6c91;font-weight:700}.attachment-header strong{overflow-wrap:anywhere}.attachment-body{display:flex;min-height:235mm;flex:1;flex-direction:column;align-items:center;justify-content:center;margin-top:9px;overflow:hidden;border:1px solid #d9e0e5;border-radius:11px;background:#fafbfc}.attachment-image{display:block;max-width:100%;max-height:235mm;object-fit:contain}.attachment-pdf,.attachment-pdf iframe{display:block;width:100%;min-height:225mm;border:0}.no-preview{padding:25px;color:#697680;text-align:center}.original-file{display:inline-flex;margin:8px;border-radius:8px;background:#17212b;color:#fff;padding:6px 12px;text-decoration:none;font-weight:700}
.footer{display:flex;justify-content:space-between;gap:10px;margin-top:13px;padding-top:7px;border-top:1px solid #d9e0e5;color:#75818b;font-size:8.5px}
@media print{body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.toolbar{display:none}.sheet{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}.original-file{display:none}}
@media screen and (max-width:900px){.sheet{width:calc(100% - 20px);min-height:auto;padding:18px}.header{grid-template-columns:1fr}.logo,.document-meta{border:0;border-bottom:1px solid #d5dbe0}}
</style></head><body><div class="toolbar"><button id="print-document" type="button">چاپ / ذخیره PDF</button><button id="close-preview" class="secondary" type="button">بستن پیش‌نمایش</button></div><article class="sheet"><header class="header"><div class="logo"><img src="${origin}/images/light%20mode.png" alt="IPEC" /></div><div class="title"><h1>فرم رسید تحویل</h1><p>گزارش رسمی رسید تحویل</p></div><div class="document-meta"><div><span>تاریخ:</span><strong>${escapeHtml(toFa(String(item.date || "—").replaceAll("-", "/")))}</strong></div></div></header><section><h2 class="section-title">مشخصات رسید تحویل</h2><div class="info-grid">${infoCard("تاریخ", String(item.date || "—").replaceAll("-", "/"))}${infoCard("نوع", item.type)}${infoCard("شرح", item.title)}${infoCard("گیرنده", item.recipient)}</div></section><section><h2 class="section-title">پیوست‌های رسید تحویل</h2><div class="attachment-state">پیوست: ${files.length ? "دارد" : "ندارد"}</div>${files.length ? `<ul class="attachment-list">${files.map((file, index) => `<li><span class="number">${toFa(index + 1)}</span><strong>${escapeHtml(file.name || `فایل ${index + 1}`)}</strong></li>`).join("")}</ul>` : ""}</section><footer class="footer"><span>سامانه فرآیندهای یکپارچه شرکت ایده پویان انرژی</span><span>${escapeHtml(`${reportTime} - ${reportDate}`)}</span></footer></article>${attachmentRows.join("")}</body></html>`);
  printWindow.document.close();
  printWindow.document.getElementById("close-preview")?.addEventListener("click", () => printWindow.close());
  printWindow.document.getElementById("print-document")?.addEventListener("click", async () => {
    const button = printWindow.document.getElementById("print-document");
    button.disabled = true;
    button.textContent = "آماده‌سازی پیوست‌ها...";
    try {
      const sheets = [printWindow.document.querySelector("article.sheet:not(.attachment-page)").outerHTML];
      const attachmentSheets = [...printWindow.document.querySelectorAll("article.attachment-page")];
      let pdfjs;
      for (const [index, file] of files.entries()) {
        const sheet = attachmentSheets[index];
        if (!sheet) continue;
        if (!isPdf(file)) { sheets.push(sheet.outerHTML); continue; }
        try {
          if (!pdfjs) { pdfjs = await import("pdfjs-dist"); pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl; }
          const pdf = await pdfjs.getDocument({ url: new URL(file.url, window.location.href).href, withCredentials: true }).promise;
          try {
            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
              const page = await pdf.getPage(pageNumber);
              const viewport = page.getViewport({ scale: 2 });
              const canvas = document.createElement("canvas");
              canvas.width = Math.ceil(viewport.width);
              canvas.height = Math.ceil(viewport.height);
              await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
              const printableSheet = sheet.cloneNode(true);
              printableSheet.querySelector(".attachment-header span").textContent = `پیوست ${toFa(index + 1)}، صفحه ${toFa(pageNumber)} از ${toFa(pdf.numPages)}`;
              const image = printWindow.document.createElement("img");
              image.className = "attachment-image";
              image.alt = String(file.name || "پیوست");
              image.src = canvas.toDataURL("image/png");
              printableSheet.querySelector(".attachment-body").replaceChildren(image);
              sheets.push(printableSheet.outerHTML);
              canvas.width = 0;
              canvas.height = 0;
              page.cleanup();
            }
          } finally { await pdf.destroy(); }
        } catch (error) {
          console.warn("delivery_receipt_pdf_print_failed", error);
          const fallback = sheet.cloneNode(true);
          fallback.querySelector(".attachment-body").textContent = "نمایش این پیوست برای چاپ ممکن نشد. فایل اصلی را از صفحه رسید باز کنید.";
          sheets.push(fallback.outerHTML);
        }
      }
      printWindow.document.getElementById("delivery-receipt-print-frame")?.remove();
      const frame = printWindow.document.createElement("iframe");
      frame.id = "delivery-receipt-print-frame";
      frame.title = "چاپ رسید تحویل و پیوست‌ها";
      frame.style.cssText = "position:fixed;width:1px;height:1px;left:-10000px;top:0;border:0";
      printWindow.document.body.appendChild(frame);
      frame.contentWindow.addEventListener("afterprint", () => window.setTimeout(() => frame.remove(), 500), { once: true });
      frame.contentDocument.open();
      frame.contentDocument.write(`<!doctype html><html lang="fa" dir="rtl"><head>${printWindow.document.head.innerHTML}</head><body>${sheets.join("")}</body></html>`);
      frame.contentDocument.close();
      await frame.contentDocument.fonts?.ready;
      await Promise.all([...frame.contentDocument.images].map((image) => image.decode().catch(() => {})));
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch (error) {
      console.error("delivery_receipt_print_failed", error);
      printWindow.alert("آماده‌سازی رسید و پیوست‌ها برای چاپ ممکن نشد.");
    } finally {
      button.disabled = false;
      button.textContent = "چاپ / ذخیره PDF";
    }
  });
}

function DeliveryReceiptPreview({ item, onClose }) {
  const files = Array.isArray(item.files) ? item.files : [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imageOpen, setImageOpen] = useState(false);
  const file = files[Math.min(selectedIndex, Math.max(0, files.length - 1))];
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => { if (event.key === "Escape") { if (imageOpen) setImageOpen(false); else onClose(); } };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); };
  }, [imageOpen, onClose]);

  return createPortal(<div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-label="پیش‌نمایش رسید تحویل">
    <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
    <div className="absolute inset-0 flex items-end justify-center sm:items-center sm:p-3 md:p-6">
      <div dir="rtl" className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white sm:max-h-[min(85dvh,760px)] sm:w-[min(1080px,calc(100vw-32px))] sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black/10 px-3 py-2.5 dark:border-white/10 sm:px-4 sm:py-3"><h2 className="text-sm font-bold">پیش‌نمایش رسید تحویل</h2><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-800 text-xl text-white shadow-sm transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900" title="بستن" aria-label="بستن">×</button></header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid min-w-0 items-start gap-4 md:grid-cols-[minmax(230px,0.9fr)_minmax(0,1.1fr)]">
            <section className="min-w-0 overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900"><h3 className="border-b border-black/10 bg-neutral-50 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/5">جزئیات رسید تحویل</h3><dl className="divide-y divide-black/10 dark:divide-white/10">{[["تاریخ", toFa(String(item.date || "—").replaceAll("-", "/"))], ["نوع", item.type], ["شرح", item.title], ["گیرنده", item.recipient]].map(([label, value]) => <div key={label} className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 px-4 py-3 text-sm"><dt className="text-neutral-500 dark:text-neutral-400">{label}</dt><dd className="m-0 min-w-0 break-words font-medium">{value || "—"}</dd></div>)}</dl></section>
            <aside className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-white/5"><h3 className="border-b border-neutral-200 px-3 py-3 text-sm font-bold dark:border-white/10">پیش‌نمایش پیوست‌ها</h3><div className="p-3"><div className="relative grid h-64 place-items-center overflow-hidden rounded-xl bg-neutral-100 dark:bg-white/5 lg:h-[min(44vh,430px)]">{!file ? <p className="px-4 text-center text-xs text-neutral-500">پیوستی برای نمایش وجود ندارد.</p> : isPdf(file) ? <iframe key={file.url} src={file.url} title={`پیش‌نمایش ${file.name}`} className="h-full w-full border-0" /> : isImage(file) ? <button type="button" onClick={() => setImageOpen(true)} className="grid h-full w-full place-items-center" title="نمایش تصویر در اندازه بزرگ"><img src={file.url} alt={file.name || "پیوست رسید"} className="max-h-full max-w-full object-contain" /></button> : <p className="px-4 text-center text-xs text-neutral-500">پیش‌نمایش این فایل در مرورگر در دسترس نیست.</p>}</div>
              {file && <div className="mt-3 min-w-0"><p className="truncate text-right text-xs font-semibold" dir="auto" title={file.name}>{file.name || "پیوست"}</p><p className="mt-1 text-right text-[11px] text-neutral-500 dark:text-neutral-400">{fileSize(file.size)}</p></div>}
              {files.length > 1 && <div className="mt-3 flex flex-wrap gap-1.5" aria-label="انتخاب پیوست">{files.map((entry, index) => <button key={`${entry.url}-${index}`} type="button" onClick={() => setSelectedIndex(index)} className={`rounded-lg border px-2 py-1 text-xs transition ${index === selectedIndex ? "border-neutral-800 bg-neutral-800 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 hover:bg-neutral-50 dark:border-white/10 dark:hover:bg-white/5"}`}>پیوست {toFa(index + 1)}</button>)}</div>}
            </div><div className="border-t border-neutral-200 p-3 dark:border-white/10"><button type="button" onClick={() => openReceiptPrintPreview(item)} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white text-sm font-semibold transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"><Printer className="h-4 w-4" />چاپ / ذخیره PDF</button></div></aside>
          </div>
        </div>
      </div>
    </div>
    {imageOpen && file && createPortal(<div className="fixed inset-0 z-[10001] flex flex-col bg-neutral-950 text-white" dir="rtl" role="dialog" aria-modal="true" aria-label={`نمایش ${file.name || "تصویر"}`}><div className="flex min-h-14 items-center gap-3 border-b border-white/15 px-4"><strong className="min-w-0 flex-1 truncate text-sm">{file.name || "پیوست تصویری"}</strong><button type="button" onClick={() => setImageOpen(false)} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm" aria-label="بستن تصویر">×</button></div><div className="min-h-0 flex-1 overflow-auto p-4"><img src={file.url} alt={file.name || "پیوست"} className="mx-auto max-h-full max-w-full object-contain" /></div></div>, document.body)}
  </div>, document.body);
}
