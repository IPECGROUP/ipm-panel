import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    let current = true;
    api(endpoint, { headers })
      .then((result) => { if (current) setCategories(Array.isArray(result.categories) ? result.categories : []); })
      .catch((err) => { if (current) setError(err.message || "دریافت دسته‌بندی‌ها انجام نشد."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [authLoading, headers]);

  const allSelected = categories.length > 0 && categories.every((row) => selected.has(String(row.id)));
  const selectedItem = selected.size === 1 ? categories.find((row) => selected.has(String(row.id))) : null;

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!menuButtonRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeOnEscape = (event) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  function toggleMenu() {
    if (menuOpen) return setMenuOpen(false);
    const rect = menuButtonRef.current?.getBoundingClientRect();
    if (rect) setMenuPosition({ left: Math.max(8, rect.left - 192), top: rect.bottom + 8 });
    setMenuOpen(true);
  }

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
      setName(""); setEditingId(null); setSelected(new Set());
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
      <label className="min-w-0 flex-1"><input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="نام دسته‌بندی تجهیزات..." aria-label="نام دسته‌بندی تجهیزات" /></label>
      <button type="submit" disabled={busy} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white hover:bg-neutral-100 disabled:opacity-40 dark:border-white/20 dark:bg-neutral-800" title={editingId ? "ذخیره تغییرات" : "افزودن"} aria-label={editingId ? "ذخیره تغییرات" : "افزودن"}><img src={editingId ? "/images/icons/check.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" /></button>
      {editingId && <button type="button" onClick={() => { setName(""); setEditingId(null); setError(""); }} className="text-xs">انصراف</button>}
    </form>
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="max-h-[55vh] overflow-auto" dir="ltr">
        <table dir="rtl" className="w-full min-w-[420px] table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:text-center">
          <colgroup><col style={{ width: 40 }} /><col style={{ width: 90 }} /><col /><col style={{ width: 60 }} /></colgroup>
          <thead><tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-white/10 dark:text-neutral-100">
            <th className="sticky top-0 z-40 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]"><input type="checkbox" className={checkboxClass} checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(categories.map((row) => String(row.id))))} aria-label="انتخاب همه" /></th>
            <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">ردیف</th>
            <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">عنوان</th>
            <th className="sticky top-0 z-40 bg-neutral-200 !py-2 dark:bg-neutral-800"><button ref={menuButtonRef} type="button" onClick={toggleMenu} aria-label="عملیات موارد انتخاب‌شده" aria-expanded={menuOpen} className="mx-auto grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/[0.08] dark:hover:bg-white/10"><img src="/images/icons/menu-table.svg" alt="" className="h-4 w-3 dark:invert" /></button></th>
          </tr></thead>
          <tbody className="text-[13px] text-black [&>tr]:h-9 [&>tr>td]:!py-0 dark:text-neutral-100">{loading || !categories.length ? <tr><td colSpan={4} className="py-8 text-center text-neutral-500">{loading ? "در حال دریافت..." : "هنوز دسته‌بندی ثبت نشده است."}</td></tr> : categories.map((row, index) => <tr key={row.id} className="bg-black/[0.02] transition-colors hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10">
            <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><input type="checkbox" className={checkboxClass} checked={selected.has(String(row.id))} onChange={() => toggleSelected(row.id)} aria-label={`انتخاب ${row.name}`} /></td>
            <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFa(index + 1)}</td>
            <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="block truncate">{row.name}</span></td>
            <td className="border-b border-neutral-300 px-3 dark:border-neutral-700" />
          </tr>)}</tbody>
        </table>
      </div>
    </div>
    {menuOpen && menuPosition && createPortal(<div ref={menuRef} dir="rtl" className="fixed z-[100] w-60 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 text-right text-neutral-900 shadow-[0_18px_45px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100" style={menuPosition}>
      <div className="px-2.5 pb-2 pt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{selected.size ? `${toFa(selected.size)} مورد انتخاب شده` : "ابتدا موارد موردنظر را انتخاب کنید"}</div>
      <button type="button" disabled={!selectedItem || busy} onClick={() => { setName(selectedItem.name); setEditingId(selectedItem.id); setMenuOpen(false); setError(""); }} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-amber-500/10"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 dark:bg-amber-500/15"><img src="/images/icons/pencil.svg" alt="" className="h-4 w-4 dark:invert" /></span><span className="text-sm font-semibold">ویرایش</span></button>
      <button type="button" disabled={!selected.size || busy} onClick={deleteSelected} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45 dark:text-red-300 dark:hover:bg-red-500/10"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-100 dark:bg-red-500/15"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" /></span><span className="text-sm font-semibold">حذف</span></button>
    </div>, document.body)}
  </section>;
}
