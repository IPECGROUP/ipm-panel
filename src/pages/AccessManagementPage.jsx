import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { api } from "../utils/api.js";
import { baseCurrenciesTablePreset as tableUi } from "../components/ui/tablePresets.js";

const groups = [
  { label: "مدیریت اسناد", pages: ["مدیریت اسناد"] },
  { label: "مدیریت قراردادها", pages: ["قراردادها"] },
  { label: "مدیریت پروژه‌ها", pages: ["روزنگار پروژه", "ساختار شکست هزینه‌ها", "تعهدات و مصارف مالی", "کاربرگ مالی"] },
  { label: "مدیریت مالی", pages: ["درخواست پرداخت", "تخصیص نقدینگی", "پیش‌بینی جریان نقدی"] },
  { label: "مدیریت تأمین", pages: ["درخواست تأمین"] },
  { label: "مدیریت عملیات", pages: [] },
  { label: "مدیریت دانش", pages: [] },
  { label: "تنظیمات", pages: [] },
];

const pageColumns = {
  "مدیریت اسناد": ["همه", "نمایش منو", "افزودن", "بارگذاری سند پیوست", "نمایش سند پیوست", "ارسال", "ویرایش", "اسناد محرمانه"],
  "قراردادها": ["همه", "نمایش منو", "افزودن", "پیش‌نمایش", "ویرایش", "حذف", "عمومی", "تقویم قرارداد", "دامنه کار", "مالی و تضامین", "تأمین اجتماعی", "الحاقیه"],
  "روزنگار پروژه": ["همه", "نمایش منو", "افزودن"],
  "ساختار شکست هزینه‌ها": ["همه", "نمایش منو"],
  "تعهدات و مصارف مالی": ["همه", "نمایش منو"],
  "کاربرگ مالی": ["همه", "نمایش منو", "صورت وضعیت‌ها", "دریافتی‌ها"],
  "درخواست پرداخت": ["همه", "نمایش منو", "افزودن"],
  "تخصیص نقدینگی": ["همه", "نمایش منو", "افزودن"],
  "پیش‌بینی جریان نقدی": ["همه", "نمایش منو", "پیش‌بینی هزینه‌ها", "پیش‌بینی درآمدها", "نمودار جریان نقدی"],
  "درخواست تأمین": ["همه", "نمایش منو", "افزودن"],
};

const pageOrder = Object.keys(pageColumns);
const pageIndex = { "مدیریت اسناد": 1, "قراردادها": 2, "روزنگار پروژه": 4, "ساختار شکست هزینه‌ها": 5, "تعهدات و مصارف مالی": 6, "کاربرگ مالی": 7, "درخواست پرداخت": 9, "تخصیص نقدینگی": 10, "پیش‌بینی جریان نقدی": 11, "درخواست تأمین": 13 };
const keyOf = (page, userId, column) => `${page}:${userId}:${column}`;
const tokenOf = (page, column) => `page-access:${pageIndex[page]}:${column}`;

