import React, { useState } from "react";
import { Plus } from "lucide-react";
import Card from "../components/ui/Card.jsx";

const inputClass = "h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-[#184a6b] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100";

// This screen is intentionally presentation-only. It has no API calls or persistence.
export default function FinancialCommitmentsPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ project: "", reference: "", subject: "", amount: "" });

  const addRow = () => {
    if (!form.subject.trim()) return;
    setRows((current) => [...current, { ...form, id: `${Date.now()}-${Math.random()}` }]);
    setForm((current) => ({ ...current, reference: "", subject: "", amount: "" }));
  };

  return (
    <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
      <div className="p-3 md:p-4">
        <div className="mb-4 flex min-w-0 items-center gap-3 border-b border-black/[0.07] pb-3 dark:border-white/10 sm:mb-5 sm:pb-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
            <span aria-hidden="true" className="h-6 w-6 bg-[#184a6b] dark:bg-[#8fc4e3]" style={{ WebkitMask: "url(/images/icons/masaref-mali.svg) center / contain no-repeat", mask: "url(/images/icons/masaref-mali.svg) center / contain no-repeat" }} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold text-[#184a6b] dark:text-[#8fc4e3] md:text-lg">تعهدات و مصارف مالی</span>
            <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت پروژه</span>
          </span>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white dark:bg-neutral-900 dark:border-neutral-800">
          <div className="px-[15px] py-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1.15fr)_minmax(130px,0.65fr)_minmax(220px,1.25fr)_minmax(180px,0.9fr)_auto] md:items-end">
              <label className="flex min-w-0 flex-col gap-1"><span className="text-sm text-neutral-700 dark:text-neutral-300">پروژه</span><select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} className={inputClass}><option value="">انتخاب کنید</option></select></label>
              <label className="flex min-w-0 flex-col gap-1"><span className="text-sm text-neutral-700 dark:text-neutral-300">شماره سند</span><input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className={inputClass} /></label>
              <label className="flex min-w-0 flex-col gap-1"><span className="text-sm text-neutral-700 dark:text-neutral-300">شرح تعهد / مصرف</span><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputClass} placeholder="شرح مورد" /></label>
              <label className="flex min-w-0 flex-col gap-1"><span className="text-sm text-neutral-700 dark:text-neutral-300">مبلغ (ریال)</span><input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass} inputMode="numeric" /></label>
              <button type="button" onClick={addRow} className="grid h-10 w-10 place-items-center rounded-xl border border-[#f48120] bg-[#f48120] text-white transition hover:bg-[#d97018]" aria-label="افزودن به جدول" title="افزودن به جدول"><Plus aria-hidden="true" className="h-5 w-5" strokeWidth={2.5} /></button>
            </div>
          </div>

          <div className="px-[15px] pb-4">
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
              <div className="overflow-x-auto">
                <table dir="rtl" className="w-full min-w-[720px] table-fixed text-sm [&_th]:py-2 [&_td]:py-2">
                  <colgroup><col style={{ width: 64 }} /><col style={{ width: 180 }} /><col /><col style={{ width: 190 }} /><col style={{ width: 160 }} /></colgroup>
                  <thead className="border-b border-[#184a6b] bg-[#184a6b] text-white"><tr><th className="text-center font-semibold">ردیف</th><th className="px-3 text-right font-semibold">شماره سند</th><th className="px-3 text-right font-semibold">شرح تعهد / مصرف</th><th className="px-3 text-right font-semibold">پروژه</th><th className="px-3 text-right font-semibold">مبلغ (ریال)</th></tr></thead>
                  <tbody className="[&_td]:text-black dark:[&_td]:text-neutral-100 [&_tr:nth-child(odd)]:bg-white [&_tr:nth-child(even)]:bg-neutral-50 dark:[&_tr:nth-child(odd)]:bg-neutral-900 dark:[&_tr:nth-child(even)]:bg-neutral-800/50">
                    {rows.length ? rows.map((row, index) => <tr key={row.id} className="border-b border-neutral-300 dark:border-neutral-700"><td className="px-3 text-center">{index + 1}</td><td className="px-3">{row.reference || "—"}</td><td className="px-3">{row.subject}</td><td className="px-3">{row.project || "—"}</td><td className="px-3">{row.amount || "—"}</td></tr>) : <tr><td colSpan={5} className="py-6 text-center text-black/60 dark:text-neutral-400">موردی برای نمایش وجود ندارد.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
