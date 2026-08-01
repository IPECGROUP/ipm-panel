import React from "react";
import { Card } from "../components/ui/Card";

export default function TenkhahPage() {
  return <Card className="mx-auto w-full max-w-7xl p-5 md:p-6">
    <div className="flex items-center gap-3" dir="rtl">
      <img src="/images/icons/tenkhah.svg" alt="" className="h-7 w-7 dark:invert" />
      <h1 className="text-lg font-bold text-neutral-900 dark:text-white">تنخواه</h1>
    </div>
  </Card>;
}
