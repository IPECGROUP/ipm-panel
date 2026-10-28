import { useMemo, useState } from "react";
import sample from "../data/sampleCostBreakdown.json";

export default function SampleCostBreakdown() {
  const parents = useMemo(() => new Set(sample.rows.map((row) => row.budgetCode).filter((code) => sample.rows.some((row) => row.budgetCode.startsWith(`${code}-`)))), []);
  const [expanded, setExpanded] = useState(() => new Set(parents));
  const toggle = (code) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(code)) next.delete(code); else next.add(code);
    return next;
  });
  const visibleRows = sample.rows.filter((row) => {
    const parts = row.budgetCode.split("-");
    return parts.slice(2).every((_, index) => expanded.has(parts.slice(0, index + 2).join("-")));
  });

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
      <h2 className="text-sm font-bold">ساختار نمونه شکست هزینه‌ها</h2>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">نسخه ثابت و فقط‌خواندنی پروژه ۱۵۹</p>
      <div className="mt-4 grid gap-3 md:grid-cols-[1.15fr_0.65fr_1.45fr]">
        <label className="flex flex-col gap-1 text-sm">پروژه<input readOnly value={sample.project} className="h-10 rounded-xl border border-black/10 bg-neutral-50 px-3 text-sm dark:border-white/10 dark:bg-white/5" /></label>
        <label className="flex flex-col gap-1 text-sm">کد بودجه<input readOnly value="" className="h-10 rounded-xl border border-black/10 bg-neutral-50 px-3 dark:border-white/10 dark:bg-white/5" /></label>
        <label className="flex flex-col gap-1 text-sm">نام بودجه<input readOnly value="" className="h-10 rounded-xl border border-black/10 bg-neutral-50 px-3 dark:border-white/10 dark:bg-white/5" /></label>
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
        <table className="w-full min-w-[700px] text-right text-sm">
          <thead className="bg-neutral-200 dark:bg-white/10"><tr><th className="w-52 px-3 py-3">کد بودجه</th><th className="px-3 py-3">نام بودجه</th><th className="w-40 px-3 py-3">بودجه مبنا</th></tr></thead>
          <tbody>
            {visibleRows.map((row) => {
              const hasChildren = parents.has(row.budgetCode);
              return <tr key={row.budgetCode} className="border-t border-black/10 odd:bg-white even:bg-neutral-50 dark:border-white/10 dark:odd:bg-neutral-900 dark:even:bg-neutral-800/50">
                <td className="whitespace-nowrap px-3 py-2"><span style={{ paddingRight: `${Math.max(0, row.budgetCode.split('-').length - 2) * 16}px` }} className="inline-flex items-center gap-2">{hasChildren ? <button type="button" onClick={() => toggle(row.budgetCode)} aria-expanded={expanded.has(row.budgetCode)} aria-label={`${expanded.has(row.budgetCode) ? 'بستن' : 'باز کردن'} زیرمجموعه ${row.budgetCode}`} className="grid h-7 w-7 place-items-center rounded-lg border border-black/15 dark:border-white/20">{expanded.has(row.budgetCode) ? '−' : '+'}</button> : <span className="w-7" />}<span dir="ltr">{row.budgetCode}</span></span></td>
                <td className={`px-3 py-2 ${hasChildren ? 'font-semibold' : ''}`}>{row.budgetName}</td>
                <td className="px-3 py-2 tabular-nums">{Number(row.baseBudget || 0).toLocaleString('fa-IR')}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
