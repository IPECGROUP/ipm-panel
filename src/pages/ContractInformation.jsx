// قراردادها
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

const CONTRACT_DRAFT_STORAGE_KEY = "ipm_contract_information_form_draft_v1";
const CONTRACT_DRAFT_SERVER_KEY = "contract_information_form";
const CONTRACT_DRAFT_SAVE_DELAY_MS = 3000;
const CONTRACT_DRAFT_IGNORED_KEYS = new Set([
  "id",
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
  "lastSavedSection",
  "last_saved_section",
  "currencyLabel",
  "currency_label",
  "sourceLabel",
  "source_label",
  "customName",
]);

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
  { key: "transport", label: "حمل و نقل" },
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

const SOCIAL_INSURANCE_CLEARANCE_STATUS = "مفاصا حساب دریافت شده و خاتمه قرارداد";
const SOCIAL_INSURANCE_OLD_CLEARANCE_STATUS = "مفاصا حساب";

const SOCIAL_INSURANCE_STATUS_OPTIONS = [
  "قرارداد درحال انجام است",
  "در انتظار نتیجه رسیدگی شعبه به نام مبانی محاسباتی",
  "اعتراض ثبت شده در انتظار جلسه هیات",
  "در انتظار جلسه رای هیات",
  "درحال صدور مفاصا حساب",
  "خاتمه قرارداد",
  SOCIAL_INSURANCE_CLEARANCE_STATUS,
];

function isSocialInsuranceClearanceStatus(value) {
  return [SOCIAL_INSURANCE_CLEARANCE_STATUS, SOCIAL_INSURANCE_OLD_CLEARANCE_STATUS].includes(String(value || ""));
}

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
  subContractNo: "",
  parentContractId: "",
  relatedLetterId: "",
  relatedLetterIds: [],
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
  if (!payload || typeof payload !== "object") return [];

  for (const key of ["items", "data", "contracts", "projects", "letters", "rows", "results"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nested = asArray(value);
      if (nested.length) return nested;
    }
  }

  return [];
}

