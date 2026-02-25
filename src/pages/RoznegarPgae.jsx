import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card } from "../components/ui/Card";
import { Portal } from "../components/Portal";
import { dayjs, todayJalaliYmd } from "../utils/date";
import { useAuth } from "../components/AuthProvider";

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

const WEEKDAY_HEADERS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const WEEKDAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
const WEEKDAY_BY_JS_DAY = {
  0: "یکشنبه",
  1: "دوشنبه",
  2: "سه‌شنبه",
  3: "چهارشنبه",
  4: "پنجشنبه",
  5: "جمعه",
  6: "شنبه",
};

const MOCK_ACTIVE_PROJECTS = [
  { id: "p-101", code: "101", name: "احداث ایستگاه مرکزی", isActive: true },
  { id: "p-117", code: "117", name: "بهسازی شبکه تاسیسات", isActive: true },
  { id: "p-132", code: "132", name: "توسعه پایانه غرب", isActive: true },
  { id: "p-145", code: "145", name: "به‌روزرسانی زیرساخت اداری", isActive: true },
];

const TAG_TABS = [
  { id: "projects", label: "پروژه‌ها" },
  { id: "letters", label: "نامه‌ها و مستندات" },
  { id: "execution", label: "اجرای پروژه‌ها" },
];

const TAG_CATEGORIES = {
  projects: ["همه", "اداری", "بازاریابی", "بانک", "بیمه", "پروژه", "کارفرما", "مالیات", "محرمانه"],
  letters: ["همه", "اداری", "بازاریابی", "بانک", "بیمه", "پروژه", "کارفرما", "مالیات", "محرمانه"],
  execution: ["همه", "اجرا", "کارگاه", "تدارکات", "کنترل کیفیت", "ایمنی"],
};

const MOCK_TAGS = [
  { id: "tg-1", label: "اختتام همکاری", kind: "letters", category: "اداری" },
  { id: "tg-2", label: "ارزش افزوده", kind: "letters", category: "مالیات" },
  { id: "tg-3", label: "ارسال مستندات فنی", kind: "letters", category: "پروژه" },
  { id: "tg-4", label: "اعتراض به بدهی", kind: "letters", category: "مالیات" },
  { id: "tg-5", label: "اعتراض به رسیدگی", kind: "letters", category: "مالیات" },
  { id: "tg-6", label: "اعلام آمادگی", kind: "letters", category: "پروژه" },
  { id: "tg-7", label: "اعلام شماره حساب", kind: "letters", category: "بانک" },
  { id: "tg-8", label: "افزایش", kind: "letters", category: "پروژه" },
  { id: "tg-9", label: "انجام تعهدات", kind: "letters", category: "پروژه" },
  { id: "tg-10", label: "بازاریابی", kind: "letters", category: "بازاریابی" },
  { id: "tg-11", label: "بانک پاسارگاد", kind: "letters", category: "بانک" },
  { id: "tg-12", label: "بانک تجارت", kind: "letters", category: "بانک" },
  { id: "tg-13", label: "بانک شهر", kind: "letters", category: "بانک" },
  { id: "tg-14", label: "بلیت", kind: "letters", category: "اداری" },
  { id: "tg-15", label: "پتروپیمایش ایلام", kind: "letters", category: "پروژه" },
  { id: "tg-16", label: "پرداخت", kind: "letters", category: "مالیات" },
  { id: "tg-17", label: "پیش پرداخت", kind: "letters", category: "مالیات" },
  { id: "tg-18", label: "تامین اجتماعی", kind: "letters", category: "اداری" },
  { id: "tg-19", label: "تایید مستندات فنی", kind: "letters", category: "پروژه" },
  { id: "tg-20", label: "تجهیزات", kind: "letters", category: "پروژه" },
  { id: "tg-21", label: "تسهیلات و وام", kind: "letters", category: "بانک" },
  { id: "tg-22", label: "تکلیف", kind: "letters", category: "اداری" },
  { id: "tg-23", label: "تکمیلی", kind: "letters", category: "پروژه" },
  { id: "tg-24", label: "جلسه", kind: "letters", category: "پروژه" },
  { id: "tg-25", label: "دیوان عدالت اداری", kind: "letters", category: "اداری" },
  { id: "tg-26", label: "رل", kind: "projects", category: "پروژه" },
  { id: "tg-27", label: "صورت جلسه", kind: "letters", category: "پروژه" },
  { id: "tg-28", label: "صورت حساب", kind: "projects", category: "مالیات" },
  { id: "tg-29", label: "صورت وضعیت", kind: "projects", category: "پروژه" },
  { id: "tg-30", label: "ضمانت نامه", kind: "letters", category: "بانک" },
];

const MOCK_RELATED_DOCS = [
  { id: "l-3001", no: "3001", title: "نامه تایید نقشه اجرایی", date: "1404/10/11", type: "نامه" },
  { id: "l-3002", no: "3002", title: "صورتجلسه تحویل تجهیز", date: "1404/10/13", type: "مستند" },
  { id: "l-3003", no: "3003", title: "ابلاغ اصلاح زمان‌بندی", date: "1404/10/18", type: "نامه" },
  { id: "l-3004", no: "3004", title: "گزارش پیشرفت هفتگی", date: "1404/10/21", type: "مستند" },
  { id: "l-3005", no: "3005", title: "نامه درخواست تامین", date: "1404/10/25", type: "نامه" },
];

const ROZNEGAR_PROJECT_STORAGE_KEY = "roznegar_selected_project_id";

function toFaDigits(value) {
  return String(value ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function toEnDigits(s) {
  return String(s ?? "")
    .replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)])
    .replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)]);
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

