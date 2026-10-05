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
  return <div className={`min-w-0 rounded-2xl p-4 sm:p-5 ${tone === "dark" ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950" : tone === "orange" ? "bg-orange-50 text-orange-950 ring-1 ring-orange-100 dark:bg-orange-400/10 dark:text-orange-100 dark:ring-orange-400/20" : "bg-white text-neutral-900 ring-1 ring-black/[0.07] dark:bg-neutral-900 dark:text-white dark:ring-white/10"}`}><div className="text-[11px] opacity-60">{label}</div><div className="mt-2 break-words text-lg font-bold sm:text-xl" dir="ltr">{fa(value)}</div></div>;
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
      <header className="relative shrink-0 overflow-hidden bg-neutral-950 px-5 pb-6 pt-5 text-white sm:px-7 sm:pb-7 sm:pt-6">
        <div className="pointer-events-none absolute -left-20 -top-28 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4"><div className="min-w-0"><span className="inline-flex rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-[11px] font-semibold text-orange-200">کاربرگ مالی</span><h2 className="mt-3 text-xl font-bold sm:text-2xl">{label}</h2></div><button autoFocus type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 transition hover:bg-white/20" aria-label="بستن" title="بستن"><img src="/images/icons/bastan.svg" alt="" className="h-5 w-5 invert" /></button></div>
        <div className="relative mt-6 flex flex-wrap items-end gap-x-8 gap-y-4 border-t border-white/15 pt-5">
          {present(row.number) && <div className="min-w-0 flex-1"><div className="text-[11px] text-white/50">{receipt ? "شماره" : "شماره صورت وضعیت"}</div><div className="mt-1 break-all text-lg font-bold sm:text-xl" dir="ltr">{fa(row.number)}</div></div>}
          {present(row.date) && <div><div className="text-[11px] text-white/50">تاریخ ثبت</div><div className="mt-1 text-base font-semibold">{fa(row.date)}</div></div>}
        </div>
      </header>
      <div className="space-y-5 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-wrap gap-x-8 gap-y-3 rounded-2xl border border-black/[0.07] bg-white px-5 py-4 dark:border-white/10 dark:bg-neutral-900">
          {present(project) && <div className="min-w-[180px] flex-1"><div className="text-[11px] text-neutral-500 dark:text-neutral-400">پروژه</div><div className="mt-1 break-words text-sm font-bold">{fa(project)}</div></div>}
          {present(contract) && <div className="min-w-[180px] flex-1"><div className="text-[11px] text-neutral-500 dark:text-neutral-400">قرارداد</div><div className="mt-1 break-words text-sm font-bold">{fa(contract)}</div></div>}
        </div>
        {receipt ? <div className="grid gap-3 sm:grid-cols-2"><Metric label="مبلغ دریافتی / پرداختی" value={amount(first(source.received_amount, row.receiptAmount))} tone="dark" /><Metric label="مبلغ ارزی" value={amount(first(source.received_amount_foreign, row.receiptForeignAmount))} tone="orange" /></div> : <div className="grid gap-3 sm:grid-cols-3"><Metric label="مبلغ ناخالص" value={amount(first(source.gross_amount, row.grossAmount))} /><Metric label="مبلغ VAT" value={amount(first(source.vat_amount, row.vatAmount))} tone="orange" /><Metric label="خالص با VAT" value={amount(source.net_with_vat)} tone="dark" /></div>}
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
