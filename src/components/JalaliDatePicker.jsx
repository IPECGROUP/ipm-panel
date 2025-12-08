// src/components/JalaliDatePicker.jsx
import React, { useEffect, useRef, useState } from "react";
import { Portal } from "./Portal";
import { dayjs, isJalaliYmd } from "../utils/date";
import { Btn } from "./ui/Button";

export function JalaliDatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const makeCursorFromValue = (v) => {
    if (isJalaliYmd(v)) {
      return dayjs(v, { jalali: true }).calendar("jalali");
    }
    return dayjs().calendar("jalali");
  };

  const [cursor, setCursor] = useState(() => makeCursorFromValue(value));

  useEffect(() => {
    setCursor(makeCursorFromValue(value));
  }, [value]);

  const inputRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 260 });

  const daysInMonth = cursor.daysInMonth();
  const firstDow = cursor.startOf("month").day();
  const startPad = (firstDow + 6) % 7;
  const grid = [];
  for (let i = 0; i < startPad; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);

  const pick = (d) => {
    if (!d) return;
    const sel = cursor.date(d);
    const ymd = sel.calendar("jalali").format("YYYY-MM-DD");
    onChange(ymd);
    setOpen(false);
  };

  const prevMonth = () => setCursor((c) => c.subtract(1, "month"));
  const nextMonth = () => setCursor((c) => c.add(1, "month"));

  const openCal = () => {
    if (!inputRef.current) {
      setOpen(true);
      return;
    }
    const r = inputRef.current.getBoundingClientRect();
    const top = r.bottom + 6;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - 268);
    setPos({ top, left, width: 260 });
    setOpen(true);
  };

  useEffect(() => {
    function onDoc(e) {
      if (!open) return;
      const target = e.target;
      const picker = document.getElementById("jalali-picker-pop");
      if (
        picker &&
        (picker.contains(target) || inputRef.current?.contains(target))
      )
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const label = isJalaliYmd(value)
    ? dayjs(value, { jalali: true })
        .calendar("jalali")
        .format("YYYY/MM/DD")
    : "";

  return (
    <>
      <input
        ref={inputRef}
        readOnly
        value={label}
        placeholder="انتخاب تاریخ (شمسی)"
        onClick={openCal}
        className="w-full border border-black/15 rounded-xl px-2 py-1 ltr cursor-pointer bg-white"
      />
      {open && (
        <Portal>
          <div
            id="jalali-picker-pop"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 1000,
            }}
            className="bg-white border border-black/15 rounded-xl shadow p-2"
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-2">
              <Btn onClick={prevMonth}>ماه قبل</Btn>
              <div className="font-semibold">
                {cursor.calendar("jalali").format("YYYY MMMM")}
              </div>
              <Btn onClick={nextMonth}>ماه بعد</Btn>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1">
              {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((h) => (
                <div key={h} className="text-black/70">
                  {h}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {grid.map((d, idx) => (
                <button
                  key={idx}
                  onClick={() => pick(d)}
                  className={`py-1 rounded ${
                    d ? "hover:bg-black/10" : "opacity-0 pointer-events-none"
                  } ${
                    isJalaliYmd(value) &&
                    d ===
                      dayjs(value, { jalali: true })
                        .calendar("jalali")
                        .date() &&
                    cursor.month() ===
                      dayjs(value, { jalali: true })
                        .calendar("jalali")
                        .month()
                      ? "bg-black text-white"
                      : ""
                  }`}
                >
                  {d ? d : "."}
                </button>
              ))}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
