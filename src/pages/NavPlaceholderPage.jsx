import React from "react";

export default function NavPlaceholderPage({ title, icon = "" }) {
  return (
    <div className="min-h-[calc(100vh-2rem)] px-4 py-6 text-neutral-900 dark:text-neutral-100 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3 border-b border-black/10 pb-4 dark:border-white/10">
          {icon && <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]"><img src={icon} alt="" className="h-6 w-6 dark:invert" /></span>}
          <div className="text-lg font-bold md:text-xl">{title}</div>
        </div>
      </div>
    </div>
  );
}
