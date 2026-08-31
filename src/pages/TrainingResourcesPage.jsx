import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, File } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { api } from "../utils/api.js";
import { dayjs } from "../utils/date.js";

const inputClass = "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-right text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-neutral-100 dark:placeholder:text-neutral-500";
const labelClass = "mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300";

const toFaDigits = (value = "") => String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
const letterIdOf = (letter) => String(letter?.id ?? letter?.letterId ?? letter?.letter_id ?? "");
const letterNoOf = (letter) => String(letter?.letterNo ?? letter?.letter_no ?? letter?.number ?? letter?.docNo ?? letter?.doc_no ?? "");
const letterSubjectOf = (letter) => String(letter?.subject ?? letter?.title ?? letter?.letterSubject ?? "");
const letterDateOf = (letter) => String(letter?.letterDateJalali ?? letter?.dateJalali ?? letter?.date_fa ?? letter?.date ?? "").replaceAll("-", "/");

function jalaliDate(value) {
  const parsed = dayjs(value);
  return parsed.isValid() ? toFaDigits(parsed.calendar("jalali").locale("fa").format("YYYY/MM/DD")) : "—";
}

function jalaliDateKey(value) {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.calendar("jalali").format("YYYY/MM/DD") : "";
}

function normalizedDate(value) {
  return String(value || "").replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 0x06F0)).replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660)).replaceAll("-", "/").trim();
}

function shortenedLink(value) {
  const text = String(value || "").trim();
  if (!text) return "—";
  const words = text.split(/\s+/);
  if (words.length > 12) return `${words.slice(0, 12).join(" ")}…`;
  return text.length > 58 ? `${text.slice(0, 58)}…` : text;
}

function normalizedUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "#";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function fileKind(file) {
  const name = String(file?.name || file?.originalName || file?.url || "").toLowerCase();
  if (/\.(xlsx?|xlsm|csv)$/.test(name)) return "excel";
  if (/\.(docx?|rtf)$/.test(name)) return "word";
  if (/\.pdf$/.test(name)) return "pdf";
  return "file";
}

function FileTypeIcon({ file }) {
  const kind = fileKind(file);
  const icons = {
    excel: { src: "/images/sheets.png", alt: "Excel" },
    word: { src: "/images/word-processor.png", alt: "Word" },
    pdf: { src: "/images/pdf.png", alt: "PDF" },
  };
  if (icons[kind]) return <img src={icons[kind].src} alt={icons[kind].alt} className="h-6 w-6 object-contain" />;
  return <File className="h-5 w-5 text-neutral-500" />;
}

