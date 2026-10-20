import { useEffect, useMemo, useState } from "react";
import BaseTablePager from "./ui/BaseTablePager.jsx";
import { useAuth } from "./AuthProvider.jsx";
import { api } from "../utils/api.js";

const endpoint = "/base/equipment-fields";
const inputClass = "h-10 w-full rounded-xl border border-black/15 bg-white px-3 text-right text-sm text-neutral-900 outline-none focus:border-neutral-500 dark:border-white/20 dark:bg-neutral-800 dark:text-white";
const checkboxClass = "h-4 w-4 accent-black dark:accent-neutral-200";
const toFa = (value) => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

export default function EquipmentCategoriesTable() {
  const { user, loading: authLoading } = useAuth();
  const headers = useMemo(() => user?.id != null ? { "x-user-id": String(user.id) } : {}, [user?.id]);
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
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
      .then((result) => { if (current) setCategories(Array.isArray(result.categories) ? result.categories : []); })
      .catch((err) => { if (current) setError(err.message || "دریافت دسته‌بندی‌ها انجام نشد."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [authLoading, headers]);

  const safePage = Math.min(page, Math.max(0, Math.ceil(categories.length / pageSize) - 1));
  const pageRows = categories.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const allPageSelected = pageRows.length > 0 && pageRows.every((row) => selected.has(String(row.id)));
  const selectedItem = selected.size === 1 ? categories.find((row) => selected.has(String(row.id))) : null;

  async function reload() {
    const result = await api(endpoint, { headers });
    setCategories(Array.isArray(result.categories) ? result.categories : []);
  }

  async function save(event) {
    event.preventDefault();
    const value = name.trim();
    if (!value) return setError("عنوان دسته‌بندی را وارد کنید.");
    setBusy(true); setError("");
    try {
      await api(endpoint, { method: editingId ? "PATCH" : "POST", headers, body: JSON.stringify({ kind: "category", id: editingId, name: value }) });
      await reload();
      setName(""); setEditingId(null); setSelected(new Set()); setPage(0);
    } catch (err) { setError(err.message === "duplicate_name" ? "این دسته‌بندی قبلاً ثبت شده است." : err.message || "ذخیره انجام نشد."); }
    finally { setBusy(false); }
  }

  function toggleSelected(id) {
    setSelected((current) => { const next = new Set(current); const key = String(id); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  async function deleteSelected() {
    if (!selected.size) return;
    setBusy(true); setMenuOpen(false); setError("");
    try {
      const ids = [...selected];
      const results = await Promise.allSettled(ids.map((id) => api(endpoint, { method: "DELETE", headers, body: JSON.stringify({ kind: "category", id }) })));
      await reload();
      const failed = ids.filter((_, index) => results[index].status === "rejected");
      setSelected(new Set(failed));
      if (editingId && !failed.includes(String(editingId))) { setEditingId(null); setName(""); }
      if (failed.length) setError(`حذف ${toFa(failed.length)} دسته‌بندی انجام نشد؛ ممکن است در مشخصات یا شناسنامه تجهیزات استفاده شده باشند.`);
    } catch (err) { setError(err.message || "حذف انجام نشد."); }
    finally { setBusy(false); }
  }

  return <section dir="rtl" className="rounded-2xl bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
    <h2 className="mb-4 text-sm font-bold">دسته‌بندی تجهیزات</h2>
    <form onSubmit={save} className="flex items-end gap-3">
      <label className="min-w-0 flex-1"><span className="mb-1 block text-xs text-neutral-600 dark:text-neutral-300">دسته‌بندی تجهیزات</span><input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="نام دسته‌بندی تجهیزات..." /></label>
      <button type="submit" disabled={busy} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white hover:bg-neutral-100 disabled:opacity-40 dark:border-white/20 dark:bg-neutral-800" title={editingId ? "ذخیره تغییرات" : "افزودن"} aria-label={editingId ? "ذخیره تغییرات" : "افزودن"}><img src={editingId ? "/images/icons/check.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" /></button>
      {editingId && <button type="button" onClick={() => { setName(""); setEditingId(null); setError(""); }} className="text-xs">انصراف</button>}
    </form>
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
      <table className="w-full min-w-[420px] table-fixed text-sm">
        <colgroup><col style={{ width: 48 }} /><col style={{ width: 80 }} /><col /><col style={{ width: 65 }} /></colgroup>
        <thead className="bg-neutral-200 text-black dark:bg-neutral-800 dark:text-white"><tr className="h-10">
          <th><input type="checkbox" className={checkboxClass} checked={allPageSelected} onChange={() => setSelected((current) => { const next = new Set(current); pageRows.forEach((row) => { const id = String(row.id); if (allPageSelected) next.delete(id); else next.add(id); }); return next; })} aria-label="انتخاب همه ردیف‌های صفحه" /></th>
          <th>ردیف</th><th className="px-2 text-center">عنوان</th>
          <th className="relative"><button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="عملیات موارد انتخاب‌شده" aria-expanded={menuOpen} className="px-2">⋮</button>{menuOpen && <div className="absolute left-1 top-full z-20 w-44 rounded-xl border border-black/10 bg-white p-1 text-right shadow-lg dark:border-white/10 dark:bg-neutral-800"><button type="button" disabled={!selectedItem || busy} onClick={() => { setName(selectedItem.name); setEditingId(selectedItem.id); setMenuOpen(false); setError(""); }} className="block w-full rounded-lg px-3 py-2 text-right hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-white/10">ویرایش</button><button type="button" disabled={!selected.size || busy} onClick={deleteSelected} className="block w-full rounded-lg px-3 py-2 text-right text-red-600 hover:bg-red-50 disabled:opacity-40">حذف</button></div>}</th>
        </tr></thead>
        <tbody>{loading || !pageRows.length ? <tr><td colSpan={4} className="py-8 text-center text-neutral-500">{loading ? "در حال دریافت..." : "هنوز دسته‌بندی ثبت نشده است."}</td></tr> : pageRows.map((row, index) => <tr key={row.id} className={`h-10 border-t border-black/10 dark:border-white/10 ${index % 2 ? "bg-neutral-50 dark:bg-white/[.03]" : ""}`}>
          <td className="text-center"><input type="checkbox" className={checkboxClass} checked={selected.has(String(row.id))} onChange={() => toggleSelected(row.id)} aria-label={`انتخاب ${row.name}`} /></td>
          <td className="text-center">{toFa(safePage * pageSize + index + 1)}</td><td className="px-2 text-center">{row.name}</td><td />
        </tr>)}</tbody>
      </table>
      <BaseTablePager total={categories.length} page={safePage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  </section>;
}
