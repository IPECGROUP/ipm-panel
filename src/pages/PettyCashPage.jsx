import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Crop, ImagePlus, RotateCcw, RotateCw, Check, X, RefreshCw, LoaderCircle, FileText, BriefcaseBusiness, CalendarDays, ListChecks, ChevronLeft, ChevronRight, Pencil, Eye } from "lucide-react";
import { useAuth } from "../components/AuthProvider.jsx";
import BudgetTreePickerModal from "../components/BudgetTreePickerModal.jsx";
import AdvancedFileUploadModal from "../components/AdvancedFileUploadModal.jsx";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import Card from "../components/ui/Card.jsx";
import PettyCashBarChart from "../components/PettyCashBarChart.jsx";
import { todayJalaliYmd } from "../utils/date.js";
import { format3, toEnglishDigits } from "../utils/format.js";
import { budgetPickerItems, fullBudgetCode } from "../utils/budgetPickerItems.js";
import { openPettyCashReportPdf } from "../utils/pettyCashReportPdf.js";

const colors = ["#1f2937", "#64748b", "#a78bfa", "#38bdf8", "#34d399", "#fbbf24", "#fb7185", "#818cf8"];
const amount = (value) => { try { return BigInt(value || 0); } catch { return 0n; } };
const money = (value) => {
  const number = amount(value);
  const absolute = number < 0n ? -number : number;
  const formatted = format3(absolute.toString()).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
  return number < 0n ? `(${formatted})` : formatted;
};
const PETTY_CASH_LIMIT_MESSAGE = "سقف مجاز درخواست تنخواه شما پر شده است. جهت دریافت تنخواه، موارد باقی‌مانده ثبت‌نشده را ثبت یا تأیید موارد ثبت‌شده را پیگیری نمایید.";
const currencyLabel = (item) => item?.title || item?.name || item?.label || item?.code || `#${item?.id}`;
const isRialCurrency = (item) => /ریال|rial|﷼|(^|\s)irr(\s|$)/i.test(currencyLabel(item).replace(/ي/g, "ی").replace(/ك/g, "ک"));
const decimalAmount = (value) => {
  const cleaned = toEnglishDigits(String(value ?? "")).replace(/٫/g, ".").replace(/[٬,\s]/g, "").replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  const [whole, ...fraction] = cleaned.split(".");
  const formatted = format3(whole || "0");
  return fraction.length ? `${formatted}.${fraction.join("").slice(0, 2)}` : formatted;
};
const decimalMinor = (value) => {
  const normalized = decimalAmount(value).replace(/,/g, "");
  const match = normalized.match(/^(\d+)(?:\.(\d{0,2}))?$/);
  return match ? BigInt(match[1]) * 100n + BigInt((match[2] || "").padEnd(2, "0")) : 0n;
};
const foreignAmount = (value) => {
  const minor = decimalMinor(value);
  return `${minor / 100n}.${String(minor % 100n).padStart(2, "0")}`;
};
const rialEquivalent = (value, currencyTypeId, exchangeRate) => currencyTypeId
  ? (decimalMinor(value) * amount(toEnglishDigits(exchangeRate).replace(/[^\d]/g, "")) + 50n) / 100n
  : amount(toEnglishDigits(value).replace(/[^\d]/g, ""));
const expenseAmountLabel = (item) => item.currencyTypeId
  ? `${toFa(decimalAmount(item.currencyAmount))} ${item.currencyName || "ارز"}` : `${money(item.amount)} ریال`;
function SummaryLine({ label, value, color, action }) {
  return <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-b border-neutral-100 pb-3 last:border-b-0" style={color ? { color } : undefined}>
    <span className="inline-flex items-center gap-2">{action}{label}:</span>
    <strong className="whitespace-nowrap font-semibold tabular-nums">{money(value)} ریال</strong>
  </div>;
}

function MyPettyCashSummary() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [balances, setBalances] = useState({ receivedAmount: "0", unregisteredBalance: "0", unsettledBalance: "0" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [receivedDetails, setReceivedDetails] = useState([]);
  const [detailsTotal, setDetailsTotal] = useState("0");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [registeredOpen, setRegisteredOpen] = useState(false);
  const detailsDialogRef = useRef(null);
  const receivedProjectIds = useMemo(() => items.filter((item) => amount(item.receivedAmount) > 0n).map((item) => item.projectId), [items]);

  useEffect(() => {
    if (!detailsOpen || !user?.id || loading) return;
    const controller = new AbortController();
    setDetailsLoading(true);
    setDetailsError("");
    Promise.all(receivedProjectIds.map(async (projectId) => {
      const response = await fetch(`/api/petty-cash-expenses?summary=received-details&projectId=${encodeURIComponent(projectId)}`, {
        credentials: "include", headers: { "x-user-id": String(user.id) }, signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "دریافت ریز تنخواه‌ها انجام نشد.");
      return Array.isArray(data.items) ? data.items : [];
    })).then((groups) => {
      const details = groups.flat().sort((a, b) => String(b.chargedDate || b.requestDate || "").localeCompare(String(a.chargedDate || a.requestDate || "")));
      setReceivedDetails(details);
      setDetailsTotal(details.reduce((sum, item) => sum + amount(item.chargedAmount), 0n).toString());
    }).catch((reason) => { if (reason.name !== "AbortError") setDetailsError("دریافت ریز تنخواه‌ها انجام نشد. دوباره تلاش کنید."); })
      .finally(() => { if (!controller.signal.aborted) setDetailsLoading(false); });
    return () => controller.abort();
  }, [detailsOpen, user?.id, loading, receivedProjectIds]);

  useEffect(() => {
    if (!detailsOpen) return;
    const previousFocus = document.activeElement;
    detailsDialogRef.current?.querySelector("button")?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") { event.preventDefault(); setDetailsOpen(false); }
      if (event.key !== "Tab") return;
      const focusable = [...detailsDialogRef.current.querySelectorAll('button:not(:disabled), a[href]')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); previousFocus?.focus(); };
  }, [detailsOpen]);

  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const options = {
      credentials: "include",
      headers: { "x-user-id": String(user.id) },
      signal: controller.signal,
    };
    const read = async (path) => {
      const response = await fetch(path, options);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "دریافت اطلاعات تنخواه انجام نشد.");
      return data;
    };
    Promise.all([
      read("/api/petty-cash-expenses?summary=mine"),
      read(`/api/tenkhah?beneficiaryId=${encodeURIComponent(user.id)}`),
    ])
      .then(([summary, balance]) => {
        setItems(Array.isArray(summary.items) ? summary.items : []);
        setBalances(balance);
      })
      .catch((reason) => { if (reason.name !== "AbortError") setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.id]);

  // The payment-request petty-cash form reads these beneficiary balances from
  // /api/tenkhah. They include both legacy settlement entries and newer expenses.
  const received = amount(balances.receivedAmount);
  const unregistered = amount(balances.unregisteredBalance);
  const unsettled = amount(balances.unsettledBalance);
  const totals = {
    received,
    registered: received - unregistered,
    approved: received - unsettled,
  };
  const projects = useMemo(() => items.filter((item) => amount(item.receivedAmount) > 0n), [items]);
  const projectChartData = projects.map((project, index) => ({
    id: project.projectId,
    name: project.projectName || project.projectCode || `پروژه ${index + 1}`,
    amount: amount(project.receivedAmount).toString(),
    value: Number(amount(project.receivedAmount)),
    color: colors[index % colors.length],
  }));
  const unassigned = totals.received - projects.reduce((sum, project) => sum + amount(project.receivedAmount), 0n);
  if (projects.length && unassigned > 0n) projectChartData.push({ id: "unassigned", name: "سایر تنخواه‌ها", amount: unassigned.toString(), value: Number(unassigned), color: "#CBD5E1" });

  return <section className="rounded-b-2xl border border-neutral-200 bg-white px-4 py-7 text-neutral-900 sm:px-7 lg:px-10">
    {error && <p role="alert" className="mb-6 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading && <p role="status" className="mb-6 text-sm text-neutral-500">در حال دریافت اطلاعات...</p>}
    <div className="grid gap-9 lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
      <PettyCashBarChart totals={totals} />
      <div className="self-center space-y-4 text-sm sm:text-base">
        <SummaryLine label="مجموع تنخواه‌های دریافت‌شده" value={totals.received} color="#6366F1" action={<button type="button" onClick={() => setDetailsOpen(true)} aria-label="مشاهده ریز تنخواه‌های دریافت‌شده" title="مشاهده ریز تنخواه‌های دریافت‌شده" className="inline-grid h-8 w-8 place-items-center rounded-lg transition hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"><Eye className="h-4 w-4" /></button>} />
        <SummaryLine label="مجموع هزینه‌های ثبت‌شده" value={totals.registered} color="#38BDF8" action={<button type="button" onClick={() => setRegisteredOpen(true)} aria-label="مشاهده ریز هزینه‌های ثبت‌شده" title="مشاهده ریز هزینه‌های ثبت‌شده" className="inline-grid h-8 w-8 place-items-center rounded-lg transition hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"><Eye className="h-4 w-4" /></button>} />
        <SummaryLine label="باقی‌مانده هزینه‌های ثبت نشده" value={unregistered} color="#6B7280" />
        <SummaryLine label="مجموع هزینه‌های تأییدشده" value={totals.approved} color="#10B981" />
        <SummaryLine label="باقی‌مانده تنخواه تسویه‌نشده" value={unsettled} color="#DC2626" />
      </div>
    </div>
    <hr className="my-9 border-neutral-200" />
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
      <div className="min-w-0 rounded-2xl border border-neutral-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm sm:p-5">
        <h3 className="text-sm font-bold text-slate-800">سهم پروژه‌ها</h3>
        <p className="mt-1 text-xs text-slate-500">از مجموع تنخواه دریافتی</p>
        <div role="img" aria-label="سهم هر پروژه از مجموع تنخواه‌های دریافت‌شده" className="relative mx-auto mt-3 h-56 w-full max-w-72 select-none sm:h-64 [&_.recharts-wrapper:focus:not(:focus-visible)]:outline-none">
          {projectChartData.length ? <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie data={projectChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="61%" outerRadius="84%" paddingAngle={projectChartData.length > 1 ? 2 : 0} cornerRadius={projectChartData.length > 1 ? 5 : 0} stroke={projectChartData.length > 1 ? "#fff" : "none"} strokeWidth={projectChartData.length > 1 ? 2 : 0} animationDuration={1000}>
                {projectChartData.map((project) => <Cell key={project.id} fill={project.color} />)}
              </Pie>
              <Tooltip offset={14} isAnimationActive animationDuration={120} animationEasing="ease-out" wrapperStyle={{ pointerEvents: "none", transition: "transform 120ms ease-out" }} content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const project = payload[0].payload;
                return <div dir="rtl" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-xs shadow-lg">
                  <div className="font-semibold" style={{ color: project.color }}>{project.name}</div>
                  <div className="mt-1 font-bold tabular-nums text-slate-900">{money(project.amount)} ریال</div>
                </div>;
              }} />
            </PieChart>
          </ResponsiveContainer> : <div className="absolute inset-0 m-auto h-44 w-44 rounded-full border-[22px] border-slate-200 sm:h-52 sm:w-52" />}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] text-slate-500">کل تنخواه‌ها</span>
            <strong className="mt-1 text-xs font-bold tabular-nums text-slate-800 sm:text-sm">{money(totals.received)}</strong>
            <span className="text-[10px] text-slate-500">ریال</span>
          </div>
        </div>
      </div>
      <div>
        <h2 className="mb-5 text-base font-bold">تنخواه دریافت‌شده به تفکیک پروژه</h2>
        {projects.length ? <ul className="space-y-3">{projects.map((project, index) =>
          <li key={project.projectId} className="flex flex-wrap items-center justify-between gap-2 text-sm sm:text-base">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: colors[index % colors.length] }} />
              <span className="break-words">{project.projectName || project.projectCode || `پروژه ${index + 1}`}</span>
            </span>
            <strong className="whitespace-nowrap font-semibold tabular-nums">{money(project.receivedAmount)} ریال</strong>
          </li>)}</ul> : !loading && !error ? <p className="text-sm text-neutral-500">هنوز تنخواهی دریافت نشده است.</p> : null}
      </div>
    </div>
    {detailsOpen && createPortal(<div className="fixed inset-0 z-[1600] flex items-center justify-center bg-black/60 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailsOpen(false); }}>
      <div ref={detailsDialogRef} data-received-details-dialog="true" role="dialog" aria-modal="true" aria-labelledby="received-details-title" dir="rtl" className="flex max-h-[85dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-indigo-200 bg-white text-neutral-900 shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-indigo-100 bg-indigo-50/70 p-4 sm:px-6">
          <div><h3 id="received-details-title" className="text-base font-bold text-indigo-700 sm:text-lg">سوابق تنخواه‌های دریافت‌شده</h3><p className="mt-1 text-xs text-indigo-500">لیست درخواست های تنخواه برای شما</p></div>
          <button type="button" onClick={() => setDetailsOpen(false)} aria-label="بستن سوابق تنخواه‌ها" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-700"><X className="h-4 w-4" /></button>
        </header>
        <div className="min-h-0 overflow-auto p-4 sm:p-6">
          {detailsLoading ? <p role="status" className="text-sm text-indigo-500">در حال دریافت اطلاعات...</p> : detailsError ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{detailsError}</p> : receivedDetails.length ? <div className="overflow-x-auto rounded-xl border border-indigo-100"><table className="w-full min-w-[700px] text-right text-sm">
            <thead className="bg-indigo-50 text-indigo-700"><tr><th className="px-3 py-3">ردیف</th><th className="px-3 py-3">شماره درخواست</th><th className="px-3 py-3">تاریخ</th><th className="px-3 py-3">پروژه</th><th className="px-3 py-3">شرح</th><th className="px-3 py-3 text-left">مبلغ</th></tr></thead>
            <tbody>{receivedDetails.map((item, index) => <tr key={item.id} className="border-t border-indigo-100 transition hover:bg-indigo-50/40"><td className="px-3 py-3">{toFa(index + 1)}</td><td className="px-3 py-3">{toFa(item.requestNumber || "—")}</td><td className="px-3 py-3">{toFa(item.chargedDate || item.requestDate || "—")}</td><td className="px-3 py-3">{item.projectName || item.projectCode || "—"}</td><td className="max-w-64 break-words px-3 py-3">{item.purpose || "—"}</td><td className="whitespace-nowrap px-3 py-3 text-left font-semibold tabular-nums text-indigo-700">{money(item.chargedAmount)} ریال</td></tr>)}</tbody>
          </table></div> : <p className="text-sm text-neutral-500">هنوز تنخواهی دریافت نشده است.</p>}
        </div>
        {!detailsLoading && !detailsError && <footer className="flex shrink-0 justify-between border-t border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 sm:px-6"><span>مجموع تنخواه‌های دریافت‌شده</span><span className="tabular-nums">{money(detailsTotal)} ریال</span></footer>}
      </div>
    </div>, document.body)}
    {registeredOpen && <RegisteredExpenseDetailsDialog userId={user?.id} onClose={() => setRegisteredOpen(false)} />}
  </section>;
}

