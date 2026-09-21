import React, { useMemo } from "react";
import Card from "../ui/Card.jsx";

const METRIC_COLORS = {
  total: "#64748b",
  incoming: "#3b82f6",
  outgoing: "#f59e0b",
  internal: "#22c55e",
  confidential: "#ef4444",
};

function donutBackground(items) {
  const segments = items.filter((item) => ["incoming", "outgoing", "internal"].includes(item.key));
  const sum = segments.reduce((total, item) => total + Number(item.value || 0), 0);
  if (!sum) return "conic-gradient(#e5e7eb 0deg 360deg)";

  let cursor = 0;
  const stops = segments.map((item) => {
    const next = cursor + (Number(item.value || 0) / sum) * 360;
    const stop = `${METRIC_COLORS[item.key]} ${cursor}deg ${next}deg`;
    cursor = next;
    return stop;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

/**
 * Reusable dashboard statistic panel. Its consumer supplies only the metric
 * data; the right-aligned legend and donut presentation are shared.
 */
export default function StatisticsPanel({ title, caption, items = [], className = "" }) {
  const total = Number(items.find((item) => item.key === "total")?.value || 0);
  const donut = useMemo(() => donutBackground(items), [items]);

  return (
    <Card className={`min-h-[250px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800 ${className}`}>
      <div className="mb-4">
        <span className="block text-sm font-bold">{title}</span>
        {caption ? <span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">{caption}</span> : null}
      </div>

      <div className="flex min-h-[178px] flex-col-reverse items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full space-y-1.5 sm:min-w-0 sm:flex-1">
          {items.map((item) => {
            const value = Number(item.value || 0);
            const share = total ? Math.round((value / total) * 100) : 0;
            return (
              <div key={item.key || item.label} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-neutral-50 dark:hover:bg-white/[0.04]">
                <span className="flex min-w-0 items-center gap-2 text-neutral-600 dark:text-neutral-300">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: METRIC_COLORS[item.key] || METRIC_COLORS.total }} />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 whitespace-nowrap font-bold tabular-nums text-neutral-900 dark:text-white">
                  {value.toLocaleString("fa-IR")} <span className="text-[10px] font-medium text-neutral-400">({share.toLocaleString("fa-IR")}٪)</span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: donut }} role="img" aria-label={`${title}: ${total.toLocaleString("fa-IR")} سند`}>
          <div className="grid h-[92px] w-[92px] place-items-center rounded-full bg-white text-center shadow-inner dark:bg-neutral-900">
            <span>
              <span className="block text-2xl font-bold leading-none tabular-nums">{total.toLocaleString("fa-IR")}</span>
              <span className="mt-1 block text-[10px] text-neutral-500 dark:text-neutral-400">سند</span>
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
