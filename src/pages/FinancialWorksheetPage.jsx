import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";
import { baseCurrenciesTablePreset as tablePreset } from "../components/ui/tablePresets.js";

function toFaDigits(s) {
  return String(s ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function pad2(n) {
  const x = Number(n) || 0;
  return x < 10 ? `0${x}` : String(x);
}

function formatMoney(n) {
  const s = String(n ?? "");
  if (s === "") return "";
  const sign = Number(n) < 0 ? "-" : "";
  const digits = String(Math.abs(Number(n) || 0));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatBytes(bytes) {
  const b = Number(bytes || 0);
  if (!b) return "0 B";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function getJalaliPartsFromDate(d) {
  try {
    const y = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(d);
    const m = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "numeric" }).format(d);
    const day = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric" }).format(d);
    const en = (x) =>
      Number(
        String(x)
          .replace(/[۰-۹]/g, (c) => "۰۱۲۳۴۵۶۷۸۹".indexOf(c))
          .replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c)),
      ) || 0;
    return { jy: en(y), jm: en(m), jd: en(day) };
  } catch {
    return { jy: 1404, jm: 1, jd: 1 };
  }
}

function jalaliToGregorian(jy, jm, jd) {
  let jY = Number(jy);
  let jM = Number(jm);
  let jD = Number(jd);
  if (!jY || !jM || !jD) return null;

  jY += 1595;
  let days =
    -355668 +
    365 * jY +
    Math.floor(jY / 33) * 8 +
    Math.floor(((jY % 33) + 3) / 4) +
    jD +
    (jM < 7 ? (jM - 1) * 31 : (jM - 7) * 30 + 186);

  let gY = 400 * Math.floor(days / 146097);
  days %= 146097;

  if (days > 36524) {
    gY += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }

  gY += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    gY += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  let gD = days + 1;
  const leap = (gY % 4 === 0 && gY % 100 !== 0) || gY % 400 === 0;
  const monthDays = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  let gM = 1;
  while (gM <= 12 && gD > monthDays[gM]) {
    gD -= monthDays[gM];
    gM++;
  }

  return { gy: gY, gm: gM, gd: gD };
}

