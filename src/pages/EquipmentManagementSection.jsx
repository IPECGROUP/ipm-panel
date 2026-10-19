import { useEffect, useMemo, useState } from "react";
import BaseTablePager from "../components/ui/BaseTablePager.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { api } from "../utils/api.js";

const endpoint = "/base/equipment-fields";
const inputClass = "h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-right text-sm outline-none transition focus:border-neutral-400 dark:border-white/15 dark:bg-white/5";
const typeLabels = { text: "متن", number: "عدد", date: "تاریخ", boolean: "بله / خیر" };
const toFa = (value) => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
const initialForm = { id: null, name: "", categoryId: "", titleId: "", fieldType: "text" };

function DefinitionCell({ item, kind, onEdit, onDelete, busy }) {
  if (!item) return <span className="text-neutral-400">—</span>;
  const label = kind === "category" ? "دسته‌بندی" : kind === "title" ? "تیتر" : "فیلد";
  return <div className="flex items-center justify-center gap-1">
    <span className="min-w-0 truncate" title={item.name}>{item.name}</span>
    <span className="flex shrink-0 items-center opacity-60 transition hover:opacity-100">
      <RowActionIconBtn action="edit" title={`ویرایش ${label}`} onClick={() => onEdit(kind, item)} disabled={busy} size={25} iconSize={12} />
      <RowActionIconBtn action="delete" title={`حذف ${label}`} onClick={() => onDelete(kind, item)} disabled={busy} size={25} iconSize={12} />
    </span>
  </div>;
}

