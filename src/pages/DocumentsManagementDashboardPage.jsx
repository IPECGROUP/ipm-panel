import React from "react";
import Card from "../components/ui/Card.jsx";

const PAGE_ICON = "/images/icons/dashboard-12.svg";

function PlaceholderBox({ number, className = "", label = "" }) {
  return (
    <Card className={`relative min-h-[130px] overflow-hidden rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800 ${className}`}>
      <span className="absolute left-4 top-3 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
        {label || "باکس"}
      </span>
      <div className="flex h-full min-h-[96px] items-center justify-center" aria-label={`باکس ${number}`}>
        <span className="select-none text-5xl font-bold leading-none text-neutral-300 dark:text-neutral-700 sm:text-6xl">
          {number}
        </span>
      </div>
    </Card>
  );
}

export default function DocumentsManagementDashboardPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] text-neutral-900 dark:text-neutral-100" dir="rtl">
      <Card className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-none dark:border-neutral-800 dark:bg-neutral-900 sm:p-5">
        <div className="mb-5 flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
            <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold md:text-lg">داشبورد مدیریت اسناد</span>
            <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">چیدمان اولیهٔ داشبورد</span>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((number) => <PlaceholderBox key={number} number={number} />)}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-12">
          <PlaceholderBox number={6} className="xl:col-span-4 min-h-[250px]" />
          <PlaceholderBox number={7} className="xl:col-span-4 min-h-[250px]" />
          <PlaceholderBox number={8} className="xl:col-span-4 min-h-[250px]" />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-12">
          <PlaceholderBox number={9} className="xl:col-span-4 min-h-[210px]" />
          <PlaceholderBox number={10} className="xl:col-span-4 min-h-[210px]" />
          <PlaceholderBox number={11} className="xl:col-span-4 min-h-[210px]" />
        </div>

        <Card className="mt-3 rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold">باکس ۱۲</span>
            <span className="text-xs text-neutral-400">ناحیهٔ تقویم</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[13, 14, 15, 16, 17, 18].map((number) => (
              <PlaceholderBox key={number} number={number} className="min-h-[116px]" />
            ))}
          </div>
        </Card>
      </Card>
    </div>
  );
}
