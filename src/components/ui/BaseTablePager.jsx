const toFa = (value) => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

export default function BaseTablePager({ total, page, pageSize, onPageChange, onPageSizeChange }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const end = Math.min(total, start + pageSize);

  return <div className="border-t border-neutral-300 px-2.5 py-2.5 dark:border-neutral-800 sm:px-3">
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex items-center justify-between gap-2 text-sm md:justify-start">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onPageChange(Math.max(0, safePage - 1))} disabled={safePage === 0} className="inline-grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white transition hover:bg-black/[0.04] disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" aria-label="صفحه قبل"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 18l6-6-6-6" /></svg></button>
          <button type="button" onClick={() => onPageChange(Math.min(pageCount - 1, safePage + 1))} disabled={safePage >= pageCount - 1} className="inline-grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white transition hover:bg-black/[0.04] disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" aria-label="صفحه بعد"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 18l-6-6 6-6" /></svg></button>
        </div>
        <span className="whitespace-nowrap text-black/70 dark:text-neutral-400">{total ? `${toFa(start + 1)}–${toFa(end)} از ${toFa(total)}` : "۰ از ۰"}</span>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs sm:text-sm md:justify-start">
        <span className="text-black/70 dark:text-neutral-400">تعداد در هر صفحه:</span>
        <div className="inline-flex h-9 overflow-hidden rounded-lg border border-black/10 bg-white dark:border-white/15 dark:bg-white/5">
          {[10, 25, 100].map((count) => <button key={count} type="button" onClick={() => { onPageSizeChange(count); onPageChange(0); }} className={`min-w-10 px-2.5 text-sm font-semibold transition sm:px-3 ${pageSize === count ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-700 hover:bg-black/[0.04] dark:text-white/75 dark:hover:bg-white/10"}`}>{toFa(count)}</button>)}
        </div>
      </div>
    </div>
  </div>;
}
