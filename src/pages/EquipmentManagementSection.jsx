import { useEffect, useMemo, useState } from "react";
import BaseTablePager from "../components/ui/BaseTablePager.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { api } from "../utils/api.js";

const endpoint = "/base/equipment-fields";
const options = [
  { id: "category", label: "دسته‌بندی" },
  { id: "title", label: "تیتر" },
  { id: "field", label: "فیلد" },
];
const inputClass = "h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-right text-sm outline-none transition focus:border-neutral-400 dark:border-white/15 dark:bg-white/5";
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
  const headers = user?.id != null ? { "x-user-id": String(user.id) } : {};

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
  }, [authLoading, user?.id]);

  const categoryById = useMemo(() => new Map(data.categories.map((item) => [String(item.id), item.name])), [data.categories]);
  const titleById = useMemo(() => new Map(data.titles.map((item) => [String(item.id), item.name])), [data.titles]);
  const rows = active === "category" ? data.categories : active === "title" ? data.titles : data.fields;
  const safePage = Math.min(page, Math.max(0, Math.ceil(rows.length / pageSize) - 1));
  const pageRows = rows.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const currentLabel = options.find((option) => option.id === active)?.label || "";

  function changeTab(kind) {
    setActive(kind);
    setForm(initialForm);
    setError("");
    setPage(0);
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
    } catch (err) {
      setError(err.message === "duplicate_name" ? "این نام در همین بخش قبلاً ثبت شده است." : err.message || "ذخیره انجام نشد.");
    } finally { setBusy(false); }
  }

  function edit(item) {
    setError("");
    setForm({ id: item.id, name: item.name, categoryId: String(item.categoryId || ""), titleId: String(item.titleId || "") });
  }

  async function remove(item) {
    if (!window.confirm(`آیا از حذف ${currentLabel} «${item.name}» مطمئن هستید؟`)) return;
    setBusy(true);
    setError("");
    try {
      await api(endpoint, { method: "DELETE", headers, body: JSON.stringify({ kind: active, id: item.id }) });
      await load();
      if (form.id === item.id) setForm(initialForm);
    } catch (err) {
      setError(err.message === "category_in_use" ? "این دسته‌بندی در فیلدها یا شناسنامه تجهیزات استفاده شده است." : err.message || "حذف انجام نشد.");
    } finally { setBusy(false); }
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
            <colgroup><col style={{ width: 75 }} />{active === "field" && <><col style={{ width: "25%" }} /><col style={{ width: "25%" }} /></>}<col /><col style={{ width: 100 }} /></colgroup>
            <thead><tr className="sticky top-0 z-10 border-b border-neutral-300 bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800"><th>ردیف</th>{active === "field" && <><th>دسته‌بندی</th><th>تیتر</th></>}<th>{active === "field" ? "فیلد" : "عنوان"}</th><th>اقدامات</th></tr></thead>
            <tbody className="text-[13px] [&>tr]:h-10">{loading || !pageRows.length ? <tr><td colSpan={active === "field" ? 5 : 3} className="py-8 text-neutral-500">{loading ? "در حال دریافت..." : "هنوز موردی ثبت نشده است."}</td></tr> : pageRows.map((item, index) => <tr key={item.id} className="bg-black/[0.02] hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10">
              <td className="border-b border-neutral-300 px-2 dark:border-neutral-700">{toFa(safePage * pageSize + index + 1)}</td>
              {active === "field" && <><td className="border-b border-neutral-300 px-2 dark:border-neutral-700">{categoryById.get(String(item.categoryId)) || "—"}</td><td className="border-b border-neutral-300 px-2 dark:border-neutral-700">{titleById.get(String(item.titleId)) || "—"}</td></>}
              <td className="border-b border-neutral-300 px-2 dark:border-neutral-700">{item.name}</td>
              <td className="border-b border-neutral-300 px-2 dark:border-neutral-700"><div className="flex items-center justify-center gap-1"><RowActionIconBtn action="edit" title={`ویرایش ${currentLabel}`} onClick={() => edit(item)} disabled={busy} size={30} iconSize={14} /><RowActionIconBtn action="delete" title={`حذف ${currentLabel}`} onClick={() => remove(item)} disabled={busy} size={30} iconSize={14} /></div></td>
            </tr>)}</tbody>
          </table>
        </div>
        <BaseTablePager total={rows.length} page={safePage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  </section>;
}
