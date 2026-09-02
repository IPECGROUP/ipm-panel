import React from "react";
import Card from "../components/ui/Card.jsx";

const PAGE_ICON = "/images/icons/tenkhah.svg";

const tabs = ["تنخواه‌های من", "ثبت هزینه‌ها", "گزارش تسویه تنخواه"];

/**
 * Initial UI shell for petty cash. Data aggregation will be connected when the
 * expense-registration tab is implemented.
 */
export default function PettyCashPage() {
  const [activeTab, setActiveTab] = React.useState(0);

  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <Card className="rounded-2xl border border-black/10 bg-white p-0 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        <div className="p-3 md:p-4">
          <header className="mb-5 flex min-w-0 items-center gap-3 border-b border-black/[0.07] pb-4 dark:border-white/10">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 shadow-sm dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04]">
              <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
            </span>
            <span className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight md:text-lg">تنخواه گردان</h1>
              <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت مالی</span>
            </span>
          </header>

          <nav className="mb-4 flex items-end gap-1 overflow-x-auto border-b border-neutral-300 dark:border-neutral-700" aria-label="بخش‌های تنخواه گردان">
            {tabs.map((tab, index) => {
              const isActive = activeTab === index;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(index)}
                  className={`relative shrink-0 px-4 py-2.5 text-sm font-semibold transition md:px-5 ${
                    isActive
                      ? "text-neutral-950 dark:text-white"
                      : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {tab}
                  {isActive && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-neutral-900 dark:bg-white" />}
                </button>
              );
            })}
          </nav>

          {activeTab === 0 ? <MyPettyCashTable /> : <UpcomingTab label={tabs[activeTab]} />}
        </div>
      </Card>
    </div>
  );
}

function MyPettyCashTable() {
  return (
    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="relative hidden max-h-[55vh] overflow-y-auto overflow-x-hidden md:block" dir="ltr">
        <table dir="rtl" className="w-full min-w-[920px] table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:text-center [&_th]:!py-2 [&_td]:!py-2">
          <colgroup>
            <col style={{ width: 72 }} />
            <col />
            <col style={{ width: 190 }} />
            <col style={{ width: 210 }} />
            <col style={{ width: 210 }} />
          </colgroup>
          <thead>
            <tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-white/10 dark:text-neutral-100">
              <th className="sticky top-0 z-30 bg-neutral-200 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">ردیف</th>
              <th className="sticky top-0 z-30 bg-neutral-200 !text-right text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">پروژه</th>
              <th className="sticky top-0 z-30 bg-neutral-200 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">مجموع تنخواه دریافت‌شده</th>
              <th className="sticky top-0 z-30 bg-neutral-200 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">
                <span className="block">مجموع هزینه‌های ثبت‌شده</span>
                <span className="mt-0.5 block text-[11px] font-normal text-neutral-600 dark:text-neutral-300">باقی‌مانده هزینه‌های ثبت‌شده</span>
              </th>
              <th className="sticky top-0 z-30 bg-neutral-200 text-[14px] font-semibold dark:bg-neutral-800 md:text-[15px]">
                <span className="block">مجموع هزینه‌های تأییدشده</span>
                <span className="mt-0.5 block text-[11px] font-normal text-neutral-600 dark:text-neutral-300">باقی‌مانده هزینه‌های تأییدنشده</span>
              </th>
            </tr>
          </thead>
          <tbody className="text-[13px] text-black dark:text-neutral-100">
            <tr className="bg-black/[0.02] dark:bg-white/5">
              <td colSpan={5} className="px-3 py-10 text-center text-neutral-500 dark:text-neutral-400">
                اطلاعات تنخواه پس از ثبت هزینه‌ها در این بخش نمایش داده می‌شود.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="p-8 text-center text-sm text-neutral-500 dark:text-neutral-400 md:hidden">
        اطلاعات تنخواه پس از ثبت هزینه‌ها در این بخش نمایش داده می‌شود.
      </div>
    </section>
  );
}

function UpcomingTab({ label }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/15 px-4 py-12 text-center text-sm text-neutral-500 dark:border-white/15 dark:text-neutral-400">
      بخش «{label}» در مرحلهٔ بعد تکمیل می‌شود.
    </div>
  );
}
