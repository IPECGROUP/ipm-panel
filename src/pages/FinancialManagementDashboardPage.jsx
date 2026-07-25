import React from "react";
import Card from "../components/ui/Card.jsx";

const PAGE_ICON = "/images/icons/modiriat-mali.svg";

export default function FinancialManagementDashboardPage() {
  return (
    <Card className="rounded-2xl border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="mb-5 flex min-w-0 items-center justify-between gap-3" dir="rtl">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
            <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold md:text-lg">داشبورد مدیریت مالی</span>
            <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">نمای کلی شاخص‌های مالی</span>
          </span>
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-black/10 px-4 py-8 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400" dir="rtl">
        درخواست‌های پرداخت در صفحه «مدیریت درخواست‌ها» نمایش داده می‌شوند.
      </div>
    </Card>
  );
}
