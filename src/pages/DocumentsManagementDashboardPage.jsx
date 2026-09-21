import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import StatisticsPanel from "../components/dashboard/StatisticsPanel.jsx";
import { useAuth } from "../components/AuthProvider.jsx";

const PAGE_ICON = "/images/icons/dashboard-12.svg";

const metricLabels = [
  ["total", "کل اسناد ثبت‌شده"],
  ["incoming", "اسناد وارده"],
  ["outgoing", "اسناد صادره"],
  ["internal", "اسناد داخلی"],
  ["confidential", "اسناد محرمانه"],
];

function normalizeDigits(value = "") {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function letterKind(item) {
  const value = String(item?.kind || item?.type || item?.direction || item?.letter_type || "").toLowerCase();
  if (value.includes("internal") || value.includes("داخلی")) return "internal";
  if (value.includes("out") || value.includes("صادر")) return "outgoing";
  return "incoming";
}

function isConfidential(item) {
  const value = item?.is_confidential ?? item?.isConfidential ?? item?.confidential ?? item?.is_secret ?? item?.isSecret;
  if (value === true || value === 1 || value === "1") return true;
  return /محرمانه|خیلی محرمانه|confidential|secret/i.test(String(item?.classification || item?.confidentiality || item?.classificationName || ""));
}

function createdAt(item) {
  const raw = item?.created_at || item?.createdAt || item?.inserted_at || item?.insertedAt || item?.timestamp || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function jalaliYearMonth(date) {
  const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit" }).formatToParts(date);
  return {
    year: Number(normalizeDigits(parts.find((part) => part.type === "year")?.value)),
    month: Number(normalizeDigits(parts.find((part) => part.type === "month")?.value)),
  };
}

function previousJalaliMonth(date = new Date()) {
  const current = jalaliYearMonth(date);
  return current.month === 1 ? { year: current.year - 1, month: 12 } : { year: current.year, month: current.month - 1 };
}

function summarize(items) {
  const summary = { total: items.length, incoming: 0, outgoing: 0, internal: 0, confidential: 0 };
  items.forEach((item) => {
    summary[letterKind(item)] += 1;
    if (isConfidential(item)) summary.confidential += 1;
  });
  return metricLabels.map(([key, label]) => ({ key, label, value: summary[key] }));
}

function PlaceholderBox({ number, className = "", label = "" }) {
  return (
    <Card className={`relative min-h-[130px] overflow-hidden rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800 ${className}`}>
      <span className="absolute left-4 top-3 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
        {label || "باکس"}
      </span>
      <div className="flex h-full min-h-[96px] items-center justify-center" aria-label={`باکس ${number}`}>
        <span className="select-none text-5xl font-bold leading-none text-neutral-300 dark:text-neutral-700 sm:text-6xl">
          {number}
        </span>
      </div>
    </Card>
  );
}

export default function DocumentsManagementDashboardPage() {
  const { user } = useAuth();
  const [letters, setLetters] = useState([]);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    // The document-management registry is shared. This endpoint returns the
    // page's complete visible registry, not a list limited to records created
    // by the signed-in user.
    fetch("/api/letters", {
      credentials: "include",
      headers: { "x-user-id": String(user.id) },
    })
      .then((response) => response.ok ? response.json() : { items: [] })
      .then((data) => {
        if (!cancelled) setLetters(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
      })
      .catch(() => { if (!cancelled) setLetters([]); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const statistics = useMemo(() => {
    const all = Array.isArray(letters) ? letters : [];
    const previousMonth = previousJalaliMonth();
    const weekStart = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const weekEnd = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      all: summarize(all),
      previousMonth: summarize(all.filter((item) => {
        const date = createdAt(item);
        if (!date) return false;
        const month = jalaliYearMonth(date);
        return month.year === previousMonth.year && month.month === previousMonth.month;
      })),
      previousWeek: summarize(all.filter((item) => {
        const date = createdAt(item)?.getTime();
        return Number.isFinite(date) && date >= weekStart && date < weekEnd;
      })),
    };
  }, [letters]);

  return (
    <div className="mx-auto w-full max-w-[1440px] text-neutral-900 dark:text-neutral-100" dir="rtl">
      <Card className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-none dark:border-neutral-800 dark:bg-neutral-900 sm:p-5">
        <div className="mb-5 flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
            <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold md:text-lg">داشبورد مدیریت اسناد</span>
            <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت اسناد</span>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <StatisticsPanel title="باکس ۱" caption="آمار کل اسناد" items={statistics.all} tone="indigo" />
          <StatisticsPanel title="باکس ۲" caption="اسناد ثبت‌شده در ماه قبل" items={statistics.previousMonth} tone="emerald" />
          <StatisticsPanel title="باکس ۳" caption="اسناد ثبت‌شده در هفته قبل" items={statistics.previousWeek} tone="amber" />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-12">
          <PlaceholderBox number={6} className="xl:col-span-4 min-h-[250px]" />
          <PlaceholderBox number={7} className="xl:col-span-4 min-h-[250px]" />
          <PlaceholderBox number={8} className="xl:col-span-4 min-h-[250px]" />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-12">
          <PlaceholderBox number={9} className="xl:col-span-4 min-h-[210px]" />
          <PlaceholderBox number={10} className="xl:col-span-4 min-h-[210px]" />
          <PlaceholderBox number={11} className="xl:col-span-4 min-h-[210px]" />
        </div>

        <Card className="mt-3 rounded-2xl border-neutral-200 p-4 shadow-none dark:border-neutral-800">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold">باکس ۱۲</span>
            <span className="text-xs text-neutral-400">ناحیهٔ تقویم</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[13, 14, 15, 16, 17, 18].map((number) => (
              <PlaceholderBox key={number} number={number} className="min-h-[116px]" />
            ))}
          </div>
        </Card>
      </Card>
    </div>
  );
}
