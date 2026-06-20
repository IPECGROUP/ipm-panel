import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card } from "../components/ui/Card";
import { useAuth } from "../components/AuthProvider";
import { todayJalaliYmd } from "../utils/date";
import { toEnglishDigits } from "../utils/format";
import { baseCurrenciesTablePreset as tablePreset } from "../components/ui/tablePresets.js";

const SCOPE_OPTIONS = [
  ["office", "دفتر مرکزی"], ["site", "سایت"], ["finance", "مالی"],
  ["cash", "نقدی"], ["capex", "سرمایه‌ای"], ["projects", "پروژه‌ها"],
];
const DOC_OPTIONS = [
  ["pre_invoice", "پیش فاکتور"], ["invoice", "فاکتور"],
  ["goods_services", "صورت حساب رسمی کالا و خدمات"],
  ["other_invoice", "صورت حساب غیر رسمی"], ["status_invoice", "صورت وضعیت"],
  ["internal_list", "لیست پرداخت داخلی"], ["gov_salary", "فیش بدهی دولتی"], ["other", "سایر"],
];
const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const STATUS_LABELS = { pending: "در انتظار بررسی", approved: "تأییدشده", rejected: "ردشده", returned: "برگشت‌خورده" };
const inputClass = "w-full h-11 rounded-xl border border-black/10 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-white";
const today = () => todayJalaliYmd().replaceAll("-", "/");
const emptyForm = () => ({
  dateJalali: today(), scope: "office", projectId: "", budgetCode: "", title: "", description: "",
  amount: "", cashAmount: "", cashDateJalali: "", creditPay: "", beneficiaryName: "", bankInfo: "",
  docId: "pre_invoice", docOther: "", docNumber: "", docDateJalali: "",
  currencyTypeId: "", currencySourceId: "", attachments: [],
});

function toFa(value) { return String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]); }
function parseAmount(value) {
  const digits = toEnglishDigits(String(value || "")).replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}
function money(value) { const amount = parseAmount(value); return amount ? amount.toLocaleString("en-US") : ""; }
function isMarandi(user) {
  return String(user?.username || "").toLowerCase() === "marandi" || String(user?.email || "").toLowerCase() === "marandi@ipecgroup.net";
}
function itemLabel(item) { return item?.title || item?.name || item?.label || item?.code || `#${item?.id}`; }

