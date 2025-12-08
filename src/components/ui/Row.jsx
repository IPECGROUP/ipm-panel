// src/components/ui/Row.jsx
import React from "react";

function Row({ label, children }) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-2 md:gap-3"
      dir="rtl"
    >
      <div className="text-right text-xs md:text-sm leading-6 break-words text-neutral-600 dark:text-neutral-300">
        {label}
      </div>
      <div className="text-sm md:text-base text-neutral-900 dark:text-neutral-100">
        {children}
      </div>
    </div>
  );
}

export default Row;
