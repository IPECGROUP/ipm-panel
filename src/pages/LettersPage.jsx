// src/pages/LettersPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/ui/Card.jsx";

const TABS = [
  { id: "incoming", label: "وارده" },
  { id: "outgoing", label: "صادره" },
];

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

function JalaliPopupDatePicker({ value, onChange, theme }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const popRef = useRef(null);

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

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          "w-full h-11 px-3 rounded-xl border text-right flex items-center justify-between gap-2 transition " +
          (theme === "dark"
            ? "border-white/15 bg-white/5 text-white/90 hover:bg-white/10"
            : "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]")
        }
      >
        <span className={value ? "" : theme === "dark" ? "text-white/50" : "text-neutral-400"}>
          {value ? toFaDigits(value) : ""}
        </span>
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
      </button>

      {open && (
        <div
          ref={popRef}
          className={
            "absolute z-50 mt-2 w-[min(420px,calc(100vw-24px))] rounded-2xl border shadow-lg p-4 " +
            (theme === "dark"
              ? "border-white/10 bg-neutral-900 text-white"
              : "border-black/10 bg-white text-neutral-900")
          }
          style={{ insetInlineEnd: 0 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-sm">انتخاب تاریخ</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={
                "h-9 w-9 rounded-xl border flex items-center justify-center transition " +
                (theme === "dark"
                  ? "border-white/10 hover:bg-white/10"
                  : "border-black/10 hover:bg-black/[0.04]")
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
              <div className={theme === "dark" ? "text-white/70 text-xs mb-1" : "text-neutral-600 text-xs mb-1"}>
                سال
              </div>
              <select
                value={jy}
                onChange={(e) => setJy(Number(e.target.value))}
                className={
                  "w-full h-11 px-3 rounded-xl border outline-none " +
                  (theme === "dark"
                    ? "border-white/15 bg-white/5 text-white"
                    : "border-black/10 bg-white text-neutral-900")
                }
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {toFaDigits(y)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className={theme === "dark" ? "text-white/70 text-xs mb-1" : "text-neutral-600 text-xs mb-1"}>
                ماه
              </div>
              <select
                value={jm}
                onChange={(e) => setJm(Number(e.target.value))}
                className={
                  "w-full h-11 px-3 rounded-xl border outline-none " +
                  (theme === "dark"
                    ? "border-white/15 bg-white/5 text-white"
                    : "border-black/10 bg-white text-neutral-900")
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
              <div className={theme === "dark" ? "text-white/70 text-xs mb-1" : "text-neutral-600 text-xs mb-1"}>
                روز
              </div>
              <select
                value={jd}
                onChange={(e) => setJd(Number(e.target.value))}
                className={
                  "w-full h-11 px-3 rounded-xl border outline-none " +
                  (theme === "dark"
                    ? "border-white/15 bg-white/5 text-white"
                    : "border-black/10 bg-white text-neutral-900")
                }
              >
                {days.map((d) => (
                  <option key={d} value={d}>
                    {toFaDigits(d)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className={theme === "dark" ? "text-white/70 text-xs" : "text-neutral-600 text-xs"}>
              پیش نمایش: <span className="font-semibold">{toFaDigits(preview)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onChange(preview);
                  setOpen(false);
                }}
                className={
                  "h-10 px-4 rounded-xl transition " +
                  (theme === "dark"
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-black text-white hover:bg-black/90")
                }
              >
                تایید
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={
                  "h-10 px-4 rounded-xl border transition " +
                  (theme === "dark"
                    ? "border-white/15 hover:bg-white/10"
                    : "border-black/10 hover:bg-black/[0.04]")
                }
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LettersPage() {
  const API_BASE = (window.API_URL || "/api").replace(/\/+$/, "");
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

  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
  useEffect(() => {
    const tick = () =>
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);

  const [formOpen, setFormOpen] = useState(false);
  const [tab, setTab] = useState("incoming");

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
  const [returnToIds, setReturnToIds] = useState([""]);
  const [myLetters, setMyLetters] = useState([]);

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
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await api("/letters/mine");
        const items = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
        if (!mounted) return;
        setMyLetters(items);
      } catch {
        if (!mounted) return;
        setMyLetters([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const todayJalali = useMemo(() => {
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

  const inputBase =
    "w-full h-11 px-3 rounded-xl border outline-none transition text-right";
  const inputCls =
    theme === "dark"
      ? inputBase + " border-white/15 bg-white/5 text-white placeholder:text-white/40 focus:bg-white/10"
      : inputBase + " border-black/10 bg-white text-neutral-900 placeholder:text-neutral-400 focus:bg-black/[0.02]";

  const labelCls = theme === "dark" ? "text-white/70 text-xs mb-1" : "text-neutral-600 text-xs mb-1";

  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="text-lg md:text-xl font-bold">نامه ها</div>

        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className={
            "h-10 w-10 rounded-xl flex items-center justify-center transition ring-1 " +
            (theme === "dark"
              ? "ring-neutral-800 hover:bg-white/10"
              : "ring-black/15 hover:bg-black/5")
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

      <Card
        className={
          "rounded-2xl border overflow-hidden " +
          (theme === "dark" ? "border-white/10 bg-neutral-900" : "border-black/10 bg-white")
        }
      >
        <div className="p-3 md:p-4">
          <div className="flex items-center gap-2">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={
                    "h-10 px-5 rounded-xl border transition text-sm font-semibold " +
                    (active
                      ? "bg-[#4895ef] text-white border-[#4895ef]"
                      : theme === "dark"
                      ? "bg-transparent text-white border-[#4895ef] hover:bg-white/5"
                      : "bg-white text-neutral-900 border-[#4895ef] hover:bg-black/[0.02]")
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {formOpen && tab === "incoming" && (
            <div className="mt-4">
              {/* ردیف دسته‌بندی */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className={labelCls}>دسته بندی نامه</div>
                  <select
                    value={category}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCategory(v);
                      if (v !== "project") setProjectId("");
                    }}
                    className={inputCls}
                  >
                    <option value=""></option>
                    <option value="project">پروژه</option>
                  </select>
                </div>

                {category === "project" ? (
                  <div>
                    <div className={labelCls}>پروژه</div>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className={inputCls}
                    >
                      <option value=""></option>
                      {projects.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {String(p.code || "")} {p.name ? `- ${p.name}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div />
                )}
              </div>

              {/* شماره نامه + تاریخ نامه */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <div className={labelCls}>شماره نامه</div>
                  <input
                    value={letterNo}
                    onChange={(e) => setLetterNo(e.target.value)}
                    className={inputCls}
                    type="text"
                  />
                </div>

                <div>
                  <div className={labelCls}>تاریخ نامه</div>
                  <JalaliPopupDatePicker value={letterDate} onChange={setLetterDate} theme={theme} />
                </div>
              </div>

              {/* از + شرکت/سازمان */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <div className={labelCls}>از</div>
                  <input
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    className={inputCls}
                    type="text"
                  />
                </div>

                <div>
                  <div className={labelCls}>شرکت/سازمان</div>
                  <input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className={inputCls}
                    type="text"
                  />
                </div>
              </div>

              {/* به */}
              <div className="mt-3">
                <div className={labelCls}>به</div>
                <input
                  value={toName}
                  onChange={(e) => setToName(e.target.value)}
                  className={inputCls}
                  type="text"
                />
              </div>

              {/* موضوع */}
              <div className="mt-3">
                <div className={labelCls}>موضوع</div>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={inputCls}
                  type="text"
                />
              </div>

              {/* ضمیمه + بازگشت به */}
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={theme === "dark" ? "text-white/80 text-sm" : "text-neutral-800 text-sm"}>
                      ضمیمه:
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasAttachment"
                        checked={!hasAttachment}
                        onChange={() => setHasAttachment(false)}
                      />
                      <span className={theme === "dark" ? "text-white/80 text-sm" : "text-neutral-700 text-sm"}>
                        ندارد
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasAttachment"
                        checked={hasAttachment}
                        onChange={() => setHasAttachment(true)}
                      />
                      <span className={theme === "dark" ? "text-white/80 text-sm" : "text-neutral-700 text-sm"}>
                        دارد
                      </span>
                    </label>
                  </div>
                </div>

                {hasAttachment && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={labelCls.replace("mb-1", "mb-0")}>بازگشت به</div>
                    </div>

                    <div className="space-y-2">
                      {returnToIds.map((v, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <select
                            value={v}
                            onChange={(e) => {
                              const nv = e.target.value;
                              setReturnToIds((arr) => arr.map((x, i) => (i === idx ? nv : x)));
                            }}
                            className={inputCls}
                          >
                            <option value=""></option>
                            {myLetters.map((l) => (
                              <option key={l.id} value={String(l.id)}>
                                {String(l.letter_no || "")}
                              </option>
                            ))}
                          </select>

                          {idx === returnToIds.length - 1 && (
                            <button
                              type="button"
                              onClick={() => setReturnToIds((arr) => [...arr, ""])}
                              className={
                                "h-10 w-10 rounded-xl flex items-center justify-center transition ring-1 " +
                                (theme === "dark"
                                  ? "ring-neutral-800 hover:bg-white/10"
                                  : "ring-black/15 hover:bg-black/5")
                              }
                              aria-label="افزودن"
                              title="افزودن"
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
                                <path d="M12 5v14M5 12h14" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* بارگذاری نامه */}
              <div className="mt-4">
                <div className={labelCls}>بارگذاری نامه</div>
                <div
                  className={
                    "w-full h-12 rounded-xl border " +
                    (theme === "dark" ? "border-white/15 bg-white/5" : "border-black/10 bg-white")
                  }
                />
              </div>

              {/* برچسب ها */}
              <div className="mt-3">
                <div className={labelCls}>برچسب ها</div>
                <div
                  className={
                    "w-full h-12 rounded-xl border " +
                    (theme === "dark" ? "border-white/15 bg-white/5" : "border-black/10 bg-white")
                  }
                />
              </div>

              {/* خط جداکننده */}
              <div className={theme === "dark" ? "my-5 h-px bg-white/10" : "my-5 h-px bg-black/10"} />

              {/* اطلاعات دبیرخانه */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <div className={labelCls}>تاریخ ثبت دبیرخانه</div>
                    <div
                      className={
                        "h-11 px-3 rounded-xl border flex items-center " +
                        (theme === "dark"
                          ? "border-white/15 bg-white/5 text-white/90"
                          : "border-black/10 bg-white text-neutral-900")
                      }
                    >
                      <span className="truncate">{todayJalali || ""}</span>
                    </div>
                  </div>

                  <div>
                    <div className={labelCls}>شماره ثبت دبیرخانه</div>
                    <div
                      className={
                        "h-11 px-3 rounded-xl border flex items-center " +
                        (theme === "dark"
                          ? "border-white/15 bg-white/5 text-white/90"
                          : "border-black/10 bg-white text-neutral-900")
                      }
                    />
                  </div>

                  <div>
                    <div className={labelCls}>نام تحویل گیرنده</div>
                    <div
                      className={
                        "h-11 px-3 rounded-xl border flex items-center " +
                        (theme === "dark"
                          ? "border-white/15 bg-white/5 text-white/90"
                          : "border-black/10 bg-white text-neutral-900")
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {formOpen && tab === "outgoing" && <div className="mt-4" />}
        </div>
      </Card>
    </div>
  );
}
