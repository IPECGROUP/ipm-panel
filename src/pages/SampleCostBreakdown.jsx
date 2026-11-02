import { useEffect, useMemo, useState } from "react";
import { api } from "../utils/api.js";

export default function SampleCostBreakdown() {
  const [rows, setRows] = useState([]);
  const [templates, setTemplates] = useState([{ id: "execution", name: "نصب و اجرا" }]);
  const [selectedTemplate, setSelectedTemplate] = useState("execution");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());
  const parents = useMemo(() => new Set(rows.map((row) => row.budgetCode).filter((value) => rows.some((row) => row.budgetCode.startsWith(`${value}-`)))), [rows]);
  useEffect(() => {
    let cancelled = false;
    api("/base/sample-cost-structure?list=1").then((data) => {
      if (!cancelled) setTemplates(Array.isArray(data.templates) ? data.templates : []);
    }).catch(() => { if (!cancelled) setError("دریافت فهرست قالب‌ها انجام نشد."); })
      .finally(() => { if (!cancelled) setTemplatesLoading(false); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setRows([]);
    const query = selectedTemplate === "execution" ? "type=execution" : `templateId=${selectedTemplate}`;
    api(`/base/sample-cost-structure?${query}`).then((data) => {
      if (cancelled) return;
      const items = Array.isArray(data.rows) ? data.rows : [];
      setRows(items);
      setExpanded(new Set());
    }).catch(() => { if (!cancelled) setError("دریافت ساختار نمونه انجام نشد. صفحه را دوباره بارگذاری کنید."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedTemplate]);
  const addTemplate = async (event) => {
    event.preventDefault();
    if (!newTemplateName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const result = await api("/base/sample-cost-structure", { method: "POST", body: JSON.stringify({ action: "create_template", name: newTemplateName.trim() }) });
      setTemplates((current) => [...current, result.template]);
      setSelectedTemplate(result.template.id);
      setNewTemplateName("");
      setCode(""); setName("");
    } catch (reason) {
      setError(reason.message === "duplicate_name" ? "این نام قالب قبلاً ثبت شده است." : "ثبت قالب انجام نشد. دوباره تلاش کنید.");
    } finally { setSaving(false); }
  };
  const addRow = async (event) => {
    event.preventDefault();
    const normalized = code.trim().replace(/[۰-۹٠-٩]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit) >= 0 ? "۰۱۲۳۴۵۶۷۸۹".indexOf(digit) : "٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
    const budgetCode = normalized.startsWith("159-") ? normalized : `159-${normalized}`;
    if (!/^159(?:-\d+)+$/.test(budgetCode) || !name.trim()) { setError("کد بودجه معتبر و نام بودجه را وارد کنید."); return; }
    setSaving(true);
    setError("");
    try {
      const result = await api("/base/sample-cost-structure", { method: "POST", body: JSON.stringify({ type: "execution", templateId: selectedTemplate === "execution" ? null : selectedTemplate, budgetCode, budgetName: name.trim() }) });
      setRows((current) => [...current, result.item]);
      setExpanded((current) => { const next = new Set(current); const parts = budgetCode.split("-"); for (let i = 2; i < parts.length; i++) next.add(parts.slice(0, i).join("-")); return next; });
      setCode(""); setName("");
    } catch (reason) {
      setError(reason.message === "duplicate_code" || reason.message === "duplicate_code_or_template_not_found" ? "این کد بودجه قبلاً در قالب ثبت شده است." : "ثبت ردیف انجام نشد. دوباره تلاش کنید.");
    } finally { setSaving(false); }
  };
  const toggle = (code) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(code)) next.delete(code); else next.add(code);
    return next;
  });
  const visibleRows = rows.slice().sort((a, b) => a.budgetCode.localeCompare(b.budgetCode, "en", { numeric: true })).filter((row) => {
    const parts = row.budgetCode.split("-");
    return parts.slice(2).every((_, index) => { const parent = parts.slice(0, index + 2).join("-"); return !parents.has(parent) || expanded.has(parent); });
  });

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
      <h2 className="text-sm font-bold">ساختار نمونه شکست هزینه‌ها</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,2fr)] md:items-stretch">
        <form onSubmit={addTemplate} className="rounded-xl border border-black/10 p-2 dark:border-white/10">
          <label htmlFor="new-sample-template" className="block text-sm">نام نوع پروژه جدید</label>
          <div className="mt-1 flex gap-2"><input id="new-sample-template" value={newTemplateName} onChange={(event) => setNewTemplateName(event.target.value)} disabled={saving} maxLength={100} className="h-10 min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 dark:border-white/10 dark:bg-neutral-900" /><button type="submit" disabled={saving || !newTemplateName.trim()} className="h-10 rounded-xl border border-[#184a6b] px-4 text-sm font-bold text-[#184a6b] disabled:opacity-40 dark:text-[#8fc4e3]">افزودن</button></div>
        </form>
        <div className="rounded-xl border border-black/10 p-2 dark:border-white/10">
          {templatesLoading ? <div className="h-[60px] animate-pulse rounded-xl bg-neutral-100 dark:bg-white/10" aria-label="در حال دریافت نوع پروژه‌ها" /> : <label className="flex flex-col gap-1 text-sm">نوع پروژه<select value={selectedTemplate} disabled={saving} onChange={(event) => { setSelectedTemplate(event.target.value); setCode(""); setName(""); }} className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-neutral-900">{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>}
        </div>
        <form onSubmit={addRow} className="grid gap-2 rounded-xl border border-black/10 p-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] sm:items-end dark:border-white/10">
          <label className="flex min-w-0 flex-col gap-1 text-sm">کد بودجه<input value={code} onChange={(event) => setCode(event.target.value)} disabled={loading || saving} dir="ltr" maxLength={80} className="h-10 min-w-0 rounded-xl border border-black/10 bg-white px-3 dark:border-white/10 dark:bg-white/5" /></label>
          <label className="flex min-w-0 flex-col gap-1 text-sm">نام بودجه<span className="flex gap-2"><input value={name} onChange={(event) => setName(event.target.value)} disabled={loading || saving} maxLength={255} className="h-10 min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 dark:border-white/10 dark:bg-white/5" /><button type="submit" disabled={loading || saving || !code.trim() || !name.trim()} aria-label="افزودن به ساختار نمونه" title="افزودن به جدول" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 disabled:opacity-40 dark:border-white/20"><img src="/images/icons/afzodan.svg" alt="" className="h-5 w-5" /></button></span></label>
        </form>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {loading && <p className="mt-3 text-sm text-neutral-500">در حال دریافت ساختار نمونه...</p>}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
        <table className="w-full min-w-[700px] text-right text-sm">
          <thead className="bg-neutral-200 dark:bg-white/10"><tr><th className="w-52 px-3 py-3">کد بودجه</th><th className="px-3 py-3">نام بودجه</th></tr></thead>
          <tbody>
            {visibleRows.map((row) => {
              const hasChildren = parents.has(row.budgetCode);
              return <tr key={row.budgetCode} className="border-t border-black/10 odd:bg-white even:bg-neutral-50 dark:border-white/10 dark:odd:bg-neutral-900 dark:even:bg-neutral-800/50">
                <td className="whitespace-nowrap px-3 py-2"><span style={{ paddingRight: `${Math.max(0, row.budgetCode.split('-').length - 2) * 16}px` }} className="inline-flex items-center gap-2">{hasChildren ? <button type="button" onClick={() => toggle(row.budgetCode)} aria-expanded={expanded.has(row.budgetCode)} aria-label={`${expanded.has(row.budgetCode) ? 'بستن' : 'باز کردن'} زیرمجموعه ${row.budgetCode}`} className="grid h-7 w-7 place-items-center rounded-lg border border-black/15 dark:border-white/20">{expanded.has(row.budgetCode) ? '−' : '+'}</button> : <span className="w-7" />}<span dir="ltr">{row.budgetCode}</span></span></td>
                <td className={`px-3 py-2 ${hasChildren ? 'font-semibold' : ''}`}>{row.budgetName}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