export default function TrainingResourcesPage({ variant = "training" }) {
  const isLibrary = variant === "library";
  const { user, loading: authLoading } = useAuth();
  const fileRef = useRef(null);
  const tableMenuRef = useRef(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const emptyForm = () => ({ title: "", category: "", link: "", libraryId: "", relatedLetterIds: [], tagIds: [], files: [] });
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([]);
  const [letters, setLetters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerIds, setPickerIds] = useState([]);
  const [copiedId, setCopiedId] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [tags, setTags] = useState([]);
  const [filterTagIds, setFilterTagIds] = useState([]);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [tagPickerFor, setTagPickerFor] = useState("form");
  const [tagPickerDraftIds, setTagPickerDraftIds] = useState([]);
  const [tagPickerQuery, setTagPickerQuery] = useState("");

  const requestHeaders = useMemo(() => user?.id != null ? { "x-user-id": String(user.id) } : {}, [user?.id]);

  const loadItems = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      const data = await api(isLibrary ? "/library-items" : "/training-resources", { headers: requestHeaders });
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(err.message || `دریافت ${isLibrary ? "اطلاعات کتابخانه" : "منابع آموزشی"} انجام نشد.`);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isLibrary, requestHeaders]);

  useEffect(() => { loadItems(); }, [loadItems]);

  useEffect(() => {
    if (!tableMenuOpen) return undefined;
    const closeMenu = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "mousedown" && (tableMenuRef.current?.contains(event.target) || event.target.closest?.("[data-resource-table-menu]"))) return;
      setTableMenuOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeMenu);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeMenu);
    };
  }, [tableMenuOpen]);

  useEffect(() => {
    if (authLoading) return;
    api("/letters/mine", { headers: requestHeaders })
      .then((data) => setLetters(Array.isArray(data?.items) ? data.items : []))
      .catch(() => setLetters([]));
  }, [authLoading, requestHeaders]);

  useEffect(() => {
    if (authLoading) return;
    api(isLibrary ? "/base/libraries" : "/base/training-resource-categories", { headers: requestHeaders })
      .then((data) => setCategories(Array.isArray(data?.items) ? data.items : []))
      .catch(() => setCategories([]));
  }, [authLoading, isLibrary, requestHeaders]);

  useEffect(() => {
    if (authLoading || isLibrary) return;
    api("/tags", { headers: requestHeaders })
      .then((data) => setTags(Array.isArray(data?.items) ? data.items : []))
      .catch(() => setTags([]));
  }, [authLoading, isLibrary, requestHeaders]);

  const filteredLetters = useMemo(() => {
    const query = pickerQuery.trim().toLowerCase();
    return letters.filter((letter) => !query || [letterNoOf(letter), letterSubjectOf(letter), letterDateOf(letter)].join(" ").toLowerCase().includes(query)).slice(0, 300);
  }, [letters, pickerQuery]);

  const closeForm = () => {
    setFormOpen(false);
    setEditingId("");
    setForm(emptyForm());
    setError("");
  };

  useEffect(() => {
    setFormOpen(false);
    setEditingId("");
    setForm(emptyForm());
    setUploadOpen(false);
    setPickerOpen(false);
  }, [variant]);

  const openFreshForm = () => {
    setEditingId("");
    setForm(emptyForm());
    setFormOpen(true);
    setError("");
    setNotice("");
  };

  const editSelected = () => {
    if (selectedIds.size !== 1) return;
    const item = items.find((row) => selectedIds.has(String(row.id)));
    if (!item) return;
    setEditingId(String(item.id));
    setForm({ title: item.title || "", category: item.category || "", link: item.link || "", libraryId: item.libraryId == null ? "" : String(item.libraryId), relatedLetterIds: Array.isArray(item.relatedLetterIds) ? item.relatedLetterIds.map(String) : [], tagIds: Array.isArray(item.tagIds) ? item.tagIds.map(String) : [], files: Array.isArray(item.files) ? item.files : [] });
    setFormOpen(true);
    setTableMenuOpen(false);
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteSelected = async () => {
    if (!selectedIds.size || deleting) return;
    if (!window.confirm(`${toFaDigits(selectedIds.size)} مورد انتخاب‌شده حذف شود؟`)) return;
    setDeleting(true);
    setError("");
    try {
      await api(isLibrary ? "/library-items" : "/training-resources", { method: "DELETE", headers: requestHeaders, body: JSON.stringify({ ids: [...selectedIds] }) });
      setItems((previous) => previous.filter((item) => !selectedIds.has(String(item.id))));
      setSelectedIds(new Set());
      setTableMenuOpen(false);
      setNotice("موارد انتخاب‌شده با موفقیت حذف شدند.");
      if (editingId && selectedIds.has(editingId)) closeForm();
    } catch (err) {
      setError(err.message || "حذف موارد انتخاب‌شده انجام نشد.");
    } finally {
      setDeleting(false);
    }
  };

  const uploadFiles = async (fileList) => {
    const selected = Array.from(fileList || []);
    if (!selected.length) return;
    setUploading(true);
    setError("");
    try {
      const uploaded = [];
      for (const file of selected) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch(isLibrary ? "/api/library-items/upload" : "/api/training-resources/upload", { method: "POST", credentials: "include", headers: requestHeaders, body });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error === "unsupported_file_type" ? "فقط فایل‌های اکسل، ورد و PDF مجاز هستند." : data.error || "بارگذاری فایل انجام نشد.");
        uploaded.push(data.file);
      }
      setForm((previous) => ({ ...previous, files: [...previous.files, ...uploaded] }));
    } catch (err) {
      setError(err.message || "بارگذاری فایل انجام نشد.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setError("");
    setNotice("");
    if (!form.title.trim()) return setError("عنوان را وارد کنید.");
    if (isLibrary && !form.libraryId) return setError("کتابخانه را انتخاب کنید.");
    if (!isLibrary && !form.link.trim()) return setError("لینک را وارد کنید.");
    if (!isLibrary) try { new URL(normalizedUrl(form.link)); } catch { return setError("لینک واردشده معتبر نیست."); }
    setSaving(true);
    try {
      const data = await api(isLibrary ? "/library-items" : "/training-resources", { method: editingId ? "PATCH" : "POST", headers: requestHeaders, body: JSON.stringify(editingId ? { ...form, id: editingId } : form) });
      setItems((previous) => editingId ? previous.map((item) => String(item.id) === editingId ? data.item : item) : [data.item, ...previous]);
      setForm(emptyForm());
      setNotice(editingId ? `${isLibrary ? "مورد کتابخانه" : "منبع آموزشی"} با موفقیت ویرایش شد.` : `${isLibrary ? "مورد کتابخانه" : "منبع آموزشی"} با موفقیت به جدول افزوده شد.`);
      setEditingId("");
      setFormOpen(false);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err.message || `ثبت ${isLibrary ? "مورد کتابخانه" : "منبع آموزشی"} انجام نشد.`);
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async (item) => {
    try {
      await navigator.clipboard.writeText(item.link);
      setCopiedId(String(item.id));
      window.setTimeout(() => setCopiedId(""), 1600);
    } catch {
      setError("کپی لینک انجام نشد.");
    }
  };

  const openTagPicker = (target) => {
    setTagPickerFor(target);
    setTagPickerDraftIds(target === "form" ? form.tagIds.map(String) : filterTagIds.map(String));
    setTagPickerQuery("");
    setTagPickerOpen(true);
  };

  const applyTagPicker = () => {
    const ids = [...new Set(tagPickerDraftIds.map(String))];
    if (tagPickerFor === "form") setForm((previous) => ({ ...previous, tagIds: ids }));
    else setFilterTagIds(ids);
    setTagPickerOpen(false);
  };

  const filteredItems = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    const fromDate = normalizedDate(filterFromDate);
    const toDate = normalizedDate(filterToDate);
    return items.filter((item) => {
      const date = jalaliDateKey(item.createdAt);
      if (fromDate && (!date || date < fromDate)) return false;
      if (toDate && (!date || date > toDate)) return false;
      if (filterTagIds.length && !filterTagIds.some((id) => (Array.isArray(item.tagIds) ? item.tagIds : []).map(String).includes(String(id)))) return false;
      return !query || [item.title, item.category, item.libraryTitle, item.link].join(" ").toLowerCase().includes(query);
    });
  }, [filterTagIds, items, filterFromDate, filterQuery, filterToDate]);

  const exportFilteredItems = async () => {
    if (!filteredItems.length) return;
    const XLSX = await import("xlsx");
    const rows = filteredItems.map((item, index) => isLibrary ? {
      "ردیف": index + 1,
      "تاریخ": jalaliDate(item.createdAt),
      "عنوان": item.title || "",
      "کتابخانه": item.libraryTitle || "",
    } : {
      "ردیف": index + 1,
      "تاریخ": jalaliDate(item.createdAt),
      "عنوان": item.title || "",
      "دسته‌بندی": item.category || "",
      "لینک": item.link || "",
    });
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    workbook.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(workbook, worksheet, isLibrary ? "Libraries" : "Training resources");
    XLSX.writeFile(workbook, `${isLibrary ? "libraries" : "training-resources"}.xlsx`);
  };

  const allSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(String(item.id)));
  const toggleSelected = (id) => setSelectedIds((previous) => {
    const next = new Set(previous);
    const key = String(id);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(filteredItems.map((item) => String(item.id))));

  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <Card className="overflow-hidden rounded-3xl border border-black/10 bg-white p-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-neutral-900">
        <div className="p-3 md:p-4">
          <div className="mb-5 flex min-w-0 items-center justify-between gap-3 border-b border-black/[0.07] pb-4 dark:border-white/10">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 shadow-sm dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04]">
                <img src={isLibrary ? "/images/icons/ketabkhane.svg" : "/images/icons/manabeamozeshi.svg"} alt="" className="h-6 w-6 dark:invert" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-bold tracking-tight md:text-lg">{isLibrary ? "کتابخانه‌ها" : "منابع آموزشی"}</span>
                <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت دانش</span>
              </span>
            </div>
            <button type="button" onClick={() => formOpen ? closeForm() : openFreshForm()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white transition hover:bg-black/5 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title={formOpen ? "بستن فرم" : "افزودن"} aria-label={formOpen ? "بستن فرم" : "افزودن"}>
              <img src={formOpen ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" />
            </button>
          </div>

          {!formOpen && <ResourceFilterBar query={filterQuery} setQuery={setFilterQuery} fromDate={filterFromDate} setFromDate={setFilterFromDate} toDate={filterToDate} setToDate={setFilterToDate} onExport={exportFilteredItems} canExport={filteredItems.length > 0} showTags={!isLibrary} tags={tags} selectedTagIds={filterTagIds} onOpenTags={() => openTagPicker("filter")} />}

          {formOpen && (
            <div className="mb-4 overflow-x-auto rounded-2xl border border-black/10 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[.03]">
              <div className={`flex items-end gap-3 ${isLibrary ? "min-w-[720px]" : "min-w-[1040px]"}`}>
                <Field label="عنوان" className="min-w-[190px] flex-[1.2]"><input value={form.title} onChange={(event) => setForm((old) => ({ ...old, title: event.target.value }))} className={inputClass} placeholder={isLibrary ? "عنوان" : "عنوان منبع آموزشی"} /></Field>
                {isLibrary ? <Field label="کتابخانه" className="min-w-[210px] flex-1"><select value={form.libraryId} onChange={(event) => setForm((old) => ({ ...old, libraryId: event.target.value }))} className={inputClass}><option value="">انتخاب کنید</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field> : <><Field label="دسته‌بندی" className="w-[155px] shrink-0"><select value={form.category} onChange={(event) => setForm((old) => ({ ...old, category: event.target.value }))} className={inputClass}><option value="">انتخاب کنید</option>{form.category && !categories.some((item) => item.title === form.category) ? <option value={form.category}>{form.category}</option> : null}{categories.map((item) => <option key={item.id} value={item.title}>{item.title}</option>)}</select></Field><Field label="لینک" className="min-w-[185px] flex-[0.9]"><input dir="ltr" value={form.link} onChange={(event) => setForm((old) => ({ ...old, link: event.target.value }))} className={`${inputClass} text-left placeholder:text-left`} placeholder="https://example.com/training-resource" /></Field><Field label="برچسب‌ها" className="shrink-0"><button type="button" onClick={() => openTagPicker("form")} className="relative grid h-11 w-14 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="انتخاب برچسب"><span className="text-lg leading-none">•••</span>{form.tagIds.length > 0 && <CountBadge value={form.tagIds.length} />}</button></Field></>}
                <Field label="اسناد مرتبط" className="shrink-0"><button type="button" onClick={() => { setPickerIds(form.relatedLetterIds.map(String)); setPickerQuery(""); setPickerOpen(true); }} className="relative grid h-11 w-14 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="انتخاب از مدیریت اسناد"><img src="/images/icons/sayer.svg" alt="" className="h-5 w-5 dark:invert" />{form.relatedLetterIds.length > 0 && <CountBadge value={form.relatedLetterIds.length} />}</button></Field>
                <Field label="بارگذاری" className="shrink-0"><button type="button" onClick={() => setUploadOpen(true)} className="relative grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="بارگذاری فایل"><img src="/images/icons/Uplod.svg" alt="" className={`h-5 w-5 dark:invert ${uploading ? "animate-pulse" : ""}`} />{form.files.length > 0 && <CountBadge value={form.files.length} />}</button></Field>
                <button type="button" onClick={submit} disabled={saving || uploading} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[.04] disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title={editingId ? "ذخیره ویرایش" : "افزودن به جدول"} aria-label={editingId ? "ذخیره ویرایش" : "افزودن به جدول"}><img src={editingId ? "/images/icons/check.svg" : "/images/icons/afzodan.svg"} alt="" className="h-4 w-4 dark:invert" /></button>
              </div>
            </div>
          )}

          {error && <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
          {notice && <div className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</div>}

          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
            <div className="hidden max-h-[58vh] overflow-auto md:block" dir="ltr">
              <table dir="rtl" className="w-full min-w-[900px] table-fixed text-sm [&_td]:text-center [&_th]:whitespace-nowrap [&_th]:text-center">
                {isLibrary ? <colgroup><col style={{ width: 48 }} /><col style={{ width: 70 }} /><col style={{ width: 140 }} /><col /><col style={{ width: 240 }} /><col style={{ width: 190 }} /></colgroup> : <colgroup><col style={{ width: 48 }} /><col style={{ width: 70 }} /><col style={{ width: 130 }} /><col style={{ width: 220 }} /><col style={{ width: 150 }} /><col /><col style={{ width: 170 }} /></colgroup>}
                <thead><tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                  <th className="sticky top-0 z-20 bg-neutral-200 px-3 py-2 dark:bg-neutral-800"><input type="checkbox" className="h-4 w-4 accent-black dark:accent-neutral-200" checked={allSelected} onChange={toggleAll} aria-label="انتخاب همه" /></th>
                  {(isLibrary ? ['ردیف', 'تاریخ', 'عنوان', 'کتابخانه'] : ['ردیف', 'تاریخ', 'عنوان', 'دسته‌بندی', 'لینک']).map((heading) => <th key={heading} className="sticky top-0 z-10 bg-neutral-200 px-3 py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">{heading}</th>)}
                  <th className="sticky top-0 z-20 bg-neutral-200 px-3 py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]"><span>فایل</span><ResourceTableMenu entityLabel={isLibrary ? "مورد کتابخانه" : "منبع آموزشی"} menuRef={tableMenuRef} open={tableMenuOpen} setOpen={setTableMenuOpen} selectedCount={selectedIds.size} onEdit={editSelected} onDelete={deleteSelected} deleting={deleting} /></th>
                </tr></thead>
                <tbody className="text-[13px]">
                  {loading ? <EmptyRow colSpan={isLibrary ? 6 : 7} text="در حال دریافت..." /> : filteredItems.length === 0 ? <EmptyRow colSpan={isLibrary ? 6 : 7} text={items.length ? "موردی مطابق فیلتر پیدا نشد." : isLibrary ? "هنوز موردی در کتابخانه ثبت نشده است." : "هنوز منبع آموزشی ثبت نشده است."} /> : filteredItems.map((item, index) => (
                    <tr key={item.id} className="h-11 bg-black/[0.02] transition-colors hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10">
                      <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><input type="checkbox" className="h-4 w-4 accent-black dark:accent-neutral-200" checked={selectedIds.has(String(item.id))} onChange={() => toggleSelected(item.id)} aria-label={`انتخاب ${item.title}`} /></td>
                      <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFaDigits(index + 1)}</td>
                      <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{jalaliDate(item.createdAt)}</td>
                      <td className="border-b border-neutral-300 px-3 text-center dark:border-neutral-700"><span className="block truncate text-center font-medium" title={item.title}>{item.title}</span></td>
                      <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{isLibrary ? item.libraryTitle || "—" : item.category || "—"}</td>
                      {!isLibrary && <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><div className="flex min-w-0 items-center justify-center gap-1.5"><a href={normalizedUrl(item.link)} target="_blank" rel="noreferrer" dir="ltr" className="min-w-0 truncate text-sky-700 underline-offset-4 hover:underline dark:text-sky-400" title={item.link}>{shortenedLink(item.link)}</a><button type="button" onClick={() => copyLink(item)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg transition hover:bg-black/[.06] dark:hover:bg-white/10" title={copiedId === String(item.id) ? "کپی شد" : "کپی لینک"} aria-label="کپی لینک"><Copy className="h-3.5 w-3.5" /></button></div></td>}
                      <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><FileLinks files={item.files} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 md:hidden">
              {loading ? <div className="py-6 text-center text-sm text-neutral-500">در حال دریافت...</div> : filteredItems.length === 0 ? <div className="py-6 text-center text-sm text-neutral-500">{items.length ? "موردی مطابق فیلتر پیدا نشد." : isLibrary ? "هنوز موردی در کتابخانه ثبت نشده است." : "هنوز منبع آموزشی ثبت نشده است."}</div> : filteredItems.map((item, index) => <div key={item.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10"><div className="flex items-center justify-between gap-2"><b className="truncate">{toFaDigits(index + 1)}. {item.title}</b><span className="shrink-0 text-xs text-neutral-500">{jalaliDate(item.createdAt)}</span></div><div className="mt-3 flex items-center justify-between gap-3">{isLibrary ? <span className="min-w-0 truncate text-xs text-neutral-500">{item.libraryTitle || "—"}</span> : <a href={normalizedUrl(item.link)} target="_blank" rel="noreferrer" dir="ltr" className="min-w-0 truncate text-xs text-sky-700 dark:text-sky-400">{shortenedLink(item.link)}</a>}<FileLinks files={item.files} /></div></div>)}
            </div>
          </div>
        </div>
      </Card>

      {pickerOpen && <LetterPicker query={pickerQuery} setQuery={setPickerQuery} letters={filteredLetters} selectedIds={pickerIds} setSelectedIds={setPickerIds} onClose={() => setPickerOpen(false)} onConfirm={() => { setForm((old) => ({ ...old, relatedLetterIds: pickerIds })); setPickerOpen(false); }} />}
      {tagPickerOpen && <TagPicker tags={tags} query={tagPickerQuery} setQuery={setTagPickerQuery} selectedIds={tagPickerDraftIds} setSelectedIds={setTagPickerDraftIds} onClose={() => setTagPickerOpen(false)} onConfirm={applyTagPicker} />}
      {uploadOpen && <UploadModal title={isLibrary ? "بارگذاری فایل‌های کتابخانه" : "بارگذاری فایل‌های منبع آموزشی"} fileRef={fileRef} files={form.files} uploading={uploading} onUpload={uploadFiles} onRemove={(index) => setForm((old) => ({ ...old, files: old.files.filter((_, position) => position !== index) }))} onClose={() => setUploadOpen(false)} />}
    </div>
  );
}

function ResourceFilterBar({ query, setQuery, fromDate, setFromDate, toDate, setToDate, onExport, canExport, showTags, tags, selectedTagIds, onOpenTags }) {
  return (
    <div className="mb-4 rounded-2xl border border-neutral-200 bg-neutral-100/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full md:min-w-[280px] md:flex-1">
          <div className={labelClass}>جست و جو</div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder="جستجو در عنوان، دسته‌بندی، لینک و ..." />
        </div>
        <div className="w-[calc(50%-0.25rem)] md:w-auto md:min-w-[140px]">
          <div className={labelClass}>از</div>
          <JalaliPopupDatePicker value={fromDate} onChange={setFromDate} buttonClassName={`${inputClass} flex items-center justify-between gap-2`} />
        </div>
        <div className="w-[calc(50%-0.25rem)] md:w-auto md:min-w-[140px]">
          <div className={labelClass}>تا</div>
          <JalaliPopupDatePicker value={toDate} onChange={setToDate} buttonClassName={`${inputClass} flex items-center justify-between gap-2`} />
        </div>
        <button type="button" onClick={onExport} disabled={!canExport} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-50 hover:shadow-md disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="خروجی اکسل" aria-label="خروجی اکسل">
          <img src="/images/icons8-excel-50.png" alt="" className="h-5 w-5" />
        </button>
      </div>
      {showTags && <div className="mt-2">
        <div className={labelClass}>برچسب‌ها</div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onOpenTags} className="relative grid h-9 w-11 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="انتخاب برچسب برای فیلتر" aria-label="انتخاب برچسب برای فیلتر"><span className="text-lg leading-none">•••</span>{selectedTagIds.length > 0 && <CountBadge value={selectedTagIds.length} />}</button>
          {selectedTagIds.map((id) => {
            const tag = tags.find((item) => String(item.id) === String(id));
            return tag ? <span key={id} className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs dark:border-white/15 dark:bg-white/5">{tag.label}</span> : null;
          })}
        </div>
      </div>}
    </div>
  );
}

function Field({ label, className = "", children }) { return <div className={className}><div className={labelClass}>{label}</div>{children}</div>; }
function CountBadge({ value }) { return <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-neutral-900 px-1 text-[10px] text-white dark:bg-white dark:text-black">{toFaDigits(value)}</span>; }
function EmptyRow({ text, colSpan = 7 }) { return <tr><td colSpan={colSpan} className="py-8 text-black/60 dark:text-neutral-400">{text}</td></tr>; }
function FileLinks({ files }) { const list = Array.isArray(files) ? files : []; return <div className="flex items-center justify-center gap-1.5">{list.length ? list.map((file, index) => <a key={file.url || index} href={file.url} target="_blank" rel="noreferrer" download className="grid h-8 w-8 place-items-center rounded-lg border border-black/10 bg-white transition hover:-translate-y-0.5 hover:shadow-sm dark:border-white/15 dark:bg-white/5" title={file.name || `فایل ${index + 1}`}><FileTypeIcon file={file} /></a>) : <span>—</span>}</div>; }

function TagPicker({ tags, query, setQuery, selectedIds, setSelectedIds, onClose, onConfirm }) {
  const selected = new Set(selectedIds.map(String));
  const filteredTags = tags.filter((tag) => !query.trim() || String(tag.label || "").toLowerCase().includes(query.trim().toLowerCase()));
  const toggleTag = (id) => setSelectedIds((previous) => previous.map(String).includes(String(id)) ? previous.map(String).filter((value) => value !== String(id)) : [...previous.map(String), String(id)]);
  return createPortal(
    <div className="fixed inset-0 z-[9999]" dir="rtl">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">
        <div className="flex h-[min(78vh,720px)] w-[min(980px,calc(100vw-20px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white">
          <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10"><div className="text-sm font-bold">انتخاب برچسب</div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 bg-white transition hover:bg-black/[.04] dark:border-white/15 dark:bg-white/5" title="بستن"><img src="/images/icons/bastan.svg" alt="" className="h-5 w-5 dark:invert" /></button></div>
          <div className="p-4"><div className={labelClass}>جستجو</div><input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder="جستجو در برچسب‌ها..." autoFocus /></div>
          <div className="flex-1 overflow-auto px-4 pb-4">{filteredTags.length ? <div className="flex flex-wrap gap-2">{filteredTags.map((tag) => <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} className={`h-10 rounded-full border px-4 text-xs transition ${selected.has(String(tag.id)) ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/10 bg-white hover:bg-black/[.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"}`}>{tag.label}</button>)}</div> : <div className="py-10 text-center text-sm text-neutral-500">برچسبی پیدا نشد.</div>}</div>
          <div className="flex justify-end border-t border-black/10 p-4 dark:border-white/10"><button type="button" onClick={onConfirm} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black" title="تأیید"><img src="/images/icons/check.svg" alt="" className="h-5 w-5 invert dark:invert-0" /></button></div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ResourceTableMenu({ entityLabel, menuRef, open, setOpen, selectedCount, onEdit, onDelete, deleting }) {
  const [position, setPosition] = useState({ top: 0, left: 8 });
  const toggleMenu = (event) => {
    if (!open) {
      const rect = event.currentTarget.getBoundingClientRect();
      const width = 240;
      const estimatedHeight = 150;
      setPosition({
        left: Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8),
        top: rect.bottom + 8 + estimatedHeight > window.innerHeight ? Math.max(8, rect.top - estimatedHeight - 8) : rect.bottom + 8,
      });
    }
    setOpen((value) => !value);
  };
  const popover = open ? createPortal(
    <div data-resource-table-menu dir="rtl" style={{ top: position.top, left: position.left }} className="fixed z-[10000] w-60 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 text-right text-neutral-900 shadow-[0_18px_45px_rgba(0,0,0,.22)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="px-2.5 pb-2 pt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{selectedCount ? `${toFaDigits(selectedCount)} مورد انتخاب شده` : "ابتدا موارد موردنظر را انتخاب کنید"}</div>
      <button type="button" disabled={selectedCount !== 1} onClick={onEdit} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-amber-500/10">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 dark:bg-amber-500/15"><img src="/images/icons/pencil.svg" alt="" className="h-4 w-4 dark:invert" /></span>
        <span className="text-sm font-semibold">ویرایش {entityLabel}</span>
      </button>
      <button type="button" disabled={!selectedCount || deleting} onClick={onDelete} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45 dark:text-red-300 dark:hover:bg-red-500/10">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-100 dark:bg-red-500/15"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" /></span>
        <span className="text-sm font-semibold">{deleting ? "در حال حذف..." : "حذف موارد انتخاب‌شده"}</span>
      </button>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={menuRef} className="absolute left-2 top-1/2 z-50 -translate-y-1/2" dir="rtl">
      <button type="button" onClick={toggleMenu} className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/[.08] dark:hover:bg-white/10" title="مدیریت موارد" aria-label="مدیریت موارد" aria-expanded={open}>
        <img src="/images/icons/menu-table.svg" alt="" className="h-4 w-3 dark:invert" />
      </button>
      {popover}
    </div>
  );
}

function LetterPicker({ query, setQuery, letters, selectedIds, setSelectedIds, onClose, onConfirm }) {
  return createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} /><div dir="rtl" className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-xl dark:border-white/10 dark:bg-neutral-900 dark:text-white"><ModalHeader title={`انتخاب اسناد مرتبط${selectedIds.length ? ` (${toFaDigits(selectedIds.length)})` : ""}`} onClose={onClose} /><div className="px-4 pb-3"><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} h-10`} placeholder="جستجو با شماره، موضوع یا تاریخ نامه..." autoFocus /></div><div className="h-px bg-black/10 dark:bg-white/10" /><div className="max-h-[55vh] overflow-auto p-2">{letters.length ? letters.map((letter) => { const id = letterIdOf(letter); const checked = selectedIds.includes(id); return <button key={id} type="button" onClick={() => setSelectedIds((old) => old.includes(id) ? old.filter((value) => value !== id) : [...old, id])} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-right transition hover:bg-black/[.04] dark:hover:bg-white/10"><span className="min-w-0"><span className="font-semibold">{toFaDigits(letterNoOf(letter) || id)}</span>{letterDateOf(letter) && <span className="mr-2 text-xs text-neutral-500">{toFaDigits(letterDateOf(letter))}</span>}<span className="mt-1 block truncate text-xs text-neutral-500">{letterSubjectOf(letter) || "—"}</span></span><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${checked ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/15 dark:border-white/15"}`}>{checked ? "✓" : ""}</span></button>; }) : <div className="p-6 text-center text-sm text-neutral-500">موردی پیدا نشد.</div>}</div><div className="flex justify-end border-t border-black/10 p-4 dark:border-white/10"><button type="button" onClick={onConfirm} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black" title="تأیید"><img src="/images/icons/check.svg" alt="" className="h-5 w-5 invert dark:invert-0" /></button></div></div></div>, document.body);
}

function ModalHeader({ title, onClose }) { return <div className="flex items-center justify-between gap-3 p-4"><div className="truncate text-sm font-bold">{title}</div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black" aria-label="بستن"><img src="/images/icons/bastan.svg" alt="" className="h-4 w-4 invert dark:invert-0" /></button></div>; }

function UploadModal({ title, fileRef, files, uploading, onUpload, onRemove, onClose }) {
  const handleDrop = (event) => { event.preventDefault(); if (event.dataTransfer?.files?.length) onUpload(event.dataTransfer.files); };
  return createPortal(<div className="fixed inset-0 z-[9999]"><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} /><div className="absolute inset-0 flex items-center justify-center p-3"><div dir="rtl" className="relative flex max-h-[calc(100dvh-24px)] w-[min(720px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-xl dark:border-white/10 dark:bg-neutral-900 dark:text-white"><ModalHeader title={title} onClose={onClose} /><div className="h-px bg-black/10 dark:bg-white/10" /><div className="overflow-y-auto p-4"><div className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">فایل‌های انتخاب‌شده</div><div className="space-y-2">{files.length ? files.map((file, index) => <div key={file.url || index} className="flex items-center gap-3 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10"><FileTypeIcon file={file} /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{file.name}</span><a href={file.url} target="_blank" rel="noreferrer" className="text-xs hover:underline">باز کردن</a><button type="button" onClick={() => onRemove(index)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10" title="حذف"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" /></button></div>) : <div className="py-5 text-center text-sm text-neutral-500">فایلی انتخاب نشده است.</div>}</div><div onDrop={handleDrop} onDragOver={(event) => event.preventDefault()} className="mt-3 rounded-2xl border border-dashed border-black/15 bg-black/[.01] px-4 py-8 text-center dark:border-white/15 dark:bg-white/[.03]"><div className="text-sm font-semibold">فایل را اینجا رها کنید</div><div className="mt-1 text-xs text-neutral-500">فایل‌های مجاز: PDF، Word و Excel</div><button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"><img src="/images/icons/upload.svg" alt="" className="h-5 w-5 invert dark:invert-0" />{uploading ? "در حال بارگذاری..." : "انتخاب فایل"}</button><input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.csv,.rtf" className="hidden" onChange={(event) => { onUpload(event.target.files); event.target.value = ""; }} /></div><div className="mt-4 flex justify-end"><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black" title="تأیید"><img src="/images/icons/check.svg" alt="" className="h-5 w-5 invert dark:invert-0" /></button></div></div></div></div></div>, document.body);
}
