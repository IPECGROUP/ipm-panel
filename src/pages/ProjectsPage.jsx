// src/pages/ProjectsPage.jsx
import React from "react";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TR, TD, TH } from "../components/ui/Table.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";

function ProjectsPage() {
  // ===== helper API =====
  const api = async (path, opt = {}) => {
    const res = await fetch("/api" + path, {
      ...opt,
      headers: {
        "Content-Type": "application/json",
        ...(opt.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || data?.message || "request_failed");
    }
    return data;
  };

  // ===== state =====
  const [rows, setRows] = React.useState([]);
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // افزودن
  const [codeInput, setCodeInput] = React.useState("");
  const [nameInput, setNameInput] = React.useState("");

  // ویرایش درون‌ردیفی
  const [editId, setEditId] = React.useState(null);
  const [editCode, setEditCode] = React.useState("");
  const [editName, setEditName] = React.useState("");

  // مرتب‌سازی ستون «کد»
  const [codeSortDir, setCodeSortDir] = React.useState("asc"); // asc | desc

  // صفحه‌بندی
  const [pageSize, setPageSize] = React.useState(10);
  const [pageIndex, setPageIndex] = React.useState(0);

  // تبدیل ارقام فارسی/عربی به لاتین
  const toEnDigits = (s) =>
    String(s || "")
      .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
      .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

  const toFaDigits = (s) =>
    String(s ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

  // ✅ فقط پروژه‌های اصلی (کد دقیقاً ۳ رقم) باید در این صفحه نمایش داده شوند
  const isTopProjectCode = (code) => {
    const c = toEnDigits(String(code || "")).trim();
    return /^\d{3}$/.test(c);
  };

  // ===== load from backend =====
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

  // ===== add (فقط افزودن؛ ویرایش داخل جدول انجام می‌شود) =====
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
        body: JSON.stringify({ code, name }),
      });
      const newItem = resp?.item || null;
      if (newItem) {
        setRows((prev) => [...prev, newItem].filter((r) => isTopProjectCode(r?.code)));
      } else {
        await loadAll();
      }
      setCodeInput("");
      setNameInput("");
      setPageIndex(0);
    } catch (ex) {
      console.error(ex);
      setErr(ex.message || "خطا در ثبت پروژه");
    }
  };

  // ===== inline edit helpers =====
  const beginEdit = (r) => {
    setEditId(r.id);
    setEditCode(String(r.code || ""));
    setEditName(String(r.name || ""));
    setErr("");
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditCode("");
    setEditName("");
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
        body: JSON.stringify({ id: editId, code, name }),
      });

      setRows((prev) =>
        prev
          .map((r) => (r.id === editId ? { ...r, code, name } : r))
          .filter((r) => isTopProjectCode(r?.code))
      );
      cancelEdit();
    } catch (ex) {
      console.error(ex);
      setErr(ex.message || "خطا در ویرایش پروژه");
    }
  };

  const del = async (r) => {
    if (!window.confirm("حذف این پروژه؟")) return;
    try {
      await api("/projects", {
        method: "DELETE",
        body: JSON.stringify({ id: r.id }),
      });
      setRows((prev) => prev.filter((x) => x.id !== r.id));
    } catch (ex) {
      console.error(ex);
      alert(ex.message || "خطا در حذف پروژه");
    }
  };

  // ===== sort helpers (by code) =====
  const sortedRows = React.useMemo(() => {
    const arr = Array.isArray(rows) ? [...rows] : [];
    arr.sort((a, b) => {
      const ac = String(a.code || "");
      const bc = String(b.code || "");
      const cmp = ac.localeCompare(bc, "fa", {
        numeric: true,
        sensitivity: "base",
      });
      return codeSortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [rows, codeSortDir]);

  // کنترل ورودی کد (افزودن) — حداکثر ۳ رقم
  const onAddCodeChange = (e) => {
    const v = toEnDigits(e.target.value).replace(/[^\d]/g, "").slice(0, 3);
    setCodeInput(v);
  };

  // کنترل ورودی کد (ویرایش درون‌ردیفی) — حداکثر ۳ رقم
  const onEditCodeChange = (e) => {
    const v = toEnDigits(e.target.value).replace(/[^\d]/g, "").slice(0, 3);
    setEditCode(v);
  };

  // ===== pagination computed =====
  const total = sortedRows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const start = safePageIndex * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageRows = sortedRows.slice(start, end);

  React.useEffect(() => {
    if (safePageIndex !== pageIndex) setPageIndex(safePageIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount]);

  return (
    <Card
      className="p-5 md:p-6 rounded-2xl border bg-white text-black border-black/10 
                 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
      dir="rtl"
    >
      {/* Breadcrumb */}
      <div className="mb-5 text-base md:text-lg">
        <span className="text-black/70 dark:text-neutral-300">اطلاعات پایه</span>
        <span className="mx-2 text-black/50 dark:text-neutral-400">›</span>
        <span className="font-semibold text-black dark:text-neutral-100">پروژه‌ها</span>
      </div>

      {/* فرم افزودن */}
      <form
        onSubmit={submitAdd}
        className="border rounded-2xl p-4 md:p-5 mb-5 bg-white border-black/10 
                   dark:bg-neutral-900 dark:border-neutral-800"
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] items-end gap-3">
          <div className="flex-1 min-w-[220px] flex flex-col gap-1">
            <label className="text-sm text-black/70 dark:text-neutral-300">نام پروژه</label>
            <input
              className="h-10 w-full rounded-xl px-3 bg-white text-black placeholder-black/40 
                         border border-black/15 outline-none
                         dark:bg-neutral-800 dark:text-neutral-100 
                         dark:placeholder-neutral-400 dark:border-neutral-700"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="نام…"
            />
          </div>

          <div className="flex-1 min-w-[220px] flex flex-col gap-1">
            <label className="text-sm text-black/70 dark:text-neutral-300">کد پروژه</label>
            <input
              dir="ltr"
              maxLength={3}
              className="h-10 w-full rounded-xl px-3 bg-white text-black placeholder-black/40 
                         border border-black/15 outline-none font-mono
                         dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
              value={codeInput}
              onChange={onAddCodeChange}
              placeholder="123"
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

        {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
      </form>

      {/* جدول */}
      <TableWrap>
        <div className="px-[15px] pb-4">
          <div className="rounded-2xl border border-black/10 overflow-hidden bg-white text-black dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
            {/* اسکرول فقط داخل جدول */}
            <div className="max-h-[420px] overflow-y-auto">
              <table
                className="w-full text-sm [&_th]:text-center [&_td]:text-center [&_th]:py-0.5 [&_td]:py-0.5"
                dir="rtl"
              >
                <THead>
                  <tr className="sticky top-0 z-10 bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700">
                    <TH className="w-20 sm:w-24 !text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
                      #
                    </TH>

                    <TH className="w-44 sm:w-56 !text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
                      <div className="flex items-center justify-center gap-2">
                        <span>کد</span>
                        <button
                          type="button"
                          onClick={() => setCodeSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                          className="h-7 w-7 inline-grid place-items-center bg-transparent p-0
                                     text-neutral-500 hover:text-neutral-600 active:text-neutral-700
                                     dark:text-neutral-400 dark:hover:text-neutral-300"
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

                    <TH className="!text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
                      نام پروژه
                    </TH>

                    <TH className="w-44 sm:w-72 !text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
                      اقدامات
                    </TH>
                  </tr>
                </THead>

                <tbody
                  className="[&_td]:text-black dark:[&_td]:text-neutral-100
                             [&_tr:nth-child(odd)]:bg-white [&_tr:nth-child(even)]:bg-neutral-50
                             dark:[&_tr:nth-child(odd)]:bg-neutral-900 dark:[&_tr:nth-child(even)]:bg-neutral-800/50"
                >
                  {loading ? (
                    <TR className="bg-white dark:bg-transparent">
                      <TD colSpan={4} className="text-center text-black/60 dark:text-neutral-400 py-4">
                        در حال بارگذاری…
                      </TD>
                    </TR>
                  ) : pageRows.length === 0 ? (
                    <TR className="bg-white dark:bg-transparent">
                      <TD colSpan={4} className="text-center text-black/60 dark:text-neutral-400 py-4">
                        موردی ثبت نشده.
                      </TD>
                    </TR>
                  ) : (
                    pageRows.map((r, idx) => {
                      const isLast = idx === pageRows.length - 1;
                      const tdBorder = isLast ? "" : "border-b border-neutral-300 dark:border-neutral-700";

                      return (
                        <TR key={r.id}>
                          <TD className={`px-3 ${tdBorder}`}>{start + idx + 1}</TD>

                          <TD className={`px-3 font-mono text-center ${tdBorder}`}>
  {editId === r.id ? (
    <input
      dir="ltr"
      maxLength={3}
      className="w-full max-w-[140px] rounded-xl px-2 py-0.5 text-center
               border border-black/15 dark:border-neutral-700
               bg-white text-black placeholder-black/40
               dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400"
      value={editCode}
      onChange={onEditCodeChange}
      placeholder="123"
      autoFocus
    />
  ) : (
    <span className="inline-flex w-full justify-center" dir="ltr">
      {r.code || "—"}
    </span>
  )}
</TD>


                          <TD className={`px-3 ${tdBorder}`}>
                            {editId === r.id ? (
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

                          <TD className={`px-3 ${tdBorder}`}>
                            {editId === r.id ? (
                              <div className="flex items-center justify-center gap-2">
                                <RowActionIconBtn action="save" onClick={saveInline} size={36} iconSize={16} />
                                <RowActionIconBtn action="cancel" onClick={cancelEdit} size={36} iconSize={15} />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <RowActionIconBtn action="edit" onClick={() => beginEdit(r)} size={36} iconSize={16} />
                                <RowActionIconBtn
                                  action="delete"
                                  onClick={() => del(r)}
                                  size={36}
                                  iconSize={17}
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

            {/* Pagination bar */}
            <div className="border-t border-black/10 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-black/70 dark:text-neutral-300">تعداد در هر صفحه:</span>
                  <select
                    className="h-9 rounded-xl px-3 bg-white text-black border border-black/15
                               dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 outline-none"
                    value={pageSize}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 10;
                      setPageSize(v);
                      setPageIndex(0);
                    }}
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>
                        {toFaDigits(n)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-black/70 dark:text-neutral-300">
                    {toFaDigits(total === 0 ? 0 : start + 1)}–{toFaDigits(end)} از {toFaDigits(total)}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                    disabled={safePageIndex <= 0}
                    className="h-9 w-9 rounded-xl grid place-items-center border border-black/15 bg-white text-black
                               hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed
                               dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-white/10"
                    aria-label="صفحه قبل"
                    title="صفحه قبل"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={safePageIndex >= pageCount - 1}
                    className="h-9 w-9 rounded-xl grid place-items-center border border-black/15 bg-white text-black
                               hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed
                               dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-white/10"
                    aria-label="صفحه بعد"
                    title="صفحه بعد"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TableWrap>
    </Card>
  );
}

export default ProjectsPage;