function normalizeIdList(values) {
  const list = (() => {
    if (Array.isArray(values)) return values;
    if (typeof values === "string" && values.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(values);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return values ? [values] : [];
  })();

  return Array.from(
    new Set(
      list
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    )
  );
}

function mergeContractRowsById(...groups) {
  const map = new Map();
  groups.flat().forEach((row) => {
    if (row?.id) map.set(String(row.id), row);
  });
  return Array.from(map.values()).sort((a, b) => {
    const at = Date.parse(a?.updatedAt || a?.createdAt || "") || 0;
    const bt = Date.parse(b?.updatedAt || b?.createdAt || "") || 0;
    return bt - at;
  });
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
  const rawBranchStatus = String(insurance?.branchStatus ?? insurance?.branch_status ?? "");
  const rawLastStatus = String(insurance?.lastStatus ?? insurance?.last_status ?? "");
  const branchLooksLikeOldStatus = !rawLastStatus && SOCIAL_INSURANCE_STATUS_OPTIONS.includes(rawBranchStatus);
  return {
    ...(EMPTY_FORM.insurance || {}),
    ...(insurance || {}),
    contractRow: String(insurance?.contractRow ?? insurance?.contract_row ?? ""),
    branchStatus: branchLooksLikeOldStatus ? "" : rawBranchStatus,
    finalGrossPerformance: String(insurance?.finalGrossPerformance ?? insurance?.final_gross_performance ?? ""),
    clearanceAmount: String(insurance?.clearanceAmount ?? insurance?.clearance_amount ?? ""),
    clearanceFiles: Array.isArray(insurance?.clearanceFiles) ? insurance.clearanceFiles : [],
    relatedLetterId: String(insurance?.relatedLetterId ?? insurance?.related_letter_id ?? ""),
    lastStatus: rawLastStatus || (branchLooksLikeOldStatus ? rawBranchStatus : ""),
  };
}

function contractCompanyForRow(row = {}) {
  const general = row?.general || {};
  if (row?.documentType === "sub") return pickFirst(general.executor);
  return pickFirst(general.employerAssignor, general.mainEmployer);
}

function contractCompanyRoleForRow(row = {}) {
  return row?.documentType === "sub" ? "مجری" : "کارفرما";
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

function hasFinancialAmount(value) {
  const text = toEnDigits(value).replace(/[^\d.-]/g, "").trim();
  return Boolean(text && text !== "-" && text !== "." && text !== "-.");
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

function letterKindOf(letter) {
  return pickFirst(letter?.kind, letter?.type, letter?.letter_kind, letter?.letterKind);
}

function letterKindLabelOf(letter) {
  const raw = String(letterKindOf(letter) || "").trim();
  const normalized = raw.toLowerCase();
  if (!raw) return "";
  if (normalized.includes("incoming") || normalized === "in" || normalized === "i" || raw.includes("وارده")) return "وارده";
  if (normalized.includes("outgoing") || normalized.includes("out") || normalized === "o" || raw.includes("صادر")) return "صادره";
  if (normalized.includes("internal") || normalized.includes("dakheli") || raw.includes("داخلی")) return "داخلی";
  return raw;
}

function letterDescriptionOf(letter) {
  return pickFirst(letter?.description, letter?.body, letter?.text, letter?.summary, letter?.note, letter?.notes);
}

function letterSecretariatDateOf(letter) {
  return pickFirst(letter?.secretariat_date, letter?.secretariatDate);
}

function letterReceiverOf(letter) {
  return pickFirst(letter?.receiver_name, letter?.receiverName, letter?.receiver, letter?.to_name, letter?.toName);
}

function letterSenderOf(letter) {
  return pickFirst(letter?.sender_name, letter?.senderName, letter?.sender, letter?.from_name, letter?.fromName);
}

function letterAttachmentsOf(letter) {
  const raw =
    letter?.attachments ??
    letter?.attachment ??
    letter?.files ??
    letter?.files_json ??
    letter?.attachments_json ??
    letter?.attachment_json ??
    letter?.attachmentsJson;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (raw && typeof raw === "object" && Array.isArray(raw.items)) return raw.items;
  return [];
}

function letterAttachmentUrlOf(file) {
  const fileId = file?.file_id ?? file?.fileId ?? file?.serverId;
  if (fileId) return `/api/files/${encodeURIComponent(String(fileId))}`;
  return String(file?.url ?? file?.href ?? file?.path ?? file?.public_url ?? file?.publicUrl ?? file?.file_url ?? file?.fileUrl ?? "");
}

function letterAttachmentNameOf(file) {
  return String(file?.name ?? file?.filename ?? file?.file_name ?? file?.fileName ?? file?.original_name ?? file?.originalName ?? "فایل");
}

function letterAttachmentTypeOf(file) {
  return String(file?.type ?? file?.mime ?? file?.mime_type ?? file?.mimeType ?? "");
}

function resolvePublicUrl(url) {
  const text = String(url || "").trim().replace(/\\/g, "/");
  if (!text) return "";
  if (/^(https?:|blob:|data:)/i.test(text)) return text;
  if (text.startsWith("//")) return `${window.location.protocol}${text}`;
  if (text.startsWith("/")) return text;
  if (text.startsWith("public/")) return `/${text.replace(/^public\//, "")}`;
  return `/${text.replace(/^\/+/, "")}`;
}

function isPreviewPdf(url, name = "", type = "") {
  const rawType = String(type || "").toLowerCase();
  return rawType.includes("pdf") || /\.pdf(\?|#|$)/i.test(String(url || "")) || /\.pdf$/i.test(String(name || ""));
}

function isPreviewImage(url, name = "", type = "") {
  const rawType = String(type || "").toLowerCase();
  return rawType.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(String(url || "")) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(name || ""));
}

function tagLabelOf(tag) {
  return pickFirst(tag?.label, tag?.name, tag?.title, tag?.text, tag?.caption, tag?.id);
}

function documentTypeLabel(type) {
  return CONTRACT_DOCUMENT_TYPES.find((item) => item.id === type)?.label || "اصلی";
}

function resolveContractDocumentType(item = {}) {
  const parentContractId = String(item.parentContractId ?? item.parent_contract_id ?? "").trim();
  const subContractNo = String(item.subContractNo ?? item.sub_contract_no ?? "").trim();
  const type = String(item.documentType ?? item.document_type ?? "main");
  if (parentContractId && subContractNo) return "sub";
  if (type === "main" && parentContractId) return subContractNo ? "sub" : "appendix";
  return CONTRACT_DOCUMENT_TYPES.some((entry) => entry.id === type) ? type : "main";
}

function contractNoForRow(row, rowById) {
  if (row?.documentType === "main") return row?.contractNo || "";
  if (row?.documentType === "sub") return row?.subContractNo || row?.contractNo || "";
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
  const documentType = resolveContractDocumentType(item);
  return {
    ...base,
    ...item,
    id: String(item.id ?? ""),
    projectId: String(item.projectId ?? item.project_id ?? ""),
    documentType,
    contractNo: documentType === "main" ? String(item.contractNo ?? item.contract_no ?? "") : "",
    subContractNo: documentType === "sub" ? String(item.subContractNo ?? item.sub_contract_no ?? "") : "",
    parentContractId: documentType === "main" ? "" : String(item.parentContractId ?? item.parent_contract_id ?? ""),
    relatedLetterId: String(item.relatedLetterId ?? item.related_letter_id ?? ""),
    relatedLetterIds: normalizeIdList(item.relatedLetterIds ?? item.related_letter_ids ?? (item.relatedLetterId || item.related_letter_id ? [item.relatedLetterId ?? item.related_letter_id] : [])),
    general: (() => {
      const general = { ...base.general, ...(item.general && typeof item.general === "object" ? item.general : {}) };
      const rest = { ...general };
      delete rest.contractTitle;
      delete rest.contract_title;
      return rest;
    })(),
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

function hasMeaningfulContractDraftValue(value, key = "") {
  if (CONTRACT_DRAFT_IGNORED_KEYS.has(key)) return false;

  if (key === "documentType") {
    return String(value || "main") !== "main";
  }

  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return value === true;
  if (Array.isArray(value)) return value.some((item) => hasMeaningfulContractDraftValue(item));
  if (value && typeof value === "object") {
    return Object.entries(value).some(([childKey, childValue]) => hasMeaningfulContractDraftValue(childValue, childKey));
  }

  return false;
}

function hasContractDraftContent(form) {
  const item = form && typeof form === "object" ? form : {};
  return hasMeaningfulContractDraftValue({
    projectId: item.projectId,
    documentType: item.documentType,
    contractNo: item.contractNo,
    subContractNo: item.subContractNo,
    parentContractId: item.parentContractId,
    relatedLetterId: item.relatedLetterId,
    relatedLetterIds: item.relatedLetterIds,
    general: item.general,
    calendar: item.calendar,
    technical: item.technical,
    financial: item.financial,
    insurance: item.insurance,
  });
}

function contractDraftPayloadFromForm(form, lastSavedSection = "") {
  const payload = normalizeContractRow({
    ...(form || {}),
    lastSavedSection,
  });
  return {
    ...payload,
    updatedAt: new Date().toISOString(),
  };
}

function contractDraftSignature(payload) {
  const item = normalizeContractRow(payload || {});
  return JSON.stringify({
    ...item,
    createdAt: "",
    updatedAt: "",
  });
}

function getContractDraftKey() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const identity = String(user?.id ?? user?.username ?? user?.email ?? "").trim();
    if (identity) return `${CONTRACT_DRAFT_SERVER_KEY}:${identity}`;
  } catch {
    // Fall back to the shared key when user identity is not available.
  }
  return CONTRACT_DRAFT_SERVER_KEY;
}

function readLocalContractDraft() {
  try {
    const raw = localStorage.getItem(CONTRACT_DRAFT_STORAGE_KEY);
    localStorage.removeItem(CONTRACT_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const payload = parsed?.payload && typeof parsed.payload === "object" ? parsed.payload : parsed;
    if (!hasContractDraftContent(payload)) return null;
    return {
      draftKey: String(parsed?.draftKey || getContractDraftKey()),
      contractId: String(parsed?.contractId || payload?.id || ""),
      payload: normalizeContractRow(payload),
      lastSavedSection: String(parsed?.lastSavedSection || payload?.lastSavedSection || ""),
      savedAt: String(parsed?.savedAt || ""),
    };
  } catch {
    try {
      localStorage.removeItem(CONTRACT_DRAFT_STORAGE_KEY);
    } catch {
    }
  }
  return null;
}

function removeLocalContractDraft() {
  try {
    localStorage.removeItem(CONTRACT_DRAFT_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
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

async function fetchContractRows() {
  const payloads = await Promise.all([
    fetchJson("/contracts"),
    fetchJson("/contracts?documentType=sub").catch(() => ({ items: [] })),
    fetchJson("/contracts?documentType=appendix").catch(() => ({ items: [] })),
  ]);

  return mergeContractRowsById(
    ...payloads.map((payload) =>
      asArray(payload)
        .map(normalizeContractRow)
        .filter((row) => row.id)
    )
  );
}

async function uploadContractFiles(fileList) {
  const files = Array.from(fileList || []).filter(Boolean);
  if (!files.length) return [];
  const base = (window.API_URL || "/api").replace(/\/+$/, "");
  const fd = new FormData();
  files.forEach((file) => fd.append("files", file));

  const res = await fetch(`${base}/uploads/contracts`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!res.ok) throw new Error(data?.error || data?.message || "upload_failed");
  return asArray(data).map((file) => ({
    id: String(file?.id ?? file?.serverId ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`),
    serverId: file?.serverId ?? file?.id ?? null,
    name: String(file?.name || "فایل"),
    size: Number(file?.size || 0),
    type: String(file?.type || ""),
    url: String(file?.url || ""),
    addedAt: String(file?.addedAt || new Date().toISOString()),
  }));
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
  const [contractsPage, setContractsPage] = React.useState(0);
  const [contractsRowsPerPage, setContractsRowsPerPage] = React.useState(10);
  const [formOpen, setFormOpen] = React.useState(false);
  const [form, setForm] = React.useState(() => emptyForm());
  const [activeContractTab, setActiveContractTab] = React.useState(CONTRACT_SECTION_TABS[0].id);
  const [expandedContractIds, setExpandedContractIds] = React.useState(() => new Set());
  const [previewContractId, setPreviewContractId] = React.useState("");
  const [previewFileIndex, setPreviewFileIndex] = React.useState(0);
  const [relatedLetterPreviewId, setRelatedLetterPreviewId] = React.useState("");
  const [finalSaveStatus, setFinalSaveStatus] = React.useState({ sectionId: "", message: "" });
  const [filterQuery, setFilterQuery] = React.useState("");
  const [filterProjectId, setFilterProjectId] = React.useState("");
  const [filterDocType, setFilterDocType] = React.useState("");
  const [relatedPickOpen, setRelatedPickOpen] = React.useState(false);
  const [relatedPickQuery, setRelatedPickQuery] = React.useState("");
  const [relatedPickTarget, setRelatedPickTarget] = React.useState("contract");
  const [relatedSummaryOpen, setRelatedSummaryOpen] = React.useState(false);
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
  const draftSaveTimerRef = React.useRef(null);
  const draftStatusTimerRef = React.useRef(null);
  const lastDraftSignatureRef = React.useRef("");
  const finalSavedDraftSignatureRef = React.useRef("");
  const editOriginalDocumentTypeRef = React.useRef("");
  const documentTypeChangedFromEditRef = React.useRef(false);
  const finalSaveStatusTimerRef = React.useRef(null);
  const [draftSaveStatus, setDraftSaveStatus] = React.useState({ sectionId: "", state: "" });
  const [finalSavingSection, setFinalSavingSection] = React.useState("");

  React.useEffect(() => {
    let alive = true;

    (async () => {
      setRowsLoading(true);
      setRowsError("");
      try {
        const list = await fetchContractRows();
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

  const clearDraftSaveTimer = React.useCallback(() => {
    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
      draftSaveTimerRef.current = null;
    }
  }, []);

  const markDraftSaveStatus = React.useCallback((sectionId, state) => {
    if (draftStatusTimerRef.current) {
      clearTimeout(draftStatusTimerRef.current);
      draftStatusTimerRef.current = null;
    }

    setDraftSaveStatus({ sectionId: String(sectionId || ""), state });

    if (state === "saved" || state === "error") {
      draftStatusTimerRef.current = setTimeout(() => {
        setDraftSaveStatus((prev) => (prev.sectionId === String(sectionId || "") ? { sectionId: "", state: "" } : prev));
        draftStatusTimerRef.current = null;
      }, 2600);
    }
  }, []);

  const loadSavedContractDraft = React.useCallback(async () => {
    const localDraft = readLocalContractDraft();
    if (localDraft) return localDraft;

    try {
      const draftKey = getContractDraftKey();
      const data = await fetchJson(`/contracts/draft?draftKey=${encodeURIComponent(draftKey)}`);
      const item = data?.item;
      const payload = item?.payload && typeof item.payload === "object" ? item.payload : null;
      if (!payload || !hasContractDraftContent(payload)) return null;

      const draft = {
        draftKey: String(item?.draftKey || draftKey),
        contractId: String(item?.contractId || payload?.id || ""),
        payload: normalizeContractRow(payload),
        lastSavedSection: String(item?.lastSavedSection || payload?.lastSavedSection || ""),
        savedAt: String(item?.updatedAt || ""),
      };
      return draft;
    } catch {
      return null;
    }
  }, []);

  const deleteContractDraft = React.useCallback(async () => {
    clearDraftSaveTimer();
    removeLocalContractDraft();
    setDraftSaveStatus({ sectionId: "", state: "" });
    try {
      await fetchJson(`/contracts/draft?draftKey=${encodeURIComponent(getContractDraftKey())}`, { method: "DELETE" });
    } catch {
      // Draft cleanup should never block a successful final save.
    }
  }, [clearDraftSaveTimer]);

  const saveContractDraft = React.useCallback(
    async ({ sectionId = activeContractTab, immediate = false } = {}) => {
      const payload = contractDraftPayloadFromForm(form, sectionId);

      if (!hasContractDraftContent(payload)) {
        clearDraftSaveTimer();
        removeLocalContractDraft();
        lastDraftSignatureRef.current = "";
        setDraftSaveStatus({ sectionId: "", state: "" });
        return true;
      }

      const signature = contractDraftSignature(payload);
      if (!immediate && (signature === lastDraftSignatureRef.current || signature === finalSavedDraftSignatureRef.current)) {
        return true;
      }

      markDraftSaveStatus(sectionId, "saving");
      clearDraftSaveTimer();
      lastDraftSignatureRef.current = signature;

      try {
        await fetchJson("/contracts/draft", {
          method: "POST",
          body: JSON.stringify({
            draftKey: getContractDraftKey(),
            contractId: payload.id || "",
            payload,
            lastSavedSection: sectionId,
          }),
        });
        markDraftSaveStatus(sectionId, "saved");
        return true;
      } catch (error) {
        console.error("contract_draft_save_failed", error);
        markDraftSaveStatus(sectionId, "error");
        return false;
      }
    },
    [activeContractTab, clearDraftSaveTimer, form, markDraftSaveStatus]
  );

  React.useEffect(() => {
    if (!formOpen) {
      clearDraftSaveTimer();
      return;
    }

    const payload = contractDraftPayloadFromForm(form, activeContractTab);
    if (!hasContractDraftContent(payload)) {
      clearDraftSaveTimer();
      removeLocalContractDraft();
      lastDraftSignatureRef.current = "";
      return;
    }

    const signature = contractDraftSignature(payload);
    if (signature === lastDraftSignatureRef.current || signature === finalSavedDraftSignatureRef.current) return;

    clearDraftSaveTimer();
    draftSaveTimerRef.current = setTimeout(() => {
      void saveContractDraft({ sectionId: activeContractTab });
    }, CONTRACT_DRAFT_SAVE_DELAY_MS);

    return clearDraftSaveTimer;
  }, [activeContractTab, clearDraftSaveTimer, form, formOpen, saveContractDraft]);

  React.useEffect(
    () => () => {
      clearDraftSaveTimer();
      if (draftStatusTimerRef.current) clearTimeout(draftStatusTimerRef.current);
      if (finalSaveStatusTimerRef.current) clearTimeout(finalSaveStatusTimerRef.current);
    },
    [clearDraftSaveTimer]
  );

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

  const childRowsByParentId = React.useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const parentId = String(row?.parentContractId || "");
      if (!parentId) return;
      const list = map.get(parentId) || [];
      list.push(row);
      map.set(parentId, list);
    });
    return map;
  }, [rows]);

  const letterById = React.useMemo(() => {
    const map = new Map();
    letters.forEach((letter) => map.set(String(letterIdOf(letter)), letter));
    return map;
  }, [letters]);

  const projectContractOptions = React.useMemo(() => {
    const projectId = String(form.projectId || "");
    const currentId = String(form.id || "");
    if (!projectId) return [];
    return rows
      .filter((row) => {
        if (!row?.id || String(row.id) === currentId) return false;
        if (String(row.projectId || "") !== projectId) return false;
        return row.documentType === "main" && Boolean(row.contractNo);
      })
      .sort((a, b) => {
        const noCompare = contractNoForRow(a, rowById).localeCompare(contractNoForRow(b, rowById), "fa", { numeric: true });
        if (noCompare) return noCompare;
        return documentTypeLabel(a.documentType).localeCompare(documentTypeLabel(b.documentType), "fa");
      });
  }, [form.id, form.projectId, rowById, rows]);
  const existingMainContractForProject = React.useMemo(() => {
    const projectId = String(form.projectId || "");
    const currentId = String(form.id || "");
    if (!projectId) return null;
    return (
      rows.find(
        (row) =>
          row?.documentType === "main" &&
          String(row.projectId || "") === projectId &&
          String(row.id || "") !== currentId
      ) || null
    );
  }, [form.id, form.projectId, rows]);
  const projectAlreadyHasMainContract = Boolean(existingMainContractForProject);
  const mainContractBlockedForProject = form.documentType === "main" && projectAlreadyHasMainContract;

  const insuranceForm = React.useMemo(() => normalizeInsurance(form.insurance || {}), [form.insurance]);
  const selectedRelatedLetterIds = React.useMemo(
    () => normalizeIdList(form.relatedLetterIds?.length ? form.relatedLetterIds : form.relatedLetterId ? [form.relatedLetterId] : []),
    [form.relatedLetterId, form.relatedLetterIds]
  );
  const selectedRelatedLetters = React.useMemo(
    () => selectedRelatedLetterIds.map((id) => letterById.get(String(id))).filter(Boolean),
    [letterById, selectedRelatedLetterIds]
  );
  const selectedRelatedLetterSummaryItems = React.useMemo(
    () =>
      selectedRelatedLetters.map((letter) => ({
        id: String(letterIdOf(letter)),
        label: toFaDigits(secretariatNoOf(letter) || letterNoOf(letter) || letterIdOf(letter)),
      })),
    [selectedRelatedLetters]
  );
  React.useEffect(() => {
    if (selectedRelatedLetterSummaryItems.length <= 2) setRelatedSummaryOpen(false);
  }, [selectedRelatedLetterSummaryItems.length]);
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
    setContractsPage(0);
  }, [filterDocType, filterProjectId, filterQuery, contractsRowsPerPage]);

  const contractsDisplayRows = React.useMemo(() => {
    const filteredIds = new Set(filteredRows.map((row) => String(row.id)));
    const usedIds = new Set();
    const list = [];

    filteredRows.forEach((row) => {
      const id = String(row.id || "");
      if (!id || usedIds.has(id)) return;
      const parentId = String(row.parentContractId || "");
      if (parentId && filteredIds.has(parentId)) return;

      list.push({ ...row, __depth: parentId ? 1 : 0 });
      usedIds.add(id);

      const children = childRowsByParentId.get(id) || [];
      if (expandedContractIds.has(id)) {
        children.forEach((child) => {
          const childId = String(child.id || "");
          if (!childId || usedIds.has(childId)) return;
          list.push({ ...child, __depth: 1 });
          usedIds.add(childId);
        });
      }
    });

    return list;
  }, [childRowsByParentId, expandedContractIds, filteredRows]);

  const contractsTotal = contractsDisplayRows.length;
  const contractsPageCount = Math.max(1, Math.ceil(contractsTotal / Math.max(1, contractsRowsPerPage)));
  const safeContractsPage = Math.min(Math.max(0, contractsPage), contractsPageCount - 1);
  const contractsStartIdx = safeContractsPage * contractsRowsPerPage;
  const contractsEndIdx = Math.min(contractsTotal, contractsStartIdx + contractsRowsPerPage);
  const contractsPageRows = contractsDisplayRows.slice(contractsStartIdx, contractsEndIdx);

  React.useEffect(() => {
    if (contractsPage !== safeContractsPage) setContractsPage(safeContractsPage);
  }, [contractsPage, safeContractsPage]);

  React.useEffect(() => {
    const parentIds = new Set(
      rows
        .map((row) => String(row?.parentContractId || ""))
        .filter(Boolean)
    );
    if (!parentIds.size) return;

    setExpandedContractIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      parentIds.forEach((id) => {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [rows]);

  const toggleContractChildren = (id) => {
    const sid = String(id || "");
    if (!sid) return;
    setExpandedContractIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const showFinalSaveMessage = (sectionId, message) => {
    if (finalSaveStatusTimerRef.current) {
      clearTimeout(finalSaveStatusTimerRef.current);
      finalSaveStatusTimerRef.current = null;
    }
    setFinalSaveStatus({ sectionId: String(sectionId || ""), message: String(message || "") });
    finalSaveStatusTimerRef.current = setTimeout(() => {
      setFinalSaveStatus((prev) => (prev.sectionId === String(sectionId || "") ? { sectionId: "", message: "" } : prev));
      finalSaveStatusTimerRef.current = null;
    }, 3200);
  };

  const setField = (field, value) => {
    if (field === "documentType" && String(form.documentType || "") !== String(value || "")) {
      const currentId = String(form.id || "");
      const isEditingExisting = currentId && rowById.has(currentId);
      void deleteContractDraft();
      removeLocalContractDraft();
      lastDraftSignatureRef.current = "";
      finalSavedDraftSignatureRef.current = "";
      documentTypeChangedFromEditRef.current = Boolean(isEditingExisting);
      editOriginalDocumentTypeRef.current = "";
      setFinalSaveStatus({ sectionId: "", message: "" });
      setRelatedPickQuery("");
      setRelatedPickTarget("contract");
      setActiveContractTab(value === "appendix" ? "calendar" : CONTRACT_SECTION_TABS[0].id);
      const reset = emptyForm();
      setForm({
        ...reset,
        id: "",
        projectId: String(form.projectId || ""),
        documentType: value,
        general: {
          ...reset.general,
          employerAssignor: value === "sub" ? FIXED_SUB_ASSIGNOR : "",
        },
      });
      return;
    }

    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "projectId" && prev.documentType !== "main" && prev.parentContractId) {
        const parent = rowById.get(String(prev.parentContractId));
        if (parent && String(parent.projectId) !== String(value || "")) {
          next.parentContractId = "";
        }
      }
      if (field === "parentContractId" && prev.documentType !== "main") {
        const parent = rowById.get(String(value || ""));
        if (parent) {
          next.projectId = String(parent.projectId || "");
        }
      }
      if (field === "documentType") {
        const currentId = String(prev.id || "");
        const isEditingExisting = currentId && rowById.has(currentId);
        if (isEditingExisting && String(prev.documentType || "") !== String(value || "")) {
          next.id = "";
          next.lastSavedSection = "";
          documentTypeChangedFromEditRef.current = true;
        }
        next.contractNo = "";
        next.subContractNo = "";
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
    setRelatedSummaryOpen(false);
    setRelatedPickOpen(true);
  };

  const removeRelatedLetter = (id) => {
    const sid = String(id || "");
    if (!sid) return;
    setForm((prev) => {
      const current = normalizeIdList(prev.relatedLetterIds?.length ? prev.relatedLetterIds : prev.relatedLetterId ? [prev.relatedLetterId] : []);
      const nextIds = current.filter((item) => String(item) !== sid);
      return {
        ...prev,
        relatedLetterIds: nextIds,
        relatedLetterId: nextIds[0] || "",
      };
    });
    setRelatedLetterPreviewId((current) => (String(current || "") === sid ? "" : current));
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

  const addInsuranceClearanceFiles = async (fileList) => {
    let incoming = [];
    try {
      incoming = await uploadContractFiles(fileList);
    } catch (error) {
      alert(error?.message || "خطا در بارگذاری فایل");
      return;
    }
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

  const addFinancialBreakdownFiles = async (fileList) => {
    let incoming = [];
    try {
      incoming = await uploadContractFiles(fileList);
    } catch (error) {
      alert(error?.message || "خطا در بارگذاری فایل");
      return;
    }
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
      const missing = [];
      if (!String(draft.name || "").trim()) missing.push("نام تضمین");
      if (!String(draft.type || "").trim()) missing.push("نوع");
      if (!String(draft.bankNo || "").trim()) missing.push("عهده بانک/شماره");
      if (!hasFinancialAmount(draft.amount)) missing.push("مبلغ");
      if (!String(draft.currencyId || "").trim()) missing.push("ارز");
      if (missing.length) {
        alert(`فیلدهای تضمین اجباری هستند: ${missing.join("، ")}`);
        return prev;
      }

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
    const draft = makeGuaranteeRow(editingGuaranteeDraft || {});
    const missing = [];
    if (!String(draft.name || "").trim()) missing.push("نام تضمین");
    if (!String(draft.type || "").trim()) missing.push("نوع");
    if (!String(draft.bankNo || "").trim()) missing.push("عهده بانک/شماره");
    if (!hasFinancialAmount(draft.amount)) missing.push("مبلغ");
    if (!String(draft.currencyId || "").trim()) missing.push("ارز");
    if (missing.length) {
      alert(`فیلدهای تضمین اجباری هستند: ${missing.join("، ")}`);
      return;
    }
    setForm((prev) => {
      const financial = normalizeFinancial(prev.financial || {});
      return {
        ...prev,
        financial: {
          ...financial,
          guarantees: financial.guarantees.map((row) =>
            String(row.id) === id ? makeGuaranteeRow({ ...draft, id }) : row
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

  const openFreshForm = async () => {
    const draft = await loadSavedContractDraft();
    const next = draft?.payload ? normalizeContractRow(draft.payload) : emptyForm();
    const draftSection = String(draft?.lastSavedSection || next.lastSavedSection || "");
    const nextTab = CONTRACT_SECTION_TABS.some((tab) => tab.id === draftSection) ? draftSection : CONTRACT_SECTION_TABS[0].id;

    setForm(next);
    setRelatedPickQuery("");
    setRelatedPickTarget("contract");
    setActiveContractTab(next.documentType === "appendix" && ["general", "insurance"].includes(nextTab) ? "calendar" : nextTab);
    setFormOpen(true);
    const signature = draft?.payload ? contractDraftSignature(contractDraftPayloadFromForm(next, nextTab)) : "";
    lastDraftSignatureRef.current = signature;
    finalSavedDraftSignatureRef.current = "";
    editOriginalDocumentTypeRef.current = "";
    documentTypeChangedFromEditRef.current = false;
  };

  const openEditForm = (row) => {
    const next = normalizeContractRow(row);
    setForm(next);
    setRelatedPickQuery("");
    setRelatedPickTarget("contract");
    setActiveContractTab(next.documentType === "appendix" ? "calendar" : CONTRACT_SECTION_TABS[0].id);
    setFormOpen(true);
    lastDraftSignatureRef.current = contractDraftSignature(contractDraftPayloadFromForm(next, next.lastSavedSection || ""));
    finalSavedDraftSignatureRef.current = "";
    editOriginalDocumentTypeRef.current = String(next.documentType || "");
    documentTypeChangedFromEditRef.current = false;
    window.requestAnimationFrame(() => {
      document.querySelector(".ipm-contract-information")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const closeForm = () => {
    clearDraftSaveTimer();
    setForm(emptyForm());
    setRelatedPickQuery("");
    setRelatedPickTarget("contract");
    setActiveContractTab(CONTRACT_SECTION_TABS[0].id);
    setFormOpen(false);
    editOriginalDocumentTypeRef.current = "";
    documentTypeChangedFromEditRef.current = false;
  };

  const saveContractSection = async (sectionId = activeContractTab) => {
    if (sectionId !== "financial") {
      await saveContractDraft({ sectionId, immediate: true });
      return;
    }

    await saveContractDraft({ sectionId, immediate: true });

    const formId = String(form.id || "").trim();
    const isEditingSavedContract = formId && rowById.has(formId);
    const saveAsNewFromDocumentTypeChange = documentTypeChangedFromEditRef.current;

    const projectId = String(form.projectId || "").trim();
    const rawDocumentType = String(form.documentType || "main");
    const relatedLetterIds = normalizeIdList(form.relatedLetterIds?.length ? form.relatedLetterIds : form.relatedLetterId ? [form.relatedLetterId] : []);
    const relatedLetterId = String(relatedLetterIds[0] || "").trim();
    const contractNo = String(form.contractNo || "").trim();
    const subContractNo = String(form.subContractNo || "").trim();
    const parentContractId = String(form.parentContractId || "").trim();
    const documentType = resolveContractDocumentType({
      ...form,
      documentType: rawDocumentType,
      parentContractId,
      subContractNo,
    });

    if (!projectId) {
      alert("مرکز/پروژه را انتخاب کنید.");
      return;
    }

    if (documentType === "main" && !contractNo) {
      alert("شماره قرارداد را وارد کنید.");
      return;
    }

    if (documentType === "main" && existingMainContractForProject) {
      alert("برای این پروژه قبلا قرارداد اصلی ثبت شده است. برای این پروژه فقط می‌توانید قرارداد فرعی یا الحاقیه ثبت کنید.");
      return;
    }

    if (documentType !== "main" && !parentContractId) {
      alert("شماره قرارداد اصلی را انتخاب کنید.");
      return;
    }

    if (documentType === "sub" && !subContractNo) {
      alert("شماره قرارداد فرعی را وارد کنید.");
      return;
    }

    if (documentType !== "appendix") {
      const missing = [];
      if (!String(form.general?.contractType || "").trim()) missing.push("نوع قرارداد");
      if (!String(form.general?.contractSubject || "").trim()) missing.push("موضوع قرارداد");
      if (documentType === "sub") {
        if (!String(form.general?.executor || "").trim()) missing.push("مجری قرارداد");
      } else {
        if (!String(form.general?.employerAssignor || "").trim()) missing.push("واگذارنده / کارفرما");
      }
      if (missing.length) {
        alert(`فیلدهای اجباری تب عمومی: ${missing.join("، ")}`);
        return;
      }
    }

    {
      const missing = [];
      if (documentType === "appendix") {
        if (!String(form.calendar?.endDate || "").trim()) missing.push("تمدید مدت قرارداد تا تاریخ");
      } else {
        if (!String(form.calendar?.notifyDate || "").trim()) missing.push("تاریخ ابلاغ کار");
        if (!String(form.calendar?.startDate || "").trim()) missing.push("تاریخ شروع قرارداد");
        if (!String(form.calendar?.endDate || "").trim()) missing.push("تاریخ پایان قرارداد");
      }
      if (missing.length) {
        alert(`فیلدهای اجباری تب تقویم قرارداد: ${missing.join("، ")}`);
        return;
      }
    }

    {
      const missing = [];
      if (!String(form.technical?.serviceScope || "").trim()) missing.push("شرح خدمات و محدوده کار");
      if (documentType !== "appendix" && !normalizeIdList(form.technical?.tagIds).length) missing.push("برچسب");
      if (missing.length) {
        alert(`فیلدهای اجباری تب فنی و محدوده کار: ${missing.join("، ")}`);
        return;
      }
    }

    {
      const financial = normalizeFinancial(form.financial || {});
      const missing = [];
      if (documentType !== "appendix") {
        if (!String(financial.paymentTerms || "").trim()) missing.push("شرایط پرداخت");
        if (!String(financial.advancePayment || "").trim()) missing.push("پیش پرداخت");
        if (!String(financial.capitalDeposit || "").trim()) missing.push("سپرده بیمه");
        if (financial.capitalDeposit === "has" && !hasFinancialAmount(financial.capitalDepositAmount)) missing.push("درصد سپرده بیمه");
        if (!String(financial.performanceBond || "").trim()) missing.push("حسن انجام کار");
        if (financial.performanceBond === "has" && !hasFinancialAmount(financial.performanceBondAmount)) missing.push("درصد حسن انجام کار");
      }
      if (missing.length) {
        alert(`فیلدهای اجباری تب مالی و تضامین: ${missing.join("، ")}`);
        return;
      }
      const invalidAmountRow = financial.contractAmounts.find(
        (row) => !hasFinancialAmount(row.amount) || !String(row.currencyId || "").trim() || !String(row.sourceId || "").trim()
      );
      if (invalidAmountRow) {
        alert("در بخش مبلغ قرارداد، مبلغ، ارز و منشأ اجباری هستند.");
        return;
      }
      if (documentType !== "appendix") {
        const invalidGuarantee = financial.guarantees.find(
          (row) =>
            !String(row.name || "").trim() ||
            !String(row.type || "").trim() ||
            !String(row.bankNo || "").trim() ||
            !hasFinancialAmount(row.amount) ||
            !String(row.currencyId || "").trim()
        );
        if (invalidGuarantee) {
          alert("در جدول تضامین، همه فیلدها اجباری هستند.");
          return;
        }
      }
    }

    const id = formId || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const rowPayload = {
      ...form,
      id,
      projectId,
      documentType,
      contractNo: documentType === "main" ? contractNo : "",
      subContractNo: documentType === "sub" ? subContractNo : "",
      parentContractId: documentType === "main" ? "" : parentContractId,
      relatedLetterId,
      relatedLetterIds,
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
      if (sectionId !== "financial") markDraftSaveStatus(sectionId, "saving");
      setFinalSavingSection(sectionId);

      const data = await fetchJson("/contracts", {
        method: "POST",
        body: JSON.stringify(rowPayload),
      });
      const savedFromPost = normalizeContractRow(data?.item || rowPayload);
      let verifiedData = await fetchJson(`/contracts?id=${encodeURIComponent(savedFromPost.id)}`);
      let savedRow = normalizeContractRow(verifiedData?.item || savedFromPost);
      if (documentType === "sub" && savedRow.documentType !== "sub") {
        const forcedSubPayload = {
          ...rowPayload,
          id: savedRow.id || savedFromPost.id || rowPayload.id,
          documentType: "sub",
          document_type: "sub",
          contractNo: "",
          contract_no: "",
          subContractNo,
          sub_contract_no: subContractNo,
          parentContractId,
          parent_contract_id: parentContractId,
        };
        const retryData = await fetchJson("/contracts", {
          method: "POST",
          body: JSON.stringify(forcedSubPayload),
        });
        const retryRow = normalizeContractRow(retryData?.item || forcedSubPayload);
        verifiedData = await fetchJson(`/contracts?id=${encodeURIComponent(retryRow.id)}`);
        savedRow = normalizeContractRow(verifiedData?.item || retryRow);
      }
      if (!savedRow.id || (documentType === "sub" && savedRow.documentType !== "sub")) {
        throw new Error(`contract_save_not_persisted:${documentType}:${savedRow.documentType || "empty"}:${savedRow.id ? "has_id" : "no_id"}`);
      }
      let refreshedRows = await fetchContractRows();
      let savedIsVisibleInServerList = refreshedRows.some((row) => String(row.id) === String(savedRow.id));
      if (!savedIsVisibleInServerList) {
        const focusedPayload = await fetchJson(
          `/contracts?projectId=${encodeURIComponent(projectId)}&documentType=${encodeURIComponent(documentType)}`
        ).catch(() => ({ items: [] }));
        const focusedRows = asArray(focusedPayload)
          .map(normalizeContractRow)
          .filter((row) => row.id);
        refreshedRows = mergeContractRowsById(refreshedRows, focusedRows);
        savedIsVisibleInServerList = refreshedRows.some((row) => String(row.id) === String(savedRow.id));
      }
      if (!savedIsVisibleInServerList) {
        throw new Error("contract_saved_but_not_listed");
      }

      setRows(refreshedRows);
      if (savedRow.parentContractId) {
        setExpandedContractIds((prev) => {
          const parentId = String(savedRow.parentContractId || "");
          if (!parentId || prev.has(parentId)) return prev;
          const next = new Set(prev);
          next.add(parentId);
          return next;
        });
      }
      finalSavedDraftSignatureRef.current = contractDraftSignature(contractDraftPayloadFromForm({ ...form, id: savedRow.id }, sectionId));
      lastDraftSignatureRef.current = finalSavedDraftSignatureRef.current;
      await deleteContractDraft();
      setForm((prev) => ({ ...prev, id: savedRow.id, lastSavedSection: sectionId }));
      showFinalSaveMessage(
        sectionId,
        isEditingSavedContract && !saveAsNewFromDocumentTypeChange
          ? "اطلاعات با موفقیت ویرایش شد"
          : "اطلاعات با موفقیت ثبت شد"
      );
      documentTypeChangedFromEditRef.current = false;
      editOriginalDocumentTypeRef.current = String(savedRow.documentType || "");
      setRowsError("");
    } catch (error) {
      if (sectionId !== "financial") markDraftSaveStatus(sectionId, "error");
      alert(
        error?.message === "main_contract_exists_for_project"
          ? "برای این پروژه قبلا قرارداد اصلی ثبت شده است. برای این پروژه فقط می‌توانید قرارداد فرعی یا الحاقیه ثبت کنید."
          : String(error?.message || "").startsWith("contract_save_not_persisted")
            ? `ثبت قرارداد در سرور تایید نشد. جزئیات: ${String(error?.message || "").replace("contract_save_not_persisted:", "")}`
          : error?.message === "contract_saved_but_not_listed"
            ? "قرارداد در تایید تکی سرور دیده شد، اما در فهرست اصلی قراردادها برنگشت. لطفا صفحه را تازه‌سازی کنید و اگر نمایش داده نشد، مشکل از API فهرست/دیتابیس است."
          : error?.message || "خطا در ذخیره قرارداد"
      );
    } finally {
      setFinalSavingSection((current) => (current === sectionId ? "" : current));
    }
  };

  const deleteRow = async (id) => {
    const sid = String(id || "");
    if (!sid) return;
    if (!window.confirm("حذف شود؟")) return;
    try {
      await fetchJson(`/contracts?id=${encodeURIComponent(sid)}`, { method: "DELETE" });
      setRows((prev) => prev.filter((row) => String(row.id) !== sid && String(row.parentContractId) !== sid));
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
    "h-10 w-10 md:h-12 md:w-12 rounded-xl bg-black text-white ring-1 ring-black/15 hover:bg-black/90 transition inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed dark:ring-white/10";
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
  const previewContract = previewContractId ? rowById.get(String(previewContractId)) : null;
  const previewProject = previewContract ? projectById.get(String(previewContract.projectId)) : null;
  const previewRelatedLetterIds = React.useMemo(
    () =>
      previewContract
        ? normalizeIdList(
            previewContract.relatedLetterIds?.length
              ? previewContract.relatedLetterIds
              : previewContract.relatedLetterId
                ? [previewContract.relatedLetterId]
                : []
          )
        : [],
    [previewContract]
  );
  const previewRelatedLetters = React.useMemo(
    () => previewRelatedLetterIds.map((id) => letterById.get(String(id))).filter(Boolean),
    [letterById, previewRelatedLetterIds]
  );
  const previewRelatedLetterLabel = previewRelatedLetters.length
    ? previewRelatedLetters
        .map((letter) => toFaDigits(secretariatNoOf(letter) || letterNoOf(letter) || letterIdOf(letter)))
        .join(" و ")
    : "";
  const previewFinancial = previewContract ? normalizeFinancial(previewContract.financial || {}) : normalizeFinancial({});
  const previewInsurance = previewContract ? normalizeInsurance(previewContract.insurance || {}) : normalizeInsurance({});
  const previewLetterAttachments = React.useMemo(() => {
    return previewRelatedLetters.flatMap((letter) => {
      const letterLabel = toFaDigits(secretariatNoOf(letter) || letterNoOf(letter) || letterIdOf(letter));
      return letterAttachmentsOf(letter).map((file, index) => ({
        ...file,
        id: String(file?.id ?? file?.file_id ?? file?.fileId ?? file?.serverId ?? `${letterIdOf(letter)}_${index}`),
        name: letterAttachmentNameOf(file) || `فایل ${toFaDigits(index + 1)}`,
        type: letterAttachmentTypeOf(file),
        url: resolvePublicUrl(letterAttachmentUrlOf(file)),
        relatedLetterLabel: letterLabel,
      }));
    });
  }, [previewRelatedLetters]);
  const previewFiles = React.useMemo(() => {
    const normalizeFile = (file, group) => ({
      id: String(file?.id ?? file?.file_id ?? file?.fileId ?? `${group}_${Math.random().toString(16).slice(2)}`),
      name: String(file?.name ?? file?.originalName ?? file?.original_name ?? file?.filename ?? file?.fileName ?? "فایل"),
      size: Number(file?.size ?? file?.bytes ?? 0),
      type: String(file?.type ?? file?.mimeType ?? file?.mime_type ?? ""),
      url: String(file?.url ?? file?.href ?? file?.path ?? ""),
      group: file?.relatedLetterLabel ? `${group} ${file.relatedLetterLabel}` : group,
    });

    return [
      ...(Array.isArray(previewFinancial.breakdownFiles) ? previewFinancial.breakdownFiles.map((file) => normalizeFile(file, "جدول شکست مبلغ")) : []),
      ...(Array.isArray(previewInsurance.clearanceFiles) ? previewInsurance.clearanceFiles.map((file) => normalizeFile(file, "مفاصا حساب")) : []),
      ...(Array.isArray(previewLetterAttachments) ? previewLetterAttachments.map((file) => normalizeFile(file, "سند مرتبط")) : []),
    ];
  }, [previewFinancial.breakdownFiles, previewInsurance.clearanceFiles, previewLetterAttachments]);
  const activePreviewFile = previewFiles[Math.min(Math.max(0, previewFileIndex), Math.max(0, previewFiles.length - 1))] || null;
  const resolvePreviewFileUrl = (file) => {
    const url = String(file?.url || "").trim();
    if (!url) return "";
    if (/^(https?:|blob:|data:)/i.test(url)) return url;
    if (url.startsWith("/")) return url;
    return `/${url.replace(/^\/+/, "")}`;
  };
  const activePreviewFileUrl = resolvePreviewFileUrl(activePreviewFile);
  const activePreviewFileType = String(activePreviewFile?.type || "").toLowerCase();
  const activePreviewFileName = String(activePreviewFile?.name || "").toLowerCase();
  const activePreviewIsPdf = Boolean(activePreviewFileUrl) && (activePreviewFileType.includes("pdf") || activePreviewFileName.endsWith(".pdf"));
  const activePreviewIsImage =
    Boolean(activePreviewFileUrl) &&
    (activePreviewFileType.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(activePreviewFileName));
  const relatedLetterPreview = relatedLetterPreviewId ? letterById.get(String(relatedLetterPreviewId)) : null;
  const relatedLetterPreviewFiles = React.useMemo(
    () =>
      letterAttachmentsOf(relatedLetterPreview).map((file, index) => {
        const url = resolvePublicUrl(letterAttachmentUrlOf(file));
        const name = letterAttachmentNameOf(file) || `فایل ${toFaDigits(index + 1)}`;
        const type = letterAttachmentTypeOf(file);
        return {
          id: String(file?.id ?? file?.file_id ?? file?.fileId ?? file?.serverId ?? `${name}_${index}`),
          name,
          type,
          url,
          isPdf: isPreviewPdf(url, name, type),
          isImage: isPreviewImage(url, name, type),
        };
      }),
    [relatedLetterPreview]
  );
  const relatedLetterPreviewFile = relatedLetterPreviewFiles.find((file) => file.isPdf || file.isImage) || relatedLetterPreviewFiles[0] || null;
  const previewInfoItemCls = "rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 dark:border-neutral-700 dark:bg-white/[0.03]";
  const previewLabelCls = "text-[11px] font-semibold text-black/45 dark:text-neutral-400";
  const previewValueCls = "mt-1 break-words text-sm font-semibold text-black dark:text-neutral-100";
  const previewValue = (value, fallback = "ثبت نشده") => {
    const text = String(value ?? "").trim();
    return text ? text : fallback;
  };
  const renderPreviewInfo = (label, value) => (
    <div className={previewInfoItemCls}>
      <div className={previewLabelCls}>{label}</div>
      <div className={previewValueCls}>{previewValue(value)}</div>
    </div>
  );
  const renderPreviewSectionTitle = (title) => (
    <div className="mt-4 mb-2 text-sm font-bold text-black dark:text-neutral-100">{title}</div>
  );
  const previewPaymentStatus = (value) => (value === "has" ? "دارد" : value === "none" ? "ندارد" : "");
  const previewFileNames = (files) => {
    const list = Array.isArray(files) ? files : [];
    return list.length ? list.map((file, index) => file?.name || file?.filename || `فایل ${toFaDigits(index + 1)}`).join("، ") : "";
  };
  const previewTechnicalTagLabels = React.useMemo(
    () =>
      normalizeIdList(previewContract?.technical?.tagIds)
        .map((id) => tagLabelOf(tagById.get(String(id)) || { id, label: id }))
        .join("، "),
    [previewContract?.technical?.tagIds, tagById]
  );
  const previewInsuranceLetter = previewInsurance.relatedLetterId ? letterById.get(String(previewInsurance.relatedLetterId)) : null;
  const previewInsuranceLetterLabel = previewInsuranceLetter
    ? toFaDigits(secretariatNoOf(previewInsuranceLetter) || letterNoOf(previewInsuranceLetter) || letterIdOf(previewInsuranceLetter))
    : "";
  const renderPreviewFinancialRows = (rows) => {
    const list = Array.isArray(rows) ? rows : [];
    const filled = list.filter((row) => [row.amount, row.currencyLabel, row.currencyId, row.sourceLabel, row.sourceId].some((item) => String(item || "").trim()));
    return filled.length ? (
      <div className="grid grid-cols-1 gap-2">
        {filled.map((row, index) => (
          <div key={row.id || index} className={previewInfoItemCls}>
            <div className={previewLabelCls}>ردیف {toFaDigits(index + 1)}</div>
            <div className={previewValueCls}>
              {row.amount ? formatFinancialAmount(parseFinancialAmount(row.amount)) : "۰"} {row.currencyLabel || row.currencyId || ""}
              {row.sourceLabel || row.sourceId ? ` - ${row.sourceLabel || row.sourceId}` : ""}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-sm text-black/50 dark:text-neutral-400">موردی ثبت نشده است.</div>
    );
  };

  const printContractSummary = () => {
    if (!previewContract) return;

    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    const text = (value, fallback = "ثبت نشده") => escapeHtml(String(value ?? "").trim() || fallback);
    const multiline = (value) => text(value).replace(/\n/g, "<br />");
    const infoGrid = (items) =>
      `<div class="info-grid">${items
        .map(([label, value]) => `<div class="info-card"><div class="label">${escapeHtml(label)}</div><div class="value">${multiline(value)}</div></div>`)
        .join("")}</div>`;
    const table = (headers, rows) =>
      `<table><thead><tr>${headers.map((item) => `<th>${escapeHtml(item)}</th>`).join("")}</tr></thead><tbody>${
        rows.length
          ? rows.map((row) => `<tr>${row.map((item) => `<td>${multiline(item)}</td>`).join("")}</tr>`).join("")
          : `<tr><td colspan="${headers.length}">موردی ثبت نشده است.</td></tr>`
      }</tbody></table>`;
    const section = (title, body) => `<section><h2>${escapeHtml(title)}</h2>${body}</section>`;

    const calendar = calculateCalendarDays(previewContract.calendar || {});
    const amountRows = (Array.isArray(previewFinancial.contractAmounts) ? previewFinancial.contractAmounts : [])
      .filter((row) => [row.amount, row.currencyLabel, row.currencyId, row.sourceLabel, row.sourceId].some((item) => String(item || "").trim()))
      .map((row, index) => [
        toFaDigits(index + 1),
        row.amount ? formatFinancialAmount(parseFinancialAmount(row.amount)) : "۰",
        row.currencyLabel || row.currencyId || "ثبت نشده",
        row.sourceLabel || row.sourceId || "ثبت نشده",
      ]);
    const guaranteeRows = (Array.isArray(previewFinancial.guarantees) ? previewFinancial.guarantees : []).map((row, index) => [
      toFaDigits(index + 1),
      row.name || "ثبت نشده",
      row.type || "ثبت نشده",
      row.bankNo ? toFaDigits(row.bankNo) : "ثبت نشده",
      row.amount ? formatFinancialAmount(parseFinancialAmount(row.amount)) : "ثبت نشده",
      row.currencyLabel || row.currencyId || "ثبت نشده",
    ]);
    const relatedLetterRows = previewRelatedLetters.map((letter, index) => [
      toFaDigits(index + 1),
      toFaDigits(secretariatNoOf(letter) || letterNoOf(letter) || letterIdOf(letter)),
      subjectOf(letter) || "بدون موضوع",
      letterKindLabelOf(letter),
      letterDateOf(letter) ? toFaDigits(letterDateOf(letter)) : "ثبت نشده",
    ]);
    const fileRows = previewFiles.map((file, index) => {
      const url = resolvePreviewFileUrl(file);
      return [
        toFaDigits(index + 1),
        file.group || "پیوست",
        file.name || "فایل",
        file.size ? toFaDigits(formatBytes(file.size)) : "ثبت نشده",
        url || "آدرس ثبت نشده",
      ];
    });
    const imagePreviews = previewFiles
      .map((file) => ({ ...file, url: resolvePreviewFileUrl(file) }))
      .filter((file) => file.url && (String(file.type || "").toLowerCase().startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(String(file.name || ""))));

    const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>خلاصه قرارداد ${text(contractNoForRow(previewContract, rowById), "")}</title>
  <style>
    @font-face {
      font-family: "Vazir";
      src: url("/fonts/Vazir.woff2") format("woff2"), url("/fonts/Vazir.woff") format("woff");
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "Vazir";
      src: url("/fonts/Vazir-Bold.woff2") format("woff2"), url("/fonts/Vazir-Bold.woff") format("woff");
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
    @page { size: A4; margin: 13mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #171717; background: #fff; font-family: "Vazir", Tahoma, Arial, sans-serif; font-size: 12px; line-height: 1.8; }
    .page { max-width: 190mm; margin: 0 auto; }
    .print-actions { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-start; gap: 8px; padding: 10px 0; background: #fff; }
    .print-actions button { height: 34px; border: 1px solid #111; border-radius: 8px; background: #111; color: #fff; padding: 0 14px; font-weight: 700; cursor: pointer; }
    .print-actions .ghost { background: #fff; color: #111; }
    header { border: 2px solid #111; border-radius: 14px; padding: 14px 16px; margin-bottom: 12px; }
    h1 { margin: 0; font-size: 20px; line-height: 1.5; }
    .subtitle { margin-top: 6px; color: #525252; font-size: 12px; }
    .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
    section { break-inside: avoid; margin-top: 12px; }
    h2 { margin: 0 0 8px; padding: 7px 10px; border-radius: 10px; background: #f2f2f2; border: 1px solid #ddd; font-size: 14px; }
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
    .info-card { min-height: 52px; border: 1px solid #ddd; border-radius: 10px; padding: 7px 9px; break-inside: avoid; }
    .label { color: #666; font-size: 10px; font-weight: 700; }
    .value { margin-top: 2px; color: #111; font-size: 12px; font-weight: 700; white-space: normal; overflow-wrap: anywhere; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; overflow: hidden; border: 1px solid #d8d8d8; border-radius: 10px; }
    th, td { border-bottom: 1px solid #e5e5e5; border-left: 1px solid #e5e5e5; padding: 6px 8px; text-align: right; vertical-align: top; overflow-wrap: anywhere; }
    th { background: #f2f2f2; font-weight: 800; color: #222; }
    tr:last-child td { border-bottom: 0; }
    th:last-child, td:last-child { border-left: 0; }
    .image-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 8px; }
    .image-card { border: 1px solid #ddd; border-radius: 10px; padding: 8px; break-inside: avoid; }
    .image-card img { width: 100%; max-height: 170mm; object-fit: contain; display: block; }
    .image-card div { margin-bottom: 5px; font-weight: 700; font-size: 11px; color: #444; }
    @media print {
      .print-actions { display: none; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="print-actions">
      <button onclick="window.print()">چاپ خلاصه قرارداد</button>
      <button class="ghost" onclick="window.close()">بستن</button>
    </div>
    <header>
      <h1>خلاصه قرارداد</h1>
      <div class="subtitle">${text(previewProject?.label)} - شماره قرارداد: ${text(contractNoForRow(previewContract, rowById))}</div>
      <div class="meta">
        <div><strong>سند قراردادی:</strong> ${text(documentTypeLabel(previewContract.documentType))}</div>
        <div><strong>نوع قرارداد:</strong> ${text(previewContract.general?.contractType)}</div>
        <div><strong>تاریخ چاپ:</strong> ${toFaDigits(new Date().toLocaleDateString("fa-IR"))}</div>
      </div>
    </header>
    ${section("اطلاعات اصلی", infoGrid([
      ["مرکز/پروژه", previewProject?.label],
      ["سند قراردادی", documentTypeLabel(previewContract.documentType)],
      ["شماره قرارداد", contractNoForRow(previewContract, rowById)],
      ...(previewContract.documentType === "sub" ? [["شماره قرارداد فرعی", previewContract.subContractNo]] : []),
      ["نوع قرارداد", previewContract.general?.contractType],
      ["موضوع قرارداد", previewContract.general?.contractSubject],
      ["کارفرمای اصلی", previewContract.general?.mainEmployer],
      ["واگذارنده / کارفرما", previewContract.general?.employerAssignor],
      ["مجری", previewContract.general?.executor],
      ["اعضای مشارکت", previewContract.general?.companyMembers],
      ["پیمانکاران اصلی", previewContract.general?.mainContractors],
      ["اسناد مرتبط", previewRelatedLetterLabel],
    ]))}
    ${section("تقویم قرارداد", infoGrid([
      [previewContract.documentType === "appendix" ? "تمدید مدت قرارداد تا تاریخ" : "تاریخ پایان قرارداد", previewContract.calendar?.endDate ? toFaDigits(previewContract.calendar.endDate) : ""],
      ["میلادی تاریخ پایان", jalaliToGregorianLabel(previewContract.calendar?.endDate)],
      ["تاریخ ابلاغ کار", previewContract.calendar?.notifyDate ? toFaDigits(previewContract.calendar.notifyDate) : ""],
      ["میلادی تاریخ ابلاغ", jalaliToGregorianLabel(previewContract.calendar?.notifyDate)],
      ["تاریخ شروع قرارداد", previewContract.calendar?.startDate ? toFaDigits(previewContract.calendar.startDate) : ""],
      ["میلادی تاریخ شروع", jalaliToGregorianLabel(previewContract.calendar?.startDate)],
      ["مدت قرارداد", calendar.baseDays ? `${toFaDigits(calendar.baseDays)} روز` : ""],
      ["روزهای افزوده", `${toFaDigits(calendar.extraDays || 0)} روز`],
      ["جمع کل تقویم قرارداد", `${toFaDigits(calendar.totalDays || 0)} روز`],
      ["تاریخ‌های افزوده", Array.isArray(previewContract.calendar?.extraDates) && previewContract.calendar.extraDates.length ? previewContract.calendar.extraDates.map((date) => toFaDigits(date)).join("، ") : ""],
    ]))}
    ${section("فنی و محدوده کار", infoGrid([
      ["شرح خدمات و محدوده کار", previewContract.technical?.serviceScope],
      ["برچسب‌ها", previewTechnicalTagLabels],
      ...TECHNICAL_SUPPORT_FIELDS.map((item) => [item.label, previewContract.technical?.[item.key]]),
    ]))}
    ${section("مبلغ قرارداد", table(["#", "مبلغ", "ارز", "منشأ"], amountRows))}
    ${section("شرایط پرداخت", infoGrid([
      ["شرایط پرداخت", previewFinancial.paymentTerms],
      ["پیش پرداخت", previewPaymentStatus(previewFinancial.advancePayment)],
      ["سپرده بیمه", previewPaymentStatus(previewFinancial.capitalDeposit)],
      ["درصد سپرده بیمه", previewFinancial.capitalDeposit === "has" ? `${toFaDigits(previewFinancial.capitalDepositAmount || 0)}%` : ""],
      ["حسن انجام کار", previewPaymentStatus(previewFinancial.performanceBond)],
      ["درصد حسن انجام کار", previewFinancial.performanceBond === "has" ? `${toFaDigits(previewFinancial.performanceBondAmount || 0)}%` : ""],
    ]))}
    ${section("تضامین", table(["#", "نام تضمین", "نوع", "عهده بانک/شماره", "مبلغ", "ارز"], guaranteeRows))}
    ${section("تامین اجتماعی", infoGrid([
      ["ردیف پیمان", previewInsurance.contractRow],
      ["شعبه سازمان تامین اجتماعی", previewInsurance.branchStatus],
      ["کارکرد ناخالص نهایی قرارداد", previewInsurance.finalGrossPerformance ? `${formatFinancialAmount(parseFinancialAmount(previewInsurance.finalGrossPerformance))} ریال` : ""],
      ["مفاصا حساب بیمه تامین اجتماعی", previewFileNames(previewInsurance.clearanceFiles)],
      ["سند مرتبط تامین اجتماعی", previewInsuranceLetterLabel],
      ["آخرین وضعیت قرارداد", previewInsurance.lastStatus],
    ]))}
    ${section("اسناد مرتبط", table(["#", "شماره سند", "موضوع", "نوع سند", "تاریخ"], relatedLetterRows))}
    ${section("فایل‌ها و پیوست‌ها", `${table(["#", "گروه", "نام فایل", "حجم", "آدرس"], fileRows)}${imagePreviews.length ? `<div class="image-grid">${imagePreviews.map((file) => `<div class="image-card"><div>${text(`${file.group || "پیوست"} - ${file.name || "فایل"}`)}</div><img src="${escapeHtml(file.url)}" alt="" /></div>`).join("")}</div>` : ""}`)}
  </div>
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.focus(); window.print(); }, 350);
    });
  </script>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) {
      alert("امکان باز کردن پنجره چاپ وجود ندارد. لطفا popup مرورگر را برای این سایت فعال کنید.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const renderSaveButton = (sectionId) => {
    const isDraftSection = sectionId !== "financial";
    const isFinalSaving = finalSavingSection === sectionId;
    const showFinalStatus = finalSaveStatus.sectionId === sectionId && finalSaveStatus.message;
    const showDraftStatus = isDraftSection && draftSaveStatus.sectionId === sectionId && draftSaveStatus.state;
    const buttonTitle = sectionId === "financial" ? "ثبت نهایی قرارداد" : "ذخیره پیش‌نویس";
    const draftStatusText =
      draftSaveStatus.state === "saving" ? "در حال ذخیره پیش‌نویس..." : draftSaveStatus.state === "saved" ? "پیش‌نویس ذخیره شد" : "خطا در ذخیره پیش‌نویس";
    const draftStatusCls =
      draftSaveStatus.state === "error"
        ? "text-red-600 dark:text-red-400"
        : draftSaveStatus.state === "saved"
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-black/50 dark:text-neutral-400";

    return (
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          onClick={() => saveContractSection(sectionId)}
          disabled={isFinalSaving}
          className={saveIconBtnCls}
          title={buttonTitle}
          aria-label={buttonTitle}
        >
          <img src="/images/icons/check.svg" alt="" className="w-4 h-4 invert md:w-5 md:h-5" />
        </button>
        <div
          className={[
            "pointer-events-none absolute top-full left-1/2 mt-1 h-4 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold leading-4 transition-all duration-200",
            isFinalSaving || showFinalStatus || showDraftStatus ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
            !showFinalStatus && draftSaveStatus.state === "saving" ? "animate-pulse" : "",
            isFinalSaving || showFinalStatus ? "text-emerald-600 dark:text-emerald-400" : draftStatusCls,
          ].join(" ")}
        >
          {isFinalSaving ? "در حال ثبت نهایی..." : showFinalStatus ? finalSaveStatus.message : showDraftStatus ? draftStatusText : ""}
        </div>
      </div>
    );
  };

  React.useEffect(() => {
    if (!visibleContractTabs.some((tab) => tab.id === activeContractTab)) {
      setActiveContractTab(visibleContractTabs[0]?.id || CONTRACT_SECTION_TABS[0].id);
    }
  }, [activeContractTab, visibleContractTabs]);

  React.useEffect(() => {
    setPreviewFileIndex(0);
  }, [previewContractId]);

  React.useEffect(() => {
    if (!previewContractId && !relatedLetterPreviewId) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (relatedLetterPreviewId) {
        setRelatedLetterPreviewId("");
        return;
      }
      setPreviewContractId("");
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [previewContractId, relatedLetterPreviewId]);

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
              <div className={labelCls}>{amountLabel} *</div>
              <input
                value={formatAmountInput(row.amount || "")}
                onChange={(e) => updateFinancialRow(sectionKey, row.id, "amount", e.target.value)}
                className={inputCls}
                type="text"
                inputMode="decimal"
                dir="ltr"
                placeholder="0"
              />
            </div>
            <div>
              <div className={labelCls}>ارز *</div>
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
              <div className={labelCls}>منشأ *</div>
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
                  <div className={labelCls}>مرکز/پروژه *</div>
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
                  <div className={labelCls}>سند قراردادی *</div>
                  <select value={form.documentType} onChange={(e) => setField("documentType", e.target.value)} className={inputCls}>
                    {CONTRACT_DOCUMENT_TYPES.map((item) => (
                      <option key={item.id} value={item.id} disabled={item.id === "main" && projectAlreadyHasMainContract}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:min-w-[230px] sm:flex-1">
                  <div className={labelCls}>شماره قرارداد *</div>
                  {form.documentType === "main" ? (
                    <input
                      value={form.contractNo}
                      onChange={(e) => setField("contractNo", e.target.value)}
                      className={inputCls}
                      type="text"
                      disabled={mainContractBlockedForProject}
                    />
                  ) : (
                    <select
                      value={form.parentContractId}
                      onChange={(e) => setField("parentContractId", e.target.value)}
                      className={inputCls}
                    >
                      <option value="">
                        {form.projectId
                          ? projectContractOptions.length
                            ? "انتخاب شماره قرارداد"
                            : "موردی برای این پروژه ثبت نشده است"
                          : "ابتدا مرکز/پروژه را انتخاب کنید"}
                      </option>
                      {projectContractOptions.map((contract) => {
                        const contractNo = contractNoForRow(contract, rowById);
                        return (
                          <option key={contract.id} value={contract.id}>
                            {contractNo} - {documentTypeLabel(contract.documentType)}
                          </option>
                        );
                      })}
                    </select>
                  )}
                  {mainContractBlockedForProject ? (
                    <div className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
                      برای این پروژه قبلا قرارداد اصلی ثبت شده است؛ فقط قرارداد فرعی یا الحاقیه قابل ثبت است.
                    </div>
                  ) : null}
                </div>

                {form.documentType === "sub" ? (
                  <div className="w-full sm:min-w-[220px] sm:flex-1">
                    <div className={labelCls}>شماره قرارداد فرعی *</div>
                    <input
                      value={form.subContractNo || ""}
                      onChange={(e) => setField("subContractNo", e.target.value)}
                      className={inputCls}
                      type="text"
                    />
                  </div>
                ) : null}

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

                <div className="relative w-full pb-1 sm:min-w-[240px] sm:flex-1 sm:pb-2">
                  <div className="text-[13px] leading-6 text-black/65 dark:text-neutral-300">
                    اسناد مرتبط:{" "}
                    {selectedRelatedLetterSummaryItems.length ? (
                      <span className="inline-flex flex-wrap items-center gap-x-1 font-semibold text-black dark:text-neutral-100">
                        {selectedRelatedLetterSummaryItems.slice(0, 2).map((item, index) => (
                          <React.Fragment key={item.id}>
                            {index > 0 ? <span>و</span> : null}
                            <span className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-black/[0.03] px-1 py-0.5 dark:border-white/10 dark:bg-white/[0.06]">
                              <button
                                type="button"
                                onClick={() => setRelatedLetterPreviewId(item.id)}
                                className="px-0.5 underline decoration-black/20 underline-offset-4 transition hover:decoration-black/60"
                              >
                                {item.label}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeRelatedLetter(item.id)}
                                className="grid h-4 w-4 place-items-center rounded-full text-[11px] leading-none text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/15"
                                aria-label={`حذف ${item.label}`}
                                title="حذف"
                              >
                                ×
                              </button>
                            </span>
                          </React.Fragment>
                        ))}
                        {selectedRelatedLetterSummaryItems.length > 2 ? (
                          <button
                            type="button"
                            onClick={() => setRelatedSummaryOpen((open) => !open)}
                            className="mx-1 rounded-lg px-1.5 py-0.5 text-[12px] font-bold text-black underline decoration-black/25 underline-offset-4 hover:bg-black/[0.04] dark:text-neutral-100 dark:hover:bg-white/10"
                          >
                            و...
                          </button>
                        ) : null}
                      </span>
                    ) : (
                      <span className="font-semibold text-black dark:text-neutral-100">سندی انتخاب نشده است</span>
                    )}
                  </div>
                  {relatedSummaryOpen && selectedRelatedLetterSummaryItems.length > 2 ? (
                    <div className="absolute right-0 top-full z-40 mt-1 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-black/10 bg-white p-2 text-[13px] leading-6 text-black shadow-xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
                      {selectedRelatedLetterSummaryItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-black/[0.04] dark:hover:bg-white/10"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setRelatedLetterPreviewId(item.id);
                              setRelatedSummaryOpen(false);
                            }}
                            className="min-w-0 flex-1 truncate text-right font-semibold"
                          >
                            {item.label}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRelatedLetter(item.id)}
                            className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs leading-none text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/15"
                            aria-label={`حذف ${item.label}`}
                            title="حذف"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
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
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_minmax(360px,1fr)]">
                        <div className="min-w-0">
                          <div className={labelCls}>نوع قرارداد *</div>
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
                          <div className={labelCls}>موضوع قرارداد *</div>
                          <input
                            value={form.general?.contractSubject || ""}
                            onChange={(e) => setGeneralField("contractSubject", e.target.value)}
                            className={inputCls}
                            type="text"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                            <div className={labelCls}>واگذارنده / کارفرما *</div>
                            <input value={FIXED_SUB_ASSIGNOR} className={readonlyInputCls} type="text" readOnly />
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <div className={labelCls}>واگذارنده / کارفرما *</div>
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
                            <div className={labelCls}>مجری قرارداد *</div>
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

                      <div className="flex items-center justify-end pt-2">
                        {renderSaveButton("general")}
                      </div>
                    </div>
                  ) : activeContractTab === "calendar" ? (
                    <div className="space-y-4 p-3 sm:p-4">
                      {isAppendixDocument ? (
                        <div className={calendarCardCls}>
                          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(260px,1fr)] gap-3 md:items-end">
                            <div className="pb-3 text-sm font-semibold text-black dark:text-neutral-100">تمدید مدت قرارداد تا تاریخ *</div>
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
                            <div className={labelCls}>تاریخ ابلاغ کار *</div>
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
                            <div className={labelCls}>تاریخ شروع قرارداد *</div>
                            <ContractDatePicker value={form.calendar?.startDate || ""} onChange={(value) => setCalendarField("startDate", value)} />
                            <div className="mt-2 text-xs text-black/55 dark:text-neutral-400">
                              میلادی: <span className="font-semibold text-black dark:text-neutral-100">{jalaliToGregorianLabel(form.calendar?.startDate) || "انتخاب نشده"}</span>
                            </div>
                          </div>

                        <div className="min-w-0">
                            <div className={labelCls}>تاریخ پایان قرارداد *</div>
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

                      <div className="flex items-center justify-end pt-2">
                        {renderSaveButton("calendar")}
                      </div>
                    </div>
                  ) : activeContractTab === "technical" ? (
                    <div className="space-y-4 p-3 sm:p-4">
                      {isAppendixDocument ? (
                        <div className="space-y-4">
                          <div>
                            <div className={labelCls}>شرح خدمات و محدوده کار *</div>
                            <textarea
                              value={form.technical?.serviceScope || ""}
                              onChange={(e) => setTechnicalField("serviceScope", e.target.value)}
                              className={`${textareaCls} !h-[150px] !min-h-[150px] !resize-none sm:!h-[180px] sm:!min-h-[180px]`}
                            />
                          </div>
                          <div className="flex items-center justify-end pt-2">
                            {renderSaveButton("technical", "ثبت")}
                          </div>
                        </div>
                      ) : (
                      <>
                      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 items-start">
                        <div className="space-y-4">
                          <div className="pt-1.5">
                            <div className={labelCls}>شرح خدمات و محدوده کار *</div>
                            <textarea
                              value={form.technical?.serviceScope || ""}
                              onChange={(e) => setTechnicalField("serviceScope", e.target.value)}
                              className={`${textareaCls} !h-[190px] !min-h-[190px] !resize-none sm:!h-[268px] sm:!min-h-[268px]`}
                            />
                          </div>

                          <div>
                            <div className={labelCls}>برچسب ها *</div>
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

                      <div className="flex items-center justify-end pt-2">
                        {renderSaveButton("technical")}
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
                            <div className="mb-2 text-sm font-semibold text-black dark:text-neutral-100">شرایط پرداخت *</div>
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
                                <div className="text-sm font-semibold text-black/75 dark:text-neutral-200">پیش پرداخت *</div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {renderPaymentOption("advancePayment", "has", "دارد")}
                                  {renderPaymentOption("advancePayment", "none", "ندارد")}
                                </div>
                              </div>

                              <div className="border-t border-black/10 pt-3 dark:border-neutral-700">
                                <div className="mb-2 text-sm font-semibold text-black/70 dark:text-neutral-200">کسور</div>
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-[116px_1fr] gap-2 sm:items-center">
                                    <div className="text-sm text-black/70 dark:text-neutral-300">سپرده بیمه *</div>
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
                                    <div className="text-sm text-black/70 dark:text-neutral-300">حسن انجام کار *</div>
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
                              <div className={labelCls}>نام تضمین *</div>
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
                              <div className={labelCls}>نوع *</div>
                              <input
                                value={financialForm.guaranteeDraft?.type || ""}
                                onChange={(e) => updateGuaranteeDraft("type", e.target.value)}
                                className={inputCls}
                                type="text"
                              />
                            </div>

                            <div>
                              <div className={labelCls}>عهده بانک/شماره *</div>
                              <input
                                value={financialForm.guaranteeDraft?.bankNo || ""}
                                onChange={(e) => updateGuaranteeDraft("bankNo", e.target.value)}
                                className={inputCls}
                                type="text"
                              />
                            </div>

                            <div>
                              <div className={labelCls}>مبلغ *</div>
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
                              <div className={labelCls}>ارز *</div>
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

                      <div className="flex items-center justify-end pt-2">
                        {renderSaveButton("financial")}
                      </div>
                    </div>
                  ) : activeContractTab === "insurance" ? (
                    <div className="space-y-4 p-3 sm:p-4">
                      <div className="rounded-2xl border border-black/10 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <div className={labelCls}>ردیف پیمان *</div>
                            <input
                              value={insuranceForm.contractRow || ""}
                              onChange={(e) => setInsuranceField("contractRow", e.target.value)}
                              className={inputCls}
                              type="text"
                            />
                          </div>

                          <div className="min-w-0">
                            <div className={labelCls}>شعبه سازمان تامین اجتماعی *</div>
                            <input
                              value={insuranceForm.branchStatus || ""}
                              onChange={(e) => setInsuranceField("branchStatus", e.target.value)}
                              className={inputCls}
                              type="text"
                            />
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className={labelCls}>آخرین وضعیت قرارداد *</div>
                          <select
                            value={insuranceForm.lastStatus || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setForm((prev) => {
                                const insurance = normalizeInsurance(prev.insurance || {});
                                return {
                                  ...prev,
                                  insurance: {
                                    ...insurance,
                                    lastStatus: value,
                                    ...(isSocialInsuranceClearanceStatus(value)
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

                        {isSocialInsuranceClearanceStatus(insuranceForm.lastStatus) ? (
                          <div className="mt-4 rounded-2xl border border-black/10 bg-black/[0.02] p-3 dark:border-neutral-700 dark:bg-white/[0.03]">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:items-end">
                              <div className="min-w-0">
                                <div className={labelCls}>کارکرد ناخالص نهایی قرارداد *</div>
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
                                <div className={labelCls}>مفاصا حساب بیمه تامین اجتماعی *</div>
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
                      </div>

                      <div className="flex items-center justify-end pt-2">
                        {renderSaveButton("insurance")}
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[160px] flex-col justify-between gap-4 p-3 sm:min-h-[180px] sm:p-4">
                      <div className="rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-black/60 dark:border-neutral-700 dark:bg-white/[0.03] dark:text-neutral-300">
                        بخش {CONTRACT_SECTION_TABS.find((tab) => tab.id === activeContractTab)?.label} در مرحله بعد تکمیل می‌شود.
                      </div>

                      <div className="flex items-center justify-end pt-2">
                        {renderSaveButton(activeContractTab)}
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
                    const contractNo = contractNoForRow(row, rowById);
                    const id = String(row.id);
                    const childRows = childRowsByParentId.get(id) || [];
                    const hasChildren = childRows.length > 0;
                    const isExpanded = expandedContractIds.has(id);
                    const depth = Number(row.__depth || 0);
                    const projectLabel = project?.label || "بدون پروژه";
                    const docLabel = documentTypeLabel(row.documentType);
                    const typeText = row.general?.contractType || "ثبت نشده";
                    const companyText = contractCompanyForRow(row) || "ثبت نشده";
                    const companyRole = contractCompanyRoleForRow(row);
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
                        className={`border-r-4 bg-white p-3 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 ${depth ? "mr-4 bg-black/[0.02] dark:bg-white/[0.03]" : ""}`}
                        style={{ borderRightColor: docColor }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
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
                            <div className="mt-1 flex items-center gap-2 text-xs text-black/55 dark:text-neutral-400">
                              {hasChildren ? (
                                <button
                                  type="button"
                                  onClick={() => toggleContractChildren(id)}
                                  className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-black/15 bg-white text-sm font-bold leading-none dark:border-neutral-700 dark:bg-neutral-900"
                                  aria-label={isExpanded ? "بستن زیرمجموعه" : "نمایش زیرمجموعه"}
                                  title={isExpanded ? "بستن زیرمجموعه" : "نمایش زیرمجموعه"}
                                >
                                  {isExpanded ? "−" : "+"}
                                </button>
                              ) : null}
                              <span className="truncate">{projectLabel}</span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <RowActionIconBtn icon="/images/icons/namayeshname.svg" title="پیش نمایش" onClick={() => setPreviewContractId(id)} size={34} iconSize={16} />
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
                              <div className="text-[11px] text-black/45 dark:text-neutral-500">موضوع قرارداد</div>
                              <div className="truncate">{row.general?.contractSubject || "ثبت نشده"}</div>
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] text-black/45 dark:text-neutral-500">شرکت ({companyRole})</div>
                              <div className="truncate font-semibold">{companyText}</div>
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
                  <col style={{ width: 260 }} />
                  <col style={{ width: 150 }} />
                  <col style={{ width: 160 }} />
                  <col />
                  <col style={{ width: 220 }} />
                  <col style={{ width: 130 }} />
                </colgroup>
                <thead>
                  <tr className={contractsTableHeadRowCls}>
                    <th className="sticky top-0 z-30 bg-neutral-200 text-[14px] font-semibold dark:bg-white/10">مرکز/پروژه</th>
                    <th className="sticky top-0 z-30 bg-neutral-200 text-[14px] font-semibold dark:bg-white/10">شماره قرارداد</th>
                    <th className="sticky top-0 z-30 bg-neutral-200 text-[14px] font-semibold dark:bg-white/10">نوع قرارداد</th>
                    <th className="sticky top-0 z-30 bg-neutral-200 text-[14px] font-semibold dark:bg-white/10">موضوع قرارداد</th>
                    <th className="sticky top-0 z-30 bg-neutral-200 text-[14px] font-semibold dark:bg-white/10">شرکت</th>
                    <th className="sticky top-0 z-30 bg-neutral-200 text-[14px] font-semibold dark:bg-white/10">اقدامات</th>
                  </tr>
                </thead>
                <tbody className={contractsTableBodyCls}>
                  {contractsPageRows.length ? (
                    contractsPageRows.map((row, index) => {
                      const project = projectById.get(String(row.projectId));
                      const contractNo = contractNoForRow(row, rowById);
                      const id = String(row.id);
                      const childRows = childRowsByParentId.get(id) || [];
                      const hasChildren = childRows.length > 0;
                      const isExpanded = expandedContractIds.has(id);
                      const depth = Number(row.__depth || 0);
                      const isLast = index === contractsPageRows.length - 1;
                      const divider = isLast ? "" : contractsRowDividerCls;
                      const projectLabel = project?.label || "بدون پروژه";
                      const companyText = contractCompanyForRow(row) || "ثبت نشده";
                      const companyRole = contractCompanyRoleForRow(row);

                      return (
                        <tr key={row.id} className={`group bg-white transition-colors hover:bg-black/[0.04] dark:bg-neutral-900 dark:hover:bg-white/10 ${depth ? "bg-black/[0.025] dark:bg-white/[0.035]" : ""}`}>
                          <td className={`px-3 ${divider}`}>
                            <div className={`flex items-center gap-2 ${depth ? "pr-7" : ""}`}>
                              {hasChildren ? (
                                <button
                                  type="button"
                                  onClick={() => toggleContractChildren(id)}
                                  className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-black/15 bg-white text-sm font-bold leading-none dark:border-neutral-700 dark:bg-neutral-900"
                                  aria-label={isExpanded ? "بستن زیرمجموعه" : "نمایش زیرمجموعه"}
                                  title={isExpanded ? "بستن زیرمجموعه" : "نمایش زیرمجموعه"}
                                >
                                  {isExpanded ? "−" : "+"}
                                </button>
                              ) : (
                                <span className="h-5 w-5 shrink-0" />
                              )}
                              <span className="block truncate text-right" title={projectLabel}>{projectLabel}</span>
                            </div>
                          </td>
                          <td className={`px-3 font-semibold ${divider}`}>{contractNo ? toFaDigits(contractNo) : "ثبت نشده"}</td>
                          <td className={`px-3 ${divider}`}>
                            <div className="truncate font-semibold">{row.general?.contractType || "ثبت نشده"}</div>
                            <div className="mt-1 text-xs text-black/50 dark:text-neutral-400">{documentTypeLabel(row.documentType)}</div>
                          </td>
                          <td className={`px-3 ${divider}`}>
                            <div className="mx-auto max-w-[260px] truncate" title={row.general?.contractSubject || ""}>
                              {row.general?.contractSubject || "ثبت نشده"}
                            </div>
                          </td>
                          <td className={`px-3 ${divider}`}>
                            <div className="mx-auto max-w-[220px] truncate font-semibold" title={companyText}>
                              {companyText}
                            </div>
                            <div className="mt-1 text-xs text-black/50 dark:text-neutral-400">{companyRole}</div>
                          </td>
                          <td className={`px-3 ${divider}`}>
                            <div className={centeredRowActionsCls}>
                              <RowActionIconBtn icon="/images/icons/namayeshname.svg" title="پیش نمایش" onClick={() => setPreviewContractId(id)} size={34} iconSize={16} />
                              <RowActionIconBtn action="edit" onClick={() => openEditForm(row)} size={34} iconSize={15} />
                              <RowActionIconBtn action="delete" onClick={() => deleteRow(row.id)} size={34} iconSize={16} />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-black/55 dark:text-neutral-400">
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
                  <div className="flex items-center gap-2">
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
                  </div>
                  <div className="whitespace-nowrap text-black/70 dark:text-neutral-400">
                    {contractsTotal === 0 ? "۰ از ۰" : `${toFaDigits(contractsStartIdx + 1)}-${toFaDigits(contractsEndIdx)} از ${toFaDigits(contractsTotal)}`}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs md:justify-start md:text-sm">
                  <span className="text-black/70 dark:text-neutral-400">تعداد در هر صفحه:</span>
                  <div className="inline-flex h-9 overflow-hidden rounded-lg border border-black/10 bg-white dark:border-white/15 dark:bg-white/5">
                    {[10, 25, 100].map((count) => {
                      const active = contractsRowsPerPage === count;
                      return (
                        <button
                          key={count}
                          type="button"
                          onClick={() => {
                            setContractsRowsPerPage(count);
                            setContractsPage(0);
                          }}
                          className={
                            "min-w-10 px-3 text-sm font-semibold transition " +
                            (active
                              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                              : "text-neutral-700 hover:bg-black/[0.04] dark:text-white/75 dark:hover:bg-white/10")
                          }
                          aria-pressed={active}
                        >
                          {toFaDigits(count)}
                        </button>
                      );
                    })}
                  </div>
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
                  <th className="px-3 py-3 text-right font-semibold">شماره قرارداد</th>
                  <th className="px-3 py-3 text-right font-semibold">موضوع قرارداد</th>
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
                        <td className="px-3 py-3 text-right">{row.general?.contractSubject || "ثبت نشده"}</td>
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

      {previewContract &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 md:p-6" dir="rtl">
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setPreviewContractId("")} />
            <div className="relative flex h-[min(86vh,760px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-black shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
              <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-neutral-800">
                <div className="min-w-0">
                  <div className="text-base font-bold">پیش نمایش قرارداد</div>
                  <div className="mt-1 truncate text-xs text-black/55 dark:text-neutral-400">
                    {previewProject?.label || "بدون پروژه"} - {contractNoForRow(previewContract, rowById) || "بدون شماره"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={printContractSummary}
                    className="h-10 rounded-xl border border-black/15 bg-white px-3 text-xs font-bold transition inline-flex items-center gap-2 hover:bg-black/[0.04] dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                    aria-label="چاپ خلاصه قرارداد"
                    title="چاپ خلاصه قرارداد"
                  >
                    <img src="/images/icons/namayeshname.svg" alt="" className="h-4 w-4 dark:invert" />
                    چاپ
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewContractId("")}
                    className={iconBtnCls}
                    aria-label="بستن"
                    title="بستن"
                  >
                    <img src="/images/icons/bastan.svg" alt="" className="w-5 h-5 dark:invert" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="flex h-full flex-col lg:flex-row">
                  <div className="h-full overflow-y-auto p-4 lg:w-[58%]">
                {renderPreviewSectionTitle("اطلاعات اصلی")}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  {renderPreviewInfo("مرکز/پروژه", previewProject?.label)}
                  {renderPreviewInfo("سند قراردادی", documentTypeLabel(previewContract.documentType))}
                  {renderPreviewInfo("شماره قرارداد", contractNoForRow(previewContract, rowById))}
                  {previewContract.documentType === "sub" ? renderPreviewInfo("شماره قرارداد فرعی", previewContract.subContractNo) : null}
                  {renderPreviewInfo("نوع قرارداد", previewContract.general?.contractType)}
                  {renderPreviewInfo("موضوع قرارداد", previewContract.general?.contractSubject)}
                  {renderPreviewInfo("کارفرمای اصلی", previewContract.general?.mainEmployer)}
                  {renderPreviewInfo("واگذارنده / کارفرما", previewContract.general?.employerAssignor)}
                  {renderPreviewInfo("مجری", previewContract.general?.executor)}
                  {renderPreviewInfo("اعضای مشارکت", previewContract.general?.companyMembers)}
                  {renderPreviewInfo("پیمانکاران اصلی", previewContract.general?.mainContractors)}
                  {renderPreviewInfo("اسناد مرتبط", previewRelatedLetterLabel)}
                  {renderPreviewInfo("آخرین بخش ذخیره شده", CONTRACT_SECTION_TABS.find((tab) => tab.id === previewContract.lastSavedSection)?.label || previewContract.lastSavedSection)}
                </div>

                {renderPreviewSectionTitle("تقویم قرارداد")}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                  {previewContract.documentType === "appendix"
                    ? renderPreviewInfo("تمدید مدت قرارداد تا تاریخ", previewContract.calendar?.endDate ? toFaDigits(previewContract.calendar.endDate) : "")
                    : renderPreviewInfo("تاریخ پایان قرارداد", previewContract.calendar?.endDate ? toFaDigits(previewContract.calendar.endDate) : "")}
                  {renderPreviewInfo("میلادی تاریخ پایان", jalaliToGregorianLabel(previewContract.calendar?.endDate))}
                  {renderPreviewInfo("تاریخ ابلاغ کار", previewContract.calendar?.notifyDate ? toFaDigits(previewContract.calendar.notifyDate) : "")}
                  {renderPreviewInfo("میلادی تاریخ ابلاغ", jalaliToGregorianLabel(previewContract.calendar?.notifyDate))}
                  {renderPreviewInfo("تاریخ شروع قرارداد", previewContract.calendar?.startDate ? toFaDigits(previewContract.calendar.startDate) : "")}
                  {renderPreviewInfo("میلادی تاریخ شروع", jalaliToGregorianLabel(previewContract.calendar?.startDate))}
                  {renderPreviewInfo("مدت قرارداد", calculateCalendarDays(previewContract.calendar || {}).baseDays ? `${toFaDigits(calculateCalendarDays(previewContract.calendar || {}).baseDays)} روز` : "")}
                  {renderPreviewInfo("روزهای افزوده", `${toFaDigits(calculateCalendarDays(previewContract.calendar || {}).extraDays || 0)} روز`)}
                  {renderPreviewInfo("جمع کل تقویم قرارداد", `${toFaDigits(calculateCalendarDays(previewContract.calendar || {}).totalDays || 0)} روز`)}
                  {renderPreviewInfo("تاریخ‌های افزوده", Array.isArray(previewContract.calendar?.extraDates) && previewContract.calendar.extraDates.length ? previewContract.calendar.extraDates.map((date) => toFaDigits(date)).join("، ") : "")}
                </div>

                {renderPreviewSectionTitle("فنی و محدوده کار")}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className={`${previewInfoItemCls} md:col-span-2`}>
                    <div className={previewLabelCls}>شرح خدمات و محدوده کار</div>
                    <div className="mt-1 whitespace-pre-wrap text-sm leading-7">{previewValue(previewContract.technical?.serviceScope)}</div>
                  </div>
                  {renderPreviewInfo("برچسب‌ها", previewTechnicalTagLabels)}
                  {TECHNICAL_SUPPORT_FIELDS.map((item) => renderPreviewInfo(item.label, previewContract.technical?.[item.key]))}
                </div>

                {renderPreviewSectionTitle("مالی و تضامین")}
                {renderPreviewFinancialRows(previewFinancial.contractAmounts)}
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                  {renderPreviewInfo("شرایط پرداخت", previewFinancial.paymentTerms)}
                  {renderPreviewInfo("پیش پرداخت", previewPaymentStatus(previewFinancial.advancePayment))}
                  {renderPreviewInfo("سپرده بیمه", previewPaymentStatus(previewFinancial.capitalDeposit))}
                  {renderPreviewInfo("درصد سپرده بیمه", previewFinancial.capitalDeposit === "has" ? `${toFaDigits(previewFinancial.capitalDepositAmount || 0)}%` : "")}
                  {renderPreviewInfo("حسن انجام کار", previewPaymentStatus(previewFinancial.performanceBond))}
                  {renderPreviewInfo("درصد حسن انجام کار", previewFinancial.performanceBond === "has" ? `${toFaDigits(previewFinancial.performanceBondAmount || 0)}%` : "")}
                  {renderPreviewInfo("جدول شکست مبلغ قرارداد", previewFileNames(previewFinancial.breakdownFiles))}
                </div>
                {previewFinancial.guarantees.length ? (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-black/10 dark:border-neutral-800">
                    <table className="w-full min-w-[680px] text-sm">
                      <thead className="bg-neutral-100 dark:bg-white/10">
                        <tr>
                          <th className="px-3 py-2 text-right">نام تضمین</th>
                          <th className="px-3 py-2">نوع</th>
                          <th className="px-3 py-2">عهده بانک/شماره</th>
                          <th className="px-3 py-2">مبلغ</th>
                          <th className="px-3 py-2">ارز</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewFinancial.guarantees.map((item) => (
                          <tr key={item.id} className="border-t border-black/10 dark:border-neutral-800">
                            <td className="px-3 py-2 text-right">{previewValue(item.name, "—")}</td>
                            <td className="px-3 py-2 text-center">{previewValue(item.type, "—")}</td>
                            <td className="px-3 py-2 text-center">{previewValue(item.bankNo, "—")}</td>
                            <td className="px-3 py-2 text-center">{item.amount ? formatFinancialAmount(parseFinancialAmount(item.amount)) : "—"}</td>
                            <td className="px-3 py-2 text-center">{previewValue(item.currencyLabel || item.currencyId, "—")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-3">{renderPreviewInfo("تضامین", "تضمینی ثبت نشده است.")}</div>
                )}

                {renderPreviewSectionTitle("تامین اجتماعی")}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  {renderPreviewInfo("ردیف پیمان", previewInsurance.contractRow)}
                  {renderPreviewInfo("شعبه سازمان تامین اجتماعی", previewInsurance.branchStatus)}
                  {renderPreviewInfo("کارکرد ناخالص نهایی قرارداد", previewInsurance.finalGrossPerformance ? `${formatFinancialAmount(parseFinancialAmount(previewInsurance.finalGrossPerformance))} ریال` : "")}
                  {renderPreviewInfo("مفاصا حساب بیمه تامین اجتماعی", previewFileNames(previewInsurance.clearanceFiles))}
                  {renderPreviewInfo("سند مرتبط تامین اجتماعی", previewInsuranceLetterLabel)}
                  {renderPreviewInfo("آخرین وضعیت قرارداد", previewInsurance.lastStatus)}
                </div>
                  </div>

                  <div className="flex min-h-[320px] flex-col border-t border-black/10 bg-black/[0.015] lg:w-[42%] lg:border-r lg:border-t-0 dark:border-neutral-800 dark:bg-white/[0.02]">
                    <div className="flex items-center justify-between gap-2 border-b border-black/10 px-4 py-3 dark:border-neutral-800">
                      <div className="text-sm font-bold">فایل‌ها و اسناد</div>
                      <div className="rounded-full bg-black/[0.06] px-2 py-0.5 text-xs font-semibold dark:bg-white/10">
                        {toFaDigits(previewFiles.length)}
                      </div>
                    </div>

                    <div className="flex-1 overflow-hidden p-3">
                      <div className="flex h-full flex-col gap-3">
                        <div className="min-h-[220px] flex-1 overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                          {activePreviewFileUrl ? (
                            activePreviewIsPdf ? (
                              <object data={`${activePreviewFileUrl}#view=FitH`} type="application/pdf" className="h-full min-h-[260px] w-full">
                                <iframe title="contract_file_preview" src={`${activePreviewFileUrl}#view=FitH`} className="h-full min-h-[260px] w-full" />
                              </object>
                            ) : activePreviewIsImage ? (
                              <img src={activePreviewFileUrl} alt="" className="h-full min-h-[260px] w-full object-contain" />
                            ) : (
                              <div className="grid h-full min-h-[260px] place-items-center p-6 text-center">
                                <div>
                                  <div className="text-sm font-bold">پیش نمایش این نوع فایل در دسترس نیست.</div>
                                  <div className="mt-2 text-xs text-black/55 dark:text-neutral-400">از دکمه باز کردن فایل استفاده کنید.</div>
                                </div>
                              </div>
                            )
                          ) : (
                            <div className="grid h-full min-h-[260px] place-items-center p-6 text-center">
                              <div>
                                <div className="text-sm font-bold">{activePreviewFile ? activePreviewFile.name : "فایلی ثبت نشده است"}</div>
                                <div className="mt-2 text-xs text-black/55 dark:text-neutral-400">
                                  {activePreviewFile ? "برای این فایل آدرس پیش نمایش ذخیره نشده است." : "در این قرارداد فایلی برای نمایش وجود ندارد."}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {activePreviewFile ? (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <a
                              href={activePreviewFileUrl || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className={`h-10 rounded-xl border border-black/10 inline-flex items-center justify-center gap-2 text-xs font-bold transition dark:border-neutral-800 ${activePreviewFileUrl ? "bg-white hover:bg-black/[0.04] dark:bg-neutral-900 dark:hover:bg-neutral-800" : "pointer-events-none bg-black/[0.03] text-black/35 dark:bg-white/[0.04] dark:text-white/35"}`}
                            >
                              <img src="/images/icons/namayeshname.svg" alt="" className="h-4 w-4 dark:invert" />
                              باز کردن فایل
                            </a>
                            <a
                              href={activePreviewFileUrl || "#"}
                              download
                              className={`h-10 rounded-xl inline-flex items-center justify-center gap-2 text-xs font-bold transition ${activePreviewFileUrl ? "bg-black text-white hover:bg-black/90" : "pointer-events-none bg-black/[0.06] text-black/35 dark:bg-white/[0.06] dark:text-white/35"}`}
                            >
                              <img src="/images/icons/download.svg" alt="" className="h-4 w-4 invert" />
                              دانلود فایل
                            </a>
                          </div>
                        ) : null}

                        {previewFiles.length ? (
                          <div className="max-h-40 overflow-y-auto rounded-2xl border border-black/10 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900">
                            <div className="grid grid-cols-1 gap-2">
                              {previewFiles.map((file, index) => {
                                const active = index === previewFileIndex;
                                return (
                                  <button
                                    key={`${file.group}_${file.id}_${index}`}
                                    type="button"
                                    onClick={() => setPreviewFileIndex(index)}
                                    className={`min-w-0 rounded-xl border px-3 py-2 text-right transition ${active ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/10 bg-black/[0.02] hover:bg-black/[0.04] dark:border-neutral-800 dark:bg-white/[0.03] dark:hover:bg-white/[0.07]"}`}
                                  >
                                    <div className="truncate text-xs font-bold">{file.name}</div>
                                    <div className={`mt-1 flex items-center justify-between gap-2 text-[11px] ${active ? "text-white/70 dark:text-black/60" : "text-black/50 dark:text-neutral-400"}`}>
                                      <span className="truncate">{file.group}</span>
                                      <span>{file.size ? toFaDigits(formatBytes(file.size)) : ""}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {relatedLetterPreview &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 md:p-6" dir="rtl">
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setRelatedLetterPreviewId("")} />
            <div className="relative flex h-[min(84vh,720px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-black shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
              <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-neutral-800">
                <div className="min-w-0">
                  <div className="text-base font-bold">پیش نمایش سند مرتبط</div>
                  <div className="mt-1 truncate text-xs text-black/55 dark:text-neutral-400">
                    {toFaDigits(secretariatNoOf(relatedLetterPreview) || letterNoOf(relatedLetterPreview) || letterIdOf(relatedLetterPreview))}
                    {subjectOf(relatedLetterPreview) ? ` - ${subjectOf(relatedLetterPreview)}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRelatedLetterPreviewId("")}
                  className={iconBtnCls}
                  aria-label="بستن"
                  title="بستن"
                >
                  <img src="/images/icons/bastan.svg" alt="" className="w-5 h-5 dark:invert" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="flex h-full flex-col lg:flex-row">
                  <div className="h-full overflow-y-auto p-4 lg:w-[52%]">
                    {renderPreviewSectionTitle("اطلاعات نامه")}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {renderPreviewInfo("شماره نامه", toFaDigits(letterNoOf(relatedLetterPreview)))}
                      {renderPreviewInfo("تاریخ نامه", toFaDigits(letterDateOf(relatedLetterPreview)))}
                      {renderPreviewInfo("شماره ثبت دبیرخانه", toFaDigits(secretariatNoOf(relatedLetterPreview)))}
                      {renderPreviewInfo("تاریخ ثبت دبیرخانه", toFaDigits(letterSecretariatDateOf(relatedLetterPreview)))}
                      {renderPreviewInfo("نوع سند", letterKindLabelOf(relatedLetterPreview))}
                      {renderPreviewInfo("از", letterSenderOf(relatedLetterPreview))}
                      {renderPreviewInfo("به", letterReceiverOf(relatedLetterPreview))}
                      {renderPreviewInfo("سازمان / شرکت", orgOf(relatedLetterPreview))}
                    </div>
                    <div className={`${previewInfoItemCls} mt-2`}>
                      <div className={previewLabelCls}>موضوع</div>
                      <div className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-7 text-black dark:text-neutral-100">
                        {previewValue(subjectOf(relatedLetterPreview))}
                      </div>
                    </div>
                    <div className={`${previewInfoItemCls} mt-2`}>
                      <div className={previewLabelCls}>شرح</div>
                      <div className="mt-1 whitespace-pre-wrap text-sm leading-7 text-black dark:text-neutral-100">
                        {previewValue(letterDescriptionOf(relatedLetterPreview))}
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl border border-black/10 bg-black/[0.02] p-2 dark:border-neutral-800 dark:bg-white/[0.03]">
                      <div className="mb-2 text-xs font-bold text-black/55 dark:text-neutral-400">پیوست‌ها</div>
                      {relatedLetterPreviewFiles.length ? (
                        <div className="grid grid-cols-1 gap-2">
                          {relatedLetterPreviewFiles.map((file) => (
                            <a
                              key={file.id}
                              href={file.url || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className={`rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold transition dark:border-neutral-800 dark:bg-neutral-900 ${file.url ? "hover:bg-black/[0.04] dark:hover:bg-neutral-800" : "pointer-events-none text-black/40 dark:text-white/40"}`}
                            >
                              {file.name}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="py-3 text-center text-xs text-black/50 dark:text-neutral-400">پیوستی ثبت نشده است.</div>
                      )}
                    </div>
                  </div>

                  <div className="flex min-h-[280px] flex-col border-t border-black/10 bg-black/[0.015] p-3 lg:w-[48%] lg:border-r lg:border-t-0 dark:border-neutral-800 dark:bg-white/[0.02]">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="text-sm font-bold">فایل نامه</div>
                      <div className="rounded-full bg-black/[0.06] px-2 py-0.5 text-xs font-semibold dark:bg-white/10">
                        {toFaDigits(relatedLetterPreviewFiles.length)}
                      </div>
                    </div>
                    <div className="min-h-[260px] flex-1 overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                      {relatedLetterPreviewFile?.url ? (
                        relatedLetterPreviewFile.isPdf ? (
                          <object data={`${relatedLetterPreviewFile.url}#view=FitH`} type="application/pdf" className="h-full min-h-[300px] w-full">
                            <iframe title="related_letter_pdf_preview" src={`${relatedLetterPreviewFile.url}#view=FitH`} className="h-full min-h-[300px] w-full" />
                          </object>
                        ) : relatedLetterPreviewFile.isImage ? (
                          <img src={relatedLetterPreviewFile.url} alt="" className="h-full min-h-[300px] w-full object-contain" />
                        ) : (
                          <div className="grid h-full min-h-[300px] place-items-center p-6 text-center">
                            <div>
                              <div className="text-sm font-bold">پیش نمایش این نوع فایل در دسترس نیست.</div>
                              <a href={relatedLetterPreviewFile.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-black px-4 text-xs font-bold text-white">
                                باز کردن فایل
                              </a>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="grid h-full min-h-[300px] place-items-center p-6 text-center text-sm font-bold text-black/55 dark:text-neutral-400">
                          فایلی برای پیش نمایش وجود ندارد.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

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
                    const checked =
                      relatedPickTarget === "insurance"
                        ? String(currentRelatedLetterId || "") === id
                        : selectedRelatedLetterIds.includes(id);
                    const no = letterNoOf(letter) || id;
                    const secretariatNo = secretariatNoOf(letter);

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          if (relatedPickTarget === "insurance") {
                            setInsuranceField("relatedLetterId", checked ? "" : id);
                            setRelatedPickOpen(false);
                          } else {
                            setForm((prev) => {
                              const current = normalizeIdList(prev.relatedLetterIds?.length ? prev.relatedLetterIds : prev.relatedLetterId ? [prev.relatedLetterId] : []);
                              const nextIds = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
                              return {
                                ...prev,
                                relatedLetterIds: nextIds,
                                relatedLetterId: nextIds[0] || "",
                              };
                            });
                          }
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
