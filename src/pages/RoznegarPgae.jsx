import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "../components/ui/Card";
import { Portal } from "../components/Portal";
import { JalaliDatePicker } from "../components/JalaliDatePicker";
import { dayjs, todayJalaliYmd } from "../utils/date";

const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const WEEKDAY_HEADERS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const WEEKDAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
const WEEKDAY_BY_JS_DAY = {
  0: "یکشنبه",
  1: "دوشنبه",
  2: "سه‌شنبه",
  3: "چهارشنبه",
  4: "پنجشنبه",
  5: "جمعه",
  6: "شنبه",
};

const MOCK_ACTIVE_PROJECTS = [
  { id: "p-101", code: "101", name: "احداث ایستگاه مرکزی", isActive: true },
  { id: "p-117", code: "117", name: "بهسازی شبکه تاسیسات", isActive: true },
  { id: "p-132", code: "132", name: "توسعه پایانه غرب", isActive: true },
  { id: "p-145", code: "145", name: "به‌روزرسانی زیرساخت اداری", isActive: true },
];

const MOCK_TAGS = [
  { id: "tg-1", label: "اجرایی" },
  { id: "tg-2", label: "جلسه" },
  { id: "tg-3", label: "تاخیر" },
  { id: "tg-4", label: "مالی" },
  { id: "tg-5", label: "کنترل پروژه" },
  { id: "tg-6", label: "فنی" },
  { id: "tg-7", label: "تجهیزات" },
];

const MOCK_RELATED_DOCS = [
  { id: "l-3001", no: "3001", title: "نامه تایید نقشه اجرایی", date: "1404/10/11", type: "نامه" },
  { id: "l-3002", no: "3002", title: "صورتجلسه تحویل تجهیز", date: "1404/10/13", type: "مستند" },
  { id: "l-3003", no: "3003", title: "ابلاغ اصلاح زمان‌بندی", date: "1404/10/18", type: "نامه" },
  { id: "l-3004", no: "3004", title: "گزارش پیشرفت هفتگی", date: "1404/10/21", type: "مستند" },
  { id: "l-3005", no: "3005", title: "نامه درخواست تامین", date: "1404/10/25", type: "نامه" },
];

