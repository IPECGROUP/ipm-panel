// src/pages/LettersPage.jsx
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../components/AuthProvider";
import { isMainAdminUser } from "../utils/auth";

const TAB_ACTIVE_BG = {
  incoming: "#0046FF",
  outgoing: "#8BAE66",
  internal: "#FF8040",
};

// ==== MAIN ADMIN (only marandi / 1234) ====
const MAIN_ADMIN_USER = "marandi";
const MAIN_ADMIN_PASS = "1234";

const ADMIN_FLAG_KEY = "main_admin_ok";

const basicAuthHeader = () => {
  const token = btoa(`${MAIN_ADMIN_USER}:${MAIN_ADMIN_PASS}`);
  return `Basic ${token}`;
};

function askMainAdminEnable(setIsMainAdmin) {
  const u = window.prompt("Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒ Ø§Ø¯Ù…ÛŒÙ† Ø§ØµÙ„ÛŒ:");
  if (String(u || "").trim() !== MAIN_ADMIN_USER) {
    alert("Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒ Ø§Ø´ØªØ¨Ø§Ù‡ Ø§Ø³Øª.");
    return;
  }

  const p = window.prompt("Ø±Ù…Ø² Ø§Ø¯Ù…ÛŒÙ† Ø§ØµÙ„ÛŒ:");
  if (String(p || "").trim() !== MAIN_ADMIN_PASS) {
    alert("Ø±Ù…Ø² Ø§Ø´ØªØ¨Ø§Ù‡ Ø§Ø³Øª.");
    return;
  }

  localStorage.setItem(ADMIN_FLAG_KEY, "1");
  setIsMainAdmin(true);
}

function disableMainAdmin(setIsMainAdmin) {
  localStorage.removeItem(ADMIN_FLAG_KEY);
  setIsMainAdmin(false);
}


const LETTERS_CACHE_KEY = "letters_mine_cache_v1";
const LETTERS_CACHE_TTL = 1000 * 60 * 10; // 10 Ø¯Ù‚ÛŒÙ‚Ù‡

const TABS = [
  { id: "all", label: "Ù‡Ù…Ù‡" },
  { id: "incoming", label: "ÙˆØ§Ø±Ø¯Ù‡", icon: "/images/icons/varede.svg" },
  { id: "outgoing", label: "ØµØ§Ø¯Ø±Ù‡", icon: "/images/icons/sadere.svg" },
  { id: "internal", label: "Ø¯Ø§Ø®Ù„ÛŒ", icon: "/images/icons/dakheli.svg" },
];

const FILTER_ACTIVE_SCOPE = "letters_filter_active";

const PERSIAN_MONTHS = [
  "ÙØ±ÙˆØ±Ø¯ÛŒÙ†",
  "Ø§Ø±Ø¯ÛŒØ¨Ù‡Ø´Øª",
  "Ø®Ø±Ø¯Ø§Ø¯",
  "ØªÛŒØ±",
  "Ù…Ø±Ø¯Ø§Ø¯",
  "Ø´Ù‡Ø±ÛŒÙˆØ±",
  "Ù…Ù‡Ø±",
  "Ø¢Ø¨Ø§Ù†",
  "Ø¢Ø°Ø±",
  "Ø¯ÛŒ",
  "Ø¨Ù‡Ù…Ù†",
  "Ø§Ø³ÙÙ†Ø¯",
];

function toFaDigits(s) {
  return String(s || "").replace(/[0-9]/g, (d) => "Û°Û±Û²Û³Û´ÛµÛ¶Û·Û¸Û¹"[Number(d)]);
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
              <div className="font-semibold text-sm">Ø§Ù†ØªØ®Ø§Ø¨ ØªØ§Ø±ÛŒØ®</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={
                  "h-9 w-9 rounded-xl border flex items-center justify-center transition " +
                  (theme === "dark" ? "border-white/10 hover:bg-white/10" : "border-black/10 hover:bg-black/[0.04]")
                }
                aria-label="Ø¨Ø³ØªÙ†"
                title="Ø¨Ø³ØªÙ†"
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
                <div className={theme === "dark" ? "text-white/70 text-xs mb-1" : "text-neutral-600 text-xs mb-1"}>Ø±ÙˆØ²</div>
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
                <div className={theme === "dark" ? "text-white/70 text-xs mb-1" : "text-neutral-600 text-xs mb-1"}>Ù…Ø§Ù‡</div>
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
                <div className={theme === "dark" ? "text-white/70 text-xs mb-1" : "text-neutral-600 text-xs mb-1"}>Ø³Ø§Ù„</div>
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
                Ù¾ÛŒØ´ Ù†Ù…Ø§ÛŒØ´: <span className="font-semibold">{toFaDigits(preview)}</span>
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
                  ØªØ§ÛŒÛŒØ¯
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={
                    "h-10 px-4 rounded-xl border transition " +
                    (theme === "dark" ? "border-white/15 hover:bg-white/10" : "border-black/10 hover:bg-black/[0.04]")
                  }
                >
                  Ø¨Ø³ØªÙ†
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

// =====================
// Auto Code Helpers (TOP OF FILE) â€” Ø®Ø§Ø±Ø¬ Ø§Ø² Ú©Ø§Ù…Ù¾ÙˆÙ†Ù†Øª
// =====================

// ØªØ¨Ø¯ÛŒÙ„ Ø±Ù‚Ù… ÙØ§Ø±Ø³ÛŒ/Ø¹Ø±Ø¨ÛŒ Ø¨Ù‡ Ø§Ù†Ú¯Ù„ÛŒØ³ÛŒ
const toEnDigits = (s) =>
  String(s ?? "")
    .replace(/[Û°-Û¹]/g, (d) => "0123456789"["Û°Û±Û²Û³Û´ÛµÛ¶Û·Û¸Û¹".indexOf(d)])
    .replace(/[Ù -Ù©]/g, (d) => "0123456789"["Ù Ù¡Ù¢Ù£Ù¤Ù¥Ù¦Ù§Ù¨Ù©".indexOf(d)]);

const pad5 = (n) => String(Number(n) || 0).padStart(5, "0");

// Ú¯Ø±ÙØªÙ† Û² Ø±Ù‚Ù… Ø¢Ø®Ø± Ø³Ø§Ù„ Ø´Ù…Ø³ÛŒ (Ù…Ø«Ù„Ø§Ù‹ 1404 -> "04")
const getJalaliYY = (date = new Date()) => {
  const y = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(date);
  const en = toEnDigits(y);
  return en.slice(-2);
};

// Ù¾ÛŒØ¯Ø§ Ú©Ø±Ø¯Ù† Ú©Ø¯ Ù¾Ø±ÙˆÚ˜Ù‡ (Ø§ÙˆÙ„ __baseCode Ø¨Ø¹Ø¯ code)
const getProjectCode = (projectId, projectsTopOnly) => {
  const pid = String(projectId || "").trim();
  if (!pid) return "";
  const p = (Array.isArray(projectsTopOnly) ? projectsTopOnly : []).find((x) => String(x?.id) === pid);
  return String(p?.__baseCode ?? p?.code ?? "").trim();
};

// Ù¾Ø§Ø±Ø³ Ú©Ø±Ø¯Ù† Ú©Ø¯ 04/156/10403
const parseAutoCode = (s) => {
  const m = String(s || "").trim().match(/^(\d{2})\/([^/]+)\/(\d{5})$/);
  if (!m) return null;
  return { yy: m[1], pcode: m[2], seq: Number(m[3]) };
};

// =====================
// Auto Code Generator â€” Ø®Ø§Ø±Ø¬ Ø§Ø² Ú©Ø§Ù…Ù¾ÙˆÙ†Ù†Øª
// =====================
const computeNextAutoCode = ({ kind, projectId, letters, projectsTopOnly }) => {
  const yy = getJalaliYY(new Date());
  const pcode = getProjectCode(projectId, projectsTopOnly);
  if (!pcode) return ""; // ØªØ§ Ù¾Ø±ÙˆÚ˜Ù‡ Ø§Ù†ØªØ®Ø§Ø¨ Ù†Ø´Ø¯Ù‡ØŒ Ú©Ø¯ Ù†Ø³Ø§Ø²

  const startByYear = (yy === "04" ? 10521 : 10000);

  let maxSeq = 0;

// âœ… Ø§ÛŒÙ† ØªÚ©Ù‡ Ø¬Ø¯ÛŒØ¯: Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† forEach Ù‚Ø¨Ù„ÛŒ
(Array.isArray(letters) ? letters : []).forEach((l) => {
  // âœ… Ø´Ù…Ø§Ø±Ù‡ Ù…Ø´ØªØ±Ú© Ø¨ÛŒÙ† Ù‡Ù…Ù‡ ØªØ¨â€ŒÙ‡Ø§:
  // Ù‡Ù… letter_no Ùˆ Ù‡Ù… secretariat_no Ø±Ùˆ Ø¨Ø±Ø±Ø³ÛŒ Ú©Ù†
  const rawCandidates = [
    l?.letter_no,
    l?.letterNo,
    l?.secretariat_no,
    l?.secretariatNo,
  ].filter((x) => String(x ?? "").trim());

  if (!rawCandidates.length) return;

  for (const rawNo of rawCandidates) {
    let parsed = parseAutoCode(rawNo);

    // âœ… fallback: Ø§Ú¯Ø± ÙÙ‚Ø· 10700 Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯Ù‡ Ø¨ÙˆØ¯ ÛŒØ§ Ø¢Ø®Ø±Ø´ 5 Ø±Ù‚Ù… Ø¯Ø§Ø´Øª
    if (!parsed) {
      const v = toEnDigits(String(rawNo ?? "")).trim();
      const m = v.match(/^(\d{2})\/(\d{3})\/(\d{5})$/);
      if (m) {
        parsed = { yy: m[1], pcode: m[2], seq: Number(m[3]) };
      }
    }

    if (!parsed) continue;

    if (parsed.yy !== yy) continue;
    if (Number.isFinite(parsed.seq) && parsed.seq > maxSeq) maxSeq = parsed.seq;
  }
});

// âœ… Ø§ÛŒÙ† Ø®Ø· Ù¾Ø§ÛŒÛŒÙ† Ù‡Ù… Ø¨Ø§ÛŒØ¯ Ù‡Ù…ÙˆÙ† Ù¾Ø§ÛŒÛŒÙ†Ù computeNextAutoCode Ø¨Ø§Ø´Ù‡
const nextSeq = maxSeq >= startByYear ? (maxSeq + 1) : startByYear;
return `${yy}/${pcode}/${pad5(nextSeq)}`;
};
function makeProgressUpdater(setDocFilesFor, kind, fileId) {
  let lastP = -1;
  let lastT = 0;

  return (p) => {
    const now = Date.now();
    // ÙÙ‚Ø· ÙˆÙ‚ØªÛŒ ØªØºÛŒÛŒØ± Ù…Ø¹Ù†ÛŒâ€ŒØ¯Ø§Ø± Ø¯Ø§Ø´Øª ÛŒØ§ Ø²Ù…Ø§Ù† Ú©Ø§ÙÛŒ Ú¯Ø°Ø´ØªÙ‡ Ø¨ÙˆØ¯
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

async function uploadQueueInBackground({
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
            ? { ...x, status: "error", error: e?.message || "Ø®Ø·Ø§ Ø¯Ø± Ø¢Ù¾Ù„ÙˆØ¯ ÙØ§ÛŒÙ„." }
            : x
        )
      );
    }
  });

  // Ù‡Ù…Ø²Ù…Ø§Ù†ÛŒ 2 ØªØ§ (Ù…ÛŒâ€ŒØªÙˆÙ†ÛŒ 3 Ù‡Ù… Ø¨Ø°Ø§Ø±ÛŒ)
  await runWithLimit(tasks, 2);
}

function FieldWrap({ children }) {
  return <div className="relative pb-4">{children}</div>;
}

