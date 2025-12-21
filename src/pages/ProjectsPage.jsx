// src/pages/ProjectsPage.jsx
import React from "react";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TR, TD, TH } from "../components/ui/Table.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";

function ProjectsPage() {
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

  const [rows, setRows] = React.useState([]);
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const [codeInput, setCodeInput] = React.useState("");
  const [nameInput, setNameInput] = React.useState("");

  const [editId, setEditId] = React.useState(null);
  const [editCode, setEditCode] = React.useState("");
  const [editName, setEditName] = React.useState("");

  const [codeSortDir, setCodeSortDir] = React.useState("asc");

  // pagination
  const [pageSize, setPageSize] = React.useState(20);
  const [page, setPage] = React.useState(0);

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

  const onAddCodeChange = (e) => {
    const v = toEnDigits(e.target.value).replace(/[^\d]/g, "").slice(0, 3);
    setCodeInput(v);
  };

  const onEditCodeChange = (e) => {
    const v = toEnDigits(e.target.value).replace(/[^\d]/g, "").slice(0, 3);
    setEditCode(v);
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
          <div className="bg-white text-black dark:bg-neutral-900 dark:text-neutral-100">
            <div className="px-[15px] pb-4">
              <div className="rounded-2xl border border-black/10 overflow-hidden bg-white text-black dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
                {/* ✅ اسکرول فقط داخل جدول */}
                <div className="max-h-[520px] overflow-auto">
                  <table
                    className="w-full text-sm [&_th]:text-center [&_td]:text-center [&_th]:py-0.5 [&_td]:py-0.5"
                    dir="rtl"
                  >
                    <THead>
                      <tr className="bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700">
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
                              <TD className={`px-3 ${tdBorder}`}>{startIdx + idx + 1}</TD>

                              <TD className={`px-3 font-mono ${tdBorder}`}>
                                {editId === r.id ? (
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
                                    <RowActionIconBtn
                                      action="save"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        saveInline();
                                      }}
                                      size={36}
                                      iconSize={16}
                                    />
                                    <RowActionIconBtn
                                      action="cancel"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        cancelEdit();
                                      }}
                                      size={36}
                                      iconSize={14}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <RowActionIconBtn
                                      action="edit"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        beginEdit(r);
                                      }}
                                      size={36}
                                      iconSize={18}
                                    />
                                    <RowActionIconBtn
                                      action="delete"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        del(r);
                                      }}
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
