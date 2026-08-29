import { useState } from "react";
import Card from "../components/ui/Card.jsx";

const tabs = [
  { id: "documents", label: "مدیریت اسناد" },
  { id: "contracts", label: "مدیریت قرارداد ها" },
  { id: "finance", label: "مدیریت مالی" },
];

export default function BaseInformationPage() {
  const [activeTab, setActiveTab] = useState("documents");

  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <Card className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900 md:p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-black/[.03] dark:border-white/10 dark:bg-white/[.06]">
            <img src="/images/icons/etelaat-paye.svg" alt="" className="h-6 w-6 dark:invert" />
          </span>
          <div>
            <h1 className="text-base font-bold md:text-lg">اطلاعات پایه</h1>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">تنظیمات</p>
          </div>
        </div>

        <div className="mt-6 border-b border-black/10 dark:border-white/10">
          <div className="flex overflow-x-auto" role="tablist" aria-label="بخش‌های اطلاعات پایه">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-w-[220px] flex-1 border border-b-0 px-5 py-3 text-sm font-bold transition first:rounded-tr-2xl last:rounded-tl-2xl ${active ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/10 bg-white text-neutral-800 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-white/5"}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <section role="tabpanel" className="min-h-36 rounded-b-2xl border border-t-0 border-black/10 p-5 dark:border-white/10">
          <h2 className="text-sm font-bold">{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
        </section>
      </Card>
    </div>
  );
}
