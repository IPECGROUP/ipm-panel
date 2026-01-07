// src/pages/LettersPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../components/AuthProvider";


const TAB_ACTIVE_BG = {
  incoming: "#0046FF",
  outgoing: "#8BAE66",
  internal: "#FF8040",
};

const LETTERS_CACHE_KEY = "letters_mine_cache_v1";
const LETTERS_CACHE_TTL = 1000 * 60 * 10; // 10 دقیقه

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

function toEnDigits(s) {
  return String(s || "")
    .replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)])
    .replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)]);
}
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

function JalaliPopupDatePicker({ value, onChange, theme, buttonClassName, hideIcon }) {
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
    for (let y = base - 10; y <= base + 10; y++) arr.push(y);
    return arr;
  }, [nowParts.jy]);

  const days = useMemo(() => {
    const max = jm <= 6 ? 31 : jm <= 11 ? 30 : 29;
    const arr = [];
    for (let d = 1; d <= max; d++) arr.push(d);
    return arr;
  }, [jm]);

  useEffect(() => {
    const max = jm <= 6 ? 31 : jm <= 11 ? 30 : 29;
    if (jd > max) setJd(max);
  }, [jm, jd]);

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
            style={{ top: pos.top, right: pos.right }}
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
                  {PERSIAN_MONTHS.map((name, idx) => (
                    <option key={name} value={idx + 1}>
                      {name}
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

export default function LettersPage() {
  const API_BASE = String(import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
  async function api(path, opt = {}) {
    const res = await fetch(API_BASE + path, {
      credentials: "include",
      ...opt,
      headers: { "Content-Type": "application/json", ...(opt.headers || {}) },
    });
    const txt = await res.text();
    let data = {};
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch {}
    if (!res.ok) throw new Error(data?.error || data?.message || "request_failed");
    return data;
  }

  // ===== Letter Tag Prefs (backend) =====
// چند مسیر احتمالی؛ اولی که جواب بده استفاده میشه (برای سازگاری با بک‌اندهای مختلف)
const LETTER_PREFS_ENDPOINTS = [
  "/tag-prefs?scope=letters",
  "/tag-prefs/letters",
  "/letter-prefs",
  "/letters/prefs",
];

async function fetchLetterPrefs() {
  for (const path of LETTER_PREFS_ENDPOINTS) {
    try {
      const r = await api(path, { method: "GET" });
      return r || {};
    } catch (e) {
      // try next
    }
  }
  return {};
}

async function patchLetterPrefs(patch) {
  const body = JSON.stringify(patch || {});
  for (const path of LETTER_PREFS_ENDPOINTS) {
    try {
      const r = await api(path, { method: "PATCH", body });
      return r || {};
    } catch (e) {
      // try next
    }
  }
  throw new Error("prefs_save_failed");
}


  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
  useEffect(() => {
    const el = document.documentElement;
    const apply = () => setTheme(el.classList.contains("dark") ? "dark" : "light");
    apply();
    const obs = new MutationObserver(() => apply());
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const [formOpen, setFormOpen] = useState(false);
  const [filterTab, setFilterTab] = useState("all"); // فقط فیلتر جدول
const [formKind, setFormKind] = useState("incoming"); // نوع نامه داخل فرم: وارده/صادره/داخلی

  // ✅ edit state
  const [editingId, setEditingId] = useState(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFor, setUploadFor] = useState("incoming");

  const closeUpload = () => {
    setUploadOpen(false);
  };

    const { user } = useAuth();

    
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
  const url = String(u || "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return window.location.protocol + url;
  if (url.startsWith("/")) return url;

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

// ===== Filters (page-level) =====
  const [filterQuick, setFilterQuick] = useState(""); // week|2w|1m|3m|6m
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterTagIds, setFilterTagIds] = useState([]);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterOrg, setFilterOrg] = useState("");
  const [filterLetterNo, setFilterLetterNo] = useState("");
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

  (async () => {
    await loadActiveFilterTags();
    filterActiveHydratedRef.current = true;
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id]);

useEffect(() => {
  if (!filterActiveHydratedRef.current) return;
  saveActiveFilterTags(filterTagIds);
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
const [docClassExtras, setDocClassExtras] = useState([]);

// پاپ‌آپ «سایر»
const [docClassOtherOpen, setDocClassOtherOpen] = useState(false);
const [docClassOtherText, setDocClassOtherText] = useState("");

// طبقه بندی (عادی/محرمانه)
const [classification, setClassification] = useState("عادی");


  const [category, setCategory] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState([]);

  const [letterNo, setLetterNo] = useState("");
  const [letterDate, setLetterDate] = useState("");

  const [fromName, setFromName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [toName, setToName] = useState("");
  const [subject, setSubject] = useState("");
  const [hasAttachment, setHasAttachment] = useState(false);
  const [incomingAttachmentTitle, setIncomingAttachmentTitle] = useState("");
  const [outgoingAttachmentTitle, setOutgoingAttachmentTitle] = useState("");
  const [internalAttachmentTitle, setInternalAttachmentTitle] = useState("");
  const [returnToIds, setReturnToIds] = useState([""]);
  const [piroIds, setPiroIds] = useState([""]);
  const [myLetters, setMyLetters] = useState([]);
  const [relatedOpen, setRelatedOpen] = useState(false);
const [relatedQuery, setRelatedQuery] = useState("");

// ===== Related picker modal =====
const [relatedPickOpen, setRelatedPickOpen] = useState(false);
const [relatedPickQuery, setRelatedPickQuery] = useState("");
const [relatedPickIds, setRelatedPickIds] = useState([]); // انتخاب‌های موقت داخل پاپ‌آپ


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


  const letterNoOf = (l) => String(l?.letter_no ?? l?.no ?? l?.number ?? l?.letterNo ?? "");
  const letterDateOf = (l) =>
  String(
    l?.letter_date ??
      l?.letterDate ??
      l?.secretariat_date ??
      l?.secretariatDate ??
      l?.date ??
      ""
  ).trim();

const myLettersSorted = useMemo(() => {
  const arr = Array.isArray(myLetters) ? myLetters.slice() : [];

  const normYmd = (s) => {
    const raw = String(s || "").trim();
    const v = toEnDigits(raw);
    const m = v.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (!m) return "";
    return `${m[1]}/${pad2(m[2])}/${pad2(m[3])}`;
  };

  const dateKeyOf = (l) =>
    normYmd(letterDateOf(l)) ||
    normYmd(l?.secretariat_date ?? l?.secretariatDate ?? "");

  arr.sort((a, b) => {
    const ad = dateKeyOf(a);
    const bd = dateKeyOf(b);
    if (ad && bd && ad !== bd) return bd.localeCompare(ad); // جدیدتر اول
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;

    const ai = Number(letterIdOf(a));
    const bi = Number(letterIdOf(b));
    if (Number.isFinite(ai) && Number.isFinite(bi)) return bi - ai;
    return String(letterIdOf(b)).localeCompare(String(letterIdOf(a)));
  });

  return arr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [myLetters]);

  const orgOf = (l) => String(l?.org_name ?? l?.org ?? l?.organization ?? l?.company ?? "");
  const subjectOf = (l) => String(l?.subject ?? l?.title ?? "");

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
const relatedInputRef = useRef(null);

// ✅ اول این باید بیاد (قبل از relatedDisplayValue)
const relatedSelectedIds = useMemo(() => {
  return (Array.isArray(returnToIds) ? returnToIds : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean);
}, [returnToIds]);

// متن نمایشی شماره‌های انتخاب شده (وقتی dropdown بسته است)
const relatedDisplayValue = useMemo(() => {
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

const relatedOptions = useMemo(() => {
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
  const [tags, setTags] = useState([]);
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

  const [incomingReceiverName, setIncomingReceiverName] = useState("");
  const [outgoingReceiverName, setOutgoingReceiverName] = useState("");
  const [internalReceiverName, setInternalReceiverName] = useState("");

  // ===== View modal (details + preview) =====
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLetter, setViewLetter] = useState(null);
  const [viewAttIdx, setViewAttIdx] = useState(0);

  const closeView = () => setViewOpen(false);
  const openView = (l) => {
    setViewLetter(l || null);
    setViewAttIdx(0);
    setViewOpen(true);
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

const tagPrefsLsKey = (scope) => `tag_prefs_v1:${scope}:u${String(user?.id || "0")}`;

// ===== Per-user selected tags for FORM (incoming/outgoing/internal) — stored in backend (/tag-prefs) =====
const FORM_TAG_PREFS_SCOPE = {
  incoming: "letters_form_incoming",
  outgoing: "letters_form_outgoing",
  internal: "letters_form_internal",
};

const formPrefsLsKey = (which) => `tag_prefs_v1:${FORM_TAG_PREFS_SCOPE[which]}:u${String(user?.id || "0")}`;

const [formTagPrefs, setFormTagPrefs] = useState({ incoming: [], outgoing: [], internal: [] });
const formTagsHydratedRef = useRef({ incoming: false, outgoing: false, internal: false });

const saveFormTagPrefs = async (which, ids) => {
  const clean = normalizeIdList(ids).slice(0, TAG_PREFS_LIMIT);

  if (which === "incoming") await patchLetterPrefs({ incoming_tag_ids: clean });
  else if (which === "outgoing") await patchLetterPrefs({ outgoing_tag_ids: clean });
  else await patchLetterPrefs({ internal_tag_ids: clean });
};

const loadFormTagPrefs = async (which) => {
  const p = await fetchLetterPrefs();

  const ids =
    which === "incoming"
      ? normalizeIdList(p?.incoming_tag_ids || [])
      : which === "outgoing"
      ? normalizeIdList(p?.outgoing_tag_ids || [])
      : normalizeIdList(p?.internal_tag_ids || []);

  const cut = ids.slice(0, TAG_PREFS_LIMIT);
  setFormTagPrefs((prev) => ({ ...prev, [which]: cut }));
  return cut;
};
const setFormTagsOnly = (which, ids) => {
  const next = normalizeIdList(ids).slice(0, TAG_PREFS_LIMIT);

  if (which === "incoming") setIncomingTagIds(next);
  else if (which === "outgoing") setOutgoingTagIds(next);
  else setInternalTagIds(next);

  setFormTagPrefs((p) => ({ ...p, [which]: next }));
};


const setFormTagsAndPersist = (which, ids) => {
  const next = normalizeIdList(ids).slice(0, TAG_PREFS_LIMIT);

  if (which === "incoming") setIncomingTagIds(next);
  else if (which === "outgoing") setOutgoingTagIds(next);
  else setInternalTagIds(next);

  setFormTagPrefs((p) => ({ ...p, [which]: next }));
  saveFormTagPrefs(which, next);
};

const normalizeIdList = (arr) => {
  const a = Array.isArray(arr) ? arr : [];
  const out = [];
  const seen = new Set();

  const pickId = (x) => {
    if (x == null) return "";
    if (typeof x === "object") {
      // ساپورت چند مدل رایج
      return (
        x.id ??
        x.tag_id ??
        x.tagId ??
        x.value ??
        x.key ??
        x._id ??
        ""
      );
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
};

const savePinnedFilterTags = async (ids) => {
  const clean = normalizeIdList(ids).slice(0, TAG_PREFS_LIMIT);
  await patchLetterPrefs({ all_tag_ids: clean });
};

const activeFilterLsKey = () => `letters_filter_active_v1:u${String(user?.id || "0")}`;

const saveActiveFilterTags = (ids) => {
  try {
    const clean = normalizeIdList(ids).slice(0, TAG_PREFS_LIMIT);
    localStorage.setItem(activeFilterLsKey(), JSON.stringify({ t: Date.now(), ids: clean }));
  } catch {}
};

const loadActiveFilterTags = () => {
  try {
    const raw = localStorage.getItem(activeFilterLsKey());
    const parsed = raw ? JSON.parse(raw) : null;
    const ids = normalizeIdList(parsed?.ids || []).slice(0, TAG_PREFS_LIMIT);
    setFilterTagIds(ids);
  } catch {
    setFilterTagIds([]);
  }
};

const loadPinnedFilterTags = async () => {
  const p = await fetchLetterPrefs();
  const ids = normalizeIdList(p?.all_tag_ids || []).slice(0, TAG_PREFS_LIMIT);
  setFilterTagPinnedIds(ids);
};

useEffect(() => {
  if (!user?.id) return;
  loadPinnedFilterTags();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id]);

useEffect(() => {
  if (!user?.id) return;

  (async () => {
    // برای اینکه pinned ها از هر تب (letters/projects/execution) بعد refresh دیده بشن
    await Promise.all([
      refreshTags("letters"),
      refreshTags("projects"),
      refreshTags("execution"),
    ]);
  })();

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id]);


useEffect(() => {
  if (!user?.id) return;
  loadFormTagPrefs("incoming");
  loadFormTagPrefs("outgoing");
  loadFormTagPrefs("internal");
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

  const pref = Array.isArray(formTagPrefs?.[which]) ? formTagPrefs[which] : [];

  // ✅ فقط state رو از prefs پر کن، ذخیره نکن
  setFormTagsOnly(which, pref);

  formTagsHydratedRef.current[which] = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [formOpen, formKind, editingId, formTagPrefs]);


useEffect(() => {
  if (formOpen) return;
  formTagsHydratedRef.current = { incoming: false, outgoing: false, internal: false };
}, [formOpen]);

// اضافه کردن/بردن به اول لیست (و ذخیره در بک‌اند)
const bumpPinnedFilterTag = (id) => {
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
const mergePinnedFilterTags = (ids) => {
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
  setFilterTagIds([]);
  saveActiveFilterTags([]); // ✅
  setFilterSubject("");
  setFilterOrg("");
  setFilterLetterNo("");
};

  // ===== Table selection + pagination =====
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);

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

  const currentDocFiles = useMemo(() => {
    return Array.isArray(docFilesByType?.[uploadFor]) ? docFilesByType[uploadFor] : [];
  }, [docFilesByType, uploadFor]);

  const uploadFileToLetter = (file, letterId, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", API_BASE + "/uploads/letters");
      xhr.withCredentials = true;

      const fd = new FormData();
      fd.append("file", file);
      fd.append("letter_id", String(letterId));

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
          reject(new Error("خطا در آپلود فایل"));
        }
      };

      xhr.onerror = () => reject(new Error("خطا در آپلود فایل"));
      xhr.send(fd);
    });
  };

  const addFilesToUpload = async (which, fileList) => {
    const list = Array.from(fileList || []);
    if (!list.length) return;

    for (const rawFile of list) {
      const isPdf = rawFile.type === "application/pdf" || rawFile.name.toLowerCase().endsWith(".pdf");
      const isImg = rawFile.type && rawFile.type.startsWith("image/");

      if (!isImg && !isPdf) {
        alert("فقط تصویر و PDF مجاز است.");
        continue;
      }

      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const previewUrl = isImg ? URL.createObjectURL(rawFile) : null;

      setDocFilesFor(which, (prev) => [
        ...prev,
        {
          id,
          name: rawFile.name,
          size: rawFile.size,
          type: rawFile.type,
          status: "ready",
          progress: 0,
          error: "",
          serverId: null,
          url: null,
          previewUrl,
          file: rawFile,
          optimizedFile: rawFile,
        },
      ]);
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

  // ✅ cache
  try {
    sessionStorage.setItem(
      LETTERS_CACHE_KEY,
      JSON.stringify({ t: Date.now(), items })
    );
  } catch {}
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
  let mounted = true;

  // 1) سریع از کش نشون بده
  try {
    const raw = sessionStorage.getItem(LETTERS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const t = Number(parsed?.t || 0);
      const cached = Array.isArray(parsed?.items) ? parsed.items : [];

      if (cached.length && Date.now() - t < LETTERS_CACHE_TTL) {
        setMyLetters(cached);
      }
    }
  } catch {}

  // 2) بعدش در پس‌زمینه از سرور آپدیت کن
  (async () => {
    try {
      const r = await api("/letters/mine");
      const items = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
      if (!mounted) return;

      setMyLetters(items);

      // آپدیت کش
      try {
        sessionStorage.setItem(LETTERS_CACHE_KEY, JSON.stringify({ t: Date.now(), items }));
      } catch {}
    } catch {
      // اگر کش داشتی، اینجا لازم نیست خالی کنی
      if (!mounted) return;

      // فقط وقتی کش نداشتیم خالی کن (اختیاری ولی بهتر برای UX)
      try {
        const raw = sessionStorage.getItem(LETTERS_CACHE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        const cached = Array.isArray(parsed?.items) ? parsed.items : [];
        if (!cached.length) setMyLetters([]);
      } catch {
        setMyLetters([]);
      }
    }
  })();

  return () => {
    mounted = false;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


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

  const todayJalaliLong = useMemo(() => {
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

    const inputBase = "w-full h-11 px-4 rounded-xl border outline-none transition text-right text-[14px]";

  const inputCls =
    theme === "dark"
      ? inputBase + " border-white/15 bg-white/5 text-white placeholder:text-white/40 focus:bg-white/10"
      : inputBase + " border-black/10 bg-white text-neutral-900 placeholder:text-neutral-400 focus:bg-black/[0.02]";

  const labelCls = theme === "dark" ? "text-white/70 text-xs mb-1" : "text-neutral-600 text-xs mb-1";

  // compact versions (for one-line top row)
const inputSmCls = inputCls
  .replace("h-11", "h-10")
  .replace("px-4", "px-3") + " text-[14px] rounded-xl";

const labelSmCls = (theme === "dark"
  ? "text-white/70 text-[11px] mb-1"
  : "text-neutral-600 text-[11px] mb-1");

const tabSmCls = (active) =>
  "h-10 px-4 rounded-xl border transition text-[13px] font-semibold inline-flex items-center gap-2 whitespace-nowrap " +
  (active
    ? "text-white"
    : theme === "dark"
    ? "bg-transparent text-white hover:bg-white/5"
    : "bg-white text-neutral-900 hover:bg-black/[0.02]");

  const formGridWrapCls =
    "rounded-2xl overflow-hidden border " +
    (theme === "dark" ? "border-white/10" : "border-black/10");

  const formGridCls =
    "grid gap-px " + (theme === "dark" ? "bg-white/10" : "bg-black/10");

  const formCellCls = "p-2 " + (theme === "dark" ? "bg-neutral-900" : "bg-white");


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

  const sendBtnCls =
  "h-12 w-12 rounded-xl flex items-center justify-center transition ring-1 " +
  (theme === "dark"
    ? "bg-white text-black ring-white/15 hover:bg-white/90"
    : "bg-black text-white ring-black/15 hover:bg-black/90");

        // ✅ Outer border box for the whole form (like filters box)
  const formOuterBoxCls =
    "space-y-3 rounded-2xl border p-3 " +
    (theme === "dark" ? "border-white/10 bg-transparent" : "border-black/10 bg-white");


  const sendIconCls = "w-5 h-5 " + (theme === "dark" ? "invert-0" : "invert");

  const findProject = (id) => projects.find((p) => String(p?.id) === String(id));

  const projectOptionLabel = (p) => {
  const code = String(p?.__baseCode ?? p?.code ?? "").trim();
  const name = String(p?.name ?? p?.title ?? p?.label ?? "").trim();
  return `${toFaDigits(code)}${name ? " - " + name : ""}`.trim();
};

const projectsDesc = useMemo(() => {
  const arr = Array.isArray(projects) ? projects.slice() : [];
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
    const raw = String(p?.code ?? "").trim(); // مثال: 159 یا 159.1.1
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

 const toggleTag = (which, id) => {
  const sid = String(id || "").trim();
  if (!sid) return;

  const cur =
    which === "incoming" ? incomingTagIds :
    which === "outgoing" ? outgoingTagIds :
    internalTagIds;

  const base = Array.isArray(cur) ? cur.map(String) : [];
  const next = base.includes(sid) ? base.filter((x) => x !== sid) : [...base, sid];

  setFormTagsAndPersist(which, next); // ✅ هم set هم save
};

const toggleFilterTag = (id) => {
  const sid = String(id || "").trim();
  if (!sid) return;

  setFilterTagIds((prev) => {
    const cur = Array.isArray(prev) ? prev.map(String) : [];
    return cur.includes(sid) ? cur.filter((x) => x !== sid) : [...cur, sid];
  });
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

  const tagCapsFor = (selectedIds) => {
  const sel = Array.isArray(selectedIds) ? selectedIds.map(String) : [];
  const selSet = new Set(sel);

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
  const openUpload = (which) => {
    setUploadFor(which);
    setUploadOpen(true);
  };

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
      await addFilesToUpload(uploadFor, fl);
    }
  };

  const onDragOverUpload = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const fromToOf = (l) => {
    const a = String(l?.from_name ?? l?.from ?? "");
    const b = String(l?.to_name ?? l?.to ?? "");
    const s = `${a}${a && b ? " / " : ""}${b}`.trim();
    return s || "—";
  };


  const categoryOf = (l) => String(l?.category ?? l?.category_name ?? l?.categoryTitle ?? "");
  const categoryLabelOf = (l) => {
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

  const attachmentUrlOf = (a) => {
    const u = a?.url ?? a?.href ?? a?.path ?? a?.public_url ?? a?.publicUrl ?? a?.file_url ?? a?.fileUrl;
    return String(u || "");
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

  const isPdfUrl = (url) => String(url || "").toLowerCase().includes(".pdf");
  const isImageUrl = (url) => {
    const u = String(url || "").toLowerCase();
    return u.includes(".png") || u.includes(".jpg") || u.includes(".jpeg") || u.includes(".webp") || u.includes(".gif");
  };

  const normalizeYmd = (s) => {
  const raw = String(s || "").trim();
  const v = toEnDigits(raw); // ✅ تبدیل ارقام فارسی/عربی به انگلیسی

  // اجازه / یا - 
  const m = v.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
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
  // ✅ همیشه جدیدترین نامه‌ها اول
  const arr = Array.isArray(myLettersSorted) ? myLettersSorted : [];

  const sSub = String(filterSubject || "").trim().toLowerCase();
  const sOrg = String(filterOrg || "").trim().toLowerCase();
  const sNo = String(filterLetterNo || "").trim().toLowerCase();
  const fromY = normalizeYmd(filterFromDate);
  const toY = normalizeYmd(filterToDate);

  return arr.filter((l) => {
    const kind = letterKindOf(l);

    if (filterTab !== "all") {
      if (kind !== filterTab) return false;
    }

    if (sSub) {
      const x = String(subjectOf(l) || "").toLowerCase();
      if (!x.includes(sSub)) return false;
    }

    if (sOrg) {
      const x = String(orgOf(l) || "").toLowerCase();
      if (!x.includes(sOrg)) return false;
    }

    if (sNo) {
      const x = String(letterNoOf(l) || "").toLowerCase();
      if (!x.includes(sNo)) return false;
    }

    if (filterTagIds.length > 0) {
      const letterTags = Array.isArray(l?.tag_ids) ? l.tag_ids : Array.isArray(l?.tagIds) ? l.tagIds : [];
      const set = new Set(letterTags.map((x) => String(x)));
      const ok = filterTagIds.every((x) => set.has(String(x)));
      if (!ok) return false;
    }

    const d = normalizeYmd(letterDateOf(l));
    if ((fromY || toY) && !d) return false;
    if (fromY && d < fromY) return false;
    if (toY && d > toY) return false;

    return true;
  });
}, [myLettersSorted, filterTab, filterSubject, filterOrg, filterLetterNo, filterTagIds, filterFromDate, filterToDate]);

  useEffect(() => {
    setSelectedIds(new Set());
    setPage(0);
  }, [filterTab, rowsPerPage, filterQuick, filterFromDate, filterToDate, filterTagIds, filterSubject, filterOrg, filterLetterNo]);

  const total = filteredLetters.length;
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, rowsPerPage)));
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const startIdx = safePage * rowsPerPage;
  const endIdx = Math.min(total, startIdx + rowsPerPage);
  const pageItems = filteredLetters.slice(startIdx, endIdx);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  const visibleIds = useMemo(() => pageItems.map((l) => String(letterIdOf(l))), [pageItems]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(String(id)));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(String(id))) && !allVisibleSelected;

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

  const tableWrapCls =
    "bg-white text-black rounded-2xl border border-black/10 overflow-hidden " +
    "dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800";

  const theadRowCls =
    "bg-neutral-200 text-black border-b border-neutral-300 " +
    "dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700";

  const tbodyCls = "[&_td]:text-black dark:[&_td]:text-neutral-100";
  const confidentialTdCls = " !text-red-600 dark:!text-red-400 font-semibold";
  const rowDividerCls = "border-b border-neutral-300 dark:border-neutral-700";
  const confidentialRowCls = "[&_td]:!text-red-600 dark:[&_td]:!text-red-400 font-semibold";
const kindRowTintCls = (kind) => {
  if (kind === "incoming") return "bg-blue-50 dark:bg-blue-500/10";
  if (kind === "outgoing") return "bg-emerald-50 dark:bg-emerald-500/10";
  return "bg-orange-50 dark:bg-orange-500/10"; // ✅ internal
};

  const resetForm = () => {
    setCategory("نامه");
    setClassification("عادی");
    setProjectId("");
    setLetterNo("");
    setLetterDate("");
    setFromName("");
    setOrgName("");
    setToName("");
    setSubject("");
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
    setIncomingReceiverName(loggedInUserName || "");
    setOutgoingReceiverName(loggedInUserName || "");
    setInternalReceiverName(loggedInUserName || "");
    setDocFilesByType({ incoming: [], outgoing: [], internal: [] });
    setEditingId(null);
  };

  const normalizeAttachmentForPayload = (x) => {
    const url = String(x?.url || "");
    if (!url) return null;
    const name = String(x?.name || "");
    const type = String(x?.type || "");
    const size = Number(x?.size || 0) || 0;
    const out = {};
    if (name) out.name = name;
    if (url) out.url = url;
    if (type) out.type = type;
    if (size) out.size = size;
    return Object.keys(out).length ? out : null;
  };

  const startEdit = (l) => {

    const sn = l?.secretariat_note ?? l?.secretariatNote ?? "";

if (kind === "incoming") setIncomingSecretariatNote(sn);
else if (kind === "outgoing") setOutgoingSecretariatNote(sn);
else setInternalSecretariatNote(sn);

    const kind = letterKindOf(l);
    const id = String(letterIdOf(l));

    setEditingId(id);
    setFormOpen(true);
    setFormKind(kind);

    const rawCat = String(l?.category ?? l?.category_name ?? l?.categoryTitle ?? "").trim();

// سازگاری با دیتاهای قدیمی شما که category="project" بوده
    const mappedCat = rawCat === "project" ? "اسناد پروژه ای" : (rawCat || "نامه");
    setCategory(mappedCat);

    // طبقه بندی (اگر از بک‌اند اومد، وگرنه پیش‌فرض)
    const rawClass =
      String(l?.classification ?? l?.doc_classification ?? l?.confidentiality ?? "").trim();
    setClassification(rawClass || "عادی");

    const pid = l?.project_id ?? l?.projectId ?? l?.projectID ?? null;
    setProjectId(pid ? String(pid) : "");
// ✅ برای نامه‌های داخلی: پر کردن واحد در حالت Edit
const uid = l?.unit_id ?? l?.unitId ?? l?.unit ?? l?.internal_unit_id ?? "";
setInternalUnitId(uid ? String(uid) : "");

    setLetterNo(String(l?.letter_no ?? l?.letterNo ?? l?.no ?? l?.number ?? ""));
    setLetterDate(String(l?.letter_date ?? l?.letterDate ?? l?.date ?? ""));

    setFromName(String(l?.from_name ?? l?.fromName ?? l?.from ?? ""));
    setToName(String(l?.to_name ?? l?.toName ?? l?.to ?? ""));
    setOrgName(String(l?.org_name ?? l?.orgName ?? l?.org ?? l?.organization ?? l?.company ?? ""));
    setSubject(String(l?.subject ?? l?.title ?? ""));

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
  };

  const submitLetter = async (kind) => {
    if (kind === "internal" && !String(internalUnitId || "").trim()) {
  alert("برای نامه داخلی انتخاب واحد الزامی است.");
  return;
}

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

    const secretariatNo =
      kind === "incoming" ? incomingSecretariatNo : kind === "outgoing" ? outgoingSecretariatNo : internalSecretariatNo;

        const receiverName =
      (loggedInUserName || "").trim() ||
      (kind === "incoming" ? incomingReceiverName : kind === "outgoing" ? outgoingReceiverName : internalReceiverName);

    const pId = projectId ? Number(projectId) : null;

    const files = Array.isArray(docFilesByType?.[kind]) ? docFilesByType[kind] : [];

    const reused = files
      .filter((f) => f && f.status === "done" && !!f.url && !f.file && !f.optimizedFile)
      .map((f) =>
        normalizeAttachmentForPayload({
          name: f.name,
          url: f.url,
          type: f.type,
          size: f.size,
        })
      )
      .filter(Boolean);

    const queue = files.filter((f) => f && f.status !== "error" && (f.optimizedFile || f.file) && !f.url);

  const computedHasAttachment = queue.length > 0 || reused.length > 0 ? true : !!hasAttachment;

    const payload = {
  kind,
  category: category || "",
  classification: classification || "عادی",

  project_id: pId && Number.isFinite(pId) ? pId : null,
  letter_no: letterNo || "",
  letter_date: letterDate || "",
  from_name: fromName || "",
  to_name: toName || "",
  org_name: orgName || "",
  subject: subject || "",
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
          setDocFilesFor(kind, (prev) =>
            prev.map((x) => (x.id === f.id ? { ...x, status: "error", error: e?.message || "خطا در آپلود فایل." } : x))
          );
        }
      }
    }
    await refetchLetters();
    resetForm();
    setFormOpen(false);
  };
  const deleteLetter = async (id) => {
    const ok = window.confirm("حذف شود؟");
    if (!ok) return;

    try {
  await api(`/letters?id=${encodeURIComponent(String(id))}`, {
    method: "DELETE",
    body: JSON.stringify({ id: String(id), letter_id: String(id) }),
  });
} catch (_e) {
  // اگر بک‌اند فقط path رو ساپورت می‌کرد (اختیاری)
  await api(`/letters/${encodeURIComponent(String(id))}`, { method: "DELETE" });
}
    await refetchLetters();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(String(id));
      return next;
    });
  };
  const InfoRow = ({ label, value }) => (
    <div className="grid grid-cols-12 gap-2 py-2">
      <div className={"col-span-4 text-xs font-semibold " + (theme === "dark" ? "text-white/70" : "text-neutral-600")}>
        {label}
      </div>
      <div className={"col-span-8 text-sm " + (theme === "dark" ? "text-white" : "text-neutral-900")}>{value || "—"}</div>
    </div>
  );
  const viewAttachments = useMemo(() => attachmentsOf(viewLetter), [viewLetter]); // eslint-disable-line react-hooks/exhaustive-deps
  const currentViewAttachment = useMemo(() => {
    const arr = Array.isArray(viewAttachments) ? viewAttachments : [];
    const a = arr[viewAttIdx] || arr[0] || null;
    return a;
  }, [viewAttachments, viewAttIdx]);

 const currentViewUrl = useMemo(
  () => resolveFileUrl(attachmentUrlOf(currentViewAttachment)),
  [currentViewAttachment]
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

  const viewHasAttachment = useMemo(() => {
    if (!viewLetter) return false;
    if (viewAttachments.length > 0) return true;
    const ha = viewLetter?.has_attachment ?? viewLetter?.hasAttachment;
    return !!ha;
  }, [viewLetter, viewAttachments]);

  const paginationIconBtnCls =
    "h-9 w-9 rounded-lg grid place-items-center transition !bg-transparent !ring-0 !border-0 !shadow-none " +
    (theme === "dark" ? "hover:bg-white/10" : "hover:bg-black/5") +
    " disabled:opacity-40 disabled:cursor-not-allowed";

  const addIconBtnCls =
    "h-11 w-11 rounded-xl flex items-center justify-center transition ring-1 p-2 " +
    (theme === "dark" ? "ring-neutral-800 hover:bg-white/10" : "ring-black/15 hover:bg-black/5");

  const addIconImgCls = "w-5 h-5 " + (theme === "dark" ? "dark:invert" : "");

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

  const filteredUploadedAttachments = useMemo(() => {
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

  const addExistingAttachmentToCurrent = (which, att) => {
    const url = attachmentUrlOf(att);
    if (!url) return;
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
          serverId: null,
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

const latestAllTags = useMemo(() => {
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

  const initialKind = "letters";

  setTagPickKind(initialKind);
  await ensureTagsForKind(initialKind);

  const currentSelected =
    forWhat === "form" ? formSelectedTagIds : filterTagPinnedIds;

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
    setFilterTagIds((prev) => (Array.isArray(prev) ? prev.map(String) : []).filter((x) => ids.includes(String(x))));
   } else {
    // ✅ همیشه روی همون تبِ فرم که بازه اعمال کن
    setFormTagsAndPersist(formKind, ids);
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

useEffect(() => {
  if (!formOpen) return;

  const k =
    formKind === "outgoing"
      ? "projects"
      : formKind === "internal"
      ? "execution"
      : "letters";

  ensureTagsForKind(k);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [formOpen, formKind]);

  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <Card
        className={
          "rounded-2xl border overflow-hidden " + (theme === "dark" ? "border-white/10 bg-neutral-900" : "border-black/10 bg-white")
        }
      >
        <div className="p-3 md:p-4">
          {/* Header INSIDE card */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-lg md:text-xl font-bold">اسناد و نامه ها</div>
            <button
              type="button"
              onClick={() => {
                setFormOpen((v) => {
                  const next = !v;
                  if (next) {
                  } else {
                    setEditingId(null);
                  }
                  return next;
                });
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
    "space-y-2 rounded-2xl border p-3 " +
    (theme === "dark" ? "border-white/10 bg-transparent" : "border-black/10 bg-white")

  }
>
              <div className="flex flex-wrap items-end gap-2">
                {/* Tabs first */}
                <div className="flex flex-wrap items-center gap-1 justify-start">

                  {TABS.map((t) => {
                    const active = filterTab === t.id;
                    const isAll = t.id === "all";
                    const isKind = t.id === "incoming" || t.id === "outgoing" || t.id === "internal";
  const activeColor = isKind ? TAB_ACTIVE_BG[t.id] : null;

                    const cls =
  "h-10 px-5 rounded-xl border transition text-sm font-semibold inline-flex items-center gap-2 " +
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

                <div className="min-w-[180px] flex-1">

                  <div className={labelCls}>موضوع</div>
                  <input
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    className={inputCls}
                    type="text"
                    placeholder="جستجو بر اساس موضوع"
                  />
                </div>

                <div className="min-w-[180px] flex-1">

                  <div className={labelCls}>شرکت/سازمان</div>
                  <input
                    value={filterOrg}
                    onChange={(e) => setFilterOrg(e.target.value)}
                    className={inputCls}
                    type="text"
                    placeholder="جستجو بر اساس شرکت/سازمان"
                  />
                </div>

                <div className="min-w-[120px]">
                  <div className={labelCls}>شماره سند</div>
                  <input
                    value={filterLetterNo}
                    onChange={(e) => setFilterLetterNo(e.target.value)}
                    className={inputCls}
                    type="text"
                    placeholder="جستجو شماره سند"
                  />
                </div>
                <div className="min-w-[140px]">

                  <div className={labelCls}>از</div>
                  <JalaliPopupDatePicker
                    value={filterFromDate}
                    onChange={(v) => {
                      setFilterFromDate(v);
                      setFilterQuick(""); // ✅
                    }}
                    theme={theme}
                  />
                </div>

                <div className="min-w-[140px]">
                  <div className={labelCls}>تا</div>
                  <JalaliPopupDatePicker
                    value={filterToDate}
                    onChange={(v) => {
                      setFilterToDate(v);
                      setFilterQuick(""); // ✅
                    }}
                    theme={theme}
                  />
                </div>
              </div>





              {/* Tags + Quick chips (moved here) */}
              <div>
                <div className={labelCls}>برچسب ها</div>
                <div className="flex flex-wrap items-center gap-2">
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
          ? theme === "dark"
            ? chipBase + " border-white/15 bg-white text-black"
            : chipBase + " border-black/15 bg-black text-white"
          : chipCls) + " shrink-0"
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
      className={(active ? selectedTagChipCls : chipCls) + " shrink-0"}
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
    "h-10 w-10  shrink-0 rounded-full border transition inline-flex items-center justify-center " +
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
              </div>
            </div>
          )}
          {/* Create/Edit form */}
          <div className="mt-4">
            {formOpen ? (
  <div className={formOuterBoxCls}>
    <div
  className="
    flex items-end gap-2
    overflow-x-auto md:overflow-visible
    flex-nowrap
    pb-1
  "
>
  {/* نوع نامه */}
  <div className="shrink-0 w-[320px]">
    <div className={labelSmCls}>نوع سند</div>
    <div className="flex items-center gap-1">
      {TABS.filter((x) => x.id !== "all").map((t) => {
        const active = formKind === t.id;
        const activeColor = TAB_ACTIVE_BG[t.id];

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setFormKind(t.id)}
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
  <div className="shrink-0 w-[190px]">
    <div className={labelSmCls}>کلاس سند</div>
    <select
      value={category}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "__other__") {
          setDocClassOtherText("");
          setDocClassOtherOpen(true);
          return;
        }
        setCategory(v);
      }}
      className={inputSmCls}
    >
      {([...DOC_CLASS_BASE, ...(Array.isArray(docClassExtras) ? docClassExtras : [])]).map((lab) => (
        <option key={lab} value={lab}>{lab}</option>
      ))}
      <option value="__other__">سایر</option>
    </select>
  </div>

  {/* طبقه بندی */}
  <div className="shrink-0 w-[140px]">
    <div className={labelSmCls}>طبقه بندی</div>
    <select
      value={classification}
      onChange={(e) => setClassification(e.target.value)}
      className={inputSmCls}
    >
      <option value="عادی">عادی</option>
      <option value="محرمانه">محرمانه</option>
    </select>
  </div>

  {/* مرکز/پروژه */}
  <div className="shrink-0 w-[220px]">
    <div className={labelSmCls}>مرکز/پروژه</div>
    <select
      value={projectId}
      onChange={(e) => setProjectId(e.target.value)}
      className={inputSmCls}
    >
      <option value=""></option>
      {projectsTopOnly.map((p) => (
        <option key={p.id} value={String(p.id)}>
          {projectOptionLabel(p)}
        </option>
      ))}
    </select>
  </div>

  {/* شماره */}
  <div className="shrink-0 w-[170px]">
    <div className={labelSmCls}>{formKind === "internal" ? "شماره سند" : "شماره سند"}</div>
    <input
      value={letterNo}
      onChange={(e) => setLetterNo(e.target.value)}
      className={inputSmCls}
      type="text"
    />
  </div>

  {/* تاریخ */}
  <div className="shrink-0 w-[170px]">
    <div className={labelSmCls}>{formKind === "internal" ? "تاریخ سند" : "تاریخ سند"}</div>
    <JalaliPopupDatePicker
      value={letterDate}
      onChange={setLetterDate}
      theme={theme}
      buttonClassName={inputSmCls + " flex items-center justify-between"}
    />
  </div>
</div>

{formKind !== "internal" && (
  <div className={formGridWrapCls + " p-2 border-0"}>
    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
      {formKind === "outgoing" ? (
        <>
          {/* از (کمی کوچکتر) */}
          <div className="md:col-span-3">
            <div className={labelCls}>از</div>
            <input
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              className={inputCls}
              type="text"
            />
          </div>

          {/* آیکن وسط */}
          <div className="md:col-span-1 flex flex-col items-center">
            <div className={labelCls + " opacity-0 select-none"}>_</div>
            <div className="h-10 flex items-center justify-center">
              <img
                src="/images/icons/arrow-left.svg"
                alt=""
                className={"w-5 h-5 " + (theme === "dark" ? "invert" : "")}
              />
            </div>
          </div>

          {/* به (کمی کوچکتر) */}
          <div className="md:col-span-3">
            <div className={labelCls}>به</div>
            <input
              value={toName}
              onChange={(e) => setToName(e.target.value)}
              className={inputCls}
              type="text"
            />
          </div>

          {/* شرکت/سازمان (باقی فضا) */}
          <div className="md:col-span-5">
            <div className={labelCls}>شرکت/سازمان</div>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className={inputCls}
              type="text"
            />
          </div>
        </>
      ) : (
        <>
          {/* وارده (مثل قبل) */}
          <div className="md:col-span-4">
            <div className={labelCls}>از</div>
            <input
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              className={inputCls}
              type="text"
            />
          </div>

          <div className="md:col-span-3">
            <div className={labelCls}>شرکت/سازمان</div>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className={inputCls}
              type="text"
            />
          </div>

          <div className="md:col-span-1 flex flex-col items-center">
            <div className={labelCls + " opacity-0 select-none"}>_</div>
            <div className="h-10 flex items-center justify-center">
              <img
                src="/images/icons/arrow-left.svg"
                alt=""
                className={"w-5 h-5 " + (theme === "dark" ? "invert" : "")}
              />
            </div>
          </div>

          <div className="md:col-span-4">
            <div className={labelCls}>به</div>
            <input
              value={toName}
              onChange={(e) => setToName(e.target.value)}
              className={inputCls}
              type="text"
            />
          </div>
        </>
      )}
    </div>
  </div>
)}
   {/* موضوع + ضمیمه + (برای داخلی: واحد) */}
{formKind === "internal" ? (
  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
    {/* موضوع */}
    <div className="md:col-span-7">
      <div className={labelCls}>موضوع</div>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} type="text" />
    </div>

    {/* ضمیمه (کنار موضوع) */}
    <div className="md:col-span-2 flex flex-col items-center">
      <div className={labelCls}>ضمیمه</div>
      <div className="flex items-center justify-center gap-4 mt-0 h-10">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="radio"
            name={"hasAttachment_" + formKind}
            checked={hasAttachment === true}
            onChange={() => setHasAttachment(true)}
            className={"h-4 w-4 " + (theme === "dark" ? "accent-white" : "accent-black")}
          />
          <span className={theme === "dark" ? "text-white/80 text-sm" : "text-neutral-800 text-sm"}>دارد</span>
        </label>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="radio"
            name={"hasAttachment_" + formKind}
            checked={hasAttachment === false}
            onChange={() => setHasAttachment(false)}
            className={"h-4 w-4 " + (theme === "dark" ? "accent-white" : "accent-black")}
          />
          <span className={theme === "dark" ? "text-white/80 text-sm" : "text-neutral-800 text-sm"}>ندارد</span>
        </label>
      </div>
    </div>

    {/* واحد (برای داخلی) */}
    <div className="md:col-span-3">
      <div className={labelCls}>واحد</div>
      <select value={internalUnitId} onChange={(e) => setInternalUnitId(e.target.value)} className={inputCls}>
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
    </div>
  </div>
) : (
  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
    {/* موضوع */}
    <div className="md:col-span-10">
      <div className={labelCls}>موضوع</div>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} type="text" />
    </div>

    {/* ضمیمه (کنار موضوع) */}
    <div className="md:col-span-2 flex flex-col items-center">
      <div className={labelCls}>ضمیمه</div>
      <div className="flex items-center justify-center gap-4 mt-0 h-10">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="radio"
            name="hasAttachment"
            checked={hasAttachment === true}
            onChange={() => setHasAttachment(true)}
            className={"h-4 w-4 " + (theme === "dark" ? "accent-white" : "accent-black")}
          />
          <span className={theme === "dark" ? "text-white/80 text-sm" : "text-neutral-800 text-sm"}>دارد</span>
        </label>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="radio"
            name="hasAttachment"
            checked={hasAttachment === false}
            onChange={() => setHasAttachment(false)}
            className={"h-4 w-4 " + (theme === "dark" ? "accent-white" : "accent-black")}
          />
          <span className={theme === "dark" ? "text-white/80 text-sm" : "text-neutral-800 text-sm"}>ندارد</span>
        </label>
      </div>
    </div>
  </div>
)}

{/* ضمیمه (رادیویی دارد/ندارد) + عنوان ضمیمه + بازگشت/پیرو کنار عنوان — بدون شرط نمایش */}
<div>
    {/* ردیف کنارهم: ضمیمه + عنوان ضمیمه + بازگشت به (+ پیرو در صادره) */}
<div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-1 items-start">

{/* نامه‌های مرتبط (فقط آیکن) */}
<div className={"md:col-span-10 min-w-0"}>
  <div className={labelCls}>اسناد مرتبط</div>

  <button
    type="button"
    onClick={openRelatedPicker}
    className={
      "h-10 w-10 shrink-0 rounded-xl border transition inline-flex items-center justify-center " +
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

  {/* نمایش انتخاب‌ها: با "و" جدا + کلیک برای پیش‌نمایش */}
  {relatedSelectedIds.length > 0 && (
    <div className="mt-2 flex flex-wrap items-center gap-1 text-sm">
      {relatedSelectedIds.map((id, i) => {
        const l = letterById.get(String(id));
        const no = String(letterNoOf(l) || "").trim() || String(id);

        return (
          <span key={String(id)} className="inline-flex items-center gap-1">
            {i > 0 && (
              <span className={theme === "dark" ? "text-white/60" : "text-neutral-600"}>
                و
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                if (l) openView(l);
              }}
              className={
                "underline underline-offset-4 font-semibold " +
                (theme === "dark"
                  ? "text-white hover:text-white/90"
                  : "text-neutral-900 hover:text-black")
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
                (theme === "dark"
                  ? "text-white/60 hover:text-white"
                  : "text-neutral-500 hover:text-neutral-900")
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
            const qRaw = String(relatedPickQuery || "").trim();
            const qEn = toEnDigits(qRaw);

            const list = (Array.isArray(myLettersSorted) ? myLettersSorted : []).filter((l) => {
              if (!qEn) return true;
              const id = toEnDigits(String(letterIdOf(l) || ""));
              const no = toEnDigits(String(letterNoOf(l) || ""));
              const sub = toEnDigits(String(subjectOf(l) || ""));
              const org = toEnDigits(String(orgOf(l) || ""));
              const f2 = toEnDigits(String(fromToOf(l) || ""));
              return (
                id.includes(qEn) ||
                no.includes(qEn) ||
                sub.includes(qEn) ||
                org.includes(qEn) ||
                f2.includes(qEn)
              );
            });

            if (!list.length) {
              return (
                <div className={theme === "dark" ? "text-white/60 text-sm p-4" : "text-neutral-600 text-sm p-4"}>
                  موردی پیدا نشد.
                </div>
              );
            }

            return list.map((l) => {
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
                    <div
                      className={
                        "text-xs truncate mt-0.5 " +
                        (theme === "dark" ? "text-white/60" : "text-neutral-600")
                      }
                    >
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
            });
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


{/* ✅ بارگذاری فایل (برای هر سه تب) — مستقل از ضمیمه */}
<div className="md:col-span-2 flex flex-col items-end">
  <div className={labelCls}> </div> {/* برای هم‌تراز شدن با لیبل "اسناد مرتبط" */}
  <button
    type="button"
    onClick={() => openUpload(formKind)}
className={uploadTriggerCls + " w-full md:w-auto whitespace-nowrap"}
    title={formKind === "internal" ? "بارگذاری سند" : formKind === "outgoing" ? "بارگذاری اسناد " : "بارگذاری اسناد "}
  >
    <img
      src="/images/icons/upload.svg"
      alt=""
      className={"w-5 h-5 " + (theme === "dark" ? "invert" : "")}
    />
    <span>
      {formKind === "internal" ? "بارگذاری سند" : formKind === "outgoing" ? "بارگذاری اسناد " : "بارگذاری اسناد"}
    </span>

    {Array.isArray(docFilesByType?.[formKind]) && docFilesByType[formKind].length > 0 ? (
      <span className="mr-2 text-xs opacity-80">
        ({toFaDigits(docFilesByType[formKind].length)})
      </span>
    ) : null}
  </button>
</div>



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
            value={formKind === "incoming" ? incomingSecretariatNo : formKind === "outgoing" ? outgoingSecretariatNo : internalSecretariatNo}
            onChange={(e) => {
              const v = e.target.value;
              if (formKind === "incoming") setIncomingSecretariatNo(v);
              else if (formKind === "outgoing") setOutgoingSecretariatNo(v);
              else setInternalSecretariatNo(v);
            }}
            className={inputCls}
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
  <div className={labelCls}>برچسب ها</div>

  <div className="w-full min-w-0 flex flex-wrap items-center gap-2">

    {(() => {
      const scope = "letters";
      const selectedIds = formSelectedTagIds;
      const pool = Array.isArray(tagsByScope?.[scope]) ? tagsByScope[scope] : [];
      const selSet = new Set((Array.isArray(selectedIds) ? selectedIds : []).map(String));
      const selectedObjs = pool.filter((t) => selSet.has(String(t?.id)));
      const latest = pool
        .slice()
        .sort((a, b) => Number(b?.id) - Number(a?.id))
        .filter((t) => !selSet.has(String(t?.id)))
        .slice(0, 14);

      const merged = [...selectedObjs, ...latest];
      const seen = new Set();

      return merged
        .filter((t) => {
          const id = String(t?.id ?? "").trim();
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        })
        .map((t) => {
          const id = String(t?.id);
          const label = tagLabelOf(t);
          const active = selSet.has(id);

          return (
            <button
              key={id}
              type="button"
              onClick={() => toggleTag(formKind, id)}
              className={(active ? selectedTagChipCls : chipCls) + " shrink-0"}
              title={label}
              aria-label={label}
            >
              <span className="truncate max-w-[220px]">{label}</span>
            </button>
          );
        });
    })()}

    {/* افزودن برچسب */}
    <button
      type="button"
      onClick={() => openTagPicker("form")}
      className={
        "h-10 w-10 shrink-0 rounded-full border transition inline-flex items-center justify-center " +
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
</div>

      {/* ✅ دکمه ارسال هم داخل همین کادر قرار گرفت */}
      <div className="flex items-center justify-end pt-2">
        <button type="button" onClick={() => submitLetter(formKind)} className={sendBtnCls} title="ارسال" aria-label="ارسال">
          <img src="/images/icons/check.svg" alt="" className={sendIconCls} />
        </button>
      </div>
    </div>
  </div>
) : null}

          </div>

{docClassOtherOpen &&
  createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setDocClassOtherOpen(false)}
      />
      <div
        className={
          "relative w-full max-w-md rounded-2xl border p-4 shadow-xl " +
          (theme === "dark"
            ? "border-white/10 bg-neutral-900 text-white"
            : "border-black/10 bg-white text-neutral-900")
        }
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="font-semibold text-sm">افزودن مورد جدید (سایر)</div>

          <button
            type="button"
            onClick={() => setDocClassOtherOpen(false)}
            className={
              "h-9 w-9 rounded-xl border flex items-center justify-center transition " +
              (theme === "dark"
                ? "border-white/10 hover:bg-white/10"
                : "border-black/10 hover:bg-black/[0.04]")
            }
            aria-label="بستن"
            title="بستن"
          >
            <img src="/images/icons/bastan.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
          </button>
        </div>

        <div className={labelCls}>عنوان</div>
        <input
          value={docClassOtherText}
          onChange={(e) => setDocClassOtherText(e.target.value)}
          className={inputCls}
          type="text"
          placeholder="مثلاً: گزارش بازدید کارگاهی"
          autoFocus
        />

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setDocClassOtherOpen(false)}
            className={
              "h-10 px-4 rounded-xl border transition " +
              (theme === "dark" ? "border-white/15 hover:bg-white/10" : "border-black/10 hover:bg-black/[0.04]")
            }
          >
            انصراف
          </button>

          <button
            type="button"
            onClick={() => {
              const v = String(docClassOtherText || "").trim();
              if (!v) return;

              setDocClassExtras((prev) => {
                const arr = Array.isArray(prev) ? prev : [];
                if (arr.some((x) => String(x).trim() === v)) return arr;
                return [v, ...arr]; // جدیدها بالا
              });

              setCategory(v);
              setDocClassOtherOpen(false);
            }}
            className={
              "h-10 px-4 rounded-xl transition " +
              (theme === "dark" ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90")
            }
          >
            افزودن
          </button>
        </div>
      </div>
    </div>,
    document.body
  )}


          {/* Table */}
          <div className="mt-5">
            <div className={tableWrapCls}>
              <div className="relative h-[55vh] overflow-auto">
                <table className="w-full text-sm [&_th]:text-center [&_td]:text-center [&_th]:py-0.5 [&_td]:py-0.5" dir="rtl">
  <thead>
    <tr className={theadRowCls}>
      <th className="w-12 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-40 bg-neutral-200 dark:bg-white/10">
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

      <th className="w-24 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">
        شماره
      </th>

      <th className="w-24 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">
        تاریخ
      </th>

      <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">
        موضوع
      </th>

      <th className="w-36 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">
        از/به
      </th>

      <th className="w-44 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">
        شرکت/سازمان
      </th>

      <th className="w-28 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">
        اقدامات
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
        const kind = letterKindOf(l);
        const isOutgoing = kind === "outgoing";
        const isIncoming = kind === "incoming";
        const isInternal = kind === "internal";
        const isLast = idx === pageItems.length - 1;
        const divider = isLast ? "" : rowDividerCls;

        const isConf = isConfidentialLetter(l);

        const rowBg = isOutgoing
          ? theme === "dark"
            ? "bg-[#8BAE66]/15 hover:bg-[#8BAE66]/20"
            : "bg-[#8BAE66]/[0.06] hover:bg-[#8BAE66]/[0.09]"
          : isIncoming
          ? theme === "dark"
            ? "bg-[#0046FF]/15 hover:bg-[#0046FF]/20"
            : "bg-[#0046FF]/[0.06] hover:bg-[#0046FF]/[0.09]"
          : isInternal
          ? theme === "dark"
            ? "bg-orange-500/10 hover:bg-orange-500/15"
            : "bg-orange-50 hover:bg-orange-100/70"
          : theme === "dark"
          ? "bg-white/5 hover:bg-white/10"
          : "bg-black/[0.02] hover:bg-black/[0.04]";

        return (  
          <tr
            key={id}
            className={
              rowBg +
              " transition-colors" +
              (isConf
                ? " font-semibold [&_td]:!text-red-600 dark:[&_td]:!text-red-400"
                : "")
            }
          >

            <td className={"px-3 " + divider}>
              <input
                type="checkbox"
                className="w-4 h-4 accent-black dark:accent-neutral-200"
                checked={selectedIds.has(id)}
                onChange={() => toggleRowSelect(id)}
                aria-label="انتخاب"
                title="انتخاب"
              />
            </td>

            <td className={"px-3 " + divider}>
              <button
                type="button"
                onClick={() => openView(l)}
                className={
                  "mx-auto inline-flex items-center justify-center gap-2 font-semibold underline-offset-4 hover:underline transition " +
                  (isConf
                    ? "text-red-600 dark:text-red-400"
                    : theme === "dark"
                    ? "text-white"
                    : "text-neutral-900")
                }
                title="نمایش"
                aria-label="نمایش"
              >
                {letterNoOf(l) || "—"}
              </button>
            </td>

            <td className={"px-3 " + divider}>{letterDateOf(l) ? toFaDigits(letterDateOf(l)) : "—"}</td>

            <td className={"px-3 " + divider}>
              <span className="block truncate mx-auto">{subjectOf(l) || "—"}</span>
            </td>

            <td className={"px-3 " + divider}>
              <span className="block truncate mx-auto">{fromToOf(l)}</span>
            </td>

            <td className={"px-3 " + divider}>
              <span className="block truncate mx-auto">{orgOf(l) || "—"}</span>
            </td>

            <td className={"px-3 " + divider}>
              <div className="inline-flex items-center justify-center gap-2">
                <button type="button" onClick={() => openView(l)} className={iconBtnCls} aria-label="نمایش" title="نمایش">
                  <img src="/images/icons/namayeshname.svg" alt="" className="w-5 h-5 dark:invert" />
                </button>

                <button type="button" onClick={() => startEdit(l)} className={iconBtnCls} aria-label="ویرایش" title="ویرایش">
                  <img src="/images/icons/pencil.svg" alt="" className="w-5 h-5 dark:invert" />
                </button>

                <button type="button" onClick={() => deleteLetter(id)} className={iconBtnCls} aria-label="حذف" title="حذف">
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
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

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-black/70 dark:text-neutral-400">تعداد در هر صفحه:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value) || 10);
                        setPage(0);
                      }}
                      className={
                        "h-9 px-2 rounded-lg border outline-none " +
                        (theme === "dark" ? "border-white/15 bg-white/5 text-white" : "border-black/10 bg-white text-black")
                      }
                    >
                      {[10, 25, 100].map((n) => (
                        <option key={n} value={n}>
                          {toFaDigits(n)}
                        </option>
                      ))}
                    </select>
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
                              label="نوع"
                              value={
                                viewLetter
                                  ? (() => {
                                      const k = letterKindOf(viewLetter);
                                      if (k === "outgoing") return "صادره";
                                      if (k === "incoming") return "وارده";
                                      return "داخلی";
                                    })()
                                  : ""
                              }
                            />
                            <InfoRow label="دسته بندی" value={viewLetter ? categoryLabel(categoryOf(viewLetter)) : ""} />

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

                            <div className="py-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  <div>
    <div className={labelCls}>بازگشت</div>
    <div className="space-y-2">
      {(Array.isArray(returnToIds) ? returnToIds : [""]).map((val, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            value={val}
            onChange={(e) => {
              const v = e.target.value;
              setReturnToIds((prev) => {
                const arr = Array.isArray(prev) ? [...prev] : [""];
                arr[idx] = v;
                return arr;
              });
            }}
            className={inputCls}
            type="text"
            placeholder="شماره/کد بازگشت"
          />

          <button
            type="button"
            onClick={() => setReturnToIds((prev) => [...(Array.isArray(prev) ? prev : [""]), ""])}
            className={iconBtnCls}
            aria-label="افزودن"
            title="افزودن"
          >
            <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5 dark:invert" />
          </button>

          {idx > 0 && (
            <button
              type="button"
              onClick={() =>
                setReturnToIds((prev) => (Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : [""]))
              }
              className={iconBtnCls}
              aria-label="حذف"
              title="حذف"
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
          )}
        </div>
      ))}
    </div>
  </div>

  <div>
    <div className={labelCls}>پیرو</div>
    <div className="space-y-2">
      {(Array.isArray(piroIds) ? piroIds : [""]).map((val, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            value={val}
            onChange={(e) => {
              const v = e.target.value;
              setPiroIds((prev) => {
                const arr = Array.isArray(prev) ? [...prev] : [""];
                arr[idx] = v;
                return arr;
              });
            }}
            className={inputCls}
            type="text"
            placeholder="شماره/کد پیرو"
          />

          <button
            type="button"
            onClick={() => setPiroIds((prev) => [...(Array.isArray(prev) ? prev : [""]), ""])}
            className={iconBtnCls}
            aria-label="افزودن"
            title="افزودن"
          >
            <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5 dark:invert" />
          </button>

          {idx > 0 && (
            <button
              type="button"
              onClick={() => setPiroIds((prev) => (Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : [""]))}
              className={iconBtnCls}
              aria-label="حذف"
              title="حذف"
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
          )}
        </div>
      ))}
    </div>
  </div>
</div>

                            </div>

                            <InfoRow
                              label="از / به"
                              value={
                                viewLetter
                                  ? (() => {
                                      const a = String(viewLetter?.from_name ?? viewLetter?.fromName ?? viewLetter?.from ?? "").trim();
                                      const b = String(viewLetter?.to_name ?? viewLetter?.toName ?? viewLetter?.to ?? "").trim();
                                      const s = `${a}${a && b ? " / " : ""}${b}`.trim();
                                      return s || "—";
                                    })()
                                  : "—"
                              }
                            />
                            <InfoRow label="شرکت/سازمان" value={viewLetter ? String(viewLetter?.org_name ?? viewLetter?.orgName ?? viewLetter?.org ?? "") : ""} />
                            <InfoRow label="موضوع" value={viewLetter ? String(subjectOf(viewLetter) || "") : ""} />

                            <InfoRow label="ضمیمه" value={viewHasAttachment ? "دارد" : "ندارد"} />
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
                                          return it ? String(it?.letter_no || sid) : sid;
                                        });
                                      return labels.join("، ");
                                    })()
                                  : ""
                              }
                            />

                            <InfoRow
                              label="پیرو"
                              value={
                                viewLetter
                                  ? (() => {
                                      const ids = Array.isArray(viewLetter?.piro_ids)
                                        ? viewLetter.piro_ids
                                        : Array.isArray(viewLetter?.piroIds)
                                        ? viewLetter.piroIds
                                        : [];
                                      if (!ids.length) return "—";
                                      const map = new Map((Array.isArray(myLetters) ? myLetters : []).map((x) => [String(letterIdOf(x)), x]));
                                      const labels = ids
                                        .map((x) => String(x))
                                        .filter(Boolean)
                                        .map((sid) => {
                                          const it = map.get(sid);
                                          return it ? String(it?.letter_no || sid) : sid;
                                        });
                                      return labels.join("، ");
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
                                  <iframe key={currentViewUrl} title="preview" src={currentViewUrl} className="w-full h-full" />
                                ) : isImageView ? (
                                  <img key={currentViewUrl} src={currentViewUrl} alt="" className="w-full h-full object-contain bg-transparent" />
                                ) : (
                                  <div className="h-full w-full grid place-items-center p-6">
                                    <div className={theme === "dark" ? "text-white/70 text-sm" : "text-neutral-700 text-sm"}>امکان پیش نمایش این نوع فایل نیست.</div>
                                  </div>
                                )
                              ) : (
                                <div className="h-full w-full grid place-items-center p-6">
                                  <div className={theme === "dark" ? "text-white/60 text-sm" : "text-neutral-600 text-sm"}>فایلی برای پیش نمایش موجود نیست.</div>
                                </div>
                              )}
                            </div>

                            <div className="mt-2 flex flex-col gap-1">
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
                                title="دانلود فایل"
                                aria-label="دانلود فایل"
                              >
                                <img src="/images/icons/download.svg" alt="" className={"w-5 h-5 " + (theme === "dark" ? "" : "invert")} />
                                <span className="text-sm font-semibold">دانلود فایل</span>
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
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={
            "w-[min(720px,calc(100vw-24px))] rounded-2xl border shadow-xl overflow-hidden " +
            (theme === "dark" ? "border-white/10 bg-neutral-900 text-white" : "border-black/10 bg-white text-neutral-900")
          }
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 flex items-center justify-between">
            <div className="font-bold text-sm">
              بارگذاری نامه{" "}
              {uploadFor === "incoming" ? "(وارده)" : uploadFor === "outgoing" ? "(صادره)" : "(داخلی)"}
            </div>
            <button
              type="button"
              onClick={closeUpload}
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

          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: reuse uploaded */}
            <div>
              <div className={labelCls}>فایل‌های آپلود شده</div>

              <input
                value={pickSearch}
                onChange={(e) => setPickSearch(e.target.value)}
                className={inputCls}
                type="text"
                placeholder="جستجو بر اساس نام فایل..."
              />

              <div className={"mt-2 rounded-2xl border overflow-hidden " + (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-white")}>
                <div className={"px-3 py-2 text-xs font-semibold border-b " + (theme === "dark" ? "border-white/10 text-white/80" : "border-black/10 text-neutral-700")}>
                  همه فایل‌ها (برای استفاده مجدد)
                </div>

                <div className="p-3 space-y-2 max-h-[360px] overflow-auto">
                  {Array.isArray(filteredUploadedAttachments) && filteredUploadedAttachments.length > 0 ? (
                    filteredUploadedAttachments.map((a, i) => {
                      const url = attachmentUrlOf(a);
                      const name = attachmentNameOf(a) || a?.name || `فایل ${i + 1}`;
                      const already = currentDocFiles.some((x) => String(x?.url || "") === String(url));
                      const hintNo = String(a?._letterNo || "").trim();

                      return (
                        <div
                          key={String(i) + "_" + String(url)}
                          className={
                            "rounded-xl border px-3 py-2 flex items-center justify-between gap-3 " +
                            (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-white")
                          }
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-semibold truncate">{name}</div>
                            <div className={theme === "dark" ? "text-white/60 text-[11px] mt-1" : "text-neutral-600 text-[11px] mt-1"}>
                              {url ? "آدرس فایل موجود است" : "—"}
                              {hintNo ? <span> — نامه: {toFaDigits(hintNo)}</span> : null}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">

                            <a
                              href={url || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className={
                                "h-9 px-3 rounded-xl border transition text-sm inline-flex items-center justify-center " +
                                (url
                                  ? theme === "dark"
                                    ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
                                    : "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]"
                                  : theme === "dark"
                                  ? "border-white/10 bg-white/5 text-white/40 pointer-events-none"
                                  : "border-black/10 bg-white text-black/40 pointer-events-none")
                              }
                              title="باز کردن"
                            >
                              باز کردن
                            </a>

                            <button
                              type="button"
                              onClick={() => addExistingAttachmentToCurrent(uploadFor, a)}
                              disabled={already}
                              className={
                                "h-9 px-3 rounded-xl border transition text-sm inline-flex items-center justify-center " +
                                (already
                                  ? theme === "dark"
                                    ? "border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
                                    : "border-black/10 bg-black/[0.03] text-black/40 cursor-not-allowed"
                                  : theme === "dark"
                                  ? "border-white/15 bg-white text-black hover:bg-white/90"
                                  : "border-black/15 bg-black text-white hover:bg-black/90")
                              }
                              title={already ? "اضافه شده" : "افزودن"}
                            >
                              {already ? "اضافه شد" : "افزودن"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-black/60 dark:text-white/50 text-sm">فایلی یافت نشد.</div>
                  )}
                </div>
              </div>
            </div>


                  {/* Right: pick new + selected list */}
                  <div>
                    <div className={labelCls}>فایل‌های انتخاب‌شده</div>

                    <div className={"rounded-2xl border overflow-hidden " + (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-white")}>
                      <div className={"px-3 py-2 text-xs font-semibold border-b " + (theme === "dark" ? "border-white/10 text-white/80" : "border-black/10 text-neutral-700")}>
                        {uploadFor === "incoming" ? "وارده" : uploadFor === "outgoing" ? "صادره" : "داخلی"}
                      </div>

                      <div className="p-3 space-y-2">
                        {currentDocFiles.length === 0 ? (
                          <div className="py-6 text-center text-black/60 dark:text-white/50 text-sm">فایلی انتخاب نشده است.</div>
                        ) : (
                          currentDocFiles.map((f) => (
                            <div
                              key={f.id}
                              className={
                                "rounded-xl border px-3 py-2 flex items-center justify-between gap-3 " +
                                (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-white")
                              }
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-[13px] font-semibold truncate">{f.name}</div>
                                <div className={theme === "dark" ? "text-white/60 text-[11px] mt-1" : "text-neutral-600 text-[11px] mt-1"}>
                                  {formatBytes(f.size)} {f.url ? "— الصاق شده" : f.status === "uploading" ? `— ${toFaDigits(f.progress)}٪` : ""}
                                </div>

                                {f.status === "error" && f.error ? (
                                  <div className="text-[11px] mt-1 text-red-500">{f.error}</div>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-2">
                                {f.url ? (
                                  <a
                                    href={f.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={
                                      "h-9 px-3 rounded-xl border transition text-sm inline-flex items-center justify-center " +
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
                            یا با دکمه زیر انتخاب کنید (تصویر / PDF)
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
                              <img src="/images/icons/upload.svg" alt="" className={"w-5 h-5 " + (theme === "dark" ? "" : "invert")} />
                              انتخاب فایل
                            </button>
                            <input
                              ref={uploadInputRef}
                              type="file"
                              multiple
                              accept="image/*,application/pdf"
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
                          <button
                            type="button"
                            onClick={closeUpload}
                            className={
                              "h-10 px-4 rounded-xl border transition " +
                              (theme === "dark" ? "border-white/15 hover:bg-white/10" : "border-black/10 hover:bg-black/[0.04]")
                            }
                          >
                            بستن
                          </button>
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