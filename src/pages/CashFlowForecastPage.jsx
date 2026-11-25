import React, { useState } from "react";
import Card from "../components/ui/Card.jsx";
import CostForecastCostsTab from "./CostForecastCostsTab.jsx";
import { useFeatureVisibility } from "../hooks/useFeatureAccess.js";

const PAGE_ICON = "/images/icons/pishbini-naghdi.svg";

const TABS = [
  { id: "costs", label: "پیش بینی هزینه ها" },
  { id: "revenues", label: "پیش بینی درآمد ها" },
];

function ForecastTabs({ active, onChange }) {
  return (
    <div className="mb-3 border-b border-black/10 pb-2 dark:border-neutral-800 sm:px-2" dir="rtl">
      <div className="mb-0 flex w-full items-center justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-xl border border-black/10 bg-black/[0.03] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-auto md:-mb-px md:max-w-[780px] md:items-stretch md:justify-center md:gap-0 md:rounded-b-none md:rounded-t-2xl md:border-b-0 md:bg-white md:p-0 md:shadow-sm dark:border-neutral-800 dark:bg-white/[0.04] md:dark:bg-neutral-900">
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-pressed={active === tab.id}
            className={[
              "relative z-10 h-10 min-w-[132px] flex-none rounded-lg px-3 text-xs font-semibold transition whitespace-nowrap md:h-11 md:min-w-[150px] md:flex-1 md:rounded-none md:px-4 md:text-sm",
              index > 0 ? "md:border-r md:border-black/10 md:dark:border-neutral-800" : "",
              index === 0 ? "md:rounded-tr-2xl" : "",
              index === TABS.length - 1 ? "md:rounded-tl-2xl" : "",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20",
              active === tab.id
                ? "bg-[#184a6b] text-white shadow-sm dark:bg-[#184a6b] dark:text-white"
                : "bg-white text-[#1f2937] hover:bg-neutral-50 md:bg-white dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 md:dark:bg-neutral-900",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CashFlowForecastPage() {
  useFeatureVisibility("پیش‌بینی جریان نقدی", { "پیش‌بینی هزینه‌ها": "پیش‌بینی هزینه‌ها", "پیش‌بینی درآمدها": "پیش‌بینی درآمدها" });
  const [activeTab, setActiveTab] = useState("costs");

  return (
    <Card dir="rtl" className="mx-auto max-w-[1400px] rounded-2xl border border-black/10 bg-white p-2.5 text-neutral-900 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 sm:rounded-3xl sm:p-3 md:p-4">
      <div className="mb-4 flex min-w-0 items-center gap-3 border-b border-black/[0.07] px-0.5 pb-3 dark:border-white/10 sm:mb-5 sm:pb-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 shadow-sm dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04] sm:h-11 sm:w-11 sm:rounded-2xl">
          <span aria-hidden="true" className="h-5 w-5 bg-[#184a6b] dark:bg-[#8fc4e3] sm:h-6 sm:w-6" style={{ WebkitMask: `url(${PAGE_ICON}) center / contain no-repeat`, mask: `url(${PAGE_ICON}) center / contain no-repeat` }} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-bold tracking-tight text-[#184a6b] dark:text-[#8fc4e3] md:text-lg">پیش بینی جریان نقدی</span>
          <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت مالی</span>
        </span>
      </div>

      <div className="space-y-0">
        <ForecastTabs active={activeTab} onChange={setActiveTab} />

        <div dir="rtl" className="rounded-2xl border border-black/10 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          {activeTab === "costs" && <CostForecastCostsTab />}
          {activeTab === "revenues" && (
            <CostForecastCostsTab storageApiPath="/revenue-forecast-revenues" allowManualChildren />
          )}
        </div>
      </div>
    </Card>
  );
}
