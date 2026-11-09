import React, { useEffect, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../components/AuthProvider.jsx";

const fa = (value) => Number(value || 0).toLocaleString("fa-IR");
const importanceLabels = { low: "کم", medium: "متوسط", high: "زیاد" };

function Panel({ title, subtitle, children, className = "" }) {
  return <Card className={`min-h-[210px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800 ${className}`}><div className="mb-4"><h2 className="text-sm font-bold">{title}</h2>{subtitle && <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{subtitle}</p>}</div>{children}</Card>;
}
function Rows({ rows, empty = "داده‌ای ثبت نشده است.", transform = (row) => row.label }) {
  return <div className="space-y-2">{rows?.length ? rows.map((row, index) => <div key={`${row.id || row.label}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 text-xs dark:bg-white/[0.045]"><span className="min-w-0 truncate">{transform(row)}</span><span className="shrink-0 font-bold tabular-nums">{fa(row.count)}</span></div>) : <div className="grid min-h-28 place-items-center text-xs text-neutral-400">{empty}</div>}</div>;
}
function TopUsers({ rows }) { return <Rows rows={rows} empty="مراجعه‌ای ثبت نشده است." transform={(row) => row.name} />; }

export function ShareChart({ rows, total, totalLabel, unit, empty, showValues = true, large = false }) {
  const [activeId, setActiveId] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const moveTooltip = (x, y) => setTooltipPosition({ x: Math.max(8, Math.min(x + 14, window.innerWidth - 200)), y: Math.max(8, Math.min(y + 14, window.innerHeight - 76)) });
  const colors = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6", "#ec4899", "#6366f1"];
  let cursor = 0;
  const slices = rows.map((row, index) => {
    const share = total ? Number(row.count) / total : 0;
    const start = cursor * 2 * Math.PI - Math.PI / 2;
    cursor += share;
    const end = cursor * 2 * Math.PI - Math.PI / 2;
    const angle = (start + end) / 2;
    return { ...row, share, start, end, angle, color: colors[index % colors.length], side: Math.cos(angle) >= 0 ? 1 : -1 };
  });
  const sides = [-1, 1].map((side) => slices.filter((slice) => slice.side === side).sort((a, b) => Math.sin(a.angle) - Math.sin(b.angle)));
  const height = Math.max(large ? 350 : 280, Math.max(...sides.map((side) => side.length)) * 30 + 30);
  const cx = 290, cy = height / 2, radius = large ? 145 : 110;
  const labels = sides.flatMap((sideRows) => {
    const positions = sideRows.map((slice) => Math.max(15, Math.min(height - 15, cy + Math.sin(slice.angle) * (radius + 20))));
    for (let i = 1; i < positions.length; i++) positions[i] = Math.max(positions[i], positions[i - 1] + 24);
    if (positions.length && positions[positions.length - 1] > height - 15) {
      positions[positions.length - 1] = height - 15;
      for (let i = positions.length - 2; i >= 0; i--) positions[i] = Math.min(positions[i], positions[i + 1] - 24);
    }
    return sideRows.map((slice, index) => ({ ...slice, labelY: positions[index] }));
  });
  const point = (angle, distance) => [cx + distance * Math.cos(angle), cy + distance * Math.sin(angle)];
  const active = slices.find((slice) => slice.id === activeId);
  return <>
    <p className="text-center text-xs font-bold">{totalLabel}: {fa(total)} {unit === "ریال" ? unit : ""}</p>
    {rows.length && total ? <div className={`relative w-full max-h-[400px] overflow-y-auto ${large ? "mt-5" : ""}`}><svg viewBox={`0 0 580 ${height}`} className="mx-auto block w-full" role="img" aria-label={`${totalLabel}: ${fa(total)} ${unit}`}>
      {slices.map((slice) => {
        const [x1, y1] = point(slice.start, radius);
        const [x2, y2] = point(slice.end, radius);
        const [countX, countY] = point(slice.angle, radius * 0.62);
        const selected = activeId === slice.id;
        return <g key={slice.id} tabIndex={0} role="button" aria-label={`${slice.name}، ${fa(slice.count)} ${unit}`} onMouseEnter={(event) => { setActiveId(slice.id); moveTooltip(event.clientX, event.clientY); }} onMouseMove={(event) => moveTooltip(event.clientX, event.clientY)} onMouseLeave={() => setActiveId(null)} onFocus={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setActiveId(slice.id); moveTooltip(rect.left + rect.width / 2, rect.top + rect.height / 2); }} onBlur={() => setActiveId(null)} style={{ cursor: "pointer", transform: selected ? `translate(${Math.cos(slice.angle) * 7}px, ${Math.sin(slice.angle) * 7}px)` : "translate(0px, 0px)", transition: "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1), filter 220ms", filter: selected ? "drop-shadow(0px 5px 5px rgba(0,0,0,0.25))" : "none" }}>
          {slice.share >= 1 ? <circle cx={cx} cy={cy} r={radius} fill={slice.color} /> : <path d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${slice.share > 0.5 ? 1 : 0} 1 ${x2} ${y2} Z`} fill={slice.color} />}
          {(showValues || slice.share >= 0.06) && <text x={countX} y={countY} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="14" fontWeight="bold" pointerEvents="none">{showValues ? fa(slice.count) : `${fa(Math.round(slice.share * 100))}٪`}</text>}
        </g>;
      })}
      {labels.map((slice) => {
        const [x1, y1] = point(slice.angle, radius);
        const [x2, y2] = point(slice.angle, radius + 12);
        const lineEnd = cx + slice.side * (radius + 33);
        const elbow = cx + slice.side * (radius + 20);
        const labelWidth = cx - radius - 37;
        return <g key={slice.id} pointerEvents="none"><path d={`M ${x1} ${y1} L ${x2} ${y2} L ${elbow} ${slice.labelY} L ${lineEnd} ${slice.labelY}`} fill="none" stroke={slice.color} strokeWidth="1.2" /><foreignObject x={slice.side > 0 ? lineEnd + 4 : 0} y={slice.labelY - 12} width={labelWidth} height="24"><div xmlns="http://www.w3.org/1999/xhtml" dir="rtl" className="truncate text-[12px] text-neutral-700 dark:text-neutral-200" style={{ textAlign: slice.side > 0 ? "left" : "right" }}>{slice.name}</div></foreignObject></g>;
      })}
    </svg>{active && <div role="tooltip" style={{ left: tooltipPosition.x, top: tooltipPosition.y }} className="pointer-events-none fixed z-50 max-w-[190px] rounded-xl border border-neutral-200 bg-white px-4 py-2 text-center text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-800"><span className="block font-bold">{active.name}</span><span className="mt-1 block whitespace-nowrap text-neutral-500 dark:text-neutral-300">{fa(active.count)} {unit} ({fa(Math.round(active.share * 100))}٪)</span></div>}</div> : <p className="py-16 text-center text-xs text-neutral-400">{empty}</p>}
  </>;
}