export default function LettersPage() {

// âœ… Validation (per tab)
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

const [isSubmitting, setIsSubmitting] = useState(false);

const fieldHasError = (kind, key) =>
  !!(submitTriedByKind?.[kind] && errorsByKind?.[kind]?.[key]);

const inputWithError = (baseCls, kind, key) =>
  baseCls + (fieldHasError(kind, key) ? " !border-red-500 !ring-1 !ring-red-500" : "");

// âœ… wrapper Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ†Ú©Ù‡ Ø§Ø±ÙˆØ± absolute Ø¨Ø´Ù‡ Ùˆ ÙÛŒÙ„Ø¯ Ù‡Ù„ Ø¯Ø§Ø¯Ù‡ Ù†Ø´Ù‡

// âœ… Ø§Ø±ÙˆØ±: Ø²ÛŒØ± ÙÛŒÙ„Ø¯ØŒ ÙˆÙ„ÛŒ absolute (Ù¾Ø³ Ù‡Ù„ Ù†Ù…ÛŒØ¯Ù‡)
const ErrorTextAbs = ({ kind, k }) =>
  fieldHasError(kind, k) ? (
    <div className="absolute right-0 bottom-0 text-[10px] text-red-500 leading-3">
      {errorsByKind?.[kind]?.[k]}
    </div>
  ) : null;

// âœ… ÙˆÙ‚ØªÛŒ Ú©Ø§Ø±Ø¨Ø± ØªØ§ÛŒÙ¾ Ú©Ø±Ø¯ØŒ Ø§Ø±ÙˆØ± Ù‡Ù…Ø§Ù† ÙÛŒÙ„Ø¯ Ø¯Ø± Ù‡Ù…Ø§Ù† ØªØ¨ Ù¾Ø§Ú© Ø´ÙˆØ¯
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


// âœ… Ø§ÛŒÙ†Ø¬Ø§ ØªØ¹ÛŒÛŒÙ† Ú©Ù† Ú©Ø¯ÙˆÙ… ÙÛŒÙ„Ø¯Ù‡Ø§ Ø§Ø¬Ø¨Ø§Ø±ÛŒ Ù‡Ø³ØªÙ†


const REQUIRED_MSG = "Ú©Ø§Ù…Ù„ Ú©Ø±Ø¯Ù† Ø§ÛŒÙ† ÙÛŒÙ„Ø¯ Ø¶Ø±ÙˆØ±ÛŒ Ø§Ø³Øª";

// âœ… required Ù‡Ø§ Ø¯Ù‚ÛŒÙ‚Ø§Ù‹ Ø·Ø¨Ù‚ Ú¯ÙØªÙ‡â€ŒÛŒ ØªÙˆ
const REQUIRED = {
  internal: ["letterDate", "subject", "formTags"],

  outgoing: [
    "category",     // Ú©Ù„Ø§Ø³ Ø³Ù†Ø¯
    "projectId",    // Ù…Ø±Ú©Ø²/Ù¾Ø±ÙˆÚ˜Ù‡
    "letterDate",   // ØªØ§Ø±ÛŒØ® Ø³Ù†Ø¯
    "toName",       // Ø¨Ù‡
    "orgName",      // Ø´Ø±Ú©Øª/Ø³Ø§Ø²Ù…Ø§Ù†
    "subject",      // Ù…ÙˆØ¶ÙˆØ¹
    "formTags",     // Ø¨Ø±Ú†Ø³Ø¨
  ],

  incoming: [
    "classification", // Ø·Ø¨Ù‚Ù‡ Ø¨Ù†Ø¯ÛŒ
    "letterNo",       // Ø´Ù…Ø§Ø±Ù‡ Ø³Ù†Ø¯
    "letterDate",     // ØªØ§Ø±ÛŒØ® Ø³Ù†Ø¯
     "fromName",      
  "orgName",
    "subject",        // Ù…ÙˆØ¶ÙˆØ¹
    "formTags",       // Ø¨Ø±Ú†Ø³Ø¨
  ],
};

const validate = (kind) => {
  // âœ… ÙÙ‚Ø· Ù‡Ù…ÛŒÙ† ØªØ¨
  setSubmitTriedByKind((p) => ({ ...p, [kind]: true }));

  const isEmpty = (v) => {
    if (v === null || v === undefined) return true;
    if (typeof v === "string") return v.trim() === "";
    if (Array.isArray(v)) return v.length === 0;
    return false;
  };

  // âœ… Ù…Ù‚Ø§Ø¯ÛŒØ± Ù‡Ø± ØªØ¨ Ø¬Ø¯Ø§
  const valuesByKind = {
    incoming: {
      classification: incomingForm.classification,
      letterNo: incomingForm.letterNo,
      letterDate: incomingForm.letterDate,
      
  fromName: incomingForm.fromName, 
  orgName: incomingForm.orgName,   
subject: incomingForm.subject,
      formTags: Array.isArray(incomingTagIds) ? incomingTagIds : [],
    },

    outgoing: {
      category: outgoingForm.category,
      projectId: outgoingForm.projectId,
      letterDate: outgoingForm.letterDate,
      toName: outgoingForm.toName,
      orgName: outgoingForm.orgName,
      subject: outgoingForm.subject,
      formTags: Array.isArray(outgoingTagIds) ? outgoingTagIds : [],
    },

    internal: {
      letterDate: internalForm.letterDate,
      subject: internalForm.subject,
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

const userId = String(user?.id || "0");
 const [filterTab, setFilterTab] = useState("all"); // Ø§ÙˆÙ„ Ø§ÛŒÙ†
 const [filterTagIds, setFilterTagIds] = useState([]); // âœ… global
  const tableScrollRef = useRef(null);
const [hasYScroll, setHasYScroll] = useState(false);
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
// ===== Letter Prefs (backend) =====
const LETTER_PREFS_ENDPOINT = "/letters/prefs";

async function fetchLetterPrefs() {
  const r = await api(LETTER_PREFS_ENDPOINT, { method: "GET" });
  return r?.prefs || {};
}

// âœ… Ù…Ù‡Ù…: Ø¨Ø±Ø§ÛŒ Ø¬Ù„ÙˆÚ¯ÛŒØ±ÛŒ Ø§Ø² missing_id Ø¨Ù‡ Ø¬Ø§ÛŒ PATCH Ø§Ø² POST Ø§Ø³ØªÙØ§Ø¯Ù‡ Ú©Ù† (upsert)
async function patchLetterPrefs(patch) {
  const r = await api(LETTER_PREFS_ENDPOINT, {
    method: "POST",
    body: JSON.stringify(patch || {}),
  });
  return r?.prefs || {};
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
    setFilterTagIds(ids); // âœ…
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
const [formKind, setFormKind] = useState("incoming"); // Ù†ÙˆØ¹ Ù†Ø§Ù…Ù‡ Ø¯Ø§Ø®Ù„ ÙØ±Ù…: ÙˆØ§Ø±Ø¯Ù‡/ØµØ§Ø¯Ø±Ù‡/Ø¯Ø§Ø®Ù„ÛŒ

  // âœ… edit state
  const [editingId, setEditingId] = useState(null);
// âœ… Ø¨Ø±Ú†Ø³Ø¨â€ŒÙ‡Ø§ (ØªÙ†Ù‡Ø§ Ú†ÛŒØ² Ù…Ø´ØªØ±Ú© Ø¨ÛŒÙ† Ù‡Ø± Ø³Ù‡ ØªØ¨)
const [formTagIds, setFormTagIds] = useState([]);

// âœ… ÙØ±Ù…â€ŒÙ‡Ø§ Ø¬Ø¯Ø§ (Ø¨Ø±Ø§ÛŒ Ø¬Ù„ÙˆÚ¯ÛŒØ±ÛŒ Ø§Ø² Ù‚Ø§Ø·ÛŒ Ø´Ø¯Ù† Ø¨ÛŒÙ† ØªØ¨â€ŒÙ‡Ø§)
const [incomingForm, setIncomingForm] = useState({
  classification: "Ø¹Ø§Ø¯ÛŒ",
  projectId: "",
  letterNo: "",
  letterDate: "",
  fromName: "",
  orgName: "",
  subject: "",
  toName: "",
});

const [outgoingForm, setOutgoingForm] = useState({
classification: "Ø¹Ø§Ø¯ÛŒ",
category: "Ù†Ø§Ù…Ù‡",
  projectId: "",
    letterNo: "",
  letterDate: "",
    fromName: "",      
  toName: "",
  orgName: "",
  subject: "",
});

const [internalForm, setInternalForm] = useState({
  classification: "Ø¹Ø§Ø¯ÛŒ",
  projectId: "",     
  letterNo: "",      
  letterDate: "",
  subject: "",
});

// âœ… helpers
const getForm = (kind) =>
  kind === "outgoing" ? outgoingForm : kind === "internal" ? internalForm : incomingForm;

const setForm = (kind, patch) => {
  if (kind === "outgoing") setOutgoingForm((p) => ({ ...p, ...patch }));
  else if (kind === "internal") setInternalForm((p) => ({ ...p, ...patch }));
  else setIncomingForm((p) => ({ ...p, ...patch }));
};

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFor, setUploadFor] = useState("incoming");

  const closeUpload = () => {
    setUploadOpen(false);
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

  // 1) Ø§ÙˆÙ„ Ø§Ø² Ú©Ø´ÛŒ Ú©Ù‡ OrgStructurePage Ù…ÛŒâ€ŒØ³Ø§Ø²Ù‡ Ø¨Ø®ÙˆÙ†
  try {
    const raw =
      sessionStorage.getItem(ORG_UNITS_CACHE_KEY) ||
      localStorage.getItem(ORG_UNITS_CACHE_KEY);

    const parsed = raw ? JSON.parse(raw) : null;

    // Ú©Ø´ Ù…Ù…Ú©Ù†Ù‡ items Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´Ù‡ ÛŒØ§ Ù…Ø³ØªÙ‚ÛŒÙ… Ø¢Ø±Ø§ÛŒÙ‡ Ø¨Ø§Ø´Ù‡
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

  // 2) fallback: Ø§Ú¯Ø± Ú©Ø´ Ù†Ø¨ÙˆØ¯ØŒ Ø§Ø² API Ø¨Ø®ÙˆÙ†
  (async () => {
    try {
      const r = await api("/base/units");         // âœ… Ø¨Ú©â€ŒØ§Ù†Ø¯Øª {units} Ù…ÛŒØ¯Ù‡
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

  // Ø§Ú¯Ø± Ø¨Ú©â€ŒØ§Ù†Ø¯ "public/..." Ø¯Ø§Ø¯
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

const viewerIsMainAdmin = useMemo(() => isMainAdminUser(user), [user]);
const canSeeMainAdminLogin = viewerIsMainAdmin;

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
    const localQuick = loadFormQuickLocal(user?.id);
    if (localQuick.length) {
      setFormTagPrefs({
        incoming: localQuick,
        outgoing: localQuick,
        internal: localQuick,
      });
      lastSavedFormTagsRef.current = JSON.stringify(localQuick);
    }
    try {
      const p = await fetchLetterPrefs();
      if (!mounted) return;

      // 1) pinned tags for FILTER bar  -> Ø§Ø² all_tag_ids
      const pinned = normalizeIdList(p?.all_tag_ids || []).slice(0, TAG_PREFS_LIMIT);
      setFilterTagPinnedIds(pinned);

      // 2) quick tags for FORM (shared Ø¨ÛŒÙ† Ù‡Ø± Ø³Ù‡ ØªØ¨)
      const serverQuick = normalizeIdList(p?.incoming_tag_ids || []).slice(0, TAG_PREFS_LIMIT);
      const formQuick = serverQuick.length ? serverQuick : localQuick;
      setFormTagPrefs({
        incoming: formQuick,
        outgoing: formQuick,
        internal: formQuick,
      });
      lastSavedFormTagsRef.current = JSON.stringify(formQuick);
      saveFormQuickLocal(user?.id, formQuick);
    } catch {}

    prefsHydratedRef.current = true;
  })();

  return () => {
    mounted = false;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id]);

useEffect(() => {
  if (!user?.id) return;
 loadActiveFilterTags(user.id);            // âœ… Ø¨Ø¯ÙˆÙ† Ù¾Ø§Ø±Ø§Ù…ØªØ±
  filterActiveHydratedRef.current = true; // âœ…
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id]);

useEffect(() => {
  if (!filterActiveHydratedRef.current) return;
  saveActiveFilterTags(user.id, filterTagIds);
    // âœ… Ø¨Ø¯ÙˆÙ† Ù¾Ø§Ø±Ø§Ù…ØªØ±
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


// Ú©Ù„Ø§Ø³ Ø³Ù†Ø¯ (Ú¯Ø²ÛŒÙ†Ù‡â€ŒÙ‡Ø§ÛŒ Ø«Ø§Ø¨Øª)
const DOC_CLASS_BASE = [
  "Ù†Ø§Ù…Ù‡",
  "ØªØ±Ù†Ø³Ù…ÛŒØªØ§Ù„",
  "Ù…Ø³ØªÙ†Ø¯Ø§Øª Ø¯Ø§Ø®Ù„ÛŒ",
  "Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯",
  "Ù¾ÛŒØ´Ù†Ù‡Ø§Ø¯ (ÙÙ†ÛŒ - Ù…Ø§Ù„ÛŒ)",
  "Ø§Ø³Ù†Ø§Ø¯ ÙÙ†ÛŒ Ùˆ Ù…Ù‡Ù†Ø¯Ø³ÛŒ",
  "Ø§Ø³Ù†Ø§Ø¯ Ø®Ø±ÛŒØ¯ Ùˆ Ø¨Ø§Ø²Ø±Ú¯Ø§Ù†ÛŒ",
  "Ø§Ø³Ù†Ø§Ø¯ Ù¾Ø±ÙˆÚ˜Ù‡ Ø§ÛŒ",
  "Ø§Ø³Ù†Ø§Ø¯ Ù…Ø§Ù„ÛŒ",
  "Ø§Ø³Ù†Ø§Ø¯ Ø«Ø¨ØªÛŒ Ùˆ Ø­Ù‚ÙˆÙ‚ÛŒ",
];

// Ú¯Ø²ÛŒÙ†Ù‡â€ŒÙ‡Ø§ÛŒ Ø³ÙØ§Ø±Ø´ÛŒ (ÙˆÙ‚ØªÛŒ Ú©Ø§Ø±Ø¨Ø± Â«Ø³Ø§ÛŒØ±Â» Ù…ÛŒâ€ŒØ²Ù†Ø¯)
const [docClassExtras, setDocClassExtras] = useState([]);

// Ù¾Ø§Ù¾â€ŒØ¢Ù¾ Â«Ø³Ø§ÛŒØ±Â»
const [docClassOtherOpen, setDocClassOtherOpen] = useState(false);
const [docClassOtherText, setDocClassOtherText] = useState("");

// Ø·Ø¨Ù‚Ù‡ Ø¨Ù†Ø¯ÛŒ (Ø¹Ø§Ø¯ÛŒ/Ù…Ø­Ø±Ù…Ø§Ù†Ù‡)

  const [projects, setProjects] = useState([]);
  const [hasAttachment, setHasAttachment] = useState(false);
  const [incomingAttachmentTitle, setIncomingAttachmentTitle] = useState("");
  const [outgoingAttachmentTitle, setOutgoingAttachmentTitle] = useState("");
  const [internalAttachmentTitle, setInternalAttachmentTitle] = useState("");
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

  // ===== helpers: Ø¨Ø§ÛŒØ¯ Ù‚Ø¨Ù„ Ø§Ø² useMemoÙ‡Ø§ÛŒÛŒ Ú©Ù‡ Ø§Ø²Ø´ÙˆÙ† Ø§Ø³ØªÙØ§Ø¯Ù‡ Ù…ÛŒâ€ŒÚ©Ù†Ù† ØªØ¹Ø±ÛŒÙ Ø¨Ø´Ù† =====
  const letterIdOf = (l) => {
    const raw = l?.id ?? l?.letter_id ?? l?.letterId ?? l?._id;
    const id = Number(raw);
    return id && Number.isFinite(id) ? id : String(raw || "");
  };

  const dedupeLettersById = (items) => {
    
  const arr = Array.isArray(items) ? items : [];
  const seen = new Set();
  const out = [];

  for (const l of arr) {
    const id = String(letterIdOf(l) || "").trim();
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(l);
  }
  return out;
};
// âœ… ghost detector: Ø±Ú©ÙˆØ±Ø¯Ù‡Ø§ÛŒ Ø®Ø§Ù„ÛŒ/Ù†Ø§Ù‚Øµ Ú©Ù‡ Ù†Ø¨Ø§ÛŒØ¯ Ù†Ù…Ø§ÛŒØ´ Ø¯Ø§Ø¯Ù‡ Ø´ÙˆÙ†Ø¯
const isGhostLetter = (l) => {
  // Ø§Ú¯Ø± id Ù†Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´Ù‡ Ø§ØµÙ„Ø§Ù‹ Ù†Ø§Ù…Ù‡ Ù†ÛŒØ³Øª
  const id = String(letterIdOf(l) || "").trim();
  if (!id) return true;

  // Ø§Ú¯Ø± Ù‡Ù…Ù‡ Ú†ÛŒØ² Ø®Ø§Ù„ÛŒÙ‡ â†’ ghost
  const hasAny =
    String(letterNoOf(l) || "").trim() ||
    String(letterDateOf(l) || "").trim() ||
    String(subjectOf(l) || "").trim() ||
    String(orgOf(l) || "").trim() ||
    String(l?.from_name ?? l?.fromName ?? "").trim() ||
    String(l?.to_name ?? l?.toName ?? "").trim() ||
    (Array.isArray(l?.tag_ids) && l.tag_ids.length) ||
    (Array.isArray(l?.attachments) && l.attachments.length) ||
    String(l?.secretariat_no ?? "").trim() ||
    String(l?.secretariat_date ?? "").trim();

  return !hasAny;
};

// âœ… Ù‡Ù…ÛŒØ´Ù‡ Ù‚Ø¨Ù„ setMyLetters Ø§Ø² Ø§ÛŒÙ† Ø§Ø³ØªÙØ§Ø¯Ù‡ Ú©Ù†
const sanitizeLetters = (items) => {
  const arr = Array.isArray(items) ? items : [];
  const cleaned = arr.filter((l) => !isGhostLetter(l));
  return dedupeLettersById(cleaned);
};

  const letterKindOf = (l) => {
  const v = String(
    l?.kind || l?.type || l?.direction || l?.io || l?.tab || l?.letter_type || l?.letter_kind || ""
  ).toLowerCase();

  if (v.includes("internal") || v.includes("dakheli") || v.includes("Ø¯Ø§Ø®Ù„ÛŒ")) return "internal";
  if (v.includes("out") || v.includes("ØµØ§Ø¯Ø±")) return "outgoing";
  if (v.includes("in") || v.includes("ÙˆØ§Ø±Ø¯Ù‡")) return "incoming";
  if (v === "o" || v === "outgoing") return "outgoing";
  if (v === "i" || v === "incoming") return "incoming";
  return "incoming";
};

const normFa = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    // ÛŒÚ©Ø³Ø§Ù†â€ŒØ³Ø§Ø²ÛŒ Ø­Ø±ÙˆÙ Ø¹Ø±Ø¨ÛŒ/ÙØ§Ø±Ø³ÛŒ
    .replace(/ÙŠ/g, "ÛŒ")
    .replace(/Ùƒ/g, "Ú©")
    // Ø­Ø°Ù Ù†ÛŒÙ…â€ŒÙØ§ØµÙ„Ù‡ Ùˆ Ø§Ù†ÙˆØ§Ø¹ ÙØ§ØµÙ„Ù‡â€ŒÙ‡Ø§ÛŒ Ø®Ø§Øµ
    .replace(/[\u200c\u200f\u202a-\u202e]/g, "")
    .replace(/\s+/g, " ");

const isConfidentialLetter = (l) => {
  // 1) Ø§Ú¯Ø± Ø¨Ú©â€ŒØ§Ù†Ø¯ ÙÙ„Ú¯ Ø¨ÙˆÙ„ÛŒ Ø¨Ø¯Ù‡
  const flag =
    l?.is_confidential ??
    l?.isConfidential ??
    l?.confidential ??
    l?.is_secret ??
    l?.isSecret;

  if (flag === true) return true;
  if (flag === 1 || flag === "1") return true;

  // 2) Ù…Ù‚Ø¯Ø§Ø± Ù…ØªÙ†ÛŒ/Ø¢Ø¨Ø¬Ú©ØªÛŒ
  const raw =
    l?.classification ??
    l?.doc_classification ??
    l?.confidentiality ??
    l?.classification_label ??
    l?.classificationName ??
    (typeof l?.classification === "object" ? (l?.classification?.label ?? l?.classification?.name) : "") ??
    "";

  const v = normFa(raw);

  // ÙØ§Ø±Ø³ÛŒ
  if (v.includes("Ù…Ø­Ø±Ù…Ø§Ù†Ù‡")) return true;
  if (v.includes("Ø®ÛŒÙ„ÛŒ Ù…Ø­Ø±Ù…Ø§Ù†Ù‡")) return true;

  // Ø§Ù†Ú¯Ù„ÛŒØ³ÛŒ
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
    if (ad && bd && ad !== bd) return bd.localeCompare(ad); // Ø¬Ø¯ÛŒØ¯ØªØ± Ø§ÙˆÙ„
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
const subjectOf = (l) => String(l?.subject ?? l?.title ?? "");
const orgOf = (l) => String(l?.org_name ?? l?.org ?? l?.organization ?? l?.company ?? "");
const fromToOf = (l) => {
    const a = String(l?.from_name ?? l?.from ?? "");
    const b = String(l?.to_name ?? l?.to ?? "");
    const s = `${a}${a && b ? " / " : ""}${b}`.trim();
    return s || "â€”";
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

    // âœ… ÛŒÚ© Ø±Ø´ØªÙ‡â€ŒÛŒ Ø¢Ù…Ø§Ø¯Ù‡ Ø¨Ø±Ø§ÛŒ Ø³Ø±Ú†
    const hay = toEnDigits([id, no, sub, org, f2].join(" ")).toLowerCase();

    return { l, id, hay };
  });
}, [myLettersSorted, relatedPickOpen]);
const RELATED_PICK_LIMIT = 200;

const relatedPickList = useMemo(() => {
  if (!relatedPickOpen) return [];

  const q = toEnDigits(String(relatedPickQueryDebounced || "").trim()).toLowerCase();

  // âœ… Ø§Ú¯Ø± Ø³Ø±Ú† Ø®Ø§Ù„ÛŒÙ‡: ÙÙ‚Ø· 200 ØªØ§ÛŒ Ø§ÙˆÙ„ (Ø¨Ø±Ø§ÛŒ Ø¬Ù„ÙˆÚ¯ÛŒØ±ÛŒ Ø§Ø² ÙØ±ÛŒØ²)
  if (!q) {
    return relatedPickIndex.slice(0, RELATED_PICK_LIMIT).map((x) => x.l);
  }

  // âœ… Ø§Ú¯Ø± Ø³Ø±Ú† Ø¯Ø§Ø´Øª: ÙÛŒÙ„ØªØ± Ø³Ø±ÛŒØ¹ Ø±ÙˆÛŒ hay
  const out = [];
  for (const x of relatedPickIndex) {
    if (x.hay.includes(q)) out.push(x.l);
    if (out.length >= 800) break; // (Ø§Ø®ØªÛŒØ§Ø±ÛŒ) Ø³Ù‚Ù Ù†ØªØ§ÛŒØ¬ Ø¨Ø±Ø§ÛŒ Ø¬Ù„ÙˆÚ¯ÛŒØ±ÛŒ Ø§Ø² Ø±Ù†Ø¯Ø± Ø³Ù†Ú¯ÛŒÙ†
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

// Ú©Ù†Ø§Ø± Ø¨Ù‚ÛŒÙ‡ useRef Ù‡Ø§
// Ú©Ù†Ø§Ø± Ø¨Ù‚ÛŒÙ‡ useRef Ù‡Ø§
const relatedWrapRef = useRef(null);
const relatedInputRef = useRef(null);

// âœ… Ø§ÙˆÙ„ Ø§ÛŒÙ† Ø¨Ø§ÛŒØ¯ Ø¨ÛŒØ§Ø¯ (Ù‚Ø¨Ù„ Ø§Ø² relatedDisplayValue)
const relatedSelectedIds = useMemo(() => {
  return (Array.isArray(returnToIds) ? returnToIds : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean);
}, [returnToIds]);

// Ù…ØªÙ† Ù†Ù…Ø§ÛŒØ´ÛŒ Ø´Ù…Ø§Ø±Ù‡â€ŒÙ‡Ø§ÛŒ Ø§Ù†ØªØ®Ø§Ø¨ Ø´Ø¯Ù‡ (ÙˆÙ‚ØªÛŒ dropdown Ø¨Ø³ØªÙ‡ Ø§Ø³Øª)
const relatedDisplayValue = useMemo(() => {
  const parts = (Array.isArray(relatedSelectedIds) ? relatedSelectedIds : []).map((id) => {
    const l = letterById.get(String(id));
    const no = String(letterNoOf(l) || "").trim() || String(id);
    return toFaDigits(no);
  });
  return parts.join(" Ùˆ ");
}, [relatedSelectedIds, letterById]);


// Ø¨Ø³ØªÙ† Ø¨Ø§ Ú©Ù„ÛŒÚ© Ø¨ÛŒØ±ÙˆÙ†
useEffect(() => {
  if (!relatedOpen) return;

  const onDown = (e) => {
    const t = e.target;
    if (relatedWrapRef.current && relatedWrapRef.current.contains(t)) return;
    setRelatedOpen(false);
    setRelatedQuery(""); // Ù¾Ø§Ú© Ú©Ø±Ø¯Ù† Ø­Ø§Ù„Øª Ø³Ø±Ú†
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
const [filterTagPinnedIds, setFilterTagPinnedIds] = useState([]); // âœ… Ø¨Ø±Ú†Ø³Ø¨â€ŒÙ‡Ø§ÛŒ Ø³Ù†Ø¬Ø§Ù‚â€ŒØ´Ø¯Ù‡ Ø¨Ø±Ø§ÛŒ Ù‡Ù…ÛŒÙ† Ú©Ø§Ø±Ø¨Ø±)



// ===== Per-user pinned tags for filter (NO localStorage) =====
const TAG_PREFS_SCOPE = "letters_filter"; // Ø§Ø³Ù… Ú©Ù„ÛŒØ¯ Ø¨Ø±Ø§ÛŒ Ø¨Ú©â€ŒØ§Ù†Ø¯ (Ø¨Ø¹Ø¯Ø§Ù‹ Ù‡Ù… Ù‡Ù…ÛŒÙ†Ùˆ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ù…ÛŒâ€ŒÚ©Ù†ÛŒÙ…)
const TAG_PREFS_LIMIT = 24;

const tagPrefsLsKey = (scope) => `tag_prefs_v1:${scope}:u${String(user?.id || "0")}`;
const formQuickLsKey = (uid) => `letters_form_quick_v1:u${String(uid || "0")}`;

const loadFormQuickLocal = (uid) => {
  try {
    const raw = localStorage.getItem(formQuickLsKey(uid));
    const parsed = raw ? JSON.parse(raw) : null;
    return normalizeIdList(parsed?.ids || []).slice(0, TAG_PREFS_LIMIT);
  } catch {
    return [];
  }
};

const saveFormQuickLocal = (uid, ids) => {
  try {
    const clean = normalizeIdList(ids).slice(0, TAG_PREFS_LIMIT);
    localStorage.setItem(formQuickLsKey(uid), JSON.stringify({ t: Date.now(), ids: clean }));
  } catch {}
};

// ===== Per-user selected tags for FORM (incoming/outgoing/internal) â€” stored in backend (/tag-prefs) =====
const FORM_TAG_PREFS_SCOPE = {
  incoming: "letters_form_incoming",
  outgoing: "letters_form_outgoing",
  internal: "letters_form_internal",
};

const formPrefsLsKey = (which) => `tag_prefs_v1:${FORM_TAG_PREFS_SCOPE[which]}:u${String(user?.id || "0")}`;

const [formTagPrefs, setFormTagPrefs] = useState({ incoming: [], outgoing: [], internal: [] });
const formTagsHydratedRef = useRef({ incoming: false, outgoing: false, internal: false });

// âœ… ÙÙ‚Ø· ÛŒÚ© Ù…Ù†Ø¨Ø¹ Ø¨Ø±Ø§ÛŒ Ø¨Ø±Ú†Ø³Ø¨â€ŒÙ‡Ø§ÛŒ ÙØ±Ù… (Ø¨Ø±Ø§ÛŒ Ù‡Ø± Ø³Ù‡ ØªØ¨ Ù…Ø´ØªØ±Ú©)
const saveFormTagPrefs = async (_which, ids) => {
  const clean = normalizeIdList(ids).slice(0, TAG_PREFS_LIMIT);
  // ÙÙ‚Ø· incoming_tag_ids Ø°Ø®ÛŒØ±Ù‡ Ø´ÙˆØ¯ (Ù…Ù†Ø¨Ø¹ ÙˆØ§Ø­Ø¯)
  return await patchLetterPrefs({ incoming_tag_ids: clean });
};

const loadFormTagPrefs = async (_which) => {
  const localIds = loadFormQuickLocal(user?.id);
  let p = {};
  try {
    p = await fetchLetterPrefs();
  } catch {}

  // âœ… ÛŒÚ© Ù…Ù†Ø¨Ø¹ ÙˆØ§Ø­Ø¯ Ø¨Ø±Ø§ÛŒ ÙØ±Ù…: incoming_tag_ids (ÛŒØ§ Ù‡Ø±Ú©Ø¯ÙˆÙ… Ú©Ù‡ Ù…ÛŒâ€ŒØ®ÙˆØ§ÛŒ)
  const serverIds = normalizeIdList(p?.incoming_tag_ids || []).slice(0, TAG_PREFS_LIMIT);
  const ids = serverIds.length ? serverIds : localIds;
lastSavedFormTagsRef.current = JSON.stringify(ids);
  saveFormQuickLocal(user?.id, ids);

  // âœ… Ù‡Ù… formTagPrefs Ù‡Ø± Ø³Ù‡ Ú©Ù„ÛŒØ¯ ÛŒÚ©ÛŒ Ø´ÙˆØ¯ (Ø¨Ø±Ø§ÛŒ Ù‡ÛŒØ¯Ø±Ø§Øª Ø´Ø¯Ù† ÙØ±Ù…)
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

const setFormTagsAndPersist = (which, ids) => {
  const next = normalizeIdList(ids).slice(0, TAG_PREFS_LIMIT);

  if (which === "all") {
    setIncomingTagIds(next);
    setOutgoingTagIds(next);
    setInternalTagIds(next);

    setFormTagPrefs((p) => ({ ...p, incoming: next, outgoing: next, internal: next }));

    // âœ… Ù‡Ø± Ø³Ù‡ Ú©Ù„ÛŒØ¯ Ø¯Ø± Ø¨Ú©â€ŒØ§Ù†Ø¯ Ø°Ø®ÛŒØ±Ù‡ Ø´ÙˆØ¯
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

  // âœ… Ø§ÙˆÙ„ Ù„ÙˆÚ©Ø§Ù„ (Ø­ØªÛŒ Ø§Ú¯Ø± Ø³Ø±ÙˆØ± fail Ø´Ø¯ØŒ Ø¨Ø¹Ø¯ refresh Ù…ÛŒâ€ŒÙ…ÙˆÙ†Ù‡)
  try {
    localStorage.setItem(pinnedLsKey(user?.id), JSON.stringify({ t: Date.now(), ids: clean }));
  } catch {}

  // âœ… Ø¨Ø¹Ø¯ Ø³Ø±ÙˆØ±
  try {
    await patchLetterPrefs({ all_tag_ids: clean });
  } catch (e) {
    console.error("savePinnedFilterTags failed", e);
  }
};

const loadPinnedFilterTags = async () => {
  const uid = user?.id;

  // âœ… Ø§ÙˆÙ„ Ù„ÙˆÚ©Ø§Ù„ Ø³Ø±ÛŒØ¹
  try {
    const raw = localStorage.getItem(pinnedLsKey(uid));
    const parsed = raw ? JSON.parse(raw) : null;
    const ids = normalizeIdList(parsed?.ids || []).slice(0, TAG_PREFS_LIMIT);
    if (ids.length) setFilterTagPinnedIds(ids);
  } catch {}

  // âœ… Ø¨Ø¹Ø¯ Ø³Ø±ÙˆØ± (Ø§Ú¯Ø± Ù…ÙˆØ¬ÙˆØ¯ Ø¨ÙˆØ¯ override Ú©Ù†)
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

  (async () => {
    // Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ†Ú©Ù‡ pinned Ù‡Ø§ Ø§Ø² Ù‡Ø± ØªØ¨ (letters/projects/execution) Ø¨Ø¹Ø¯ refresh Ø¯ÛŒØ¯Ù‡ Ø¨Ø´Ù†
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
  loadFormTagPrefs("incoming"); // âœ… ÙÙ‚Ø· ÛŒÚ© Ø¨Ø§Ø±
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id]);

useEffect(() => {
  // ÙÙ‚Ø· Create
  if (!formOpen || editingId) return;

  // âœ… ØªØ§ ÙˆÙ‚ØªÛŒ prefs Ø§Ø² Ø³Ø±ÙˆØ± Ù†ÛŒÙˆÙ…Ø¯Ù‡ØŒ Ù‡ÛŒÚ† Ú©Ø§Ø±ÛŒ Ù†Ú©Ù† (Ù†Ù‡ setØŒ Ù†Ù‡ save)
  if (!prefsHydratedRef.current) return;

  const which = formKind; // incoming|outgoing|internal
  if (!which) return;

  // ÙÙ‚Ø· ÛŒÚ© Ø¨Ø§Ø± Ø¨Ø±Ø§ÛŒ Ù‡Ø± ØªØ¨ ÙØ±Ù…
  if (formTagsHydratedRef.current[which]) return;

  formTagsHydratedRef.current[which] = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [formOpen, formKind, editingId, formTagPrefs]);


useEffect(() => {
  if (formOpen) return;
  formTagsHydratedRef.current = { incoming: false, outgoing: false, internal: false };
}, [formOpen]);

// Ø§Ø¶Ø§ÙÙ‡ Ú©Ø±Ø¯Ù†/Ø¨Ø±Ø¯Ù† Ø¨Ù‡ Ø§ÙˆÙ„ Ù„ÛŒØ³Øª (Ùˆ Ø°Ø®ÛŒØ±Ù‡ Ø¯Ø± Ø¨Ú©â€ŒØ§Ù†Ø¯)
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

// ÙˆÙ‚ØªÛŒ Ú†Ù†Ø¯ØªØ§ Ø¨Ø±Ú†Ø³Ø¨ Ø§Ø² picker Ø§Ù†ØªØ®Ø§Ø¨ Ø´Ø¯
const mergePinnedFilterTags = (ids) => {
  const arr = normalizeIdList(ids);
  setFilterTagPinnedIds((prev) => {
    const next = normalizeIdList([...arr, ...(prev || [])]).slice(0, TAG_PREFS_LIMIT);
    savePinnedFilterTags(next);
    return next;
  });
};

const resetAllFilters = () => {
  setFilterSubject("");
  setFilterOrg("");
  setFilterLetterNo("");
  setFilterQuick("");
  setFilterFromDate("");
  setFilterToDate("");
  setFilterQuery("");
  // ÙÙ‚Ø· active Ù‡Ø§ÛŒ Ù‡Ù…Ù‡ ØªØ¨â€ŒÙ‡Ø§ Ù¾Ø§Ú© Ø´ÙˆØ¯:
  setFilterTagIds([]);
};


  // ===== Table selection + pagination =====
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);
  const [kbdAbsIdx, setKbdAbsIdx] = useState(-1);
  const tableRowRefs = useRef(new Map());

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
          reject(new Error("Ø®Ø·Ø§ Ø¯Ø± Ø¢Ù¾Ù„ÙˆØ¯ ÙØ§ÛŒÙ„"));
        }
      };

      xhr.onerror = () => reject(new Error("Ø®Ø·Ø§ Ø¯Ø± Ø¢Ù¾Ù„ÙˆØ¯ ÙØ§ÛŒÙ„"));
      xhr.send(fd);
    });
  };

  const uploadQueuedFiles = async (kind, letterId) => {
  const files = Array.isArray(docFilesByType?.[kind]) ? docFilesByType[kind] : [];
  const queue = files.filter((f) => f && f.status !== "error" && (f.optimizedFile || f.file) && !f.url);

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
        prev.map((x) => (x.id === f.id ? { ...x, status: "error", error: e?.message || "Ø®Ø·Ø§ Ø¯Ø± Ø¢Ù¾Ù„ÙˆØ¯ ÙØ§ÛŒÙ„." } : x))
      );
    }
  };

  await Promise.allSettled(queue.map(runOne));
};
  const addFilesToUpload = async (which, fileList) => {
    const list = Array.from(fileList || []);
    if (!list.length) return;

    for (const rawFile of list) {
      const isPdf = rawFile.type === "application/pdf" || rawFile.name.toLowerCase().endsWith(".pdf");
      const isImg = rawFile.type && rawFile.type.startsWith("image/");

      if (!isImg && !isPdf) {
        alert("ÙÙ‚Ø· ØªØµÙˆÛŒØ± Ùˆ PDF Ù…Ø¬Ø§Ø² Ø§Ø³Øª.");
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

  const itemsRaw = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
const items = sanitizeLetters(itemsRaw);
setMyLetters(items);

try {
  sessionStorage.setItem(LETTERS_CACHE_KEY, JSON.stringify({ t: Date.now(), items }));
} catch {}

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

  // 1) Ø³Ø±ÛŒØ¹ Ø§Ø² Ú©Ø´ Ù†Ø´ÙˆÙ† Ø¨Ø¯Ù‡
  try {
    const raw = sessionStorage.getItem(LETTERS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const t = Number(parsed?.t || 0);
      const cached = Array.isArray(parsed?.items) ? parsed.items : [];

    if (cached.length && Date.now() - t < LETTERS_CACHE_TTL) {
setMyLetters(sanitizeLetters(cached));
}

    }
  } catch {}

  // 2) Ø¨Ø¹Ø¯Ø´ Ø¯Ø± Ù¾Ø³â€ŒØ²Ù…ÛŒÙ†Ù‡ Ø§Ø² Ø³Ø±ÙˆØ± Ø¢Ù¾Ø¯ÛŒØª Ú©Ù†
  (async () => {
    try {
      const r = await api("/letters/mine");
const itemsRaw = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
const items = sanitizeLetters(itemsRaw);

if (!mounted) return;

setMyLetters(items);

try {
  sessionStorage.setItem(LETTERS_CACHE_KEY, JSON.stringify({ t: Date.now(), items }));
} catch {}


try {
  sessionStorage.setItem(LETTERS_CACHE_KEY, JSON.stringify({ t: Date.now(), items }));
} catch {}

    } catch {
      // Ø§Ú¯Ø± Ú©Ø´ Ø¯Ø§Ø´ØªÛŒØŒ Ø§ÛŒÙ†Ø¬Ø§ Ù„Ø§Ø²Ù… Ù†ÛŒØ³Øª Ø®Ø§Ù„ÛŒ Ú©Ù†ÛŒ
      if (!mounted) return;

      // ÙÙ‚Ø· ÙˆÙ‚ØªÛŒ Ú©Ø´ Ù†Ø¯Ø§Ø´ØªÛŒÙ… Ø®Ø§Ù„ÛŒ Ú©Ù† (Ø§Ø®ØªÛŒØ§Ø±ÛŒ ÙˆÙ„ÛŒ Ø¨Ù‡ØªØ± Ø¨Ø±Ø§ÛŒ UX)
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
        // Ø§ÙˆÙ„ ØªÙ„Ø§Ø´ Ø¨Ø§ Ø³Ø§Ø®ØªØ§Ø± Ø¬Ø¯ÛŒØ¯
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
  "h-10 px-5 rounded-xl border transition text-sm font-semibold inline-flex items-center gap-2 " +
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


 // âœ… Chip style (Ù…Ø«Ù„ TagsPage)
const chipBase =
  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs shadow-sm transition";

const chipCls =
  chipBase +
  " border-black/10 bg-white !text-neutral-900 hover:bg-black/5 " +
  "dark:border-neutral-800 dark:bg-neutral-900 dark:!text-neutral-100 dark:hover:bg-white/10";

// Ø­Ø§Ù„Øª Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ (Ø¨Ø±Ø§ÛŒ ÙˆÙ‚ØªÛŒ tag ÙØ¹Ø§Ù„ Ø§Ø³Øª)
const selectedTagChipCls =
  chipBase +
  " border-black bg-black !text-white hover:bg-black/90 " +
  "dark:border-neutral-200 dark:bg-neutral-100 dark:!text-neutral-900";

  const sendBtnCls =
  "h-12 w-12 rounded-xl flex items-center justify-center transition ring-1 " +
  (theme === "dark"
    ? "bg-white text-black ring-white/15 hover:bg-white/90"
    : "bg-black text-white ring-black/15 hover:bg-black/90");

        // âœ… Outer border box for the whole form (like filters box)
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
  const arr = Array.isArray(projects)
    ? projects.filter((p) => {
        if (!p || typeof p !== "object") return false;
        if (p?.isActive === false || p?.is_active === false) return false;
        const st = String(p?.status ?? p?.state ?? "").trim().toLowerCase();
        if (st && ["inactive", "disabled", "archived", "closed", "false", "0", "off", "ØºÛŒØ±ÙØ¹Ø§Ù„", "ØºÙŠØ±ÙØ¹Ø§Ù„", "Ø¨Ø³ØªÙ‡"].includes(st)) {
          return false;
        }
        return true;
      })
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
    const raw = String(p?.code ?? "").trim(); // Ù…Ø«Ø§Ù„: 159 ÛŒØ§ 159.1.1
    const base = raw.split(".")[0].trim();   // Ù…ÛŒØ´Ù‡ 159

    // ÙÙ‚Ø· Ú©Ø¯ Û³ Ø±Ù‚Ù…ÛŒ
    if (!/^\d{3}$/.test(base)) continue;

    // Ø²ÛŒØ±Ù¾Ø±ÙˆÚ˜Ù‡â€ŒÙ‡Ø§ Ø­Ø°Ù (Ù‡Ø±Ú†ÛŒ Ù†Ù‚Ø·Ù‡ Ø¯Ø§Ø±Ù‡)
    if (raw.includes(".")) continue;

    // ØªÚ©Ø±Ø§Ø±ÛŒâ€ŒÙ‡Ø§ Ø­Ø°Ù
    if (seen.has(base)) continue;
    seen.add(base);

    out.push({ ...p, __baseCode: base });
  }
  // âœ… Ù…Ø±ØªØ¨â€ŒØ³Ø§Ø²ÛŒ Ø¹Ø¯Ø¯ÛŒ Ù†Ø²ÙˆÙ„ÛŒ: 165,164,...,101
  out.sort((a, b) => {
    const an = Number(String(a?.__baseCode ?? "").trim()) || 0;
    const bn = Number(String(b?.__baseCode ?? "").trim()) || 0;
    return bn - an;
  });

  // âœ… Ù¾ÛŒÙ† Ù¾Ø±ÙˆÚ˜Ù‡ 100 Ù‡Ù…ÛŒØ´Ù‡ Ø§ÙˆÙ„
  const pinIdx = out.findIndex((p) => String(p?.__baseCode ?? p?.code ?? "").trim() === "100");
  if (pinIdx >= 0) {
    const [pin] = out.splice(pinIdx, 1);
    out.unshift(pin);
  }

  return out;
}, [projectsDesc]);

// ===== Auto code injection (Create only) =====
const currentProjectId = getForm(formKind).projectId || "";

useEffect(() => {
  if (!formOpen) return;
  if (editingId) return; // Ø§Ø¯ÛŒØª â†’ Ú©Ø¯ Ø¬Ø¯ÛŒØ¯ Ù†Ø³Ø§Ø²

  const code = computeNextAutoCode({
    kind: formKind,
    projectId: currentProjectId,
    letters: myLetters,
    projectsTopOnly,
  });

  if (!code) return;

  // ÙˆØ§Ø±Ø¯Ù‡: Ø´Ù…Ø§Ø±Ù‡ Ø«Ø¨Øª Ø¯Ø¨ÛŒØ±Ø®Ø§Ù†Ù‡
 // âœ… Ø¯Ø± Ù‡Ø± Ø³Ù‡ ØªØ¨: Ú©Ø¯ Ø¯Ø§Ø®Ù„ "Ø´Ù…Ø§Ø±Ù‡ Ø«Ø¨Øª Ø¯Ø¨ÛŒØ±Ø®Ø§Ù†Ù‡" Ù¾Ø± Ø´ÙˆØ¯
if (formKind === "incoming") {
  setIncomingSecretariatNo(code);
} else if (formKind === "outgoing") {
  setOutgoingSecretariatNo(code);
} else {
  setInternalSecretariatNo(code);
}
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [formOpen, formKind, editingId, currentProjectId, myLetters, projectsTopOnly]);
const setSelectedTagsForKind = (kind, ids) => {
  const next = normalizeIdList(ids).slice(0, TAG_PREFS_LIMIT);
  if (kind === "outgoing") setOutgoingTagIds(next);
  else if (kind === "internal") setInternalTagIds(next);
  else setIncomingTagIds(next);
};

const setFormTagsAllAndPersist = async (ids) => {
  const next = normalizeIdList(ids).slice(0, TAG_PREFS_LIMIT);

  // âœ… Ø§Ù†ØªØ®Ø§Ø¨ Ø¨Ø±Ú†Ø³Ø¨ ÙÙ‚Ø· Ø±ÙˆÛŒ ØªØ¨ ÙØ¹Ù„ÛŒ Ø§Ø¹Ù…Ø§Ù„ Ø´ÙˆØ¯
  setSelectedTagsForKind(formKind, next);

  // âœ… Ù„ÛŒØ³Øª Ø³Ø±ÛŒØ¹ Ù…Ø´ØªØ±Ú© Ø¨ÛŒÙ† ØªØ¨â€ŒÙ‡Ø§: ØªÚ¯â€ŒÙ‡Ø§ÛŒ Ø¬Ø¯ÛŒØ¯ + Ù„ÛŒØ³Øª Ù‚Ø¨Ù„ÛŒ
  const baseQuick = normalizeIdList(formTagPrefs?.incoming || []).slice(0, TAG_PREFS_LIMIT);
  const quick = normalizeIdList([...next, ...baseQuick]).slice(0, TAG_PREFS_LIMIT);
  setFormTagPrefs((p) => ({ ...p, incoming: quick, outgoing: quick, internal: quick }));
  saveFormQuickLocal(user?.id, quick);

  // âœ… Ø§Ú¯Ø± quick list ØªØºÛŒÛŒØ±ÛŒ Ù†Ú©Ø±Ø¯Ù‡ØŒ Ø§ØµÙ„Ø§Ù‹ POST Ù†Ø²Ù†
  const sig = JSON.stringify(quick);
  if (lastSavedFormTagsRef.current === sig) return;

  lastSavedFormTagsRef.current = sig;

  try {
    await patchLetterPrefs({ incoming_tag_ids: quick });
  } catch {}
};

const toggleTag = async (_which, id) => {
  const sid = String(id || "").trim();
  if (!sid) return;

  const base = Array.isArray(formSelectedTagIds) ? formSelectedTagIds.map(String) : [];
  const next = base.includes(sid) ? base.filter((x) => x !== sid) : [...base, sid];

  await setFormTagsAllAndPersist(next);
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

  const tagLabelOf = (t) =>
  String(t?.label ?? t?.name ?? t?.title ?? t?.text ?? t?.tag ?? t?.id ?? "").trim();
  // ===== NEW: add-tag modal =====
const [tagPickOpen, setTagPickOpen] = useState(false);
const [tagPickFor, setTagPickFor] = useState("filter"); // "filter" | "form"
const [tagPickKind, setTagPickKind] = useState("letters"); // letters/projects/execution
const [tagPickCategoryId, setTagPickCategoryId] = useState("");
const [tagPickDraftIds, setTagPickDraftIds] = useState([]);
const TAG_PICK_TABS = [
  { id: "projects", label: "Ù¾Ø±ÙˆÚ˜Ù‡â€ŒÙ‡Ø§" },
  { id: "letters", label: "Ù†Ø§Ù…Ù‡â€ŒÙ‡Ø§ Ùˆ Ù…Ø³ØªÙ†Ø¯Ø§Øª" },
  { id: "execution", label: "Ø§Ø¬Ø±Ø§ÛŒ Ù¾Ø±ÙˆÚ˜Ù‡â€ŒÙ‡Ø§" },
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

// âœ… Ù‡Ù…Ù‡ Ù†Ø§Ù…Ù‡â€ŒÙ‡Ø§ (ÙˆØ§Ø±Ø¯Ù‡/ØµØ§Ø¯Ø±Ù‡/Ø¯Ø§Ø®Ù„ÛŒ) Ø§Ø² ÛŒÚ© Ù„ÛŒØ³Øª ØªÚ¯ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ú©Ù†Ù†Ø¯
const formScope = "letters";

const tagsForFormScope = useMemo(() => {
  const arr = tagsByScope?.[formScope];
  return Array.isArray(arr) ? arr : [];
}, [tagsByScope, formScope]);

  const tagCapsFor = (selectedIds) => {
  const sel = Array.isArray(selectedIds) ? selectedIds.map(String) : [];
  const map = new Map((Array.isArray(tagsForFormScope) ? tagsForFormScope : []).map((t) => [String(t?.id), t]));

  // Ù„ÛŒØ³Øª Ø³Ø±ÛŒØ¹ Ú©Ø§Ø±Ø¨Ø±: Ù…Ø´ØªØ±Ú© Ø¨ÛŒÙ† ØªØ¨â€ŒÙ‡Ø§ Ùˆ Ù…Ø§Ù†Ø¯Ú¯Ø§Ø± Ø¨Ø¹Ø¯ Ø§Ø² refresh
  const quickIds = normalizeIdList(formTagPrefs?.incoming || []).slice(0, TAG_PREFS_LIMIT);
  const quick = quickIds.map((id) => {
    const t = map.get(String(id));
    if (t) return t;
    return { id: String(id), label: `Ø¨Ø±Ú†Ø³Ø¨ (${toFaDigits(id)})`, _missing: true };
  });

  // Ø§Ú¯Ø± ØªÚ¯ÛŒ Ø§Ù†ØªØ®Ø§Ø¨ Ø´Ø¯Ù‡ ÙˆÙ„ÛŒ ØªÙˆ quick Ù†Ø¨ÙˆØ¯ØŒ Ù†Ù…Ø§ÛŒØ´ Ø¨Ø¯Ù‡
  const extra = sel
    .filter((id) => !quick.some((t) => String(t?.id) === String(id)))
    .map((id) => {
      const t = map.get(String(id));
      if (t) return t;
      return { id: String(id), label: `Ø¨Ø±Ú†Ø³Ø¨ (${toFaDigits(id)})`, _missing: true };
    });

  const merged = [...quick, ...extra];

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

  return `${weekdayFa} â€” ${gregYmd}`;
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
  


  const categoryOf = (l) => String(l?.category ?? l?.category_name ?? l?.categoryTitle ?? "");
  const categoryLabelOf = (l) => {
    const c = String(categoryOf(l) || "");
    if (c === "project") return "Ù¾Ø±ÙˆÚ˜Ù‡â€ŒÙ‡Ø§";
    return c || "â€”";
  };
  const categoryLabel = (c) => {
    const v = String(c || "");
    if (v === "project") return "Ù¾Ø±ÙˆÚ˜Ù‡â€ŒÙ‡Ø§";
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

 const isPdfUrl = (url, name = "") =>
  /(\.pdf)(\?|#|$)/i.test(String(url || "")) || /(\.pdf)$/i.test(String(name || ""));

const isImageUrl = (url, name = "") =>
  /\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(String(url || "")) ||
  /\.(png|jpe?g|gif|webp)$/i.test(String(name || ""));

  const normalizeYmd = (s) => {
  const raw = String(s || "").trim();
  const v = toEnDigits(raw); // âœ… ØªØ¨Ø¯ÛŒÙ„ Ø§Ø±Ù‚Ø§Ù… ÙØ§Ø±Ø³ÛŒ/Ø¹Ø±Ø¨ÛŒ Ø¨Ù‡ Ø§Ù†Ú¯Ù„ÛŒØ³ÛŒ

  // Ø§Ø¬Ø§Ø²Ù‡ / ÛŒØ§ - 
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
  const arr = Array.isArray(myLettersSorted) ? myLettersSorted : [];

  const qRaw = String(filterQuery || "").trim();
  const q = toEnDigits(qRaw).toLowerCase();

  const fromY = normalizeYmd(filterFromDate);
  const toY = normalizeYmd(filterToDate);

  return arr.filter((l) => {
    // âœ… Ù…Ø­Ø±Ù…Ø§Ù†Ù‡ ÙÙ‚Ø· Ø¨Ø±Ø§ÛŒ Ø«Ø¨Øªâ€ŒÚ©Ù†Ù†Ø¯Ù‡ ÛŒØ§ Ø§Ø¯Ù…ÛŒÙ† Ø§ØµÙ„ÛŒ (marandi)
    const isConf = isConfidentialLetter(l);
    if (isConf) {
      const ownerId = String(l?.created_by ?? l?.createdBy ?? "").trim();
      const meId = String(user?.id ?? "").trim();
      const isOwner = !!ownerId && !!meId && ownerId === meId;
      if (!isOwner && !viewerIsMainAdmin) return false;
    }

    const kind = letterKindOf(l);

    // âœ… ØªØ¨
    if (filterTab !== "all") {
      if (kind !== filterTab) return false;
    }

    // âœ… ØªÚ¯â€ŒÙ‡Ø§
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

    // âœ… ØªØ§Ø±ÛŒØ®
    const d = normalizeYmd(letterDateOf(l));
    if ((fromY || toY) && !d) return false;
    if (fromY && d < fromY) return false;
    if (toY && d > toY) return false;

    // âœ… Ø³Ø±Ú†
    if (q) {
      const subject = toEnDigits(String(subjectOf(l) || "")).toLowerCase();
      const org = toEnDigits(String(orgOf(l) || "")).toLowerCase();
      const no = toEnDigits(String(letterNoOf(l) || "")).toLowerCase();
      const id = toEnDigits(String(letterIdOf(l) || "")).toLowerCase();

      const ok = subject.includes(q) || org.includes(q) || no.includes(q) || id.includes(q);
      if (!ok) return false;
    }

    return true;
  });
}, [
  myLettersSorted,
  filterTab,
  filterQuery,
  filterTagIds,
  filterFromDate,
  filterToDate,
  user?.id,
  viewerIsMainAdmin,
]);

  useEffect(() => {
    setSelectedIds(new Set());
    setPage(0);
}, [filterTab, rowsPerPage, filterQuick, filterFromDate, filterToDate, filterTagIds, filterQuery]);

  const total = filteredLetters.length;
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, rowsPerPage)));
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const startIdx = safePage * rowsPerPage;
  const endIdx = Math.min(total, startIdx + rowsPerPage);
  const pageItems = filteredLetters.slice(startIdx, endIdx);

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
      if (formOpen || viewOpen || uploadOpen || tagPickOpen || relatedPickOpen) return;

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
        openView(letter);
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
    filteredLetters,
    formOpen,
    kbdAbsIdx,
    openView,
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
  return "bg-orange-50 dark:bg-orange-500/10"; // âœ… internal
};

 const resetForm = () => {
 setIncomingForm({
  classification: "Ø¹Ø§Ø¯ÛŒ",
  projectId: "",
  letterNo: "",
  letterDate: "",
  fromName: "",
  toName: "",
  orgName: "",
  subject: "",
});

  setOutgoingForm({
    classification: "Ø¹Ø§Ø¯ÛŒ",
    category: "Ù†Ø§Ù…Ù‡",
    projectId: "",
    letterNo: "",
    letterDate: "",
    toName: "",
    orgName: "",
    subject: "",
  });

  setInternalForm({
    classification: "Ø¹Ø§Ø¯ÛŒ",
    projectId: "",      
    letterNo: "",  
    letterDate: "",
    subject: "",
  });

  setFormTagIds([]);

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
    const kind = letterKindOf(l);
    const id = String(letterIdOf(l) || "").trim();
    if (!id) return;

    const sn = l?.secretariat_note ?? l?.secretariatNote ?? "";
    if (kind === "incoming") setIncomingSecretariatNote(sn);
    else if (kind === "outgoing") setOutgoingSecretariatNote(sn);
    else setInternalSecretariatNote(sn);

    setEditingId(id);
    setFormOpen(true);
    setFormKind(kind);

    const rawCat = String(l?.category ?? l?.category_name ?? l?.categoryTitle ?? "").trim();
    // Ø³Ø§Ø²Ú¯Ø§Ø±ÛŒ Ø¨Ø§ Ø¯ÛŒØªØ§Ù‡Ø§ÛŒ Ù‚Ø¯ÛŒÙ…ÛŒ Ø´Ù…Ø§ Ú©Ù‡ category="project" Ø¨ÙˆØ¯Ù‡
    const mappedCat = rawCat === "project" ? "Ø§Ø³Ù†Ø§Ø¯ Ù¾Ø±ÙˆÚ˜Ù‡ Ø§ÛŒ" : (rawCat || "Ù†Ø§Ù…Ù‡");
    const rawClass = String(l?.classification ?? l?.doc_classification ?? l?.confidentiality ?? "").trim();
    const pid = l?.project_id ?? l?.projectId ?? l?.projectID ?? null;
    const formProjectId = pid ? String(pid) : "";
    const formLetterNo = String(l?.letter_no ?? l?.letterNo ?? l?.no ?? l?.number ?? "");
    const formLetterDate = String(l?.letter_date ?? l?.letterDate ?? l?.date ?? "");
    const fromVal = String(l?.from_name ?? l?.fromName ?? l?.from ?? "");
    const toVal = String(l?.to_name ?? l?.toName ?? l?.to ?? "");
    const orgVal = String(l?.org_name ?? l?.orgName ?? l?.org ?? l?.organization ?? l?.company ?? "");
    const subVal = String(l?.subject ?? l?.title ?? "");

    if (kind === "incoming") {
      setIncomingForm((p) => ({
        ...p,
        classification: rawClass || "Ø¹Ø§Ø¯ÛŒ",
        projectId: formProjectId,
        letterNo: formLetterNo,
        letterDate: formLetterDate,
        fromName: fromVal,
        toName: toVal,
        orgName: orgVal,
        subject: subVal,
      }));
    } else if (kind === "outgoing") {
      setOutgoingForm((p) => ({
        ...p,
        classification: rawClass || "Ø¹Ø§Ø¯ÛŒ",
        category: mappedCat,
        projectId: formProjectId,
        letterNo: formLetterNo,
        letterDate: formLetterDate,
        fromName: fromVal,
        toName: toVal,
        orgName: orgVal,
        subject: subVal,
      }));
    } else {
      setInternalForm((p) => ({
        ...p,
        classification: rawClass || "Ø¹Ø§Ø¯ÛŒ",
        projectId: formProjectId,
        letterNo: formLetterNo,
        letterDate: formLetterDate,
        subject: subVal,
      }));
    }

    // âœ… Ø¨Ø±Ø§ÛŒ Ù†Ø§Ù…Ù‡â€ŒÙ‡Ø§ÛŒ Ø¯Ø§Ø®Ù„ÛŒ: Ù¾Ø± Ú©Ø±Ø¯Ù† ÙˆØ§Ø­Ø¯ Ø¯Ø± Ø­Ø§Ù„Øª Edit
    const uid = l?.unit_id ?? l?.unitId ?? l?.unit ?? l?.internal_unit_id ?? "";
    setInternalUnitId(uid ? String(uid) : "");


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
            return parts[parts.length - 1] || "ÙØ§ÛŒÙ„";
          } catch {
            return "ÙØ§ÛŒÙ„";
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
    // Ù‡Ø± 120ms ÛŒØ§ Ù‡Ø± 5% ÛŒÚ©Ø¨Ø§Ø± Ø¢Ù¾Ø¯ÛŒØª
    if (p === 0 || p === 100 || (p - lastP >= 5 && now - lastT >= 120)) {
      lastP = p;
      lastT = now;
      setDocFilesFor(kind, (prev) =>
        prev.map((x) => (x.id === fileId ? { ...x, progress: p } : x))
      );
    }
  };
};

const uploadQueueInBackground = async (kind, queue, letterId) => {
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
            ? { ...x, status: "error", error: e?.message || "Ø®Ø·Ø§ Ø¯Ø± Ø¢Ù¾Ù„ÙˆØ¯ ÙØ§ÛŒÙ„." }
            : x
        )
      );
    }
  });

  await runWithLimit(tasks, 2); // 2 ØªØ§ Ù‡Ù…Ø²Ù…Ø§Ù†
};
const submitLockRef = useRef(false);
const lastSavedFormTagsRef = useRef("");

  const submitLetter = async (kind) => {

  const ok = validate(kind);
  if (!ok) return; // âœ… Ø¬Ù„Ùˆ Ø§Ø±Ø³Ø§Ù„ Ø±Ø§ Ù…ÛŒâ€ŒÚ¯ÛŒØ±Ø¯

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

        const formReceiverName =
      kind === "incoming" ? incomingReceiverName : kind === "outgoing" ? outgoingReceiverName : internalReceiverName;
        const receiverName =
      String(formReceiverName || "").trim() ||
      (editingId ? "" : String(loggedInUserName || "").trim());


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

const f = getForm(kind);

const payload = {
  kind,

  // âœ… category + classification Ø§Ø² ÙØ±Ù… Ø¯Ø±Ø³Øª
  category:
    kind === "outgoing" ? String(outgoingForm.category || "Ù†Ø§Ù…Ù‡").trim()
    : "Ù†Ø§Ù…Ù‡",

  classification:
    String(getForm(kind)?.classification || "Ø¹Ø§Ø¯ÛŒ").trim() || "Ø¹Ø§Ø¯ÛŒ",

  project_id: (() => {
    const pid = f?.projectId ?? null;
    const n = pid ? Number(pid) : null;
    return n && Number.isFinite(n) ? n : null;
  })(),

letter_no: String(f.letterNo || "").trim(),
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


    let saved;
    let newId = null;

    if (editingId) {
  const eid = String(editingId || "").trim();
  if (!eid) throw new Error("missing_id");

  // âœ… Ø³Ø§Ø²Ú¯Ø§Ø±ÛŒ Ú©Ø§Ù…Ù„: Ù‡Ù… query Ù‡Ù… body
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

// âœ… Ø¢Ù¾Ø¯ÛŒØª UI Ø¨Ø¯ÙˆÙ† GET /letters/mine
const serverItem = saved?.item || saved || null;

if (editingId) {
  // Ø­Ø§Ù„Øª ÙˆÛŒØ±Ø§ÛŒØ´: Ø¢ÛŒØªÙ… Ø±Ø§ Ø¯Ø± Ù„ÛŒØ³Øª Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ú©Ù†
  setMyLetters((prev) => {
    const arr = Array.isArray(prev) ? prev : [];
    return arr.map((x) =>
      String(letterIdOf(x)) === String(editingId)
        ? { ...x, ...(serverItem && typeof serverItem === "object" ? serverItem : payload) }
        : x
    );
  });
} else {
  // Ø­Ø§Ù„Øª Ø§ÛŒØ¬Ø§Ø¯: Ø¢ÛŒØªÙ… Ø±Ø§ Ø§Ø¨ØªØ¯Ø§ÛŒ Ù„ÛŒØ³Øª Ø§Ø¶Ø§ÙÙ‡ Ú©Ù†
  const created = (serverItem && typeof serverItem === "object")
    ? serverItem
    : { ...payload, id: newId };

setMyLetters((prev) => sanitizeLetters([created, ...(Array.isArray(prev) ? prev : [])]));
}

// âœ… Ø¢Ù¾Ø¯ÛŒØª Ú©Ø´ Ù‡Ù… (Ø§Ø®ØªÛŒØ§Ø±ÛŒ ÙˆÙ„ÛŒ Ø®ÙˆØ¨)
try {
  setTimeout(() => {
    // setTimeout Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ†Ú©Ù‡ Ù…Ù‚Ø¯Ø§Ø± Ø¬Ø¯ÛŒØ¯ state Ø§Ø¹Ù…Ø§Ù„ Ø´Ø¯Ù‡ Ø¨Ø§Ø´Ø¯
    // (ÛŒØ§ Ø§Ú¯Ø± Ø®ÙˆØ§Ø³ØªÛŒØŒ Ù‡Ù…ÛŒÙ†Ø¬Ø§ Ù‡Ù… Ø¨Ø§ prev Ú©Ø§Ø± Ú©Ù†)
  }, 0);
} catch {}

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
            prev.map((x) => (x.id === f.id ? { ...x, status: "error", error: e?.message || "Ø®Ø·Ø§ Ø¯Ø± Ø¢Ù¾Ù„ÙˆØ¯ ÙØ§ÛŒÙ„." } : x))
          );
	        }
	      }
	      try {
	        // Ø¨Ø¹Ø¯ Ø§Ø² Ø¢Ù¾Ù„ÙˆØ¯ ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ØŒ Ù„ÛŒØ³Øª Ø±Ø§ Ø§Ø² Ø³Ø±ÙˆØ± ØªØ§Ø²Ù‡ Ú©Ù† ØªØ§ attachments ÙˆØ§Ù‚Ø¹ÛŒ Ù†Ù…Ø§ÛŒØ´ Ø¯Ø§Ø¯Ù‡ Ø´ÙˆØ¯.
	        await refetchLetters();
	      } catch {}
	    }
	    resetForm();
	    setFormOpen(false);
	  };

 const deleteLetter = async (id) => {
  const ok = window.confirm("Ø­Ø°Ù Ø´ÙˆØ¯ØŸ");
  if (!ok) return;

  const sid = String(id || "").trim();
  if (!sid) return;

  // âœ… 1) Ø³Ø±ÛŒØ¹ Ø§Ø² UI Ø­Ø°Ù Ú©Ù† (Optimistic) ØªØ§ Ø·ÙˆÙ„ Ù†Ú©Ø´Ù‡
  setMyLetters((prev) => (Array.isArray(prev) ? prev.filter((x) => String(letterIdOf(x)) !== sid) : prev));

  // âœ… 2) Ø§Ø² Ø§Ù†ØªØ®Ø§Ø¨â€ŒÙ‡Ø§ Ù‡Ù… Ø­Ø°Ù Ú©Ù†
  setSelectedIds((prev) => {
    const next = new Set(prev);
    next.delete(sid);
    return next;
  });

  try {
    // âœ… 3) ÙÙ‚Ø· ÛŒÚ© endpoint Ø¨Ø²Ù† (Ù‡Ù…ÙˆÙ† Ú©Ù‡ Ù‚Ø¨Ù„Ø§Ù‹ Ú©Ø§Ø± Ù…ÛŒâ€ŒÚ©Ø±Ø¯)
    await api(`/letters?id=${encodeURIComponent(sid)}`, {
      method: "DELETE",
      body: JSON.stringify({ id: sid, letter_id: sid }),
    });

    // âœ… 4) refetch Ú©Ø§Ù…Ù„ Ù†Ø²Ù† (Ø§ØµÙ„ÛŒâ€ŒØªØ±ÛŒÙ† Ø¹Ù„Øª Ú©Ù†Ø¯ÛŒ Ù‡Ù…ÛŒÙ† Ø¨ÙˆØ¯)
    // Ø§Ú¯Ø± Ø®ÛŒÙ„ÛŒ Ù„Ø§Ø²Ù… Ø¯Ø§Ø±ÛŒØŒ Ø§ÛŒÙ†Ùˆ Ø¨Ø¯ÙˆÙ† await Ø¨Ø²Ù†:
    // refetchLetters();

  } catch (e) {
    // âœ… Ø§Ú¯Ø± Ø­Ø°Ù Ø³Ø±ÙˆØ± fail Ø´Ø¯ØŒ Ù„ÛŒØ³Øª Ø±Ùˆ Ø§Ø² Ø³Ø±ÙˆØ± Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ø¯Ø±Ø³Øª Ú©Ù†
    console.error("delete failed", e);
    await refetchLetters();
    throw e;
  }
};

const deleteAllLetters = async () => {
  if (!isMainAdmin) return; // ÙÙ‚Ø· Ø¨Ø±Ø§ÛŒ Ø§Ø¯Ù…ÛŒÙ† Ø§ØµÙ„ÛŒ

  const ok = window.confirm("âš ï¸ Ù‡Ù…Ù‡ Ù†Ø§Ù…Ù‡â€ŒÙ‡Ø§ Ø­Ø°Ù Ø´ÙˆÙ†Ø¯ØŸ Ø§ÛŒÙ† Ø¹Ù…Ù„ÛŒØ§Øª Ø¨Ø±Ú¯Ø´Øªâ€ŒÙ¾Ø°ÛŒØ± Ù†ÛŒØ³Øª.");
  if (!ok) return;

  try {
    const res = await fetch("/api/letters/delete-all", {
      method: "DELETE",
      headers: {
        Authorization: basicAuthHeader(),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "delete_all_failed");
    }

    // âœ… Ù¾Ø§Ú©Ø³Ø§Ø²ÛŒ UI
    setMyLetters([]);
    setSelectedIds(new Set());
    setPage(0);

    // Ú©Ø´ Ù‡Ù… Ù¾Ø§Ú© Ø´ÙˆØ¯ (Ø§Ú¯Ø± Ø§Ø² Ú©Ø´ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ù…ÛŒâ€ŒÚ©Ù†ÛŒ)
    try {
      sessionStorage.removeItem(LETTERS_CACHE_KEY);
    } catch {}

    alert(`âœ… ${data.deleted ?? 0} Ù†Ø§Ù…Ù‡ Ø­Ø°Ù Ø´Ø¯`);
  } catch (e) {
    alert("Ø®Ø·Ø§ Ø¯Ø± Ø­Ø°Ù Ù‡Ù…Ù‡ Ù†Ø§Ù…Ù‡â€ŒÙ‡Ø§: " + (e?.message || "delete_all_failed"));
  }
};

  const InfoRow = ({ label, value }) => (
    <div className="grid grid-cols-12 gap-2 py-2">
      <div className={"col-span-4 text-xs font-semibold " + (theme === "dark" ? "text-white/70" : "text-neutral-600")}>
        {label}
      </div>
      <div className={"col-span-8 text-sm " + (theme === "dark" ? "text-white" : "text-neutral-900")}>
        {value !== null && value !== undefined && value !== "" ? value : "â€”"}
      </div>
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

  const viewLetterKind = viewLetter ? letterKindOf(viewLetter) : "";
  const isViewIncoming = viewLetterKind === "incoming";
  const isViewOutgoing = viewLetterKind === "outgoing";
  const isViewInternal = viewLetterKind === "internal";

  const viewLinkedLetterMap = useMemo(() => {
    return new Map((Array.isArray(myLetters) ? myLetters : []).map((x) => [String(letterIdOf(x)), x]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myLetters]);

  const linkedLetterNosText = (idsRaw) => {
    const ids = (Array.isArray(idsRaw) ? idsRaw : []).map((x) => String(x)).filter(Boolean);
    if (!ids.length) return "â€”";
    const labels = ids.map((sid) => {
      const item = viewLinkedLetterMap.get(sid);
      const no = item ? String(letterNoOf(item) || sid) : sid;
      return toFaDigits(no);
    });
    return labels.join("ØŒ ");
  };

  const unitLabelMap = useMemo(() => {
    return new Map((Array.isArray(unitOptions) ? unitOptions : []).map((u) => [String(u?.id ?? ""), String(u?.label ?? "").trim()]));
  }, [unitOptions]);

  const viewInternalUnitsValue = useMemo(() => {
    if (!viewLetter) return "â€”";
    const unitObj = viewLetter?.unit && typeof viewLetter.unit === "object" ? viewLetter.unit : null;

    const rawIds = [
      ...(Array.isArray(viewLetter?.unit_ids) ? viewLetter.unit_ids : []),
      ...(Array.isArray(viewLetter?.unitIds) ? viewLetter.unitIds : []),
      viewLetter?.internal_unit_id,
      viewLetter?.internalUnitId,
      viewLetter?.unit_id,
      viewLetter?.unitId,
      unitObj?.id,
      unitObj?.unit_id,
      typeof viewLetter?.unit === "string" || typeof viewLetter?.unit === "number" ? viewLetter.unit : null,
    ];

    const ids = Array.from(new Set(rawIds.map((x) => String(x ?? "").trim()).filter(Boolean)));
    if (ids.length) {
      const labels = ids.map((id) => unitLabelMap.get(id) || `ÙˆØ§Ø­Ø¯ (${toFaDigits(id)})`);
      return labels.join("ØŒ ");
    }

    const directLabel = String(
      viewLetter?.unit_name ??
      viewLetter?.unitName ??
      unitObj?.name ??
      unitObj?.title ??
      unitObj?.label ??
      unitObj?.unit_name ??
      ""
    ).trim();
    return directLabel || "â€”";
  }, [viewLetter, unitLabelMap]);

  const showModernViewLayout = isViewIncoming || isViewOutgoing || isViewInternal;

  const viewFromToValue = useMemo(() => {
    if (!viewLetter) return "â€”";
    const from = String(viewLetter?.from_name ?? viewLetter?.fromName ?? viewLetter?.from ?? "").trim();
    const to = String(viewLetter?.to_name ?? viewLetter?.toName ?? viewLetter?.to ?? "").trim();
    if (isViewInternal) {
      return viewInternalUnitsValue;
    }
    if (isViewIncoming || isViewOutgoing) {
      if (!from && !to) return "â€”";
      return `${from || "â€”"} - ${to || "â€”"}`;
    }
    const merged = `${from}${from && to ? " / " : ""}${to}`.trim();
    return merged || "â€”";
  }, [viewLetter, isViewIncoming, isViewOutgoing, isViewInternal, viewInternalUnitsValue]);

  const viewTagItems = useMemo(() => {
    if (!viewLetter) return [];
    const idsFromFields = Array.isArray(viewLetter?.tag_ids)
      ? viewLetter.tag_ids
      : Array.isArray(viewLetter?.tagIds)
      ? viewLetter.tagIds
      : [];
    const idsFromObjects = Array.isArray(viewLetter?.tags)
      ? viewLetter.tags.map((t) => t?.id ?? t?.tag_id ?? t?.tagId).filter(Boolean)
      : [];
    const ids = [...idsFromFields, ...idsFromObjects].map((x) => String(x)).filter(Boolean);
    const uniqueIds = Array.from(new Set(ids));
    if (!uniqueIds.length) return [];

    const all = Object.values(tagsByScope || {}).flatMap((arr) => (Array.isArray(arr) ? arr : []));
    const tagMap = new Map(all.map((t) => [String(t?.id), t]));
    return uniqueIds.map((id) => tagMap.get(id) || { id, label: `Ø¨Ø±Ú†Ø³Ø¨ (${toFaDigits(id)})`, _missing: true });
  }, [viewLetter, tagsByScope]);

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
  // âœ… ÙˆÙ‚ØªÛŒ Ù…ÙˆØ¯Ø§Ù„ Ø¢Ù¾Ù„ÙˆØ¯ Ø¨Ø³ØªÙ‡ Ø§Ø³ØªØŒ Ø§ØµÙ„Ø§Ù‹ Ù…Ø­Ø§Ø³Ø¨Ù‡ Ù†Ú©Ù†
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
            return parts[parts.length - 1] || "ÙØ§ÛŒÙ„";
          } catch {
            return "ÙØ§ÛŒÙ„";
          }
        })();

      const type = attachmentTypeOf(a) || (isPdfUrl(url) ? "application/pdf" : "");
      const size = attachmentSizeOf(a);

      if (!map.has(String(url))) {
        map.set(String(url), { ...a, url, name, type, size, _letterNo: letterNo });
      } else {
        const prev = map.get(String(url));
        if (prev && (!prev.name || prev.name === "ÙØ§ÛŒÙ„") && name) {
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
    const name = attachmentNameOf(att) || att?.name || "ÙØ§ÛŒÙ„";
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
      ["week", "Ù‡ÙØªÙ‡ Ù‚Ø¨Ù„"],
      ["2w", "2 Ù‡ÙØªÙ‡ Ù‚Ø¨Ù„"],
      ["1m", "Ù…Ø§Ù‡ Ù‚Ø¨Ù„"],
      ["3m", "3 Ù…Ø§Ù‡ Ù‚Ø¨Ù„"],
      ["6m", "6 Ù…Ø§Ù‡ Ù‚Ø¨Ù„"],
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

  // âœ… Ø§Ú¯Ø± ØªÚ¯ Ù‡Ù†ÙˆØ² ØªÙˆ allTags Ù†Ø¨ÙˆØ¯ØŒ ÛŒÚ© Ø¢Ø¨Ø¬Ú©Øª placeholder Ù…ÛŒâ€ŒØ³Ø§Ø²ÛŒÙ… ØªØ§ Ú©Ù¾Ø³ÙˆÙ„ ØºÛŒØ¨ Ù†Ø´Ù‡
  return pinned.map((id) => {
    const t = map.get(String(id));
    if (t) return t;
    return { id: String(id), label: `Ø¨Ø±Ú†Ø³Ø¨ (${toFaDigits(id)})`, _missing: true };
  });
}, [filterTagPinnedIds, allTags]);

const openTagPicker = async (forWhat) => {
  setTagPickFor(forWhat);

  const initialKind = forWhat === "form" ? "letters" : "letters"; // ÛŒØ§ Ø³Ø§Ø¯Ù‡â€ŒØªØ±: "letters"
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
    // âœ… Ø§ÛŒÙ† Ù¾Ø§Ù¾â€ŒØ¢Ù¾ ÙÙ‚Ø· â€œÙ…Ø¯ÛŒØ±ÛŒØª Ø¨Ø±Ú†Ø³Ø¨â€ŒÙ‡Ø§ÛŒ Ù†ÙˆØ§Ø± ÙÛŒÙ„ØªØ±Ù‡Ø§ (Pinned)â€ Ø§Ø³Øª
    setFilterTagPinnedIds(ids);
    savePinnedFilterTags(ids);

    // âœ… Ø§Ú¯Ø± Ø¨Ø±Ú†Ø³Ø¨ÛŒ Ø§Ø² Ù†ÙˆØ§Ø± Ø­Ø°Ù Ø´Ø¯ØŒ Ø§Ø² ÙÛŒÙ„ØªØ± ÙØ¹Ø§Ù„ Ù‡Ù… Ø­Ø°Ù Ø´ÙˆØ¯ ØªØ§ ÙÛŒÙ„ØªØ± Ù…Ø®ÙÛŒ Ù†Ù…Ø§Ù†Ø¯
setFilterTagIds((prev) => {
  const cur = Array.isArray(prev) ? prev.map(String) : [];
  return cur.filter((x) => ids.includes(String(x)));
});
   } else {
    // âœ… Ù‡Ù…ÛŒØ´Ù‡ Ø±ÙˆÛŒ Ù‡Ù…ÙˆÙ† ØªØ¨Ù ÙØ±Ù… Ú©Ù‡ Ø¨Ø§Ø²Ù‡ Ø§Ø¹Ù…Ø§Ù„ Ú©Ù†
      setFormTagsAllAndPersist(ids);
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
    // fallback Ù‚Ø¯ÛŒÙ…ÛŒ
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
  ensureTagsForKind("letters"); // âœ… Ù‡Ù…ÛŒØ´Ù‡ letters
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
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-lg md:text-xl font-bold">Ø§Ø³Ù†Ø§Ø¯ Ùˆ Ù†Ø§Ù…Ù‡ Ù‡Ø§</div>
	            <button
	              type="button"
	              onClick={() => {
	                if (formOpen) {
	                  setEditingId(null);
	                  resetForm();
	                  setFormOpen(false);
	                  return;
	                }
	                setFormOpen(true);
	              }}
	              className={
	                "h-10 w-10 rounded-xl flex items-center justify-center transition ring-1 " +
	                (theme === "dark" ? "ring-neutral-800 hover:bg-white/10" : "ring-black/15 hover:bg-black/5")
              }
              title={formOpen ? "Ø¨Ø³ØªÙ†" : "Ø§ÙØ²ÙˆØ¯Ù†"}
              aria-label={formOpen ? "Ø¨Ø³ØªÙ†" : "Ø§ÙØ²ÙˆØ¯Ù†"}
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
      resetAllFilters();   // âœ… Ù‡Ù…Ù‡ ÙÛŒÙ„ØªØ±Ù‡Ø§ Ù¾Ø§Ú©
      return;
    }

    setFilterTab(t.id);   // âœ… ÙÙ‚Ø· ÙÛŒÙ„ØªØ±
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
                  ? "brightness(0) invert(1)"            // âœ… ÙˆÙ‚ØªÛŒ ØªØ¨ Ø§Ù†ØªØ®Ø§Ø¨ Ø´Ø¯: Ø¢ÛŒÚ©Ù† Ø³ÙÛŒØ¯
                  : theme === "dark"
                  ? "brightness(0) invert(1)"            // âœ… Ø¯Ø§Ø±Ú©: Ø¢ÛŒÚ©Ù† Ø³ÙÛŒØ¯
                  : "none",                               // âœ… Ù„Ø§ÛŒØª Ùˆ ØºÛŒØ± ÙØ¹Ø§Ù„: Ø±Ù†Ú¯ Ø§ØµÙ„ÛŒ ÙØ§ÛŒÙ„
                              }}
                            />
                          ) : null}
                        </button>
                    );
                  })}
                </div>

                <div className="min-w-[260px] flex-1">
  <div className={labelCls}>Ø¬Ø³Øª Ùˆ Ø¬Ùˆ</div>
  <input
    value={filterQuery}
    onChange={(e) => setFilterQuery(e.target.value)}
    className={inputCls}
    type="text"
    placeholder="Ø¬Ø³ØªØ¬Ùˆ Ø¨Ø± Ø§Ø³Ø§Ø³ Ù…ÙˆØ¶ÙˆØ¹ / Ø´Ø±Ú©Øª-Ø³Ø§Ø²Ù…Ø§Ù† / Ø´Ù…Ø§Ø±Ù‡ Ø³Ù†Ø¯ ..."
  />
