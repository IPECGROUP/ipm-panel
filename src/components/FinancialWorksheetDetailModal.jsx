import React, { useEffect } from "react";
import { createPortal } from "react-dom";

const fa = (value) => String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
const first = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
const money = (value) => fa(new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(value) || 0));
const present = (value) => value !== undefined && value !== null && String(value).trim() !== "";

function DetailField({ label, value, wide = false }) {
  if (!present(value)) return null;
  return <div className={`rounded-xl border border-black/10 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.04] ${wide ? "sm:col-span-2" : ""}`}>
    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{label}</div>
    <div className="mt-1 break-words text-sm font-semibold leading-7 text-neutral-900 dark:text-white">{fa(value)}</div>
  </div>;
}

function DetailSection({ title, children }) {
  return <section className="rounded-2xl border border-black/10 bg-black/[0.025] p-3.5 dark:border-white/10 dark:bg-white/[0.035]">
    <h3 className="mb-3 text-sm font-bold">{title}</h3>
    <div className="grid gap-2.5 sm:grid-cols-2">{children}</div>
  </section>;
}

export default function FinancialWorksheetDetailModal({ row, kind, project, contract, currency, currencySource, receiptTypeLabel, letters, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const source = row.raw || {};
  const receipt = kind === "receipts";
  const label = receipt ? "جزئیات دریافتی / پرداختی" : "جزئیات صورت وضعیت";
  const typeRows = Array.isArray(source.receipt_types) && source.receipt_types.length
    ? source.receipt_types
    : [{ type: first(source.receipt_type, row.receiptType), number: first(source.receipt_no, row.number), otherDescription: first(source.receipt_type_other_description, row.receiptTypeOtherDescription) }];
  const deductions = Array.isArray(source.other_deductions) ? source.other_deductions.filter((item) => present(item?.amount) || present(item?.description)) : [];
  const relatedIds = Array.isArray(source.related_letter_ids) ? source.related_letter_ids : [];
  const files = Array.isArray(source.uploaded_files) ? source.uploaded_files : [];
  const letterById = new Map((letters || []).map((letter) => [String(letter.id ?? letter.letter_id ?? letter.letterId), letter]));
  const amount = (value) => present(value) ? money(value) : undefined;

  return createPortal(<div dir="rtl" className="fixed inset-0 z-[10002] flex items-center justify-center p-3 sm:p-6">
    <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
    <section role="dialog" aria-modal="true" aria-label={label} className="relative flex max-h-[min(88vh,820px)] w-[min(900px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-white">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black/10 px-4 py-3.5 dark:border-white/10 sm:px-5">
        <div className="min-w-0"><h2 className="text-base font-bold">{label}</h2><p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">{row.number ? `شماره ${fa(row.number)}` : `تاریخ ${fa(row.date || "—")}`}</p></div>
        <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black text-white transition hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200" aria-label="بستن" title="بستن"><img src="/images/icons/bastan.svg" alt="" className="h-5 w-5 invert dark:invert-0" /></button>
      </header>
      <div className="space-y-3 overflow-y-auto p-4 sm:p-5">
        <DetailSection title="اطلاعات اصلی">
          <DetailField label="پروژه" value={project} wide />
          <DetailField label="قرارداد" value={contract} wide />
          {!receipt && <DetailField label="شماره صورت وضعیت" value={first(source.statement_no, row.number)} />}
          <DetailField label="تاریخ شمسی" value={first(source.jalali_date, row.date)} />
          <DetailField label="تاریخ میلادی" value={source.gregorian_date} />
          {receipt && <DetailField label="شرح" value={first(source.description, row.description)} wide />}
          {!receipt && <DetailField label="عنوان صورت وضعیت" value={first(source.title, source.statement_title)} wide />}
        </DetailSection>

        {receipt ? <>
          {typeRows.some((item) => present(item?.type) || present(item?.number) || present(item?.otherDescription) || present(item?.other_description)) && <DetailSection title="مبنای دریافت / پرداخت">
            {typeRows.map((item, index) => <div key={index} className="sm:col-span-2 rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">مورد {fa(index + 1)}</div>
              <div className="grid gap-2 sm:grid-cols-2"><DetailField label="مبنا" value={receiptTypeLabel(first(item?.type, row.receiptType))} /><DetailField label="شماره" value={item?.number} /><DetailField label="شرح سایر" value={first(item?.otherDescription, item?.other_description)} wide /></div>
            </div>)}
          </DetailSection>}
          <DetailSection title="مبالغ و ارز">
            <DetailField label="مبلغ دریافتی / پرداختی" value={amount(first(source.received_amount, row.receiptAmount))} />
            <DetailField label="مبلغ ارزی" value={amount(first(source.received_amount_foreign, row.receiptForeignAmount))} />
            <DetailField label="ارز" value={first(source.currency_label, currency)} />
            <DetailField label="ارز منشأ" value={first(source.currency_source_label, currencySource)} />
            <DetailField label="شرح ریالی" value={first(source.rial_description, row.rialDescription)} wide />
          </DetailSection>
        </> : <>
          <DetailSection title="مبالغ و کسورات">
            <DetailField label="مبلغ ناخالص" value={amount(first(source.gross_amount, row.grossAmount))} />
            <DetailField label="استهلاک پیش‌پرداخت" value={amount(source.prepayment_depreciation)} />
            <DetailField label="درصد سپرده بیمه" value={source.insurance_deposit_percent} />
            <DetailField label="سپرده بیمه" value={amount(source.insurance_deposit)} />
            <DetailField label="درصد سپرده حسن انجام کار" value={source.performance_deposit_percent} />
            <DetailField label="سپرده حسن انجام کار" value={amount(source.performance_deposit)} />
            <DetailField label="خالص بدون VAT" value={amount(source.net_without_vat)} />
            <DetailField label="وضعیت VAT" value={source.vat_status === "has" ? "دارد" : source.vat_status === "none" ? "ندارد" : source.vat_status} />
            <DetailField label="درصد VAT" value={source.vat_percent} />
            <DetailField label="مبلغ VAT" value={amount(first(source.vat_amount, row.vatAmount))} />
            <DetailField label="خالص با VAT" value={amount(source.net_with_vat)} />
            <DetailField label="ارز" value={first(source.currency_label, currency)} />
            <DetailField label="ارز منشأ" value={first(source.currency_source_label, currencySource)} />
          </DetailSection>
          {deductions.length > 0 && <DetailSection title="سایر کسورات">
            {deductions.map((item, index) => <div key={index} className="sm:col-span-2 grid gap-2 sm:grid-cols-2"><DetailField label={`مبلغ کسور ${fa(index + 1)}`} value={amount(item.amount)} /><DetailField label="شرح" value={item.description} /></div>)}
          </DetailSection>}
          {present(first(source.description, row.description)) && <DetailSection title="شرح"><DetailField label="شرح صورت وضعیت" value={first(source.description, row.description)} wide /></DetailSection>}
          {relatedIds.length > 0 && <DetailSection title="اسناد مرتبط">
            {relatedIds.map((id) => { const letter = letterById.get(String(id)); return <DetailField key={String(id)} label={`سند ${fa(id)}`} value={letter ? first(letter.secretariatNo, letter.secretariat_no, letter.letterNo, letter.letter_no, letter.subject, letter.title) : id} />; })}
          </DetailSection>}
          {files.length > 0 && <DetailSection title="فایل‌های پیوست">
            {files.map((file, index) => { const url = String(file?.url || file?.href || ""); const safeUrl = url.startsWith("/uploads/") || /^https?:\/\//i.test(url) ? url : ""; return <div key={index} className="rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">{safeUrl ? <a href={safeUrl} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">{fa(file?.name || `فایل ${index + 1}`)}</a> : <span className="font-semibold">{fa(file?.name || `فایل ${index + 1}`)}</span>}</div>; })}
          </DetailSection>}
        </>}
      </div>
    </section>
  </div>, document.body);
}
