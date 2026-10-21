import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ExternalLink, FileText, Printer, UserRound } from "lucide-react";
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

export default function DeliveryReceiptsPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [previewItem, setPreviewItem] = useState(null);
  const [query, setQuery] = useState("");
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

  const filteredItems = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase("fa").split(/\s+/).filter(Boolean);
    return items.filter((item) => terms.every((term) => [item.date, item.type, item.title, item.recipient].join(" ").toLocaleLowerCase("fa").includes(term)));
  }, [items, query]);
  const safePage = Math.min(page, Math.max(0, Math.ceil(filteredItems.length / pageSize) - 1));
  const pageItems = filteredItems.slice(safePage * pageSize, (safePage + 1) * pageSize);

  async function save(event) {
    event.preventDefault();
    if (!form.date || !form.type.trim() || !form.title.trim() || !form.recipient.trim()) { setError("تاریخ، نوع، عنوان و گیرنده را وارد کنید."); return; }
    if (uploading) { setError("تا پایان بارگذاری فایل صبر کنید."); return; }
    setSaving(true);
    setError("");
    try {
      const result = await api("/documents/delivery-receipts", { method: "POST", headers: user?.id != null ? { "x-user-id": String(user.id) } : {}, body: JSON.stringify(form) });
      setItems((old) => [result.item, ...old]);
      setForm(emptyForm());
      setFormOpen(false);
      setPage(0);
    } catch (err) { setError(err.message || "ثبت رسید تحویل انجام نشد."); }
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
          <button type="button" onClick={() => { setForm(emptyForm()); setFormOpen((open) => !open); setUploadOpen(false); setError(""); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white transition hover:bg-black/5 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title={formOpen ? "بستن فرم" : "افزودن"} aria-label={formOpen ? "بستن فرم" : "افزودن"} aria-expanded={formOpen}><img src={formOpen ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" /></button>
        </div>

        {formOpen ? <form onSubmit={save} className="mb-4 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_minmax(220px,1.5fr)_minmax(180px,1fr)_auto]">
            <div className="min-w-0"><span className={labelClass}>تاریخ *</span><JalaliPopupDatePicker value={form.date} onChange={(date) => setForm((old) => ({ ...old, date }))} buttonClassName={`${inputClass} flex items-center justify-between gap-2`} /></div>
            <label className="block"><span className={labelClass}>نوع *</span><input required value={form.type} onChange={(event) => setForm((old) => ({ ...old, type: event.target.value }))} className={inputClass} maxLength={100} /></label>
            <label className="block"><span className={labelClass}>عنوان *</span><input required value={form.title} onChange={(event) => setForm((old) => ({ ...old, title: event.target.value }))} className={inputClass} maxLength={300} /></label>
            <label className="block"><span className={labelClass}>گیرنده *</span><input required value={form.recipient} onChange={(event) => setForm((old) => ({ ...old, recipient: event.target.value }))} className={inputClass} maxLength={200} /></label>
            <div className="block"><span className={labelClass}>بارگذاری</span><button type="button" onClick={() => setUploadOpen(true)} disabled={uploading} className="relative grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[.03] disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="بارگذاری پیوست" aria-label="بارگذاری پیوست"><img src="/images/icons/upload.svg" alt="" className="h-5 w-5 dark:invert" />{form.files.length > 0 && <span className="absolute -left-1 -top-1 rounded-full bg-black px-1 text-[10px] text-white">{toFa(form.files.length)}</span>}</button></div>
          </div>
          <div className="mt-4 flex justify-end border-t border-black/10 pt-4 dark:border-white/10"><button type="submit" disabled={saving || uploading} className="grid h-11 w-11 place-items-center rounded-xl bg-black text-white transition hover:bg-black/90 disabled:opacity-50" title={saving ? "در حال ثبت..." : "ثبت رسید تحویل"} aria-label="ثبت رسید تحویل"><img src="/images/icons/check.svg" alt="" className="h-5 w-5 brightness-0 invert" /></button></div>
        </form> : <div className="mb-4 rounded-2xl border border-neutral-200 bg-neutral-100/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
          <label className="block"><span className={labelClass}>جست و جو</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} className={inputClass} placeholder="جستجو در تاریخ، نوع، عنوان و گیرنده..." /></label>
          <div className="mt-3 min-h-10"><span className={labelClass}>برچسب ها</span></div>
        </div>}

        {error && <div role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
          <div className="overflow-auto" dir="ltr"><table dir="rtl" className="w-full min-w-[660px] table-fixed text-sm [&_td]:text-center [&_th]:text-center">
            <colgroup><col style={{ width: 80 }} /><col style={{ width: 160 }} /><col style={{ width: 160 }} /><col /><col style={{ width: 210 }} /></colgroup>
            <thead className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"><tr>{["ردیف", "تاریخ", "نوع", "عنوان", "گیرنده"].map((label) => <th key={label} className="px-3 py-3 text-[14px] font-semibold">{label}</th>)}</tr></thead>
            <tbody className="text-[13px]">{loading || !pageItems.length ? <tr><td colSpan={5} className="py-8 text-black/60 dark:text-neutral-400">{loading ? "در حال دریافت..." : items.length ? "موردی مطابق جست‌وجو پیدا نشد." : "هنوز رسید تحویلی ثبت نشده است."}</td></tr> : pageItems.map((item, index) => <tr key={item.id} onClick={() => setPreviewItem(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setPreviewItem(item); } }} tabIndex={0} role="button" aria-label={`پیش‌نمایش رسید ${item.title}`} className="h-10 cursor-pointer bg-black/[0.02] transition-colors hover:bg-black/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-black dark:bg-white/5 dark:hover:bg-white/10">
              <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFa(safePage * pageSize + index + 1)}</td>
              <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFa(String(item.date || "—").replaceAll("-", "/"))}</td>
              <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{item.type || "—"}</td>
              <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="block break-words">{item.title || "—"}</span></td>
              <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{item.recipient || "—"}</td>
            </tr>)}</tbody>
          </table></div>
          <BaseTablePager total={filteredItems.length} page={safePage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>
    </Card>
    {uploadOpen && <AttachmentImageEditor title="پیوست رسید تحویل" onClose={() => setUploadOpen(false)} onConfirm={uploadFile} />}
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
  const printWindow = window.open("", "_blank", "width=1050,height=800");
  if (!printWindow) return;
  printWindow.document.write('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><body style="font-family:Tahoma;padding:30px">در حال آماده‌سازی پیش‌نمایش چاپ...</body></html>');
  printWindow.document.close();
  let pdfjs;
  const attachmentRows = await Promise.all(files.map(async (file, index) => {
    const url = new URL(file.url, window.location.href).href;
    const label = `<div>پیوست ${toFa(index + 1)}: ${escapeHtml(file.name || "فایل")}</div>`;
    if (isImage(file)) return `<div class="attachment">${label}<img src="${escapeHtml(url)}" alt="${escapeHtml(file.name || "پیوست")}" /></div>`;
    if (isPdf(file)) {
      try {
        if (!pdfjs) { pdfjs = await import("pdfjs-dist"); pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl; }
        const pdf = await pdfjs.getDocument({ url, withCredentials: true }).promise;
        try {
          const pages = [];
          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1.6 });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
            pages.push(`<div class="attachment">${label}<small>صفحه ${toFa(pageNumber)} از ${toFa(pdf.numPages)}</small><img src="${canvas.toDataURL("image/png")}" alt="${escapeHtml(file.name || "پیوست")}" /></div>`);
            canvas.width = 0;
            canvas.height = 0;
            page.cleanup();
          }
          return pages.join("");
        } finally { await pdf.destroy(); }
      } catch (error) { console.warn("delivery_receipt_pdf_preview_failed", error); }
    }
    return `<div class="attachment">${label}<a href="${escapeHtml(url)}">باز کردن فایل</a></div>`;
  }));
  if (printWindow.closed) return;
  const attachmentMarkup = attachmentRows.length ? attachmentRows.join("") : "<p>پیوستی ثبت نشده است.</p>";
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8" /><title>رسید تحویل - ${escapeHtml(item.title)}</title><style>@page{size:A4;margin:16mm}body{font-family:Vazir,Tahoma,sans-serif;color:#171717;margin:0;background:#eee}.sheet{max-width:210mm;min-height:260mm;margin:20px auto;padding:18mm;background:#fff;box-sizing:border-box}header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #222;padding-bottom:12px}header img{width:80px}h1{font-size:20px}h2{font-size:15px;margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:8px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.field{border:1px solid #ddd;border-radius:8px;padding:12px}.field span{display:block;color:#666;font-size:11px}.field strong{display:block;margin-top:6px;font-size:13px;overflow-wrap:anywhere}.attachment{margin:12px 0;break-inside:avoid}.attachment img{display:block;max-width:100%;max-height:210mm;margin:10px auto;object-fit:contain}.actions{position:sticky;top:0;padding:10px;text-align:center;background:#eee}.actions button{border:0;border-radius:8px;background:#111;color:#fff;padding:10px 22px;cursor:pointer}@media print{body{background:#fff}.sheet{margin:0;padding:0;min-height:auto}.actions{display:none}}</style></head><body><div class="actions"><button onclick="window.print()">چاپ / ذخیره PDF</button></div><article class="sheet"><header><div><h1>رسید تحویل</h1><div>دبیرخانه</div></div><img src="${window.location.origin}/images/ips%20redesign%20logo.png" alt="IPEC" /></header><h2>جزئیات رسید تحویل</h2><div class="grid"><div class="field"><span>تاریخ</span><strong>${escapeHtml(toFa(String(item.date || "—").replaceAll("-", "/")))}</strong></div><div class="field"><span>نوع</span><strong>${escapeHtml(item.type || "—")}</strong></div><div class="field"><span>عنوان</span><strong>${escapeHtml(item.title || "—")}</strong></div><div class="field"><span>گیرنده</span><strong>${escapeHtml(item.recipient || "—")}</strong></div></div><h2>پیوست‌ها</h2>${attachmentMarkup}</article></body></html>`);
  printWindow.document.close();
}

