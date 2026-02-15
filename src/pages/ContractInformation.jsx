import React from "react";
import { createPortal } from "react-dom";
import Card from "../components/ui/Card.jsx";
import { dayjs } from "../utils/date";

const CONTRACT_SCOPE_TABS = [
  { id: "main", label: "قرارداد اصلی (با کارفرما)" },
  { id: "sub", label: "قرارداد فرعی (با پیمانکاران/ تامین کنندگان/ مشاوران)" },
];

const DETAIL_TABS = [
  { id: "general", label: "عمومی" },
  { id: "technical", label: "فنی" },
  { id: "financial", label: "مالی" },
];

const CONTRACT_TYPES = [
  "مشاوره و مهندسی",
  "خرید و تامین کالا",
  "پیمانکاری",
  "اجاره ماشین آلات و تجهیزات",
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

function toFaDigits(s) {
  return String(s || "").replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
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

function toGregorianYmd(jalaliYmd) {
  const raw = String(jalaliYmd || "").trim();
  if (!raw) return "";
  const normalized = toEnDigits(raw).replace(/\//g, "-");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return "";
  try {
    return dayjs(normalized, { jalali: true }).calendar("gregory").format("YYYY-MM-DD");
  } catch {
    return "";
  }
}

function firstStringValue(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null) {
      const text = String(value).trim();
      if (text) return text;
    }
  }
  return "";
}

function JalaliPopupDatePicker({ value, onChange, buttonClassName }) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef(null);
  const popRef = React.useRef(null);
  const [pos, setPos] = React.useState({ top: 0, right: 0 });

  const nowParts = React.useMemo(() => getJalaliPartsFromDate(new Date()), []);
  const initial = React.useMemo(() => {
    const v = String(value || "");
    const m = v.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (m) {
      return { jy: Number(m[1]), jm: Number(m[2]), jd: Number(m[3]) };
    }
    return nowParts;
  }, [value, nowParts]);

  const [jy, setJy] = React.useState(initial.jy);
  const [jm, setJm] = React.useState(initial.jm);
  const [jd, setJd] = React.useState(initial.jd);

  React.useEffect(() => {
    const v = String(value || "");
    const m = v.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (!m) return;
    setJy(Number(m[1]));
    setJm(Number(m[2]));
    setJd(Number(m[3]));
  }, [value]);

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (!open) return;
    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  const years = React.useMemo(() => {
    const base = nowParts.jy || 1400;
    const arr = [];
    for (let y = base - 10; y <= base + 10; y += 1) arr.push(y);
    return arr;
  }, [nowParts.jy]);

  const days = React.useMemo(() => {
    const max = jm <= 6 ? 31 : jm <= 11 ? 30 : 29;
    const arr = [];
    for (let d = 1; d <= max; d += 1) arr.push(d);
    return arr;
  }, [jm]);

  React.useEffect(() => {
    const max = jm <= 6 ? 31 : jm <= 11 ? 30 : 29;
    if (jd > max) setJd(max);
  }, [jm, jd]);

  const preview = `${jy}/${pad2(jm)}/${pad2(jd)}`;

  const defaultBtnCls =
    "w-full h-11 px-3 rounded-xl border text-right flex items-center justify-between gap-2 transition " +
    "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02]";

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

  React.useEffect(() => {
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
        className={buttonClassName || defaultBtnCls}
      >
        <span className={value ? "" : "text-neutral-400"}>{value ? toFaDigits(value) : ""}</span>
        <span className="text-neutral-500">
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

      {open &&
        createPortal(
          <div
            ref={popRef}
            className="fixed z-[9999] w-[min(420px,calc(100vw-24px))] rounded-2xl border shadow-lg p-4 border-black/10 bg-white text-neutral-900"
            style={{ top: pos.top, right: pos.right }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-sm">انتخاب تاریخ</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 w-9 rounded-xl border flex items-center justify-center transition border-black/10 hover:bg-black/[0.04]"
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
                <div className="text-neutral-600 text-xs mb-1">روز</div>
                <select
                  value={jd}
                  onChange={(e) => setJd(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl border outline-none border-black/10 bg-white text-neutral-900"
                >
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {toFaDigits(d)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-neutral-600 text-xs mb-1">ماه</div>
                <select
                  value={jm}
                  onChange={(e) => setJm(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl border outline-none border-black/10 bg-white text-neutral-900"
                >
                  {PERSIAN_MONTHS.map((name, idx) => (
                    <option key={name} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-neutral-600 text-xs mb-1">سال</div>
                <select
                  value={jy}
                  onChange={(e) => setJy(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl border outline-none border-black/10 bg-white text-neutral-900"
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
              <div className="text-neutral-600 text-xs">
                پیش نمایش: <span className="font-semibold">{toFaDigits(preview)}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end w-full">
                <button
                  type="button"
                  onClick={() => {
                    onChange(preview);
                    setOpen(false);
                  }}
                  className="h-10 px-4 rounded-xl transition bg-black text-white hover:bg-black/90"
                >
                  تایید
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-10 px-4 rounded-xl border transition border-black/10 hover:bg-black/[0.04]"
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

export default function ContractInformation() {
  const [projects, setProjects] = React.useState([]);
  const [projectsLoading, setProjectsLoading] = React.useState(false);
  const [projectId, setProjectId] = React.useState("");
  const [error, setError] = React.useState("");

  const [contractScopeTab, setContractScopeTab] = React.useState(CONTRACT_SCOPE_TABS[0].id);
  const [detailTab, setDetailTab] = React.useState(DETAIL_TABS[0].id);
  const [generalForm, setGeneralForm] = React.useState({
    contractType: "",
    contractNo: "",
    contractTitle: "",
    contractSubject: "",
    employerAssignor: "",
    mainEmployer: "",
    partners: "",
    mainContractors: "",
    notifyDateJ: "",
    notifyDateG: "",
    startDateJ: "",
    startDateG: "",
    duration: "",
    endDateJ: "",
    endDateG: "",
    adjustment: "has",
  });

  const api = React.useCallback(async (path, opt = {}) => {
    const base = (window.API_URL || "/api").replace(/\/+$/, "");
    const res = await fetch(base + path, {
      credentials: "include",
      cache: "no-store",
      ...opt,
      headers: {
        "Content-Type": "application/json",
        ...(opt.headers || {}),
      },
    });

    const txt = await res.text();
    let data = {};
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch {
      throw new Error("bad_json_response");
    }
    if (!res.ok) throw new Error(data?.error || data?.message || "request_failed");
    return data;
  }, []);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setProjectsLoading(true);
      setError("");
      try {
        const r = await api("/projects");
        const raw = Array.isArray(r) ? r : Array.isArray(r?.projects) ? r.projects : Array.isArray(r?.items) ? r.items : [];

        const onlyActive = (raw || [])
          .filter((p) => p && typeof p === "object" && !Array.isArray(p))
          .map((p) => ({
            ...p,
            id: p?.id == null ? null : String(p.id),
            code: p?.code == null ? "" : String(p.code).trim(),
            name: p?.name == null ? "" : String(p.name).trim(),
            isActive: p?.isActive !== false,
          }))
          .filter((p) => p.id != null && p.isActive)
          .sort((a, b) =>
            String(a.code || "").localeCompare(String(b.code || ""), "fa", {
              numeric: true,
              sensitivity: "base",
            })
          );

        if (alive) setProjects(onlyActive);
      } catch (ex) {
        if (!alive) return;
        setProjects([]);
        setError(ex?.message || "خطا در دریافت پروژه‌ها");
      } finally {
        if (alive) setProjectsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [api]);

  React.useEffect(() => {
    if (!projectId) return;
    const exists = (projects || []).some((p) => String(p.id) === String(projectId));
    if (!exists) setProjectId("");
  }, [projectId, projects]);

  const selectedProject = React.useMemo(
    () => (projects || []).find((p) => String(p.id) === String(projectId)),
    [projects, projectId]
  );

  const selectedProjectNameFa = React.useMemo(() => {
    if (!selectedProject) return "";
    return firstStringValue(selectedProject, [
      "nameFa",
      "name_fa",
      "titleFa",
      "title_fa",
      "persianName",
      "persian_name",
      "name",
    ]);
  }, [selectedProject]);

  const selectedProjectNameEn = React.useMemo(() => {
    if (!selectedProject) return "";
    return firstStringValue(selectedProject, [
      "nameEn",
      "name_en",
      "titleEn",
      "title_en",
      "englishName",
      "english_name",
      "nameLatin",
      "name_latin",
      "name",
    ]);
  }, [selectedProject]);

  const setGeneralField = (field, value) => {
    setGeneralForm((prev) => ({ ...prev, [field]: value }));
  };

  const setGeneralJalaliDate = (jalaliField, gregorianField, value) => {
    setGeneralForm((prev) => ({
      ...prev,
      [jalaliField]: value || "",
      [gregorianField]: toGregorianYmd(value || ""),
    }));
  };

  const tabBtnClass = (isActive) =>
    `h-10 px-4 rounded-2xl border text-sm shadow-sm transition ${
      isActive
        ? "bg-neutral-100 text-neutral-900 border-neutral-100"
        : "bg-white text-black border-black/15 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
    }`;

  const adjustmentBtnClass = (isActive) =>
    `h-10 px-4 rounded-2xl border text-sm shadow-sm transition ${
      isActive
        ? "bg-black text-white border-black"
        : "bg-white text-black border-black/15 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
    }`;

  return (
    <Card
      className="p-5 md:p-6 rounded-2xl border bg-white text-black border-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
      dir="rtl"
    >
      <div className="mb-5 text-base md:text-lg">
        <span className="text-black/70 dark:text-neutral-300">پروژه‌ها</span>
        <span className="mx-2 text-black/50 dark:text-neutral-400">›</span>
        <span className="font-semibold text-black dark:text-neutral-100">اطلاعات قراردادی</span>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-4 md:p-5 space-y-4 dark:bg-neutral-900 dark:border-neutral-800">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-black/70 dark:text-neutral-300">پروژه</label>
          <select
            className="w-full h-11 rounded-xl px-3 ltr font-[inherit] bg-white text-black placeholder-black/40 border border-black/15 outline-none dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option className="bg-white text-black dark:bg-neutral-900 dark:text-neutral-100" value="">
              {projectsLoading ? "در حال بارگذاری پروژه‌ها..." : "انتخاب پروژه فعال"}
            </option>
            {(projects || []).map((p) => (
              <option
                className="bg-white text-black dark:bg-neutral-900 dark:text-neutral-100"
                key={p.id}
                value={p.id}
              >
                {p.code ? `${p.code} - ` : ""}
                {p.name || "بدون نام"}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {CONTRACT_SCOPE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setContractScopeTab(tab.id)}
              className={tabBtnClass(contractScopeTab === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {DETAIL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDetailTab(tab.id)}
              className={tabBtnClass(detailTab === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {detailTab === "general" ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-black/70 dark:text-neutral-300">نوع قرارداد</label>
              <select
                className="w-full h-11 rounded-xl px-3 bg-white text-black border border-black/15 outline-none dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                value={generalForm.contractType}
                onChange={(e) => setGeneralField("contractType", e.target.value)}
              >
                <option className="bg-white text-black dark:bg-neutral-900 dark:text-neutral-100" value="">
                  انتخاب کنید
                </option>
                {CONTRACT_TYPES.map((item) => (
                  <option
                    className="bg-white text-black dark:bg-neutral-900 dark:text-neutral-100"
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-black/70 dark:text-neutral-300">شماره قرارداد</label>
              <input
                className="w-full h-11 rounded-xl px-3 bg-white text-black border border-black/15 outline-none dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                value={generalForm.contractNo}
                onChange={(e) => setGeneralField("contractNo", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-black/70 dark:text-neutral-300">نام پروژه (فارسی)</label>
                <input
                  className="w-full h-11 rounded-xl px-3 bg-black/5 text-black border border-black/15 outline-none dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                  value={selectedProjectNameFa}
                  readOnly
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-black/70 dark:text-neutral-300">نام پروژه (انگلیسی)</label>
                <input
                  dir="ltr"
                  className="w-full h-11 rounded-xl px-3 bg-black/5 text-black border border-black/15 outline-none dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                  value={selectedProjectNameEn}
                  readOnly
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-black/70 dark:text-neutral-300">عنوان قرارداد</label>
              <input
                className="w-full h-11 rounded-xl px-3 bg-white text-black border border-black/15 outline-none dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                value={generalForm.contractTitle}
                onChange={(e) => setGeneralField("contractTitle", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-black/70 dark:text-neutral-300">موضوع قرارداد</label>
              <input
                className="w-full h-11 rounded-xl px-3 bg-white text-black border border-black/15 outline-none dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                value={generalForm.contractSubject}
                onChange={(e) => setGeneralField("contractSubject", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-black/70 dark:text-neutral-300">واگذارنده‌ی کارفرما</label>
              <input
                className="w-full h-11 rounded-xl px-3 bg-white text-black border border-black/15 outline-none dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                value={generalForm.employerAssignor}
                onChange={(e) => setGeneralField("employerAssignor", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-black/70 dark:text-neutral-300">کارفرمای اصلی</label>
              <input
                className="w-full h-11 rounded-xl px-3 bg-white text-black border border-black/15 outline-none dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                value={generalForm.mainEmployer}
                onChange={(e) => setGeneralField("mainEmployer", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-black/70 dark:text-neutral-300">اعضای مشارکت</label>
              <textarea
                className="w-full min-h-24 rounded-xl px-3 py-2 bg-white text-black border border-black/15 outline-none resize-y dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                value={generalForm.partners}
                onChange={(e) => setGeneralField("partners", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-black/70 dark:text-neutral-300">پیمانکاران اصلی</label>
              <textarea
                className="w-full min-h-24 rounded-xl px-3 py-2 bg-white text-black border border-black/15 outline-none resize-y dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                value={generalForm.mainContractors}
                onChange={(e) => setGeneralField("mainContractors", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-black/70 dark:text-neutral-300">تاریخ ابلاغ (شمسی)</label>
                <JalaliPopupDatePicker
                  value={generalForm.notifyDateJ}
                  onChange={(v) => setGeneralJalaliDate("notifyDateJ", "notifyDateG", v)}
                  buttonClassName="w-full h-11 px-3 rounded-xl border text-right flex items-center justify-between gap-2 transition border-black/15 bg-white text-neutral-900 hover:bg-black/[0.02] dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-black/70 dark:text-neutral-300">معادل میلادی</label>
                <input
                  dir="ltr"
                  className="w-full h-11 rounded-xl px-3 bg-black/5 text-black border border-black/15 outline-none dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                  value={generalForm.notifyDateG}
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-black/70 dark:text-neutral-300">تاریخ شروع قرارداد (شمسی)</label>
                <JalaliPopupDatePicker
                  value={generalForm.startDateJ}
                  onChange={(v) => setGeneralJalaliDate("startDateJ", "startDateG", v)}
                  buttonClassName="w-full h-11 px-3 rounded-xl border text-right flex items-center justify-between gap-2 transition border-black/15 bg-white text-neutral-900 hover:bg-black/[0.02] dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-black/70 dark:text-neutral-300">معادل میلادی</label>
                <input
                  dir="ltr"
                  className="w-full h-11 rounded-xl px-3 bg-black/5 text-black border border-black/15 outline-none dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                  value={generalForm.startDateG}
                  readOnly
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-black/70 dark:text-neutral-300">مدت</label>
              <input
                className="w-full h-11 rounded-xl px-3 bg-white text-black border border-black/15 outline-none dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                value={generalForm.duration}
                onChange={(e) => setGeneralField("duration", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-black/70 dark:text-neutral-300">تاریخ پایان قرارداد (شمسی)</label>
                <JalaliPopupDatePicker
                  value={generalForm.endDateJ}
                  onChange={(v) => setGeneralJalaliDate("endDateJ", "endDateG", v)}
                  buttonClassName="w-full h-11 px-3 rounded-xl border text-right flex items-center justify-between gap-2 transition border-black/15 bg-white text-neutral-900 hover:bg-black/[0.02] dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-black/70 dark:text-neutral-300">معادل میلادی</label>
                <input
                  dir="ltr"
                  className="w-full h-11 rounded-xl px-3 bg-black/5 text-black border border-black/15 outline-none dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                  value={generalForm.endDateG}
                  readOnly
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-black/70 dark:text-neutral-300">تعدیل</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "has", label: "دارد" },
                  { id: "none", label: "ندارد" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGeneralField("adjustment", item.id)}
                    className={adjustmentBtnClass(generalForm.adjustment === item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-black/70 dark:border-neutral-700 dark:bg-white/[0.03] dark:text-neutral-300">
            محتوای تب {detailTab === "technical" ? "فنی" : "مالی"} در مرحله بعد تکمیل می‌شود.
          </div>
        )}
      </div>
    </Card>
  );
}
