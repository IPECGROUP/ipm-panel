// کاربرگ مالی
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";
import { baseCurrenciesTablePreset as tablePreset } from "../components/ui/tablePresets.js";
import { useFeatureVisibility } from "../hooks/useFeatureAccess.js";
import DocumentUploadModal from "../components/DocumentUploadModal.jsx";
import RelatedLettersPickerModal from "../components/RelatedLettersPickerModal.jsx";
import { useAuth } from "../components/AuthProvider";

const CONTRACT_VERIFIED_STORAGE_KEY = "ipm_contract_information_verified_rows_v1";
const PAGE_ICON = "/images/icons/karbarg-mali.svg";

function WorksheetReadingMenu({ selectedCount, canEdit, deleting, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 248)), top: rect.bottom + 8 });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!triggerRef.current?.contains(event.target) && !popoverRef.current?.contains(event.target)) setOpen(false);
    };
    const closeEscape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  const run = (action) => () => { setOpen(false); action(); };
  return <div className="absolute left-2 top-1/2 z-30 -translate-y-1/2" dir="rtl">
    <button ref={triggerRef} type="button" onClick={() => { if (!open) updatePosition(); setOpen((value) => !value); }} className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/[0.08] dark:hover:bg-white/10" title="عملیات" aria-label="عملیات" aria-expanded={open}>
      <img src="/images/icons/menu-table.svg" alt="" className="h-4 w-3 dark:invert" />
    </button>
    {open && position && createPortal(<div ref={popoverRef} className="fixed z-[100] w-60 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 text-right text-neutral-900 shadow-[0_18px_45px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100" style={position}>
      <div className="px-2.5 pb-2 pt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{selectedCount ? `${toFaDigits(selectedCount)} مورد انتخاب شده` : "ابتدا موارد موردنظر را انتخاب کنید"}</div>
      <button type="button" disabled={!canEdit} onClick={run(onEdit)} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-amber-50 disabled:opacity-45 dark:hover:bg-amber-500/10"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 dark:bg-amber-500/15"><img src="/images/icons/pencil.svg" alt="" className="h-4 w-4 dark:invert" /></span><span className="text-sm font-semibold">ویرایش مورد انتخاب‌شده</span></button>
      <button type="button" disabled={!selectedCount || deleting} onClick={run(onDelete)} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right text-red-700 transition hover:bg-red-50 disabled:opacity-45 dark:text-red-300 dark:hover:bg-red-500/10"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-100 dark:bg-red-500/15"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" /></span><span className="text-sm font-semibold">{deleting ? "در حال حذف..." : "حذف موارد انتخاب‌شده"}</span></button>
    </div>, document.body)}
  </div>;
}
const DEFAULT_RECEIPT_TYPE_OPTIONS = [
  { value: "prepayment", label: "پیش پرداخت" },
  { value: "statement", label: "صورت وضعیت" },
  { value: "interim", label: "علی الحساب" },
  { value: "vat", label: "ارزش افزوده" },
  { value: "other", label: "سایر" },
];