function formatSize(size) {
  const kb = Number(size || 0) / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function dayNameFromJalali(dateYmd) {
  try {
    const jsDay = dayjs(dateYmd, { jalali: true }).calendar("jalali").day();
    return WEEKDAY_BY_JS_DAY[jsDay] || "شنبه";
  } catch {
    return "شنبه";
  }
}

function makeEntry(dateYmd) {
  return {
    dateYmd,
    dayName: dayNameFromJalali(dateYmd),
    activity: "",
    tagIds: [],
    relatedDocIds: [],
    files: [],
    confirmed: false,
  };
}

function hasEntryDetails(entry) {
  if (!entry) return false;
  return Boolean(
    String(entry.activity || "").trim() ||
      (Array.isArray(entry.tagIds) && entry.tagIds.length) ||
      (Array.isArray(entry.relatedDocIds) && entry.relatedDocIds.length) ||
      (Array.isArray(entry.files) && entry.files.length)
  );
}

function normalizeRoznegarEntryFromApi(item) {
  const dateYmd = String(item?.date_ymd ?? item?.dateYmd ?? "").trim().replace(/\//g, "-");
  if (!dateYmd) return null;
  const tagIds = (Array.isArray(item?.tag_ids) ? item.tag_ids : Array.isArray(item?.tagIds) ? item.tagIds : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  const relatedDocIds = (Array.isArray(item?.related_doc_ids) ? item.related_doc_ids : Array.isArray(item?.relatedDocIds) ? item.relatedDocIds : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  const files = (Array.isArray(item?.files) ? item.files : [])
    .map((f) => ({
      name: String(f?.name || "").trim(),
      size: Number(f?.size || 0) || 0,
      type: String(f?.type || "").trim(),
      url: String(f?.url || "").trim() || null,
      lastModified: Number(f?.lastModified || 0) || 0,
    }))
    .filter((f) => f.name);
  return {
    dateYmd,
    dayName: String(item?.day_name ?? item?.dayName ?? dayNameFromJalali(dateYmd)).trim(),
    activity: String(item?.activity || "").trim(),
    tagIds,
    relatedDocIds,
    files,
    confirmed: !!item?.confirmed,
    confirmedAt: item?.confirmed_at ?? item?.confirmedAt ?? null,
  };
}

function JalaliPopupDatePicker({ value, onChange, theme = "light", buttonClassName, hideIcon, disableFuture = false }) {
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
    const right = Math.max(margin, window.innerWidth - r.right);
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
              "fixed z-[9999] w-[min(420px,calc(100vw-16px))] rounded-2xl border shadow-lg p-3 md:p-4 " +
              (theme === "dark" ? "border-white/10 bg-neutral-900 text-white" : "border-black/10 bg-white text-neutral-900")
            }
            style={{ top: pos.top, right: pos.right }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-[13px] md:text-sm">انتخاب تاریخ</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={
                  "h-8 w-8 md:h-9 md:w-9 rounded-xl border flex items-center justify-center transition " +
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
                  onChange={(e) => setJd(Number(e.target.value))}
                  className={
                    "w-full h-10 md:h-11 px-2.5 md:px-3 text-sm md:text-[14px] rounded-xl border outline-none " +
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
                    "w-full h-10 md:h-11 px-2.5 md:px-3 text-sm md:text-[14px] rounded-xl border outline-none " +
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
                    "w-full h-10 md:h-11 px-2.5 md:px-3 text-sm md:text-[14px] rounded-xl border outline-none " +
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
              <div className={theme === "dark" ? "text-white/70 text-[11px] md:text-xs" : "text-neutral-600 text-[11px] md:text-xs"}>
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
                    "h-9 md:h-10 px-3 md:px-4 text-sm rounded-xl transition " +
                    (theme === "dark" ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90")
                  }
                >
                  تایید
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={
                    "h-9 md:h-10 px-3 md:px-4 text-sm rounded-xl border transition " +
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

export default function RoznegarPgae() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [activeProjects, setActiveProjects] = useState(() =>
    (Array.isArray(MOCK_ACTIVE_PROJECTS) ? MOCK_ACTIVE_PROJECTS.filter((x) => x?.isActive !== false) : []).map((p) => ({
      ...p,
      id: String(p.id),
      code: toEnDigits(String(p.code || "")).trim(),
      name: String(p.name || "").trim(),
      isActive: p?.isActive !== false,
    }))
  );
  const [projectsLoading, setProjectsLoading] = useState(false);
  const sortedActiveProjects = useMemo(() => {
    return (activeProjects || [])
      .slice()
      .sort((a, b) =>
        String(b?.code || "").localeCompare(String(a?.code || ""), "fa", {
          numeric: true,
          sensitivity: "base",
        })
      );
  }, [activeProjects]);

  const [mounted, setMounted] = useState(false);
  const [projectId, setProjectId] = useState(() => {
    try {
      return String(localStorage.getItem(ROZNEGAR_PROJECT_STORAGE_KEY) || "").trim();
    } catch {
      return "";
    }
  });
  const [selectedDate, setSelectedDate] = useState(() => todayJalaliYmd());
  const [cursor, setCursor] = useState(() =>
    dayjs(todayJalaliYmd(), { jalali: true }).calendar("jalali").startOf("month")
  );
  const [entriesByDate, setEntriesByDate] = useState({});

  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [tagDraftIds, setTagDraftIds] = useState([]);
  const [tagPickKind, setTagPickKind] = useState("letters");
  const [tagPickCategory, setTagPickCategory] = useState("همه");

  const [relatedPickOpen, setRelatedPickOpen] = useState(false);
  const [relatedPickQuery, setRelatedPickQuery] = useState("");
  const [relatedPickIds, setRelatedPickIds] = useState([]);
  const [relatedDocsPool, setRelatedDocsPool] = useState([]);
  const [relatedDocsLoading, setRelatedDocsLoading] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [tableFilter, setTableFilter] = useState("");
  const [confirmSaving, setConfirmSaving] = useState(false);
  const [filePreview, setFilePreview] = useState({ open: false, file: null, url: "", isObjectUrl: false });
  const uploadInputRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const api = async (path, opt = {}) => {
      const uid = authUser?.id != null ? String(authUser.id) : "";
      const res = await fetch("/api" + path, {
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
    };

    const normalizeProject = (p) => ({
      id: p?.id == null ? null : String(p.id),
      code: toEnDigits(String(p?.code ?? "")).trim(),
      name: String(p?.name ?? p?.title ?? "").trim(),
      isActive: p?.isActive !== false && p?.is_active !== false,
    });

    const isTopProjectCode = (code) => /^\d{3}$/.test(toEnDigits(String(code || "")).trim());

    (async () => {
      setProjectsLoading(true);
      try {
        const r = await api("/projects?isActive=true");
        if (!alive) return;
        const raw = Array.isArray(r)
          ? r
          : Array.isArray(r?.items)
          ? r.items
          : Array.isArray(r?.projects)
          ? r.projects
          : [];
        const clean = (raw || [])
          .filter((p) => p && typeof p === "object" && !Array.isArray(p))
          .map(normalizeProject)
          .filter((p) => p && p.id != null)
          .filter((p) => p.isActive === true)
          .filter((p) => isTopProjectCode(p.code));

        const byId = new Map();
        clean.forEach((p) => {
          const k = String(p.id);
          if (!byId.has(k)) byId.set(k, p);
        });
        setActiveProjects(Array.from(byId.values()));
      } catch {
        if (!alive) return;
      } finally {
        if (alive) setProjectsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [authUser?.id]);

  useEffect(() => {
    let alive = true;
    const api = async (path, opt = {}) => {
      const uid = authUser?.id != null ? String(authUser.id) : "";
      const res = await fetch("/api" + path, {
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
    };

    (async () => {
      setRelatedDocsLoading(true);
      try {
        const r = await api("/letters/mine");
        if (!alive) return;
        const items = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
        setRelatedDocsPool(Array.isArray(items) ? items : []);
      } catch {
        if (!alive) return;
        setRelatedDocsPool([]);
      } finally {
        if (alive) setRelatedDocsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [authUser?.id]);

  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 30);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    try {
      if (projectId) localStorage.setItem(ROZNEGAR_PROJECT_STORAGE_KEY, String(projectId));
      else localStorage.removeItem(ROZNEGAR_PROJECT_STORAGE_KEY);
    } catch {}
  }, [projectId]);

  useEffect(() => {
    const list = Array.isArray(sortedActiveProjects) ? sortedActiveProjects : [];
    if (!list.length) {
      if (projectId) setProjectId("");
      return;
    }

    const current = String(projectId || "");
    if (current && list.some((p) => String(p.id) === current)) return;

    let next = "";
    try {
      const saved = String(localStorage.getItem(ROZNEGAR_PROJECT_STORAGE_KEY) || "").trim();
      if (saved && list.some((p) => String(p.id) === saved)) next = saved;
    } catch {}

    if (!next) next = String(list[0]?.id || "");
    if (next && next !== current) setProjectId(next);
  }, [sortedActiveProjects, projectId]);

  useEffect(() => {
    setEntriesByDate((prev) => (prev[selectedDate] ? prev : { ...prev, [selectedDate]: makeEntry(selectedDate) }));
  }, [selectedDate]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (authLoading) return;
      if (!projectId) {
        if (alive) setEntriesByDate({});
        return;
      }
      try {
        const uid = authUser?.id != null ? String(authUser.id) : "";
        if (!uid) return;
        const url = `/api/roznegar?projectId=${encodeURIComponent(String(projectId))}`;
        const res = await fetch(url, {
          credentials: "include",
          headers: {
            ...(uid ? { "x-user-id": uid } : {}),
          },
        });
        if (!res.ok) {
          let reason = "roznegar_load_failed";
          try {
            const err = await res.json();
            reason = String(err?.error || err?.message || reason);
          } catch {}
          throw new Error(reason);
        }
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        const next = {};
        items.forEach((raw) => {
          const entry = normalizeRoznegarEntryFromApi(raw);
          if (entry?.dateYmd) next[entry.dateYmd] = entry;
        });
        if (alive) setEntriesByDate(next);
      } catch (e) {
        console.error("roznegar_load_error", e);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [projectId, authUser?.id, authLoading]);

  const updateActiveEntry = (updater) => {
    setEntriesByDate((prev) => {
      const current = prev[selectedDate] || makeEntry(selectedDate);
      const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
      return { ...prev, [selectedDate]: next };
    });
  };

  const jumpToDate = (dateYmd) => {
    const next = String(dateYmd || "").trim();
    if (!next) return;
    setSelectedDate(next);
    setCursor(dayjs(next, { jalali: true }).calendar("jalali").startOf("month"));
  };

  const activeEntry = entriesByDate[selectedDate] || makeEntry(selectedDate);
  const activeProject = activeProjects.find((p) => String(p.id) === String(projectId));
  const editorDisabled = !activeProject;

  const daysInMonth = cursor.daysInMonth();
  const startPad = (cursor.startOf("month").day() + 1) % 7;
  const monthCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < startPad; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
    return cells;
  }, [startPad, daysInMonth]);

  const monthName = PERSIAN_MONTHS[Math.max(0, Number(cursor.format("M")) - 1)] || "";
  const gregorianMonthLabel = useMemo(() => {
    try {
      const start = cursor.startOf("month").toDate();
      const end = cursor.endOf("month").toDate();
      const fmtFull = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });
      const fmtMonth = new Intl.DateTimeFormat("en-US", { month: "short" });
      const sameMonthYear = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
      if (sameMonthYear) return fmtFull.format(start);
      const startLabel = `${fmtMonth.format(start)} ${start.getFullYear()}`;
      const endLabel = `${fmtMonth.format(end)} ${end.getFullYear()}`;
      return `${startLabel} - ${endLabel}`;
    } catch {
      return "";
    }
  }, [cursor]);
  const monthYearLabel = `${monthName} ${toFaDigits(cursor.format("YYYY"))}${gregorianMonthLabel ? ` (${gregorianMonthLabel})` : ""}`;

  const selectedDateLabel = useMemo(() => {
    try {
      return dayjs(selectedDate, { jalali: true }).calendar("jalali").format("YYYY/MM/DD");
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const selectedTags = useMemo(() => {
    const set = new Set((activeEntry?.tagIds || []).map(String));
    return MOCK_TAGS.filter((t) => set.has(String(t.id)));
  }, [activeEntry?.tagIds]);

  const relatedSelectedIds = useMemo(
    () => (Array.isArray(activeEntry?.relatedDocIds) ? activeEntry.relatedDocIds.map(String) : []),
    [activeEntry?.relatedDocIds]
  );

  const docIdOf = (l) =>
    String(
      l?.id ??
        l?.letter_id ??
        l?.letterId ??
        l?.doc_id ??
        ""
    ).trim();

  const docNoOf = (l) =>
    String(
      l?.letter_no ??
        l?.letterNo ??
        l?.secretariat_no ??
        l?.secretariatNo ??
        l?.no ??
        ""
    ).trim();

  const docDateOf = (l) =>
    String(
      l?.letter_date ??
        l?.letterDate ??
        l?.secretariat_date ??
        l?.secretariatDate ??
        l?.date ??
        ""
    ).trim();

  const docTitleOf = (l) =>
    String(
      l?.subject ??
        l?.title ??
        l?.name ??
        ""
    ).trim();

  const filteredTags = useMemo(() => {
    const q = String(tagSearch || "").trim().toLowerCase();
    return MOCK_TAGS.filter((t) => {
      if (String(t.kind || "") !== String(tagPickKind || "")) return false;
      if (tagPickCategory && tagPickCategory !== "همه" && String(t.category || "") !== String(tagPickCategory)) return false;
      if (q && !String(t.label || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tagSearch, tagPickKind, tagPickCategory]);

  const relatedPickList = useMemo(() => {
    const base = Array.isArray(relatedDocsPool) && relatedDocsPool.length ? relatedDocsPool : MOCK_RELATED_DOCS;
    const q = String(relatedPickQuery || "").trim().toLowerCase();
    if (!q) return (Array.isArray(base) ? base : []).slice(0, 200);
    return (Array.isArray(base) ? base : []).filter((d) => {
      const text = `${docNoOf(d)} ${docTitleOf(d)} ${d?.type || d?.kind || ""} ${docDateOf(d)} ${docIdOf(d)}`.toLowerCase();
      return text.includes(q);
    });
  }, [relatedPickQuery, relatedDocsPool]);

  const letterById = useMemo(
    () =>
      new Map(
        (Array.isArray(relatedDocsPool) && relatedDocsPool.length ? relatedDocsPool : MOCK_RELATED_DOCS).map((x) => [
          String(docIdOf(x) || x?.id || ""),
          x,
        ])
      ),
    [relatedDocsPool]
  );

  const selectedRelatedDocs = useMemo(() => {
    return relatedSelectedIds.map((id) => letterById.get(String(id))).filter(Boolean);
  }, [relatedSelectedIds, letterById]);

  const tagById = useMemo(() => {
    return new Map((Array.isArray(MOCK_TAGS) ? MOCK_TAGS : []).map((t) => [String(t.id), t]));
  }, []);

  const filteredTableRows = useMemo(() => {
    const toDateLabel = (dateYmd) => {
      try {
        return dayjs(String(dateYmd || ""), { jalali: true }).calendar("jalali").format("YYYY/MM/DD");
      } catch {
        return String(dateYmd || "").replace(/-/g, "/");
      }
    };

    const raw = Object.entries(entriesByDate || {})
      .map(([dateYmd, entry]) => {
        const row = entry || makeEntry(dateYmd);
        if (!row?.confirmed) return null;
        const tags = (Array.isArray(row.tagIds) ? row.tagIds : [])
          .map((id) => tagById.get(String(id))?.label || "")
          .filter(Boolean);
        const docs = (Array.isArray(row.relatedDocIds) ? row.relatedDocIds : [])
          .map((id) => letterById.get(String(id)))
          .filter(Boolean)
          .map((d) => {
            const no = docNoOf(d);
            const title = docTitleOf(d);
            return `${no ? toFaDigits(no) : ""}${no && title ? " - " : ""}${title || ""}`.trim();
          })
          .filter(Boolean);
        const files = Array.isArray(row.files) ? row.files : [];
        const fileNames = files.map((f) => String(f?.name || "")).filter(Boolean);
        const dateLabel = toDateLabel(dateYmd);
        const statusText = "تایید شده";
        const searchText = [
          activeProject ? `${activeProject.code || ""} ${activeProject.name || ""}` : "",
          dateLabel,
          row.dayName || "",
          row.activity || "",
          tags.join(" "),
          docs.join(" "),
          fileNames.join(" "),
          String(files.length || 0),
          statusText,
        ]
          .join(" ")
          .toLowerCase();

        return {
          dateYmd,
          dateLabel,
          dayName: row.dayName || "",
          activity: String(row.activity || "").trim(),
          tagsText: tags.join("، "),
          docsText: docs.join(" | "),
          files,
          filesText: fileNames.join("، "),
          filesCount: files.length || 0,
          statusText,
          searchText,
        };
      })
      .filter(Boolean)
      .sort((a, b) =>
        String(b.dateYmd || "").localeCompare(String(a.dateYmd || ""), "en", {
          numeric: true,
          sensitivity: "base",
        })
      );

    const q = toEnDigits(String(tableFilter || "").trim()).toLowerCase();
    if (!q) return raw;
    return raw.filter((r) => toEnDigits(String(r.searchText || "")).toLowerCase().includes(q));
  }, [entriesByDate, tableFilter, tagById, letterById, activeProject]);

  const openTagModal = () => {
    setTagDraftIds((activeEntry?.tagIds || []).map(String));
    setTagSearch("");
    setTagPickKind("letters");
    setTagPickCategory("همه");
    setTagModalOpen(true);
  };

  const openRelatedPicker = () => {
    setRelatedPickIds(relatedSelectedIds);
    setRelatedPickQuery("");
    setRelatedPickOpen(true);
  };

  const closeRelatedPicker = () => {
    setRelatedPickOpen(false);
    setRelatedPickQuery("");
  };

  const openUpload = () => setUploadOpen(true);
  const closeUpload = () => setUploadOpen(false);
  const openFilePreview = (file) => {
    if (!file) return;
    setFilePreview((prev) => {
      if (prev?.url && prev?.isObjectUrl) {
        try {
          URL.revokeObjectURL(prev.url);
        } catch {}
      }
      const directUrl = String(file?.url || "").trim();
      if (directUrl) {
        return { open: true, file, url: directUrl, isObjectUrl: false };
      }
      let nextUrl = "";
      let isObjectUrl = false;
      try {
        nextUrl = URL.createObjectURL(file);
        isObjectUrl = true;
      } catch {}
      return { open: true, file, url: nextUrl, isObjectUrl };
    });
  };
  const closeFilePreview = () => {
    setFilePreview((prev) => {
      if (prev?.url && prev?.isObjectUrl) {
        try {
          URL.revokeObjectURL(prev.url);
        } catch {}
      }
      return { open: false, file: null, url: "", isObjectUrl: false };
    });
  };

  const handlePickFiles = async (e) => {
    const incoming = Array.from(e.target.files || []);
    if (!incoming.length) return;

    updateActiveEntry((curr) => {
      const base = Array.isArray(curr.files) ? curr.files : [];
      const seen = new Set(base.map((f) => `${f.name}_${f.size}_${f.lastModified}`));
      const merged = [...base];
      incoming.forEach((f) => {
        const key = `${f.name}_${f.size}_${f.lastModified}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(f);
        }
      });
      return { ...curr, files: merged };
    });

    e.target.value = "";
  };

  const theme =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";

  useEffect(() => {
    return () => {
      if (filePreview?.url && filePreview?.isObjectUrl) {
        try {
          URL.revokeObjectURL(filePreview.url);
        } catch {}
      }
    };
  }, [filePreview?.url, filePreview?.isObjectUrl]);

  const inputBase = "w-full h-11 px-4 rounded-xl border outline-none transition text-right text-[14px]";
  const inputCls =
    theme === "dark"
      ? inputBase + " border-white/15 bg-white/5 text-white placeholder:text-white/40 focus:bg-white/10"
      : inputBase + " border-black/10 bg-white text-neutral-900 placeholder:text-neutral-400 focus:bg-black/[0.02]";

  const labelCls = theme === "dark" ? "text-white/70 text-xs mb-1" : "text-neutral-600 text-xs mb-1";
  const inputSmCls = inputCls.replace("h-11", "h-10").replace("px-4", "px-3") + " text-[14px] rounded-xl";
  const chipBase = "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs shadow-sm transition";
  const chipCls =
    chipBase +
    " border-black/10 bg-white !text-neutral-900 hover:bg-black/5 " +
    "dark:border-neutral-800 dark:bg-neutral-900 dark:!text-neutral-100 dark:hover:bg-white/10";
  const selectedTagChipCls =
    chipBase +
    " border-black bg-black !text-white hover:bg-black/90 " +
    "dark:border-neutral-200 dark:bg-neutral-100 dark:!text-neutral-900";

  const uploadTriggerCls =
    "h-11 px-3 rounded-xl border transition flex items-center justify-center gap-2 whitespace-nowrap outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 " +
    (theme === "dark"
      ? "border-white/15 bg-white/5 text-white/90 hover:bg-white/10"
      : "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]");

  const uploadBoxCls =
    "rounded-2xl border border-dashed p-4 text-center transition " +
    (theme === "dark"
      ? "border-white/15 bg-white/5 hover:bg-white/10"
      : "border-black/15 bg-black/[0.02] hover:bg-black/[0.04]");

  const onDropUpload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const fl = e.dataTransfer?.files;
    if (fl && fl.length) {
      await handlePickFiles({ target: { files: fl, value: "" } });
    }
  };

  const onDragOverUpload = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handlePreviewConfirm = async () => {
    if (editorDisabled || !projectId || confirmSaving) return;
    setConfirmSaving(true);
    try {
      const curr = entriesByDate[selectedDate] || makeEntry(selectedDate);
      const filesPayload = (Array.isArray(curr.files) ? curr.files : [])
        .map((f) => ({
          name: String(f?.name || "").trim(),
          size: Number(f?.size || 0) || 0,
          type: String(f?.type || "").trim(),
          url: String(f?.url || "").trim() || null,
          lastModified: Number(f?.lastModified || 0) || 0,
        }))
        .filter((f) => f.name);

      const uid = authUser?.id != null ? String(authUser.id) : "";
      const payload = {
        projectId: Number(projectId),
        dateYmd: String(selectedDate || "").trim(),
        dayName: String(curr.dayName || "").trim(),
        activity: String(curr.activity || "").trim(),
        tagIds: (Array.isArray(curr.tagIds) ? curr.tagIds : []).map(String),
        relatedDocIds: (Array.isArray(curr.relatedDocIds) ? curr.relatedDocIds : []).map(String),
        files: filesPayload,
        confirmed: true,
      };

      const res = await fetch("/api/roznegar", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(uid ? { "x-user-id": uid } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let reason = "roznegar_save_failed";
        try {
          const err = await res.json();
          reason = String(err?.error || err?.message || reason);
        } catch {}
        throw new Error(reason);
      }
      const data = await res.json();
      const saved = normalizeRoznegarEntryFromApi(data?.item || null);
      if (!saved?.dateYmd) throw new Error("roznegar_save_invalid");

      setEntriesByDate((prev) => ({
        ...prev,
        [saved.dateYmd]: saved,
      }));
    } catch (e) {
      console.error("roznegar_confirm_error", e);
    } finally {
      setConfirmSaving(false);
    }
  };

  const handleExportExcel = async () => {
    if (!filteredTableRows.length) return;
    const XLSX = await import("xlsx");
    const rows = [
      ["روزنگار پروژه - خروجی جدول"],
      activeProject ? [`پروژه: ${activeProject.code || ""} - ${activeProject.name || ""}`] : [""],
      [""],
      ["ردیف", "پروژه", "تاریخ", "روز", "شرح فعالیت‌ها", "برچسب‌ها", "مستندات مرتبط", "فایل‌ها", "تعداد فایل"],
      ...filteredTableRows.map((r, idx) => [
        toFaDigits(idx + 1),
        activeProject ? `${activeProject.code || ""} - ${activeProject.name || ""}` : "-",
        toFaDigits(r.dateLabel || ""),
        r.dayName || "",
        r.activity || "-",
        r.tagsText || "-",
        r.docsText || "-",
        r.filesText || "-",
        toFaDigits(r.filesCount || 0),
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 8 }, { wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 36 }, { wch: 28 }, { wch: 46 }, { wch: 28 }, { wch: 12 }];
    ws["!rtl"] = true;
    const wb = XLSX.utils.book_new();
    wb.Workbook = wb.Workbook || {};
    wb.Workbook.Views = [{ RTL: true }];
    XLSX.utils.book_append_sheet(wb, ws, "Roznegar");
    const fileName = `roznegar-table-${String(todayJalaliYmd()).replace(/[\/]/g, "-")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const cardReveal = mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3";
  const previewFile = filePreview?.file;
  const previewName = String(previewFile?.name || "");
  const previewUrl = String(filePreview?.url || "");
  const previewType = String(previewFile?.type || "").toLowerCase();
  const previewIsImage = previewType.startsWith("image/");
  const previewIsPdf = previewType.includes("pdf") || /\.pdf$/i.test(previewName) || /\.pdf($|\?)/i.test(previewUrl);

  return (
    <>
      <Card
        dir="rtl"
        className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
      >
        <div className={"transition-all duration-500 " + cardReveal}>
          <div className="mb-4 text-base md:text-lg">
            <span className="text-neutral-700 dark:text-neutral-300">پروژه‌ها</span>
            <span className="mx-2 text-neutral-500 dark:text-neutral-400">›</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">روزنگار پروژه</span>
          </div>

          <div className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-800/50">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="w-full lg:max-w-md">
                <div className="mb-1 text-xs text-neutral-600 dark:text-neutral-300">پروژه فعال</div>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-right text-neutral-900 outline-none transition focus:ring-2 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-neutral-600/50"
                >
                  <option value="">{projectsLoading ? "در حال دریافت پروژه‌های فعال..." : "انتخاب پروژه فعال..."}</option>
                  {(sortedActiveProjects || []).map((p) => (
                    <option key={String(p.id)} value={String(p.id)}>
                      {String(p.code || "").trim()}
                      {String(p.name || "").trim() ? ` - ${String(p.name || "").trim()}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <section className="xl:col-span-5 min-w-0">
              <div
                className={
                  "rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-all duration-500 delay-75 dark:border-neutral-800 dark:bg-neutral-900 " +
                  cardReveal
                }
              >
                <div className="mb-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCursor((c) => c.subtract(1, "month"))}
                    className="h-10 w-10 rounded-xl border border-neutral-300 text-base text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
                    aria-label="ماه قبل"
                  >
                    ‹
                  </button>

                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{monthYearLabel}</div>

                  <button
                    type="button"
                    onClick={() => setCursor((c) => c.add(1, "month"))}
                    className="h-10 w-10 rounded-xl border border-neutral-300 text-base text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
                    aria-label="ماه بعد"
                  >
                    ›
                  </button>
                </div>

                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-neutral-500 dark:text-neutral-400">
                  {WEEKDAY_HEADERS.map((h) => (
                    <div key={h} className="py-1">
                      {h}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {monthCells.map((dayNo, idx) => {
                    if (!dayNo) {
                      return <div key={`empty-${idx}`} className="h-12 rounded-lg bg-transparent" />;
                    }

                    const dateYmd = cursor.date(dayNo).calendar("jalali").format("YYYY-MM-DD");
                    const isSelected = dateYmd === selectedDate;
                    const isToday = dateYmd === todayJalaliYmd();
                    const hasDetails = hasEntryDetails(entriesByDate[dateYmd]);
                    const gDay = (() => {
                      try {
                        return dayjs(dateYmd, { jalali: true }).toDate().getDate();
                      } catch {
                        return "";
                      }
                    })();

                    return (
                      <button
                        key={dateYmd}
                        type="button"
                        onClick={() => jumpToDate(dateYmd)}
                        className={
                          "relative h-12 rounded-xl border text-sm transition-all duration-200 flex flex-col items-center justify-center leading-tight " +
                          (isSelected
                            ? "border-[#F48B35] bg-[#F48B35]/15 text-[#ce6b1a] dark:text-[#ffb77f]"
                            : isToday
                            ? "border-neutral-400 bg-neutral-100 text-neutral-900 dark:border-neutral-500 dark:bg-neutral-800 dark:text-neutral-100"
                            : "border-transparent bg-neutral-50 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100 dark:bg-neutral-800/70 dark:text-neutral-200 dark:hover:border-neutral-700 dark:hover:bg-neutral-800")
                        }
                      >
                        <span className="leading-none">{toFaDigits(dayNo)}</span>
                        <span
                          className={
                            "mt-0.5 text-[10px] leading-none " +
                            (isSelected
                              ? "text-[#ce6b1a]/80 dark:text-[#ffb77f]/80"
                              : theme === "dark"
                              ? "text-white/55"
                              : "text-neutral-500")
                          }
                        >
                          {toFaDigits(gDay)}
                        </span>
                        {hasDetails ? (
                          <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#F48B35]" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="xl:col-span-7 min-w-0">
              <div
                className={
                  "rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-all duration-500 delay-150 dark:border-neutral-800 dark:bg-neutral-900 " +
                  cardReveal +
                  (editorDisabled ? " opacity-75" : "")
                }
              >
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                    روز: {activeEntry.dayName}
                  </span>
                  <span className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                    تاریخ: {toFaDigits(selectedDateLabel)}
                  </span>
                  {activeProject ? (
                    <span className="rounded-lg bg-[#F48B35]/15 px-2.5 py-1 text-xs text-[#ce6b1a] dark:text-[#ffb77f]">
                      {activeProject.code} - {activeProject.name}
                    </span>
                  ) : (
                    <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      ابتدا پروژه فعال را انتخاب کنید.
                    </span>
                  )}
                  {activeEntry?.confirmed ? (
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      تایید شده (نمایشی)
                    </span>
                  ) : null}
                </div>

                <div className="space-y-4" aria-disabled={editorDisabled}>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                    <div className="md:col-span-4">
                      <div className={labelCls}>روز</div>
                      <select
                        disabled={editorDisabled}
                        value={activeEntry.dayName}
                        onChange={(e) => updateActiveEntry((curr) => ({ ...curr, dayName: e.target.value }))}
                        className={inputSmCls}
                      >
                        {WEEKDAY_NAMES.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-8">
                      <div className={labelCls}>تاریخ سند</div>
                      <div className={editorDisabled ? "pointer-events-none opacity-70" : ""}>
                        <JalaliPopupDatePicker
                          value={String(selectedDate || "").replace(/-/g, "/")}
                          onChange={(v) => {
                            if (!v) return;
                            jumpToDate(String(v).replace(/\//g, "-"));
                          }}
                          theme={theme}
                          buttonClassName={inputSmCls + " flex items-center justify-between"}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className={labelCls}>شرح فعالیت‌ها</div>
                    <textarea
                      disabled={editorDisabled}
                      value={activeEntry.activity}
                      onChange={(e) => updateActiveEntry((curr) => ({ ...curr, activity: e.target.value }))}
                      rows={4}
                      placeholder="شرح فعالیت‌های انجام‌شده در این روز را وارد کنید..."
                      className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2 text-sm text-right text-neutral-900 outline-none transition focus:ring-2 focus:ring-neutral-300 disabled:cursor-not-allowed disabled:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-neutral-600/50 dark:disabled:bg-neutral-800"
                    />
                  </div>

                  <div className="md:col-span-12 min-w-0">
                    <div className={labelCls}>برچسب‌ها</div>
                    <div className="w-full min-w-0 flex flex-wrap items-center gap-2">
                      {!selectedTags.length ? (
                        <span className={theme === "dark" ? "text-white/55 text-xs" : "text-neutral-500 text-xs"}>
                          برچسبی انتخاب نشده است.
                        </span>
                      ) : null}

                      {selectedTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          disabled={editorDisabled}
                          onClick={() =>
                            updateActiveEntry((curr) => ({
                              ...curr,
                              tagIds: (curr.tagIds || []).filter((id) => String(id) !== String(tag.id)),
                            }))
                          }
                          className={selectedTagChipCls + " shrink-0"}
                          title={tag.label}
                          aria-label={tag.label}
                        >
                          <span className="truncate max-w-[220px]">{tag.label}</span>
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={editorDisabled}
                        onClick={openTagModal}
                        className={
                          "h-10 px-3 shrink-0 rounded-xl border transition inline-flex items-center justify-center gap-2 " +
                          (theme === "dark"
                            ? "border-white/15 bg-white/5 hover:bg-white/10"
                            : "border-black/10 bg-white hover:bg-black/[0.02]")
                        }
                        aria-label="انتخاب برچسب"
                        title="انتخاب برچسب"
                      >
                        <img src="/images/icons/sayer.svg" alt="" className={"w-5 h-5 " + (theme === "dark" ? "invert" : "")} />
                        <span className="text-xs md:text-sm">انتخاب برچسب</span>
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-12 min-w-0">
                    <div className="flex flex-wrap items-start justify-start gap-2">
                      <div className="min-w-0">
                        <div className={labelCls}>مستندات مرتبط</div>
                        <button
                          type="button"
                          disabled={editorDisabled}
                          onClick={openRelatedPicker}
                          className={
                            "h-10 w-10 shrink-0 rounded-xl border transition inline-flex items-center justify-center " +
                            (theme === "dark"
                              ? "border-white/15 bg-white/5 hover:bg-white/10"
                              : "border-black/10 bg-white hover:bg-black/[0.02]")
                          }
                          aria-label="انتخاب مستندات مرتبط"
                          title="انتخاب مستندات مرتبط"
                        >
                          <img src="/images/icons/sayer.svg" alt="" className={"w-5 h-5 " + (theme === "dark" ? "invert" : "")} />
                        </button>

                        {relatedSelectedIds.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-1 text-xs md:text-sm">
                            {relatedSelectedIds.map((id, i) => {
                              const l = letterById.get(String(id));
                              const no = docNoOf(l) || String(id);
                              return (
                                <span key={String(id)} className="inline-flex max-w-full items-center gap-1">
                                  {i > 0 && <span className={theme === "dark" ? "text-white/60" : "text-neutral-600"}>و</span>}
                                  <span className="underline underline-offset-4 font-semibold">{toFaDigits(no)}</span>
                                  <button
                                    type="button"
                                    disabled={editorDisabled}
                                    onClick={() =>
                                      updateActiveEntry((curr) => ({
                                        ...curr,
                                        relatedDocIds: (curr.relatedDocIds || []).filter((x) => String(x) !== String(id)),
                                      }))
                                    }
                                    className={
                                      "h-6 w-6 inline-grid place-items-center bg-transparent border-0 shadow-none p-0 text-base md:text-lg leading-none transition " +
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

                      <div className="shrink-0">
                        <div className={labelCls}>&nbsp;</div>
                        <button
                          type="button"
                          disabled={editorDisabled}
                          onClick={openUpload}
                          className={uploadTriggerCls + " h-10 w-auto max-w-full whitespace-nowrap"}
                          title="بارگذاری فایل"
                        >
                          <img src="/images/icons/upload.svg" alt="" className={"w-5 h-5 " + (theme === "dark" ? "invert" : "")} />
                          <span className="text-xs md:text-sm">بارگذاری فایل</span>
                          {Array.isArray(activeEntry.files) && activeEntry.files.length > 0 ? (
                            <span className="mr-2 text-xs opacity-80">({toFaDigits(activeEntry.files.length)})</span>
                          ) : null}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={editorDisabled || confirmSaving}
                      onClick={handlePreviewConfirm}
                      className={
                        "h-9 w-12 md:h-10 md:w-14 grid place-items-center rounded-xl bg-neutral-900 text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 " +
                        (theme === "dark"
                          ? ""
                          : "")
                      }
                      title="تایید"
                      aria-label="تایید"
                    >
                      <img
                        src="/images/icons/check.svg"
                        alt=""
                        className="w-4 h-4 md:w-5 md:h-5 invert dark:invert"
                      />
                    </button>
                  </div>

                </div>
              </div>
            </section>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className={labelCls}>فیلتر</div>
              <input
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                className={inputCls + " h-10 text-xs md:text-sm"}
                placeholder="جستجو در تاریخ، روز، شرح، برچسب‌ها، مستندات و فایل‌ها..."
              />
            </div>

            <div className={"rounded-2xl border overflow-hidden " + (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-white")}>
              <div className="max-h-[360px] overflow-auto">
                <table className="w-full text-center">
                  <thead className={theme === "dark" ? "bg-white/10 text-white/80" : "bg-neutral-100 text-neutral-700"}>
                    <tr>
                      <th className="px-3 py-2 text-[11px] md:text-xs font-semibold whitespace-nowrap text-center">ردیف</th>
                      <th className="px-3 py-2 text-[11px] md:text-xs font-semibold min-w-[170px] text-center">پروژه</th>
                      <th className="px-3 py-2 text-[11px] md:text-xs font-semibold whitespace-nowrap text-center">تاریخ</th>
                      <th className="px-3 py-2 text-[11px] md:text-xs font-semibold whitespace-nowrap text-center">روز</th>
                      <th className="px-3 py-2 text-[11px] md:text-xs font-semibold min-w-[180px] text-center">شرح فعالیت‌ها</th>
                      <th className="px-3 py-2 text-[11px] md:text-xs font-semibold min-w-[150px] text-center">برچسب‌ها</th>
                      <th className="px-3 py-2 text-[11px] md:text-xs font-semibold min-w-[170px] text-center">مستندات مرتبط</th>
                      <th className="px-3 py-2 text-[11px] md:text-xs font-semibold min-w-[150px] text-center">فایل‌ها</th>
                      <th className="px-3 py-2 text-[11px] md:text-xs font-semibold whitespace-nowrap text-center">تعداد فایل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!filteredTableRows.length ? (
                      <tr>
                        <td
                          colSpan={9}
                          className={theme === "dark" ? "px-3 py-6 text-center text-[11px] md:text-xs text-white/60" : "px-3 py-6 text-center text-[11px] md:text-xs text-neutral-500"}
                        >
                          موردی برای نمایش وجود ندارد.
                        </td>
                      </tr>
                    ) : (
                      filteredTableRows.map((r, idx) => (
                        <tr key={`${r.dateYmd}_${idx}`} className={theme === "dark" ? "border-t border-white/10" : "border-t border-black/10"}>
                          <td className="px-3 py-2 text-[11px] md:text-xs align-middle text-center">{toFaDigits(idx + 1)}</td>
                          <td className="px-3 py-2 text-[11px] md:text-xs align-middle text-center break-words">
                            {activeProject ? `${activeProject.code || ""} - ${activeProject.name || ""}` : "-"}
                          </td>
                          <td className="px-3 py-2 text-[11px] md:text-xs align-middle text-center whitespace-nowrap">{toFaDigits(r.dateLabel || "")}</td>
                          <td className="px-3 py-2 text-[11px] md:text-xs align-middle text-center whitespace-nowrap">{r.dayName || "-"}</td>
                          <td className="px-3 py-2 text-[11px] md:text-xs align-middle text-center break-words">{r.activity || "-"}</td>
                          <td className="px-3 py-2 text-[11px] md:text-xs align-middle text-center break-words">{r.tagsText || "-"}</td>
                          <td className="px-3 py-2 text-[11px] md:text-xs align-middle text-center break-words">{r.docsText || "-"}</td>
                          <td className="px-3 py-2 text-[11px] md:text-xs align-middle text-center break-words">
                            {Array.isArray(r.files) && r.files.length ? (
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {r.files.map((f, fileIdx) => {
                                  const name = String(f?.name || `فایل ${fileIdx + 1}`);
                                  const key = `${name}_${f?.size || 0}_${f?.lastModified || 0}_${fileIdx}`;
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      onClick={() => openFilePreview(f)}
                                      className={
                                        "max-w-[180px] truncate rounded-lg px-1.5 py-0.5 underline underline-offset-4 transition " +
                                        (theme === "dark"
                                          ? "text-white/85 hover:text-white"
                                          : "text-neutral-700 hover:text-black")
                                      }
                                      title={name}
                                    >
                                      {name}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-3 py-2 text-[11px] md:text-xs align-middle text-center whitespace-nowrap">{toFaDigits(r.filesCount || 0)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className={theme === "dark" ? "text-[11px] md:text-xs text-white/60" : "text-[11px] md:text-xs text-neutral-500"}>
                تعداد نتایج: {toFaDigits(filteredTableRows.length)}
              </div>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={!filteredTableRows.length}
                className={
                  "h-9 w-9 md:h-10 md:w-10 rounded-xl border transition inline-flex items-center justify-center disabled:opacity-50 " +
                  (theme === "dark"
                    ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
                    : "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]")
                }
                title="خروجی اکسل جدول"
                aria-label="خروجی اکسل جدول"
              >
                <img src="/images/icons8-excel-50.png" alt="" className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {filePreview.open &&
        createPortal(
          <div className="fixed inset-0 z-[9999]" dir="rtl">
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={closeFilePreview} />
            <div className="absolute inset-0 p-2 sm:p-4 flex items-start sm:items-center justify-center overflow-y-auto">
              <div
                className={
                  "w-[min(980px,calc(100vw-16px))] max-h-[88vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col " +
                  (theme === "dark" ? "border-white/10 bg-neutral-900 text-white" : "border-black/10 bg-white text-neutral-900")
                }
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 md:px-4 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between gap-3">
                  <div className="text-xs md:text-sm font-semibold truncate max-w-[75%]" title={previewName || "پیش نمایش فایل"}>
                    {previewName || "پیش نمایش فایل"}
                  </div>
                  <button
                    type="button"
                    onClick={closeFilePreview}
                    className={
                      "h-9 w-9 md:h-10 md:w-10 rounded-xl border flex items-center justify-center transition " +
                      (theme === "dark" ? "border-white/15 bg-white/5 hover:bg-white/10" : "border-black/15 bg-white hover:bg-black/[0.04]")
                    }
                    title="بستن"
                    aria-label="بستن"
                  >
                    <img src="/images/icons/bastan.svg" alt="" className={"w-4 h-4 " + (theme === "dark" ? "invert" : "brightness-0")} />
                  </button>
                </div>

                <div className="p-3 md:p-4 min-h-0 overflow-auto">
                  {filePreview.url && previewIsImage ? (
                    <img
                      src={filePreview.url}
                      alt={previewName || "preview"}
                      className="max-h-[70vh] w-auto max-w-full object-contain mx-auto rounded-xl border border-black/10 dark:border-white/10"
                    />
                  ) : filePreview.url && previewIsPdf ? (
                    <iframe
                      src={filePreview.url}
                      title={previewName || "PDF preview"}
                      className="w-full h-[70vh] rounded-xl border border-black/10 dark:border-white/10 bg-white"
                    />
                  ) : (
                    <div className={theme === "dark" ? "text-white/70 text-sm text-center py-10" : "text-neutral-600 text-sm text-center py-10"}>
                      پیش‌نمایش این نوع فایل در دسترس نیست.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {tagModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[9999]" dir="rtl">
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setTagModalOpen(false)} />

            <div className="absolute inset-0 p-2 sm:p-3 md:p-6 flex items-start sm:items-center justify-center overflow-y-auto">
              <div
                className={
                  "w-[min(980px,calc(100vw-16px))] h-[min(86vh,760px)] rounded-2xl border shadow-2xl overflow-hidden " +
                  (theme === "dark" ? "border-white/10 bg-neutral-900 text-white" : "border-black/10 bg-white text-neutral-900")
                }
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-full flex flex-col">
                  <div className="px-3 md:px-4 py-2.5 md:py-3 flex items-center justify-between gap-3 border-b border-black/10 dark:border-white/10">
                    <div className="font-bold text-[12px] md:text-[13px]">انتخاب برچسب</div>
                    <button
                      type="button"
                      onClick={() => setTagModalOpen(false)}
                      className={
                        "h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center transition ring-1 " +
                        (theme === "dark"
                          ? "bg-white text-black ring-white/20 hover:bg-white/90"
                          : "bg-white text-black ring-black/15 hover:bg-black/5")
                      }
                      aria-label="بستن"
                      title="بستن"
                    >
                      <img src="/images/icons/bastan.svg" alt="" className="w-5 h-5 brightness-0" />
                    </button>
                  </div>

                  <div className="px-3 md:px-4 pt-3">
                    <div className="flex items-center justify-start gap-2">
                      {TAG_TABS.map((tab) => {
                        const active = tagPickKind === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              setTagPickKind(tab.id);
                              setTagPickCategory("همه");
                            }}
                            className={
                              "h-9 md:h-10 px-3 md:px-4 rounded-xl border text-[11px] md:text-xs font-semibold transition " +
                              (active
                                ? "bg-black text-white border-black"
                                : theme === "dark"
                                ? "bg-transparent text-white border-white/15 hover:bg-white/5"
                                : "bg-white text-neutral-900 border-black/15 hover:bg-black/[0.02]")
                            }
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3">
                      <div className={labelCls}>دسته‌بندی‌ها</div>
                      <div className="flex flex-wrap items-center gap-2">
                        {(TAG_CATEGORIES[tagPickKind] || ["همه"]).map((cat) => {
                          const active = String(tagPickCategory) === String(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setTagPickCategory(cat)}
                              className={(active ? selectedTagChipCls : chipCls) + " h-9 md:h-10"}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className={labelCls}>جستجو</div>
                      <input
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        className={inputCls + " h-9 md:h-10 text-[11px] md:text-xs"}
                        placeholder="جستجو در برچسب‌ها..."
                      />
                    </div>
                  </div>

                  <div className="px-3 md:px-4 py-3 flex-1 min-h-0 overflow-auto">
                    {!filteredTags.length ? (
                      <div className="py-10 text-center text-[11px] md:text-xs text-neutral-500 dark:text-white/50">چیزی پیدا نشد.</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {filteredTags.map((tag) => {
                          const id = String(tag.id);
                          const active = (tagDraftIds || []).some((x) => String(x) === id);
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() =>
                                setTagDraftIds((prev) =>
                                  prev.some((x) => String(x) === id)
                                    ? prev.filter((x) => String(x) !== id)
                                    : [...prev, id]
                                )
                              }
                              className={(active ? selectedTagChipCls : chipCls) + " h-9 md:h-10"}
                              title={tag.label}
                            >
                              <span className="truncate max-w-[240px]">{tag.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="px-3 md:px-4 py-3 border-t border-black/10 dark:border-white/10 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateActiveEntry((curr) => ({ ...curr, tagIds: [...tagDraftIds] }));
                        setTagModalOpen(false);
                      }}
                      className={
                        "h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center transition ring-1 " +
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
          </div>
        </Portal>
      )}

      {relatedPickOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999]" dir="rtl">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeRelatedPicker} />
            <div className="absolute inset-0 p-2 sm:p-3 md:p-4 flex items-start sm:items-center justify-center overflow-y-auto">
              <div
                className={
                  "w-[min(900px,calc(100vw-16px))] h-[min(86vh,760px)] rounded-2xl border shadow-xl overflow-hidden flex flex-col " +
                  (theme === "dark" ? "border-white/10 bg-neutral-900 text-white" : "border-black/10 bg-white text-neutral-900")
                }
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-3 md:p-4 flex items-center justify-between gap-3">
                  <div className="font-bold text-sm md:text-base">انتخاب مستندات مرتبط</div>
                  <button
                    type="button"
                    onClick={closeRelatedPicker}
                    className={
                      "h-9 w-9 md:h-10 md:w-10 rounded-xl border flex items-center justify-center transition " +
                      (theme === "dark" ? "border-white/15 bg-white/5 hover:bg-white/10" : "border-black/15 bg-white hover:bg-black/[0.04]")
                    }
                    aria-label="بستن"
                    title="بستن"
                  >
                    <img src="/images/icons/bastan.svg" alt="" className={"w-5 h-5 " + (theme === "dark" ? "invert" : "brightness-0")} />
                  </button>
                </div>

                <div className="px-3 md:px-4 pb-2 md:pb-3">
                  <input
                    value={relatedPickQuery}
                    onChange={(e) => setRelatedPickQuery(e.target.value)}
                    className={inputCls + " h-9 md:h-10 text-[11px] md:text-xs"}
                    type="text"
                    placeholder="... جستجو با شماره / موضوع / سازمان"
                    autoFocus
                  />
                </div>

                <div className={theme === "dark" ? "h-px bg-white/10" : "h-px bg-black/10"} />

                <div className={theme === "dark" ? "text-white/55 text-[11px] md:text-xs px-3 md:px-4 py-2 text-center" : "text-neutral-500 text-[11px] md:text-xs px-3 md:px-4 py-2 text-center"}>
                  برای نمایش همه موارد، بخشی از شماره/موضوع را جستجو کنید. (نمایش {toFaDigits(200)} مورد اول)
                </div>

                <div className={theme === "dark" ? "h-px bg-white/10" : "h-px bg-black/10"} />

                <div className="flex-1 min-h-0 overflow-auto p-1.5 sm:p-2">
                  {relatedDocsLoading ? (
                    <div className={theme === "dark" ? "text-white/60 text-[11px] md:text-xs p-3 md:p-4" : "text-neutral-600 text-[11px] md:text-xs p-3 md:p-4"}>
                      در حال دریافت مستندات...
                    </div>
                  ) : !relatedPickList.length ? (
                    <div className={theme === "dark" ? "text-white/60 text-[11px] md:text-xs p-3 md:p-4" : "text-neutral-600 text-[11px] md:text-xs p-3 md:p-4"}>موردی پیدا نشد.</div>
                  ) : (
                    <div className="space-y-1">
                      {relatedPickList.map((l) => {
                        const id = String(docIdOf(l) || l?.id || "");
                        const no = docNoOf(l) || id;
                        const sub = docTitleOf(l);
                        const dt = docDateOf(l);
                        const checked = relatedPickIds.includes(id);

                        return (
                          <label
                            key={id}
                            className={
                              "w-full px-2.5 md:px-3 py-2 rounded-xl transition flex items-center gap-2 md:gap-3 cursor-pointer flex-row-reverse " +
                              (theme === "dark" ? "hover:bg-white/10" : "hover:bg-black/[0.03]")
                            }
                            dir="ltr"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setRelatedPickIds((prev) => {
                                  const base = Array.isArray(prev) ? prev.map(String) : [];
                                  if (base.includes(id)) return base.filter((x) => x !== id);
                                  return [...base, id];
                                });
                              }}
                              className="h-4 w-4 md:h-5 md:w-5 rounded-md border-black/20 accent-black shrink-0"
                            />
                            <div className="min-w-0 flex-1 text-right" dir="rtl">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <span className="font-bold text-sm md:text-base leading-none">{toFaDigits(no)}</span>
                                {dt ? (
                                  <span className={theme === "dark" ? "text-white/60 text-[11px] md:text-xs" : "text-neutral-600 text-[11px] md:text-xs"}>
                                    {toFaDigits(dt)}
                                  </span>
                                ) : null}
                              </div>
                              <div className={"text-[11px] md:text-xs mt-0.5 md:mt-1 break-words " + (theme === "dark" ? "text-white/75" : "text-neutral-700")}>
                                {sub || "—"}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className={theme === "dark" ? "h-px bg-white/10" : "h-px bg-black/10"} />

                <div className="p-3 md:p-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const clean = (Array.isArray(relatedPickIds) ? relatedPickIds : [])
                        .map((x) => String(x || "").trim())
                        .filter(Boolean);
                      updateActiveEntry((curr) => ({ ...curr, relatedDocIds: clean }));
                      closeRelatedPicker();
                    }}
                    className={
                      "h-9 w-9 md:h-10 md:w-10 rounded-xl border transition inline-flex items-center justify-center " +
                      (theme === "dark"
                        ? "border-white/15 bg-white text-black hover:bg-white/90"
                        : "border-black/10 bg-black text-white hover:bg-black/90")
                    }
                    aria-label="تایید"
                    title="تایید"
                  >
                    <img src="/images/icons/check.svg" alt="" className={"w-4 h-4 md:w-5 md:h-5 " + (theme === "dark" ? "" : "invert")} />
                  </button>
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
            <div className="absolute inset-0 flex items-start sm:items-center justify-center p-2 sm:p-3 md:p-4 overflow-y-auto">
              <div
                className={
                  "w-[min(720px,calc(100vw-16px))] max-h-[86vh] rounded-2xl border shadow-xl overflow-hidden flex flex-col " +
                  (theme === "dark" ? "border-white/10 bg-neutral-900 text-white" : "border-black/10 bg-white text-neutral-900")
                }
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-3 md:p-4 flex items-center justify-between">
                  <div className="font-bold text-[12px] md:text-[13px]">بارگذاری فایل</div>
                  <button
                    type="button"
                    onClick={closeUpload}
                    className={
                      "h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center transition ring-1 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 " +
                      (theme === "dark"
                        ? "ring-neutral-800 hover:bg-white/10 text-white"
                        : "ring-black/15 hover:bg-black/90 bg-black text-white")
                    }
                    aria-label="بستن"
                    title="بستن"
                  >
                    <img src="/images/icons/bastan.svg" alt="" className="w-4 h-4 invert" />
                  </button>
                </div>

                <div className={theme === "dark" ? "h-px bg-white/10" : "h-px bg-black/10"} />

                <div className="p-3 md:p-4 grid grid-cols-1 gap-3 md:gap-4 flex-1 min-h-0 overflow-auto">
                  <div>
                    <div className={labelCls}>فایل‌های انتخاب‌شده</div>
                    <div className={"rounded-2xl border overflow-hidden " + (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-white")}>
                      <div className="p-3 space-y-2">
                        {Array.isArray(activeEntry.files) && activeEntry.files.length > 0 ? (
                          activeEntry.files.map((f, idx) => (
                            <div
                              key={`${f.name}_${f.size}_${f.lastModified}_${idx}`}
                              className={
                                "rounded-xl border px-3 py-2 flex items-center justify-between gap-3 " +
                                (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-white")
                              }
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-[12px] md:text-[13px] font-semibold whitespace-normal break-words leading-6">{f.name}</div>
                                <div className={theme === "dark" ? "text-white/60 text-[10px] md:text-[11px] mt-1" : "text-neutral-600 text-[10px] md:text-[11px] mt-1"}>
                                  {formatSize(f.size)}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  updateActiveEntry((curr) => ({
                                    ...curr,
                                    files: (curr.files || []).filter((_, i) => i !== idx),
                                  }))
                                }
                                className="h-9 px-3 rounded-xl border border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02] text-[11px] md:text-xs dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                                title="حذف"
                                aria-label="حذف"
                              >
                                حذف
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="py-6 text-center text-black/60 dark:text-white/50 text-[11px] md:text-xs">فایلی انتخاب نشده است.</div>
                        )}

                        <div className={uploadBoxCls + " mt-3"} onDrop={onDropUpload} onDragOver={onDragOverUpload}>
                          <div className={theme === "dark" ? "text-white/80 text-[11px] md:text-xs font-semibold" : "text-neutral-800 text-[11px] md:text-xs font-semibold"}>
                            فایل را اینجا رها کنید
                          </div>
                          <div className={theme === "dark" ? "text-white/50 text-[11px] md:text-xs mt-1" : "text-neutral-500 text-[11px] md:text-xs mt-1"}>
                            یا با دکمه زیر انتخاب کنید (تصویر / PDF)
                          </div>

                          <div className="mt-3 flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => uploadInputRef.current?.click()}
                              className={
                                "h-9 md:h-10 px-3 md:px-4 rounded-xl border transition inline-flex items-center justify-center gap-2 text-[11px] md:text-xs " +
                                (theme === "dark"
                                  ? "border-white/15 bg-white text-black hover:bg-white/90"
                                  : "border-black/15 bg-black text-white hover:bg-black/90")
                              }
                            >
                              <img src="/images/icons/upload.svg" alt="" className={"w-5 h-5 " + (theme === "dark" ? "" : "invert")} />
                              انتخاب فایل
                            </button>
                            <input
                              ref={uploadInputRef}
                              type="file"
                              multiple
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={handlePickFiles}
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={closeUpload}
                            className={
                              "h-9 w-9 md:h-10 md:w-10 rounded-xl border transition inline-flex items-center justify-center " +
                              (theme === "dark"
                                ? "border-white/15 bg-white text-black hover:bg-white/90"
                                : "border-black/10 bg-black text-white hover:bg-black/90")
                            }
                            aria-label="تایید"
                            title="تایید"
                          >
                            <img src="/images/icons/check.svg" alt="" className={"w-4 h-4 md:w-5 md:h-5 " + (theme === "dark" ? "" : "invert")} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={theme === "dark" ? "h-px bg-white/10" : "h-px bg-black/10"} />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
