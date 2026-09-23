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

  return <div className="mx-auto w-full max-w-[1440px] text-neutral-900 dark:text-neutral-100" dir="rtl"><Card className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-none dark:border-neutral-800 dark:bg-neutral-900 sm:p-5"><div className="mb-5 flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]"><img src="/images/icons/dashboard-12.svg" alt="" className="h-6 w-6 dark:invert" /></span><span><h1 className="text-base font-bold md:text-lg">داشبورد مدیریت دانش</h1><p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">نمای کلی درس‌آموخته‌ها، کتابخانه‌ها و منابع آموزشی</p></span></div>
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
      <Panel title="خلاصه درس‌آموخته‌ها" subtitle="دانش ثبت‌شده و دانش‌آفرینان" className="xl:col-span-1"><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-sky-50 p-4 text-center dark:bg-sky-500/10"><b className="block text-2xl">{fa(lessons.total)}</b><span className="mt-1 block text-xs text-neutral-500">کل درس‌آموخته‌ها</span></div><div className="rounded-2xl bg-emerald-50 p-4 text-center dark:bg-emerald-500/10"><b className="block text-2xl">{fa(lessons.authors)}</b><span className="mt-1 block text-xs text-neutral-500">کل دانش‌آفرینان</span></div></div><h3 className="mt-4 text-xs font-bold">۳ نفر برتر تولید دانش</h3><div className="mt-2"><TopUsers rows={lessons.topAuthors} /></div></Panel>
      <Panel title="درس‌آموخته‌ها به تفکیک پروژه"><Rows rows={lessons.byProject} /></Panel>
      <Panel title="درس‌آموخته‌ها بر اساس دسته‌بندی"><Rows rows={lessons.byCategory} /></Panel>
      <Panel title="درس‌آموخته‌ها بر اساس اهمیت"><Rows rows={lessons.byImportance} transform={(row) => importanceLabels[row.label] || row.label} /></Panel>
      <Panel title="۳ کاربر برتر مراجعه به درس‌آموخته‌ها" subtitle="هر ورود به صفحه ثبت می‌شود"><TopUsers rows={lessonVisits} /></Panel>
      <Panel title="مستندات به تفکیک کتابخانه"><Rows rows={data?.libraries} /></Panel>
      <Panel title="منابع آموزشی بر اساس دسته‌بندی" subtitle={`مجموع مراجعه به منابع آموزشی: ${fa(maxTrainingVisits)}`}><Rows rows={resources.byCategory} /></Panel>
      <Panel title="۳ کاربر برتر مراجعه به منابع آموزشی" subtitle="هر ورود به صفحه ثبت می‌شود"><TopUsers rows={resourceVisits} /></Panel>
    </div>
  </Card></div>;
}