function ReceiptMetadata({ label, value, Icon }) {
  return <div className="flex min-w-0 items-center gap-2 border-l border-b border-neutral-200 px-3 py-2 last:border-l-0 dark:border-white/10 md:border-b-0">
    <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-700 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200"><Icon className="h-4 w-4 stroke-[1.6]" /></span>
    <div className="min-w-0 flex-1"><div className="text-[11px] text-neutral-500 dark:text-neutral-400">{label}</div><div className="mt-0.5 min-w-0 break-words text-xs font-bold">{value}</div></div>
  </div>;
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
      <div dir="rtl" className="flex h-[calc(100dvh-env(safe-area-inset-top,0px))] w-full flex-col overflow-hidden rounded-t-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white sm:h-[min(90vh,860px)] sm:w-[min(1200px,calc(100vw-32px))] sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black/10 px-3 py-2.5 dark:border-white/10 sm:px-4 sm:py-3"><h2 className="text-sm font-bold">پیش‌نمایش رسید تحویل</h2><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-800 text-xl text-white shadow-sm transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900" title="بستن" aria-label="بستن">×</button></header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="mb-4 grid grid-cols-2 rounded-xl border border-neutral-200 bg-neutral-50/60 dark:border-white/10 dark:bg-white/5 md:grid-cols-4">
            <ReceiptMetadata label="تاریخ" value={toFa(String(item.date || "—").replaceAll("-", "/"))} Icon={CalendarDays} />
            <ReceiptMetadata label="نوع" value={item.type || "—"} Icon={FileText} />
            <ReceiptMetadata label="عنوان" value={item.title || "—"} Icon={FileText} />
            <ReceiptMetadata label="گیرنده" value={item.recipient || "—"} Icon={UserRound} />
          </div>
          <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="min-w-0 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10"><h3 className="border-b border-black/10 bg-neutral-50 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/5">جزئیات رسید تحویل</h3><div className="divide-y divide-black/10 dark:divide-white/10">{[["تاریخ", toFa(String(item.date || "—").replaceAll("-", "/"))], ["نوع", item.type], ["عنوان", item.title], ["گیرنده", item.recipient]].map(([label, value]) => <div key={label} className="grid grid-cols-[95px_minmax(0,1fr)] gap-3 px-4 py-3 text-sm"><span className="text-neutral-500 dark:text-neutral-400">{label}:</span><span className="min-w-0 break-words font-medium">{value || "—"}</span></div>)}</div></section>
            <aside className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-white/5"><h3 className="border-b border-neutral-200 px-3 py-3 text-sm font-bold dark:border-white/10">پیش‌نمایش پیوست‌ها</h3><div className="p-3"><div className="relative grid h-64 place-items-center overflow-hidden rounded-xl bg-neutral-100 dark:bg-white/5 lg:h-[min(44vh,430px)]">{!file ? <p className="px-4 text-center text-xs text-neutral-500">پیوستی برای نمایش وجود ندارد.</p> : isPdf(file) ? <iframe key={file.url} src={file.url} title={`پیش‌نمایش ${file.name}`} className="h-full w-full border-0" /> : isImage(file) ? <button type="button" onClick={() => setImageOpen(true)} className="grid h-full w-full place-items-center" title="نمایش تصویر در اندازه بزرگ"><img src={file.url} alt={file.name || "پیوست رسید"} className="max-h-full max-w-full object-contain" /></button> : <p className="px-4 text-center text-xs text-neutral-500">پیش‌نمایش این فایل در مرورگر در دسترس نیست.</p>}</div>
              {file && <div className="mt-3 flex min-w-0 items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-right text-xs font-semibold" dir="auto" title={file.name}>{file.name || "پیوست"}</p><p className="mt-1 text-right text-[11px] text-neutral-500 dark:text-neutral-400">{fileSize(file.size)}</p></div><a href={file.url} target="_blank" rel="noreferrer" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-neutral-200 transition hover:bg-neutral-100 dark:border-white/10 dark:hover:bg-white/5" title="باز کردن فایل" aria-label="باز کردن فایل"><ExternalLink className="h-4 w-4" /></a></div>}
              {files.length > 1 && <div className="mt-3 flex flex-wrap gap-1.5" aria-label="انتخاب پیوست">{files.map((entry, index) => <button key={`${entry.url}-${index}`} type="button" onClick={() => setSelectedIndex(index)} className={`rounded-lg border px-2 py-1 text-xs transition ${index === selectedIndex ? "border-neutral-800 bg-neutral-800 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-200 hover:bg-neutral-50 dark:border-white/10 dark:hover:bg-white/5"}`}>پیوست {toFa(index + 1)}</button>)}</div>}
            </div><div className="border-t border-neutral-200 p-3 dark:border-white/10"><button type="button" onClick={() => openReceiptPrintPreview(item)} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white text-sm font-semibold transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"><Printer className="h-4 w-4" />چاپ / ذخیره PDF</button></div></aside>
          </div>
        </div>
      </div>
    </div>
    {imageOpen && file && createPortal(<div className="fixed inset-0 z-[10001] flex flex-col bg-neutral-950 text-white" dir="rtl" role="dialog" aria-modal="true" aria-label={`نمایش ${file.name || "تصویر"}`}><div className="flex min-h-14 items-center gap-3 border-b border-white/15 px-4"><strong className="min-w-0 flex-1 truncate text-sm">{file.name || "پیوست تصویری"}</strong><a href={file.url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/20 px-3 py-1.5 text-sm">باز کردن فایل</a><button type="button" onClick={() => setImageOpen(false)} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm" aria-label="بستن تصویر">×</button></div><div className="min-h-0 flex-1 overflow-auto p-4"><img src={file.url} alt={file.name || "پیوست"} className="mx-auto max-h-full max-w-full object-contain" /></div></div>, document.body)}
  </div>, document.body);
}