export function KnowledgeDashboardWidgets({ data }) {
  const lessons = data?.lessons || {};
  const resources = data?.resources || {};
  const resourceVisits = data?.visits?.training || [];
  const lessonVisits = data?.visits?.lessons || [];
  const maxTrainingVisits = resourceVisits.reduce((sum, row) => sum + Number(row.count || 0), 0);
  return <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
    <Panel title="خلاصه درس‌آموخته‌ها" subtitle="سهم هر کاربر از درس‌آموخته‌های تأییدشده"><ShareChart rows={lessons.byAuthor || []} total={Number(lessons.total || 0)} totalLabel="کل درس‌آموخته‌ها" unit="درس‌آموخته" empty="درس‌آموخته‌ای ثبت نشده است." /></Panel>
    <Panel title="درس‌آموخته‌ها بر اساس اهمیت"><Rows rows={lessons.byImportance} transform={(row) => importanceLabels[row.label] || row.label} /></Panel>
    <Panel title="۳ کاربر برتر مراجعه به درس‌آموخته‌ها"><TopUsers rows={lessonVisits} /></Panel>
    <Panel title="مستندات به تفکیک کتابخانه"><Rows rows={data?.libraries} /></Panel>
    <Panel title="منابع آموزشی بر اساس دسته‌بندی" subtitle={`مجموع مراجعه به منابع آموزشی: ${fa(maxTrainingVisits)}`}><Rows rows={resources.byCategory} /></Panel>
    <Panel title="۳ کاربر برتر مراجعه به منابع آموزشی"><TopUsers rows={resourceVisits} /></Panel>
  </div>;
}

