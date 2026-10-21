import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [englishName, setEnglishName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [selected, setSelected] = useState(() => new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);
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
    const result = await api(definitionsEndpoint, { headers });
    setCategories(Array.isArray(result.categories) ? result.categories : []);
    const nextItems = Array.isArray(result.specifications) ? result.specifications : [];
    setItems(nextItems);
    return nextItems;
  }

  function changeCategory(nextId) {
    setCategoryId(nextId); setCode(""); setName(""); setEnglishName(""); setEditingId(null);
    setSelected(new Set()); setExpanded(new Set()); setMenuOpen(false); setError("");
  }

  async function save(event) {
    event.preventDefault();
    const cleanCode = normalizeCode(code);
    const cleanName = name.trim();
    const cleanEnglishName = englishName.trim();
    if (!categoryId || !/^\d+(?:-\d+)*$/.test(cleanCode) || !cleanName) return setError("دسته‌بندی، کد عددی و نام مشخصات را وارد کنید.");
    setBusy(true); setError("");
    try {
      await api(specificationsEndpoint, { method: editingId ? "PATCH" : "POST", headers, body: JSON.stringify({ id: editingId, categoryId, code: cleanCode, name: cleanName, englishName: cleanEnglishName }) });
      const updated = await reload();
      const parts = cleanCode.split("-");
      const ancestorCodes = new Set(parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join("-")));
      const ancestorIds = updated.filter((item) => String(item.categoryId) === categoryId && ancestorCodes.has(item.code)).map((item) => String(item.id));
      setExpanded((current) => new Set([...current, ...ancestorIds]));
      setCode(""); setName(""); setEnglishName(""); setEditingId(null); setSelected(new Set());
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
    setCode(selectedItem.code); setName(selectedItem.name); setEnglishName(selectedItem.englishName || ""); setEditingId(selectedItem.id);
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
      if (editingId && !failed.includes(String(editingId))) { setEditingId(null); setCode(""); setName(""); setEnglishName(""); }
      if (failed.length) {
        const used = results.some((result) => result.status === "rejected" && result.reason?.message === "specification_in_use");
        setError(used ? "حذف مشخصاتی که در شناسنامه تجهیزات استفاده شده امکان‌پذیر نیست." : `حذف ${toFa(failed.length)} مورد انجام نشد؛ ابتدا زیرمجموعه‌های آن را حذف کنید.`);
      }
    } catch (err) { setError(err.message || "حذف انجام نشد."); }
    finally { setBusy(false); }
  }

  return <section dir="rtl" className="rounded-2xl bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
    <h2 className="mb-4 text-sm font-bold">مشخصات تجهیزات</h2>

      <form onSubmit={save} className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,3.5fr)_minmax(0,3.5fr)_auto] md:items-end">
        <label className="block min-w-0"><span className="mb-1 block text-sm">دسته‌بندی تجهیزات</span><select required value={categoryId} onChange={(event) => changeCategory(event.target.value)} className={inputClass}><option value="">انتخاب دسته‌بندی</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="block min-w-0"><span className="mb-1 block text-sm">کد مشخصات</span><input required dir="ltr" maxLength={120} value={code} onChange={(event) => setCode(event.target.value)} className={inputClass + " text-left font-sans tabular-nums"} placeholder="1-2" inputMode="numeric" /></label>
        <label className="block min-w-0"><span className="mb-1 block text-sm">مشخصات (فارسی)</span><input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="مشخصات (فارسی)" /></label>
        <label className="block min-w-0"><span className="mb-1 block text-sm">مشخصات (انگلیسی)</span><input required dir="ltr" maxLength={120} value={englishName} onChange={(event) => setEnglishName(event.target.value)} className={inputClass.replace("text-right", "text-left")} placeholder="English specification" /></label>
        <span className="flex items-center gap-2"><button type="submit" disabled={busy} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white hover:bg-neutral-100 disabled:opacity-40 dark:border-white/20 dark:bg-neutral-800" aria-label={editingId ? "ذخیره تغییرات" : "افزودن"}><img src={editingId ? "/images/icons/check.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" /></button>{editingId && <button type="button" onClick={() => { setEditingId(null); setCode(""); setName(""); setEnglishName(""); setError(""); }} className="px-2 text-xs">انصراف</button>}</span>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
        <div className="max-h-[55vh] overflow-auto" dir="ltr">
        <table dir="rtl" className="w-full min-w-[620px] table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:text-center">
          <colgroup><col style={{ width: 40 }} /><col style={{ width: 190 }} /><col /><col style={{ width: 60 }} /></colgroup>
          <thead><tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-white/10 dark:text-neutral-100">
            <th className="sticky top-0 z-40 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]"><input type="checkbox" className={checkboxClass} checked={allSelected} onChange={() => setSelected((current) => { const next = new Set(current); visibleRows.forEach((item) => { const id = String(item.id); if (allSelected) next.delete(id); else next.add(id); }); return next; })} aria-label="انتخاب همه ردیف‌های نمایان" /></th>
            <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]"><button type="button" disabled={!expandableIds.length} onClick={() => setExpanded(allExpanded ? new Set() : new Set(expandableIds))} className="ml-2 text-xl disabled:opacity-40" aria-label={allExpanded ? "بستن همه زیرمجموعه‌ها" : "باز کردن همه زیرمجموعه‌ها"}>{allExpanded ? "−" : "+"}</button>کد مشخصات</th>
            <th className="sticky top-0 z-30 bg-neutral-200 !py-2 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">مشخصات (فارسی - انگلیسی)</th>
            <th className="sticky top-0 z-40 bg-neutral-200 !py-2 dark:bg-neutral-800"><button ref={menuButtonRef} type="button" onClick={toggleMenu} aria-label="عملیات موارد انتخاب‌شده" aria-expanded={menuOpen} className="mx-auto grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/[0.08] dark:hover:bg-white/10"><img src="/images/icons/menu-table.svg" alt="" className="h-4 w-3 dark:invert" /></button></th>
          </tr></thead>
          <tbody className="text-[13px] text-black [&>tr]:h-9 [&>tr>td]:!py-0 dark:text-neutral-100">{loading || !categoryId || !visibleRows.length ? <tr><td colSpan={4} className="py-8 text-center text-neutral-500">{loading ? "در حال دریافت..." : !categoryId ? "دسته‌بندی تجهیزات را انتخاب کنید." : "هنوز مشخصاتی ثبت نشده است."}</td></tr> : visibleRows.map((item) => {
            const hasChildren = (children.get(String(item.id)) || []).length > 0;
            const isExpanded = expanded.has(String(item.id));
            const indent = { paddingRight: Math.min(item.depth, 5) * 28 };
            return <tr key={item.id} className="bg-black/[0.02] transition-colors hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10">
              <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><input type="checkbox" className={checkboxClass} checked={selected.has(String(item.id))} onChange={() => toggleSelected(item.id)} aria-label={`انتخاب ${item.name}`} /></td>
              <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><div className="flex items-center gap-2" style={indent}>{hasChildren ? <button type="button" onClick={() => setExpanded((current) => { const next = new Set(current); const id = String(item.id); next.has(id) ? next.delete(id) : next.add(id); return next; })} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-black/15 bg-white text-lg dark:border-white/20 dark:bg-neutral-800" aria-label={isExpanded ? "بستن زیرمجموعه" : "نمایش زیرمجموعه"}>{isExpanded ? "−" : "+"}</button> : <span className="h-7 w-7 shrink-0" />}<span dir="ltr" className="font-semibold">{item.code}</span></div></td>
              <td className="border-b border-neutral-300 px-3 !text-right dark:border-neutral-700"><div style={indent}>{item.name}{item.englishName && <> - <bdi dir="ltr">{item.englishName}</bdi></>}</div></td><td className="border-b border-neutral-300 px-3 dark:border-neutral-700" />
            </tr>;
          })}</tbody>
        </table>
        </div>
      </div>
      {menuOpen && menuPosition && createPortal(<div ref={menuRef} dir="rtl" className="fixed z-[100] w-60 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 text-right text-neutral-900 shadow-[0_18px_45px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100" style={menuPosition}>
        <div className="px-2.5 pb-2 pt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{selected.size ? `${toFa(selected.size)} مورد انتخاب شده` : "ابتدا موارد موردنظر را انتخاب کنید"}</div>
        <button type="button" disabled={!selectedItem || busy} onClick={editSelected} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-amber-500/10"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 dark:bg-amber-500/15"><img src="/images/icons/pencil.svg" alt="" className="h-4 w-4 dark:invert" /></span><span className="text-sm font-semibold">ویرایش</span></button>
        <button type="button" disabled={!selected.size || busy} onClick={deleteSelected} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45 dark:text-red-300 dark:hover:bg-red-500/10"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-100 dark:bg-red-500/15"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" /></span><span className="text-sm font-semibold">حذف</span></button>
      </div>, document.body)}
  </section>;
}
