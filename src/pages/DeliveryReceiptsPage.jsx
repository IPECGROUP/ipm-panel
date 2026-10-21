import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import BaseTablePager from "../components/ui/BaseTablePager.jsx";
import { JalaliDatePicker } from "../components/JalaliDatePicker.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { api } from "../utils/api.js";

const inputClass = "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-right text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-neutral-100 dark:placeholder:text-neutral-500";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300";
const toFa = (value) => String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
const emptyForm = () => ({ date: "", type: "", title: "", recipient: "" });

export default function DeliveryReceiptsPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
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

  return <div dir="rtl" className="mx-auto max-w-[1400px]">
    <Card className="overflow-hidden rounded-3xl border border-black/10 bg-white p-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-neutral-900">
      <div className="p-3 md:p-4">
        <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 shadow-sm dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04]"><img src="/images/icons/resid-hay-tahvil.svg" alt="" className="h-6 w-6 dark:invert" /></span>
            <span className="min-w-0"><span className="block truncate text-base font-bold tracking-tight md:text-lg">رسید های تحویل</span><span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">دبیرخانه</span></span>
          </div>
          <button type="button" onClick={() => { setForm(emptyForm()); setFormOpen((open) => !open); setError(""); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white transition hover:bg-black/5 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title={formOpen ? "بستن فرم" : "افزودن"} aria-label={formOpen ? "بستن فرم" : "افزودن"} aria-expanded={formOpen}><img src={formOpen ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" /></button>
        </div>

        {formOpen ? <form onSubmit={save} className="mb-4 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block"><span className={labelClass}>تاریخ *</span><span className="block [&_input]:h-11 [&_input]:border-black/10 [&_input]:text-sm dark:[&_input]:border-white/15 dark:[&_input]:bg-white/5 dark:[&_input]:text-neutral-100"><JalaliDatePicker value={form.date} onChange={(date) => setForm((old) => ({ ...old, date }))} /></span></label>
            <label className="block"><span className={labelClass}>نوع *</span><input required value={form.type} onChange={(event) => setForm((old) => ({ ...old, type: event.target.value }))} className={inputClass} maxLength={100} /></label>
            <label className="block"><span className={labelClass}>عنوان *</span><input required value={form.title} onChange={(event) => setForm((old) => ({ ...old, title: event.target.value }))} className={inputClass} maxLength={300} /></label>
            <label className="block"><span className={labelClass}>گیرنده *</span><input required value={form.recipient} onChange={(event) => setForm((old) => ({ ...old, recipient: event.target.value }))} className={inputClass} maxLength={200} /></label>
          </div>
          <div className="mt-4 flex justify-end border-t border-black/10 pt-4 dark:border-white/10"><button type="submit" disabled={saving} className="grid h-11 w-11 place-items-center rounded-xl bg-black text-white transition hover:bg-black/90 disabled:opacity-50" title={saving ? "در حال ثبت..." : "ثبت رسید تحویل"} aria-label="ثبت رسید تحویل"><img src="/images/icons/check.svg" alt="" className="h-5 w-5 brightness-0 invert" /></button></div>
        </form> : <div className="mb-4 rounded-2xl border border-neutral-200 bg-neutral-100/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
          <label className="block"><span className={labelClass}>جست و جو</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} className={inputClass} placeholder="جستجو در تاریخ، نوع، عنوان و گیرنده..." /></label>
          <div className="mt-3 min-h-10"><span className={labelClass}>برچسب ها</span></div>
        </div>}

        {error && <div role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
          <div className="overflow-auto" dir="ltr"><table dir="rtl" className="w-full min-w-[660px] table-fixed text-sm [&_td]:text-center [&_th]:text-center">
            <colgroup><col style={{ width: 80 }} /><col style={{ width: 160 }} /><col style={{ width: 160 }} /><col /><col style={{ width: 210 }} /></colgroup>
            <thead className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"><tr>{["ردیف", "تاریخ", "نوع", "عنوان", "گیرنده"].map((label) => <th key={label} className="px-3 py-3 text-[14px] font-semibold">{label}</th>)}</tr></thead>
            <tbody className="text-[13px]">{loading || !pageItems.length ? <tr><td colSpan={5} className="py-8 text-black/60 dark:text-neutral-400">{loading ? "در حال دریافت..." : items.length ? "موردی مطابق جست‌وجو پیدا نشد." : "هنوز رسید تحویلی ثبت نشده است."}</td></tr> : pageItems.map((item, index) => <tr key={item.id} className="h-10 bg-black/[0.02] transition-colors hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10">
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
  </div>;
}
