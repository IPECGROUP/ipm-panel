import { useState } from "react";
import Card from "../components/ui/Card.jsx";
import BaseCurrenciesPage from "./BaseCurrenciesPage.jsx";
import BaseOptionsTable from "./BaseOptionsTable.jsx";
import ContractManagementSection from "./ContractManagementSection.jsx";
import FinancialManagementSection from "./FinancialManagementSection.jsx";

const tabs = [
  { id: "documents", label: "مدیریت اسناد" },
  { id: "contracts", label: "مدیریت قرارداد ها" },
  { id: "finance", label: "مدیریت مالی" },
  { id: "knowledge", label: "مدیریت دانش" },
];

const knowledgeTabs = [
  { id: "trainingResources", label: "منابع آموزشی" },
  { id: "libraries", label: "کتابخانه‌ها" },
];

export default function BaseInformationPage() {
  const [activeTab, setActiveTab] = useState("documents");
  const [activeKnowledgeTab, setActiveKnowledgeTab] = useState("trainingResources");

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

        <div className="mt-6">
          <div className="mx-auto flex w-full max-w-[1280px]" role="tablist" aria-label="بخش‌های اطلاعات پایه">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-w-0 flex-1 border px-2 py-3 text-xs font-bold transition first:rounded-tr-2xl last:rounded-tl-2xl sm:px-3 md:px-5 md:text-sm ${active ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/10 bg-white text-neutral-800 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-white/5"}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <section role="tabpanel" className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          {activeTab === "documents" ? <BaseOptionsTable title="کلاس سند" endpoint="/api/base/document-classes" /> : activeTab === "contracts" ? <ContractManagementSection /> : activeTab === "finance" ? <FinancialManagementSection /> : (
            <div>
              <div className="mx-auto mb-5 flex w-full max-w-[720px] rounded-2xl border border-black/10 bg-neutral-50 p-1 dark:border-white/10 dark:bg-white/5" role="tablist" aria-label="گزینه‌های مدیریت دانش">
                {knowledgeTabs.map((tab) => {
                  const active = activeKnowledgeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveKnowledgeTab(tab.id)}
                      className={`flex-1 rounded-xl px-3 py-3 text-xs font-bold transition md:text-sm ${active ? "bg-white text-black shadow-sm dark:bg-neutral-900 dark:text-white" : "text-neutral-600 hover:bg-black/[.03] dark:text-neutral-300 dark:hover:bg-white/5"}`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {activeKnowledgeTab === "trainingResources" ? <BaseOptionsTable title="دسته‌بندی" endpoint="/api/base/training-resource-categories" /> : <BaseOptionsTable title="کتابخانه" endpoint="/api/base/libraries" />}
            </div>
          )}
        </section>
      </Card>
    </div>
  );
}
