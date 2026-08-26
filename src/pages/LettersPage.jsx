/* eslint-disable no-empty */
// src/pages/LettersPage.jsx
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../components/AuthProvider";
import { isMainAdminUser } from "../utils/auth";
import { useFeatureAccess, useFeatureVisibility } from "../hooks/useFeatureAccess.js";

const PAGE_ICON = "/images/icons/nameha.svg";

const TAB_ACTIVE_BG = {
  incoming: "#0046FF",
  outgoing: "#8BAE66",
  internal: "#FF8040",
};

const CONFIDENTIAL_TEXT_CLS = "text-red-600 dark:text-red-500";

const MAIN_ADMIN_USER = "marandi";
const MAIN_ADMIN_PASS = "1234";
const ADMIN_FLAG_KEY = "main_admin_ok";

function askMainAdminEnable(setIsMainAdmin) {
  const u = window.prompt("نام کاربری ادمین اصلی:");
  if (String(u || "").trim() !== MAIN_ADMIN_USER) {
    alert("نام کاربری اشتباه است.");
    return;
  }

  const p = window.prompt("رمز ادمین اصلی:");
  if (String(p || "").trim() !== MAIN_ADMIN_PASS) {
    alert("رمز اشتباه است.");
    return;
  }

  localStorage.setItem(ADMIN_FLAG_KEY, "1");
  setIsMainAdmin(true);
}

const LETTERS_CACHE_KEY = "letters_mine_cache_v1";
const LETTERS_CACHE_TTL_MS = 5 * 60 * 1000;
const LETTER_DRAFT_STORAGE_KEY = "ipm_letters_form_drafts_v1";
const LETTER_DRAFT_SAVE_DELAY_MS = 3000;
const LETTER_FORM_KINDS = ["incoming", "outgoing", "internal"];

const TABS = [
  { id: "all", label: "همه" },
  { id: "incoming", label: "وارده", icon: "/images/icons/varede.svg" },
  { id: "outgoing", label: "صادره", icon: "/images/icons/sadere.svg" },
  { id: "internal", label: "داخلی", icon: "/images/icons/dakheli.svg" },
];

const FILTER_ACTIVE_SCOPE = "letters_filter_active";

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

