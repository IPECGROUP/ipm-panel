import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider.jsx";
import { api } from "../utils/api.js";

const definitionsEndpoint = "/base/equipment-fields";
const specificationsEndpoint = "/base/equipment-specifications";
const inputClass = "h-10 w-full rounded-xl border border-black/15 bg-white px-3 text-right text-sm text-neutral-900 outline-none focus:border-neutral-500 dark:border-white/20 dark:bg-neutral-800 dark:text-white";
const checkboxClass = "h-4 w-4 accent-black dark:accent-neutral-200";
const normalizeCode = (value) => String(value)
  .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
  .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit))
  .trim().replace(/\s*-\s*/g, "-");
const compareCodes = (a, b) => String(a.code).localeCompare(String(b.code), "fa", { numeric: true });
const toFa = (value) => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

export default function EquipmentCategoryTree() {
  const { user, loading: authLoading } = useAuth();
  const headers = useMemo(() => user?.id != null ? { "x-user-id": String(user.id) } : {}, [user?.id]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [selected, setSelected] = useState(() => new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    let current = true;
    api(definitionsEndpoint, { headers })
      .then((result) => { if (current) { setCategories(Array.isArray(result.categories) ? result.categories : []); setItems(Array.isArray(result.specifications) ? result.specifications : []); } })
      .catch((err) => { if (current) setError(err.message || "دریافت مشخصات تجهیزات انجام نشد."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [authLoading, headers]);

  const categoryItems = useMemo(() => items.filter((item) => String(item.categoryId) === categoryId), [items, categoryId]);
  const children = useMemo(() => {
    const map = new Map();
    categoryItems.forEach((item) => {
      const parentKey = item.parentId == null ? "root" : String(item.parentId);
      const list = map.get(parentKey) || [];
      list.push(item);
      map.set(parentKey, list);
    });
    map.forEach((list) => list.sort(compareCodes));
    return map;
  }, [categoryItems]);
  const visibleRows = useMemo(() => {
    const result = [];
    const visit = (parentKey, depth) => (children.get(parentKey) || []).forEach((item) => {
      result.push({ ...item, depth });
      if (expanded.has(String(item.id))) visit(String(item.id), depth + 1);
    });
    visit("root", 0);
    return result;
  }, [children, expanded]);
  const expandableIds = categoryItems.filter((item) => (children.get(String(item.id)) || []).length).map((item) => String(item.id));
  const allExpanded = expandableIds.length > 0 && expandableIds.every((id) => expanded.has(id));
  const allSelected = visibleRows.length > 0 && visibleRows.every((item) => selected.has(String(item.id)));
  const selectedItem = selected.size === 1 ? categoryItems.find((item) => selected.has(String(item.id))) : null;

  async function reload() {
    const result = await api(definitionsEndpoint, { headers });
    setCategories(Array.isArray(result.categories) ? result.categories : []);
    const nextItems = Array.isArray(result.specifications) ? result.specifications : [];
    setItems(nextItems);
    return nextItems;
  }

  function changeCategory(nextId) {
    setCategoryId(nextId); setCode(""); setName(""); setEditingId(null);
    setSelected(new Set()); setExpanded(new Set()); setMenuOpen(false); setError("");
  }

  async function save(event) {
    event.preventDefault();
    const cleanCode = normalizeCode(code);
    const cleanName = name.trim();
    if (!categoryId || !/^\d+(?:-\d+)*$/.test(cleanCode) || !cleanName) return setError("دسته‌بندی، کد عددی و نام مشخصات را وارد کنید.");
    setBusy(true); setError("");
    try {
      await api(specificationsEndpoint, { method: editingId ? "PATCH" : "POST", headers, body: JSON.stringify({ id: editingId, categoryId, code: cleanCode, name: cleanName }) });
      const updated = await reload();
      const parts = cleanCode.split("-");
      const ancestorCodes = new Set(parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join("-")));
      const ancestorIds = updated.filter((item) => String(item.categoryId) === categoryId && ancestorCodes.has(item.code)).map((item) => String(item.id));
      setExpanded((current) => new Set([...current, ...ancestorIds]));
      setCode(""); setName(""); setEditingId(null); setSelected(new Set());
    } catch (err) {
      const messages = {
        duplicate_code: "این کد در دسته‌بندی انتخاب‌شده قبلاً ثبت شده است.",
        parent_not_found: "ابتدا کد والد را در همین دسته‌بندی ثبت کنید.",
        has_children: "کد یا دسته‌بندی ردیفی که زیرمجموعه دارد قابل تغییر نیست.",
        specification_in_use: "دسته‌بندی مشخصاتی که در شناسنامه تجهیزات استفاده شده قابل تغییر نیست.",
      };
      setError(messages[err.message] || err.message || "ذخیره انجام نشد.");
    } finally { setBusy(false); }
  }

  function toggleSelected(id) {
    setSelected((current) => { const next = new Set(current); const key = String(id); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  function editSelected() {
    if (!selectedItem) return;
    setCode(selectedItem.code); setName(selectedItem.name); setEditingId(selectedItem.id);
    setMenuOpen(false); setError("");
  }

  async function deleteSelected() {
    if (!selected.size) return;
    setBusy(true); setMenuOpen(false); setError("");
    try {
      const ids = categoryItems.filter((item) => selected.has(String(item.id)))
        .sort((a, b) => b.code.split("-").length - a.code.split("-").length)
        .map((item) => String(item.id));
      const results = [];
      for (const id of ids) {
        try {
          await api(specificationsEndpoint, { method: "DELETE", headers, body: JSON.stringify({ id }) });
          results.push({ status: "fulfilled" });
        } catch (reason) { results.push({ status: "rejected", reason }); }
      }
      await reload();
      const failed = ids.filter((_, index) => results[index].status === "rejected");
      setSelected(new Set(failed));
      if (editingId && !failed.includes(String(editingId))) { setEditingId(null); setCode(""); setName(""); }
      if (failed.length) {
        const used = results.some((result) => result.status === "rejected" && result.reason?.message === "specification_in_use");
        setError(used ? "حذف مشخصاتی که در شناسنامه تجهیزات استفاده شده امکان‌پذیر نیست." : `حذف ${toFa(failed.length)} مورد انجام نشد؛ ابتدا زیرمجموعه‌های آن را حذف کنید.`);
      }
    } catch (err) { setError(err.message || "حذف انجام نشد."); }
    finally { setBusy(false); }
  }

  return <section dir="rtl" className="rounded-2xl bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
    <div className="mb-5 flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[.03] dark:border-white/10 dark:bg-white/[.06]"><img src="/images/icons/sakhtar-shekast.svg" alt="" className="h-6 w-6 dark:invert" /></span>
      <div><h2 className="text-base font-bold">مشخصات تجهیزات</h2><p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">ساختار کدهای مشخصات</p></div>
    </div>

    <div className="rounded-2xl border border-black/10 p-3 dark:border-white/10 md:p-4">
      <form onSubmit={save} className="grid gap-3 md:grid-cols-[minmax(180px,1.15fr)_minmax(130px,.65fr)_minmax(220px,1.4fr)] md:items-end">
        <label className="block min-w-0"><span className="mb-1 block text-sm">دسته‌بندی تجهیزات</span><select required value={categoryId} onChange={(event) => changeCategory(event.target.value)} className={inputClass}><option value="">انتخاب دسته‌بندی</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="block min-w-0"><span className="mb-1 block text-sm">کد مشخصات</span><input required dir="ltr" maxLength={120} value={code} onChange={(event) => setCode(event.target.value)} className={inputClass + " text-left font-sans tabular-nums"} placeholder="1-2" inputMode="numeric" /></label>
        <label className="block min-w-0"><span className="mb-1 block text-sm">نام مشخصات</span><span className="flex gap-2"><input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="نام مشخصات" /><button type="submit" disabled={busy} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white hover:bg-neutral-100 disabled:opacity-40 dark:border-white/20 dark:bg-neutral-800" aria-label={editingId ? "ذخیره تغییرات" : "افزودن"}><img src={editingId ? "/images/icons/check.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" /></button>{editingId && <button type="button" onClick={() => { setEditingId(null); setCode(""); setName(""); setError(""); }} className="px-2 text-xs">انصراف</button>}</span></label>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
        <table className="w-full min-w-[620px] table-fixed text-sm">
          <colgroup><col style={{ width: 48 }} /><col style={{ width: 190 }} /><col /><col style={{ width: 120 }} /></colgroup>
          <thead className="bg-neutral-200 text-black dark:bg-neutral-800 dark:text-white"><tr className="h-11">
            <th><input type="checkbox" className={checkboxClass} checked={allSelected} onChange={() => setSelected((current) => { const next = new Set(current); visibleRows.forEach((item) => { const id = String(item.id); if (allSelected) next.delete(id); else next.add(id); }); return next; })} aria-label="انتخاب همه ردیف‌های نمایان" /></th>
            <th className="px-2 text-right"><button type="button" disabled={!expandableIds.length} onClick={() => setExpanded(allExpanded ? new Set() : new Set(expandableIds))} className="ml-2 text-xl disabled:opacity-40" aria-label={allExpanded ? "بستن همه زیرمجموعه‌ها" : "باز کردن همه زیرمجموعه‌ها"}>{allExpanded ? "−" : "+"}</button>کد مشخصات</th>
            <th className="px-2 text-right">نام مشخصات</th>
            <th className="relative px-2 text-center">عملیات<button type="button" onClick={() => setMenuOpen((open) => !open)} className="absolute left-1 top-1/2 -translate-y-1/2 px-2" aria-label="عملیات موارد انتخاب‌شده" aria-expanded={menuOpen}>⋮</button>{menuOpen && <div className="absolute left-1 top-full z-20 w-44 rounded-xl border border-black/10 bg-white p-1 text-right shadow-lg dark:border-white/10 dark:bg-neutral-800"><button type="button" disabled={!selectedItem || busy} onClick={editSelected} className="block w-full rounded-lg px-3 py-2 text-right hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-white/10">ویرایش</button><button type="button" disabled={!selected.size || busy} onClick={deleteSelected} className="block w-full rounded-lg px-3 py-2 text-right text-red-600 hover:bg-red-50 disabled:opacity-40">حذف</button></div>}</th>
          </tr></thead>
          <tbody>{loading || !categoryId || !visibleRows.length ? <tr><td colSpan={4} className="py-8 text-center text-neutral-500">{loading ? "در حال دریافت..." : !categoryId ? "دسته‌بندی تجهیزات را انتخاب کنید." : "هنوز مشخصاتی ثبت نشده است."}</td></tr> : visibleRows.map((item, index) => {
            const hasChildren = (children.get(String(item.id)) || []).length > 0;
            const isExpanded = expanded.has(String(item.id));
            const indent = { paddingRight: Math.min(item.depth, 5) * 28 };
            return <tr key={item.id} className={`h-11 border-t border-black/10 dark:border-white/10 ${index % 2 ? "bg-neutral-50 dark:bg-white/[.03]" : ""}`}>
              <td className="text-center"><input type="checkbox" className={checkboxClass} checked={selected.has(String(item.id))} onChange={() => toggleSelected(item.id)} aria-label={`انتخاب ${item.name}`} /></td>
              <td className="px-2"><div className="flex items-center gap-2" style={indent}>{hasChildren ? <button type="button" onClick={() => setExpanded((current) => { const next = new Set(current); const id = String(item.id); next.has(id) ? next.delete(id) : next.add(id); return next; })} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-black/15 bg-white text-lg dark:border-white/20 dark:bg-neutral-800" aria-label={isExpanded ? "بستن زیرمجموعه" : "نمایش زیرمجموعه"}>{isExpanded ? "−" : "+"}</button> : <span className="h-7 w-7 shrink-0" />}<span dir="ltr" className="font-semibold">{item.code}</span></div></td>
              <td className="px-2"><div style={indent}>{item.name}</div></td><td className="text-center text-neutral-400">—</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </div>
  </section>;
}
