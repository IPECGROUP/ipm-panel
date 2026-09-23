import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../components/AuthProvider.jsx";

const PAGE_ICON = "/images/icons/dashboard-12.svg";
const faNumber = (value) => Number(value || 0).toLocaleString("fa-IR");
const listOf = (value, key) => Array.isArray(value) ? value : Array.isArray(value?.[key]) ? value[key] : Array.isArray(value?.items) ? value.items : [];

function projectName(project, fallbackId) {
  if (!project) return `پروژه #${fallbackId}`;
  return `${project.code ? `${project.code} - ` : ""}${project.name || project.title || `پروژه #${fallbackId}`}`;
}

function EmptyPanel() {
  return <Card className="min-h-[180px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800" />;
}

export default function ProjectManagementDashboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    const options = { credentials: "include", headers: { "x-user-id": String(user.id) } };
    setLoading(true);
    Promise.all([
      fetch("/api/roznegar", options).then((response) => response.ok ? response.json() : { items: [] }),
      fetch("/api/projects?isActive=true", options).then((response) => response.ok ? response.json() : { items: [] }),
    ])
      .then(([entriesData, projectsData]) => {
        if (cancelled) return;
        setEntries(listOf(entriesData, "items"));
        setProjects(listOf(projectsData, "projects"));
      })
      .catch(() => { if (!cancelled) { setEntries([]); setProjects([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const data = useMemo(() => {
    const projectById = new Map(projects.map((project) => [String(project.id), project]));
    const projectMap = new Map();
    const userMap = new Map();
    entries.forEach((entry) => {
      const projectId = String(entry.project_id ?? entry.projectId ?? "");
      const unit = String(entry.user_department ?? entry.userDepartment ?? "بدون واحد").trim() || "بدون واحد";
      const project = projectMap.get(projectId) || { id: projectId, label: projectName(projectById.get(projectId), projectId), total: 0, units: new Map() };
      project.total += 1;
      project.units.set(unit, (project.units.get(unit) || 0) + 1);
      projectMap.set(projectId, project);
      const userId = String(entry.user_id ?? entry.userId ?? entry.user_name ?? "");
      const userName = String(entry.user_name ?? entry.userName ?? `کاربر #${userId}`).trim();
      const person = userMap.get(userId) || { key: userId, label: userName, value: 0, unit };
      person.value += 1;
      userMap.set(userId, person);
    });
    return {
      projectById,
      projects: [...projectMap.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "fa")),
      users: [...userMap.values()].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "fa")).slice(0, 5),
    };
  }, [entries, projects]);

  const filteredEntries = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("fa");
    if (!term) return entries;
    return entries.filter((entry) => [
      entry.user_name, entry.user_department, entry.date_ymd, entry.day_name, entry.activity,
      projectName(data.projectById.get(String(entry.project_id ?? entry.projectId ?? "")), entry.project_id ?? entry.projectId),
    ].some((value) => String(value ?? "").toLocaleLowerCase("fa").includes(term)));
  }, [data.projectById, entries, query]);

  return (
    <div className="mx-auto w-full max-w-[1440px] text-neutral-900 dark:text-neutral-100" dir="rtl">
      <Card className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-none dark:border-neutral-800 dark:bg-neutral-900 sm:p-5">
        <div className="mb-5 flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]"><img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" /></span>
          <span className="min-w-0"><span className="block truncate text-base font-bold md:text-lg">داشبورد مدیریت پروژه</span><span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">نمای کلی روزنگار پروژه</span></span>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
          <Card className="min-h-[350px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800 xl:col-span-7">
            <div className="mb-4 flex items-start justify-between gap-3"><span><span className="block text-sm font-bold">روزنگارهای ثبت‌شده</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">تعداد روزنگارها به تفکیک پروژه و واحد ثبت‌کننده</span></span><span className="rounded-xl bg-indigo-50 px-3 py-2 text-xl font-bold tabular-nums text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{faNumber(entries.length)}</span></div>
            <div className="max-h-[270px] overflow-auto rounded-xl border border-black/[0.07] dark:border-white/[0.08]">
              <table className="w-full min-w-[540px] text-right text-xs"><thead className="sticky top-0 bg-neutral-50 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300"><tr><th className="px-3 py-2.5 font-medium">پروژه</th><th className="px-3 py-2.5 font-medium">واحدها</th><th className="px-3 py-2.5 text-center font-medium">کل</th></tr></thead><tbody>{data.projects.length ? data.projects.map((project) => <tr key={project.id} className="border-t border-black/[0.06] dark:border-white/[0.08]"><td className="max-w-[220px] truncate px-3 py-3 font-medium">{project.label}</td><td className="px-3 py-2"><div className="flex flex-wrap gap-1.5">{[...project.units.entries()].map(([unit, count]) => <span key={unit} className="rounded-lg bg-neutral-50 px-2 py-1 text-[11px] text-neutral-600 dark:bg-white/[0.045] dark:text-neutral-300">{unit}: <b>{faNumber(count)}</b></span>)}</div></td><td className="px-3 py-3 text-center font-bold tabular-nums">{faNumber(project.total)}</td></tr>) : <tr><td colSpan="3" className="px-3 py-20 text-center text-neutral-400">{loading ? "در حال دریافت اطلاعات..." : "روزنگاری برای نمایش وجود ندارد."}</td></tr>}</tbody></table>
            </div>
          </Card>

          <Card className="min-h-[350px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800 xl:col-span-5">
            <div className="mb-4"><span className="block text-sm font-bold">کاربران پرثبت روزنگار</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">۵ کاربر با بیشترین تعداد ثبت</span></div>
            <div className="space-y-2">{data.users.length ? data.users.map((person, index) => <div key={person.key} className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-3 dark:bg-white/[0.045]"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-neutral-500 shadow-sm dark:bg-neutral-800 dark:text-neutral-300">{faNumber(index + 1)}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{person.label}</span><span className="mt-1 block truncate text-[10px] text-neutral-500">{person.unit}</span></span><span className="shrink-0 text-sm font-bold tabular-nums">{faNumber(person.value)}</span></div>) : <div className="py-24 text-center text-xs text-neutral-400">{loading ? "در حال دریافت اطلاعات..." : "داده‌ای برای نمایش وجود ندارد."}</div>}</div>
          </Card>
        </div>

        <Card className="mt-3 min-h-[420px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span><span className="block text-sm font-bold">همه روزنگارها</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">نمایش و جست‌وجوی تمام روزنگارهای ثبت‌شده</span></span><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-indigo-400 dark:border-white/10 dark:bg-neutral-900 sm:w-80" placeholder="جست‌وجو در پروژه، کاربر، واحد یا متن..." /></div>
          <div className="max-h-[350px] overflow-auto rounded-xl border border-black/[0.07] dark:border-white/[0.08]"><table className="w-full min-w-[820px] text-right text-xs"><thead className="sticky top-0 bg-neutral-50 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300"><tr><th className="px-3 py-2.5 font-medium">تاریخ</th><th className="px-3 py-2.5 font-medium">پروژه</th><th className="px-3 py-2.5 font-medium">کاربر</th><th className="px-3 py-2.5 font-medium">واحد</th><th className="px-3 py-2.5 font-medium">شرح فعالیت</th></tr></thead><tbody>{filteredEntries.length ? filteredEntries.map((entry) => <tr key={entry.id} className="border-t border-black/[0.06] dark:border-white/[0.08]"><td className="whitespace-nowrap px-3 py-3 tabular-nums">{entry.date_ymd || "—"}</td><td className="max-w-[190px] truncate px-3 py-3 font-medium">{projectName(data.projectById.get(String(entry.project_id ?? entry.projectId ?? "")), entry.project_id ?? entry.projectId)}</td><td className="px-3 py-3">{entry.user_name || "—"}</td><td className="px-3 py-3">{entry.user_department || "بدون واحد"}</td><td className="max-w-[420px] truncate px-3 py-3 text-neutral-600 dark:text-neutral-300">{entry.activity || "—"}</td></tr>) : <tr><td colSpan="5" className="px-3 py-20 text-center text-neutral-400">{loading ? "در حال دریافت اطلاعات..." : "موردی یافت نشد."}</td></tr>}</tbody></table></div>
        </Card>

        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2"><EmptyPanel /><EmptyPanel /></div>
      </Card>
    </div>
  );
}
