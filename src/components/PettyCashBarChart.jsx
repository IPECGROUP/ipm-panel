import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const colors = ["#10B981", "#38BDF8", "#6366F1"];
const remainderColor = "#6B7280";
const money = (value) => {
  const absolute = value < 0n ? -value : value;
  const formatted = absolute.toLocaleString("fa-IR");
  return value < 0n ? `(${formatted})` : formatted;
};
const percent = (part, total) => total > 0n
  ? Math.max(0, Math.min(100, Number((part * 1000n) / total) / 10))
  : 0;

export default function PettyCashBarChart({ totals }) {
  const chartData = [
    { label: "تأییدشده", value: totals.approved },
    { label: "ثبت‌شده", value: totals.registered },
    { label: "کل تنخواه‌ها", value: totals.received },
  ].map((item, index) => {
    const height = percent(item.value, totals.received);
    return { ...item, height, remainder: index === 0 && totals.received > 0n ? 100 - height : 0, color: colors[index] };
  });
  const plotData = [...chartData].reverse();

  return <div className="min-w-0 rounded-2xl border border-neutral-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm sm:p-5">
    <div className="mb-5">
      <h3 className="text-sm font-bold text-slate-800">نمای کلی تنخواه</h3>
      <p className="mt-1 text-xs text-slate-500">مقایسه مبلغ‌ها نسبت به کل تنخواه دریافتی</p>
    </div>
    <div role="img" aria-label={chartData.map((item) => `${item.label}: ${money(item.value)} ریال، ${Math.round(item.height).toLocaleString("fa-IR")}٪`).join("، ")} className="h-64 w-full min-w-0 select-none sm:h-72 [&_.recharts-wrapper:focus:not(:focus-visible)]:outline-none" dir="ltr">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={plotData} margin={{ top: 12, right: 8, left: 8, bottom: 4 }} barCategoryGap="28%" accessibilityLayer>
          <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={12} interval={0} tick={({ x, y, payload }) => {
            const item = plotData.find((entry) => entry.label === payload.value);
            return <text x={x} y={y + 4} textAnchor="middle" direction="rtl" fill={item?.color || "#475569"} fontSize={11} fontWeight={700}>
              {item?.label} {Math.round(item?.height || 0).toLocaleString("fa-IR")}٪
            </text>;
          }} />
          <Tooltip cursor={{ fill: "#e2e8f0", fillOpacity: 0.45 }} offset={14} isAnimationActive animationDuration={120} animationEasing="ease-out" wrapperStyle={{ pointerEvents: "none", transition: "transform 120ms ease-out" }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const item = payload[0].payload;
            return <div dir="rtl" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-xs shadow-lg">
              <div className="mb-1 font-semibold text-slate-600">{item.label}</div>
              <div className="flex items-center justify-between gap-4 font-bold tabular-nums" style={{ color: item.color }}><span>{item.label}</span><span>{money(item.value)} ریال</span></div>
              {item.remainder > 0 && <div className="mt-1 flex items-center justify-between gap-4 font-semibold tabular-nums" style={{ color: remainderColor }}><span>باقی‌مانده تأییدنشده ({Math.round(item.remainder).toLocaleString("fa-IR")}٪)</span><span>{money(totals.received - totals.approved)} ریال</span></div>}
            </div>;
          }} />
          <Bar dataKey="height" stackId="total" maxBarSize={70}>
            {plotData.map((item) => <Cell key={item.label} fill={item.color} radius={item.remainder > 0 ? [0, 0, 0, 0] : [8, 8, 0, 0]} />)}
          </Bar>
          <Bar dataKey="remainder" stackId="total" maxBarSize={70} fill={remainderColor} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>;
}
