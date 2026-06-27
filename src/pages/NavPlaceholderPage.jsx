import React from "react";

export default function NavPlaceholderPage({ title }) {
  return (
    <div className="min-h-[calc(100vh-2rem)] px-4 py-6 text-neutral-900 dark:text-neutral-100 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="border-b border-black/10 pb-4 dark:border-white/10">
          <div className="text-lg font-bold md:text-xl">{title}</div>
        </div>
      </div>
    </div>
  );
}