function RegisteredExpenseDetailsDialog({ userId, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const read = async (path) => {
      const response = await fetch(path, { credentials: "include", headers: { "x-user-id": String(userId) }, signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "دریافت ریز هزینه‌ها انجام نشد.");
      return data;
    };
    Promise.all([read("/api/petty-cash-expenses"), read("/api/tenkhah")])
      .then(([expenses, tenkhah]) => {
        const currentExpenses = (expenses.items || []).filter((item) => Number(item.createdById) === Number(userId)).map((item) => ({
          key: `expense-${item.id}`, date: item.expenseDate, projectCode: item.projectCode, projectName: item.projectName || item.projectCode,
          description: item.description, budgetCode: item.budgetCode, amount: item.amount, source: "گزارش هزینه",
        }));
        const legacyEntries = (tenkhah.items || []).filter((request) => Number(request.beneficiaryUserId) === Number(userId))
          .flatMap((request) => (request.settlements || []).filter((settlement) => Number(settlement.createdById) === Number(userId))
            .flatMap((settlement) => (settlement.entries || []).map((entry) => ({
              key: `settlement-${settlement.id}-${entry.id}`, date: entry.expenseDate,
              projectCode: request.projectCode, projectName: request.projectName || request.projectCode, description: entry.description,
              budgetCode: entry.budgetCode, amount: entry.amount, source: "تسویه تنخواه",
            }))));
        setRows([...currentExpenses, ...legacyEntries].sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))));
      })
      .catch((reason) => { if (reason.name !== "AbortError") setError("دریافت ریز هزینه‌ها انجام نشد. دوباره تلاش کنید."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    dialogRef.current?.querySelector("button")?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), a[href]')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); previousFocus?.focus(); };
  }, [onClose]);

  const total = rows.reduce((sum, row) => sum + amount(row.amount), 0n);
  return createPortal(<div className="fixed inset-0 z-[1600] flex items-center justify-center bg-black/60 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} data-registered-details-dialog="true" role="dialog" aria-modal="true" aria-labelledby="registered-details-title" dir="rtl" className="flex max-h-[85dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-2xl">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 p-4 sm:px-6">
        <div><h3 id="registered-details-title" className="text-base font-bold sm:text-lg">ریز هزینه‌های ثبت‌شده</h3><p className="mt-1 text-xs text-neutral-500">تمام هزینه‌ها و تسویه‌های ثبت‌شده توسط شما</p></div>
        <button type="button" onClick={onClose} aria-label="بستن ریز هزینه‌ها" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neutral-900 text-white"><X className="h-4 w-4" /></button>
      </header>
      <div className="min-h-0 overflow-auto p-4 sm:p-6">
        {loading ? <p role="status" className="text-sm text-neutral-500">در حال دریافت اطلاعات...</p> : error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : rows.length ? <div className="overflow-x-auto rounded-xl border border-neutral-200"><table className="w-full min-w-[760px] text-right text-sm">
          <thead className="bg-neutral-50 text-neutral-700"><tr><th className="px-3 py-3">ردیف</th><th className="px-3 py-3">تاریخ هزینه</th><th className="px-3 py-3">پروژه</th><th className="px-3 py-3">شرح</th><th className="px-3 py-3">کد بودجه</th><th className="px-3 py-3">نوع ثبت</th><th className="px-3 py-3 text-left">مبلغ (ریال)</th></tr></thead>
          <tbody>{rows.map((row, index) => <tr key={row.key} className="border-t border-neutral-200"><td className="px-3 py-3">{toFa(index + 1)}</td><td className="px-3 py-3">{toFa(row.date || "—")}</td><td className="px-3 py-3">{row.projectName || "—"}</td><td className="max-w-64 break-words px-3 py-3">{row.description || "—"}</td><td className="px-3 py-3">{toFa(fullBudgetCode(row.budgetCode, row.projectCode) || "—")}</td><td className="px-3 py-3">{row.source}</td><td className="whitespace-nowrap px-3 py-3 text-left font-semibold tabular-nums">{money(row.amount)}</td></tr>)}</tbody>
        </table></div> : <p className="text-sm text-neutral-500">هنوز هزینه‌ای ثبت نشده است.</p>}
      </div>
      {!loading && !error && <footer className="flex shrink-0 justify-between border-t border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-bold sm:px-6"><span>مجموع هزینه‌های ثبت‌شده</span><span className="tabular-nums">{money(total)} ریال</span></footer>}
    </div>
  </div>, document.body);
}

