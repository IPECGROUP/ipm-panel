import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { SupplyRequestPreview } from "./SupplyRequestPage.jsx";

const PAGE_ICON = "/images/icons/dashboard-12.svg";
const faNumber = (value) => Number(value || 0).toLocaleString("fa-IR");
const toFaDigits = (value) => String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

function supplyStatus(item) {
  if (String(item?.status || "").toLowerCase() === "rejected") return "rejected";
  if (item?.workflowStatus === "done" || String(item?.status || "").toLowerCase() === "approved") return "done";
  if (item?.workflowStatus === "in_progress") return "in_progress";
  return "pending";
}

function timeOf(value) {
  const time = Date.parse(String(value || ""));
  return Number.isFinite(time) ? time : null;
}

function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds)) return "—";
  const totalHours = Math.round(milliseconds / 3600000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return days ? `${faNumber(days)} روز${hours ? ` و ${faNumber(hours)} ساعت` : ""}` : `${faNumber(hours)} ساعت`;
}

function SupplyStatisticsPanel({ metrics }) {
  const labels = ["کل درخواست‌ها", "در انتظار تأیید", "ردشده", "در حال اقدام", "انجام‌شده"];
  const colors = ["#64748b", "#3b82f6", "#ef4444", "#f59e0b", "#22c55e"];
  const values = [metrics.total, metrics.pending, metrics.rejected, metrics.inProgress, metrics.done];
  const innerValues = values.slice(1, 4);
  const innerTotal = innerValues.reduce((sum, value) => sum + Number(value || 0), 0);
  let cursor = 0;
  const innerChart = innerTotal ? `conic-gradient(${innerValues.map((value, index) => { const next = cursor + (Number(value || 0) / innerTotal) * 360; const segment = `${colors[index + 1]} ${cursor}deg ${next}deg`; cursor = next; return segment; }).join(", ")})` : "conic-gradient(#e5e7eb 0deg 360deg)";
  const doneAngle = values[0] ? Math.min(360, (values[4] / values[0]) * 360) : 0;
  const outerChart = doneAngle ? `conic-gradient(${colors[4]} 0deg ${doneAngle}deg, #e5e7eb ${doneAngle}deg 360deg)` : "conic-gradient(#e5e7eb 0deg 360deg)";
  return <Card className="min-h-[280px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800"><div className="mb-4"><span className="block text-sm font-bold">آمار کل درخواست‌های تأمین</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">وضعیت فعلی همه درخواست‌ها</span></div><div className="flex min-h-[180px] flex-col-reverse items-center gap-5 sm:flex-row sm:justify-between"><div className="w-full space-y-1.5 sm:min-w-0 sm:flex-1">{labels.map((label, index) => { const value = Number(values[index] || 0); const share = values[0] ? Math.round((value / values[0]) * 100) : 0; return <div key={label} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs"><span className="flex min-w-0 items-center gap-2 text-neutral-600 dark:text-neutral-300"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[index] }} /><span className="truncate">{label}</span></span><span className="shrink-0 whitespace-nowrap font-bold tabular-nums">{faNumber(value)} <span className="text-[10px] font-medium text-neutral-400">({faNumber(share)}٪)</span></span></div>; })}</div><div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full p-1.5" style={{ background: outerChart }}><div className="grid h-full w-full place-items-center rounded-full" style={{ background: innerChart }}><div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-white text-center shadow-inner dark:bg-neutral-900"><span><span className="block text-2xl font-bold leading-none tabular-nums">{faNumber(values[0])}</span><span className="mt-1 block text-[10px] text-neutral-500 dark:text-neutral-400">درخواست</span></span></div></div></div></div></Card>;
}

export function SupplyExpertsPanel({ rows }) {
  return <Card className="min-h-[280px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800"><div className="mb-4"><span className="block text-sm font-bold">کارشناسان تأمین</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">درخواست‌های منتظر اقدام هر کارشناس</span></div><div className="max-h-[250px] overflow-auto rounded-xl border border-black/[0.07] dark:border-white/[0.08]"><table className="w-full min-w-[530px] text-right text-xs"><thead className="sticky top-0 bg-neutral-50 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300"><tr><th className="px-3 py-2.5 font-medium">کارشناس</th><th className="px-3 py-2.5 text-center font-medium">در دست اقدام</th><th className="px-3 py-2.5 text-center font-medium">انتظار تأیید</th><th className="px-3 py-2.5 text-center font-medium">انجام‌شده</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id} className="border-t border-black/[0.06] dark:border-white/[0.08]"><td className="px-3 py-3 font-medium">{row.name}</td><td className="px-3 py-3 text-center font-bold tabular-nums">{faNumber(row.active)}</td><td className="px-3 py-3 text-center tabular-nums">{faNumber(row.pending)}</td><td className="px-3 py-3 text-center tabular-nums">{faNumber(row.done)}</td></tr>) : <tr><td colSpan="4" className="px-3 py-20 text-center text-neutral-400">کارشناس تأمین یافت نشد.</td></tr>}</tbody></table></div></Card>;
}