</div>
                <div className="min-w-[140px]">

                  <div className={labelCls}>Ø§Ø²</div>
                  <JalaliPopupDatePicker
                    value={filterFromDate}
                    onChange={(v) => {
                      setFilterFromDate(v);
                      setFilterQuick(""); // âœ…
                    }}
                    theme={theme}
                  />
                </div>

                <div className="min-w-[140px]">
                  <div className={labelCls}>ØªØ§</div>
                  <JalaliPopupDatePicker
                    value={filterToDate}
                    onChange={(v) => {
                      setFilterToDate(v);
                      setFilterQuick(""); // âœ…
                    }}
                    theme={theme}
                  />
                </div>
              </div>





              {/* Tags + Quick chips (moved here) */}
              <div>
                <div className={labelCls}>Ø¨Ø±Ú†Ø³Ø¨ Ù‡Ø§</div>
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

  {/* 2) Pinned user tags (Ù‚Ø¨Ù„ Ø§Ø² Ø§ÙØ²ÙˆØ¯Ù†) */}
  {filterTagCaps.map((t) => {
  const id = String(t?.id);
  const label = tagLabelOf(t);
  const active = (filterTagIds || []).some((x) => String(x) === id);

  return (
    <button
      key={id}
      type="button"
       onClick={() => {
        // âœ… ÙÙ‚Ø· Ø±ÙˆØ´Ù†/Ø®Ø§Ù…ÙˆØ´ Ø´Ø¯Ù† ÙÛŒÙ„ØªØ±ØŒ Ø¨Ø¯ÙˆÙ† Ø¬Ø§Ø¨Ù‡â€ŒØ¬Ø§ÛŒÛŒ Ø¯Ø± Ù„ÛŒØ³Øª
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


  {/* 3) Add button (Ù‡Ù…ÛŒØ´Ù‡ Ø¢Ø®Ø±) */}
  <button
  type="button"
  onClick={() => openTagPicker("filter")}
  className={
    "h-10 w-10  shrink-0 rounded-full border transition inline-flex items-center justify-center " +
    (theme === "dark"
      ? "border-white/15 bg-white/5 hover:bg-white/10"
      : "border-black/10 bg-white hover:bg-black/[0.02]")
  }
  aria-label="Ø§ÙØ²ÙˆØ¯Ù† Ø¨Ø±Ú†Ø³Ø¨"
  title="Ø§ÙØ²ÙˆØ¯Ù† Ø¨Ø±Ú†Ø³Ø¨"
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
    flex items-start gap-2
    overflow-x-auto md:overflow-visible
    flex-nowrap
    pb-1
  "
>
  {/* Ù†ÙˆØ¹ Ù†Ø§Ù…Ù‡ */}
  <div className="shrink-0 w-[320px]">
    <div className={labelSmCls}>Ù†ÙˆØ¹ Ø³Ù†Ø¯</div>
    <div className="flex items-center gap-1">
      {TABS.filter((x) => x.id !== "all").map((t) => {
        const active = formKind === t.id;
        const activeColor = TAB_ACTIVE_BG[t.id];

        return (
	          <button
	            key={t.id}
	            type="button"
	            onClick={() => {
	              if (formKind === t.id) return;
	              setEditingId(null);
	              resetForm();
	              setFormKind(t.id);
	            }}
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

  {/* Ú©Ù„Ø§Ø³ Ø³Ù†Ø¯ */}
<div className="shrink-0 w-[190px]">
  <div className={labelSmCls}>Ú©Ù„Ø§Ø³ Ø³Ù†Ø¯</div>

  <FieldWrap>
    <select
      value={outgoingForm.category}
onChange={(e) => {
  setOutgoingForm((p) => ({ ...p, category: e.target.value }));
  if (formKind === "outgoing") clearFieldError("outgoing", "category");
}}
      className={formKind === "outgoing" ? inputWithError(inputSmCls, "outgoing", "category") : inputSmCls}
aria-invalid={formKind === "outgoing" ? fieldHasError("outgoing", "category") : undefined}
    >
      {([...DOC_CLASS_BASE, ...(Array.isArray(docClassExtras) ? docClassExtras : [])]).map((lab) => (
        <option key={lab} value={lab}>{lab}</option>
      ))}
      <option value="Ø³Ø§ÛŒØ±">Ø³Ø§ÛŒØ±</option>
    </select>

    {formKind === "outgoing" ? <ErrorTextAbs k="category" /> : null}
  </FieldWrap>
</div>


  {/* Ø·Ø¨Ù‚Ù‡ Ø¨Ù†Ø¯ÛŒ */}
  <div className="shrink-0 w-[140px]">
  <div className={labelSmCls}>Ø·Ø¨Ù‚Ù‡ Ø¨Ù†Ø¯ÛŒ</div>

  <FieldWrap>
    <select
      value={getForm(formKind).classification || "Ø¹Ø§Ø¯ÛŒ"}
onChange={(e) => {
  setForm(formKind, { classification: e.target.value });
  if (formKind === "incoming") clearFieldError("incoming", "classification");
}}
className={formKind === "incoming" ? inputWithError(inputSmCls, "incoming", "classification") : inputSmCls}
aria-invalid={formKind === "incoming" ? fieldHasError("incoming", "classification") : undefined}
    >
      <option value="Ø¹Ø§Ø¯ÛŒ">Ø¹Ø§Ø¯ÛŒ</option>
      <option value="Ù…Ø­Ø±Ù…Ø§Ù†Ù‡">Ù…Ø­Ø±Ù…Ø§Ù†Ù‡</option>
    </select>
{formKind === "incoming" ? <ErrorTextAbs kind="incoming" k="classification" /> : null}
  </FieldWrap>
</div>

  {/* Ù…Ø±Ú©Ø²/Ù¾Ø±ÙˆÚ˜Ù‡ */}
<div className="flex-1 min-w-[260px]">
  <div className={labelSmCls}>Ù…Ø±Ú©Ø²/Ù¾Ø±ÙˆÚ˜Ù‡</div>

  <FieldWrap>
    <select
      value={getForm(formKind).projectId || ""}
onChange={(e) => {
  setForm(formKind, { projectId: e.target.value });
  if (formKind === "outgoing") clearFieldError("outgoing", "projectId");
}}
className={formKind === "outgoing" ? inputWithError(inputSmCls, "outgoing", "projectId") : inputSmCls}
aria-invalid={formKind === "outgoing" ? fieldHasError("outgoing", "projectId") : undefined}
    >
      <option value=""></option>
      {projectsTopOnly.map((p) => (
        <option key={p.id} value={String(p.id)}>
          {projectOptionLabel(p)}
        </option>
      ))}
    </select>

    {formKind === "outgoing" ? <ErrorTextAbs k="projectId" /> : null}
  </FieldWrap>
</div>

{/* Ø´Ù…Ø§Ø±Ù‡ Ø³Ù†Ø¯ */}
<div className="shrink-0 w-[170px]">
  <div className={labelSmCls}>Ø´Ù…Ø§Ø±Ù‡ Ø³Ù†Ø¯</div>

  <FieldWrap>
    <input
      value={getForm(formKind).letterNo || ""}
      onChange={(e) => {
        setForm(formKind, { letterNo: e.target.value });
        clearFieldError(formKind, "letterNo"); // Ø§Ú¯Ø± Ø¨Ø±Ø§ÛŒ Ø§ÙˆÙ† ØªØ¨ ÙˆÙ„ÛŒØ¯ÛŒØ´Ù† Ø¯Ø§Ø±ÛŒ
      }}
      className={
        formKind === "incoming"
          ? inputWithError(inputSmCls, "incoming", "letterNo")
          : formKind === "outgoing"
          ? inputWithError(inputSmCls, "outgoing", "letterNo")
          : inputWithError(inputSmCls, "internal", "letterNo")
      }
      aria-invalid={
        formKind === "incoming"
          ? fieldHasError("incoming", "letterNo")
          : formKind === "outgoing"
          ? fieldHasError("outgoing", "letterNo")
          : fieldHasError("internal", "letterNo")
      }
      type="text"
    />

    {formKind === "incoming" ? <ErrorTextAbs kind="incoming" k="letterNo" /> : null}
  </FieldWrap>
</div>


  {/* ØªØ§Ø±ÛŒØ® */}
  <div className="shrink-0 w-[170px]">
  <div className={labelSmCls}>ØªØ§Ø±ÛŒØ® Ø³Ù†Ø¯</div>

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
    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
      {formKind === "outgoing" ? (
        <>
          {/* Ø§Ø² (Ú©Ù…ÛŒ Ú©ÙˆÚ†Ú©ØªØ±) */}
          <div className="md:col-span-3 md:col-start-1">
            <div className={labelCls}>Ø§Ø²</div>
  <FieldWrap>
  <input
    value={outgoingForm.fromName}
    onChange={(e) => {
      setOutgoingForm((p) => ({ ...p, fromName: e.target.value }));
      clearFieldError("outgoing", "fromName"); // âœ… Ø¨Ø§ ØªØ§ÛŒÙ¾ØŒ Ø®Ø·Ø§ Ù¾Ø§Ú© Ø´ÙˆØ¯
    }}
    className={inputWithError(inputCls, "outgoing", "fromName")} // âœ… Ø¯ÙˆØ± Ù‚Ø±Ù…Ø²
    aria-invalid={fieldHasError("outgoing", "fromName")}
    type="text"
  />
  <ErrorTextAbs kind="outgoing" k="fromName" /> {/* âœ… Ù…ØªÙ† Ø§Ø±ÙˆØ± */}
</FieldWrap>

          </div>

          {/* Ø¢ÛŒÚ©Ù† ÙˆØ³Ø· */}
          <div className="md:col-span-1 md:col-start-4 flex flex-col items-center">
            <div className={labelCls + " opacity-0 select-none"}>_</div>
            <div className="h-10 flex items-center justify-center">
              <img
                src="/images/icons/arrow-left.svg"
                alt=""
                className={"w-5 h-5 " + (theme === "dark" ? "invert" : "")}
              />
            </div>
          </div>

          {/* Ø¨Ù‡ (Ú©Ù…ÛŒ Ú©ÙˆÚ†Ú©ØªØ±) */}
          <div className="md:col-span-3 md:col-start-5">
            <div className={labelCls}>Ø¨Ù‡</div>
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

          {/* Ø´Ø±Ú©Øª/Ø³Ø§Ø²Ù…Ø§Ù† (Ø¨Ø§Ù‚ÛŒ ÙØ¶Ø§) */}
          <div className="md:col-span-5 md:col-start-8">
            <div className={labelCls}>Ø´Ø±Ú©Øª/Ø³Ø§Ø²Ù…Ø§Ù†</div>
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
          {/* ÙˆØ§Ø±Ø¯Ù‡ (Ù…Ø«Ù„ Ù‚Ø¨Ù„) */}
          <div className="md:col-span-4 md:col-start-1">
  <div className={labelCls}>Ø§Ø²</div>
<FieldWrap>
  <input
    value={incomingForm.fromName}
    onChange={(e) => {
      setIncomingForm((p) => ({ ...p, fromName: e.target.value }));
      clearFieldError("incoming", "fromName"); // âœ…
    }}
    className={inputWithError(inputCls, "incoming", "fromName")} // âœ…
    aria-invalid={fieldHasError("incoming", "fromName")}
    type="text"
  />
  <ErrorTextAbs kind="incoming" k="fromName" /> {/* âœ… */}
</FieldWrap>


</div>

          {/* Ø´Ø±Ú©Øª/Ø³Ø§Ø²Ù…Ø§Ù† (Ø¨Ø§Ù‚ÛŒ ÙØ¶Ø§) */}
<div className="md:col-span-4 md:col-start-5">
  <div className={labelCls}>Ø´Ø±Ú©Øª/Ø³Ø§Ø²Ù…Ø§Ù†</div>

   <FieldWrap>
  <input
    value={incomingForm.orgName}
    onChange={(e) => {
      setIncomingForm((p) => ({ ...p, orgName: e.target.value }));
      clearFieldError("incoming", "orgName"); // âœ… Ù…Ù‡Ù…
    }}
    className={inputWithError(inputCls, "incoming", "orgName")} // âœ… Ù…Ù‡Ù…
    aria-invalid={fieldHasError("incoming", "orgName")} // âœ… Ù…Ù‡Ù…
    type="text"
  />
  <ErrorTextAbs kind="incoming" k="orgName" /> {/* âœ… Ù…Ù‡Ù… */}
</FieldWrap>

    <ErrorTextAbs k="orgName" />
</div>



         <div className="md:col-span-1 md:col-start-9 flex flex-col items-center">
            <div className={labelCls + " opacity-0 select-none"}>_</div>
            <div className="h-10 flex items-center justify-center">
              <img
                src="/images/icons/arrow-left.svg"
                alt=""
                className={"w-5 h-5 " + (theme === "dark" ? "invert" : "")}
              />
            </div>
          </div>

          {/* Ø¨Ù‡ (Ú©Ù…ÛŒ Ú©ÙˆÚ†Ú©ØªØ±) */}
<div className="md:col-span-3 md:col-start-10">
  <div className={labelCls}>Ø¨Ù‡</div>

    <input
  value={incomingForm.toName}
  onChange={(e) => {
    setIncomingForm((p) => ({ ...p, toName: e.target.value }));
    clearFieldError("toName");
  }}
  className={inputWithError(inputCls, "toName")}
  aria-invalid={fieldHasError("toName")}
  type="text"
/>

    <ErrorTextAbs k="toName" />
</div>

        </>
      )}
    </div>
  </div>
)}
   {/* Ù…ÙˆØ¶ÙˆØ¹ + Ø¶Ù…ÛŒÙ…Ù‡ + (Ø¨Ø±Ø§ÛŒ Ø¯Ø§Ø®Ù„ÛŒ: ÙˆØ§Ø­Ø¯) */}
{formKind === "internal" ? (
  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
    {/* Ù…ÙˆØ¶ÙˆØ¹ */}
    <div className="md:col-span-7 md:col-start-1">
      <div className={labelCls}>Ù…ÙˆØ¶ÙˆØ¹</div>

      <FieldWrap>
        <input
          value={internalForm.subject}
          onChange={(e) => {
            setInternalForm((p) => ({ ...p, subject: e.target.value }));
            clearFieldError("subject");
          }}
          className={inputWithError(inputCls, "internal", "subject")}
          aria-invalid={fieldHasError("internal", "subject")}
          type="text"
        />
        <ErrorTextAbs k="subject" />
      </FieldWrap>
    </div>

    {/* ÙˆØ§Ø­Ø¯ (Ú©Ù†Ø§Ø± Ø¶Ù…ÛŒÙ…Ù‡) */}
    <div className="md:col-span-3 md:col-start-8">
      <div className={labelCls}>ÙˆØ§Ø­Ø¯</div>
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
    {unitOptions.map((u) => (
      <option key={u.id} value={u.id}>
        {u.label}
      </option>
    ))}
  </select>

<ErrorTextAbs kind="internal" k="internalUnitId" />
</FieldWrap>

    </div>

    {/* Ø¶Ù…ÛŒÙ…Ù‡ (Ú©Ù†Ø§Ø± ÙˆØ§Ø­Ø¯ Ùˆ Ø¯Ø± Ù‡Ù…Ø§Ù† Ø®Ø·) */}
    <div className="md:col-span-2 md:col-start-11 flex flex-col items-center">
      <div className={labelCls}>Ø¶Ù…ÛŒÙ…Ù‡</div>
      <div className="flex items-center justify-center gap-4 mt-0 h-10">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="radio"
            name={"hasAttachment_" + formKind}
            checked={hasAttachment === true}
            onChange={() => setHasAttachment(true)}
            className={"h-4 w-4 " + (theme === "dark" ? "accent-white" : "accent-black")}
          />
          <span className={theme === "dark" ? "text-white/80 text-sm" : "text-neutral-800 text-sm"}>Ø¯Ø§Ø±Ø¯</span>
        </label>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="radio"
            name={"hasAttachment_" + formKind}
            checked={hasAttachment === false}
            onChange={() => setHasAttachment(false)}
            className={"h-4 w-4 " + (theme === "dark" ? "accent-white" : "accent-black")}
          />
          <span className={theme === "dark" ? "text-white/80 text-sm" : "text-neutral-800 text-sm"}>Ù†Ø¯Ø§Ø±Ø¯</span>
        </label>
      </div>
    </div>
  </div>
) : (

  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
    {/* Ù…ÙˆØ¶ÙˆØ¹ */}
   <div className="md:col-span-10">
  <div className={labelCls}>Ù…ÙˆØ¶ÙˆØ¹</div>

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


    {/* Ø¶Ù…ÛŒÙ…Ù‡ (Ú©Ù†Ø§Ø± Ù…ÙˆØ¶ÙˆØ¹) */}
    <div className="md:col-span-2 flex flex-col items-center">
      <div className={labelCls}>Ø¶Ù…ÛŒÙ…Ù‡</div>
      <div className="flex items-center justify-center gap-4 mt-0 h-10">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="radio"
            name="hasAttachment"
            checked={hasAttachment === true}
            onChange={() => setHasAttachment(true)}
            className={"h-4 w-4 " + (theme === "dark" ? "accent-white" : "accent-black")}
          />
          <span className={theme === "dark" ? "text-white/80 text-sm" : "text-neutral-800 text-sm"}>Ø¯Ø§Ø±Ø¯</span>
        </label>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="radio"
            name="hasAttachment"
            checked={hasAttachment === false}
            onChange={() => setHasAttachment(false)}
            className={"h-4 w-4 " + (theme === "dark" ? "accent-white" : "accent-black")}
          />
          <span className={theme === "dark" ? "text-white/80 text-sm" : "text-neutral-800 text-sm"}>Ù†Ø¯Ø§Ø±Ø¯</span>
        </label>
      </div>
    </div>
  </div>
)}

{/* Ø¶Ù…ÛŒÙ…Ù‡ (Ø±Ø§Ø¯ÛŒÙˆÛŒÛŒ Ø¯Ø§Ø±Ø¯/Ù†Ø¯Ø§Ø±Ø¯) + Ø¹Ù†ÙˆØ§Ù† Ø¶Ù…ÛŒÙ…Ù‡ + Ø¨Ø§Ø²Ú¯Ø´Øª/Ù¾ÛŒØ±Ùˆ Ú©Ù†Ø§Ø± Ø¹Ù†ÙˆØ§Ù† â€” Ø¨Ø¯ÙˆÙ† Ø´Ø±Ø· Ù†Ù…Ø§ÛŒØ´ */}
<div>
    {/* Ø±Ø¯ÛŒÙ Ú©Ù†Ø§Ø±Ù‡Ù…: Ø¶Ù…ÛŒÙ…Ù‡ + Ø¹Ù†ÙˆØ§Ù† Ø¶Ù…ÛŒÙ…Ù‡ + Ø¨Ø§Ø²Ú¯Ø´Øª Ø¨Ù‡ (+ Ù¾ÛŒØ±Ùˆ Ø¯Ø± ØµØ§Ø¯Ø±Ù‡) */}
<div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-1 items-start">

{/* Ø§Ø³Ù†Ø§Ø¯ Ù…Ø±ØªØ¨Ø· + Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø§Ø³Ù†Ø§Ø¯ (Ú©Ù†Ø§Ø± Ù‡Ù… Ùˆ Ú†Ø³Ø¨ÛŒØ¯Ù‡) */}
<div className="md:col-span-12 min-w-0">
  <div className="flex items-start justify-start gap-2">
    {/* Ø§Ø³Ù†Ø§Ø¯ Ù…Ø±ØªØ¨Ø· */}
    <div className="min-w-0">
      <div className={labelCls}>Ø§Ø³Ù†Ø§Ø¯ Ù…Ø±ØªØ¨Ø·</div>

      <button
        type="button"
        onClick={openRelatedPicker}
        className={
          "h-10 w-10 shrink-0 rounded-xl border transition inline-flex items-center justify-center " +
          (theme === "dark"
            ? "border-white/15 bg-white/5 hover:bg-white/10"
            : "border-black/10 bg-white hover:bg-black/[0.02]")
        }
        aria-label="Ø§Ù†ØªØ®Ø§Ø¨ Ø§Ø³Ù†Ø§Ø¯ Ù…Ø±ØªØ¨Ø·"
        title="Ø§Ù†ØªØ®Ø§Ø¨ Ø§Ø³Ù†Ø§Ø¯ Ù…Ø±ØªØ¨Ø·"
      >
        <img
          src="/images/icons/sayer.svg"
          alt=""
          className={"w-5 h-5 " + (theme === "dark" ? "invert" : "")}
        />
      </button>

      {/* Ù†Ù…Ø§ÛŒØ´ Ø§Ù†ØªØ®Ø§Ø¨â€ŒÙ‡Ø§ */}
      {relatedSelectedIds.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1 text-sm">
          {relatedSelectedIds.map((id, i) => {
            const l = letterById.get(String(id));
            const no = String(letterNoOf(l) || "").trim() || String(id);

            return (
              <span key={String(id)} className="inline-flex items-center gap-1">
                {i > 0 && (
                  <span className={theme === "dark" ? "text-white/60" : "text-neutral-600"}>Ùˆ</span>
                )}

                <button
                  type="button"
                  onClick={() => { if (l) openView(l); }}
                  className={
                    "underline underline-offset-4 font-semibold " +
                    (theme === "dark" ? "text-white hover:text-white/90" : "text-neutral-900 hover:text-black")
                  }
                  title="Ù¾ÛŒØ´ Ù†Ù…Ø§ÛŒØ´"
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
                  aria-label="Ø­Ø°Ù"
                  title="Ø­Ø°Ù"
                >
                  Ã—
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>

    {/* Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø§Ø³Ù†Ø§Ø¯ (Ú†Ø³Ø¨ÛŒØ¯Ù‡ Ú©Ù†Ø§Ø± Ø§Ø³Ù†Ø§Ø¯ Ù…Ø±ØªØ¨Ø·) */}
    <div className="shrink-0">
      <div className={labelCls}>&nbsp;</div> {/* Ù‡Ù…â€ŒØªØ±Ø§Ø² Ø¨Ø§ Ù„ÛŒØ¨Ù„ Ø¨Ø§Ù„Ø§ */}
      <button
  type="button"
  onClick={() => openUpload(formKind)}
  className={uploadTriggerCls + " h-10 w-auto whitespace-nowrap"}
  title="Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø§Ø³Ù†Ø§Ø¯"
>
  <img
    src="/images/icons/upload.svg"
    alt=""
    className={"w-5 h-5 " + (theme === "dark" ? "invert" : "")}
  />
  <span>Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø§Ø³Ù†Ø§Ø¯</span>

  {Array.isArray(docFilesByType?.[formKind]) && docFilesByType[formKind].length > 0 ? (
    <span className="mr-2 text-xs opacity-80">
      ({toFaDigits(docFilesByType[formKind].length)})
    </span>
  ) : null}
</button>
    </div>
     {/* âœ… ØªÙˆØ¶ÛŒØ­ Ú©Ù†Ø§Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø§Ø³Ù†Ø§Ø¯ */}
<div className="flex-1 min-w-[260px]">
  <div className={labelCls}>ØªÙˆØ¶ÛŒØ­</div>
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
    placeholder="ØªÙˆØ¶ÛŒØ­..."
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
            Ø§Ù†ØªØ®Ø§Ø¨ Ø§Ø³Ù†Ø§Ø¯ Ù…Ø±ØªØ¨Ø·
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
            aria-label="Ø¨Ø³ØªÙ†"
            title="Ø¨Ø³ØªÙ†"
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
            placeholder="Ø¬Ø³ØªØ¬Ùˆ Ø¨Ø§ Ø´Ù…Ø§Ø±Ù‡ / Ù…ÙˆØ¶ÙˆØ¹ / Ø³Ø§Ø²Ù…Ø§Ù† ..."
            autoFocus
          />
        </div>

        <div className={theme === "dark" ? "h-px bg-white/10" : "h-px bg-black/10"} />

        {/* list */}
        <div className="max-h-[55vh] overflow-auto p-2">
           {(() => {
    const list = relatedPickList; // âœ… Ù„ÛŒØ³Øª Ø¨Ù‡ÛŒÙ†Ù‡â€ŒØ´Ø¯Ù‡

    if (!list.length) {
      return (
        <div className={theme === "dark" ? "text-white/60 text-sm p-4" : "text-neutral-600 text-sm p-4"}>
          Ù…ÙˆØ±Ø¯ÛŒ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.
        </div>
      );
    }

    return (
      <>
        {/* Ø§Ú¯Ø± Ø³Ø±Ú† Ø®Ø§Ù„ÛŒÙ‡ØŒ ÙÙ‚Ø· N Ù…ÙˆØ±Ø¯ Ø§ÙˆÙ„ Ù†Ù…Ø§ÛŒØ´ Ø¯Ø§Ø¯Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯ */}
        {!String(relatedPickQueryDebounced || "").trim() && (
          <div className={theme === "dark" ? "text-white/50 text-xs px-3 pb-2" : "text-neutral-500 text-xs px-3 pb-2"}>
            Ø¨Ø±Ø§ÛŒ Ù†Ù…Ø§ÛŒØ´ Ù‡Ù…Ù‡ Ù…ÙˆØ§Ø±Ø¯ØŒ Ø¨Ø®Ø´ÛŒ Ø§Ø² Ø´Ù…Ø§Ø±Ù‡/Ù…ÙˆØ¶ÙˆØ¹/Ø³Ø§Ø²Ù…Ø§Ù† Ø±Ø§ Ø¬Ø³ØªØ¬Ùˆ Ú©Ù†ÛŒØ¯. (Ù†Ù…Ø§ÛŒØ´ {toFaDigits(RELATED_PICK_LIMIT)} Ù…ÙˆØ±Ø¯ Ø§ÙˆÙ„)
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
                  {sub || "â€”"}
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
                aria-label={checked ? "Ø§Ù†ØªØ®Ø§Ø¨ Ø´Ø¯Ù‡" : "Ø§Ù†ØªØ®Ø§Ø¨ Ù†Ø´Ø¯Ù‡"}
                title={checked ? "Ø§Ù†ØªØ®Ø§Ø¨ Ø´Ø¯Ù‡" : "Ø§Ù†ØªØ®Ø§Ø¨"}
              >
                {checked ? "âœ“" : ""}
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
            aria-label="ØªØ§ÛŒÛŒØ¯"
            title="ØªØ§ÛŒÛŒØ¯"
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
          >  {formKind === "outgoing" ? "ØªØ§Ø±ÛŒØ® Ø«Ø¨Øª Ø¯Ø¨ÛŒØ±Ø®Ø§Ù†Ù‡ " : "ØªØ§Ø±ÛŒØ® Ø«Ø¨Øª Ø¯Ø¨ÛŒØ±Ø®Ø§Ù†Ù‡"}
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
          >  {formKind === "outgoing" ? "Ø´Ù…Ø§Ø±Ù‡ Ø«Ø¨Øª Ø¯Ø¨ÛŒØ±Ø®Ø§Ù†Ù‡ " : "Ø´Ù…Ø§Ø±Ù‡ Ø«Ø¨Øª Ø¯Ø¨ÛŒØ±Ø®Ø§Ù†Ù‡"}
          </div>
        <input
  value={
    formKind === "incoming"
      ? incomingSecretariatNo
      : formKind === "outgoing"
      ? outgoingSecretariatNo
      : internalSecretariatNo
  }
  readOnly // âœ… Ù‚ÙÙ„ Ú©Ø§Ù…Ù„ Ø¯Ø± Ù‡Ø± Ø³Ù‡ ØªØ¨
  tabIndex={-1} // âœ… ÙÙˆÚ©ÙˆØ³ Ø¨Ø§ Tab Ù†Ú¯ÛŒØ±Ø¯ (Ø§Ø®ØªÛŒØ§Ø±ÛŒ ÙˆÙ„ÛŒ Ø¨Ù‡ØªØ±)
  onChange={() => {}} // âœ… Ù‡ÛŒÚ† ØªØºÛŒÛŒØ±ÛŒ Ø§Ø² ØªØ§ÛŒÙ¾ Ø§Ø¹Ù…Ø§Ù„ Ù†Ø´ÙˆØ¯
  className={
    inputCls +
    " bg-black/5 dark:bg-white/10 cursor-not-allowed select-none"
  }
  type="text"
/>

        </div>
        <div>
          <div className={labelCls}>Ù…Ø³Ø¦ÙˆÙ„ Ø¯Ø¨ÛŒØ±Ø®Ø§Ù†Ù‡</div>
          <input
            value={
              (formKind === "incoming"
                ? incomingReceiverName
                : formKind === "outgoing"
                ? outgoingReceiverName
                : internalReceiverName) || (!editingId ? loggedInUserName || "" : "")
            }
            readOnly
            className={inputCls + " opacity-90"}
            type="text"
          />
        </div>
        <div>
  <div className={labelCls}>ØªÙˆØ¶ÛŒØ­</div>
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
    placeholder="ØªÙˆØ¶ÛŒØ­ Ø¯Ø¨ÛŒØ±Ø®Ø§Ù†Ù‡..."
  />
</div>

      </div>

{/* Ø¨Ø±Ú†Ø³Ø¨â€ŒÙ‡Ø§ (Ø¨Ø±Ø§ÛŒ ÙØ±Ù…) */}
<div className="md:col-span-12 min-w-0">
  <div className={labelCls}>Ø¨Ø±Ú†Ø³Ø¨ Ù‡Ø§</div>

  <FieldWrap>
	    <div className="w-full min-w-0 flex flex-wrap items-center gap-2">
	      {(() => {
	        const selectedIds =
	  formKind === "outgoing" ? (Array.isArray(outgoingTagIds) ? outgoingTagIds : [])
	  : formKind === "internal" ? (Array.isArray(internalTagIds) ? internalTagIds : [])
	  : (Array.isArray(incomingTagIds) ? incomingTagIds : []);

	        const caps = tagCapsFor(selectedIds);
	        if (!caps.length) return null;

	        const selSet = new Set(selectedIds.map(String));
	        return caps.map((t) => {
	          const id = String(t?.id);
	          const label = tagLabelOf(t);
	          const active = selSet.has(id);

	          return (
	            <button
	              key={id}
	              type="button"
	              onClick={() => {
	  toggleTag(formKind, id);
	  clearFieldError("formTags");
	}}

	              className={(active ? selectedTagChipCls : chipCls) + " shrink-0"}
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
        onClick={() => { openTagPicker("form"); clearFieldError("formTags"); }}
        className={
          "h-10 w-10 shrink-0 rounded-full border transition inline-flex items-center justify-center " +
          (theme === "dark"
            ? "border-white/15 bg-white/5 hover:bg-white/10"
            : "border-black/10 bg-white hover:bg-black/[0.02]")
        }
        aria-label="Ø§ÙØ²ÙˆØ¯Ù† Ø¨Ø±Ú†Ø³Ø¨"
        title="Ø§ÙØ²ÙˆØ¯Ù† Ø¨Ø±Ú†Ø³Ø¨"
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


      {/* âœ… Ø¯Ú©Ù…Ù‡ Ø§Ø±Ø³Ø§Ù„ Ù‡Ù… Ø¯Ø§Ø®Ù„ Ù‡Ù…ÛŒÙ† Ú©Ø§Ø¯Ø± Ù‚Ø±Ø§Ø± Ú¯Ø±ÙØª */}
      <div className="flex items-center justify-end pt-2">
        <button
  type="button"
  disabled={isSubmitting}
  onClick={() => submitLetter(formKind)}
  className={sendBtnCls + (isSubmitting ? " opacity-50 cursor-not-allowed" : "")}
  title="Ø§Ø±Ø³Ø§Ù„"
  aria-label="Ø§Ø±Ø³Ø§Ù„"
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
    <div
  ref={tableScrollRef}
  dir="ltr"
  className={
  "relative max-h-[55vh] overflow-y-auto overflow-x-hidden " +
  (hasYScroll ? "pr-2" : "pr-0") +
  " pb-0"
}
>
               <table
               
  dir="rtl"
  className="w-full min-w-full table-fixed text-sm
    [&_th]:text-center [&_td]:text-center
    [&_th]:py-0.5 [&_td]:py-0.5
    [&_th]:whitespace-nowrap [&_td]:min-w-0"
>
<colgroup>
  <col style={{ width: 48 }} />   {/* checkbox */}
  <col style={{ width: 96 }} />   {/* Ø´Ù…Ø§Ø±Ù‡ */}
  <col style={{ width: 96 }} />   {/* ØªØ§Ø±ÛŒØ® */}
  <col />                         {/* Ù…ÙˆØ¶ÙˆØ¹ (Ø¨Ø§Ù‚ÛŒ ÙØ¶Ø§) */}
  <col style={{ width: 144 }} />  {/* Ø§Ø²/Ø¨Ù‡ */}
  <col style={{ width: 176 }} />  {/* Ø´Ø±Ú©Øª/Ø³Ø§Ø²Ù…Ø§Ù† */}
  <col style={{ width: 160 }} />  {/* Ø§Ù‚Ø¯Ø§Ù…Ø§Øª */}
</colgroup>

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
          aria-label="Ø§Ù†ØªØ®Ø§Ø¨ Ù‡Ù…Ù‡"
          title="Ø§Ù†ØªØ®Ø§Ø¨ Ù‡Ù…Ù‡"
        />
      </th>

      <th className="w-24 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">
        Ø´Ù…Ø§Ø±Ù‡
      </th>

      <th className="w-24 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">
        ØªØ§Ø±ÛŒØ®
      </th>

      <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">
        Ù…ÙˆØ¶ÙˆØ¹
      </th>

      <th className="w-36 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">
        Ø§Ø²/Ø¨Ù‡
      </th>

      <th className="w-44 !py-2 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">
        Ø´Ø±Ú©Øª/Ø³Ø§Ø²Ù…Ø§Ù†
      </th>

     <th className="w-28 !py-2 pl-6 !pr-3 !text-[14px] md:!text-[15px] !font-semibold sticky top-0 z-30 bg-neutral-200 dark:bg-white/10">
  <div className="flex items-center justify-between gap-2">
    <span>Ø§Ù‚Ø¯Ø§Ù…Ø§Øª</span>

    {isMainAdmin ? (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={deleteAllLetters}
          className={
            "h-6 w-6 rounded-md flex items-center justify-center transition " +
            (theme === "dark"
              ? "bg-white/10 hover:bg-white/15 text-white"
              : "bg-black/10 hover:bg-black/15 text-black")
          }
          aria-label="Ø­Ø°Ù Ù‡Ù…Ù‡ Ù†Ø§Ù…Ù‡â€ŒÙ‡Ø§"
          title="Ø­Ø°Ù Ù‡Ù…Ù‡ Ù†Ø§Ù…Ù‡â€ŒÙ‡Ø§"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => disableMainAdmin(setIsMainAdmin)}
          className={
            "h-6 w-6 rounded-md flex items-center justify-center transition " +
            (theme === "dark"
              ? "bg-white/10 hover:bg-white/15 text-white/70"
              : "bg-black/10 hover:bg-black/15 text-black/70")
          }
          aria-label="Ø®Ø±ÙˆØ¬ Ø§Ø¯Ù…ÛŒÙ†"
          title="Ø®Ø±ÙˆØ¬ Ø§Ø¯Ù…ÛŒÙ†"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 7h9M10 12h9M10 17h9" />
            <path d="M4 6h2v12H4z" />
          </svg>
        </button>
      </div>
    ) : canSeeMainAdminLogin ? (
      // Ø§ÛŒÙ† Ø¯Ú©Ù…Ù‡ Ø§Ø®ØªÛŒØ§Ø±ÛŒÙ‡: Ø§Ú¯Ø± Ù†Ù…ÛŒâ€ŒØ®ÙˆØ§ÛŒ Ø§ØµÙ„Ø§Ù‹ Ø±Ø§Ù‡ ÙˆØ±ÙˆØ¯ Ú©Ù†Ø§Ø± Ø¬Ø¯ÙˆÙ„ Ø¨Ø§Ø´Ù‡ØŒ Ø­Ø°ÙØ´ Ú©Ù†
      <button
        type="button"
        onClick={() => askMainAdminEnable(setIsMainAdmin)}
        className={
          "h-6 w-6 rounded-md flex items-center justify-center transition " +
          (theme === "dark"
            ? "bg-white/10 hover:bg-white/15 text-white/70"
            : "bg-black/10 hover:bg-black/15 text-black/70")
        }
        aria-label="ÙˆØ±ÙˆØ¯ Ø§Ø¯Ù…ÛŒÙ†"
        title="ÙˆØ±ÙˆØ¯ Ø§Ø¯Ù…ÛŒÙ†"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 17v-2" />
          <path d="M8 10V8a4 4 0 0 1 8 0v2" />
          <rect x="7" y="10" width="10" height="10" rx="2" />
        </svg>
      </button>
    ) : null
    }
  </div>
</th>

    </tr>
  </thead>

  <tbody className={tbodyCls}>
    {pageItems.length === 0 ? (
      <tr>
        <td colSpan={7} className="py-6 text-black/60 dark:text-neutral-400">
          Ø¢ÛŒØªÙ…ÛŒ Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.
        </td>
      </tr>
    ) : (
      pageItems.map((l, idx) => {
        const id = String(letterIdOf(l));
        const absIdx = startIdx + idx;
        const isKeyboardActive = absIdx === kbdAbsIdx;
        const kind = letterKindOf(l);
        const isOutgoing = kind === "outgoing";
        const isIncoming = kind === "incoming";
        const isInternal = kind === "internal";
        const isLast = idx === pageItems.length - 1;
        const divider = isLast ? "" : rowDividerCls;

        const isConf = isConfidentialLetter(l);

const normalRowBg = isOutgoing
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

// âœ… Ù…Ø­Ø±Ù…Ø§Ù†Ù‡: Ø¨Ú©â€ŒÚ¯Ø±Ø§Ù†Ø¯ Ø«Ø§Ø¨Øª Ø¨Ø§ Ø±Ù†Ú¯ Ù…Ø¯Ù†Ø¸Ø±
const confRowBg = "bg-[#FF5C5C] hover:bg-[#FF5C5C]";

const rowBg = isConf ? confRowBg : normalRowBg;

        return (  
         <tr
          key={id}
          ref={(el) => {
            if (el) tableRowRefs.current.set(id, el);
            else tableRowRefs.current.delete(id);
          }}
          onClick={() => setKbdAbsIdx(absIdx)}
          className={
            rowBg +
            " transition-colors" +
            (isConf ? " font-semibold [&_td]:!text-white" : "") +
            (isKeyboardActive ? " outline outline-2 -outline-offset-2 outline-black/40 dark:outline-white/50" : "")
          }
        >
            <td className={"px-3 " + divider}>
              <input
                type="checkbox"
                className="w-4 h-4 accent-black dark:accent-neutral-200"
                checked={selectedIds.has(id)}
                onChange={() => toggleRowSelect(id)}
                aria-label="Ø§Ù†ØªØ®Ø§Ø¨"
                title="Ø§Ù†ØªØ®Ø§Ø¨"
              />
            </td>

            <td className={"px-3 " + divider}>
              <button
                type="button"
                onClick={() => {
                  setKbdAbsIdx(absIdx);
                  openView(l);
                }}
                className={
                  "mx-auto inline-flex items-center justify-center gap-2 font-semibold underline-offset-4 hover:underline transition " +
                  (isConf
                    ? "text-red-600 dark:text-red-400"
                    : theme === "dark"
                    ? "text-white"
                    : "text-neutral-900")
                }
                title="Ù†Ù…Ø§ÛŒØ´"
                aria-label="Ù†Ù…Ø§ÛŒØ´"
              >
                {toFaDigits(String(l?.secretariat_no ?? l?.secretariatNo ?? letterNoOf(l) ?? "").trim() || "â€”")}
              </button>
            </td>

            <td className={"px-3 " + divider}>{letterDateOf(l) ? toFaDigits(letterDateOf(l)) : "â€”"}</td>

            <td className={"px-3 " + divider}>
              <span className="block truncate mx-auto">{subjectOf(l) || "â€”"}</span>
            </td>

            <td className={"px-3 " + divider}>
              <span className="block truncate mx-auto">{fromToOf(l)}</span>
            </td>

            <td className={"px-3 " + divider}>
              <span className="block truncate mx-auto">{orgOf(l) || "â€”"}</span>
            </td>

            <td className={"!pl-6 !pr-3 " + divider}>
              <div className="w-full flex items-center justify-start gap-2 pl-3">
                <button
                  type="button"
                  onClick={() => {
                    setKbdAbsIdx(absIdx);
                    openView(l);
                  }}
                  className={iconBtnCls}
                  aria-label="Ù†Ù…Ø§ÛŒØ´"
                  title="Ù†Ù…Ø§ÛŒØ´"
                >
                  <img src="/images/icons/namayeshname.svg" alt="" className="w-5 h-5 dark:invert" />
                </button>

                <button type="button" onClick={() => startEdit(l)} className={iconBtnCls} aria-label="ÙˆÛŒØ±Ø§ÛŒØ´" title="ÙˆÛŒØ±Ø§ÛŒØ´">
                  <img src="/images/icons/pencil.svg" alt="" className="w-5 h-5 dark:invert" />
                </button>

                <button type="button" onClick={() => deleteLetter(id)} className={iconBtnCls} aria-label="Ø­Ø°Ù" title="Ø­Ø°Ù">
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
                      aria-label="ØµÙØ­Ù‡ Ù‚Ø¨Ù„"
                      title="ØµÙØ­Ù‡ Ù‚Ø¨Ù„"
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
                      aria-label="ØµÙØ­Ù‡ Ø¨Ø¹Ø¯"
                      title="ØµÙØ­Ù‡ Ø¨Ø¹Ø¯"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>

                    <div className="text-black/70 dark:text-neutral-400 whitespace-nowrap">
                      {total === 0 ? "Û° Ø§Ø² Û°" : `${toFaDigits(startIdx + 1)}â€“${toFaDigits(endIdx)} Ø§Ø² ${toFaDigits(total)}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-black/70 dark:text-neutral-400">ØªØ¹Ø¯Ø§Ø¯ Ø¯Ø± Ù‡Ø± ØµÙØ­Ù‡:</span>
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
                      Ù†Ù…Ø§ÛŒØ´ Ù†Ø§Ù…Ù‡
                      {viewLetter ? (
                        <span className={theme === "dark" ? "text-white/60 font-normal" : "text-neutral-600 font-normal"}>
                          {" "}
                          â€” {toFaDigits(letterNoOf(viewLetter) || "")}
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
                      aria-label="Ø¨Ø³ØªÙ†"
                      title="Ø¨Ø³ØªÙ†"
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
                            Ù…Ø´Ø®ØµØ§Øª Ù†Ø§Ù…Ù‡
                          </div>

                          <div className="px-4 divide-y divide-black/10 dark:divide-white/10">
                            <InfoRow
                              label="Ù†ÙˆØ¹"
                              value={
                                viewLetter
                                  ? (() => {
                                      const k = letterKindOf(viewLetter);
                                      if (k === "outgoing") {
                                        return (
                                          <span className="inline-flex items-center gap-2">
                                            <img src="/images/icons/sadere.svg" alt="" className="w-4 h-4 shrink-0" />
                                            <span>ØµØ§Ø¯Ø±Ù‡</span>
                                          </span>
                                        );
                                      }
                                      if (k === "incoming") {
                                        return (
                                          <span className="inline-flex items-center gap-2">
                                            <img src="/images/icons/varede.svg" alt="" className="w-4 h-4 shrink-0" />
                                            <span>ÙˆØ§Ø±Ø¯Ù‡</span>
                                          </span>
                                        );
                                      }
                                      return (
                                        <span className="inline-flex items-center gap-2">
                                          <img src="/images/icons/dakheli.svg" alt="" className="w-4 h-4 shrink-0" />
                                          <span>Ø¯Ø§Ø®Ù„ÛŒ</span>
                                        </span>
                                      );
                                    })()
                                  : ""
                              }
                            />
                            <InfoRow label={showModernViewLayout ? "Ú©Ù„Ø§Ø³ Ø³Ù†Ø¯" : "Ø¯Ø³ØªÙ‡ Ø¨Ù†Ø¯ÛŒ"} value={viewLetter ? categoryLabel(categoryOf(viewLetter)) : ""} />

                            <InfoRow
                              label={showModernViewLayout ? "Ù…Ø±Ú©Ø²/Ù¾Ø±ÙˆÚ˜Ù‡" : "Ù¾Ø±ÙˆÚ˜Ù‡"}
                              value={
                                viewLetter && (viewLetter?.project_id ?? viewLetter?.projectId)
                                  ? (() => {
                                      const pid = String(viewLetter?.project_id ?? viewLetter?.projectId);
                                      const p = findProject(pid);
                                      if (!p) return pid;
                                      return `${String(p.code || "")}${p.name ? ` - ${p.name}` : ""}`.trim();
                                    })()
                                  : "â€”"
                              }
                            />

                            {!showModernViewLayout && (
                              <div className="py-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  <div>
    <div className={labelCls}>Ø¨Ø§Ø²Ú¯Ø´Øª</div>
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
            placeholder="Ø´Ù…Ø§Ø±Ù‡/Ú©Ø¯ Ø¨Ø§Ø²Ú¯Ø´Øª"
          />

          <button
            type="button"
            onClick={() => setReturnToIds((prev) => [...(Array.isArray(prev) ? prev : [""]), ""])}
            className={iconBtnCls}
            aria-label="Ø§ÙØ²ÙˆØ¯Ù†"
            title="Ø§ÙØ²ÙˆØ¯Ù†"
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
              aria-label="Ø­Ø°Ù"
              title="Ø­Ø°Ù"
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
    <div className={labelCls}>Ù¾ÛŒØ±Ùˆ</div>
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
            placeholder="Ø´Ù…Ø§Ø±Ù‡/Ú©Ø¯ Ù¾ÛŒØ±Ùˆ"
          />

          <button
            type="button"
            onClick={() => setPiroIds((prev) => [...(Array.isArray(prev) ? prev : [""]), ""])}
            className={iconBtnCls}
            aria-label="Ø§ÙØ²ÙˆØ¯Ù†"
            title="Ø§ÙØ²ÙˆØ¯Ù†"
          >
            <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5 dark:invert" />
          </button>

          {idx > 0 && (
            <button
              type="button"
              onClick={() => setPiroIds((prev) => (Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : [""]))}
              className={iconBtnCls}
              aria-label="Ø­Ø°Ù"
              title="Ø­Ø°Ù"
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
                            )}

                            <InfoRow
                              label={isViewInternal ? "ÙˆØ§Ø­Ø¯Ù‡Ø§" : isViewOutgoing ? "Ø¨Ù‡" : isViewIncoming ? "Ø§Ø²" : "Ø§Ø² / Ø¨Ù‡"}
                              value={viewFromToValue}
                            />
                            {!showModernViewLayout && (
                              <InfoRow label="Ø´Ø±Ú©Øª/Ø³Ø§Ø²Ù…Ø§Ù†" value={viewLetter ? String(viewLetter?.org_name ?? viewLetter?.orgName ?? viewLetter?.org ?? "") : ""} />
                            )}
                            <InfoRow label="Ù…ÙˆØ¶ÙˆØ¹" value={viewLetter ? String(subjectOf(viewLetter) || "") : ""} />

                            <InfoRow label="Ø¶Ù…ÛŒÙ…Ù‡" value={viewHasAttachment ? "Ø¯Ø§Ø±Ø¯" : "Ù†Ø¯Ø§Ø±Ø¯"} />
                            {!showModernViewLayout && (
                              <InfoRow
                                label="Ø¨Ø§Ø²Ú¯Ø´Øª Ø¨Ù‡"
                                value={
                                  viewLetter
                                    ? linkedLetterNosText(
                                        Array.isArray(viewLetter?.return_to_ids)
                                          ? viewLetter.return_to_ids
                                          : Array.isArray(viewLetter?.returnToIds)
                                          ? viewLetter.returnToIds
                                          : []
                                      )
                                    : ""
                                }
                              />
                            )}

                            {!isViewInternal && (
                              <InfoRow
                                label={isViewIncoming || isViewOutgoing ? "Ø§Ø³Ù†Ø§Ø¯ Ù…Ø±ØªØ¨Ø·" : "Ù¾ÛŒØ±Ùˆ"}
                                value={
                                  viewLetter
                                    ? linkedLetterNosText(
                                        Array.isArray(viewLetter?.piro_ids)
                                          ? viewLetter.piro_ids
                                          : Array.isArray(viewLetter?.piroIds)
                                          ? viewLetter.piroIds
                                          : []
                                      )
                                    : ""
                                }
                              />
                            )}
                            {showModernViewLayout && (
                              <InfoRow
                                label="Ø¨Ø±Ú†Ø³Ø¨"
                                value={
                                  viewTagItems.length ? (
                                    <div className="flex flex-wrap gap-2">
                                      {viewTagItems.map((t) => {
                                        const id = String(t?.id ?? "");
                                        const label = tagLabelOf(t) || (id ? `Ø¨Ø±Ú†Ø³Ø¨ (${toFaDigits(id)})` : "Ø¨Ø±Ú†Ø³Ø¨");
                                        return (
                                          <span
                                            key={id || label}
                                            className={
                                              "inline-flex items-center rounded-full border px-3 py-1 text-xs " +
                                              (theme === "dark"
                                                ? "border-white/15 bg-white/10 text-white"
                                                : "border-black/10 bg-black/[0.04] text-neutral-900")
                                            }
                                          >
                                            {label}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    "â€”"
                                  )
                                }
                              />
                            )}

                            <InfoRow label="ØªØ§Ø±ÛŒØ® Ø«Ø¨Øª Ø¯Ø¨ÛŒØ±Ø®Ø§Ù†Ù‡" value={viewLetter ? toFaDigits(String(viewLetter?.secretariat_date ?? viewLetter?.secretariatDate ?? "")) : ""} />
                            <InfoRow label="Ø´Ù…Ø§Ø±Ù‡ Ø«Ø¨Øª Ø¯Ø¨ÛŒØ±Ø®Ø§Ù†Ù‡" value={viewLetter ? String(viewLetter?.secretariat_no ?? viewLetter?.secretariatNo ?? "") : ""} />
                            <InfoRow label="Ù…Ø³Ø¦ÙˆÙ„ Ø¯Ø¨ÛŒØ±Ø®Ø§Ù†Ù‡" value={viewLetter ? String(viewLetter?.receiver_name ?? viewLetter?.receiverName ?? "") : ""} />
                          </div>
                        </div>

                        {viewAttachments.length > 1 && (
                          <div className="mt-3">
                            <div className={labelCls}>ÙØ§ÛŒÙ„â€ŒÙ‡Ø§</div>
                            <div className="flex flex-wrap gap-2">
                              {viewAttachments.map((a, i) => {
                                const u = attachmentUrlOf(a);
                                const n = attachmentNameOf(a) || `ÙØ§ÛŒÙ„ ${i + 1}`;
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
	                            <div className="text-sm font-semibold">Ù¾ÛŒØ´ Ù†Ù…Ø§ÛŒØ´</div>
	                          </div>

	                          <div className="flex-1 p-3 overflow-hidden flex flex-col">
	                            {viewAttachments.length > 1 ? (
	                              <div className="mb-2">
	                                <div className={theme === "dark" ? "text-xs text-white/60 mb-1" : "text-xs text-neutral-600 mb-1"}>
	                                  Ø§Ù†ØªØ®Ø§Ø¨ ÙØ§ÛŒÙ„ ({toFaDigits(viewAttIdx + 1)} / {toFaDigits(viewAttachments.length)})
	                                </div>
	                                <div className="flex flex-wrap gap-2">
	                                  {viewAttachments.map((a, i) => {
	                                    const n = attachmentNameOf(a) || `ÙØ§ÛŒÙ„ ${toFaDigits(i + 1)}`;
	                                    const active = (viewAttIdx || 0) === i;
	                                    return (
	                                      <button
	                                        key={`preview_pick_${i}`}
	                                        type="button"
	                                        onClick={() => setViewAttIdx(i)}
	                                        className={
	                                          "h-9 px-3 rounded-xl border transition text-xs max-w-[180px] truncate " +
	                                          (active
	                                            ? theme === "dark"
	                                              ? "border-white/15 bg-white text-black"
	                                              : "border-black/15 bg-black text-white"
	                                            : theme === "dark"
	                                            ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
	                                            : "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]")
	                                        }
	                                        title={n}
	                                      >
	                                        {n}
	                                      </button>
	                                    );
	                                  })}
	                                </div>
	                              </div>
	                            ) : null}

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
                                ) : (
                                  <div className="h-full w-full grid place-items-center p-6">
                                    <div className={theme === "dark" ? "text-white/70 text-sm" : "text-neutral-700 text-sm"}>Ø§Ù…Ú©Ø§Ù† Ù¾ÛŒØ´ Ù†Ù…Ø§ÛŒØ´ Ø§ÛŒÙ† Ù†ÙˆØ¹ ÙØ§ÛŒÙ„ Ù†ÛŒØ³Øª.</div>
                                  </div>
                                )
                              ) : (
                                <div className="h-full w-full grid place-items-center p-6">
                                  <div className={theme === "dark" ? "text-white/60 text-sm" : "text-neutral-600 text-sm"}>ÙØ§ÛŒÙ„ÛŒ Ø¨Ø±Ø§ÛŒ Ù¾ÛŒØ´ Ù†Ù…Ø§ÛŒØ´ Ù…ÙˆØ¬ÙˆØ¯ Ù†ÛŒØ³Øª.</div>
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
                                title="Ø¯Ø§Ù†Ù„ÙˆØ¯ ÙØ§ÛŒÙ„"
                                aria-label="Ø¯Ø§Ù†Ù„ÙˆØ¯ ÙØ§ÛŒÙ„"
                              >
                                <img src="/images/icons/download.svg" alt="" className={"w-5 h-5 " + (theme === "dark" ? "" : "invert")} />
                                <span className="text-sm font-semibold">Ø¯Ø§Ù†Ù„ÙˆØ¯ ÙØ§ÛŒÙ„</span>
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
              <div className="font-bold text-sm">Ø§Ù†ØªØ®Ø§Ø¨ Ø¨Ø±Ú†Ø³Ø¨</div>

              {/* âœ… Ø¨Ø³ØªÙ†: Ø¢ÛŒÚ©Ù† Ù…Ø´Ú©ÛŒ */}
              <button
                type="button"
                onClick={() => setTagPickOpen(false)}
                className={
                  "h-10 w-10 rounded-xl flex items-center justify-center transition ring-1 " +
                  (theme === "dark"
                    ? "bg-white text-black ring-white/20 hover:bg-white/90"
                    : "bg-white text-black ring-black/15 hover:bg-black/5")
                }
                aria-label="Ø¨Ø³ØªÙ†"
                title="Ø¨Ø³ØªÙ†"
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
              {/* âœ… Ø³Ù‡ ØªØ¨ Ø­ØªÙ…Ø§ Ø³Ù…Øª Ø±Ø§Ø³Øª + ØªØ±ØªÛŒØ¨: Ù¾Ø±ÙˆÚ˜Ù‡â€ŒÙ‡Ø§ØŒ Ù†Ø§Ù…Ù‡â€ŒÙ‡Ø§ Ùˆ Ù…Ø³ØªÙ†Ø¯Ø§ØªØŒ Ø§Ø¬Ø±Ø§ÛŒ Ù¾Ø±ÙˆÚ˜Ù‡â€ŒÙ‡Ø§ */}
              <div className="flex items-center justify-start gap-2">
	                {(() => {
	                  const baseTabs =
	                    tagPickFor === "form"
	                      ? (Array.isArray(TAG_PICK_TABS) ? TAG_PICK_TABS.filter((x) => x?.id === "letters") : [])
	                      : (Array.isArray(TAG_PICK_TABS) ? TAG_PICK_TABS : []);
	                  const order = ["projects", "letters", "execution"];
	                  const ordered =
	                    baseTabs.length
	                      ? [
	                          ...order
	                            .map((id) => baseTabs.find((x) => x?.id === id))
	                            .filter(Boolean),
	                          ...baseTabs.filter((x) => !order.includes(x?.id)),
	                        ]
	                      : [];

	                  const tabsToRender = ordered.length ? ordered : baseTabs;

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

                // âœ… Ù¾Ø±ÙˆÚ˜Ù‡â€ŒÙ‡Ø§ Ø¯Ø³ØªÙ‡â€ŒØ¨Ù†Ø¯ÛŒ Ù†Ø¯Ø§Ø±Ù†Ø¯
                if (tagPickKind === "projects") {
                  return (
                    <div className="mt-3 text-xs text-neutral-500 dark:text-white/50">
                      Ù¾Ø±ÙˆÚ˜Ù‡â€ŒÙ‡Ø§ Ø¯Ø³ØªÙ‡â€ŒØ¨Ù†Ø¯ÛŒ Ù†Ø¯Ø§Ø±Ø¯.
                    </div>
                  );
                }

                if (!cats.length) return null;

                return (
                  <div className="mt-3">
                    <div className={labelCls}>Ø¯Ø³ØªÙ‡â€ŒØ¨Ù†Ø¯ÛŒâ€ŒÙ‡Ø§</div>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Ù‡Ù…Ù‡ */}
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
                        Ù‡Ù…Ù‡
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
                <div className={labelCls}>Ø¬Ø³ØªØ¬Ùˆ</div>
                <input
                  value={tagPickSearch}
                  onChange={(e) => setTagPickSearch(e.target.value)}
                  className={inputCls}
                  placeholder="Ø¬Ø³ØªØ¬Ùˆ Ø¯Ø± Ø¨Ø±Ú†Ø³Ø¨â€ŒÙ‡Ø§..."
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
                      Ú†ÛŒØ²ÛŒ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.
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
              {/* âœ… ØªØ§ÛŒÛŒØ¯: Ø¢ÛŒÚ©Ù† Ø³ÙÛŒØ¯ */}
              <button
                type="button"
                onClick={applyPickedTags}
                className={
                  "h-10 w-10 rounded-xl flex items-center justify-center transition ring-1 " +
                  (theme === "dark"
                    ? "bg-black text-white ring-white/10 hover:bg-black/90"
                    : "bg-black text-white ring-black/15 hover:bg-black/90")
                }
                aria-label="ØªØ§ÛŒÛŒØ¯"
                title="ØªØ§ÛŒÛŒØ¯"
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
  Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø§Ø³Ù†Ø§Ø¯{" "}
  {uploadFor === "incoming" ? "(ÙˆØ§Ø±Ø¯Ù‡)" : uploadFor === "outgoing" ? "(ØµØ§Ø¯Ø±Ù‡)" : "(Ø¯Ø§Ø®Ù„ÛŒ)"}
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
  aria-label="Ø¨Ø³ØªÙ†"
  title="Ø¨Ø³ØªÙ†"
>
  <img
    src="/images/icons/bastan.svg"
    alt=""
    className="w-4 h-4 invert"
  />
</button>

          </div>

          <div className={theme === "dark" ? "h-px bg-white/10" : "h-px bg-black/10"} />

          <div className="p-4 grid grid-cols-1 gap-4">
                  {/* Right: pick new + selected list */}
                  <div>
                    <div className={labelCls}>ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ÛŒ Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡</div>

                    <div className={"rounded-2xl border overflow-hidden " + (theme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-white")}>
                      <div className={"px-3 py-2 text-xs font-semibold border-b " + (theme === "dark" ? "border-white/10 text-white/80" : "border-black/10 text-neutral-700")}>
                        {uploadFor === "incoming" ? "ÙˆØ§Ø±Ø¯Ù‡" : uploadFor === "outgoing" ? "ØµØ§Ø¯Ø±Ù‡" : "Ø¯Ø§Ø®Ù„ÛŒ"}
                      </div>

                      <div className="p-3 space-y-2">
                        {currentDocFiles.length === 0 ? (
                          <div className="py-6 text-center text-black/60 dark:text-white/50 text-sm">ÙØ§ÛŒÙ„ÛŒ Ø§Ù†ØªØ®Ø§Ø¨ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.</div>
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
                                <div className="text-[13px] font-semibold whitespace-normal break-words leading-6">
                                  {f.name}
                                </div>
                                <div className={theme === "dark" ? "text-white/60 text-[11px] mt-1" : "text-neutral-600 text-[11px] mt-1"}>
                                  {formatBytes(f.size)} {f.url ? "â€” Ø§Ù„ØµØ§Ù‚ Ø´Ø¯Ù‡" : f.status === "uploading" ? `â€” ${toFaDigits(f.progress)}Ùª` : ""}
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
                                    title="Ø¨Ø§Ø² Ú©Ø±Ø¯Ù†"
                                  >
                                    Ø¨Ø§Ø² Ú©Ø±Ø¯Ù†
                                  </a>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() => removeDocFile(uploadFor, f.id)}
                                  className={iconBtnCls}
                                  title="Ø­Ø°Ù"
                                  aria-label="Ø­Ø°Ù"
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
                            ÙØ§ÛŒÙ„ Ø±Ø§ Ø§ÛŒÙ†Ø¬Ø§ Ø±Ù‡Ø§ Ú©Ù†ÛŒØ¯
                          </div>
                          <div className={theme === "dark" ? "text-white/50 text-xs mt-1" : "text-neutral-500 text-xs mt-1"}>
                            ÛŒØ§ Ø¨Ø§ Ø¯Ú©Ù…Ù‡ Ø²ÛŒØ± Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯ (ØªØµÙˆÛŒØ± / PDF)
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
                              Ø§Ù†ØªØ®Ø§Ø¨ ÙØ§ÛŒÙ„
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
    aria-label="ØªØ§ÛŒÛŒØ¯"
    title="ØªØ§ÛŒÛŒØ¯"
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
                  <div className="font-bold text-sm">Ø§ÙØ²ÙˆØ¯Ù† Ø¨Ø±Ú†Ø³Ø¨</div>
                  <button
                    type="button"
                    onClick={() => setAddTagOpen(false)}
                    className={
                      "h-10 w-10 rounded-xl flex items-center justify-center transition ring-1 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 " +
                      (theme === "dark" ? "ring-neutral-800 hover:bg-white/10 text-white" : "ring-black/15 hover:bg-black/90 bg-black text-white")
                    }
                    aria-label="Ø¨Ø³ØªÙ†"
                    title="Ø¨Ø³ØªÙ†"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className={theme === "dark" ? "h-px bg-white/10" : "h-px bg-black/10"} />
                <div className="p-4 space-y-3">
                  <div>
                    <div className={labelCls}>Ø¹Ù†ÙˆØ§Ù† Ø¨Ø±Ú†Ø³Ø¨</div>
                    <input value={newTagLabel} onChange={(e) => setNewTagLabel(e.target.value)} className={inputCls} type="text" placeholder="Ù…Ø«Ù„Ø§: ÙÙˆØ±ÛŒ" />
                  </div>
                  {Array.isArray(tagCategories) && tagCategories.length > 0 ? (
                    <div>
                      <div className={labelCls}>Ø¯Ø³ØªÙ‡â€ŒØ¨Ù†Ø¯ÛŒ</div>
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
                      Ø§Ù†ØµØ±Ø§Ù
                    </button>
                    <button
                      type="button"
                      onClick={createTag}
                      className={
                        "h-10 px-4 rounded-xl transition " +
                        (theme === "dark" ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90")
                      }
                    >
                      Ø«Ø¨Øª
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