function toFaDigits(s) {
  return String(s ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function RelatedDocumentsPickerModal({ letters, loading, query, onQueryChange, selectedIds, selectedCount, onToggle, onClose, onConfirm }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">
        <div className="flex max-h-[min(720px,calc(100vh-24px))] w-[min(760px,calc(100vw-20px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white">
          <div className="flex items-center justify-between border-b border-black/10 p-4 dark:border-white/10">
            <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black" aria-label="بستن" title="بستن">
              <img src="/images/icons/bastan.svg" alt="" className="h-5 w-5 invert dark:invert-0" />
            </button>
            <div className="flex items-center gap-2 text-sm font-semibold md:text-base"><img src="/images/icons/asnad-mortabet.svg" alt="" className="h-5 w-5 dark:invert" />اسناد مرتبط</div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <input value={query} onChange={(event) => onQueryChange(event.target.value)} className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-neutral-900 outline-none dark:border-white/15 dark:bg-white/5 dark:text-white" type="text" placeholder="جستجو با شماره / موضوع / سازمان / شماره ثبت دبیرخانه" autoFocus />
            <div className="mt-3 max-h-[46vh] overflow-auto rounded-xl border border-black/10 p-2 dark:border-white/10">
              {loading ? <div className="p-4 text-center text-sm text-neutral-500 dark:text-white/60">در حال بارگذاری نامه‌ها...</div> : letters.length ? letters.map((letter) => {
                const id = String(letterIdOf(letter));
                const checked = selectedIds.has(id);
                const no = secretariatNoOf(letter) || letterNoOf(letter) || id;
                return <button key={id} type="button" onClick={() => onToggle(id)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-right transition hover:bg-black/[0.04] dark:hover:bg-white/10"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{toFaDigits(no)}</span>{letterDateOf(letter) ? <span className="text-xs text-black/45 dark:text-white/45">{toFaDigits(letterDateOf(letter))}</span> : null}</div><div className="mt-1 truncate text-xs text-black/60 dark:text-white/60">{subjectOf(letter) || orgOf(letter) || "بدون شرح"}</div></div><div className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${checked ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/15 dark:border-white/20"}`}>{checked ? <span className="text-xs">✓</span> : null}</div></button>;
              }) : <div className="p-4 text-center text-sm text-neutral-500 dark:text-white/60">موردی پیدا نشد.</div>}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-black/10 p-4 dark:border-white/10"><span className="text-xs text-neutral-500 dark:text-white/60">{toFaDigits(selectedCount)} سند انتخاب شده</span><button type="button" onClick={onConfirm} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black" title="تأیید" aria-label="تأیید"><img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" /></button></div>
        </div>
      </div>
    </div>,
    document.body,
  );
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

function formatMoney(n) {
  const s = String(n ?? "");
  if (s === "") return "";
  const sign = Number(n) < 0 ? "-" : "";
  const digits = String(Math.abs(Number(n) || 0));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function cleanAmountInput(value) {
  return toEnDigits(value)
    .replace(/[٬,،\s]/g, "")
    .replace(/٫/g, ".")
    .replace(/[−–—]/g, "-")
    .replace(/[^\d.-]/g, "");
}

function formatAmountInput(value) {
  const raw = cleanAmountInput(value);
  if (!raw || raw === "-" || raw === "." || raw === "-.") return raw;
  const sign = raw.startsWith("-") ? "-" : "";
  const unsigned = sign ? raw.slice(1) : raw;
  const [integer = "", decimal] = unsigned.split(".");
  const formattedInteger = integer ? new Intl.NumberFormat("en-US").format(Number(integer) || 0) : "0";
  return `${sign}${formattedInteger}${decimal !== undefined ? `.${decimal}` : ""}`;
}

function parseAmountInput(value) {
  const raw = cleanAmountInput(value);
  const number = Number.parseFloat(raw);
  return Number.isFinite(number) ? number : 0;
}

function percentOf(amount, percent) {
  return (Number(amount) || 0) * (Number(percent) || 0) / 100;
}

function pickFirst(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function readVerifiedContractCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONTRACT_VERIFIED_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((row) => row && typeof row === "object" && row.id) : [];
  } catch {
    return [];
  }
}

function mergeContractRowsById(...groups) {
  const map = new Map();
  groups.flat().forEach((row) => {
    if (row?.id) map.set(String(row.id), row);
  });
  return Array.from(map.values()).sort((a, b) => {
    const at = Date.parse(a?.updatedAt || a?.updated_at || a?.createdAt || a?.created_at || "") || 0;
    const bt = Date.parse(b?.updatedAt || b?.updated_at || b?.createdAt || b?.created_at || "") || 0;
    return bt - at;
  });
}

function isMainProjectCode(code) {
  const normalized = toEnDigits(code).trim();
  return /^\d+$/.test(normalized);
}

function letterIdOf(letter) {
  return pickFirst(letter?.id, letter?.letter_id, letter?.letterId);
}

function letterNoOf(letter) {
  return pickFirst(letter?.letter_no, letter?.letterNo, letter?.no, letter?.number);
}

function secretariatNoOf(letter) {
  return pickFirst(letter?.secretariat_no, letter?.secretariatNo);
}

function subjectOf(letter) {
  return pickFirst(letter?.subject, letter?.title);
}

function orgOf(letter) {
  return pickFirst(letter?.org_name, letter?.orgName, letter?.organization, letter?.company, letter?.from_name, letter?.to_name);
}

function letterDateOf(letter) {
  return pickFirst(letter?.letter_date, letter?.letterDate, letter?.date, letter?.secretariat_date, letter?.secretariatDate);
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
        className="w-full h-10 px-3 rounded-xl border text-right flex items-center justify-between gap-2 border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02] dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
      >
        <span className={value ? "" : "text-neutral-400 dark:text-white/50"}>{value ? toFaDigits(value) : "انتخاب تاریخ"}</span>
        <img src="/images/icons/tarikh.svg" alt="" className="h-[18px] w-[18px] dark:invert" />
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

function AmountInputWithMeta({
  value,
  onChange,
  metaLabel,
  leadingControl = null,
  readOnly = false,
  placeholder = "0",
  className = "",
}) {
  return (
    <div
      dir="ltr"
      className={`mt-1 flex h-10 w-full items-center gap-2 rounded-xl border px-3 text-neutral-900 outline-none ${
        readOnly
          ? "border-black/10 bg-black/5 dark:border-white/15 dark:bg-white/10 dark:text-white"
          : "border-black/10 bg-white dark:border-white/15 dark:bg-white/5 dark:text-white"
      } ${className}`}
    >
      {leadingControl}
      <input
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className="min-w-0 flex-1 bg-transparent text-left outline-none"
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
      />
      {metaLabel ? (
        <span
          dir="rtl"
          className="max-w-[52%] shrink-0 truncate rounded-lg bg-black/[0.06] px-2 py-1 text-[11px] font-semibold text-neutral-600 dark:bg-white/10 dark:text-white/70"
          title={metaLabel}
        >
          {metaLabel}
        </span>
      ) : null}
    </div>
  );
}

export default function FinancialWorksheetPage() {
  useFeatureVisibility("کاربرگ مالی", { "صورت وضعیت‌ها": "صورت وضعیت", "دریافتی‌ها": "دریافتی" });
  const { user } = useAuth();
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
  const [contractRows, setContractRows] = useState([]);
  const [contractId, setContractId] = useState("");
  const [contractKind, setContractKind] = useState("main");

  const [tab, setTab] = useState("statement");
  const [formOpen, setFormOpen] = useState(false);
  const [err, setErr] = useState("");
  const [editingRowId, setEditingRowId] = useState("");

  const [statementNo, setStatementNo] = useState("");
  const [jalaliDate, setJalaliDate] = useState("");
  const [description, setDescription] = useState("");
  const [grossAmount, setGrossAmount] = useState("");
  const [prepaymentDepreciation, setPrepaymentDepreciation] = useState("");
  const [insuranceDeposit, setInsuranceDeposit] = useState("");
  const [performanceDeposit, setPerformanceDeposit] = useState("");
  const [otherDebts, setOtherDebts] = useState([{ id: Date.now(), amount: "", description: "" }]);
  const [vatStatus, setVatStatus] = useState("none");
  const [vatPercent, setVatPercent] = useState("");

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [filesUploading, setFilesUploading] = useState(false);
  const [relatedDocumentsOpen, setRelatedDocumentsOpen] = useState(false);
  const [uploadDraftFiles, setUploadDraftFiles] = useState([]);
  const [letters, setLetters] = useState([]);
  const [lettersLoading, setLettersLoading] = useState(false);
  const lettersLoadedRef = useRef(false);
  const [uploadLetterQuery, setUploadLetterQuery] = useState("");
  const [relatedLetterIds, setRelatedLetterIds] = useState([]);
  const [uploadDraftLetterIds, setUploadDraftLetterIds] = useState([]);
  const uploadInputRef = useRef(null);

  const [currencyItems, setCurrencyItems] = useState([]);
  const [currencySourceItems, setCurrencySourceItems] = useState([]);
  const [receiptBasisItems, setReceiptBasisItems] = useState([]);
  const [currencyId, setCurrencyId] = useState("");
  const [currencySourceId, setCurrencySourceId] = useState("");
  const [receiptTypeRows, setReceiptTypeRows] = useState([{ id: Date.now() + Math.random(), type: "", number: "", otherDescription: "" }]);
  const [receiptJalaliDate, setReceiptJalaliDate] = useState("");
  const [receiptReceivedAmount, setReceiptReceivedAmount] = useState("");
  const [receiptCurrencyId, setReceiptCurrencyId] = useState("");
  const [receiptCurrencySourceId, setReceiptCurrencySourceId] = useState("");
  const [receiptRialDescription, setReceiptRialDescription] = useState("");
  const [receiptDescription, setReceiptDescription] = useState("");

  const [worksheetRows, setWorksheetRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [unreadIds, setUnreadIds] = useState(() => new Set());
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let stop = false;
    (async () => {
      setErr("");
      setProjectsLoading(true);
      try {
        const [pResp, tResp, sResp, cResp, subContractsResp, receiptBasisResp] = await Promise.all([
          api("/projects").catch(() => ({ items: [] })),
          api("/base/currencies/types").catch(() => ({ items: [] })),
          api("/base/currencies/sources").catch(() => ({ items: [] })),
          api("/contracts").catch(() => ({ items: [] })),
          // قراردادهای فرعی در برخی نسخه‌های API فقط با این فیلتر بازگردانده می‌شوند.
          api("/contracts?documentType=sub").catch(() => ({ items: [] })),
          api("/base/financial-options?category=worksheet-receipt").catch(() => ({ items: [] })),
        ]);

        if (stop) return;

        const pList = pResp?.projects || pResp?.items || pResp?.data || [];
        setProjects(Array.isArray(pList) ? pList : []);

        const tList = tResp?.items || tResp?.data || tResp?.types || [];
        const sList = sResp?.items || sResp?.data || sResp?.sources || [];
        const receiptBasisList = receiptBasisResp?.items || receiptBasisResp?.data || [];
        const cList = cResp?.items || cResp?.data || cResp?.contracts || [];
        const subContracts = subContractsResp?.items || subContractsResp?.data || subContractsResp?.contracts || [];
        const baseContracts = mergeContractRowsById(
          Array.isArray(cList) ? cList : [],
          Array.isArray(subContracts) ? subContracts : [],
        );
        const knownContractIds = new Set(baseContracts.map((row) => String(row?.id || "")).filter(Boolean));
        const cachedContracts = readVerifiedContractCache()
          .filter((row) => row?.id && !knownContractIds.has(String(row.id)))
          .slice(0, 40);
        const verifiedCachedContracts = (
          await Promise.all(
            cachedContracts.map((row) =>
              api(`/contracts?id=${encodeURIComponent(row.id)}`)
                .then((payload) => payload?.item || row)
                .catch(() => null),
            ),
          )
        ).filter((row) => row?.id);
        if (stop) return;

        setCurrencyItems(Array.isArray(tList) ? tList : []);
        setCurrencySourceItems(Array.isArray(sList) ? sList : []);
        setReceiptBasisItems(Array.isArray(receiptBasisList) ? receiptBasisList : []);
        setContractRows(mergeContractRowsById(baseContracts, verifiedCachedContracts));
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
      .filter((p) => isMainProjectCode(p?.code ?? ""))
      .slice()
      .sort((a, b) =>
        String(a?.code || "").localeCompare(String(b?.code || ""), "fa", {
          numeric: true,
          sensitivity: "base",
        }),
      );
  }, [projects]);

  const selectedProject = useMemo(
    () => activeProjects.find((project) => String(project?.id) === String(projectId)) || null,
    [activeProjects, projectId],
  );

  const contractById = useMemo(() => {
    const map = new Map();
    (Array.isArray(contractRows) ? contractRows : []).forEach((row) => {
      if (row?.id) map.set(String(row.id), row);
    });
    return map;
  }, [contractRows]);

  const documentTypeForContract = useCallback((row) => {
    if (!row) return "main";
    const rawType = String(row.documentType ?? row.document_type ?? "main");
    const parentId = String(row.parentContractId ?? row.parent_contract_id ?? "").trim();
    const subNo = String(row.subContractNo ?? row.sub_contract_no ?? "").trim();
    if (parentId && subNo) return "sub";
    if (rawType === "main" && parentId) return subNo ? "sub" : "appendix";
    return rawType;
  }, []);

  const contractNoForRow = useCallback(
    (row) => {
      if (!row) return "";
      const documentType = documentTypeForContract(row);
      if (documentType === "main") return String(row.contractNo || row.contract_no || "").trim();
      const parent = contractById.get(String(row.parentContractId || row.parent_contract_id || ""));
      if (documentType === "sub") {
        return String(row.subContractNo || row.sub_contract_no || row.contractNo || row.contract_no || parent?.contractNo || parent?.contract_no || "").trim();
      }
      return String(parent?.contractNo || parent?.contract_no || row.contractNo || row.contract_no || "").trim();
    },
    [contractById, documentTypeForContract],
  );

  const documentTypeLabel = (type) => {
    if (type === "sub") return "فرعی";
    if (type === "appendix") return "الحاقیه";
    return "اصلی";
  };

  const projectContractOptions = useMemo(() => {
    const list = Array.isArray(contractRows) ? contractRows : [];
    return list
      .filter((row) => {
        const selectedProjectId = String(projectId || "");
        const ownProjectId = String(row?.projectId ?? row?.project_id ?? "");
        const parent = contractById.get(String(row?.parentContractId || row?.parent_contract_id || ""));
        const parentProjectId = String(parent?.projectId ?? parent?.project_id ?? "");
        return ownProjectId === selectedProjectId || parentProjectId === selectedProjectId;
      })
      .filter((row) => ["main", "sub"].includes(documentTypeForContract(row)))
      .map((row) => {
        const parent = contractById.get(String(row?.parentContractId || row?.parent_contract_id || ""));
        const documentType = documentTypeForContract(row);
        return {
          row,
          id: String(row?.id || ""),
          no: contractNoForRow(row),
          parentNo: contractNoForRow(parent),
          subject: String(row?.general?.contractSubject || parent?.general?.contractSubject || ""),
          typeLabel: documentTypeLabel(documentType),
          documentType,
        };
      })
      .filter((item) => item.id && item.no)
      .sort((a, b) => {
        const typeOrder = { main: 0, sub: 1 };
        const typeCompare = (typeOrder[a.documentType] ?? 9) - (typeOrder[b.documentType] ?? 9);
        if (typeCompare) return typeCompare;
        const noCompare = a.no.localeCompare(b.no, "fa", { numeric: true });
        if (noCompare) return noCompare;
        return a.typeLabel.localeCompare(b.typeLabel, "fa");
      });
  }, [contractById, contractNoForRow, contractRows, documentTypeForContract, projectId]);

  const visibleProjectContractOptions = useMemo(
    () => projectContractOptions.filter((item) => item.documentType === contractKind),
    [contractKind, projectContractOptions],
  );

  useEffect(() => {
    if (!contractId) return;
    if (!projectContractOptions.some((item) => item.id === String(contractId))) setContractId("");
  }, [contractId, projectContractOptions]);

  useEffect(() => {
    if (contractKind !== "main" || !selectedProject || toEnDigits(selectedProject?.code).trim() === "100") return;
    const mainContracts = projectContractOptions.filter((item) => item.documentType === "main");
    if (mainContracts.length === 1) setContractId(mainContracts[0].id);
  }, [contractKind, projectContractOptions, selectedProject]);

  const normalizeRows = useCallback((items) => {
    const list = Array.isArray(items) ? items : [];
    return list.map((r, i) => ({
      id: String(r?.id ?? r?.worksheet_id ?? r?.record_id ?? `tmp_${i}`),
      contractId: String(r?.contract_id ?? r?.contractId ?? ""),
      number: String(r?.statement_no ?? r?.statementNo ?? r?.receipt_no ?? r?.receiptNo ?? r?.no ?? ""),
      date: String(r?.jalali_date ?? r?.date_jalali ?? r?.date ?? ""),
      grossAmount: Number(r?.gross_amount ?? r?.grossAmount ?? r?.gross ?? 0) || 0,
      vatAmount: Number(r?.vat_amount ?? r?.vatAmount ?? r?.vat ?? 0) || 0,
      receiptAmount: Number(r?.received_amount ?? r?.receivedAmount ?? r?.receipt_amount ?? r?.receiptAmount ?? r?.amount ?? r?.gross_amount ?? r?.grossAmount ?? 0) || 0,
      receiptForeignAmount: Number(
        r?.received_amount_foreign ??
          r?.receivedAmountForeign ??
          r?.receipt_amount_foreign ??
          r?.receiptAmountForeign ??
          r?.amount_foreign ??
          r?.amountForeign ??
          r?.vat_amount ??
          r?.vatAmount ??
          0,
      ) || 0,
      currencyId: String(r?.currency_id ?? r?.currencyId ?? r?.currency_type_id ?? r?.currencyTypeId ?? ""),
      currencySourceId: String(r?.currency_source_id ?? r?.currencySourceId ?? ""),
      description: String(r?.description ?? r?.desc ?? r?.notes ?? r?.note ?? ""),
      rialDescription: String(r?.rial_description ?? r?.rialDescription ?? r?.description_rial ?? ""),
      receiptType: String(r?.receipt_type ?? r?.receiptType ?? r?.type ?? ""),
      receiptTypeOtherDescription: String(r?.receipt_type_other_description ?? r?.receiptTypeOtherDescription ?? r?.other_type_description ?? ""),
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
      if (!projectId || !contractId) {
        setWorksheetRows([]);
        setRowsLoading(false);
        return;
      }
      setRowsLoading(true);
      try {
        const q = new URLSearchParams();
        q.set("project_id", String(projectId));
        q.set("contract_id", String(contractId));
        q.set("kind", tab === "receipts" ? "receipts" : "statement");
        const r = await api("/financial-worksheet?" + q.toString());
        if (dead) return;
        const rows = r?.items || r?.data || r?.rows || [];
        setWorksheetRows(normalizeRows(rows).filter((row) => !row.contractId || String(row.contractId) === String(contractId)));
      } catch {
        if (!dead) setWorksheetRows([]);
      } finally {
        if (!dead) setRowsLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [api, contractId, projectId, tab, normalizeRows]);

  const worksheetTotals = useMemo(() => {
    return (worksheetRows || []).reduce(
      (acc, row) => {
        acc.gross += Number(row.grossAmount || 0);
        acc.vat += Number(row.vatAmount || 0);
        acc.receipt += Number(row.receiptAmount || 0);
        acc.receiptForeign += Number(row.receiptForeignAmount || 0);
        return acc;
      },
      { gross: 0, vat: 0, receipt: 0, receiptForeign: 0 },
    );
  }, [worksheetRows]);
  const sumGross = worksheetTotals.gross;
  const sumVat = worksheetTotals.vat;
  const sumReceiptAmount = worksheetTotals.receipt;
  const sumReceiptForeignAmount = worksheetTotals.receiptForeign;
  const totalRows = worksheetRows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, pageCount - 1);
  const startIndex = safePage * rowsPerPage;
  const endIndex = Math.min(totalRows, startIndex + rowsPerPage);
  const pageRows = worksheetRows.slice(startIndex, endIndex);
  const visibleIds = pageRows.map((row) => String(row.id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected;
  const selectAllRef = useRef(null);
  const readStatusKey = user?.id ? `financial_worksheet_unread:u${user.id}` : "";

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someVisibleSelected;
  }, [someVisibleSelected]);

  useEffect(() => {
    if (!readStatusKey) { setUnreadIds(new Set()); return; }
    try { setUnreadIds(new Set(JSON.parse(localStorage.getItem(readStatusKey) || "[]").map(String))); }
    catch { setUnreadIds(new Set()); }
  }, [readStatusKey]);

  const updateUnreadIds = (update) => setUnreadIds((current) => {
    const next = update(new Set(current));
    if (readStatusKey) {
      try { localStorage.setItem(readStatusKey, JSON.stringify([...next])); } catch {}
    }
    return next;
  });

  const toggleSelected = (id) => setSelectedIds((current) => {
    const next = new Set(current);
    const key = String(id);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const toggleSelectAll = () => setSelectedIds((current) => {
    const next = new Set(current);
    visibleIds.forEach((id) => { if (allVisibleSelected) next.delete(id); else next.add(id); });
    return next;
  });


  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  useEffect(() => {
    setPage(0);
    setSelectedIds(new Set());
  }, [contractId, projectId, tab]);

  const selectedContract = useMemo(() => contractById.get(String(contractId || "")) || null, [contractById, contractId]);
  const selectedContractFinancial = selectedContract?.financial && typeof selectedContract.financial === "object" ? selectedContract.financial : {};
  const selectedContractDocumentType = documentTypeForContract(selectedContract);
  const isSelectedSubContract = selectedContractDocumentType === "sub";
  const canShowWorksheet = Boolean(projectId && contractId);
  const grossAmountNumber = useMemo(() => parseAmountInput(grossAmount), [grossAmount]);
  const prepaymentDepreciationNumber = useMemo(() => parseAmountInput(prepaymentDepreciation), [prepaymentDepreciation]);
  const otherDeductionsNumber = useMemo(
    () => (otherDebts || []).reduce((sum, row) => sum + parseAmountInput(row?.amount), 0),
    [otherDebts],
  );
  const insuranceDepositPercent = selectedContractFinancial?.capitalDeposit === "has" ? parseAmountInput(selectedContractFinancial?.capitalDepositAmount) : 0;
  const performanceDepositPercent = selectedContractFinancial?.performanceBond === "has" ? parseAmountInput(selectedContractFinancial?.performanceBondAmount) : 0;
  const insuranceDepositNumber = useMemo(
    () => percentOf(grossAmountNumber, insuranceDepositPercent),
    [grossAmountNumber, insuranceDepositPercent],
  );
  const performanceDepositNumber = useMemo(
    () => percentOf(grossAmountNumber, performanceDepositPercent),
    [grossAmountNumber, performanceDepositPercent],
  );
  const netWithoutVatNumber = useMemo(
    () => grossAmountNumber - prepaymentDepreciationNumber - insuranceDepositNumber - performanceDepositNumber - otherDeductionsNumber,
    [grossAmountNumber, insuranceDepositNumber, otherDeductionsNumber, performanceDepositNumber, prepaymentDepreciationNumber],
  );
  const vatPercentNumber = vatStatus === "has" ? parseAmountInput(vatPercent) : 0;
  const vatAmountNumber = useMemo(() => percentOf(grossAmountNumber, vatPercentNumber), [grossAmountNumber, vatPercentNumber]);
  const netWithVatNumber = useMemo(() => netWithoutVatNumber + vatAmountNumber, [netWithoutVatNumber, vatAmountNumber]);
  const formatComputedAmount = (value) => formatAmountInput(String(Math.round((Number(value) || 0) * 100) / 100));

  const gregorianDate = useMemo(() => {
    const m = String(jalaliDate || "").match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (!m) return "";
    const g = jalaliToGregorian(Number(m[1]), Number(m[2]), Number(m[3]));
    if (!g) return "";
    return `${g.gy}/${pad2(g.gm)}/${pad2(g.gd)}`;
  }, [jalaliDate]);

  const projectLabel = (p) => {
    const code = String(p?.code || "").trim();
    const name = String(p?.name || p?.title || "").trim();
    return `${code ? `${toFaDigits(code)} - ` : ""}${name || "—"}`;
  };

  const readItemId = (it) => String(it?.id ?? it?.code ?? it?.value ?? it?.key ?? "");
  const readItemLabel = (it) => String(it?.label ?? it?.title ?? it?.name ?? it?.code ?? "").trim();
  const isRialCurrencyItem = (it) => {
    const value = `${readItemId(it)} ${readItemLabel(it)}`.toLowerCase();
    return value.includes("ریال") || value.includes("irr") || value.includes("rial");
  };
  const currencyById = useMemo(() => {
    const map = new Map();
    (currencyItems || []).forEach((item) => {
      const id = readItemId(item);
      if (id) map.set(id, item);
    });
    return map;
  }, [currencyItems]);
  const currencySourceById = useMemo(() => {
    const map = new Map();
    (currencySourceItems || []).forEach((item) => {
      const id = readItemId(item);
      if (id) map.set(id, item);
    });
    return map;
  }, [currencySourceItems]);
  const selectedCurrencyLabel = useMemo(
    () => readItemLabel(currencyById.get(String(currencyId))),
    [currencyById, currencyId],
  );
  const selectedCurrencySourceLabel = useMemo(
    () => readItemLabel(currencySourceById.get(String(currencySourceId))),
    [currencySourceById, currencySourceId],
  );
  const selectedCurrencyMetaLabel = useMemo(() => {
    const parts = [selectedCurrencyLabel, selectedCurrencySourceLabel].filter(Boolean);
    return parts.length ? parts.join(" / ") : "";
  }, [selectedCurrencyLabel, selectedCurrencySourceLabel]);
  const receiptTypeOptions = useMemo(() => {
    const configured = (receiptBasisItems || [])
      .map((item) => String(item?.title || "").trim())
      .filter(Boolean)
      .map((title) => ({ value: title, label: title }));
    return configured.length ? configured : DEFAULT_RECEIPT_TYPE_OPTIONS;
  }, [receiptBasisItems]);
  const receiptTypeLabel = (value) => receiptTypeOptions.find((item) => item.value === value)?.label || String(value || "");
  const isStatementReceiptType = (value) => String(value) === "statement" || receiptTypeLabel(value) === "صورت وضعیت";
  const isOtherReceiptType = (value) => String(value) === "other" || receiptTypeLabel(value) === "سایر";

  const addReceiptTypeRow = () =>
    setReceiptTypeRows((prev) => [...(Array.isArray(prev) ? prev : []), { id: Date.now() + Math.random(), type: "", number: "", otherDescription: "" }]);
  const removeReceiptTypeRow = (id) => setReceiptTypeRows((prev) => prev.filter((r) => r.id !== id));
  const updateReceiptTypeRow = (id, patch) =>
    setReceiptTypeRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const receiptGregorianDate = useMemo(() => {
    const m = String(receiptJalaliDate || "").match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (!m) return "";
    const g = jalaliToGregorian(Number(m[1]), Number(m[2]), Number(m[3]));
    if (!g) return "";
    return `${g.gy}/${pad2(g.gm)}/${pad2(g.gd)}`;
  }, [receiptJalaliDate]);

  const selectedReceiptCurrency = useMemo(
    () => currencyById.get(String(receiptCurrencyId)),
    [currencyById, receiptCurrencyId],
  );
  const selectedReceiptCurrencyLabel = useMemo(
    () => readItemLabel(selectedReceiptCurrency),
    [selectedReceiptCurrency],
  );
  const selectedReceiptCurrencySourceLabel = useMemo(
    () => readItemLabel(currencySourceById.get(String(receiptCurrencySourceId))),
    [currencySourceById, receiptCurrencySourceId],
  );
  const isRialCurrency = useMemo(() => {
    const id = readItemId(selectedReceiptCurrency).toLowerCase();
    const label = readItemLabel(selectedReceiptCurrency).toLowerCase();
    return label.includes("ریال") || label.includes("irr") || label.includes("rial") || id.includes("irr") || id.includes("rial");
  }, [selectedReceiptCurrency]);
  const receiptReceivedAmountNumber = useMemo(() => parseAmountInput(receiptReceivedAmount), [receiptReceivedAmount]);
  const addOtherDebtRow = () =>
    setOtherDebts((prev) => [...prev, { id: Date.now() + Math.random(), amount: "", description: "" }]);
  const removeOtherDebtRow = (id) => setOtherDebts((prev) => prev.filter((r) => r.id !== id));
  const updateOtherDebtRow = (id, patch) =>
    setOtherDebts((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const loadLettersForUpload = useCallback(async () => {
    if (lettersLoadedRef.current || lettersLoading) return;
    setLettersLoading(true);
    try {
      const lResp = await api("/letters");
      const lList = lResp?.items || lResp?.data || lResp?.letters || [];
      setLetters(
        (Array.isArray(lList) ? lList : [])
          .filter((letter) => letter && typeof letter === "object" && letterIdOf(letter))
          .sort((a, b) => String(letterIdOf(b)).localeCompare(String(letterIdOf(a)), "fa", { numeric: true })),
      );
      lettersLoadedRef.current = true;
    } finally {
      setLettersLoading(false);
    }
  }, [api, lettersLoading]);

  const openUploadModal = () => {
    setUploadOpen(true);
  };
  const uploadWorksheetFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;
    setFilesUploading(true);
    setErr("");
    try {
      const uploaded = [];
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch(`${API_BASE}/financial-worksheet/upload`, {
          method: "POST",
          credentials: "include",
          body,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || "upload_failed");
        uploaded.push(...(Array.isArray(data?.items) ? data.items : data?.file ? [data.file] : []));
      }
      if (uploaded.length) setUploadedFiles((previous) => [...(Array.isArray(previous) ? previous : []), ...uploaded]);
    } catch (error) {
      setErr(error?.message || "خطا در بارگذاری فایل");
    } finally {
      setFilesUploading(false);
    }
  };
  const openRelatedDocumentsModal = () => {
    setUploadDraftLetterIds(Array.isArray(relatedLetterIds) ? relatedLetterIds : []);
    setUploadLetterQuery("");
    setRelatedDocumentsOpen(true);
    void loadLettersForUpload();
  };
  const addFilesToDraft = (fileList) => {
    const incoming = Array.from(fileList || []).filter(Boolean);
    if (!incoming.length) return;
    setUploadDraftFiles((prev) => [...(Array.isArray(prev) ? prev : []), ...incoming]);
  };
  const filteredUploadLetters = useMemo(() => {
    const q = toEnDigits(uploadLetterQuery).trim().toLowerCase();
    const list = Array.isArray(letters) ? letters : [];
    if (!q) return list.slice(0, 80);
    return list.filter((letter) => {
      const haystack = [letterNoOf(letter), secretariatNoOf(letter), subjectOf(letter), orgOf(letter), letterDateOf(letter)]
        .map((item) => toEnDigits(item).toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [letters, uploadLetterQuery]);
  const letterById = useMemo(() => {
    const map = new Map();
    (letters || []).forEach((letter) => {
      const id = String(letterIdOf(letter) || "");
      if (id) map.set(id, letter);
    });
    return map;
  }, [letters]);
  const selectedRelatedLetters = useMemo(() => {
    return (relatedLetterIds || [])
      .map((id) => letterById.get(String(id)))
      .filter(Boolean);
  }, [letterById, relatedLetterIds]);
  const uploadDraftLetterIdSet = useMemo(() => new Set((uploadDraftLetterIds || []).map(String)), [uploadDraftLetterIds]);
  const toggleUploadDraftLetter = (id) => {
    setUploadDraftLetterIds((prev) => {
      const list = Array.isArray(prev) ? prev.map(String) : [];
      return list.includes(String(id)) ? list.filter((item) => item !== String(id)) : [...list, String(id)];
    });
  };

  const worksheetTabs = useMemo(
    () => [
      { id: "statement", label: isSelectedSubContract ? "صورت وضعیت‌ها / صورت حساب‌ها" : "صورت وضعیت‌ها" },
      { id: "receipts", label: isSelectedSubContract ? "پرداختی‌ها" : "دریافتی‌ها" },
    ],
    [isSelectedSubContract],
  );
  const receiptUi = useMemo(
    () =>
      isSelectedSubContract
        ? {
            noun: "پرداختی",
            basis: "بابت پرداختی",
            basisSelect: "انتخاب بابت پرداختی",
            basisOther: "بابت پرداختی را وارد کنید...",
            date: "تاریخ پرداخت",
            amount: "مبلغ خالص پرداخت شده",
            foreignAmount: "مبلغ خالص پرداخت شده ارزی",
          }
        : {
            noun: "دریافتی",
            basis: "بابت دریافتی",
            basisSelect: "انتخاب بابت دریافتی",
            basisOther: "بابت دریافتی را وارد کنید...",
            date: "تاریخ دریافت",
            amount: "مبلغ خالص دریافت شده",
            foreignAmount: "مبلغ خالص دریافت شده ارزی",
          },
    [isSelectedSubContract],
  );
  const tabStripCls =
    "mb-2 flex w-full items-center justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-xl border border-black/10 bg-black/[0.03] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-auto md:-mb-px md:max-w-[780px] md:items-stretch md:justify-center md:gap-0 md:rounded-b-none md:rounded-t-2xl md:border-b-0 md:bg-white md:p-0 md:shadow-sm dark:border-neutral-800 dark:bg-white/[0.04] md:dark:bg-neutral-900";
  const topTabBtnClass = (isActive, index, total) =>
    [
      "relative z-10 h-10 min-w-[118px] flex-none rounded-lg px-3 text-xs font-semibold transition whitespace-nowrap md:h-11 md:min-w-[132px] md:flex-1 md:rounded-none md:px-4 md:text-sm",
      index > 0 ? "md:border-r md:border-black/10 md:dark:border-neutral-800" : "",
      index === 0 ? "md:rounded-tr-2xl" : "",
      index === total - 1 ? "md:rounded-tl-2xl" : "",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20",
      isActive
        ? "bg-black text-white shadow-sm dark:bg-black dark:text-white"
        : "bg-white text-[#1f2937] hover:bg-neutral-50 md:bg-white dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 md:dark:bg-neutral-900",
    ].join(" ");
  const renderVatOption = (value, label) => (
    <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold transition hover:bg-black/[0.03] dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700">
      <input
        type="checkbox"
        checked={vatStatus === value}
        onChange={() => {
          setVatStatus(value);
          if (value !== "has") setVatPercent("");
        }}
        className="h-4 w-4 accent-black"
      />
      {label}
    </label>
  );

  const handleEditRow = (row) => {
    const source = row?.raw && typeof row.raw === "object" ? row.raw : row || {};
    setFormOpen(true);
    setErr("");
    setEditingRowId(String(row?.id || source?.id || ""));
    if (tab === "receipts") {
      const storedTypes = Array.isArray(source?.receipt_types) && source.receipt_types.length
        ? source.receipt_types
        : [{ type: source?.receipt_type ?? row?.receiptType, number: source?.receipt_no ?? row?.number, otherDescription: source?.receipt_type_other_description ?? row?.receiptTypeOtherDescription }];
      setReceiptTypeRows(storedTypes.map((item) => ({
        id: Date.now() + Math.random(),
        type: String(item?.type || ""),
        number: String(item?.number || ""),
        otherDescription: String(item?.otherDescription ?? item?.other_description ?? ""),
      })));
      setReceiptJalaliDate(String(source?.jalali_date ?? row?.date ?? ""));
      setReceiptReceivedAmount(formatAmountInput(source?.received_amount ?? row?.receiptAmount ?? ""));
      setReceiptCurrencyId(String(source?.currency_id ?? row?.currencyId ?? ""));
      setReceiptCurrencySourceId(String(source?.currency_source_id ?? row?.currencySourceId ?? ""));
      setReceiptRialDescription(String(source?.rial_description ?? row?.rialDescription ?? ""));
      setReceiptDescription(String(source?.description ?? row?.description ?? ""));
      return;
    }
    setStatementNo(String(source?.statement_no ?? row?.number ?? ""));
    setJalaliDate(String(source?.jalali_date ?? row?.date ?? ""));
    setDescription(String(source?.description ?? row?.description ?? ""));
    setGrossAmount(formatAmountInput(source?.gross_amount ?? row?.grossAmount ?? ""));
    setCurrencyId(String(source?.currency_id ?? row?.currencyId ?? ""));
    setCurrencySourceId(String(source?.currency_source_id ?? row?.currencySourceId ?? ""));
    setPrepaymentDepreciation(formatAmountInput(source?.prepayment_depreciation ?? ""));
    setInsuranceDeposit(formatAmountInput(source?.insurance_deposit ?? ""));
    setPerformanceDeposit(formatAmountInput(source?.performance_deposit ?? ""));
    setOtherDebts((Array.isArray(source?.other_deductions) && source.other_deductions.length ? source.other_deductions : [{ amount: "", description: "" }]).map((item) => ({
      id: Date.now() + Math.random(), amount: formatAmountInput(item?.amount ?? ""), description: String(item?.description || ""),
    })));
    setVatStatus(String(source?.vat_status || "none"));
    setVatPercent(formatAmountInput(source?.vat_percent ?? ""));
    setRelatedLetterIds(Array.isArray(source?.related_letter_ids) ? source.related_letter_ids.map(String) : []);
    setUploadedFiles(Array.isArray(source?.uploaded_files) ? source.uploaded_files : []);
  };

  const editSelectedRow = () => {
    const row = worksheetRows.find((item) => selectedIds.has(String(item.id)));
    if (!row || selectedIds.size !== 1) return;
    handleEditRow(row);
    setSelectedIds(new Set());
  };

  const deleteSelectedRows = async () => {
    const ids = worksheetRows.filter((row) => selectedIds.has(String(row.id))).map((row) => String(row.id));
    if (!ids.length || deletingSelected) return;
    if (!window.confirm(`آیا ${toFaDigits(ids.length)} مورد انتخاب‌شده حذف شود؟ این عملیات قابل بازگشت نیست.`)) return;
    setDeletingSelected(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => api(`/financial-worksheet?id=${encodeURIComponent(id)}`, { method: "DELETE" })));
      const deleted = new Set(ids.filter((_, index) => results[index].status === "fulfilled"));
      if (deleted.size) {
        setWorksheetRows((prev) => prev.filter((row) => !deleted.has(String(row.id))));
        setSelectedIds((prev) => new Set([...prev].filter((id) => !deleted.has(id))));
        updateUnreadIds((next) => { deleted.forEach((id) => next.delete(id)); return next; });
      }
      if (deleted.size !== ids.length) setErr(`حذف ${toFaDigits(ids.length - deleted.size)} مورد انجام نشد. دوباره تلاش کنید.`);
    } catch (e) {
      setErr(e.message || "خطا در حذف");
    } finally {
      setDeletingSelected(false);
    }
  };

  const resetStatementForm = () => {
    setEditingRowId("");
    setStatementNo("");
    setJalaliDate("");
    setDescription("");
    setGrossAmount("");
    setPrepaymentDepreciation("");
    setInsuranceDeposit("");
    setPerformanceDeposit("");
    setOtherDebts([{ id: Date.now(), amount: "", description: "" }]);
    setVatStatus("none");
    setVatPercent("");
    setUploadedFiles([]);
    setRelatedLetterIds([]);
  };

  const resetReceiptForm = () => {
    setEditingRowId("");
    setReceiptTypeRows([{ id: Date.now() + Math.random(), type: "", number: "", otherDescription: "" }]);
    setReceiptJalaliDate("");
    setReceiptReceivedAmount("");
    setReceiptCurrencyId("");
    setReceiptCurrencySourceId("");
    setReceiptRialDescription("");
    setReceiptDescription("");
  };

  const handleSaveStatement = async () => {
    setErr("");
    if (!projectId) {
      setErr("ابتدا پروژه را انتخاب کنید.");
      return;
    }
    if (!contractId) {
      setErr("ابتدا شماره قرارداد را انتخاب کنید.");
      return;
    }
    if (!statementNo.trim()) {
      setErr("شماره صورت وضعیت را وارد کنید.");
      return;
    }
    if (!jalaliDate) {
      setErr("تاریخ را انتخاب کنید.");
      return;
    }

    const payload = {
      ...(editingRowId ? { id: editingRowId } : {}),
      kind: "statement",
      project_id: projectId,
      contract_id: contractId,
      contract_no: contractNoForRow(selectedContract),
      statement_no: statementNo.trim(),
      jalali_date: jalaliDate,
      gregorian_date: gregorianDate,
      description,
      gross_amount: grossAmountNumber,
      currency_id: currencyId,
      currency_label: selectedCurrencyLabel || "ریال",
      currency_source_id: currencySourceId,
      currency_source_label: selectedCurrencySourceLabel,
      prepayment_depreciation: prepaymentDepreciationNumber,
      insurance_deposit_percent: insuranceDepositPercent,
      insurance_deposit: insuranceDepositNumber,
      performance_deposit_percent: performanceDepositPercent,
      performance_deposit: performanceDepositNumber,
      other_deductions: (otherDebts || []).map((row) => ({
        amount: parseAmountInput(row?.amount),
        description: String(row?.description || "").trim(),
      })),
      net_without_vat: netWithoutVatNumber,
      vat_status: vatStatus,
      vat_percent: vatPercentNumber,
      vat_amount: vatAmountNumber,
      net_with_vat: netWithVatNumber,
      related_letter_ids: relatedLetterIds,
      uploaded_files: (uploadedFiles || []).map((file) => ({
        id: file?.id ?? file?.serverId ?? "",
        name: file?.name || "فایل",
        size: file?.size || 0,
        type: file?.type || "",
        url: file?.url || file?.href || "",
      })),
    };

    try {
      const saved = await api("/financial-worksheet", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const item = saved?.item || saved?.data || payload;
      const normalized = normalizeRows([item])[0];
      setWorksheetRows((prev) => editingRowId
        ? (Array.isArray(prev) ? prev.map((row) => String(row.id) === String(editingRowId) ? normalized : row) : [normalized])
        : [normalized, ...(Array.isArray(prev) ? prev : [])]);
      resetStatementForm();
      setFormOpen(false);
    } catch (e) {
      setErr(e.message || "خطا در ثبت صورت وضعیت");
    }
  };

  const handleSaveReceipt = async () => {
    setErr("");
    if (!projectId) {
      setErr("ابتدا پروژه را انتخاب کنید.");
      return;
    }
    if (!contractId) {
      setErr("ابتدا شماره قرارداد را انتخاب کنید.");
      return;
    }
    const cleanedTypeRows = (receiptTypeRows || [])
      .map((row) => ({
        type: String(row?.type || "").trim(),
        number: String(isStatementReceiptType(row?.type) ? row?.number || "" : "").trim(),
        otherDescription: String(isOtherReceiptType(row?.type) ? row?.otherDescription || "" : "").trim(),
      }))
      .filter((row) => row.type);
    if (!cleanedTypeRows.length) {
      setErr(`${receiptUi.basis} را انتخاب کنید.`);
      return;
    }
    if (cleanedTypeRows.some((row) => isStatementReceiptType(row.type) && !row.number)) {
      setErr("شماره صورت وضعیت را وارد کنید.");
      return;
    }
    if (cleanedTypeRows.some((row) => isOtherReceiptType(row.type) && !row.otherDescription)) {
      setErr(`${receiptUi.basis} سایر را وارد کنید.`);
      return;
    }
    if (!receiptJalaliDate) {
      setErr(`${receiptUi.date} را انتخاب کنید.`);
      return;
    }

    const firstType = cleanedTypeRows[0] || {};
    const payload = {
      ...(editingRowId ? { id: editingRowId } : {}),
      kind: "receipts",
      project_id: projectId,
      contract_id: contractId,
      contract_no: contractNoForRow(selectedContract),
      receipt_type: firstType.type,
      receipt_types: cleanedTypeRows,
      receipt_type_other_description: firstType.otherDescription || "",
      receipt_no: firstType.number || "",
      jalali_date: receiptJalaliDate,
      gregorian_date: receiptGregorianDate,
      received_amount: receiptReceivedAmountNumber,
      received_amount_foreign: isRialCurrency ? 0 : receiptReceivedAmountNumber,
      currency_id: receiptCurrencyId,
      currency_label: selectedReceiptCurrencyLabel || "ریال",
      currency_source_id: receiptCurrencySourceId,
      currency_source_label: selectedReceiptCurrencySourceLabel,
      rial_description: receiptRialDescription,
      description: receiptDescription,
    };

    try {
      const saved = await api("/financial-worksheet", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const item = saved?.item || saved?.data || payload;
      const normalized = normalizeRows([item])[0];
      setWorksheetRows((prev) => editingRowId
        ? (Array.isArray(prev) ? prev.map((row) => String(row.id) === String(editingRowId) ? normalized : row) : [normalized])
        : [normalized, ...(Array.isArray(prev) ? prev : [])]);
      resetReceiptForm();
      setFormOpen(false);
    } catch (e) {
      setErr(e.message || `خطا در ثبت ${receiptUi.noun}`);
    }
  };

  const confirmActionWrapCls = "flex items-center justify-end pt-2";
  const confirmActionBtnCls =
    "h-10 w-10 -translate-x-2 rounded-xl bg-black text-white ring-1 ring-black/15 transition flex items-center justify-center hover:bg-black/90 md:h-12 md:w-12 md:-translate-x-3 dark:bg-white dark:text-black dark:ring-white/10 dark:hover:bg-white/90";
  const confirmActionIconCls = "w-4 h-4 md:w-5 md:h-5 invert dark:invert-0";

  return (
    <>
      <Card className="overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
        <div className="p-3 md:p-4">
          <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[.06]">
                <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-bold md:text-lg">کاربرگ مالی</span>
              </span>
            </div>
          </div>

          <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(176px,.8fr)_auto_minmax(310px,1.2fr)] lg:items-end">
            <div>
              <label className="text-xs text-neutral-600 dark:text-white/60">پروژه</label>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setContractId("");
                  setContractKind("main");
                }}
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

            <div className="lg:justify-self-center">
              <label className="text-xs text-neutral-600 dark:text-white/60">قرارداد</label>
              <div className="mt-1 flex items-center gap-1">
                {[
                  { id: "main", label: "اصلی" },
                  { id: "sub", label: "فرعی" },
                ].map((item) => {
                  const active = contractKind === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!projectId}
                      aria-pressed={active}
                      onClick={() => {
                        setContractKind(item.id);
                        setContractId("");
                      }}
                      className={`h-11 min-w-[68px] rounded-xl border px-4 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        active
                          ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                          : "border-black/10 bg-white text-neutral-700 hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs text-neutral-600 dark:text-white/60">شماره قرارداد</label>
              <select
                value={contractId}
                onChange={(e) => setContractId(e.target.value)}
                disabled={!projectId}
                aria-label="شماره قرارداد"
                className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15 disabled:opacity-60"
              >
                <option value="">{projectId ? `انتخاب قرارداد ${contractKind === "main" ? "اصلی" : "فرعی"}` : "ابتدا پروژه را انتخاب کنید"}</option>
                {visibleProjectContractOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {toFaDigits(item.no)}
                    {item.documentType === "sub" && item.parentNo ? ` - اصلی: ${toFaDigits(item.parentNo)}` : ""}
                    {item.subject ? ` - ${item.subject}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {canShowWorksheet ? (
            <>
          <div className="-mb-4 flex items-start gap-2">
            <div className={tabStripCls} role="tablist" aria-label="بخش‌های کاربرگ مالی">
              {worksheetTabs.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  onClick={() => setTab(item.id)}
                  className={topTabBtnClass(tab === item.id, index, worksheetTabs.length)}
                >
                  {item.label}
                </button>
              ))}
            </div>
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
              {tab === "receipts" ? (
                <>
                  <div className="flex flex-wrap items-end gap-1">
                  {(receiptTypeRows || []).map((row, idx) => {
                    const showReceiptNumber = isStatementReceiptType(row.type);
                    return (
                    <div key={row.id} className="flex max-w-full items-end gap-1">
                      <div className="w-[min(280px,calc(100vw-64px))]">
                        <label className="text-xs text-neutral-600 dark:text-white/60">{receiptUi.basis}</label>
                        {isOtherReceiptType(row.type) ? (
                          <div className="mt-1 flex h-11 w-full items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-neutral-900 dark:border-white/15 dark:bg-white/5 dark:text-white">
                            <input
                              value={row.otherDescription}
                              onChange={(e) => updateReceiptTypeRow(row.id, { otherDescription: e.target.value })}
                              className="min-w-0 flex-1 bg-transparent outline-none"
                              type="text"
                              placeholder={receiptUi.basisOther}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => updateReceiptTypeRow(row.id, { type: "", otherDescription: "" })}
                              className="h-7 shrink-0 rounded-lg border border-black/10 px-2 text-xs text-neutral-600 hover:bg-black/[0.04] dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10"
                              title="انتخاب مجدد"
                            >
                              انتخاب
                            </button>
                          </div>
                        ) : (
                          <select
                            value={row.type}
                            onChange={(e) => {
                              const nextType = e.target.value;
                              updateReceiptTypeRow(row.id, {
                                type: nextType,
                                ...(!isStatementReceiptType(nextType) ? { number: "" } : {}),
                                ...(!isOtherReceiptType(nextType) ? { otherDescription: "" } : {}),
                              });
                            }}
                            className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15"
                          >
                            <option value="">{receiptUi.basisSelect}</option>
                            {receiptTypeOptions.map((op) => (
                              <option key={op.value} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {showReceiptNumber ? (
                        <div className="w-[min(180px,calc(100vw-64px))]">
                          <label className="text-xs text-neutral-600 dark:text-white/60">شماره</label>
                          <input
                            value={row.number}
                            onChange={(e) => updateReceiptTypeRow(row.id, { number: e.target.value })}
                            className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15"
                            type="text"
                            inputMode="numeric"
                            placeholder="شماره صورت وضعیت"
                          />
                        </div>
                      ) : null}

                      {idx > 0 ? (
                        <div className="flex">
                          <button type="button" onClick={() => removeReceiptTypeRow(row.id)} className="grid h-11 w-11 place-items-center rounded-xl border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500/50 dark:text-red-400 dark:hover:bg-red-500/10" aria-label="حذف این ردیف" title="حذف">
                            <span className="text-xl leading-none">−</span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                    );
                  })}
                  <button type="button" onClick={addReceiptTypeRow} className="grid h-11 w-11 place-items-center rounded-xl border border-black/15 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10" aria-label={`افزودن ${receiptUi.basis}`} title="افزودن">
                    <img src="/images/icons/afzodan.svg" alt="" className="h-4 w-4 dark:invert" />
                  </button>
                  </div>

                </>
              ) : (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(145px,.9fr)_minmax(110px,.55fr)_minmax(270px,1.5fr)_minmax(195px,.85fr)_minmax(135px,.65fr)] lg:items-start">
                  <div>
                    <label className="text-xs text-neutral-600 dark:text-white/60">شماره صورت وضعیت</label>
                    <input
                      value={statementNo}
                      onChange={(e) => setStatementNo(e.target.value)}
                      className="mt-1 w-full h-10 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15"
                      type="text"
                      placeholder="شماره صورت وضعیت"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-600 dark:text-white/60">تاریخ</label>
                    <div className="mt-1">
                      <JalaliPopupDatePicker value={jalaliDate} onChange={setJalaliDate} />
                    </div>
                    <div className="mt-2 text-xs text-black/55 dark:text-neutral-400">
                      میلادی: <span className="font-semibold text-black dark:text-neutral-100">{gregorianDate || "انتخاب نشده"}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-neutral-600 dark:text-white/60">عنوان صورت وضعیت دوره عملکرد</label>
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1 w-full h-10 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15"
                      type="text"
                      placeholder="عنوان صورت وضعیت..."
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-600 dark:text-white/60">مبلغ ناخالص تایید شده</label>
                    <div className="relative mt-1 min-w-0">
                      <input
                        dir="ltr"
                        inputMode="decimal"
                        value={grossAmount}
                        onChange={(e) => setGrossAmount(formatAmountInput(e.target.value))}
                        className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 pl-[72px] text-sm text-neutral-900 outline-none transition focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-white"
                        placeholder="۰"
                      />
                      <select
                        aria-label="ارز مبلغ ناخالص تایید شده"
                        title="انتخاب ارز"
                        value={currencyId}
                        onChange={(e) => setCurrencyId(e.target.value)}
                        className="absolute left-1 top-1 h-8 !w-[64px] cursor-pointer appearance-auto rounded-lg border border-neutral-200 bg-neutral-100 px-1 text-center text-xs font-semibold text-neutral-700 shadow-sm outline-none transition hover:bg-neutral-200 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/10 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/[.15] dark:focus:border-white/30 dark:focus:ring-white/10"
                      >
                        <option value="" className="bg-white text-neutral-900">ریال</option>
                        {(currencyItems || []).filter((it) => !isRialCurrencyItem(it)).map((it) => {
                          const id = readItemId(it);
                          if (!id) return null;
                          return <option key={id} value={id} className="bg-white text-neutral-900">{readItemLabel(it) || id}</option>;
                        })}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-neutral-600 dark:text-white/60">منشا</label>
                    <select value={currencySourceId} onChange={(e) => setCurrencySourceId(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-neutral-900 outline-none dark:border-white/15 dark:bg-white/5 dark:text-white">
                      <option value="">انتخاب منشا</option>
                      {(currencySourceItems || []).map((it) => {
                        const id = readItemId(it);
                        if (!id) return null;
                        return <option key={id} value={id}>{readItemLabel(it) || id}</option>;
                      })}
                    </select>
                  </div>
                </div>
              )}

              {tab === "receipts" ? (
                <>
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(100px,.385fr)_minmax(125px,.48fr)_minmax(90px,.315fr)_minmax(240px,1fr)] xl:justify-start xl:items-start">
                    <div>
                      <label className="text-xs text-neutral-600 dark:text-white/60">{receiptUi.date}</label>
                      <div className="mt-1">
                        <JalaliPopupDatePicker value={receiptJalaliDate} onChange={setReceiptJalaliDate} />
                      </div>
                      <div className="mt-2 text-xs text-black/55 dark:text-neutral-400">
                        میلادی: <span className="font-semibold text-black dark:text-neutral-100">{receiptGregorianDate || "انتخاب نشده"}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-600 dark:text-white/60">{receiptUi.amount}</label>
                      <div className="relative mt-1 min-w-0">
                        <input
                          value={receiptReceivedAmount}
                          onChange={(e) => setReceiptReceivedAmount(formatAmountInput(e.target.value))}
                          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 pl-[72px] text-sm text-neutral-900 outline-none transition focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-white"
                          type="text"
                          dir="ltr"
                          placeholder="۰"
                        />
                        <select
                          aria-label={`ارز ${receiptUi.amount}`}
                          title="انتخاب ارز"
                          value={receiptCurrencyId}
                          onChange={(e) => setReceiptCurrencyId(e.target.value)}
                          className="absolute left-1 top-1 h-8 !w-[64px] cursor-pointer appearance-auto rounded-lg border border-neutral-200 bg-neutral-100 px-1 text-center text-xs font-semibold text-neutral-700 shadow-sm outline-none transition hover:bg-neutral-200 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/10 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/[.15] dark:focus:border-white/30 dark:focus:ring-white/10"
                        >
                          <option value="" className="bg-white text-neutral-900">ریال</option>
                          {(currencyItems || []).filter((it) => !isRialCurrencyItem(it)).map((it) => {
                            const id = readItemId(it);
                            if (!id) return null;
                            return <option key={id} value={id} className="bg-white text-neutral-900">{readItemLabel(it) || id}</option>;
                          })}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-neutral-600 dark:text-white/60">منشا</label>
                      <select value={receiptCurrencySourceId} onChange={(e) => setReceiptCurrencySourceId(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-neutral-900 outline-none dark:border-white/15 dark:bg-white/5 dark:text-white">
                        <option value="">انتخاب منشا</option>
                        {(currencySourceItems || []).map((it) => {
                          const id = readItemId(it);
                          if (!id) return null;
                          return <option key={id} value={id}>{readItemLabel(it) || id}</option>;
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-600 dark:text-white/60">توضیحات</label>
                      <textarea
                        value={receiptDescription}
                        onChange={(e) => setReceiptDescription(e.target.value)}
                        className="mt-1 min-h-10 w-full resize-y rounded-xl border border-black/10 bg-white px-3 py-2 leading-5 text-neutral-900 outline-none dark:border-white/15 dark:bg-white/5 dark:text-white"
                        placeholder="توضیحات..."
                      />
                    </div>
                  </div>

                  {isRialCurrency ? (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
                      <div className="xl:col-span-12">
                        <label className="text-xs text-neutral-600 dark:text-white/60">شرح</label>
                        <input
                          value={receiptRialDescription}
                          onChange={(e) => setReceiptRialDescription(e.target.value)}
                          className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15"
                          type="text"
                          placeholder="شرح..."
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="flex justify-end border-t border-black/10 pt-3 dark:border-white/10">
                    <button
                      type="button"
                      onClick={handleSaveReceipt}
                      className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white transition hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                      aria-label="تایید و ثبت"
                      title="تایید و ثبت"
                    >
                      <img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" />
                    </button>
                  </div>
                </>
              ) : (
                <>
              <div className="rounded-2xl border border-black/10 bg-black/[0.025] p-3 space-y-3 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="text-sm font-semibold text-neutral-800 dark:text-white/85">کسور</div>
                <div className="grid grid-cols-1 gap-3 items-start md:grid-cols-3">
                  <div>
                    <label className="text-xs text-neutral-600 dark:text-white/60">استهلاک پیش پرداخت</label>
                    <AmountInputWithMeta
                      value={prepaymentDepreciation}
                      onChange={(e) => setPrepaymentDepreciation(formatAmountInput(e.target.value))}
                      metaLabel={selectedCurrencyMetaLabel}
                    />
                    <div className="mt-1 h-4 text-[11px] text-transparent">.</div>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-600 dark:text-white/60">سپرده بیمه</label>
                    <AmountInputWithMeta
                      value={formatComputedAmount(insuranceDepositNumber)}
                      readOnly
                      metaLabel={selectedCurrencyMetaLabel}
                    />
                    <div className="mt-1 h-4 text-[11px] text-black/50 dark:text-neutral-400">
                      درصد قرارداد: {toFaDigits(insuranceDepositPercent || 0)}%
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-600 dark:text-white/60">سپرده حسن انجام کار</label>
                    <AmountInputWithMeta
                      value={formatComputedAmount(performanceDepositNumber)}
                      readOnly
                      metaLabel={selectedCurrencyMetaLabel}
                    />
                    <div className="mt-1 h-4 text-[11px] text-black/50 dark:text-neutral-400">
                      درصد قرارداد: {toFaDigits(performanceDepositPercent || 0)}%
                    </div>
                  </div>
                </div>

                {(otherDebts || []).map((row, idx) => (
                  <div key={row.id} className="grid grid-cols-1 xl:grid-cols-[minmax(280px,420px)_minmax(260px,1fr)_auto] gap-3 items-end">
                    <div>
                      <label className="text-xs text-neutral-600 dark:text-white/60">سایر کسور</label>
                      <AmountInputWithMeta
                        value={row.amount}
                        onChange={(e) => updateOtherDebtRow(row.id, { amount: formatAmountInput(e.target.value) })}
                        metaLabel={selectedCurrencyMetaLabel}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-neutral-600 dark:text-white/60">شرح</label>
                      <input value={row.description} onChange={(e) => updateOtherDebtRow(row.id, { description: e.target.value })} className="mt-1 w-full h-10 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15" type="text" placeholder="شرح..." />
                    </div>

                    <div className="flex xl:justify-end gap-2">
                      {idx === 0 ? (
                        <button type="button" onClick={addOtherDebtRow} className="h-10 w-10 rounded-xl border border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10 grid place-items-center" aria-label="افزودن ردیف سایر کسور" title="افزودن">
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
              </div>

              <div className="grid grid-cols-1 gap-3 px-3 xl:grid-cols-[minmax(165px,.9fr)_auto_minmax(145px,.75fr)_minmax(130px,.7fr)_auto] xl:items-end">
                <div>
                  <label className="text-xs text-neutral-600 dark:text-white/60">جمع خالص تایید شده بدون VAT</label>
                  <AmountInputWithMeta value={formatComputedAmount(netWithoutVatNumber)} readOnly metaLabel={selectedCurrencyMetaLabel} />
                </div>
                <div>
                  <label className="text-xs text-neutral-600 dark:text-white/60">VAT</label>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {renderVatOption("has", "دارد")}
                    {renderVatOption("none", "ندارد")}
                    {vatStatus === "has" ? (
                      <div className="flex h-10 items-center gap-1 rounded-xl border border-black/10 bg-white px-2.5 dark:border-white/15 dark:bg-white/5">
                        <input
                          value={vatPercent}
                          onChange={(e) => setVatPercent(formatAmountInput(e.target.value))}
                          className="w-14 bg-transparent text-center text-xs font-semibold outline-none text-neutral-900 dark:text-white"
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          placeholder="0"
                        />
                        <span className="text-xs font-semibold text-neutral-600 dark:text-white/70">%</span>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-neutral-600 dark:text-white/60">مبلغ VAT</label>
                  <AmountInputWithMeta value={formatComputedAmount(vatAmountNumber)} readOnly metaLabel={selectedCurrencyMetaLabel} />
                </div>
                <div>
                  <label className="text-xs text-neutral-600 dark:text-white/60">جمع خالص تایید شده با احتساب VAT</label>
                  <AmountInputWithMeta value={formatComputedAmount(netWithVatNumber)} readOnly metaLabel={selectedCurrencyMetaLabel} />
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={openUploadModal} className="relative grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white text-neutral-900 transition hover:bg-black/[0.02] dark:border-white/15 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10" title="بارگذاری اسناد" aria-label="بارگذاری اسناد">
                      <img src="/images/icons/upload.svg" alt="" className="w-5 h-5 dark:invert" />
                      {uploadedFiles.length ? <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[10px] text-white dark:bg-white dark:text-black">{toFaDigits(uploadedFiles.length)}</span> : null}
                    </button>
                    <button type="button" onClick={openRelatedDocumentsModal} className="relative grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white text-neutral-900 transition hover:bg-black/[0.02] dark:border-white/15 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10" title="اسناد مرتبط" aria-label="اسناد مرتبط">
                      <img src="/images/icons/asnad-mortabet.svg" alt="" className="w-5 h-5 dark:invert" />
                      {relatedLetterIds.length ? <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[10px] text-white dark:bg-white dark:text-black">{toFaDigits(relatedLetterIds.length)}</span> : null}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end border-t border-black/10 pt-3 dark:border-white/10">
                <button
                  type="button"
                  onClick={handleSaveStatement}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white transition hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                  aria-label="تایید و ثبت"
                  title="تایید و ثبت"
                >
                  <img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" />
                </button>
              </div>
              {selectedRelatedLetters.length || uploadedFiles.length ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-black/55 dark:text-white/60">
                  {selectedRelatedLetters.map((letter) => (
                    <span key={String(letterIdOf(letter))} className="max-w-[240px] truncate rounded-lg bg-black/[0.05] px-2 py-1 dark:bg-white/10">
                      {toFaDigits(secretariatNoOf(letter) || letterNoOf(letter) || letterIdOf(letter))}
                      {subjectOf(letter) ? ` - ${subjectOf(letter)}` : ""}
                    </span>
                  ))}
                  {uploadedFiles.map((file, index) => (
                    file?.url ? (
                      <a key={`${file?.id || file?.url}_${index}`} href={file.url} target="_blank" rel="noreferrer" className="max-w-[220px] truncate rounded-lg bg-black/[0.05] px-2 py-1 hover:bg-black/[0.1] dark:bg-white/10 dark:hover:bg-white/15">
                        {file?.name || `فایل ${toFaDigits(index + 1)}`}
                      </a>
                    ) : (
                      <span key={`${file?.name || "file"}_${index}`} className="max-w-[220px] truncate rounded-lg bg-black/[0.05] px-2 py-1 dark:bg-white/10">
                        {file?.name || `فایل ${toFaDigits(index + 1)}`}
                      </span>
                    )
                  ))}
                </div>
              ) : null}
                </>
              )}
            </div>
          )}

          <div className="!mt-0">
          <TableWrap>
            <div className={tablePreset.outer}>
              <div className={tablePreset.innerPad}>
                <div className={tablePreset.frame + " shadow-sm"}>
                  <div className="max-h-[55vh] overflow-x-auto overflow-y-auto">
                    <table className={tablePreset.table + " table-fixed text-[13px] [&_th]:!py-2 [&_td]:!py-0"} dir="rtl">
                      <THead>
                        {tab === "receipts" ? (
                          <tr className={tablePreset.headRow + " sticky top-0 z-10"}>
                            <TH className={`w-10 ${tablePreset.th}`}><input ref={selectAllRef} type="checkbox" className="h-4 w-4 accent-black dark:accent-neutral-200" checked={allVisibleSelected} onChange={toggleSelectAll} aria-label="انتخاب همه" /></TH>
                            <TH className={`w-5 ${tablePreset.th}`} aria-label="خوانده‌نشده" />
                            <TH className={`w-14 ${tablePreset.th}`}>#</TH>
                            <TH className={`w-36 ${tablePreset.th}`}>{receiptUi.date}</TH>
                            <TH className={`w-44 ${tablePreset.th}`}>{receiptUi.amount}</TH>
                            <TH className={`relative w-44 !pl-10 ${tablePreset.th}`}>{receiptUi.foreignAmount}<WorksheetReadingMenu selectedCount={selectedIds.size} canEdit={selectedIds.size === 1} deleting={deletingSelected} onEdit={editSelectedRow} onDelete={deleteSelectedRows} /></TH>
                          </tr>
                        ) : (
                          <tr className={tablePreset.headRow + " sticky top-0 z-10"}>
                            <TH className={`w-10 ${tablePreset.th}`}><input ref={selectAllRef} type="checkbox" className="h-4 w-4 accent-black dark:accent-neutral-200" checked={allVisibleSelected} onChange={toggleSelectAll} aria-label="انتخاب همه" /></TH>
                            <TH className={`w-5 ${tablePreset.th}`} aria-label="خوانده‌نشده" />
                            <TH className={`w-14 ${tablePreset.th}`}>#</TH>
                            <TH className={`w-32 ${tablePreset.th}`}>شماره صورت وضعیت</TH>
                            <TH className={`w-32 ${tablePreset.th}`}>تاریخ</TH>
                            <TH className={`w-40 ${tablePreset.th}`}>مبلغ ناخالص</TH>
                            <TH className={`w-32 ${tablePreset.th}`}>VAT</TH>
                            <TH className={`relative w-32 !pl-10 ${tablePreset.th}`}>ارز منشا<WorksheetReadingMenu selectedCount={selectedIds.size} canEdit={selectedIds.size === 1} deleting={deletingSelected} onEdit={editSelectedRow} onDelete={deleteSelectedRows} /></TH>
                          </tr>
                        )}
                      </THead>

                      <tbody className={`${tablePreset.body} [&_tr]:h-9 [&_td]:!py-0`}>
                        {tab === "receipts" ? (
                          rowsLoading ? (
                            <TR><TD colSpan={6} className={tablePreset.emptyRow}>در حال بارگذاری...</TD></TR>
                          ) : !pageRows.length ? (
                            <TR><TD colSpan={6} className={tablePreset.emptyRow}>موردی برای نمایش وجود ندارد.</TD></TR>
                          ) : (
                            <>
                              <TR className="text-center bg-black/[0.04] font-semibold dark:bg-white/10">
                                <TD /><TD />
                                <TD>-</TD>
                                <TD>جمع</TD>
                                <TD>{toFaDigits(formatMoney(sumReceiptAmount))}</TD>
                                <TD>{toFaDigits(formatMoney(sumReceiptForeignAmount))}</TD>
                              </TR>
                              {pageRows.map((row, idx) => (
                                <TR key={row.id} className={`text-center transition-colors hover:bg-black/[0.06] dark:hover:bg-white/15 ${selectedIds.has(String(row.id)) ? "!bg-black/[0.08] dark:!bg-white/15" : ""}`}>
                                  <TD><input type="checkbox" className="h-4 w-4 accent-black dark:accent-neutral-200" checked={selectedIds.has(String(row.id))} onChange={() => toggleSelected(row.id)} aria-label="انتخاب" /></TD>
                                  <TD>{unreadIds.has(String(row.id)) && <span className="mx-auto block h-2 w-2 rounded-full bg-sky-500 ring-2 ring-sky-100 dark:ring-sky-500/25" title="خوانده‌نشده" />}</TD>
                                  <TD>{toFaDigits(startIndex + idx + 1)}</TD>
                                  <TD>{row.date ? toFaDigits(row.date) : "—"}</TD>
                                  <TD>{toFaDigits(formatMoney(row.receiptAmount || 0))}</TD>
                                  <TD>{toFaDigits(formatMoney(row.receiptForeignAmount || 0))}</TD>
                                </TR>
                              ))}
                            </>
                          )
                        ) : rowsLoading ? (
                          <TR><TD colSpan={8} className={tablePreset.emptyRow}>در حال بارگذاری...</TD></TR>
                        ) : !pageRows.length ? (
                          <TR><TD colSpan={8} className={tablePreset.emptyRow}>موردی برای نمایش وجود ندارد.</TD></TR>
                        ) : (
                          <>
                            <TR className="text-center bg-black/[0.04] font-semibold dark:bg-white/10">
                              <TD /><TD />
                              <TD>-</TD><TD>-</TD><TD>جمع</TD>
                              <TD>{toFaDigits(formatMoney(sumGross))}</TD>
                              <TD>{toFaDigits(formatMoney(sumVat))}</TD>
                              <TD>—</TD>
                            </TR>
                            {pageRows.map((row, idx) => (
                              <TR key={row.id} className={`text-center transition-colors hover:bg-black/[0.06] dark:hover:bg-white/15 ${selectedIds.has(String(row.id)) ? "!bg-black/[0.08] dark:!bg-white/15" : ""}`}>
                                <TD><input type="checkbox" className="h-4 w-4 accent-black dark:accent-neutral-200" checked={selectedIds.has(String(row.id))} onChange={() => toggleSelected(row.id)} aria-label="انتخاب" /></TD>
                                <TD>{unreadIds.has(String(row.id)) && <span className="mx-auto block h-2 w-2 rounded-full bg-sky-500 ring-2 ring-sky-100 dark:ring-sky-500/25" title="خوانده‌نشده" />}</TD>
                                <TD>{toFaDigits(startIndex + idx + 1)}</TD>
                                <TD>{row.number ? toFaDigits(row.number) : "—"}</TD>
                                <TD>{row.date ? toFaDigits(row.date) : "—"}</TD>
                                <TD>{toFaDigits(formatMoney(row.grossAmount || 0))}</TD>
                                <TD>{toFaDigits(formatMoney(row.vatAmount || 0))}</TD>
                                <TD>{row.currencySourceLabel || "—"}</TD>
                              </TR>
                            ))}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-neutral-300 px-2.5 py-2.5 dark:border-neutral-800 sm:px-3">
                    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                      <div className="flex items-center justify-between gap-2 text-sm md:justify-start">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setPage((old) => Math.max(0, old - 1))} disabled={safePage <= 0} className="inline-grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white transition hover:bg-black/[0.04] disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" aria-label="صفحه قبل">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 18l6-6-6-6" /></svg>
                          </button>
                          <button type="button" onClick={() => setPage((old) => Math.min(pageCount - 1, old + 1))} disabled={safePage >= pageCount - 1} className="inline-grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white transition hover:bg-black/[0.04] disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" aria-label="صفحه بعد">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 18l-6-6 6-6" /></svg>
                          </button>
                        </div>
                        <div className="whitespace-nowrap text-black/70 dark:text-neutral-400">{totalRows === 0 ? "۰ از ۰" : `${toFaDigits(startIndex + 1)}–${toFaDigits(endIndex)} از ${toFaDigits(totalRows)}`}</div>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs sm:text-sm md:justify-start">
                        <span className="text-black/70 dark:text-neutral-400">تعداد در هر صفحه:</span>
                        <div className="inline-flex h-9 overflow-hidden rounded-lg border border-black/10 bg-white dark:border-white/15 dark:bg-white/5">
                          {[10, 25, 100].map((count) => (
                            <button key={count} type="button" onClick={() => { setRowsPerPage(count); setPage(0); }} className={`min-w-10 px-2.5 text-sm font-semibold transition sm:px-3 ${rowsPerPage === count ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-700 hover:bg-black/[0.04] dark:text-white/75 dark:hover:bg-white/10"}`}>{toFaDigits(count)}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TableWrap>
          </div>
            </>
          ) : null}

          {err ? <div className="text-sm text-red-600 dark:text-red-400">{err}</div> : null}
        </div>
        </div>
      </Card>

      {relatedDocumentsOpen && (
        <RelatedLettersPickerModal
          api={api}
          items={letters}
          loading={lettersLoading}
          query={uploadLetterQuery}
          onQueryChange={setUploadLetterQuery}
          selectedIds={uploadDraftLetterIds}
          onToggle={toggleUploadDraftLetter}
          onClose={() => setRelatedDocumentsOpen(false)}
          onConfirm={() => {
            setRelatedLetterIds(uploadDraftLetterIds);
            setRelatedDocumentsOpen(false);
          }}
        />
      )}

      {uploadOpen && (
        <DocumentUploadModal
          title="بارگذاری اسناد"
          files={(Array.isArray(uploadedFiles) ? uploadedFiles : []).map((file, index) => ({
            id: `worksheet-file-${index}`,
            name: file?.name,
            size: file?.size,
          }))}
          fileRef={uploadInputRef}
          uploading={filesUploading}
          onUpload={uploadWorksheetFiles}
          onRemove={(id) => {
            setUploadedFiles((previous) => {
              const items = Array.isArray(previous) ? previous : [];
              return items.filter((_, index) => `worksheet-file-${index}` !== id);
            });
          }}
          onClose={() => setUploadOpen(false)}
        />
      )}

      {false && uploadOpen &&
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

                <div className="max-h-[78vh] overflow-y-auto p-4 space-y-4">
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

                  <div className="mt-4 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFiles(uploadDraftFiles);
                        setUploadOpen(false);
                      }}
                      className={confirmActionBtnCls}
                      aria-label="تایید"
                      title="تایید"
                    >
                      <img src="/images/icons/check.svg" alt="" className={confirmActionIconCls} />
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