export default function KnowledgeManagementDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetch("/api/knowledge-dashboard", { credentials: "include", headers: { "x-user-id": String(user.id) } })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const lessons = data?.lessons || {};
  const resources = data?.resources || {};
  const resourceVisits = data?.visits?.training || [];
  const lessonVisits = data?.visits?.lessons || [];
  const maxTrainingVisits = resourceVisits.reduce((sum, row) => sum + Number(row.count || 0), 0);

  return <div className="mx-auto w-full max-w-[1440px] text-neutral-900 dark:text-neutral-100" dir="rtl"><Card className="rounded-2xl border border-neutral-200 bg-white p-7 shadow-none md:p-8 dark:border-neutral-800 dark:bg-neutral-900"><div className="mb-5 flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]"><img src="/images/icons/dashboard-12.svg" alt="" className="h-6 w-6 dark:invert" /></span><span><h1 className="text-base font-bold md:text-lg">داشبورد مدیریت دانش</h1><p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">نمای کلی درس‌آموخته‌ها، کتابخانه‌ها و منابع آموزشی</p></span></div>
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
      <Panel title="خلاصه درس‌آموخته‌ها" subtitle="دانش ثبت‌شده و دانش‌آفرینان" className="xl:col-span-1"><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-sky-50 p-4 text-center dark:bg-sky-500/10"><b className="block text-2xl">{fa(lessons.total)}</b><span className="mt-1 block text-xs text-neutral-500">کل درس‌آموخته‌ها</span></div><div className="rounded-2xl bg-emerald-50 p-4 text-center dark:bg-emerald-500/10"><b className="block text-2xl">{fa(lessons.authors)}</b><span className="mt-1 block text-xs text-neutral-500">کل دانش‌آفرینان</span></div></div><h3 className="mt-4 text-xs font-bold">۳ نفر برتر تولید دانش</h3><div className="mt-2"><TopUsers rows={lessons.topAuthors} /></div></Panel>
      <Panel title="درس‌آموخته‌ها به تفکیک پروژه"><Rows rows={lessons.byProject} /></Panel>
      <Panel title="درس‌آموخته‌ها بر اساس دسته‌بندی"><Rows rows={lessons.byCategory} /></Panel>
      <Panel title="درس‌آموخته‌ها بر اساس اهمیت"><Rows rows={lessons.byImportance} transform={(row) => importanceLabels[row.label] || row.label} /></Panel>
      <Panel title="۳ کاربر برتر مراجعه به درس‌آموخته‌ها"><TopUsers rows={lessonVisits} /></Panel>
      <Panel title="مستندات به تفکیک کتابخانه"><Rows rows={data?.libraries} /></Panel>
      <Panel title="منابع آموزشی بر اساس دسته‌بندی" subtitle={`مجموع مراجعه به منابع آموزشی: ${fa(maxTrainingVisits)}`}><Rows rows={resources.byCategory} /></Panel>
      <Panel title="۳ کاربر برتر مراجعه به منابع آموزشی"><TopUsers rows={resourceVisits} /></Panel>
    </div>
  </Card></div>;
}
