import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import StatisticsPanel from "../components/dashboard/StatisticsPanel.jsx";
import { AveragePanel, ProjectDocumentsPanel, RankingPanel } from "../components/dashboard/DashboardDataPanels.jsx";
import { useAuth } from "../components/AuthProvider.jsx";

const PAGE_ICON = "/images/icons/dashboard-12.svg";

const metricLabels = [
  ["total", "کل اسناد ثبت‌شده"],
  ["incoming", "اسناد وارده"],
  ["outgoing", "اسناد صادره"],
  ["internal", "اسناد داخلی"],
  ["confidential", "اسناد محرمانه"],
];

function normalizeDigits(value = "") {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function letterKind(item) {
  const value = String(item?.kind || item?.type || item?.direction || item?.letter_type || "").toLowerCase();
  if (value.includes("internal") || value.includes("داخلی")) return "internal";
  if (value.includes("out") || value.includes("صادر")) return "outgoing";
  return "incoming";
}

function isConfidential(item) {
  const value = item?.is_confidential ?? item?.isConfidential ?? item?.confidential ?? item?.is_secret ?? item?.isSecret;
  if (value === true || value === 1 || value === "1") return true;
  return /محرمانه|خیلی محرمانه|confidential|secret/i.test(String(item?.classification || item?.confidentiality || item?.classificationName || ""));
}

function createdAt(item) {
  const raw = item?.created_at || item?.createdAt || item?.inserted_at || item?.insertedAt || item?.timestamp || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function jalaliYearMonth(date) {
  const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit" }).formatToParts(date);
  return {
    year: Number(normalizeDigits(parts.find((part) => part.type === "year")?.value)),
    month: Number(normalizeDigits(parts.find((part) => part.type === "month")?.value)),
  };
}

function previousJalaliMonth(date = new Date()) {
  const current = jalaliYearMonth(date);
  return current.month === 1 ? { year: current.year - 1, month: 12 } : { year: current.year, month: current.month - 1 };
}

function summarize(items) {
  const summary = { total: items.length, incoming: 0, outgoing: 0, internal: 0, confidential: 0 };
  items.forEach((item) => {
    summary[letterKind(item)] += 1;
    if (isConfidential(item)) summary.confidential += 1;
  });
  return metricLabels.map(([key, label]) => ({ key, label, value: summary[key] }));
}

function recipientOf(item) {
  return String(item?.to_name || item?.toName || item?.receiver_name || item?.receiverName || item?.org_name || item?.orgName || "").trim();
}

function tagIdsOf(item) {
  const value = item?.tag_ids ?? item?.tagIds ?? [];
  return Array.isArray(value) ? value.map((id) => String(typeof id === "object" ? id?.id ?? id?.tagId : id)).filter(Boolean) : [];
}

function rankValues(values, limit) {
  const counts = new Map();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].map(([label, value]) => ({ key: label, label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "fa")).slice(0, limit);
}

export default function DocumentsManagementDashboardPage() {
  const { user } = useAuth();
  const [letters, setLetters] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    // The document-management registry is shared. This endpoint returns the
    // page's complete visible registry, not a list limited to records created
    // by the signed-in user.
    const options = { credentials: "include", headers: { "x-user-id": String(user.id) } };
    Promise.all([
      fetch("/api/letters", options).then((response) => response.ok ? response.json() : { items: [] }),
      fetch("/api/projects?isActive=true", options).then((response) => response.ok ? response.json() : { items: [] }),
      fetch("/api/tags?scope=letters", options).then((response) => response.ok ? response.json() : { tags: [] }),
    ])
      .then(([lettersData, projectsData, tagsData]) => {
        if (cancelled) return;
        setLetters(Array.isArray(lettersData?.items) ? lettersData.items : Array.isArray(lettersData) ? lettersData : []);
        setProjects(Array.isArray(projectsData?.items) ? projectsData.items : Array.isArray(projectsData?.projects) ? projectsData.projects : []);
        setTags(Array.isArray(tagsData?.tags) ? tagsData.tags : Array.isArray(tagsData?.items) ? tagsData.items : []);
      })
      .catch(() => { if (!cancelled) { setLetters([]); setProjects([]); setTags([]); } });
    return () => { cancelled = true; };
  }, [user?.id]);

  const statistics = useMemo(() => {
    const all = Array.isArray(letters) ? letters : [];
    const previousMonth = previousJalaliMonth();
    const weekStart = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const weekEnd = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      all: summarize(all),
      previousMonth: summarize(all.filter((item) => {
        const date = createdAt(item);
        if (!date) return false;
        const month = jalaliYearMonth(date);
        return month.year === previousMonth.year && month.month === previousMonth.month;
      })),
      previousWeek: summarize(all.filter((item) => {
        const date = createdAt(item)?.getTime();
        return Number.isFinite(date) && date >= weekStart && date < weekEnd;
      })),
    };
  }, [letters]);

  const dashboardData = useMemo(() => {
    const all = Array.isArray(letters) ? letters : [];
    const dates = all.map(createdAt).filter(Boolean).map((date) => date.getTime());
    const spanDays = dates.length ? Math.max(1, Math.ceil((Date.now() - Math.min(...dates)) / 86400000) + 1) : 1;
    const projectCounts = new Map();
    all.forEach((item) => {
      const projectId = String(item?.project_id ?? item?.projectId ?? "");
      if (!projectId) return;
      const current = projectCounts.get(projectId) || { incoming: 0, outgoing: 0, internal: 0 };
      current[letterKind(item)] += 1;
      projectCounts.set(projectId, current);
    });
    const tagLabelById = new Map((Array.isArray(tags) ? tags : []).map((tag) => [String(tag.id), tag.label || tag.name || `برچسب ${tag.id}`]));
    return {
      recipients: rankValues(all.map(recipientOf), 5),
      averages: { month: all.length / (spanDays / 30.4375), week: all.length / (spanDays / 7), day: all.length / spanDays },
      projects: (Array.isArray(projects) ? projects : []).filter((project) => {
        const isActive = project?.isActive === true || project?.isActive === 1 || String(project?.isActive).toLowerCase() === "true" || String(project?.isActive) === "1";
        return isActive && /^\d{3}$/.test(normalizeDigits(String(project?.code || "")).trim());
      }).map((project) => {
        const counts = projectCounts.get(String(project.id)) || { incoming: 0, outgoing: 0, internal: 0 };
        return { id: project.id, label: `${project.code ? `${project.code} - ` : ""}${project.name || project.title || "پروژه بدون نام"}`, ...counts, total: counts.incoming + counts.outgoing + counts.internal };
      }),
      tags: rankValues(all.flatMap(tagIdsOf).map((id) => tagLabelById.get(id) || `برچسب ${id}`), 10),
    };
  }, [letters, projects, tags]);

  return (
    <div className="mx-auto w-full max-w-[1440px] text-neutral-900 dark:text-neutral-100" dir="rtl">
      <Card className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-none dark:border-neutral-800 dark:bg-neutral-900 sm:p-5">
        <div className="mb-5 flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
            <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold md:text-lg">داشبورد مدیریت اسناد</span>
            <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت اسناد</span>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <StatisticsPanel title="آمار کل اسناد" items={statistics.all} />
          <StatisticsPanel title="اسناد ثبت‌شده در ماه قبل" items={statistics.previousMonth} />
          <StatisticsPanel title="اسناد ثبت‌شده در هفته قبل" items={statistics.previousWeek} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <RankingPanel title="گیرندگان و شرکت‌های پرمکاتبه" subtitle="بیشترین تعداد سند" rows={dashboardData.recipients} />
          <AveragePanel averages={dashboardData.averages} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-12">
          <ProjectDocumentsPanel rows={dashboardData.projects} className="xl:col-span-8" />
          <div className="xl:col-span-4"><RankingPanel title="برچسب‌های پرکاربرد" subtitle="بیشترین استفاده" rows={dashboardData.tags} /></div>
        </div>
      </Card>
    </div>
  );
}
