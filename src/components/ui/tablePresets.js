// Shared table presets to keep visual consistency across pages.
export const baseCurrenciesTablePreset = {
  outer: "bg-white text-black overflow-hidden dark:bg-neutral-900 dark:text-neutral-100",
  innerPad: "px-[15px] pb-4",
  frame:
    "rounded-2xl border border-black/10 overflow-hidden bg-white text-black dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800",
  table:
    "w-full text-sm [&_th]:text-center [&_td]:text-center [&_th]:py-1 [&_td]:py-1.5",
  headRow:
    "bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700",
  th: "!text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]",
  body:
    "[&_td]:text-black dark:[&_td]:text-neutral-100 [&_tr:nth-child(odd)]:bg-white [&_tr:nth-child(even)]:bg-neutral-50 dark:[&_tr:nth-child(odd)]:bg-neutral-900 dark:[&_tr:nth-child(even)]:bg-neutral-800/50 [&_tr:not(:last-child)_td]:border-b [&_tr:not(:last-child)_td]:border-neutral-300 dark:[&_tr:not(:last-child)_td]:border-neutral-700",
  rowDivider: "border-b border-neutral-300 dark:border-neutral-700",
  emptyRow: "text-center text-black/60 dark:text-neutral-400 py-3",
};
