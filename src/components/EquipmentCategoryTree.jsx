import { useMemo, useState } from "react";

const inputClass = "h-10 w-full rounded-xl border border-black/15 bg-white px-3 text-right text-sm text-neutral-900 outline-none focus:border-neutral-500 dark:border-white/20 dark:bg-neutral-800 dark:text-white";
const checkboxClass = "h-4 w-4 accent-black dark:accent-neutral-200";
const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const sameName = (a, b) => a.trim().localeCompare(b.trim(), "fa", { sensitivity: "base" }) === 0;

// Standalone, in-memory category > title > field editor. No API or parent-page state.
export default function EquipmentCategoryTree() {
  const [categories, setCategories] = useState([]);
  const [titles, setTitles] = useState([]);
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState({ category: "", title: "", field: "" });
  const [selected, setSelected] = useState(() => new Set());
  const [expanded, setExpanded] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");

  const rows = useMemo(() => {
    const result = [];
    categories.forEach((category) => {
      result.push({ ...category, kind: "category", key: `category:${category.id}` });
      if (!expanded.has(`category:${category.id}`)) return;
      titles.filter((title) => title.categoryId === category.id).forEach((title) => {
        result.push({ ...title, kind: "title", key: `title:${title.id}`, categoryName: category.name });
        if (!expanded.has(`title:${title.id}`)) return;
        fields.filter((field) => field.titleId === title.id).forEach((field) => {
          result.push({ ...field, kind: "field", key: `field:${field.id}`, categoryName: category.name, titleName: title.name });
        });
      });
    });
    return result;
  }, [categories, titles, fields, expanded]);

  const allKeys = useMemo(() => [
    ...categories.map((item) => `category:${item.id}`),
    ...titles.map((item) => `title:${item.id}`),
    ...fields.map((item) => `field:${item.id}`),
  ], [categories, titles, fields]);
  const allSelected = allKeys.length > 0 && allKeys.every((key) => selected.has(key));
  const selectedItem = selected.size === 1
    ? [...categories.map((item) => ({ ...item, kind: "category", key: `category:${item.id}` })), ...titles.map((item) => ({ ...item, kind: "title", key: `title:${item.id}` })), ...fields.map((item) => ({ ...item, kind: "field", key: `field:${item.id}` }))].find((item) => selected.has(item.key))
    : null;
  const expandableKeys = [...categories.map((item) => `category:${item.id}`), ...titles.map((item) => `title:${item.id}`)];
  const allExpanded = expandableKeys.length > 0 && expandableKeys.every((key) => expanded.has(key));

  function add(event) {
    event.preventDefault();
    const categoryName = form.category.trim();
    const titleName = form.title.trim();
    const fieldName = form.field.trim();
    if (!categoryName) return setError("دسته‌بندی را وارد کنید.");
    if (fieldName && !titleName) return setError("برای ثبت فیلد، تیتر را وارد کنید.");

    let category = categories.find((item) => sameName(item.name, categoryName));
    let title = category && titles.find((item) => item.categoryId === category.id && sameName(item.name, titleName));
    if (fieldName && title && fields.some((item) => item.titleId === title.id && sameName(item.name, fieldName))) return setError("این فیلد در تیتر انتخاب‌شده وجود دارد.");
    if (!fieldName && titleName && title) return setError("این تیتر در دسته‌بندی انتخاب‌شده وجود دارد.");
    if (!titleName && category) return setError("این دسته‌بندی قبلاً ثبت شده است.");

    if (!category) {
      category = { id: makeId(), name: categoryName };
      setCategories((current) => [...current, category]);
    }
    if (titleName && !title) {
      title = { id: makeId(), categoryId: category.id, name: titleName };
      setTitles((current) => [...current, title]);
    }
    if (fieldName) setFields((current) => [...current, { id: makeId(), titleId: title.id, name: fieldName }]);
    setExpanded((current) => {
      const next = new Set(current);
      next.add(`category:${category.id}`);
      if (title) next.add(`title:${title.id}`);
      return next;
    });
    setForm({ category: "", title: "", field: "" });
    setError("");
  }

  function useAsParent(row) {
    if (row.kind === "category") setForm({ category: row.name, title: "", field: "" });
    if (row.kind === "title") setForm({ category: row.categoryName, title: row.name, field: "" });
    setExpanded((current) => new Set(current).add(row.key));
    setError("");
  }

  function saveEdit(event) {
    event.preventDefault();
    const name = editing.name.trim();
    if (!name) return setError("نام را وارد کنید.");
    const siblings = editing.kind === "category" ? categories : editing.kind === "title" ? titles.filter((item) => item.categoryId === editing.categoryId) : fields.filter((item) => item.titleId === editing.titleId);
    if (siblings.some((item) => item.id !== editing.id && sameName(item.name, name))) return setError("این نام در همین بخش وجود دارد.");
    const setter = editing.kind === "category" ? setCategories : editing.kind === "title" ? setTitles : setFields;
    setter((current) => current.map((item) => item.id === editing.id ? { ...item, name } : item));
    setEditing(null); setError("");
  }

  function removeSelected() {
    const categoryIds = new Set(categories.filter((item) => selected.has(`category:${item.id}`)).map((item) => item.id));
    const titleIds = new Set(titles.filter((item) => categoryIds.has(item.categoryId) || selected.has(`title:${item.id}`)).map((item) => item.id));
    setCategories((current) => current.filter((item) => !categoryIds.has(item.id)));
    setTitles((current) => current.filter((item) => !titleIds.has(item.id)));
    setFields((current) => current.filter((item) => !titleIds.has(item.titleId) && !selected.has(`field:${item.id}`)));
    setSelected(new Set()); setEditing(null); setMenuOpen(false); setError("");
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const data = categories.flatMap((category) => {
      const categoryTitles = titles.filter((title) => title.categoryId === category.id);
      if (!categoryTitles.length) return [{ "دسته‌بندی": category.name, "تیتر": "", "فیلد": "" }];
      return categoryTitles.flatMap((title) => {
        const titleFields = fields.filter((field) => field.titleId === title.id);
        return titleFields.length ? titleFields.map((field) => ({ "دسته‌بندی": category.name, "تیتر": title.name, "فیلد": field.name })) : [{ "دسته‌بندی": category.name, "تیتر": title.name, "فیلد": "" }];
      });
    });
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(data), "دسته بندی تجهیزات");
    XLSX.writeFile(book, "equipment-categories.xlsx");
  }

  return <section dir="rtl" className="mt-6 rounded-2xl border border-black/10 bg-white p-4 text-neutral-900 shadow-sm md:p-6 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100">
    <div className="mb-5 flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[.03] dark:border-white/10 dark:bg-white/[.06]"><img src="/images/icons/sakhtar-shekast.svg" alt="" className="h-6 w-6 dark:invert" /></span>
      <div><h3 className="text-base font-bold">دسته‌بندی تجهیزات</h3><p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">دسته‌بندی، تیتر و فیلد</p></div>
      <button type="button" onClick={exportExcel} disabled={!categories.length} className="mr-auto grid h-10 w-10 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 transition hover:bg-emerald-100 disabled:opacity-40 dark:border-emerald-400/25 dark:bg-emerald-500/10" title="خروجی اکسل" aria-label="خروجی اکسل"><img src="/images/icons8-excel-50.png" alt="" className="h-5 w-5" /></button>
    </div>

    <div className="rounded-2xl border border-black/10 p-3 dark:border-white/10 md:p-4">
      <form onSubmit={add} className="grid gap-3 md:grid-cols-3 md:items-end">
        <label className="block min-w-0"><span className="mb-1 block text-sm">دسته‌بندی</span><input value={form.category} onChange={(event) => setForm((old) => ({ ...old, category: event.target.value }))} className={inputClass} placeholder="نام دسته‌بندی" /></label>
        <label className="block min-w-0"><span className="mb-1 block text-sm">تیتر</span><input value={form.title} onChange={(event) => setForm((old) => ({ ...old, title: event.target.value }))} className={inputClass} placeholder="تیترِ این دسته‌بندی" /></label>
        <label className="block min-w-0"><span className="mb-1 block text-sm">فیلد</span><span className="flex gap-2"><input value={form.field} onChange={(event) => setForm((old) => ({ ...old, field: event.target.value }))} className={inputClass} placeholder="فیلدِ این تیتر" /><button type="submit" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white hover:bg-neutral-100 dark:border-white/20 dark:bg-neutral-800" aria-label="افزودن"><img src="/images/icons/afzodan.svg" alt="" className="h-5 w-5 dark:invert" /></button></span></label>
      </form>
      {error && !editing && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
        <table className="w-full min-w-[620px] table-fixed text-sm">
          <colgroup><col style={{ width: 48 }} /><col /><col /><col /><col style={{ width: 110 }} /></colgroup>
          <thead className="bg-neutral-200 text-black dark:bg-neutral-800 dark:text-white"><tr className="h-11">
            <th><input type="checkbox" className={checkboxClass} checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(allKeys))} aria-label="انتخاب همه" /></th>
            <th className="px-2 text-right"><button type="button" onClick={() => setExpanded(allExpanded ? new Set() : new Set(expandableKeys))} disabled={!expandableKeys.length} className="ml-2 text-xl disabled:opacity-40" aria-label={allExpanded ? "بستن همه" : "باز کردن همه"}>{allExpanded ? "−" : "+"}</button>دسته‌بندی</th>
            <th className="px-2 text-right">تیتر</th><th className="px-2 text-right">فیلد</th>
            <th className="relative px-2 text-center">عملیات<button type="button" onClick={() => setMenuOpen((open) => !open)} className="absolute left-1 top-1/2 -translate-y-1/2 px-2" aria-label="عملیات موارد انتخاب‌شده" aria-expanded={menuOpen}>⋮</button>{menuOpen && <div className="absolute left-1 top-full z-20 w-44 rounded-xl border border-black/10 bg-white p-1 text-right shadow-lg dark:border-white/10 dark:bg-neutral-800"><button type="button" disabled={!selectedItem} onClick={() => { setEditing({ ...selectedItem }); setError(""); setMenuOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-right hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-white/10">ویرایش</button><button type="button" disabled={!selected.size} onClick={removeSelected} className="block w-full rounded-lg px-3 py-2 text-right text-red-600 hover:bg-red-50 disabled:opacity-40">حذف</button></div>}</th>
          </tr></thead>
          <tbody>{rows.length ? rows.map((row, index) => <tr key={row.key} className={`h-11 border-t border-black/10 dark:border-white/10 ${index % 2 ? "bg-neutral-50 dark:bg-white/[.03]" : ""}`}>
            <td className="text-center"><input type="checkbox" className={checkboxClass} checked={selected.has(row.key)} onChange={() => setSelected((current) => { const next = new Set(current); next.has(row.key) ? next.delete(row.key) : next.add(row.key); return next; })} aria-label={`انتخاب ${row.name}`} /></td>
            <td className="px-2 font-semibold">{row.kind === "category" && <span className="flex items-center gap-2"><button type="button" onClick={() => useAsParent(row)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-black/15 text-lg dark:border-white/20" title="افزودن تیتر" aria-label={`افزودن تیتر به ${row.name}`}>+</button><button type="button" onClick={() => setExpanded((current) => { const next = new Set(current); next.has(row.key) ? next.delete(row.key) : next.add(row.key); return next; })} aria-label={expanded.has(row.key) ? "بستن تیترها" : "نمایش تیترها"}>{expanded.has(row.key) ? "▾" : "◂"}</button>{row.name}</span>}</td>
            <td className="px-2 font-semibold">{row.kind === "title" && <span className="flex items-center gap-2"><button type="button" onClick={() => useAsParent(row)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-black/15 text-lg dark:border-white/20" title="افزودن فیلد" aria-label={`افزودن فیلد به ${row.name}`}>+</button><button type="button" onClick={() => setExpanded((current) => { const next = new Set(current); next.has(row.key) ? next.delete(row.key) : next.add(row.key); return next; })} aria-label={expanded.has(row.key) ? "بستن فیلدها" : "نمایش فیلدها"}>{expanded.has(row.key) ? "▾" : "◂"}</button>{row.name}</span>}</td>
            <td className="px-2">{row.kind === "field" ? row.name : ""}</td><td className="text-center text-neutral-400">—</td>
          </tr>) : <tr><td colSpan={5} className="py-8 text-center text-neutral-500">هنوز موردی ثبت نشده است.</td></tr>}</tbody>
        </table>
      </div>
    </div>

    {editing && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setEditing(null)}><form onSubmit={saveEdit} onClick={(event) => event.stopPropagation()} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"><h4 className="font-bold">ویرایش {editing.kind === "category" ? "دسته‌بندی" : editing.kind === "title" ? "تیتر" : "فیلد"}</h4><input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} className={inputClass} />{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border px-4 py-2">انصراف</button><button type="submit" className="rounded-xl bg-black px-4 py-2 text-white dark:bg-white dark:text-black">ذخیره</button></div></form></div>}
  </section>;
}
