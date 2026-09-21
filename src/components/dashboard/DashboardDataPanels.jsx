import React from "react";
import Card from "../ui/Card.jsx";

const faNumber = (value, digits = 0) => Number(value || 0).toLocaleString("fa-IR", {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
});

export function RankingPanel({ title, subtitle, rows = [], emptyText = "داده‌ای برای نمایش وجود ندارد" }) {
  return (
    <Card className="min-h-[250px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span><span className="block text-sm font-bold">{title}</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">{subtitle}</span></span>
      </div>
      <div className="space-y-2">
        {rows.length ? rows.map((row, index) => (
          <div key={row.key || row.label} className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-white/[0.045]">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[11px] font-bold text-neutral-500 shadow-sm dark:bg-neutral-800 dark:text-neutral-300">{faNumber(index + 1)}</span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium">{row.label}</span>
            <span className="shrink-0 text-xs font-bold tabular-nums text-neutral-700 dark:text-neutral-200">{faNumber(row.value)}</span>
          </div>
        )) : <div className="py-12 text-center text-xs text-neutral-400">{emptyText}</div>}
      </div>
    </Card>
  );
}

export function AveragePanel({ averages }) {
  const items = [["ماه", averages?.month], ["هفته", averages?.week], ["روز", averages?.day]];
  return (
    <Card className="relative min-h-[250px] rounded-2xl border-neutral-200 p-4 text-right shadow-none dark:border-neutral-800">
      <div><span className="block text-sm font-bold">میانگین ثبت اسناد</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">بر اساس کل دورهٔ ثبت اسناد</span></div>
      <div className="absolute inset-x-4 top-1/2 mx-auto grid max-w-md -translate-y-1/2 grid-cols-3 gap-2">
        {items.map(([label, value], index) => <div key={label} className="rounded-2xl border border-black/[0.06] bg-neutral-50 px-2 py-5 text-center dark:border-white/[0.08] dark:bg-white/[0.045]"><span className={`mx-auto mb-3 block h-1.5 w-9 rounded-full ${["bg-indigo-500", "bg-emerald-500", "bg-amber-500"][index]}`} /><span className="block text-xl font-bold tabular-nums">{faNumber(value, 1)}</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">در {label}</span></div>)}
      </div>
    </Card>
  );
}

export function ProjectDocumentsPanel({ rows = [], className = "" }) {
  return (
    <Card className={`min-h-[420px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800 ${className}`}>
      <div className="mb-4"><span className="block text-sm font-bold">اسناد پروژه‌های فعال</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">تفکیک اسناد وارده، صادره و داخلی</span></div>
      <div className="max-h-[370px] overflow-auto rounded-xl border border-black/[0.07] dark:border-white/[0.08]"><table className="w-full min-w-[490px] text-right text-xs"><thead className="sticky top-0 bg-neutral-50 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300"><tr><th className="px-3 py-2.5 font-medium">پروژه</th><th className="px-3 py-2.5 text-center font-medium">وارده</th><th className="px-3 py-2.5 text-center font-medium">صادره</th><th className="px-3 py-2.5 text-center font-medium">داخلی</th><th className="px-3 py-2.5 text-center font-medium">کل</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id} className="border-t border-black/[0.06] dark:border-white/[0.08]"><td className="max-w-[260px] truncate px-3 py-3 font-medium">{row.label}</td><td className="px-3 py-3 text-center tabular-nums">{faNumber(row.incoming)}</td><td className="px-3 py-3 text-center tabular-nums">{faNumber(row.outgoing)}</td><td className="px-3 py-3 text-center tabular-nums">{faNumber(row.internal)}</td><td className="px-3 py-3 text-center font-bold tabular-nums">{faNumber(row.total)}</td></tr>) : <tr><td colSpan="5" className="px-3 py-20 text-center text-neutral-400">پروژهٔ فعالی برای نمایش وجود ندارد</td></tr>}</tbody></table></div>
    </Card>
  );
}
