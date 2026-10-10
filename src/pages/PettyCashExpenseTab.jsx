import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../components/AuthProvider.jsx";
import BudgetTreePickerModal from "../components/BudgetTreePickerModal.jsx";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import { todayJalaliYmd } from "../utils/date.js";
import { format3, toEnglishDigits } from "../utils/format.js";

const inputClass = "h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400";
const emptyForm = () => ({ expenseDate: todayJalaliYmd().replaceAll("-", "/"), description: "", budgetCode: "", amount: "" });
const toFa = (value) => String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
const english = (value) => toEnglishDigits(String(value ?? "")).replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));

function Field({ label, children }) {
  return <label className="block min-w-0">
    <span className="mb-1 block text-xs font-medium text-neutral-600">{label}</span>
    {children}
  </label>;
}

export default function PettyCashExpenseTab() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [budgetItems, setBudgetItems] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [attachment, setAttachment] = useState(null);
  const [budgetPickerOpen, setBudgetPickerOpen] = useState(false);
  const [budgetPickerQuery, setBudgetPickerQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(`/api${path}`, {
      credentials: "include",
      ...options,
      headers: { "Content-Type": "application/json", "x-user-id": String(user?.id || ""), ...options.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "دریافت اطلاعات انجام نشد.");
    return data;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    api("/projects?isActive=true")
      .then((data) => setProjects((data.items || data.projects || []).filter((project) =>
        project.isActive !== false && /^\d{3}$/.test(english(project.code).trim()))))
      .catch((reason) => setError(reason.message));
  }, [api, user?.id]);

  const loadExpenses = useCallback(async (id) => {
    if (!id || !user?.id) { setItems([]); return; }
    const data = await api(`/petty-cash-expenses?projectId=${encodeURIComponent(id)}`);
    setItems((data.items || []).filter((item) => Number(item.createdById) === Number(user.id)));
  }, [api, user?.id]);

  useEffect(() => {
    loadExpenses(projectId).catch((reason) => setError(reason.message));
  }, [loadExpenses, projectId]);

  const selectProject = async (id) => {
    setProjectId(id);
    setForm(emptyForm());
    setAttachment(null);
    setBudgetItems([]);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!id) return;
    try {
      const data = await api(`/cost-breakdown?project_id=${encodeURIComponent(id)}`);
      setBudgetItems(data.items || []);
    } catch (reason) {
      setError(reason.message);
    }
  };

  const addExpense = async () => {
    if (!projectId) return setError("ابتدا پروژه را انتخاب کنید.");
    if (!form.expenseDate || !form.description.trim() || !form.budgetCode || !toEnglishDigits(form.amount).replace(/[^\d]/g, "")) {
      return setError("تاریخ، شرح، کد بودجه و مبلغ را تکمیل کنید.");
    }
    setSaving(true);
    setError("");
    try {
      let file = null;
      if (attachment) {
        const payload = new FormData();
        payload.append("file", attachment);
        const response = await fetch("/api/petty-cash-expenses/upload", {
          method: "POST", credentials: "include", headers: { "x-user-id": String(user?.id || "") }, body: payload,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "بارگذاری پیوست انجام نشد.");
        file = data.file;
      }
      await api("/petty-cash-expenses", {
        method: "POST",
        body: JSON.stringify({ projectId, ...form, fileName: file?.name, fileUrl: file?.url }),
      });
      await loadExpenses(projectId);
      setForm(emptyForm());
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedProject = projects.find((project) => String(project.id) === String(projectId));
  return <section className="rounded-b-2xl border border-t-0 border-neutral-200 bg-white p-3 sm:p-4">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <Field label="پروژه">
        <select value={projectId} onChange={(event) => selectProject(event.target.value)} className={`${inputClass} min-w-64`}>
          <option value="">انتخاب کنید</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{english(project.code)} - {project.name}</option>)}
        </select>
      </Field>
      <button type="button" disabled className="h-11 rounded-xl border border-neutral-300 bg-neutral-100 px-4 text-sm font-semibold text-neutral-500 opacity-65">
        فراخوانی از اکسل
      </button>
    </div>

    <div className="grid grid-cols-1 items-end gap-3 rounded-2xl border border-neutral-200 bg-neutral-100 p-3 sm:grid-cols-2 xl:grid-cols-[150px_minmax(180px,1fr)_minmax(180px,1fr)_170px_140px]">
      <Field label="تاریخ">
        <JalaliPopupDatePicker value={form.expenseDate} onChange={(expenseDate) => setForm((current) => ({ ...current, expenseDate }))}
          buttonClassName={`${inputClass} flex items-center justify-between`} />
      </Field>
      <Field label="شرح">
        <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className={inputClass} />
      </Field>
      <Field label="کد بودجه">
        <button type="button" disabled={!projectId} onClick={() => { setBudgetPickerQuery(""); setBudgetPickerOpen(true); }}
          className={`${inputClass} flex items-center justify-between gap-2 text-right disabled:opacity-50`}>
          <span className="truncate">{form.budgetCode || "انتخاب کد بودجه"}</span><span>⌄</span>
        </button>
      </Field>
      <Field label="مبلغ (ریال)">
        <input dir="ltr" inputMode="numeric" value={toFa(form.amount)}
          onChange={(event) => setForm((current) => ({ ...current, amount: format3(toEnglishDigits(event.target.value).replace(/[^\d]/g, "")) }))}
          className={`${inputClass} text-left tabular-nums`} />
      </Field>
      <Field label="پیوست">
        <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.rtf,.xls,.xlsx,.xlsm,.csv,.jpg,.jpeg,.png,.webp,.heic,.heif"
          onChange={(event) => setAttachment(event.target.files?.[0] || null)} />
        <button type="button" onClick={() => fileInputRef.current?.click()} className={`${inputClass} truncate text-center`} title={attachment?.name || "بارگذاری"}>
          {attachment?.name || "بارگذاری"}
        </button>
      </Field>
    </div>
    <button type="button" onClick={addExpense} disabled={saving} className="my-3 grid h-11 w-11 place-items-center rounded-xl bg-black text-2xl text-white disabled:opacity-50"
      title="افزودن ردیف" aria-label="افزودن ردیف">+</button>
    {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    <div className="overflow-x-auto rounded-2xl border border-neutral-200">
      <table className="w-full min-w-[620px] table-fixed text-center text-sm">
        <thead className="bg-neutral-200 text-neutral-900">
          <tr>{["ردیف", "شرح", "کد بودجه", "مبلغ", "پیوست"].map((label) => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((item, index) => <tr key={item.id} className="border-t border-neutral-200 bg-neutral-50/70">
            <td className="px-3 py-3">{toFa(index + 1)}</td>
            <td className="break-words px-3 py-3 text-right">{item.description}</td>
            <td className="px-3 py-3">{toFa(item.budgetCode)}</td>
            <td className="px-3 py-3 tabular-nums">{toFa(format3(item.amount))}</td>
            <td className="px-3 py-3">{item.fileUrl
              ? <a href={item.fileUrl} target="_blank" rel="noreferrer" className="text-sky-700 underline" title={item.fileName || "مشاهده پیوست"}>مشاهده</a>
              : "—"}</td>
          </tr>)}
          {!items.length && <tr><td colSpan={5} className="px-3 py-8 text-neutral-500">ردیفی ثبت نشده است.</td></tr>}
        </tbody>
      </table>
    </div>
    {budgetPickerOpen && <BudgetTreePickerModal
      items={budgetItems.map((item) => ({ code: item.budgetCode, value: item.budgetCode, center_desc: item.budgetName }))}
      selectedCode={form.budgetCode} query={budgetPickerQuery} onQueryChange={setBudgetPickerQuery}
      onSelect={(budgetCode) => { setForm((current) => ({ ...current, budgetCode })); setBudgetPickerOpen(false); }}
      onClose={() => setBudgetPickerOpen(false)} />}
  </section>;
}