function JalaliPopupDatePicker({ value, onChange, disablePast = false }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const popupRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const current = useMemo(() => {
    const [y, m, d] = today().split("/").map(Number);
    return { y, m, d };
  }, []);
  const parts = String(value || "").match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/);
  const [year, setYear] = useState(parts ? Number(parts[1]) : current.y);
  const [month, setMonth] = useState(parts ? Number(parts[2]) : current.m);
  const [day, setDay] = useState(parts ? Number(parts[3]) : current.d);
  const daysInMonth = month <= 6 ? 31 : month <= 11 ? 30 : 29;

  useEffect(() => { if (day > daysInMonth) setDay(daysInMonth); }, [day, daysInMonth]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!popupRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  useEffect(() => {
    if (!open || !buttonRef.current) return undefined;
    const place = () => {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: Math.min(rect.bottom + 8, window.innerHeight - 330), right: Math.max(8, window.innerWidth - rect.right) });
    };
    place();
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); document.removeEventListener("scroll", place, true); };
  }, [open]);

  const confirm = () => {
    const picked = `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
    if (disablePast && picked <= today()) return;
    onChange(picked);
    setOpen(false);
  };
  return <>
    <button ref={buttonRef} type="button" onClick={() => setOpen((old) => !old)} className={`${inputClass} flex items-center justify-between text-right`}>
      <span className={value ? "" : "text-neutral-400"}>{value ? toFa(value) : "انتخاب تاریخ..."}</span>
      <img src="/images/icons/calendar.svg" alt="" className="h-5 w-5 dark:invert" />
    </button>
    {open && createPortal(
      <div ref={popupRef} dir="rtl" style={{ top: position.top, right: position.right }} className="fixed z-[9999] w-[min(420px,calc(100vw-24px))] rounded-2xl border border-black/10 bg-white p-4 text-neutral-900 shadow-xl dark:border-white/10 dark:bg-neutral-900 dark:text-white">
        <div className="mb-3 flex items-center justify-between"><b className="text-sm">انتخاب تاریخ</b><button type="button" onClick={() => setOpen(false)} className="h-9 w-9 rounded-xl border border-black/10 dark:border-white/10">×</button></div>
        <div className="grid grid-cols-3 gap-3">
          <DateSelect label="روز" value={day} onChange={setDay} items={Array.from({ length: daysInMonth }, (_, i) => [i + 1, toFa(i + 1)])} />
          <DateSelect label="ماه" value={month} onChange={setMonth} items={MONTHS.map((label, i) => [i + 1, label])} />
          <DateSelect label="سال" value={year} onChange={setYear} items={Array.from({ length: 31 }, (_, i) => [current.y - 10 + i, toFa(current.y - 10 + i)])} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="rounded-xl border border-black/10 px-4 py-2 text-sm dark:border-white/10">پاک کردن</button>
          <button type="button" onClick={confirm} className="rounded-xl bg-neutral-900 px-5 py-2 text-sm text-white dark:bg-white dark:text-neutral-900">تأیید</button>
        </div>
      </div>, document.body
    )}
  </>;
}

function DateSelect({ label, value, onChange, items }) {
  return <label className="text-xs text-neutral-600 dark:text-neutral-300">{label}
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} className={`${inputClass} mt-1`}>
      {items.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
    </select>
  </label>;
}

export default function PaymentRequestPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [currencyTypes, setCurrencyTypes] = useState([]);
  const [currencySources, setCurrencySources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selected, setSelected] = useState(null);
  const mainAdmin = useMemo(() => isMarandi(user), [user]);
  const serial = useMemo(() => `PR-${Date.now().toString().slice(-8)}`, [showForm]);
  const amount = parseAmount(form.amount);
  const cashAmount = parseAmount(form.cashAmount);
  const creditAmount = Math.max(0, amount - cashAmount);
  const selectedCurrency = currencyTypes.find((item) => String(item.id) === String(form.currencyTypeId));
  const currencyLabel = selectedCurrency ? itemLabel(selectedCurrency) : "ریال";

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(`/api${path}`, {
      credentials: "include", ...options,
      headers: { "Content-Type": "application/json", ...(user?.id != null ? { "x-user-id": String(user.id) } : {}), ...(options.headers || {}) },
    });
    const text = await response.text();
    let data = {}; try { data = text ? JSON.parse(text) : {}; } catch {}
    if (!response.ok) throw new Error(data.error || data.message || "request_failed");
    return data;
  }, [user?.id]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api(mainAdmin ? "/requests" : "/requests?view=mine");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch { setError("دریافت درخواست‌ها انجام نشد."); }
    finally { setLoading(false); }
  }, [api, mainAdmin]);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => {
    Promise.allSettled([api("/projects?isActive=true"), api("/base/currencies/types"), api("/base/currencies/sources")]).then(([p, t, s]) => {
      if (p.status === "fulfilled") setProjects(p.value.items || p.value.projects || []);
      if (t.status === "fulfilled") setCurrencyTypes(t.value.items || []);
      if (s.status === "fulfilled") setCurrencySources(s.value.items || []);
    });
  }, [api]);
  useEffect(() => {
    if (form.scope === "projects" && !form.projectId) { setBudgetItems([]); return; }
    let cancelled = false;
    (async () => {
      const query = new URLSearchParams({ kind: form.scope });
      if (form.projectId) query.set("project_id", form.projectId);
      try {
        const data = await api(`/budget-estimates?${query}`);
        if (Array.isArray(data.items) && data.items.length) {
          if (!cancelled) setBudgetItems(data.items);
          return;
        }
      } catch {}

      try {
        const data = await api(`/centers/${form.scope}`);
        let rows = Array.isArray(data.items) ? data.items : [];
        if (form.scope === "projects") {
          const project = projects.find((item) => String(item.id) === String(form.projectId));
          const projectCode = String(project?.code || "").trim();
          rows = rows.filter((item) => String(item.suffix || item.code || "").startsWith(projectCode));
        }
        const mapped = rows.map((item) => ({
          ...item,
          code: item.code || item.center_code || item.suffix || "",
          center_desc: item.center_desc || item.description || item.name || "",
        })).filter((item) => item.code);
        if (!cancelled) setBudgetItems(mapped);
      } catch {
        if (!cancelled) setBudgetItems([]);
      }
    })();
    return () => { cancelled = true; };
  }, [api, form.scope, form.projectId, projects]);

  const setField = (name, value) => { setForm((old) => ({ ...old, [name]: value })); setError(""); setSuccess(""); };
  const changeScope = (scope) => setForm((old) => ({ ...old, scope, projectId: "", budgetCode: "" }));

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true); setError("");
    try {
      const uploaded = [];
      for (const file of files) {
        const body = new FormData(); body.append("file", file);
        const response = await fetch("/api/upload/payment-doc", { method: "POST", credentials: "include", headers: user?.id != null ? { "x-user-id": String(user.id) } : {}, body });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "upload_failed");
        uploaded.push(data.file || data);
      }
      setForm((old) => ({ ...old, attachments: [...old.attachments, ...uploaded] }));
    } catch { setError("آپلود فایل انجام نشد."); }
    finally { setUploading(false); }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return setError("عنوان درخواست را وارد کنید.");
    if (!form.budgetCode) return setError("کد بودجه را انتخاب کنید.");
    if (amount <= 0) return setError("مبلغ درخواست باید بیشتر از صفر باشد.");
    if (cashAmount > amount) return setError("مبلغ نقدی نمی‌تواند از مبلغ درخواست بیشتر باشد.");
    if (cashAmount > 0 && !form.cashDateJalali) return setError("تاریخ پرداخت را انتخاب کنید.");
    if (creditAmount > 0 && !form.creditPay.trim()) return setError("شرح پرداخت اعتباری را وارد کنید.");
    setSubmitting(true); setError(""); setSuccess("");
    try {
      await api("/requests", { method: "POST", body: JSON.stringify({
        ...form, serial, amount, cashAmount, creditAmount,
        currencyTypeId: form.currencyTypeId || null, currencySourceId: form.currencySourceId || null,
        projectId: form.projectId || null,
      }) });
      setForm(emptyForm()); setSuccess("درخواست با موفقیت ثبت شد."); setShowForm(false); await loadItems();
    } catch (err) { setError(err.message === "marandi_user_not_found" ? "کاربر مرندی در سامانه پیدا نشد." : "ثبت درخواست انجام نشد."); }
    finally { setSubmitting(false); }
  };

  return <div dir="rtl" className="mx-auto max-w-[1400px]">
    <Card className="overflow-hidden rounded-2xl border border-black/10 bg-white p-0 dark:border-white/10 dark:bg-neutral-900">
      <div className="p-3 md:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-lg font-bold md:text-xl">مدیریت درخواست ها</div>
          <button type="button" onClick={() => { setShowForm((old) => !old); setError(""); setSuccess(""); }} className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-black/15 transition hover:bg-black/5 dark:ring-neutral-800 dark:hover:bg-white/10" title={showForm ? "نمایش لیست" : "افزودن درخواست"}>
            <img src={showForm ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" />
          </button>
        </div>

        {showForm && <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ReadField label="شماره درخواست" value={serial} ltr />
            <ReadField label="تاریخ" value={toFa(form.dateJalali)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {SCOPE_OPTIONS.map(([value, label]) => <button key={value} type="button" onClick={() => changeScope(value)} className={`rounded-xl border px-4 py-2 text-sm transition ${form.scope === value ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-black/10 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"}`}>{label}</button>)}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {form.scope === "projects" && <Field label="پروژه"><select className={inputClass} value={form.projectId} onChange={(e) => setForm((old) => ({ ...old, projectId: e.target.value, budgetCode: "" }))}><option value="">انتخاب پروژه</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.code ? `${item.code} - ` : ""}{item.name || item.title}</option>)}</select></Field>}
            <Field label="کد بودجه" required><select className={inputClass} value={form.budgetCode} onChange={(e) => setField("budgetCode", e.target.value)}><option value="">انتخاب کد بودجه</option>{budgetItems.map((item) => <option key={item.code || item.id} value={item.code || item.center_code}>{item.code || item.center_code} - {item.center_desc || item.name || item.description || ""}</option>)}</select></Field>
          </div>
          <Field label="عنوان درخواست" required><input className={inputClass} value={form.title} onChange={(e) => setField("title", e.target.value)} /></Field>
          <Field label="شرح"><textarea className={`${inputClass} min-h-24 py-2`} value={form.description} onChange={(e) => setField("description", e.target.value)} /></Field>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="نوع سند"><select className={inputClass} value={form.docId} onChange={(e) => setField("docId", e.target.value)}>{DOC_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="شماره سند"><input className={inputClass} value={form.docNumber} onChange={(e) => setField("docNumber", e.target.value)} /></Field>
            <Field label="تاریخ سند"><JalaliPopupDatePicker value={form.docDateJalali} onChange={(value) => setField("docDateJalali", value)} /></Field>
            <Field label={form.docId === "other" ? "آپلود سند" : "آپلود درخواست"}>
              {form.docId === "other" && <input className={`${inputClass} mb-2`} value={form.docOther} onChange={(e) => setField("docOther", e.target.value)} placeholder="عنوان دلخواه" />}
              <label className={`${inputClass} flex cursor-pointer items-center justify-center gap-2`}><img src="/images/icons/upload.svg" alt="" className="h-4 w-4 dark:invert" />{uploading ? "در حال آپلود..." : "آپلود و الصاق فایل‌ها"}<input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={(e) => uploadFiles(e.target.files)} /></label>
              {!!form.attachments.length && <div className="mt-1 text-[11px] text-neutral-500">{toFa(form.attachments.length)} فایل ضمیمه شده</div>}
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="نوع ارز"><select className={inputClass} value={form.currencyTypeId} onChange={(e) => setField("currencyTypeId", e.target.value)}><option value="">ریال</option>{currencyTypes.map((item) => <option key={item.id} value={item.id}>{itemLabel(item)}</option>)}</select></Field>
            <Field label="منشا ارز"><select className={inputClass} value={form.currencySourceId} onChange={(e) => setField("currencySourceId", e.target.value)}><option value="">انتخاب منشا ارز</option>{currencySources.map((item) => <option key={item.id} value={item.id}>{itemLabel(item)}</option>)}</select></Field>
            <Field label={`مبلغ درخواست (${currencyLabel})`} required><MoneyInput value={form.amount} onChange={(value) => setField("amount", value)} /></Field>
            <Field label={`نقدی (${currencyLabel})`}><MoneyInput value={form.cashAmount} onChange={(value) => setField("cashAmount", value)} /></Field>
            <Field label="تاریخ پرداخت"><JalaliPopupDatePicker value={form.cashDateJalali} onChange={(value) => setField("cashDateJalali", value)} disablePast /></Field>
            <ReadField label={`مانده اعتباری (${currencyLabel})`} value={toFa(creditAmount.toLocaleString("en-US"))} ltr />
          </div>
          <Field label="شرح پرداخت اعتباری"><input className={inputClass} value={creditAmount === 0 ? "-" : form.creditPay} disabled={creditAmount === 0} onChange={(e) => setField("creditPay", e.target.value)} /></Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="نام ذینفع"><input className={inputClass} value={form.beneficiaryName} onChange={(e) => setField("beneficiaryName", e.target.value)} placeholder="نام ذینفع را وارد کنید..." /></Field>
            <Field label="اطلاعات بانکی ذینفع"><input className={inputClass} value={form.bankInfo} onChange={(e) => setField("bankInfo", e.target.value)} placeholder="نام بانک، شماره شبا/کارت، صاحب حساب و ..." /></Field>
          </div>
          {(error || success) && <div className={`rounded-xl px-3 py-2 text-sm ${error ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"}`}>{error || success}</div>}
          <div className="flex justify-end"><button type="submit" disabled={submitting || uploading} className="h-10 w-12 rounded-xl bg-neutral-900 text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900" title="ثبت"><img src="/images/icons/sabtdarkhast.svg" alt="ثبت" className="mx-auto h-5 w-5 invert dark:invert-0" /></button></div>
        </form>}

        {!showForm && <div className={tablePreset.frame}>
          <div className="overflow-x-auto"><table className={`${tablePreset.table} min-w-[850px]`} dir="rtl">
            <thead><tr className={tablePreset.headRow}>
              <th className={tablePreset.th}>#</th><th className={tablePreset.th}>تاریخ</th>{mainAdmin && <th className={tablePreset.th}>ثبت کننده</th>}<th className={tablePreset.th}>موضوع</th><th className={tablePreset.th}>ذینفع</th><th className={tablePreset.th}>مبلغ</th><th className={tablePreset.th}>وضعیت</th><th className={tablePreset.th}>اقدامات</th>
            </tr></thead>
            <tbody className={tablePreset.body}>
              {loading ? <tr><td colSpan={mainAdmin ? 8 : 7} className={tablePreset.emptyRow}>در حال دریافت...</td></tr> : items.length === 0 ? <tr><td colSpan={mainAdmin ? 8 : 7} className={tablePreset.emptyRow}>هنوز درخواستی ثبت نشده است.</td></tr> : items.map((item, index) => <tr key={item.id}>
                <td>{toFa(index + 1)}</td><td>{toFa(String(item.dateFa || item.date_jalali || "—").replaceAll("-", "/"))}</td>{mainAdmin && <td>{item.createdByName || `کاربر #${toFa(item.createdById)}`}</td>}<td>{item.title}</td><td>{item.beneficiaryName || "—"}</td><td>{toFa(Number(item.amount || 0).toLocaleString("en-US"))}</td><td>{STATUS_LABELS[item.status] || item.status}</td><td><button type="button" onClick={() => setSelected(item)} className="rounded-lg border border-black/10 px-3 py-1 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10">مشاهده</button></td>
              </tr>)}
            </tbody>
          </table></div>
        </div>}
      </div>
    </Card>
    {selected && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4" onClick={() => setSelected(null)}><div className="w-full max-w-xl rounded-2xl bg-white p-5 dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}><div className="flex justify-between"><b>{selected.title}</b><button onClick={() => setSelected(null)}>×</button></div><div className="mt-4 grid gap-3 text-sm md:grid-cols-2"><Detail label="مبلغ" value={toFa(Number(selected.amount || 0).toLocaleString("en-US"))} /><Detail label="ذینفع" value={selected.beneficiaryName || "—"} /><Detail label="اطلاعات بانکی" value={selected.bankInfo || "—"} /><Detail label="شماره سند" value={selected.docNumber || "—"} /><div className="md:col-span-2"><Detail label="شرح" value={selected.description || "—"} /></div></div></div></div>}
  </div>;
}

function Field({ label, required, children }) { return <label className="block text-xs text-neutral-600 dark:text-neutral-300">{label}{required && <span className="mr-1 text-red-500">*</span>}<div className="mt-1">{children}</div></label>; }
function ReadField({ label, value, ltr }) { return <Field label={label}><div dir={ltr ? "ltr" : "rtl"} className={`${inputClass} flex items-center ${ltr ? "justify-end" : ""}`}>{value || "—"}</div></Field>; }
function MoneyInput({ value, onChange }) { return <input dir="ltr" inputMode="numeric" className={inputClass} value={toFa(value)} onChange={(e) => onChange(money(e.target.value))} placeholder="۰" />; }
function Detail({ label, value }) { return <div><div className="text-xs text-neutral-500">{label}</div><div className="mt-1 break-words">{value}</div></div>; }
