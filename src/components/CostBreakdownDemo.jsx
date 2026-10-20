import { useMemo, useState } from "react";

const demoProjects = [{ id: "100", code: "100", name: "عمومی" }];
const demoRows = [
  { id: "1", projectId: "100", code: "100-1", name: "دفتر مرکزی", baseBudget: "0", parentId: null },
  { id: "2", projectId: "100", code: "100-2", name: "کارگاه", baseBudget: "0", parentId: null },
  { id: "3", projectId: "100", code: "100-3", name: "مالی و منابع انسانی", baseBudget: "0", parentId: null },
  { id: "4", projectId: "100", code: "100-4", name: "سرمایه ای و توسعه ای", baseBudget: "0", parentId: null },
];

const fieldClass = "h-10 w-full rounded-xl border border-black/15 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-500 dark:border-white/20 dark:bg-neutral-800 dark:text-white";
const checkboxClass = "h-4 w-4 accent-black dark:accent-neutral-200";
const normalizeDigits = (value) => String(value).replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit)).replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
const normalizeCode = (value) => normalizeDigits(value).trim().replace(/[^\d-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
const normalizeBudget = (value) => normalizeDigits(value).replace(/[^\d]/g, "") || "0";
const budgetText = (value) => Number(normalizeBudget(value)).toLocaleString("fa-IR");
const sortByCode = (a, b) => a.code.localeCompare(b.code, "fa", { numeric: true });

// A self-contained preview. Pass projects and initialRows when embedding it elsewhere.
export default function CostBreakdownDemo({ projects = demoProjects, initialRows = demoRows }) {
  const [rows, setRows] = useState(() => initialRows.map((row) => ({ ...row, id: String(row.id), projectId: String(row.projectId), parentId: row.parentId == null ? null : String(row.parentId) })));
  const [projectId, setProjectId] = useState(String(projects[0]?.id ?? ""));
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [expanded, setExpanded] = useState(() => new Set());
  const [addingUnder, setAddingUnder] = useState(null);
  const [editing, setEditing] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");

  const project = projects.find((item) => String(item.id) === projectId);
  const projectRows = useMemo(() => rows.filter((row) => row.projectId === projectId), [rows, projectId]);
  const children = useMemo(() => {
    const map = new Map();
    projectRows.forEach((row) => {
      const list = map.get(row.parentId) || [];
      list.push(row);
      map.set(row.parentId, list);
    });
    map.forEach((list) => list.sort(sortByCode));
    return map;
  }, [projectRows]);
  const visibleRows = useMemo(() => {
    const result = [];
    const visit = (parentId, depth) => (children.get(parentId) || []).forEach((row) => {
      result.push({ ...row, depth });
      if (expanded.has(row.id)) visit(row.id, depth + 1);
    });
    visit(null, 0);
    return result;
  }, [children, expanded]);
  const allSelected = projectRows.length > 0 && projectRows.every((row) => selected.has(row.id));
  const allExpanded = projectRows.length > 0 && projectRows.every((row) => expanded.has(row.id));

  function resetProject(nextId) {
    setProjectId(nextId);
    setCode(""); setName(""); setSelected(new Set()); setExpanded(new Set());
    setAddingUnder(null); setEditing(null); setMenuOpen(false); setError("");
  }

  function addRow(event) {
    event.preventDefault();
    const enteredCode = normalizeCode(code);
    const fullCode = addingUnder
      ? enteredCode.startsWith(`${addingUnder.code}-`) ? enteredCode : `${addingUnder.code}-${enteredCode}`
      : enteredCode.startsWith(`${project?.code}-`) ? enteredCode : `${project?.code}-${enteredCode}`;
    if (!project || !enteredCode || !name.trim()) return setError("کد و نام بودجه را وارد کنید.");
    if (projectRows.some((row) => row.code === fullCode)) return setError("این کد بودجه قبلاً ثبت شده است.");
    setRows((current) => [...current, { id: globalThis.crypto?.randomUUID?.() || String(Date.now()), projectId, parentId: addingUnder?.id ?? null, code: fullCode, name: name.trim(), baseBudget: "0" }]);
    if (addingUnder) setExpanded((current) => new Set(current).add(addingUnder.id));
    setCode(""); setName(""); setAddingUnder(null); setError("");
  }

  function saveEdit(event) {
    event.preventDefault();
    const nextCode = normalizeCode(editing.code);
    if (!nextCode || !editing.name.trim()) return setError("کد و نام بودجه را وارد کنید.");
    if (projectRows.some((row) => row.id !== editing.id && row.code === nextCode)) return setError("این کد بودجه قبلاً ثبت شده است.");
    setRows((current) => current.map((row) => row.id === editing.id ? { ...row, code: nextCode, name: editing.name.trim(), baseBudget: normalizeBudget(editing.baseBudget) } : row));
    setEditing(null); setError("");
  }

  function removeSelected() {
    const removed = new Set(selected);
    let changed = true;
    while (changed) {
      changed = false;
      rows.forEach((row) => { if (row.parentId && removed.has(row.parentId) && !removed.has(row.id)) { removed.add(row.id); changed = true; } });
    }
    setRows((current) => current.filter((row) => !removed.has(row.id)));
    setSelected(new Set()); setEditing(null); setMenuOpen(false); setError("");
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.json_to_sheet(projectRows.slice().sort(sortByCode).map((row) => ({ "کد بودجه": row.code, "نام بودجه": row.name, "بودجه مبنا": Number(normalizeBudget(row.baseBudget)) })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "ساختار شکست هزینه ها");
    XLSX.writeFile(workbook, `cost-breakdown-${project?.code || "demo"}.xlsx`);
  }

  return <section dir="rtl" className="mt-6 rounded-2xl border border-black/10 bg-white p-4 text-neutral-900 shadow-sm md:p-6 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100">
    <div className="mb-5 flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[.03] dark:border-white/10 dark:bg-white/[.06]"><img src="/images/icons/sakhtar-shekast.svg" alt="" className="h-6 w-6 dark:invert" /></span>
      <div><h3 className="text-base font-bold">ساختار شکست هزینه ها</h3><p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">مدیریت پروژه</p></div>
      <button type="button" onClick={exportExcel} disabled={!projectRows.length} className="mr-auto grid h-10 w-10 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 transition hover:bg-emerald-100 disabled:opacity-40 dark:border-emerald-400/25 dark:bg-emerald-500/10" title="خروجی اکسل" aria-label="خروجی اکسل"><img src="/images/icons8-excel-50.png" alt="" className="h-5 w-5" /></button>
    </div>

    <div className="rounded-2xl border border-black/10 p-3 dark:border-white/10 md:p-4">
      <form onSubmit={addRow} className="grid gap-3 md:grid-cols-[minmax(180px,1.15fr)_minmax(130px,.65fr)_minmax(220px,1.4fr)] md:items-end">
        <label className="block min-w-0"><span className="mb-1 block text-sm">پروژه</span><select value={projectId} onChange={(event) => resetProject(event.target.value)} className={fieldClass}><option value="">انتخاب کنید</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}</select></label>
        <label className="block min-w-0"><span className="mb-1 block text-sm">کد بودجه{addingUnder ? ` زیرمجموعه ${addingUnder.code}` : ""}</span><input dir="ltr" value={code} onChange={(event) => setCode(event.target.value)} className={fieldClass + " text-left"} inputMode="numeric" /></label>
        <label className="block min-w-0"><span className="mb-1 block text-sm">نام بودجه</span><span className="flex gap-2"><input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} placeholder="نام بودجه" /><button type="submit" disabled={!projectId} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white hover:bg-neutral-100 disabled:opacity-40 dark:border-white/20 dark:bg-neutral-800" aria-label="افزودن بودجه"><img src="/images/icons/afzodan.svg" alt="" className="h-5 w-5 dark:invert" /></button>{addingUnder && <button type="button" onClick={() => setAddingUnder(null)} className="px-2 text-xs" aria-label="لغو افزودن زیرمجموعه">لغو</button>}</span></label>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
        <table className="w-full min-w-[660px] table-fixed text-sm">
          <colgroup><col style={{ width: 48 }} /><col style={{ width: 165 }} /><col /><col style={{ width: 160 }} /><col style={{ width: 130 }} /></colgroup>
          <thead className="bg-neutral-200 text-black dark:bg-neutral-800 dark:text-white"><tr className="h-11">
            <th><input type="checkbox" className={checkboxClass} checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(projectRows.map((row) => row.id)))} aria-label="انتخاب همه بودجه‌ها" /></th>
            <th className="px-2 text-right"><button type="button" onClick={() => setExpanded(allExpanded ? new Set() : new Set(projectRows.map((row) => row.id)))} className="ml-2 text-xl" aria-label={allExpanded ? "بستن همه زیرمجموعه‌ها" : "باز کردن همه زیرمجموعه‌ها"}>{allExpanded ? "−" : "+"}</button>کد بودجه</th>
            <th className="px-2 text-right">نام بودجه</th><th className="px-2 text-right">بودجه مبنا</th>
            <th className="relative px-2 text-center">عملیات<button type="button" onClick={() => setMenuOpen((open) => !open)} className="absolute left-1 top-1/2 -translate-y-1/2 px-2" aria-label="عملیات بودجه‌های انتخاب‌شده" aria-expanded={menuOpen}>⋮</button>{menuOpen && <div className="absolute left-1 top-full z-20 w-44 rounded-xl border border-black/10 bg-white p-1 text-right shadow-lg dark:border-white/10 dark:bg-neutral-800"><button type="button" disabled={selected.size !== 1} onClick={() => { const row = projectRows.find((item) => selected.has(item.id)); setEditing({ ...row }); setError(""); setMenuOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-right hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-white/10">ویرایش</button><button type="button" disabled={!selected.size} onClick={removeSelected} className="block w-full rounded-lg px-3 py-2 text-right text-red-600 hover:bg-red-50 disabled:opacity-40">حذف</button></div>}</th>
          </tr></thead>
          <tbody>{visibleRows.length ? visibleRows.map((row, index) => <tr key={row.id} className={`h-11 border-t border-black/10 dark:border-white/10 ${index % 2 ? "bg-neutral-50 dark:bg-white/[.03]" : ""}`}>
            <td className="text-center"><input type="checkbox" className={checkboxClass} checked={selected.has(row.id)} onChange={() => setSelected((current) => { const next = new Set(current); next.has(row.id) ? next.delete(row.id) : next.add(row.id); return next; })} aria-label={`انتخاب ${row.name}`} /></td>
            <td className="px-2"><div className="flex items-center gap-2" style={{ paddingRight: Math.min(row.depth, 5) * 24 }}><button type="button" onClick={() => { setAddingUnder(row); setExpanded((current) => new Set(current).add(row.id)); setCode(""); setName(""); }} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-black/15 text-lg dark:border-white/20" title="افزودن زیرمجموعه" aria-label={`افزودن زیرمجموعه به ${row.name}`}>+</button>{(children.get(row.id) || []).length > 0 && <button type="button" onClick={() => setExpanded((current) => { const next = new Set(current); next.has(row.id) ? next.delete(row.id) : next.add(row.id); return next; })} className="text-xs" aria-label={expanded.has(row.id) ? "بستن زیرمجموعه" : "نمایش زیرمجموعه"}>{expanded.has(row.id) ? "▾" : "◂"}</button>}<span dir="ltr" className="font-semibold">{row.code}</span></div></td>
            <td className="px-2 font-semibold">{row.name}</td><td className="px-2">{budgetText(row.baseBudget)}</td><td className="text-center text-neutral-400">—</td>
          </tr>) : <tr><td colSpan={5} className="py-8 text-center text-neutral-500">موردی ثبت نشده است.</td></tr>}</tbody>
        </table>
      </div>
    </div>

    {editing && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setEditing(null)}><form onSubmit={saveEdit} onClick={(event) => event.stopPropagation()} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"><h4 className="font-bold">ویرایش بودجه</h4><label className="block text-sm">کد بودجه<input value={editing.code} onChange={(event) => setEditing({ ...editing, code: event.target.value })} className={fieldClass + " mt-1"} /></label><label className="block text-sm">نام بودجه<input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} className={fieldClass + " mt-1"} /></label><label className="block text-sm">بودجه مبنا<input value={editing.baseBudget} onChange={(event) => setEditing({ ...editing, baseBudget: event.target.value })} className={fieldClass + " mt-1"} inputMode="numeric" /></label>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border px-4 py-2">انصراف</button><button type="submit" className="rounded-xl bg-black px-4 py-2 text-white dark:bg-white dark:text-black">ذخیره</button></div></form></div>}
  </section>;
}
