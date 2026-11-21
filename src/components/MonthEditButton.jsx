import React from "react";

export default function MonthEditButton({ month, editing, onClick }) {
  return <button type="button" onClick={onClick} aria-label={`ویرایش ${month}`} aria-pressed={editing} title={`ویرایش ${month}`} className={`inline-grid h-7 w-7 place-items-center rounded-lg border border-white/40 transition hover:bg-white/20 ${editing ? "bg-white/25 ring-1 ring-white" : ""}`}><img src="/images/icons/pencil.svg" alt="" className="h-4 w-4 brightness-0 invert" /></button>;
}
