import { useEffect, useMemo, useState } from "react";
import BaseTablePager from "./ui/BaseTablePager.jsx";
import { useAuth } from "./AuthProvider.jsx";
import { api } from "../utils/api.js";

const endpoint = "/base/equipment-fields";
const emptyForm = { category: "", title: "", field: "" };
const inputClass = "h-10 w-full rounded-xl border border-black/15 bg-white px-3 text-right text-sm text-neutral-900 outline-none focus:border-neutral-500 dark:border-white/20 dark:bg-neutral-800 dark:text-white";
const checkboxClass = "h-4 w-4 accent-black dark:accent-neutral-200";
const toFa = (value) => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

export default function EquipmentCategoryTree() {
  const { user, loading: authLoading } = useAuth();
  const headers = useMemo(() => user?.id != null ? { "x-user-id": String(user.id) } : {}, [user?.id]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (authLoading) return;
    let current = true;
    api(endpoint, { headers })
      .then((result) => { if (current) setRows(Array.isArray(result.rows) ? result.rows : []); })
      .catch((err) => { if (current) setError(err.message || "دریافت اطلاعات انجام نشد."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [authLoading, headers]);

  const safePage = Math.min(page, Math.max(0, Math.ceil(rows.length / pageSize) - 1));
  const pageRows = rows.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const allPageSelected = pageRows.length > 0 && pageRows.every((row) => selected.has(String(row.id)));
  const selectedRow = selected.size === 1 ? rows.find((row) => selected.has(String(row.id))) : null;

  async function reload() {
    const result = await api(endpoint, { headers });
    setRows(Array.isArray(result.rows) ? result.rows : []);
  }

  async function save(event) {
    event.preventDefault();
    const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
    if (Object.values(payload).some((value) => !value)) return setError("هر سه مورد دسته‌بندی، تیتر و فیلد را وارد کنید.");
    setBusy(true); setError("");
    try {
      await api(endpoint, { method: editingId ? "PATCH" : "POST", headers, body: JSON.stringify({ kind: "triple", id: editingId, ...payload }) });
      await reload();
      setForm(emptyForm); setEditingId(null); setSelected(new Set()); setPage(0);
    } catch (err) {
      setError(err.message === "duplicate_name" ? "این ترکیب دسته‌بندی، تیتر و فیلد قبلاً ثبت شده است." : err.message || "ذخیره انجام نشد.");
    } finally { setBusy(false); }
  }

  function toggleSelected(id) {
    setSelected((current) => { const next = new Set(current); const key = String(id); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  function editSelected() {
    if (!selectedRow) return;
    setForm({ category: selectedRow.category, title: selectedRow.title, field: selectedRow.field });
    setEditingId(selectedRow.id);
    setMenuOpen(false); setError("");
  }

  async function deleteSelected() {
    if (!selected.size) return;
    setBusy(true); setMenuOpen(false); setError("");
    try {
      const ids = [...selected];
      const results = await Promise.allSettled(ids.map((id) => api(endpoint, { method: "DELETE", headers, body: JSON.stringify({ kind: "field", id }) })));
      await reload();
      const failed = ids.filter((_, index) => results[index].status === "rejected");
      setSelected(new Set(failed));
      if (editingId && !failed.includes(String(editingId))) { setEditingId(null); setForm(emptyForm); }
      if (failed.length) setError(`حذف ${toFa(failed.length)} مورد انجام نشد؛ ممکن است در شناسنامه تجهیزات استفاده شده باشند.`);
    } catch (err) { setError(err.message || "حذف انجام نشد."); }
    finally { setBusy(false); }
  }

  return <section dir="rtl" className="rounded-2xl bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
    <div className="mb-5 flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[.03] dark:border-white/10 dark:bg-white/[.06]"><img src="/images/icons/sakhtar-shekast.svg" alt="" className="h-6 w-6 dark:invert" /></span>
      <div><h2 className="text-base font-bold">دسته‌بندی تجهیزات</h2><p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">تعریف دسته‌بندی، تیتر و فیلد</p></div>
    </div>

    <div className="rounded-2xl border border-black/10 p-3 dark:border-white/10 md:p-4">
      <form onSubmit={save} className="grid gap-3 md:grid-cols-3 md:items-end">
        <label className="block min-w-0"><span className="mb-1 block text-sm">دسته‌بندی</span><input required maxLength={120} value={form.category} onChange={(event) => setForm((old) => ({ ...old, category: event.target.value }))} className={inputClass} placeholder="نام دسته‌بندی" /></label>
        <label className="block min-w-0"><span className="mb-1 block text-sm">تیتر</span><input required maxLength={120} value={form.title} onChange={(event) => setForm((old) => ({ ...old, title: event.target.value }))} className={inputClass} placeholder="تیتر این دسته‌بندی" /></label>
        <label className="block min-w-0"><span className="mb-1 block text-sm">فیلد</span><span className="flex gap-2"><input required maxLength={120} value={form.field} onChange={(event) => setForm((old) => ({ ...old, field: event.target.value }))} className={inputClass} placeholder="فیلد این تیتر" /><button type="submit" disabled={busy} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white hover:bg-neutral-100 disabled:opacity-40 dark:border-white/20 dark:bg-neutral-800" aria-label={editingId ? "ذخیره تغییرات" : "افزودن"}><img src={editingId ? "/images/icons/check.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" /></button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); setError(""); }} className="px-2 text-xs">انصراف</button>}</span></label>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
        <table className="w-full min-w-[620px] table-fixed text-sm">
          <colgroup><col style={{ width: 48 }} /><col /><col /><col /><col style={{ width: 110 }} /></colgroup>
          <thead className="bg-neutral-200 text-black dark:bg-neutral-800 dark:text-white"><tr className="h-11">
            <th><input type="checkbox" className={checkboxClass} checked={allPageSelected} onChange={() => setSelected((current) => { const next = new Set(current); pageRows.forEach((row) => { const id = String(row.id); if (allPageSelected) next.delete(id); else next.add(id); }); return next; })} aria-label="انتخاب همه ردیف‌های صفحه" /></th>
            <th className="px-2 text-right">دسته‌بندی</th><th className="px-2 text-right">تیتر</th><th className="px-2 text-right">فیلد</th>
            <th className="relative px-2 text-center">عملیات<button type="button" onClick={() => setMenuOpen((open) => !open)} className="absolute left-1 top-1/2 -translate-y-1/2 px-2" aria-label="عملیات موارد انتخاب‌شده" aria-expanded={menuOpen}>⋮</button>{menuOpen && <div className="absolute left-1 top-full z-20 w-44 rounded-xl border border-black/10 bg-white p-1 text-right shadow-lg dark:border-white/10 dark:bg-neutral-800"><button type="button" disabled={!selectedRow || busy} onClick={editSelected} className="block w-full rounded-lg px-3 py-2 text-right hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-white/10">ویرایش</button><button type="button" disabled={!selected.size || busy} onClick={deleteSelected} className="block w-full rounded-lg px-3 py-2 text-right text-red-600 hover:bg-red-50 disabled:opacity-40">حذف</button></div>}</th>
          </tr></thead>
          <tbody>{loading || !pageRows.length ? <tr><td colSpan={5} className="py-8 text-center text-neutral-500">{loading ? "در حال دریافت..." : "هنوز موردی ثبت نشده است."}</td></tr> : pageRows.map((row, index) => <tr key={row.id} className={`h-11 border-t border-black/10 dark:border-white/10 ${index % 2 ? "bg-neutral-50 dark:bg-white/[.03]" : ""}`}>
            <td className="text-center"><input type="checkbox" className={checkboxClass} checked={selected.has(String(row.id))} onChange={() => toggleSelected(row.id)} aria-label={`انتخاب ${row.field}`} /></td>
            <td className="px-2 font-semibold">{row.category}</td><td className="px-2">{row.title}</td><td className="px-2">{row.field}</td><td className="text-center text-neutral-400">—</td>
          </tr>)}</tbody>
        </table>
      </div>
      <BaseTablePager total={rows.length} page={safePage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  </section>;
}
