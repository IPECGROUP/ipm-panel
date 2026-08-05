import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { todayJalaliYmd } from "../utils/date.js";
import { format3, toEnglishDigits } from "../utils/format.js";
const input =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-right text-sm outline-none focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-white";
const fa = (v) => String(v ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const sumAmounts = (...values) => values.reduce((total, value) => total + BigInt(toEnglishDigits(String(value ?? "")).replace(/[^\d]/g, "") || "0"), 0n).toString();
const today = () => todayJalaliYmd().replaceAll("-", "/");
const name = (u) => u?.name || u?.username || "—";
const empty = () => ({
  requestNumber: "",
  requestDate: today(),
  projectId: "",
  amount: "",
  currency: "ریال",
  unregisteredBalance: "",
  unsettledBalance: "",
  projectManagerId: "",
});
function Field({ label, required, children, className = "" }) {
  const orderClass = label === "مبلغ" ? "md:order-3" : label === "کد بودجه" ? "md:order-4" : label === "فایل" ? "md:order-5" : "";
  const displayLabel = label === "مبلغ" ? "مبلغ تسویه" : label;
  return (
    <label className={`block ${orderClass} ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
        {displayLabel}
        {required && <b className="mr-1 text-red-500">*</b>}
      </span>
      {children}
    </label>
  );
}
function DetailCell({ label, children, className = "" }) {
  return <div className={`min-h-[76px] border-b border-l border-black/10 px-4 py-3 last:border-l-0 dark:border-white/10 ${className}`}><div className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">{label}</div><div className="flex min-h-6 items-center text-sm font-medium text-neutral-900 dark:text-white">{children || "—"}</div></div>;
}
function TenkhahWorkflow({ stage, status }) {
  const steps = [
    ["project_manager", "تأیید مدیر پروژه"],
    ["finance", "بررسی و شارژ مالی"],
    ["completed", "تکمیل درخواست"],
  ];
  const active = status === "charged" ? 2 : Math.max(0, steps.findIndex(([key]) => key === stage));
  return <aside className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[.03]"><h3 className="mb-4 text-sm font-bold">فرآیند تنخواه</h3><div className="space-y-1">{steps.map(([key, label], index) => { const done = index < active || status === "charged"; const current = index === active && status !== "charged"; return <div key={key} className="relative flex min-h-14 items-center gap-3"><span className={`z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-bold ${current ? "border-sky-500 bg-sky-500 text-white shadow-[0_0_0_4px_rgba(14,165,233,.13)]" : done ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black" : "border-neutral-300 bg-white text-neutral-400 dark:border-neutral-600 dark:bg-neutral-900"}`}>{done ? "✓" : index + 1}</span>{index < steps.length - 1 && <span className={`absolute right-[13px] top-9 h-7 w-px ${done ? "bg-neutral-900 dark:bg-white" : "bg-neutral-200 dark:bg-white/10"}`} />}<div className="min-w-0"><div className={`text-sm font-medium ${current ? "text-sky-700 dark:text-sky-300" : done ? "text-neutral-900 dark:text-white" : "text-neutral-400"}`}>{label}</div>{current && <div className="mt-0.5 text-[11px] text-sky-600 dark:text-sky-300">مرحله جاری</div>}</div></div>; })}</div></aside>;
}
function SettlementTable({ entries, request, onRemove, onEdit }) {
  const total = sumAmounts(...entries.map((entry) => entry.amount));
  return <section className="mt-5 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-neutral-200 dark:bg-white/10"><tr>{["", "تاریخ", "شرح", "کد بودجه", "شارژ تنخواه", "مبلغ تسویه", "فایل", "وضعیت", "عملیات"].map(h=><th key={h} className="px-3 py-3 text-center">{h}</th>)}</tr></thead><tbody>{entries.length ? entries.map(e=><tr key={e.id} className="border-t border-black/10 dark:border-white/10"><td className="p-3 text-center"><input type="checkbox" className="h-4 w-4 rounded border-neutral-400" /></td><td className="p-3 text-center">{fa(e.expenseDate)}</td><td className="p-3 text-center">{e.description || "—"}</td><td className="p-3 text-center">{e.budgetCode}</td><td className="p-3 text-center">{fa(format3(request.chargedAmount || request.requestedAmount))}</td><td className="p-3 text-center">{fa(format3(e.amount))}</td><td className="p-3 text-center">{e.fileUrl ? <a className="text-blue-600 underline" href={e.fileUrl} target="_blank" rel="noreferrer">{e.fileName || "مشاهده"}</a> : "—"}</td><td className="p-3 text-center">در جریان</td><td className="p-3 text-center">{onEdit ? <span className="flex justify-center gap-1"><RowActionIconBtn action="edit" title="ویرایش" onClick={()=>onEdit(e)} />{onRemove && <RowActionIconBtn action="delete" title="حذف" onClick={()=>onRemove(e.id)} />}</span> : <span>—</span>}</td></tr>) : <tr><td colSpan="9" className="p-8 text-center text-neutral-500">هنوز هزینه‌ای افزوده نشده است.</td></tr>}</tbody>{entries.length > 0 && <tfoot className="border-t-2 border-black/10 bg-neutral-50 font-bold dark:border-white/10 dark:bg-white/[.04]"><tr><td colSpan="5" className="px-3 py-3 text-left">جمع کل مبلغ تسویه</td><td className="px-3 py-3 text-center tabular-nums">{fa(format3(total))}</td><td colSpan="3" /></tr></tfoot>}</table></div></section>;
}
function SettlementEntryEditor({ form, setForm, budgetItems, busy, onSave, onCancel, onUpload }) {
  return <div className="mb-4 rounded-2xl bg-neutral-100 p-4 dark:bg-white/10"><div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6"><Field label="تاریخ"><JalaliPopupDatePicker value={form.expenseDate} onChange={(value)=>setForm(x=>({...x,expenseDate:value}))} buttonClassName={`${input} flex items-center justify-between`} /></Field><Field label="شرح هزینه"><input className={input} value={form.description} onChange={e=>setForm(x=>({...x,description:e.target.value}))}/></Field><Field label="مبلغ" className="xl:order-3"><input className={input} inputMode="numeric" value={fa(form.amount)} onChange={e=>setForm(x=>({...x,amount:format3(toEnglishDigits(e.target.value).replace(/[^\d]/g,""))}))}/></Field><Field label="کد بودجه" className="xl:order-4"><select className={input} value={form.budgetCode} onChange={e=>setForm(x=>({...x,budgetCode:e.target.value}))}><option value="">انتخاب کنید</option>{budgetItems.map(b=><option key={b.id} value={b.budgetCode}>{b.budgetCode} - {b.budgetName}</option>)}</select></Field><Field label="فایل"><label className="grid h-11 w-11 cursor-pointer place-items-center rounded-xl border border-black/10 bg-white dark:border-white/15 dark:bg-white/5"><img src="/images/icons/Uplod.svg" alt="بارگذاری" className="h-5 w-5 dark:invert"/><input type="file" className="hidden" accept="image/*,.pdf" onChange={e=>onUpload(e.target.files?.[0])}/></label></Field><div className="flex items-end gap-2"><button type="button" disabled={busy} onClick={onSave} className="grid h-11 w-11 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black"><img src="/images/icons/check.svg" alt="ذخیره" className="h-4 w-4 invert dark:invert-0"/></button><button type="button" onClick={onCancel} className="h-11 rounded-xl border px-3 text-sm">انصراف</button></div></div></div>;
}
export default function TenkhahPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]),
    [form, setForm] = useState(empty),
    [open, setOpen] = useState(false),
    [projects, setProjects] = useState([]),
    [users, setUsers] = useState([]),
    [currencies, setCurrencies] = useState([]),
    [selected, setSelected] = useState(null),
    [settlement, setSettlement] = useState(null),
    [settlementEntries, setSettlementEntries] = useState([]),
    [editingEntryId, setEditingEntryId] = useState(null),
    [settlementForm, setSettlementForm] = useState({ expenseDate: today(), description: "", budgetCode: "", amount: "", sendToUserId: "", fileName: "", fileUrl: "" }),
    [budgetItems, setBudgetItems] = useState([]),
    [settlementRecipients, setSettlementRecipients] = useState([]),
    [settlementErrors, setSettlementErrors] = useState({}),
    [financeRecipients, setFinanceRecipients] = useState([]),
    [projectBalances, setProjectBalances] = useState({ unregisteredBalance: "0", unsettledBalance: "0", receivedAmount: "0" }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const api = async (path, opt = {}) => {
    const r = await fetch(`/api${path}`, {
      credentials: "include",
      ...opt,
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(user?.id || ""),
        ...(opt.headers || {}),
      },
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || d.error || "خطا در ثبت اطلاعات");
    return d;
  };
  const load = async () => {
    if (!user?.id) return;
    try {
      const d = await api("/tenkhah");
      setItems(d.items || []);
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => {
    load();
  }, [user?.id]);
  const loadOptions = async () => {
    const [p, u, c] = await Promise.all([
      api("/projects?isActive=true"),
      api("/admin/users"),
      api("/base/currencies/types"),
    ]);
    setProjects(
      (p.items || p.projects || []).filter((x) => x.isActive !== false && /^\d{3}$/.test(String(x.code || "").trim())),
    );
    setUsers(u.users || []);
    setCurrencies(c.items || []);
  };
  const managers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.isActive !== false &&
          /مدیر\s*پروژه|project\s*manager/i.test(
            [
              u.department,
              u.role,
              ...(u.positions || []).map((x) => x.name),
            ].join(" "),
          ),
      ),
    [users],
  );
  const finances = useMemo(
    () =>
      users.filter(
        (u) =>
          u.isActive !== false &&
          /مالی|حسابدار|finance|account/i.test(
            [
              u.department,
              u.role,
              ...(u.positions || []).map((x) => x.name),
            ].join(" "),
          ),
      ),
    [users],
  );
  const add = async () => {
    setOpen(true);
    setForm(empty());
    setProjectBalances({ unregisteredBalance: "0", unsettledBalance: "0", receivedAmount: "0" });
    setError("");
    try {
      await loadOptions();
    } catch (e) {
      setError(e.message);
    }
  };
  const loadSettlementRecipients = async (stage) => {
    const d = await api(`/tenkhah?recipients=${encodeURIComponent(stage)}`);
    setSettlementRecipients(d.users || []);
  };
  const loadFinanceRecipients = async () => {
    const d = await api("/tenkhah?recipients=finance");
    setFinanceRecipients(d.users || []);
  };
  const openSettlement = async (item, existing = null) => {
    setError(""); setSettlement(existing ? { ...existing, request: item } : { request: item, stage: "control_project", status: "draft" });
    setSettlementEntries(existing?.entries || []); setEditingEntryId(null); setSettlementErrors({}); setSettlementForm({ expenseDate: today(), description: "", budgetCode: "", amount: "", sendToUserId: "", fileName: "", fileUrl: "" });
    const recipientStage = !existing ? "control_project" : existing.stage === "control_project" ? "finance" : existing.stage === "finance" ? "project_manager" : null;
    try { await Promise.all([loadOptions(), recipientStage ? loadSettlementRecipients(recipientStage) : Promise.resolve(setSettlementRecipients([]))]); const d = await api(`/cost-breakdown?project_id=${encodeURIComponent(item.projectId)}`); setBudgetItems(d.items || []); } catch (e) { setError(e.message); }
  };
  const uploadSettlementFile = async (file) => {
    if (!file) return; setBusy(true); setError("");
    try { const fd = new FormData(); fd.append("file", file); const r = await fetch("/api/upload/payment-doc", { method: "POST", credentials: "include", headers: { "x-user-id": String(user?.id || "") }, body: fd }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "خطا در بارگذاری فایل"); setSettlementForm((x) => ({ ...x, fileName: d.file.name, fileUrl: d.file.url })); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const addSettlementEntry = async () => {
    const entryErrors = { date: !settlementForm.expenseDate, budgetCode: !settlementForm.budgetCode, amount: !settlementForm.amount };
    if (Object.values(entryErrors).some(Boolean)) { setSettlementErrors(entryErrors); return; }
    const requestAmount = BigInt(toEnglishDigits(String(settlement.request.chargedAmount || settlement.request.requestedAmount || "0")).replace(/[^\d]/g, "") || "0");
    const otherEntries = settlementEntries.filter((entry) => String(entry.id) !== String(editingEntryId));
    const usedAmount = BigInt(sumAmounts(...otherEntries.map((entry) => entry.amount)));
    const enteredAmount = BigInt(toEnglishDigits(String(settlementForm.amount || "0")).replace(/[^\d]/g, "") || "0");
    const remainingAmount = requestAmount > usedAmount ? requestAmount - usedAmount : 0n;
    if (enteredAmount > remainingAmount) { setSettlementErrors({ amount: true }); setSettlementForm((x) => ({ ...x, amount: format3(remainingAmount.toString()) })); return; }
    if (editingEntryId) { setBusy(true); try { await api("/tenkhah/entry", { method:"PATCH", body:JSON.stringify({ entryId:editingEntryId, ...settlementForm }) }); setSettlementEntries(x=>x.map(entry=>entry.id===editingEntryId?{...entry,...settlementForm}:entry)); setEditingEntryId(null); setSettlementForm(x=>({...x,expenseDate:today(),description:"",budgetCode:"",amount:"",fileName:"",fileUrl:""})); } catch(e) { setError(e.message); } finally { setBusy(false); } return; }
    setSettlementEntries((x) => [...x, { ...settlementForm, id: `draft-${Date.now()}` }]); setSettlementErrors({}); setSettlementForm((x) => ({ ...x, expenseDate: today(), description: "", budgetCode: "", amount: "", fileName: "", fileUrl: "" }));
  };
  const submitSettlement = async () => { if (!settlementForm.sendToUserId) { setSettlementErrors({ recipient: true }); return; } setBusy(true); try { await api("/tenkhah", { method: "POST", body: JSON.stringify({ action: "create_settlement", tenkhahRequestId: settlement.request.id, sendToUserId: settlementForm.sendToUserId, entries: settlementEntries }) }); setSettlement(null); await load(); window.dispatchEvent(new Event("tenkhah-notifications-refresh")); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const advanceSettlement = async () => { setBusy(true); setError(""); try { await api("/tenkhah", { method: "PATCH", body: JSON.stringify({ action: "advance_settlement", settlementId: settlement.id, sendToUserId: settlementForm.sendToUserId }) }); setSettlement(null); await load(); window.dispatchEvent(new Event("tenkhah-notifications-refresh")); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const money = (k, v) =>
    setForm((x) => ({
      ...x,
      [k]: format3(toEnglishDigits(v).replace(/[^\d]/g, "")),
    }));
  const selectProject = async (projectId) => {
    setForm((x) => ({ ...x, projectId }));
    if (!projectId) { setProjectBalances({ unregisteredBalance: "0", unsettledBalance: "0", receivedAmount: "0" }); return; }
    try {
      const balances = await api(`/tenkhah?projectBalances=${encodeURIComponent(projectId)}`);
      setProjectBalances({ unregisteredBalance: balances.unregisteredBalance || "0", unsettledBalance: balances.unsettledBalance || "0", receivedAmount: balances.receivedAmount || "0" });
    } catch (e) { setError(e.message); }
  };
  const displayedUnregisteredBalance = sumAmounts(projectBalances.unregisteredBalance, form.amount);
  const displayedUnsettledBalance = sumAmounts(projectBalances.unsettledBalance, form.amount);
  const create = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/tenkhah", { method: "POST", body: JSON.stringify(form) });
      setOpen(false);
      await load();
      window.dispatchEvent(new Event("tenkhah-notifications-refresh"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const action = async () => {
    setBusy(true);
    setError("");
    try {
      const isManager = selected.stage === "project_manager";
      await api("/tenkhah", {
        method: "PATCH",
        body: JSON.stringify(
          isManager
            ? {
                id: selected.id,
                financeUserId: selected.financeUserId,
                approvedDate: selected.managerApprovedDate || today(),
              }
            : {
                id: selected.id,
                chargedDate: selected.chargedDate || today(),
                chargedAmount:
                  selected.chargedAmount ?? selected.requestedAmount,
              },
        ),
      });
      setSelected(null);
      await load();
      window.dispatchEvent(new Event("tenkhah-notifications-refresh"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const updateSelected = (k, v) => setSelected((s) => ({ ...s, [k]: v }));
  const incoming =
    selected &&
    Number(selected.currentAssigneeUserId) === Number(user?.id) &&
    selected.status === "pending";
  useEffect(() => {
    if (!selected || !incoming || selected.stage !== "project_manager") return;
    loadFinanceRecipients().catch((e) => setError(e.message));
  }, [selected?.id, selected?.stage, selected?.status, selected?.currentAssigneeUserId, user?.id]);
  const canEditSettlement = settlement && settlement.status === "pending" && Number(settlement.currentAssigneeUserId) === Number(user?.id);
  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <Card className="rounded-2xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-neutral-900 md:p-4">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-black/[.03] dark:border-white/10 dark:bg-white/[.06]">
              <img
                src="/images/icons/tenkhah.svg"
                className="h-6 w-6 dark:invert"
              />
            </span>
            <span>
              <h1 className="text-base font-bold md:text-lg">تنخواه</h1>
              <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                مدیریت مالی
              </span>
            </span>
          </div>
          <button
            onClick={open ? () => setOpen(false) : add}
            className="grid h-10 w-10 place-items-center rounded-xl ring-1 ring-black/15 hover:bg-black/5 dark:ring-white/15"
          >
            <img
              src={
                open
                  ? "/images/icons/listdarkhast.svg"
                  : "/images/icons/afzodan.svg"
              }
              className="h-5 w-5 dark:invert"
            />
          </button>
        </div>
        {open && (
          <section className="mb-5 rounded-2xl border border-black/10 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[.03] md:p-5">
            <h2 className="mb-5 text-base font-bold">درخواست تنخواه جدید</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="شماره درخواست" required>
                <input
                  value={form.requestNumber}
                  onChange={(e) =>
                    updateSelected
                      ? setForm((x) => ({
                          ...x,
                          requestNumber: e.target.value,
                        }))
                      : null
                  }
                  className={input}
                />
              </Field>
              <Field label="تاریخ درخواست" required>
                <JalaliPopupDatePicker
                  value={form.requestDate}
                  onChange={(v) => setForm((x) => ({ ...x, requestDate: v }))}
                  disableFuture
                  buttonClassName={`${input} flex items-center justify-between`}
                />
              </Field>
              <Field label="درخواست‌کننده">
                <div
                  className={`${input} flex items-center bg-neutral-100 dark:bg-white/10`}
                >
                  {name(user)}
                </div>
              </Field>
              <Field label="پروژه" required>
                <select
                  value={form.projectId}
                  onChange={(e) => selectProject(e.target.value)}
                  className={input}
                >
                  <option value="">انتخاب کنید</option>
                  {projects.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="مبلغ تنخواه درخواستی" required>
                <div className="flex overflow-hidden rounded-xl border border-black/10 dark:border-white/15">
                  <input
                    inputMode="numeric"
                    value={fa(form.amount)}
                    onChange={(e) => money("amount", e.target.value)}
                    className="h-11 min-w-0 flex-1 bg-transparent px-3 outline-none dark:text-white"
                  />
                  <select
                    value={form.currency}
                    onChange={(e) =>
                      setForm((x) => ({ ...x, currency: e.target.value }))
                    }
                    className="m-1 w-[62px] shrink-0 rounded-lg border border-black/10 bg-neutral-100 px-1 text-center text-xs font-semibold text-neutral-700 outline-none transition hover:bg-neutral-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  >
                    <option value="ریال">ریال</option>
                    {currencies.filter((currency) => String(currency.title || "").replace(/ي/g, "ی").replace(/ك/g, "ک").trim() !== "ریال").map((currency) => <option key={currency.id} value={currency.title} className="bg-white text-neutral-900">{currency.title}</option>)}
                  </select>
                </div>
              </Field>
              <Field label="مجموع تنخواه دریافت‌شده">
                <input value={fa(format3(projectBalances.receivedAmount))} readOnly className={`${input} bg-neutral-100 dark:bg-white/10`} />
              </Field>
              <Field label="مانده تنخواه ثبت‌نشده">
                <input
                  value={fa(format3(displayedUnregisteredBalance))}
                  readOnly
                  className={`${input} bg-neutral-100 dark:bg-white/10`}
                />
              </Field>
              <Field label="مانده تنخواه تسویه‌نشده">
                <input
                  value={fa(format3(displayedUnsettledBalance))}
                  readOnly
                  className={`${input} bg-neutral-100 dark:bg-white/10`}
                />
              </Field>
              <Field label="ارسال درخواست به مدیر پروژه" required>
                <select
                  value={form.projectManagerId}
                  onChange={(e) =>
                    setForm((x) => ({ ...x, projectManagerId: e.target.value }))
                  }
                  className={input}
                >
                  <option value="">انتخاب کنید</option>
                  {managers.map((u) => (
                    <option value={u.id} key={u.id}>
                      {name(u)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-5 flex justify-end border-t border-black/10 pt-4 dark:border-white/10">
              <button
                disabled={busy}
                onClick={create}
                className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black"
              >
                <img
                  src="/images/icons/check.svg"
                  className="h-5 w-5 invert dark:invert-0"
                />
              </button>
            </div>
          </section>
        )}
        {error && (
          <div className="mb-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}
        <section className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-neutral-200 dark:bg-white/10">
                <tr>
                  {[
                    "شماره درخواست",
                    "تاریخ درخواست",
                    "پروژه",
                    "مبلغ",
                    "ارز",
                    "وضعیت",
                    "اقدامات",
                  ].map((x) => (
                    <th className="px-3 py-2 text-center" key={x}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((x) => (
                    <tr
                      className="border-t border-black/10 dark:border-white/10"
                      key={x.id}
                    >
                      <td className="p-3 text-center">{x.requestNumber}</td>
                      <td className="p-3 text-center">{fa(x.requestDate)}</td>
                      <td className="p-3 text-center">
                        {x.projectCode} - {x.projectName}
                      </td>
                      <td className="p-3 text-center">
                        {fa(format3(x.chargedAmount || x.requestedAmount))}
                      </td>
                      <td className="p-3 text-center">{x.currency}</td>
                      <td className="p-3 text-center">
                        {x.status === "charged"
                          ? "شارژ شد"
                          : x.stage === "finance"
                            ? "در انتظار مالی"
                            : "در انتظار مدیر پروژه"}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2"><button
                          onClick={() =>
                            setSelected({
                              ...x,
                              managerApprovedDate: today(),
                              chargedDate: today(),
                              chargedAmount: x.requestedAmount,
                            })
                          }
                          className="grid h-10 w-10 place-items-center bg-transparent transition hover:opacity-70"
                          title={Number(x.currentAssigneeUserId) === Number(user?.id) && x.status === "pending" ? "اقدامات" : "نمایش درخواست"}
                          aria-label={Number(x.currentAssigneeUserId) === Number(user?.id) && x.status === "pending" ? "اقدامات" : "نمایش درخواست"}
                        >
                          <img src="/images/icons/list.svg" alt="" className="h-4 w-4 dark:invert" />
                        </button>
                        {(Number(x.createdById) === Number(user?.id) || (x.settlements || []).some((s) => Number(s.currentAssigneeUserId) === Number(user?.id))) && <button onClick={() => openSettlement(x, (x.settlements || []).find((s) => Number(s.currentAssigneeUserId) === Number(user?.id)) || x.settlements?.[0] || null)} className="rounded-lg bg-neutral-800 px-3 py-1.5 text-white dark:bg-white dark:text-black">تسویه</button>}</div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      className="p-10 text-center text-neutral-500"
                    >
                      هنوز درخواست تنخواهی ثبت نشده است.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        {selected && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900">
              <div className="sticky top-0 z-10 mb-5 flex items-center justify-between border-b border-black/10 bg-white px-5 py-4 dark:border-white/10 dark:bg-neutral-900">
                <span><b className="block">
                  {incoming ? "بررسی درخواست تنخواه" : "جزئیات درخواست تنخواه"}
                </b><small className="mt-1 block text-xs font-normal text-neutral-500">مشاهده وضعیت و اطلاعات درخواست</small></span>
                <button onClick={() => setSelected(null)} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black"><img src="/images/icons/bastan.svg" alt="بستن" className="h-4 w-4 invert dark:invert-0" /></button>
              </div>
              <div className="grid items-start gap-5 p-4 pt-0 md:grid-cols-[280px_minmax(0,1fr)] md:p-5 md:pt-0"><div className="order-last overflow-hidden rounded-2xl border border-black/10 dark:border-white/10"><div className="grid grid-cols-1 md:grid-cols-4">
                <DetailCell label="درخواست‌کننده">{selected.requesterName || selected.requesterUsername}</DetailCell>
                <DetailCell label="پروژه">{selected.projectCode} - {selected.projectName}</DetailCell>
                <DetailCell label="شماره درخواست">{selected.requestNumber}</DetailCell>
                <DetailCell label={selected.stage === "project_manager" ? "تاریخ تایید" : "تاریخ شارژ تنخواه"}>{fa(selected.stage === "project_manager" ? selected.managerApprovedDate || today() : selected.chargedDate || today())}</DetailCell>
                <DetailCell label="مانده تنخواه تسویه‌نشده">{fa(format3(selected.unsettledBalance))}</DetailCell>
                <DetailCell label="مبلغ تنخواه درخواستی">{fa(format3(selected.requestedAmount))} {selected.currency}</DetailCell>
                <DetailCell label="مانده تنخواه ثبت‌نشده">{fa(format3(selected.unregisteredBalance))}</DetailCell>
                {selected.stage !== "project_manager" && (
                  <DetailCell label="نقدینگی پروژه">{fa(format3(selected.projectLiquidity || 0))}</DetailCell>
                )}
                {incoming && selected.stage === "project_manager" && (
                  <div className="border-b border-l border-black/10 px-4 py-3 dark:border-white/10">
                  <Field label="ارسال نهایی به واحد مالی" required>
                    <select
                      value={selected.financeUserId || ""}
                      onChange={(e) =>
                        updateSelected("financeUserId", e.target.value)
                      }
                      className={input}
                    >
                      <option value="">انتخاب کنید</option>
                      {financeRecipients.map((u) => (
                        <option value={u.id} key={u.id}>
                          {name(u)}
                        </option>
                      ))}
                    </select>
                  </Field></div>
                )}
                {incoming && selected.stage === "finance" && (
                  <div className="border-b border-l border-black/10 px-4 py-3 dark:border-white/10"><Field label="مبلغ تنخواه شارژ شده">
                    <input
                      value={fa(selected.chargedAmount || "")}
                      onChange={(e) =>
                        updateSelected(
                          "chargedAmount",
                          format3(
                            toEnglishDigits(e.target.value).replace(
                              /[^\d]/g,
                              "",
                            ),
                          ),
                        )
                      }
                      className={input}
                    />
                  </Field></div>
                )}
                {incoming && <div className="col-span-full flex justify-end border-t border-black/10 p-3 dark:border-white/10"><button disabled={busy || (selected.stage === "project_manager" && !selected.financeUserId)} onClick={action} title="تأیید و ارسال" aria-label="تأیید و ارسال" className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"><img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" /></button></div>}
              </div></div><div className="order-first self-start"><TenkhahWorkflow stage={selected.stage} status={selected.status} /></div></div>
            </div>
          </div>
        )}
        {settlement && (
          <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[92vh] w-full max-w-[1280px] overflow-auto rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-white px-5 py-4 dark:border-white/10 dark:bg-neutral-900"><div><b className="block text-base">تسویه تنخواه</b><span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">ثبت و ارسال اسناد هزینه</span></div><button onClick={() => setSettlement(null)} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white transition hover:bg-black/85 dark:bg-white dark:text-black" title="بستن"><img src="/images/icons/bastan.svg" alt="بستن" className="h-4 w-4 invert dark:invert-0" /></button></div>
              <div className="p-4 md:p-5"><div className="mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-black/10 bg-neutral-50 p-4 md:grid-cols-3 dark:border-white/10 dark:bg-white/[.04]"><Field label="تنخواه‌گیرنده"><div className={`${input} flex items-center bg-white dark:bg-white/5`}>{settlement.request.requesterName || settlement.request.requesterUsername}</div></Field><Field label="پروژه"><div className={`${input} flex items-center bg-white dark:bg-white/5`}>{settlement.request.projectCode} - {settlement.request.projectName}</div></Field><Field label="مبلغ تنخواه"><div className={`${input} flex items-center bg-white font-medium tabular-nums dark:bg-white/5`}>{fa(format3(settlement.request.chargedAmount || settlement.request.requestedAmount))} {settlement.request.currency}</div></Field></div>
              {settlement.status === "draft" ? <>
                <div className="rounded-2xl bg-neutral-100 p-4 dark:bg-white/10"><div className="grid grid-cols-1 gap-3 md:grid-cols-6"><Field label="تاریخ"><JalaliPopupDatePicker value={settlementForm.expenseDate} onChange={(v) => setSettlementForm(x => ({...x,expenseDate:v}))} buttonClassName={`${input} flex justify-between`} /></Field><Field label="شرح هزینه"><input value={settlementForm.description} onChange={e=>setSettlementForm(x=>({...x,description:e.target.value}))} className={input}/></Field><Field label="مبلغ"><input inputMode="numeric" value={fa(settlementForm.amount)} onChange={e=>setSettlementForm(x=>({...x,amount:format3(toEnglishDigits(e.target.value).replace(/[^\d]/g,""))}))} className={input}/></Field><Field label="کد بودجه"><select value={settlementForm.budgetCode} onChange={e=>setSettlementForm(x=>({...x,budgetCode:e.target.value}))} className={input}><option value="">انتخاب کنید</option>{budgetItems.map(b=><option key={b.id} value={b.budgetCode}>{b.budgetCode} - {b.budgetName}</option>)}</select></Field><Field label="فایل"><div className="flex gap-2"><label className="grid h-11 w-11 cursor-pointer place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[.03] dark:border-white/15 dark:bg-white/5" title="بارگذاری فایل"><img src="/images/icons/Uplod.svg" alt="بارگذاری" className={`h-5 w-5 dark:invert ${busy ? "animate-pulse opacity-60" : ""}`} /><input type="file" className="hidden" accept="image/*,.pdf" onChange={e=>uploadSettlementFile(e.target.files?.[0])}/></label><button onClick={addSettlementEntry} className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-white text-xl transition hover:bg-black/[.03] dark:border-white/15 dark:bg-white/5" title="افزودن">+</button></div></Field></div>{settlementForm.fileName && <p className="mt-2 text-xs">فایل انتخاب‌شده: {settlementForm.fileName}</p>}</div>
                <SettlementTable entries={settlementEntries} request={settlement.request} onRemove={(id)=>setSettlementEntries(x=>x.filter(e=>e.id!==id))} onEdit={(entry)=>{setSettlementForm(x=>({...x,...entry}));setSettlementEntries(x=>x.filter(e=>e.id!==entry.id));}}/>
                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-black/10 bg-neutral-50 p-4 sm:flex-row sm:items-end sm:justify-end dark:border-white/10 dark:bg-white/[.04]"><Field label="ارسال به" required className="w-full sm:max-w-xs"><select value={settlementForm.sendToUserId} onChange={e=>{setSettlementForm(x=>({...x,sendToUserId:e.target.value}));setSettlementErrors(x=>({...x,recipient:false}));}} className={`${input} ${settlementErrors.recipient ? "!border-red-500 !ring-1 !ring-red-500" : ""}`}><option value="">انتخاب کنید</option>{settlementRecipients.map(u=><option key={u.id} value={u.id}>{name(u)}</option>)}</select></Field><button disabled={busy || !settlementEntries.length || !settlementForm.sendToUserId} onClick={submitSettlement} title="ارسال برای بررسی" aria-label="ارسال برای بررسی" className="grid h-11 w-11 place-items-center rounded-xl bg-black text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"><img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" /></button></div>
              </> : <>{editingEntryId && <SettlementEntryEditor form={settlementForm} setForm={setSettlementForm} budgetItems={budgetItems} busy={busy} onSave={addSettlementEntry} onCancel={()=>{setEditingEntryId(null);setSettlementForm(x=>({...x,expenseDate:today(),description:"",budgetCode:"",amount:"",fileName:"",fileUrl:""}));}} onUpload={uploadSettlementFile}/>}<SettlementTable entries={settlementEntries} request={settlement.request} onEdit={canEditSettlement ? (entry)=>{setEditingEntryId(entry.id);setSettlementForm(x=>({...x,...entry}));} : null}/><div className="mt-4 rounded-xl bg-neutral-100 p-4 dark:bg-white/10">وضعیت: {settlement.status === "completed" ? "تکمیل شده" : settlement.stage === "control_project" ? "در انتظار کنترل پروژه" : settlement.stage === "finance" ? "در انتظار مالی" : settlement.stage === "project_manager" ? "در انتظار مدیر پروژه" : "در انتظار اعلام تحویل فیزیکی اسناد"}</div>{Number(settlement.currentAssigneeUserId)===Number(user?.id) && settlement.status === "pending" && <div className="mt-4 flex items-end justify-end gap-3">{settlement.stage !== "project_manager" && settlement.stage !== "requester_delivery" && <select value={settlementForm.sendToUserId} onChange={e=>setSettlementForm(x=>({...x,sendToUserId:e.target.value}))} className={`${input} max-w-xs`}><option value="">انتخاب کنید</option>{settlementRecipients.map(u=><option key={u.id} value={u.id}>{name(u)}</option>)}</select>}<button disabled={busy || ((settlement.stage === "control_project" || settlement.stage === "finance") && !settlementForm.sendToUserId)} onClick={advanceSettlement} className="rounded-xl bg-black px-5 py-2 text-white dark:bg-white dark:text-black">{settlement.stage === "requester_delivery" ? "اسناد ارسال شد" : "تأیید و ارسال"}</button></div>}</>}
              </div></div>
          </div>
        )}
      </Card>
    </div>
  );
}
