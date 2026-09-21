import React from "react";
import Card from "../ui/Card.jsx";

const toneStyles = {
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
};

/**
 * Reusable summary panel. Pages supply only their title and metric values;
 * the dashboard presentation stays consistent across the application.
 */
export default function StatisticsPanel({ title, caption, items = [], tone = "indigo", className = "" }) {
  const toneClass = toneStyles[tone] || toneStyles.indigo;

  return (
    <Card className={`min-h-[238px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <span>
          <span className="block text-sm font-bold">{title}</span>
          {caption ? <span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">{caption}</span> : null}
        </span>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${toneClass}`} aria-hidden="true">
          {Number(items.find((item) => item.key === "total")?.value || 0).toLocaleString("fa-IR")}
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.key || item.label} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2 text-xs dark:bg-white/[0.045]">
            <span className="min-w-0 truncate text-neutral-600 dark:text-neutral-300">{item.label}</span>
            <span className="shrink-0 font-bold tabular-nums text-neutral-900 dark:text-white">
              {Number(item.value || 0).toLocaleString("fa-IR")}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
