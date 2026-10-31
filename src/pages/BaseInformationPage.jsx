import { useState } from "react";
import Card from "../components/ui/Card.jsx";
import BaseCurrenciesPage from "./BaseCurrenciesPage.jsx";
import BaseOptionsTable from "./BaseOptionsTable.jsx";
import ContractManagementSection from "./ContractManagementSection.jsx";
import FinancialManagementSection from "./FinancialManagementSection.jsx";
import EquipmentManagementSection from "./EquipmentManagementSection.jsx";
import ProjectLessonCategoryDescriptionsTable from "./ProjectLessonCategoryDescriptionsTable.jsx";
import SampleCostBreakdown from "./SampleCostBreakdown.jsx";

const tabs = [
  { id: "documents", label: "مدیریت اسناد" },
  { id: "contracts", label: "مدیریت قرارداد ها" },
  { id: "projects", label: "مدیریت پروژه ها" },
  { id: "finance", label: "مدیریت مالی" },
  { id: "supply", label: "مدیریت تامین" },
  { id: "equipment", label: "مدیریت تجهیزات" },
  { id: "knowledge", label: "مدیریت دانش" },
];

const knowledgeTabs = [
  { id: "projectLessons", label: "درس آموخته‌ها" },
  { id: "trainingResources", label: "منابع آموزشی" },
  { id: "libraries", label: "کتابخانه‌ها" },
];

export default function BaseInformationPage() {
  const [activeTab, setActiveTab] = useState("documents");
  const [activeDocumentTab, setActiveDocumentTab] = useState("classes");
  const [activeProjectTab, setActiveProjectTab] = useState("worksheet");
  const [activeKnowledgeTab, setActiveKnowledgeTab] = useState("trainingResources");

  return (
    <div dir="rtl" className="ipm-base-information mx-auto max-w-[1400px]">
      <Card className="rounded-2xl border border-black/10 bg-white p-7 md:p-8 dark:border-white/10 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-black/[.03] dark:border-white/10 dark:bg-white/[.06]">
            <span aria-hidden="true" className="h-6 w-6 bg-[#184a6b] dark:bg-[#8fc4e3]" style={{ WebkitMask: "url('/images/icons/etelaat-paye.svg') center / contain no-repeat", mask: "url('/images/icons/etelaat-paye.svg') center / contain no-repeat" }} />
          </span>
          <div>
            <h1 className="text-base font-bold text-[#184a6b] dark:text-[#8fc4e3] md:text-lg">اطلاعات پایه</h1>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">تنظیمات</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="relative z-10 mx-auto -mb-px flex w-full max-w-[1280px]" role="tablist" aria-label="بخش‌های اطلاعات پایه">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-w-0 flex-1 border px-2 py-3 text-xs font-bold transition first:rounded-tr-2xl last:rounded-tl-2xl sm:px-3 md:px-5 md:text-sm ${active ? "border-[#184a6b] bg-[#184a6b] text-white dark:border-[#184a6b] dark:bg-[#184a6b] dark:text-white" : "border-black/10 bg-white text-neutral-800 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-white/5"}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <section role="tabpanel" className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          {activeTab === "documents" ? <div>
            <div className="mb-5 flex w-fit max-w-full rounded-2xl border border-black/10 bg-neutral-50 p-1 dark:border-white/10 dark:bg-white/5" role="tablist" aria-label="بخش‌های مدیریت اسناد">
              {[["classes", "کلاس سند"], ["receipts", "رسید های تحویل"]].map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={activeDocumentTab === id} onClick={() => setActiveDocumentTab(id)} className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${activeDocumentTab === id ? "bg-white text-black shadow-sm dark:bg-neutral-900 dark:text-white" : "text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white"}`}>{label}</button>)}
            </div>
            {activeDocumentTab === "classes" ? <BaseOptionsTable key="classes" title="کلاس سند" endpoint="/api/base/document-classes" /> : <BaseOptionsTable key="receipts" title="نوع مرسوله" endpoint="/api/base/delivery-receipt-types" maxTitleLength={100} />}
          </div> : activeTab === "contracts" ? <ContractManagementSection /> : activeTab === "projects" ? (
            <div>
              <div className="mb-5 flex w-fit max-w-full rounded-2xl border border-black/10 bg-neutral-100 p-1 dark:border-white/10 dark:bg-white/5" role="tablist" aria-label="بخش‌های مدیریت پروژه‌ها">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeProjectTab === "worksheet"}
                  onClick={() => setActiveProjectTab("worksheet")}
                  className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${activeProjectTab === "worksheet" ? "bg-white text-black shadow-sm dark:bg-white dark:text-black" : "text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white"}`}
                >
                  کاربرگ مالی
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeProjectTab === "sampleStructure"}
                  onClick={() => setActiveProjectTab("sampleStructure")}
                  className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${activeProjectTab === "sampleStructure" ? "bg-white text-black shadow-sm dark:bg-white dark:text-black" : "text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white"}`}
                >
                  ساختار شکست نمونه
                </button>
              </div>
              {activeProjectTab === "worksheet" ? <BaseOptionsTable title="بابت دریافتی" endpoint="/api/base/financial-options?category=worksheet-receipt" /> : <SampleCostBreakdown />}
            </div>
          ) : activeTab === "finance" ? <FinancialManagementSection /> : activeTab === "supply" ? <BaseOptionsTable title="نوع درخواست" endpoint="/api/base/supply-request-types" /> : activeTab === "equipment" ? <EquipmentManagementSection /> : (
            <div>
              <div className="mb-5 flex justify-start">
                <div className="flex w-fit rounded-2xl border border-black/10 bg-neutral-50 p-1 dark:border-white/10 dark:bg-white/5" role="tablist" aria-label="گزینه‌های مدیریت دانش">
                  {knowledgeTabs.map((tab) => {
                    const active = activeKnowledgeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setActiveKnowledgeTab(tab.id)}
                        className={`min-w-[116px] rounded-xl px-4 py-2 text-xs font-bold transition md:text-sm ${active ? "bg-white text-black shadow-sm dark:bg-neutral-900 dark:text-white" : "text-neutral-600 hover:bg-black/[.03] dark:text-neutral-300 dark:hover:bg-white/5"}`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

{activeKnowledgeTab === "projectLessons" ? (
  <ProjectLessonCategoryDescriptionsTable />
) : activeKnowledgeTab === "trainingResources" ? (
                <BaseOptionsTable title="دسته‌بندی" endpoint="/api/base/training-resource-categories" />
              ) : (
                <BaseOptionsTable title="کتابخانه" endpoint="/api/base/libraries" />
              )}
            </div>
          )}
        </section>
      </Card>
    </div>
  );
}
