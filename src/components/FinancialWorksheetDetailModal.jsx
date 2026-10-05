import React, { useEffect } from "react";
import { createPortal } from "react-dom";

const fa = (value) => String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
const first = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
const money = (value) => fa(new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(value) || 0));
const present = (value) => value !== undefined && value !== null && String(value).trim() !== "";

function DetailField({ label, value }) {
  if (!present(value)) return null;
  return <div className="flex flex-col gap-1 border-b border-black/[0.07] py-3 last:border-0 dark:border-white/10 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
    <div className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
    <div className="break-words text-sm font-semibold leading-6 text-neutral-900 dark:text-white sm:text-left">{fa(value)}</div>
  </div>;
}

function DetailSection({ title, number, children }) {
  return <section className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_7px_28px_-24px_rgba(0,0,0,.5)] dark:border-white/10 dark:bg-neutral-900">
    <div className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3.5 dark:border-white/10 sm:px-5"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-orange-50 text-xs font-bold text-orange-600 dark:bg-orange-400/15 dark:text-orange-300">{fa(number)}</span><h3 className="text-sm font-bold">{title}</h3></div>
    <div className="px-4 sm:px-5">{children}</div>
  </section>;
}

function Metric({ label, value, tone = "light" }) {
  if (!present(value)) return null;
  return <div className={`min-w-0 rounded-2xl p-4 ${tone === "plain" ? "border border-black/[0.08] bg-transparent dark:border-white/10" : "bg-white ring-1 ring-black/[0.07] dark:bg-neutral-900 dark:ring-white/10"}`}><div className="text-[11px] text-neutral-500 dark:text-neutral-400">{label}</div><div className="mt-2 break-words text-lg font-bold text-neutral-900 dark:text-white sm:text-xl" dir="ltr">{fa(value)}</div></div>;
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
    <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" onClick={onClose} />
    <section role="dialog" aria-modal="true" aria-label={label} className="relative flex max-h-[min(90vh,860px)] w-[min(930px,calc(100vw-24px))] flex-col overflow-hidden rounded-[26px] border border-white/20 bg-[#f7f7f6] text-neutral-900 shadow-[0_30px_90px_rgba(0,0,0,.32)] dark:border-white/10 dark:bg-neutral-950 dark:text-white">
      <header className="shrink-0 border-b border-black/[0.08] bg-white px-5 py-4 dark:border-white/10 dark:bg-neutral-900 sm:px-6">
        <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="text-base font-bold sm:text-lg">{label}</h2><div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">{present(row.number) && <span className="break-all">{receipt ? "شماره" : "شماره صورت وضعیت"}: <b className="text-neutral-800 dark:text-neutral-100">{fa(row.number)}</b></span>}{present(row.date) && <span>تاریخ: <b className="text-neutral-800 dark:text-neutral-100">{fa(row.date)}</b></span>}</div></div><button autoFocus type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black text-white transition hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200" aria-label="بستن" title="بستن"><img src="/images/icons/bastan.svg" alt="" className="h-4 w-4 invert dark:invert-0" /></button></div>
      </header>
      <div className="space-y-5 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-wrap gap-x-8 gap-y-3 rounded-2xl border border-black/[0.07] bg-white px-5 py-4 dark:border-white/10 dark:bg-neutral-900">
          {present(project) && <div className="min-w-[180px] flex-1"><div className="text-[11px] text-neutral-500 dark:text-neutral-400">پروژه</div><div className="mt-1 break-words text-sm font-bold">{fa(project)}</div></div>}
          {present(contract) && <div className="min-w-[180px] flex-1"><div className="text-[11px] text-neutral-500 dark:text-neutral-400">قرارداد</div><div className="mt-1 break-words text-sm font-bold">{fa(contract)}</div></div>}
        </div>
        {receipt ? <div className="grid gap-3 sm:grid-cols-2"><Metric label="مبلغ دریافتی / پرداختی" value={amount(first(source.received_amount, row.receiptAmount))} /><Metric label="مبلغ ارزی" value={amount(first(source.received_amount_foreign, row.receiptForeignAmount))} tone="plain" /></div> : <div className="grid gap-3 sm:grid-cols-3"><Metric label="مبلغ ناخالص" value={amount(first(source.gross_amount, row.grossAmount))} /><Metric label="مبلغ VAT" value={amount(first(source.vat_amount, row.vatAmount))} tone="plain" /><Metric label="خالص با VAT" value={amount(source.net_with_vat)} tone="plain" /></div>}
        <DetailSection number="01" title={receipt ? "اطلاعات دریافت / پرداخت" : "مشخصات صورت وضعیت"}>
          <DetailField label="تاریخ میلادی" value={source.gregorian_date} />
          {!receipt && <DetailField label="عنوان صورت وضعیت" value={first(source.title, source.statement_title)} wide />}
          <DetailField label="ارز" value={first(source.currency_label, currency)} />
          <DetailField label="ارز منشأ" value={first(source.currency_source_label, currencySource)} />
          {receipt && <DetailField label="شرح ریالی" value={first(source.rial_description, row.rialDescription)} />}
        </DetailSection>

        {receipt ? <>
          {typeRows.some((item) => present(item?.type) || present(item?.number) || present(item?.otherDescription) || present(item?.other_description)) && <DetailSection number="02" title="مبنای دریافت / پرداخت">
            {typeRows.map((item, index) => <div key={index} className="border-b border-black/[0.07] py-2 last:border-0 dark:border-white/10">
              {typeRows.length > 1 && <div className="pt-1 text-[11px] font-bold text-orange-600 dark:text-orange-300">مورد {fa(index + 1)}</div>}
              <DetailField label="مبنا" value={receiptTypeLabel(first(item?.type, row.receiptType))} /><DetailField label="شماره" value={item?.number} /><DetailField label="شرح سایر" value={first(item?.otherDescription, item?.other_description)} />
            </div>)}
          </DetailSection>}
          {present(first(source.description, row.description)) && <DetailSection number="03" title="شرح"><p className="py-4 text-sm leading-8">{fa(first(source.description, row.description))}</p></DetailSection>}
        </> : <>
          <DetailSection number="02" title="ریز محاسبات و کسورات">
            <DetailField label="مبلغ ناخالص" value={amount(first(source.gross_amount, row.grossAmount))} />
            <DetailField label="استهلاک پیش‌پرداخت" value={amount(source.prepayment_depreciation)} />
            <DetailField label="درصد سپرده بیمه" value={source.insurance_deposit_percent} />
            <DetailField label="سپرده بیمه" value={amount(source.insurance_deposit)} />
            <DetailField label="درصد سپرده حسن انجام کار" value={source.performance_deposit_percent} />
            <DetailField label="سپرده حسن انجام کار" value={amount(source.performance_deposit)} />
            {deductions.map((item, index) => <div key={index} className="border-b border-black/[0.07] py-1 last:border-0 dark:border-white/10"><div className="pt-2 text-[11px] font-bold text-orange-600 dark:text-orange-300">کسور {fa(index + 1)}</div><DetailField label="مبلغ" value={amount(item.amount)} /><DetailField label="شرح" value={item.description} /></div>)}
            <DetailField label="خالص بدون VAT" value={amount(source.net_without_vat)} />
          </DetailSection>
          <DetailSection number="03" title="مالیات بر ارزش افزوده">
            <DetailField label="وضعیت VAT" value={source.vat_status === "has" ? "دارد" : source.vat_status === "none" ? "ندارد" : source.vat_status} />
            <DetailField label="درصد VAT" value={source.vat_percent} />
            <DetailField label="مبلغ VAT" value={amount(first(source.vat_amount, row.vatAmount))} />
            <DetailField label="خالص با VAT" value={amount(source.net_with_vat)} />
          </DetailSection>
          {present(first(source.description, row.description)) && <DetailSection number="04" title="شرح"><p className="py-4 text-sm leading-8">{fa(first(source.description, row.description))}</p></DetailSection>}
          {relatedIds.length > 0 && <DetailSection number="05" title="اسناد مرتبط">
            {relatedIds.map((id) => { const letter = letterById.get(String(id)); return <DetailField key={String(id)} label={`سند ${fa(id)}`} value={letter ? first(letter.secretariatNo, letter.secretariat_no, letter.letterNo, letter.letter_no, letter.subject, letter.title) : id} />; })}
          </DetailSection>}
          {files.length > 0 && <DetailSection number="06" title="فایل‌های پیوست">
            {files.map((file, index) => { const url = String(file?.url || file?.href || ""); const safeUrl = url.startsWith("/uploads/") || /^https?:\/\//i.test(url) ? url : ""; return <div key={index} className="border-b border-black/[0.07] py-3 text-sm last:border-0 dark:border-white/10">{safeUrl ? <a href={safeUrl} target="_blank" rel="noreferrer" className="font-semibold text-orange-700 underline underline-offset-4 dark:text-orange-300">{fa(file?.name || `فایل ${index + 1}`)}</a> : <span className="font-semibold">{fa(file?.name || `فایل ${index + 1}`)}</span>}</div>; })}
          </DetailSection>}
        </>}
      </div>
    </section>
  </div>, document.body);
}
