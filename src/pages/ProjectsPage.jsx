// src/pages/ProjectsPage.jsx
import React from "react";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TR, TD, TH } from "../components/ui/Table.jsx";

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

  // تبدیل ارقام فارسی/عربی به لاتین
  const toEnDigits = (s) =>
    String(s || "")
      .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
      .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

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

  // کنترل ورودی کد (افزودن)
  const onAddCodeChange = (e) => {
    const v = toEnDigits(e.target.value).replace(/[^\d]/g, "");
    setCodeInput(v);
  };

  // کنترل ورودی کد (ویرایش درون‌ردیفی)
  const onEditCodeChange = (e) => {
    const v = toEnDigits(e.target.value).replace(/[^\d]/g, "");
    setEditCode(v);
  };

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
                         bg-black text-white disabled:opacity-50
                         dark:bg-neutral-100 dark:text-neutral-900"
              aria-label="افزودن"
              title="افزودن"
            >
              <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5 invert dark:invert" />
            </button>
          </div>
        </div>

        {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
      </form>

      {/* جدول */}
      <TableWrap>
        <div className="bg-white text-black rounded-2xl border border-black/10 overflow-hidden dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
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
              ) : sortedRows.length === 0 ? (
                <TR className="bg-white dark:bg-transparent">
                  <TD colSpan={4} className="text-center text-black/60 dark:text-neutral-400 py-4">
                    موردی ثبت نشده.
                  </TD>
                </TR>
              ) : (
                sortedRows.map((r, idx) => {
                  const isLast = idx === sortedRows.length - 1;
                  const tdBorder = isLast ? "" : "border-b border-neutral-300 dark:border-neutral-700";

                  return (
                    <TR key={r.id}>
                      <TD className={`px-3 ${tdBorder}`}>{idx + 1}</TD>

                      <TD className={`px-3 font-mono ltr ${tdBorder}`}>
                        {editId === r.id ? (
                          <input
                            dir="ltr"
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
                          r.code || "—"
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
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                saveInline();
                              }}
                              className="h-10 w-10 grid place-items-center bg-transparent hover:opacity-80 active:opacity-70 transition"
                              aria-label="ذخیره"
                              title="ذخیره"
                            >
                              <img src="/images/icons/check.svg" alt="" className="w-[18px] h-[18px] dark:invert" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                cancelEdit();
                              }}
                              className="h-10 w-10 grid place-items-center bg-transparent hover:opacity-80 active:opacity-70 transition"
                              aria-label="انصراف"
                              title="انصراف"
                            >
                              <img
                                src="/images/icons/bastan.svg"
                                alt=""
                                className="w-[16px] h-[16px] dark:invert"
                                style={{
                                  filter:
                                    "brightness(0) saturate(100%) invert(25%) sepia(95%) saturate(4870%) hue-rotate(355deg) brightness(95%) contrast(110%)",
                                }}
                              />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                beginEdit(r);
                              }}
                              className="h-10 w-10 grid place-items-center bg-transparent hover:opacity-80 active:opacity-70 transition"
                              aria-label="ویرایش"
                              title="ویرایش"
                            >
                              <img src="/images/icons/pencil.svg" alt="" className="w-[18px] h-[18px] dark:invert" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                del(r);
                              }}
                              className="h-10 w-10 grid place-items-center bg-transparent hover:opacity-80 active:opacity-70 transition"
                              aria-label="حذف"
                              title="حذف"
                            >
                              <img
                                src="/images/icons/hazf.svg"
                                alt=""
                                className="w-[19px] h-[19px]"
                                style={{
                                  filter:
                                    "brightness(0) saturate(100%) invert(25%) sepia(95%) saturate(4870%) hue-rotate(355deg) brightness(95%) contrast(110%)",
                                }}
                              />
                            </button>
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
      </TableWrap>
    </Card>
  );
}

export default ProjectsPage;