function JalaliPopupDatePicker({ value, onChange }) {
  const wrapRef = useRef(null);
  const now = useMemo(() => getJalaliPartsFromDate(new Date()), []);
  const init = useMemo(() => {
    const m = String(value || "").match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (m) return { jy: Number(m[1]), jm: Number(m[2]), jd: Number(m[3]) };
    return now;
  }, [value, now]);

  const [open, setOpen] = useState(false);
  const [jy, setJy] = useState(init.jy);
  const [jm, setJm] = useState(init.jm);
  const [jd, setJd] = useState(init.jd);

  useEffect(() => {
    const m = String(value || "").match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (!m) return;
    setJy(Number(m[1]));
    setJm(Number(m[2]));
    setJd(Number(m[3]));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const years = useMemo(() => {
    const out = [];
    for (let y = (now.jy || 1404) - 10; y <= (now.jy || 1404) + 10; y++) out.push(y);
    return out;
  }, [now.jy]);

  const days = useMemo(() => {
    const max = jm <= 6 ? 31 : jm <= 11 ? 30 : 29;
    const out = [];
    for (let d = 1; d <= max; d++) out.push(d);
    return out;
  }, [jm]);

  useEffect(() => {
    const max = jm <= 6 ? 31 : jm <= 11 ? 30 : 29;
    if (jd > max) setJd(max);
  }, [jm, jd]);

  const preview = `${jy}/${pad2(jm)}/${pad2(jd)}`;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-11 px-3 rounded-xl border text-right flex items-center justify-between gap-2 border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02] dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
      >
        <span className={value ? "" : "text-neutral-400 dark:text-white/50"}>{value ? toFaDigits(value) : "انتخاب تاریخ"}</span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500 dark:text-white/50">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-[min(400px,calc(100vw-32px))] rounded-2xl border p-3 shadow-lg border-black/10 bg-white text-neutral-900 dark:border-white/10 dark:bg-neutral-900 dark:text-white">
          <div className="grid grid-cols-3 gap-2">
            <select value={jy} onChange={(e) => setJy(Number(e.target.value))} className="h-10 rounded-xl border px-2 text-sm bg-white border-black/10 dark:bg-white/5 dark:border-white/15">
              {years.map((y) => (
                <option key={y} value={y}>{toFaDigits(y)}</option>
              ))}
            </select>
            <select value={jm} onChange={(e) => setJm(Number(e.target.value))} className="h-10 rounded-xl border px-2 text-sm bg-white border-black/10 dark:bg-white/5 dark:border-white/15">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{toFaDigits(m)}</option>
              ))}
            </select>
            <select value={jd} onChange={(e) => setJd(Number(e.target.value))} className="h-10 rounded-xl border px-2 text-sm bg-white border-black/10 dark:bg-white/5 dark:border-white/15">
              {days.map((d) => (
                <option key={d} value={d}>{toFaDigits(d)}</option>
              ))}
            </select>
          </div>
          <div className="mt-2 text-xs text-neutral-500 dark:text-white/60">پیش نمایش: <span className="font-semibold">{toFaDigits(preview)}</span></div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="h-9 px-4 rounded-xl border text-sm border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10">بستن</button>
            <button type="button" onClick={() => { onChange(preview); setOpen(false); }} className="h-9 px-4 rounded-xl text-sm bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">تایید</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinancialWorksheetPage() {
  const API_BASE = (window.API_URL || "/api").replace(/\/+$/, "");

  const api = useCallback(
    async (path, opt = {}) => {
      const res = await fetch(API_BASE + path, {
        credentials: "include",
        cache: "no-store",
        ...opt,
        headers: { "Content-Type": "application/json", ...(opt.headers || {}) },
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
    },
    [API_BASE],
  );

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectId, setProjectId] = useState("");

  const [tab, setTab] = useState("statement");
  const [formOpen, setFormOpen] = useState(false);
  const [err, setErr] = useState("");

  const [statementNo, setStatementNo] = useState("");
  const [jalaliDate, setJalaliDate] = useState("");
  const [description, setDescription] = useState("");
  const [grossAmount, setGrossAmount] = useState("");
  const [prepaymentDepreciation, setPrepaymentDepreciation] = useState("");
  const [prepaymentCurrencyId, setPrepaymentCurrencyId] = useState("");
  const [insuranceDeposit, setInsuranceDeposit] = useState("");
  const [insuranceCurrencyId, setInsuranceCurrencyId] = useState("");
  const [performanceDeposit, setPerformanceDeposit] = useState("");
  const [performanceCurrencyId, setPerformanceCurrencyId] = useState("");
  const [otherDebts, setOtherDebts] = useState([{ id: Date.now(), amount: "", description: "" }]);
  const [vatPercent, setVatPercent] = useState("10");

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadDraftFiles, setUploadDraftFiles] = useState([]);
  const uploadInputRef = useRef(null);

  const [currencyItems, setCurrencyItems] = useState([]);
  const [currencySourceItems, setCurrencySourceItems] = useState([]);
  const [currencyId, setCurrencyId] = useState("");
  const [currencySourceId, setCurrencySourceId] = useState("");

  const [worksheetRows, setWorksheetRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  useEffect(() => {
    let stop = false;
    (async () => {
      setErr("");
      setProjectsLoading(true);
      try {
        const [pResp, tResp, sResp] = await Promise.all([
          api("/projects").catch(() => ({ items: [] })),
          api("/base/currencies/types").catch(() => ({ items: [] })),
          api("/base/currencies/sources").catch(() => ({ items: [] })),
        ]);

        if (stop) return;

        const pList = pResp?.projects || pResp?.items || pResp?.data || [];
        setProjects(Array.isArray(pList) ? pList : []);

        const tList = tResp?.items || tResp?.data || tResp?.types || [];
        const sList = sResp?.items || sResp?.data || sResp?.sources || [];
        setCurrencyItems(Array.isArray(tList) ? tList : []);
        setCurrencySourceItems(Array.isArray(sList) ? sList : []);
      } catch (e) {
        if (!stop) setErr(e.message || "خطا در بارگذاری اطلاعات");
      } finally {
        if (!stop) setProjectsLoading(false);
      }
    })();
    return () => {
      stop = true;
    };
  }, [api]);

  const activeProjects = useMemo(() => {
    const list = Array.isArray(projects) ? projects : [];
    return list
      .filter((p) => p?.isActive !== false && p?.is_active !== false)
      .slice()
      .sort((a, b) =>
        String(a?.code || "").localeCompare(String(b?.code || ""), "fa", {
          numeric: true,
          sensitivity: "base",
        }),
      );
  }, [projects]);

  const normalizeRows = useCallback((items) => {
    const list = Array.isArray(items) ? items : [];
    return list.map((r, i) => ({
      id: String(r?.id ?? r?.worksheet_id ?? r?.record_id ?? `tmp_${i}`),
      number: String(r?.statement_no ?? r?.statementNo ?? r?.receipt_no ?? r?.receiptNo ?? r?.no ?? ""),
      date: String(r?.jalali_date ?? r?.date_jalali ?? r?.date ?? ""),
      grossAmount: Number(r?.gross_amount ?? r?.grossAmount ?? r?.gross ?? 0) || 0,
      vatAmount: Number(r?.vat_amount ?? r?.vatAmount ?? r?.vat ?? 0) || 0,
      currencySourceLabel: String(
        r?.currency_source_label ??
          r?.currencySourceLabel ??
          r?.currency_source_name ??
          r?.currencySourceName ??
          r?.currency_source ??
          r?.currencySource ??
          "",
      ),
      raw: r,
    }));
  }, []);

  useEffect(() => {
    let dead = false;
    (async () => {
      if (!projectId) {
        setWorksheetRows([]);
        setRowsLoading(false);
        return;
      }
      setRowsLoading(true);
      try {
        const q = new URLSearchParams();
        q.set("project_id", String(projectId));
        q.set("kind", tab === "receipts" ? "receipts" : "statement");
        const r = await api("/financial-worksheet?" + q.toString());
        if (dead) return;
        const rows = r?.items || r?.data || r?.rows || [];
        setWorksheetRows(normalizeRows(rows));
      } catch {
        if (!dead) setWorksheetRows([]);
      } finally {
        if (!dead) setRowsLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [api, projectId, tab, normalizeRows]);

  const sumGross = useMemo(() => (worksheetRows || []).reduce((s, r) => s + Number(r.grossAmount || 0), 0), [worksheetRows]);
  const sumVat = useMemo(() => (worksheetRows || []).reduce((s, r) => s + Number(r.vatAmount || 0), 0), [worksheetRows]);

  const gregorianDate = useMemo(() => {
    const m = String(jalaliDate || "").match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (!m) return "";
    const g = jalaliToGregorian(Number(m[1]), Number(m[2]), Number(m[3]));
    if (!g) return "";
    return `${g.gy}-${pad2(g.gm)}-${pad2(g.gd)}`;
  }, [jalaliDate]);

  const projectLabel = (p) => {
    const code = String(p?.code || "").trim();
    const name = String(p?.name || p?.title || "").trim();
    return `${code ? `${toFaDigits(code)} - ` : ""}${name || "—"}`;
  };

  const readItemId = (it) => String(it?.id ?? it?.code ?? it?.value ?? it?.key ?? "");
  const readItemLabel = (it) => String(it?.label ?? it?.title ?? it?.name ?? it?.code ?? "").trim();

  const addOtherDebtRow = () =>
    setOtherDebts((prev) => [...prev, { id: Date.now() + Math.random(), amount: "", description: "" }]);
  const removeOtherDebtRow = (id) => setOtherDebts((prev) => prev.filter((r) => r.id !== id));
  const updateOtherDebtRow = (id, patch) =>
    setOtherDebts((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const openUploadModal = () => {
    setUploadDraftFiles(Array.isArray(uploadedFiles) ? uploadedFiles : []);
    setUploadOpen(true);
  };
  const addFilesToDraft = (fileList) => {
    const incoming = Array.from(fileList || []).filter(Boolean);
    if (!incoming.length) return;
    setUploadDraftFiles((prev) => [...(Array.isArray(prev) ? prev : []), ...incoming]);
  };

  const iconBtnCls =
    "h-10 w-10 inline-grid place-items-center !bg-transparent !ring-0 !border-0 !shadow-none hover:opacity-80 active:opacity-70 transition disabled:opacity-50";

  const handleViewRow = (row) => {
    const no = row?.number ? toFaDigits(row.number) : "—";
    const dt = row?.date ? toFaDigits(row.date) : "—";
    window.alert(`شماره: ${no}\nتاریخ: ${dt}`);
  };

  const handleEditRow = (row) => {
    setFormOpen(true);
    setStatementNo(String(row?.number || ""));
    setJalaliDate(String(row?.date || ""));
    setGrossAmount(String(row?.grossAmount || ""));
  };

  const handleDeleteRow = async (row) => {
    const id = String(row?.id || "").trim();
    if (!id) return;
    const ok = window.confirm("آیا از حذف این مورد مطمئن هستید؟");
    if (!ok) return;
    try {
      await api(`/financial-worksheet?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setWorksheetRows((prev) => (Array.isArray(prev) ? prev.filter((x) => String(x.id) !== id) : []));
    } catch (e) {
      setErr(e.message || "خطا در حذف");
    }
  };

  return (
    <>
      <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
          <span>پروژه‌ها</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-black dark:text-neutral-100">کاربرگ مالی</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-neutral-600 dark:text-white/60">پروژه</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={projectsLoading}
              className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15"
            >
              <option value="">{projectsLoading ? "در حال بارگذاری..." : "انتخاب پروژه فعال"}</option>
              {activeProjects.map((p) => (
                <option key={String(p?.id)} value={String(p?.id)}>
                  {projectLabel(p)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("statement")}
              className={`h-10 flex-1 px-4 rounded-xl border text-sm transition ${
                tab === "statement"
                  ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                  : "bg-white text-black border-black/15 hover:bg-black/5 dark:bg-white/5 dark:text-white dark:border-white/15 dark:hover:bg-white/10"
              }`}
            >
              صورت وضعیت
            </button>
            <button
              type="button"
              onClick={() => setTab("receipts")}
              className={`h-10 flex-1 px-4 rounded-xl border text-sm transition ${
                tab === "receipts"
                  ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                  : "bg-white text-black border-black/15 hover:bg-black/5 dark:bg-white/5 dark:text-white dark:border-white/15 dark:hover:bg-white/10"
              }`}
            >
              دریافتی‌ها
            </button>
            <button
              type="button"
              onClick={() => setFormOpen((v) => !v)}
              className="h-10 w-10 rounded-xl flex items-center justify-center transition ring-1 ring-black/15 hover:bg-black/5 dark:ring-neutral-700 dark:hover:bg-white/10 shrink-0"
              title={formOpen ? "بستن" : "افزودن"}
              aria-label={formOpen ? "بستن" : "افزودن"}
            >
              <img src={formOpen ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="w-5 h-5 dark:invert" />
            </button>
          </div>

          {formOpen && (
            <div className="rounded-2xl border border-black/10 p-3 md:p-4 space-y-3 dark:border-white/10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                <div className="lg:col-span-4">
                  <label className="text-xs text-neutral-600 dark:text-white/60">شماره صورت وضعیت</label>
                  <input
                    value={statementNo}
                    onChange={(e) => setStatementNo(e.target.value)}
                    className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15"
                    type="text"
                    placeholder={tab === "receipts" ? "شماره دریافتی" : "شماره صورت وضعیت"}
                  />
                </div>

                <div className="lg:col-span-4">
                  <label className="text-xs text-neutral-600 dark:text-white/60">تاریخ شمسی</label>
                  <div className="mt-1">
                    <JalaliPopupDatePicker value={jalaliDate} onChange={setJalaliDate} />
                  </div>
                </div>

                <div className="lg:col-span-4">
                  <label className="text-xs text-neutral-600 dark:text-white/60">تاریخ میلادی (خودکار)</label>
                  <input
                    value={gregorianDate}
                    readOnly
                    className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-black/5 text-neutral-900 border-black/10 dark:bg-white/10 dark:text-white dark:border-white/15"
                    type="text"
                    dir="ltr"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs text-neutral-600 dark:text-white/60">شرح بابت</label>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15"
                    type="text"
                    placeholder="شرح بابت..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3">
                <div className="xl:col-span-5">
                  <label className="text-xs text-neutral-600 dark:text-white/60">مبلغ ناخالص تایید شده</label>
                  <input
                    value={grossAmount}
                    onChange={(e) => setGrossAmount(e.target.value)}
                    className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15"
                    type="text"
                    dir="ltr"
                    placeholder="0"
                  />
                </div>

                <div className="xl:col-span-3">
                  <label className="text-xs text-neutral-600 dark:text-white/60">ارز</label>
                  <select value={currencyId} onChange={(e) => setCurrencyId(e.target.value)} className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15">
                    <option value="">انتخاب ارز</option>
                    {(currencyItems || []).map((it) => {
                      const id = readItemId(it);
                      if (!id) return null;
                      return <option key={id} value={id}>{readItemLabel(it) || id}</option>;
                    })}
                  </select>
                </div>

                <div className="xl:col-span-4">
                  <label className="text-xs text-neutral-600 dark:text-white/60">منشا ارز</label>
                  <select value={currencySourceId} onChange={(e) => setCurrencySourceId(e.target.value)} className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15">
                    <option value="">انتخاب منشا</option>
                    {(currencySourceItems || []).map((it) => {
                      const id = readItemId(it);
                      if (!id) return null;
                      return <option key={id} value={id}>{readItemLabel(it) || id}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-end">
                <div className="xl:col-span-4">
                  <label className="text-xs text-neutral-600 dark:text-white/60">استهلاک پیش پرداخت</label>
                  <input value={prepaymentDepreciation} onChange={(e) => setPrepaymentDepreciation(e.target.value)} className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15" type="text" dir="ltr" placeholder="0" />
                </div>
                <div className="xl:col-span-3">
                  <label className="text-xs text-neutral-600 dark:text-white/60">ارز</label>
                  <select value={prepaymentCurrencyId} onChange={(e) => setPrepaymentCurrencyId(e.target.value)} className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15">
                    <option value="">انتخاب ارز</option>
                    {(currencyItems || []).map((it) => {
                      const id = readItemId(it);
                      if (!id) return null;
                      return <option key={id} value={id}>{readItemLabel(it) || id}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-end">
                <div className="xl:col-span-4">
                  <label className="text-xs text-neutral-600 dark:text-white/60">سپرده بیمه</label>
                  <input value={insuranceDeposit} onChange={(e) => setInsuranceDeposit(e.target.value)} className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15" type="text" dir="ltr" placeholder="0" />
                </div>
                <div className="xl:col-span-3">
                  <label className="text-xs text-neutral-600 dark:text-white/60">ارز</label>
                  <select value={insuranceCurrencyId} onChange={(e) => setInsuranceCurrencyId(e.target.value)} className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15">
                    <option value="">انتخاب ارز</option>
                    {(currencyItems || []).map((it) => {
                      const id = readItemId(it);
                      if (!id) return null;
                      return <option key={id} value={id}>{readItemLabel(it) || id}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-end">
                <div className="xl:col-span-4">
                  <label className="text-xs text-neutral-600 dark:text-white/60">سپرده حسن انجام کار</label>
                  <input value={performanceDeposit} onChange={(e) => setPerformanceDeposit(e.target.value)} className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15" type="text" dir="ltr" placeholder="0" />
                </div>
                <div className="xl:col-span-3">
                  <label className="text-xs text-neutral-600 dark:text-white/60">ارز</label>
                  <select value={performanceCurrencyId} onChange={(e) => setPerformanceCurrencyId(e.target.value)} className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15">
                    <option value="">انتخاب ارز</option>
                    {(currencyItems || []).map((it) => {
                      const id = readItemId(it);
                      if (!id) return null;
                      return <option key={id} value={id}>{readItemLabel(it) || id}</option>;
                    })}
                  </select>
                </div>
              </div>

              {(otherDebts || []).map((row, idx) => (
                <div key={row.id} className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-end">
                  <div className="xl:col-span-4">
                    <label className="text-xs text-neutral-600 dark:text-white/60">سایر بدهی</label>
                    <input value={row.amount} onChange={(e) => updateOtherDebtRow(row.id, { amount: e.target.value })} className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15" type="text" dir="ltr" placeholder="0" />
                  </div>

                  <div className="xl:col-span-7">
                    <label className="text-xs text-neutral-600 dark:text-white/60">شرح</label>
                    <input value={row.description} onChange={(e) => updateOtherDebtRow(row.id, { description: e.target.value })} className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15" type="text" placeholder="شرح..." />
                  </div>

                  <div className="xl:col-span-1 flex xl:justify-end gap-2">
                    {idx === 0 ? (
                      <button type="button" onClick={addOtherDebtRow} className="h-10 w-10 rounded-xl border border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10 grid place-items-center" aria-label="افزودن ردیف سایر بدهی" title="افزودن">
                        <img src="/images/icons/afzodan.svg" alt="" className="w-4 h-4 dark:invert" />
                      </button>
                    ) : (
                      <button type="button" onClick={() => removeOtherDebtRow(row.id)} className="h-10 w-10 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500/50 dark:text-red-400 dark:hover:bg-red-500/10 grid place-items-center" aria-label="حذف این ردیف" title="حذف">
                        <span className="text-xl leading-none">−</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div className="h-px bg-gradient-to-r from-transparent via-black/20 to-transparent dark:via-white/20" />

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-end">
                <div className="xl:col-span-5">
                  <label className="text-xs text-neutral-600 dark:text-white/60">جمع خالص تایید شده بدون VAT</label>
                  <input value="" readOnly className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-black/5 text-neutral-900 border-black/10 dark:bg-white/10 dark:text-white dark:border-white/15" type="text" />
                </div>
                <div className="xl:col-span-3">
                  <label className="text-xs text-neutral-600 dark:text-white/60">ارز منشا</label>
                  <div className="mt-1 h-11 rounded-xl border border-black/10 bg-black/5 dark:border-white/15 dark:bg-white/10 flex items-center px-3 text-sm text-neutral-600 dark:text-white/70">ارز منشا</div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-end">
                <div className="xl:col-span-5">
                  <label className="text-xs text-neutral-600 dark:text-white/60">VAT</label>
                  <div className="mt-1 h-11 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-white/5 px-3 flex items-center gap-2">
                    <span className="text-sm text-neutral-600 dark:text-white/70">(</span>
                    <input value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} className="w-16 text-center bg-transparent outline-none text-neutral-900 dark:text-white" type="text" dir="ltr" />
                    <span className="text-sm text-neutral-600 dark:text-white/70">%)</span>
                  </div>
                </div>
                <div className="xl:col-span-4">
                  <label className="text-xs text-neutral-600 dark:text-white/60">مبلغ VAT</label>
                  <input value="" readOnly className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-black/5 text-neutral-900 border-black/10 dark:bg-white/10 dark:text-white dark:border-white/15" type="text" />
                </div>
                <div className="xl:col-span-3">
                  <label className="text-xs text-neutral-600 dark:text-white/60">ارز منشا</label>
                  <div className="mt-1 h-11 rounded-xl border border-black/10 bg-black/5 dark:border-white/15 dark:bg-white/10 flex items-center px-3 text-sm text-neutral-600 dark:text-white/70">ارز منشا</div>
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-black/20 to-transparent dark:via-white/20" />

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-end">
                <div className="xl:col-span-5">
                  <label className="text-xs text-neutral-600 dark:text-white/60">جمع خالص تایید شده با احتساب VAT</label>
                  <input value="" readOnly className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-black/5 text-neutral-900 border-black/10 dark:bg-white/10 dark:text-white dark:border-white/15" type="text" />
                </div>
                <div className="xl:col-span-3">
                  <label className="text-xs text-neutral-600 dark:text-white/60">ارز منشا</label>
                  <div className="mt-1 h-11 rounded-xl border border-black/10 bg-black/5 dark:border-white/15 dark:bg-white/10 flex items-center px-3 text-sm text-neutral-600 dark:text-white/70">ارز منشا</div>
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-black/20 to-transparent dark:via-white/20" />

              <div className="flex items-center justify-start">
                <button type="button" onClick={openUploadModal} className="h-11 px-3 rounded-xl border transition flex items-center justify-center gap-2 whitespace-nowrap border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02] dark:border-white/15 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10" title="آپلود فایل" aria-label="آپلود فایل">
                  <img src="/images/icons/upload.svg" alt="" className="w-5 h-5 dark:invert" />
                  آپلود فایل
                  {uploadedFiles.length ? <span className="text-xs opacity-80">({toFaDigits(uploadedFiles.length)})</span> : null}
                </button>
              </div>
            </div>
          )}

          <TableWrap>
            <div className={tablePreset.outer}>
              <div className={tablePreset.innerPad}>
                <div className={tablePreset.frame + " shadow-sm"}>
                  <div className="overflow-x-auto">
                    <table className={tablePreset.table + " table-fixed text-[12px] md:text-[13px]"} dir="rtl">
                      <THead>
                        <tr className={tablePreset.headRow + " sticky top-0 z-10"}>
                          <TH className={`w-14 ${tablePreset.th}`}>#</TH>
                          <TH className={`w-32 ${tablePreset.th}`}>{tab === "receipts" ? "شماره دریافتی" : "شماره صورت وضعیت"}</TH>
                          <TH className={`w-32 ${tablePreset.th}`}>تاریخ</TH>
                          <TH className={`w-40 ${tablePreset.th}`}>مبلغ ناخالص</TH>
                          <TH className={`w-32 ${tablePreset.th}`}>VAT</TH>
                          <TH className={`w-32 ${tablePreset.th}`}>ارز منشا</TH>
                          <TH className={`w-36 ${tablePreset.th}`}>اقدامات</TH>
                        </tr>
                      </THead>

                      <tbody className={tablePreset.body}>
                        {rowsLoading ? (
                          <TR><TD colSpan={7} className={tablePreset.emptyRow}>در حال بارگذاری...</TD></TR>
                        ) : !worksheetRows.length ? (
                          <TR><TD colSpan={7} className={tablePreset.emptyRow}>موردی برای نمایش وجود ندارد.</TD></TR>
                        ) : (
                          <>
                            <TR className="text-center bg-black/[0.04] font-semibold dark:bg-white/10">
                              <TD>-</TD><TD>-</TD><TD>جمع</TD>
                              <TD>{toFaDigits(formatMoney(sumGross))}</TD>
                              <TD>{toFaDigits(formatMoney(sumVat))}</TD>
                              <TD>—</TD><TD>—</TD>
                            </TR>
                            {worksheetRows.map((row, idx) => (
                              <TR key={row.id} className="text-center hover:bg-black/[0.06] transition-colors dark:hover:bg-white/15">
                                <TD>{toFaDigits(idx + 1)}</TD>
                                <TD>{row.number ? toFaDigits(row.number) : "—"}</TD>
                                <TD>{row.date ? toFaDigits(row.date) : "—"}</TD>
                                <TD>{toFaDigits(formatMoney(row.grossAmount || 0))}</TD>
                                <TD>{toFaDigits(formatMoney(row.vatAmount || 0))}</TD>
                                <TD>{row.currencySourceLabel || "—"}</TD>
                                <TD>
                                  <div className="w-full flex items-center justify-center gap-1">
                                    <button type="button" onClick={() => handleViewRow(row)} className={iconBtnCls} aria-label="نمایش" title="نمایش"><img src="/images/icons/namayeshname.svg" alt="" className="w-5 h-5 dark:invert" /></button>
                                    <button type="button" onClick={() => handleEditRow(row)} className={iconBtnCls} aria-label="ویرایش" title="ویرایش"><img src="/images/icons/pencil.svg" alt="" className="w-5 h-5 dark:invert" /></button>
                                    <button type="button" onClick={() => handleDeleteRow(row)} className={iconBtnCls} aria-label="حذف" title="حذف">
                                      <img src="/images/icons/hazf.svg" alt="" className="w-5 h-5" style={{ filter: "brightness(0) saturate(100%) invert(25%) sepia(95%) saturate(4870%) hue-rotate(355deg) brightness(95%) contrast(110%)" }} />
                                    </button>
                                  </div>
                                </TD>
                              </TR>
                            ))}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </TableWrap>

          {err ? <div className="text-sm text-red-600 dark:text-red-400">{err}</div> : null}
        </div>
      </Card>

      {uploadOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999]">
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setUploadOpen(false)} />
            <div className="absolute inset-0 p-3 md:p-6 flex items-center justify-center">
              <div className="w-[min(980px,calc(100vw-20px))] rounded-2xl border shadow-2xl overflow-hidden border-black/10 bg-white text-neutral-900 dark:border-white/10 dark:bg-neutral-900 dark:text-white">
                <div className="p-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
                  <button type="button" onClick={() => setUploadOpen(false)} className="h-10 w-10 rounded-xl bg-black text-white dark:bg-white dark:text-black grid place-items-center" aria-label="بستن" title="بستن">
                    <img src="/images/icons/bastan.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
                  </button>
                  <div className="font-semibold text-sm md:text-base">بارگذاری اسناد</div>
                </div>

                <div className="p-4">
                  <div className="rounded-2xl border border-black/10 dark:border-white/10 p-3 space-y-3">
                    <div className="text-sm text-neutral-700 dark:text-white/80">فایل های انتخاب‌شده</div>
                    <div className="rounded-xl border border-black/10 dark:border-white/10 p-2 max-h-44 overflow-y-auto">
                      {!uploadDraftFiles.length ? (
                        <div className="text-sm text-neutral-500 dark:text-white/60 p-3 text-center">فایلی انتخاب نشده است.</div>
                      ) : (
                        <div className="space-y-2">
                          {uploadDraftFiles.map((f, idx) => (
                            <div key={`${f?.name || "file"}_${idx}`} className="flex items-center justify-between rounded-lg px-2 py-1 bg-black/[0.03] dark:bg-white/[0.06]">
                              <div className="text-sm truncate">{f?.name || `فایل ${toFaDigits(idx + 1)}`}</div>
                              <div className="text-xs text-neutral-500 dark:text-white/60 shrink-0">{toFaDigits(formatBytes(f?.size || 0))}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div
                      className="rounded-2xl border border-dashed border-black/15 dark:border-white/20 p-6 text-center bg-black/[0.02] dark:bg-white/[0.04]"
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        addFilesToDraft(e.dataTransfer?.files);
                      }}
                    >
                      <div className="font-semibold">فایل را اینجا رها کنید</div>
                      <div className="text-sm text-neutral-500 dark:text-white/60 mt-1">یا با دکمه زیر انتخاب کنید (تصویر / PDF)</div>
                      <button type="button" onClick={() => uploadInputRef.current?.click()} className="mt-4 h-10 px-6 rounded-xl bg-black text-white dark:bg-white dark:text-black inline-flex items-center gap-2">
                        انتخاب فایل
                        <img src="/images/icons/upload.svg" alt="" className="w-4 h-4 invert dark:invert-0" />
                      </button>
                      <input
                        ref={uploadInputRef}
                        type="file"
                        multiple
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => addFilesToDraft(e.target.files)}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-start">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFiles(uploadDraftFiles);
                        setUploadOpen(false);
                      }}
                      className="h-10 w-10 rounded-xl bg-black text-white dark:bg-white dark:text-black grid place-items-center"
                      aria-label="تایید"
                      title="تایید"
                    >
                      <img src="/images/icons/check.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
