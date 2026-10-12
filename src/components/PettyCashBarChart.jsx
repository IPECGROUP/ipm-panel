import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const colors = ["#10b981", "#38bdf8", "#6366f1"];
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
  ].map((item, index) => ({ ...item, height: percent(item.value, totals.received), color: colors[index] }));
  const plotData = [...chartData].reverse();

  return <div className="min-w-0 rounded-2xl border border-neutral-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm sm:p-5">
    <div className="mb-5">
      <h3 className="text-sm font-bold text-slate-800">نمای کلی تنخواه</h3>
      <p className="mt-1 text-xs text-slate-500">مقایسه مبلغ‌ها نسبت به کل تنخواه دریافتی</p>
    </div>
    <div role="img" aria-label={chartData.map((item) => `${item.label}: ${money(item.value)} ریال`).join("، ")} className="h-64 w-full min-w-0 sm:h-72" dir="ltr">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={plotData} margin={{ top: 12, right: 8, left: 8, bottom: 4 }} barCategoryGap="28%" accessibilityLayer>
          <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={12} interval={0} tick={{ fill: "#475569", fontSize: 12, fontWeight: 600 }} />
          <Tooltip cursor={{ fill: "#e2e8f0", fillOpacity: 0.45 }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const item = payload[0].payload;
            return <div dir="rtl" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-xs shadow-lg">
              <div className="mb-1 font-semibold text-slate-600">{item.label}</div>
              <div className="font-bold tabular-nums text-slate-900">{money(item.value)} ریال</div>
            </div>;
          }} />
          <Bar dataKey="height" maxBarSize={70} radius={[8, 8, 0, 0]} minPointSize={totals.received > 0n ? 3 : 0}>
            {plotData.map((item) => <Cell key={item.label} fill={item.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-slate-600">
      {chartData.map((item, index) => <span key={item.label} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[index] }} />{item.label} <b className="tabular-nums text-slate-800">{Math.round(item.height).toLocaleString("fa-IR")}٪</b></span>)}
    </div>
  </div>;
}
