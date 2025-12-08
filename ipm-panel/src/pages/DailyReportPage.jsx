import React from "react";
import dayjs from "dayjs";
import { Card } from "../components/ui/Card";
import { Btn, PrimaryBtn } from "../components/ui/Button";
import { Portal } from "../components/Portal";
import { JalaliDatePicker } from "../components/JalaliDatePicker";

export default function DailyReportPage() {
  const [projects, setProjects] = React.useState([]);
  const [loadingProjects, setLoadingProjects] = React.useState(false);

  const [projectId, setProjectId] = React.useState("");
  const [day, setDay] = React.useState("");
  const [dateJ, setDateJ] = React.useState(""); // تاریخ شمسی (YYYY-MM-DD)
  const [dateG, setDateG] = React.useState(""); // تاریخ میلادی
  const [descInput, setDescInput] = React.useState("");
  const [descItems, setDescItems] = React.useState([]); // بولت‌پوینت‌ها

  const [tags, setTags] = React.useState([]);
  const [tagsLoading, setTagsLoading] = React.useState(false);
  const [selectedTags, setSelectedTags] = React.useState([]);

  const [reports, setReports] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const [viewItem, setViewItem] = React.useState(null);
  const [editItem, setEditItem] = React.useState(null);
  const [editDescInput, setEditDescInput] = React.useState("");
  const [editDescItems, setEditDescItems] = React.useState([]);
  const [editSelectedTags, setEditSelectedTags] = React.useState([]);

  // فایل‌ها
  const [files, setFiles] = React.useState([]);
  const fileInputRef = React.useRef(null);

  // روزهای هفته
  const daysOfWeek = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

  // ===== helpers =====
  const api = async (path, opt = {}) => {
    const res = await fetch("/api" + path, {
      credentials: "include",
      ...opt,
      headers: { "Content-Type": "application/json", ...(opt.headers || {}) },
    });
    const txt = await res.text();
    let data = {};
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch {}
    if (!res.ok) throw new Error(data?.error || data?.message || "request_failed");
    return data;
  };

  const computeGregorian = (jalaliStr) => {
    if (!jalaliStr) return "";
    try {
      if (dayjs && typeof dayjs.from === "function") {
        const g = dayjs
          .from(jalaliStr, "YYYY-MM-DD", "jalali")
          .calendar("gregory")
          .format("YYYY-MM-DD");
        return g;
      }
    } catch (e) {}
    return jalaliStr;
  };

  // ——— استخراج تاریخ از نام فایل ——
  const extractDateFromFilename = (filename) => {
    if (!filename) return null;
    const match = filename.match(/(13|14|20)\d{2}[-_.\/]?\d{1,2}[-_.\/]?\d{1,2}/);
    if (!match) return null;
    const digits = match[0].replace(/[^\d]/g, "");
    if (digits.length !== 8) return null;
    const y = parseInt(digits.slice(0, 4), 10);
    const m = parseInt(digits.slice(4, 6), 10);
    const d = parseInt(digits.slice(6, 8), 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return { y, m, d };
  };

  const applyDateFromFilename = (filename) => {
    const info = extractDateFromFilename(filename);
    if (!info) return false;

    const { y, m, d } = info;
    const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    if (y >= 1300 && y <= 1499) {
      // شمسی
      setDateJ((prev) => prev || iso);
      setDateG((prev) => prev || computeGregorian(iso));
      try {
        if (dayjs && typeof dayjs.from === "function") {
          const j = dayjs.from(iso, "YYYY-MM-DD", "jalali");
          const dname = j.format("dddd");
          setDay((prev) => prev || dname);
        }
      } catch (e) {}
    } else {
      // میلادی
      setDateG((prev) => prev || iso);
      try {
        const j = dayjs(iso, "YYYY-MM-DD").calendar("jalali").format("YYYY-MM-DD");
        setDateJ((prev) => prev || j);

        try {
          if (dayjs && typeof dayjs.from === "function") {
            const jj = dayjs.from(j, "YYYY-MM-DD", "jalali");
            const dname = jj.format("dddd");
            setDay((prev) => prev || dname);
          }
        } catch (e2) {}
      } catch (e) {}
    }

    return true;
  };

  // ===== load projects =====
  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoadingProjects(true);
      try {
        const r = await api("/projects");
        if (!cancelled) {
          setProjects(Array.isArray(r.projects) ? r.projects : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // ===== load tags (/base/tags) =====
  React.useEffect(() => {
    let cancelled = false;
    const loadTags = async () => {
      setTagsLoading(true);
      try {
        const r = await api("/base/tags");
        if (!cancelled) {
          setTags(Array.isArray(r.items) ? r.items : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setTagsLoading(false);
      }
    };
    loadTags();
    return () => {
      cancelled = true;
    };
  }, []);

  // ===== description bullets =====
  const handleDescKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const v = descInput.trim();
      if (!v) return;
      setDescItems((prev) => [...prev, v]);
      setDescInput("");
    }
  };

  const removeDescItem = (idx) => {
    setDescItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // ===== tags select =====
  const addTag = (tagId) => {
    if (!tagId) return;
    const t = tags.find((x) => String(x.id) === String(tagId));
    if (!t) return;
    setSelectedTags((prev) => {
      if (prev.some((p) => String(p.id) === String(t.id))) return prev;
      return [...prev, t];
    });
  };

  const removeTag = (id) => {
    setSelectedTags((prev) => prev.filter((t) => String(t.id) !== String(id)));
  };

  // ===== date handlers =====
  const handleDayChange = (e) => {
    setDay(e.target.value);
  };

  const handleJalaliChange = (val) => {
    setDateJ(val || "");
    if (val) {
      setDateG(computeGregorian(val));
    } else {
      setDateG("");
    }
  };

  // ===== file upload =====
  const handleFileAreaClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const flist = Array.from(e.target.files || []);
    if (!flist.length) return;
    setFiles(flist);

    if (!dateJ && !dateG) {
      for (const f of flist) {
        if (applyDateFromFilename(f.name)) break;
      }
    }
  };

  // ===== save new report =====
  const handleSave = () => {
    setError("");
    if (!projectId) {
      setError("پروژه را انتخاب کنید");
      return;
    }
    if (!dateJ) {
      setError("تاریخ گزارش روزانه را انتخاب کنید");
      return;
    }
    if (descItems.length === 0) {
      setError("حداقل یک مورد در شرح وارد کنید (با Enter ثبت می‌شود)");
      return;
    }

    setSaving(true);
    try {
      const project = projects.find((p) => String(p.id) === String(projectId));
      const newItem = {
        id: reports.length + 1,
        projectId,
        projectTitle: project ? project.name || project.title || project.code : "",
        day,
        dateJ,
        dateG,
        descItems,
        tags: selectedTags,
        createdAt: new Date().toISOString(),
        files,
      };
      setReports((prev) => [newItem, ...prev]);

      setDay("");
      setDateJ("");
      setDateG("");
      setDescInput("");
      setDescItems([]);
      setSelectedTags([]);
      setFiles([]);
    } finally {
      setSaving(false);
    }
  };

  // ===== view & edit =====
  const openView = (it) => setViewItem(it);

  const openEdit = (it) => {
    setEditItem(it);
    setEditDescItems(it.descItems || []);
    setEditDescInput("");
    setEditSelectedTags(it.tags || []);
  };

  const closeView = () => setViewItem(null);
  const closeEdit = () => {
    setEditItem(null);
    setEditDescItems([]);
    setEditDescInput("");
    setEditSelectedTags([]);
  };

  const handleEditDescKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const v = editDescInput.trim();
      if (!v) return;
      setEditDescItems((prev) => [...prev, v]);
      setEditDescInput("");
    }
  };

  const removeEditDescItem = (idx) => {
    setEditDescItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addEditTag = (tagId) => {
    if (!tagId) return;
    const t = tags.find((x) => String(x.id) === String(tagId));
    if (!t) return;
    setEditSelectedTags((prev) => {
      if (prev.some((p) => String(p.id) === String(t.id))) return prev;
      return [...prev, t];
    });
  };

  const removeEditTag = (id) => {
    setEditSelectedTags((prev) => prev.filter((t) => String(t.id) !== String(id)));
  };

  const handleEditSave = () => {
    if (!editItem) return;
    setReports((prev) =>
      prev.map((r) =>
        r.id === editItem.id ? { ...r, descItems: editDescItems, tags: editSelectedTags } : r
      )
    );
    closeEdit();
  };

  // ===== UI =====
  return (
    <>
      <Card
        className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
        dir="rtl"
      >
        {/* breadcrumb */}
        <div className="mb-4 text-base md:text-lg">
          <span className="text-neutral-700 dark:text-neutral-300">پروژه‌ها</span>
          <span className="mx-2 text-neutral-500 dark:text-neutral-400">›</span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            گزارش روزانه
          </span>
        </div>

        {/* فرم بالای صفحه */}
        <div className="space-y-4 mb-6">
          {/* پروژه */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-600 dark:text-neutral-300">
              پروژه
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-10 rounded-xl px-3 bg-white text-neutral-900 text-right border border-neutral-300 outline-none
                         focus:ring-2 focus:ring-neutral-300 placeholder:text-neutral-400
                         dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:placeholder:text-neutral-500 dark:focus:ring-neutral-600/50"
            >
              <option value="">انتخاب پروژه...</option>
              {loadingProjects ? (
                <option value="">در حال بارگذاری...</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.title || p.code}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* تاریخ گزارش روزانه */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-600 dark:text-neutral-300">
              تاریخ گزارش روزانه
            </label>
            <div className="flex flex-col md:flex-row gap-2 md:gap-3">
              {/* روز */}
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs text-neutral-500 whitespace-nowrap">
                  روز
                </span>
                <select
                  value={day}
                  onChange={handleDayChange}
                  className="flex-1 h-10 rounded-xl px-3 bg-white text-neutral-900 text-right border border-neutral-300 outline-none
                             focus:ring-2 focus:ring-neutral-300 placeholder:text-neutral-400
                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:placeholder:text-neutral-500 dark:focus:ring-neutral-600/50"
                >
                  <option value="">انتخاب...</option>
                  {daysOfWeek.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* تاریخ شمسی */}
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs text-neutral-500 whitespace-nowrap">
                  تاریخ شمسی
                </span>
                <div className="flex-1">
                  <JalaliDatePicker
                    value={dateJ}
                    onChange={handleJalaliChange}
                    placeholder="انتخاب تاریخ..."
                    inputClassName="h-10 w-full rounded-xl border border-neutral-300 bg-white/90 px-3 text-sm text-right text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-neutral-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:ring-neutral-600/50"
                  />
                </div>
              </div>

              {/* تاریخ میلادی */}
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs text-neutral-500 whitespace-nowrap">
                  تاریخ میلادی
                </span>
                <input
                  value={dateG}
                  readOnly
                  className="flex-1 h-10 rounded-xl px-3 bg-neutral-100 text-neutral-800 text-right border border-neutral-300 outline-none
                             placeholder:text-neutral-400
                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:placeholder:text-neutral-500"
                  placeholder="به صورت خودکار پر می‌شود"
                />
              </div>
            </div>
          </div>

          {/* شرح (بولت‌پوینت) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-neutral-600 dark:text-neutral-300">
              شرح
            </label>
            <div className="rounded-2xl border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
              <textarea
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                onKeyDown={handleDescKeyDown}
                placeholder="متن مورد را بنویسید و Enter بزنید..."
                rows={3}
                className="w-full min-h-[72px] resize-none bg-transparent text-sm text-neutral-900
                           placeholder:text-neutral-400 text-right outline-none border-none
                           dark:text-neutral-100 dark:placeholder:text-neutral-500"
              />
              {descItems.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-neutral-800 dark:text-neutral-100">
                  {descItems.map((it, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-neutral-600 dark:bg-neutral-300" />
                      <span className="flex-1">{it}</span>
                      <button
                        type="button"
                        onClick={() => removeDescItem(idx)}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        حذف
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* برچسب‌ها */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-neutral-600 dark:text-neutral-300">
              برچسب‌ها
            </label>
            <div className="flex flex-col md:flex-row gap-2 md:gap-3">
              <select
                onChange={(e) => {
                  addTag(e.target.value);
                  e.target.value = "";
                }}
                defaultValue=""
                className="h-10 md:w-64 rounded-xl px-3 bg-white text-neutral-900 text-right border border-neutral-300 outline-none
                           focus:ring-2 focus:ring-neutral-300 placeholder:text-neutral-400
                           dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:placeholder:text-neutral-500 dark:focus:ring-neutral-600/50"
              >
                <option value="">
                  {tagsLoading ? "در حال بارگذاری..." : "انتخاب برچسب..."}
                </option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <div className="flex-1 flex flex-wrap gap-2">
                {selectedTags.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs
                               bg-neutral-100 text-neutral-800 border border-neutral-300
                               dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                  >
                    {t.name}
                    <button
                      type="button"
                      onClick={() => removeTag(t.id)}
                      className="text-[10px] text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* آپلود فایل */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-600 dark:text-neutral-300">
              فایل پیوست
            </label>
            <div
              className="h-auto min-h-[80px] rounded-2xl border border-dashed border-neutral-300 bg-neutral-50
                         flex flex-col items-center justify-center gap-2 px-3 py-3 text-xs text-neutral-500
                         cursor-pointer
                         dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-400"
              onClick={handleFileAreaClick}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="h-9 px-4 rounded-xl text-xs font-medium
                           bg-neutral-900 text-white shadow-sm
                           hover:bg-neutral-800
                           dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                انتخاب فایل
              </button>

              {files.length > 0 && (
                <div className="mt-2 w-full max-h-28 overflow-auto text-[11px] space-y-1">
                  {files.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between gap-2 border-t border-dashed border-neutral-200 pt-1 first:border-t-0 first:pt-0
                                 dark:border-neutral-700"
                    >
                      <span className="truncate max-w-[70%]">{f.name}</span>
                      <span className="whitespace-nowrap">
                        {(f.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* دکمه ذخیره */}
          {error && (
            <div className="text-xs text-red-600 dark:text-red-400">{error}</div>
          )}
          <div className="flex justify-start">
            <PrimaryBtn onClick={handleSave} disabled={saving}>
              {saving ? "در حال ذخیره..." : "ذخیره گزارش"}
            </PrimaryBtn>
          </div>
        </div>

        {/* جدول لیست گزارش‌ها */}
        <div className="rounded-2xl border border-black/10 bg-white text-black overflow-hidden dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
          <table className="w-full text-sm [&_th]:text-center [&_td]:text-center" dir="rtl">
            <thead>
              <tr className="bg-black/5 text-black border-y border-black/10 dark:bg-white/5 dark:text-neutral-100 dark:border-neutral-700">
                <th className="py-3 w-20">#</th>
                <th className="py-3">پروژه</th>
                <th className="py-3">تاریخ</th>
                <th className="py-3">برچسب‌ها</th>
                <th className="py-3 w-40">اقدامات</th>
              </tr>
            </thead>
            <tbody className="[&_td]:text-black dark:[&_td]:text-neutral-100">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-neutral-600 dark:text-neutral-300">
                    هنوز گزارشی ثبت نشده است.
                  </td>
                </tr>
              ) : (
                reports.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="border-t border-black/10 odd:bg-black/[0.02] even:bg-black/[0.04] hover:bg-black/[0.06]
                               dark:border-neutral-800 dark:odd:bg-white/5 dark:even:bg-white/10 dark:hover:bg:white/15"
                  >
                    <td className="py-3 w-20">{idx + 1}</td>
                    <td className="py-3">{r.projectTitle || "—"}</td>
                    <td className="py-3">{r.dateJ || "—"}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap justify-center gap-1">
                        {r.tags && r.tags.length > 0 ? (
                          r.tags.map((t) => (
                            <span
                              key={t.id}
                              className="px-2 py-0.5 rounded-full text-[11px]
                                         bg-neutral-100 text-neutral-800 border border-neutral-300
                                         dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                            >
                              {t.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-neutral-400 dark:text-neutral-500">
                            بدون برچسب
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Btn onClick={() => openView(r)}>نمایش</Btn>
                        <Btn onClick={() => openEdit(r)}>ویرایش</Btn>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* پاپ‌اپ نمایش */}
      {viewItem && (
        <Portal>
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl bg-white text-neutral-900 p-5 shadow-xl border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">نمایش گزارش روزانه</h2>
                <button
                  type="button"
                  onClick={closeView}
                  className="h-8 w-8 grid place-items-center rounded-xl ring-1 ring-black/15 hover:bg-black/5 dark:ring-neutral-700 dark:hover:bg-white/10"
                >
                  <img
                    src="/images/icons/baste.svg"
                    alt="بستن"
                    className="w-5 h-5 invert dark:invert-0"
                  />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="w-24 text-neutral-500">پروژه:</span>
                  <span className="flex-1">{viewItem.projectTitle || "—"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-24 text-neutral-500">تاریخ:</span>
                  <span className="flex-1">
                    {viewItem.dateJ} {viewItem.dateG ? `(${viewItem.dateG})` : ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-24 text-neutral-500">شرح:</span>
                  <div className="flex-1">
                    <ul className="list-disc pr-5 space-y-1">
                      {viewItem.descItems.map((d, idx) => (
                        <li key={idx}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="w-24 text-neutral-500">برچسب‌ها:</span>
                  <div className="flex-1 flex flex-wrap gap-1">
                    {viewItem.tags && viewItem.tags.length > 0 ? (
                      viewItem.tags.map((t) => (
                        <span
                          key={t.id}
                          className="px-2 py-0.5 rounded-full text-[11px]
                                     bg-neutral-100 text-neutral-800 border border-neutral-300
                                     dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                        >
                          {t.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">
                        بدون برچسب
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <Btn onClick={closeView}>بستن</Btn>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* پاپ‌اپ ویرایش */}
      {editItem && (
        <Portal>
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl bg-white text-neutral-900 p-5 shadow-xl border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">ویرایش گزارش روزانه</h2>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="h-8 w-8 grid place-items-center rounded-xl ring-1 ring-black/15 hover:bg-black/5 dark:ring-neutral-700 dark:hover:bg-white/10"
                >
                  <img
                    src="/images/icons/baste.svg"
                    alt="بستن"
                    className="w-5 h-5 invert dark:invert-0"
                  />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-500">شرح</span>
                  <input
                    value={editDescInput}
                    onChange={(e) => setEditDescInput(e.target.value)}
                    onKeyDown={handleEditDescKeyDown}
                    placeholder="متن مورد را بنویسید و Enter بزنید..."
                    className="h-10 rounded-xl px-3 bg-white text-neutral-900 text-right border border-neutral-300 outline-none
                               focus:ring-2 focus:ring-neutral-300 placeholder:text-neutral-400
                               dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:placeholder:text-neutral-500 dark:focus:ring-neutral-600/50"
                  />
                  {editDescItems.length > 0 && (
                    <ul className="mt-1 space-y-1 text-sm text-neutral-800 dark:text-neutral-100">
                      {editDescItems.map((it, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-neutral-600 dark:bg-neutral-300" />
                          <span className="flex-1">{it}</span>
                          <button
                            type="button"
                            onClick={() => removeEditDescItem(idx)}
                            className="text-xs text-red-500 hover:text-red-600"
                          >
                            حذف
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs text-neutral-500">برچسب‌ها</span>
                  <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                    <select
                      onChange={(e) => {
                        addEditTag(e.target.value);
                        e.target.value = "";
                      }}
                      defaultValue=""
                      className="h-10 md:w-64 rounded-xl px-3 bg-white text-neutral-900 text-right border border-neutral-300 outline-none
                                 focus:ring-2 focus:ring-neutral-300 placeholder:text-neutral-400
                                 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:placeholder:text-neutral-500 dark:focus:ring-neutral-600/50"
                    >
                      <option value="">
                        {tagsLoading ? "در حال بارگذاری..." : "انتخاب برچسب..."}
                      </option>
                      {tags.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex-1 flex flex-wrap gap-2">
                      {editSelectedTags.map((t) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs
                                     bg-neutral-100 text-neutral-800 border border-neutral-300
                                     dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                        >
                          {t.name}
                          <button
                            type="button"
                            onClick={() => removeEditTag(t.id)}
                            className="text-[10px] text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Btn onClick={closeEdit}>انصراف</Btn>
                <PrimaryBtn onClick={handleEditSave}>ذخیره تغییرات</PrimaryBtn>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