export default function EquipmentManagementSection() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState({ categories: [], titles: [], fields: [] });
  const [categoryForm, setCategoryForm] = useState(initialForm);
  const [titleForm, setTitleForm] = useState(initialForm);
  const [fieldForm, setFieldForm] = useState(initialForm);
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
    let active = true;
    api(endpoint, { headers }).then((result) => {
      if (active) setData({ categories: result.categories || [], titles: result.titles || [], fields: result.fields || [] });
    }).catch((err) => { if (active) setError(err.message || "دریافت اطلاعات انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authLoading, user?.id]);

  const rows = useMemo(() => data.categories.flatMap((category) => {
    const titles = data.titles.filter((title) => title.categoryId === category.id);
    if (!titles.length) return [{ key: `c-${category.id}`, category }];
    return titles.flatMap((title) => {
      const fields = data.fields.filter((field) => field.titleId === title.id);
      if (!fields.length) return [{ key: `t-${title.id}`, category, title }];
      return fields.map((field) => ({ key: `f-${field.id}`, category, title, field }));
    });
  }), [data]);
  const safePage = Math.min(page, Math.max(0, Math.ceil(rows.length / pageSize) - 1));
  const pageRows = rows.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const titleChoices = data.titles.filter((title) => String(title.categoryId) === String(fieldForm.categoryId));

  async function submit(kind, form, reset) {
    if (!form.name.trim()) { setError("نام را وارد کنید."); return; }
    if (kind === "title" && !form.categoryId) { setError("دسته‌بندی را انتخاب کنید."); return; }
    if (kind === "field" && !form.titleId) { setError("تیتر را انتخاب کنید."); return; }
    setBusy(true); setError("");
    try {
      await api(endpoint, { method: form.id ? "PATCH" : "POST", headers, body: JSON.stringify({ ...form, kind, name: form.name.trim() }) });
      await load();
      reset(initialForm);
    } catch (err) {
      setError(err.message === "duplicate_name" ? "این نام در همین بخش قبلاً ثبت شده است." : err.message || "ذخیره انجام نشد.");
    } finally { setBusy(false); }
  }

  function edit(kind, item) {
    setError("");
    if (kind === "category") setCategoryForm({ ...initialForm, id: item.id, name: item.name });
    if (kind === "title") setTitleForm({ ...initialForm, id: item.id, name: item.name, categoryId: String(item.categoryId) });
    if (kind === "field") {
      const title = data.titles.find((entry) => entry.id === item.titleId);
      setFieldForm({ ...initialForm, id: item.id, name: item.name, categoryId: String(title?.categoryId || ""), titleId: String(item.titleId), fieldType: item.fieldType });
    }
  }

  async function remove(kind, item) {
    const label = kind === "category" ? "دسته‌بندی و تمام تیترها و فیلدهای آن" : kind === "title" ? "تیتر و تمام فیلدهای آن" : "فیلد";
    if (!window.confirm(`آیا از حذف ${label} «${item.name}» مطمئن هستید؟`)) return;
    setBusy(true); setError("");
    try {
      await api(endpoint, { method: "DELETE", headers, body: JSON.stringify({ kind, id: item.id }) });
      await load();
      if (kind === "category" && categoryForm.id === item.id) setCategoryForm(initialForm);
      if (kind === "title" && titleForm.id === item.id) setTitleForm(initialForm);
      if (kind === "field" && fieldForm.id === item.id) setFieldForm(initialForm);
    } catch (err) { setError(err.message || "حذف انجام نشد."); }
    finally { setBusy(false); }
  }

  return <section className="-mx-4 p-4" dir="rtl">
    <h2 className="mb-4 text-sm font-bold">دسته‌بندی و فیلدهای تجهیزات</h2>
    <div className="grid gap-3">
      <form onSubmit={(event) => { event.preventDefault(); submit("category", categoryForm, setCategoryForm); }} className="flex flex-wrap items-center gap-3">
        <span className="w-24 shrink-0 text-xs font-medium text-neutral-600 dark:text-neutral-300">دسته‌بندی</span>
        <input className={`${inputClass} min-w-[190px] flex-1`} maxLength={120} value={categoryForm.name} onChange={(event) => setCategoryForm((old) => ({ ...old, name: event.target.value }))} placeholder="نام دسته‌بندی..." />
        <ActionButtons editing={!!categoryForm.id} busy={busy} onCancel={() => setCategoryForm(initialForm)} label="دسته‌بندی" />
      </form>
      <form onSubmit={(event) => { event.preventDefault(); submit("title", titleForm, setTitleForm); }} className="flex flex-wrap items-center gap-3">
        <span className="w-24 shrink-0 text-xs font-medium text-neutral-600 dark:text-neutral-300">تیتر</span>
        <select className={`${inputClass} min-w-[190px] flex-1`} value={titleForm.categoryId} onChange={(event) => setTitleForm((old) => ({ ...old, categoryId: event.target.value }))} required><option value="">دسته‌بندی را انتخاب کنید</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        <input className={`${inputClass} min-w-[190px] flex-1`} maxLength={120} value={titleForm.name} onChange={(event) => setTitleForm((old) => ({ ...old, name: event.target.value }))} placeholder="نام تیتر..." />
        <ActionButtons editing={!!titleForm.id} busy={busy} onCancel={() => setTitleForm(initialForm)} label="تیتر" />
      </form>
      <form onSubmit={(event) => { event.preventDefault(); submit("field", fieldForm, setFieldForm); }} className="flex flex-wrap items-center gap-3">
        <span className="w-24 shrink-0 text-xs font-medium text-neutral-600 dark:text-neutral-300">فیلد</span>
        <select className={`${inputClass} min-w-[155px] flex-1`} value={fieldForm.categoryId} onChange={(event) => setFieldForm((old) => ({ ...old, categoryId: event.target.value, titleId: "" }))} required><option value="">دسته‌بندی را انتخاب کنید</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        <select className={`${inputClass} min-w-[155px] flex-1`} value={fieldForm.titleId} onChange={(event) => setFieldForm((old) => ({ ...old, titleId: event.target.value }))} required><option value="">تیتر را انتخاب کنید</option>{titleChoices.map((title) => <option key={title.id} value={title.id}>{title.name}</option>)}</select>
        <input className={`${inputClass} min-w-[155px] flex-1`} maxLength={120} value={fieldForm.name} onChange={(event) => setFieldForm((old) => ({ ...old, name: event.target.value }))} placeholder="نام فیلد..." />
        <select className={`${inputClass} min-w-[120px] flex-[0.5]`} value={fieldForm.fieldType} onChange={(event) => setFieldForm((old) => ({ ...old, fieldType: event.target.value }))} aria-label="نوع فیلد">{Object.entries(typeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select>
        <ActionButtons editing={!!fieldForm.id} busy={busy} onCancel={() => setFieldForm(initialForm)} label="فیلد" />
      </form>
    </div>
    {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}

    <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="max-h-[55vh] overflow-auto" dir="ltr"><table dir="rtl" className="w-full min-w-[720px] table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:text-center [&_th]:!py-2 [&_td]:!py-2"><colgroup><col style={{ width: 70 }} /><col style={{ width: "27%" }} /><col style={{ width: "27%" }} /><col /><col style={{ width: 105 }} /></colgroup><thead><tr className="sticky top-0 z-10 border-b border-neutral-300 bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800"><th>ردیف</th><th>دسته‌بندی</th><th>تیتر</th><th>فیلد</th><th>نوع فیلد</th></tr></thead><tbody className="text-[13px] [&>tr]:h-10">{loading || !pageRows.length ? <tr><td colSpan={5} className="py-8 text-neutral-500">{loading ? "در حال دریافت..." : "هنوز موردی ثبت نشده است."}</td></tr> : pageRows.map((row, index) => <tr key={row.key} className="bg-black/[0.02] hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10"><td className="border-b border-neutral-300 px-2 dark:border-neutral-700">{toFa(safePage * pageSize + index + 1)}</td><td className="border-b border-neutral-300 px-2 dark:border-neutral-700"><DefinitionCell item={row.category} kind="category" onEdit={edit} onDelete={remove} busy={busy} /></td><td className="border-b border-neutral-300 px-2 dark:border-neutral-700"><DefinitionCell item={row.title} kind="title" onEdit={edit} onDelete={remove} busy={busy} /></td><td className="border-b border-neutral-300 px-2 dark:border-neutral-700"><DefinitionCell item={row.field} kind="field" onEdit={edit} onDelete={remove} busy={busy} /></td><td className="border-b border-neutral-300 px-2 dark:border-neutral-700">{row.field ? typeLabels[row.field.fieldType] || row.field.fieldType : "—"}</td></tr>)}</tbody></table></div>
      <BaseTablePager total={rows.length} page={safePage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  </section>;
}

function ActionButtons({ editing, busy, onCancel, label }) {
  return <div className="flex items-center gap-1"><button type="submit" disabled={busy} className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 bg-white transition hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" aria-label={editing ? `ذخیره ${label}` : `افزودن ${label}`} title={editing ? `ذخیره ${label}` : `افزودن ${label}`}><img src={editing ? "/images/icons/check.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" /></button>{editing && <RowActionIconBtn action="cancel" onClick={onCancel} size={36} iconSize={16} />}</div>;
}
