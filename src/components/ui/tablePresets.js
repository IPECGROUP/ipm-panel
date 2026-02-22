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

// Reusable row interaction preset:
// - square multi-select checkboxes
// - hover-only row actions (edit/delete)
// - highlighted selected rows
export const hoverSelectableRowPreset = {
  checkbox: "w-4 h-4 accent-black dark:accent-neutral-200",
  rowBase: "group transition-colors",
  rowSelected: "!bg-black/[0.08] !hover:bg-black/[0.12] dark:!bg-white/15 dark:!hover:bg-white/20",
  rowIdle: "!hover:bg-black/[0.04] dark:!hover:bg-white/10",
  valueCell: "!text-center",
  valueWrap: "relative flex min-h-[34px] items-center justify-center",
  valueText: "block w-full truncate px-12 text-center",
  rowActions:
    "absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1 shrink-0 transition-opacity opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto",
};
