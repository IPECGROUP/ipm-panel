import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BaseTablePager from "../components/ui/BaseTablePager.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";
import CostBreakdownDemo from "../components/CostBreakdownDemo.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { api } from "../utils/api.js";

const endpoint = "/base/equipment-fields";
const options = [
  { id: "category", label: "دسته‌بندی" },
  { id: "title", label: "تیتر" },
  { id: "field", label: "فیلد" },
];
const inputClass = "h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-right text-sm outline-none transition focus:border-neutral-400 dark:border-white/15 dark:bg-white/5";
const checkboxClass = "h-4 w-4 rounded border-neutral-400 accent-black dark:accent-neutral-200";
const initialForm = { id: null, name: "", categoryId: "", titleId: "" };
const toFa = (value) => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

export default function EquipmentManagementSection() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState({ categories: [], titles: [], fields: [] });
  const [active, setActive] = useState("category");
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const headers = useMemo(() => user?.id != null ? { "x-user-id": String(user.id) } : {}, [user?.id]);

  async function load() {
    const result = await api(endpoint, { headers });
    setData({ categories: result.categories || [], titles: result.titles || [], fields: result.fields || [] });
  }

  useEffect(() => {
    if (authLoading) return;
    let activeRequest = true;
    api(endpoint, { headers }).then((result) => {
      if (activeRequest) setData({ categories: result.categories || [], titles: result.titles || [], fields: result.fields || [] });
    }).catch((err) => { if (activeRequest) setError(err.message || "دریافت اطلاعات انجام نشد."); })
      .finally(() => { if (activeRequest) setLoading(false); });
    return () => { activeRequest = false; };
  }, [authLoading, headers]);

  const categoryById = useMemo(() => new Map(data.categories.map((item) => [String(item.id), item.name])), [data.categories]);
  const titleById = useMemo(() => new Map(data.titles.map((item) => [String(item.id), item.name])), [data.titles]);
  const rows = active === "category" ? data.categories : active === "title" ? data.titles : data.fields;
  const safePage = Math.min(page, Math.max(0, Math.ceil(rows.length / pageSize) - 1));
  const pageRows = rows.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const currentLabel = options.find((option) => option.id === active)?.label || "";
  const allPageSelected = pageRows.length > 0 && pageRows.every((item) => selectedIds.has(String(item.id)));
  const selectedItem = selectedIds.size === 1 ? rows.find((item) => selectedIds.has(String(item.id))) : null;

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => { if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setMenuOpen(false); };
    const escape = (event) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, [menuOpen]);

  function toggleSelected(id) {
    setSelectedIds((current) => { const next = new Set(current); const key = String(id); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  function togglePageSelected() {
    setSelectedIds((current) => { const next = new Set(current); pageRows.forEach((item) => { const key = String(item.id); if (allPageSelected) next.delete(key); else next.add(key); }); return next; });
  }

  function openMenu() {
    if (menuOpen) return setMenuOpen(false);
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 8, left: Math.max(8, Math.min(rect.left, window.innerWidth - 248)) });
    setMenuOpen(true);
  }

  function changeTab(kind) {
    setActive(kind);
    setForm(initialForm);
    setError("");
    setPage(0);
    setSelectedIds(new Set());
    setMenuOpen(false);
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.name.trim()) return setError("نام را وارد کنید.");
    if (active === "field" && (!form.categoryId || !form.titleId)) return setError("دسته‌بندی و تیتر را انتخاب کنید.");
    setBusy(true);
    setError("");
    try {
      await api(endpoint, { method: form.id ? "PATCH" : "POST", headers, body: JSON.stringify({ ...form, kind: active, name: form.name.trim() }) });
      await load();
      setForm(initialForm);
      setPage(0);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err.message === "duplicate_name" ? "این نام در همین بخش قبلاً ثبت شده است." : err.message || "ذخیره انجام نشد.");
    } finally { setBusy(false); }
  }

  function edit(item) {
    setError("");
    setForm({ id: item.id, name: item.name, categoryId: String(item.categoryId || ""), titleId: String(item.titleId || "") });
  }

  async function removeSelected() {
    const ids = [...selectedIds];
    if (!ids.length || !window.confirm(`آیا از حذف ${toFa(ids.length)} مورد انتخاب‌شده مطمئن هستید؟`)) return;
    setBusy(true);
    setError("");
    try {
      const results = await Promise.allSettled(ids.map((id) => api(endpoint, { method: "DELETE", headers, body: JSON.stringify({ kind: active, id }) })));
      await load();
      const failed = results.flatMap((result, index) => result.status === "rejected" ? [ids[index]] : []);
      setSelectedIds(new Set(failed));
      if (form.id && ids.includes(String(form.id)) && !failed.includes(String(form.id))) setForm(initialForm);
      if (failed.length) setError(`حذف ${toFa(failed.length)} مورد انجام نشد؛ ممکن است در فیلدها یا شناسنامه تجهیزات استفاده شده باشند.`);
    } catch (err) { setError(err.message || "حذف انجام نشد."); }
    finally { setBusy(false); }
  }

  return <section dir="rtl">
    <div className="mb-5 flex w-fit max-w-full overflow-x-auto rounded-2xl border border-black/10 bg-neutral-100 p-1 dark:border-white/10 dark:bg-white/5" role="tablist" aria-label="گزینه‌های مدیریت تجهیزات">
      {options.map((option) => <button key={option.id} type="button" role="tab" aria-selected={active === option.id} onClick={() => changeTab(option.id)} className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold transition ${active === option.id ? "bg-white text-black shadow-sm dark:bg-white dark:text-black" : "text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white"}`}>{option.label}</button>)}
    </div>

    <div role="tabpanel" className="-mx-4 p-4">
      <h2 className="mb-4 text-sm font-bold">{currentLabel}</h2>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        {active === "field" && <>
          <label className="min-w-[190px] flex-1"><span className="mb-1 block text-xs text-neutral-600 dark:text-neutral-300">دسته‌بندی</span><select className={inputClass} value={form.categoryId} onChange={(event) => setForm((old) => ({ ...old, categoryId: event.target.value }))} required><option value="">انتخاب دسته‌بندی...</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="min-w-[190px] flex-1"><span className="mb-1 block text-xs text-neutral-600 dark:text-neutral-300">تیتر</span><select className={inputClass} value={form.titleId} onChange={(event) => setForm((old) => ({ ...old, titleId: event.target.value }))} required><option value="">انتخاب تیتر...</option>{data.titles.map((title) => <option key={title.id} value={title.id}>{title.name}</option>)}</select></label>
        </>}
        <label className="min-w-[220px] flex-[1.4]"><span className="mb-1 block text-xs text-neutral-600 dark:text-neutral-300">{currentLabel}</span><input className={inputClass} maxLength={120} value={form.name} onChange={(event) => setForm((old) => ({ ...old, name: event.target.value }))} placeholder={`نام ${currentLabel}...`} required /></label>
        <button type="submit" disabled={busy} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white transition hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" aria-label={form.id ? `ذخیره ${currentLabel}` : `افزودن ${currentLabel}`} title={form.id ? `ذخیره ${currentLabel}` : `افزودن ${currentLabel}`}><img src={form.id ? "/images/icons/check.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" /></button>
        {form.id && <RowActionIconBtn action="cancel" title="انصراف از ویرایش" onClick={() => setForm(initialForm)} size={40} iconSize={17} />}
      </form>
      {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
        <div className="max-h-[55vh] overflow-auto" dir="ltr">
          <table dir="rtl" className="w-full min-w-[620px] table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:text-center [&_th]:!py-2 [&_td]:!py-2">
            <colgroup><col style={{ width: 48 }} /><col style={{ width: 75 }} />{active === "field" && <><col style={{ width: "25%" }} /><col style={{ width: "25%" }} /></>}<col /></colgroup>
            <thead><tr className="sticky top-0 z-10 border-b border-neutral-300 bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800"><th><input type="checkbox" className={checkboxClass} checked={allPageSelected} onChange={togglePageSelected} aria-label="انتخاب همه ردیف‌های صفحه" /></th><th>ردیف</th>{active === "field" && <><th>دسته‌بندی</th><th>تیتر</th></>}<th className="relative"><span>{active === "field" ? "فیلد" : "عنوان"}</span><button ref={triggerRef} type="button" onClick={openMenu} className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg transition hover:bg-black/[0.08] dark:hover:bg-white/10" title="مدیریت وضعیت" aria-label="مدیریت وضعیت" aria-expanded={menuOpen}><img src="/images/icons/menu-table.svg" alt="" className="h-4 w-3 dark:invert" /></button></th></tr></thead>
            <tbody className="text-[13px] [&>tr]:h-10">{loading || !pageRows.length ? <tr><td colSpan={active === "field" ? 5 : 3} className="py-8 text-neutral-500">{loading ? "در حال دریافت..." : "هنوز موردی ثبت نشده است."}</td></tr> : pageRows.map((item, index) => <tr key={item.id} className={`cursor-pointer transition-colors ${selectedIds.has(String(item.id)) ? "bg-black/[0.07] dark:bg-white/10" : "bg-black/[0.02] hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10"}`} onClick={() => toggleSelected(item.id)}>
              <td className="border-b border-neutral-300 px-2 dark:border-neutral-700"><input type="checkbox" className={checkboxClass} checked={selectedIds.has(String(item.id))} onClick={(event) => event.stopPropagation()} onChange={() => toggleSelected(item.id)} aria-label={`انتخاب ${item.name}`} /></td>
              <td className="border-b border-neutral-300 px-2 dark:border-neutral-700">{toFa(safePage * pageSize + index + 1)}</td>
              {active === "field" && <><td className="border-b border-neutral-300 px-2 dark:border-neutral-700">{categoryById.get(String(item.categoryId)) || "—"}</td><td className="border-b border-neutral-300 px-2 dark:border-neutral-700">{titleById.get(String(item.titleId)) || "—"}</td></>}
              <td className="border-b border-neutral-300 px-2 dark:border-neutral-700">{item.name}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <BaseTablePager total={rows.length} page={safePage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
      {menuOpen && createPortal(<div ref={menuRef} dir="rtl" style={menuPosition} className="fixed z-[10001] w-60 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 text-right text-neutral-900 shadow-[0_18px_45px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100"><div className="px-2.5 pb-2 pt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{selectedIds.size ? `${toFa(selectedIds.size)} مورد انتخاب شده` : "ابتدا موارد موردنظر را انتخاب کنید"}</div><button type="button" disabled={!selectedItem || busy} onClick={() => { edit(selectedItem); setMenuOpen(false); }} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-amber-500/10"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 dark:bg-amber-500/15"><img src="/images/icons/pencil.svg" alt="" className="h-4 w-4 dark:invert" /></span><span className="text-sm font-semibold">ویرایش</span></button><button type="button" disabled={!selectedIds.size || busy} onClick={() => { setMenuOpen(false); removeSelected(); }} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45 dark:text-red-300 dark:hover:bg-red-500/10"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-100 dark:bg-red-500/15"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" /></span><span className="text-sm font-semibold">حذف موارد انتخاب‌شده</span></button></div>, document.body)}
      {active === "category" && <CostBreakdownDemo />}
    </div>
  </section>;
}
