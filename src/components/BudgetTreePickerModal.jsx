import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toEnglishDigits } from "../utils/format.js";

const inputClass = "w-full h-11 rounded-xl border border-black/10 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-white";
const toFa = (value) => String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
const normalizeDigits = (value = "") => toEnglishDigits(String(value ?? "")).replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632));
const normalizeBudgetCode = (value = "") => normalizeDigits(value).trim().toUpperCase().replace(/[^\d.-]/g, "-").replace(/[.-]+/g, "-").replace(/^-|-$/g, "");

export default function BudgetTreePickerModal({ items, selectedCode, query, onQueryChange, onSelect, onClose }) {
  const [expandedCodes, setExpandedCodes] = useState(() => new Set());
  const rows = useMemo(() => {
    const byCode = new Map();
    (Array.isArray(items) ? items : []).forEach((item) => {
      const code = normalizeBudgetCode(item?.code || item?.center_code || item?.budgetCode || item?.budget_code);
      if (!code || byCode.has(code)) return;
      byCode.set(code, {
        code,
        value: String(item?.value ?? item?.budgetCode ?? item?.budget_code ?? code),
        name: String(item?.center_desc || item?.last_desc || item?.budgetName || item?.budget_name || item?.name || item?.description || "").trim(),
      });
    });
    const compareCodes = (left, right) => {
      const leftParts = normalizeBudgetCode(left).split("-").filter(Boolean);
      const rightParts = normalizeBudgetCode(right).split("-").filter(Boolean);
      for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
        const a = leftParts[index]; const b = rightParts[index];
        if (a === undefined) return -1;
        if (b === undefined) return 1;
        if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
          const diff = BigInt(a) === BigInt(b) ? 0 : BigInt(a) < BigInt(b) ? -1 : 1;
          if (diff) return diff;
        } else {
          const diff = a.localeCompare(b, "fa", { numeric: true, sensitivity: "base" });
          if (diff) return diff;
        }
      }
      return 0;
    };
    const childrenByParent = new Map();
    const roots = [];
    byCode.forEach((item, code) => {
      const parts = code.split("-");
      let parentCode = "";
      for (let length = parts.length - 1; length > 0; length -= 1) {
        const candidate = parts.slice(0, length).join("-");
        if (byCode.has(candidate)) { parentCode = candidate; break; }
      }
      if (!parentCode) roots.push(item);
      else childrenByParent.set(parentCode, [...(childrenByParent.get(parentCode) || []), item]);
    });
    const sort = (list) => list.sort((a, b) => compareCodes(a.code, b.code));
    sort(roots);
    childrenByParent.forEach(sort);
    return { roots, childrenByParent };
  }, [items]);
  const allExpandable = useMemo(() => Array.from(rows.childrenByParent.keys()), [rows]);
  const normalizedQuery = normalizeDigits(query).trim().toLowerCase();
  const matchingCodes = useMemo(() => {
    if (!normalizedQuery) return null;
    const matches = new Set();
    const visit = (nodes, ancestors = []) => nodes.forEach((node) => {
      const matchesNode = normalizeDigits(`${node.code} ${node.name}`).toLowerCase().includes(normalizedQuery);
      if (matchesNode) [...ancestors, node.code].forEach((code) => matches.add(code));
      visit(rows.childrenByParent.get(node.code) || [], [...ancestors, node.code]);
    });
    visit(rows.roots);
    return matches;
  }, [normalizedQuery, rows]);
  const toggle = (code) => setExpandedCodes((previous) => {
    const next = new Set(previous);
    if (next.has(code)) next.delete(code); else next.add(code);
    return next;
  });
  const displayRows = useMemo(() => {
    const result = [];
    const visit = (nodes, depth = 0) => nodes.forEach((node) => {
      if (matchingCodes && !matchingCodes.has(node.code)) return;
      const children = rows.childrenByParent.get(node.code) || [];
      const visibleBySearch = Boolean(matchingCodes);
      result.push({ ...node, depth, hasChildren: children.length > 0, expanded: visibleBySearch || expandedCodes.has(node.code) });
      if (visibleBySearch || expandedCodes.has(node.code)) visit(children, depth + 1);
    });
    visit(rows.roots);
    return result;
  }, [expandedCodes, matchingCodes, rows]);
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  const allExpanded = allExpandable.length > 0 && allExpandable.every((code) => expandedCodes.has(code));

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5" dir="rtl">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <section className="relative flex max-h-[min(86vh,760px)] w-[min(920px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white">
        <header className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10"><div className="text-base font-bold">انتخاب کد بودجه</div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-900 text-xl text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900" aria-label="بستن" title="بستن">×</button></header>
        <div className="flex flex-col gap-3 border-b border-black/10 p-3 sm:flex-row dark:border-white/10"><input autoFocus value={query} onChange={(event) => onQueryChange(event.target.value)} className={inputClass} placeholder="جستجو در کد یا نام بودجه..." /></div>
        <div className="grid grid-cols-[42px_150px_minmax(0,1fr)] border-b border-black/10 bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-700 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200"><button type="button" onClick={() => setExpandedCodes(allExpanded ? new Set() : new Set(allExpandable))} disabled={!allExpandable.length || Boolean(normalizedQuery)} className="grid h-8 w-8 place-items-center rounded-lg border border-black/10 text-lg font-semibold transition hover:bg-black/[0.06] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/10" title={allExpanded ? "بستن همه" : "باز کردن همه"} aria-label={allExpanded ? "بستن همه" : "باز کردن همه"}>{allExpanded ? "−" : "+"}</button><span className="self-center text-right">کد بودجه</span><span className="self-center text-right">نام بودجه</span></div>
        <div className="min-h-40 flex-1 overflow-y-auto">
          {displayRows.length ? displayRows.map((row) => <div key={row.code} className={`group grid grid-cols-[42px_150px_minmax(0,1fr)] items-center border-b border-black/[0.07] px-3 py-1.5 transition last:border-b-0 hover:bg-black/[0.035] dark:border-white/[0.08] dark:hover:bg-white/[0.05] ${String(selectedCode) === row.value ? "bg-sky-50 dark:bg-sky-500/10" : ""}`}>
            {row.hasChildren ? <button type="button" onClick={() => toggle(row.code)} className="grid h-8 w-8 place-items-center rounded-lg border border-black/10 text-lg transition hover:bg-black/[0.06] dark:border-white/10 dark:hover:bg-white/10" aria-label={row.expanded ? "بستن زیرمجموعه‌ها" : "نمایش زیرمجموعه‌ها"} title={row.expanded ? "بستن زیرمجموعه‌ها" : "نمایش زیرمجموعه‌ها"}>{row.expanded ? "−" : "+"}</button> : <span />}
            <button type="button" onClick={() => onSelect(row.value)} className={`min-w-0 py-2 text-right font-sans text-sm tabular-nums ${row.hasChildren ? "font-bold" : "font-medium"}`} style={{ paddingRight: `${row.depth * 26}px` }} dir="ltr" title={`انتخاب ${row.code}`}>{toFa(row.code)}</button>
            <button type="button" onClick={() => onSelect(row.value)} className={`min-w-0 py-2 text-right text-sm ${row.hasChildren ? "font-bold" : "font-medium"}`} style={{ paddingRight: `${row.depth * 26}px` }} title={`انتخاب ${row.code}`}><span className="block truncate">{row.name || "بدون عنوان"}</span></button>
          </div>) : <div className="p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">موردی پیدا نشد.</div>}
        </div>
      </section>
    </div>, document.body
  );
}
