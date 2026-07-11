import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

function toFaDigits(s) {
  return String(s || "").replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function toEnDigits(s) {
  return String(s || "")
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

function pad2(n) {
  const x = Number(n) || 0;
  return x < 10 ? `0${x}` : String(x);
}

function getJalaliPartsFromDate(d) {
  try {
    const y = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(d);
    const m = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "numeric" }).format(d);
    const day = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric" }).format(d);
    return {
      jy: Number(toEnDigits(y)) || 1400,
      jm: Number(toEnDigits(m)) || 1,
      jd: Number(toEnDigits(day)) || 1,
    };
  } catch {
    return { jy: 1400, jm: 1, jd: 1 };
  }
}

function normalizePickerValue(value) {
  const v = toEnDigits(String(value || "").trim()).replace(/-/g, "/");
  const m = v.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return "";
  return `${m[1]}/${pad2(m[2])}/${pad2(m[3])}`;
}

export default function JalaliPopupDatePicker({
  value,
  onChange,
  theme,
  buttonClassName,
  hideIcon,
  disableFuture = false,
  disableTodayAndPast = false,
  placeholder = "",
  preventDefaultToday = false,
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const [touched, setTouched] = useState(false);

  const normalizedValue = normalizePickerValue(value);
  const nowParts = useMemo(() => getJalaliPartsFromDate(new Date()), []);
  const minSelectableParts = useMemo(() => getJalaliPartsFromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)), []);
  const initial = useMemo(() => {
    const m = normalizedValue.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (m) return { jy: Number(m[1]), jm: Number(m[2]), jd: Number(m[3]) };
    return nowParts;
  }, [normalizedValue, nowParts]);

  const [jy, setJy] = useState(initial.jy);
  const [jm, setJm] = useState(initial.jm);
  const [jd, setJd] = useState(initial.jd);

  useEffect(() => {
    setJy(initial.jy);
    setJm(initial.jm);
    setJd(initial.jd);
  }, [initial.jy, initial.jm, initial.jd]);

  const maxMonthForYear = (y) => {
    if (!disableFuture) return 12;
    return Number(y) === Number(nowParts.jy) ? Number(nowParts.jm) : 12;
  };

  const minMonthForYear = (y) => {
    if (!disableTodayAndPast) return 1;
    return Number(y) === Number(minSelectableParts.jy) ? Number(minSelectableParts.jm) : 1;
  };

  const maxDayForYearMonth = (y, m) => {
    const maxByMonth = Number(m) <= 6 ? 31 : Number(m) <= 11 ? 30 : 29;
    if (!disableFuture) return maxByMonth;
    if (Number(y) === Number(nowParts.jy) && Number(m) === Number(nowParts.jm)) {
      return Math.min(maxByMonth, Number(nowParts.jd));
    }
    return maxByMonth;
  };

  const minDayForYearMonth = (y, m) => {
    if (!disableTodayAndPast) return 1;
    if (Number(y) === Number(minSelectableParts.jy) && Number(m) === Number(minSelectableParts.jm)) return Number(minSelectableParts.jd);
    return 1;
  };

  const isBeforeMinSelectable = (y, m, d) => {
    if (!disableTodayAndPast) return false;
    const yy = Number(y);
    const mm = Number(m);
    const dd = Number(d);
    if (yy !== Number(minSelectableParts.jy)) return yy < Number(minSelectableParts.jy);
    if (mm !== Number(minSelectableParts.jm)) return mm < Number(minSelectableParts.jm);
    return dd < Number(minSelectableParts.jd);
  };

  const isAfterToday = (y, m, d) => {
    if (!disableFuture) return false;
    const yy = Number(y);
    const mm = Number(m);
    const dd = Number(d);
    if (yy > Number(nowParts.jy)) return true;
    if (yy < Number(nowParts.jy)) return false;
    if (mm > Number(nowParts.jm)) return true;
    if (mm < Number(nowParts.jm)) return false;
    return dd > Number(nowParts.jd);
  };

  useEffect(() => {
    if (!open) return;
    setTouched(false);

    const onDoc = (e) => {
      const t = e.target;
      if (popRef.current && popRef.current.contains(t)) return;
      if (btnRef.current && btnRef.current.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  const years = useMemo(() => {
    const base = disableTodayAndPast ? minSelectableParts.jy : nowParts.jy || 1400;
    const arr = [];
    const maxY = disableFuture ? base : base + 10;
    for (let y = base - 10; y <= maxY; y++) arr.push(y);
    return arr;
  }, [disableFuture, disableTodayAndPast, nowParts.jy, minSelectableParts.jy]);

  const months = useMemo(() => {
    const maxM = maxMonthForYear(jy);
    const arr = [];
    for (let m = minMonthForYear(jy); m <= maxM; m++) arr.push(m);
    return arr;
  }, [jy, disableFuture, disableTodayAndPast, nowParts.jy, nowParts.jm, minSelectableParts.jy, minSelectableParts.jm]);

  const days = useMemo(() => {
    const max = maxDayForYearMonth(jy, jm);
    const arr = [];
    for (let d = minDayForYearMonth(jy, jm); d <= max; d++) arr.push(d);
    return arr;
  }, [jy, jm, disableFuture, disableTodayAndPast, nowParts.jy, nowParts.jm, nowParts.jd, minSelectableParts.jy, minSelectableParts.jm, minSelectableParts.jd]);

  useEffect(() => {
    const maxM = maxMonthForYear(jy);
    if (jm > maxM) setJm(maxM);
    const minM = minMonthForYear(jy);
    if (jm < minM) setJm(minM);
  }, [jy, jm, disableFuture, disableTodayAndPast, nowParts.jy, nowParts.jm, minSelectableParts.jy, minSelectableParts.jm]);

  useEffect(() => {
    const max = maxDayForYearMonth(jy, jm);
    if (jd > max) setJd(max);
    const min = minDayForYearMonth(jy, jm);
    if (jd < min) setJd(min);
  }, [jy, jm, jd, disableFuture, disableTodayAndPast, nowParts.jy, nowParts.jm, nowParts.jd, minSelectableParts.jy, minSelectableParts.jm, minSelectableParts.jd]);

  useEffect(() => {
    if (!disableFuture) return;
    if (!isAfterToday(jy, jm, jd)) return;
    setJy(nowParts.jy);
    setJm(nowParts.jm);
    setJd(nowParts.jd);
  }, [disableFuture, jy, jm, jd, nowParts.jy, nowParts.jm, nowParts.jd]);

  useEffect(() => {
    if (!disableTodayAndPast || !isBeforeMinSelectable(jy, jm, jd)) return;
    setJy(minSelectableParts.jy);
    setJm(minSelectableParts.jm);
    setJd(minSelectableParts.jd);
  }, [disableTodayAndPast, jy, jm, jd, minSelectableParts.jy, minSelectableParts.jm, minSelectableParts.jd]);

  const preview = `${jy}/${pad2(jm)}/${pad2(jd)}`;

  const defaultBtnCls =
    "w-full h-11 px-3 rounded-xl border text-right flex items-center justify-between gap-2 transition " +
    (theme === "dark"
      ? "border-white/15 bg-white/5 text-white/90 hover:bg-white/10"
      : "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]");

  const recalcPos = () => {
    const btn = btnRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();
    const margin = 8;
    const popWidth = Math.min(420, Math.max(0, window.innerWidth - 24));
    const maxRight = Math.max(margin, window.innerWidth - popWidth - margin);
    const right = Math.min(maxRight, Math.max(margin, window.innerWidth - r.right));
    let top = r.bottom + margin;

    const pop = popRef.current;
    if (pop) {
      const pr = pop.getBoundingClientRect();
      const h = pr.height || 0;
      if (top + h > window.innerHeight - margin) {
        const above = r.top - h - margin;
        if (above >= margin) top = above;
        else top = Math.max(margin, window.innerHeight - h - margin);
      }
    }

    setPos({ top, right });
  };

  useEffect(() => {
    if (!open) return;

    recalcPos();
    const raf = requestAnimationFrame(() => recalcPos());
    const onResize = () => recalcPos();
    const onScrollAny = () => recalcPos();
    window.addEventListener("resize", onResize);
    document.addEventListener("scroll", onScrollAny, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("scroll", onScrollAny, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={buttonClassName ? buttonClassName : defaultBtnCls}
      >
        <span className={normalizedValue ? "" : theme === "dark" ? "text-white/50" : "text-neutral-400"}>
          {normalizedValue ? toFaDigits(normalizedValue) : placeholder}
        </span>

        {!hideIcon && (
          <span className={theme === "dark" ? "text-white/50" : "text-neutral-500"}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={popRef}
            className={
              "fixed z-[9999] w-[min(420px,calc(100vw-24px))] rounded-2xl border shadow-lg p-4 " +
              (theme === "dark" ? "border-white/10 bg-neutral-900 text-white" : "border-black/10 bg-white text-neutral-900")
            }
            style={{ top: pos.top, right: pos.right, maxHeight: "calc(100vh - 16px)", overflowY: "auto" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-sm">انتخاب تاریخ</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={
                  "h-9 w-9 rounded-xl border flex items-center justify-center transition " +
                  (theme === "dark" ? "border-white/10 hover:bg-white/10" : "border-black/10 hover:bg-black/[0.04]")
                }
                aria-label="بستن"
                title="بستن"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className={theme === "dark" ? "text-white/70 text-xs mb-1" : "text-neutral-600 text-xs mb-1"}>روز</div>
                <select
                  value={jd}
                  onChange={(e) => {
                    setTouched(true);
                    setJd(Number(e.target.value));
                  }}
                  className={"w-full h-11 px-3 rounded-xl border outline-none " + (theme === "dark" ? "border-white/15 bg-white/5 text-white" : "border-black/10 bg-white text-neutral-900")}
                >
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {toFaDigits(d)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className={theme === "dark" ? "text-white/70 text-xs mb-1" : "text-neutral-600 text-xs mb-1"}>ماه</div>
                <select
                  value={jm}
                  onChange={(e) => {
                    setTouched(true);
                    setJm(Number(e.target.value));
                  }}
                  className={"w-full h-11 px-3 rounded-xl border outline-none " + (theme === "dark" ? "border-white/15 bg-white/5 text-white" : "border-black/10 bg-white text-neutral-900")}
                >
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {PERSIAN_MONTHS[m - 1]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className={theme === "dark" ? "text-white/70 text-xs mb-1" : "text-neutral-600 text-xs mb-1"}>سال</div>
                <select
                  value={jy}
                  onChange={(e) => {
                    setTouched(true);
                    setJy(Number(e.target.value));
                  }}
                  className={"w-full h-11 px-3 rounded-xl border outline-none " + (theme === "dark" ? "border-white/15 bg-white/5 text-white" : "border-black/10 bg-white text-neutral-900")}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {toFaDigits(y)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className={theme === "dark" ? "text-white/70 text-xs" : "text-neutral-600 text-xs"}>
                پیش نمایش: <span className="font-semibold">{toFaDigits(preview)}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end w-full">
                <button
                  type="button"
                  onClick={() => {
                    if (disableTodayAndPast && isBeforeMinSelectable(jy, jm, jd)) {
                      setJy(minSelectableParts.jy);
                      setJm(minSelectableParts.jm);
                      setJd(minSelectableParts.jd);
                      return;
                    }
                    if (preventDefaultToday && !normalizedValue && !touched) {
                      setOpen(false);
                      return;
                    }
                    onChange(preview);
                    setOpen(false);
                  }}
                  className={"h-10 px-4 rounded-xl transition " + (theme === "dark" ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90")}
                >
                  تایید
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={"h-10 px-4 rounded-xl border transition " + (theme === "dark" ? "border-white/15 hover:bg-white/10" : "border-black/10 hover:bg-black/[0.04]")}
                >
                  بستن
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