export function SupplyTimingPanel({ registeredToApproval, approvalToAction }) {
  const items = [["ثبت تا تأیید", registeredToApproval], ["تأیید تا اقدام", approvalToAction]];
  return <Card className="min-h-[280px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800"><div className="mb-4"><span className="block text-sm font-bold">میانگین زمان رسیدگی</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">بر اساس رویدادهای ثبت‌شده در workflow تأمین</span></div><div className="grid gap-3 sm:grid-cols-2">{items.map(([label, values], index) => { const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; return <div key={label} className="rounded-2xl bg-neutral-50 p-4 text-center dark:bg-white/[0.045]"><span className={`mx-auto mb-4 block h-1.5 w-10 rounded-full ${index ? "bg-amber-500" : "bg-sky-500"}`} /><span className="block text-lg font-bold tabular-nums">{formatDuration(average)}</span><span className="mt-2 block text-xs text-neutral-500 dark:text-neutral-400">{label}</span></div>; })}</div></Card>;
}

function SupplyReportPanel({ items }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const projects = useMemo(() => items.map((item) => ({ id: item.projectId, code: item.projectCode, name: item.projectName })), [items]);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("fa");
    if (!term) return items;
    return items.filter((item) => [item.serial, item.dateJalali, item.projectCode, item.projectName, item.title, item.description, item.createdByName, item.currentAssigneeName, supplyStatus(item)].some((value) => String(value || "").toLocaleLowerCase("fa").includes(term)));
  }, [items, query]);
  const status = (item) => {
    const value = supplyStatus(item);
    const labels = { pending: "در انتظار تأیید", in_progress: "در حال اقدام", done: "انجام‌شده", rejected: "رد شده" };
    const classes = { pending: "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/15 dark:text-sky-300", in_progress: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-300", done: "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-300", rejected: "border-red-200 bg-red-100 text-red-700 dark:border-red-400/20 dark:bg-red-500/15 dark:text-red-300" };
    return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs ${classes[value]}`}>{labels[value]}</span>;
  };
  return <Card className="min-h-[420px] rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span><span className="block text-sm font-bold">گزارش همه درخواست‌های تأمین</span><span className="mt-1 block text-[11px] text-neutral-500 dark:text-neutral-400">نمایش کامل همه درخواست‌ها، بدون محدودیت کارتابل یا دخالت کاربر</span></span><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-sky-400 dark:border-white/10 dark:bg-neutral-900 sm:w-80" placeholder="جست‌وجو در همه درخواست‌ها..." /></div><div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"><div className="max-h-[55vh] overflow-auto"><table className="w-full min-w-[1120px] table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:min-w-0 [&_td]:text-center"><thead><tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-white/10 dark:text-neutral-100"><th className="sticky top-0 z-30 bg-neutral-200 px-3 py-2 font-semibold dark:bg-neutral-800">شماره</th><th className="sticky top-0 z-30 bg-neutral-200 px-3 py-2 font-semibold dark:bg-neutral-800">تاریخ</th><th className="sticky top-0 z-30 bg-neutral-200 px-3 py-2 text-right font-semibold dark:bg-neutral-800">پروژه</th><th className="sticky top-0 z-30 bg-neutral-200 px-3 py-2 text-right font-semibold dark:bg-neutral-800">موضوع</th><th className="sticky top-0 z-30 bg-neutral-200 px-3 py-2 text-right font-semibold dark:bg-neutral-800">شرح</th><th className="sticky top-0 z-30 bg-neutral-200 px-3 py-2 font-semibold dark:bg-neutral-800">مبلغ</th><th className="sticky top-0 z-30 bg-neutral-200 px-3 py-2 font-semibold dark:bg-neutral-800">درخواست‌کننده</th><th className="sticky top-0 z-30 bg-neutral-200 px-3 py-2 font-semibold dark:bg-neutral-800">مسئول فعلی</th><th className="sticky top-0 z-30 bg-neutral-200 px-3 py-2 font-semibold dark:bg-neutral-800">وضعیت</th></tr></thead><tbody className="text-[13px] text-black [&>tr]:h-10 dark:text-neutral-100">{filtered.length ? filtered.map((item) => <tr key={item.id} onClick={() => setSelected(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(item); } }} tabIndex={0} className="cursor-pointer border-b border-neutral-300 bg-black/[0.02] transition hover:bg-black/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-neutral-700 dark:bg-white/5 dark:hover:bg-white/10"><td className="px-3 tabular-nums">{toFaDigits(item.serial || "—")}</td><td className="px-3 tabular-nums">{toFaDigits(String(item.dateJalali || item.dateFa || "—").replaceAll("-", "/"))}</td><td className="truncate px-3 text-right">{toFaDigits(`${item.projectCode ? `${item.projectCode} - ` : ""}${item.projectName || "—"}`)}</td><td className="truncate px-3 text-right">{item.title || "—"}</td><td className="truncate px-3 text-right text-neutral-600 dark:text-neutral-300">{item.description || "—"}</td><td className="px-3 whitespace-nowrap tabular-nums">{faNumber(item.amount)} {item.currencyName || "ریال"}</td><td className="truncate px-3">{item.createdByName || "—"}</td><td className="truncate px-3">{item.currentAssigneeName || "—"}</td><td className="px-3">{status(item)}</td></tr>) : <tr><td colSpan="9" className="h-28 px-3 text-center text-sm text-neutral-500 dark:text-neutral-400">موردی یافت نشد.</td></tr>}</tbody></table></div></div>{selected && <SupplyRequestPreview item={{ ...selected, canAct: false, canDelete: false, currentAssigneeUserId: null }} projects={projects} currencyTypes={[]} letters={[]} actionNote="" setActionNote={() => {}} actionBusy={false} actionError="" onAction={() => {}} onEdit={() => {}} onSupplyActionsChanged={() => {}} onClose={() => setSelected(null)} />}</Card>;
}

export default function SupplyManagementDashboardPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [supplyUsers, setSupplyUsers] = useState([]);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    fetch("/api/supply-requests?dashboard=1", { credentials: "include", headers: { "x-user-id": String(user.id) } })
      .then((response) => response.ok ? response.json() : { items: [], supplyUsers: [] })
      .then((data) => { if (!cancelled) { setItems(Array.isArray(data?.items) ? data.items : []); setSupplyUsers(Array.isArray(data?.supplyUsers) ? data.supplyUsers : []); } })
      .catch(() => { if (!cancelled) { setItems([]); setSupplyUsers([]); } });
    return () => { cancelled = true; };
  }, [user?.id]);

  const metrics = useMemo(() => {
    const counts = { total: items.length, pending: 0, rejected: 0, inProgress: 0, done: 0 };
    items.forEach((item) => { const status = supplyStatus(item); if (status === "in_progress") counts.inProgress += 1; else counts[status] += 1; });
    return counts;
  }, [items]);

  const experts = useMemo(() => supplyUsers.map((person) => {
    const id = Number(person.id);
    const owned = items.filter((item) => Number(item.currentAssigneeUserId) === id);
    return {
      id,
      name: person.name || person.username || person.email || `کاربر #${id}`,
      active: owned.filter((item) => ["pending", "in_progress"].includes(supplyStatus(item))).length,
      pending: owned.filter((item) => supplyStatus(item) === "pending").length,
      done: items.filter((item) => (item.supplyActions || []).some((action) => Number(action.byUserId) === id && String(action.status) === "done") || (item.historyJson || []).some((event) => event?.type === "approved" && event?.roleKey === "commercial" && Number(event?.byUserId) === id)).length,
    };
  }).sort((a, b) => b.active - a.active || b.pending - a.pending || a.name.localeCompare(b.name, "fa")), [items, supplyUsers]);

  const timings = useMemo(() => {
    const registeredToApproval = [];
    const approvalToAction = [];
    items.forEach((item) => {
      const history = Array.isArray(item.historyJson) ? item.historyJson : [];
      const created = timeOf(history.find((event) => event?.type === "created")?.at || item.createdAt);
      const approved = timeOf(history.find((event) => event?.type === "approved" && event?.roleKey === "project_manager")?.at);
      const firstAction = timeOf((item.supplyActions || [])[0]?.createdAt);
      if (created != null && approved != null && approved >= created) registeredToApproval.push(approved - created);
      if (approved != null && firstAction != null && firstAction >= approved) approvalToAction.push(firstAction - approved);
    });
    return { registeredToApproval, approvalToAction };
  }, [items]);

  return <div className="mx-auto w-full max-w-[1440px] text-neutral-900 dark:text-neutral-100" dir="rtl"><Card className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-none dark:border-neutral-800 dark:bg-neutral-900 sm:p-5"><div className="mb-5 flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]"><img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" /></span><span className="min-w-0"><span className="block truncate text-base font-bold md:text-lg">داشبورد مدیریت تأمین</span><span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">نمای کلی درخواست‌ها و عملکرد واحد تأمین</span></span></div><div className="grid grid-cols-1 gap-3 xl:grid-cols-2"><SupplyStatisticsPanel metrics={metrics} /><SupplyExpertsPanel rows={experts} /></div><div className="mt-3"><SupplyTimingPanel {...timings} /></div><div className="mt-3"><SupplyReportPanel items={items} /></div></Card></div>;
}