async function fetchExpenseReports(userId) {
  const response = await fetch("/api/petty-cash-expenses?expenseReports=mine", { credentials: "include", headers: { "x-user-id": String(userId) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("دریافت گزارش‌ها انجام نشد.");
  return data.items || [];
}

async function fetchPettyCashBalance(userId) {
  const response = await fetch(`/api/tenkhah?beneficiaryId=${encodeURIComponent(userId)}`, { credentials: "include", headers: { "x-user-id": String(userId) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("دریافت مانده تنخواه انجام نشد.");
  return { received: amount(data.receivedAmount), available: amount(data.unsettledBalance) };
}

export default function PettyCashPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const [searchParams, setSearchParams] = useSearchParams();
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [expenseFormKey, setExpenseFormKey] = useState(0);
  const [activeDraft, setActiveDraft] = useState(null);
  const [reportSaving, setReportSaving] = useState(false);
  const [expenseAccess, setExpenseAccess] = useState({ loading: true, received: 0n, available: 0n, error: "" });
  const [expenseStartError, setExpenseStartError] = useState("");
  const [limitBlocked, setLimitBlocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState("");
  const [reportOwnershipFilter, setReportOwnershipFilter] = useState("");
  const [reportPage, setReportPage] = useState(0);
  const [reportsPerPage, setReportsPerPage] = useState(10);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [reports, setReports] = useState([]);
  const [reportError, setReportError] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedLegacyExpense, setSelectedLegacyExpense] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const reviewBusyRef = useRef(false);
  const openingNotificationRef = useRef("");
  const summaryDialogRef = useRef(null);
  const loadReports = useCallback(async () => {
    if (!userId) return [];
    const nextReports = await fetchExpenseReports(userId);
    setReports(nextReports);
    setReportError("");
    return nextReports;
  }, [userId]);
  const loadExpenseAccess = useCallback(async () => {
    if (!userId) return;
    try {
      const balance = await fetchPettyCashBalance(userId);
      setExpenseAccess({ loading: false, ...balance, error: "" });
    } catch (reason) {
      setExpenseAccess({ loading: false, received: 0n, available: 0n, error: reason.message });
    }
  }, [userId]);
  const loadLimit = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch("/api/tenkhah?limit=1", { credentials: "include", headers: { "x-user-id": String(userId) } });
      if (!response.ok) return;
      const status = await response.json();
      setLimitBlocked(!!status.blocked);
    } catch { /* The request form still checks the limit before submitting. */ }
  }, [userId]);
  useEffect(() => {
    const refresh = () => {
      loadReports().catch((reason) => setReportError(reason.message));
      loadExpenseAccess();
      loadLimit();
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("tenkhah-notifications-refresh", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("tenkhah-notifications-refresh", refresh); };
  }, [loadReports, loadExpenseAccess, loadLimit]);
  useEffect(() => {
    const target = searchParams.get("notificationTarget");
    if (!["petty_cash_report", "petty_cash_expense"].includes(target)) {
      openingNotificationRef.current = "";
      return;
    }
    if (!userId) return;
    const id = Number(searchParams.get("request"));
    const key = `${userId}:${target}:${id}`;
    if (openingNotificationRef.current === key) return;
    openingNotificationRef.current = key;
    const finish = (item) => {
      if (openingNotificationRef.current !== key) return;
      if (item && target === "petty_cash_report") setSelectedReport(item);
      else if (item) setSelectedLegacyExpense(item);
      else setReportError("این مورد دیگر در کارتابل شما نیست.");
      const next = new URLSearchParams(searchParams);
      next.delete("notificationTarget"); next.delete("request");
      setSearchParams(next, { replace: true });
    };
    if (target === "petty_cash_expense") {
      fetch(`/api/petty-cash-expenses?inbox=1&expenseId=${id}`, { credentials: "include", headers: { "x-user-id": String(userId || "") } })
        .then(async (response) => { if (!response.ok) throw new Error(); return response.json(); })
        .then((data) => finish(data.items?.find((item) => item.notificationTarget !== "petty_cash_report" && Number(item.id) === id)))
        .catch(() => { if (openingNotificationRef.current === key) { openingNotificationRef.current = ""; setReportError("دریافت هزینه اعلان‌شده انجام نشد. دوباره تلاش کنید."); } });
      return;
    }
    fetchExpenseReports(userId).then((freshReports) => { setReports(freshReports); finish(freshReports.find((item) => Number(item.id) === id)); })
      .catch(() => { if (openingNotificationRef.current === key) { openingNotificationRef.current = ""; setReportError("دریافت گزارش اعلان‌شده انجام نشد. دوباره تلاش کنید."); } });
  }, [searchParams, setSearchParams, userId]);
  const visibleReports = reports.filter((report) => {
     const state = expenseReportState(report);
    if (reportStatusFilter && state.statusKey !== reportStatusFilter) return false;
    if (reportOwnershipFilter === "mine" && String(report.createdById) !== String(user?.id)) return false;
    if (reportOwnershipFilter === "incoming" && !report.canAct && !report.wasSentToMe) return false;
    const date = english(reportDate(report.createdAt)).replaceAll("-", "/");
    if (reportFromDate && date < english(reportFromDate).replaceAll("-", "/")) return false;
    if (reportToDate && date > english(reportToDate).replaceAll("-", "/")) return false;
    return english([
    report.id, report.reportNumber, report.reportName, reportDate(report.createdAt), report.projectCode, report.projectName,
    report.createdByName, report.createdByUsername, report.items?.reduce((sum, item) => sum + amount(item.amount), 0n).toString(),
    state.waiting, state.status,
  ].join(" ")).toLowerCase().includes(english(searchQuery).trim().toLowerCase());
  });
  const reportPageCount = Math.max(1, Math.ceil(visibleReports.length / reportsPerPage));
  const safeReportPage = Math.min(reportPage, reportPageCount - 1);
  const reportStartIndex = safeReportPage * reportsPerPage;
  const reportEndIndex = Math.min(reportStartIndex + reportsPerPage, visibleReports.length);
  const pageReports = visibleReports.slice(reportStartIndex, reportEndIndex);
  const closeDialog = () => { if (!reviewBusyRef.current) { setSummaryOpen(false); setSelectedReport(null); setSelectedLegacyExpense(null); setEditingReport(null); } };

  useEffect(() => {
    if (!summaryOpen && !selectedReport && !selectedLegacyExpense) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    summaryDialogRef.current?.querySelector("button")?.focus();
    const handleKey = (event) => {
      if (document.querySelector('[data-received-details-dialog="true"], [data-registered-details-dialog="true"]')) return;
      if (summaryDialogRef.current?.querySelector('[data-manager-dialog="true"]')) return;
      if (event.key === "Escape") { event.preventDefault(); if (!reviewBusyRef.current) { setSummaryOpen(false); setSelectedReport(null); setSelectedLegacyExpense(null); } }
      if (event.key !== "Tab") return;
      const focusable = [...summaryDialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter((element) => element.getClientRects().length);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [summaryOpen, selectedReport, selectedLegacyExpense]);
  return <div dir="rtl" className="mx-auto min-w-0 max-w-[1400px]">
    <Card className="overflow-hidden rounded-2xl border border-black/10 bg-white p-0 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-neutral-900 sm:rounded-3xl sm:shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="p-2.5 sm:p-3 md:p-4">
        <header className="mb-4 flex min-w-0 flex-wrap items-center gap-3 px-0.5 pb-3 sm:mb-5 sm:pb-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 shadow-sm dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04] sm:h-11 sm:w-11 sm:rounded-2xl">
            <img src="/images/icons/tenkhah.svg" alt="" className="h-5 w-5 dark:invert sm:h-6 sm:w-6" />
          </span>
          <span className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight md:text-lg">تنخواه‌گردان</h1>
            <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت مالی</span>
          </span>
          <div className="mr-auto flex shrink-0 items-center gap-3">
            <button type="button" onClick={() => setSummaryOpen(true)} aria-haspopup="dialog"
              className="h-10 rounded-xl px-3 text-sm font-semibold ring-1 ring-black/15 transition hover:bg-black/5 dark:ring-neutral-800 dark:hover:bg-white/10">تنخواه‌های من</button>
            <button type="button" disabled={reportSaving} onClick={() => {
               if (expenseFormOpen) { setExpenseFormOpen(false); setActiveDraft(null); setExpenseFormKey((current) => current + 1); setExpenseStartError(""); return; }
               const hasOwnDraft = reports.some((report) => report.initialStage === "draft" && String(report.createdById) === String(userId));
               if (hasOwnDraft) { setExpenseStartError(""); setExpenseFormOpen(true); return; }
              if (expenseAccess.loading) return setExpenseStartError("مانده تنخواه در حال دریافت است. دوباره تلاش کنید.");
              if (expenseAccess.error) return setExpenseStartError(expenseAccess.error);
              if (expenseAccess.available <= 0n) return setExpenseStartError(expenseAccess.received <= 0n ? "برای ثبت هزینه، ابتدا باید تنخواه دریافت کنید." : "مانده تنخواه تسویه‌نشده‌ای برای ثبت هزینه جدید وجود ندارد.");
              setExpenseStartError(""); setExpenseFormOpen(true);
            }}
              title={expenseFormOpen ? "بستن" : "افزودن"}
              aria-label={expenseFormOpen ? "بستن فرم ثبت هزینه‌ها" : "افزودن"} aria-expanded={expenseFormOpen}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/15 transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:ring-neutral-800 dark:hover:bg-white/10">
              <img src={expenseFormOpen ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" />
            </button>
          </div>
        </header>
        {limitBlocked && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{PETTY_CASH_LIMIT_MESSAGE}</p>}
        {expenseStartError && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{expenseStartError}</p>}
         {expenseFormOpen && <div>
          <PettyCashExpenseTab key={expenseFormKey} initialReport={activeDraft} availableBalance={expenseAccess.available} onBusyChange={setReportSaving}
            onChooseDraft={(draft) => { setActiveDraft(draft); setExpenseFormKey((current) => current + 1); setExpenseStartError(""); }}
            onDeleted={() => { setReports((current) => current.filter((report) => report.id !== activeDraft?.id)); setActiveDraft(null); setExpenseFormOpen(false); setExpenseFormKey((current) => current + 1); loadReports().catch((reason) => setReportError(reason.message)); }}
            onDraftSaved={(_report, savedReports) => {
            setReports(savedReports);
            setExpenseFormOpen(false); setActiveDraft(null); setExpenseFormKey((current) => current + 1);
            setSearchQuery(""); setReportStatusFilter(""); setReportOwnershipFilter("");
            setReportFromDate(""); setReportToDate(""); setReportPage(0);
            setReportError("");
         }} onSubmitted={(report) => {
           setReports((current) => [report, ...current.filter((item) => item.id !== report.id && item.id !== activeDraft?.id)]);
          setSearchQuery("");
          setReportStatusFilter("");
          setReportOwnershipFilter("");
          setReportPage(0);
          setExpenseFormOpen(false);
           setActiveDraft(null);
          setEditingReport(null);
          setExpenseFormKey((current) => current + 1);
          loadReports().catch((reason) => setReportError(reason.message));
          loadExpenseAccess();
          window.dispatchEvent(new Event("tenkhah-notifications-refresh"));
        }} />
         </div>}
         {!expenseFormOpen && <>
          <div className="mb-4 rounded-2xl border border-black/10 bg-neutral-50 p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-full min-w-0 md:min-w-[280px] md:flex-1"><Field label="جست و جو">
                <input type="text" value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setReportPage(0); }}
                  placeholder="جستجو در شماره، نام گزارش، تاریخ، پروژه، مبلغ، تنخواه‌گیرنده و وضعیت ..."
                  className={`${inputClass} placeholder:text-neutral-400 dark:border-white/15 dark:bg-neutral-900 dark:text-white`} />
              </Field></div>
              <div className="w-[calc(50%-0.25rem)] md:w-36"><div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">از</div><JalaliPopupDatePicker value={reportFromDate} onChange={(value) => { setReportFromDate(value); setReportPage(0); }} /></div>
              <div className="w-[calc(50%-0.25rem)] md:w-36"><div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">تا</div><JalaliPopupDatePicker value={reportToDate} onChange={(value) => { setReportToDate(value); setReportPage(0); }} /></div>
            </div>
            <div className="mt-3">
              <div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">برچسب ها</div>
              <div className="flex flex-wrap items-center gap-2">
                {[["mine", "گزارش‌های من"], ["incoming", "موارد ارسال‌شده به من"]].map(([key, label]) => <button key={key} type="button"
                  aria-pressed={reportOwnershipFilter === key} onClick={() => { setReportOwnershipFilter(reportOwnershipFilter === key ? "" : key); setReportPage(0); }}
                  className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ring-1 transition ${reportOwnershipFilter === key ? "bg-neutral-900 text-white ring-neutral-900 dark:bg-white dark:text-neutral-900" : "bg-white text-neutral-900 ring-black/10 hover:bg-neutral-50 dark:bg-white/5 dark:text-white dark:ring-white/15"}`}>{label}</button>)}
                {Object.entries(REPORT_STATUS_LABELS).map(([key, label]) => <button key={key} type="button"
                  aria-pressed={reportStatusFilter === key} onClick={() => { setReportStatusFilter(reportStatusFilter === key ? "" : key); setReportPage(0); }}
                  className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${reportStatusBadgeClass(key, reportStatusFilter === key)}`}>{label}</button>)}
              </div>
            </div>
          </div>
          {reportError && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{reportError}</p>}
          <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/10">
            <div className="overflow-x-auto">
              <table className="[&_td]:!text-center [&_th]:!text-center w-full min-w-[1200px] table-fixed border-collapse text-center text-sm" aria-label="گزارش‌های تنخواه">
                <colgroup><col className="w-16" /><col className="w-28" /><col className="w-32" /><col className="w-44" /><col className="w-52" /><col className="w-48" /><col className="w-44" /><col className="w-52" /></colgroup>
                <thead className="bg-neutral-200 text-neutral-900 dark:bg-white/10 dark:text-white">
                  <tr className="h-12 border-b border-neutral-300 dark:border-white/10">
                    <th scope="col" className="w-16 px-4 text-center font-bold">ردیف</th>
                    <th scope="col" className="px-4 text-center font-bold">شماره گزارش</th>
                    <th scope="col" className="px-4 text-center font-bold">تاریخ</th>
                    <th scope="col" className="px-4 text-center font-bold">تنخواه‌گیرنده</th>
                    <th scope="col" className="px-4 text-center font-bold">نام گزارش</th>
                    <th scope="col" className="px-4 text-center font-bold">پروژه</th>
                    <th scope="col" className="px-4 text-center font-bold">مبلغ</th>
                    <th scope="col" className="px-4 text-center font-bold">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="text-[13px] [&>tr]:h-11">
                  {pageReports.map((report, index) => {
                     const state = expenseReportState(report);
                    return <tr key={report.id} tabIndex={0} onClick={() => setSelectedReport(report)}
                      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedReport(report); } }}
                      aria-label={`مشاهده گزارش ${report.reportName}`}
                      className="cursor-pointer border-t border-neutral-200 bg-black/[0.02] transition hover:bg-black/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-400">
                      <td className="px-4 py-2">{toFa(reportStartIndex + index + 1)}</td>
                      <td className="px-4 py-2">{report.reportNumber ? toFa(report.reportNumber) : "—"}</td>
                      <td className="px-4 py-2">{reportDate(report.createdAt)}</td>
                      <td className="truncate px-4 py-2" title={report.createdByName || report.createdByUsername || ""}>{report.createdByName || report.createdByUsername || "—"}</td>
                      <td className="truncate px-4 py-2" title={report.reportName}>{report.reportName}</td>
                       <td className="truncate px-4 py-2" title={report.projectName}>{report.projectCode ? `${toFa(report.projectCode)} - ` : ""}{report.projectName}</td>
                      <td className="whitespace-nowrap px-4 py-2 tabular-nums">{money((report.items || []).reduce((sum, item) => sum + amount(item.amount), 0n))} ریال</td>
                      <td className="relative px-4 py-2">
                        <span className={`inline-flex max-w-full items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold ${reportStatusBadgeClass(state.statusKey)}`}>{state.statusKey === "pending" && state.waiting !== "—" ? state.waiting : state.status}</span>
                        {state.statusKey === "approved" && <button type="button" onClick={(event) => { event.stopPropagation(); openPettyCashReportPdf(report); }}
                          onKeyDown={(event) => event.stopPropagation()} aria-label={`مشاهده و چاپ گزارش ${report.reportName}`} title="مشاهده و چاپ گزارش"
                          className="absolute left-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-500 dark:hover:bg-white/10">
                          <img src="/images/icons/print.svg" alt="" className="h-5 w-5 dark:invert" />
                        </button>}
                      </td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <TablePagination total={visibleReports.length} rowsPerPage={reportsPerPage} page={safeReportPage}
              setPage={setReportPage} onRowsPerPageChange={(count) => { setReportsPerPage(count); setReportPage(0); }} />
          </div>
        </>}
      </div>
    </Card>
    {(summaryOpen || selectedReport || selectedLegacyExpense) && createPortal(
      <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6"
        onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
        <div ref={summaryDialogRef} role="dialog" aria-modal="true" aria-labelledby="petty-cash-summary-title" dir="rtl"
          className={`relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-2xl sm:rounded-3xl ${selectedReport ? "h-[92dvh] w-full max-w-[1680px] sm:h-[86dvh] sm:w-[92vw]" : selectedLegacyExpense ? "max-h-[90dvh] w-full max-w-2xl" : "max-h-[90dvh] w-full max-w-[1200px]"}`}>
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-100 px-3 py-3 sm:px-5 sm:py-4">
            <div className="flex min-w-0 items-center gap-3">
              {selectedReport && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-neutral-200 bg-neutral-50"><FileText className="h-5 w-5" /></span>}
              <div><h2 id="petty-cash-summary-title" className="text-base font-bold sm:text-lg">{selectedReport ? editingReport?.id === selectedReport.id ? selectedReport.initialStage === "draft" ? "تکمیل پیش‌نویس تنخواه" : "اصلاح گزارش تنخواه" : "تسویه تنخواه" : selectedLegacyExpense ? "بررسی هزینه تنخواه" : "تنخواه‌های من"}</h2>
              </div>
            </div>
            <button type="button" disabled={reviewBusy} onClick={closeDialog} aria-label="بستن پنجره"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black text-white hover:bg-neutral-800"><X className="h-4 w-4" /></button>
          </header>
          {selectedReport && editingReport?.id === selectedReport.id ? <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
            <PettyCashExpenseTab key={selectedReport.id} initialReport={selectedReport}
              onBusyChange={(busy) => { reviewBusyRef.current = busy; setReviewBusy(busy); }}
                onDraftSaved={(_report, savedReports) => { setReports(savedReports); setEditingReport(null); setSelectedReport(null); setReportError("");
                  setSearchQuery(""); setReportStatusFilter(""); setReportOwnershipFilter(""); setReportFromDate(""); setReportToDate(""); setReportPage(0); }}
               onSubmitted={() => { if (selectedReport.initialStage !== "draft") window.dispatchEvent(new CustomEvent("request-notification-completed", { detail: { notificationTarget: "petty_cash_report", id: selectedReport.id } })); setEditingReport(null); setSelectedReport(null); loadReports().catch((reason) => setReportError(reason.message)); window.dispatchEvent(new Event("tenkhah-notifications-refresh")); }}
               onDeleted={() => { if (selectedReport.initialStage !== "draft") window.dispatchEvent(new CustomEvent("request-notification-completed", { detail: { notificationTarget: "petty_cash_report", id: selectedReport.id } })); setReports((current) => current.filter((report) => report.id !== selectedReport.id)); setEditingReport(null); setSelectedReport(null); loadReports().catch((reason) => setReportError(reason.message)); loadExpenseAccess(); window.dispatchEvent(new Event("tenkhah-notifications-refresh")); }} />
          </div> : selectedReport ? <PettyCashReportReview key={selectedReport.id} report={selectedReport}
            onBusyChange={(busy) => { reviewBusyRef.current = busy; setReviewBusy(busy); }}
            onRefresh={() => loadReports().catch((reason) => setReportError(reason.message))}
            onReviewed={() => { setSelectedReport(null); loadReports().catch((reason) => setReportError(reason.message)); }}
            onRevise={() => setEditingReport(selectedReport)} />
            : selectedLegacyExpense ? <LegacyExpenseReview key={selectedLegacyExpense.id} item={selectedLegacyExpense}
              onBusyChange={(busy) => { reviewBusyRef.current = busy; setReviewBusy(busy); }}
              onReviewed={() => { setSelectedLegacyExpense(null); loadReports().catch((reason) => setReportError(reason.message)); }} />
            : <div className="min-h-0 overflow-y-auto p-3 sm:p-5"><MyPettyCashSummary /></div>}
        </div>
      </div>, document.body
    )}
  </div>;
}

function LegacyExpenseReview({ item, onBusyChange, onReviewed }) {
  const { user } = useAuth();
  const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";
  const [decision, setDecision] = useState("");
  const [managerId, setManagerId] = useState("");
  const [managers, setManagers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (item.stage !== "planning") return;
    const controller = new AbortController();
    fetch("/api/petty-cash-expenses?recipients=project_manager", {
      credentials: "include", headers: { "x-user-id": String(user?.id || "") }, signal: controller.signal,
    }).then(async (response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => setManagers(data.users || []))
      .catch((reason) => { if (reason.name !== "AbortError") setError("دریافت اعضای مدیریت پروژه‌ها انجام نشد."); });
    return () => controller.abort();
  }, [item.stage, user?.id]);

  const submit = async () => {
    if (!decision || saving || (decision === "approve" && item.stage === "planning" && !managerId)) return;
    setSaving(true); onBusyChange(true); setError("");
    try {
      const response = await fetch("/api/petty-cash-expenses", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", "x-user-id": String(user?.id || "") },
        body: JSON.stringify({ id: item.id, decision, projectManagerId: managerId || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "internal_error");
      window.dispatchEvent(new CustomEvent("request-notification-completed", { detail: { notificationTarget: "petty_cash_expense", id: item.id } }));
      window.dispatchEvent(new Event("tenkhah-notifications-refresh"));
      onReviewed();
    } catch (reason) {
      setError(reason.message === "invalid_project_manager" ? "یکی از اعضای مدیریت پروژه‌ها را انتخاب کنید." : reason.message === "already_processed" ? "این هزینه قبلاً بررسی شده است." : "ثبت تصمیم انجام نشد. دوباره تلاش کنید.");
    } finally { setSaving(false); onBusyChange(false); }
  };

  return <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm sm:grid-cols-2">
      <div><span className="text-neutral-500">پروژه</span><p className="mt-1 font-semibold">{item.projectName || item.projectCode || "—"}</p></div>
      <div><span className="text-neutral-500">تاریخ</span><p className="mt-1 font-semibold">{toFa(item.expenseDate || "—")}</p></div>
      <div><span className="text-neutral-500">کد بودجه</span><p className="mt-1 font-semibold">{toFa(item.budgetCode || "—")}</p></div>
      <div><span className="text-neutral-500">مبلغ</span><p className="mt-1 font-semibold">{money(item.amount)} ریال</p></div>
      <div className="sm:col-span-2"><span className="text-neutral-500">شرح</span><p className="mt-1 break-words font-semibold">{item.description || "—"}</p></div>
      <div className="sm:col-span-2"><span className="text-neutral-500">پیوست</span><p className="mt-1"><ExpenseAttachmentLink item={item} /></p></div>
    </div>
    <div className="mt-5 flex flex-wrap gap-2">
      <button type="button" disabled={saving} onClick={() => setDecision("approve")} className={`${actionClass} ${decision === "approve" ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-200 bg-white text-emerald-700"}`}><Check className="h-4 w-4" />تأیید</button>
      <button type="button" disabled={saving} onClick={() => setDecision("reject")} className={`${actionClass} ${decision === "reject" ? "border-red-600 bg-red-600 text-white" : "border-red-200 bg-white text-red-700"}`}><X className="h-4 w-4" />رد</button>
    </div>
    {decision === "approve" && item.stage === "planning" && <label className="mt-4 block text-sm">ارسال به مدیریت پروژه‌ها
      <select value={managerId} onChange={(event) => setManagerId(event.target.value)} disabled={saving} className={`${inputClass} mt-2`}>
        <option value="">انتخاب کنید</option>
        {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name || manager.username}</option>)}
      </select>
    </label>}
    <div className="mt-5 border-t border-neutral-200 pt-4">
      <button type="button" disabled={!decision || saving || (decision === "approve" && item.stage === "planning" && !managerId)} onClick={submit}
        className={`${actionClass} border-black bg-black text-white hover:bg-neutral-800`}><Check className="h-4 w-4" />تأیید و ثبت</button>
    </div>
  </div>;
}

function TablePagination({ total, rowsPerPage, page, setPage, onRowsPerPageChange }) {
  const pageCount = Math.max(1, Math.ceil(total / rowsPerPage));
  const startIndex = page * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, total);
  return (
      <div className="flex flex-col gap-2 border-t border-neutral-300 px-3 py-2 text-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0} aria-label="صفحه قبل" title="صفحه قبل"
            className="grid h-9 w-9 place-items-center rounded-lg border-0 bg-transparent shadow-none transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <button type="button" onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            disabled={page >= pageCount - 1} aria-label="صفحه بعد" title="صفحه بعد"
            className="grid h-9 w-9 place-items-center rounded-lg border-0 bg-transparent shadow-none transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="whitespace-nowrap text-neutral-600">{total ? `${toFa(startIndex + 1)}–${toFa(endIndex)} از ${toFa(total)}` : "۰ از ۰"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-neutral-600">تعداد در هر صفحه:</span>
          <div className="inline-flex h-9 overflow-hidden rounded-lg border border-neutral-200 bg-white">
            {[10, 25, 100].map((count) => <button key={count} type="button" onClick={() => onRowsPerPageChange(count)}
              aria-pressed={rowsPerPage === count}
              className={`min-w-10 px-3 font-semibold transition ${rowsPerPage === count ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}>{toFa(count)}</button>)}
          </div>
        </div>
      </div>
  );
}

const inputClass = "h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400";
const emptyForm = () => ({ expenseDate: todayJalaliYmd().replaceAll("-", "/"), description: "", budgetCode: "", amount: "", currencyTypeId: "", exchangeRate: "" });
const expenseAttachments = (item) => Array.isArray(item.files) && item.files.length ? item.files
  : item.fileUrl ? [{ name: item.fileName, url: item.fileUrl, file: item.attachmentFile }] : [];
const toFa = (value) => String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
const english = (value) => toEnglishDigits(String(value ?? "")).replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));

function PettyCashReportReview({ report, onReviewed, onRevise, onBusyChange, onRefresh }) {
  const { user } = useAuth();
  const isCreatorView = String(report.createdById) === String(user?.id);
  const entries = report.items || [];
  const [reportDecision, setReportDecision] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [outdated, setOutdated] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [managers, setManagers] = useState([]);
  const [managerId, setManagerId] = useState("");
  const [managersLoading, setManagersLoading] = useState(false);
  const inFlightRef = useRef(false);
  const managerDialogRef = useRef(null);
  const [selectedAttachmentRowId, setSelectedAttachmentRowId] = useState(() => entries.find((item) => expenseAttachments(item).some((file) => file.url))?.id ?? null);
  const [attachmentIndex, setAttachmentIndex] = useState(0);
  const [viewedRowIds, setViewedRowIds] = useState(() => new Set());
  const [preview, setPreview] = useState({ loading: false, url: "", size: null, error: "" });
  const [budgetItems, setBudgetItems] = useState([]);
  const budgetNames = useMemo(() => new Map(budgetItems.map((item) => [fullBudgetCode(item.budgetCode, report.projectCode), item.budgetName])), [budgetItems, report.projectCode]);
  const selectedAttachmentRow = entries.find((item) => String(item.id) === String(selectedAttachmentRowId))
    || entries.find((item) => expenseAttachments(item).some((file) => file.url));
  const attachments = selectedAttachmentRow ? expenseAttachments(selectedAttachmentRow)
    .filter((file) => file.url).map((file) => ({ fileName: file.name, fileUrl: file.url })) : [];
  const attachment = attachments[attachmentIndex];
  const actionable = entries.filter((item) => item.canAct === true);
  const canAct = entries.length > 0 && actionable.length === entries.length && entries.every((item) => item.stage === entries[0].stage) && !outdated;
  const readyToSubmit = canAct && (reportDecision === "revision" ? Boolean(returnNote.trim()) : reportDecision === "approve");

  useEffect(() => {
    if (!report.projectId) return;
    const controller = new AbortController();
    fetch(`/api/cost-breakdown?project_id=${encodeURIComponent(report.projectId)}`, {
      credentials: "include", headers: { "x-user-id": String(user?.id || "") }, signal: controller.signal,
    })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => setBudgetItems(data.items || []))
      .catch((reason) => { if (reason.name !== "AbortError") setBudgetItems([]); });
    return () => controller.abort();
  }, [report.projectId, user?.id]);

  useEffect(() => {
    if (!managerOpen) return;
    const controller = new AbortController();
    const previousFocus = document.activeElement;
    managerDialogRef.current?.querySelector("button")?.focus();
    setManagersLoading(true);
    fetch("/api/petty-cash-expenses?recipients=project_manager", { credentials: "include", headers: { "x-user-id": String(user?.id || "") }, signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(); setManagers(data.users || []); })
      .catch((reason) => { if (reason.name !== "AbortError") setError("دریافت اعضای مدیریت پروژه‌ها انجام نشد."); })
      .finally(() => { if (!controller.signal.aborted) setManagersLoading(false); });
    return () => { controller.abort(); previousFocus?.focus(); };
  }, [managerOpen, user?.id]);

  const submitDecision = async (recipientId = "") => {
    if (inFlightRef.current || !readyToSubmit) return;
    if (reportDecision === "approve" && !recipientId && actionable.some((item) => item.stage === "planning")) {
      setError(""); setManagerId(""); setManagerOpen(true); return;
    }
    inFlightRef.current = true;
    setSaving(true); onBusyChange(true); setError("");
    try {
      const response = await fetch("/api/petty-cash-expenses", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", "x-user-id": String(user?.id || "") },
        body: JSON.stringify({ action: "review_report", reportId: report.id, expectedVersion: report.version,
          decision: reportDecision, reportWide: true,
          note: reportDecision === "revision" ? returnNote.trim() : "", projectManagerId: recipientId || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "internal_error");
      window.dispatchEvent(new CustomEvent("request-notification-completed", { detail: { notificationTarget: "petty_cash_report", id: report.id } }));
      window.dispatchEvent(new Event("tenkhah-notifications-refresh"));
      onReviewed();
    } catch (reason) {
      const messages = { invalid_project_manager: "یکی از اعضای مدیریت پروژه‌ها را انتخاب کنید.", not_allowed: "شما مجاز به اقدام در مرحله فعلی نیستید.",
        workflow_changed: "این گزارش توسط فرد دیگری بررسی شده است. مودال را ببندید و دوباره باز کنید.", workflow_recipients_missing: "هیچ عضو فعالی برای واحد مرحله بعد تعریف نشده است.", internal_error: "ثبت تصمیم انجام نشد؛ دوباره تلاش کنید." };
      setError(messages[reason.message] || "ثبت تصمیم انجام نشد.");
      if (["workflow_changed", "not_allowed"].includes(reason.message)) { setOutdated(true); onRefresh(); }
    } finally { inFlightRef.current = false; setSaving(false); onBusyChange(false); }
  };

  useEffect(() => {
    if (!attachment?.fileUrl) return;
    const controller = new AbortController();
    let active = true;
    let objectUrl = "";
    setPreview({ loading: true, url: "", size: null, error: "" });
    fetch(attachment.fileUrl, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("پیوست قابل دریافت نیست.");
        const blob = await response.blob();
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ loading: false, url: objectUrl, size: blob.size, error: "" });
      })
      .catch((reason) => { if (active && reason.name !== "AbortError") setPreview({ loading: false, url: "", size: null, error: "پیش‌نمایش پیوست در دسترس نیست." }); });
    return () => { active = false; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [attachment?.fileUrl]);

  const viewRow = (item) => {
    setViewedRowIds((current) => current.has(item.id) ? current : new Set([...current, item.id]));
    setSelectedAttachmentRowId(item.id);
    setAttachmentIndex(0);
  };
  const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm";
  const decisionCards = [
    { decision: "approve", label: "تأیید تنخواه گردان", description: "تأیید و ارسال به مرحله بعد", icon: "/images/icons/finishing-check.svg", iconClass: "bg-emerald-100", selectedClass: "border-emerald-300 bg-emerald-50/60 shadow-[0_0_0_2px_rgba(52,211,153,.12)]" },
    { decision: "revision", label: "بازگشت تنخواه گردان", description: "بازگشت کل گزارش جهت اصلاح", icon: "/images/icons/bazgasht.svg", iconClass: "bg-amber-100", selectedClass: "border-amber-300 bg-amber-50/60 shadow-[0_0_0_2px_rgba(245,158,11,.12)]" },
  ];
  const metadata = [
    { label: "شماره گزارش", value: report.reportNumber ? toFa(report.reportNumber) : "—", Icon: FileText },
    { label: "تاریخ", value: reportDate(report.createdAt), recipient: report.createdByName || report.createdByUsername || "—", Icon: CalendarDays },
    { label: "نام گزارش", value: report.reportName || "—", Icon: FileText },
    { label: "پروژه", value: report.projectCode ? `${toFa(report.projectCode)} - ${report.projectName}` : report.projectName || "—", Icon: BriefcaseBusiness },
    { label: "مبلغ گزارش", value: `${money(entries.reduce((sum, item) => sum + amount(item.amount), 0n))} ریال`, Icon: FileText },
  ];

  return <>
    <div inert={managerOpen ? true : undefined} className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
      {error && !managerOpen && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mb-3 grid grid-cols-2 rounded-xl border border-neutral-200 bg-neutral-50/60 md:grid-cols-3 xl:grid-cols-5">
        {metadata.map(({ label, value, secondary, recipient, Icon }) => <div key={label} className="flex min-w-0 items-center gap-2 px-2.5 py-2 sm:px-3 sm:border-l sm:border-neutral-200 sm:last:border-l-0">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-white">{createElement(Icon, { className: "h-4 w-4 stroke-[1.6]" })}</span>
          {recipient ? <div className="relative grid w-full min-w-0 grid-cols-2 items-center before:absolute before:inset-y-0 before:left-1/2 before:w-px before:bg-neutral-300">
            <div className="min-w-0 px-3 text-center"><p className="text-[11px] text-neutral-500">{label}</p><p className="mt-0.5 whitespace-nowrap text-xs font-bold">{value}</p></div>
            <div className="min-w-0 px-3 text-center"><p className="text-[11px] text-neutral-500">تنخواه‌گیرنده</p><p className="mt-0.5 break-words text-xs font-bold">{recipient}</p></div>
          </div> : <div className="min-w-0"><p className="text-[11px] text-neutral-500">{label}</p><p className="mt-0.5 break-words text-xs font-bold">{value}</p>
            {secondary && <p className="mt-1 text-[10px] text-neutral-500">{secondary}</p>}
          </div>}
        </div>)}
      </div>

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[284px_minmax(0,1fr)_393px]">
        <PettyCashSettlementTimeline report={report} />
        <div className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200">
          <section className="min-w-0 overflow-hidden">
            <h3 className="flex items-center gap-2 bg-neutral-50/60 px-3 py-3 text-sm font-bold"><ListChecks className="h-5 w-5 stroke-[1.6]" />جزئیات گزارش تنخواه</h3>
            <div role="region" aria-label="جدول جزئیات قابل پیمایش" tabIndex={0} className="h-[294px] overflow-auto overscroll-contain touch-pan-x touch-pan-y sm:h-[336px]">
              <table className="w-full min-w-[700px] table-fixed text-center text-[13px]" aria-label="هزینه‌های گزارش">
                 <colgroup><col className="w-12" /><col /><col className="w-52" /><col className="w-32" /></colgroup>
                <thead className="sticky top-0 z-10 bg-neutral-200"><tr className="h-11">
                  {["ردیف", "شرح", "کد بودجه", "مبلغ گزارش"].map((label) => <th key={label} scope="col" className={`px-2 font-semibold ${label === "شرح" ? "text-right" : ""}`}>{label}</th>)}
                </tr></thead>
                <tbody>{entries.map((item, index) => {
                  return <tr key={item.id} tabIndex={0} onClick={() => viewRow(item)}
                    onKeyDown={(event) => { if (event.target === event.currentTarget && ["Enter", " "].includes(event.key)) { event.preventDefault(); viewRow(item); } }}
                    className={`h-13 cursor-pointer border-t border-neutral-200 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-200 ${viewedRowIds.has(item.id) ? "bg-neutral-200/70 hover:bg-neutral-200" : "bg-neutral-50/40 hover:bg-neutral-100"}`}>
                    <td className="px-2">{toFa(index + 1)}</td>
                     <td className="break-words px-3 py-2 text-right leading-5"><span className="block text-[11px] text-neutral-500">{toFa(item.expenseDate)}</span>{toFa(item.description)}</td><td className="break-words px-2 py-2 leading-5"><span className="block" dir="ltr">{toFa(fullBudgetCode(item.budgetCode, report.projectCode) || "—")}</span>{budgetNames.get(fullBudgetCode(item.budgetCode, report.projectCode)) && <span className="block text-[11px] text-neutral-600">{budgetNames.get(fullBudgetCode(item.budgetCode, report.projectCode))}</span>}</td>
                    <td className="px-2 tabular-nums"><span className="block">{expenseAmountLabel(item)}</span>{item.currencyTypeId && <span className="block text-[11px] text-neutral-500">{money(item.amount)} ریال</span>}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          </section>
          {!isCreatorView && canAct && <div className="border-t border-neutral-200 p-3"><h3 className="mb-2 text-sm font-bold">نتیجه بررسی</h3><div className="grid gap-2 sm:grid-cols-2">
            {decisionCards.map(({ decision, label, description, icon, iconClass, selectedClass }) => {
              const checked = reportDecision === decision;
              return <div key={decision} className={`min-w-0 rounded-2xl border p-3 text-center transition ${checked ? selectedClass : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm"}`}>
                <button type="button" disabled={saving} onClick={() => setReportDecision(decision)} aria-pressed={checked} aria-label={label}
                  className="flex min-h-[92px] w-full flex-col items-center justify-center disabled:cursor-not-allowed disabled:opacity-45">
                  <span className={`grid h-10 w-10 place-items-center rounded-full ${iconClass}`}><img src={icon} alt="" className="h-5 w-5" /></span>
                  <span className="mt-2 text-sm font-bold text-neutral-800">{label}</span>
                  <span className="mt-1 text-[11px] leading-5 text-neutral-500">{description}</span>
                </button>
                {checked && decision === "revision" && <input type="text" value={returnNote} onChange={(event) => setReturnNote(event.target.value)} maxLength={500}
                  aria-label="دلیل بازگشت کل گزارش" placeholder="دلیل بازگشت کل گزارش را وارد کنید..."
                  className="mt-3 h-9 w-full rounded-xl border border-neutral-300 bg-white px-2 text-center text-xs outline-none focus:border-neutral-500" />}
              </div>;
            })}
          </div></div>}
        </div>

        <aside className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
          <h3 className="flex items-center gap-2 px-3 py-3 text-sm font-bold"><FileText className="h-5 w-5 stroke-[1.6]" />پیش‌نمایش پیوست‌ها</h3>
          <div className="px-3">
            <div className="relative grid h-60 place-items-center overflow-hidden rounded-xl bg-neutral-100 sm:h-64 xl:h-[min(34vh,400px)]">
              {preview.loading ? <LoaderCircle className="h-6 w-6 animate-spin text-neutral-400" />
                : preview.url && /\.pdf(?:$|[?#])/i.test(attachment?.fileUrl || "") ? <iframe src={preview.url} title="پیش‌نمایش PDF پیوست" className="absolute inset-0 h-full w-full border-0" />
                : preview.url ? <>
                  <img src={preview.url} alt={attachment?.fileName || "پیوست هزینه"}
                    onError={() => setPreview((current) => ({ ...current, url: "", error: "پیش‌نمایش این فایل در دسترس نیست." }))} className="h-full w-full object-contain" /></>
                : <p className="px-4 text-center text-xs text-neutral-500">{preview.error || "پیوستی برای نمایش وجود ندارد."}</p>}
              {preview.url && attachment?.fileUrl && <a href={attachment.fileUrl} target="_blank" rel="noopener" aria-label="باز کردن پیوست در تب جدید" title="باز کردن پیوست در تب جدید" className="absolute inset-0 z-10 cursor-zoom-in" />}
              {attachments.length > 1 && <div dir="ltr" className="pointer-events-none absolute inset-x-2 top-1/2 z-20 flex -translate-y-1/2 justify-between">
                <button type="button" disabled={attachmentIndex === 0} onClick={() => setAttachmentIndex((current) => current - 1)} aria-label="پیوست قبلی"
                  className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full border border-neutral-200 bg-white/95 shadow-sm transition hover:bg-white disabled:opacity-35"><ChevronLeft className="h-5 w-5" /></button>
                <button type="button" disabled={attachmentIndex >= attachments.length - 1} onClick={() => setAttachmentIndex((current) => current + 1)} aria-label="پیوست بعدی"
                  className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full border border-neutral-200 bg-white/95 shadow-sm transition hover:bg-white disabled:opacity-35"><ChevronRight className="h-5 w-5" /></button>
              </div>}
            </div>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-3 px-3 py-3">
            <div className="min-w-0"><p className="truncate text-sm font-medium" dir="auto" title={attachment?.fileName}>{attachment?.fileUrl ? <a href={attachment.fileUrl} target="_blank" rel="noreferrer" className="hover:underline">{attachment.fileName || "مشاهده پیوست"}</a> : "—"}</p>
              <p className="mt-1 text-xs text-neutral-500">{preview.size !== null ? photoSize(preview.size) : "—"}</p>
            </div>
          </div>
          <div className="border-t border-neutral-200 p-3"><button type="button"
            disabled={!entries.length || !entries.every((item) => item.stage === "completed")}
            onClick={() => openPettyCashReportPdf(report)}
            title={entries.length && entries.every((item) => item.stage === "completed") ? "مشاهده" : "گزارش تنخواه پس از تأیید نهایی فعال می‌شود"}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white text-sm font-semibold transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40">
            <img src="/images/icons/print.svg" alt="" className="h-5 w-5" />مشاهده
          </button></div>
        </aside>
      </div>
    </div>
     {(report.canRevise || (!isCreatorView && canAct)) && <footer inert={managerOpen ? true : undefined} className="shrink-0 border-t border-neutral-100 px-3 py-3 sm:px-5 sm:py-4">
       {report.canRevise && <button type="button" disabled={saving} onClick={onRevise} className={`${actionClass} border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100`}><Pencil className="h-4 w-4" />ویرایش موارد برگشتی</button>}
       {!isCreatorView && canAct && <div className="flex justify-end"><button type="button" disabled={saving || !readyToSubmit} onClick={() => submitDecision()} aria-label={reportDecision === "revision" ? "ثبت بازگشت تنخواه گردان" : "تأیید تنخواه گردان"} title={!readyToSubmit && reportDecision === "revision" ? "دلیل بازگشت کل گزارش را وارد کنید" : undefined} className={`${actionClass} border-black bg-black px-5 text-white hover:bg-neutral-800`}>{reportDecision === "revision" ? <RefreshCw className="h-5 w-5" /> : <Check className="h-5 w-5" />}{reportDecision === "revision" ? "ثبت بازگشت تنخواه گردان" : "تأیید تنخواه گردان"}</button></div>}
    </footer>}
    {managerOpen && <div className="absolute inset-0 z-20 grid place-items-center bg-black/35 p-4 backdrop-blur-[2px]">
      <div ref={managerDialogRef} data-manager-dialog="true" role="dialog" aria-modal="true" aria-labelledby="petty-cash-manager-title"
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl"
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.stopPropagation(); if (!saving) setManagerOpen(false); }
          if (event.key !== "Tab") return;
          const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled), select:not(:disabled)')];
          const first = controls[0], last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}>
        <header className="mb-4 flex items-center justify-between gap-2"><h3 id="petty-cash-manager-title" className="text-sm font-bold">انتخاب عضو مدیریت پروژه‌ها</h3>
          <button type="button" disabled={saving} onClick={() => setManagerOpen(false)} aria-label="بستن انتخاب مدیر پروژه" className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white hover:bg-neutral-800 disabled:opacity-50"><X className="h-4 w-4" /></button>
        </header>
        {error && <p role="alert" className="mb-3 text-xs text-red-700">{error}</p>}
        <label className="block text-xs text-neutral-600">ارسال به
          <select value={managerId} onChange={(event) => setManagerId(event.target.value)} disabled={saving || managersLoading} className={`${inputClass} mt-2`}>
            <option value="">{managersLoading ? "در حال دریافت افراد..." : "انتخاب کنید"}</option>
            {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name || manager.username}</option>)}
          </select>
        </label>
        {!managersLoading && !managers.length && <p className="mt-3 text-xs text-neutral-500">عضو فعالی در واحد مدیریت پروژه‌ها تعریف نشده است.</p>}
        <div className="mt-5 flex justify-end"><button type="button" disabled={!managerId || saving || managersLoading} onClick={() => submitDecision(managerId)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-sm font-semibold text-white disabled:opacity-40">
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}تأیید و ارسال
        </button></div>
      </div>
    </div>}
  </>;
}

function PettyCashSettlementTimeline({ report }) {
  if (report.initialStage === "draft") return <aside className="min-w-0 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
    <h3 className="font-bold">پیش‌نویس شخصی</h3>
    <p className="mt-2 leading-6">این گزارش در حال تکمیل است و هنوز برای بررسی ارسال نشده است.</p>
  </aside>;
  const history = Array.isArray(report.historyJson) ? report.historyJson : [];
  const entries = report.items || [];
  const stages = report.initialStage === "management"
    ? [["created", "ثبت درخواست"], ["management", "دستور پرداخت (مدیریت ارشد)"]]
    : [["created", "ثبت درخواست"], ["planning", "بررسی اولیه (واحد برنامه‌ریزی)"], ["project_manager", "تأیید نهایی (مدیریت پروژه)"], ["finance", "بررسی اسناد (واحد مالی)"]];
  const events = new Map(stages.map(([stage]) => [stage, []]));
  const addEvent = (stage, event) => { if (events.has(stage)) events.get(stage).push(event); };
  const actor = (entry) => entry.actorName || (entry.userId ? `کاربر ${toFa(entry.userId)}` : "—");
  history.forEach((entry) => {
    if (entry.action === "submitted" || entry.action === "resubmitted") {
      addEvent("created", { ...entry, label: entry.action === "submitted" ? "ثبت گزارش" : "اصلاح و ارسال مجدد", actor: actor(entry), result: "approved" });
    }
    const changes = Array.isArray(entry.changes) ? entry.changes : [];
    if (entry.reportWide) {
      const labels = { approve: "تأیید کل گزارش", revision: "بازگشت کل گزارش", reject: "رد کل گزارش" };
      addEvent(entry.stage || changes[0]?.fromStage, { ...entry, label: labels[entry.action] || entry.action,
        actor: actor(entry), result: entry.action === "approve" ? "approved" : entry.action === "reject" ? "rejected" : "revision" });
      return;
    }
    [...new Set(changes.map((change) => change.fromStage).filter(Boolean))].forEach((stage) => {
      const groups = new Map();
      changes.filter((change) => change.fromStage === stage).forEach((change) => {
        const note = change.note ?? entry.note ?? "";
        const key = JSON.stringify([change.decision, note]);
        groups.set(key, { decision: change.decision, note, count: (groups.get(key)?.count || 0) + 1 });
      });
      const labels = { approve: "تأیید", reject: "رد", revision: "درخواست اصلاح" };
      const priority = { approve: 0, revision: 1, reject: 2 };
      [...groups.values()].sort((a, b) => priority[a.decision] - priority[b.decision]).forEach(({ decision, note, count }) => addEvent(stage, { ...entry, note,
        label: `${labels[decision] || decision} ${toFa(count)} ردیف`, actor: actor(entry),
        result: decision === "reject" ? "rejected" : decision === "revision" ? "revision" : "approved" }));
    });
  });
  if (!events.get("created")?.length) addEvent("created", { at: report.createdAt, actor: report.createdByName || report.createdByUsername || "—", label: "ثبت گزارش", result: "approved" });

  return <aside className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white pb-4">
    <h3 className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-bold">فرآیند تسویه تنخواه</h3>
    <ol className="space-y-0 p-4">{stages.map(([stage, title], index) => {
      const stageEvents = events.get(stage) || [];
      const last = stageEvents.at(-1);
      const current = entries.some((item) => item.stage === stage);
      const rejected = last?.result === "rejected" || last?.result === "revision";
       return <li key={stage} className="relative grid grid-cols-[minmax(0,1fr)_32px] gap-3 pb-5 last:pb-0">
        <div className="min-w-0 pt-1"><h4 className="text-sm font-bold leading-5">{title}</h4>
          {stageEvents.length ? <div className="mt-2 space-y-2">{stageEvents.map((event, eventIndex) => <div key={`${event.at || stage}-${eventIndex}`} className="border-t border-neutral-100 pt-2 text-xs text-neutral-600 first:border-t-0 first:pt-0">
            <p><span className="font-semibold">{event.actor}</span>، {event.label}، {reportDateTime(event.at)}</p>
            {event.note && <p className="mt-1 break-words text-neutral-500">توضیح: {event.note}</p>}
          </div>)}</div> : <p className="mt-1 text-xs text-neutral-400">{current ? "در انتظار اقدام" : "در انتظار شروع مرحله"}</p>}
        </div>
         <div className="relative flex justify-center" aria-hidden="true">
           {index < stages.length - 1 && <span className="absolute bottom-[-20px] top-8 w-px bg-neutral-200" />}
           <span className={`relative z-10 grid h-8 w-8 place-items-center rounded-full border text-xs font-bold ${rejected ? "border-rose-500 bg-white text-rose-500" : last ? "border-emerald-500 bg-emerald-500 text-white" : current ? "border-sky-500 bg-sky-50 text-sky-700" : "border-neutral-300 bg-white text-neutral-400"}`}>
             {rejected ? "×" : last ? "✓" : toFa(index + 1)}
           </span>
         </div>
      </li>;
    })}</ol>
  </aside>;
}

function reportDateTime(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Tehran" }).format(date)
    : "—";
}

function reportDate(value) {
  return value ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Tehran" }).format(new Date(value)) : "—";
}

const REPORT_STATUS_LABELS = { draft: "در حال تکمیل", pending: "در انتظار تأیید", approved: "تأیید شد", returned: "درخواست اصلاح" };

function reportStatusBadgeClass(status, active = false) {
  const colors = {
    draft: ["border-[#FFE2CA] bg-[#FFF1E5] text-[#A94D00]", "border-[#F48120] bg-[#F48120] text-white"],
    pending: ["border-[#D5E6F1] bg-[#D5E6F1] text-[#036499]", "border-[#036499] bg-[#036499] text-[#D5E6F1]"],
    approved: ["border-[#DDF6E8] bg-[#DDF6E8] text-[#247A4D]", "border-[#247A4D] bg-[#247A4D] text-[#DDF6E8]"],
    returned: ["border-[#FFF0D8] bg-[#FFF0D8] text-[#A65D00]", "border-[#A65D00] bg-[#A65D00] text-[#FFF0D8]"],
    rejected: ["border-[#FCE2E5] bg-[#FCE2E5] text-[#B4233C]", "border-[#B4233C] bg-[#B4233C] text-[#FCE2E5]"],
  };
  return `border shadow-sm ${(colors[status] || colors.pending)[active ? 1 : 0]}`;
}

function expenseReportState(report) {
  if (report.initialStage === "draft") return { waiting: "—", status: "در حال تکمیل", statusKey: "draft" };
  const items = report.items || [];
  const pending = items.filter((item) => ["planning", "project_manager", "finance", "management", "revision"].includes(item.stage));
  const waiting = [...new Set(pending.map((item) => item.stage === "planning" ? "برنامه‌ریزی و کنترل پروژه" : item.stage === "finance" ? "مالی"
    : item.stage === "management" ? "مدیریت" : item.stage === "revision" ? "—" : "مدیریت پروژه‌ها"))].filter((name) => name !== "—").join("، ") || "—";
  const status = items.some((item) => item.stage === "revision") ? "درخواست اصلاح" : pending.length ? "در انتظار تأیید"
    : items.length && items.every((item) => item.stage === "completed") ? "تأیید شد" : "رد شده";
  const statusKey = status === "درخواست اصلاح" ? "returned" : status === "در انتظار تأیید" ? "pending" : status === "تأیید شد" ? "approved" : "rejected";
  return { waiting, status, statusKey };
}

function ExpenseAttachmentLink({ item }) {
  const files = expenseAttachments(item);
  return files.length ? <span className="inline-flex items-center justify-center gap-1">
    {files.map((file, index) => <a key={file.url || index} href={file.url} target="_blank" rel="noreferrer" aria-label={`نمایش پیوست ${toFa(index + 1)}`} title={file.name || "نمایش پیوست"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-black/5">
      <img src="/images/icons/namayesh.svg" alt="" className="h-5 w-5" />
    </a>)}
  </span> : "—";
}

function Field({ label, required = false, children }) {
  return <label className="block min-w-0">
    <span className="mb-1 block text-xs font-medium text-neutral-600">{label}{required && <span className="mr-1 text-red-500">*</span>}</span>
    {children}
  </label>;
}

function PettyCashExpenseTab({ onSubmitted, onDraftSaved, onDeleted, onChooseDraft, onBusyChange, initialReport, availableBalance = null }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(initialReport ? String(initialReport.projectId) : "");
  const [reportName, setReportName] = useState(initialReport?.initialStage === "draft" ? initialReport.draftPayload?.reportName || "" : initialReport?.reportName || "");
  const [budgetItems, setBudgetItems] = useState([]);
  const [currencyTypes, setCurrencyTypes] = useState([]);
  const [items, setItems] = useState(() => (initialReport?.items || []).map((item) => ({ ...item, files: expenseAttachments(item) })));
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [form, setForm] = useState(() => ({ ...emptyForm(), ...(initialReport?.draftPayload?.form || {}) }));
  const [attachments, setAttachments] = useState(initialReport?.draftPayload?.attachments || []);
  const [budgetPickerOpen, setBudgetPickerOpen] = useState(false);
  const [budgetPickerQuery, setBudgetPickerQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [attachmentEditorOpen, setAttachmentEditorOpen] = useState(false);
  const [photoEditIndex, setPhotoEditIndex] = useState(null);
  const formRef = useRef(null);
  const menuButtonRef = useRef(null);
  const menuPopoverRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [editingExpense, setEditingExpense] = useState(() => {
    const reportItems = initialReport?.items || [];
    const rawIndex = initialReport?.draftPayload?.editingExpenseIndex;
    const index = Number(rawIndex);
    return rawIndex != null && Number.isInteger(index) && index >= 0 && index < reportItems.length ? reportItems[index]
      : reportItems.find((item) => String(item.id) === String(initialReport?.draftPayload?.editingExpenseId)) || null;
  });
  const [manualEntryOpen, setManualEntryOpen] = useState(Boolean(initialReport?.draftPayload?.manualEntryOpen));
  const [draftConfirmOpen, setDraftConfirmOpen] = useState(false);
  const [draftPickerOpen, setDraftPickerOpen] = useState(false);
  const [draftOptions, setDraftOptions] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState("");
  const submissionKeyRef = useRef(crypto.randomUUID());
  const savedDraftRef = useRef(initialReport?.initialStage === "draft" ? { id: initialReport.id, version: initialReport.version } : null);
  const previewUrlsRef = useRef(new Set());
  const openDraftPicker = async () => {
    setDraftPickerOpen(true);
    setDraftsLoading(true);
    setDraftsError("");
    try {
      const freshReports = await fetchExpenseReports(user.id);
      setDraftOptions(freshReports.filter((report) => report.initialStage === "draft" && String(report.createdById) === String(user.id)));
    } catch (reason) {
      setDraftsError(reason.message);
    } finally {
      setDraftsLoading(false);
    }
  };
  useEffect(() => () => { previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)); }, []);

  useEffect(() => {
    if (!menuPosition) return;
    const closeOutside = (event) => {
      if (!menuButtonRef.current?.contains(event.target) && !menuPopoverRef.current?.contains(event.target)) setMenuPosition(null);
    };
    const close = () => setMenuPosition(null);
    document.addEventListener("mousedown", closeOutside);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menuPosition]);

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
  useEffect(() => {
    if (!user?.id) return;
    api("/base/currencies/types").then((data) => setCurrencyTypes((data.items || []).filter((item) => !isRialCurrency(item))))
      .catch(() => setError("دریافت فهرست ارزها انجام نشد."));
  }, [api, user?.id]);
  useEffect(() => {
    if (!initialReport?.projectId) return;
    api(`/cost-breakdown?project_id=${encodeURIComponent(initialReport.projectId)}`)
      .then((data) => setBudgetItems(data.items || []))
      .catch((reason) => setError(reason.message));
  }, [api, initialReport?.projectId]);

  const selectProject = async (id) => {
    setProjectId(id);
    setPage(0);
    setSelectedIds(new Set());
    setEditingExpense(null);
    setMenuPosition(null);
    setForm(emptyForm());
    setAttachments([]);
    setBudgetItems([]);
    setError("");
    if (!id) return;
    try {
      const data = await api(`/cost-breakdown?project_id=${encodeURIComponent(id)}`);
      setBudgetItems(data.items || []);
    } catch (reason) {
      setError(reason.message);
    }
  };

  const addExpense = () => {
    if (!projectId) return setError("ابتدا پروژه را انتخاب کنید.");
    if (!reportName.trim()) return setError("نام گزارش را وارد کنید.");
    const selectedCurrency = currencyTypes.find((entry) => String(entry.id) === String(form.currencyTypeId));
    if (form.currencyTypeId && !selectedCurrency) return setError("ارز انتخاب‌شده معتبر نیست. فهرست ارزها را دوباره دریافت کنید.");
    const rowAmount = rialEquivalent(form.amount, form.currencyTypeId, form.exchangeRate);
    if (form.currencyTypeId && amount(toEnglishDigits(form.exchangeRate).replace(/[^\d]/g, "")) <= 0n) return setError("نرخ تبدیل به ریال را وارد کنید.");
    if (!form.expenseDate || !form.description.trim() || !form.budgetCode || rowAmount <= 0n) {
      return setError("تاریخ، شرح، کد بودجه و مبلغ مثبت را تکمیل کنید.");
    }
    const otherRowsAmount = items.reduce((sum, item) => item.id === editingExpense?.id ? sum : sum + amount(item.amount), 0n);
    if (!initialReport && availableBalance !== null && (availableBalance <= 0n || otherRowsAmount + rowAmount > availableBalance)) {
      return setError(availableBalance <= 0n ? "مانده‌ای برای ثبت هزینه وجود ندارد." : `مجموع هزینه‌ها نمی‌تواند از مانده تنخواه (${money(availableBalance)} ریال) بیشتر باشد.`);
    }
    if (!attachments.length) return setError("پیوست هر ردیف الزامی است.");
    if (attachments.length > 20) return setError("برای هر ردیف حداکثر ۲۰ فایل انتخاب کنید.");
    if (!editingExpense && items.length >= 500) return setError("هر گزارش حداکثر ۵۰۰ ردیف می‌تواند داشته باشد.");
    const files = attachments.map((entry) => {
      const url = entry.file && !entry.url ? URL.createObjectURL(entry.file) : entry.url;
      if (entry.file && !entry.url) previewUrlsRef.current.add(url);
      return { ...entry, url };
    });
    const item = { ...form, description: form.description.trim(), amount: rowAmount.toString(),
      currencyTypeId: form.currencyTypeId || null, currencyName: selectedCurrency ? currencyLabel(selectedCurrency) : "ریال",
      currencyAmount: form.currencyTypeId ? foreignAmount(form.amount) : rowAmount.toString(),
      exchangeRate: form.currencyTypeId ? toEnglishDigits(form.exchangeRate).replace(/[^\d]/g, "") : "1",
      id: editingExpense?.id || crypto.randomUUID(), stage: editingExpense?.stage || "planning",
      files, fileUrl: files[0].url, fileName: files[0].name };
    setItems((current) => editingExpense ? current.map((entry) => entry.id === item.id ? item : entry) : [...current, item]);
    setForm(emptyForm());
    setAttachments([]);
    setEditingExpense(null);
    setError("");
  };

  const reportValidationError = () => {
    if (!projectId || !reportName.trim()) return "پروژه و نام گزارش را تکمیل کنید.";
    if (!items.length) return "حداقل یک ردیف هزینه به گزارش اضافه کنید.";
    const reportAmount = items.reduce((sum, item) => sum + amount(item.amount), 0n);
    if ((!initialReport || initialReport.initialStage === "draft") && availableBalance !== null && availableBalance <= 0n) return "مانده‌ای برای ثبت هزینه وجود ندارد.";
    if ((!initialReport || initialReport.initialStage === "draft") && availableBalance !== null && reportAmount > availableBalance) return `مجموع هزینه‌ها نمی‌تواند از مانده تنخواه (${money(availableBalance)} ریال) بیشتر باشد.`;
    if (editingExpense || form.description.trim() || form.budgetCode || form.amount || attachments.length) {
      return "ابتدا ردیف در حال ورود یا ویرایش را با دکمه افزودن ردیف ثبت کنید.";
    }
    if (items.some((item) => !item.expenseDate || !item.description.trim() || !item.budgetCode || amount(item.amount) <= 0n || !expenseAttachments(item).length)) {
      return "همه فیلدها و پیوست هر ردیف باید تکمیل باشند.";
    }
    return "";
  };
  const requestSubmit = () => {
    const validationError = reportValidationError();
    if (validationError) return setError(validationError);
    setError("");
    setConfirmOpen(true);
  };
  const prepareReportItems = async () => {
      const prepared = [];
      for (const item of items) {
        const files = [];
        for (const attachment of expenseAttachments(item)) {
          if (attachment.url && !attachment.url.startsWith("blob:")) {
            files.push({ name: attachment.name, url: attachment.url });
            continue;
          }
          const payload = new FormData();
          payload.append("file", attachment.file);
          const response = await fetch("/api/petty-cash-expenses/upload", {
            method: "POST", credentials: "include", headers: { "x-user-id": String(user?.id || "") }, body: payload,
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.file?.url) throw new Error(data.error || "بارگذاری پیوست انجام نشد.");
          files.push(data.file);
          // Keep each successful upload for retry if a later upload fails.
          setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry,
            files: expenseAttachments(entry).map((file) => file === attachment ? { ...file, url: data.file.url } : file) } : entry));
        }
        prepared.push({ expenseDate: item.expenseDate, description: item.description, budgetCode: item.budgetCode,
          amount: item.amount, currencyTypeId: item.currencyTypeId || null, currencyName: item.currencyName || "ریال", currencyAmount: item.currencyAmount || item.amount,
          exchangeRate: item.exchangeRate || "1", files, fileName: files[0].name, fileUrl: files[0].url, stage: item.stage, id: item.id });
      }
    return prepared;
  };
  const saveDraft = async () => {
    if (saving) return;
    if (!projectId) { setDraftConfirmOpen(false); return setError("ابتدا پروژه را انتخاب کنید."); }
    setDraftConfirmOpen(false); setSaving(true); onBusyChange(true); setError("");
    try {
      const prepared = await prepareReportItems();
      const draftAttachments = [];
      for (const attachment of attachments) {
        if (attachment.url && !attachment.url.startsWith("blob:")) {
          draftAttachments.push({ name: attachment.name, url: attachment.url });
          continue;
        }
        const payload = new FormData();
        payload.append("file", attachment.file);
        const response = await fetch("/api/petty-cash-expenses/upload", {
          method: "POST", credentials: "include", headers: { "x-user-id": String(user?.id || "") }, body: payload,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.file?.url) throw new Error(data.error || "بارگذاری پیوست انجام نشد.");
        draftAttachments.push(data.file);
      }
      const draftPayload = { reportName: reportName.trim(), form, attachments: draftAttachments, manualEntryOpen,
        editingExpenseId: editingExpense?.id || null,
        editingExpenseIndex: editingExpense ? items.findIndex((item) => item.id === editingExpense.id) : null };
      const data = await api("/petty-cash-expenses", { method: "POST", body: JSON.stringify({
        action: "save_expense_draft", reportId: savedDraftRef.current?.id,
        expectedVersion: savedDraftRef.current?.version, projectId, reportName: reportName.trim(),
        submissionKey: submissionKeyRef.current, items: prepared,
        draftPayload,
      }) });
      savedDraftRef.current = { id: data.item.id, version: data.item.version };
      const savedReports = await fetchExpenseReports(user.id);
      const savedReport = savedReports.find((report) => Number(report.id) === Number(data.item.id) && report.initialStage === "draft");
      if (!savedReport) throw new Error("draft_not_visible");
      onDraftSaved(savedReport, savedReports);
    } catch (reason) {
      const messages = { invalid_report: "پروژه و نام گزارش معتبر وارد کنید.", required_expense_fields: "همه فیلدها و پیوست هر ردیف باید معتبر باشند.",
        active_project_not_found: "پروژه فعال پیدا نشد.", budget_code_not_found: "کد بودجه در این پروژه معتبر نیست.",
        workflow_changed: "پیش‌نویس در دستگاه دیگری تغییر کرده است؛ گزارش را دوباره باز کنید.",
        draft_not_visible: "پیش‌نویس ذخیره شد اما در فهرست گزارش‌ها بازیابی نشد؛ دوباره تلاش کنید.",
        internal_error: "ذخیره پیش‌نویس انجام نشد؛ دوباره تلاش کنید." };
      setError(messages[reason.message] || reason.message);
    } finally { setSaving(false); onBusyChange(false); }
  };
  const submitReport = async () => {
    if (saving) return;
    const validationError = reportValidationError();
    if (validationError) { setConfirmOpen(false); return setError(validationError); }
    setConfirmOpen(false);
    setSaving(true);
    onBusyChange(true);
    setError("");
    try {
      const prepared = await prepareReportItems();
      const data = await api("/petty-cash-expenses", { method: initialReport && initialReport.initialStage !== "draft" ? "PATCH" : "POST", body: JSON.stringify({
        action: initialReport && initialReport.initialStage !== "draft" ? "resubmit_report" : "create_expense_report", reportId: initialReport?.id, draftReportId: initialReport?.initialStage === "draft" ? initialReport.id : undefined, expectedVersion: initialReport?.version,
        projectId, reportName: reportName.trim(), submissionKey: submissionKeyRef.current, items: prepared,
      }) });
      const project = projects.find((entry) => String(entry.id) === String(projectId));
      onSubmitted({ id: data.item.id, reportNumber: data.item.reportNumber || initialReport?.reportNumber,
        documentType: data.item.documentType || initialReport?.documentType, reportName: reportName.trim(), projectId, projectName: project?.name,
        projectCode: project?.code || initialReport?.projectCode, createdByName: user?.name, createdByUsername: user?.username,
        createdAt: initialReport?.createdAt || new Date().toISOString(), items: prepared.map((item) => ({ ...item, stage: data.item.stage || item.stage })) });
    } catch (reason) {
      const messages = { invalid_report: "پروژه و نام گزارش معتبر وارد کنید.", required_expense_fields: "همه فیلدها و پیوست هر ردیف باید معتبر باشند.",
        active_project_not_found: "پروژه فعال پیدا نشد.", budget_code_not_found: "کد بودجه در این پروژه معتبر نیست.",
        petty_cash_balance_unavailable: "مانده‌ای برای ثبت هزینه وجود ندارد.", petty_cash_balance_exceeded: "مجموع هزینه‌ها از مانده تنخواه بیشتر است.",
        workflow_recipients_missing: "هیچ عضو فعالی در واحد گیرنده تعریف نشده است.", workflow_changed: "گردش کار گزارش تغییر کرده است؛ گزارش را دوباره باز کنید.",
        not_allowed: "ویرایش این ردیف‌ها در مرحله فعلی مجاز نیست.", internal_error: "ثبت گزارش انجام نشد؛ دوباره تلاش کنید." };
      setError(messages[reason.message] || reason.message);
    } finally {
      setSaving(false);
      onBusyChange(false);
    }
  };

  const deleteReport = async () => {
    if (!(initialReport?.canRevise || initialReport?.initialStage === "draft") || saving) return;
    const originalAmount = (initialReport.items || []).reduce((sum, item) => sum + amount(item.amount), 0n);
    if (!window.confirm(initialReport.initialStage === "draft" ? `پیش‌نویس «${initialReport.reportName}» و همه ردیف‌های آن حذف شود؟`
      : `گزارش «${initialReport.reportName}» و همه ردیف‌های آن حذف شود؟ مبلغ ${money(originalAmount)} ریال به باقی‌مانده هزینه‌های ثبت‌نشده برمی‌گردد.`)) return;
    setSaving(true);
    onBusyChange(true);
    setError("");
    try {
      await api("/petty-cash-expenses", { method: "DELETE", body: JSON.stringify({ action: initialReport.initialStage === "draft" ? "delete_draft_report" : "delete_report", reportId: initialReport.id, expectedVersion: initialReport.version }) });
      onDeleted();
    } catch (reason) {
      const messages = { workflow_changed: "گزارش تغییر کرده است؛ آن را دوباره باز کنید.", not_allowed: "حذف این گزارش در مرحله فعلی مجاز نیست.", internal_error: "حذف گزارش انجام نشد؛ دوباره تلاش کنید." };
      setError(messages[reason.message] || reason.message);
    } finally {
      setSaving(false);
      onBusyChange(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(items.length / rowsPerPage));
  const safePage = Math.min(page, pageCount - 1);
  const startIndex = safePage * rowsPerPage;
  const endIndex = Math.min(items.length, startIndex + rowsPerPage);
  const pageItems = items.slice(startIndex, endIndex);
  const selectedProjectCode = projects.find((project) => String(project.id) === String(projectId))?.code || initialReport?.projectCode;
  const visibleIds = pageItems.map((item) => item.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected;
  const toggleSelected = (id) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const toggleVisible = () => setSelectedIds((current) => {
    const next = new Set(current);
    visibleIds.forEach((id) => { if (allVisibleSelected) next.delete(id); else next.add(id); });
    return next;
  });
  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const canEdit = selectedItems.length === 1 && (!initialReport || initialReport.initialStage === "draft" || selectedItems[0].stage === "revision" || !Number.isInteger(Number(selectedItems[0].id)));
  const canDelete = selectedItems.length > 0 && selectedItems.every((item) => !initialReport || initialReport.initialStage === "draft" || item.stage === "revision" || !Number.isInteger(Number(item.id)));
  const beginEdit = (item) => {
    setManualEntryOpen(true);
    setEditingExpense(item);
    setSelectedIds(new Set([item.id]));
    setForm({ expenseDate: item.expenseDate, description: item.description, budgetCode: item.budgetCode,
      amount: item.currencyTypeId ? decimalAmount(item.currencyAmount) : format3(item.amount),
      currencyTypeId: item.currencyTypeId ? String(item.currencyTypeId) : "", exchangeRate: item.currencyTypeId ? format3(item.exchangeRate) : "" });
    setAttachments(expenseAttachments(item));
    setMenuPosition(null);
    setError("");
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };
  const editSelected = () => { if (canEdit) beginEdit(selectedItems[0]); };
  const cancelEdit = () => {
    setEditingExpense(null);
    setForm(emptyForm());
    setAttachments([]);
    setError("");
  };
  const deleteSelected = () => {
    if (canDelete && initialReport?.initialStage !== "draft" && selectedItems.length === items.length) return deleteReport();
    if (!canDelete || !window.confirm(`آیا ${toFa(selectedItems.length)} ردیف انتخاب‌شده حذف شود؟`)) return;
    setItems((current) => current.filter((item) => !selectedIds.has(item.id)));
    if (editingExpense && selectedIds.has(editingExpense.id)) cancelEdit();
    setSelectedIds(new Set());
    setMenuPosition(null);
    setError("");
  };
  return <section className="rounded-2xl border border-neutral-200 bg-white p-3 sm:p-4">
    <fieldset disabled={saving} className="min-w-0">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="flex max-w-full flex-wrap items-end gap-3">
        <Field label="پروژه" required>
          <select required disabled={items.length > 0} value={projectId} onChange={(event) => selectProject(event.target.value)} className={`${inputClass} min-w-64`}>
            <option value="">انتخاب کنید</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{english(project.code)} - {project.name}</option>)}
          </select>
        </Field>
         <div className="min-w-0">
           <label htmlFor="petty-cash-report-name" className="mb-1 block text-xs font-medium text-neutral-600">گزارش<span className="mr-1 text-red-500">*</span></label>
           <div className="flex items-center gap-2">
             <input id="petty-cash-report-name" type="text" required maxLength={180} value={reportName} onChange={(event) => setReportName(event.target.value)} className={`${inputClass} min-w-0 sm:w-64`} />
             {onChooseDraft && <button type="button" onClick={openDraftPicker} aria-haspopup="dialog"
               className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50">
               <FileText className="h-4 w-4" />پیش‌نویس‌ها
             </button>}
           </div>
         </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setManualEntryOpen((current) => !current)} aria-expanded={manualEntryOpen}
          className={`h-11 rounded-xl border px-4 text-sm font-semibold transition ${manualEntryOpen ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"}`}>
          ثبت موردی
        </button>
        <button type="button" disabled className="h-11 rounded-xl border border-neutral-300 bg-neutral-100 px-4 text-sm font-semibold text-neutral-500 opacity-65">
          ثبت گروهی (اکسل)
        </button>
      </div>
    </div>

    {manualEntryOpen && <div id="petty-cash-manual-entry" ref={formRef} className="mb-3 grid grid-cols-1 items-end gap-3 rounded-2xl border border-neutral-200 bg-neutral-100 p-3 sm:grid-cols-2 xl:grid-cols-[150px_minmax(180px,1fr)_minmax(180px,1fr)_170px_auto]">
      <Field label="تاریخ" required>
        <JalaliPopupDatePicker value={form.expenseDate} onChange={(expenseDate) => setForm((current) => ({ ...current, expenseDate }))}
          buttonClassName={`${inputClass} flex items-center justify-between`} />
      </Field>
      <Field label="شرح" required>
        <input required value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className={inputClass} />
      </Field>
      <Field label="کد بودجه" required>
        <button type="button" disabled={!projectId} onClick={() => { setBudgetPickerQuery(""); setBudgetPickerOpen(true); }}
          className={`${inputClass} flex items-center justify-between gap-2 text-right disabled:opacity-50`}>
          <span className={`min-w-0 truncate ${form.budgetCode ? "" : "text-neutral-400"}`}>{form.budgetCode ? (() => {
            const item = budgetPickerItems(budgetItems, projects.find((project) => String(project.id) === String(projectId)), true).find((row) => String(row.value) === String(form.budgetCode));
            return `${toFa(item?.code || form.budgetCode)}${item?.center_desc ? ` - ${item.center_desc}` : ""}`;
          })() : (projectId ? "انتخاب کد بودجه" : "ابتدا پروژه را انتخاب کنید")}</span><span className="shrink-0">⌄</span>
        </button>
      </Field>
      <Field label="مبلغ" required>
        <div className="relative min-w-0">
          <input required dir="ltr" inputMode={form.currencyTypeId ? "decimal" : "numeric"} value={toFa(form.amount)}
            onChange={(event) => setForm((current) => ({ ...current, amount: current.currencyTypeId ? decimalAmount(event.target.value) : format3(toEnglishDigits(event.target.value).replace(/[^\d]/g, "")) }))}
            className={`${inputClass} pl-[72px] text-left tabular-nums`} />
          <select aria-label="ارز مبلغ هزینه" title="انتخاب ارز" value={form.currencyTypeId}
            onChange={(event) => setForm((current) => ({ ...current, currencyTypeId: event.target.value,
              amount: event.target.value ? decimalAmount(current.amount) : format3(toEnglishDigits(current.amount).split(".")[0].replace(/[^\d]/g, "")),
              exchangeRate: event.target.value ? (event.target.value === current.currencyTypeId ? current.exchangeRate : "1") : "" }))}
            className="absolute left-1 top-1 h-9 w-[64px] cursor-pointer rounded-lg border border-neutral-200 bg-neutral-100 px-1 text-center text-xs font-semibold text-neutral-700">
            <option value="">ریال</option>{currencyTypes.map((item) => <option key={item.id} value={item.id}>{currencyLabel(item)}</option>)}
          </select>
        </div>
        {form.currencyTypeId && form.exchangeRate === "1" && <span className="mt-1 block text-[11px] text-amber-700">محاسبه موقت با نرخ ۱ ریال</span>}
      </Field>
      <div className="flex items-end gap-3">
        <Field label="پیوست" required>
          <button type="button" onClick={() => setAttachmentEditorOpen(true)} disabled={saving}
            className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border bg-white outline-none focus:border-neutral-400 disabled:opacity-50 ${attachments.length ? "border-emerald-400 bg-emerald-50" : "border-neutral-200"}`} title={attachments.length ? `${toFa(attachments.length)} فایل پیوست‌شده` : "بارگذاری"} aria-label="بارگذاری پیوست">
            <img src="/images/icons/upload.svg" alt="" className="h-5 w-5" />
            {attachments.length > 0 && <span className="absolute -left-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-600 px-1 text-[10px] text-white">{toFa(attachments.length)}</span>}
          </button>
        </Field>
        <button type="button" onClick={addExpense} disabled={saving} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-black text-2xl text-white disabled:opacity-50"
          title={editingExpense ? "ذخیره ویرایش" : "افزودن ردیف"} aria-label={editingExpense ? "ذخیره ویرایش" : "افزودن ردیف"}>
          {editingExpense ? <Check className="h-5 w-5 text-white" aria-hidden="true" /> : "+"}
        </button>
        {editingExpense && <button type="button" onClick={cancelEdit} disabled={saving} title="انصراف از ویرایش" aria-label="انصراف از ویرایش"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-200 bg-white disabled:opacity-50">
          <img src="/images/icons/bastan.svg" alt="" className="h-4 w-4" />
        </button>}
      </div>
    </div>}
    {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {initialReport?.canRevise && <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">
      ردیف موردنظر را انتخاب کنید و از «مدیریت ردیف‌ها» آن را ویرایش یا حذف کنید. سپس گزارش را دوباره تأیید کنید.
      {initialReport.reviewNotes && <p className="mt-1 font-semibold">توضیح بررسی: {initialReport.reviewNotes}</p>}
    </div>}

    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="overflow-x-auto">
        <table className="[&_td]:!text-center [&_th]:!text-center w-full min-w-[760px] table-fixed text-center text-sm">
          <colgroup>
            <col className="w-12" /><col className="w-16" /><col className="w-32" />
            <col /><col className="w-36" /><col className="w-40" /><col className="w-28" />
            {initialReport && <col className="w-32" />}
            <col className="w-12" />
          </colgroup>
          <thead className="bg-neutral-200 text-neutral-900">
            <tr className="h-12">
              <th className="px-3">
                <input type="checkbox" checked={allVisibleSelected}
                  ref={(element) => { if (element) element.indeterminate = someVisibleSelected; }}
                  onChange={toggleVisible} aria-label="انتخاب همه ردیف‌های این صفحه"
                  className="h-4 w-4 accent-black" />
              </th>
              {["ردیف", "تاریخ", "شرح", "کد بودجه", "مبلغ", "پیوست"].map((label) =>
                <th key={label} className="px-3 text-[14px] font-semibold md:text-[15px]">{label}</th>)}
              {initialReport && <th className="px-3 text-sm font-semibold">وضعیت</th>}
              <th className="p-0">
                <button ref={menuButtonRef} type="button" aria-label="مدیریت ردیف‌ها" title="مدیریت ردیف‌ها"
                  aria-expanded={Boolean(menuPosition)} onClick={() => {
                    if (menuPosition) return setMenuPosition(null);
                    const rect = menuButtonRef.current.getBoundingClientRect();
                    setMenuPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 248)), top: Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 160)) });
                  }}
                  className="mx-auto grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/[0.08]">
                  <img src="/images/icons/menu-table.svg" alt="" className={`h-4 w-3 transition-transform duration-200 ${menuPosition ? "scale-110" : ""}`} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="text-[13px] text-neutral-900 [&>tr]:h-9 [&>tr>td]:!py-0">
            {pageItems.map((item, index) => <tr key={item.id}
              className={`border-t border-neutral-300 bg-black/[0.02] transition hover:bg-black/[0.04] ${selectedIds.has(item.id) ? "bg-neutral-100" : ""}`}>
              <td className="px-3"><input type="checkbox" checked={selectedIds.has(item.id)}
                onChange={() => toggleSelected(item.id)} aria-label={`انتخاب ردیف ${toFa(startIndex + index + 1)}`}
                className="h-4 w-4 accent-black" /></td>
              <td className="px-3">{toFa(startIndex + index + 1)}</td>
              <td className="px-3">{toFa(item.expenseDate)}</td>
              <td className="truncate px-3 text-right" title={item.description}>{item.description}</td>
              <td className="px-3" title={fullBudgetCode(item.budgetCode, selectedProjectCode)}>{toFa(fullBudgetCode(item.budgetCode, selectedProjectCode) || "—")}</td>
              <td className="px-3 tabular-nums"><span className="block">{expenseAmountLabel(item)}</span>{item.currencyTypeId && <span className="block text-[11px] text-neutral-500">{money(item.amount)} ریال</span>}</td>
              <td className="px-3"><ExpenseAttachmentLink item={item} /></td>
               {initialReport && <td className="px-2"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.stage === "draft" ? "bg-orange-50 text-orange-700" : item.stage === "revision" ? "bg-amber-50 text-amber-800" : item.stage === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}>{item.stage === "draft" ? "درحال تکمیل" : item.stage === "revision" ? "درخواست اصلاح" : item.stage === "rejected" ? "رد شده" : item.stage === "completed" ? "تأیید شده" : "در حال بررسی"}</span></td>}
              <td />
            </tr>)}
            {!pageItems.length && <tr><td colSpan={initialReport ? 9 : 8} className="px-3 text-neutral-500">ردیفی ثبت نشده است.</td></tr>}
          </tbody>
        </table>
      </div>
      <TablePagination total={items.length} rowsPerPage={rowsPerPage} page={safePage} setPage={setPage}
        onRowsPerPageChange={(count) => { setRowsPerPage(count); setPage(0); }} />
    </div>
    <hr className="my-4 border-neutral-200" />
    <div className={`flex items-center gap-3 ${initialReport?.canRevise || initialReport?.initialStage === "draft" ? "justify-between" : "justify-end"}`}>
      {(initialReport?.canRevise || initialReport?.initialStage === "draft") && <button type="button" onClick={deleteReport} disabled={saving}
        className="h-11 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50">حذف کامل گزارش</button>}
      <div className="flex items-center gap-3">
        {(!initialReport || initialReport.initialStage === "draft") && <button type="button" onClick={() => { if (!projectId) return setError("ابتدا پروژه را انتخاب کنید."); setError(""); setDraftConfirmOpen(true); }} disabled={saving}
          title="ذخیره پیش‌نویس" aria-label="ذخیره پیش‌نویس" className="grid h-12 w-12 place-items-center rounded-xl bg-[#f48120] transition hover:bg-[#db6f11] disabled:opacity-50">
          <img src="/images/icons/pishnevis.svg" alt="" className="h-6 w-6" />
        </button>}
        {(!initialReport || initialReport.initialStage === "draft" || items.length > 0) && <button type="button" onClick={requestSubmit} disabled={saving} title="تأیید گزارش" aria-label="تأیید گزارش"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50">
          {saving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <img src="/images/icons/check.svg" alt="" className="h-5 w-5 brightness-0 invert" />}
          تأیید گزارش
        </button>}
      </div>
    </div>
    </fieldset>
    {draftPickerOpen && createPortal(<div className="fixed inset-0 z-[1700] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => { if (event.target === event.currentTarget) setDraftPickerOpen(false); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="petty-cash-drafts-title" dir="rtl"
        onKeyDown={(event) => { event.stopPropagation(); if (event.key === "Escape") setDraftPickerOpen(false); }}
        className="flex max-h-[80dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white text-neutral-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h3 id="petty-cash-drafts-title" className="text-lg font-bold">پیش‌نویس‌های درحال تکمیل</h3>
          <button type="button" onClick={() => setDraftPickerOpen(false)} aria-label="بستن فهرست پیش‌نویس‌ها"
            className="grid h-9 w-9 place-items-center rounded-lg hover:bg-neutral-100"><X className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 overflow-y-auto p-4">
          {draftsLoading ? <p role="status" className="py-6 text-center text-sm text-neutral-500">در حال دریافت پیش‌نویس‌ها...</p>
            : draftsError ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{draftsError}</p>
              : draftOptions.length ? <div className="space-y-2">{draftOptions.map((draft) => <button key={draft.id} type="button"
                onClick={() => onChooseDraft(draft)} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-right transition hover:border-orange-300 hover:bg-orange-50">
                <span className="min-w-0"><span className="block font-semibold">{draft.reportName || "گزارش بدون نام"}</span>
                  <span className="mt-1 block text-xs text-neutral-500">{draft.projectCode ? `${toFa(draft.projectCode)} - ` : ""}{draft.projectName || "—"}</span></span>
                <span className="text-xs text-neutral-500">{toFa((draft.items || []).length)} ردیف · {reportDate(draft.updatedAt || draft.createdAt)}</span>
              </button>)}</div> : <p className="py-6 text-center text-sm text-neutral-500">پیش‌نویسی در حال تکمیل ندارید.</p>}
        </div>
      </div>
    </div>, document.body)}
    {draftConfirmOpen && createPortal(<div className="fixed inset-0 z-[1700] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setDraftConfirmOpen(false); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="petty-cash-draft-title" dir="rtl" className="w-full max-w-md rounded-3xl bg-white p-6 text-neutral-900 shadow-2xl"
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape" && !saving) setDraftConfirmOpen(false);
          if (event.key !== "Tab") return;
          const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
          if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
          else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
        }}>
        <h3 id="petty-cash-draft-title" className="text-lg font-bold">ذخیره پیش‌نویس</h3>
        <p className="mt-3 text-sm text-neutral-600">آیا از ذخیره پیش‌نویس مطمئن هستید؟ این گزارش فقط برای شما ذخیره می‌شود.</p>
        <div className="mt-6 flex gap-3">
          <button type="button" autoFocus disabled={saving} onClick={() => setDraftConfirmOpen(false)} className="h-11 flex-1 rounded-xl border border-neutral-200">انصراف</button>
          <button type="button" disabled={saving} onClick={saveDraft} className="h-11 flex-1 rounded-xl bg-[#f48120] font-semibold text-white disabled:opacity-50">تأیید</button>
        </div>
      </div>
    </div>, document.body)}
    {confirmOpen && createPortal(
      <div className="fixed inset-0 z-[1700] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setConfirmOpen(false); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="petty-cash-confirm-title" aria-describedby="petty-cash-confirm-description" dir="rtl"
          className="w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white p-6 text-neutral-900 shadow-[0_30px_90px_rgba(15,23,42,0.3)] sm:p-7"
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Escape" && !saving) setConfirmOpen(false);
            if (event.key !== "Tab") return;
            const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
            if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
            else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
          }}>
          <span className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"><Check className="h-7 w-7" /></span>
          <h3 id="petty-cash-confirm-title" className="text-lg font-bold">تأیید گزارش تنخواه</h3>
          <p id="petty-cash-confirm-description" className="mt-3 text-sm leading-7 text-neutral-600">شما <strong className="font-bold text-neutral-900">{toFa(items.length)} ردیف</strong> ثبت کرده‌اید. از تأیید گزارش مطمئن هستید؟</p>
          <div className="mt-7 flex gap-3">
            <button type="button" autoFocus disabled={saving} onClick={() => setConfirmOpen(false)} className="h-11 flex-1 rounded-xl border border-neutral-200 bg-white text-sm font-semibold transition hover:bg-neutral-50 disabled:opacity-50">بازگشت و بررسی</button>
            <button type="button" disabled={saving} onClick={submitReport} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"><Check className="h-4 w-4" />تأیید گزارش</button>
          </div>
        </div>
      </div>, document.body
    )}
    {menuPosition && createPortal(
      <div ref={menuPopoverRef} dir="rtl" style={menuPosition}
        className="table-menu-popover fixed z-[1800] w-60 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 text-right text-neutral-900 shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
        <div className="px-2.5 pb-2 pt-1.5 text-xs text-neutral-500">
          {selectedItems.length ? `${toFa(selectedItems.length)} مورد انتخاب شده` : "ابتدا یک ردیف را انتخاب کنید"}
        </div>
        <button type="button" disabled={!canEdit || saving} onClick={editSelected}
          title={selectedItems.length === 1 && !canEdit ? "این ردیف از مرحله ثبت اولیه عبور کرده است." : "ویرایش ردیف"}
          className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-45">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 transition group-hover:scale-105">
            <img src="/images/icons/pencil.svg" alt="" className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold">ویرایش ردیف</span>
        </button>
        <button type="button" disabled={!canDelete || saving} onClick={deleteSelected}
          title={selectedItems.length && !canDelete ? "فقط ردیف‌های برگشتی یا تازه‌افزوده‌شده قابل حذف‌اند." : "حذف ردیف‌های انتخاب‌شده"}
          className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-100 transition group-hover:scale-105">
            <img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold">حذف ردیف‌های انتخاب‌شده</span>
        </button>
      </div>, document.body
    )}
    {budgetPickerOpen && <BudgetTreePickerModal
      items={budgetPickerItems(budgetItems, projects.find((project) => String(project.id) === String(projectId)), true)}
      selectedCode={form.budgetCode} query={budgetPickerQuery} onQueryChange={setBudgetPickerQuery}
      onSelect={(budgetCode) => { setForm((current) => ({ ...current, budgetCode })); setBudgetPickerOpen(false); }}
      onClose={() => setBudgetPickerOpen(false)} />}
    {attachmentEditorOpen && <AdvancedFileUploadModal
      title="بارگذاری پیوست‌های هزینه" files={attachments} multiple
      accept=".pdf,.jpg,.jpeg,.png,.webp" allowedTypes="PDF، JPG، PNG و WebP"
      selectionHint={error || "می‌توانید چند فایل را هم‌زمان انتخاب یا رها کنید. حداکثر ۲۰ فایل برای هر ردیف."}
      onUpload={(fileList) => {
        const selected = Array.from(fileList || []);
        if (attachments.length + selected.length > 20) return setError("برای هر ردیف حداکثر ۲۰ فایل انتخاب کنید.");
        const invalid = selected.find((file) => !/\.(jpe?g|png|webp|pdf)$/i.test(file.name) || file.size > 25 * 1024 * 1024);
        if (invalid) return setError("فقط PDF، JPG، PNG یا WebP تا ۲۵ مگابایت مجاز است.");
        setError("");
        setAttachments((current) => [...current, ...selected.map((file) => ({ name: file.name, file }))]);
      }}
      onRemove={(index) => setAttachments((current) => current.filter((_, position) => position !== index))}
      isEditableFile={(file) => /\.(jpe?g|png|webp)$/i.test(file.name || "")}
      onEditFile={(_, index) => { setPhotoEditIndex(index); setAttachmentEditorOpen(false); }}
      onClose={() => setAttachmentEditorOpen(false)} />}
    {photoEditIndex !== null && attachments[photoEditIndex] && <PettyCashPhotoEditor
      initialFile={attachments[photoEditIndex].file}
      initialUrl={attachments[photoEditIndex].file ? undefined : attachments[photoEditIndex].url}
      initialName={attachments[photoEditIndex].name}
      onClose={() => { setPhotoEditIndex(null); setAttachmentEditorOpen(true); }}
      onConfirm={(file) => {
        setAttachments((current) => current.map((entry, index) => index === photoEditIndex ? { name: file.name, file } : entry));
        setPhotoEditIndex(null);
        setAttachmentEditorOpen(true);
      }} />}
  </section>;
}

const fullPhotoCrop = () => ({ x: 0, y: 0, width: 1, height: 1 });
const fullPhotoArea = fullPhotoCrop();
const isFullPhotoCrop = (crop) => crop.x === 0 && crop.y === 0 && crop.width === 1 && crop.height === 1;
const photoSize = (bytes) => bytes >= 1024 * 1024
  ? `${toFa((bytes / (1024 * 1024)).toFixed(2))} مگابایت`
  : `${toFa(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت`;

async function decodeExpensePhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("این عکس قابل نمایش نیست. عکس JPG، PNG یا WebP انتخاب کنید."));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function expensePhotoCanvas(image, turns, crop, maxEdge = 3000) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const orientedWidth = turns % 2 ? height : width;
  const orientedHeight = turns % 2 ? width : height;
  const cropWidth = orientedWidth * crop.width;
  const cropHeight = orientedHeight * crop.height;
  const scale = Math.min(1, maxEdge / Math.max(cropWidth, cropHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(cropWidth * scale));
  canvas.height = Math.max(1, Math.round(cropHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("ویرایش عکس در این مرورگر در دسترس نیست.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.scale(scale, scale);
  context.translate(-crop.x * orientedWidth, -crop.y * orientedHeight);
  context.translate(orientedWidth / 2, orientedHeight / 2);
  context.rotate(turns * Math.PI / 2);
  context.drawImage(image, -width / 2, -height / 2);
  return canvas;
}

function encodeExpensePhoto(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("آماده‌سازی عکس انجام نشد. دوباره تلاش کنید.")), type, quality,
  ));
}

async function compressExpensePhoto(source, image, turns, crop) {
  const unchanged = turns === 0 && isFullPhotoCrop(crop);
  const withinSize = Math.max(image.naturalWidth, image.naturalHeight) <= 3000;
  if (unchanged && withinSize && source.pettyCashPhotoPrepared) {
    return { file: source, width: image.naturalWidth, height: image.naturalHeight };
  }
  const canvas = expensePhotoCanvas(image, turns, crop);
  const candidates = [await encodeExpensePhoto(canvas, "image/webp", 0.86)];
  // Keep transparent PNG/WebP images transparent; JPEG is also compared for photos.
  if (/\.jpe?g$/i.test(source.name) || source.type === "image/jpeg") {
    candidates.push(await encodeExpensePhoto(canvas, "image/jpeg", 0.86));
  }
  let blob = candidates.reduce((smallest, candidate) => candidate.size < smallest.size ? candidate : smallest);
  if (blob.size > 1024 * 1024) {
    const lighter = await encodeExpensePhoto(canvas, "image/webp", 0.82);
    if (lighter.size < blob.size) blob = lighter;
  }
  let file;
  if (unchanged && withinSize && source.size <= blob.size) file = source;
  else {
    const extension = blob.type === "image/webp" ? "webp" : blob.type === "image/jpeg" ? "jpg" : "png";
    file = new File([blob], `${source.name.replace(/\.[^.]+$/, "") || "receipt"}.${extension}`, { type: blob.type, lastModified: Date.now() });
  }
  file.pettyCashPhotoPrepared = true;
  return { file, width: canvas.width, height: canvas.height };
}

export function PettyCashPhotoEditor({ initialFile, initialUrl, initialName, onClose, onConfirm, onAddImages, onViewFiles, title = "پیوست هزینه", zIndex = 1500 }) {
  const [source, setSource] = useState(null);
  const [image, setImage] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentUrl, setDocumentUrl] = useState("");
  const [turns, setTurns] = useState(0);
  const [crop, setCrop] = useState(fullPhotoCrop);
  const [cropping, setCropping] = useState(false);
  const [draggingCrop, setDraggingCrop] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(null);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const cropDragRef = useRef(null);
  const loadTokenRef = useRef(0);
  const previewCrop = cropping ? fullPhotoArea : crop;

  const choosePhoto = useCallback(async (file) => {
    if (!file) return;
    if (!/\.(jpe?g|png|webp|pdf)$/i.test(file.name)) {
      setError("فایل PDF، JPG، PNG یا WebP انتخاب کنید.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("حجم پیوست باید کمتر از ۲۵ مگابایت باشد.");
      return;
    }
    if (/\.pdf$/i.test(file.name)) {
      const header = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
      if (header !== "%PDF-") return setError("محتوای فایل PDF معتبر نیست.");
      loadTokenRef.current += 1;
      setDocumentFile(file); setSource(null); setImage(null); setProcessed(null); setLoading(false); setError("");
      return;
    }
    const token = ++loadTokenRef.current;
    setLoading(true);
    setError("");
    try {
      const decoded = await decodeExpensePhoto(file);
      if (loadTokenRef.current !== token) return;
      setSource(file);
      setImage(decoded);
      setDocumentFile(null);
      setTurns(0);
      setCrop(fullPhotoCrop());
      setCropping(false);
      setProcessed(null);
    } catch (reason) {
      if (loadTokenRef.current === token) setError(reason.message);
    } finally {
      if (loadTokenRef.current === token) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (initialFile) choosePhoto(initialFile);
    else if (initialUrl && /\.(jpe?g|png|webp|pdf)$/i.test(initialUrl)) {
      setLoading(true);
      fetch(initialUrl, { credentials: "include", signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("دریافت عکس قبلی انجام نشد.");
          const blob = await response.blob();
          return choosePhoto(new File([blob], initialName || initialUrl.split("/").pop(), { type: blob.type }));
        })
        .catch((reason) => { if (reason.name !== "AbortError") { setError(reason.message); setLoading(false); } });
    }
    return () => { controller.abort(); loadTokenRef.current += 1; };
  }, [initialFile, initialUrl, initialName, choosePhoto]);

  useEffect(() => {
    if (!documentFile) { setDocumentUrl(""); return; }
    const url = URL.createObjectURL(documentFile);
    setDocumentUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [documentFile]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector("button")?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')].filter((element) => element.getClientRects().length);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const preview = expensePhotoCanvas(image, turns, previewCrop, 1400);
    const canvas = canvasRef.current;
    canvas.width = preview.width;
    canvas.height = preview.height;
    canvas.getContext("2d").drawImage(preview, 0, 0);
  }, [image, turns, previewCrop]);

  useEffect(() => {
    if (!image || !source || draggingCrop) return;
    let active = true;
    setProcessing(true);
    setProcessed(null);
    const timer = setTimeout(() => {
      compressExpensePhoto(source, image, turns, crop)
        .then((result) => { if (active) setProcessed({ ...result, url: URL.createObjectURL(result.file) }); })
        .catch((reason) => { if (active) setError(reason.message); })
        .finally(() => { if (active) setProcessing(false); });
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [source, image, turns, crop, draggingCrop]);

  useEffect(() => () => { if (processed?.url) URL.revokeObjectURL(processed.url); }, [processed]);

  const rotate = (step) => {
    setTurns((current) => (current + step + 4) % 4);
    setCrop((current) => step > 0
      ? { x: 1 - current.y - current.height, y: current.x, width: current.height, height: current.width }
      : { x: current.y, y: 1 - current.x - current.width, width: current.height, height: current.width });
  };
  const pointerPoint = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  };
  const startCropDrag = (event) => {
    if (!cropping || loading) return;
    event.preventDefault();
    const point = pointerPoint(event);
    const handle = event.target.closest("[data-crop-handle]")?.dataset.cropHandle;
    const inside = point.x >= crop.x && point.x <= crop.x + crop.width && point.y >= crop.y && point.y <= crop.y + crop.height;
    cropDragRef.current = { start: point, rect: crop, mode: handle || (inside ? "move" : "draw") };
    setDraggingCrop(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveCrop = (event) => {
    const drag = cropDragRef.current;
    if (!drag) return;
    const point = pointerPoint(event);
    if (drag.mode === "move") {
      setCrop({ ...drag.rect,
        x: Math.max(0, Math.min(1 - drag.rect.width, drag.rect.x + point.x - drag.start.x)),
        y: Math.max(0, Math.min(1 - drag.rect.height, drag.rect.y + point.y - drag.start.y)) });
      return;
    }
    const anchor = drag.mode === "draw" ? drag.start : {
      x: drag.mode.includes("w") ? drag.rect.x + drag.rect.width : drag.rect.x,
      y: drag.mode.includes("n") ? drag.rect.y + drag.rect.height : drag.rect.y,
    };
    setCrop({ x: Math.min(anchor.x, point.x), y: Math.min(anchor.y, point.y), width: Math.abs(point.x - anchor.x), height: Math.abs(point.y - anchor.y) });
  };
  const finishCropDrag = (event) => {
    if (!cropDragRef.current) return;
    const originalCrop = cropDragRef.current.rect;
    if (event.type === "pointercancel") setCrop(originalCrop);
    else setCrop((current) => current.width < 0.02 || current.height < 0.02 ? originalCrop : current);
    cropDragRef.current = null;
    setDraggingCrop(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const orientedWidth = image ? (turns % 2 ? image.naturalHeight : image.naturalWidth) * previewCrop.width : 1;
  const orientedHeight = image ? (turns % 2 ? image.naturalWidth : image.naturalHeight) * previewCrop.height : 1;
  const ratio = orientedWidth / Math.max(1, orientedHeight);
  const reduction = processed && source ? Math.max(0, Math.round((1 - processed.file.size / source.size) * 100)) : 0;
  const toolbarButton = "inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold transition hover:bg-neutral-50 disabled:opacity-40 sm:text-sm";

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6" style={{ zIndex }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="petty-cash-photo-title" dir="rtl"
        className="flex max-h-[92dvh] w-full max-w-[1000px] flex-col overflow-hidden rounded-3xl border border-white/30 bg-white text-neutral-900 shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-neutral-100"><img src="/images/icons/upload.svg" alt="" className="h-6 w-6" /></span>
            <h2 id="petty-cash-photo-title" className="font-bold">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="بستن پنجره پیوست" className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white transition hover:bg-neutral-800"><X className="h-4 w-4" /></button>
        </header>
        <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf" multiple={Boolean(onAddImages)} className="hidden"
            onChange={(event) => { const files = Array.from(event.target.files || []); if (onAddImages && image) onAddImages(files); else choosePhoto(files[0]); event.target.value = ""; }} />
          {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {image && <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" disabled={loading || draggingCrop} onClick={() => rotate(-1)} className={toolbarButton} aria-label="چرخش عکس به چپ"><RotateCcw className="h-4 w-4" />چرخش به چپ</button>
            <button type="button" disabled={loading || draggingCrop} onClick={() => rotate(1)} className={toolbarButton} aria-label="چرخش عکس به راست"><RotateCw className="h-4 w-4" />چرخش به راست</button>
            <button type="button" disabled={loading || draggingCrop} onClick={() => {
              if (!cropping && isFullPhotoCrop(crop)) setCrop({ x: 0.08, y: 0.08, width: 0.84, height: 0.84 });
              setCropping((current) => !current);
            }} className={`${toolbarButton} ${cropping ? "border-sky-300 bg-sky-50 text-sky-700" : ""}`}>
              {cropping ? <Check className="h-4 w-4" /> : <Crop className="h-4 w-4" />}{cropping ? "اعمال برش" : "برش عکس"}
            </button>
            <button type="button" disabled={loading || draggingCrop} onClick={() => { setTurns(0); setCrop(fullPhotoCrop()); setCropping(false); }} className={toolbarButton}><RefreshCw className="h-4 w-4" />بازنشانی</button>
            {onViewFiles && <button type="button" disabled={loading || draggingCrop} onClick={onViewFiles} className={toolbarButton}><Eye className="h-4 w-4" />مشاهده فایل‌ها</button>}
            <button type="button" disabled={loading} onClick={() => inputRef.current?.click()} className={`${toolbarButton} mr-auto`}><ImagePlus className="h-4 w-4" />{onAddImages ? "افزودن عکس دیگر" : "انتخاب عکس دیگر"}</button>
          </div>}
          {documentFile && <div className="mb-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold" title={documentFile.name}>{documentFile.name}</p><p className="mt-1 text-xs text-neutral-500">PDF، {photoSize(documentFile.size)}</p></div>
              <button type="button" onClick={() => inputRef.current?.click()} className={toolbarButton}>انتخاب فایل دیگر</button></div>
            {documentUrl && <iframe src={documentUrl} title="پیش‌نمایش PDF پیوست هزینه" className="mt-4 h-[min(50vh,500px)] w-full rounded-xl border border-neutral-200 bg-white" />}
          </div>}
          {!documentFile && <div className={image ? "grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]" : ""}>
            <div onDragOver={(event) => { event.preventDefault(); setDropActive(true); }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDropActive(false); }}
              onDrop={(event) => { event.preventDefault(); setDropActive(false); choosePhoto(event.dataTransfer.files?.[0]); }}
              className={`relative flex min-h-64 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 ${dropActive ? "border-sky-400 bg-sky-50" : image ? "border-neutral-200 bg-neutral-100" : "border-dashed border-neutral-300 bg-neutral-50"} p-4`}>
              {loading && <div role="status" className="absolute inset-0 z-20 grid place-items-center bg-white/80"><span className="flex items-center gap-2 text-sm"><LoaderCircle className="h-5 w-5 animate-spin" />در حال خواندن عکس...</span></div>}
              {!image ? <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center justify-center gap-4 py-9">
                <span className="grid h-16 w-16 place-items-center rounded-2xl border border-neutral-200 bg-white shadow-sm"><img src="/images/icons/upload.svg" alt="" className="h-8 w-8" /></span>
                <span className="text-sm font-bold sm:text-base">پیوست را اینجا رها کنید یا برای انتخاب کلیک کنید</span>
                <span className="text-xs text-neutral-500">PDF، JPG، PNG یا WebP</span>
              </button> : <>
                <div dir="ltr" className={`relative overflow-hidden ${cropping ? "cursor-crosshair touch-none" : ""}`}
                  style={{ width: `min(100%, ${ratio * 44}vh)`, aspectRatio: ratio }}
                  onPointerDown={startCropDrag} onPointerMove={moveCrop} onPointerUp={finishCropDrag} onPointerCancel={finishCropDrag}>
                  <canvas ref={canvasRef} className="block h-full w-full" aria-label="پیش‌نمایش عکس و محدوده برش" />
                  {cropping && <div className="absolute cursor-move border-2 border-white"
                    style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%`, boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }}>
                    {[1, 2].map((line) => <div key={line} className="pointer-events-none absolute inset-0">
                      <span className="absolute inset-y-0 w-px bg-white/45" style={{ left: `${line * 100 / 3}%` }} />
                      <span className="absolute inset-x-0 h-px bg-white/45" style={{ top: `${line * 100 / 3}%` }} />
                    </div>)}
                    {["nw", "ne", "sw", "se"].map((handle) => <span key={handle} data-crop-handle={handle}
                      className={`absolute z-10 h-5 w-5 rounded-sm border-2 border-white bg-sky-500 ${handle.includes("n") ? "-top-2" : "-bottom-2"} ${handle.includes("w") ? "-left-2" : "-right-2"} ${handle === "nw" || handle === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize"}`} />)}
                  </div>}
                </div>
                {cropping && <p className="mt-3 text-center text-xs leading-5 text-neutral-500">گوشه‌های کادر را بکشید؛ برای جابه‌جایی، داخل کادر را بکشید.</p>}
              </>}
              {dropActive && <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-sky-50/95 text-sm font-bold text-sky-700">عکس جدید را رها کنید</div>}
            </div>
            {image && <aside className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="text-sm font-bold">نسخه بهینه شده</h3>
              <p className="mt-3 truncate text-xs text-neutral-600" title={source?.name}>{source?.name}</p>
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between gap-2"><span className="text-neutral-500">حجم اولیه</span><strong>{source && photoSize(source.size)}</strong></div>
                <div className="flex justify-between gap-2"><span className="text-neutral-500">حجم آماده ارسال</span><strong>{processed ? photoSize(processed.file.size) : "..."}</strong></div>
              </div>
              {processing || draggingCrop ? <p role="status" className="mt-4 flex items-center gap-2 text-xs text-neutral-500"><LoaderCircle className="h-4 w-4 animate-spin" />در حال آماده‌سازی عکس...</p> : processed && <>
                <span className="mt-4 inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1.5 text-xs font-semibold text-emerald-800"><Check className="h-3 w-3" />{reduction > 0 ? `${toFa(reduction)}٪ حجم کمتر` : "حجم بهینه"}</span>
                <img src={processed.url} alt="پیش‌نمایش نسخه فشرده‌شده" className="mt-4 max-h-32 w-full rounded-lg border border-neutral-200 bg-white object-contain" />
                <p className="mt-2 text-center text-[11px] text-neutral-500">{toFa(processed.width)} × {toFa(processed.height)} پیکسل</p>
              </>}
            </aside>}
          </div>}
        </div>
        <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-neutral-100 px-5 py-4">
          <button type="button" disabled={(!processed && !documentFile) || processing || loading || draggingCrop}
            onClick={() => onConfirm(documentFile || processed.file)} className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"><Check className="h-4 w-4" />تأیید پیوست</button>
        </footer>
      </div>
    </div>, document.body
  );
}

// Public name for screens other than petty cash. Keeping the implementation here
// guarantees every caller gets the exact same crop, rotate and compression flow.
export { PettyCashPhotoEditor as AttachmentImageEditor };
