import Card from "../components/ui/Card.jsx";

export default function BaseInformationPage() {
  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <Card className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900 md:p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-black/[.03] dark:border-white/10 dark:bg-white/[.06]">
            <img src="/images/icons/etelaat-paye.svg" alt="" className="h-6 w-6 dark:invert" />
          </span>
          <div>
            <h1 className="text-base font-bold md:text-lg">اطلاعات پایه</h1>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">مدیریت اطلاعات پایه سامانه</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
