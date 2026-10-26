import React from "react";
import UnifiedTagPicker from "../UnifiedTagPicker.jsx";

export function FormBadge({ value }) {
  return (
    <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[10px] text-white">
      {value}
    </span>
  );
}

export function TagButton({ count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative grid h-11 w-14 place-items-center rounded-xl border border-black/10 bg-white dark:border-white/15 dark:bg-white/5"
      title="انتخاب برچسب"
    >
      <img src="/images/icons/tags.svg" alt="" className="h-5 w-5 dark:invert" />
      {count > 0 && <FormBadge value={count} />}
    </button>
  );
}

export function UploadButton({ count = 0, uploading = false, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || uploading}
      className="relative grid h-11 w-14 place-items-center rounded-xl border border-black/10 bg-white disabled:opacity-50 dark:border-white/15 dark:bg-white/5"
      title="بارگذاری فایل"
    >
      <img
        src="/images/icons/upload.svg"
        alt=""
        className={`h-5 w-5 dark:invert ${uploading ? "animate-pulse" : ""}`}
      />
      {count > 0 && <FormBadge value={count} />}
    </button>
  );
}

export function TagPicker({ selected, onClose, onConfirm }) {
  return <UnifiedTagPicker selectedIds={selected} onClose={onClose} onConfirm={onConfirm} />;
}
