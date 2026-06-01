import React from "react";
import { createPortal } from "react-dom";
import Card from "../components/ui/Card.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";
import { baseCurrenciesTablePreset as financialTablePreset, hoverSelectableRowPreset } from "../components/ui/tablePresets.js";
import { dayjs, isJalaliYmd } from "../utils/date";

const CONTRACT_DOCUMENT_TYPES = [
  { id: "main", label: "اصلی" },
  { id: "sub", label: "فرعی" },
  { id: "appendix", label: "الحاقیه" },
];

const CONTRACT_SECTION_TABS = [
  { id: "general", label: "عمومی" },
  { id: "calendar", label: "تقویم قرارداد" },
  { id: "technical", label: "فنی و محدوده کار" },
  { id: "financial", label: "مالی و تضامین" },
  { id: "insurance", label: "تامین اجتماعی" },
];

const GENERAL_CONTRACT_TYPES = [
  "مشاوره و مهندسی",
  "خرید کالا",
  "خرید خدمات",
  "اجرا و پیمانکاری",
  "اجاره ماشین آلات و تجهیزات",
  "مدیریت پیمان",
  "سایر",
];

const FIXED_SUB_ASSIGNOR = "شرکت ایده پویان انرژی IPEC";

const TECHNICAL_SUPPORT_FIELDS = [
  { key: "fuel", label: "سوخت" },
  { key: "powerLighting", label: "برق و روشنایی" },
  { key: "accommodation", label: "اسکان" },
  { key: "food", label: "خوراک" },
  { key: "transport", label: "حمل" },
  { key: "loadingCrane", label: "بارگیری و جرثقیل" },
  { key: "procurement", label: "تامین کالا" },
  { key: "customsClearance", label: "ترخیص کالا از گمرک" },
];

const EMPTY_FINANCIAL_ROW = {
  id: "",
  amount: "",
  currencyId: "",
  currencyLabel: "",
  sourceId: "",
  sourceLabel: "",
};

const GUARANTEE_NAME_OPTIONS = ["پیش پرداخت", "انجام تعهدات", "علی الحساب", "سایر"];

const EMPTY_GUARANTEE_ROW = {
  id: "",
  name: "",
  customName: false,
  type: "",
  bankNo: "",
  amount: "",
  currencyId: "",
  currencyLabel: "",
};

const SOCIAL_INSURANCE_CLEARANCE_STATUS = "مفاصا حساب";

const SOCIAL_INSURANCE_STATUS_OPTIONS = [
  "قرارداد درحال انجام است",
  "در انتظار نتیجه رسیدگی شعبه به نام مبانی محاسباتی",
  "اعتراض ثبت شده در انتظار جلسه هیات",
  "در انتظار جلسه رای هیات",
  "درحال صدور مفاصا حساب",
  SOCIAL_INSURANCE_CLEARANCE_STATUS,
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

const EMPTY_FORM = {
  id: "",
  projectId: "",
  documentType: "main",
  contractNo: "",
  parentContractId: "",
  relatedLetterId: "",
  general: {
    contractType: "",
    customContractType: false,
    contractSubject: "",
    mainEmployer: "",
    employerAssignor: "",
    executor: "",
    companyMembers: "",
    mainContractors: "",
  },
  calendar: {
    notifyDate: "",
    notifyLetterId: "",
    startDate: "",
    endDate: "",
    extraDates: [],
  },
  technical: {
    serviceScope: "",
    tagIds: [],
    duties: "",
    fuel: "",
    powerLighting: "",
    accommodation: "",
    food: "",
    transport: "",
    loadingCrane: "",
    procurement: "",
    customsClearance: "",
  },
  financial: {
    contractAmounts: [],
    appendices: [],
    paymentTerms: "",
    advancePayment: "",
    capitalDeposit: "",
    capitalDepositAmount: "",
    performanceBond: "",
    performanceBondAmount: "",
    breakdownFiles: [],
    guaranteeDraft: { ...EMPTY_GUARANTEE_ROW },
    guarantees: [],
  },
  insurance: {
    contractRow: "",
    branchStatus: "",
    finalGrossPerformance: "",
    clearanceAmount: "",
    clearanceFiles: [],
    relatedLetterId: "",
    lastStatus: "",
  },
};

function toFaDigits(value) {
  return String(value ?? "").replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function toEnDigits(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)])
    .replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)]);
}

function pad2(value) {
  const n = Number(value) || 0;
  return n < 10 ? `0${n}` : String(n);
}

function normalizeJalaliYmd(value) {
  const raw = toEnDigits(value).trim().replace(/\//g, "-");
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function pickFirst(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.projects)) return payload.projects;
  if (Array.isArray(payload?.letters)) return payload.letters;
  return [];
}

function normalizeIdList(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    )
  );
}

function readBooleanFlag(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value).trim().toLowerCase();
  if (["false", "0", "no", "off", "inactive", "غیرفعال"].includes(text)) return false;
  if (["true", "1", "yes", "on", "active", "فعال"].includes(text)) return true;
  return fallback;
}

function isTopProjectCode(code) {
  return /^\d{3}$/.test(toEnDigits(code).trim());
}

function readItemId(item) {
  return String(item?.id ?? item?.code ?? item?.value ?? item?.currency_id ?? item?.source_id ?? item?.key ?? "").trim();
}

function readItemLabel(item) {
  return String(item?.label ?? item?.title ?? item?.name ?? item?.code ?? "").trim();
}

function listFromPayload(payload, key) {
  const list = payload?.items || payload?.data || payload?.[key] || payload;
  return Array.isArray(list) ? list : [];
}

function formatBytes(bytes) {
  const number = Number(bytes || 0);
  if (!number) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = number;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${Math.round(value * 10) / 10} ${units[index]}`;
}

function makeFinancialRow() {
  return {
    ...EMPTY_FINANCIAL_ROW,
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
  };
}

function makeGuaranteeRow(row = {}) {
  return {
    ...EMPTY_GUARANTEE_ROW,
    ...row,
    id: String(row?.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`),
    name: String(row?.name ?? ""),
    customName: Boolean(row?.customName),
    type: String(row?.type ?? ""),
    bankNo: String(row?.bankNo ?? row?.bank_no ?? ""),
    amount: String(row?.amount ?? ""),
    currencyId: String(row?.currencyId ?? row?.currency_id ?? ""),
    currencyLabel: String(row?.currencyLabel ?? row?.currency_label ?? ""),
  };
}

function normalizeFinancialRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list.length
    ? list.map((row) => ({
        ...EMPTY_FINANCIAL_ROW,
        ...row,
        id: String(row?.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`),
        amount: String(row?.amount ?? ""),
        currencyId: String(row?.currencyId ?? row?.currency_id ?? ""),
        currencyLabel: String(row?.currencyLabel ?? row?.currency_label ?? ""),
        sourceId: String(row?.sourceId ?? row?.currencySourceId ?? row?.source_id ?? row?.currency_source_id ?? ""),
        sourceLabel: String(row?.sourceLabel ?? row?.currencySourceLabel ?? row?.source_label ?? row?.currency_source_label ?? ""),
      }))
    : [makeFinancialRow()];
}

function normalizeFinancial(financial = {}) {
  return {
    ...(financial || {}),
    contractAmounts: normalizeFinancialRows(financial?.contractAmounts),
    appendices: normalizeFinancialRows(financial?.appendices),
    paymentTerms: String(financial?.paymentTerms ?? ""),
    advancePayment: String(financial?.advancePayment ?? ""),
    capitalDeposit: String(financial?.capitalDeposit ?? ""),
    capitalDepositAmount: String(financial?.capitalDepositAmount ?? ""),
    performanceBond: String(financial?.performanceBond ?? ""),
    performanceBondAmount: String(financial?.performanceBondAmount ?? ""),
    breakdownFiles: Array.isArray(financial?.breakdownFiles) ? financial.breakdownFiles : [],
    guaranteeDraft: makeGuaranteeRow({ ...(financial?.guaranteeDraft || {}), id: "" }),
    guarantees: Array.isArray(financial?.guarantees) ? financial.guarantees.map(makeGuaranteeRow) : [],
  };
}

function normalizeInsurance(insurance = {}) {
  return {
    ...(EMPTY_FORM.insurance || {}),
    ...(insurance || {}),
    contractRow: String(insurance?.contractRow ?? insurance?.contract_row ?? ""),
    branchStatus: String(insurance?.branchStatus ?? insurance?.branch_status ?? ""),
    finalGrossPerformance: String(insurance?.finalGrossPerformance ?? insurance?.final_gross_performance ?? ""),
    clearanceAmount: String(insurance?.clearanceAmount ?? insurance?.clearance_amount ?? ""),
    clearanceFiles: Array.isArray(insurance?.clearanceFiles) ? insurance.clearanceFiles : [],
    relatedLetterId: String(insurance?.relatedLetterId ?? insurance?.related_letter_id ?? ""),
    lastStatus: String(insurance?.lastStatus ?? insurance?.last_status ?? ""),
  };
}

function parseFinancialAmount(value) {
  const normalized = toEnDigits(value)
    .replace(/[٬,،\s]/g, "")
    .replace(/٫/g, ".")
    .replace(/[−–—]/g, "-")
    .trim();
  const number = Number.parseFloat(normalized);
  return Number.isFinite(number) ? number : 0;
}

function formatFinancialAmount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return toFaDigits(0);
  return toFaDigits(
    new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 4,
    }).format(number)
  );
}

function formatAmountInput(value) {
  const text = toEnDigits(value)
    .replace(/[٬,،\s]/g, "")
    .replace(/٫/g, ".")
    .replace(/[^\d.-]/g, "");
  if (!text || text === "-" || text === "." || text === "-.") return text;
  const sign = text.startsWith("-") ? "-" : "";
  const unsigned = sign ? text.slice(1) : text;
  const [intPart, decimalPart] = unsigned.split(".");
  const formattedInt = intPart ? new Intl.NumberFormat("en-US").format(Number(intPart) || 0) : "0";
  return `${sign}${formattedInt}${decimalPart !== undefined ? `.${decimalPart}` : ""}`;
}

function cleanFinancialAmountInput(value) {
  return toEnDigits(value).replace(/[^\d.,٫٬\s\-−–—]/g, "");
}

function CALCULATE_FINANCIAL_TOTALS(financial = {}) {
  const rows = [...(Array.isArray(financial?.contractAmounts) ? financial.contractAmounts : []), ...(Array.isArray(financial?.appendices) ? financial.appendices : [])];
  const byCurrency = new Map();

  rows.forEach((row) => {
    const currencyId = String(row?.currencyId || "").trim();
    const currencyLabel = String(row?.currencyLabel || "").trim();
    const sourceId = String(row?.sourceId || "").trim();
    const sourceLabel = String(row?.sourceLabel || "").trim();
    if (!currencyId && !currencyLabel) return;

    const key = currencyId || currencyLabel;
    const current = byCurrency.get(key) || {
      key,
      amount: 0,
      currencyId,
      currencyLabel: currencyLabel || currencyId,
      sources: new Map(),
    };
    current.amount += parseFinancialAmount(row?.amount);
    if (sourceId || sourceLabel) current.sources.set(sourceId || sourceLabel, sourceLabel || sourceId);
    byCurrency.set(key, current);
  });

  return Array.from(byCurrency.values()).map((item) => {
    const sourceLabels = Array.from(item.sources.values()).filter(Boolean);
    return {
      ...item,
      sourceLabel: sourceLabels.length > 1 ? "چند منشأ" : sourceLabels[0] || "",
    };
  });
}

function normalizeProject(project) {
  const id = project?.id == null ? "" : String(project.id);
  const code = toEnDigits(project?.code ?? "").trim();
  const name = pickFirst(project?.name, project?.title, project?.label);
  return {
    ...project,
    id,
    code,
    name,
    label: [code, name].filter(Boolean).join(" - ") || "بدون نام",
    isActive: readBooleanFlag(project?.isActive ?? project?.is_active ?? project?.active ?? project?.enabled, true),
  };
}

function compareProjects(a, b) {
  const ac = toEnDigits(a?.code || "").trim();
  const bc = toEnDigits(b?.code || "").trim();
  if (ac === "100" && bc !== "100") return -1;
  if (bc === "100" && ac !== "100") return 1;
  return String(ac || a?.name || "").localeCompare(String(bc || b?.name || ""), "fa", {
    numeric: true,
    sensitivity: "base",
  });
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

function tagLabelOf(tag) {
  return pickFirst(tag?.label, tag?.name, tag?.title, tag?.text, tag?.caption, tag?.id);
}

function documentTypeLabel(type) {
  return CONTRACT_DOCUMENT_TYPES.find((item) => item.id === type)?.label || "اصلی";
}

function contractNoForRow(row, rowById) {
  if (row?.documentType === "main") return row?.contractNo || "";
  const parent = rowById.get(String(row?.parentContractId || ""));
  return parent?.contractNo || row?.contractNo || "";
}

function countAppendices(row, rows) {
  if (!row) return 0;
  if (row.documentType === "appendix") return 1;
  const baseId = row.documentType === "main" ? row.id : row.parentContractId;
  return rows.filter((item) => item.documentType === "appendix" && String(item.parentContractId) === String(baseId)).length;
}

function jalaliToGregorianLabel(value) {
  const normalized = normalizeJalaliYmd(value);
  if (!isJalaliYmd(normalized)) return "";
  try {
    return dayjs(normalized, { jalali: true }).calendar("gregory").format("YYYY/MM/DD");
  } catch {
    return "";
  }
}

function daysBetweenJalali(startValue, endValue) {
  const normalizedStart = normalizeJalaliYmd(startValue);
  const normalizedEnd = normalizeJalaliYmd(endValue);
  if (!isJalaliYmd(normalizedStart) || !isJalaliYmd(normalizedEnd)) return 0;
  try {
    const start = dayjs(normalizedStart, { jalali: true }).calendar("gregory").startOf("day");
    const end = dayjs(normalizedEnd, { jalali: true }).calendar("gregory").startOf("day");
    const diff = end.diff(start, "day");
    return diff >= 0 ? diff + 1 : 0;
  } catch {
    return 0;
  }
}

function calculateCalendarDays(calendar = {}) {
  const startDate = calendar?.startDate || "";
  const endDate = calendar?.endDate || "";
  const baseDays = daysBetweenJalali(startDate, endDate);
  const extras = Array.isArray(calendar?.extraDates) ? calendar.extraDates : [];
  let previous = endDate;
  let extraDays = 0;

  extras.forEach((date) => {
    if (!previous || !date) {
      previous = date || previous;
      return;
    }
    const days = daysBetweenJalali(previous, date);
    if (days > 0) extraDays += Math.max(0, days - 1);
    previous = date;
  });

  return { baseDays, extraDays, totalDays: baseDays + extraDays };
}

function emptyForm() {
  return {
    ...EMPTY_FORM,
    general: { ...EMPTY_FORM.general },
    calendar: { ...EMPTY_FORM.calendar, extraDates: [] },
    technical: { ...EMPTY_FORM.technical, tagIds: [] },
    financial: normalizeFinancial(EMPTY_FORM.financial),
    insurance: normalizeInsurance(EMPTY_FORM.insurance),
  };
}

function normalizeContractRow(row) {
  const base = emptyForm();
  const item = row && typeof row === "object" ? row : {};
  const documentType = String(item.documentType ?? item.document_type ?? base.documentType ?? "main");
  return {
    ...base,
    ...item,
    id: String(item.id ?? ""),
    projectId: String(item.projectId ?? item.project_id ?? ""),
    documentType,
    contractNo: documentType === "main" ? String(item.contractNo ?? item.contract_no ?? "") : "",
    parentContractId: documentType === "main" ? "" : String(item.parentContractId ?? item.parent_contract_id ?? ""),
    relatedLetterId: String(item.relatedLetterId ?? item.related_letter_id ?? ""),
    general: { ...base.general, ...(item.general && typeof item.general === "object" ? item.general : {}) },
    calendar: {
      ...base.calendar,
      ...(item.calendar && typeof item.calendar === "object" ? item.calendar : {}),
      extraDates: Array.isArray(item.calendar?.extraDates) ? item.calendar.extraDates : [],
    },
    technical: {
      ...base.technical,
      ...(item.technical && typeof item.technical === "object" ? item.technical : {}),
      tagIds: normalizeIdList(item.technical?.tagIds ?? item.technical?.tag_ids),
    },
    financial: normalizeFinancial(item.financial || base.financial),
    insurance: normalizeInsurance({ ...base.insurance, ...(item.insurance && typeof item.insurance === "object" ? item.insurance : {}) }),
    lastSavedSection: String(item.lastSavedSection ?? item.last_saved_section ?? ""),
    createdAt: item.createdAt ?? item.created_at ?? "",
    updatedAt: item.updatedAt ?? item.updated_at ?? "",
  };
}

function fetchJson(path, opt = {}) {
  const base = (window.API_URL || "/api").replace(/\/+$/, "");
  return fetch(base + path, {
    credentials: "include",
    cache: "no-store",
    ...opt,
    headers: {
      "Content-Type": "application/json",
      ...(opt.headers || {}),
    },
  }).then(async (res) => {
    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    if (!res.ok) throw new Error(data?.error || data?.message || "request_failed");
    return data;
  });
}

function getCurrentJalaliParts() {
  const now = dayjs().calendar("jalali");
  return {
    year: Number(now.format("YYYY")),
    month: Number(now.format("M")),
    day: Number(now.format("D")),
  };
}

function getJalaliPartsFromValue(value) {
  const normalized = normalizeJalaliYmd(value);
  if (!normalized) return getCurrentJalaliParts();
  const parts = normalized.split("-").map((item) => Number(item));
  return {
    year: parts[0] || getCurrentJalaliParts().year,
    month: parts[1] || 1,
    day: parts[2] || 1,
  };
}

function ContractDatePicker({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef(null);
  const popRef = React.useRef(null);
  const [pos, setPos] = React.useState({ top: 0, right: 0 });
  const currentParts = React.useMemo(() => getCurrentJalaliParts(), []);
  const initialParts = React.useMemo(() => getJalaliPartsFromValue(value), [value]);
  const [year, setYear] = React.useState(initialParts.year);
  const [month, setMonth] = React.useState(initialParts.month);
  const [day, setDay] = React.useState(initialParts.day);

  React.useEffect(() => {
    const next = getJalaliPartsFromValue(value);
    setYear(next.year);
    setMonth(next.month);
    setDay(next.day);
  }, [value]);

  const daysInMonth = month <= 6 ? 31 : month <= 11 ? 30 : 29;
  const preview = `${year}-${pad2(month)}-${pad2(Math.min(day, daysInMonth))}`;
  const display = normalizeJalaliYmd(value).replace(/-/g, "/");

  const years = React.useMemo(() => {
    const list = [];
    for (let y = currentParts.year - 10; y <= currentParts.year + 10; y += 1) list.push(y);
    return list;
  }, [currentParts.year]);

  React.useEffect(() => {
    if (day > daysInMonth) setDay(daysInMonth);
  }, [day, daysInMonth]);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (event) => {
      const target = event.target;
      if (popRef.current?.contains(target) || btnRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const recalcPos = React.useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(420, window.innerWidth - margin * 2);
    const right = Math.max(margin, Math.min(window.innerWidth - rect.right, window.innerWidth - width - margin));
    let top = rect.bottom + margin;
    const pop = popRef.current;
    if (pop) {
      const height = pop.getBoundingClientRect().height || 0;
      if (top + height > window.innerHeight - margin) top = Math.max(margin, rect.top - height - margin);
    }
    setPos({ top, right });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    recalcPos();
    const raf = requestAnimationFrame(recalcPos);
    window.addEventListener("resize", recalcPos);
    document.addEventListener("scroll", recalcPos, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", recalcPos);
      document.removeEventListener("scroll", recalcPos, true);
    };
  }, [open, recalcPos]);

  const apply = () => {
    onChange(preview);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-right text-black outline-none transition hover:bg-black/[0.02] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
      >
        {display ? toFaDigits(display) : <span className="text-black/40 dark:text-neutral-400">انتخاب تاریخ</span>}
      </button>

      {open &&
        createPortal(
          <div
            ref={popRef}
            className="fixed z-[9999] w-[min(420px,calc(100vw-24px))] rounded-2xl border border-black/10 bg-white p-4 text-neutral-900 shadow-xl"
            style={{ top: pos.top, right: pos.right }}
            dir="rtl"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="font-semibold text-sm">انتخاب تاریخ</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 w-9 rounded-xl border border-black/10 flex items-center justify-center hover:bg-black/[0.04] transition"
                aria-label="بستن"
                title="بستن"
              >
                <img src="/images/icons/bastan.svg" alt="" className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="mb-1 text-xs text-neutral-600">روز</div>
                <select
                  value={day}
                  onChange={(event) => setDay(Number(event.target.value))}
                  className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 outline-none"
                >
                  {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((item) => (
                    <option key={item} value={item}>
                      {toFaDigits(item)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-xs text-neutral-600">ماه</div>
                <select
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                  className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 outline-none"
                >
                  {PERSIAN_MONTHS.map((name, index) => (
                    <option key={name} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-xs text-neutral-600">سال</div>
                <select
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                  className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 outline-none"
                >
                  {years.map((item) => (
                    <option key={item} value={item}>
                      {toFaDigits(item)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3">
              <div className="text-xs text-neutral-600">
                پیش نمایش:
                <div className="mt-1 font-semibold text-neutral-900">{toFaDigits(preview.replace(/-/g, "/"))}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-10 px-4 rounded-xl border border-black/10 hover:bg-black/[0.04] transition"
                >
                  بستن
                </button>
                <button type="button" onClick={apply} className="h-10 px-4 rounded-xl bg-black text-white hover:bg-black/90 transition">
                  تایید
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default function ContractInformation() {
  const [projects, setProjects] = React.useState([]);
  const [projectsLoading, setProjectsLoading] = React.useState(false);
  const [letters, setLetters] = React.useState([]);
  const [lettersLoading, setLettersLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");

  const [rows, setRows] = React.useState([]);
  const [rowsLoading, setRowsLoading] = React.useState(false);
  const [rowsError, setRowsError] = React.useState("");
  const [selectedContractIds, setSelectedContractIds] = React.useState(() => new Set());
  const [contractsPage, setContractsPage] = React.useState(0);
  const [contractsRowsPerPage, setContractsRowsPerPage] = React.useState(10);
  const [formOpen, setFormOpen] = React.useState(false);
  const [form, setForm] = React.useState(() => emptyForm());
  const [activeContractTab, setActiveContractTab] = React.useState(CONTRACT_SECTION_TABS[0].id);
  const [filterQuery, setFilterQuery] = React.useState("");
  const [filterProjectId, setFilterProjectId] = React.useState("");
  const [filterDocType, setFilterDocType] = React.useState("");
  const [relatedPickOpen, setRelatedPickOpen] = React.useState(false);
  const [relatedPickQuery, setRelatedPickQuery] = React.useState("");
  const [relatedPickTarget, setRelatedPickTarget] = React.useState("contract");
  const [tagCategories, setTagCategories] = React.useState([]);
  const [tags, setTags] = React.useState([]);
  const [tagsLoaded, setTagsLoaded] = React.useState(false);
  const [tagPickOpen, setTagPickOpen] = React.useState(false);
  const [tagPickSearch, setTagPickSearch] = React.useState("");
  const [tagPickCategoryId, setTagPickCategoryId] = React.useState("");
  const [tagPickDraftIds, setTagPickDraftIds] = React.useState([]);
  const [currencyItems, setCurrencyItems] = React.useState([]);
  const [currencySourceItems, setCurrencySourceItems] = React.useState([]);
  const [currencyLoading, setCurrencyLoading] = React.useState(false);
  const [currencyError, setCurrencyError] = React.useState("");
  const financialUploadInputRef = React.useRef(null);
  const insuranceUploadInputRef = React.useRef(null);
  const [editingGuaranteeId, setEditingGuaranteeId] = React.useState("");
  const [editingGuaranteeDraft, setEditingGuaranteeDraft] = React.useState(() => ({ ...EMPTY_GUARANTEE_ROW }));

  React.useEffect(() => {
    let alive = true;

    (async () => {
      setRowsLoading(true);
      setRowsError("");
      try {
        const data = await fetchJson("/contracts");
        const list = asArray(data)
          .map(normalizeContractRow)
          .filter((row) => row.id);
        if (alive) setRows(list);
      } catch (error) {
        if (alive) setRowsError(error?.message || "خطا در دریافت قراردادها");
      } finally {
        if (alive) setRowsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      setProjectsLoading(true);
      setLoadError("");
      try {
        const data = await fetchJson("/projects");
        const list = asArray(data)
          .map(normalizeProject)
          .filter((project) => project.id && project.isActive && isTopProjectCode(project.code))
          .sort(compareProjects);
        if (alive) setProjects(list);
      } catch (error) {
        if (!alive) return;
        setProjects([]);
        setLoadError(error?.message || "خطا در دریافت پروژه‌ها");
      } finally {
        if (alive) setProjectsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      setLettersLoading(true);
      try {
        const data = await fetchJson("/letters");
        const list = asArray(data)
          .filter((letter) => letter && typeof letter === "object")
          .filter((letter) => letterIdOf(letter))
          .sort((a, b) => String(letterIdOf(b)).localeCompare(String(letterIdOf(a)), "fa", { numeric: true }));
        if (alive) setLetters(list);
      } catch {
        if (alive) setLetters([]);
      } finally {
        if (alive) setLettersLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const ensureContractTags = React.useCallback(async () => {
    if (tagsLoaded) return;
    try {
      const data = await fetchJson("/tags?scope=letters");
      setTagCategories(Array.isArray(data?.categories) ? data.categories : []);
      setTags(Array.isArray(data?.tags) ? data.tags : asArray(data));
    } catch {
      try {
        const data = await fetchJson("/tags");
        setTagCategories(Array.isArray(data?.categories) ? data.categories : []);
        setTags(Array.isArray(data?.tags) ? data.tags : asArray(data));
      } catch {
        setTagCategories([]);
        setTags([]);
      }
    } finally {
      setTagsLoaded(true);
    }
  }, [tagsLoaded]);

  React.useEffect(() => {
    if (!formOpen) return;
    ensureContractTags();
  }, [ensureContractTags, formOpen]);

  const ensureCurrencies = React.useCallback(async () => {
    if (currencyItems.length || currencySourceItems.length || currencyLoading) return;
    setCurrencyLoading(true);
    setCurrencyError("");
    try {
      const [typesResp, sourcesResp] = await Promise.all([
        fetchJson("/base/currencies/types").catch(() => ({ items: [] })),
        fetchJson("/base/currencies/sources").catch(() => ({ items: [] })),
      ]);
      setCurrencyItems(listFromPayload(typesResp, "types"));
      setCurrencySourceItems(listFromPayload(sourcesResp, "sources"));
    } catch (error) {
      setCurrencyItems([]);
      setCurrencySourceItems([]);
      setCurrencyError(error?.message || "خطا در دریافت ارزها و منشأ ارز");
    } finally {
      setCurrencyLoading(false);
    }
  }, [currencyItems.length, currencyLoading, currencySourceItems.length]);

  React.useEffect(() => {
    if (!formOpen || activeContractTab !== "financial") return;
    ensureCurrencies();
  }, [activeContractTab, ensureCurrencies, formOpen]);

  React.useEffect(() => {
    if (!formOpen || activeContractTab !== "financial") return;
    setForm((prev) => {
      const hasContractRows = Array.isArray(prev.financial?.contractAmounts) && prev.financial.contractAmounts.length;
      const hasAppendixRows = Array.isArray(prev.financial?.appendices) && prev.financial.appendices.length;
      if (hasContractRows && hasAppendixRows) return prev;
      return {
        ...prev,
        financial: normalizeFinancial(prev.financial || {}),
      };
    });
  }, [activeContractTab, formOpen]);

  const projectById = React.useMemo(() => {
    const map = new Map();
    projects.forEach((project) => map.set(String(project.id), project));
    return map;
  }, [projects]);

  const rowById = React.useMemo(() => {
    const map = new Map();
    rows.forEach((row) => map.set(String(row.id), row));
    return map;
  }, [rows]);

  const letterById = React.useMemo(() => {
    const map = new Map();
    letters.forEach((letter) => map.set(String(letterIdOf(letter)), letter));
    return map;
  }, [letters]);

  const mainContracts = React.useMemo(
    () => rows.filter((row) => row.documentType === "main" && String(row.contractNo || "").trim()),
    [rows]
  );

  const insuranceForm = React.useMemo(() => normalizeInsurance(form.insurance || {}), [form.insurance]);
  const selectedLetter = form.relatedLetterId ? letterById.get(String(form.relatedLetterId)) : null;
  const technicalTagIds = React.useMemo(() => normalizeIdList(form.technical?.tagIds), [form.technical?.tagIds]);
  const tagById = React.useMemo(() => {
    const map = new Map();
    tags.forEach((tag) => {
      const id = String(tag?.id ?? "");
      if (id) map.set(id, tag);
    });
    return map;
  }, [tags]);
  const currencyById = React.useMemo(() => {
    const map = new Map();
    currencyItems.forEach((item) => {
      const id = readItemId(item);
      if (id) map.set(id, item);
    });
    return map;
  }, [currencyItems]);
  const currencySourceById = React.useMemo(() => {
    const map = new Map();
    currencySourceItems.forEach((item) => {
      const id = readItemId(item);
      if (id) map.set(id, item);
    });
    return map;
  }, [currencySourceItems]);
  const financialForm = React.useMemo(() => normalizeFinancial(form.financial || {}), [form.financial]);
  const filteredLetters = React.useMemo(() => {
    const q = toEnDigits(relatedPickQuery).trim().toLowerCase();
    const list = Array.isArray(letters) ? letters : [];
    if (!q) return list.slice(0, 80);
    return list.filter((letter) => {
      const haystack = [
        letterNoOf(letter),
        secretariatNoOf(letter),
        subjectOf(letter),
        orgOf(letter),
        letterDateOf(letter),
      ]
        .map((item) => toEnDigits(item).toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [letters, relatedPickQuery]);

  const filteredRows = React.useMemo(() => {
    const q = toEnDigits(filterQuery).trim().toLowerCase();
    return rows.filter((row) => {
      const project = projectById.get(String(row.projectId));
      const letter = row.relatedLetterId ? letterById.get(String(row.relatedLetterId)) : null;
      const cNo = contractNoForRow(row, rowById);
      const haystack = [
        project?.label,
        documentTypeLabel(row.documentType),
        cNo,
        row.general?.contractType,
        row.general?.contractSubject,
        row.general?.mainEmployer,
        row.general?.employerAssignor,
        row.general?.executor,
        row.general?.companyMembers,
        row.general?.mainContractors,
        row.technical?.serviceScope,
        row.technical?.duties,
        ...TECHNICAL_SUPPORT_FIELDS.map((item) => row.technical?.[item.key]),
        ...(Array.isArray(row.financial?.contractAmounts) ? row.financial.contractAmounts : []).flatMap((item) => [
          item.amount,
          item.currencyLabel,
          item.sourceLabel,
        ]),
        ...(Array.isArray(row.financial?.appendices) ? row.financial.appendices : []).flatMap((item) => [
          item.amount,
          item.currencyLabel,
          item.sourceLabel,
        ]),
        ...(Array.isArray(row.financial?.guarantees) ? row.financial.guarantees : []).flatMap((item) => [
          item.name,
          item.type,
          item.bankNo,
          item.amount,
          item.currencyLabel,
        ]),
        row.insurance?.contractRow,
        row.insurance?.branchStatus,
        row.insurance?.finalGrossPerformance,
        row.insurance?.clearanceAmount,
        row.insurance?.lastStatus,
        secretariatNoOf(letter),
        subjectOf(letter),
      ]
        .map((item) => toEnDigits(item).toLowerCase())
        .join(" ");

      if (filterProjectId && String(row.projectId) !== String(filterProjectId)) return false;
      if (filterDocType && String(row.documentType) !== String(filterDocType)) return false;
      if (q && !haystack.includes(q)) return false;
      return true;
    });
  }, [filterDocType, filterProjectId, filterQuery, letterById, projectById, rowById, rows]);

  React.useEffect(() => {
    setSelectedContractIds(new Set());
    setContractsPage(0);
  }, [filterDocType, filterProjectId, filterQuery, contractsRowsPerPage]);

  const contractsTotal = filteredRows.length;
  const contractsPageCount = Math.max(1, Math.ceil(contractsTotal / Math.max(1, contractsRowsPerPage)));
  const safeContractsPage = Math.min(Math.max(0, contractsPage), contractsPageCount - 1);
  const contractsStartIdx = safeContractsPage * contractsRowsPerPage;
  const contractsEndIdx = Math.min(contractsTotal, contractsStartIdx + contractsRowsPerPage);
  const contractsPageRows = filteredRows.slice(contractsStartIdx, contractsEndIdx);
  const visibleContractIds = React.useMemo(() => contractsPageRows.map((row) => String(row.id)), [contractsPageRows]);
  const allVisibleContractsSelected =
    visibleContractIds.length > 0 && visibleContractIds.every((id) => selectedContractIds.has(String(id)));
  const someVisibleContractsSelected =
    visibleContractIds.some((id) => selectedContractIds.has(String(id))) && !allVisibleContractsSelected;

  React.useEffect(() => {
    if (contractsPage !== safeContractsPage) setContractsPage(safeContractsPage);
  }, [contractsPage, safeContractsPage]);

  const toggleSelectAllVisibleContracts = () => {
    setSelectedContractIds((prev) => {
      const next = new Set(prev);
      if (allVisibleContractsSelected) {
        visibleContractIds.forEach((id) => next.delete(String(id)));
      } else {
        visibleContractIds.forEach((id) => next.add(String(id)));
      }
      return next;
    });
  };

  const toggleContractSelect = (id) => {
    const sid = String(id || "");
    if (!sid) return;
    setSelectedContractIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const setField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "documentType") {
        next.contractNo = "";
        next.parentContractId = "";
        next.general = {
          ...(prev.general || {}),
          employerAssignor: value === "sub" ? FIXED_SUB_ASSIGNOR : prev.general?.employerAssignor || "",
        };
      }
      return next;
    });
  };

  const openRelatedPicker = (target = "contract") => {
    setRelatedPickTarget(target);
    setRelatedPickQuery("");
    setRelatedPickOpen(true);
  };

  const setGeneralField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      general: {
        ...(prev.general || {}),
        [field]: value,
      },
    }));
  };

  const setContractTypeField = (value) => {
    setForm((prev) => ({
      ...prev,
      general: {
        ...(prev.general || {}),
        contractType: value === "سایر" ? "" : value,
        customContractType: value === "سایر",
      },
    }));
  };

  const setCustomContractType = (value) => {
    setForm((prev) => ({
      ...prev,
      general: {
        ...(prev.general || {}),
        contractType: value,
        customContractType: true,
      },
    }));
  };

  const setCalendarField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      calendar: {
        ...(prev.calendar || {}),
        [field]: value,
      },
    }));
  };

  const setTechnicalField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      technical: {
        ...(prev.technical || {}),
        tagIds: normalizeIdList(prev.technical?.tagIds),
        [field]: value,
      },
    }));
  };

  const setInsuranceField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      insurance: {
        ...normalizeInsurance(prev.insurance || {}),
        [field]: value,
      },
    }));
  };

  const addInsuranceClearanceFiles = (fileList) => {
    const incoming = Array.from(fileList || [])
      .filter(Boolean)
      .map((file) => ({
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        name: String(file?.name || "فایل"),
        size: Number(file?.size || 0),
        type: String(file?.type || ""),
        addedAt: new Date().toISOString(),
      }));
    if (!incoming.length) return;
    setForm((prev) => {
      const insurance = normalizeInsurance(prev.insurance || {});
      return {
        ...prev,
        insurance: {
          ...insurance,
          clearanceFiles: [...insurance.clearanceFiles, ...incoming],
        },
      };
    });
  };

  const removeInsuranceClearanceFile = (fileId) => {
    setForm((prev) => {
      const insurance = normalizeInsurance(prev.insurance || {});
      return {
        ...prev,
        insurance: {
          ...insurance,
          clearanceFiles: insurance.clearanceFiles.filter((file) => String(file?.id) !== String(fileId)),
        },
      };
    });
  };

  const updateFinancialRow = (sectionKey, rowId, field, value) => {
    setForm((prev) => {
      const financial = normalizeFinancial(prev.financial || {});
      const rows = financial[sectionKey].map((row) => {
        if (String(row.id) !== String(rowId)) return row;

        if (field === "currencyId") {
          const item = currencyById.get(String(value));
          return {
            ...row,
            currencyId: String(value || ""),
            currencyLabel: item ? readItemLabel(item) : "",
          };
        }

        if (field === "sourceId") {
          const item = currencySourceById.get(String(value));
          return {
            ...row,
            sourceId: String(value || ""),
            sourceLabel: item ? readItemLabel(item) : "",
          };
        }

        return {
          ...row,
          [field]: field === "amount" ? cleanFinancialAmountInput(value) : value,
        };
      });

      return {
        ...prev,
        financial: {
          ...financial,
          [sectionKey]: rows,
        },
      };
    });
  };

  const addFinancialRow = (sectionKey) => {
    setForm((prev) => {
      const financial = normalizeFinancial(prev.financial || {});
      return {
        ...prev,
        financial: {
          ...financial,
          [sectionKey]: [...financial[sectionKey], makeFinancialRow()],
        },
      };
    });
  };

  const setFinancialField = (field, value) => {
    setForm((prev) => {
      const financial = normalizeFinancial(prev.financial || {});
      return {
        ...prev,
        financial: {
          ...financial,
          [field]: value,
        },
      };
    });
  };

  const setFinancialOption = (field, value) => {
    setForm((prev) => {
      const financial = normalizeFinancial(prev.financial || {});
      const nextValue = financial[field] === value ? "" : value;
      const nextFinancial = {
        ...financial,
        [field]: nextValue,
      };
      if (field === "capitalDeposit" && nextValue !== "has") nextFinancial.capitalDepositAmount = "";
      if (field === "performanceBond" && nextValue !== "has") nextFinancial.performanceBondAmount = "";
      return {
        ...prev,
        financial: nextFinancial,
      };
    });
  };

  const addFinancialBreakdownFiles = (fileList) => {
    const incoming = Array.from(fileList || [])
      .filter(Boolean)
      .map((file) => ({
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        name: String(file?.name || "فایل"),
        size: Number(file?.size || 0),
        type: String(file?.type || ""),
        addedAt: new Date().toISOString(),
      }));
    if (!incoming.length) return;
    setForm((prev) => {
      const financial = normalizeFinancial(prev.financial || {});
      return {
        ...prev,
        financial: {
          ...financial,
          breakdownFiles: [...financial.breakdownFiles, ...incoming],
        },
      };
    });
  };

  const removeFinancialBreakdownFile = (fileId) => {
    setForm((prev) => {
      const financial = normalizeFinancial(prev.financial || {});
      return {
        ...prev,
        financial: {
          ...financial,
          breakdownFiles: financial.breakdownFiles.filter((file) => String(file?.id) !== String(fileId)),
        },
      };
    });
  };

  const updateGuaranteeDraft = (field, value) => {
    setForm((prev) => {
      const financial = normalizeFinancial(prev.financial || {});
      const draft = makeGuaranteeRow(financial.guaranteeDraft || {});
      let nextDraft = { ...draft };

      if (field === "customNameValue") {
        nextDraft = { ...nextDraft, name: value, customName: true };
      } else if (field === "name") {
        if (value === "سایر") {
          nextDraft = { ...nextDraft, name: "", customName: true };
        } else {
          nextDraft = { ...nextDraft, name: value, customName: false };
        }
      } else if (field === "currencyId") {
        const item = currencyById.get(String(value));
        nextDraft = {
          ...nextDraft,
          currencyId: String(value || ""),
          currencyLabel: item ? readItemLabel(item) : "",
        };
      } else {
        nextDraft = {
          ...nextDraft,
          [field]: field === "amount" ? cleanFinancialAmountInput(value) : value,
        };
      }

      return {
        ...prev,
        financial: {
          ...financial,
          guaranteeDraft: nextDraft,
        },
      };
    });
  };

  const addGuaranteeRow = () => {
    setForm((prev) => {
      const financial = normalizeFinancial(prev.financial || {});
      const draft = makeGuaranteeRow(financial.guaranteeDraft || {});
      const hasAnyValue = [draft.name, draft.type, draft.bankNo, draft.amount, draft.currencyId].some((item) => String(item || "").trim());
      if (!hasAnyValue) return prev;

      return {
        ...prev,
        financial: {
          ...financial,
          guaranteeDraft: { ...EMPTY_GUARANTEE_ROW },
          guarantees: [...financial.guarantees, makeGuaranteeRow({ ...draft, id: "" })],
        },
      };
    });
  };

  const removeGuaranteeRow = (rowId) => {
    setForm((prev) => {
      const financial = normalizeFinancial(prev.financial || {});
      return {
        ...prev,
        financial: {
          ...financial,
          guarantees: financial.guarantees.filter((row) => String(row.id) !== String(rowId)),
        },
      };
    });
    if (String(editingGuaranteeId) === String(rowId)) {
      setEditingGuaranteeId("");
      setEditingGuaranteeDraft({ ...EMPTY_GUARANTEE_ROW });
    }
  };

  const startEditGuaranteeRow = (row) => {
    const draft = makeGuaranteeRow(row || {});
    setEditingGuaranteeId(String(draft.id || ""));
    setEditingGuaranteeDraft(draft);
  };

  const cancelEditGuaranteeRow = () => {
    setEditingGuaranteeId("");
    setEditingGuaranteeDraft({ ...EMPTY_GUARANTEE_ROW });
  };

  const updateGuaranteeEdit = (field, value) => {
    setEditingGuaranteeDraft((prev) => {
      let next = makeGuaranteeRow(prev || {});
      if (field === "customNameValue") {
        next = { ...next, name: value, customName: true };
      } else if (field === "name") {
        next = value === "سایر" ? { ...next, name: "", customName: true } : { ...next, name: value, customName: false };
      } else if (field === "currencyId") {
        const item = currencyById.get(String(value));
        next = {
          ...next,
          currencyId: String(value || ""),
          currencyLabel: item ? readItemLabel(item) : "",
        };
      } else {
        next = {
          ...next,
          [field]: field === "amount" ? cleanFinancialAmountInput(value) : value,
        };
      }
      return next;
    });
  };

  const saveEditGuaranteeRow = () => {
    const id = String(editingGuaranteeId || "");
    if (!id) return;
    setForm((prev) => {
      const financial = normalizeFinancial(prev.financial || {});
      return {
        ...prev,
        financial: {
          ...financial,
          guarantees: financial.guarantees.map((row) =>
            String(row.id) === id ? makeGuaranteeRow({ ...editingGuaranteeDraft, id }) : row
          ),
        },
      };
    });
    cancelEditGuaranteeRow();
  };

  const removeFinancialRow = (sectionKey, rowId) => {
    setForm((prev) => {
      const financial = normalizeFinancial(prev.financial || {});
      const rows = financial[sectionKey].filter((row) => String(row.id) !== String(rowId));
      return {
        ...prev,
        financial: {
          ...financial,
          [sectionKey]: rows.length ? rows : [makeFinancialRow()],
        },
      };
    });
  };

  const setTechnicalTagIds = (ids) => {
    setForm((prev) => ({
      ...prev,
      technical: {
        ...(prev.technical || {}),
        tagIds: normalizeIdList(ids),
      },
    }));
  };

  const toggleTechnicalTag = (id) => {
    const sid = String(id || "").trim();
    if (!sid) return;
    const current = normalizeIdList(form.technical?.tagIds);
    setTechnicalTagIds(current.includes(sid) ? current.filter((item) => item !== sid) : [...current, sid]);
  };

  const openTechnicalTagPicker = async () => {
    await ensureContractTags();
    setTagPickDraftIds(technicalTagIds);
    setTagPickCategoryId("");
    setTagPickSearch("");
    setTagPickOpen(true);
  };

  const togglePickDraft = (id) => {
    const sid = String(id || "").trim();
    if (!sid) return;
    setTagPickDraftIds((prev) => (prev.includes(sid) ? prev.filter((item) => item !== sid) : [...prev, sid]));
  };

  const applyPickedTags = () => {
    setTechnicalTagIds(tagPickDraftIds);
    setTagPickOpen(false);
  };

  const addCalendarExtraDate = () => {
    setForm((prev) => ({
      ...prev,
      calendar: {
        ...(prev.calendar || {}),
        extraDates: [...(Array.isArray(prev.calendar?.extraDates) ? prev.calendar.extraDates : []), ""],
      },
    }));
  };

  const setCalendarExtraDate = (index, value) => {
    setForm((prev) => {
      const extraDates = Array.isArray(prev.calendar?.extraDates) ? [...prev.calendar.extraDates] : [];
      extraDates[index] = value;
      return {
        ...prev,
        calendar: {
          ...(prev.calendar || {}),
          extraDates,
        },
      };
    });
  };

  const removeCalendarExtraDate = (index) => {
    setForm((prev) => {
      const extraDates = (Array.isArray(prev.calendar?.extraDates) ? prev.calendar.extraDates : []).filter(
        (_, itemIndex) => itemIndex !== index
      );
      return {
        ...prev,
        calendar: {
          ...(prev.calendar || {}),
          extraDates,
        },
      };
    });
  };

  const openFreshForm = () => {
    setForm(emptyForm());
    setRelatedPickQuery("");
    setRelatedPickTarget("contract");
    setActiveContractTab(CONTRACT_SECTION_TABS[0].id);
    setFormOpen(true);
  };

  const openEditForm = (row) => {
    const next = normalizeContractRow(row);
    setForm(next);
    setRelatedPickQuery("");
    setRelatedPickTarget("contract");
    setActiveContractTab(next.documentType === "appendix" ? "calendar" : CONTRACT_SECTION_TABS[0].id);
    setFormOpen(true);
    window.requestAnimationFrame(() => {
      document.querySelector(".ipm-contract-information")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const closeForm = () => {
    setForm(emptyForm());
    setRelatedPickQuery("");
    setRelatedPickTarget("contract");
    setActiveContractTab(CONTRACT_SECTION_TABS[0].id);
    setFormOpen(false);
  };

  const saveContractSection = async (sectionId = activeContractTab) => {
    const projectId = String(form.projectId || "").trim();
    const documentType = String(form.documentType || "main");
    const relatedLetterId = String(form.relatedLetterId || "").trim();
    const contractNo = String(form.contractNo || "").trim();
    const parentContractId = String(form.parentContractId || "").trim();

    if (!projectId) {
      alert("مرکز/پروژه را انتخاب کنید.");
      return;
    }

    if (documentType === "main" && !contractNo) {
      alert("شماره قرارداد را وارد کنید.");
      return;
    }

    if (documentType !== "main" && !parentContractId) {
      alert("شماره قرارداد اصلی را انتخاب کنید.");
      return;
    }

    const id = String(form.id || "").trim() || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const rowPayload = {
      ...form,
      id,
      projectId,
      documentType,
      contractNo: documentType === "main" ? contractNo : "",
      parentContractId: documentType === "main" ? "" : parentContractId,
      relatedLetterId,
      general: {
        ...(form.general || {}),
        employerAssignor: documentType === "sub" ? FIXED_SUB_ASSIGNOR : form.general?.employerAssignor || "",
      },
      calendar: { ...(form.calendar || {}) },
      technical: { ...(form.technical || {}), tagIds: normalizeIdList(form.technical?.tagIds) },
      financial: normalizeFinancial(form.financial || {}),
      insurance: normalizeInsurance(form.insurance || {}),
      lastSavedSection: sectionId,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    try {
      const data = await fetchJson("/contracts", {
        method: "POST",
        body: JSON.stringify(rowPayload),
      });
      const savedRow = normalizeContractRow(data?.item || rowPayload);

      setRows((prev) => {
        const exists = prev.some((row) => String(row.id) === savedRow.id);
        if (exists) {
          return prev.map((row) => (String(row.id) === savedRow.id ? savedRow : row));
        }
        return [savedRow, ...prev];
      });
      setForm((prev) => ({ ...prev, id: savedRow.id }));
      setRowsError("");
    } catch (error) {
      alert(error?.message || "خطا در ذخیره قرارداد");
    }
  };

  const deleteRow = async (id) => {
    const sid = String(id || "");
    if (!sid) return;
    if (!window.confirm("حذف شود؟")) return;
    try {
      await fetchJson(`/contracts?id=${encodeURIComponent(sid)}`, { method: "DELETE" });
      setRows((prev) => prev.filter((row) => String(row.id) !== sid && String(row.parentContractId) !== sid));
      setSelectedContractIds((prev) => {
        const next = new Set(prev);
        next.delete(sid);
        return next;
      });
      setRowsError("");
    } catch (error) {
      alert(error?.message || "خطا در حذف قرارداد");
    }
  };

  const inputCls =
    "w-full h-11 rounded-xl px-3 bg-white text-black border border-black/15 outline-none transition focus:border-black/35 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:border-neutral-500";
  const textareaCls =
    "w-full min-h-[150px] rounded-xl px-3 py-2 bg-white text-black border border-black/15 outline-none transition resize-y leading-7 focus:border-black/35 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:border-neutral-500";
  const labelCls = "text-xs font-semibold text-black/60 mb-1 dark:text-neutral-300";
  const iconBtnCls =
    "h-10 w-10 rounded-xl border border-black/15 bg-white hover:bg-black/[0.04] transition inline-flex items-center justify-center dark:bg-neutral-900 dark:border-neutral-700 dark:hover:bg-neutral-800";
  const saveIconBtnCls =
    "h-11 w-11 rounded-xl bg-black text-white hover:bg-black/90 transition inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed";
  const chipBaseCls = "inline-flex h-10 items-center gap-2 rounded-full border px-3 text-xs shadow-sm transition";
  const chipCls =
    chipBaseCls +
    " border-black/10 bg-white text-neutral-900 hover:bg-black/5 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-white/10";
  const selectedTagChipCls =
    chipBaseCls + " border-black bg-black text-white hover:bg-black/90 dark:border-neutral-200 dark:bg-neutral-100 dark:text-neutral-900";
  const centeredRowActionsCls =
    "flex min-h-[34px] w-full items-center justify-center gap-1 transition-opacity opacity-100 pointer-events-auto sm:opacity-0 sm:pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto";
  const contractsTableWrapCls =
    "mt-4 rounded-2xl border border-black/10 bg-white text-black overflow-hidden dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100";
  const contractsTableHeadRowCls =
    "bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700";
  const contractsTableBodyCls =
    "[&_td]:text-black dark:[&_td]:text-neutral-100 [&_td]:text-center [&_th]:text-center";
  const contractsRowDividerCls = "border-b border-neutral-300 dark:border-neutral-700";
  const paginationIconBtnCls =
    "h-9 w-9 rounded-lg border border-black/10 bg-white inline-flex items-center justify-center transition hover:bg-black/[0.04] disabled:opacity-40 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800";
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
  const tabbedPanelClass =
    "relative rounded-2xl border border-black/10 bg-white overflow-hidden shadow-sm dark:bg-neutral-900 dark:border-neutral-800";
  const calendarCardCls =
    "rounded-2xl border border-black/10 bg-white p-3 sm:min-h-[114px] dark:border-neutral-800 dark:bg-neutral-900";
  const calendarTotals = calculateCalendarDays(form.calendar || {});
  const isAppendixDocument = form.documentType === "appendix";
  const showCalendarExtraDates = isAppendixDocument;
  const visibleContractTabs = React.useMemo(
    () => CONTRACT_SECTION_TABS.filter((tab) => !isAppendixDocument || !["general", "insurance"].includes(tab.id)),
    [isAppendixDocument]
  );
  const readonlyInputCls =
    "w-full h-11 rounded-xl px-3 bg-black/[0.04] text-black border border-black/10 outline-none dark:bg-white/[0.06] dark:text-neutral-100 dark:border-neutral-700";

  React.useEffect(() => {
    if (!visibleContractTabs.some((tab) => tab.id === activeContractTab)) {
      setActiveContractTab(visibleContractTabs[0]?.id || CONTRACT_SECTION_TABS[0].id);
    }
  }, [activeContractTab, visibleContractTabs]);

  const renderFinancialRows = (title, sectionKey, rows, options = {}) => {
    const showFinancialRowDelete = Boolean(options.showDelete);
    const { bordered = true, showAdd = true, amountLabel = "عدد" } = options;
    const content = (
      <>
      <div className="mb-3 text-sm font-semibold text-black dark:text-neutral-100">{title}</div>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={row.id} className="grid grid-cols-1 md:grid-cols-[minmax(180px,1fr)_190px_190px] gap-2 md:items-end">
            <div>
              <div className={labelCls}>{amountLabel}</div>
              <input
                value={row.amount || ""}
                onChange={(e) => updateFinancialRow(sectionKey, row.id, "amount", e.target.value)}
                className={inputCls}
                type="text"
                inputMode="decimal"
                dir="ltr"
                placeholder="0"
              />
            </div>
            <div>
              <div className={labelCls}>ارز</div>
              <select
                value={row.currencyId || ""}
                onChange={(e) => updateFinancialRow(sectionKey, row.id, "currencyId", e.target.value)}
                className={inputCls}
                disabled={currencyLoading}
              >
                <option value="">{currencyLoading ? "در حال بارگذاری..." : "انتخاب ارز"}</option>
                {currencyItems.map((item) => {
                  const id = readItemId(item);
                  if (!id) return null;
                  return (
                    <option key={id} value={id}>
                      {readItemLabel(item) || id}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <div className={labelCls}>منشأ</div>
              <select
                value={row.sourceId || ""}
                onChange={(e) => updateFinancialRow(sectionKey, row.id, "sourceId", e.target.value)}
                className={inputCls}
                disabled={currencyLoading}
              >
                <option value="">{currencyLoading ? "در حال بارگذاری..." : "انتخاب منشأ"}</option>
                {currencySourceItems.map((item) => {
                  const id = readItemId(item);
                  if (!id) return null;
                  return (
                    <option key={id} value={id}>
                      {readItemLabel(item) || id}
                    </option>
                  );
                })}
              </select>
            </div>
            {showFinancialRowDelete ? <button
              type="button"
              onClick={() => removeFinancialRow(sectionKey, row.id)}
              className={`${iconBtnCls} !h-11 !w-11`}
              aria-label={`حذف ردیف ${toFaDigits(index + 1)}`}
              title="حذف"
            >
              <img src="/images/icons/hazf.svg" alt="" className="w-5 h-5 dark:invert" />
            </button> : null}
          </div>
        ))}
      </div>
      {showAdd ? (
        <button
          type="button"
          onClick={() => addFinancialRow(sectionKey)}
          className={`${iconBtnCls} !h-11 !w-11 mt-3`}
          aria-label={`افزودن ${title}`}
          title={`افزودن ${title}`}
        >
          <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5 dark:invert" />
        </button>
      ) : null}
      </>
    );

    return bordered ? (
      <div className="rounded-2xl border border-black/10 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">{content}</div>
    ) : (
      <div>{content}</div>
    );
  };

  const renderFinancialBreakdownFiles = () => (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm font-normal text-black dark:text-neutral-100">جدول شکست مبلغ قرارداد</div>
        <button
          type="button"
          onClick={() => financialUploadInputRef.current?.click()}
          className="h-11 rounded-xl border border-black/15 bg-white px-3 text-sm font-semibold transition inline-flex items-center gap-2 hover:bg-black/[0.04] dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
        >
          <img src="/images/icons/upload.svg" alt="" className="w-5 h-5 dark:invert" />
          بارگذاری اسناد
        </button>
        <input
          ref={financialUploadInputRef}
          type="file"
          multiple
          accept=".pdf,image/*,.xls,.xlsx,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            addFinancialBreakdownFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {financialForm.breakdownFiles.length ? (
        <div className="mt-3 grid grid-cols-1 gap-2">
          {financialForm.breakdownFiles.map((file, index) => (
            <div
              key={file.id || `${file.name}_${index}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 dark:border-neutral-700 dark:bg-white/[0.03]"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{file.name || `فایل ${toFaDigits(index + 1)}`}</div>
                <div className="mt-1 text-xs text-black/50 dark:text-neutral-400">{toFaDigits(formatBytes(file.size || 0))}</div>
              </div>
              <button
                type="button"
                onClick={() => removeFinancialBreakdownFile(file.id)}
                className={`${iconBtnCls} !h-11 !w-11`}
                aria-label="حذف فایل"
                title="حذف فایل"
              >
                <img src="/images/icons/hazf.svg" alt="" className="w-5 h-5 dark:invert" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );

  const renderPaymentOption = (field, value, label) => (
    <label className="inline-flex h-8 items-center gap-2 rounded-lg border border-black/10 bg-white px-2.5 text-xs font-semibold transition hover:bg-black/[0.03] dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700">
      <input
        type="checkbox"
        checked={financialForm[field] === value}
        onChange={() => setFinancialOption(field, value)}
        className="h-4 w-4 accent-black"
      />
      {label}
    </label>
  );

  return (
    <div dir="rtl" className="ipm-contract-information mx-auto w-full max-w-[1400px] px-2 font-sans text-[13px] sm:px-0 sm:text-sm">
      <Card className="!p-0 rounded-xl border overflow-hidden border-black/10 bg-white text-black sm:rounded-2xl dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
        <div className="p-2.5 sm:p-3 md:p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-base md:text-lg">
              <span className="text-neutral-700 dark:text-neutral-300">پروژه‌ها</span>
              <span className="mx-2 text-neutral-500 dark:text-neutral-400">›</span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">قراردادها</span>
            </div>
            <button
              type="button"
              onClick={() => (formOpen ? closeForm() : openFreshForm())}
              className={iconBtnCls}
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

          <div className="rounded-2xl border border-black/10 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-full sm:min-w-[260px] sm:flex-1">
                <div className={labelCls}>جست و جو</div>
                <input
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className={inputCls}
                  type="text"
                  placeholder="جستجو در مرکز/پروژه، قرارداد، نوع قرارداد و شماره ثبت دبیرخانه"
                />
              </div>

              <div className="w-full sm:w-auto sm:min-w-[220px]">
                <div className={labelCls}>مرکز/پروژه</div>
                <select value={filterProjectId} onChange={(e) => setFilterProjectId(e.target.value)} className={inputCls}>
                  <option value="">همه پروژه‌ها</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-auto sm:min-w-[160px]">
                <div className={labelCls}>سند قراردادی</div>
                <select value={filterDocType} onChange={(e) => setFilterDocType(e.target.value)} className={inputCls}>
                  <option value="">همه</option>
                  {CONTRACT_DOCUMENT_TYPES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className={`${iconBtnCls} !h-11 !w-11`}
                onClick={() => {
                  setFilterQuery("");
                  setFilterProjectId("");
                  setFilterDocType("");
                }}
                aria-label="پاک کردن فیلتر"
                title="پاک کردن فیلتر"
              >
                <img src="/images/icons/reset.svg" alt="" className="w-5 h-5 dark:invert" />
              </button>
            </div>
          </div>

          {loadError ? <div className="mt-3 text-sm text-red-600 dark:text-red-400">{loadError}</div> : null}
          {rowsError ? <div className="mt-3 text-sm text-red-600 dark:text-red-400">{rowsError}</div> : null}
          {rowsLoading ? <div className="mt-3 text-sm text-black/55 dark:text-neutral-400">در حال بارگذاری قراردادها...</div> : null}

          {formOpen ? (
            <div className="mt-4 rounded-2xl border border-black/10 bg-black/[0.02] p-2.5 sm:p-3 dark:border-neutral-800 dark:bg-white/[0.03]">
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-full sm:min-w-[260px] sm:flex-1">
                  <div className={labelCls}>مرکز/پروژه</div>
                  <select
                    value={form.projectId}
                    onChange={(e) => setField("projectId", e.target.value)}
                    className={inputCls}
                    disabled={projectsLoading}
                  >
                    <option value="">{projectsLoading ? "در حال بارگذاری پروژه‌ها..." : "انتخاب پروژه فعال"}</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-auto sm:min-w-[170px]">
                  <div className={labelCls}>سند قراردادی</div>
                  <select value={form.documentType} onChange={(e) => setField("documentType", e.target.value)} className={inputCls}>
                    {CONTRACT_DOCUMENT_TYPES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:min-w-[230px] sm:flex-1">
                  <div className={labelCls}>شماره قرارداد</div>
                  {form.documentType === "main" ? (
                    <input
                      value={form.contractNo}
                      onChange={(e) => setField("contractNo", e.target.value)}
                      className={inputCls}
                      type="text"
                    />
                  ) : (
                    <select
                      value={form.parentContractId}
                      onChange={(e) => setField("parentContractId", e.target.value)}
                      className={inputCls}
                    >
                      <option value="">انتخاب قرارداد اصلی</option>
                      {mainContracts.map((contract) => {
                        const project = projectById.get(String(contract.projectId));
                        return (
                          <option key={contract.id} value={contract.id}>
                            {contract.contractNo}
                            {project?.label ? ` - ${project.label}` : ""}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                <div>
                  <div className={labelCls}>اسناد مرتبط</div>
                  <button
                    type="button"
                    onClick={() => openRelatedPicker("contract")}
                    className={`${iconBtnCls} !h-11 !w-11`}
                    aria-label="انتخاب اسناد مرتبط"
                    title="انتخاب اسناد مرتبط"
                  >
                    <img src="/images/icons/sayer.svg" alt="" className="w-5 h-5 dark:invert" />
                  </button>
                </div>

                <div className="w-full pb-1 sm:min-w-[240px] sm:flex-1 sm:pb-2">
                  <div className="text-sm text-black/70 dark:text-neutral-300">
                    شماره ثبت دبیرخانه:{" "}
                    <span className="font-semibold text-black dark:text-neutral-100">
                      {selectedLetter ? toFaDigits(secretariatNoOf(selectedLetter) || "ثبت نشده") : "سندی انتخاب نشده است"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 sm:mt-6">
                <div className="overflow-visible px-0 sm:px-2" dir="rtl">
                  <div className={tabStripCls}>
                    {visibleContractTabs.map((tab, index) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveContractTab(tab.id)}
                      className={topTabBtnClass(activeContractTab === tab.id, index, visibleContractTabs.length)}
                    >
                      {tab.label}
                    </button>
                    ))}
                  </div>
                </div>

                <div className={tabbedPanelClass}>
                  {activeContractTab === "general" ? (
                    <div className="space-y-4 p-3 sm:p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        <div className="min-w-0">
                          <div className={labelCls}>نوع قرارداد</div>
                          {form.general?.customContractType ? (
                            <input
                              value={form.general?.contractType || ""}
                              onChange={(e) => setCustomContractType(e.target.value)}
                              className={inputCls}
                              type="text"
                              placeholder="نوع قرارداد"
                              autoFocus
                            />
                          ) : (
                            <select
                              value={form.general?.contractType || ""}
                              onChange={(e) => setContractTypeField(e.target.value)}
                              className={inputCls}
                            >
                              <option value="">انتخاب کنید</option>
                              {GENERAL_CONTRACT_TYPES.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className={labelCls}>موضوع قرارداد</div>
                          <input
                            value={form.general?.contractSubject || ""}
                            onChange={(e) => setGeneralField("contractSubject", e.target.value)}
                            className={inputCls}
                            type="text"
                          />
                        </div>

                        {form.documentType !== "sub" ? (
                          <div className="min-w-0">
                            <div className={labelCls}>کارفرمای اصلی</div>
                            <input
                              value={form.general?.mainEmployer || ""}
                              onChange={(e) => setGeneralField("mainEmployer", e.target.value)}
                              className={inputCls}
                              type="text"
                            />
                          </div>
                        ) : null}

                        {form.documentType === "sub" ? (
                          <div className="min-w-0">
                            <div className={labelCls}>واگذارنده / کارفرما</div>
                            <input value={FIXED_SUB_ASSIGNOR} className={readonlyInputCls} type="text" readOnly />
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <div className={labelCls}>واگذارنده / کارفرما</div>
                            <input
                              value={form.general?.employerAssignor || ""}
                              onChange={(e) => setGeneralField("employerAssignor", e.target.value)}
                              className={inputCls}
                              type="text"
                            />
                          </div>
                        )}

                        {form.documentType !== "main" ? (
                          <div className="min-w-0">
                            <div className={labelCls}>مجری</div>
                            <input
                              value={form.general?.executor || ""}
                              onChange={(e) => setGeneralField("executor", e.target.value)}
                              className={inputCls}
                              type="text"
                            />
                          </div>
                        ) : null}

                        <div>
                          <div className={labelCls}>اعضای مشارکت</div>
                          <input
                            value={form.general?.companyMembers || ""}
                            onChange={(e) => setGeneralField("companyMembers", e.target.value)}
                            className={inputCls}
                            type="text"
                          />
                        </div>

                        <div>
                          <div className={labelCls}>پیمانکاران اصلی</div>
                          <input
                            value={form.general?.mainContractors || ""}
                            onChange={(e) => setGeneralField("mainContractors", e.target.value)}
                            className={inputCls}
                            type="text"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <button type="button" onClick={() => saveContractSection("general")} className={saveIconBtnCls} title="ذخیره" aria-label="ذخیره">
                          <img src="/images/icons/check.svg" alt="" className="w-5 h-5 invert" />
                        </button>
                      </div>
                    </div>
                  ) : activeContractTab === "calendar" ? (
                    <div className="space-y-4 p-3 sm:p-4">
                      {isAppendixDocument ? (
                        <div className={calendarCardCls}>
                          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(260px,1fr)] gap-3 md:items-end">
                            <div className="pb-3 text-sm font-semibold text-black dark:text-neutral-100">تمدید مدت قرارداد تا تاریخ</div>
                            <div>
                              <ContractDatePicker
                                value={form.calendar?.endDate || ""}
                                onChange={(value) => setCalendarField("endDate", value)}
                              />
                              <div className="mt-2 text-xs text-black/55 dark:text-neutral-400">
                                میلادی:{" "}
                                <span className="font-semibold text-black dark:text-neutral-100">
                                  {jalaliToGregorianLabel(form.calendar?.endDate) || "انتخاب نشده"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                      <>
                      <div className={calendarCardCls}>
                        <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_minmax(220px,1fr)_170px] gap-3 lg:items-start">
                          <div className="min-w-0">
                            <div className={labelCls}>تاریخ ابلاغ کار</div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <ContractDatePicker
                                  value={form.calendar?.notifyDate || ""}
                                  onChange={(value) => setCalendarField("notifyDate", value)}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => openRelatedPicker("contract")}
                                className={`${iconBtnCls} !h-11 !w-11`}
                                aria-label="انتخاب اسناد مرتبط"
                                title="انتخاب اسناد مرتبط"
                              >
                                <img src="/images/icons/sayer.svg" alt="" className="w-5 h-5 dark:invert" />
                              </button>
                            </div>
                            <div className="mt-2 text-xs text-black/55 dark:text-neutral-400">
                              میلادی: <span className="font-semibold text-black dark:text-neutral-100">{jalaliToGregorianLabel(form.calendar?.notifyDate) || "انتخاب نشده"}</span>
                            </div>
                          </div>

                        <div className="min-w-0">
                            <div className={labelCls}>تاریخ شروع قرارداد</div>
                            <ContractDatePicker value={form.calendar?.startDate || ""} onChange={(value) => setCalendarField("startDate", value)} />
                            <div className="mt-2 text-xs text-black/55 dark:text-neutral-400">
                              میلادی: <span className="font-semibold text-black dark:text-neutral-100">{jalaliToGregorianLabel(form.calendar?.startDate) || "انتخاب نشده"}</span>
                            </div>
                          </div>

                        <div className="min-w-0">
                            <div className={labelCls}>تاریخ پایان قرارداد</div>
                            <ContractDatePicker value={form.calendar?.endDate || ""} onChange={(value) => setCalendarField("endDate", value)} />
                            <div className="mt-2 text-xs text-black/55 dark:text-neutral-400">
                              میلادی: <span className="font-semibold text-black dark:text-neutral-100">{jalaliToGregorianLabel(form.calendar?.endDate) || "انتخاب نشده"}</span>
                            </div>
                          </div>

                          <div>
                            <div className={labelCls}>مدت قرارداد</div>
                            <div className="h-11 rounded-xl border border-black/10 bg-black/[0.03] px-3 text-sm font-bold flex items-center dark:border-neutral-700 dark:bg-white/[0.04]">
                              {calendarTotals.baseDays ? `${toFaDigits(calendarTotals.baseDays)} روز` : "محاسبه نشده"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {showCalendarExtraDates ? (
                      <div className="rounded-2xl border border-black/10 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="text-sm font-semibold">تاریخ‌های افزوده</div>
                          <button
                            type="button"
                            onClick={addCalendarExtraDate}
                            className={iconBtnCls}
                            aria-label="افزودن تاریخ"
                            title="افزودن تاریخ"
                          >
                            <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5 dark:invert" />
                          </button>
                        </div>

                        {(Array.isArray(form.calendar?.extraDates) ? form.calendar.extraDates : []).length ? (
                          <div className="space-y-2">
                            {form.calendar.extraDates.map((date, index) => (
                              <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_220px_44px] gap-2 md:items-end">
                                <div>
                                  <div className={labelCls}>تاریخ {toFaDigits(index + 1)}</div>
                                  <ContractDatePicker value={date || ""} onChange={(value) => setCalendarExtraDate(index, value)} />
                                </div>
                                <div className="h-11 rounded-xl border border-black/10 bg-black/[0.02] px-3 text-sm flex items-center dark:border-neutral-700 dark:bg-white/[0.03]">
                                  میلادی: {jalaliToGregorianLabel(date) || "انتخاب نشده"}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeCalendarExtraDate(index)}
                                  className={iconBtnCls}
                                  aria-label="حذف تاریخ"
                                  title="حذف تاریخ"
                                >
                                  <img src="/images/icons/hazf.svg" alt="" className="w-5 h-5 dark:invert" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-black/55 dark:text-neutral-400">برای افزودن تاریخ جدید، دکمه افزودن را بزنید.</div>
                        )}

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div className="rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3 dark:border-neutral-700 dark:bg-white/[0.03]">
                            <div className="text-xs text-black/55 dark:text-neutral-400">روزهای بازه اصلی</div>
                            <div className="mt-1 font-bold">{calendarTotals.baseDays ? `${toFaDigits(calendarTotals.baseDays)} روز` : "۰ روز"}</div>
                          </div>
                          <div className="rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3 dark:border-neutral-700 dark:bg-white/[0.03]">
                            <div className="text-xs text-black/55 dark:text-neutral-400">روزهای افزوده</div>
                            <div className="mt-1 font-bold">{toFaDigits(calendarTotals.extraDays)} روز</div>
                          </div>
                          <div className="rounded-xl border border-black bg-black px-4 py-3 text-white">
                            <div className="text-xs text-white/70">جمع کل تقویم قرارداد</div>
                            <div className="mt-1 font-bold">{calendarTotals.totalDays ? `${toFaDigits(calendarTotals.totalDays)} روز` : "۰ روز"}</div>
                          </div>
                        </div>
                      </div>
                      ) : null}
                      </>
                      )}

                      <div className="flex items-center justify-end">
                        <button type="button" onClick={() => saveContractSection("calendar")} className={saveIconBtnCls} title="ذخیره" aria-label="ذخیره">
                          <img src="/images/icons/check.svg" alt="" className="w-5 h-5 invert" />
                        </button>
                      </div>
                    </div>
                  ) : activeContractTab === "technical" ? (
                    <div className="space-y-4 p-3 sm:p-4">
                      {isAppendixDocument ? (
                        <div className="space-y-4">
                          <div>
                            <div className={labelCls}>شرح</div>
                            <textarea
                              value={form.technical?.serviceScope || ""}
                              onChange={(e) => setTechnicalField("serviceScope", e.target.value)}
                              className={`${textareaCls} !h-[150px] !min-h-[150px] !resize-none sm:!h-[180px] sm:!min-h-[180px]`}
                            />
                          </div>
                          <div className="flex items-center justify-end">
                            <button type="button" onClick={() => saveContractSection("technical")} className={saveIconBtnCls} title="ثبت" aria-label="ثبت">
                              <img src="/images/icons/check.svg" alt="" className="w-5 h-5 invert" />
                            </button>
                          </div>
                        </div>
                      ) : (
                      <>
                      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 items-start">
                        <div className="space-y-4">
                          <div className="pt-1.5">
                            <div className={labelCls}>شرح خدمات و محدوده کار</div>
                            <textarea
                              value={form.technical?.serviceScope || ""}
                              onChange={(e) => setTechnicalField("serviceScope", e.target.value)}
                              className={`${textareaCls} !h-[190px] !min-h-[190px] !resize-none sm:!h-[268px] sm:!min-h-[268px]`}
                            />
                          </div>

                          <div>
                            <div className={labelCls}>برچسب ها</div>
                            <div className="flex flex-wrap items-center gap-2">
                              {technicalTagIds.map((id) => {
                                const tag = tagById.get(String(id)) || { id, label: `برچسب (${toFaDigits(id)})` };
                                const label = tagLabelOf(tag);
                                return (
                                  <button
                                    key={id}
                                    type="button"
                                    onClick={() => toggleTechnicalTag(id)}
                                    className={selectedTagChipCls + " shrink-0"}
                                    title={label}
                                    aria-label={label}
                                  >
                                    <span className="max-w-[220px] truncate">{label}</span>
                                  </button>
                                );
                              })}

                              <button
                                type="button"
                                onClick={openTechnicalTagPicker}
                                className="h-10 w-10 shrink-0 rounded-full border border-black/10 bg-white transition inline-flex items-center justify-center hover:bg-black/[0.02] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
                                aria-label="افزودن برچسب"
                                title="افزودن برچسب"
                              >
                                <img src="/images/icons/sayer.svg" alt="" className="w-5 h-5 dark:invert" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {TECHNICAL_SUPPORT_FIELDS.map((item) => (
                            <div key={item.key} className="min-w-0">
                              <div className={labelCls}>{item.label}</div>
                              <input
                                value={form.technical?.[item.key] || ""}
                                onChange={(e) => setTechnicalField(item.key, e.target.value)}
                                className={inputCls}
                                type="text"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <button type="button" onClick={() => saveContractSection("technical")} className={saveIconBtnCls} title="ذخیره" aria-label="ذخیره">
                          <img src="/images/icons/check.svg" alt="" className="w-5 h-5 invert" />
                        </button>
                      </div>
                      </>
                      )}
                    </div>
                  ) : activeContractTab === "financial" ? (
                    <div className="space-y-4 p-3 sm:p-4">
                      {currencyError ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                          {currencyError}
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-black/10 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                        {renderFinancialRows("مبلغ قرارداد", "contractAmounts", financialForm.contractAmounts, {
                          bordered: false,
                          showAdd: false,
                          amountLabel: "مبلغ قرارداد",
                        })}

                        {!isAppendixDocument ? (
                          <React.Fragment>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[minmax(280px,0.95fr)_minmax(360px,1.05fr)] items-start">
                          <div>
                            <div className="mb-2 text-sm font-semibold text-black dark:text-neutral-100">شرایط پرداخت</div>
                            <textarea
                              value={financialForm.paymentTerms || ""}
                              onChange={(e) => setFinancialField("paymentTerms", e.target.value)}
                              className={`${textareaCls} !h-[170px] !min-h-[170px] !resize-none sm:!h-[240px] sm:!min-h-[240px]`}
                            />
                          </div>

                          <div className="space-y-3">
                          <div className="mt-2 rounded-xl border border-black/10 bg-black/[0.02] p-3 lg:mt-6 dark:border-neutral-700 dark:bg-white/[0.03]">
                            <div className="grid grid-cols-1 gap-3">
                              <div className="grid grid-cols-1 sm:grid-cols-[116px_1fr] gap-2 sm:items-center">
                                <div className="text-sm font-semibold text-black/75 dark:text-neutral-200">پیش پرداخت</div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {renderPaymentOption("advancePayment", "has", "دارد")}
                                  {renderPaymentOption("advancePayment", "none", "ندارد")}
                                </div>
                              </div>

                              <div className="border-t border-black/10 pt-3 dark:border-neutral-700">
                                <div className="mb-2 text-sm font-semibold text-black/70 dark:text-neutral-200">کسور</div>
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-[116px_1fr] gap-2 sm:items-center">
                                    <div className="text-sm text-black/70 dark:text-neutral-300">سپرده بیمه</div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {renderPaymentOption("capitalDeposit", "has", "دارد")}
                                      {renderPaymentOption("capitalDeposit", "none", "ندارد")}
                                      {financialForm.capitalDeposit === "has" ? (
                                        <div className="relative">
                                          <input
                                            value={financialForm.capitalDepositAmount || ""}
                                            onChange={(e) => setFinancialField("capitalDepositAmount", cleanFinancialAmountInput(e.target.value))}
                                            className={`${inputCls} !h-8 !w-20 !pl-7 !pr-2 text-center`}
                                            type="text"
                                            inputMode="decimal"
                                            dir="ltr"
                                            placeholder="0"
                                          />
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-black/55 dark:text-neutral-300">%</span>
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-[116px_1fr] gap-2 sm:items-center">
                                    <div className="text-sm text-black/70 dark:text-neutral-300">حسن انجام کار</div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {renderPaymentOption("performanceBond", "has", "دارد")}
                                      {renderPaymentOption("performanceBond", "none", "ندارد")}
                                      {financialForm.performanceBond === "has" ? (
                                        <div className="relative">
                                          <input
                                            value={financialForm.performanceBondAmount || ""}
                                            onChange={(e) => setFinancialField("performanceBondAmount", cleanFinancialAmountInput(e.target.value))}
                                            className={`${inputCls} !h-8 !w-20 !pl-7 !pr-2 text-center`}
                                            type="text"
                                            inputMode="decimal"
                                            dir="ltr"
                                            placeholder="0"
                                          />
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-black/55 dark:text-neutral-300">%</span>
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          {renderFinancialBreakdownFiles()}
                        </div>
                        <div className="hidden">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-black dark:text-neutral-100">جدول شکست مبلغ قرارداد</div>
                            <button
                              type="button"
                              onClick={() => financialUploadInputRef.current?.click()}
                              className="h-10 rounded-xl border border-black/15 bg-white px-3 text-sm font-semibold transition inline-flex items-center gap-2 hover:bg-black/[0.04] dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                            >
                              <img src="/images/icons/upload.svg" alt="" className="w-5 h-5 dark:invert" />
                              بارگذاری اسناد
                            </button>
                            <input
                              type="file"
                              multiple
                              accept=".pdf,image/*,.xls,.xlsx,.doc,.docx"
                              className="hidden"
                              onChange={(e) => {
                                addFinancialBreakdownFiles(e.target.files);
                                e.target.value = "";
                              }}
                            />
                          </div>

                          {financialForm.breakdownFiles.length ? (
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                              {financialForm.breakdownFiles.map((file, index) => (
                                <div
                                  key={file.id || `${file.name}_${index}`}
                                  className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 dark:border-neutral-700 dark:bg-white/[0.03]"
                                >
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold">{file.name || `فایل ${toFaDigits(index + 1)}`}</div>
                                    <div className="mt-1 text-xs text-black/50 dark:text-neutral-400">{toFaDigits(formatBytes(file.size || 0))}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeFinancialBreakdownFile(file.id)}
                                    className={iconBtnCls}
                                    aria-label="حذف فایل"
                                    title="حذف فایل"
                                  >
                                    <img src="/images/icons/hazf.svg" alt="" className="w-5 h-5 dark:invert" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        </div>
                          </React.Fragment>
                        ) : null}
                      </div>

                      {!isAppendixDocument ? (
                        <>
                      <div className="border-t border-black/10 pt-4 dark:border-neutral-800">
                        <div className="mb-3 text-sm font-semibold text-black dark:text-neutral-100">تضامین</div>

                        <div className="rounded-2xl border border-black/10 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                          <div className="grid grid-cols-1 md:grid-cols-[140px_140px_minmax(190px,1.05fr)_minmax(240px,1.45fr)_120px_48px] gap-2 md:items-end">
                            <div>
                              <div className={labelCls}>نام تضمین</div>
                              {financialForm.guaranteeDraft?.customName ? (
                                <input
                                  value={financialForm.guaranteeDraft?.name || ""}
                                  onChange={(e) => updateGuaranteeDraft("customNameValue", e.target.value)}
                                  className={inputCls}
                                  type="text"
                                  placeholder="نام تضمین"
                                  autoFocus
                                />
                              ) : (
                                <select
                                  value={financialForm.guaranteeDraft?.name || ""}
                                  onChange={(e) => updateGuaranteeDraft("name", e.target.value)}
                                  className={inputCls}
                                >
                                  <option value="">انتخاب کنید</option>
                                  {GUARANTEE_NAME_OPTIONS.map((item) => (
                                    <option key={item} value={item}>
                                      {item}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>

                            <div>
                              <div className={labelCls}>نوع</div>
                              <input
                                value={financialForm.guaranteeDraft?.type || ""}
                                onChange={(e) => updateGuaranteeDraft("type", e.target.value)}
                                className={inputCls}
                                type="text"
                              />
                            </div>

                            <div>
                              <div className={labelCls}>عهده بانک/شماره</div>
                              <input
                                value={financialForm.guaranteeDraft?.bankNo || ""}
                                onChange={(e) => updateGuaranteeDraft("bankNo", e.target.value)}
                                className={inputCls}
                                type="text"
                              />
                            </div>

                            <div>
                              <div className={labelCls}>مبلغ</div>
                              <input
                                value={formatAmountInput(financialForm.guaranteeDraft?.amount || "")}
                                onChange={(e) => updateGuaranteeDraft("amount", e.target.value)}
                                className={inputCls}
                                type="text"
                                inputMode="decimal"
                                dir="ltr"
                                placeholder="0"
                              />
                            </div>

                            <div>
                              <div className={labelCls}>ارز</div>
                              <select
                                value={financialForm.guaranteeDraft?.currencyId || ""}
                                onChange={(e) => updateGuaranteeDraft("currencyId", e.target.value)}
                                className={inputCls}
                                disabled={currencyLoading}
                              >
                                <option value="">{currencyLoading ? "در حال بارگذاری..." : "انتخاب ارز"}</option>
                                {currencyItems.map((item) => {
                                  const id = readItemId(item);
                                  if (!id) return null;
                                  return (
                                    <option key={id} value={id}>
                                      {readItemLabel(item) || id}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={addGuaranteeRow}
                              className="h-11 w-full rounded-xl border border-black/15 bg-white px-1 transition inline-flex items-center justify-center hover:bg-black/[0.04] dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                              aria-label="افزودن تضمین"
                              title="افزودن تضمین"
                            >
                              <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5 dark:invert" />
                            </button>
                          </div>

                          <div className={`mt-3 ${financialTablePreset.frame}`}>
                            <div className="overflow-x-auto">
                              <table className={`${financialTablePreset.table} min-w-[760px] text-xs sm:min-w-[900px] sm:text-sm`} dir="rtl">
                                <colgroup>
                                  <col className="w-[18%]" />
                                  <col className="w-[14%]" />
                                  <col className="w-[24%]" />
                                  <col className="w-[28%]" />
                                  <col className="w-[16%]" />
                                </colgroup>
                                <thead>
                                  <tr className={financialTablePreset.headRow}>
                                    <th className={`${financialTablePreset.th} !text-right pr-5`}>نام تضمین</th>
                                    <th className={financialTablePreset.th}>نوع</th>
                                    <th className={financialTablePreset.th}>عهده بانک/شماره</th>
                                    <th className={financialTablePreset.th}>مبلغ</th>
                                    <th className={financialTablePreset.th}>ارز</th>
                                  </tr>
                                </thead>
                                <tbody className={financialTablePreset.body}>
                                  {financialForm.guarantees.length ? (
                                    financialForm.guarantees.map((row) => {
                                      const isEditing = String(editingGuaranteeId) === String(row.id);
                                      return (
                                        <tr key={row.id} className={`${hoverSelectableRowPreset.rowBase} ${hoverSelectableRowPreset.rowIdle}`}>
                                          <td className="px-5 py-2 !text-right">
                                            {isEditing ? (
                                              <div className="flex min-h-[34px] items-center justify-start">
                                                {editingGuaranteeDraft.customName ? (
                                                  <input
                                                    value={editingGuaranteeDraft.name || ""}
                                                    onChange={(e) => updateGuaranteeEdit("customNameValue", e.target.value)}
                                                    className="w-full max-w-[220px] rounded-xl border border-black/15 bg-white px-2 py-1 text-right text-black outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                                    type="text"
                                                    autoFocus
                                                  />
                                                ) : (
                                                  <select
                                                    value={editingGuaranteeDraft.name || ""}
                                                    onChange={(e) => updateGuaranteeEdit("name", e.target.value)}
                                                    className="w-full max-w-[220px] rounded-xl border border-black/15 bg-white px-2 py-1 text-right text-black outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                                  >
                                                    <option value="">انتخاب کنید</option>
                                                    {GUARANTEE_NAME_OPTIONS.map((item) => (
                                                      <option key={item} value={item}>
                                                        {item}
                                                      </option>
                                                    ))}
                                                  </select>
                                                )}
                                              </div>
                                            ) : (
                                              <span className="block truncate text-right">{row.name || "—"}</span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2">
                                            {isEditing ? (
                                              <input
                                                value={editingGuaranteeDraft.type || ""}
                                                onChange={(e) => updateGuaranteeEdit("type", e.target.value)}
                                                className="w-full max-w-[150px] rounded-xl border border-black/15 bg-white px-2 py-1 text-center text-black outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                                type="text"
                                              />
                                            ) : (
                                              row.type || "—"
                                            )}
                                          </td>
                                          <td className="px-3 py-2">
                                            {isEditing ? (
                                              <input
                                                value={editingGuaranteeDraft.bankNo || ""}
                                                onChange={(e) => updateGuaranteeEdit("bankNo", e.target.value)}
                                                className="w-full max-w-[220px] rounded-xl border border-black/15 bg-white px-2 py-1 text-center text-black outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                                type="text"
                                              />
                                            ) : row.bankNo ? (
                                              toFaDigits(row.bankNo)
                                            ) : (
                                              "—"
                                            )}
                                          </td>
                                          <td className="px-3 py-2">
                                            {isEditing ? (
                                              <input
                                                value={formatAmountInput(editingGuaranteeDraft.amount || "")}
                                                onChange={(e) => updateGuaranteeEdit("amount", e.target.value)}
                                                className="w-full max-w-[140px] rounded-xl border border-black/15 bg-white px-2 py-1 text-center text-black outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                                type="text"
                                                inputMode="decimal"
                                                dir="ltr"
                                              />
                                            ) : row.amount ? (
                                              formatFinancialAmount(parseFinancialAmount(row.amount))
                                            ) : (
                                              "—"
                                            )}
                                          </td>
                                          <td className="px-3 py-2 relative">
                                            {isEditing ? (
                                              <div className="relative min-h-[34px] flex items-center justify-center pl-20">
                                                <select
                                                  value={editingGuaranteeDraft.currencyId || ""}
                                                  onChange={(e) => updateGuaranteeEdit("currencyId", e.target.value)}
                                                  className="w-full max-w-[150px] rounded-xl border border-black/15 bg-white px-2 py-1 text-center text-black outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                                >
                                                  <option value="">انتخاب ارز</option>
                                                  {currencyItems.map((item) => {
                                                    const id = readItemId(item);
                                                    if (!id) return null;
                                                    return (
                                                      <option key={id} value={id}>
                                                        {readItemLabel(item) || id}
                                                      </option>
                                                    );
                                                  })}
                                                </select>
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1 shrink-0">
                                                  <RowActionIconBtn action="save" onClick={saveEditGuaranteeRow} size={34} iconSize={15} />
                                                  <RowActionIconBtn action="cancel" onClick={cancelEditGuaranteeRow} size={34} iconSize={14} />
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="relative min-h-[34px] flex items-center justify-center pl-20">
                                                <span className="block truncate">{row.currencyLabel || row.currencyId || "—"}</span>
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1 shrink-0 transition-opacity opacity-100 pointer-events-auto sm:opacity-0 sm:pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto">
                                                  <RowActionIconBtn action="edit" onClick={() => startEditGuaranteeRow(row)} size={34} iconSize={15} />
                                                  <RowActionIconBtn action="delete" onClick={() => removeGuaranteeRow(row.id)} size={34} iconSize={16} />
                                                </div>
                                              </div>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  ) : (
                                    <tr>
                                      <td colSpan={5} className={financialTablePreset.emptyRow}>
                                        تضمینی ثبت نشده.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                        </>
                      ) : null}

                      <div className="flex items-center justify-end">
                        <button type="button" onClick={() => saveContractSection("financial")} className={saveIconBtnCls} title="ذخیره" aria-label="ذخیره">
                          <img src="/images/icons/check.svg" alt="" className="w-5 h-5 invert" />
                        </button>
                      </div>
                    </div>
                  ) : activeContractTab === "insurance" ? (
                    <div className="space-y-4 p-3 sm:p-4">
                      <div className="rounded-2xl border border-black/10 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <div className={labelCls}>ردیف پیمان</div>
                            <input
                              value={insuranceForm.contractRow || ""}
                              onChange={(e) => setInsuranceField("contractRow", e.target.value)}
                              className={inputCls}
                              type="text"
                            />
                          </div>

                          <div className="min-w-0">
                            <div className={labelCls}>شعبه سازمان تامین اجتماعی</div>
                            <select
                              value={insuranceForm.branchStatus || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setForm((prev) => {
                                  const insurance = normalizeInsurance(prev.insurance || {});
                                  return {
                                    ...prev,
                                    insurance: {
                                      ...insurance,
                                      branchStatus: value,
                                      ...(value === SOCIAL_INSURANCE_CLEARANCE_STATUS
                                        ? {}
                                        : { finalGrossPerformance: "", clearanceAmount: "", clearanceFiles: [], relatedLetterId: "" }),
                                    },
                                  };
                                });
                              }}
                              className={inputCls}
                            >
                              <option value="">انتخاب وضعیت</option>
                              {SOCIAL_INSURANCE_STATUS_OPTIONS.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {insuranceForm.branchStatus === SOCIAL_INSURANCE_CLEARANCE_STATUS ? (
                          <div className="mt-4 rounded-2xl border border-black/10 bg-black/[0.02] p-3 dark:border-neutral-700 dark:bg-white/[0.03]">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:items-end">
                              <div className="min-w-0">
                                <div className={labelCls}>کارکرد ناخالص نهایی قرارداد</div>
                                <div className="relative">
                                  <input
                                    value={formatAmountInput(insuranceForm.finalGrossPerformance || "")}
                                    onChange={(e) => setInsuranceField("finalGrossPerformance", cleanFinancialAmountInput(e.target.value))}
                                    className={`${inputCls} !pl-14`}
                                    type="text"
                                    inputMode="decimal"
                                    dir="ltr"
                                    placeholder="0"
                                  />
                                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-black/55 dark:text-neutral-300">
                                    ریال
                                  </span>
                                </div>
                              </div>

                              <div className="min-w-0">
                                <div className={labelCls}>مفاصا حساب بیمه تامین اجتماعی</div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => insuranceUploadInputRef.current?.click()}
                                    className="h-11 rounded-xl border border-black/15 bg-white px-3 text-xs font-semibold transition inline-flex items-center gap-2 hover:bg-black/[0.04] dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                                  >
                                    <img src="/images/icons/upload.svg" alt="" className="w-5 h-5 dark:invert" />
                                    بارگذاری اسناد
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openRelatedPicker("insurance")}
                                    className="h-11 w-11 rounded-xl border border-black/15 bg-white transition inline-flex items-center justify-center hover:bg-black/[0.04] dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                                    aria-label="انتخاب سند مرتبط"
                                    title="انتخاب سند مرتبط"
                                  >
                                    <img src="/images/icons/sayer.svg" alt="" className="w-5 h-5 dark:invert" />
                                  </button>
                                  <input
                                    ref={insuranceUploadInputRef}
                                    type="file"
                                    multiple
                                    accept=".pdf,image/*,.xls,.xlsx,.doc,.docx"
                                    className="hidden"
                                    onChange={(e) => {
                                      addInsuranceClearanceFiles(e.target.files);
                                      e.target.value = "";
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            {insuranceForm.clearanceFiles.length ? (
                              <div className="mt-3 grid grid-cols-1 gap-2">
                                {insuranceForm.clearanceFiles.map((file, index) => (
                                  <div
                                    key={file.id || `${file.name}_${index}`}
                                    className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
                                  >
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-semibold">{file.name || `فایل ${toFaDigits(index + 1)}`}</div>
                                      <div className="mt-1 text-xs text-black/50 dark:text-neutral-400">{toFaDigits(formatBytes(file.size || 0))}</div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeInsuranceClearanceFile(file.id)}
                                      className={`${iconBtnCls} !h-10 !w-10`}
                                      aria-label="حذف فایل"
                                      title="حذف فایل"
                                    >
                                      <img src="/images/icons/hazf.svg" alt="" className="w-5 h-5 dark:invert" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="mt-4">
                          <div className={labelCls}>آخرین وضعیت قرارداد</div>
                          <input
                            value={insuranceForm.lastStatus || ""}
                            onChange={(e) => setInsuranceField("lastStatus", e.target.value)}
                            className={inputCls}
                            type="text"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <button type="button" onClick={() => saveContractSection("insurance")} className={saveIconBtnCls} title="ذخیره" aria-label="ذخیره">
                          <img src="/images/icons/check.svg" alt="" className="w-5 h-5 invert" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[160px] flex-col justify-between gap-4 p-3 sm:min-h-[180px] sm:p-4">
                      <div className="rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-black/60 dark:border-neutral-700 dark:bg-white/[0.03] dark:text-neutral-300">
                        بخش {CONTRACT_SECTION_TABS.find((tab) => tab.id === activeContractTab)?.label} در مرحله بعد تکمیل می‌شود.
                      </div>

                      <div className="flex items-center justify-end">
                        <button type="button" onClick={() => saveContractSection(activeContractTab)} className={saveIconBtnCls} title="ذخیره" aria-label="ذخیره">
                          <img src="/images/icons/check.svg" alt="" className="w-5 h-5 invert" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className={contractsTableWrapCls}>
            <div className="md:hidden">
              {contractsPageRows.length ? (
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {contractsPageRows.map((row) => {
                    const project = projectById.get(String(row.projectId));
                    const relatedLetter = row.relatedLetterId ? letterById.get(String(row.relatedLetterId)) : null;
                    const appendicesCount = countAppendices(row, rows);
                    const contractNo = contractNoForRow(row, rowById);
                    const id = String(row.id);
                    const projectLabel = project?.label || "بدون پروژه";
                    const docLabel = documentTypeLabel(row.documentType);
                    const typeText = row.general?.contractType || "ثبت نشده";
                    const relatedNo = relatedLetter
                      ? secretariatNoOf(relatedLetter) || letterNoOf(relatedLetter) || row.relatedLetterId
                      : "";
                    const docColor =
                      row.documentType === "appendix"
                        ? "#FF8040"
                        : row.documentType === "sub"
                        ? "#8BAE66"
                        : "#0046FF";

                    return (
                      <div
                        key={row.id}
                        className="border-r-4 bg-white p-3 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                        style={{ borderRightColor: docColor }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <input
                                type="checkbox"
                                className="h-4 w-4 shrink-0 accent-black dark:accent-neutral-200"
                                checked={selectedContractIds.has(id)}
                                onChange={() => toggleContractSelect(id)}
                                aria-label="انتخاب"
                                title="انتخاب"
                              />
                              <button
                                type="button"
                                onClick={() => openEditForm(row)}
                                className="min-w-0 truncate text-right text-sm font-bold underline-offset-4 hover:underline"
                                title="ویرایش"
                                aria-label="ویرایش"
                              >
                                {contractNo ? toFaDigits(contractNo) : "ثبت نشده"}
                              </button>
                              <span className="shrink-0 rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] text-neutral-700 dark:bg-white/10 dark:text-white/80">
                                {docLabel}
                              </span>
                            </div>
                            <div className="mt-1 truncate text-xs text-black/55 dark:text-neutral-400">{projectLabel}</div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <RowActionIconBtn action="edit" onClick={() => openEditForm(row)} size={34} iconSize={15} />
                            <RowActionIconBtn action="delete" onClick={() => deleteRow(row.id)} size={34} iconSize={16} />
                          </div>
                        </div>

                        <div className="mt-3 space-y-2 text-[13px]">
                          <div>
                            <div className="text-[11px] text-black/45 dark:text-neutral-500">نوع قرارداد</div>
                            <div className="line-clamp-2 break-words leading-6 font-semibold">{typeText}</div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="min-w-0">
                              <div className="text-[11px] text-black/45 dark:text-neutral-500">الحاقیه‌ها</div>
                              <div className="truncate">{appendicesCount ? toFaDigits(appendicesCount) : "بدون الحاقیه"}</div>
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] text-black/45 dark:text-neutral-500">مفاصات</div>
                              <div className="truncate font-semibold">{row.insurance?.branchStatus || "ثبت نشده"}</div>
                              {row.insurance?.lastStatus ? (
                                <div className="mt-0.5 truncate text-[11px] text-black/50 dark:text-neutral-400">
                                  {row.insurance.lastStatus}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] text-black/45 dark:text-neutral-500">نامه ابلاغ کار</div>
                            {relatedLetter ? (
                              <div className="min-w-0">
                                <div className="font-semibold">{toFaDigits(relatedNo)}</div>
                                <div className="mt-0.5 truncate text-[11px] text-black/55 dark:text-neutral-400">
                                  {subjectOf(relatedLetter) || "بدون موضوع"}
                                </div>
                              </div>
                            ) : (
                              <div>ثبت نشده</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-8 text-center text-sm text-black/55 dark:text-neutral-400">
                  قراردادی برای نمایش وجود ندارد.
                </div>
              )}
            </div>

            <div dir="ltr" className="hidden md:block relative max-h-[55vh] overflow-y-auto overflow-x-auto">
              <table
                dir="rtl"
                className="w-full min-w-[900px] table-fixed text-xs sm:min-w-[1120px] sm:text-sm [&_th]:text-center [&_td]:text-center [&_th]:py-2 [&_td]:py-2 [&_th]:whitespace-nowrap [&_td]:min-w-0"
              >
                <colgroup>
                  <col style={{ width: 48 }} />
                  <col style={{ width: 280 }} />
                  <col style={{ width: 160 }} />
                  <col style={{ width: 130 }} />
                  <col style={{ width: 120 }} />
                  <col />
                  <col style={{ width: 130 }} />
                  <col style={{ width: 120 }} />
                </colgroup>
                <thead>
                  <tr className={contractsTableHeadRowCls}>
                    <th className="sticky top-0 z-40 bg-neutral-200 dark:bg-white/10">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-black dark:accent-neutral-200"
                        checked={allVisibleContractsSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someVisibleContractsSelected;
                        }}
                        onChange={toggleSelectAllVisibleContracts}
                        aria-label="انتخاب همه"
                        title="انتخاب همه"
                      />
                    </th>
                    <th className="sticky top-0 z-30 bg-neutral-200 text-[14px] font-semibold dark:bg-white/10">مرکز/پروژه</th>
                    <th className="sticky top-0 z-30 bg-neutral-200 text-[14px] font-semibold dark:bg-white/10">نوع قرارداد</th>
                    <th className="sticky top-0 z-30 bg-neutral-200 text-[14px] font-semibold dark:bg-white/10">قرارداد</th>
                    <th className="sticky top-0 z-30 bg-neutral-200 text-[14px] font-semibold dark:bg-white/10">الحاقیه‌ها</th>
                    <th className="sticky top-0 z-30 bg-neutral-200 text-[14px] font-semibold dark:bg-white/10">نامه ابلاغ کار</th>
                    <th className="sticky top-0 z-30 bg-neutral-200 text-[14px] font-semibold dark:bg-white/10">مفاصات</th>
                    <th className="sticky top-0 z-30 bg-neutral-200 text-[14px] font-semibold dark:bg-white/10">اقدامات</th>
                  </tr>
                </thead>
                <tbody className={contractsTableBodyCls}>
                  {contractsPageRows.length ? (
                    contractsPageRows.map((row, index) => {
                      const project = projectById.get(String(row.projectId));
                      const relatedLetter = row.relatedLetterId ? letterById.get(String(row.relatedLetterId)) : null;
                      const appendicesCount = countAppendices(row, rows);
                      const contractNo = contractNoForRow(row, rowById);
                      const id = String(row.id);
                      const isLast = index === contractsPageRows.length - 1;
                      const divider = isLast ? "" : contractsRowDividerCls;
                      const projectLabel = project?.label || "بدون پروژه";

                      return (
                        <tr key={row.id} className="group bg-white transition-colors hover:bg-black/[0.04] dark:bg-neutral-900 dark:hover:bg-white/10">
                          <td className={`px-3 ${divider}`}>
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-black dark:accent-neutral-200"
                              checked={selectedContractIds.has(id)}
                              onChange={() => toggleContractSelect(id)}
                              aria-label="انتخاب"
                              title="انتخاب"
                            />
                          </td>
                          <td className={`px-3 ${divider}`}>
                            <span className="block truncate" title={projectLabel}>{projectLabel}</span>
                          </td>
                          <td className={`px-3 ${divider}`}>
                            <div className="truncate font-semibold">{row.general?.contractType || "ثبت نشده"}</div>
                            <div className="mt-1 text-xs text-black/50 dark:text-neutral-400">{documentTypeLabel(row.documentType)}</div>
                          </td>
                          <td className={`px-3 font-semibold ${divider}`}>{contractNo ? toFaDigits(contractNo) : "ثبت نشده"}</td>
                          <td className={`px-3 ${divider}`}>{appendicesCount ? toFaDigits(appendicesCount) : "بدون الحاقیه"}</td>
                          <td className={`px-3 ${divider}`}>
                            {relatedLetter ? (
                              <div>
                                <div className="font-semibold">{toFaDigits(secretariatNoOf(relatedLetter) || letterNoOf(relatedLetter) || row.relatedLetterId)}</div>
                                <div className="mx-auto mt-1 max-w-[260px] truncate text-xs text-black/55 dark:text-neutral-400">
                                  {subjectOf(relatedLetter) || "بدون موضوع"}
                                </div>
                              </div>
                            ) : (
                              "ثبت نشده"
                            )}
                          </td>
                          <td className={`px-3 ${divider}`}>
                            <div className="truncate font-semibold">{row.insurance?.branchStatus || "ثبت نشده"}</div>
                            {row.insurance?.lastStatus ? (
                              <div className="mx-auto mt-1 max-w-[160px] truncate text-xs text-black/50 dark:text-neutral-400">
                                {row.insurance.lastStatus}
                              </div>
                            ) : null}
                          </td>
                          <td className={`px-3 ${divider}`}>
                            <div className={centeredRowActionsCls}>
                              <RowActionIconBtn action="edit" onClick={() => openEditForm(row)} size={34} iconSize={15} />
                              <RowActionIconBtn action="delete" onClick={() => deleteRow(row.id)} size={34} iconSize={16} />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-black/55 dark:text-neutral-400">
                        قراردادی برای نمایش وجود ندارد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-neutral-300 px-3 py-2 dark:border-neutral-800">
              <div className="flex flex-col items-stretch gap-2 md:flex-row md:flex-wrap md:items-center md:justify-between">
                <div className="flex items-center justify-between gap-2 text-xs md:justify-start md:text-sm">
                  <button
                    type="button"
                    onClick={() => setContractsPage((page) => Math.max(0, page - 1))}
                    disabled={safeContractsPage <= 0}
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
                    onClick={() => setContractsPage((page) => Math.min(contractsPageCount - 1, page + 1))}
                    disabled={safeContractsPage >= contractsPageCount - 1}
                    className={paginationIconBtnCls}
                    aria-label="صفحه بعد"
                    title="صفحه بعد"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <div className="whitespace-nowrap text-black/70 dark:text-neutral-400">
                    {contractsTotal === 0 ? "۰ از ۰" : `${toFaDigits(contractsStartIdx + 1)}-${toFaDigits(contractsEndIdx)} از ${toFaDigits(contractsTotal)}`}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs md:justify-start md:text-sm">
                  <span className="text-black/70 dark:text-neutral-400">تعداد در هر صفحه:</span>
                  <select
                    value={contractsRowsPerPage}
                    onChange={(e) => {
                      setContractsRowsPerPage(Number(e.target.value) || 10);
                      setContractsPage(0);
                    }}
                    className="h-9 rounded-lg border border-black/10 bg-white px-2 text-black outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  >
                    {[10, 25, 100].map((count) => (
                      <option key={count} value={count}>
                        {toFaDigits(count)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden">
            <div dir="ltr" className="relative max-h-[55vh] overflow-y-auto overflow-x-auto">
            <table dir="rtl" className="w-full min-w-[900px] table-fixed text-xs sm:min-w-[1120px] sm:text-sm [&_th]:text-center [&_td]:text-center [&_th]:py-2 [&_td]:py-2 [&_th]:whitespace-nowrap [&_td]:min-w-0">
              <thead className="bg-black/[0.03] text-black/70 dark:bg-white/[0.05] dark:text-neutral-300">
                <tr>
                  <th className="px-3 py-3 text-right font-semibold">مرکز/پروژه</th>
                  <th className="px-3 py-3 text-right font-semibold">نوع قرارداد</th>
                  <th className="px-3 py-3 text-right font-semibold">قرارداد</th>
                  <th className="px-3 py-3 text-right font-semibold">الحاقیه‌ها</th>
                  <th className="px-3 py-3 text-right font-semibold">نامه ابلاغ کار</th>
                  <th className="px-3 py-3 text-right font-semibold">مفاصات</th>
                  <th className="px-3 py-3 text-right font-semibold">اقدامات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length ? (
                  filteredRows.map((row) => {
                    const project = projectById.get(String(row.projectId));
                    const relatedLetter = row.relatedLetterId ? letterById.get(String(row.relatedLetterId)) : null;
                    const appendicesCount = countAppendices(row, rows);
                    const contractNo = contractNoForRow(row, rowById);

                    return (
                      <tr
                        key={row.id}
                        className={`${hoverSelectableRowPreset.rowBase} ${hoverSelectableRowPreset.rowIdle} border-t border-black/10 dark:border-neutral-800`}
                      >
                        <td className="px-3 py-3 text-right">{project?.label || "بدون پروژه"}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="font-semibold">{row.general?.contractType || "ثبت نشده"}</div>
                          <div className="mt-1 text-xs text-black/50 dark:text-neutral-400">{documentTypeLabel(row.documentType)}</div>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">{contractNo ? toFaDigits(contractNo) : "ثبت نشده"}</td>
                        <td className="px-3 py-3 text-right">{appendicesCount ? toFaDigits(appendicesCount) : "بدون الحاقیه"}</td>
                        <td className="px-3 py-3 text-right">
                          {relatedLetter ? (
                            <div>
                              <div className="font-semibold">{toFaDigits(secretariatNoOf(relatedLetter) || letterNoOf(relatedLetter) || row.relatedLetterId)}</div>
                              <div className="mt-1 max-w-[220px] truncate text-xs text-black/55 dark:text-neutral-400">
                                {subjectOf(relatedLetter) || "بدون موضوع"}
                              </div>
                            </div>
                          ) : (
                            "ثبت نشده"
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">ثبت نشده</td>
                        <td className="px-3 py-3 text-right">
                          <div className="min-h-[34px] flex items-center justify-center">
                            <span className="sr-only">اقدامات</span>
                            <div className={centeredRowActionsCls}>
                              <RowActionIconBtn action="edit" onClick={() => openEditForm(row)} size={34} iconSize={15} />
                              <RowActionIconBtn action="delete" onClick={() => deleteRow(row.id)} size={34} iconSize={16} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-black/55 dark:text-neutral-400">
                      قراردادی برای نمایش وجود ندارد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </Card>

      {relatedPickOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setRelatedPickOpen(false)} />
            <div className="relative w-full max-w-3xl rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-xl overflow-hidden dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="font-semibold text-sm">انتخاب اسناد مرتبط</div>
                <button
                  type="button"
                  onClick={() => setRelatedPickOpen(false)}
                  className={iconBtnCls}
                  aria-label="بستن"
                  title="بستن"
                >
                  <img src="/images/icons/bastan.svg" alt="" className="w-5 h-5 dark:invert" />
                </button>
              </div>

              <div className="px-4 pb-3">
                <input
                  value={relatedPickQuery}
                  onChange={(e) => setRelatedPickQuery(e.target.value)}
                  className={inputCls}
                  type="text"
                  placeholder="جستجو با شماره / موضوع / سازمان / شماره ثبت دبیرخانه"
                  autoFocus
                />
              </div>

              <div className="h-px bg-black/10 dark:bg-white/10" />

              <div className="max-h-[55vh] overflow-auto p-2">
                {lettersLoading ? (
                  <div className="p-4 text-sm text-black/55 dark:text-neutral-400">در حال بارگذاری نامه‌ها...</div>
                ) : filteredLetters.length ? (
                  filteredLetters.map((letter) => {
                    const id = String(letterIdOf(letter));
                    const currentRelatedLetterId =
                      relatedPickTarget === "insurance" ? insuranceForm.relatedLetterId : form.relatedLetterId;
                    const checked = String(currentRelatedLetterId || "") === id;
                    const no = letterNoOf(letter) || id;
                    const secretariatNo = secretariatNoOf(letter);

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          if (relatedPickTarget === "insurance") {
                            setInsuranceField("relatedLetterId", checked ? "" : id);
                          } else {
                            setField("relatedLetterId", checked ? "" : id);
                          }
                          setRelatedPickOpen(false);
                        }}
                        className="w-full text-right px-3 py-2 rounded-xl transition flex items-center justify-between gap-3 hover:bg-black/[0.04] dark:hover:bg-white/10"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{toFaDigits(no)}</span>
                            {secretariatNo ? (
                              <span className="text-xs text-black/55 dark:text-neutral-400">
                                شماره ثبت دبیرخانه: {toFaDigits(secretariatNo)}
                              </span>
                            ) : null}
                            {letterDateOf(letter) ? (
                              <span className="text-xs text-black/45 dark:text-neutral-500">{toFaDigits(letterDateOf(letter))}</span>
                            ) : null}
                          </div>
                          <div className="mt-1 truncate text-xs text-black/60 dark:text-neutral-400">
                            {subjectOf(letter) || orgOf(letter) || "بدون شرح"}
                          </div>
                        </div>

                        <div className="h-5 w-5 rounded-md border border-black/15 grid place-items-center shrink-0 dark:border-neutral-700">
                          {checked ? <span className="text-xs">✓</span> : null}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-4 text-sm text-black/55 dark:text-neutral-400">موردی پیدا نشد.</div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {tagPickOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999]" dir="rtl">
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setTagPickOpen(false)} />

            <div className="absolute inset-0 p-3 md:p-6 flex items-center justify-center">
              <div className="w-[min(780px,calc(100vw-20px))] h-[min(72vh,680px)] rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl overflow-hidden dark:border-white/10 dark:bg-neutral-900 dark:text-white">
                <div className="h-full flex flex-col">
                  <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-black/10 dark:border-white/10">
                    <div className="font-bold text-sm">انتخاب برچسب</div>
                    <button
                      type="button"
                      onClick={() => setTagPickOpen(false)}
                      className="h-10 w-10 rounded-xl bg-white text-black ring-1 ring-black/15 transition flex items-center justify-center hover:bg-black/5 dark:ring-white/20 dark:hover:bg-white/90"
                      aria-label="بستن"
                      title="بستن"
                    >
                      <img src="/images/icons/bastan.svg" alt="" className="w-5 h-5 brightness-0" />
                    </button>
                  </div>

                  <div className="px-4 pt-3 space-y-3">
                    {Array.isArray(tagCategories) && tagCategories.length ? (
                      <div>
                        <div className={labelCls}>دسته‌بندی‌ها</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setTagPickCategoryId("")}
                            className={(tagPickCategoryId ? chipCls : selectedTagChipCls) + " shrink-0"}
                          >
                            همه
                          </button>

                          {tagCategories.map((category) => {
                            const id = String(category?.id ?? "");
                            const label = pickFirst(category?.label, category?.name, category?.title);
                            const active = tagPickCategoryId === id;
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => setTagPickCategoryId(active ? "" : id)}
                                className={(active ? selectedTagChipCls : chipCls) + " shrink-0"}
                                title={label}
                              >
                                <span className="max-w-[220px] truncate">{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <div className={labelCls}>جستجو</div>
                      <input
                        value={tagPickSearch}
                        onChange={(e) => setTagPickSearch(e.target.value)}
                        className={inputCls}
                        type="text"
                        placeholder="جستجو در برچسب‌ها..."
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="px-4 py-3 flex-1 overflow-auto">
                    {(() => {
                      const q = String(tagPickSearch || "").trim().toLowerCase();
                      const filtered = (Array.isArray(tags) ? tags : []).filter((tag) => {
                        const label = tagLabelOf(tag).toLowerCase();
                        const categoryId = String(tag?.category_id ?? tag?.categoryId ?? "");
                        if (tagPickCategoryId && categoryId !== String(tagPickCategoryId)) return false;
                        if (q && !label.includes(q)) return false;
                        return true;
                      });

                      if (!filtered.length) {
                        return <div className="py-10 text-center text-sm text-neutral-500 dark:text-white/50">چیزی پیدا نشد.</div>;
                      }

                      return (
                        <div className="flex flex-wrap gap-2">
                          {filtered.map((tag) => {
                            const id = String(tag?.id ?? "");
                            const label = tagLabelOf(tag);
                            const active = tagPickDraftIds.some((item) => String(item) === id);

                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => togglePickDraft(id)}
                                className={(active ? selectedTagChipCls : chipCls) + " shrink-0"}
                                title={label}
                              >
                                <span className="max-w-[240px] truncate">{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="px-4 py-3 border-t border-black/10 dark:border-white/10 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={applyPickedTags}
                      className="h-10 w-10 rounded-xl bg-black text-white ring-1 ring-black/15 transition flex items-center justify-center hover:bg-black/90 dark:ring-white/10"
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
    </div>
  );
}
