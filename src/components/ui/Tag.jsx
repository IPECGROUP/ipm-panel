// src/components/ui/Tag.jsx
import React from "react";

const TagBase = ({ children, color }) => {
  const base =
    "inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-medium whitespace-nowrap";

  const map = {
    pending:
      "bg-black/5 text-neutral-800 border border-black/10 " +
      "dark:bg-white/10 dark:text-neutral-100 dark:border-white/20",
    submitted:
      "bg-black/5 text-neutral-800 border border-black/10 " +
      "dark:bg-white/10 dark:text-neutral-100 dark:border-white/20",
    approved:
      "bg-neutral-900 text-white border border-neutral-900 " +
      "dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-100",
    rejected:
      "bg-transparent text-red-600 border border-red-500/70 " +
      "dark:text-red-300 dark:border-red-400/80",
    default:
      "bg-black/5 text-neutral-800 border border-black/10 " +
      "dark:bg-white/10 dark:text-neutral-100 dark:border-white/20",
  };

  const cls = map[color] || map.default;

  return <span className={`${base} ${cls}`}>{children}</span>;
};

// هم named export داشته باشیم، هم default
export const Tag = TagBase;
export default TagBase;
