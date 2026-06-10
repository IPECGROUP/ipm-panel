// کاربرگ مالی
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";
import { baseCurrenciesTablePreset as tablePreset } from "../components/ui/tablePresets.js";

function toFaDigits(s) {
  return String(s ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
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

function AmountInputWithMeta({
  value,
  onChange,
  metaLabel,
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

  const [tab, setTab] = useState("statement");
  const [formOpen, setFormOpen] = useState(false);
  const [err, setErr] = useState("");

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
  const [uploadDraftFiles, setUploadDraftFiles] = useState([]);
  const [letters, setLetters] = useState([]);
  const [lettersLoading, setLettersLoading] = useState(false);
  const [uploadLetterQuery, setUploadLetterQuery] = useState("");
  const [relatedLetterIds, setRelatedLetterIds] = useState([]);
  const [uploadDraftLetterIds, setUploadDraftLetterIds] = useState([]);
  const uploadInputRef = useRef(null);

  const [currencyItems, setCurrencyItems] = useState([]);
  const [currencySourceItems, setCurrencySourceItems] = useState([]);
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

  useEffect(() => {
    let stop = false;
    (async () => {
      setErr("");
      setProjectsLoading(true);
      setLettersLoading(true);
      try {
        const [pResp, tResp, sResp, cResp, lResp] = await Promise.all([
          api("/projects").catch(() => ({ items: [] })),
          api("/base/currencies/types").catch(() => ({ items: [] })),
          api("/base/currencies/sources").catch(() => ({ items: [] })),
          api("/contracts").catch(() => ({ items: [] })),
          api("/letters").catch(() => ({ items: [] })),
        ]);

        if (stop) return;

        const pList = pResp?.projects || pResp?.items || pResp?.data || [];
        setProjects(Array.isArray(pList) ? pList : []);

        const tList = tResp?.items || tResp?.data || tResp?.types || [];
        const sList = sResp?.items || sResp?.data || sResp?.sources || [];
        const cList = cResp?.items || cResp?.data || cResp?.contracts || [];
        const lList = lResp?.items || lResp?.data || lResp?.letters || [];
        setCurrencyItems(Array.isArray(tList) ? tList : []);
        setCurrencySourceItems(Array.isArray(sList) ? sList : []);
        setContractRows(Array.isArray(cList) ? cList : []);
        setLetters(
          (Array.isArray(lList) ? lList : [])
            .filter((letter) => letter && typeof letter === "object" && letterIdOf(letter))
            .sort((a, b) => String(letterIdOf(b)).localeCompare(String(letterIdOf(a)), "fa", { numeric: true })),
        );
      } catch (e) {
        if (!stop) setErr(e.message || "خطا در بارگذاری اطلاعات");
      } finally {
        if (!stop) setProjectsLoading(false);
        if (!stop) setLettersLoading(false);
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

  const contractById = useMemo(() => {
    const map = new Map();
    (Array.isArray(contractRows) ? contractRows : []).forEach((row) => {
      if (row?.id) map.set(String(row.id), row);
    });
    return map;
  }, [contractRows]);

  const contractNoForRow = useCallback(
    (row) => {
      if (!row) return "";
      const documentType = String(row.documentType ?? row.document_type ?? "main");
      if (documentType === "main") return String(row.contractNo || row.contract_no || "").trim();
      if (documentType === "sub") return String(row.subContractNo || row.sub_contract_no || "").trim();
      const parent = contractById.get(String(row.parentContractId || row.parent_contract_id || ""));
      return String(parent?.contractNo || parent?.contract_no || row.contractNo || row.contract_no || "").trim();
    },
    [contractById],
  );

  const documentTypeLabel = (type) => {
    if (type === "sub") return "فرعی";
    if (type === "appendix") return "الحاقیه";
    return "اصلی";
  };

  const projectContractOptions = useMemo(() => {
    const list = Array.isArray(contractRows) ? contractRows : [];
    return list
      .filter((row) => String(row?.projectId ?? row?.project_id ?? "") === String(projectId || ""))
      .filter((row) => ["main", "sub"].includes(String(row?.documentType ?? row?.document_type ?? "main")))
      .map((row) => ({
        row,
        id: String(row?.id || ""),
        no: contractNoForRow(row),
        parentNo: contractNoForRow(contractById.get(String(row?.parentContractId || row?.parent_contract_id || ""))),
        subject: String(row?.general?.contractSubject || ""),
        typeLabel: documentTypeLabel(row?.documentType || row?.document_type),
        documentType: String(row?.documentType ?? row?.document_type ?? "main"),
      }))
      .filter((item) => item.id && item.no)
      .sort((a, b) => {
        const noCompare = a.no.localeCompare(b.no, "fa", { numeric: true });
        if (noCompare) return noCompare;
        return a.typeLabel.localeCompare(b.typeLabel, "fa");
      });
  }, [contractById, contractNoForRow, contractRows, projectId]);

  useEffect(() => {
    if (!contractId) return;
    if (!projectContractOptions.some((item) => item.id === String(contractId))) setContractId("");
  }, [contractId, projectContractOptions]);

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

  const sumGross = useMemo(() => (worksheetRows || []).reduce((s, r) => s + Number(r.grossAmount || 0), 0), [worksheetRows]);
  const sumVat = useMemo(() => (worksheetRows || []).reduce((s, r) => s + Number(r.vatAmount || 0), 0), [worksheetRows]);
  const sumReceiptAmount = useMemo(() => (worksheetRows || []).reduce((s, r) => s + Number(r.receiptAmount || 0), 0), [worksheetRows]);
  const sumReceiptForeignAmount = useMemo(() => (worksheetRows || []).reduce((s, r) => s + Number(r.receiptForeignAmount || 0), 0), [worksheetRows]);

  const selectedContract = useMemo(() => contractById.get(String(contractId || "")) || null, [contractById, contractId]);
  const selectedContractFinancial = selectedContract?.financial && typeof selectedContract.financial === "object" ? selectedContract.financial : {};
  const selectedContractDocumentType = String(selectedContract?.documentType ?? selectedContract?.document_type ?? "main");
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
  const selectedCurrencyLabel = useMemo(
    () => readItemLabel((currencyItems || []).find((it) => readItemId(it) === String(currencyId))),
    [currencyItems, currencyId],
  );
  const selectedCurrencySourceLabel = useMemo(
    () => readItemLabel((currencySourceItems || []).find((it) => readItemId(it) === String(currencySourceId))),
    [currencySourceItems, currencySourceId],
  );
  const selectedCurrencyMetaLabel = useMemo(() => {
    const parts = [selectedCurrencyLabel, selectedCurrencySourceLabel].filter(Boolean);
    return parts.length ? parts.join(" / ") : "";
  }, [selectedCurrencyLabel, selectedCurrencySourceLabel]);
  const receiptTypeOptions = [
    { value: "prepayment", label: "پیش پرداخت" },
    { value: "statement", label: "صورت وضعیت" },
    { value: "interim", label: "علی الحساب" },
    { value: "vat", label: "ارزش افزوده" },
    { value: "other", label: "سایر" },
  ];

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
    () => (currencyItems || []).find((it) => readItemId(it) === String(receiptCurrencyId)),
    [currencyItems, receiptCurrencyId],
  );
  const selectedReceiptCurrencyLabel = useMemo(
    () => readItemLabel(selectedReceiptCurrency),
    [selectedReceiptCurrency],
  );
  const selectedReceiptCurrencySourceLabel = useMemo(
    () => readItemLabel((currencySourceItems || []).find((it) => readItemId(it) === String(receiptCurrencySourceId))),
    [currencySourceItems, receiptCurrencySourceId],
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

  const openUploadModal = () => {
    setUploadDraftFiles(Array.isArray(uploadedFiles) ? uploadedFiles : []);
    setUploadDraftLetterIds(Array.isArray(relatedLetterIds) ? relatedLetterIds : []);
    setUploadLetterQuery("");
    setUploadOpen(true);
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
  const selectedRelatedLetters = useMemo(() => {
    const ids = new Set((relatedLetterIds || []).map(String));
    return (letters || []).filter((letter) => ids.has(String(letterIdOf(letter))));
  }, [letters, relatedLetterIds]);
  const toggleUploadDraftLetter = (id) => {
    setUploadDraftLetterIds((prev) => {
      const list = Array.isArray(prev) ? prev.map(String) : [];
      return list.includes(String(id)) ? list.filter((item) => item !== String(id)) : [...list, String(id)];
    });
  };

  const iconBtnCls =
    "h-10 w-10 inline-grid place-items-center !bg-transparent !ring-0 !border-0 !shadow-none hover:opacity-80 active:opacity-70 transition disabled:opacity-50";
  const worksheetTabs = useMemo(
    () => [
      { id: "statement", label: isSelectedSubContract ? "صورت وضعیت‌ها / صورت حساب‌ها" : "صورت وضعیت‌ها" },
      { id: "receipts", label: isSelectedSubContract ? "پرداختی‌ها" : "دریافتی‌ها" },
    ],
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

  const handleViewRow = (row) => {
    const dt = row?.date ? toFaDigits(row.date) : "—";
    if (tab === "receipts") {
      const amount = toFaDigits(formatMoney(row?.receiptAmount || 0));
      const amountForeign = toFaDigits(formatMoney(row?.receiptForeignAmount || 0));
      window.alert(`تاریخ: ${dt}\nمبلغ دریافت شده: ${amount}\nمبلغ دریافت شده ارزی: ${amountForeign}`);
      return;
    }
    const no = row?.number ? toFaDigits(row.number) : "—";
    window.alert(`شماره: ${no}\nتاریخ: ${dt}`);
  };

  const handleEditRow = (row) => {
    setFormOpen(true);
    if (tab === "receipts") {
      setReceiptTypeRows([
        {
          id: Date.now() + Math.random(),
          type: String(row?.receiptType || ""),
          number: String(row?.number || ""),
          otherDescription: String(row?.receiptTypeOtherDescription || ""),
        },
      ]);
      setReceiptJalaliDate(String(row?.date || ""));
      setReceiptReceivedAmount(formatAmountInput(row?.receiptAmount || ""));
      setReceiptCurrencyId(String(row?.currencyId || ""));
      setReceiptCurrencySourceId(String(row?.currencySourceId || ""));
      setReceiptRialDescription(String(row?.rialDescription || ""));
      setReceiptDescription(String(row?.description || ""));
      return;
    }
    setStatementNo(String(row?.number || ""));
    setJalaliDate(String(row?.date || ""));
    setGrossAmount(formatAmountInput(row?.grossAmount || ""));
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

  const resetStatementForm = () => {
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
      currency_label: selectedCurrencyLabel,
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
        name: file?.name || "فایل",
        size: file?.size || 0,
        type: file?.type || "",
      })),
    };

    try {
      const saved = await api("/financial-worksheet", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const item = saved?.item || saved?.data || payload;
      setWorksheetRows((prev) => [...normalizeRows([item]), ...(Array.isArray(prev) ? prev : [])]);
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
        number: String(row?.type === "statement" ? row?.number || "" : "").trim(),
        otherDescription: String(row?.type === "other" ? row?.otherDescription || "" : "").trim(),
      }))
      .filter((row) => row.type);
    if (!cleanedTypeRows.length) {
      setErr("بابت دریافتی را انتخاب کنید.");
      return;
    }
    if (cleanedTypeRows.some((row) => row.type === "statement" && !row.number)) {
      setErr("شماره صورت وضعیت را وارد کنید.");
      return;
    }
    if (cleanedTypeRows.some((row) => row.type === "other" && !row.otherDescription)) {
      setErr("بابت دریافتی سایر را وارد کنید.");
      return;
    }
    if (!receiptJalaliDate) {
      setErr("تاریخ دریافت را انتخاب کنید.");
      return;
    }

    const firstType = cleanedTypeRows[0] || {};
    const payload = {
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
      currency_label: selectedReceiptCurrencyLabel,
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
      setWorksheetRows((prev) => [...normalizeRows([item]), ...(Array.isArray(prev) ? prev : [])]);
      resetReceiptForm();
      setFormOpen(false);
    } catch (e) {
      setErr(e.message || "خطا در ثبت دریافتی");
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
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div>
              <label className="text-xs text-neutral-600 dark:text-white/60">پروژه</label>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setContractId("");
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

            <div>
              <label className="text-xs text-neutral-600 dark:text-white/60">شماره قرارداد</label>
              <select
                value={contractId}
                onChange={(e) => setContractId(e.target.value)}
                disabled={!projectId}
                className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15 disabled:opacity-60"
              >
                <option value="">{projectId ? "انتخاب قرارداد" : "ابتدا پروژه را انتخاب کنید"}</option>
                {projectContractOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {toFaDigits(item.no)} - {item.typeLabel}
                    {item.documentType === "sub" && item.parentNo ? ` - اصلی: ${toFaDigits(item.parentNo)}` : ""}
                    {item.subject ? ` - ${item.subject}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {canShowWorksheet ? (
            <>
          <div className="flex items-start gap-2">
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
                  {(receiptTypeRows || []).map((row, idx) => {
                    const showReceiptNumber = row.type === "statement";
                    return (
                    <div key={row.id} className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-end">
                      <div className={showReceiptNumber ? "xl:col-span-5" : "xl:col-span-10"}>
                        <label className="text-xs text-neutral-600 dark:text-white/60">بابت دریافتی</label>
                        {row.type === "other" ? (
                          <div className="mt-1 flex h-11 w-full items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-neutral-900 dark:border-white/15 dark:bg-white/5 dark:text-white">
                            <input
                              value={row.otherDescription}
                              onChange={(e) => updateReceiptTypeRow(row.id, { otherDescription: e.target.value })}
                              className="min-w-0 flex-1 bg-transparent outline-none"
                              type="text"
                              placeholder="بابت دریافتی را وارد کنید..."
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
                                ...(nextType !== "statement" ? { number: "" } : {}),
                                ...(nextType !== "other" ? { otherDescription: "" } : {}),
                              });
                            }}
                            className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15"
                          >
                            <option value="">انتخاب بابت دریافتی</option>
                            {receiptTypeOptions.map((op) => (
                              <option key={op.value} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {showReceiptNumber ? (
                        <div className="xl:col-span-5">
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

                      <div className="xl:col-span-2 flex xl:justify-end gap-2">
                        {idx === 0 ? (
                          <button type="button" onClick={addReceiptTypeRow} className="h-10 w-10 rounded-xl border border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10 grid place-items-center" aria-label="افزودن بابت دریافتی" title="افزودن">
                            <img src="/images/icons/afzodan.svg" alt="" className="w-4 h-4 dark:invert" />
                          </button>
                        ) : (
                          <button type="button" onClick={() => removeReceiptTypeRow(row.id)} className="h-10 w-10 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500/50 dark:text-red-400 dark:hover:bg-red-500/10 grid place-items-center" aria-label="حذف این ردیف" title="حذف">
                            <span className="text-xl leading-none">−</span>
                          </button>
                        )}
                      </div>
                    </div>
                    );
                  })}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                    <div className="lg:col-span-4">
                      <label className="text-xs text-neutral-600 dark:text-white/60">تاریخ دریافت</label>
                      <div className="mt-1">
                        <JalaliPopupDatePicker value={receiptJalaliDate} onChange={setReceiptJalaliDate} />
                      </div>
                      <div className="mt-2 text-xs text-black/55 dark:text-neutral-400">
                        میلادی: <span className="font-semibold text-black dark:text-neutral-100">{receiptGregorianDate || "انتخاب نشده"}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                  <div className="lg:col-span-3">
                    <label className="text-xs text-neutral-600 dark:text-white/60">شماره صورت وضعیت</label>
                    <input
                      value={statementNo}
                      onChange={(e) => setStatementNo(e.target.value)}
                      className="mt-1 w-full h-10 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15"
                      type="text"
                      placeholder="شماره صورت وضعیت"
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <label className="text-xs text-neutral-600 dark:text-white/60">تاریخ</label>
                    <div className="mt-1">
                      <JalaliPopupDatePicker value={jalaliDate} onChange={setJalaliDate} />
                    </div>
                    <div className="mt-2 text-xs text-black/55 dark:text-neutral-400">
                      میلادی: <span className="font-semibold text-black dark:text-neutral-100">{gregorianDate || "انتخاب نشده"}</span>
                    </div>
                  </div>

                  <div className="lg:col-span-6">
                    <label className="text-xs text-neutral-600 dark:text-white/60">عنوان صورت وضعیت دوره عملکرد</label>
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1 w-full h-10 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15"
                      type="text"
                      placeholder="عنوان صورت وضعیت..."
                    />
                  </div>
                </div>
              )}

              {tab === "receipts" ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3">
                    <div className="xl:col-span-5">
                      <label className="text-xs text-neutral-600 dark:text-white/60">مبلغ دریافت شده</label>
                      <input
                        value={receiptReceivedAmount}
                        onChange={(e) => setReceiptReceivedAmount(formatAmountInput(e.target.value))}
                        className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15"
                        type="text"
                        dir="ltr"
                        placeholder="0"
                      />
                    </div>

                    <div className="xl:col-span-3">
                      <label className="text-xs text-neutral-600 dark:text-white/60">ارز</label>
                      <select value={receiptCurrencyId} onChange={(e) => setReceiptCurrencyId(e.target.value)} className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15">
                        <option value="">انتخاب ارز</option>
                        {(currencyItems || []).map((it) => {
                          const id = readItemId(it);
                          if (!id) return null;
                          return <option key={id} value={id}>{readItemLabel(it) || id}</option>;
                        })}
                      </select>
                    </div>

                    <div className="xl:col-span-4">
                      <label className="text-xs text-neutral-600 dark:text-white/60">منشا</label>
                      <select value={receiptCurrencySourceId} onChange={(e) => setReceiptCurrencySourceId(e.target.value)} className="mt-1 w-full h-11 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15">
                        <option value="">انتخاب منشا</option>
                        {(currencySourceItems || []).map((it) => {
                          const id = readItemId(it);
                          if (!id) return null;
                          return <option key={id} value={id}>{readItemLabel(it) || id}</option>;
                        })}
                      </select>
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

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="text-xs text-neutral-600 dark:text-white/60">توضیحات</label>
                      <textarea
                        value={receiptDescription}
                        onChange={(e) => setReceiptDescription(e.target.value)}
                        className="mt-1 w-full min-h-[88px] rounded-xl px-3 py-2 border outline-none resize-y bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15"
                        placeholder="توضیحات..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <button
                      type="button"
                      onClick={handleSaveReceipt}
                      className="h-10 w-10 rounded-xl bg-black text-white ring-1 ring-black/15 transition flex items-center justify-center hover:bg-black/90 dark:bg-white dark:text-black dark:ring-white/10"
                      aria-label="تایید و ثبت"
                      title="تایید و ثبت"
                    >
                      <img src="/images/icons/check.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
                    </button>
                  </div>
                </>
              ) : (
                <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3">
                <div className="xl:col-span-5">
                  <label className="text-xs text-neutral-600 dark:text-white/60">مبلغ ناخالص تایید شده</label>
                  <AmountInputWithMeta
                    value={grossAmount}
                    onChange={(e) => setGrossAmount(formatAmountInput(e.target.value))}
                  />
                </div>

                <div className="xl:col-span-3">
                  <label className="text-xs text-neutral-600 dark:text-white/60">ارز</label>
                  <select value={currencyId} onChange={(e) => setCurrencyId(e.target.value)} className="mt-1 w-full h-10 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15">
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
                  <select value={currencySourceId} onChange={(e) => setCurrencySourceId(e.target.value)} className="mt-1 w-full h-10 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15">
                    <option value="">انتخاب منشا</option>
                    {(currencySourceItems || []).map((it) => {
                      const id = readItemId(it);
                      if (!id) return null;
                      return <option key={id} value={id}>{readItemLabel(it) || id}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-black/[0.025] p-3 space-y-3 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="text-sm font-semibold text-neutral-800 dark:text-white/85">کسور</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
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
                  <div key={row.id} className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-end">
                    <div className="xl:col-span-4">
                      <label className="text-xs text-neutral-600 dark:text-white/60">سایر کسور</label>
                      <AmountInputWithMeta
                        value={row.amount}
                        onChange={(e) => updateOtherDebtRow(row.id, { amount: formatAmountInput(e.target.value) })}
                        metaLabel={selectedCurrencyMetaLabel}
                      />
                    </div>

                    <div className="xl:col-span-7">
                      <label className="text-xs text-neutral-600 dark:text-white/60">شرح</label>
                      <input value={row.description} onChange={(e) => updateOtherDebtRow(row.id, { description: e.target.value })} className="mt-1 w-full h-10 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15" type="text" placeholder="شرح..." />
                    </div>

                    <div className="xl:col-span-1 flex xl:justify-end gap-2">
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

              <div className="grid grid-cols-1 gap-3 items-start lg:grid-cols-[minmax(280px,360px)_minmax(0,560px)] lg:justify-start">
                <div>
                  <label className="text-xs text-neutral-600 dark:text-white/60">جمع خالص تایید شده بدون VAT</label>
                  <AmountInputWithMeta value={formatComputedAmount(netWithoutVatNumber)} readOnly metaLabel={selectedCurrencyMetaLabel} />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_260px] sm:items-start sm:justify-start">
                  <div>
                    <label className="text-xs text-neutral-600 dark:text-white/60">VAT</label>
                    <div className="mt-1 flex h-10 flex-wrap items-center gap-2">
                      {[
                        { value: "has", label: "دارد" },
                        { value: "none", label: "ندارد" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setVatStatus(option.value);
                            if (option.value !== "has") setVatPercent("");
                          }}
                          className={`h-10 rounded-xl border px-4 text-sm font-semibold transition ${
                            vatStatus === option.value
                              ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                              : "border-black/10 bg-white text-neutral-900 hover:bg-black/[0.04] dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                      {vatStatus === "has" ? (
                        <div className="flex h-10 items-center gap-1 rounded-xl border border-black/10 bg-white px-3 dark:border-white/15 dark:bg-white/5">
                          <input
                            value={vatPercent}
                            onChange={(e) => setVatPercent(formatAmountInput(e.target.value))}
                            className="w-16 bg-transparent text-center outline-none text-neutral-900 dark:text-white"
                            type="text"
                            inputMode="decimal"
                            dir="ltr"
                            placeholder="0"
                          />
                          <span className="text-sm text-neutral-600 dark:text-white/70">%</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-600 dark:text-white/60">مبلغ VAT</label>
                    <AmountInputWithMeta value={formatComputedAmount(vatAmountNumber)} readOnly metaLabel={selectedCurrencyMetaLabel} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                <div className="lg:col-span-5">
                  <label className="text-xs text-neutral-600 dark:text-white/60">جمع خالص تایید شده با احتساب VAT</label>
                  <AmountInputWithMeta value={formatComputedAmount(netWithVatNumber)} readOnly metaLabel={selectedCurrencyMetaLabel} />
                </div>
                <div className="lg:col-span-3 flex items-end">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-neutral-600 dark:text-white/60">اسناد</span>
                    <button type="button" onClick={openUploadModal} className="h-10 px-4 rounded-xl border transition inline-flex items-center justify-center gap-2 whitespace-nowrap border-black/10 bg-white text-neutral-900 hover:bg-black/[0.02] dark:border-white/15 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10" title="بارگذاری اسناد" aria-label="بارگذاری اسناد">
                    <img src="/images/icons/upload.svg" alt="" className="w-5 h-5 dark:invert" />
                    بارگذاری اسناد
                    {uploadedFiles.length || relatedLetterIds.length ? <span className="text-xs opacity-80">({toFaDigits(uploadedFiles.length + relatedLetterIds.length)})</span> : null}
                    </button>
                  </div>
                </div>
                <div className="lg:col-span-4 flex justify-start lg:justify-end">
                  <button
                    type="button"
                    onClick={handleSaveStatement}
                    className="h-10 w-10 rounded-xl bg-black text-white ring-1 ring-black/15 transition flex items-center justify-center hover:bg-black/90 dark:bg-white dark:text-black dark:ring-white/10"
                    aria-label="تایید و ثبت"
                    title="تایید و ثبت"
                  >
                    <img src="/images/icons/check.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
                  </button>
                </div>
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
                    <span key={`${file?.name || "file"}_${index}`} className="max-w-[220px] truncate rounded-lg bg-black/[0.05] px-2 py-1 dark:bg-white/10">
                      {file?.name || `فایل ${toFaDigits(index + 1)}`}
                    </span>
                  ))}
                </div>
              ) : null}
                </>
              )}
            </div>
          )}

          <TableWrap>
            <div className={tablePreset.outer}>
              <div className={tablePreset.innerPad}>
                <div className={tablePreset.frame + " shadow-sm"}>
                  <div className="overflow-x-auto">
                    <table className={tablePreset.table + " table-fixed text-[12px] md:text-[13px]"} dir="rtl">
                      <THead>
                        {tab === "receipts" ? (
                          <tr className={tablePreset.headRow + " sticky top-0 z-10"}>
                            <TH className={`w-14 ${tablePreset.th}`}>#</TH>
                            <TH className={`w-36 ${tablePreset.th}`}>تاریخ</TH>
                            <TH className={`w-44 ${tablePreset.th}`}>مبلغ دریافت شده</TH>
                            <TH className={`w-44 ${tablePreset.th}`}>مبلغ دریافت شده ارزی</TH>
                            <TH className={`w-36 ${tablePreset.th}`}>اقدامات</TH>
                          </tr>
                        ) : (
                          <tr className={tablePreset.headRow + " sticky top-0 z-10"}>
                            <TH className={`w-14 ${tablePreset.th}`}>#</TH>
                            <TH className={`w-32 ${tablePreset.th}`}>شماره صورت وضعیت</TH>
                            <TH className={`w-32 ${tablePreset.th}`}>تاریخ</TH>
                            <TH className={`w-40 ${tablePreset.th}`}>مبلغ ناخالص</TH>
                            <TH className={`w-32 ${tablePreset.th}`}>VAT</TH>
                            <TH className={`w-32 ${tablePreset.th}`}>ارز منشا</TH>
                            <TH className={`w-36 ${tablePreset.th}`}>اقدامات</TH>
                          </tr>
                        )}
                      </THead>

                      <tbody className={tablePreset.body}>
                        {tab === "receipts" ? (
                          rowsLoading ? (
                            <TR><TD colSpan={5} className={tablePreset.emptyRow}>در حال بارگذاری...</TD></TR>
                          ) : !worksheetRows.length ? (
                            <TR><TD colSpan={5} className={tablePreset.emptyRow}>موردی برای نمایش وجود ندارد.</TD></TR>
                          ) : (
                            <>
                              <TR className="text-center bg-black/[0.04] font-semibold dark:bg-white/10">
                                <TD>-</TD>
                                <TD>جمع</TD>
                                <TD>{toFaDigits(formatMoney(sumReceiptAmount))}</TD>
                                <TD>{toFaDigits(formatMoney(sumReceiptForeignAmount))}</TD>
                                <TD>—</TD>
                              </TR>
                              {worksheetRows.map((row, idx) => (
                                <TR key={row.id} className="text-center hover:bg-black/[0.06] transition-colors dark:hover:bg-white/15">
                                  <TD>{toFaDigits(idx + 1)}</TD>
                                  <TD>{row.date ? toFaDigits(row.date) : "—"}</TD>
                                  <TD>{toFaDigits(formatMoney(row.receiptAmount || 0))}</TD>
                                  <TD>{toFaDigits(formatMoney(row.receiptForeignAmount || 0))}</TD>
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
                          )
                        ) : rowsLoading ? (
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
            </>
          ) : null}

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

                <div className="max-h-[78vh] overflow-y-auto p-4 space-y-4">
                  <div className="rounded-2xl border border-black/10 dark:border-white/10 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-neutral-700 dark:text-white/80">اسناد مرتبط</div>
                      <div className="rounded-full bg-black/[0.06] px-2 py-0.5 text-xs font-semibold dark:bg-white/10">
                        {toFaDigits(uploadDraftLetterIds.length)}
                      </div>
                    </div>
                    <input
                      value={uploadLetterQuery}
                      onChange={(e) => setUploadLetterQuery(e.target.value)}
                      className="w-full h-10 rounded-xl px-3 border outline-none bg-white text-neutral-900 border-black/10 dark:bg-white/5 dark:text-white dark:border-white/15"
                      type="text"
                      placeholder="جستجو با شماره / موضوع / سازمان / شماره ثبت دبیرخانه"
                    />
                    <div className="max-h-56 overflow-auto rounded-xl border border-black/10 p-2 dark:border-white/10">
                      {lettersLoading ? (
                        <div className="p-3 text-center text-sm text-neutral-500 dark:text-white/60">در حال بارگذاری نامه‌ها...</div>
                      ) : filteredUploadLetters.length ? (
                        filteredUploadLetters.map((letter) => {
                          const id = String(letterIdOf(letter));
                          const checked = uploadDraftLetterIds.map(String).includes(id);
                          const no = secretariatNoOf(letter) || letterNoOf(letter) || id;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => toggleUploadDraftLetter(id)}
                              className="w-full rounded-xl px-3 py-2 text-right transition flex items-center justify-between gap-3 hover:bg-black/[0.04] dark:hover:bg-white/10"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold">{toFaDigits(no)}</span>
                                  {letterDateOf(letter) ? <span className="text-xs text-black/45 dark:text-white/45">{toFaDigits(letterDateOf(letter))}</span> : null}
                                </div>
                                <div className="mt-1 truncate text-xs text-black/60 dark:text-white/60">
                                  {subjectOf(letter) || orgOf(letter) || "بدون شرح"}
                                </div>
                              </div>
                              <div className="h-5 w-5 rounded-md border border-black/15 grid place-items-center shrink-0 dark:border-white/20">
                                {checked ? <span className="text-xs">✓</span> : null}
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-3 text-center text-sm text-neutral-500 dark:text-white/60">موردی پیدا نشد.</div>
                      )}
                    </div>
                  </div>

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
                        setRelatedLetterIds(uploadDraftLetterIds);
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