export default function AccessManagementPage() {
  const { user } = useAuth();
  const [activeGroup, setActiveGroup] = useState(groups[0].label);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const group = groups.find((item) => item.label === activeGroup) || groups[0];
  const pages = group.pages.filter((page) => pageColumns[page]);
  const columnCount = pages.reduce((sum, page) => sum + pageColumns[page].length, 0);

  useEffect(() => {
    api("/admin/users").then((data) => {
      const list = (data.users || []).filter((item) => item?.isActive !== false);
      const restored = new Set();
      list.forEach((item) => (item.access || []).forEach((token) => {
        const match = String(token).match(/^page-access:(\d+):(.*)$/);
        const page = Object.keys(pageIndex).find((name) => pageIndex[name] === Number(match?.[1]));
        if (page && pageColumns[page]?.includes(match[2])) restored.add(keyOf(page, item.id, match[2]));
      }));
      setUsers(list); setSelected(restored);
    }).finally(() => setLoading(false));
  }, []);

  const toggle = async (item, page, column) => {
    const next = new Set(selected);
    const enabled = !next.has(keyOf(page, item.id, column));
    const columns = pageColumns[page];
    const set = (name, value) => value ? next.add(keyOf(page, item.id, name)) : next.delete(keyOf(page, item.id, name));
    if (column === "همه") columns.forEach((name) => set(name, enabled));
    else {
      set(column, enabled);
      if (enabled && column !== "نمایش منو") set("نمایش منو", true);
      if (!enabled && column === "نمایش منو") columns.forEach((name) => set(name, false));
      if (page === "مدیریت اسناد" && column === "بارگذاری سند پیوست" && enabled) set("نمایش سند پیوست", true);
      if (page === "مدیریت اسناد" && column === "نمایش سند پیوست" && !enabled) set("بارگذاری سند پیوست", false);
      set("همه", columns.filter((name) => name !== "همه").every((name) => next.has(keyOf(page, item.id, name))));
    }
    setSelected(next);
    const preserved = (item.access || []).filter((token) => !String(token).startsWith("page-access:"));
    const tokens = pageOrder.flatMap((p) => pageColumns[p].filter((name) => next.has(keyOf(p, item.id, name))).map((name) => tokenOf(p, name)));
    const access = [...preserved, ...tokens];
    await api("/admin/users", { method: "PATCH", body: JSON.stringify({ id: item.id, access }) });
    setUsers((current) => current.map((row) => row.id === item.id ? { ...row, access } : row));
  };

  if (user?.role !== "admin") return <Card className="text-center py-8">دسترسی به این بخش فقط برای مدیر سیستم مجاز است.</Card>;
  return <Card className="mx-auto max-w-6xl" dir="rtl">
    <div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-black/[0.03]"><img src="/images/icons/dastresiha.svg" className="h-6 w-6" /></span><div><h1 className="text-lg font-bold">دسترسی‌ها</h1><p className="text-xs text-neutral-500">تنظیمات</p></div></div>
    <div className="flex w-full overflow-x-auto rounded-t-2xl border border-black/10 bg-white dark:border-neutral-800 dark:bg-neutral-900" dir="rtl">
      {groups.map((item, index) => <button key={item.label} type="button" onClick={() => setActiveGroup(item.label)} className={`relative z-10 h-11 min-w-[132px] flex-1 whitespace-nowrap px-4 text-sm font-semibold transition ${index ? "border-r border-black/10 dark:border-neutral-800" : ""} ${activeGroup === item.label ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}>{item.label}</button>)}
    </div>
    <div className={`${tableUi.frame} rounded-t-none`}><div className="overflow-x-auto"><table className={`${tableUi.table} table-fixed`} style={{ minWidth: Math.max(420, 230 + columnCount * 68) }}><thead>
      <tr className={tableUi.headRow}><th rowSpan={2} className={`${tableUi.th} w-[230px] border-l border-neutral-300 dark:border-neutral-700`}>کاربران</th>{pages.map((page) => <th key={page} colSpan={pageColumns[page].length} className="border-l border-neutral-300 py-2 text-center text-sm font-bold dark:border-neutral-700">{page}</th>)}</tr>
      <tr className={tableUi.headRow}>{pages.flatMap((page) => pageColumns[page].map((column) => <th key={`${page}-${column}`} className="w-[68px] border-l border-neutral-300 px-1 py-2 text-center text-xs dark:border-neutral-700">{column}</th>))}</tr>
    </thead><tbody className={tableUi.body}>{loading ? <tr><td colSpan={columnCount + 1} className={tableUi.emptyRow}>در حال دریافت کاربران…</td></tr> : pages.length === 0 ? <tr><td colSpan={1} className={tableUi.emptyRow}>برای این بخش مجوزی تعریف نشده است.</td></tr> : users.map((item) => <tr key={item.id}><td className="border-l border-neutral-300 px-3 py-3 text-center dark:border-neutral-700">{item.name || "—"}</td>{pages.flatMap((page) => pageColumns[page].map((column) => { const checked = selected.has(keyOf(page, item.id, column)); return <td key={`${page}-${column}`} className="border-l border-neutral-300 px-1 py-3 dark:border-neutral-700"><button type="button" onClick={() => toggle(item, page, column)} className={`mx-auto grid h-5 w-5 place-items-center rounded-[6px] border text-xs ${checked ? "border-black bg-black text-white" : "border-black/25"}`}>{checked ? "✓" : ""}</button></td>; }))}</tr>)}</tbody></table></div></div>
  </Card>;
}