function toFaDigits(value) {
  return String(value ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function formatSize(size) {
  const kb = Number(size || 0) / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function dayNameFromJalali(dateYmd) {
  try {
    const jsDay = dayjs(dateYmd, { jalali: true }).calendar("jalali").day();
    return WEEKDAY_BY_JS_DAY[jsDay] || "شنبه";
  } catch {
    return "شنبه";
  }
}

function makeEntry(dateYmd) {
  return {
    dateYmd,
    dayName: dayNameFromJalali(dateYmd),
    activity: "",
    tagIds: [],
    relatedDocIds: [],
    files: [],
  };
}

function hasEntryDetails(entry) {
  if (!entry) return false;
  return Boolean(
    String(entry.activity || "").trim() ||
      (Array.isArray(entry.tagIds) && entry.tagIds.length) ||
      (Array.isArray(entry.relatedDocIds) && entry.relatedDocIds.length) ||
      (Array.isArray(entry.files) && entry.files.length)
  );
}

export default function RoznegarPgae() {
  const activeProjects = useMemo(
    () => (Array.isArray(MOCK_ACTIVE_PROJECTS) ? MOCK_ACTIVE_PROJECTS.filter((x) => x?.isActive !== false) : []),
    []
  );

  const [mounted, setMounted] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => todayJalaliYmd());
  const [cursor, setCursor] = useState(() =>
    dayjs(todayJalaliYmd(), { jalali: true }).calendar("jalali").startOf("month")
  );
  const [entriesByDate, setEntriesByDate] = useState({});

  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [tagDraftIds, setTagDraftIds] = useState([]);

  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [docsSearch, setDocsSearch] = useState("");
  const [docsDraftIds, setDocsDraftIds] = useState([]);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 30);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    setEntriesByDate((prev) => (prev[selectedDate] ? prev : { ...prev, [selectedDate]: makeEntry(selectedDate) }));
  }, [selectedDate]);

  const updateActiveEntry = (updater) => {
    setEntriesByDate((prev) => {
      const current = prev[selectedDate] || makeEntry(selectedDate);
      const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
      return { ...prev, [selectedDate]: next };
    });
  };

  const jumpToDate = (dateYmd) => {
    const next = String(dateYmd || "").trim();
    if (!next) return;
    setSelectedDate(next);
    setCursor(dayjs(next, { jalali: true }).calendar("jalali").startOf("month"));
  };

  const activeEntry = entriesByDate[selectedDate] || makeEntry(selectedDate);
  const activeProject = activeProjects.find((p) => String(p.id) === String(projectId));
  const editorDisabled = !activeProject;

  const daysInMonth = cursor.daysInMonth();
  const startPad = (cursor.startOf("month").day() + 1) % 7;
  const monthCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < startPad; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
    return cells;
  }, [startPad, daysInMonth]);

  const monthName = PERSIAN_MONTHS[Math.max(0, Number(cursor.format("M")) - 1)] || "";
  const monthYearLabel = `${monthName} ${toFaDigits(cursor.format("YYYY"))}`;

  const selectedDateLabel = useMemo(() => {
    try {
      return dayjs(selectedDate, { jalali: true }).calendar("jalali").format("YYYY/MM/DD");
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const selectedTags = useMemo(() => {
    const set = new Set((activeEntry?.tagIds || []).map(String));
    return MOCK_TAGS.filter((t) => set.has(String(t.id)));
  }, [activeEntry?.tagIds]);

  const selectedDocs = useMemo(() => {
    const set = new Set((activeEntry?.relatedDocIds || []).map(String));
    return MOCK_RELATED_DOCS.filter((d) => set.has(String(d.id)));
  }, [activeEntry?.relatedDocIds]);

  const filteredTags = useMemo(() => {
    const q = String(tagSearch || "").trim().toLowerCase();
    if (!q) return MOCK_TAGS;
    return MOCK_TAGS.filter((t) => String(t.label || "").toLowerCase().includes(q));
  }, [tagSearch]);

  const filteredDocs = useMemo(() => {
    const q = String(docsSearch || "").trim().toLowerCase();
    if (!q) return MOCK_RELATED_DOCS;
    return MOCK_RELATED_DOCS.filter((d) => {
      const text = `${d.no} ${d.title} ${d.type}`.toLowerCase();
      return text.includes(q);
    });
  }, [docsSearch]);

  const openTagModal = () => {
    setTagDraftIds((activeEntry?.tagIds || []).map(String));
    setTagSearch("");
    setTagModalOpen(true);
  };

  const openDocsModal = () => {
    setDocsDraftIds((activeEntry?.relatedDocIds || []).map(String));
    setDocsSearch("");
    setDocsModalOpen(true);
  };

  const handlePickFiles = (e) => {
    const incoming = Array.from(e.target.files || []);
    if (!incoming.length) return;

    updateActiveEntry((curr) => {
      const base = Array.isArray(curr.files) ? curr.files : [];
      const seen = new Set(base.map((f) => `${f.name}_${f.size}_${f.lastModified}`));
      const merged = [...base];
      incoming.forEach((f) => {
        const key = `${f.name}_${f.size}_${f.lastModified}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(f);
        }
      });
      return { ...curr, files: merged };
    });

    e.target.value = "";
  };

  const cardReveal = mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3";

  return (
    <>
      <Card
        dir="rtl"
        className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
      >
        <div className={"transition-all duration-500 " + cardReveal}>
          <div className="mb-4 text-base md:text-lg">
            <span className="text-neutral-700 dark:text-neutral-300">پروژه‌ها</span>
            <span className="mx-2 text-neutral-500 dark:text-neutral-400">›</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">روزنگار پروژه</span>
          </div>

          <div className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-800/50">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="w-full lg:max-w-md">
                <div className="mb-1 text-xs text-neutral-600 dark:text-neutral-300">پروژه فعال</div>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-right text-neutral-900 outline-none transition focus:ring-2 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-neutral-600/50"
                >
                  <option value="">انتخاب پروژه فعال...</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-dashed border-neutral-300 bg-white/80 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300">
                این صفحه فعلاً فقط UI است و هیچ اتصال بک‌اند یا ذخیره‌سازی ندارد.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <section className="xl:col-span-5">
              <div
                className={
                  "rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-all duration-500 delay-75 dark:border-neutral-800 dark:bg-neutral-900 " +
                  cardReveal
                }
              >
                <div className="mb-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCursor((c) => c.subtract(1, "month"))}
                    className="h-10 w-10 rounded-xl border border-neutral-300 text-base text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
                    aria-label="ماه قبل"
                  >
                    ‹
                  </button>

                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{monthYearLabel}</div>

                  <button
                    type="button"
                    onClick={() => setCursor((c) => c.add(1, "month"))}
                    className="h-10 w-10 rounded-xl border border-neutral-300 text-base text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
                    aria-label="ماه بعد"
                  >
                    ›
                  </button>
                </div>

                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-neutral-500 dark:text-neutral-400">
                  {WEEKDAY_HEADERS.map((h) => (
                    <div key={h} className="py-1">
                      {h}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {monthCells.map((dayNo, idx) => {
                    if (!dayNo) {
                      return <div key={`empty-${idx}`} className="h-11 rounded-lg bg-transparent" />;
                    }

                    const dateYmd = cursor.date(dayNo).calendar("jalali").format("YYYY-MM-DD");
                    const isSelected = dateYmd === selectedDate;
                    const isToday = dateYmd === todayJalaliYmd();
                    const hasDetails = hasEntryDetails(entriesByDate[dateYmd]);

                    return (
                      <button
                        key={dateYmd}
                        type="button"
                        onClick={() => jumpToDate(dateYmd)}
                        className={
                          "relative h-11 rounded-xl border text-sm transition-all duration-200 " +
                          (isSelected
                            ? "border-[#F48B35] bg-[#F48B35]/15 text-[#ce6b1a] dark:text-[#ffb77f]"
                            : isToday
                            ? "border-neutral-400 bg-neutral-100 text-neutral-900 dark:border-neutral-500 dark:bg-neutral-800 dark:text-neutral-100"
                            : "border-transparent bg-neutral-50 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100 dark:bg-neutral-800/70 dark:text-neutral-200 dark:hover:border-neutral-700 dark:hover:bg-neutral-800")
                        }
                      >
                        <span>{toFaDigits(dayNo)}</span>
                        {hasDetails ? (
                          <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#F48B35]" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="xl:col-span-7">
              <div
                className={
                  "rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-all duration-500 delay-150 dark:border-neutral-800 dark:bg-neutral-900 " +
                  cardReveal +
                  (editorDisabled ? " opacity-75" : "")
                }
              >
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                    روز: {activeEntry.dayName}
                  </span>
                  <span className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                    تاریخ: {toFaDigits(selectedDateLabel)}
                  </span>
                  {activeProject ? (
                    <span className="rounded-lg bg-[#F48B35]/15 px-2.5 py-1 text-xs text-[#ce6b1a] dark:text-[#ffb77f]">
                      {activeProject.code} - {activeProject.name}
                    </span>
                  ) : (
                    <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      ابتدا پروژه فعال را انتخاب کنید.
                    </span>
                  )}
                </div>

                <div className="space-y-4" aria-disabled={editorDisabled}>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                    <div className="md:col-span-4">
                      <div className="mb-1 text-xs text-neutral-600 dark:text-neutral-300">روز</div>
                      <select
                        disabled={editorDisabled}
                        value={activeEntry.dayName}
                        onChange={(e) => updateActiveEntry((curr) => ({ ...curr, dayName: e.target.value }))}
                        className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-right text-neutral-900 outline-none transition focus:ring-2 focus:ring-neutral-300 disabled:cursor-not-allowed disabled:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-neutral-600/50 dark:disabled:bg-neutral-800"
                      >
                        {WEEKDAY_NAMES.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-8">
                      <div className="mb-1 text-xs text-neutral-600 dark:text-neutral-300">تاریخ</div>
                      <div className={editorDisabled ? "pointer-events-none" : ""}>
                        <JalaliDatePicker
                          value={selectedDate}
                          onChange={(v) => {
                            if (!v) return;
                            jumpToDate(v);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs text-neutral-600 dark:text-neutral-300">شرح فعالیت‌ها</div>
                    <textarea
                      disabled={editorDisabled}
                      value={activeEntry.activity}
                      onChange={(e) => updateActiveEntry((curr) => ({ ...curr, activity: e.target.value }))}
                      rows={4}
                      placeholder="شرح فعالیت‌های انجام‌شده در این روز را وارد کنید..."
                      className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2 text-sm text-right text-neutral-900 outline-none transition focus:ring-2 focus:ring-neutral-300 disabled:cursor-not-allowed disabled:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-neutral-600/50 dark:disabled:bg-neutral-800"
                    />
                  </div>

                  <div>
                    <div className="mb-1 text-xs text-neutral-600 dark:text-neutral-300">برچسب</div>
                    <div className="flex flex-wrap items-start gap-2">
                      <button
                        type="button"
                        disabled={editorDisabled}
                        onClick={openTagModal}
                        className="h-10 rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:disabled:bg-neutral-800"
                      >
                        انتخاب برچسب
                      </button>

                      <div className="flex flex-1 flex-wrap gap-2">
                        {selectedTags.length ? (
                          selectedTags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-neutral-100 px-3 py-1 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                            >
                              {tag.label}
                              <button
                                type="button"
                                disabled={editorDisabled}
                                onClick={() =>
                                  updateActiveEntry((curr) => ({
                                    ...curr,
                                    tagIds: (curr.tagIds || []).filter((id) => String(id) !== String(tag.id)),
                                  }))
                                }
                                className="text-[11px] text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
                                aria-label={`حذف ${tag.label}`}
                              >
                                ×
                              </button>
                            </span>
                          ))
                        ) : (
                          <div className="py-2 text-xs text-neutral-500 dark:text-neutral-400">برچسبی انتخاب نشده است.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs text-neutral-600 dark:text-neutral-300">مستندات مرتبط</div>
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={editorDisabled}
                        onClick={openDocsModal}
                        className="h-10 rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:disabled:bg-neutral-800"
                      >
                        انتخاب از نامه‌ها و مستندات
                      </button>

                      {selectedDocs.length ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {selectedDocs.map((doc) => (
                            <div
                              key={doc.id}
                              className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-200"
                            >
                              <div className="font-semibold">{doc.title}</div>
                              <div className="mt-0.5 text-neutral-500 dark:text-neutral-400">
                                شماره: {toFaDigits(doc.no)} | {doc.type} | {toFaDigits(doc.date)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">مستندی متصل نشده است.</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs text-neutral-600 dark:text-neutral-300">بارگذاری فایل</div>
                    <div
                      className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-3 dark:border-neutral-700 dark:bg-neutral-800/50"
                      onClick={() => {
                        if (!editorDisabled) fileInputRef.current?.click();
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handlePickFiles}
                        disabled={editorDisabled}
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={editorDisabled}
                          className="h-10 rounded-xl bg-neutral-900 px-3 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-300"
                        >
                          انتخاب فایل
                        </button>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          فایل‌ها فقط به‌صورت موقت داخل همین صفحه نگهداری می‌شوند.
                        </div>
                      </div>

                      {Array.isArray(activeEntry.files) && activeEntry.files.length ? (
                        <div className="mt-3 space-y-1">
                          {activeEntry.files.map((f, idx) => (
                            <div
                              key={`${f.name}_${f.size}_${f.lastModified}_${idx}`}
                              className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                            >
                              <div className="truncate text-neutral-700 dark:text-neutral-200">{f.name}</div>
                              <div className="flex items-center gap-2">
                                <span className="whitespace-nowrap text-neutral-500 dark:text-neutral-400">
                                  {formatSize(f.size)}
                                </span>
                                <button
                                  type="button"
                                  disabled={editorDisabled}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateActiveEntry((curr) => ({
                                      ...curr,
                                      files: (curr.files || []).filter((_, i) => i !== idx),
                                    }));
                                  }}
                                  className="rounded-md px-1.5 py-0.5 text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                  حذف
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </Card>

      {tagModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[1000]" dir="rtl">
            <button
              type="button"
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setTagModalOpen(false)}
              aria-label="بستن"
            />
            <div className="absolute inset-0 flex items-center justify-center p-3">
              <div className="w-[min(780px,96vw)] max-h-[86vh] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900">
                <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
                  <div className="text-sm font-bold">انتخاب برچسب</div>
                  <button
                    type="button"
                    onClick={() => setTagModalOpen(false)}
                    className="h-9 w-9 rounded-xl border border-black/10 text-base transition hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/10"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-3 p-4">
                  <input
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="جستجو در برچسب‌ها..."
                    className="h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-right text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-neutral-600/50"
                  />

                  <div className="max-h-[42vh] overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-800/50">
                    <div className="flex flex-wrap gap-2">
                      {filteredTags.length ? (
                        filteredTags.map((tag) => {
                          const active = tagDraftIds.some((id) => String(id) === String(tag.id));
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() =>
                                setTagDraftIds((prev) =>
                                  prev.some((id) => String(id) === String(tag.id))
                                    ? prev.filter((id) => String(id) !== String(tag.id))
                                    : [...prev, String(tag.id)]
                                )
                              }
                              className={
                                "h-10 rounded-xl border px-3 text-sm transition " +
                                (active
                                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                                  : "border-black/15 bg-white text-neutral-900 hover:bg-black/[0.03] dark:border-white/20 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-white/10")
                              }
                            >
                              {tag.label}
                            </button>
                          );
                        })
                      ) : (
                        <div className="w-full py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                          موردی پیدا نشد.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-black/10 px-4 py-3 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setTagModalOpen(false)}
                    className="h-10 rounded-xl border border-black/15 px-4 text-sm text-neutral-800 transition hover:bg-black/[0.04] dark:border-white/15 dark:text-neutral-100 dark:hover:bg-white/10"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveEntry((curr) => ({ ...curr, tagIds: [...tagDraftIds] }));
                      setTagModalOpen(false);
                    }}
                    className="h-10 rounded-xl bg-black px-4 text-sm text-white transition hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90"
                  >
                    تایید انتخاب
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {docsModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[1000]" dir="rtl">
            <button
              type="button"
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setDocsModalOpen(false)}
              aria-label="بستن"
            />
            <div className="absolute inset-0 flex items-center justify-center p-3">
              <div className="w-[min(920px,96vw)] max-h-[86vh] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900">
                <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
                  <div className="text-sm font-bold">انتخاب مستندات مرتبط</div>
                  <button
                    type="button"
                    onClick={() => setDocsModalOpen(false)}
                    className="h-9 w-9 rounded-xl border border-black/10 text-base transition hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/10"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-3 p-4">
                  <input
                    value={docsSearch}
                    onChange={(e) => setDocsSearch(e.target.value)}
                    placeholder="جستجو در نامه‌ها و مستندات..."
                    className="h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-right text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-neutral-600/50"
                  />

                  <div className="max-h-[46vh] overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-800/50">
                    {filteredDocs.length ? (
                      <div className="space-y-2">
                        {filteredDocs.map((doc) => {
                          const checked = docsDraftIds.some((id) => String(id) === String(doc.id));
                          return (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() =>
                                setDocsDraftIds((prev) =>
                                  prev.some((id) => String(id) === String(doc.id))
                                    ? prev.filter((id) => String(id) !== String(doc.id))
                                    : [...prev, String(doc.id)]
                                )
                              }
                              className={
                                "w-full rounded-xl border px-3 py-2 text-right transition " +
                                (checked
                                  ? "border-[#F48B35] bg-[#F48B35]/15"
                                  : "border-neutral-200 bg-white hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800")
                              }
                            >
                              <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{doc.title}</div>
                              <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                شماره: {toFaDigits(doc.no)} | {doc.type} | تاریخ: {toFaDigits(doc.date)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">موردی پیدا نشد.</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-black/10 px-4 py-3 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setDocsModalOpen(false)}
                    className="h-10 rounded-xl border border-black/15 px-4 text-sm text-neutral-800 transition hover:bg-black/[0.04] dark:border-white/15 dark:text-neutral-100 dark:hover:bg-white/10"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveEntry((curr) => ({ ...curr, relatedDocIds: [...docsDraftIds] }));
                      setDocsModalOpen(false);
                    }}
                    className="h-10 rounded-xl bg-black px-4 text-sm text-white transition hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90"
                  >
                    تایید انتخاب
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
