import React, { useState } from "react";
import Card from "../components/ui/Card.jsx";
import EstimatesPage from "./EstimatesPage.jsx";
import RevenueEstimatesPage from "./RevenueEstimatesPage.jsx";

const PAGE_ICON = "/images/icons/pishbini-naghdi.svg";

const TABS = [
  { id: "costs", label: "پیش بینی هزینه ها" },
  { id: "revenues", label: "پیش بینی درآمد ها" },
  { id: "chart", label: "نمودار جریان نقدی" },
];

function ForecastTabs({ active, onChange }) {
  return (
    <div className="overflow-visible px-0 sm:px-2" dir="rtl">
      <div className="mb-2 flex w-full items-center justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-xl border border-black/10 bg-black/[0.03] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-auto md:-mb-px md:max-w-[780px] md:items-stretch md:justify-center md:gap-0 md:rounded-b-none md:rounded-t-2xl md:border-b-0 md:bg-white md:p-0 md:shadow-sm dark:border-neutral-800 dark:bg-white/[0.04] md:dark:bg-neutral-900">
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
                ? "bg-black text-white shadow-sm dark:bg-black dark:text-white"
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
  const [activeTab, setActiveTab] = useState("costs");

  return (
    <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
      <div className="mb-5 flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
          <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-bold md:text-lg">پیش بینی جریان نقدی</span>
          <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت مالی</span>
        </span>
      </div>

      <div className="space-y-3 md:space-y-4">
        <ForecastTabs active={activeTab} onChange={setActiveTab} />

        <div dir="rtl">
          {activeTab === "costs" && <EstimatesPage embeddedTableOnly />}
          {activeTab === "revenues" && <RevenueEstimatesPage embeddedTableOnly />}
          {activeTab === "chart" && (
            <div className="min-h-[320px] rounded-2xl border border-black/10 bg-white dark:border-neutral-800 dark:bg-neutral-900" />
          )}
        </div>
      </div>
    </Card>
  );
}
