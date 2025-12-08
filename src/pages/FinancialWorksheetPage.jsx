import React from "react";
import { Card } from "../components/ui/Card";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table";

export default function FinancialWorksheetPage() {
  // ======= State: مشترک =======
  const [projects, setProjects] = React.useState([]);
  const [projectId, setProjectId] = React.useState('');
  const [active, setActive] = React.useState('balance'); // balance | invoices | receipts

  const [currencyTypes, setCurrencyTypes] = React.useState([]);     // از صفحه «ارزها/نوع ارز»
  const [currencySources, setCurrencySources] = React.useState([]); // از صفحه «منشأ ارز»

  const selectedProject = React.useMemo(
    () => projects.find(p => String(p.id) === String(projectId)),
    [projects, projectId]
  );

  // ======= Helpers / API =======
  const api = async (path, opt = {}) => {
    const res = await fetch('/api' + path, {
      credentials: 'include',
      ...opt,
      headers: { 'Content-Type': 'application/json', ...(opt.headers || {}) },
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data?.error || data?.message || 'request_failed');
    return data;
  };

  const pickDefaultSourceTitle = React.useCallback(() => {
    const def = (currencySources || []).find(s => s.is_default || s.default === 1 || s.default === true);
    if (def) return def.title || def.name || '';
    const first = (currencySources || [])[0];
    return first ? (first.title || first.name || '') : '';
  }, [currencySources]);

  // ======= Loader =======
  React.useEffect(() => {
    api('/projects').then(d => setProjects(d.projects || [])).catch(console.error);
    api('/base/currencies/types')
      .then(d => setCurrencyTypes(d.types || d.items || []))
      .catch(() => setCurrencyTypes([]));
    api('/base/currencies/sources')
      .then(d => setCurrencySources(d.sources || d.items || []))
      .catch(() => setCurrencySources([]));
  }, []);

  // ======= Controls =======
  const CurrencySelect = ({ value, onChange }) => (
    <select
      className="w-full rounded-xl px-3 py-2 bg-white text-black placeholder-black/40 border border-black/15 outline-none
                 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option className="bg-white dark:bg-neutral-900" value="">انتخاب کنید</option>
      {(currencyTypes || []).map((c, i) => {
        const title = c.title || c.name || '';
        const val = c.code || title;
        return (
          <option className="bg-white dark:bg-neutral-900" key={c.id || val || i} value={val}>
            {title || val}
          </option>
        );
      })}
    </select>
  );

  const SourceSelect = ({ value, onChange }) => (
    <select
      className="w-full rounded-xl px-3 py-2 bg-white text-black placeholder-black/40 border border-black/15 outline-none
                 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option className="bg-white dark:bg-neutral-900" value="">انتخاب کنید</option>
      {(currencySources || []).map((s, i) => {
        const title = s.title || s.name || '';
        return (
          <option className="bg-white dark:bg-neutral-900" key={s.id || title || i} value={title}>
            {title}
          </option>
        );
      })}
    </select>
  );

  // ورودی عددی با جداسازی سه‌رقمی و بدون گم‌کردن فوکوس
  const AmountInput = ({ value, onChange, placeholder = '0' }) => {
    const fmt = n => (n === '' ? '' : Number(String(n).replace(/[^\d]/g, '') || 0).toLocaleString('fa-IR'));
    const parse = s => String(s).replace(/[^\d]/g, '');
    return (
      <input
        dir="ltr"
        className="w-full rounded-xl px-3 py-2 text-left font-mono
                   bg-white text-black placeholder-black/40 border border-black/15 outline-none
                   focus:ring-2 focus:ring-black/10
                   dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
        value={fmt(value)}
        onChange={e => onChange(parse(e.target.value))}
        inputMode="numeric"
        placeholder={placeholder}
      />
    );
  };

  const todayISO = React.useMemo(() => {
    const d = new Date(); const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  // ======= TAB: تراز مالی (خلاصه) =======
  const [contractRow, setContractRow] = React.useState({
    title: 'قرارداد (ریالی/ارزی)',
    amount: '',
    currency: '',
    source: '',
  });
  const [appendixRow, setAppendixRow] = React.useState({
    title: 'الحاقیه (ریالی/ارزی)',
    amount: '',
    currency: '',
    source: '',
  });

  const BalanceTab = () => (
    <div className="space-y-4">
      <TableWrap>
        <table className="w-full text-sm text-center bg-white text-black dark:bg-neutral-900 dark:text-neutral-200">
          <THead>
            <tr className="bg-black/5 text-black dark:bg-neutral-900 dark:text-neutral-200">
              <TH className="!text-center w-20">ردیف</TH>
              <TH className="!text-center">قرارداد و الحاقیه</TH>
              <TH className="!text-center w-48">مبلغ</TH>
              <TH className="!text-center w-48">ارز</TH>
              <TH className="!text-center w-48">منشأ ارز</TH>
            </tr>
          </THead>
          <tbody>
            <TR className="border-t border-black/10 odd:bg-black/[0.02] dark:border-neutral-800 dark:odd:bg-white/5">
              <TD>1</TD>
              <TD className="text-right">
                <input
                  className="w-full rounded-xl px-3 py-2
                             bg-white text-black placeholder-black/40 border border-black/15 outline-none
                             focus:ring-2 focus:ring-black/10
                             dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                  value={contractRow.title}
                  onChange={e => setContractRow({ ...contractRow, title: e.target.value })}
                />
              </TD>
              <TD>
                <AmountInput value={contractRow.amount} onChange={v => setContractRow({ ...contractRow, amount: v })} />
              </TD>
              <TD>
                <CurrencySelect
                  value={contractRow.currency}
                  onChange={v =>
                    setContractRow({ ...contractRow, currency: v, source: pickDefaultSourceTitle() })
                  }
                />
              </TD>
              <TD>
                <SourceSelect value={contractRow.source} onChange={v => setContractRow({ ...contractRow, source: v })} />
              </TD>
            </TR>

            <TR className="border-t border-black/10 odd:bg-black/[0.02] dark:border-neutral-800 dark:odd:bg:white/5">
              <TD>2</TD>
              <TD className="text-right">
                <input
                  className="w-full rounded-xl px-3 py-2
                             bg:white text-black placeholder-black/40 border border-black/15 outline-none
                             focus:ring-2 focus:ring-black/10
                             dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                  value={appendixRow.title}
                  onChange={e => setAppendixRow({ ...appendixRow, title: e.target.value })}
                />
              </TD>
              <TD>
                <AmountInput value={appendixRow.amount} onChange={v => setAppendixRow({ ...appendixRow, amount: v })} />
              </TD>
              <TD>
                <CurrencySelect
                  value={appendixRow.currency}
                  onChange={v =>
                    setAppendixRow({ ...appendixRow, currency: v, source: pickDefaultSourceTitle() })
                  }
                />
              </TD>
              <TD>
                <SourceSelect value={appendixRow.source} onChange={v => setAppendixRow({ ...appendixRow, source: v })} />
              </TD>
            </TR>
          </tbody>
        </table>
      </TableWrap>

      <Card className="p-4 bg-white ring-1 ring-black/10 dark:bg-neutral-900 dark:ring-neutral-800">
        <ul className="space-y-2 text-sm text-black/70 dark:text-neutral-300">
          <li>مجموع ناخالص صورت وضعیت‌ها: —</li>
          <li>مجموع سپرده‌های بیمه: —</li>
          <li>مجموع سپرده‌های حسن انجام کار: —</li>
          <li>خالص صورت وضعیت‌ها: —</li>
          <li>VAT: —</li>
          <li>دریافتی‌ها: —</li>
        </ul>
      </Card>
    </div>
  );

  // ======= TAB: صورت وضعیت‌ها =======
  const [invForm, setInvForm] = React.useState({
    number: '',
    currency: '',
    source: '',
    grossApproved: '',
    insurancePct: '7.5',
    workGoodPct: '10',
    others: '',
    vatPct: '9',
  });
  const setInv = (patch) => setInvForm(prev => ({ ...prev, ...patch }));
  const [invoiceRows, setInvoiceRows] = React.useState([]);
  const addInvoice = () => {
    const row = {
      id: Date.now(),
      number: invForm.number || `${invoiceRows.length + 1}`,
      sendDate: todayISO,
      grossApproved: invForm.grossApproved,
      vat: invForm.vatPct,
    };
    setInvoiceRows([row, ...invoiceRows]);
    setInv({ number: '', grossApproved: '', others: '' });
  };

  const InvoicesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-start">
        <button
          onClick={addInvoice}
          className="h-10 px-4 rounded-2xl text-sm transition
                     bg-white text-black border border-black/15 hover:bg-black/5
                     dark:bg-neutral-900 dark:text-neutral-100 dark:ring-1 dark:ring-neutral-800 dark:hover:bg-neutral-800"
        >
          صورت وضعیت جدید
        </button>
      </div>

      <Card className="p-4 space-y-4 bg-white ring-1 ring-black/10 dark:bg-neutral-900 dark:ring-neutral-800">
        <div className="grid md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-black/70 dark:text-neutral-300">شماره صورت وضعیت</label>
            <input
              className="w-full rounded-xl px-3 py-2
                         bg-white text-black placeholder-black/40 border border-black/15 outline-none
                         focus:ring-2 focus:ring-black/10
                         dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
              value={invForm.number}
              onChange={e => setInv({ number: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-black/70 dark:text-neutral-300">تاریخ ارسال</label>
            <input
              className="w-full rounded-xl px-3 py-2 bg-black/5 text-black border border-black/15 outline-none
                         dark:bg-neutral-900 dark:text-neutral-200 dark:ring-1 dark:ring-neutral-800"
              value={todayISO}
              readOnly
            />
          </div>

          <div />
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-black/70 dark:text-neutral-300">ارز</label>
            <CurrencySelect
              value={invForm.currency}
              onChange={v => setInv({ currency: v, source: pickDefaultSourceTitle() })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-black/70 dark:text-neutral-300">منشأ ارز</label>
            <SourceSelect value={invForm.source} onChange={v => setInv({ source: v })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-black/70 dark:text-neutral-300">مبلغ ناخالص تایید شده</label>
            <AmountInput value={invForm.grossApproved} onChange={v => setInv({ grossApproved: v })} />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-black/70 dark:text-neutral-300">بیمه (%):</span>
            <input
              dir="ltr"
              className="w-24 rounded-xl px-3 py-2 text-left
                         bg-white text-black border border-black/15 outline-none
                         dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
              value={invForm.insurancePct}
              onChange={e => setInv({ insurancePct: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-black/70 dark:text-neutral-300">سپرده حسن انجام کار (%):</span>
            <input
              dir="ltr"
              className="w-24 rounded-xl px-3 py-2 text-left
                         bg-white text-black border border-black/15 outline-none
                         dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
              value={invForm.workGoodPct}
              onChange={e => setInv({ workGoodPct: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-black/70 dark:text-neutral-300">سایر کسرها / شرح</label>
            <input
              className="w-full rounded-xl px-3 py-2
                         bg-white text-black placeholder-black/40 border border-black/15 outline-none
                         focus:ring-2 focus:ring-black/10
                         dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
              value={invForm.others}
              onChange={e => setInv({ others: e.target.value })}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-black/70 dark:text-neutral-300">VAT (%):</span>
            <input
              dir="ltr"
              className="w-24 rounded-xl px-3 py-2 text-left
                         bg-white text-black border border-black/15 outline-none
                         dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
              value={invForm.vatPct}
              onChange={e => setInv({ vatPct: e.target.value })}
            />
          </div>
          <div className="flex items-center text-black/70 dark:text-neutral-300 text-sm">جمع خالص با احتساب VAT: —</div>
        </div>
      </Card>

      <TableWrap>
        <table className="w-full text-sm text-center bg:white text-black dark:bg-neutral-900 dark:text-neutral-200">
          <THead>
            <tr className="bg-black/5 text-black dark:bg-neutral-900 dark:text-neutral-200">
              <TH className="!text-center w-16">ردیف</TH>
              <TH className="!text-center w-40">شماره</TH>
              <TH className="!text-center w-40">تاریخ ارسال</TH>
              <TH className="!text-center">مبلغ ناخالص تایید شده</TH>
              <TH className="!text-center w-24">VAT</TH>
              <TH className="!text-center w-36">اقدامات</TH>
            </tr>
          </THead>
          <tbody>
            {invoiceRows.length === 0 ? (
              <TR><TD colSpan={6} className="text-black/60 dark:text-neutral-400 py-4">موردی ثبت نشده.</TD></TR>
            ) : (
              invoiceRows.map((r, idx) => (
                <TR key={r.id} className="border-t border-black/10 odd:bg-black/[0.02] dark:border-neutral-800 dark:odd:bg-white/5">
                  <TD>{idx + 1}</TD>
                  <TD>{r.number}</TD>
                  <TD>{r.sendDate}</TD>
                  <TD className="font-mono ltr">{Number(r.grossApproved || 0).toLocaleString('fa-IR')}</TD>
                  <TD className="ltr">{r.vat}%</TD>
                  <TD>
                    <div className="inline-flex gap-2">
                      <button className="px-3 py-1 rounded-xl border border-black/15 hover:bg-black/5 transition text-black
                                         dark:text-neutral-100 dark:ring-1 dark:ring-neutral-800 dark:hover:bg-neutral-800">
                        نمایش
                      </button>
                      <button className="px-3 py-1 rounded-xl border border-black/15 hover:bg-black/5 transition text-black
                                         dark:text-neutral-100 dark:ring-1 dark:ring-neutral-800 dark:hover:bg-neutral-800">
                        ویرایش
                      </button>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );

  // ======= TAB: دریافتی‌ها (جدید) =======
  const [receiptRows, setReceiptRows] = React.useState([]);
  const [rcvForm, setRcvForm] = React.useState({
    rcvType: '',       // نوع دریافتی
    number: '',        // شماره
    rcvDate: todayISO, // فقط نمایش
    currency: '',
    source: '',
    amountFx: '',      // مبلغ ارزی
    fxRate: '',        // نرخ تسعیر
    amountIrr: '',     // مبلغ ریالی
  });

  // محاسبه خودکار مبلغ ریالی
  React.useEffect(() => {
    const a = Number(String(rcvForm.amountFx).replace(/[^\d]/g, '') || 0);
    const r = Number(String(rcvForm.fxRate).replace(/[^\d.]/g, '') || 0);
    if (a > 0 && r > 0) {
      const irr = Math.round(a * r);
      setRcvForm(prev => ({ ...prev, amountIrr: String(irr) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rcvForm.amountFx, rcvForm.fxRate]);

  const addReceipt = () => {
    const row = {
      id: Date.now(),
      date: todayISO,
      amountFx: rcvForm.amountFx,
      amountIrr: rcvForm.amountIrr,
    };
    setReceiptRows([row, ...receiptRows]);
    setRcvForm({
      rcvType: '',
      number: '',
      rcvDate: todayISO,
      currency: '',
      source: '',
      amountFx: '',
      fxRate: '',
      amountIrr: '',
    });
  };

  const ReceiptsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-start">
        <button
          onClick={addReceipt}
          className="h-10 px-4 rounded-2xl text-sm transition
                     bg-white text-black border border-black/15 hover:bg-black/5
                     dark:bg-neutral-900 dark:text-neutral-100 dark:ring-1 dark:ring-neutral-800 dark:hover:bg-neutral-800"
        >
          دریافتی جدید
        </button>
      </div>

      <Card className="p-4 space-y-4 bg-white ring-1 ring-black/10 dark:bg-neutral-900 dark:ring-neutral-800">
        <div className="grid md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-black/70 dark:text-neutral-300">نوع دریافتی</label>
            <select
              className="w-full rounded-xl px-3 py-2
                         bg-white text-black placeholder-black/40 border border-black/15 outline-none
                         dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700"
              value={rcvForm.rcvType}
              onChange={e => setRcvForm({ ...rcvForm, rcvType: e.target.value })}
            >
              <option className="bg-white dark:bg-neutral-900" value="">انتخاب کنید</option>
              <option className="bg-white dark:bg-neutral-900" value="invoice">در قبال صورت‌وضعیت</option>
              <option className="bg-white dark:bg-neutral-900" value="advance">علی‌الحساب</option>
              <option className="bg-white dark:bg-neutral-900" value="other">سایر</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-black/70 dark:text-neutral-300">شماره</label>
            <input
              className="w-full rounded-xl px-3 py-2
                         bg-white text-black placeholder-black/40 border border-black/15 outline-none
                         focus:ring-2 focus:ring-black/10
                         dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
              value={rcvForm.number}
              onChange={e => setRcvForm({ ...rcvForm, number: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-black/70 dark:text-neutral-300">تاریخ دریافت</label>
            <input
              className="w-full rounded-xl px-3 py-2 bg-black/5 text-black border border-black/15 outline-none
                         dark:bg-neutral-900 dark:text-neutral-200 dark:ring-1 dark:ring-neutral-800"
              value={todayISO}
              readOnly
            />
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-sm text-black/70 dark:text-neutral-300">ارز</label>
            <CurrencySelect
              value={rcvForm.currency}
              onChange={v => setRcvForm({ ...rcvForm, currency: v, source: pickDefaultSourceTitle() })}
            />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-sm text-black/70 dark:text-neutral-300">منشأ ارز</label>
            <SourceSelect value={rcvForm.source} onChange={v => setRcvForm({ ...rcvForm, source: v })} />
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-black/70 dark:text-neutral-300">مبلغ دریافت‌شده (ارزی)</label>
            <AmountInput value={rcvForm.amountFx} onChange={v => setRcvForm({ ...rcvForm, amountFx: v })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-black/70 dark:text-neutral-300">نرخ تسعیر</label>
            <input
              dir="ltr"
              className="w-full rounded-xl px-3 py-2 text-left font-mono
                         bg-white text-black placeholder-black/40 border border-black/15 outline-none
                         focus:ring-2 focus:ring-black/10
                         dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
              value={rcvForm.fxRate}
              onChange={e => setRcvForm({ ...rcvForm, fxRate: e.target.value })}
              inputMode="decimal"
              placeholder="0"
            />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-sm text-black/70 dark:text-neutral-300">مبلغ دریافتی تبدیل‌شده (ریالی)</label>
            <AmountInput value={rcvForm.amountIrr} onChange={v => setRcvForm({ ...rcvForm, amountIrr: v })} />
          </div>
        </div>
      </Card>

      <TableWrap>
        <table className="w-full text-sm text-center bg-white text-black dark:bg-neutral-900 dark:text-neutral-200">
          <THead>
            <tr className="bg-black/5 text-black dark:bg-neutral-900 dark:text-neutral-200">
              <TH className="!text-center w-16">ردیف</TH>
              <TH className="!text-center w-40">تاریخ</TH>
              <TH className="!text-center">مبلغ دریافت شده (ارزی)</TH>
              <TH className="!text-center">مبلغ دریافت شده (ریالی)</TH>
              <TH className="!text-center w-40">اقدامات</TH>
            </tr>
          </THead>
          <tbody>
            {receiptRows.length === 0 ? (
              <TR><TD colSpan={5} className="text-black/60 dark:text-neutral-400 py-4">موردی ثبت نشده.</TD></TR>
            ) : (
              receiptRows.map((r, idx) => (
                <TR key={r.id} className="border-t border-black/10 odd:bg-black/[0.02] dark:border-neutral-800 dark:odd:bg-white/5">
                  <TD>{idx + 1}</TD>
                  <TD>{r.date}</TD>
                  <TD className="font-mono ltr">{Number(String(r.amountFx).replace(/[^\d]/g,'') || 0).toLocaleString('fa-IR')}</TD>
                  <TD className="font-mono ltr">{Number(String(r.amountIrr).replace(/[^\d]/g,'') || 0).toLocaleString('fa-IR')}</TD>
                  <TD>
                    <div className="inline-flex gap-2">
                      <button className="px-3 py-1 rounded-xl border border-black/15 hover:bg-black/5 transition text-black
                                         dark:text-neutral-100 dark:ring-1 dark:ring-neutral-800 dark:hover:bg-neutral-800">
                        نمایش
                      </button>
                      <button className="px-3 py-1 rounded-xl border border-black/15 hover:bg-black/5 transition text-black
                                         dark:text-neutral-100 dark:ring-1 dark:ring-neutral-800 dark:hover:bg-neutral-800">
                        ویرایش
                      </button>
                      <button
                        className="px-3 py-1 rounded-xl bg-red-600 text-white"
                        onClick={() => setReceiptRows(receiptRows.filter(x => x.id !== r.id))}
                      >
                        حذف
                      </button>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-black/70 dark:text-neutral-300 text-sm">جمع کل (ارزی):</span>
          <input
            className="w-48 rounded-xl px-3 py-2 bg-black/5 text-black border border-black/15 font-mono ltr
                       dark:bg-neutral-900 dark:text-neutral-200 dark:ring-1 dark:ring-neutral-800"
            readOnly
            value={receiptRows.reduce((s, r) => s + (Number(String(r.amountFx).replace(/[^\d]/g, '') || 0)), 0).toLocaleString('fa-IR')}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-black/70 dark:text-neutral-300 text-sm">جمع کل (ریالی):</span>
          <input
            className="w-48 rounded-xl px-3 py-2 bg-black/5 text:black border border-black/15 font-mono ltr
                       dark:bg-neutral-900 dark:text-neutral-200 dark:ring-1 dark:ring-neutral-800"
            readOnly
            value={receiptRows.reduce((s, r) => s + (Number(String(r.amountIrr).replace(/[^\d]/g, '') || 0)), 0).toLocaleString('fa-IR')}
          />
        </div>
      </div>
    </div>
  );

  // ======= Layout =======
  return (
    <Card>
      {/* breadcrumb */}
      <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
        <span>پروژه‌ها</span>
        <span className="mx-2">›</span>
        <span className="font-semibold text-black dark:text-neutral-100">کاربرگ مالی</span>
      </div>

      {/* انتخاب پروژه */}
      <div className="grid md:grid-cols-2 gap-3 mb-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-black/70 dark:text-neutral-300">کد پروژه</label>
          <select
            className="w-full rounded-xl px-3 py-2 ltr
                       bg-white text-black placeholder-black/40 border border-black/15 outline-none
                       dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700"
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
          >
            <option className="bg-white dark:bg-neutral-900" value="">انتخاب کنید</option>
            {(projects || []).map(p => (
              <option className="bg-white dark:bg-neutral-900" key={p.id} value={p.id}>
                {(p.code || '—') + ' — ' + (p.name || '')}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-black/70 dark:text-neutral-300">نام پروژه</label>
          <input
            className="w-full rounded-xl px-3 py-2
                       bg-black/5 text-black border border-black/15 outline-none
                       dark:bg-neutral-900 dark:text-neutral-200 dark:ring-1 dark:ring-neutral-800"
            value={selectedProject?.name || ''}
            readOnly
          />
        </div>
      </div>

      {/* تب‌ها */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          className={`h-10 px-4 rounded-2xl text-sm shadow-sm transition ${
            active === 'balance'
              ? 'bg-neutral-100 text-neutral-900'
              : 'bg-white text-black border border-black/15 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800'
          }`}
          onClick={() => setActive('balance')}
        >
          تراز مالی پروژه
        </button>
        <button
          className={`h-10 px-4 rounded-2xl text-sm shadow-sm transition ${
            active === 'invoices'
              ? 'bg-neutral-100 text-neutral-900'
              : 'bg-white text-black border border-black/15 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800'
          }`}
          onClick={() => setActive('invoices')}
        >
          صورت وضعیت‌ها
        </button>
        <button
          className={`h-10 px-4 rounded-2xl text-sm shadow-sm transition ${
            active === 'receipts'
              ? 'bg-neutral-100 text-neutral-900'
              : 'bg-white text-black border border-black/15 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800'
          }`}
          onClick={() => setActive('receipts')}
        >
          دریافتـی‌ها
        </button>
      </div>

      {/* محتوای تب‌ها */}
      {active === 'balance' && <BalanceTab />}
      {active === 'invoices' && <InvoicesTab />}
      {active === 'receipts' && <ReceiptsTab />}
    </Card>
  );
}
