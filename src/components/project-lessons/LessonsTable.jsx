import React, { useState } from "react";
import { createPortal } from "react-dom";
import { dayjs } from "../../utils/date.js";

const IMPORTANCE_LABELS = new Map([
  ["low", "کم"],
  ["medium", "متوسط"],
  ["high", "زیاد"],
]);

function toPersianDigits(value = "") {
  return String(value ?? "").replace(
    /\d/g,
    (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)],
  );
}

function formatJalaliDate(value) {
  const parsed = dayjs(value);
  if (!parsed.isValid()) return "";
  return toPersianDigits(parsed.calendar("jalali").format("YYYY/MM/DD"));
}

function EmptyRow({ children }) {
  return (
    <tr>
      <td colSpan={6} className="p-8 text-center text-neutral-500">
        {children}
      </td>
    </tr>
  );
}

export default function LessonsTable({
  items,
  hasUnfilteredItems,
  loading,
  canReview,
  selectedIds,
  allSelected,
  deleting,
  onToggleAll,
  onToggleSelected,
  onOpenItem,
  onEditSelected,
  onDeleteSelected,
  onOpenAuthorInfo,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="overflow-auto" dir="ltr">
        <table
          dir="rtl"
          className="w-full min-w-[700px] table-fixed text-sm [&_td]:text-center [&_th]:text-center"
        >
          <colgroup>
            <col style={{ width: 52 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 135 }} />
            <col />
            <col style={{ width: 220 }} />
            <col style={{ width: 150 }} />
          </colgroup>

          <thead>
            <tr className="border-b border-neutral-300 bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800">
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                />
              </th>
              <th className="px-3 py-3">ردیف</th>
              <th className="px-3 py-3">تاریخ</th>
              <th className="px-3 py-3">دسته‌بندی</th>
              <th className="px-3 py-3">دانش‌آفرین</th>
              <th className="relative px-3 py-3">
                <span>اهمیت</span>
                {canReview && (
                  <TableMenu
                    selectedCount={selectedIds.size}
                    deleting={deleting}
                    onEdit={onEditSelected}
                    onDelete={onDeleteSelected}
                  />
                )}
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <EmptyRow>در حال دریافت...</EmptyRow>
            ) : !items.length ? (
              <EmptyRow>
                {hasUnfilteredItems
                  ? "موردی مطابق فیلتر پیدا نشد."
                  : "هنوز درس‌آموخته‌ای ثبت نشده است."}
              </EmptyRow>
            ) : (
              items.map((item, index) => (
                <LessonRow
                  key={item.id}
                  item={item}
                  index={index}
                  selected={selectedIds.has(String(item.id))}
                  onToggleSelected={onToggleSelected}
                  onOpen={onOpenItem}
                  onOpenAuthorInfo={onOpenAuthorInfo}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LessonRow({
  item,
  index,
  selected,
  onToggleSelected,
  onOpen,
  onOpenAuthorInfo,
}) {
  const pending = item.status === "pending";
  const rowTone = pending
    ? "bg-sky-50/60 dark:bg-sky-500/[.06]"
    : "bg-black/[.01] dark:bg-white/[.03]";

  return (
    <tr
      onClick={() => onOpen(item)}
      className={`h-12 cursor-pointer border-t border-neutral-200 transition hover:bg-black/[.04] dark:border-neutral-700 dark:hover:bg-white/[.08] ${rowTone}`}
    >
      <td
        className="relative px-3"
        onClick={(event) => event.stopPropagation()}
      >
        {item.isUnread && (
          <span
            className="absolute left-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,.13)]"
            title="جدید و خوانده‌نشده"
          />
        )}
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelected(item.id)}
        />
      </td>

      <td className="px-3">{toPersianDigits(index + 1)}</td>
      <td className="px-3">{formatJalaliDate(item.createdAt)}</td>
      <td className="truncate px-3" title={item.category}>
        <span>{item.category}</span>
        {pending && (
          <span className="mr-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
            در انتظار بررسی
          </span>
        )}
      </td>

      <td className="px-3">
        <span className="inline-flex items-center justify-center gap-1.5">
          <span>{item.authorName}</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenAuthorInfo(
                item,
                event.currentTarget.getBoundingClientRect(),
              );
            }}
            className="inline-grid h-5 w-5 place-items-center rounded-full border border-black/20 bg-white text-[11px] font-bold text-neutral-600 transition hover:bg-neutral-100 dark:border-white/20 dark:bg-white/5 dark:text-neutral-200"
            title="اطلاعات دانش‌آفرین"
          >
            i
          </button>
        </span>
      </td>

      <td className="px-3">{IMPORTANCE_LABELS.get(item.importance) || "—"}</td>
    </tr>
  );
}

function TableMenu({ selectedCount, deleting, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 8 });

  const toggleMenu = (event) => {
    if (!open) {
      const rect = event.currentTarget.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: Math.max(8, Math.min(rect.right - 220, window.innerWidth - 228)),
      });
    }
    setOpen((current) => !current);
  };

  const runAndClose = (action) => {
    action();
    setOpen(false);
  };

  return (
    <div className="absolute left-2 top-1/2 -translate-y-1/2">
      <button
        type="button"
        onClick={toggleMenu}
        className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/[.08] dark:hover:bg-white/10"
        title="مدیریت موارد"
      >
        <img
          src="/images/icons/menu-table.svg"
          alt=""
          className="h-4 w-3 dark:invert"
        />
      </button>

      {open &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[9998] cursor-default"
              onClick={() => setOpen(false)}
              aria-label="بستن منو"
            />
            <div
              dir="rtl"
              style={{ top: position.top, left: position.left }}
              className="fixed z-[9999] w-[220px] rounded-2xl border border-black/10 bg-white p-1.5 text-right shadow-[0_18px_45px_rgba(0,0,0,.22)] dark:border-white/10 dark:bg-neutral-900"
            >
              <div className="px-2.5 pb-2 pt-1.5 text-xs text-neutral-500">
                {selectedCount
                  ? `${toPersianDigits(selectedCount)} مورد انتخاب شده`
                  : "ابتدا مورد موردنظر را انتخاب کنید"}
              </div>
              <MenuButton
                icon="/images/icons/pencil.svg"
                tone="amber"
                disabled={selectedCount !== 1}
                onClick={() => runAndClose(onEdit)}
              >
                ویرایش
              </MenuButton>
              <MenuButton
                icon="/images/icons/hazf.svg"
                tone="red"
                disabled={!selectedCount || deleting}
                onClick={() => runAndClose(onDelete)}
              >
                {deleting ? "در حال حذف..." : "حذف"}
              </MenuButton>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

function MenuButton({ icon, tone, disabled, onClick, children }) {
  const red = tone === "red";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold transition disabled:opacity-40 ${
        red
          ? "text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
          : "hover:bg-amber-50 dark:hover:bg-amber-500/10"
      }`}
    >
      <span
        className={`grid h-8 w-8 place-items-center rounded-lg ${
          red
            ? "bg-red-100 dark:bg-red-500/15"
            : "bg-amber-100 dark:bg-amber-500/15"
        }`}
      >
        <img
          src={icon}
          alt=""
          className={`h-4 w-4 ${red ? "" : "dark:invert"}`}
        />
      </span>
      {children}
    </button>
  );
}
