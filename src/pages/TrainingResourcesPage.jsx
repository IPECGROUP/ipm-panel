import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, ExternalLink, File, FileSpreadsheet, FileText, Link2 } from "lucide-react";
import Card from "../components/ui/Card.jsx";
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
  const common = "h-5 w-5";
  if (kind === "excel") return <FileSpreadsheet className={`${common} text-emerald-600 dark:text-emerald-400`} />;
  if (kind === "word") return <FileText className={`${common} text-blue-600 dark:text-blue-400`} />;
  if (kind === "pdf") return <FileText className={`${common} text-red-600 dark:text-red-400`} />;
  return <File className={`${common} text-neutral-500`} />;
}

export default function TrainingResourcesPage() {
  const { user, loading: authLoading } = useAuth();
  const fileRef = useRef(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "", link: "", relatedLetterIds: [], files: [] });
  const [items, setItems] = useState([]);
  const [letters, setLetters] = useState([]);
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

  const requestHeaders = useMemo(() => user?.id != null ? { "x-user-id": String(user.id) } : {}, [user?.id]);

  const loadItems = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      const data = await api("/training-resources", { headers: requestHeaders });
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(err.message || "دریافت منابع آموزشی انجام نشد.");
    } finally {
      setLoading(false);
    }
  }, [authLoading, requestHeaders]);

  useEffect(() => { loadItems(); }, [loadItems]);

  useEffect(() => {
    if (authLoading) return;
    api("/letters/mine", { headers: requestHeaders })
      .then((data) => setLetters(Array.isArray(data?.items) ? data.items : []))
      .catch(() => setLetters([]));
  }, [authLoading, requestHeaders]);

  const filteredLetters = useMemo(() => {
    const query = pickerQuery.trim().toLowerCase();
    return letters.filter((letter) => !query || [letterNoOf(letter), letterSubjectOf(letter), letterDateOf(letter)].join(" ").toLowerCase().includes(query)).slice(0, 300);
  }, [letters, pickerQuery]);

  const closeForm = () => {
    setFormOpen(false);
    setForm({ title: "", category: "", link: "", relatedLetterIds: [], files: [] });
    setError("");
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
        const response = await fetch("/api/training-resources/upload", { method: "POST", credentials: "include", headers: requestHeaders, body });
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
    if (!form.link.trim()) return setError("لینک را وارد کنید.");
    try { new URL(normalizedUrl(form.link)); } catch { return setError("لینک واردشده معتبر نیست."); }
    setSaving(true);
    try {
      const data = await api("/training-resources", { method: "POST", headers: requestHeaders, body: JSON.stringify(form) });
      setItems((previous) => [data.item, ...previous]);
      setForm({ title: "", category: "", link: "", relatedLetterIds: [], files: [] });
      setNotice("منبع آموزشی با موفقیت به جدول افزوده شد.");
    } catch (err) {
      setError(err.message || "ثبت منبع آموزشی انجام نشد.");
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

  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <Card className="overflow-hidden rounded-3xl border border-black/10 bg-white p-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-neutral-900">
        <div className="p-3 md:p-4">
          <div className="mb-5 flex min-w-0 items-center justify-between gap-3 border-b border-black/[0.07] pb-4 dark:border-white/10">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 shadow-sm dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04]">
                <img src="/images/icons/manabeamozeshi.svg" alt="" className="h-6 w-6 dark:invert" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-bold tracking-tight md:text-lg">منابع آموزشی</span>
                <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت دانش و محتوای آموزشی</span>
              </span>
            </div>
            <button type="button" onClick={() => formOpen ? closeForm() : setFormOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white transition hover:bg-black/5 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title={formOpen ? "بستن فرم" : "افزودن"} aria-label={formOpen ? "بستن فرم" : "افزودن"}>
              <img src={formOpen ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" />
            </button>
          </div>

          {formOpen && (
            <div className="mb-4 overflow-x-auto rounded-2xl border border-black/10 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[.03]">
              <div className="flex min-w-[1040px] items-end gap-3">
                <Field label="عنوان" className="min-w-[190px] flex-[1.2]"><input value={form.title} onChange={(event) => setForm((old) => ({ ...old, title: event.target.value }))} className={inputClass} placeholder="عنوان منبع آموزشی" /></Field>
                <Field label="دسته‌بندی" className="w-[155px] shrink-0"><select value={form.category} onChange={(event) => setForm((old) => ({ ...old, category: event.target.value }))} className={inputClass}><option value="">انتخاب کنید</option></select></Field>
                <Field label="لینک" className="min-w-[260px] flex-[1.5]"><input dir="ltr" value={form.link} onChange={(event) => setForm((old) => ({ ...old, link: event.target.value }))} className={`${inputClass} text-left`} placeholder="https://example.com/training-resource" /></Field>
                <Field label="اسناد مرتبط" className="shrink-0"><button type="button" onClick={() => { setPickerIds(form.relatedLetterIds.map(String)); setPickerQuery(""); setPickerOpen(true); }} className="relative grid h-11 w-14 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="انتخاب از مدیریت اسناد"><img src="/images/icons/sayer.svg" alt="" className="h-5 w-5 dark:invert" />{form.relatedLetterIds.length > 0 && <CountBadge value={form.relatedLetterIds.length} />}</button></Field>
                <Field label="بارگذاری" className="shrink-0"><button type="button" onClick={() => setUploadOpen(true)} className="relative grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="بارگذاری فایل"><img src="/images/icons/Uplod.svg" alt="" className={`h-5 w-5 dark:invert ${uploading ? "animate-pulse" : ""}`} />{form.files.length > 0 && <CountBadge value={form.files.length} />}</button></Field>
                <button type="button" onClick={submit} disabled={saving || uploading} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-white text-2xl leading-none transition hover:bg-black/[.04] disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="افزودن به جدول" aria-label="افزودن به جدول">+</button>
              </div>
            </div>
          )}

          {error && <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
          {notice && <div className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</div>}

          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
            <div className="hidden max-h-[58vh] overflow-auto md:block" dir="ltr">
              <table dir="rtl" className="w-full min-w-[900px] table-fixed text-sm [&_td]:text-center [&_th]:whitespace-nowrap [&_th]:text-center">
                <colgroup><col style={{ width: 70 }} /><col style={{ width: 130 }} /><col style={{ width: 230 }} /><col style={{ width: 160 }} /><col /><col style={{ width: 170 }} /></colgroup>
                <thead><tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                  {['ردیف', 'تاریخ', 'عنوان', 'دسته‌بندی', 'لینک', 'فایل'].map((heading) => <th key={heading} className="sticky top-0 z-10 bg-neutral-200 px-3 py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">{heading}</th>)}
                </tr></thead>
                <tbody className="text-[13px]">
                  {loading ? <EmptyRow text="در حال دریافت..." /> : items.length === 0 ? <EmptyRow text="هنوز منبع آموزشی ثبت نشده است." /> : items.map((item, index) => (
                    <tr key={item.id} className="h-11 bg-black/[0.02] transition-colors hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10">
                      <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFaDigits(index + 1)}</td>
                      <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{jalaliDate(item.createdAt)}</td>
                      <td className="border-b border-neutral-300 px-3 !text-right dark:border-neutral-700"><span className="block truncate font-medium" title={item.title}>{item.title}</span></td>
                      <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{item.category || "—"}</td>
                      <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><div className="flex min-w-0 items-center justify-center gap-1.5"><a href={normalizedUrl(item.link)} target="_blank" rel="noreferrer" dir="ltr" className="min-w-0 truncate text-sky-700 underline-offset-4 hover:underline dark:text-sky-400" title={item.link}>{shortenedLink(item.link)}</a><button type="button" onClick={() => copyLink(item)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg transition hover:bg-black/[.06] dark:hover:bg-white/10" title={copiedId === String(item.id) ? "کپی شد" : "کپی لینک"} aria-label="کپی لینک"><Copy className="h-3.5 w-3.5" /></button><ExternalLink className="h-3.5 w-3.5 shrink-0 text-neutral-400" /></div></td>
                      <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><FileLinks files={item.files} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 md:hidden">
              {loading ? <div className="py-6 text-center text-sm text-neutral-500">در حال دریافت...</div> : items.length === 0 ? <div className="py-6 text-center text-sm text-neutral-500">هنوز منبع آموزشی ثبت نشده است.</div> : items.map((item, index) => <div key={item.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10"><div className="flex items-center justify-between gap-2"><b className="truncate">{toFaDigits(index + 1)}. {item.title}</b><span className="shrink-0 text-xs text-neutral-500">{jalaliDate(item.createdAt)}</span></div><div className="mt-3 flex items-center justify-between gap-3"><a href={normalizedUrl(item.link)} target="_blank" rel="noreferrer" dir="ltr" className="min-w-0 truncate text-xs text-sky-700 dark:text-sky-400">{shortenedLink(item.link)}</a><FileLinks files={item.files} /></div></div>)}
            </div>
          </div>
        </div>
      </Card>

      {pickerOpen && <LetterPicker query={pickerQuery} setQuery={setPickerQuery} letters={filteredLetters} selectedIds={pickerIds} setSelectedIds={setPickerIds} onClose={() => setPickerOpen(false)} onConfirm={() => { setForm((old) => ({ ...old, relatedLetterIds: pickerIds })); setPickerOpen(false); }} />}
      {uploadOpen && <UploadModal fileRef={fileRef} files={form.files} uploading={uploading} onUpload={uploadFiles} onRemove={(index) => setForm((old) => ({ ...old, files: old.files.filter((_, position) => position !== index) }))} onClose={() => setUploadOpen(false)} />}
    </div>
  );
}

function Field({ label, className = "", children }) { return <div className={className}><div className={labelClass}>{label}</div>{children}</div>; }
function CountBadge({ value }) { return <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-neutral-900 px-1 text-[10px] text-white dark:bg-white dark:text-black">{toFaDigits(value)}</span>; }
function EmptyRow({ text }) { return <tr><td colSpan={6} className="py-8 text-black/60 dark:text-neutral-400">{text}</td></tr>; }
function FileLinks({ files }) { const list = Array.isArray(files) ? files : []; return <div className="flex items-center justify-center gap-1.5">{list.length ? list.map((file, index) => <a key={file.url || index} href={file.url} target="_blank" rel="noreferrer" download className="grid h-8 w-8 place-items-center rounded-lg border border-black/10 bg-white transition hover:-translate-y-0.5 hover:shadow-sm dark:border-white/15 dark:bg-white/5" title={file.name || `فایل ${index + 1}`}><FileTypeIcon file={file} /></a>) : <span>—</span>}</div>; }

function LetterPicker({ query, setQuery, letters, selectedIds, setSelectedIds, onClose, onConfirm }) {
  return createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} /><div dir="rtl" className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-xl dark:border-white/10 dark:bg-neutral-900 dark:text-white"><ModalHeader title={`انتخاب اسناد مرتبط${selectedIds.length ? ` (${toFaDigits(selectedIds.length)})` : ""}`} onClose={onClose} /><div className="px-4 pb-3"><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} h-10`} placeholder="جستجو با شماره، موضوع یا تاریخ نامه..." autoFocus /></div><div className="h-px bg-black/10 dark:bg-white/10" /><div className="max-h-[55vh] overflow-auto p-2">{letters.length ? letters.map((letter) => { const id = letterIdOf(letter); const checked = selectedIds.includes(id); return <button key={id} type="button" onClick={() => setSelectedIds((old) => old.includes(id) ? old.filter((value) => value !== id) : [...old, id])} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-right transition hover:bg-black/[.04] dark:hover:bg-white/10"><span className="min-w-0"><span className="font-semibold">{toFaDigits(letterNoOf(letter) || id)}</span>{letterDateOf(letter) && <span className="mr-2 text-xs text-neutral-500">{toFaDigits(letterDateOf(letter))}</span>}<span className="mt-1 block truncate text-xs text-neutral-500">{letterSubjectOf(letter) || "—"}</span></span><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${checked ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/15 dark:border-white/15"}`}>{checked ? "✓" : ""}</span></button>; }) : <div className="p-6 text-center text-sm text-neutral-500">موردی پیدا نشد.</div>}</div><div className="flex justify-end border-t border-black/10 p-4 dark:border-white/10"><button type="button" onClick={onConfirm} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black" title="تأیید"><img src="/images/icons/check.svg" alt="" className="h-5 w-5 invert dark:invert-0" /></button></div></div></div>, document.body);
}

function ModalHeader({ title, onClose }) { return <div className="flex items-center justify-between gap-3 p-4"><div className="truncate text-sm font-bold">{title}</div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black" aria-label="بستن"><img src="/images/icons/bastan.svg" alt="" className="h-4 w-4 invert dark:invert-0" /></button></div>; }

function UploadModal({ fileRef, files, uploading, onUpload, onRemove, onClose }) {
  const handleDrop = (event) => { event.preventDefault(); if (event.dataTransfer?.files?.length) onUpload(event.dataTransfer.files); };
  return createPortal(<div className="fixed inset-0 z-[9999]"><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} /><div className="absolute inset-0 flex items-center justify-center p-3"><div dir="rtl" className="relative flex max-h-[calc(100dvh-24px)] w-[min(720px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-xl dark:border-white/10 dark:bg-neutral-900 dark:text-white"><ModalHeader title="بارگذاری فایل‌های منبع آموزشی" onClose={onClose} /><div className="h-px bg-black/10 dark:bg-white/10" /><div className="overflow-y-auto p-4"><div className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">فایل‌های انتخاب‌شده</div><div className="space-y-2">{files.length ? files.map((file, index) => <div key={file.url || index} className="flex items-center gap-3 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10"><FileTypeIcon file={file} /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{file.name}</span><a href={file.url} target="_blank" rel="noreferrer" className="text-xs hover:underline">باز کردن</a><button type="button" onClick={() => onRemove(index)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10" title="حذف"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" /></button></div>) : <div className="py-5 text-center text-sm text-neutral-500">فایلی انتخاب نشده است.</div>}</div><div onDrop={handleDrop} onDragOver={(event) => event.preventDefault()} className="mt-3 rounded-2xl border border-dashed border-black/15 bg-black/[.01] px-4 py-8 text-center dark:border-white/15 dark:bg-white/[.03]"><div className="text-sm font-semibold">فایل را اینجا رها کنید</div><div className="mt-1 text-xs text-neutral-500">فایل‌های مجاز: PDF، Word و Excel</div><button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"><img src="/images/icons/upload.svg" alt="" className="h-5 w-5 invert dark:invert-0" />{uploading ? "در حال بارگذاری..." : "انتخاب فایل"}</button><input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.csv,.rtf" className="hidden" onChange={(event) => { onUpload(event.target.files); event.target.value = ""; }} /></div><div className="mt-4 flex justify-end"><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black" title="تأیید"><img src="/images/icons/check.svg" alt="" className="h-5 w-5 invert dark:invert-0" /></button></div></div></div></div></div>, document.body);
}