function JalaliPopupDatePicker({ value, onChange, theme, buttonClassName, hideIcon, disableFuture = false }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const nowParts = useMemo(() => getJalaliPartsFromDate(new Date()), []);
  const initial = useMemo(() => {
    const v = String(value || "");
    const m = v.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (m) {
      return { jy: Number(m[1]), jm: Number(m[2]), jd: Number(m[3]) };
    }
    return nowParts;
  }, [value, nowParts]);

  const [jy, setJy] = useState(initial.jy);
  const [jm, setJm] = useState(initial.jm);
  const [jd, setJd] = useState(initial.jd);

  const maxMonthForYear = (y) => {
    if (!disableFuture) return 12;
    return Number(y) === Number(nowParts.jy) ? Number(nowParts.jm) : 12;
  };

  const maxDayForYearMonth = (y, m) => {
    const maxByMonth = Number(m) <= 6 ? 31 : Number(m) <= 11 ? 30 : 29;
    if (!disableFuture) return maxByMonth;
    if (Number(y) === Number(nowParts.jy) && Number(m) === Number(nowParts.jm)) {
      return Math.min(maxByMonth, Number(nowParts.jd));
    }
    return maxByMonth;
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
    const base = nowParts.jy || 1400;
    const arr = [];
    const maxY = disableFuture ? base : base + 10;
    for (let y = base - 10; y <= maxY; y++) arr.push(y);
    return arr;
  }, [disableFuture, nowParts.jy]);

  const months = useMemo(() => {
    const maxM = maxMonthForYear(jy);
    const arr = [];
    for (let m = 1; m <= maxM; m++) arr.push(m);
    return arr;
  }, [jy, disableFuture, nowParts.jy, nowParts.jm]);

  const days = useMemo(() => {
    const max = maxDayForYearMonth(jy, jm);
    const arr = [];
    for (let d = 1; d <= max; d++) arr.push(d);
    return arr;
  }, [jy, jm, disableFuture, nowParts.jy, nowParts.jm, nowParts.jd]);

  useEffect(() => {
    const maxM = maxMonthForYear(jy);
    if (jm > maxM) setJm(maxM);
  }, [jy, jm, disableFuture, nowParts.jy, nowParts.jm]);

  useEffect(() => {
    const max = maxDayForYearMonth(jy, jm);
    if (jd > max) setJd(max);
  }, [jy, jm, jd, disableFuture, nowParts.jy, nowParts.jm, nowParts.jd]);

  useEffect(() => {
    if (!disableFuture) return;
    if (!isAfterToday(jy, jm, jd)) return;
    setJy(nowParts.jy);
    setJm(nowParts.jm);
    setJd(nowParts.jd);
  }, [disableFuture, jy, jm, jd, nowParts.jy, nowParts.jm, nowParts.jd]);

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
        <span className={value ? "" : theme === "dark" ? "text-white/50" : "text-neutral-400"}>
          {value ? toFaDigits(value) : ""}
        </span>

        {!hideIcon && (
          <span className={theme === "dark" ? "text-white/50" : "text-neutral-500"}>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
            style={{
              top: pos.top,
              right: pos.right,
              maxHeight: "calc(100vh - 16px)",
              overflowY: "auto",
            }}
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
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className={theme === "dark" ? "text-white/70 text-xs mb-1" : "text-neutral-600 text-xs mb-1"}>روز</div>
                <select
                  value={jd}
                  onChange={(e) => setJd(Number(e.target.value))}
                  className={
                    "w-full h-11 px-3 rounded-xl border outline-none " +
                    (theme === "dark" ? "border-white/15 bg-white/5 text-white" : "border-black/10 bg-white text-neutral-900")
                  }
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
                  onChange={(e) => setJm(Number(e.target.value))}
                  className={
                    "w-full h-11 px-3 rounded-xl border outline-none " +
                    (theme === "dark" ? "border-white/15 bg-white/5 text-white" : "border-black/10 bg-white text-neutral-900")
                  }
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
                  onChange={(e) => setJy(Number(e.target.value))}
                  className={
                    "w-full h-11 px-3 rounded-xl border outline-none " +
                    (theme === "dark" ? "border-white/15 bg-white/5 text-white" : "border-black/10 bg-white text-neutral-900")
                  }
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
                    onChange(preview);
                    setOpen(false);
                  }}
                  className={
                    "h-10 px-4 rounded-xl transition " +
                    (theme === "dark" ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90")
                  }
                >
                  تایید
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={
                    "h-10 px-4 rounded-xl border transition " +
                    (theme === "dark" ? "border-white/15 hover:bg-white/10" : "border-black/10 hover:bg-black/[0.04]")
                  }
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

function formatBytes(n) {
  const num = Number(n || 0);
  if (!num) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = num;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${Math.round(v * 10) / 10} ${units[i]}`;
}

const LETTER_UPLOAD_ACCEPT = ".pdf,image/*,.xls,.xlsx,.xlsm,.csv,.ods,.doc,.docx,.odt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const ensureLetterUploadableFile = async (file) => file;

const FieldWrap = React.memo(function FieldWrap({ children }) {
  return <div className="relative pb-4">{children}</div>;
});

// =====================
// Auto Code Helpers (TOP OF FILE) — خارج از کامپوننت
// =====================

// تبدیل رقم فارسی/عربی به انگلیسی
const toEnDigits = (s) =>
  String(s ?? "")
    .replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)])
    .replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)]);

const pad5 = (n) => String(Number(n) || 0).padStart(5, "0");

const normalizeDigits = (s) =>
  String(s ?? "")
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));

// گرفتن ۲ رقم آخر سال شمسی (مثلاً 1404 -> "04")
const getJalaliYY = (date = new Date()) => {
  const y = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(date);
  const en = normalizeDigits(y);
  return en.slice(-2);
};

// پیدا کردن کد پروژه (اول __baseCode بعد code)
const getProjectCode = (projectId, projectsTopOnly) => {
  const pid = String(projectId || "").trim();
  if (!pid) return "";
  const p = (Array.isArray(projectsTopOnly) ? projectsTopOnly : []).find((x) => String(x?.id) === pid);
  const raw = normalizeDigits(String(p?.__baseCode ?? p?.code ?? "").trim());
  if (/^\d{3}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{3})/);
  return m ? m[1] : "";
};

// پارس کردن کد 04/156/10403
const parseAutoCode = (s) => {
  const m = normalizeDigits(String(s || "").trim()).match(/^(\d{2})\/(\d{3})\/(\d{5})$/);
  if (!m) return null;
  return { yy: m[1], pcode: m[2], seq: Number(m[3]) };
};

const parsePlainSequence = (s) => {
  const v = normalizeDigits(String(s || "")).trim();
  if (!/^\d{5}$/.test(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const parseAutoLetterSequence = (s, yy) => {
  const normalized = normalizeDigits(String(s || "").trim());
  if (!normalized) return null;

  const parsed = parseAutoCode(normalized);
  if (!parsed || parsed.yy !== yy) return null;
  return Number.isFinite(parsed.seq) ? parsed.seq : null;
};

// =====================
// Auto Code Generator — خارج از کامپوننت
// =====================
const _computeNextAutoCode = ({ projectId, letters, projectsTopOnly }) => {
  const yy = getJalaliYY(new Date());
  const pcode = getProjectCode(projectId, projectsTopOnly);
  if (!pcode) return "";

  const startByYear = 10000;
  let maxAutoSeq = 0;
  let maxLegacyPlainSeq = 0;

  (Array.isArray(letters) ? letters : []).forEach((l) => {
  const rawCandidates = [
    l?.letter_no,
    l?.letterNo,
    l?.secretariat_no,
    l?.secretariatNo,
  ].filter((x) => String(x ?? "").trim());

  if (!rawCandidates.length) return;

  for (const rawNo of rawCandidates) {
    const autoSeq = parseAutoLetterSequence(rawNo, yy);
    if (Number.isFinite(autoSeq) && autoSeq > maxAutoSeq) maxAutoSeq = autoSeq;

    const plainSeq = parsePlainSequence(rawNo);
    if (Number.isFinite(plainSeq) && plainSeq > maxLegacyPlainSeq) {
      maxLegacyPlainSeq = plainSeq;
    }
  }
});

  const maxSeq = maxAutoSeq || maxLegacyPlainSeq;
  const nextSeq = maxSeq >= startByYear ? (maxSeq + 1) : startByYear;
  return `${yy}/${pcode}/${pad5(nextSeq)}`;
};
function makeProgressUpdater(setDocFilesFor, kind, fileId) {
  let lastP = -1;
  let lastT = 0;

  return (p) => {
    const now = Date.now();
    // فقط وقتی تغییر معنی‌دار داشت یا زمان کافی گذشته بود
    if (p === 0 || p === 100 || (p - lastP >= 5 && now - lastT >= 120)) {
      lastP = p;
      lastT = now;
      setDocFilesFor(kind, (prev) =>
        prev.map((x) => (x.id === fileId ? { ...x, progress: p } : x))
      );
    }
  };
}

async function runWithLimit(tasks, limit = 2) {
  const executing = new Set();
  const results = [];

  for (const task of tasks) {
    const p = Promise.resolve().then(task);
    results.push(p);
    executing.add(p);
    p.finally(() => executing.delete(p));

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.allSettled(results);
}

async function _uploadQueueInBackground({
  kind,
  queue,
  letterId,
  uploadFileToLetter,
  setDocFilesFor,
}) {
  const tasks = queue.map((f) => async () => {
    const fileToSend = f.optimizedFile || f.file;

    setDocFilesFor(kind, (prev) =>
      prev.map((x) =>
        x.id === f.id ? { ...x, status: "uploading", progress: 0, error: "" } : x
      )
    );

    try {
      const onProg = makeProgressUpdater(setDocFilesFor, kind, f.id);

      const res = await uploadFileToLetter(fileToSend, letterId, onProg);

      setDocFilesFor(kind, (prev) =>
        prev.map((x) =>
          x.id === f.id
            ? {
                ...x,
                status: "done",
                progress: 100,
                serverId: res?.item?.id ?? res?.id ?? x.serverId,
                url: res?.item?.url ?? res?.url ?? x.url,
              }
            : x
        )
      );
    } catch (e) {
      setDocFilesFor(kind, (prev) =>
        prev.map((x) =>
          x.id === f.id
            ? { ...x, status: "error", error: e?.message || "خطا در آپلود فایل." }
            : x
        )
      );
    }
  });

  // همزمانی 2 تا (می‌تونی 3 هم بذاری)
  await runWithLimit(tasks, 2);
}

export default function LettersPage() {
  useFeatureVisibility("مدیریت اسناد", { "افزودن": "افزودن", "بارگذاری سند پیوست": "بارگذاری پیوست", "نمایش سند پیوست": "پیش نمایش", "ارسال": "ارسال", "ویرایش": "ویرایش" });
  const { can: canDocumentFeature } = useFeatureAccess("مدیریت اسناد");
// ✅ Validation (per tab)
const [errorsByKind, setErrorsByKind] = useState({
  incoming: {},
  outgoing: {},
  internal: {},
});
const [submitTriedByKind, setSubmitTriedByKind] = useState({
  incoming: false,
  outgoing: false,
  internal: false,
});

const [isSubmitting, _setIsSubmitting] = useState(false);

const fieldHasError = (kind, key) =>
  !!(submitTriedByKind?.[kind] && errorsByKind?.[kind]?.[key]);

const inputWithError = (baseCls, kind, key) =>
  baseCls + (fieldHasError(kind, key) ? " !border-red-500 !ring-1 !ring-red-500" : "");

// خطا فقط با قرمز شدن خود فیلد نمایش داده می‌شود.
const ErrorTextAbs = () => null;

// ✅ وقتی کاربر تایپ کرد، ارور همان فیلد در همان تب پاک شود
const clearFieldError = (kind, k) => {
  if (!submitTriedByKind?.[kind]) return;
  setErrorsByKind((prev) => {
    const cur = prev?.[kind] || {};
    if (!cur?.[k]) return prev;
    const nextKind = { ...cur };
    delete nextKind[k];
    return { ...prev, [kind]: nextKind };
  });
};


// ✅ اینجا تعیین کن کدوم فیلدها اجباری هستن


const REQUIRED_MSG = "کامل کردن این فیلد ضروری است";

// ✅ required ها دقیقاً طبق گفته‌ی تو
const REQUIRED = {
  internal: ["letterDate", "subject", "internalUnitId", "formTags"],

  outgoing: [
    "category",     // کلاس سند
    "projectId",    // مرکز/پروژه
    "fromName",     // از
    "toName",       // به
    "orgName",      // شرکت/سازمان
    "subject",      // موضوع
    "formTags",     // برچسب
  ],

  incoming: [
    "classification", // طبقه بندی
    "projectId",      // شماره از سرور با پروژه ساخته می‌شود
    "letterNo",       // شماره سند
    "letterDate",     // تاریخ سند
    "fromName",       // از
    "toName",         // به
    "orgName",        // شرکت/سازمان
    "subject",        // موضوع
    "formTags",       // برچسب
  ],
};

const requiredMark = (kind, key) =>
  (REQUIRED?.[kind] || []).includes(key) ? <span className="mr-1 text-red-500">*</span> : null;

const requiredLabel = (label, kind, key) => (
  <>
    {label}
    {requiredMark(kind, key)}
  </>
);

const validate = (kind) => {
  // ✅ فقط همین تب
  setSubmitTriedByKind((p) => ({ ...p, [kind]: true }));

  const isEmpty = (v) => {
    if (v === null || v === undefined) return true;
    if (typeof v === "string") return v.trim() === "";
    if (Array.isArray(v)) return v.length === 0;
    return false;
  };

  // ✅ مقادیر هر تب جدا
  const valuesByKind = {
    incoming: {
      classification: incomingForm.classification,
      projectId: incomingForm.projectId,
      letterNo: incomingForm.letterNo,
      letterDate: incomingForm.letterDate,
      fromName: incomingForm.fromName,
      toName: incomingForm.toName,
      orgName: incomingForm.orgName,
subject: incomingForm.subject,
      formTags: Array.isArray(incomingTagIds) ? incomingTagIds : [],
    },

    outgoing: {
      category: outgoingForm.category,
      projectId: outgoingForm.projectId,
      letterDate: outgoingForm.letterDate,
      fromName: outgoingForm.fromName,
      toName: outgoingForm.toName,
      orgName: outgoingForm.orgName,
      subject: outgoingForm.subject,
      formTags: Array.isArray(outgoingTagIds) ? outgoingTagIds : [],
    },

    internal: {
      letterDate: internalForm.letterDate,
      subject: internalForm.subject,
      internalUnitId,
      formTags: Array.isArray(internalTagIds) ? internalTagIds : [],
    },
  };

  const values = valuesByKind[kind] || {};
  const req = REQUIRED[kind] || [];

  const next = {};
  for (const key of req) {
  if (isEmpty(values[key])) next[key] = REQUIRED_MSG;
  }

  setErrorsByKind((p) => ({ ...p, [kind]: next }));
  return Object.keys(next).length === 0;
};


// ===== Related picker modal =====
const [relatedPickOpen, setRelatedPickOpen] = useState(false);
const [relatedPickQuery, setRelatedPickQuery] = useState("");
const [relatedPickIds, setRelatedPickIds] = useState([]);

  const [relatedPickQueryDebounced, setRelatedPickQueryDebounced] = useState("");

useEffect(() => {
  if (!relatedPickOpen) return;

  const t = setTimeout(() => {
    setRelatedPickQueryDebounced(relatedPickQuery);
  }, 150);

  return () => clearTimeout(t);
}, [relatedPickQuery, relatedPickOpen]);
  const [filterQuery, setFilterQuery] = useState("");
  const { user } = useAuth();
  const [isMainAdmin, setIsMainAdmin] = useState(false);

  useEffect(() => {
    setIsMainAdmin(localStorage.getItem(ADMIN_FLAG_KEY) === "1");
  }, []);

  const canSeeMainAdminLogin = useMemo(() => isMainAdminUser(user), [user]);
 const [filterTab, setFilterTab] = useState("all"); // اول این
 const [filterTagIds, setFilterTagIds] = useState([]); // ✅ global
  const tableScrollRef = useRef(null);
const [hasYScroll, setHasYScroll] = useState(false);
  const API_BASE = String(import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
  const uploadedFileApiUrlOf = (id) => {
    const value = String(id ?? "").trim();
    if (!/^\d+$/.test(value)) return "";
    return `${API_BASE}/files/${encodeURIComponent(value)}`;
  };
  const letterAttachmentApiUrlOf = (letterId, index) => {
    const id = String(letterId ?? "").trim();
    const idx = Number(index);
    if (!/^\d+$/.test(id) || !Number.isInteger(idx) || idx < 0) return "";
    return `${API_BASE}/letter-attachments/${encodeURIComponent(id)}/${encodeURIComponent(String(idx))}`;
  };
  async function api(path, opt = {}) {
    const uid = user?.id != null ? String(user.id) : "";
    const res = await fetch(API_BASE + path, {
      credentials: "include",
      ...opt,
      headers: {
        "Content-Type": "application/json",
        ...(uid ? { "x-user-id": uid } : {}),
        ...(opt.headers || {}),
      },
    });
    const txt = await res.text();
    let data = {};
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch {}
    if (!res.ok) throw new Error(data?.error || data?.message || "request_failed");
    return data;
  }

  const lettersCacheKey = () => `${LETTERS_CACHE_KEY}:u${String(user?.id || "")}`;

  const readLettersCache = () => {
    if (!user?.id) return [];
    try {
      const cached = JSON.parse(sessionStorage.getItem(lettersCacheKey()) || "null");
      if (!cached || Date.now() - Number(cached.savedAt || 0) > LETTERS_CACHE_TTL_MS) return [];
      return Array.isArray(cached.items) ? cached.items : [];
    } catch {
      return [];
    }
  };

  const saveLettersCache = (items) => {
    if (!user?.id) return;
    try {
      sessionStorage.setItem(lettersCacheKey(), JSON.stringify({ savedAt: Date.now(), items }));
    } catch {}
  };
// ===== Letter Prefs (backend) =====
const LETTER_PREFS_ENDPOINT = "/tag-prefs";

async function fetchLetterPrefs() {
  const r = await api(LETTER_PREFS_ENDPOINT, { method: "GET" });
  return r?.item || r?.prefs || {};
}

// ✅ مهم: برای جلوگیری از missing_id به جای PATCH از POST استفاده کن (upsert)
async function patchLetterPrefs(patch) {
  const r = await api(LETTER_PREFS_ENDPOINT, {
    method: "POST",
    body: JSON.stringify(patch || {}),
  });
  return r?.item || r?.prefs || {};
}

  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  useEffect(() => {
  if (!user?.id) return;

  try {
    const raw = localStorage.getItem(activeFilterLsKey());
    const parsed = raw ? JSON.parse(raw) : null;
    const ids = normalizeIdList(parsed?.ids || []).slice(0, TAG_PREFS_LIMIT);
    setFilterTagIds(ids); // ✅
  } catch {
    setFilterTagIds([]);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id]);

useEffect(() => {
  if (!user?.id) return;

  try {
    const clean = normalizeIdList(filterTagIds).slice(0, TAG_PREFS_LIMIT);
    localStorage.setItem(activeFilterLsKey(), JSON.stringify({ t: Date.now(), ids: clean }));
  } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id, filterTagIds]);

  useEffect(() => {
    const el = document.documentElement;
    const apply = () => setTheme(el.classList.contains("dark") ? "dark" : "light");
    apply();
    const obs = new MutationObserver(() => apply());
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const [formOpen, setFormOpen] = useState(false);
  const letterDraftSaveTimerRef = useRef(null);
  const lastLetterDraftSignatureRef = useRef("");
  const lastSavedLetterDraftKeyRef = useRef("");
  const letterDraftHydratingRef = useRef(false);
const [formKind, setFormKind] = useState("incoming"); // نوع نامه داخل فرم: وارده/صادره/داخلی

  // ✅ edit state
  const [editingId, setEditingId] = useState(null);
// ✅ برچسب‌ها (تنها چیز مشترک بین هر سه تب)
const [_formTagIds, _setFormTagIds] = useState([]);

// ✅ فرم‌ها جدا (برای جلوگیری از قاطی شدن بین تب‌ها)
const [incomingForm, setIncomingForm] = useState({
  category: "نامه",
  classification: "عادی",
  projectId: "",
  letterNo: "",
  letterDate: "",
  fromName: "",
  orgName: "",
  subject: "",
  toName: "",
});

const [outgoingForm, setOutgoingForm] = useState({
category: "نامه",
  classification: "عادی",
  projectId: "",
    letterNo: "",
  letterDate: "",
    fromName: "",      
  toName: "",
  orgName: "",
  subject: "",
});

const [internalForm, setInternalForm] = useState({
  category: "نامه",
  classification: "عادی",
  projectId: "",     
  letterNo: "",      
  letterDate: "",
  subject: "",
});

// ✅ helpers
const getForm = (kind) =>
  kind === "outgoing" ? outgoingForm : kind === "internal" ? internalForm : incomingForm;

const setForm = (kind, patch) => {
  if (kind === "outgoing") setOutgoingForm((p) => ({ ...p, ...patch }));
  else if (kind === "internal") setInternalForm((p) => ({ ...p, ...patch }));
  else setIncomingForm((p) => ({ ...p, ...patch }));
};

const getSecretariatNoForKind = (kind) =>
  kind === "incoming"
    ? incomingSecretariatNo
    : kind === "outgoing"
    ? outgoingSecretariatNo
    : internalSecretariatNo;

const getSecretariatNoDisplayForKind = (kind) =>
  nextCodeLoadingKind === kind
    ? "\u062f\u0631 \u062d\u0627\u0644 \u062f\u0631\u06cc\u0627\u0641\u062a..."
    : getSecretariatNoForKind(kind);

const getEffectiveLetterNoForKind = (kind) => {
  if (kind === "incoming") return String(incomingForm.letterNo || "").trim();
  if (kind === "internal") return String(internalSecretariatNo || internalForm.letterNo || "").trim();
  return String(outgoingSecretariatNo || outgoingForm.letterNo || "").trim();
};

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFor, setUploadFor] = useState("incoming");
  const [uploadTargetLetterId, setUploadTargetLetterId] = useState("");

  const closeUpload = () => {
    setUploadOpen(false);
    setUploadTargetLetterId("");
  };
    
// ===== Units (for internal letters) =====
const [unitsAll, setUnitsAll] = useState([]);
const [unitsLoaded, setUnitsLoaded] = useState(false);
const [internalUnitId, setInternalUnitId] = useState("");

const unitIdOf = (u) => String(u?.id ?? u?.unit_id ?? "");
const unitLabelOf = (u) => String(u?.name ?? u?.title ?? u?.label ?? u?.unit_name ?? "").trim();

const myUnitsFromUser = useMemo(() => {
  const u = user || {};
  const arr =
    Array.isArray(u?.units) ? u.units :
    Array.isArray(u?.user_units) ? u.user_units :
    Array.isArray(u?.unit_ids) ? u.unit_ids.map((id) => ({ id })) :
    [];
  return arr;
}, [user]);

const unitOptions = useMemo(() => {
  const map = new Map();

  (Array.isArray(unitsAll) ? unitsAll : []).forEach((x) => {
    const id = unitIdOf(x);
    if (id) map.set(id, x);
  });

  (Array.isArray(myUnitsFromUser) ? myUnitsFromUser : []).forEach((x) => {
    const id = unitIdOf(x);
    if (id && !map.has(id)) map.set(id, x);
  });

  return Array.from(map.entries()).map(([id, obj]) => ({
    id,
    label: unitLabelOf(obj) || id,
  }));
}, [unitsAll, myUnitsFromUser]);

const ORG_UNITS_CACHE_KEY = "org_structure_my_units_v1";

useEffect(() => {
  let mounted = true;

  // 1) اول از کشی که OrgStructurePage می‌سازه بخون
  try {
    const raw =
      sessionStorage.getItem(ORG_UNITS_CACHE_KEY) ||
      localStorage.getItem(ORG_UNITS_CACHE_KEY);

    const parsed = raw ? JSON.parse(raw) : null;

    // کش ممکنه items داشته باشه یا مستقیم آرایه باشه
    const cached =
      Array.isArray(parsed?.items) ? parsed.items :
      Array.isArray(parsed?.units) ? parsed.units :
      Array.isArray(parsed) ? parsed :
      [];

    if (mounted && cached.length) {
      setUnitsAll(cached);
      setUnitsLoaded(true);
      return () => { mounted = false; };
    }
  } catch {}

  // 2) fallback: اگر کش نبود، از API بخون
  (async () => {
    try {
      const r = await api("/base/units");         // ✅ بک‌اندت {units} میده
      const units = Array.isArray(r?.units) ? r.units : [];
      if (!mounted) return;
      setUnitsAll(units);
      setUnitsLoaded(true);
    } catch {
      if (!mounted) return;
      setUnitsAll([]);
      setUnitsLoaded(true);
    }
  })();

  return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

const resolveFileUrl = (u) => {
  const url = String(u || "").trim().replace(/\\/g, "/").replace(/#/g, "%23");
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return window.location.protocol + url;
  if (url.startsWith("/")) {
    try {
      const apiUrl = String(API_BASE || "").trim();
      const abs = /^https?:\/\//i.test(apiUrl) ? new URL(apiUrl) : new URL(window.location.origin);
      return new URL(url, abs.origin).toString();
    } catch {
      return url;
    }
  }

  // اگر بک‌اند "public/..." داد
  if (url.startsWith("public/")) return "/" + url.replace(/^public\//, "");

  return "/" + url;
};


const loggedInUserName = useMemo(() => {
    const u = user || {};
    return String(
  u?.name ||
    u?.full_name ||
    u?.displayName ||
    u?.user_name ||
    u?.username ||
    u?.login ||
    ""
).trim();
  }, [user]);

const loggedInUsername = useMemo(() => {
  const u = user || {};
  return String(u?.username || u?.user_name || u?.login || u?.name || "").trim().toLowerCase();
}, [user]);

const canSeeConfidential = useMemo(() => {
  return canDocumentFeature("اسناد محرمانه");
}, [canDocumentFeature]);

const canEditSecretariatNo = useMemo(() => {
  const ids = [user?.username, user?.user_name, user?.login, user?.name]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

  return ids.includes("rastegar");
}, [user]);

// ===== Filters (page-level) =====
  const [filterQuick, setFilterQuick] = useState(""); // week|2w|1m|3m|6m
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const filterActiveHydratedRef = useRef(false);
  const prefsHydratedRef = useRef(false);

useEffect(() => {
  if (!user?.id) return;
  let mounted = true;

  (async () => {
    const p = await fetchLetterPrefs();
    if (!mounted) return;

    // 1) pinned tags for FILTER bar  -> از all_tag_ids
    const pinned = normalizeIdList(p?.all_tag_ids || []).slice(0, TAG_PREFS_LIMIT);
    setFilterTagPinnedIds(pinned);

    // 2) default tags for FORM (incoming/outgoing/internal)
    setFormTagPrefs({
      incoming: normalizeIdList(p?.incoming_tag_ids || []).slice(0, TAG_PREFS_LIMIT),
      outgoing: normalizeIdList(p?.outgoing_tag_ids || []).slice(0, TAG_PREFS_LIMIT),
      internal: normalizeIdList(p?.internal_tag_ids || []).slice(0, TAG_PREFS_LIMIT),
    });

    prefsHydratedRef.current = true;
  })();

  return () => {
    mounted = false;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id]);

useEffect(() => {
  if (!user?.id) return;
 loadActiveFilterTags(user.id);            // ✅ بدون پارامتر
  filterActiveHydratedRef.current = true; // ✅
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id]);

useEffect(() => {
  if (!filterActiveHydratedRef.current) return;
  saveActiveFilterTags(user.id, filterTagIds);
    // ✅ بدون پارامتر
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [filterTagIds]);

  useEffect(() => {
    if (!uploadOpen) return;
    const onEsc = (e) => {
      if (e.key === "Escape") closeUpload();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadOpen, uploadFor]);


// کلاس سند (گزینه‌های ثابت)
const DOC_CLASS_BASE = [
  "نامه",
  "ترنسمیتال",
  "مستندات داخلی",
  "قرارداد",
  "پیشنهاد (فنی - مالی)",
  "اسناد فنی و مهندسی",
  "اسناد خرید و بازرگانی",
  "اسناد پروژه ای",
  "اسناد مالی",
  "اسناد ثبتی و حقوقی",
];

// گزینه‌های سفارشی (وقتی کاربر «سایر» می‌زند)
const [docClassExtras, _setDocClassExtras] = useState([]);

// پاپ‌آپ «سایر»
const [docClassOtherOpen] = useState(false);
const [_docClassOtherText, _setDocClassOtherText] = useState("");

// طبقه بندی (عادی/محرمانه)

  const [projects, setProjects] = useState([]);
  const [hasAttachment, setHasAttachment] = useState(false);
  const [_incomingAttachmentTitle, setIncomingAttachmentTitle] = useState("");
  const [_outgoingAttachmentTitle, setOutgoingAttachmentTitle] = useState("");
  const [_internalAttachmentTitle, setInternalAttachmentTitle] = useState("");
  const [returnToIds, setReturnToIds] = useState([""]);
  const [piroIds, setPiroIds] = useState([""]);
  const [myLetters, setMyLetters] = useState([]);
  const [relatedOpen, setRelatedOpen] = useState(false);
const [relatedQuery, setRelatedQuery] = useState("");



const openRelatedPicker = () => {
  setRelatedPickIds(
    (Array.isArray(relatedSelectedIds) ? relatedSelectedIds : []).map((x) => String(x))
  );
  setRelatedPickQuery("");
  setRelatedPickOpen(true);
};

const closeRelatedPicker = () => {
  setRelatedPickOpen(false);
  setRelatedPickQuery("");
};

  // ===== helpers: باید قبل از useMemoهایی که ازشون استفاده می‌کنن تعریف بشن =====
  const letterIdOf = (l) => {
    const raw = l?.id ?? l?.letter_id ?? l?.letterId ?? l?._id;
    const id = Number(raw);
    return id && Number.isFinite(id) ? id : String(raw || "");
  };

  const letterKindOf = (l) => {
  const v = String(
    l?.kind || l?.type || l?.direction || l?.io || l?.tab || l?.letter_type || l?.letter_kind || ""
  ).toLowerCase();

  if (v.includes("internal") || v.includes("dakheli") || v.includes("داخلی")) return "internal";
  if (v.includes("out") || v.includes("صادر")) return "outgoing";
  if (v.includes("in") || v.includes("وارده")) return "incoming";
  if (v === "o" || v === "outgoing") return "outgoing";
  if (v === "i" || v === "incoming") return "incoming";
  return "incoming";
};

const normFa = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    // یکسان‌سازی حروف عربی/فارسی
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    // حذف نیم‌فاصله و انواع فاصله‌های خاص
    .replace(/[\u200c\u200f\u202a-\u202e]/g, "")
    .replace(/\s+/g, " ");

const isConfidentialLetter = (l) => {
  // 1) اگر بک‌اند فلگ بولی بده
  const flag =
    l?.is_confidential ??
    l?.isConfidential ??
    l?.confidential ??
    l?.is_secret ??
    l?.isSecret;

  if (flag === true) return true;
  if (flag === 1 || flag === "1") return true;

  // 2) مقدار متنی/آبجکتی
  const raw =
    l?.classification ??
    l?.doc_classification ??
    l?.confidentiality ??
    l?.classification_label ??
    l?.classificationName ??
    (typeof l?.classification === "object" ? (l?.classification?.label ?? l?.classification?.name) : "") ??
    "";

  const v = normFa(raw);

  // فارسی
  if (v.includes("محرمانه")) return true;
  if (v.includes("خیلی محرمانه")) return true;

  // انگلیسی
  if (v.includes("confidential")) return true;
  if (v.includes("secret")) return true;

  return false;
};

  const pickFirstNonEmpty = (...vals) => {
    for (const v of vals) {
      const s = String(v ?? "").trim();
      if (s) return s;
    }
    return "";
  };

  const letterNoOf = (l) =>
    pickFirstNonEmpty(
      l?.secretariat_no,
      l?.secretariatNo,
      l?.letter_no,
      l?.letterNo,
      l?.no,
      l?.number
    );

  const secretariatNoOf = (l) => pickFirstNonEmpty(l?.secretariat_no, l?.secretariatNo);

  const letterDateOf = (l) =>
    pickFirstNonEmpty(
      l?.letter_date,
      l?.letterDate,
      l?.secretariat_date,
      l?.secretariatDate,
      l?.date
    );

  const secretariatDateOf = (l) => pickFirstNonEmpty(l?.secretariat_date, l?.secretariatDate);

  const createdAtMsOf = (l) => {
    const candidates = [
      l?.created_at,
      l?.createdAt,
      l?.inserted_at,
      l?.insertedAt,
      l?.timestamp,
      l?.created_ts,
      l?.createdTs,
    ];

    for (const raw of candidates) {
      const s = String(raw ?? "").trim();
      if (!s) continue;

      const parsed = Date.parse(s);
      if (Number.isFinite(parsed)) return parsed;

      const n = Number(toEnDigits(s));
      if (Number.isFinite(n) && n > 0) return n < 1e12 ? n * 1000 : n;
    }

    return Number.NaN;
  };

  const compareLettersByNewest = (a, b) => {
    const at = createdAtMsOf(a);
    const bt = createdAtMsOf(b);
    if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) return bt - at;
    if (Number.isFinite(at) && !Number.isFinite(bt)) return -1;
    if (!Number.isFinite(at) && Number.isFinite(bt)) return 1;

    const ai = Number(toEnDigits(String(letterIdOf(a) || "")));
    const bi = Number(toEnDigits(String(letterIdOf(b) || "")));
    if (Number.isFinite(ai) && Number.isFinite(bi) && ai !== bi) return bi - ai;

    return String(letterIdOf(b) || "").localeCompare(String(letterIdOf(a) || ""), "en", {
      numeric: true,
      sensitivity: "base",
    });
  };

  const normalizeDocNo = (v) =>
    toEnDigits(String(v ?? ""))
      .replace(/\u200c|\u200d|\u200e|\u200f|[\u202a-\u202e]/g, "")
      .replace(/\s+/g, "")
      .replace(/[\\|,;:_]+/g, "/")
      .trim();

  const docNoDigitsOf = (v) => normalizeDocNo(v).replace(/\D/g, "");

  const parseStructuredDocNo = (v) => {
    const s = normalizeDocNo(v).replace(/[-]+/g, "/");
    const parts = s.split("/").filter(Boolean);
    if (parts.length !== 3) return null;
    if (!parts.every((p) => /^\d+$/.test(p))) return null;
    return {
      y: Number(parts[0]),
      p: Number(parts[1]),
      seq: Number(parts[2]),
    };
  };

  const compareNumericStrings = (a, b) => {
    const x = String(a || "").replace(/^0+/, "") || "0";
    const y = String(b || "").replace(/^0+/, "") || "0";
    if (x.length !== y.length) return x.length - y.length;
    return x.localeCompare(y, "en", { sensitivity: "base" });
  };

  const compareLetterNo = (a, b) => {
    const anRaw = normalizeDocNo(letterNoOf(a));
    const bnRaw = normalizeDocNo(letterNoOf(b));

    if (!anRaw && !bnRaw) return 0;
    if (!anRaw) return 1;
    if (!bnRaw) return -1;

    const pa = parseStructuredDocNo(anRaw);
    const pb = parseStructuredDocNo(bnRaw);
    if (pa && pb) {
      if (pa.y !== pb.y) return pa.y - pb.y;
      if (pa.p !== pb.p) return pa.p - pb.p;
      if (pa.seq !== pb.seq) return pa.seq - pb.seq;
    }

    const ad = docNoDigitsOf(anRaw);
    const bd = docNoDigitsOf(bnRaw);
    if (ad && bd) {
      const dcmp = compareNumericStrings(ad, bd);
      if (dcmp !== 0) return dcmp;
    }

    const cmp = anRaw.localeCompare(bnRaw, "fa", { numeric: true, sensitivity: "base" });
    if (cmp !== 0) return cmp;

    return 0;
  };

  const myLettersSorted = useMemo(() => {
    const arr = Array.isArray(myLetters) ? myLetters.slice() : [];
    arr.sort(compareLettersByNewest);
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myLetters]);
const subjectOf = (l) => String(l?.subject ?? l?.title ?? "");
const orgOf = (l) => String(l?.org_name ?? l?.org ?? l?.organization ?? l?.company ?? "");
const fromToOf = (l) => {
    const a = String(l?.from_name ?? l?.from ?? "");
    const b = String(l?.to_name ?? l?.to ?? "");
    const s = `${a}${a && b ? " / " : ""}${b}`.trim();
    return s || "—";
  };

const firstEmailOf = (...vals) => {
  const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  for (const val of vals) {
    const match = String(val ?? "").match(emailRe);
    if (match?.[0]) return match[0];
  }
  return "";
};

const mailTextOf = (l, ...keys) => {
  for (const key of keys) {
    const value = String(l?.[key] ?? "").trim();
    if (value) return value;
  }
  return "";
};

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const textToBase64 = (text) => arrayBufferToBase64(new TextEncoder().encode(String(text || "")).buffer);

const foldBase64 = (value) => String(value || "").match(/.{1,76}/g)?.join("\r\n") || "";

const encodeMimeHeader = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^[\x20-\x7E]*$/.test(text)) return text;
  return `=?UTF-8?B?${textToBase64(text)}?=`;
};

const encodeRfc5987 = (value) =>
  encodeURIComponent(String(value || "file"))
    .replace(/['()]/g, escape)
    .replace(/\*/g, "%2A");

const safeEmailFileName = (value) => {
  const name = String(value || "letter")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return name || "letter";
};

const escapeMailHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const buildLetterMailHtml = ({ title, kind, kindLabel, rows }) => {
  const kindStyles = {
    incoming: "background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe;",
    outgoing: "background:#f7fee7;color:#4d7c0f;border-color:#d9f99d;",
    internal: "background:#fff7ed;color:#c2410c;border-color:#fed7aa;",
  };
  const tableRows = rows
    .map(
      ([label, value], index) => `
        <tr style="background:${index % 2 ? "#fafafa" : "#ffffff"};">
          <th style="width:190px;padding:11px 14px;border-bottom:1px solid #e5e7eb;text-align:right;color:#525252;font-size:13px;font-weight:700;vertical-align:top;">${escapeMailHtml(label)}</th>
          <td style="padding:11px 14px;border-bottom:1px solid #e5e7eb;text-align:right;color:#171717;font-size:14px;line-height:1.8;vertical-align:top;white-space:pre-wrap;">${escapeMailHtml(toFaDigits(value || "—"))}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
  <html lang="fa" dir="rtl">
    <head><meta charset="utf-8"></head>
    <body style="margin:0;background:#f5f5f5;font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;">
      <div style="max-width:760px;margin:24px auto;padding:0 12px;">
        <div style="overflow:hidden;border:1px solid #e5e7eb;border-radius:18px;background:#ffffff;box-shadow:0 12px 30px rgba(15,23,42,.08);">
          <div style="padding:20px 22px;border-bottom:1px solid #e5e7eb;background:linear-gradient(135deg,#ffffff,#f5f5f5);">
            <div style="font-size:18px;font-weight:800;color:#171717;">${escapeMailHtml(toFaDigits(title || "نامه"))}</div>
            <div style="margin-top:10px;display:inline-block;padding:5px 12px;border:1px solid;border-radius:999px;font-size:12px;font-weight:700;${kindStyles[kind] || "background:#f5f5f5;color:#404040;border-color:#d4d4d4;"}">${escapeMailHtml(kindLabel)}</div>
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;direction:rtl;">${tableRows}</table>
          <div style="padding:14px 22px;color:#737373;font-size:11px;background:#fafafa;">این پیش‌نویس از سامانه مدیریت اسناد ایجاد شده است.</div>
        </div>
      </div>
    </body>
  </html>`;
};

const buildLetterMailDraft = (l) => {
  const kind = letterKindOf(l);
  const no = letterNoOf(l);
  const subject = subjectOf(l);
  const projectId = String(l?.project_id ?? l?.projectId ?? "").trim();
  const projectFromList = projectId
    ? (Array.isArray(projectsTopOnly) ? projectsTopOnly : []).find((p) => String(p?.id) === projectId)
    : null;
  const projectLabel = String(
    l?.project_name ??
      l?.projectName ??
      l?.project_title ??
      l?.projectTitle ??
      l?.project ??
      (projectFromList ? projectOptionLabel(projectFromList) : "")
  ).trim();
  const recipient = firstEmailOf(
    mailTextOf(l, "to_email", "toEmail", "email"),
    mailTextOf(l, "to_name", "toName", "to"),
    mailTextOf(l, "receiver_email", "receiverEmail")
  );
  const kindLabel = kind === "outgoing" ? "صادره" : kind === "internal" ? "داخلی" : "وارده";
  const fromName = mailTextOf(l, "from_name", "fromName", "from");
  const toName = mailTextOf(l, "to_name", "toName", "to");
  const classification = mailTextOf(l, "classification", "classification_label", "doc_classification", "confidentiality");
  const tagIds = Array.isArray(l?.tag_ids) ? l.tag_ids : Array.isArray(l?.tagIds) ? l.tagIds : [];
  const tagLabels = tagIds
    .map((id) => tagById.get(String(id)))
    .filter(Boolean)
    .map((tag) => tagLabelOf(tag));
  const letterMap = new Map((Array.isArray(myLetters) ? myLetters : []).map((item) => [String(letterIdOf(item)), item]));
  const linkedNumbers = (rawIds) =>
    (Array.isArray(rawIds) ? rawIds : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean)
      .map((id) => {
        const item = letterMap.get(id);
        return String(item?.letter_no ?? item?.letterNo ?? id);
      })
      .join("، ");
  const returnToIds = Array.isArray(l?.return_to_ids) ? l.return_to_ids : l?.returnToIds;
  const piroIds = Array.isArray(l?.piro_ids) ? l.piro_ids : l?.piroIds;
  const attachmentNames = attachmentsOf(l)
    .map((attachment, index) => attachmentNameOf(attachment) || `فایل ${index + 1}`)
    .filter(Boolean);
  const rows = [
    ["نوع سند", kindLabel],
    ["شماره نامه", no || "—"],
    ["تاریخ نامه", letterDateOf(l) || "—"],
    [kind === "incoming" ? "کلاس سند" : "دسته‌بندی", categoryLabel(categoryOf(l)) || "—"],
    ["طبقه‌بندی", classification || "—"],
    ["پروژه", projectLabel || "—"],
    ["از", fromName || "—"],
    ["به", toName || "—"],
    ["شرکت/سازمان", orgOf(l) || "—"],
    ["موضوع", subject || "—"],
    ["برچسب‌ها", tagLabels.join("، ") || "—"],
    [kind === "incoming" ? "نامه‌های مرتبط" : "پیرو", linkedNumbers(piroIds) || "—"],
    ["بازگشت به", linkedNumbers(returnToIds) || "—"],
    ["تاریخ ثبت دبیرخانه", mailTextOf(l, "secretariat_date", "secretariatDate") || "—"],
    ["شماره ثبت دبیرخانه", mailTextOf(l, "secretariat_no", "secretariatNo") || "—"],
    ["مسئول دبیرخانه", mailTextOf(l, "receiver_name", "receiverName") || "—"],
    ["توضیحات دبیرخانه", mailTextOf(l, "secretariat_note", "secretariatNote") || "—"],
    ["پیوست‌ها", attachmentNames.join("، ") || "ندارد"],
  ];
  const mailSubject = subject || (no ? `نامه ${no}` : "نامه");
  const body = rows.map(([label, value]) => `\u200F${label}: ${toFaDigits(value)}`).join("\n");
  return {
    recipient,
    subject: mailSubject,
    body,
    html: buildLetterMailHtml({ title: mailSubject, kind, kindLabel, rows }),
  };
};

const buildEmlDraft = ({ to, subject, body, html, attachments }) => {
  const boundary = `----=_IPM_LETTER_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const lines = [
    `To: ${to || ""}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    "X-Unsent: 1",
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: ${html ? "text/html" : "text/plain"}; charset="utf-8"`,
    "Content-Transfer-Encoding: base64",
    "",
    foldBase64(textToBase64(html || body)),
  ];

  for (const file of attachments) {
    const name = file.name || "file";
    const encodedName = encodeRfc5987(name);
    lines.push(
      `--${boundary}`,
      `Content-Type: ${file.type || "application/octet-stream"}; name*=UTF-8''${encodedName}`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename*=UTF-8''${encodedName}`,
      "",
      foldBase64(file.base64)
    );
  }

  lines.push(`--${boundary}--`, "");
  return lines.join("\r\n");
};

const downloadEmlDraft = ({ subject, eml }) => {
  const blob = new Blob([eml], { type: "message/rfc822;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeEmailFileName(subject)}.eml`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
};

const openLetterInOutlook = async (l) => {
  const draft = buildLetterMailDraft(l);
  const atts = attachmentsOf(l);

  const letterId = letterIdOf(l);
  const fetched = await Promise.allSettled(
    atts.map(async (att, index) => {
      const url = resolveFileUrl(attachmentViewUrlOf(att, letterId, index));
      if (!url) throw new Error("missing_attachment_url");
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`attachment_fetch_failed_${res.status}`);
      const blob = await res.blob();
      return {
        name: attachmentNameOf(att) || `file-${index + 1}`,
        type: attachmentTypeOf(att) || blob.type || "application/octet-stream",
        base64: arrayBufferToBase64(await blob.arrayBuffer()),
      };
    })
  );

  const attachments = fetched.filter((x) => x.status === "fulfilled").map((x) => x.value);
  const failedCount = fetched.length - attachments.length;
  const body = failedCount
    ? `${draft.body}\n\n${toFaDigits(failedCount)} فایل پیوست به دلیل خطا اضافه نشد.`
    : draft.body;
  const html = failedCount
    ? draft.html.replace(
        "</body>",
        `<div dir="rtl" style="max-width:736px;margin:0 auto 20px;padding:12px;border:1px solid #fecaca;border-radius:12px;background:#fef2f2;color:#b91c1c;font-family:Tahoma,Arial,sans-serif;text-align:right;">${escapeMailHtml(toFaDigits(failedCount))} فایل پیوست به دلیل خطا اضافه نشد.</div></body>`
      )
    : draft.html;

  downloadEmlDraft({
    subject: draft.subject,
    eml: buildEmlDraft({
      to: draft.recipient,
      subject: draft.subject,
      body,
      html,
      attachments,
    }),
  });

  if (failedCount) {
    alert(`${toFaDigits(failedCount)} فایل پیوست به ایمیل اضافه نشد.`);
  }
};

const searchHaystackOf = (l) => {
  const head = [
    letterIdOf(l),
    letterNoOf(l),
    secretariatNoOf(l),
    letterDateOf(l),
    secretariatDateOf(l),
    subjectOf(l),
    orgOf(l),
    fromToOf(l),
    l?.from_name,
    l?.fromName,
    l?.from,
    l?.to_name,
    l?.toName,
    l?.to,
    l?.receiver_name,
    l?.receiverName,
    l?.classification,
    l?.classification_label,
    l?.doc_classification,
    l?.confidentiality,
    l?.category,
    l?.category_name,
    l?.categoryTitle,
    l?.secretariat_note,
    l?.secretariatNote,
    l?.project_id,
    l?.projectId,
  ]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .join(" ");

  let raw = "";
  try {
    raw = JSON.stringify(l ?? {});
  } catch {}

  return normFa(toEnDigits(`${head} ${raw}`));
};

const queryMatchesLetter = (l, qNorm, qDigits) => {
  if (qNorm && searchHaystackOf(l).includes(qNorm)) return true;
  if (!qDigits) return false;

  const digitsCandidates = [
    letterNoOf(l),
    secretariatNoOf(l),
    letterIdOf(l),
    l?.letter_no,
    l?.letterNo,
    l?.secretariat_no,
    l?.secretariatNo,
  ]
    .map((v) => docNoDigitsOf(v))
    .filter(Boolean);

  return digitsCandidates.some((n) => n.includes(qDigits));
};
const relatedPickIndex = useMemo(() => {
  if (!relatedPickOpen) return [];

  const arr = Array.isArray(myLettersSorted) ? myLettersSorted : [];

  return arr.map((l) => {
    const id = String(letterIdOf(l) || "");
    const no = String(letterNoOf(l) || "");
    const sub = String(subjectOf(l) || "");
    const org = String(orgOf(l) || "");
    const f2 = typeof fromToOf === "function" ? String(fromToOf(l) || "") : "";

    // ✅ یک رشته‌ی آماده برای سرچ
    const hay = toEnDigits([id, no, sub, org, f2].join(" ")).toLowerCase();

    return { l, id, hay };
  });
}, [myLettersSorted, relatedPickOpen]);
const RELATED_PICK_LIMIT = 200;

const relatedPickList = useMemo(() => {
  if (!relatedPickOpen) return [];

  const q = toEnDigits(String(relatedPickQueryDebounced || "").trim()).toLowerCase();

  // ✅ اگر سرچ خالیه: فقط 200 تای اول (برای جلوگیری از فریز)
  if (!q) {
    return relatedPickIndex.slice(0, RELATED_PICK_LIMIT).map((x) => x.l);
  }

  // ✅ اگر سرچ داشت: فیلتر سریع روی hay
  const out = [];
  for (const x of relatedPickIndex) {
    if (x.hay.includes(q)) out.push(x.l);
    if (out.length >= 800) break; // (اختیاری) سقف نتایج برای جلوگیری از رندر سنگین
  }
  return out;
}, [relatedPickIndex, relatedPickQueryDebounced, relatedPickOpen]);



const letterById = useMemo(() => {
  const m = new Map();
  (Array.isArray(myLettersSorted) ? myLettersSorted : []).forEach((l) => {
    m.set(String(letterIdOf(l)), l);
  });
  return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [myLettersSorted]);

// کنار بقیه useRef ها
// کنار بقیه useRef ها
const relatedWrapRef = useRef(null);
const _relatedInputRef = useRef(null);

// ✅ اول این باید بیاد (قبل از relatedDisplayValue)
const relatedSelectedIds = useMemo(() => {
  return (Array.isArray(returnToIds) ? returnToIds : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean);
}, [returnToIds]);

// متن نمایشی شماره‌های انتخاب شده (وقتی dropdown بسته است)
const _relatedDisplayValue = useMemo(() => {
  const parts = (Array.isArray(relatedSelectedIds) ? relatedSelectedIds : []).map((id) => {
    const l = letterById.get(String(id));
    const no = String(letterNoOf(l) || "").trim() || String(id);
    return toFaDigits(no);
  });
  return parts.join(" و ");
}, [relatedSelectedIds, letterById]);


// بستن با کلیک بیرون
useEffect(() => {
  if (!relatedOpen) return;

  const onDown = (e) => {
    const t = e.target;
    if (relatedWrapRef.current && relatedWrapRef.current.contains(t)) return;
    setRelatedOpen(false);
    setRelatedQuery(""); // پاک کردن حالت سرچ
  };

  const onEsc = (e) => {
    if (e.key === "Escape") {
      setRelatedOpen(false);
      setRelatedQuery("");
    }
  };

  document.addEventListener("mousedown", onDown);
  document.addEventListener("keydown", onEsc);
  return () => {
    document.removeEventListener("mousedown", onDown);
    document.removeEventListener("keydown", onEsc);
  };
}, [relatedOpen]);

const _relatedOptions = useMemo(() => {
  const q = toEnDigits(String(relatedQuery || "").trim());
  const arr = Array.isArray(myLettersSorted) ? myLettersSorted : [];

  if (!q) return arr;

  return arr.filter((l) => {
    const no = toEnDigits(String(letterNoOf(l) || "").trim());
    const id = toEnDigits(String(letterIdOf(l) || "").trim());
    return no.includes(q) || id.includes(q);
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [relatedQuery, myLettersSorted]);


  // tags
  const [tagCategories, setTagCategories] = useState([]);
  const [_tags, setTags] = useState([]);
  const [incomingTagIds, setIncomingTagIds] = useState([]);
  const [outgoingTagIds, setOutgoingTagIds] = useState([]);
  const [internalTagIds, setInternalTagIds] = useState([]);

const formSelectedTagIds =
  formKind === "outgoing" ? outgoingTagIds :
  formKind === "internal" ? internalTagIds :
  incomingTagIds;

  const [incomingSecretariatDate, setIncomingSecretariatDate] = useState("");
  const [outgoingSecretariatDate, setOutgoingSecretariatDate] = useState("");
  const [internalSecretariatDate, setInternalSecretariatDate] = useState("");

  const [incomingSecretariatNote, setIncomingSecretariatNote] = useState("");
  const [outgoingSecretariatNote, setOutgoingSecretariatNote] = useState("");
  const [internalSecretariatNote, setInternalSecretariatNote] = useState("");

  const [incomingSecretariatNo, setIncomingSecretariatNo] = useState("");
  const [outgoingSecretariatNo, setOutgoingSecretariatNo] = useState("");
  const [internalSecretariatNo, setInternalSecretariatNo] = useState("");
  const [nextCodeLoadingKind, setNextCodeLoadingKind] = useState("");

  const [incomingReceiverName, setIncomingReceiverName] = useState("");
  const [outgoingReceiverName, setOutgoingReceiverName] = useState("");
  const [internalReceiverName, setInternalReceiverName] = useState("");

  // ===== View modal (details + preview) =====
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLetter, setViewLetter] = useState(null);
  const [viewAttIdx, setViewAttIdx] = useState(0);

  
  const closeView = () => setViewOpen(false);
  const openView = async (l) => {
    setViewLetter(l || null);
    setViewAttIdx(0);
    setViewOpen(true);

    const id = String(letterIdOf(l) || "").trim();
    if (!id) return;

    try {
      const r = await api(`/letters/${encodeURIComponent(id)}`);
      const fresh = r?.item || r;
      if (fresh) {
        const localAttachments = attachmentsOf(l);
        const freshAttachments = attachmentsOf(fresh);
        const mergedAttachments = mergeAttachmentLists(freshAttachments, localAttachments);
        setViewLetter({
          ...(l && typeof l === "object" ? l : {}),
          ...(fresh && typeof fresh === "object" ? fresh : {}),
          attachments: mergedAttachments,
          has_attachment: !!(fresh?.has_attachment ?? fresh?.hasAttachment ?? l?.has_attachment ?? l?.hasAttachment),
        });
        setViewAttIdx(0);
      }
    } catch {
      // keep optimistic local item if server fetch fails
    }
  };

  useEffect(() => {
    if (!viewOpen) return;
    const onEsc = (e) => {
      if (e.key === "Escape") closeView();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewOpen]);
const [filterTagPinnedIds, setFilterTagPinnedIds] = useState([]); // ✅ برچسب‌های سنجاق‌شده برای همین کاربر)



// ===== Per-user pinned tags for filter (NO localStorage) =====
const TAG_PREFS_SCOPE = "letters_filter"; // اسم کلید برای بک‌اند (بعداً هم همینو استفاده می‌کنیم)
const TAG_PREFS_LIMIT = 24;

const _tagPrefsLsKey = (scope) => `tag_prefs_v1:${scope}:u${String(user?.id || "0")}`;

// ===== Per-user selected tags for FORM (incoming/outgoing/internal) — stored in backend (/tag-prefs) =====
const FORM_TAG_PREFS_SCOPE = {
  incoming: "letters_form_incoming",
  outgoing: "letters_form_outgoing",
  internal: "letters_form_internal",
};

const _formPrefsLsKey = (which) => `tag_prefs_v1:${FORM_TAG_PREFS_SCOPE[which]}:u${String(user?.id || "0")}`;

const [formTagPrefs, setFormTagPrefs] = useState({ incoming: [], outgoing: [], internal: [] });
const formTagsHydratedRef = useRef({ incoming: false, outgoing: false, internal: false });

const saveFormTagPrefs = async (which, ids) => {
  const clean = normalizeIdList(ids).slice(0, TAG_PREFS_LIMIT);

  if (which === "incoming") await patchLetterPrefs({ incoming_tag_ids: clean });
  else if (which === "outgoing") await patchLetterPrefs({ outgoing_tag_ids: clean });
  else await patchLetterPrefs({ internal_tag_ids: clean });
};

const loadFormTagPrefs = async () => {
  const p = await fetchLetterPrefs();

  // ✅ یک منبع واحد برای فرم: incoming_tag_ids (یا هرکدوم که می‌خوای)
  const ids = normalizeIdList(p?.incoming_tag_ids || []).slice(0, TAG_PREFS_LIMIT);

  // ✅ هم UI هر سه تب یکی شود
  setIncomingTagIds(ids);
  setOutgoingTagIds(ids);
  setInternalTagIds(ids);

  // ✅ هم formTagPrefs هر سه کلید یکی شود (برای هیدرات شدن فرم)
  setFormTagPrefs((prev) => ({
    ...prev,
    incoming: ids,
    outgoing: ids,
    internal: ids,
  }));

  return ids;
};

const setFormTagsOnly = (which, ids) => {
  const next = normalizeIdList(ids).slice(0, TAG_PREFS_LIMIT);

  if (which === "all") {
    setIncomingTagIds(next);
    setOutgoingTagIds(next);
    setInternalTagIds(next);

    setFormTagPrefs((p) => ({ ...p, incoming: next, outgoing: next, internal: next }));
    return;
  }

  if (which === "incoming") setIncomingTagIds(next);
  else if (which === "outgoing") setOutgoingTagIds(next);
  else setInternalTagIds(next);

  setFormTagPrefs((p) => ({ ...p, [which]: next }));
};

const _setFormTagsAndPersist = (which, ids) => {
  const next = normalizeIdList(ids).slice(0, TAG_PREFS_LIMIT);

  if (which === "all") {
    setIncomingTagIds(next);
    setOutgoingTagIds(next);
    setInternalTagIds(next);

    setFormTagPrefs((p) => ({ ...p, incoming: next, outgoing: next, internal: next }));

    // ✅ هر سه کلید در بک‌اند ذخیره شود
    saveFormTagPrefs("incoming", next);
    saveFormTagPrefs("outgoing", next);
    saveFormTagPrefs("internal", next);
    return;
  }

  if (which === "incoming") setIncomingTagIds(next);
  else if (which === "outgoing") setOutgoingTagIds(next);
  else setInternalTagIds(next);

  setFormTagPrefs((p) => ({ ...p, [which]: next }));
  saveFormTagPrefs(which, next);
};

function normalizeIdList(arr) {
  const a = Array.isArray(arr) ? arr : [];
  const out = [];
  const seen = new Set();

  const pickId = (x) => {
    if (x == null) return "";
    if (typeof x === "object") {
      return (x.id ?? x.tag_id ?? x.tagId ?? x.value ?? x.key ?? x._id ?? "");
    }
    return x;
  };

  for (const x of a) {
    const s = String(pickId(x) || "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

const activeFilterLsKey = (uid) =>
  `letters_filter_active_global_v1:u${String(uid || "0")}`;

const saveActiveFilterTags = (uid, ids) => {
  try {
    const clean = normalizeIdList(ids).slice(0, TAG_PREFS_LIMIT);
    localStorage.setItem(activeFilterLsKey(uid), JSON.stringify({ t: Date.now(), ids: clean }));
  } catch {}
};
const pinnedLsKey = (uid) => `letters_filter_pinned_v1:u${String(uid || "0")}`;

const savePinnedFilterTags = async (ids) => {
  const clean = normalizeIdList(ids).slice(0, TAG_PREFS_LIMIT);

  // ✅ اول لوکال (حتی اگر سرور fail شد، بعد refresh می‌مونه)
  try {
    localStorage.setItem(pinnedLsKey(user?.id), JSON.stringify({ t: Date.now(), ids: clean }));
  } catch {}

  // ✅ بعد سرور
  try {
    await patchLetterPrefs({ all_tag_ids: clean });
  } catch (e) {
    console.error("savePinnedFilterTags failed", e);
  }
};

const loadPinnedFilterTags = async () => {
  const uid = user?.id;

  // ✅ اول لوکال سریع
  try {
    const raw = localStorage.getItem(pinnedLsKey(uid));
    const parsed = raw ? JSON.parse(raw) : null;
    const ids = normalizeIdList(parsed?.ids || []).slice(0, TAG_PREFS_LIMIT);
    if (ids.length) setFilterTagPinnedIds(ids);
  } catch {}

  // ✅ بعد سرور (اگر موجود بود override کن)
  try {
    const p = await fetchLetterPrefs();
    const ids = normalizeIdList(p?.all_tag_ids || []).slice(0, TAG_PREFS_LIMIT);
    setFilterTagPinnedIds(ids);

    // sync local
    try {
      localStorage.setItem(pinnedLsKey(uid), JSON.stringify({ t: Date.now(), ids }));
    } catch {}
  } catch (e) {
    console.error("loadPinnedFilterTags failed", e);
  }
};


useEffect(() => {
  if (!user?.id) return;
  loadPinnedFilterTags();
}, [user?.id]);

const loadActiveFilterTags = (uid) => {
  try {
    const raw = localStorage.getItem(activeFilterLsKey(uid));
    const parsed = raw ? JSON.parse(raw) : null;
    const ids = normalizeIdList(parsed?.ids || []).slice(0, TAG_PREFS_LIMIT);
    setFilterTagIds(ids);
  } catch {
    setFilterTagIds([]);
  }
};

useEffect(() => {
  if (!user?.id) return;
  loadActiveFilterTags(user.id);
}, [user?.id]);

useEffect(() => {
  if (!user?.id) return;
  saveActiveFilterTags(user.id, filterTagIds);
}, [user?.id, filterTagIds]);

useEffect(() => {
  if (!user?.id) return;
  loadPinnedFilterTags();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id]);

useEffect(() => {
  if (!user?.id) return;
  loadFormTagPrefs(); // ✅ فقط یک بار
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id]);

useEffect(() => {
  // فقط Create
  if (!formOpen || editingId) return;

  // ✅ تا وقتی prefs از سرور نیومده، هیچ کاری نکن (نه set، نه save)
  if (!prefsHydratedRef.current) return;

  const which = formKind; // incoming|outgoing|internal
  if (!which) return;

  // فقط یک بار برای هر تب فرم
  if (formTagsHydratedRef.current[which]) return;

 const pref = Array.isArray(formTagPrefs?.incoming) ? formTagPrefs.incoming : [];
setFormTagsOnly("all", pref);

  formTagsHydratedRef.current[which] = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [formOpen, formKind, editingId, formTagPrefs]);


useEffect(() => {
  if (formOpen) return;
  formTagsHydratedRef.current = { incoming: false, outgoing: false, internal: false };
}, [formOpen]);

// اضافه کردن/بردن به اول لیست (و ذخیره در بک‌اند)
const _bumpPinnedFilterTag = (id) => {
  const sid = String(id || "").trim();
  if (!sid) return;

  setFilterTagPinnedIds((prev) => {
    const next = normalizeIdList([sid, ...(prev || [])]).slice(0, TAG_PREFS_LIMIT);
    // fire & forget
    savePinnedFilterTags(next);
    return next;
  });
};

// وقتی چندتا برچسب از picker انتخاب شد
const _mergePinnedFilterTags = (ids) => {
  const arr = normalizeIdList(ids);
  setFilterTagPinnedIds((prev) => {
    const next = normalizeIdList([...arr, ...(prev || [])]).slice(0, TAG_PREFS_LIMIT);
    savePinnedFilterTags(next);
    return next;
  });
};

const resetAllFilters = () => {
  setFilterQuick("");
  setFilterFromDate("");
  setFilterToDate("");
  setFilterQuery("");
  // فقط active های همه تب‌ها پاک شود:
  setFilterTagIds([]);
};


  // ===== Table selection + pagination =====
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const tableMenuRef = useRef(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);
  const [letterNoSortDir, setLetterNoSortDir] = useState(null); // null | asc | desc
  const [kbdAbsIdx, setKbdAbsIdx] = useState(-1);
  const tableRowRefs = useRef(new Map());

  useEffect(() => {
    if (!tableMenuOpen) return undefined;
    const closeMenu = (event) => {
      if (event.key === "Escape" || (event.type === "mousedown" && !tableMenuRef.current?.contains(event.target))) {
        setTableMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeMenu);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeMenu);
    };
  }, [tableMenuOpen]);

  // ===== Uploader state (incoming/outgoing/internal) =====
  const uploadInputRef = useRef(null);

  const [docFilesByType, setDocFilesByType] = useState({ incoming: [], outgoing: [], internal: [] });

  const setDocFilesFor = (which, updater) => {
    setDocFilesByType((prev) => {
      const cur = Array.isArray(prev?.[which]) ? prev[which] : [];
      const next = typeof updater === "function" ? updater(cur) : updater;
      return { ...prev, [which]: next };
    });
  };

  const setAttachmentChoice = (value) => {
    setHasAttachment(value === true);
  };

  const currentDocFiles = useMemo(() => {
    return Array.isArray(docFilesByType?.[uploadFor]) ? docFilesByType[uploadFor] : [];
  }, [docFilesByType, uploadFor]);

  const uploadFileToLetter = (file, letterId, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", API_BASE + "/uploads/letters");
      xhr.withCredentials = true;
      if (user?.id != null) {
        xhr.setRequestHeader("x-user-id", String(user.id));
      }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("letter_id", String(letterId));

      const extractUploadError = () => {
        try {
          const raw = String(xhr.responseText || "").trim();
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              const msg = String(parsed?.error || parsed?.message || "").trim();
              if (msg) return msg;
            } catch {}
          }
        } catch {}
        if (xhr.status === 413) {
          return `\u062f\u0631\u062e\u0648\u0627\u0633\u062a \u0622\u067e\u0644\u0648\u062f \u0628\u0627 \u062e\u0637\u0627\u06cc 413 \u0631\u062f \u0634\u062f. \u0627\u06cc\u0646 \u062e\u0637\u0627 \u0645\u0639\u0645\u0648\u0644\u0627\u064b \u0627\u0632 \u067e\u0631\u0648\u06a9\u0633\u06cc \u06cc\u0627 \u0648\u0628\u200c\u0633\u0631\u0648\u0631 \u0642\u0628\u0644 \u0627\u0632 API \u0645\u06cc\u200c\u0622\u06cc\u062f. \u0645\u0633\u06cc\u0631: ${API_BASE}/uploads/letters`;
        }
        return `\u062e\u0637\u0627 \u062f\u0631 \u0622\u067e\u0644\u0648\u062f \u0641\u0627\u06cc\u0644${xhr.status ? ` (${xhr.status})` : ""}`;
      };

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && typeof onProgress === "function") {
          const p = Math.round((e.loaded / e.total) * 100);
          onProgress(p);
        }
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
            resolve(data);
          } catch {
            resolve({});
          }
        } else {
          reject(new Error(extractUploadError()));
        }
      };

      xhr.onerror = () => reject(new Error("\u0627\u0631\u062a\u0628\u0627\u0637 \u0628\u0627 \u0633\u0631\u0648\u0631 \u0628\u0631\u0627\u06cc \u0622\u067e\u0644\u0648\u062f \u0641\u0627\u06cc\u0644 \u0628\u0631\u0642\u0631\u0627\u0631 \u0646\u0634\u062f."));
      xhr.send(fd);
    });
  };

  const _uploadQueuedFiles = async (kind, letterId) => {
  const files = Array.isArray(docFilesByType?.[kind]) ? docFilesByType[kind] : [];
  const queue = files.filter((f) => f && (f.optimizedFile || f.file) && !f.url);

  if (!queue.length) return;

  const runOne = async (f) => {
    const fileToSend = f.optimizedFile || f.file;

    setDocFilesFor(kind, (prev) =>
      prev.map((x) => (x.id === f.id ? { ...x, status: "uploading", progress: 0, error: "" } : x))
    );

    try {
      const res = await uploadFileToLetter(fileToSend, letterId, (p) => {
        setDocFilesFor(kind, (prev) => prev.map((x) => (x.id === f.id ? { ...x, progress: p } : x)));
      });

      setDocFilesFor(kind, (prev) =>
        prev.map((x) =>
          x.id === f.id
            ? {
                ...x,
                status: "done",
                progress: 100,
                serverId: res?.item?.id ?? res?.id ?? x.serverId,
                url: res?.item?.url ?? res?.url ?? x.url,
              }
            : x
        )
      );
    } catch (e) {
      setDocFilesFor(kind, (prev) =>
        prev.map((x) => (x.id === f.id ? { ...x, status: "error", error: e?.message || "خطا در آپلود فایل." } : x))
      );
    }
  };

  await Promise.allSettled(queue.map(runOne));
};
  const addFilesToUpload = async (which, fileList) => {
    const list = Array.from(fileList || []);
    if (!list.length) return;
    const targetLetterId = String(uploadTargetLetterId || "").trim();

    for (const rawFile of list) {
      const isImg = rawFile.type && rawFile.type.startsWith("image/");

      try {
        const preparedFile = await ensureLetterUploadableFile(rawFile);
        const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const previewSource = isImg ? preparedFile : rawFile;
        const previewUrl = previewSource ? URL.createObjectURL(previewSource) : null;

        setDocFilesFor(which, (prev) => [
          ...prev,
          {
            id,
            name: preparedFile.name || rawFile.name,
            size: preparedFile.size || rawFile.size,
            type: preparedFile.type || rawFile.type,
            status: "ready",
            progress: 0,
            error: "",
            serverId: null,
            url: null,
            previewUrl,
            file: rawFile,
            optimizedFile: preparedFile,
          },
        ]);

        // Uploads started from a table row are attached immediately to that exact letter.
        if (targetLetterId) {
          setDocFilesFor(which, (prev) =>
            prev.map((x) => (x.id === id ? { ...x, status: "uploading", progress: 0, error: "" } : x))
          );

          try {
            const res = await uploadFileToLetter(preparedFile, targetLetterId, makeProgressUpdater(which, id));
            setDocFilesFor(which, (prev) =>
              prev.map((x) =>
                x.id === id
                  ? {
                      ...x,
                      status: "done",
                      progress: 100,
                      serverId: res?.item?.id ?? res?.id ?? x.serverId,
                      url: res?.item?.url ?? res?.url ?? x.url,
                    }
                  : x
              )
            );
            setHasAttachment(true);
            await refetchLetters();
          } catch (e) {
            setDocFilesFor(which, (prev) =>
              prev.map((x) =>
                x.id === id ? { ...x, status: "error", error: e?.message || "خطا در آپلود فایل." } : x
              )
            );
          }
        }
      } catch (e) {
        alert(e?.message || "\u062e\u0637\u0627 \u062f\u0631 \u0622\u0645\u0627\u062f\u0647\u200c\u0633\u0627\u0632\u06cc \u0641\u0627\u06cc\u0644 \u0628\u0631\u0627\u06cc \u0622\u067e\u0644\u0648\u062f.");
      }
    }
  };

  const removeDocFile = (which, id) => {
    setDocFilesFor(which, (prev) => {
      const target = prev.find((x) => x.id === id);
      if (target?.previewUrl) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {}
      }
      return prev.filter((x) => x.id !== id);
    });
  };

  useEffect(() => {
    return () => {
      const all = [
        ...(Array.isArray(docFilesByType?.incoming) ? docFilesByType.incoming : []),
        ...(Array.isArray(docFilesByType?.outgoing) ? docFilesByType.outgoing : []),
        ...(Array.isArray(docFilesByType?.internal) ? docFilesByType.internal : []),
      ];
      all.forEach((f) => {
        if (f?.previewUrl) {
          try {
            URL.revokeObjectURL(f.previewUrl);
          } catch {}
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refetchLetters = async () => {
    const r = await api("/letters/mine");
    const items = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
    setMyLetters(items);
    saveLettersCache(items);
  };


  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const p = await api("/projects");
        const items = Array.isArray(p?.items) ? p.items : Array.isArray(p) ? p : [];
        if (!mounted) return;
        setProjects(items);
      } catch {
        if (!mounted) return;
        setProjects([]);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

 useEffect(() => {
  if (!user?.id) return undefined;
  let mounted = true;
  const cachedItems = readLettersCache();
  if (cachedItems.length) setMyLetters(cachedItems);

  (async () => {
    try {
      const r = await api("/letters/mine");
      const items = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
      if (!mounted) return;
      setMyLetters(items);
      saveLettersCache(items);
    } catch {
      if (!mounted || cachedItems.length) return;
      setMyLetters([]);
    }
  })();

  return () => {
    mounted = false;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id]);


  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // اول تلاش با ساختار جدید
        const r = await api("/tags?scope=letters");
        if (!mounted) return;

        const cats = Array.isArray(r?.categories) ? r.categories : [];
        const tgs = Array.isArray(r?.tags) ? r.tags : Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];

        setTagCategories(cats);
        setTags(tgs);
        setTagCatsByScope((m) => ({ ...m, letters: cats }));
        setTagsByScope((m) => ({ ...m, letters: tgs }));
        setLoadedScopes((m) => ({ ...m, letters: true }));
      } catch {
        try {
          const r2 = await api("/tags");
          if (!mounted) return;
          const items = Array.isArray(r2?.items) ? r2.items : Array.isArray(r2) ? r2 : [];
          setTagCategories([]);
          setTags(items);
        } catch {
          if (!mounted) return;
          setTagCategories([]);
          setTags([]);
        }
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const _todayJalaliLong = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date());
    } catch {
      return "";
    }
  }, []);

  const todayJalaliYmd = useMemo(() => {
    try {
      const p = getJalaliPartsFromDate(new Date());
      return `${p.jy}/${pad2(p.jm)}/${pad2(p.jd)}`;
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    if (!incomingSecretariatDate) setIncomingSecretariatDate(todayJalaliYmd);
    if (!outgoingSecretariatDate) setOutgoingSecretariatDate(todayJalaliYmd);
    if (!internalSecretariatDate) setInternalSecretariatDate(todayJalaliYmd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayJalaliYmd]);

    const inputBase = "w-full h-11 px-4 rounded-xl border outline-none transition text-right text-[13px] md:text-[14px]";

  const inputCls =
    theme === "dark"
      ? inputBase + " border-white/15 bg-white/5 text-white placeholder:text-white/40 focus:bg-white/10"
      : inputBase + " border-black/10 bg-white text-neutral-900 placeholder:text-neutral-400 focus:bg-black/[0.02]";

  const labelCls = theme === "dark" ? "text-white/70 text-[11px] md:text-xs mb-1" : "text-neutral-600 text-[11px] md:text-xs mb-1";

  // compact versions (for one-line top row)
const inputSmCls = inputCls
  .replace("h-11", "h-10")
  .replace("px-4", "px-3") + " text-[14px] rounded-xl";

const labelSmCls = (theme === "dark"
  ? "text-white/70 text-[11px] mb-1"
  : "text-neutral-600 text-[11px] mb-1");

const tabSmCls = (active) =>
  "h-10 flex-1 md:flex-none justify-center px-3 md:px-5 rounded-xl border transition text-[13px] md:text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap " +
  (active
    ? "text-white"
    : theme === "dark"
    ? "bg-transparent text-white hover:bg-white/5"
    : "bg-white text-neutral-900 hover:bg-black/[0.02]");

  const formGridWrapCls =
    "rounded-2xl overflow-hidden border " +
    (theme === "dark" ? "border-white/10" : "border-black/10");

  const _formGridCls =
    "grid gap-px " + (theme === "dark" ? "bg-white/10" : "bg-black/10");

  const _formCellCls = "p-2 " + (theme === "dark" ? "bg-neutral-900" : "bg-white");


 // ✅ Chip style (مثل TagsPage)
const chipBase =
  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs shadow-sm transition";

const chipCls =
  chipBase +
  " border-black/10 bg-white !text-neutral-900 hover:bg-black/5 " +
  "dark:border-neutral-800 dark:bg-neutral-900 dark:!text-neutral-100 dark:hover:bg-white/10";

// حالت انتخاب‌شده (برای وقتی tag فعال است)
const selectedTagChipCls =
  chipBase +
  " border-black bg-black !text-white hover:bg-black/90 " +
  "dark:border-neutral-200 dark:bg-neutral-100 dark:!text-neutral-900";

  // Filter controls use the same larger, soft-background treatment as the
  // document-search mockup, while regular form tags keep their compact style.
  const filterChipBase =
    "inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ring-1 transition";
  const filterChipCls =
    filterChipBase +
    " bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200/80 text-neutral-700 ring-neutral-200 hover:from-neutral-200 hover:to-neutral-300 dark:from-white/10 dark:via-white/[0.07] dark:to-white/[0.13] dark:text-neutral-200 dark:ring-white/10";
  const selectedFilterChipCls =
    filterChipBase +
    " bg-neutral-900 text-white ring-neutral-900 dark:bg-white dark:text-neutral-900 dark:ring-white";
  const documentTypeFilterChipCls = (kind, active) => {
    if (kind === "all") return active ? selectedFilterChipCls : filterChipCls;
    const styles = {
      incoming: active
        ? "bg-[#0046FF] text-white ring-[#0046FF]"
        : "bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/20",
      outgoing: active
        ? "bg-[#8BAE66] text-white ring-[#8BAE66]"
        : "bg-lime-50 text-lime-700 ring-lime-200 hover:bg-lime-100 dark:bg-lime-500/15 dark:text-lime-300 dark:ring-lime-400/20",
      internal: active
        ? "bg-[#FF8040] text-white ring-[#FF8040]"
        : "bg-orange-50 text-orange-700 ring-orange-200 hover:bg-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-400/20",
    };
    return filterChipBase + " " + styles[kind];
  };

  const sendBtnCls =
  "h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center transition ring-1 " +
  (theme === "dark"
    ? "bg-white text-black ring-white/15 hover:bg-white/90"
    : "bg-black text-white ring-black/15 hover:bg-black/90");

        // ✅ Outer border box for the whole form (like filters box)
  const formOuterBoxCls =
    "space-y-3 rounded-2xl border p-3 " +
    (theme === "dark" ? "border-white/10 bg-transparent" : "border-black/10 bg-white");


  const sendIconCls = "w-4 h-4 md:w-5 md:h-5 " + (theme === "dark" ? "invert-0" : "invert");

  const findProject = (id) => projects.find((p) => String(p?.id) === String(id));

  const projectOptionLabel = (p) => {
  const code = String(p?.__baseCode ?? p?.code ?? "").trim();
  const name = String(p?.name ?? p?.title ?? p?.label ?? "").trim();
  return `${toFaDigits(code)}${name ? " - " + name : ""}`.trim();
};

const projectsDesc = useMemo(() => {
  const arr = Array.isArray(projects)
    ? projects
        .filter((p) => {
          if (!p || typeof p !== "object") return false;
          if (p?.isActive === false || p?.is_active === false) return false;
          const st = String(p?.status ?? p?.state ?? "").trim().toLowerCase();
          if (st && ["inactive", "disabled", "archived", "closed", "false", "0", "off"].includes(st)) return false;
          return true;
        })
        .slice()
    : [];
  arr.sort((a, b) => {
    const ai = Number(a?.id);
    const bi = Number(b?.id);
    if (Number.isFinite(ai) && Number.isFinite(bi)) return bi - ai;
    return String(b?.id ?? "").localeCompare(String(a?.id ?? ""));
  });
  return arr;
}, [projects]);

const projectsTopOnly = useMemo(() => {
  const arr = Array.isArray(projectsDesc) ? projectsDesc : [];
  const out = [];
  const seen = new Set();

  for (const p of arr) {
    const raw = normalizeDigits(String(p?.code ?? "").trim()); // مثال: 159 یا 159.1.1
    const base = raw.split(".")[0].trim();   // میشه 159

    // فقط کد ۳ رقمی
    if (!/^\d{3}$/.test(base)) continue;

    // زیرپروژه‌ها حذف (هرچی نقطه داره)
    if (raw.includes(".")) continue;

    // تکراری‌ها حذف
    if (seen.has(base)) continue;
    seen.add(base);

    out.push({ ...p, __baseCode: base });
  }
  // ✅ مرتب‌سازی عددی نزولی: 165,164,...,101
  out.sort((a, b) => {
    const an = Number(String(a?.__baseCode ?? "").trim()) || 0;
    const bn = Number(String(b?.__baseCode ?? "").trim()) || 0;
    return bn - an;
  });

  // ✅ پین پروژه 100 همیشه اول
  const pinIdx = out.findIndex((p) => String(p?.__baseCode ?? p?.code ?? "").trim() === "100");
  if (pinIdx >= 0) {
    const [pin] = out.splice(pinIdx, 1);
    out.unshift(pin);
  }

  return out;
}, [projectsDesc]);

// ===== Auto code injection (Create only) =====
const currentProjectId = getForm(formKind).projectId || "";
const currentEffectiveLetterNo = getEffectiveLetterNoForKind(formKind);

const setSecretariatNoForKind = (kind, code) => {
  if (kind === "incoming") setIncomingSecretariatNo(code);
  else if (kind === "outgoing") setOutgoingSecretariatNo(code);
  else setInternalSecretariatNo(code);
};

const fetchNextCodeForProject = async (kind, projectId, { silent = false } = {}) => {
  const pid = String(projectId || "").trim();
  if (!pid) {
    setSecretariatNoForKind(kind, "");
    return "";
  }

  const fallbackCode = _computeNextAutoCode({
    projectId: pid,
    letters: myLetters,
    projectsTopOnly,
  });

  if (!silent) setNextCodeLoadingKind(kind);
  try {
    const q = encodeURIComponent(pid);
    const r = await api(`/letters/next-code?project_id=${q}`);
    const code = String(r?.code || "").trim() || fallbackCode;
    setSecretariatNoForKind(kind, code);
    return code;
  } catch {
    setSecretariatNoForKind(kind, fallbackCode);
    return fallbackCode;
  } finally {
    setNextCodeLoadingKind((cur) => (cur === kind ? "" : cur));
  }
};

useEffect(() => {
  if (!formOpen) {
    if (letterDraftSaveTimerRef.current) {
      clearTimeout(letterDraftSaveTimerRef.current);
      letterDraftSaveTimerRef.current = null;
    }
    return;
  }
  if (letterDraftHydratingRef.current) return;

  const payload = buildLetterDraftPayload();
  const key = letterDraftKeyFromPayload(payload);
  if (!hasLetterDraftContent(payload)) {
    if (letterDraftSaveTimerRef.current) {
      clearTimeout(letterDraftSaveTimerRef.current);
      letterDraftSaveTimerRef.current = null;
    }
    return;
  }

  const signature = JSON.stringify({ key, payload });
  if (signature === lastLetterDraftSignatureRef.current) return;

  if (letterDraftSaveTimerRef.current) clearTimeout(letterDraftSaveTimerRef.current);
  letterDraftSaveTimerRef.current = setTimeout(() => {
    saveLetterDraftNow(payload);
    lastLetterDraftSignatureRef.current = signature;
    letterDraftSaveTimerRef.current = null;
  }, LETTER_DRAFT_SAVE_DELAY_MS);

  return () => {
    if (letterDraftSaveTimerRef.current) {
      clearTimeout(letterDraftSaveTimerRef.current);
      letterDraftSaveTimerRef.current = null;
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  formOpen,
  formKind,
  editingId,
  incomingForm,
  outgoingForm,
  internalForm,
  incomingTagIds,
  outgoingTagIds,
  internalTagIds,
  incomingSecretariatDate,
  outgoingSecretariatDate,
  internalSecretariatDate,
  incomingSecretariatNo,
  outgoingSecretariatNo,
  internalSecretariatNo,
  incomingSecretariatNote,
  outgoingSecretariatNote,
  internalSecretariatNote,
  incomingReceiverName,
  outgoingReceiverName,
  internalReceiverName,
  internalUnitId,
  hasAttachment,
  returnToIds,
  piroIds,
  docFilesByType,
]);

useEffect(
  () => () => {
    if (letterDraftSaveTimerRef.current) clearTimeout(letterDraftSaveTimerRef.current);
  },
  []
);

useEffect(() => {
  if (!formOpen) return;
  if (editingId) return; // ادیت → کد جدید نساز

  if (currentEffectiveLetterNo) return;

  let cancelled = false;

  (async () => {
    if (!currentProjectId) {
      if (cancelled) return;
      setSecretariatNoForKind(formKind, "");
      return;
    }

    const code = await fetchNextCodeForProject(formKind, currentProjectId, { silent: true });
    if (cancelled) return;
    setSecretariatNoForKind(formKind, code);
  })();

  return () => {
    cancelled = true;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [formOpen, formKind, editingId, currentProjectId, currentEffectiveLetterNo, user?.id]);
const setFormTagsAllAndPersist = (ids) => {
  const next = normalizeIdList(ids);

  // ✅ UI: هر سه تب فرم یکی
  setIncomingTagIds(next);
  setOutgoingTagIds(next);
  setInternalTagIds(next);

  // ✅ Persist: هر سه تب ذخیره شود تا بعد Refresh هم بماند
  saveFormTagPrefs("incoming", next);
  saveFormTagPrefs("outgoing", next);
  saveFormTagPrefs("internal", next);
};

 const _toggleTag = (id) => {
  const sid = String(id || "").trim();
  if (!sid) return;

  const base = Array.isArray(formSelectedTagIds) ? formSelectedTagIds.map(String) : [];
  const next = base.includes(sid) ? base.filter((x) => x !== sid) : [...base, sid];

  setFormTagsAllAndPersist(next);
};

const toggleFilterTag = (id) => {
  const sid = String(id || "").trim();
  if (!sid) return;

  setFilterTagIds((prev) => {
    const cur = Array.isArray(prev) ? prev.map(String) : [];
    const next = cur.includes(sid) ? cur.filter((x) => x !== sid) : [...cur, sid];
    return next;
  });
};

const toggleFormTag = (sid) => {
  const cleanId = String(sid || "").trim();
  if (!cleanId) return;

  if (formKind === "incoming") {
    setIncomingTagIds((prev) => {
      const base = Array.isArray(prev) ? prev.map(String) : [];
      return base.includes(cleanId) ? base.filter((x) => x !== cleanId) : [...base, cleanId];
    });
  } else if (formKind === "outgoing") {
    setOutgoingTagIds((prev) => {
      const base = Array.isArray(prev) ? prev.map(String) : [];
      return base.includes(cleanId) ? base.filter((x) => x !== cleanId) : [...base, cleanId];
    });
  } else {
    setInternalTagIds((prev) => {
      const base = Array.isArray(prev) ? prev.map(String) : [];
      return base.includes(cleanId) ? base.filter((x) => x !== cleanId) : [...base, cleanId];
    });
  }

  clearFieldError(formKind, "formTags");
};

  const tagLabelOf = (t) =>
  String(t?.label ?? t?.name ?? t?.title ?? t?.text ?? t?.tag ?? t?.id ?? "").trim();
  // ===== NEW: add-tag modal =====
const [tagPickOpen, setTagPickOpen] = useState(false);
const [tagPickFor, setTagPickFor] = useState("filter"); // "filter" | "form"
const [tagPickKind, setTagPickKind] = useState("letters"); // letters/projects/execution
const [tagPickCategoryId, setTagPickCategoryId] = useState("");
const [tagPickDraftIds, setTagPickDraftIds] = useState([]);
const TAG_PICK_TABS = [
  { id: "projects", label: "پروژه‌ها" },
  { id: "letters", label: "نامه‌ها و مستندات" },
  { id: "execution", label: "اجرای پروژه‌ها" },
];
const SCOPE_BY_KIND = {
  letters: "letters",
  projects: "projects",
  execution: "execution",
};
const [tagCatsByScope, setTagCatsByScope] = useState({
  letters: [],
  projects: [],
  execution: [],
});

const [tagsByScope, setTagsByScope] = useState({
  letters: [],
  projects: [],
  execution: [],
});

const [loadedScopes, setLoadedScopes] = useState({
  letters: false,
  projects: false,
  execution: false,
});

// ✅ همه نامه‌ها (وارده/صادره/داخلی) از یک لیست تگ استفاده کنند
const formScope = "letters";

const tagsForFormScope = useMemo(() => {
  const arr = tagsByScope?.[formScope];
  return Array.isArray(arr) ? arr : [];
}, [tagsByScope, formScope]);

  const latestTags = useMemo(() => {
  const arr = Array.isArray(tagsForFormScope) ? tagsForFormScope.slice() : [];
  arr.sort((a, b) => {
    const ai = Number(a?.id);
    const bi = Number(b?.id);
    if (Number.isFinite(ai) && Number.isFinite(bi)) return bi - ai;
    return String(b?.id ?? "").localeCompare(String(a?.id ?? ""));
  });
  return arr.slice(0, 14);
}, [tagsForFormScope]);

  const _tagCapsFor = (selectedIds) => {
  const sel = Array.isArray(selectedIds) ? selectedIds.map(String) : [];

  // پایه نمایش: همون latestTags (ثابت)
  const base = Array.isArray(latestTags) ? latestTags : [];

  // اگر تگی انتخاب شده ولی تو latest نیست، آخر لیست اضافه کن (بدون دستکاری ترتیب base)
  const map = new Map((Array.isArray(tagsForFormScope) ? tagsForFormScope : []).map((t) => [String(t?.id), t]));
  const extra = sel
    .filter((id) => !base.some((t) => String(t?.id) === String(id)))
    .map((id) => map.get(String(id)))
    .filter(Boolean);

  const merged = [...base, ...extra];

  const seen = new Set();
  return merged.filter((t) => {
    const id = String(t?.id ?? "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

  const secretariatPickerBtnCls = (val) =>
    "w-full h-11 px-3 rounded-xl border flex items-center justify-between gap-2 transition text-right " +
    (theme === "dark"
      ? "border-white/15 bg-white/5 text-white/90 hover:bg-white/10"
      : "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]") +
    (val ? "" : theme === "dark" ? " text-white/50" : " text-neutral-400");

  const jalaliToGregorian = (jy, jm, jd) => {
  jy = Number(jy); jm = Number(jm); jd = Number(jd);
  const jy2 = jy - 979;
  const jm2 = jm - 1;
  const jd2 = jd - 1;
  let jDayNo =
    365 * jy2 +
    Math.floor(jy2 / 33) * 8 +
    Math.floor(((jy2 % 33) + 3) / 4);

  for (let i = 0; i < jm2; i++) jDayNo += i < 6 ? 31 : 30;
  jDayNo += jd2;

  let gDayNo = jDayNo + 79;

  let gy = 1600 + 400 * Math.floor(gDayNo / 146097);
  gDayNo %= 146097;

  let leap = true;
  if (gDayNo >= 36525) {
    gDayNo--;
    gy += 100 * Math.floor(gDayNo / 36524);
    gDayNo %= 36524;

    if (gDayNo >= 365) gDayNo++;
    else leap = false;
  }

  gy += 4 * Math.floor(gDayNo / 1461);
  gDayNo %= 1461;

  if (gDayNo >= 366) {
    leap = false;
    gDayNo--;
    gy += Math.floor(gDayNo / 365);
    gDayNo %= 365;
  }
  const mdays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 12 && gDayNo >= mdays[gm]) {
    gDayNo -= mdays[gm];
    gm++;
  }
  const gd = gDayNo + 1;
  return { gy, gm: gm + 1, gd };
};
const secretariatLongText = (ymd) => {
  const raw = String(ymd || "").trim();
  const m = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!m) return "";

  const jy = Number(toEnDigits(m[1]));
  const jm = Number(toEnDigits(m[2]));
  const jd = Number(toEnDigits(m[3]));
  if (!jy || !jm || !jd) return "";

  const g = jalaliToGregorian(jy, jm, jd);
  const d = new Date(g.gy, g.gm - 1, g.gd);

  const weekdayFa = new Intl.DateTimeFormat("fa-IR", { weekday: "long" }).format(d);
  const gregYmd = `${g.gy}/${pad2(g.gm)}/${pad2(g.gd)}`;

  return `${weekdayFa} — ${gregYmd}`;
};
  const openUpload = (which, letterId = "") => {
    setUploadFor(which);
    setUploadTargetLetterId(String(letterId || "").trim());
    setUploadOpen(true);
  };

  const uploadTriggerCls =
    "h-11 px-3 rounded-xl border transition flex items-center justify-center gap-2 whitespace-nowrap outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 " +
    (theme === "dark"
      ? "border-white/15 bg-white/5 text-white/90 hover:bg-white/10"
      : "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]");

  const uploadBoxCls =
    "rounded-2xl border border-dashed p-4 sm:p-5 text-center transition " +
    (theme === "dark"
      ? "border-white/15 bg-white/5 hover:bg-white/10"
      : "border-black/15 bg-black/[0.02] hover:bg-black/[0.04]");

  const onDropUpload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const fl = e.dataTransfer?.files;
    if (fl && fl.length) {
      await addFilesToUpload(uploadFor, fl);
    }
  };

  const onDragOverUpload = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  


  const categoryOf = (l) => String(l?.category ?? l?.category_name ?? l?.categoryTitle ?? "");
  const _categoryLabelOf = (l) => {
    const c = String(categoryOf(l) || "");
    if (c === "project") return "پروژه‌ها";
    return c || "—";
  };
  const categoryLabel = (c) => {
    const v = String(c || "");
    if (v === "project") return "پروژه‌ها";
    return v || "";
  };

  const attachmentsOf = (l) => {
    const raw =
      l?.attachments ??
      l?.attachment ??
      l?.files ??
      l?.files_json ??
      l?.attachments_json ??
      l?.attachment_json ??
      l?.attachmentsJson;

    if (!raw) return [];
    if (Array.isArray(raw)) return raw;

    if (typeof raw === "string") {
      try {
        const j = JSON.parse(raw);
        return Array.isArray(j) ? j : [];
      } catch {
        return [];
      }
    }

    if (typeof raw === "object") {
      const arr = raw?.items;
      if (Array.isArray(arr)) return arr;
    }

    return [];
  };

  const attachmentRawUrlOf = (a) => {
    const u = a?.url ?? a?.href ?? a?.path ?? a?.public_url ?? a?.publicUrl ?? a?.file_url ?? a?.fileUrl;
    return String(u || "");
  };

  const attachmentUrlOf = (a) => {
    const fileId = a?.file_id ?? a?.fileId ?? a?.serverId;
    const apiUrl = uploadedFileApiUrlOf(fileId);
    if (apiUrl) return apiUrl;
    return attachmentRawUrlOf(a);
  };

  const attachmentViewUrlOf = (a, letterId, index) => {
    const raw = attachmentRawUrlOf(a).trim();
    if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) return raw;

    const legacyApiUrl = letterAttachmentApiUrlOf(letterId, index);
    if (legacyApiUrl) return legacyApiUrl;

    const fileId = a?.file_id ?? a?.fileId ?? a?.serverId;
    const apiUrl = uploadedFileApiUrlOf(fileId);
    return apiUrl || raw;
  };

  const attachmentNameOf = (a) => {
    const n = a?.name ?? a?.filename ?? a?.file_name ?? a?.fileName ?? a?.original_name ?? a?.originalName;
    return String(n || "");
  };

  const attachmentTypeOf = (a) => String(a?.type ?? a?.mime ?? a?.mime_type ?? a?.mimeType ?? "");
  const attachmentSizeOf = (a) => {
    const v = a?.size ?? a?.bytes ?? a?.file_size ?? a?.fileSize;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

const isPdfUrl = (url, name = "") =>
  /(\.pdf)(\?|#|$)/i.test(String(url || "")) || /(\.pdf)$/i.test(String(name || ""));

const isImageUrl = (url, name = "") =>
  /\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(String(url || "")) ||
  /\.(png|jpe?g|gif|webp)$/i.test(String(name || ""));

const isWordFile = (url, name = "", type = "") => {
  const rawType = String(type || "").toLowerCase();
  if (rawType.includes("word") || rawType.includes("officedocument.wordprocessingml")) return true;
  return /\.(docx?|odt)(\?|#|$)/i.test(String(url || "")) || /\.(docx?|odt)$/i.test(String(name || ""));
};

const isExcelFile = (url, name = "", type = "") => {
  const rawType = String(type || "").toLowerCase();
  if (rawType.includes("excel") || rawType.includes("spreadsheetml") || rawType.includes("csv")) return true;
  return /\.(xlsx?|xlsm|csv|ods)(\?|#|$)/i.test(String(url || "")) || /\.(xlsx?|xlsm|csv|ods)$/i.test(String(name || ""));
};

const isOfficeFile = (url, name = "", type = "") => isWordFile(url, name, type) || isExcelFile(url, name, type);

const canUseOfficeWebViewer = (url) => {
  try {
    const parsed = new URL(String(url || ""), window.location.origin);
    if (!/^https?:$/i.test(parsed.protocol)) return false;
    const host = String(parsed.hostname || "").toLowerCase();
    if (!host) return false;
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return false;
    if (parsed.origin === window.location.origin) {
      const path = parsed.pathname || "";
      if (path.startsWith("/api/") || path.startsWith("/uploads/")) return false;
    }
    return true;
  } catch {
    return false;
  }
};

const officeViewerUrlOf = (url) => {
  const src = String(url || "").trim();
  if (!src || !canUseOfficeWebViewer(src)) return "";
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(src)}`;
};

const mergeAttachmentLists = (primary, fallback) => {
  const next = [];
  const seen = new Set();
  for (const item of [...(Array.isArray(primary) ? primary : []), ...(Array.isArray(fallback) ? fallback : [])]) {
    if (!item || typeof item !== "object") continue;
    const key = String(
      item?.file_id ??
      item?.id ??
      item?.url ??
      item?.href ??
      item?.path ??
      `${item?.name || ""}_${item?.size || ""}`
    ).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(item);
  }
  return next;
};

  const normalizeYmd = (s) => {
  const raw = String(s || "").trim();
  const v = toEnDigits(raw); // ✅ تبدیل ارقام فارسی/عربی به انگلیسی

  // اجازه / یا - 
  const m = v.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!m) return "";
  return `${m[1]}/${pad2(m[2])}/${pad2(m[3])}`;
};

  const applyQuickRange = (key) => {
    const now = new Date();
    const end = now;
    const start = new Date(now.getTime());

    if (key === "week") start.setDate(start.getDate() - 7);
    if (key === "2w") start.setDate(start.getDate() - 14);
    if (key === "1m") start.setMonth(start.getMonth() - 1);
    if (key === "3m") start.setMonth(start.getMonth() - 3);
    if (key === "6m") start.setMonth(start.getMonth() - 6);

    const ps = getJalaliPartsFromDate(start);
    const pe = getJalaliPartsFromDate(end);

    const from = `${ps.jy}/${pad2(ps.jm)}/${pad2(ps.jd)}`;
    const to = `${pe.jy}/${pad2(pe.jm)}/${pad2(pe.jd)}`;

    setFilterFromDate(from);
    setFilterToDate(to);
  };

  useEffect(() => {
    if (!filterQuick) return;
    applyQuickRange(filterQuick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterQuick]);

  const filteredLetters = useMemo(() => {
  const arr = Array.isArray(myLettersSorted) ? myLettersSorted : [];

  const qRaw = String(filterQuery || "").trim();
  const q = normFa(toEnDigits(qRaw));
  const qDigits = docNoDigitsOf(qRaw);

  const fromY = normalizeYmd(filterFromDate);
  const toY = normalizeYmd(filterToDate);

  const out = arr.filter((l) => {
    // ✅ فقط ادمین محرمانه‌ها را ببیند
    const isConf = isConfidentialLetter(l); // همونی که خودت داری
    if (isConf && !canSeeConfidential) return false;

    const kind = letterKindOf(l);

    // ✅ تب
    if (filterTab !== "all") {
      if (kind !== filterTab) return false;
    }

    // ✅ تگ‌ها
    if (filterTagIds.length > 0) {
      const letterTags = Array.isArray(l?.tag_ids)
        ? l.tag_ids
        : Array.isArray(l?.tagIds)
        ? l.tagIds
        : [];
      const set = new Set(letterTags.map((x) => String(x)));
      const ok = filterTagIds.every((x) => set.has(String(x)));
      if (!ok) return false;
    }

    // ✅ تاریخ
    const d = normalizeYmd(letterDateOf(l));
    if ((fromY || toY) && !d) return false;
    if (fromY && d < fromY) return false;
    if (toY && d > toY) return false;

    // ✅ سرچ: همه فیلدها + تطبیق عددی شماره‌ها (با/بدون /)
    if ((q || qDigits) && !queryMatchesLetter(l, q, qDigits)) return false;

    return true;
  });
  const baseSorted = out.slice().sort(compareLettersByNewest);
  if (!letterNoSortDir) return baseSorted;

  const sorted = baseSorted.slice();

  sorted.sort((a, b) => {
    const cmp = compareLetterNo(a, b);
    if (cmp !== 0) return letterNoSortDir === "asc" ? cmp : -cmp;
    return compareLettersByNewest(a, b);
  });

  return sorted;
}, [
  myLettersSorted,
  filterTab,
  filterQuery,
  filterTagIds,
  filterFromDate,
  filterToDate,
  canSeeConfidential, // ✅ اضافه شد
  letterNoSortDir,
]);

useEffect(() => {
    setSelectedIds(new Set());
    setPage(0);
}, [filterTab, rowsPerPage, filterQuick, filterFromDate, filterToDate, filterTagIds, filterQuery, letterNoSortDir]);

  const total = filteredLetters.length;
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, rowsPerPage)));
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const startIdx = safePage * rowsPerPage;
  const endIdx = Math.min(total, startIdx + rowsPerPage);
  const pageItems = filteredLetters.slice(startIdx, endIdx);

  const exportLettersExcel = async () => {
    const items = Array.isArray(filteredLetters) ? filteredLetters : [];
    if (!items.length) {
      alert("\u0645\u0648\u0631\u062F\u06CC \u0628\u0631\u0627\u06CC \u062E\u0631\u0648\u062C\u06CC \u0627\u06A9\u0633\u0644 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F.");
      return;
    }

    const kindLabel = (l) => {
      const k = letterKindOf(l);
      if (k === "outgoing") return "\u0635\u0627\u062F\u0631\u0647";
      if (k === "internal") return "\u062F\u0627\u062E\u0644\u06CC";
      return "\u0648\u0627\u0631\u062F\u0647";
    };

    const classificationLabel = (l) =>
      String(
        l?.classification ??
          l?.doc_classification ??
          l?.confidentiality ??
          l?.classification_label ??
          l?.classificationName ??
          ""
      ).trim();

    const tagIdsOf = (l) => {
      if (Array.isArray(l?.tag_ids)) return l.tag_ids;
      if (Array.isArray(l?.tagIds)) return l.tagIds;
      return [];
    };

    const tagsLabelOf = (l) => {
      const ids = tagIdsOf(l).map((x) => String(x || "").trim()).filter(Boolean);
      if (!ids.length) return "-";

      const labels = ids
        .map((id) => tagById.get(id))
        .filter(Boolean)
        .map((t) => tagLabelOf(t))
        .map((x) => String(x || "").trim())
        .filter(Boolean);

      if (labels.length) return labels.join("\u060C ");
      return ids.join("\u060C ");
    };

    const asCellText = (v) => {
      const t = String(v ?? "").trim();
      return t || "-";
    };

    const rows = items.map((l, idx) => {
      const hasAtt =
        l?.has_attachment ?? l?.hasAttachment
          ? "\u062F\u0627\u0631\u062F"
          : "\u0646\u062F\u0627\u0631\u062F";
      return [
        idx + 1,
        kindLabel(l),
        asCellText(letterNoOf(l)),
        asCellText(letterDateOf(l)),
        asCellText(subjectOf(l)),
        asCellText(fromToOf(l)),
        asCellText(orgOf(l)),
        asCellText(classificationLabel(l)),
        asCellText(l?.secretariat_date ?? l?.secretariatDate),
        asCellText(l?.secretariat_no ?? l?.secretariatNo),
        asCellText(l?.receiver_name ?? l?.receiverName),
        hasAtt,
        asCellText(tagsLabelOf(l)),
      ];
    });

    const headers = [
      "\u0631\u062F\u06CC\u0641",
      "\u0646\u0648\u0639",
      "\u0634\u0645\u0627\u0631\u0647 \u0633\u0646\u062F",
      "\u062A\u0627\u0631\u06CC\u062E \u0633\u0646\u062F",
      "\u0645\u0648\u0636\u0648\u0639",
      "\u0627\u0632/\u0628\u0647",
      "\u0634\u0631\u06A9\u062A/\u0633\u0627\u0632\u0645\u0627\u0646",
      "\u0637\u0628\u0642\u0647 \u0628\u0646\u062F\u06CC",
      "\u062A\u0627\u0631\u06CC\u062E \u062B\u0628\u062A \u062F\u0628\u06CC\u0631\u062E\u0627\u0646\u0647",
      "\u0634\u0645\u0627\u0631\u0647 \u062B\u0628\u062A \u062F\u0628\u06CC\u0631\u062E\u0627\u0646\u0647",
      "\u0645\u0633\u0626\u0648\u0644 \u062F\u0628\u06CC\u0631\u062E\u0627\u0646\u0647",
      "\u0636\u0645\u06CC\u0645\u0647",
      "\u0628\u0631\u0686\u0633\u0628 \u0647\u0627",
    ];

    const exportDate = new Date().toLocaleDateString("fa-IR");
    const sheetData = [
      ["\u06AF\u0632\u0627\u0631\u0634 \u0627\u0633\u0646\u0627\u062F \u0648 \u0646\u0627\u0645\u0647 \u0647\u0627"],
      [`\u062A\u0627\u0631\u06CC\u062E \u062E\u0631\u0648\u062C\u06CC: ${exportDate}`],
      [],
      headers,
      ...rows,
    ];

    const xlsxMod = await import("xlsx");
    const XLSX = xlsxMod?.default || xlsxMod;

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws["!cols"] = [
      { wch: 7 },
      { wch: 10 },
      { wch: 16 },
      { wch: 14 },
      { wch: 42 },
      { wch: 28 },
      { wch: 28 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 24 },
      { wch: 12 },
      { wch: 28 },
    ];
    ws["!rows"] = [{ hpt: 24 }, { hpt: 18 }, { hpt: 8 }, { hpt: 20 }];

    const lastCol = XLSX.utils.encode_col(headers.length - 1);
    const lastRow = sheetData.length;
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
    ];
    ws["!autofilter"] = { ref: `A4:${lastCol}${lastRow}` };

    const wb = XLSX.utils.book_new();
    wb.Workbook = wb.Workbook || {};
    wb.Workbook.Views = [{ RTL: true }];
    XLSX.utils.book_append_sheet(wb, ws, "Letters");

    XLSX.writeFile(wb, `letters-${new Date().toISOString().slice(0, 10)}.xlsx`, {
      bookType: "xlsx",
      compression: true,
    });
  };

  useEffect(() => {
    if (!filteredLetters.length) {
      if (kbdAbsIdx !== -1) setKbdAbsIdx(-1);
      return;
    }
    if (kbdAbsIdx < 0 || kbdAbsIdx >= filteredLetters.length) {
      const next = Math.min(startIdx, filteredLetters.length - 1);
      if (kbdAbsIdx !== next) setKbdAbsIdx(next);
    }
  }, [filteredLetters.length, kbdAbsIdx, startIdx]);

  useEffect(() => {
    if (kbdAbsIdx < startIdx || kbdAbsIdx >= endIdx) return;
    const current = filteredLetters[kbdAbsIdx];
    const id = String(letterIdOf(current) || "");
    if (!id) return;
    const rowEl = tableRowRefs.current.get(id);
    if (rowEl && typeof rowEl.scrollIntoView === "function") {
      rowEl.scrollIntoView({ block: "nearest" });
    }
  }, [kbdAbsIdx, startIdx, endIdx, filteredLetters]);

  useEffect(() => {
    const onTableNav = (e) => {
      const key = e.key;
      if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "Enter") return;
      if (formOpen || viewOpen || uploadOpen || tagPickOpen || relatedPickOpen || relatedOpen || docClassOtherOpen) return;

      const target = e.target;
      if (target && typeof target.closest === "function") {
        if (target.closest("input, textarea, select, [contenteditable='true'], button, a")) return;
      }

      if (!filteredLetters.length) return;

      if (key === "Enter") {
        e.preventDefault();
        const idx =
          kbdAbsIdx >= 0 && kbdAbsIdx < filteredLetters.length
            ? kbdAbsIdx
            : Math.min(startIdx, filteredLetters.length - 1);
        const letter = filteredLetters[idx];
        if (!letter) return;
        setKbdAbsIdx(idx);
        setViewLetter(letter || null);
        setViewAttIdx(0);
        setViewOpen(true);
        return;
      }

      e.preventDefault();
      const step = key === "ArrowDown" ? 1 : -1;
      const base =
        kbdAbsIdx >= 0 && kbdAbsIdx < filteredLetters.length
          ? kbdAbsIdx
          : Math.min(startIdx, filteredLetters.length - 1);
      const next = Math.min(filteredLetters.length - 1, Math.max(0, base + step));

      setKbdAbsIdx(next);
      const nextPage = Math.floor(next / Math.max(1, rowsPerPage));
      if (nextPage !== safePage) setPage(nextPage);
    };

    document.addEventListener("keydown", onTableNav);
    return () => document.removeEventListener("keydown", onTableNav);
  }, [
    docClassOtherOpen,
    filteredLetters,
    formOpen,
    kbdAbsIdx,
    relatedOpen,
    relatedPickOpen,
    rowsPerPage,
    safePage,
    startIdx,
    tagPickOpen,
    uploadOpen,
    viewOpen,
  ]);
useLayoutEffect(() => {
  const el = tableScrollRef.current;
  if (!el) return;

  const update = () => setHasYScroll(el.scrollHeight > el.clientHeight);

  update();
  const ro = new ResizeObserver(update);
  ro.observe(el);

  return () => ro.disconnect();
}, [pageItems.length, rowsPerPage]);
  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  useEffect(() => {
    if (!filteredLetters.length) return;
    if (kbdAbsIdx < startIdx || kbdAbsIdx >= endIdx) {
      setKbdAbsIdx(Math.min(startIdx, filteredLetters.length - 1));
    }
  }, [endIdx, filteredLetters.length, kbdAbsIdx, startIdx]);

  const visibleIds = useMemo(() => pageItems.map((l) => String(letterIdOf(l))), [pageItems]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(String(id)));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(String(id))) && !allVisibleSelected;
  const selectedMenuLetter = selectedIds.size === 1
    ? filteredLetters.find((letter) => selectedIds.has(String(letterIdOf(letter))))
    : null;

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(String(id)));
      } else {
        visibleIds.forEach((id) => next.add(String(id)));
      }
      return next;
    });
  };
  const toggleRowSelect = (id) => {
    const sid = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const iconBtnCls =
    "h-10 w-10 inline-grid place-items-center !bg-transparent !ring-0 !border-0 !shadow-none " +
    "hover:opacity-80 active:opacity-70 transition disabled:opacity-50";
  const uploadActionBtnCls =
    iconBtnCls + " letter-upload-flash relative overflow-visible";

  const tableWrapCls =
    "bg-white text-black rounded-2xl border border-black/10 overflow-hidden " +
    "dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800";

  const theadRowCls =
    "bg-neutral-200 text-black border-b border-neutral-300 " +
    "dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700";

  const tbodyCls = "text-[13px] text-black [&>tr]:h-9 [&>tr>td]:!py-0 dark:text-neutral-100";
  const rowDividerCls = "border-b border-neutral-300 dark:border-neutral-700";

  const readLetterDraftStore = () => {
    try {
      const raw = localStorage.getItem(LETTER_DRAFT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        latestNewKey: String(parsed?.latestNewKey || ""),
        items: parsed?.items && typeof parsed.items === "object" ? parsed.items : {},
      };
    } catch {
      return { latestNewKey: "", items: {} };
    }
  };

  const writeLetterDraftStore = (store) => {
    try {
      localStorage.setItem(
        LETTER_DRAFT_STORAGE_KEY,
        JSON.stringify({
          latestNewKey: String(store?.latestNewKey || ""),
          items: store?.items && typeof store.items === "object" ? store.items : {},
        })
      );
    } catch {
      // Browser storage can fail in private mode or when quota is full.
    }
  };

  const letterDraftUserKey = () => {
    const u = user || {};
    return String(u?.id ?? u?.username ?? u?.user_name ?? u?.login ?? loggedInUsername ?? "guest").trim() || "guest";
  };

  const cleanDraftFiles = (files) =>
    (Array.isArray(files) ? files : [])
      .filter((file) => file && file.url && file.status === "done")
      .map((file) => ({
        id: String(file.id || file.serverId || file.url || ""),
        name: String(file.name || ""),
        size: Number(file.size || 0) || 0,
        type: String(file.type || ""),
        status: "done",
        progress: 100,
        error: "",
        serverId: file.serverId ?? null,
        url: String(file.url || ""),
        previewUrl: null,
        file: null,
        optimizedFile: null,
      }));

  const buildLetterDraftPayload = () => ({
    formKind,
    editingId: editingId ? String(editingId) : "",
    forms: {
      incoming: { ...incomingForm },
      outgoing: { ...outgoingForm },
      internal: { ...internalForm },
    },
    tagIds: {
      incoming: normalizeIdList(incomingTagIds),
      outgoing: normalizeIdList(outgoingTagIds),
      internal: normalizeIdList(internalTagIds),
    },
    secretariatDates: {
      incoming: incomingSecretariatDate || "",
      outgoing: outgoingSecretariatDate || "",
      internal: internalSecretariatDate || "",
    },
    secretariatNos: {
      incoming: incomingSecretariatNo || "",
      outgoing: outgoingSecretariatNo || "",
      internal: internalSecretariatNo || "",
    },
    secretariatNotes: {
      incoming: incomingSecretariatNote || "",
      outgoing: outgoingSecretariatNote || "",
      internal: internalSecretariatNote || "",
    },
    receiverNames: {
      incoming: incomingReceiverName || "",
      outgoing: outgoingReceiverName || "",
      internal: internalReceiverName || "",
    },
    internalUnitId: String(internalUnitId || ""),
    hasAttachment: hasAttachment === true,
    returnToIds: normalizeIdList(returnToIds),
    piroIds: normalizeIdList(piroIds),
    docFilesByType: {
      incoming: cleanDraftFiles(docFilesByType?.incoming),
      outgoing: cleanDraftFiles(docFilesByType?.outgoing),
      internal: cleanDraftFiles(docFilesByType?.internal),
    },
  });

  const draftLetterNoFromPayload = (payload) => {
    const kind = LETTER_FORM_KINDS.includes(payload?.formKind) ? payload.formKind : "incoming";
    const form = payload?.forms?.[kind] || {};
    const no =
      kind === "incoming"
        ? form.letterNo
        : payload?.secretariatNos?.[kind] || form.letterNo;
    return String(no || "").trim();
  };

  const letterDraftKeyFromPayload = (payload) => {
    const kind = LETTER_FORM_KINDS.includes(payload?.formKind) ? payload.formKind : "incoming";
    const mode = payload?.editingId ? "edit" : "new";
    const no = draftLetterNoFromPayload(payload);
    const identity = no || String(payload?.editingId || "pending").trim() || "pending";
    return [letterDraftUserKey(), mode, kind, identity].map((part) => encodeURIComponent(String(part))).join(":");
  };

  const hasLetterDraftContent = (payload) => {
    if (!payload || typeof payload !== "object") return false;
    if (draftLetterNoFromPayload(payload)) return true;
    if (String(payload.internalUnitId || "").trim()) return true;
    if (payload.hasAttachment === true) return true;
    if (normalizeIdList(payload.returnToIds).length || normalizeIdList(payload.piroIds).length) return true;
    if (Object.values(payload.tagIds || {}).some((ids) => normalizeIdList(ids).length)) return true;
    if (Object.values(payload.secretariatNotes || {}).some((value) => String(value || "").trim())) return true;
    if (Object.values(payload.docFilesByType || {}).some((files) => Array.isArray(files) && files.length)) return true;

    return LETTER_FORM_KINDS.some((kind) => {
      const form = payload.forms?.[kind] || {};
      return ["projectId", "letterNo", "letterDate", "fromName", "toName", "orgName", "subject"].some((key) =>
        String(form?.[key] || "").trim()
      );
    });
  };

  const sendSelectedLetter = () => {
    if (!selectedMenuLetter) return;
    setTableMenuOpen(false);
    setSelectedIds(new Set());
    openLetterInOutlook(selectedMenuLetter);
  };

  const editSelectedLetter = () => {
    if (!selectedMenuLetter) return;
    setTableMenuOpen(false);
    setSelectedIds(new Set());
    startEdit(selectedMenuLetter);
  };

  const saveLetterDraftNow = (payload) => {
    if (!hasLetterDraftContent(payload)) return "";
    const key = letterDraftKeyFromPayload(payload);
    const store = readLetterDraftStore();
    const previousKey = lastSavedLetterDraftKeyRef.current;
    const previousPayload = previousKey && store.items?.[previousKey]?.payload;
    const sameDraftMode = !!previousPayload && Boolean(previousPayload.editingId) === Boolean(payload.editingId);
    if (sameDraftMode && previousKey !== key) {
      delete store.items[previousKey];
    }
    store.items[key] = {
      key,
      savedAt: new Date().toISOString(),
      letterNo: draftLetterNoFromPayload(payload),
      payload,
    };
    if (!payload.editingId) store.latestNewKey = key;
    writeLetterDraftStore(store);
    lastSavedLetterDraftKeyRef.current = key;
    return key;
  };

  const removeLetterDraftByKey = (key) => {
    const cleanKey = String(key || "").trim();
    if (!cleanKey) return;
    const store = readLetterDraftStore();
    if (store.items?.[cleanKey]) delete store.items[cleanKey];
    if (store.latestNewKey === cleanKey) store.latestNewKey = "";
    writeLetterDraftStore(store);
    if (lastSavedLetterDraftKeyRef.current === cleanKey) lastSavedLetterDraftKeyRef.current = "";
    if (lastLetterDraftSignatureRef.current.includes(cleanKey)) lastLetterDraftSignatureRef.current = "";
  };

  const clearNewLetterDrafts = () => {
    if (letterDraftSaveTimerRef.current) {
      clearTimeout(letterDraftSaveTimerRef.current);
      letterDraftSaveTimerRef.current = null;
    }

    const store = readLetterDraftStore();
    const userPrefix = `${encodeURIComponent(letterDraftUserKey())}:new:`;
    let changed = false;

    for (const [key, item] of Object.entries(store.items || {})) {
      if (String(key).startsWith(userPrefix) && !item?.payload?.editingId) {
        delete store.items[key];
        changed = true;
      }
    }

    if (store.latestNewKey && !store.items?.[store.latestNewKey]) {
      store.latestNewKey = "";
      changed = true;
    }

    if (changed) writeLetterDraftStore(store);
    lastSavedLetterDraftKeyRef.current = "";
    lastLetterDraftSignatureRef.current = "";
  };

  const readLetterDraftByKey = (key) => {
    const cleanKey = String(key || "").trim();
    if (!cleanKey) return null;
    const item = readLetterDraftStore().items?.[cleanKey];
    return item?.payload ? item : null;
  };

  const applyLetterDraftPayload = (payload) => {
    if (!payload || typeof payload !== "object") return false;
    const nextKind = LETTER_FORM_KINDS.includes(payload.formKind) ? payload.formKind : "incoming";
    const forms = payload.forms || {};
    const tags = payload.tagIds || {};
    const dates = payload.secretariatDates || {};
    const nos = payload.secretariatNos || {};
    const notes = payload.secretariatNotes || {};
    const receivers = payload.receiverNames || {};
    const files = payload.docFilesByType || {};

    letterDraftHydratingRef.current = true;
    setFormKind(nextKind);
    setEditingId(payload.editingId ? String(payload.editingId) : null);
    setIncomingForm((prev) => ({ ...prev, ...(forms.incoming || {}) }));
    setOutgoingForm((prev) => ({ ...prev, ...(forms.outgoing || {}) }));
    setInternalForm((prev) => ({ ...prev, ...(forms.internal || {}) }));
    setIncomingTagIds(normalizeIdList(tags.incoming));
    setOutgoingTagIds(normalizeIdList(tags.outgoing));
    setInternalTagIds(normalizeIdList(tags.internal));
    setIncomingSecretariatDate(String(dates.incoming || todayJalaliYmd || ""));
    setOutgoingSecretariatDate(String(dates.outgoing || todayJalaliYmd || ""));
    setInternalSecretariatDate(String(dates.internal || todayJalaliYmd || ""));
    setIncomingSecretariatNo(String(nos.incoming || ""));
    setOutgoingSecretariatNo(String(nos.outgoing || ""));
    setInternalSecretariatNo(String(nos.internal || ""));
    setIncomingSecretariatNote(String(notes.incoming || ""));
    setOutgoingSecretariatNote(String(notes.outgoing || ""));
    setInternalSecretariatNote(String(notes.internal || ""));
    setIncomingReceiverName(String(receivers.incoming || loggedInUserName || ""));
    setOutgoingReceiverName(String(receivers.outgoing || loggedInUserName || ""));
    setInternalReceiverName(String(receivers.internal || loggedInUserName || ""));
    setInternalUnitId(String(payload.internalUnitId || ""));
    setHasAttachment(payload.hasAttachment === true);
    setReturnToIds(normalizeIdList(payload.returnToIds).length ? normalizeIdList(payload.returnToIds) : [""]);
    setPiroIds(normalizeIdList(payload.piroIds).length ? normalizeIdList(payload.piroIds) : [""]);
    setDocFilesByType({
      incoming: cleanDraftFiles(files.incoming),
      outgoing: cleanDraftFiles(files.outgoing),
      internal: cleanDraftFiles(files.internal),
    });
    setErrorsByKind({ incoming: {}, outgoing: {}, internal: {} });
    setSubmitTriedByKind({ incoming: false, outgoing: false, internal: false });
    formTagsHydratedRef.current = { incoming: true, outgoing: true, internal: true };
    window.setTimeout(() => {
      letterDraftHydratingRef.current = false;
      lastLetterDraftSignatureRef.current = JSON.stringify({
        key: letterDraftKeyFromPayload(payload),
        payload,
      });
      lastSavedLetterDraftKeyRef.current = letterDraftKeyFromPayload(payload);
    }, 0);
    return true;
  };

  const seedFormKindFromCurrent = (nextKind) => {
    const nk = LETTER_FORM_KINDS.includes(nextKind) ? nextKind : "incoming";
    const current = getForm(formKind) || {};
    const target = getForm(nk) || {};
    const patch = {};
    ["category", "classification", "projectId", "letterNo", "letterDate", "fromName", "toName", "orgName", "subject"].forEach((key) => {
      if (!String(target?.[key] || "").trim() && String(current?.[key] || "").trim()) {
        patch[key] = current[key];
      }
    });
    if (Object.keys(patch).length) setForm(nk, patch);

    const currentTags = formKind === "outgoing" ? outgoingTagIds : formKind === "internal" ? internalTagIds : incomingTagIds;
    const nextTags = nk === "outgoing" ? outgoingTagIds : nk === "internal" ? internalTagIds : incomingTagIds;
    if (!normalizeIdList(nextTags).length && normalizeIdList(currentTags).length) {
      if (nk === "outgoing") setOutgoingTagIds(normalizeIdList(currentTags));
      else if (nk === "internal") setInternalTagIds(normalizeIdList(currentTags));
      else setIncomingTagIds(normalizeIdList(currentTags));
    }
  };

 const resetForm = () => {
 setIncomingForm({
  category: "نامه",
  classification: "عادی",
  projectId: "",
  letterNo: "",
  letterDate: "",
  fromName: "",
  toName: "",
  orgName: "",
  subject: "",
});

  setOutgoingForm({
    category: "نامه",
    classification: "عادی",
    projectId: "",
    letterNo: "",
    letterDate: "",
    fromName: "",
    toName: "",
    orgName: "",
    subject: "",
  });

  setInternalForm({
  category: "نامه",
  classification: "عادی",
     projectId: "",      
  letterNo: "",  
    letterDate: "",
    subject: "",
  });

  _setFormTagIds([]);

  setIncomingAttachmentTitle("");
  setOutgoingAttachmentTitle("");
  setInternalAttachmentTitle("");
  setInternalUnitId("");
  setHasAttachment(false);
  setReturnToIds([""]);
  setPiroIds([""]);

  setIncomingTagIds([]);
  setOutgoingTagIds([]);
  setInternalTagIds([]);

  setIncomingSecretariatDate(todayJalaliYmd || "");
  setOutgoingSecretariatDate(todayJalaliYmd || "");
  setInternalSecretariatDate(todayJalaliYmd || "");

  setIncomingSecretariatNo("");
  setOutgoingSecretariatNo("");
  setInternalSecretariatNo("");
  setNextCodeLoadingKind("");
  setIncomingSecretariatNote("");
  setOutgoingSecretariatNote("");
  setInternalSecretariatNote("");

  setIncomingReceiverName(loggedInUserName || "");
  setOutgoingReceiverName(loggedInUserName || "");
  setInternalReceiverName(loggedInUserName || "");

  setDocFilesByType({ incoming: [], outgoing: [], internal: [] });
  setErrorsByKind({ incoming: {}, outgoing: {}, internal: {} });
  setSubmitTriedByKind({ incoming: false, outgoing: false, internal: false });
  setEditingId(null);
};

const closeFormAndReset = () => {
  if (!editingId) clearNewLetterDrafts();
  resetForm();
  setFormKind("incoming");
  setFormOpen(false);
};

const openFreshForm = () => {
  clearNewLetterDrafts();
  resetForm();
  setFormKind("incoming");
  setFormOpen(true);
};

const switchFormKindAndReset = (nextKind) => {
  const nk = String(nextKind || "").trim();
  if (!nk || nk === formKind) return;
  seedFormKindFromCurrent(nk);
  setFormKind(nk);
};

  const normalizeAttachmentForPayload = (x) => {
    const url = String(x?.url || "");
    if (!url) return null;
    const fileId = x?.file_id ?? x?.fileId ?? x?.serverId;
    const name = String(x?.name || "");
    const type = String(x?.type || "");
    const size = Number(x?.size || 0) || 0;
    const out = {};
    if (fileId != null && String(fileId).trim()) out.file_id = fileId;
    if (name) out.name = name;
    if (url) out.url = url;
    if (type) out.type = type;
    if (size) out.size = size;
    return Object.keys(out).length ? out : null;
  };

  const startEdit = async (listItem) => {
    let l = listItem;
    const listId = String(letterIdOf(listItem) || "").trim();

    // List responses intentionally omit potentially large attachment JSON.
    // Hydrate only the record being edited so existing attachments remain
    // fully available in the edit form.
    if (listId && listItem?.attachments_loaded === false) {
      try {
        const response = await api(`/letters/${encodeURIComponent(listId)}`);
        const fresh = response?.item || response;
        if (fresh && typeof fresh === "object") l = { ...listItem, ...fresh };
      } catch {
        // The lightweight item still contains all non-attachment fields, so
        // editing remains available if the detail request fails.
      }
    }
const kind = letterKindOf(l);
    const id = String(letterIdOf(l));
    const sn = l?.secretariat_note ?? l?.secretariatNote ?? "";

if (kind === "incoming") setIncomingSecretariatNote(sn);
else if (kind === "outgoing") setOutgoingSecretariatNote(sn);
else setInternalSecretariatNote(sn);

    

    setEditingId(id);
    setFormOpen(true);
    setFormKind(kind);

    const rawCat = String(l?.category ?? l?.category_name ?? l?.categoryTitle ?? "").trim();

// سازگاری با دیتاهای قدیمی شما که category="project" بوده
    const mappedCat = rawCat === "project" ? "اسناد پروژه ای" : (rawCat || "نامه");

    // طبقه بندی (اگر از بک‌اند اومد، وگرنه پیش‌فرض)
    const rawClass =
      String(
        l?.classification ??
        l?.classification_label ??
        l?.doc_classification ??
        l?.confidentiality ??
        ""
      ).trim();

    const pid = l?.project_id ?? l?.projectId ?? l?.projectID ?? null;
    const projectId = pid ? String(pid) : "";
    const letterNo = String(l?.letter_no ?? l?.letterNo ?? l?.no ?? l?.number ?? "");
    const letterDate = String(l?.letter_date ?? l?.letterDate ?? l?.date ?? "");
    const fromVal = String(l?.from_name ?? l?.fromName ?? l?.from ?? "");
    const toVal = String(l?.to_name ?? l?.toName ?? l?.to ?? "");
    const orgVal = String(l?.org_name ?? l?.orgName ?? l?.org ?? l?.organization ?? l?.company ?? "");
    const subVal = String(l?.subject ?? l?.title ?? "");

// ✅ برای نامه‌های داخلی: پر کردن واحد در حالت Edit
const uid = l?.unit_id ?? l?.unitId ?? l?.unit ?? l?.internal_unit_id ?? "";
setInternalUnitId(uid ? String(uid) : "");

    if (kind === "outgoing") {
      setOutgoingForm((p) => ({
        ...p,
        category: mappedCat,
        classification: rawClass || "عادی",
        projectId,
        letterNo,
        letterDate,
        fromName: fromVal,
        toName: toVal,
        orgName: orgVal,
        subject: subVal,
      }));
    } else if (kind === "incoming") {
      setIncomingForm((p) => ({
        ...p,
        category: mappedCat,
        classification: rawClass || "عادی",
        projectId,
        letterNo,
        letterDate,
        fromName: fromVal,
        toName: toVal,
        orgName: orgVal,
        subject: subVal,
      }));
    } else {
      setInternalForm((p) => ({
        ...p,
        category: mappedCat,
        classification: rawClass || "عادی",
        projectId,
        letterNo,
        letterDate,
        subject: subVal,
      }));
    }


    const ha = l?.has_attachment ?? l?.hasAttachment ?? false;
    setHasAttachment(!!ha);

    const rids = Array.isArray(l?.return_to_ids) ? l.return_to_ids : Array.isArray(l?.returnToIds) ? l.returnToIds : [];
    setReturnToIds(rids.length ? rids.map((x) => String(x)) : [""]);

    const pids = Array.isArray(l?.piro_ids) ? l.piro_ids : Array.isArray(l?.piroIds) ? l.piroIds : [];
    setPiroIds(pids.length ? pids.map((x) => String(x)) : [""]);

    const tids = Array.isArray(l?.tag_ids) ? l.tag_ids : Array.isArray(l?.tagIds) ? l.tagIds : [];
    if (kind === "incoming") setIncomingTagIds(tids.map((x) => String(x)));
    else if (kind === "outgoing") setOutgoingTagIds(tids.map((x) => String(x)));
    else setInternalTagIds(tids.map((x) => String(x)));

    const sDate = String(l?.secretariat_date ?? l?.secretariatDate ?? "");
    const sNo = String(l?.secretariat_no ?? l?.secretariatNo ?? "");
    const rName = String(l?.receiver_name ?? l?.receiverName ?? "");
    if (kind === "incoming") {
      setIncomingSecretariatDate(sDate || todayJalaliYmd || "");
      setIncomingSecretariatNo(sNo || "");
      setIncomingReceiverName(rName || "");
    } else if (kind === "outgoing") {
      setOutgoingSecretariatDate(sDate || todayJalaliYmd || "");
      setOutgoingSecretariatNo(sNo || "");
      setOutgoingReceiverName(rName || "");
    } else {
      setInternalSecretariatDate(sDate || todayJalaliYmd || "");
      setInternalSecretariatNo(sNo || "");
      setInternalReceiverName(rName || "");
    }

    const atts = attachmentsOf(l);
    const mapped = (Array.isArray(atts) ? atts : []).map((a, i) => {
      const url = attachmentUrlOf(a);
      const nameRaw = attachmentNameOf(a);
      const name =
        String(nameRaw || "").trim() ||
        (() => {
          try {
            const u = String(url);
            const parts = u.split("?")[0].split("/");
            return parts[parts.length - 1] || "فایل";
          } catch {
            return "فایل";
          }
        })();
      const type = attachmentTypeOf(a) || (isPdfUrl(url) ? "application/pdf" : "");
      const size = attachmentSizeOf(a);
      return {
        id: `att_${id}_${i}`,
        name,
        size,
        type,
        status: "done",
        progress: 100,
        error: "",
        serverId: a?.id ?? a?.file_id ?? null,
        url: url || null,
        previewUrl: null,
        file: null,
        optimizedFile: null,
      };
    });

    setDocFilesByType((prev) => ({ ...prev, [kind]: mapped }));
    const editDraftKey = letterDraftKeyFromPayload({
      formKind: kind,
      editingId: id,
      forms: { [kind]: { letterNo } },
      secretariatNos: { [kind]: sNo || (kind === "incoming" ? "" : letterNo) },
    });
    const editDraft = readLetterDraftByKey(editDraftKey);
    if (editDraft?.payload) {
      window.setTimeout(() => {
        applyLetterDraftPayload(editDraft.payload);
        lastSavedLetterDraftKeyRef.current = String(editDraft.key || editDraftKey);
      }, 0);
    } else {
      lastSavedLetterDraftKeyRef.current = editDraftKey;
      lastLetterDraftSignatureRef.current = "";
    }
  };
const runWithLimit = async (tasks, limit = 2) => {
  const executing = new Set();
  const results = [];

  for (const task of tasks) {
    const p = Promise.resolve().then(task);
    results.push(p);
    executing.add(p);
    p.finally(() => executing.delete(p));

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.allSettled(results);
};

const makeProgressUpdater = (kind, fileId) => {
  let lastP = -1;
  let lastT = 0;

  return (p) => {
    const now = Date.now();
    // هر 120ms یا هر 5% یکبار آپدیت
    if (p === 0 || p === 100 || (p - lastP >= 5 && now - lastT >= 120)) {
      lastP = p;
      lastT = now;
      setDocFilesFor(kind, (prev) =>
        prev.map((x) => (x.id === fileId ? { ...x, progress: p } : x))
      );
    }
  };
};

const _uploadQueueInBackground = async (kind, queue, letterId) => {
  const tasks = queue.map((f) => async () => {
    const fileToSend = f.optimizedFile || f.file;

    setDocFilesFor(kind, (prev) =>
      prev.map((x) =>
        x.id === f.id ? { ...x, status: "uploading", progress: 0, error: "" } : x
      )
    );

    try {
      const onProg = makeProgressUpdater(kind, f.id);
      const res = await uploadFileToLetter(fileToSend, letterId, onProg);

      setDocFilesFor(kind, (prev) =>
        prev.map((x) =>
          x.id === f.id
            ? {
                ...x,
                status: "done",
                progress: 100,
                serverId: res?.item?.id ?? res?.id ?? x.serverId,
                url: res?.item?.url ?? res?.url ?? x.url,
              }
            : x
        )
      );
    } catch (e) {
      setDocFilesFor(kind, (prev) =>
        prev.map((x) =>
          x.id === f.id
            ? { ...x, status: "error", error: e?.message || "خطا در آپلود فایل." }
            : x
        )
      );
    }
  });

  await runWithLimit(tasks, 2); // 2 تا همزمان
};

  const submitLetter = async (kind) => {

  const ok = validate(kind);
  if (!ok) return; // ✅ جلو ارسال را می‌گیرد
    const tagIds =
      kind === "incoming" ? incomingTagIds : kind === "outgoing" ? outgoingTagIds : internalTagIds;

    const secretariatDate =
      kind === "incoming" ? incomingSecretariatDate : kind === "outgoing" ? outgoingSecretariatDate : internalSecretariatDate;

const secretariatNote =
  kind === "incoming"
    ? incomingSecretariatNote
    : kind === "outgoing"
    ? outgoingSecretariatNote
    : internalSecretariatNote;

    const secretariatNo = getSecretariatNoForKind(kind);
    const effectiveLetterNo = getEffectiveLetterNoForKind(kind);

        const receiverName =
      (loggedInUserName || "").trim() ||
      (kind === "incoming" ? incomingReceiverName : kind === "outgoing" ? outgoingReceiverName : internalReceiverName);


    const files = Array.isArray(docFilesByType?.[kind]) ? docFilesByType[kind] : [];

    const reused = files
      .filter((f) => f && f.status === "done" && !!f.url && !f.file && !f.optimizedFile)
      .map((f) =>
        normalizeAttachmentForPayload({
          file_id: f.serverId,
          name: f.name,
          url: f.url,
          type: f.type,
          size: f.size,
        })
      )
      .filter(Boolean);

    const queue = files.filter((f) => f && (f.optimizedFile || f.file) && !f.url);

  const computedHasAttachment = hasAttachment === true;

const f = getForm(kind);

const payload = {
  kind,

  // ✅ category + classification از فرم درست
  category: String(getForm(kind)?.category || "نامه").trim() || "نامه",

  classification:
    String(getForm(kind)?.classification || "عادی").trim() || "عادی",

  project_id: (() => {
    const pid = getForm(kind).projectId;
    const n = pid ? Number(pid) : null;
    return n && Number.isFinite(n) ? n : null;
  })(),

letter_no: effectiveLetterNo,
  letter_date: f.letterDate || "",

  from_name:
  kind === "incoming" ? (incomingForm.fromName || "")
  : kind === "outgoing" ? (outgoingForm.fromName || "")
  : "",

to_name:
  kind === "incoming" ? (incomingForm.toName || "")
  : kind === "outgoing" ? (outgoingForm.toName || "")
  : "",

  org_name:
    kind === "outgoing" ? (outgoingForm.orgName || "")
    : kind === "incoming" ? (incomingForm.orgName || "")
    : "",

subject:
  kind === "incoming" ? (incomingForm.subject || "")
  : kind === "outgoing" ? (outgoingForm.subject || "")
  : (internalForm.subject || ""),

  has_attachment: computedHasAttachment,
  return_to_ids: (Array.isArray(returnToIds) ? returnToIds : []).map(String).filter((x) => x && x.trim()),
  piro_ids: (Array.isArray(piroIds) ? piroIds : []).map(String).filter((x) => x && x.trim()),
  tag_ids: (Array.isArray(tagIds) ? tagIds : []).map(String).filter((x) => x && x.trim()),
  secretariat_date: secretariatDate || "",
  secretariat_no: secretariatNo || "",
  secretariat_note: secretariatNote || "",
  receiver_name: receiverName || "",
  attachments: reused,

  internal_unit_id:
    kind === "internal"
      ? (internalUnitId ? Number(internalUnitId) : null)
      : null,
};

    try {
      _setIsSubmitting(true);

    let saved;
    let newId = null;

    if (editingId) {
  const eid = String(editingId || "").trim();
  if (!eid) throw new Error("missing_id");

  // ✅ سازگاری کامل: هم query هم body
  const body = JSON.stringify({ ...payload, id: eid, letter_id: eid });

  saved = await api(`/letters?id=${encodeURIComponent(eid)}`, {
    method: "PATCH",
    body,
  });

  newId = eid;
} else {
  saved = await api("/letters", { method: "POST", body: JSON.stringify(payload) });
  const item = saved?.item || saved;
  newId = item?.id ?? item?.letter_id ?? item?.letterId;
}

    if (!newId) throw new Error("save_failed");
    const letterId = Number(newId) || newId;
    let uploadFailedCount = 0;
    if (queue.length > 0) {
      for (const f of queue) {
        const fileToSend = f.optimizedFile || f.file;
        setDocFilesFor(kind, (prev) =>
          prev.map((x) => (x.id === f.id ? { ...x, status: "uploading", progress: 0, error: "" } : x))
        );
        try {
          const res = await uploadFileToLetter(fileToSend, letterId, (p) => {
            setDocFilesFor(kind, (prev) => prev.map((x) => (x.id === f.id ? { ...x, progress: p } : x)));
          });
          setDocFilesFor(kind, (prev) =>
            prev.map((x) =>
              x.id === f.id
                ? {
                    ...x,
                    status: "done",
                    progress: 100,
                    serverId: res?.item?.id ?? res?.id ?? x.serverId,
                    url: res?.item?.url ?? res?.url ?? x.url,
                  }
                : x
            )
          );
        } catch (e) {
          uploadFailedCount += 1;
          setDocFilesFor(kind, (prev) =>
            prev.map((x) => (x.id === f.id ? { ...x, status: "error", error: e?.message || "\u062e\u0637\u0627 \u062f\u0631 \u0622\u067e\u0644\u0648\u062f \u0641\u0627\u06cc\u0644." } : x))
          );
        }
      }
    }
    await refetchLetters();
    if (!editingId) setPage(0);
    if (uploadFailedCount > 0) {
      setEditingId(String(letterId));
      setFormKind(kind);
      setFormOpen(true);
      alert(`\u0646\u0627\u0645\u0647 \u0630\u062e\u06cc\u0631\u0647 \u0634\u062f\u060c \u0627\u0645\u0627 ${toFaDigits(uploadFailedCount)} \u0641\u0627\u06cc\u0644 \u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc \u0646\u0634\u062f. \u0641\u0631\u0645 \u0628\u0627\u0632 \u0645\u06cc\u200c\u0645\u0627\u0646\u062f \u062a\u0627 \u067e\u06cc\u0634\u200c\u0646\u0645\u0627\u06cc\u0634 \u0631\u0627 \u0628\u0628\u06cc\u0646\u06cc\u062f \u0648 \u062f\u0648\u0628\u0627\u0631\u0647 \u062a\u0644\u0627\u0634 \u06a9\u0646\u06cc\u062f.`);
      return;
    }
    removeLetterDraftByKey(letterDraftKeyFromPayload(buildLetterDraftPayload()));
    resetForm();
    setFormOpen(false);
    } catch (e) {
      alert("خطا در ثبت نامه: " + (e?.message || "request_failed"));
    } finally {
      _setIsSubmitting(false);
    }
  };

  const InfoRow = ({ label, value }) => (
    <div className="grid grid-cols-12 gap-2 py-2">
      <div className={"col-span-4 text-xs font-semibold " + (theme === "dark" ? "text-white/70" : "text-neutral-600")}>
        {label}
      </div>
      <div className={"col-span-8 text-sm " + (theme === "dark" ? "text-white" : "text-neutral-900")}>{(typeof value === "string" || typeof value === "number") ? toFaDigits(value) : (value || "—")}</div>
    </div>
  );
  const viewAttachments = useMemo(() => attachmentsOf(viewLetter), [viewLetter]); // eslint-disable-line react-hooks/exhaustive-deps
  const currentViewAttachmentIndex = useMemo(() => {
    const arr = Array.isArray(viewAttachments) ? viewAttachments : [];
    const idx = Number(viewAttIdx || 0);
    return arr[idx] ? idx : 0;
  }, [viewAttachments, viewAttIdx]);
  const currentViewAttachment = useMemo(() => {
    const arr = Array.isArray(viewAttachments) ? viewAttachments : [];
    const a = arr[currentViewAttachmentIndex] || arr[0] || null;
    return a;
  }, [viewAttachments, currentViewAttachmentIndex]);

 const currentViewUrl = useMemo(
  () => resolveFileUrl(attachmentViewUrlOf(currentViewAttachment, viewLetter?.id, currentViewAttachmentIndex)),
  [currentViewAttachment, currentViewAttachmentIndex, viewLetter?.id]
);  // eslint-disable-line react-hooks/exhaustive-deps
  const currentViewName = useMemo(() => attachmentNameOf(currentViewAttachment), [currentViewAttachment]); // eslint-disable-line react-hooks/exhaustive-deps
  const currentViewType = useMemo(
  () => String(attachmentTypeOf(currentViewAttachment) || "").toLowerCase(),
  [currentViewAttachment]
);

const isPdfView = useMemo(() => {
  if (currentViewType.includes("pdf")) return true;
  return isPdfUrl(currentViewUrl);
}, [currentViewType, currentViewUrl]);

const isImageView = useMemo(() => {
  if (currentViewType.startsWith("image/")) return true;
  return isImageUrl(currentViewUrl);
}, [currentViewType, currentViewUrl]);

const isOfficeView = useMemo(() => {
  return isOfficeFile(currentViewUrl, currentViewName, currentViewType);
}, [currentViewName, currentViewType, currentViewUrl]);

const currentOfficeViewerUrl = useMemo(() => {
  if (!isOfficeView) return "";
  return officeViewerUrlOf(currentViewUrl);
}, [currentViewUrl, isOfficeView]);

  const viewHasAttachment = useMemo(() => {
    if (!viewLetter) return false;
    const ha = viewLetter?.has_attachment ?? viewLetter?.hasAttachment;
    return !!ha;
  }, [viewLetter, viewAttachments]);

  const paginationIconBtnCls =
    "h-9 w-9 rounded-lg grid place-items-center transition !bg-transparent !ring-0 !border-0 !shadow-none " +
    (theme === "dark" ? "hover:bg-white/10" : "hover:bg-black/5") +
    " disabled:opacity-40 disabled:cursor-not-allowed";

  const _addIconBtnCls =
    "h-11 w-11 rounded-xl flex items-center justify-center transition ring-1 p-2 " +
    (theme === "dark" ? "ring-neutral-800 hover:bg-white/10" : "ring-black/15 hover:bg-black/5");

  const _addIconImgCls = "w-5 h-5 " + (theme === "dark" ? "dark:invert" : "");

  // ===== Reuse uploaded files (show ALL uploaded files; no letter selection) =====
  const [pickSearch, setPickSearch] = useState("");


  useEffect(() => {
    if (!uploadOpen) {
      setPickSearch("");
      return;
    }
    setPickSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadOpen, uploadFor]);

  const allUploadedAttachments = useMemo(() => {
  // ✅ وقتی مودال آپلود بسته است، اصلاً محاسبه نکن
  if (!uploadOpen) return [];

  const arr = Array.isArray(myLettersSorted) ? myLettersSorted : [];
  const map = new Map(); // key=url

  for (const l of arr) {
    const letterNo = String(l?.letter_no || letterNoOf(l) || "").trim();
    const atts = attachmentsOf(l);

    for (const a of Array.isArray(atts) ? atts : []) {
      const url = attachmentUrlOf(a);
      if (!url) continue;

      const nameRaw = attachmentNameOf(a);
      const name =
        String(nameRaw || "").trim() ||
        (() => {
          try {
            const u = String(url);
            const parts = u.split("?")[0].split("/");
            return parts[parts.length - 1] || "فایل";
          } catch {
            return "فایل";
          }
        })();

      const type = attachmentTypeOf(a) || (isPdfUrl(url) ? "application/pdf" : "");
      const size = attachmentSizeOf(a);

      if (!map.has(String(url))) {
        map.set(String(url), { ...a, url, name, type, size, _letterNo: letterNo });
      } else {
        const prev = map.get(String(url));
        if (prev && (!prev.name || prev.name === "فایل") && name) {
          map.set(String(url), {
            ...prev,
            url,
            name,
            type: prev.type || type,
            size: prev.size || size,
            _letterNo: prev._letterNo || letterNo,
          });
        }
      }
    }
  }

  const out = Array.from(map.values());
  out.sort((a, b) => String(b?.name || "").localeCompare(String(a?.name || "")));
  return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [uploadOpen, myLettersSorted]);

  const _filteredUploadedAttachments = useMemo(() => {
    const q = String(pickSearch || "").trim().toLowerCase();
    const arr = Array.isArray(allUploadedAttachments) ? allUploadedAttachments : [];
    if (!q) return arr;
    return arr.filter((a) => {
      const name = String(attachmentNameOf(a) || a?.name || "").toLowerCase();
      const url = String(attachmentUrlOf(a) || a?.url || "").toLowerCase();
      return name.includes(q) || url.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickSearch, allUploadedAttachments]);

  const _addExistingAttachmentToCurrent = (which, att) => {
    const url = attachmentUrlOf(att);
    if (!url) return;
    const fileId = att?.file_id ?? att?.fileId ?? att?.serverId ?? att?.id;
    const name = attachmentNameOf(att) || att?.name || "فایل";
    const type = attachmentTypeOf(att) || att?.type || (isPdfUrl(url) ? "application/pdf" : "");
    const size = attachmentSizeOf(att) || Number(att?.size || 0) || 0;
    setDocFilesFor(which, (prev) => {
      const exists = prev.some((x) => String(x?.url || "") === String(url));
      if (exists) return prev;
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      return [
        ...prev,
        {
          id,
          name,
          size,
          type,
          status: "done",
          progress: 100,
          error: "",
          serverId: fileId ?? null,
          url,
          previewUrl: null,
          file: null,
          optimizedFile: null,
        },
      ];
    });
  };

  // ===== NEW: quick chips integrated into tags area =====
  const QUICK_CHIPS = useMemo(
    () => [
      ["week", "هفته قبل"],
      ["2w", "2 هفته قبل"],
      ["1m", "ماه قبل"],
      ["3m", "3 ماه قبل"],
      ["6m", "6 ماه قبل"],
    ],
    []
  );

const [tagPickSearch, setTagPickSearch] = useState("");

const allTags = useMemo(() => {
  return [
    ...(tagsByScope.letters || []),
    ...(tagsByScope.projects || []),
    ...(tagsByScope.execution || []),
  ];
}, [tagsByScope]);

const tagById = useMemo(() => {
  const m = new Map();
  (Array.isArray(allTags) ? allTags : []).forEach((t) => {
    const id = String(t?.id ?? "");
    if (id) m.set(id, t);
  });
  return m;
}, [allTags]);

useEffect(() => {
  if (!formOpen) return undefined;

  const timer = window.setTimeout(() => {
    const normalizeText = (value) => normFa(toEnDigits(String(value || ""))).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const selectedProject = (Array.isArray(projectsTopOnly) ? projectsTopOnly : []).find(
      (p) => String(p?.id) === String(getForm(formKind).projectId || "")
    );
    const projectCandidates = selectedProject
      ? [
          selectedProject?.code,
          selectedProject?.__baseCode,
          selectedProject?.name,
          selectedProject?.title,
          selectedProject?.label,
          projectOptionLabel(selectedProject),
        ]
      : [];
    const fieldCandidates =
      formKind === "incoming"
        ? [...projectCandidates, incomingForm.subject, incomingForm.orgName]
        : formKind === "internal"
        ? [...projectCandidates, internalForm.subject]
        : [...projectCandidates, outgoingForm.orgName, outgoingForm.subject];

    const candidates = fieldCandidates.map(normalizeText).filter((x) => x.length >= 3);
    if (!candidates.length || !Array.isArray(allTags) || !allTags.length) return;

    const matchesCandidate = (candidate, label) => {
      if (!candidate || !label) return false;
      return label === candidate || label.includes(candidate);
    };

    const matchedIds = allTags
      .filter((tag) => {
        const label = normalizeText(tagLabelOf(tag));
        if (label.length < 3) return false;
        return candidates.some((candidate) => matchesCandidate(candidate, label));
      })
      .map((tag) => String(tag?.id || "").trim())
      .filter(Boolean);

    if (!matchedIds.length) return;

    const mergeAutoTags = (current) => {
      const next = normalizeIdList([...(Array.isArray(current) ? current : []), ...matchedIds]).slice(0, TAG_PREFS_LIMIT);
      return next.length === normalizeIdList(current).length && next.every((id, index) => id === normalizeIdList(current)[index])
        ? current
        : next;
    };

    if (formKind === "incoming") setIncomingTagIds(mergeAutoTags);
    else if (formKind === "internal") setInternalTagIds(mergeAutoTags);
    else setOutgoingTagIds(mergeAutoTags);
    clearFieldError(formKind, "formTags");
  }, 2000);

  return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  formOpen,
  formKind,
  allTags,
  projectsTopOnly,
  incomingForm.projectId,
  incomingForm.subject,
  incomingForm.orgName,
  internalForm.projectId,
  internalForm.subject,
  outgoingForm.projectId,
  outgoingForm.subject,
  outgoingForm.orgName,
]);

const _latestAllTags = useMemo(() => {
  const arr = Array.isArray(allTags) ? allTags.slice() : [];
  arr.sort((a, b) => {
    const ai = Number(a?.id);
    const bi = Number(b?.id);
    if (Number.isFinite(ai) && Number.isFinite(bi)) return bi - ai;
    return String(b?.id ?? "").localeCompare(String(a?.id ?? ""));
  });
  return arr.slice(0, 14);
}, [allTags]);

const filterTagCaps = useMemo(() => {
  const map = new Map((Array.isArray(allTags) ? allTags : []).map((t) => [String(t?.id), t]));
  const pinned = normalizeIdList(filterTagPinnedIds).slice(0, TAG_PREFS_LIMIT);

  // ✅ اگر تگ هنوز تو allTags نبود، یک آبجکت placeholder می‌سازیم تا کپسول غیب نشه
  return pinned.map((id) => {
    const t = map.get(String(id));
    if (t) return t;
    return { id: String(id), label: `برچسب (${toFaDigits(id)})`, _missing: true };
  });
}, [filterTagPinnedIds, allTags]);

const openTagPicker = async (forWhat) => {
  setTagPickFor(forWhat);

  const initialKind = forWhat === "form" ? "letters" : "letters"; // یا ساده‌تر: "letters"
  setTagPickKind(initialKind);

  await ensureTagsForKind(initialKind);

  const currentSelected = forWhat === "form" ? formSelectedTagIds : filterTagPinnedIds;

  setTagPickDraftIds((Array.isArray(currentSelected) ? currentSelected : []).map(String));
  setTagPickCategoryId("");
  setTagPickSearch("");
  setTagPickOpen(true);
};

const togglePickDraft = (id) => {
  const sid = String(id || "");
  if (!sid) return;
  setTagPickDraftIds((arr) => (arr.includes(sid) ? arr.filter((x) => x !== sid) : [...arr, sid]));
};

const applyPickedTags = () => {
  const ids = normalizeIdList(tagPickDraftIds).slice(0, TAG_PREFS_LIMIT);

  if (tagPickFor === "filter") {
    // ✅ این پاپ‌آپ فقط “مدیریت برچسب‌های نوار فیلترها (Pinned)” است
    setFilterTagPinnedIds(ids);
    savePinnedFilterTags(ids);

    // ✅ اگر برچسبی از نوار حذف شد، از فیلتر فعال هم حذف شود تا فیلتر مخفی نماند
setFilterTagIds((prev) => {
  const cur = Array.isArray(prev) ? prev.map(String) : [];
  return cur.filter((x) => ids.includes(String(x)));
});
   } else {
    // ✅ همیشه روی همون تبِ فرم که بازه اعمال کن
      setFormTagsAllAndPersist(ids);
      clearFieldError(formKind, "formTags");
  }

  setTagPickOpen(false);
};

  const [addTagOpen, setAddTagOpen] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagCategoryId, setNewTagCategoryId] = useState("");
  const refreshTags = async (scope) => {
  const sc = scope || "letters";

  try {
    const r = await api(`/tags?scope=${encodeURIComponent(sc)}`);
    const cats = Array.isArray(r?.categories) ? r.categories : [];
    const tgs =
      Array.isArray(r?.tags)
        ? r.tags
        : Array.isArray(r?.items)
        ? r.items
        : Array.isArray(r)
        ? r
        : [];

    setTagCatsByScope((m) => ({ ...m, [sc]: cats }));
    setTagsByScope((m) => ({ ...m, [sc]: tgs }));
    setLoadedScopes((m) => ({ ...m, [sc]: true }));
  } catch {
    // fallback قدیمی
    try {
      const r2 = await api("/tags");
      const items = Array.isArray(r2?.items) ? r2.items : Array.isArray(r2) ? r2 : [];
      setTagCatsByScope((m) => ({ ...m, [sc]: [] }));
      setTagsByScope((m) => ({ ...m, [sc]: items }));
      setLoadedScopes((m) => ({ ...m, [sc]: true }));
    } catch {
      setTagCatsByScope((m) => ({ ...m, [sc]: [] }));
      setTagsByScope((m) => ({ ...m, [sc]: [] }));
      setLoadedScopes((m) => ({ ...m, [sc]: true }));
    }
  }
};

const ensureTagsForKind = async (kind) => {
  const scope = SCOPE_BY_KIND[kind] || "letters";
  if (loadedScopes[scope]) return;
  await refreshTags(scope);
};

const createTag = async () => {
  const scope = SCOPE_BY_KIND[tagPickKind] || "letters";
  const label = String(newTagLabel || "").trim();
  const categoryId = Number(newTagCategoryId || 0);

  if (!label) {
    alert("عنوان برچسب را وارد کنید.");
    return;
  }

  if (Array.isArray(tagCategories) && tagCategories.length > 0) {
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      alert("دسته‌بندی برچسب را انتخاب کنید.");
      return;
    }
  }

  try {
    await api("/tags", {
      method: "POST",
      body: JSON.stringify({
        scope,
        type: "tag",
        label,
        category_id: Number.isFinite(categoryId) && categoryId > 0 ? categoryId : undefined,
      }),
    });

    await refreshTags(scope);

    if (scope === "letters") {
      const r = await api(`/tags?scope=${encodeURIComponent(scope)}`);
      setTagCategories(Array.isArray(r?.categories) ? r.categories : []);
    }

    setNewTagLabel("");
    setNewTagCategoryId("");
    setAddTagOpen(false);
  } catch (err) {
    alert(String(err?.message || "خطا در ثبت برچسب"));
  }
};

useEffect(() => {
  if (!formOpen) return;
  ensureTagsForKind("letters"); // ✅ همیشه letters
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [formOpen]);

  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <Card
        className={
          "rounded-2xl border overflow-hidden " + (theme === "dark" ? "border-white/10 bg-neutral-900" : "border-black/10 bg-white")
        }
      >
        <div className="p-3 md:p-4">
          {/* Header INSIDE card */}
          <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
                <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-bold md:text-lg">مدیریت اسناد</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (formOpen) closeFormAndReset();
                else openFreshForm();
              }}
              className={
                "h-10 w-10 rounded-xl flex items-center justify-center transition ring-1 " +
                (theme === "dark" ? "ring-neutral-800 hover:bg-white/10" : "ring-black/15 hover:bg-black/5")
              }
              title={formOpen ? "بستن" : "افزودن"}
              aria-label={formOpen ? "بستن" : "افزودن"}
            >
              <img
                src={formOpen ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"}
                alt=""
                className="w-5 h-5 dark:invert"
              />
            </button>
          </div>

          {/* Compact filters (hidden while formOpen) */}
          {!formOpen && (
            <div
  className={
    "space-y-2 rounded-2xl border p-3 shadow-sm " +
    (theme === "dark" ? "border-white/10 bg-white/[0.06]" : "border-neutral-200 bg-neutral-100/80")

  }
>
              <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-[minmax(0,1fr)_140px_140px_44px]">
                {/* Tabs first */}
                <div className="hidden">

                  {TABS.map((t) => {
                    const active = filterTab === t.id;
                    const isAll = t.id === "all";
                    const isKind = t.id === "incoming" || t.id === "outgoing" || t.id === "internal";
  const activeColor = isKind ? TAB_ACTIVE_BG[t.id] : null;

                    const cls =
  "h-10 flex-1 md:flex-none justify-center px-3 md:px-5 rounded-xl border transition text-[13px] md:text-sm font-semibold inline-flex items-center gap-2 " +
  (isAll
    ? active
      ? "bg-black text-white border-black"
      : theme === "dark"
      ? "bg-transparent text-white border-white/15 hover:bg-white/5"
      : "bg-white text-neutral-900 border-black/15 hover:bg-black/[0.02]"
    : active
     ? "text-white"
    : theme === "dark"
    ? "bg-transparent text-white hover:bg-white/5"
    : "bg-white text-neutral-900 hover:bg-black/[0.02]");

                    return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
    setEditingId(null);

    if (t.id === "all") {
      setFilterTab("all");
      resetAllFilters();   // ✅ همه فیلترها پاک
      return;
    }

    setFilterTab(t.id);   // ✅ فقط فیلتر
  }}
  className={cls}
    style={
      !isAll && isKind
        ? active
          ? { backgroundColor: activeColor, borderColor: activeColor }
          : { borderColor: activeColor }
        : undefined
    }
  >
    <span>{t.label}</span>
        {t.icon ? (
          <img
              src={t.icon}
                  alt=""
                  className="w-5 h-5"
                  style={{
                  filter: active
                  ? "brightness(0) invert(1)"            // ✅ وقتی تب انتخاب شد: آیکن سفید
                  : theme === "dark"
                  ? "brightness(0) invert(1)"            // ✅ دارک: آیکن سفید
                  : "none",                               // ✅ لایت و غیر فعال: رنگ اصلی فایل
                              }}
                            />
                          ) : null}
                        </button>
                    );
                  })}
                </div>

                <div className="w-full md:min-w-[260px] md:flex-1">
  <div className={labelCls}>جست و جو</div>
  <input
    value={filterQuery}
    onChange={(e) => setFilterQuery(e.target.value)}
    className={inputCls}
    type="text"
    placeholder="جستجو در همه فیلدها (شماره، موضوع، تاریخ، سازمان و ...)"
  />
</div>
                <div className="w-[calc(50%-0.25rem)] md:w-auto md:min-w-[140px]">

                  <div className={labelCls}>از</div>
                  <JalaliPopupDatePicker
                    value={filterFromDate}
                    onChange={(v) => {
                      setFilterFromDate(v);
                      setFilterQuick(""); // ✅
                    }}
                    theme={theme}
                    buttonClassName={inputCls + " h-10 md:h-11 px-3 md:px-4 text-[12px] md:text-[14px] flex items-center justify-between gap-2"}
                  />
                </div>

                <div className="w-[calc(50%-0.25rem)] md:w-auto md:min-w-[140px]">
                  <div className={labelCls}>تا</div>
                  <JalaliPopupDatePicker
                    value={filterToDate}
                    onChange={(v) => {
                      setFilterToDate(v);
                      setFilterQuick(""); // ✅
                    }}
                    theme={theme}
                    buttonClassName={inputCls + " h-10 md:h-11 px-3 md:px-4 text-[12px] md:text-[14px] flex items-center justify-between gap-2"}
                  />
                </div>
                <button
                  type="button"
                  onClick={exportLettersExcel}
                  className={
                    "h-11 w-11 shrink-0 rounded-xl border transition inline-flex items-center justify-center " +
                    (theme === "dark"
                      ? "border-white/15 bg-white/5 hover:bg-white/10"
                      : "border-black/10 bg-white hover:bg-black/[0.03]")
                  }
                  aria-label="خروجی اکسل"
                  title="خروجی اکسل"
                >
                  <img src="/images/icons8-excel-50.png" alt="" className="w-5 h-5 object-contain" />
                </button>
              </div>

              {/* Tags + Quick chips (moved here) */}
              <div>
                <div className={labelCls}>برچسب ها</div>
                <div className="flex flex-wrap items-center gap-2">
  {/* Document type filters always come first. */}
  {TABS.map((t) => {
    const active = filterTab === t.id;
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => {
          setEditingId(null);
          if (t.id === "all") {
            setFilterTab("all");
            resetAllFilters();
            return;
          }
          setFilterTab(t.id);
        }}
        className={documentTypeFilterChipCls(t.id, active) + " shrink-0"}
      >
        {t.label}
      </button>
    );
  })}

  {/* 1) Quick chips */}
  {QUICK_CHIPS.map(([k, lab]) => (
    <button
      key={k}
      type="button"
      onClick={() => {
        if (filterQuick === k) {
          setFilterQuick("");
          setFilterFromDate("");
          setFilterToDate("");
        } else {
          setFilterQuick(k);
        }
      }}
      className={
        (filterQuick === k
          ? selectedFilterChipCls
          : filterChipCls) + " shrink-0"
      }
      title={lab}
      aria-label={lab}
    >
      {lab}
    </button>
  ))}

  {/* 2) Pinned user tags (قبل از افزودن) */}
  {filterTagCaps.map((t) => {
  const id = String(t?.id);
  const label = tagLabelOf(t);
  const active = (filterTagIds || []).some((x) => String(x) === id);

  return (
    <button
      key={id}
      type="button"
       onClick={() => {
        // ✅ فقط روشن/خاموش شدن فیلتر، بدون جابه‌جایی در لیست
        toggleFilterTag(id);
      }}
      className={(active ? selectedFilterChipCls : filterChipCls) + " shrink-0"}
      title={label}
      aria-label={label}
    >
      <span className="truncate max-w-[200px]">{label}</span>
    </button>
  );
})}


  {/* 3) Add button (همیشه آخر) */}
<button
  type="button"
  onClick={() => openTagPicker("filter")}
  className={
    "h-10 w-10 shrink-0 rounded-xl border transition inline-flex items-center justify-center " +
    (theme === "dark"
      ? "border-white/15 bg-white/5 hover:bg-white/10"
      : "border-black/10 bg-white hover:bg-black/[0.03]")
  }
  aria-label="افزودن برچسب"
  title="افزودن برچسب"
>
  <img
    src="/images/icons/sayer.svg"
    alt=""
    className={"w-5 h-5 " + (theme === "dark" ? "dark:invert" : "")}
  />
</button>

</div>
              </div>
            </div>
          )}
          {/* Create/Edit form */}
          <div className="mt-4">
            {formOpen ? (
  <div className={formOuterBoxCls}>
    <div
  className="
    flex flex-wrap md:flex-nowrap items-stretch md:items-start gap-2
    overflow-visible
    md:flex-nowrap
    pb-1
  "
>
  {/* نوع نامه */}
  <div className="w-full md:shrink-0 md:w-auto">
    <div className={labelSmCls}>نوع سند</div>
    <div className="flex items-center gap-1">
      {TABS.filter((x) => x.id !== "all").map((t) => {
        const active = formKind === t.id;
        const activeColor = TAB_ACTIVE_BG[t.id];

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => switchFormKindAndReset(t.id)}
            className={tabSmCls(active)}
            style={
              active
                ? { backgroundColor: activeColor, borderColor: activeColor }
                : { borderColor: activeColor }
            }
          >
            <span>{t.label}</span>
            {t.icon ? (
              <img
                src={t.icon}
                alt=""
                className="w-5 h-5"
                style={{
                  filter: active
                    ? "brightness(0) invert(1)"
                    : theme === "dark"
                    ? "brightness(0) invert(1)"
                    : "none",
                }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  </div>

  {/* کلاس سند */}
  <div className="w-[calc(50%-0.25rem)] md:shrink-0 md:w-[190px]">
  <div className={labelSmCls}>{requiredLabel("کلاس سند", formKind, "category")}</div>

  <FieldWrap>
    <select
      value={getForm(formKind).category || "نامه"}
onChange={(e) => {
  setForm(formKind, { category: e.target.value });
  clearFieldError(formKind, "category");
}}
      className={inputWithError(inputSmCls, formKind, "category")}
aria-invalid={fieldHasError(formKind, "category") ? true : undefined}
    >
      {([...DOC_CLASS_BASE, ...(Array.isArray(docClassExtras) ? docClassExtras : [])]).map((lab) => (
        <option key={lab} value={lab}>{lab}</option>
      ))}
      <option value="سایر">سایر</option>
    </select>

    <ErrorTextAbs kind={formKind} k="category" />
  </FieldWrap>
</div>


  {/* طبقه بندی: محرمانه فقط برای کاربر دارای مجوز نمایش داده می‌شود. */}
  {canSeeConfidential ? <div className="w-[calc(50%-0.25rem)] md:shrink-0 md:w-[140px]">
  <div className={labelSmCls}>{requiredLabel("طبقه بندی", formKind, "classification")}</div>

  <FieldWrap>
    <select
      value={getForm(formKind).classification || "عادی"}
onChange={(e) => {
  setForm(formKind, { classification: e.target.value });
  if (formKind === "incoming") clearFieldError("incoming", "classification");
}}
className={formKind === "incoming" ? inputWithError(inputSmCls, "incoming", "classification") : inputSmCls}
aria-invalid={formKind === "incoming" ? fieldHasError("incoming", "classification") : undefined}
    >
      <option value="عادی">عادی</option>
      <option value="محرمانه">محرمانه</option>
    </select>
{formKind === "incoming" ? <ErrorTextAbs kind="incoming" k="classification" /> : null}
  </FieldWrap>
</div> : null}


  {/* مرکز/پروژه */}
  {/* مرکز/پروژه */}
<div className="w-full md:flex-1 md:min-w-[260px]">
  <div className={labelSmCls}>{requiredLabel("پروژه", formKind, "projectId")}</div>

  <FieldWrap>
    <select
      value={getForm(formKind).projectId || ""}
onChange={(e) => {
  const nextProjectId = e.target.value;
  const currentKind = formKind;
  setForm(currentKind, { projectId: nextProjectId });
  clearFieldError(formKind, "projectId");
  if (!editingId) {
    fetchNextCodeForProject(currentKind, nextProjectId);
  }
}}
className={fieldHasError(formKind, "projectId") ? inputWithError(inputSmCls, formKind, "projectId") : inputSmCls}
aria-invalid={fieldHasError(formKind, "projectId") ? true : undefined}
    >
      <option value=""></option>
      {projectsTopOnly.map((p) => (
        <option key={p.id} value={String(p.id)}>
          {projectOptionLabel(p)}
        </option>
      ))}
    </select>

    <ErrorTextAbs kind={formKind} k="projectId" />
  </FieldWrap>
</div>

{/* شماره سند */}
{formKind !== "outgoing" ? (
<div className="w-full md:shrink-0 md:w-[170px]">
  <div className={labelSmCls}>{requiredLabel("شماره سند", formKind, "letterNo")}</div>

  <FieldWrap>
    {formKind === "incoming" ? (
      <>
        <input
          value={incomingForm.letterNo}
          onChange={(e) => {
            setIncomingForm((p) => ({ ...p, letterNo: e.target.value }));
            clearFieldError("incoming", "letterNo");
          }}
          className={inputWithError(inputSmCls, "incoming", "letterNo")}
          aria-invalid={fieldHasError("incoming", "letterNo") ? true : undefined}
          type="text"
        />
        <ErrorTextAbs kind="incoming" k="letterNo" />
      </>
    ) : (
      <input
        value={getSecretariatNoDisplayForKind(formKind)}
        readOnly
        tabIndex={-1}
        onChange={() => {}}
        className={inputSmCls + " bg-black/5 dark:bg-white/10 cursor-not-allowed select-none"}
        type="text"
      />
    )}

  </FieldWrap>
</div>
) : null}


  {/* تاریخ */}
  <div className="w-full md:shrink-0 md:w-[170px]">
  <div className={labelSmCls}>{requiredLabel("تاریخ سند", formKind, "letterDate")}</div>

  <FieldWrap>
    <JalaliPopupDatePicker
     value={getForm(formKind).letterDate}
onChange={(v) => {
  setForm(formKind, { letterDate: v });
  clearFieldError(formKind, "letterDate");
}}
disableFuture={formKind === "incoming" || formKind === "internal"}
buttonClassName={inputWithError(inputSmCls + " flex items-center justify-between", formKind, "letterDate")}
    />
<ErrorTextAbs kind={formKind} k="letterDate" />
  </FieldWrap>
</div>

</div>

{formKind !== "internal" && (
  <div className={formGridWrapCls + " p-2 border-0"}>
    <div className="grid grid-cols-2 md:grid-cols-12 gap-2">
      {formKind === "outgoing" ? (
        <>
          {/* از (کمی کوچکتر) */}
          <div className="col-span-1 order-1 md:order-none md:col-span-3 md:col-start-1">
            <div className={labelCls}>{requiredLabel("از", "outgoing", "fromName")}</div>
            <FieldWrap>
            <input
  value={outgoingForm.fromName}
  onChange={(e) => {
    setOutgoingForm((p) => ({ ...p, fromName: e.target.value }));
    clearFieldError("outgoing", "fromName");
  }}
  className={inputWithError(inputCls, "outgoing", "fromName")}
  aria-invalid={fieldHasError("outgoing", "fromName")}
  type="text"
/>
              <ErrorTextAbs kind="outgoing" k="fromName" />
            </FieldWrap>
          </div>

          {/* آیکن وسط */}
          <div className="col-span-2 order-3 md:order-none md:col-span-1 md:col-start-4 flex flex-col items-center">
            <div className={labelCls + " hidden md:block opacity-0 select-none"}>_</div>
            <div className="h-10 flex items-center justify-center">
              <img
                src="/images/icons/arrow-left.svg"
                alt=""
                className={"w-5 h-5 -rotate-90 md:rotate-0 " + (theme === "dark" ? "invert" : "")}
              />
            </div>
          </div>

          {/* به (کمی کوچکتر) */}
          <div className="col-span-2 order-4 md:order-none md:col-span-3 md:col-start-5">
            <div className={labelCls}>{requiredLabel("به", "outgoing", "toName")}</div>
            <FieldWrap>
 <input
    value={outgoingForm.toName}
    onChange={(e) => {
      setOutgoingForm((p) => ({ ...p, toName: e.target.value }));
      clearFieldError("outgoing", "toName");
    }}
               className={inputWithError(inputCls, "outgoing", "toName")}
    aria-invalid={fieldHasError("outgoing", "toName")}
    type="text"
  />
    <ErrorTextAbs kind="outgoing" k="toName" />
</FieldWrap>

          </div>

          {/* شرکت/سازمان (باقی فضا) */}
          <div className="col-span-1 order-2 md:order-none md:col-span-5 md:col-start-8">
            <div className={labelCls}>{requiredLabel("شرکت/سازمان", "outgoing", "orgName")}</div>
     <FieldWrap>
  <input
    value={outgoingForm.orgName}
    onChange={(e) => {
      setOutgoingForm((p) => ({ ...p, orgName: e.target.value }));
      clearFieldError("outgoing", "orgName");
    }}
    className={inputWithError(inputCls, "outgoing", "orgName")}
    aria-invalid={fieldHasError("outgoing", "orgName")}
    type="text"
  />
  <ErrorTextAbs kind="outgoing" k="orgName" />
</FieldWrap>
          </div>
        </>
      ) : (
        <>
          {/* وارده (مثل قبل) */}
          <div className="col-span-1 md:col-span-4 md:col-start-1">
  <div className={labelCls}>{requiredLabel("از", "incoming", "fromName")}</div>

  <FieldWrap>
  <input
  value={incomingForm.fromName}
  onChange={(e) => {
    setIncomingForm((p) => ({ ...p, fromName: e.target.value }));
    clearFieldError("incoming", "fromName");
  }}
  className={inputWithError(inputCls, "incoming", "fromName")}
  aria-invalid={fieldHasError("incoming", "fromName")}
  type="text"
/>
    <ErrorTextAbs kind="incoming" k="fromName" />
  </FieldWrap>

</div>

          {/* شرکت/سازمان (باقی فضا) */}
<div className="col-span-1 md:col-span-4 md:col-start-5">
  <div className={labelCls}>{requiredLabel("شرکت/سازمان", "incoming", "orgName")}</div>

    <input
      value={incomingForm.orgName}
onChange={(e) => {
  setIncomingForm((p) => ({ ...p, orgName: e.target.value }));
  clearFieldError("incoming", "orgName");
}}
      className={inputWithError(inputCls, "incoming", "orgName")}
      aria-invalid={fieldHasError("incoming", "orgName")}
      type="text"
    />
    <ErrorTextAbs kind="incoming" k="orgName" />
</div>



         <div className="col-span-2 md:col-span-1 md:col-start-9 flex flex-col items-center">
            <div className={labelCls + " hidden md:block opacity-0 select-none"}>_</div>
            <div className="h-10 flex items-center justify-center">
              <img
                src="/images/icons/arrow-left.svg"
                alt=""
                className={"w-5 h-5 -rotate-90 md:rotate-0 " + (theme === "dark" ? "invert" : "")}
              />
            </div>
          </div>

          {/* به (کمی کوچکتر) */}
<div className="col-span-2 md:col-span-3 md:col-start-10">
  <div className={labelCls}>{requiredLabel("به", "incoming", "toName")}</div>

    <input
  value={incomingForm.toName}
  onChange={(e) => {
    setIncomingForm((p) => ({ ...p, toName: e.target.value }));
    clearFieldError("incoming", "toName");
  }}
  className={inputWithError(inputCls, "incoming", "toName")}
  aria-invalid={fieldHasError("incoming", "toName")}
  type="text"
/>

    <ErrorTextAbs kind="incoming" k="toName" />
</div>

        </>
      )}
    </div>
  </div>
)}
   {/* موضوع + ضمیمه + (برای داخلی: واحد) */}
{formKind === "internal" ? (
  <div className="grid grid-cols-2 md:grid-cols-12 gap-2 items-start">
    {/* موضوع */}
    <div className="col-span-2 md:col-span-7 md:col-start-1">
      <div className={labelCls}>{requiredLabel("موضوع", "internal", "subject")}</div>

      <FieldWrap>
        <input
          value={internalForm.subject}
          onChange={(e) => {
            setInternalForm((p) => ({ ...p, subject: e.target.value }));
            clearFieldError("internal", "subject");
          }}
          className={inputWithError(inputCls, "internal", "subject")}
          aria-invalid={fieldHasError("internal", "subject")}
          type="text"
        />
        <ErrorTextAbs kind="internal" k="subject" />
      </FieldWrap>
    </div>

    {/* واحد (کنار ضمیمه) */}
    <div className="col-span-2 md:col-span-3 md:col-start-8">
      <div className={labelCls}>{requiredLabel("واحد", "internal", "internalUnitId")}</div>
      <FieldWrap>
      <select
        value={internalUnitId}
        onChange={(e) => {
          setInternalUnitId(e.target.value);
          clearFieldError("internal", "internalUnitId");
        }}
        className={inputWithError(inputCls, "internal", "internalUnitId")}
        aria-invalid={fieldHasError("internal", "internalUnitId")}
      >
        <option value=""></option>

        {internalUnitId && !unitOptions.some((u) => String(u.id) === String(internalUnitId)) ? (
          <option value={internalUnitId}>
            {unitsLoaded ? `واحد (${toFaDigits(internalUnitId)})` : "در حال دریافت واحدها..."}
          </option>
        ) : null}

        {unitOptions.map((u) => (
          <option key={u.id} value={u.id}>
            {u.label}
          </option>
        ))}
      </select>
        <ErrorTextAbs kind="internal" k="internalUnitId" />
      </FieldWrap>
    </div>

    {/* ضمیمه (کنار واحد و در همان خط) */}
    <div className="col-span-2 md:col-span-2 md:col-start-11 flex items-start gap-2 md:flex-col md:items-center">
      <div className="w-1/2 md:w-auto">
      <div className={labelCls}>ضمیمه</div>
      <div className="flex items-center justify-center gap-3 md:gap-4 mt-0 h-10">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="radio"
            name={"hasAttachment_" + formKind}
            checked={hasAttachment === true}
            onChange={() => setAttachmentChoice(true)}
            className={"h-4 w-4 " + (theme === "dark" ? "accent-white" : "accent-black")}
          />
          <span className={theme === "dark" ? "text-white/80 text-sm" : "text-neutral-800 text-sm"}>دارد</span>
        </label>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="radio"
            name={"hasAttachment_" + formKind}
            checked={hasAttachment === false}
            onChange={() => setAttachmentChoice(false)}
            className={"h-4 w-4 " + (theme === "dark" ? "accent-white" : "accent-black")}
          />
          <span className={theme === "dark" ? "text-white/80 text-sm" : "text-neutral-800 text-sm"}>ندارد</span>
        </label>
      </div>
      </div>
    </div>
  </div>
) : (

  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
    {/* موضوع */}
   <div className="col-span-2 md:col-span-10">
  <div className={labelCls}>{requiredLabel("موضوع", formKind, "subject")}</div>

  <FieldWrap>
    <input
  value={getForm(formKind).subject || ""}
  onChange={(e) => {
    setForm(formKind, { subject: e.target.value });
clearFieldError(formKind, "subject");
  }}
  className={inputWithError(inputCls, formKind, "subject")}
aria-invalid={fieldHasError(formKind, "subject")}
  type="text"
/>
<ErrorTextAbs kind={formKind} k="subject" />
  </FieldWrap>
</div>


    {/* ضمیمه (کنار موضوع) */}
    <div className="col-span-2 md:col-span-2 flex items-start gap-2 md:flex-col md:items-center">
      <div className="w-1/2 md:w-auto">
      <div className={labelCls}>ضمیمه</div>
      <div className="flex items-center justify-center gap-3 md:gap-4 mt-0 h-10">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="radio"
            name="hasAttachment"
            checked={hasAttachment === true}
            onChange={() => setAttachmentChoice(true)}
            className={"h-4 w-4 " + (theme === "dark" ? "accent-white" : "accent-black")}
          />
          <span className={theme === "dark" ? "text-white/80 text-sm" : "text-neutral-800 text-sm"}>دارد</span>
        </label>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="radio"
            name="hasAttachment"
            checked={hasAttachment === false}
            onChange={() => setAttachmentChoice(false)}
            className={"h-4 w-4 " + (theme === "dark" ? "accent-white" : "accent-black")}
          />
          <span className={theme === "dark" ? "text-white/80 text-sm" : "text-neutral-800 text-sm"}>ندارد</span>
        </label>
      </div>
      </div>
      <div className="w-1/2 md:hidden">
        <div className={labelCls}>اسناد مرتبط</div>
        <button
          type="button"
          onClick={openRelatedPicker}
          className={
            "h-10 w-[56px] shrink-0 rounded-xl border transition inline-flex items-center justify-center " +
            (theme === "dark"
              ? "border-white/15 bg-white/5 hover:bg-white/10"
              : "border-black/10 bg-white hover:bg-black/[0.02]")
          }
          aria-label="انتخاب اسناد مرتبط"
          title="انتخاب اسناد مرتبط"
        >
          <img
            src="/images/icons/sayer.svg"
            alt=""
            className={"w-5 h-5 " + (theme === "dark" ? "invert" : "")}
          />
        </button>
      </div>
      </div>
    </div>
)}

{/* ضمیمه (رادیویی دارد/ندارد) + عنوان ضمیمه + بازگشت/پیرو کنار عنوان — بدون شرط نمایش */}
<div>
    {/* ردیف کنارهم: ضمیمه + عنوان ضمیمه + بازگشت به (+ پیرو در صادره) */}
<div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-1 items-start">

{/* اسناد مرتبط + بارگذاری اسناد (کنار هم و چسبیده) */}
<div className="md:col-span-12 min-w-0">
  <div className="flex flex-col md:flex-row items-stretch md:items-start justify-start gap-2">
    {/* اسناد مرتبط */}
    <div className="hidden md:block w-full min-w-0 md:w-auto">
      <div className={labelCls}>اسناد مرتبط</div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openRelatedPicker}
          className={
            "h-10 w-[56px] shrink-0 rounded-xl border transition inline-flex items-center justify-center " +
            (theme === "dark"
              ? "border-white/15 bg-white/5 hover:bg-white/10"
              : "border-black/10 bg-white hover:bg-black/[0.02]")
          }
          aria-label="انتخاب اسناد مرتبط"
          title="انتخاب اسناد مرتبط"
        >
          <img
            src="/images/icons/sayer.svg"
            alt=""
            className={"w-5 h-5 " + (theme === "dark" ? "invert" : "")}
          />
        </button>

        {/* نمایش انتخاب‌ها */}
        {relatedSelectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
          {relatedSelectedIds.map((id) => {
            const l = letterById.get(String(id));
            const no = String(letterNoOf(l) || "").trim() || String(id);

            return (
              <span
                key={String(id)}
                className={
                  "inline-flex h-10 max-w-[220px] items-center gap-2 rounded-xl border px-3 text-xs " +
                  (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-white")
                }
              >
                <button
                  type="button"
                  onClick={() => { if (l) openView(l); }}
                  className={
                    "min-w-0 truncate font-semibold " +
                    (theme === "dark" ? "text-white hover:text-white/90" : "text-neutral-900 hover:text-black")
                  }
                  title="پیش نمایش"
                >
                  {toFaDigits(no)}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReturnToIds((prev) =>
                      (Array.isArray(prev) ? prev : []).filter((x) => String(x) !== String(id))
                    );
                  }}
                  className={
                    "h-6 w-6 inline-grid place-items-center bg-transparent border-0 shadow-none p-0 text-lg leading-none transition " +
                    (theme === "dark" ? "text-white/60 hover:text-white" : "text-neutral-500 hover:text-neutral-900")
                  }
                  aria-label="حذف"
                  title="حذف"
                >
                  ×
                </button>
              </span>
            );
          })}
          </div>
        )}
      </div>
    </div>

    {/* بارگذاری اسناد (چسبیده کنار اسناد مرتبط) */}
    <div className="w-full md:shrink-0 md:w-auto">
      <div className={labelCls}>بارگذاری</div>
      <button
  type="button"
  onClick={() => openUpload(formKind)}
  className={uploadTriggerCls + " h-10 w-auto whitespace-nowrap"}
  title="بارگذاری اسناد"
>
  <img
    src="/images/icons/Uplod.svg"
    alt=""
    className={"w-5 h-5 " + (theme === "dark" ? "invert" : "")}
  />
  {Array.isArray(docFilesByType?.[formKind]) && docFilesByType[formKind].length > 0 ? (
    <span className="mr-2 text-xs opacity-80">
      ({toFaDigits(docFilesByType[formKind].length)})
    </span>
  ) : null}
</button>
    </div>
     {/* ✅ توضیح کنار بارگذاری اسناد */}
<div className="w-full md:flex-1 md:min-w-[260px]">
  <div className={labelCls}>توضیح</div>
  <input
    value={
      formKind === "incoming"
        ? incomingSecretariatNote
        : formKind === "outgoing"
        ? outgoingSecretariatNote
        : internalSecretariatNote
    }
    onChange={(e) => {
      const v = e.target.value;
      if (formKind === "incoming") setIncomingSecretariatNote(v);
      else if (formKind === "outgoing") setOutgoingSecretariatNote(v);
      else setInternalSecretariatNote(v);
    }}
    className={inputCls + " h-10"}
    type="text"
    placeholder="توضیح..."
  />
</div>
  </div>
</div>

{relatedPickOpen &&
  createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={closeRelatedPicker} />

      <div
        className={
          "relative w-full max-w-3xl rounded-2xl border shadow-xl overflow-hidden " +
          (theme === "dark"
            ? "border-white/10 bg-neutral-900 text-white"
            : "border-black/10 bg-white text-neutral-900")
        }
      >
        {/* header */}
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="font-semibold text-sm">
            انتخاب اسناد مرتبط
            {relatedPickIds.length ? (
              <span className={theme === "dark" ? "text-white/60 mr-2" : "text-neutral-600 mr-2"}>
                ({toFaDigits(relatedPickIds.length)})
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={closeRelatedPicker}
            className={
              "h-9 w-9 rounded-xl border flex items-center justify-center transition " +
              (theme === "dark"
                ? "border-white/10 hover:bg-white/10"
                : "border-black/10 hover:bg-black/[0.04]")
            }
            aria-label="بستن"
            title="بستن"
          >
            <img
              src="/images/icons/bastan.svg"
              alt=""
              className={"w-5 h-5 " + (theme === "dark" ? "invert" : "")}
            />
          </button>
        </div>

        {/* search */}
        <div className="px-4 pb-3">
          <input
            value={relatedPickQuery}
            onChange={(e) => setRelatedPickQuery(e.target.value)}
            className={inputCls + " h-10 text-sm"}
            type="text"
            placeholder="جستجو با شماره / موضوع / سازمان ..."
            autoFocus
          />
        </div>

        <div className={theme === "dark" ? "h-px bg-white/10" : "h-px bg-black/10"} />

        {/* list */}
        <div className="max-h-[55vh] overflow-auto p-2">
           {(() => {
    const list = relatedPickList; // ✅ لیست بهینه‌شده

    if (!list.length) {
      return (
        <div className={theme === "dark" ? "text-white/60 text-sm p-4" : "text-neutral-600 text-sm p-4"}>
          موردی پیدا نشد.
        </div>
      );
    }

    return (
      <>
        {/* اگر سرچ خالیه، فقط N مورد اول نمایش داده می‌شود */}
        {!String(relatedPickQueryDebounced || "").trim() && (
          <div className={theme === "dark" ? "text-white/50 text-xs px-3 pb-2" : "text-neutral-500 text-xs px-3 pb-2"}>
            برای نمایش همه موارد، بخشی از شماره/موضوع/سازمان را جستجو کنید. (نمایش {toFaDigits(RELATED_PICK_LIMIT)} مورد اول)
          </div>
        )}

        {list.map((l) => {
          const id = String(letterIdOf(l));
          const no = String(letterNoOf(l) || "").trim() || id;
          const sub = String(subjectOf(l) || "").trim();
          const dt = String(letterDateOf(l) || "").trim();
          const checked = relatedPickIds.includes(id);

          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setRelatedPickIds((prev) => {
                  const base = Array.isArray(prev) ? prev.map(String) : [];
                  if (base.includes(id)) return base.filter((x) => x !== id);
                  return [...base, id];
                });
              }}
              className={
                "w-full text-right px-3 py-2 rounded-xl transition flex items-center justify-between gap-3 " +
                (theme === "dark" ? "hover:bg-white/10" : "hover:bg-black/[0.04]")
              }
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{toFaDigits(no)}</span>
                  {dt ? (
                    <span className={theme === "dark" ? "text-white/60 text-xs" : "text-neutral-600 text-xs"}>
                      {toFaDigits(dt)}
                    </span>
                  ) : null}
                </div>

                <div className={"text-xs truncate mt-0.5 " + (theme === "dark" ? "text-white/60" : "text-neutral-600")}>
                  {sub || "—"}
                </div>
              </div>

              <div
                className={
                  "h-5 w-5 rounded-md border grid place-items-center shrink-0 " +
                  (checked
                    ? theme === "dark"
                      ? "bg-white text-black border-white/30"
                      : "bg-black text-white border-black/20"
                    : theme === "dark"
                    ? "border-white/15"
                    : "border-black/15")
                }
                aria-label={checked ? "انتخاب شده" : "انتخاب نشده"}
                title={checked ? "انتخاب شده" : "انتخاب"}
              >
                {checked ? "✓" : ""}
              </div>
            </button>
          );
        })}
      </>
    );
  })()}
        </div>

        <div className={theme === "dark" ? "h-px bg-white/10" : "h-px bg-black/10"} />

        {/* footer */}
        <div className="p-4 flex items-center justify-end gap-2">
          

          <button
            type="button"
            onClick={() => {
              const clean = (Array.isArray(relatedPickIds) ? relatedPickIds : [])
                .map((x) => String(x || "").trim())
                .filter(Boolean);

              setReturnToIds(clean);
              closeRelatedPicker();
            }}
            className={
              "h-10 w-10 rounded-xl border transition inline-flex items-center justify-center " +
              (theme === "dark"
                ? "border-white/15 bg-white text-black hover:bg-white/90"
                : "border-black/10 bg-black text-white hover:bg-black/90")
            }
            aria-label="تایید"
            title="تایید"
          >
            <img
              src="/images/icons/check.svg"
              alt=""
              className={"w-5 h-5 " + (theme === "dark" ? "" : "invert")}
            />
          </button>
        </div>
      </div>
    </div>,
    document.body
  )}

</div>
</div>

    <div className={theme === "dark" ? "h-px bg-white/10" : "h-px bg-black/10"} />

    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <div className={labelCls}
          >  {formKind === "outgoing" ? "تاریخ ثبت دبیرخانه " : "تاریخ ثبت دبیرخانه"}
          </div>
          <JalaliPopupDatePicker
            value={formKind === "incoming" ? incomingSecretariatDate : formKind === "outgoing" ? outgoingSecretariatDate : internalSecretariatDate}
            onChange={(v) => {
              if (formKind === "incoming") setIncomingSecretariatDate(v);
              else if (formKind === "outgoing") setOutgoingSecretariatDate(v);
              else setInternalSecretariatDate(v);
            }}
            disableFuture={formKind === "incoming" || formKind === "internal"}
            theme={theme}
            buttonClassName={secretariatPickerBtnCls(
              formKind === "incoming" ? incomingSecretariatDate : formKind === "outgoing" ? outgoingSecretariatDate : internalSecretariatDate
            )}
          />
          <div className={theme === "dark" ? "text-white/50 text-[11px] mt-1" : "text-neutral-500 text-[11px] mt-1"}>
            {secretariatLongText(
              formKind === "incoming" ? incomingSecretariatDate : formKind === "outgoing" ? outgoingSecretariatDate : internalSecretariatDate
            )}
          </div>
        </div>

        <div>
          <div className={labelCls}
          >  {formKind === "outgoing" ? "شماره ثبت دبیرخانه " : "شماره ثبت دبیرخانه"}
          </div>
        <input
  value={getSecretariatNoDisplayForKind(formKind)}
  readOnly={!canEditSecretariatNo || nextCodeLoadingKind === formKind}
  tabIndex={canEditSecretariatNo && nextCodeLoadingKind !== formKind ? 0 : -1}
  onChange={(e) => {
    if (!canEditSecretariatNo || nextCodeLoadingKind === formKind) return;
    const v = e.target.value;
    if (formKind === "incoming") setIncomingSecretariatNo(v);
    else if (formKind === "outgoing") setOutgoingSecretariatNo(v);
    else setInternalSecretariatNo(v);
  }}
  className={
    inputCls +
    (canEditSecretariatNo && nextCodeLoadingKind !== formKind ? "" : " bg-black/5 dark:bg-white/10 cursor-not-allowed select-none")
  }
  type="text"
/>

        </div>
        <div>
          <div className={labelCls}>مسئول دبیرخانه</div>
          <input value={loggedInUserName || ""} readOnly className={inputCls + " opacity-90"} type="text" />
        </div>
        <div>
  <div className={labelCls}>توضیح</div>
  <input
    value={
      formKind === "incoming"
        ? incomingSecretariatNote
        : formKind === "outgoing"
        ? outgoingSecretariatNote
        : internalSecretariatNote
    }
    onChange={(e) => {
      const v = e.target.value;
      if (formKind === "incoming") setIncomingSecretariatNote(v);
      else if (formKind === "outgoing") setOutgoingSecretariatNote(v);
      else setInternalSecretariatNote(v);
    }}
    className={inputCls}
    type="text"
    placeholder="توضیح دبیرخانه..."
  />
</div>

      </div>

{/* برچسب‌ها (برای فرم) */}
<div className="md:col-span-12 min-w-0">
  <div className={labelCls}>{requiredLabel("برچسب ها", formKind, "formTags")}</div>

  <FieldWrap>
    <div className="w-full min-w-0 flex flex-wrap items-center gap-2">
      {(() => {
       const selectedIds =
  formKind === "outgoing" ? (Array.isArray(outgoingTagIds) ? outgoingTagIds : [])
  : formKind === "internal" ? (Array.isArray(internalTagIds) ? internalTagIds : [])
  : (Array.isArray(incomingTagIds) ? incomingTagIds : []);

        const selectedObjs = selectedIds
          .map((id) => {
            const sid = String(id || "").trim();
            if (!sid) return null;
            return tagById.get(sid) || { id: sid, label: `برچسب (${toFaDigits(sid)})`, _missing: true };
          })
          .filter(Boolean);

        if (selectedObjs.length === 0) return null;

        return selectedObjs.map((t) => {
          const id = String(t?.id);
          const label = tagLabelOf(t);

          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                toggleFormTag(id);
              }}

              className={selectedTagChipCls + " shrink-0"}
              title={label}
              aria-label={label}
            >
              <span className="truncate max-w-[220px]">{label}</span>
            </button>
          );
        });
      })()}

      <button
        type="button"
        onClick={() => { openTagPicker("form"); clearFieldError(formKind, "formTags"); }}
        className={
          "h-10 w-10 shrink-0 rounded-full border transition inline-flex items-center justify-center " +
          (fieldHasError(formKind, "formTags")
            ? "!border-red-500 !ring-1 !ring-red-500 "
            : "") +
          (theme === "dark"
            ? "border-white/15 bg-white/5 hover:bg-white/10"
            : "border-black/10 bg-white hover:bg-black/[0.02]")
        }
        aria-label="افزودن برچسب"
        title="افزودن برچسب"
      >
        <img
          src="/images/icons/sayer.svg"
          alt=""
          className={"w-5 h-5 " + (theme === "dark" ? "dark:invert" : "")}
        />
      </button>
    </div>

<ErrorTextAbs kind={formKind} k="formTags" />
  </FieldWrap>
</div>


      {/* ✅ دکمه ارسال هم داخل همین کادر قرار گرفت */}
      <div className="flex items-center justify-end pt-2">
        <button
  type="button"
  disabled={isSubmitting}
  onClick={() => submitLetter(formKind)}
  className={sendBtnCls + (isSubmitting ? " opacity-50 cursor-not-allowed" : "")}
  title="ارسال"
  aria-label="ارسال"
>
  <img src="/images/icons/check.svg" alt="" className={sendIconCls} />
</button>

      </div>
    </div>
  </div>
) : null}

          </div>
          {/* Table */}
          <div className="mt-5">
            <div className={tableWrapCls}>
              <div className="md:hidden">
                {pageItems.length === 0 ? (
                  <div className="py-8 px-4 text-center text-sm text-black/60 dark:text-neutral-400">
                    آیتمی ثبت نشده است.
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {pageItems.map((l, idx) => {
                      const id = String(letterIdOf(l));
                      const absIdx = startIdx + idx;
                      const kind = letterKindOf(l);
                      const isOutgoing = kind === "outgoing";
                      const isIncoming = kind === "incoming";
                      const isInternal = kind === "internal";
                      const isConf = isConfidentialLetter(l);
                      const activeColor = isOutgoing
                        ? TAB_ACTIVE_BG.outgoing
                        : isIncoming
                        ? TAB_ACTIVE_BG.incoming
                        : isInternal
                        ? TAB_ACTIVE_BG.internal
                        : "#737373";
                      const cardBg = isOutgoing
                        ? theme === "dark"
                          ? "bg-[#8BAE66]/15"
                          : "bg-[#8BAE66]/[0.06]"
                        : isIncoming
                        ? theme === "dark"
                          ? "bg-[#0046FF]/15"
                          : "bg-[#0046FF]/[0.06]"
                        : isInternal
                        ? theme === "dark"
                          ? "bg-orange-500/10"
                          : "bg-orange-50"
                        : theme === "dark"
                        ? "bg-white/5"
                        : "bg-black/[0.02]";
                      const mutedText = isConf
                        ? CONFIDENTIAL_TEXT_CLS
                        : theme === "dark"
                        ? "text-white/60"
                        : "text-neutral-600";
                      const labelText = isConf
                        ? CONFIDENTIAL_TEXT_CLS
                        : theme === "dark"
                        ? "text-white/50"
                        : "text-neutral-500";
                      const kindLabel = TABS.find((x) => x.id === kind)?.label || "";
                      const hasRealAttachment = attachmentsOf(l).length > 0;

                      return (
                        <div key={id} className={"border-r-4 p-3 " + cardBg + (isConf ? " " + CONFIDENTIAL_TEXT_CLS : "")} style={{ borderRightColor: activeColor }}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="relative flex min-w-0 items-center gap-2">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 shrink-0 accent-black dark:accent-neutral-200"
                                  checked={selectedIds.has(id)}
                                  onChange={() => toggleRowSelect(id)}
                                  aria-label="انتخاب"
                                  title="انتخاب"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setKbdAbsIdx(absIdx);
                                    openView(l);
                                  }}
                                  className={"min-w-0 truncate text-right text-sm font-bold underline-offset-4 hover:underline" + (isConf ? " " + CONFIDENTIAL_TEXT_CLS : "")}
                                  title="نمایش"
                                  aria-label="نمایش"
                                >
                                  {toFaDigits(letterNoOf(l) || "—")}
                                </button>
                                {kindLabel ? (
                                  <span className={"shrink-0 rounded-full px-2 py-0.5 text-[11px] bg-white/70 dark:bg-white/10 " + (isConf ? CONFIDENTIAL_TEXT_CLS : "text-neutral-800 dark:text-white/80")}>
                                    {kindLabel}
                                  </span>
                                ) : null}
                              </div>
                              <div className={"mt-1 text-xs " + mutedText}>
                                {letterDateOf(l) ? toFaDigits(letterDateOf(l)) : "—"}
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-0 -space-x-1">
                              {!hasRealAttachment ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setKbdAbsIdx(absIdx);
                                    startEdit(l);
                                    openUpload(kind, id);
                                  }}
                                  className={iconBtnCls + " !h-9 !w-9 animate-pulse"}
                                  aria-label="بارگذاری پیوست"
                                  title="بارگذاری پیوست"
                                >
                                  <img
                                    src="/images/icons/Uplod.svg"
                                    alt=""
                                    className={"w-5 h-5 " + (theme === "dark" ? "invert" : "")}
                                  />
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => {
                                  setKbdAbsIdx(absIdx);
                                  openView(l);
                                }}
                                className={iconBtnCls + " !h-9 !w-9"}
                                aria-label="نمایش"
                                title="نمایش"
                              >
                                <img src="/images/icons/namayeshname.svg" alt="" className="w-5 h-5 dark:invert" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openLetterInOutlook(l)}
                                className={iconBtnCls + " !h-9 !w-9 !text-neutral-900 dark:!text-white"}
                                aria-label="ارسال"
                                title="ارسال"
                              >
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M22 2 11 13" />
                                  <path d="m22 2-7 20-4-9-9-4 20-7Z" />
                                </svg>
                              </button>
                              <button type="button" onClick={() => startEdit(l)} className={iconBtnCls + " !h-9 !w-9"} aria-label="ویرایش" title="ویرایش">
                                <img src="/images/icons/pencil.svg" alt="" className="w-5 h-5 dark:invert" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 space-y-2 text-sm">
                            <div>
                              <div className={"text-[11px] " + labelText}>موضوع</div>
                              <div className="line-clamp-2 break-words leading-6">{subjectOf(l) || "—"}</div>
                            </div>
                            <div className="grid grid-cols-1 min-[430px]:grid-cols-2 gap-2">
                              <div className="min-w-0">
                                <div className={"text-[11px] " + labelText}>از/به</div>
                                <div className="truncate">{fromToOf(l) || "—"}</div>
                              </div>
                              <div className="min-w-0">
                                <div className={"text-[11px] " + labelText}>شرکت/سازمان</div>
                                <div className="truncate">{orgOf(l) || "—"}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

    <div
  ref={tableScrollRef}
  dir="ltr"
  className={
  "hidden md:block relative max-h-[55vh] overflow-y-auto overflow-x-hidden " +
  (hasYScroll ? "pr-2" : "pr-0") +
  " pb-0"
}
>
  <style>{`
    @keyframes letter-upload-flash {
      0%, 58%, 100% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 0 rgba(37, 99, 235, 0)); }
      66% { transform: scale(1.14); opacity: 0.8; filter: drop-shadow(0 0 7px rgba(37, 99, 235, 0.7)); }
      74% { transform: scale(0.98); opacity: 1; filter: drop-shadow(0 0 2px rgba(37, 99, 235, 0.35)); }
    }
    .letter-upload-flash :is(img, svg, .letter-upload-icon) { animation: letter-upload-flash 2.4s ease-in-out infinite; }
    .letter-upload-flash:hover :is(img, svg, .letter-upload-icon) { animation-play-state: paused; }
    @media (prefers-reduced-motion: reduce) {
      .letter-upload-flash :is(img, svg, .letter-upload-icon) { animation: none; }
    }
  `}</style>
               <table
               
  dir="rtl"
  className="w-full min-w-full table-fixed text-sm
    [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:min-w-0 [&_td]:text-center
    [&_th]:!py-2 [&_td]:!py-2"
>
<colgroup>
  <col style={{ width: 48 }} />   {/* checkbox */}
  <col style={{ width: 100 }} />  {/* شماره */}
  <col style={{ width: 100 }} />  {/* تاریخ */}
  <col style={{ width: 115 }} />  {/* نوع سند */}
  <col />                         {/* موضوع؛ فضای اصلی جدول */}
  <col style={{ width: 190 }} />  {/* شرکت/سازمان */}
  <col style={{ width: 48 }} />   {/* منو / بارگذاری پیوست */}
</colgroup>

  <thead>
    <tr className={theadRowCls}>
      <th className="w-12 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-40 bg-neutral-200 dark:bg-neutral-800">
        <input
          type="checkbox"
          className="w-4 h-4 accent-black dark:accent-neutral-200"
          checked={allVisibleSelected}
          ref={(el) => {
            if (el) el.indeterminate = someVisibleSelected;
          }}
          onChange={toggleSelectAllVisible}
          aria-label="انتخاب همه"
          title="انتخاب همه"
        />
      </th>

      <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-neutral-800">
        <button
          type="button"
          onClick={() => setLetterNoSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
          className="mx-auto inline-flex items-center gap-1 hover:opacity-90"
          aria-label={letterNoSortDir === "desc" ? "مرتب سازی شماره از بزرگ به کوچک" : "مرتب سازی شماره از کوچک به بزرگ"}
          title={letterNoSortDir === "desc" ? "مرتب سازی شماره از بزرگ به کوچک" : "مرتب سازی شماره از کوچک به بزرگ"}
        >
          <span>شماره</span>
          <img
            src={letterNoSortDir === "desc" ? "/images/icons/bozorgbekochik.svg" : "/images/icons/kochikbebozorg.svg"}
            alt=""
            className={"w-4 h-4 " + (theme === "dark" ? "invert" : "")}
          />
        </button>
      </th>

      <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-neutral-800">
        تاریخ
      </th>

      <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-neutral-800">
        نوع سند
      </th>

      <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-neutral-800">
        موضوع
      </th>

      <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-neutral-800">
        شرکت/سازمان
      </th>

     <th className="w-12 !p-0 sticky top-0 z-40 bg-neutral-200 dark:bg-neutral-800">
  <div ref={tableMenuRef} className="relative flex items-center justify-center">
    <button
      type="button"
      onClick={() => setTableMenuOpen((open) => !open)}
      className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/[0.08] dark:hover:bg-white/10"
      title="مدیریت وضعیت خواندن"
      aria-label="مدیریت وضعیت خواندن"
      aria-expanded={tableMenuOpen}
    >
      <img src="/images/icons/menu-table.svg" alt="" className={`h-4 w-3 transition-transform duration-200 ${tableMenuOpen ? "scale-110" : ""} dark:invert`} />
    </button>

    {tableMenuOpen ? (
      <div className="table-menu-popover absolute left-0 top-[calc(100%+8px)] w-60 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 text-right text-neutral-900 shadow-[0_18px_45px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100">
        <div className="px-2.5 pb-2 pt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          {selectedIds.size ? `${toFaDigits(selectedIds.size)} مورد انتخاب شده` : "ابتدا یک سند را انتخاب کنید"}
        </div>
        <button type="button" disabled={!selectedMenuLetter} onClick={sendSelectedLetter} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-sky-500/10">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-100 text-sky-700 transition group-hover:scale-105 dark:bg-sky-500/15 dark:text-sky-300"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4 20-7Z" /></svg></span>
          <span className="min-w-0 flex-1 text-sm font-semibold">ارسال</span>
        </button>
        <button type="button" disabled={!selectedMenuLetter} onClick={editSelectedLetter} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-amber-500/10">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 transition group-hover:scale-105 dark:bg-amber-500/15"><img src="/images/icons/pencil.svg" alt="" className="h-4 w-4 dark:invert" /></span>
          <span className="min-w-0 flex-1 text-sm font-semibold">ویرایش سند</span>
        </button>
        {!isMainAdmin && canSeeMainAdminLogin ? (
          <button
            type="button"
            onClick={() => {
              setTableMenuOpen(false);
              askMainAdminEnable(setIsMainAdmin);
            }}
            className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-neutral-100 dark:hover:bg-white/10"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-700 transition group-hover:scale-105 dark:bg-white/10 dark:text-neutral-200">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 17v-2" />
                <path d="M8 10V8a4 4 0 0 1 8 0v2" />
                <rect x="7" y="10" width="10" height="10" rx="2" />
              </svg>
            </span>
            <span className="min-w-0 flex-1 text-sm font-semibold">ورود ادمین</span>
          </button>
        ) : null}
      </div>
    ) : null}
  </div>
</th>
    </tr>
  </thead>

  <tbody className={tbodyCls}>
    {pageItems.length === 0 ? (
      <tr>
        <td colSpan={7} className="py-6 text-black/60 dark:text-neutral-400">
          آیتمی ثبت نشده است.
        </td>
      </tr>
    ) : (
      pageItems.map((l, idx) => {
        const id = String(letterIdOf(l));
        const absIdx = startIdx + idx;
        const isKeyboardActive = absIdx === kbdAbsIdx;
        const kind = letterKindOf(l);
        const kindLabel = TABS.find((tab) => tab.id === kind)?.label || "—";
        const isLast = idx === pageItems.length - 1;
        const divider = isLast ? "" : rowDividerCls;
        const hasRealAttachment = attachmentsOf(l).length > 0;
        const isConf = isConfidentialLetter(l);

const normalRowBg = theme === "dark"
  ? "bg-neutral-900 hover:bg-neutral-800/80"
  : "bg-white hover:bg-neutral-50";

// ✅ محرمانه: نمایش با آیکن، بدون بک‌گراند جداگانه
const rowBg = normalRowBg;

        return (  
         <tr
          key={id}
          ref={(el) => {
            if (el) tableRowRefs.current.set(id, el);
            else tableRowRefs.current.delete(id);
          }}
          onClick={() => {
            setKbdAbsIdx(absIdx);
            openView(l);
          }}
          className={
            "group cursor-pointer " +
            rowBg +
            " transition-colors" +
            (isConf ? " [&_td]:!text-red-600 dark:[&_td]:!text-red-500" : "") +
            (isKeyboardActive ? " outline outline-2 -outline-offset-2 outline-black/40 dark:outline-white/50" : "")
          }
        >
            <td className={"px-3 " + divider}>
              <input
                type="checkbox"
                className="w-4 h-4 accent-black dark:accent-neutral-200"
                checked={selectedIds.has(id)}
                onClick={(event) => event.stopPropagation()}
                onChange={() => toggleRowSelect(id)}
                aria-label="انتخاب"
                title="انتخاب"
              />
            </td>

            <td className={"px-3 " + divider}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setKbdAbsIdx(absIdx);
                  openView(l);
                }}
                className={
                  "mx-auto inline-flex items-center justify-center gap-2 text-[13px] font-semibold underline-offset-4 hover:underline transition " +
                  (isConf
                    ? CONFIDENTIAL_TEXT_CLS
                    : theme === "dark"
                    ? "text-white"
                    : "text-neutral-900")
                }
                title="نمایش"
                aria-label="نمایش"
              >
                {toFaDigits(letterNoOf(l) || "—")}
              </button>
            </td>

            <td className={"px-3 " + divider}>{letterDateOf(l) ? toFaDigits(letterDateOf(l)) : "—"}</td>

            <td className={"px-3 " + divider}>
              <span
                className={documentTypeFilterChipCls(kind, false) + " mx-auto max-w-full truncate"}
                title={kindLabel}
              >
                {kindLabel}
              </span>
            </td>

            <td className={"px-3 " + divider}>
              <span className="block truncate mx-auto">{subjectOf(l) || "—"}</span>
            </td>

            <td className={"px-3 " + divider}>
              <span className="block truncate mx-auto">{orgOf(l) || "—"}</span>
            </td>

            <td className={"!px-0 " + divider}>
              <div className="w-full flex items-center justify-center gap-0">
                {!hasRealAttachment ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setKbdAbsIdx(absIdx);
                      startEdit(l);
                      openUpload(kind, id);
                    }}
                    className={uploadActionBtnCls}
                    aria-label="بارگذاری پیوست"
                    title="بارگذاری پیوست"
                  >
                    <span
                      className="letter-upload-icon block w-[18px] h-[18px]"
                      aria-hidden="true"
                      style={{
                        backgroundColor: theme === "dark" ? "#fff" : "#111827",
                        WebkitMask: "url('/images/icons/Uplod.svg') center / contain no-repeat",
                        mask: "url('/images/icons/Uplod.svg') center / contain no-repeat",
                      }}
                    />
                  </button>
                ) : null}
              </div>
            </td>
          </tr>
        );
      })
    )}
  </tbody>
</table>

              </div>

              {/* Pagination footer */}
              <div className="border-t border-neutral-300 dark:border-neutral-800 px-3 py-2">
                <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center md:justify-between gap-2">
                  <div className="flex items-center justify-between md:justify-start gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={safePage <= 0}
                      className={paginationIconBtnCls}
                      aria-label="صفحه قبل"
                      title="صفحه قبل"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                      disabled={safePage >= pageCount - 1}
                      className={paginationIconBtnCls}
                      aria-label="صفحه بعد"
                      title="صفحه بعد"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>

                    <div className="text-black/70 dark:text-neutral-400 whitespace-nowrap">
                      {total === 0 ? "۰ از ۰" : `${toFaDigits(startIdx + 1)}–${toFaDigits(endIdx)} از ${toFaDigits(total)}`}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-start gap-2 text-sm">
                    <span className="text-black/70 dark:text-neutral-400">تعداد در هر صفحه:</span>
                    <div
                      className={
                        "inline-flex h-9 overflow-hidden rounded-lg border " +
                        (theme === "dark" ? "border-white/15 bg-white/5" : "border-black/10 bg-white")
                      }
                    >
                      {[10, 25, 100].map((n) => {
                        const active = rowsPerPage === n;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => {
                              setRowsPerPage(n);
                              setPage(0);
                            }}
                            className={
                              "min-w-10 px-3 text-sm font-semibold transition " +
                              (active
                                ? theme === "dark"
                                  ? "bg-white text-neutral-900"
                                  : "bg-neutral-900 text-white"
                                : theme === "dark"
                                ? "text-white/75 hover:bg-white/10"
                                : "text-neutral-700 hover:bg-black/[0.04]")
                            }
                            aria-pressed={active}
                          >
                            {toFaDigits(n)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* View modal */}
      {viewOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999]">
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={closeView} />
            <div className="absolute inset-0 p-3 md:p-6 flex items-center justify-center">
              <div
                className={
                  "w-[min(1200px,calc(100vw-20px))] h-[min(82vh,780px)] rounded-2xl border shadow-2xl overflow-hidden " +
                  (theme === "dark" ? "border-white/10 bg-neutral-900 text-white" : "border-black/10 bg-white text-neutral-900")
                }
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-full flex flex-col">
                  <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-black/10 dark:border-white/10">
                    <div className="font-bold text-sm">
                      نمایش نامه
                      {viewLetter ? (
                        <span className={theme === "dark" ? "text-white/60 font-normal" : "text-neutral-600 font-normal"}>
                          {" "}
                          — {toFaDigits(letterNoOf(viewLetter) || "")}
                        </span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={closeView}
                      className={
                        "h-10 w-10 rounded-xl flex items-center justify-center transition ring-1 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 " +
                        (theme === "dark" ? "ring-neutral-800 hover:bg-white/10 text-white" : "ring-black/15 hover:bg-black/90 bg-black text-white")
                      }
                      aria-label="بستن"
                      title="بستن"
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <div className="h-full flex flex-col lg:flex-row">
                      <div className="lg:w-[56%] h-full overflow-auto p-4">
                        <div className={"rounded-2xl border overflow-hidden " + (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-black/[0.02]")}>
                          <div className={"px-4 py-3 text-sm font-semibold border-b " + (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-white")}>
                            مشخصات نامه
                          </div>

                          <div className="px-4 divide-y divide-black/10 dark:divide-white/10">
<InfoRow
  label="نوع سند"
  value={
    viewLetter
      ? (() => {
          const k = letterKindOf(viewLetter);
          const tab = TABS.find((item) => item.id === k);
          return (
            <span className={documentTypeFilterChipCls(k, false) + " inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1"}>
              <span>{tab?.label || "—"}</span>
              {tab?.icon ? <img src={tab.icon} alt="" className="h-4 w-4" /> : null}
            </span>
          );
        })()
      : ""
  }
/>

<InfoRow
  label={viewLetter && letterKindOf(viewLetter) === "incoming" ? "کلاس سند" : "دسته بندی"}
  value={viewLetter ? categoryLabel(categoryOf(viewLetter)) : ""}
/>

                            <InfoRow
                              label="پروژه"
                              value={
                                viewLetter && (viewLetter?.project_id ?? viewLetter?.projectId)
                                  ? (() => {
                                      const pid = String(viewLetter?.project_id ?? viewLetter?.projectId);
                                      const p = findProject(pid);
                                      if (!p) return pid;
                                      return `${String(p.code || "")}${p.name ? ` - ${p.name}` : ""}`.trim();
                                    })()
                                  : "—"
                              }
                            />

                            <InfoRow
                              label="از"
                              value={viewLetter ? String(viewLetter?.from_name ?? viewLetter?.fromName ?? viewLetter?.from ?? "") : ""}
                            />
                            <InfoRow
                              label="به"
                              value={viewLetter ? String(viewLetter?.to_name ?? viewLetter?.toName ?? viewLetter?.to ?? "") : ""}
                            />
                            <InfoRow
                              label="شرکت/سازمان"
                              value={viewLetter ? String(viewLetter?.org_name ?? viewLetter?.orgName ?? viewLetter?.org ?? viewLetter?.organization ?? viewLetter?.company ?? "") : ""}
                            />
                            <InfoRow label="موضوع" value={viewLetter ? String(subjectOf(viewLetter) || "") : ""} />
                              {viewLetter && letterKindOf(viewLetter) === "incoming" && (
                                <InfoRow
                                  label="برچسب"
                                  value={(() => {
                                    const ids = Array.isArray(viewLetter?.tag_ids)
                                      ? viewLetter.tag_ids
                                      : Array.isArray(viewLetter?.tagIds)
                                      ? viewLetter.tagIds
                                      : [];

                                    const clean = ids.map((x) => String(x)).filter(Boolean);
                                    if (!clean.length) return "—";

                                    const labels = clean
                                      .map((id) => tagById.get(id))
                                      .filter(Boolean)
                                      .map((t) => tagLabelOf(t));

                                    return labels.length ? labels.join("، ") : "—";
                                  })()}
                                />
                              )}

                            <InfoRow label="ضمیمه" value={viewHasAttachment ? "دارد" : "ندارد"} />
                            {!(viewLetter && letterKindOf(viewLetter) === "incoming") && (
                              <InfoRow
                                label="بازگشت به"
                                value={
                                  viewLetter
                                    ? (() => {
                                        const ids = Array.isArray(viewLetter?.return_to_ids)
                                          ? viewLetter.return_to_ids
                                          : Array.isArray(viewLetter?.returnToIds)
                                          ? viewLetter.returnToIds
                                          : [];
                                        if (!ids.length) return "—";
                                        const map = new Map((Array.isArray(myLetters) ? myLetters : []).map((x) => [String(letterIdOf(x)), x]));
                                        const labels = ids
                                          .map((x) => String(x))
                                          .filter(Boolean)
                                          .map((sid) => {
                                            const it = map.get(sid);
                                            return toFaDigits(it ? String(it?.letter_no || sid) : sid);
                                          });
                                        return labels.join("، ");
                                      })()
                                    : ""
                                }
                              />
                            )}
<InfoRow
  label={viewLetter && letterKindOf(viewLetter) === "incoming" ? "نامه های مرتبط" : "پیرو"}
  value={
    viewLetter
      ? (() => {
          const ids = Array.isArray(viewLetter?.piro_ids)
            ? viewLetter.piro_ids
            : Array.isArray(viewLetter?.piroIds)
            ? viewLetter.piroIds
            : [];

          const clean = ids.map((x) => String(x)).filter(Boolean);
          if (!clean.length) return "—";

          const map = new Map(
            (Array.isArray(myLetters) ? myLetters : []).map((x) => [String(letterIdOf(x)), x])
          );

          return (
            <div className="flex flex-wrap gap-2">
              {clean.map((sid) => {
                const it = map.get(sid);
                const no = String(it?.letter_no || it?.letterNo || sid);

                return (
                  <button
                    key={sid}
                    type="button"
                    onClick={() => {
                      if (it) openView(it);
                    }}
                    className={
                      "underline underline-offset-4 font-semibold " +
                      (theme === "dark" ? "text-white hover:text-white/90" : "text-neutral-900 hover:text-black")
                    }
                    title="پیش نمایش"
                  >
                    {toFaDigits(no)}
                  </button>
                );
              })}
            </div>
          );
        })()
      : ""
  }
/>

                            <InfoRow label="تاریخ ثبت دبیرخانه" value={viewLetter ? toFaDigits(String(viewLetter?.secretariat_date ?? viewLetter?.secretariatDate ?? "")) : ""} />
                            <InfoRow label="شماره ثبت دبیرخانه" value={viewLetter ? String(viewLetter?.secretariat_no ?? viewLetter?.secretariatNo ?? "") : ""} />
                            <InfoRow label="مسئول دبیرخانه" value={viewLetter ? String(viewLetter?.receiver_name ?? viewLetter?.receiverName ?? "") : ""} />
                          </div>
                        </div>

                        {viewAttachments.length > 1 && (
                          <div className="mt-3">
                            <div className={labelCls}>فایل‌ها</div>
                            <div className="flex flex-wrap gap-2">
                              {viewAttachments.map((a, i) => {
                                const u = attachmentUrlOf(a);
                                const n = attachmentNameOf(a) || `فایل ${i + 1}`;
                                const active = (viewAttIdx || 0) === i;
                                return (
                                  <button
                                    key={String(i)}
                                    type="button"
                                    onClick={() => setViewAttIdx(i)}
                                    className={
                                      "h-10 px-3 rounded-xl border transition text-sm " +
                                      (active
                                        ? theme === "dark"
                                          ? "border-white/15 bg-white text-black"
                                          : "border-black/15 bg-black text-white"
                                        : theme === "dark"
                                        ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
                                        : "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]")
                                    }
                                    title={u || ""}
                                  >
                                    {n}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="lg:w-[44%] h-full border-t lg:border-t-0 lg:border-r border-black/10 dark:border-white/10 overflow-hidden">
                        <div className="h-full flex flex-col">
                          <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10">
                            <div className="text-sm font-semibold">پیش نمایش</div>
                          </div>

                          <div className="flex-1 p-3 overflow-hidden flex flex-col">
                            <div className={"flex-1 rounded-2xl border overflow-hidden " + (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-black/[0.02]")}>
                              {currentViewUrl ? (
                                isPdfView ? (
                                <object
                                  key={currentViewUrl}
                                  data={(currentViewUrl || "") + "#view=FitH"}
                                  type="application/pdf"
                                  className="w-full h-full"
                                >
                                  <iframe
                                    title="preview"
                                    src={(currentViewUrl || "") + "#view=FitH"}
                                    className="w-full h-full"
                                  />
                                </object>
                              )
                              : isImageView ? (
                                  <img key={currentViewUrl} src={currentViewUrl} alt="" className="w-full h-full object-contain bg-transparent" />
                                ) : isOfficeView && currentOfficeViewerUrl ? (
                                  <iframe
                                    key={currentOfficeViewerUrl}
                                    title="office_preview"
                                    src={currentOfficeViewerUrl}
                                    className="w-full h-full bg-white"
                                  />
                                ) : (
                                  <div className="h-full w-full grid place-items-center p-6">
                                    <div className="max-w-md text-center space-y-2">
                                      <div className={theme === "dark" ? "text-white/80 text-sm font-semibold" : "text-neutral-800 text-sm font-semibold"}>
                                        {isOfficeView
                                          ? "\u067e\u06cc\u0634\u200c\u0646\u0645\u0627\u06cc\u0634 \u062f\u0627\u062e\u0644\u06cc \u0627\u06cc\u0646 \u0641\u0627\u06cc\u0644 Office \u062f\u0631 \u0627\u06cc\u0646 \u0645\u062d\u06cc\u0637 \u062f\u0631 \u062f\u0633\u062a\u0631\u0633 \u0646\u06cc\u0633\u062a."
                                          : "\u067e\u06cc\u0634\u200c\u0646\u0645\u0627\u06cc\u0634 \u062f\u0627\u062e\u0644\u06cc \u0627\u06cc\u0646 \u0646\u0648\u0639 \u0641\u0627\u06cc\u0644 \u062f\u0631 \u0645\u0631\u0648\u0631\u06af\u0631 \u0645\u0648\u062c\u0648\u062f \u0646\u06cc\u0633\u062a."}
                                      </div>
                                      <div className={theme === "dark" ? "text-white/60 text-xs" : "text-neutral-600 text-xs"}>
                                        {"\u0627\u0632 \u062f\u06a9\u0645\u0647\u200c\u0647\u0627\u06cc \u00ab\u0628\u0627\u0632 \u06a9\u0631\u062f\u0646 \u0641\u0627\u06cc\u0644\u00bb \u06cc\u0627 \u00ab\u062f\u0627\u0646\u0644\u0648\u062f \u0641\u0627\u06cc\u0644\u00bb \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u06a9\u0646\u06cc\u062f."}
                                      </div>
                                    </div>
                                  </div>
                                )
                              ) : (
                                <div className="h-full w-full grid place-items-center p-6">
                                  <div className={theme === "dark" ? "text-white/60 text-sm" : "text-neutral-600 text-sm"}>{"\u0641\u0627\u06cc\u0644\u06cc \u0628\u0631\u0627\u06cc \u067e\u06cc\u0634\u200c\u0646\u0645\u0627\u06cc\u0634 \u0645\u0648\u062c\u0648\u062f \u0646\u06cc\u0633\u062a."}</div>
                                </div>
                              )}
                            </div>

                            <div className="mt-2 flex flex-col gap-2">
                              <a
                                href={currentViewUrl || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className={
                                  "h-11 rounded-xl inline-flex items-center justify-center gap-2 transition " +
                                  (currentViewUrl
                                    ? theme === "dark"
                                      ? "bg-white/10 text-white hover:bg-white/15"
                                      : "bg-black/10 text-black hover:bg-black/15"
                                    : theme === "dark"
                                    ? "bg-white/10 text-white/40 pointer-events-none"
                                    : "bg-black/10 text-black/40 pointer-events-none")
                                }
                                title="\u0628\u0627\u0632 \u06a9\u0631\u062f\u0646 \u0641\u0627\u06cc\u0644"
                                aria-label="\u0628\u0627\u0632 \u06a9\u0631\u062f\u0646 \u0641\u0627\u06cc\u0644"
                              >
                                <img src="/images/icons/namayeshname.svg" alt="" className={"w-5 h-5 " + (theme === "dark" ? "invert" : "")} />
                                <span className="text-sm font-semibold">{"\u0628\u0627\u0632 \u06a9\u0631\u062f\u0646 \u0641\u0627\u06cc\u0644"}</span>
                              </a>
                              <a
                                href={currentViewUrl || "#"}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className={
                                  "h-11 rounded-xl inline-flex items-center justify-center gap-2 transition " +
                                  (currentViewUrl
                                    ? theme === "dark"
                                      ? "bg-white text-black hover:bg-white/90"
                                      : "bg-black text-white hover:bg-black/90"
                                    : theme === "dark"
                                    ? "bg-white/10 text-white/40 pointer-events-none"
                                    : "bg-black/10 text-black/40 pointer-events-none")
                                }
                                title="\u062f\u0627\u0646\u0644\u0648\u062f \u0641\u0627\u06cc\u0644"
                                aria-label="\u062f\u0627\u0646\u0644\u0648\u062f \u0641\u0627\u06cc\u0644"
                              >
                                <img src="/images/icons/download.svg" alt="" className={"w-5 h-5 " + (theme === "dark" ? "" : "invert")} />
                                <span className="text-sm font-semibold">{"\u062f\u0627\u0646\u0644\u0648\u062f \u0641\u0627\u06cc\u0644"}</span>
                              </a>

                              {currentViewName ? (
                                <div className={theme === "dark" ? "text-[11px] text-white/60 text-center" : "text-[11px] text-neutral-600 text-center"}>
                                  {currentViewName}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* /preview */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Upload modal */}

{tagPickOpen &&
  createPortal(
    <div className="fixed inset-0 z-[9999]" dir="rtl">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={() => setTagPickOpen(false)}
      />

      <div className="absolute inset-0 p-3 md:p-6 flex items-center justify-center">
        <div
          className={
            "w-[min(980px,calc(100vw-20px))] h-[min(78vh,760px)] rounded-2xl border shadow-2xl overflow-hidden " +
            (theme === "dark"
              ? "border-white/10 bg-neutral-900 text-white"
              : "border-black/10 bg-white text-neutral-900")
          }
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-black/10 dark:border-white/10">
              <div className="font-bold text-sm">انتخاب برچسب</div>

              {/* ✅ بستن: آیکن مشکی */}
              <button
                type="button"
                onClick={() => setTagPickOpen(false)}
                className={
                  "h-10 w-10 rounded-xl flex items-center justify-center transition ring-1 " +
                  (theme === "dark"
                    ? "bg-white text-black ring-white/20 hover:bg-white/90"
                    : "bg-white text-black ring-black/15 hover:bg-black/5")
                }
                aria-label="بستن"
                title="بستن"
              >
                <img
                  src="/images/icons/bastan.svg"
                  alt=""
                  className="w-5 h-5 brightness-0"
                />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-4 pt-3">
              {/* ✅ سه تب حتما سمت راست + ترتیب: پروژه‌ها، نامه‌ها و مستندات، اجرای پروژه‌ها */}
              <div className="flex items-center justify-start gap-2">
                {(() => {
                  const order = ["projects", "letters", "execution"];
                  const ordered =
                    Array.isArray(TAG_PICK_TABS) && TAG_PICK_TABS.length
                      ? [
                          ...order
                            .map((id) => TAG_PICK_TABS.find((x) => x?.id === id))
                            .filter(Boolean),
                          ...TAG_PICK_TABS.filter((x) => !order.includes(x?.id)),
                        ]
                      : [];

                  const tabsToRender = ordered.length ? ordered : TAG_PICK_TABS;

                  return tabsToRender.map((t) => {
                    const active = tagPickKind === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={async () => {
                          setTagPickKind(t.id);
                          setTagPickCategoryId("");
                          setTagPickSearch("");
                          await ensureTagsForKind(t.id);
                        }}
                        className={
                          "h-10 px-4 rounded-xl border text-sm font-semibold transition " +
                          (active
                            ? "bg-black text-white border-black"
                            : theme === "dark"
                            ? "bg-transparent text-white border-white/15 hover:bg-white/5"
                            : "bg-white text-neutral-900 border-black/15 hover:bg-black/[0.02]")
                        }
                      >
                        {t.label}
                      </button>
                    );
                  });
                })()}
              </div>

              {/* Category row (for letters/execution only) */}
              {(() => {
                const scope = SCOPE_BY_KIND[tagPickKind] || "letters";
                const cats = Array.isArray(tagCatsByScope?.[scope]) ? tagCatsByScope[scope] : [];

                // ✅ پروژه‌ها دسته‌بندی ندارند
                if (tagPickKind === "projects") {
                  return (
                    <div className="mt-3 text-xs text-neutral-500 dark:text-white/50">
                      پروژه‌ها دسته‌بندی ندارد.
                    </div>
                  );
                }

                if (!cats.length) return null;

                return (
                  <div className="mt-3">
                    <div className={labelCls}>دسته‌بندی‌ها</div>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* همه */}
                      <button
                        type="button"
                        onClick={() => setTagPickCategoryId("")}
                        className={
                          (tagPickCategoryId
                            ? chipCls
                            : theme === "dark"
                            ? chipBase + " border-white/15 bg-white text-black"
                            : chipBase + " border-black/15 bg-black text-white") + " h-10"
                        }
                      >
                        همه
                      </button>

                      {cats.map((c) => {
                        const cid = String(c?.id ?? "");
                        const lab = String(c?.label ?? c?.name ?? "");
                        const active = tagPickCategoryId === cid;

                        return (
                          <button
                            key={cid}
                            type="button"
                            onClick={() => setTagPickCategoryId(active ? "" : cid)}
                            className={(active ? selectedTagChipCls : chipCls) + " h-10"}
                            title={lab}
                          >
                            <span className="truncate max-w-[220px]">{lab}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Search */}
              <div className="mt-3">
                <div className={labelCls}>جستجو</div>
                <input
                  value={tagPickSearch}
                  onChange={(e) => setTagPickSearch(e.target.value)}
                  className={inputCls}
                  placeholder="جستجو در برچسب‌ها..."
                />
              </div>
            </div>

            {/* Tags list */}
            <div className="px-4 py-3 flex-1 overflow-auto">
              {(() => {
                const scope = SCOPE_BY_KIND[tagPickKind] || "letters";
                const all = Array.isArray(tagsByScope?.[scope]) ? tagsByScope[scope] : [];
                const q = String(tagPickSearch || "").trim().toLowerCase();

                const filtered = all.filter((t) => {
                  const label = tagLabelOf(t).toLowerCase();
                  const catId = String(t?.category_id ?? t?.categoryId ?? "");
                  if (tagPickCategoryId && catId !== String(tagPickCategoryId)) return false;
                  if (q && !label.includes(q)) return false;
                  return true;
                });

                if (!filtered.length) {
                  return (
                    <div className="py-10 text-center text-sm text-neutral-500 dark:text-white/50">
                      چیزی پیدا نشد.
                    </div>
                  );
                }

                return (
                  <div className="flex flex-wrap gap-2">
                    {filtered.map((t) => {
                      const id = String(t?.id ?? "");
                      const label = tagLabelOf(t);
                      const active = (tagPickDraftIds || []).some((x) => String(x) === id);

                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => togglePickDraft(id)}
                          className={(active ? selectedTagChipCls : chipCls) + " h-10"}
                          title={label}
                        >
                          <span className="truncate max-w-[240px]">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Footer buttons */}
            <div className="px-4 py-3 border-t border-black/10 dark:border-white/10 flex items-center justify-end gap-2">
              {/* ✅ تایید: آیکن سفید */}
              <button
                type="button"
                onClick={applyPickedTags}
                className={
                  "h-10 w-10 rounded-xl flex items-center justify-center transition ring-1 " +
                  (theme === "dark"
                    ? "bg-black text-white ring-white/10 hover:bg-black/90"
                    : "bg-black text-white ring-black/15 hover:bg-black/90")
                }
                aria-label="تایید"
                title="تایید"
              >
                <img src="/images/icons/check.svg" alt="" className="w-5 h-5 invert" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )}

{uploadOpen &&
  createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeUpload} />
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
        <div
          className={
            "w-[min(720px,calc(100vw-16px))] max-h-[calc(100dvh-16px)] sm:max-h-[calc(100dvh-32px)] rounded-2xl border shadow-xl overflow-hidden flex flex-col " +
            (theme === "dark" ? "border-white/10 bg-neutral-900 text-white" : "border-black/10 bg-white text-neutral-900")
          }
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3 sm:p-4 flex items-center justify-between gap-3 shrink-0">
            <div className="font-bold text-sm leading-6 min-w-0 truncate">
  بارگذاری اسناد{" "}
  {uploadFor === "incoming" ? "(وارده)" : uploadFor === "outgoing" ? "(صادره)" : "(داخلی)"}
</div>
<button
  type="button"
  onClick={closeUpload}
  className={
    "h-10 w-10 rounded-xl flex items-center justify-center transition ring-1 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 " +
    (theme === "dark"
      ? "ring-neutral-800 hover:bg-white/10 text-white"
      : "ring-black/15 hover:bg-black/90 bg-black text-white")
  }
  aria-label="بستن"
  title="بستن"
>
  <img
    src="/images/icons/bastan.svg"
    alt=""
    className="w-4 h-4 invert"
  />
</button>

          </div>

          <div className={theme === "dark" ? "h-px bg-white/10" : "h-px bg-black/10"} />

          <div className="p-3 sm:p-4 grid grid-cols-1 gap-4 overflow-y-auto overscroll-contain">
                  {/* Right: pick new + selected list */}
                  <div>
                    <div className={labelCls}>فایل‌های انتخاب‌شده</div>

                    <div className={"rounded-2xl border overflow-hidden " + (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-white")}>
                      <div className={"px-3 py-2 text-xs font-semibold border-b " + (theme === "dark" ? "border-white/10 text-white/80" : "border-black/10 text-neutral-700")}>
                        {uploadFor === "incoming" ? "وارده" : uploadFor === "outgoing" ? "صادره" : "داخلی"}
                      </div>

                      <div className="p-2 sm:p-3 space-y-2">
                        {currentDocFiles.length === 0 ? (
                          <div className="py-6 text-center text-black/60 dark:text-white/50 text-sm">فایلی انتخاب نشده است.</div>
                        ) : (
                          currentDocFiles.map((f) => (
                            <div
                              key={f.id}
                              className={
                                "rounded-xl border px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 " +
                                (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-white")
                              }
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-[13px] font-semibold whitespace-normal break-words leading-6">
                                  {f.name}
                                </div>
                                <div className={theme === "dark" ? "text-white/60 text-[11px] mt-1" : "text-neutral-600 text-[11px] mt-1"}>
                                  {formatBytes(f.size)} {f.url ? "— الصاق شده" : f.status === "uploading" ? `— ${toFaDigits(f.progress)}٪` : ""}
                                </div>

                                {f.status === "error" && f.error ? (
                                  <div className="text-[11px] mt-1 text-red-500">{f.error}</div>
                                ) : null}

                                {(() => {
                                  const previewSrc = f.previewUrl || resolveFileUrl(f.url);
                                  const fileType = String(f.type || "").toLowerCase();
                                  const canPreviewPdf = !!previewSrc && (fileType.includes("pdf") || isPdfUrl(previewSrc, f.name));
                                  const canPreviewImage = !!previewSrc && (fileType.startsWith("image/") || isImageUrl(previewSrc, f.name));
                                  const canPreviewOffice = !!previewSrc && isOfficeFile(previewSrc, f.name, fileType);
                                  const officePreviewSrc = canPreviewOffice ? officeViewerUrlOf(previewSrc) : "";
                                  if (!canPreviewPdf && !canPreviewImage && !canPreviewOffice) return null;

                                  return (
                                    <div className={"mt-3 rounded-xl overflow-hidden border max-w-full sm:max-w-[520px] " + (theme === "dark" ? "border-white/10 bg-black/20" : "border-black/10 bg-black/[0.02]")}>
                                      {canPreviewPdf ? (
                                        <object data={(previewSrc || "") + "#view=FitH"} type="application/pdf" className="w-full h-36 sm:h-40">
                                          <iframe title={"preview_" + f.id} src={(previewSrc || "") + "#view=FitH"} className="w-full h-36 sm:h-40" />
                                        </object>
                                      ) : canPreviewImage ? (
                                        <img src={previewSrc} alt="" className="w-full h-36 sm:h-40 object-contain" />
                                      ) : officePreviewSrc ? (
                                        <iframe title={"preview_" + f.id} src={officePreviewSrc} className="w-full h-36 sm:h-40 bg-white" />
                                      ) : (
                                        <div className={"h-36 sm:h-40 grid place-items-center text-center px-4 text-xs " + (theme === "dark" ? "text-white/70" : "text-neutral-700")}>
                                          {"\u067e\u06cc\u0634\u200c\u0646\u0645\u0627\u06cc\u0634 \u062f\u0627\u062e\u0644\u06cc \u0627\u06cc\u0646 \u0641\u0627\u06cc\u0644 Office \u062f\u0631 \u0627\u06cc\u0646 \u0645\u062d\u06cc\u0637 \u062f\u0631 \u062f\u0633\u062a\u0631\u0633 \u0646\u06cc\u0633\u062a. \u0627\u0632 \u062f\u06a9\u0645\u0647 \u00ab\u0628\u0627\u0632 \u06a9\u0631\u062f\u0646\u00bb \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u06a9\u0646\u06cc\u062f."}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>

                              <div className="flex items-center justify-end gap-2 self-end sm:self-center shrink-0">
                                {(f.previewUrl || f.url) ? (
                                  <a
                                    href={f.previewUrl || resolveFileUrl(f.url)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={
                                      "h-9 px-3 rounded-xl border transition text-sm inline-flex items-center justify-center whitespace-nowrap " +
                                      (theme === "dark"
                                        ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
                                        : "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]")
                                    }
                                    title="باز کردن"
                                  >
                                    باز کردن
                                  </a>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() => removeDocFile(uploadFor, f.id)}
                                  className={iconBtnCls}
                                  title="حذف"
                                  aria-label="حذف"
                                >
                                  <img
                                    src="/images/icons/hazf.svg"
                                    alt=""
                                    className="w-5 h-5"
                                    style={{
                                      filter:
                                        "brightness(0) saturate(100%) invert(25%) sepia(95%) saturate(4870%) hue-rotate(355deg) brightness(95%) contrast(110%)",
                                    }}
                                  />
                                </button>
                              </div>
                            </div>
                          ))
                        )}

                        <div
                          className={uploadBoxCls + " mt-3"}
                          onDrop={onDropUpload}
                          onDragOver={onDragOverUpload}
                        >
                          <div className={theme === "dark" ? "text-white/80 text-sm font-semibold" : "text-neutral-800 text-sm font-semibold"}>
                            فایل را اینجا رها کنید
                          </div>
                          <div className={theme === "dark" ? "text-white/50 text-xs mt-1" : "text-neutral-500 text-xs mt-1"}>
                            هر نوع فایلی را می‌توانید انتخاب کنید
                          </div>

                          <div className="mt-3 flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => uploadInputRef.current?.click()}
                              className={
                                "h-10 px-4 rounded-xl border transition inline-flex items-center justify-center gap-2 " +
                                (theme === "dark"
                                  ? "border-white/15 bg-white text-black hover:bg-white/90"
                                  : "border-black/15 bg-black text-white hover:bg-black/90")
                              }
                            >
                              <img src="/images/icons/Uplod.svg" alt="" className={"w-5 h-5 " + (theme === "dark" ? "" : "invert")} />
                              انتخاب فایل
                            </button>
                            <input
                              ref={uploadInputRef}
                              type="file"
                              multiple
                              accept={LETTER_UPLOAD_ACCEPT}
                              className="hidden"
                              onChange={async (e) => {
                                const fl = e.target.files;
                                if (fl && fl.length) await addFilesToUpload(uploadFor, fl);
                                e.target.value = "";
                              }}
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-end">
                          <div className="pt-2 flex items-center justify-end">
  <button
    type="button"
    onClick={closeUpload}
    className={
      "h-10 w-10 rounded-xl border transition inline-flex items-center justify-center " +
      (theme === "dark"
        ? "border-white/15 bg-white text-black hover:bg-white/90"
        : "border-black/10 bg-black text-white hover:bg-black/90")
    }
    aria-label="تایید"
    title="تایید"
  >
    <img
      src="/images/icons/check.svg"
      alt=""
      className={"w-4 h-4 " + (theme === "dark" ? "" : "invert")}
    />
  </button>
</div>

                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* bottom divider */}
                <div className={theme === "dark" ? "h-px bg-white/10" : "h-px bg-black/10"} />
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Add tag modal */}
      {addTagOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999]">
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setAddTagOpen(false)} />
            <div className="absolute inset-0 p-4 flex items-center justify-center">
              <div
                className={
                  "w-[min(520px,calc(100vw-24px))] rounded-2xl border shadow-2xl overflow-hidden " +
                  (theme === "dark" ? "border-white/10 bg-neutral-900 text-white" : "border-black/10 bg-white text-neutral-900")
                }
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="font-bold text-sm">افزودن برچسب</div>
                  <button
                    type="button"
                    onClick={() => setAddTagOpen(false)}
                    className={
                      "h-10 w-10 rounded-xl flex items-center justify-center transition ring-1 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 " +
                      (theme === "dark" ? "ring-neutral-800 hover:bg-white/10 text-white" : "ring-black/15 hover:bg-black/90 bg-black text-white")
                    }
                    aria-label="بستن"
                    title="بستن"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className={theme === "dark" ? "h-px bg-white/10" : "h-px bg-black/10"} />
                <div className="p-4 space-y-3">
                  <div>
                    <div className={labelCls}>عنوان برچسب</div>
                    <input value={newTagLabel} onChange={(e) => setNewTagLabel(e.target.value)} className={inputCls} type="text" placeholder="مثلا: فوری" />
                  </div>
                  {Array.isArray(tagCategories) && tagCategories.length > 0 ? (
                    <div>
                      <div className={labelCls}>دسته‌بندی</div>
                      <select
                        value={newTagCategoryId}
                        onChange={(e) => setNewTagCategoryId(e.target.value)}
                        className={inputCls}
                      >
                        <option value=""></option>
                        {tagCategories.map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {String(c.label || c.name || c.title || c.id)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setAddTagOpen(false)}
                      className={
                        "h-10 px-4 rounded-xl border transition " +
                        (theme === "dark" ? "border-white/15 hover:bg-white/10" : "border-black/10 hover:bg-black/[0.04]")
                      }
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      onClick={createTag}
                      className={
                        "h-10 px-4 rounded-xl transition " +
                        (theme === "dark" ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90")
                      }
                    >
                      ثبت
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
