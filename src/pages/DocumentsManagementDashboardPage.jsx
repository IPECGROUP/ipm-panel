import React, { useEffect, useState } from "react";
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
const emptyMetrics = () => metricLabels.map(([key, label]) => ({ key, label, value: 0 }));
const emptyDashboard = () => ({
  statistics: { all: emptyMetrics(), previousMonth: emptyMetrics(), previousWeek: emptyMetrics() },
  dashboardData: { recipients: [], averages: { month: 0, week: 0, day: 0 }, projects: [], tags: [] },
});

export default function DocumentsManagementDashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(emptyDashboard);

  useEffect(() => {
    if (!user?.id) return undefined;
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/letters?dashboard=1", {
          credentials: "include",
          headers: { "x-user-id": String(user.id) },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("documents_dashboard_failed");
        const data = await response.json();
        if (controller.signal.aborted) return;
        setDashboard(data?.statistics && data?.dashboardData ? data : emptyDashboard());
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error("documents_dashboard_load_failed", error);
          setDashboard(emptyDashboard());
        }
      }
    };
    load();
    return () => controller.abort();
  }, [user?.id]);

  const { statistics, dashboardData } = dashboard;

  return (
    <div className="mx-auto w-full max-w-[1440px] text-neutral-900 dark:text-neutral-100" dir="rtl">
      <Card className="rounded-2xl border border-neutral-200 bg-white p-7 shadow-none md:p-8 dark:border-neutral-800 dark:bg-neutral-900">
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
