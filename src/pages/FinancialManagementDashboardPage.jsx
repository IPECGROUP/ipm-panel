import React from "react";
import Card from "../components/ui/Card.jsx";

const PAGE_ICON = "/images/icons/dashboard-modirirat.svg";

const COLUMNS = [
  "ردیف",
  "کل بودجه",
  "کل تعهدات",
  "کل مصارف",
  "مصارف / تعداد",
  "مانده بودجه",
  "تعهدات / کل بودجه",
  "مصارف / کل بودجه",
];

export default function FinancialManagementDashboardPage() {
  return (
    <Card className="rounded-2xl border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="mb-5 flex min-w-0 items-center gap-3" dir="rtl">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
          <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-bold md:text-lg">داشبورد مدیریت مالی</span>
          <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">نمای کلی شاخص‌های مالی</span>
        </span>
      </div>

      <div className="overflow-x-auto" dir="rtl">
        <table className="w-full min-w-[1060px] border-collapse text-xs text-neutral-800 dark:text-neutral-100 sm:text-sm">
          <thead className="bg-black/[0.04] dark:bg-white/[0.06]">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} className="h-14 border border-black/10 px-3 text-center font-semibold whitespace-nowrap dark:border-white/10">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white dark:bg-neutral-900">
              <td colSpan={COLUMNS.length} className="h-28 border border-black/10 px-3 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
                اطلاعات داشبورد پس از تکمیل منطق نمایش داده می‌شود.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
