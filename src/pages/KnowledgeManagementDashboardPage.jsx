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

function LessonAuthorsChart({ lessons }) {
  const rows = lessons.byAuthor || [];
  const total = Number(lessons.total || 0);
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
  const height = Math.max(240, Math.max(...sides.map((side) => side.length)) * 30 + 30);
  const cx = 260, cy = height / 2, radius = 90;
  const labels = sides.flatMap((sideRows) => sideRows.map((slice, index) => ({ ...slice, labelY: cy + (index - (sideRows.length - 1) / 2) * Math.min(30, (height - 30) / Math.max(1, sideRows.length - 1)) })));
  const point = (angle, distance) => [cx + distance * Math.cos(angle), cy + distance * Math.sin(angle)];
  return <Panel title="خلاصه درس‌آموخته‌ها" subtitle="سهم هر کاربر از درس‌آموخته‌های تأییدشده">
    <p className="text-center text-xs font-bold">کل درس‌آموخته‌ها: {fa(total)}</p>
    {rows.length && total ? <div className="w-full overflow-x-auto"><svg viewBox={`0 0 520 ${height}`} className="mx-auto block w-full min-w-[440px]" role="img" aria-label={`سهم کاربران از ${fa(total)} درس‌آموخته`}>
      {slices.map((slice) => {
        const [x1, y1] = point(slice.start, radius);
        const [x2, y2] = point(slice.end, radius);
        return slice.share >= 1 ? <circle key={slice.id} cx={cx} cy={cy} r={radius} fill={slice.color} /> : <path key={slice.id} d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${slice.share > 0.5 ? 1 : 0} 1 ${x2} ${y2} Z`} fill={slice.color} />;
      })}
      {labels.map((slice) => {
        const [x1, y1] = point(slice.angle, radius);
        const [x2, y2] = point(slice.angle, radius + 12);
        const lineEnd = cx + slice.side * 123;
        return <g key={slice.id}><path d={`M ${x1} ${y1} L ${x2} ${y2} L ${lineEnd} ${slice.labelY}`} fill="none" stroke={slice.color} strokeWidth="1.2" /><foreignObject x={slice.side > 0 ? lineEnd + 4 : 0} y={slice.labelY - 12} width="133" height="24"><div xmlns="http://www.w3.org/1999/xhtml" dir="rtl" title={`${slice.name}: ${fa(slice.count)} (${fa(Math.round(slice.share * 100))}٪)`} className="truncate text-[11px] text-neutral-700 dark:text-neutral-200" style={{ textAlign: slice.side > 0 ? "left" : "right" }}>{slice.name} ({fa(slice.count)})</div></foreignObject></g>;
      })}
    </svg></div> : <p className="py-16 text-center text-xs text-neutral-400">درس‌آموخته‌ای ثبت نشده است.</p>}
  </Panel>;
}

export function KnowledgeDashboardWidgets({ data }) {
  const lessons = data?.lessons || {};
  const resources = data?.resources || {};
  const resourceVisits = data?.visits?.training || [];
  const lessonVisits = data?.visits?.lessons || [];
  const maxTrainingVisits = resourceVisits.reduce((sum, row) => sum + Number(row.count || 0), 0);
  return <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
    <LessonAuthorsChart lessons={lessons} />
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
