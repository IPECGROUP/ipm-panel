// src/pages/ProjectsPage.jsx
import React from "react";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TR, TD, TH } from "../components/ui/Table.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";
import {
  hoverSelectableCrudTablePreset as tablePreset,
  getHoverSelectableRowClass,
} from "../components/ui/tablePresets.js";
import { useAuth } from "../components/AuthProvider";
import { isMainAdminUser } from "../utils/auth";

function ProjectsPage() {
  const { user } = useAuth();
  const isMainAdmin = isMainAdminUser(user) || user?.username === "marandi";

  const api = async (path, opt = {}) => {
    const res = await fetch("/api" + path, {
      ...opt,
      headers: {
        "Content-Type": "application/json",
        ...(opt.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || data?.message || "request_failed");
    return data;
  };

  // ✅ آدرس پیشنهادی برای بک/پریسما:
  // PATCH /api/projects  body: { id, code, name, isActive }
  // (یا اگر خواستی جداش کنی: PATCH /api/projects/status  body: { id, isActive })

  const [rows, setRows] = React.useState([]);
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const [codeInput, setCodeInput] = React.useState("");
  const [nameInput, setNameInput] = React.useState("");

  const [editId, setEditId] = React.useState(null);
  const [editCode, setEditCode] = React.useState("");
  const [editName, setEditName] = React.useState("");
  const [editIsActive, setEditIsActive] = React.useState(true);
  const [selectedIds, setSelectedIds] = React.useState([]);

  const [codeSortDir, setCodeSortDir] = React.useState("asc");

  // pagination
  const [pageSize, setPageSize] = React.useState(20);
  const [page, setPage] = React.useState(0);

  const setSelected = (nextOrUpdater) => {
    setSelectedIds((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const rawNext = typeof nextOrUpdater === "function" ? nextOrUpdater(prevList) : nextOrUpdater;
      return Array.from(new Set((Array.isArray(rawNext) ? rawNext : []).map((id) => String(id))));
    });
  };

  const toEnDigits = (s) =>
    String(s || "")
      .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
      .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

  const toFaDigits = (s) =>
    String(s ?? "")
      .replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

  const isTopProjectCode = (code) => {
    const c = toEnDigits(String(code || "")).trim();
    return /^\d{3}$/.test(c);
  };

  const loadAll = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await api("/projects");
      const items = Array.isArray(data.items) ? data.items : [];
      setRows(items.filter((r) => isTopProjectCode(r?.code)));
    } catch (ex) {
      console.error(ex);
      setErr(ex.message || "خطا در دریافت پروژه‌ها");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadAll().catch(console.error);
  }, []);

  const submitAdd = async (e) => {
    e?.preventDefault?.();
    const code = toEnDigits(codeInput).trim();
    const name = (nameInput || "").trim();

    if (!code || !name) {
      setErr("کد و نام پروژه الزامی است.");
      return;
    }
    if (!/^\d{3}$/.test(code)) {
      setErr("لطفاً کد پروژه را به صورت دقیقاً ۳ رقم وارد کنید.");
      return;
    }

    setErr("");
    try {
      const resp = await api("/projects", {
        method: "POST",
        body: JSON.stringify({ code, name, isActive: true }), // ✅ پروژه جدید: پیش‌فرض فعال
      });
      const newItem = resp?.item || null;
      if (newItem) {
        const ensured = { ...newItem, isActive: newItem?.isActive ?? true };
        setRows((prev) => [...prev, ensured].filter((r) => isTopProjectCode(r?.code)));
      } else {
        await loadAll();
      }
      setCodeInput("");
      setNameInput("");
      setPage(0);
    } catch (ex) {
      console.error(ex);
      setErr(ex.message || "خطا در ثبت پروژه");
    }
  };

  const beginEdit = (r) => {
    setEditId(r.id);
    setEditCode(String(r.code || ""));
    setEditName(String(r.name || ""));
    setEditIsActive(Boolean(r?.isActive ?? true)); // ✅ اگر فیلد نیومده بود، فعال در نظر بگیر
    setErr("");
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditCode("");
    setEditName("");
    setEditIsActive(true);
  };

  const saveInline = async () => {
    const code = toEnDigits(editCode).trim();
    const name = (editName || "").trim();

    if (!code || !name) {
      setErr("کد و نام پروژه الزامی است.");
      return;
    }
    if (!/^\d{3}$/.test(code)) {
      setErr("کد پروژه باید دقیقاً ۳ رقم باشد.");
      return;
    }

    setErr("");
    try {
      await api("/projects", {
        method: "PATCH",
        body: JSON.stringify({ id: editId, code, name, isActive: !!editIsActive }),
      });

      setRows((prev) =>
        prev
          .map((r) => (r.id === editId ? { ...r, code, name, isActive: !!editIsActive } : r))
          .filter((r) => isTopProjectCode(r?.code))
      );
      cancelEdit();
    } catch (ex) {
      console.error(ex);
      setErr(ex.message || "خطا در ویرایش پروژه");
    }
  };

  const removeRows = async (ids) => {
    const uniqIds = Array.from(
      new Set(
        (Array.isArray(ids) ? ids : [ids])
          .filter((id) => id !== null && id !== undefined)
          .map((id) => String(id))
      )
    );
    if (!uniqIds.length) return;

    const confirmText = uniqIds.length > 1 ? `حذف ${uniqIds.length} ردیف انتخاب‌شده؟` : "حذف این پروژه؟";
    if (!window.confirm(confirmText)) return;

    const idSet = new Set(uniqIds);
    if (editId !== null && idSet.has(String(editId))) {
      cancelEdit();
    }

    setRows((prev) => prev.filter((x) => !idSet.has(String(x.id))));
    setSelected((prev) => prev.filter((id) => !idSet.has(String(id))));

    const existingIds = rows.filter((r) => idSet.has(String(r.id))).map((r) => r.id);
    if (!existingIds.length) return;

    try {
      await Promise.all(
        existingIds.map((id) =>
          api("/projects", {
            method: "DELETE",
            body: JSON.stringify({ id }),
          })
        )
      );
    } catch (ex) {
      console.error(ex);
      await loadAll();
      alert(ex.message || "خطا در حذف پروژه");
    }
  };

  const sortedRows = React.useMemo(() => {
    const arr = Array.isArray(rows) ? [...rows] : [];
    arr.sort((a, b) => {
      const ac = String(a.code || "");
      const bc = String(b.code || "");
      const cmp = ac.localeCompare(bc, "fa", { numeric: true, sensitivity: "base" });
      return codeSortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [rows, codeSortDir]);

  // clamp page when data/pageSize changes
  React.useEffect(() => {
    const totalPages = Math.max(1, Math.ceil((sortedRows.length || 0) / (pageSize || 1)));
    if (page > totalPages - 1) setPage(totalPages - 1);
  }, [sortedRows.length, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = total === 0 ? 0 : page * pageSize;
  const endIdx = Math.min(total, startIdx + pageSize);
  const pageRows = sortedRows.slice(startIdx, endIdx);
  const tableUi = tablePreset.table;
  const rowUi = tablePreset.row;
  const visibleIds = pageRows.map((r) => String(r.id));
  const selectedSet = new Set((selectedIds || []).map((id) => String(id)));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedSet.has(id)) && !allVisibleSelected;

  const toggleSelectAllVisible = () => {
    setSelected((prev) => {
      const prevSet = new Set((prev || []).map((id) => String(id)));
      if (allVisibleSelected) {
        return (prev || []).filter((id) => !visibleIds.includes(String(id)));
      }
      visibleIds.forEach((id) => prevSet.add(String(id)));
      return Array.from(prevSet);
    });
  };

  const toggleRowSelect = (id) => {
    const sid = String(id);
    setSelected((prev) => {
      const exists = (prev || []).some((x) => String(x) === sid);
      return exists ? (prev || []).filter((x) => String(x) !== sid) : [...(prev || []), sid];
    });
  };

  const onAddCodeChange = (e) => {
    const v = toEnDigits(e.target.value).replace(/[^\d]/g, "").slice(0, 3);
    setCodeInput(v);
  };

  const onEditCodeChange = (e) => {
    const v = toEnDigits(e.target.value).replace(/[^\d]/g, "").slice(0, 3);
    setEditCode(v);
  };

  React.useEffect(() => {
    const validIds = new Set(sortedRows.map((r) => String(r.id)));
    setSelected((prev) => prev.filter((id) => validIds.has(String(id))));
  }, [sortedRows]);

  const escapeHtml = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const exportProjectsExcel = () => {
    const items = Array.isArray(sortedRows) ? sortedRows : [];

    const rowsHtml = items
      .map((r, i) => {
        const code = String(r?.code ?? "").trim();
        const name = String(r?.name ?? "").trim();
        const combined = `${code} - ${name}`.trim();
        return `
          <tr>
            <td style="border:1px solid #BFBFBF; padding:6px 8px; text-align:center; vertical-align:middle;">${i + 1}</td>
            <td style="border:1px solid #BFBFBF; padding:6px 8px; text-align:right; direction:rtl; unicode-bidi:plaintext; vertical-align:middle;">${escapeHtml(
              combined || "—"
            )}</td>
          </tr>
        `;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <style>
    body { font-family: Tahoma, Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; direction: rtl; }
    th { background: #F2F2F2; border: 1px solid #BFBFBF; padding: 8px; font-weight: 700; text-align: center; }
    td { font-size: 12pt; }
  </style>
</head>
<body>
  <table>
    <thead>
      <tr>
        <th style="width:70px;">ردیف</th>
        <th>پروژه (کد - نام)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob(["\uFEFF", html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "projects.xls";
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const PagerBtn = ({ disabled, onClick, direction }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-10 w-10 grid place-items-center rounded-xl bg-transparent
                 hover:bg-black/5 active:bg-black/10 disabled:opacity-40 disabled:cursor-not-allowed
                 dark:hover:bg-white/10 dark:active:bg-white/15"
      aria-label={direction === "prev" ? "صفحه قبل" : "صفحه بعد"}
      title={direction === "prev" ? "صفحه قبل" : "صفحه بعد"}
    >
      {/* RTL: prev = chevron-right, next = chevron-left */}
      {direction === "prev" ? (
        <svg className="w-5 h-5 text-black/70 dark:text-neutral-200" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M10.7 6.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 1 1-1.4-1.4L15.29 12 10.7 7.7a1 1 0 0 1 0-1.4z"
          />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-black/70 dark:text-neutral-200" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M13.3 17.7a1 1 0 0 1-1.4 0l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 1 1 1.4 1.4L8.71 12l4.59 4.3a1 1 0 0 1 0 1.4z"
          />
        </svg>
      )}
    </button>
  );

  return (
    <Card
      className="p-5 md:p-6 rounded-2xl border bg-white text-black border-black/10
                 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
      dir="rtl"
    >
      <div className="mb-5 text-base md:text-lg">
        <span className="text-black/70 dark:text-neutral-300">اطلاعات پایه</span>
        <span className="mx-2 text-black/50 dark:text-neutral-400">›</span>
        <span className="font-semibold text-black dark:text-neutral-100">پروژه‌ها</span>
      </div>

      {/* ✅ باکس یکپارچه مثل صفحه ارزها: فرم + جدول در یک قاب، بدون خط جداکننده */}
      <div
        className="rounded-2xl border border-black/10 bg-white overflow-hidden
                   dark:bg-neutral-900 dark:border-neutral-800"
        dir="rtl"
      >
        {/* فرم (هم‌راستا با جدول: px دقیقاً 15px) */}
        <form onSubmit={submitAdd} className="px-[15px] py-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] items-end gap-3">
            <div className="flex-1 min-w-[220px] flex flex-col gap-1">
              <label className="text-sm text-black/70 dark:text-neutral-300">کد پروژه</label>
              <input
                dir="ltr"
                inputMode="numeric"
                className="h-10 w-full rounded-2xl px-3 bg-white text-black placeholder-black/40
                           border border-black/15 outline-none font-mono text-center
                           focus:ring-2 focus:ring-black/10
                           dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                value={codeInput}
                onChange={onAddCodeChange}
                placeholder="123"
              />
            </div>

            <div className="flex-1 min-w-[220px] flex flex-col gap-1">
              <label className="text-sm text-black/70 dark:text-neutral-300">نام پروژه</label>
              <input
                className="h-10 w-full rounded-2xl px-3 bg-white text-black placeholder-black/40
                           border border-black/15 outline-none focus:ring-2 focus:ring-black/10
                           dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="نام…"
              />
            </div>

            <div className="justify-self-start">
              <button
                type="submit"
                className="h-10 w-10 grid place-items-center rounded-xl
                           bg-white text-black border border-black/15 hover:bg-black/5 transition disabled:opacity-50
                           dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-200/20"
                aria-label="افزودن"
                title="افزودن"
              >
                <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5" />
              </button>
            </div>
          </div>

          {err && <div className="text-sm text-red-600 dark:text-red-400 mt-2">{err}</div>}
        </form>

        {/* جدول */}
        <TableWrap>
          <div className={tableUi.outer}>
            <div className="px-[15px] pb-4">
              <div className={tableUi.frame}>
                {/* ✅ اسکرول فقط داخل جدول */}
                <div className="max-h-[520px] overflow-auto">
                  <table className={`${tableUi.table} min-w-[760px]`} dir="rtl">
                    <THead>
                      <tr className={`sticky top-0 z-20 ${tableUi.headRow}`}>
                        <TH className={`${tablePreset.columns.select} ${tableUi.th}`}>
                          <input
                            type="checkbox"
                            className={rowUi.checkbox}
                            checked={allVisibleSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someVisibleSelected;
                            }}
                            onChange={toggleSelectAllVisible}
                            aria-label="انتخاب همه"
                            title="انتخاب همه"
                          />
                        </TH>

                        <TH className={`${tablePreset.columns.index} ${tableUi.th}`}>
                          #
                        </TH>

                        <TH className={`w-44 sm:w-56 ${tableUi.th}`}>
                          <div className={tablePreset.titleHeaderWrap}>
                            <span>کد</span>
                            <button
                              type="button"
                              onClick={() => setCodeSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                              className={tablePreset.sortButton}
                              title="مرتب‌سازی کد"
                              aria-label="مرتب‌سازی کد"
                            >
                              <svg
                                className={`w-[14px] h-[14px] transition-transform ${
                                  codeSortDir === "asc" ? "rotate-180" : ""
                                }`}
                                focusable="false"
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                              >
                                <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"></path>
                              </svg>
                            </button>
                          </div>
                        </TH>

                        <TH className={tableUi.th}>
                          نام پروژه
                        </TH>

                        {/* ✅ ستون وضعیت */}
                        <TH className={`w-24 sm:w-28 ${tableUi.th}`}>
                          وضعیت
                        </TH>

                        <TH className={`w-44 sm:w-72 ${tableUi.th}`}>
                          <div className={tablePreset.titleHeaderWrap}>
                            <span>اقدامات</span>

                            {isMainAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  exportProjectsExcel();
                                }}
                                className={tablePreset.sortButton}
                                title="خروجی اکسل"
                                aria-label="خروجی اکسل"
                              >
                                <svg
                                  className="w-[16px] h-[16px]"
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                  focusable="false"
                                >
                                  <path
                                    fill="currentColor"
                                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm0 2.5L18.5 9H14zM8 13h8v2H8zm0 4h8v2H8zM8 9h4v2H8z"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                        </TH>
                      </tr>
                    </THead>

                    <tbody className={tableUi.body}>
                      {loading ? (
                        <TR>
                          <TD colSpan={6} className={tableUi.emptyRow}>
                            در حال بارگذاری…
                          </TD>
                        </TR>
                      ) : pageRows.length === 0 ? (
                        <TR>
                          <TD colSpan={6} className={tableUi.emptyRow}>
                            موردی ثبت نشده.
                          </TD>
                        </TR>
                      ) : (
                        pageRows.map((r, idx) => {
                          const isLast = idx === pageRows.length - 1;
                          const tdBorder = isLast ? "" : tableUi.rowDivider;
                          const rowId = String(r.id);
                          const rowIsEditing = editId === r.id;
                          const rowIsActive = Boolean(r?.isActive ?? true);
                          const isSelected = selectedSet.has(rowId);
                          const shouldDeleteSelectedOnAction = isSelected && selectedIds.length > 1;

                          const boxBase =
                            "h-5 w-5 rounded-[6px] border inline-grid place-items-center text-[12px] leading-none select-none";

                          const boxOn =
                            "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white";

                          const boxOff =
                            "bg-transparent text-transparent border-black/25 dark:border-white/25";

                          const boxDisabled =
                            "opacity-60 cursor-not-allowed";

                          const boxEnabled =
                            "cursor-pointer hover:opacity-90 active:opacity-80";

                          return (
                            <TR key={r.id} className={getHoverSelectableRowClass(isSelected)}>
                              <TD className={`px-3 ${tdBorder}`}>
                                <input
                                  type="checkbox"
                                  className={rowUi.checkbox}
                                  checked={isSelected}
                                  onChange={() => toggleRowSelect(r.id)}
                                  aria-label="انتخاب"
                                  title="انتخاب"
                                />
                              </TD>

                              <TD className={`px-3 ${tdBorder}`}>{startIdx + idx + 1}</TD>

                              <TD className={`px-3 font-mono ${tdBorder}`}>
                                {rowIsEditing ? (
                                  <input
                                    dir="ltr"
                                    inputMode="numeric"
                                    className="w-full max-w-[140px] rounded-xl px-2 py-0.5 text-center font-mono
                                               border border-black/15 dark:border-neutral-700
                                               bg-white text-black placeholder-black/40
                                               dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400"
                                    value={editCode}
                                    onChange={onEditCodeChange}
                                    placeholder="123"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="inline-block w-full text-center" dir="ltr">
                                    {r.code || "—"}
                                  </span>
                                )}
                              </TD>

                              <TD className={`px-3 ${tdBorder}`}>
                                {rowIsEditing ? (
                                  <input
                                    className="w-full max-w-[260px] rounded-xl px-2 py-0.5 text-center
                                               border border-black/15 dark:border-neutral-700
                                               bg-white text-black placeholder-black/40
                                               dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="نام…"
                                  />
                                ) : (
                                  r.name || "—"
                                )}
                              </TD>

                              {/* ✅ وضعیت: فقط در حالت ویرایش قابل تغییر */}
                              <TD className={`px-3 ${tdBorder}`}>
                                {rowIsEditing ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setEditIsActive((v) => !v);
                                    }}
                                    className={`${boxBase} ${editIsActive ? boxOn : boxOff} ${boxEnabled}`}
                                    aria-label={editIsActive ? "فعال" : "غیرفعال"}
                                    title={editIsActive ? "فعال" : "غیرفعال"}
                                  >
                                    {editIsActive ? "✓" : "✓"}
                                  </button>
                                ) : (
                                  <div
                                    className={`${boxBase} ${rowIsActive ? boxOn : boxOff} ${boxDisabled}`}
                                    aria-label={rowIsActive ? "فعال" : "غیرفعال"}
                                    title="برای تغییر، ابتدا ویرایش را بزنید"
                                  >
                                    {rowIsActive ? "✓" : "✓"}
                                  </div>
                                )}
                              </TD>

                              <TD className={`px-3 ${tdBorder}`}>
                                {rowIsEditing ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <RowActionIconBtn
                                      action="save"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        saveInline();
                                      }}
                                      size={tablePreset.actionSizes.button}
                                      iconSize={tablePreset.actionSizes.save}
                                    />
                                    <RowActionIconBtn
                                      action="cancel"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        cancelEdit();
                                      }}
                                      size={tablePreset.actionSizes.button}
                                      iconSize={tablePreset.actionSizes.cancel}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto">
                                    <RowActionIconBtn
                                      action="edit"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        beginEdit(r);
                                      }}
                                      size={tablePreset.actionSizes.button}
                                      iconSize={tablePreset.actionSizes.edit}
                                    />
                                    <RowActionIconBtn
                                      action="delete"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (shouldDeleteSelectedOnAction) {
                                          removeRows(selectedIds);
                                          return;
                                        }
                                        removeRows([r.id]);
                                      }}
                                      size={tablePreset.actionSizes.button}
                                      iconSize={tablePreset.actionSizes.delete}
                                    />
                                  </div>
                                )}
                              </TD>
                            </TR>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* pagination bar */}
                <div className="border-t border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                  <div className="px-3 py-2 flex items-center justify-between gap-3" dir="rtl">
                    <div className="flex items-center gap-2">
                      <PagerBtn
                        direction="prev"
                        disabled={page <= 0}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                      />
                      <PagerBtn
                        direction="next"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      />
                      <div className="text-sm text-black/70 dark:text-neutral-300">
                        {total === 0
                          ? "۰ از ۰"
                          : `${toFaDigits(startIdx + 1)}–${toFaDigits(endIdx)} از ${toFaDigits(total)}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-black/70 dark:text-neutral-300">تعداد در هر صفحه:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          const v = Number(e.target.value) || 20;
                          setPageSize(v);
                          setPage(0);
                        }}
                        className="h-10 rounded-xl px-3 bg-white text-black border border-black/15
                                   dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                      >
                        <option value={10}>۱۰</option>
                        <option value={20}>۲۰</option>
                        <option value={50}>۵۰</option>
                        <option value={100}>۱۰۰</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TableWrap>
      </div>
    </Card>
  );
}

export default ProjectsPage;
