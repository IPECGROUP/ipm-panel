// src/pages/ProjectsPage.jsx
import React from "react";
import Card from "../components/ui/Card.jsx";
import {
  TableWrap,
  THead,
  TR,
  TD,
  TH,
} from "../components/ui/Table.jsx";

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

  // ===== load from backend =====
  const loadAll = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await api("/projects");
      setRows(Array.isArray(data.items) ? data.items : []);
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
        setRows((prev) => [...prev, newItem]);
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
        prev.map((r) =>
          r.id === editId ? { ...r, code, name } : r
        )
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
        <span className="text-black/70 dark:text-neutral-300">
          اطلاعات پایه
        </span>
        <span className="mx-2 text-black/50 dark:text-neutral-400">
          ›
        </span>
        <span className="font-semibold text-black dark:text-neutral-100">
          پروژه‌ها
        </span>
      </div>

      {/* فرم افزودن (هم‌راستا با فیلدها) */}
      <form
        onSubmit={submitAdd}
        className="border rounded-2xl p-4 md:p-5 mb-5 bg-white border-black/10 
                   dark:bg-neutral-900 dark:border-neutral-800"
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] items-end gap-3">
          <div className="flex-1 min-w-[220px] flex flex-col gap-1">
            <label className="text-sm text-black/70 dark:text-neutral-300">
              نام پروژه
            </label>
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
            <label className="text-sm text-black/70 dark:text-neutral-300">
              کد پروژه
            </label>
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
                         bg-black text-white 
                         dark:bg-neutral-100 dark:text-neutral-900"
              aria-label="افزودن"
            >
              <img
                src="/images/icons/afzodan.svg"
                alt=""
                className="w-5 h-5 invert dark:invert"
              />
            </button>
          </div>
        </div>

        {err && (
          <div className="text-sm text-red-600 mt-2">{err}</div>
        )}
      </form>

      {/* جدول */}
      <TableWrap>
        <table
          className="w-full text-sm text-center bg-white text-black 
                     dark:bg-neutral-900 dark:text-neutral-200 
                     [&_th]:text-center [&_td]:text-center"
          dir="rtl"
        >
          <THead>
            <tr className="bg-black/5 text-black border-y border-black/10 
                           dark:bg-white/5 dark:text-neutral-100 dark:border-neutral-700">
              <TH className="!text-center !font-semibold w-16 !text-black dark:!text-neutral-100">
                #
              </TH>
              <TH className="!text-center !font-semibold w-56 !text-black dark:!text-neutral-100">
                <div className="flex items-center justify-center gap-2">
                  <span>کد</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCodeSortDir((d) =>
                        d === "asc" ? "desc" : "asc"
                      )
                    }
                    className="rounded-lg px-2 py-1 ring-1 ring-black/15 hover:bg-black/5 
                               dark:ring-neutral-800 dark:hover:bg-white/10"
                    title="مرتب‌سازی کد"
                    aria-label="مرتب‌سازی کد"
                  >
                    {codeSortDir === "desc" ? (
                      <img
                        src="/images/icons/bozorgbekochik.svg"
                        alt=""
                        className="w-5 h-5 dark:invert"
                      />
                    ) : (
                      <img
                        src="/images/icons/kochikbebozorg.svg"
                        alt=""
                        className="w-5 h-5 dark:invert"
                      />
                    )}
                  </button>
                </div>
              </TH>
              <TH className="!text-center !font-semibold !text-black dark:!text-neutral-100">
                نام پروژه
              </TH>
              <TH className="!text-center !font-semibold w-40 !text-black dark:!text-neutral-100">
                اقدامات
              </TH>
            </tr>
          </THead>

          <tbody
            className="[&_td]:text-black dark:[&_td]:text-neutral-100 
                       divide-y divide-black/10 dark:divide-neutral-800"
          >
            {loading ? (
              <TR>
                <TD
                  colSpan={4}
                  className="text-center text-black/60 dark:text-neutral-400 py-4 bg-black/[0.02] dark:bg-transparent"
                >
                  در حال بارگذاری…
                </TD>
              </TR>
            ) : sortedRows.length === 0 ? (
              <TR>
                <TD
                  colSpan={4}
                  className="text-center text-black/60 dark:text-neutral-400 py-4 bg-black/[0.02] dark:bg-transparent"
                >
                  موردی ثبت نشده.
                </TD>
              </TR>
            ) : (
              sortedRows.map((r, idx) => (
                <TR
                  key={r.id}
                  className="odd:bg-black/[0.02] even:bg-black/[0.04] hover:bg-black/[0.06] transition-colors
                             dark:odd:bg-white/5 dark:even:bg-white/10 dark:hover:bg-white/15"
                >
                  <TD className="px-3 py-3">{idx + 1}</TD>

                  {/* کد پروژه (نمایش/ویرایش درون‌ردیفی) */}
                  <TD className="px-3 py-3 font-mono ltr text-center">
                    {editId === r.id ? (
                      <input
                        className="w-full max-w-[140px] rounded-xl px-2 py-2 
                                   bg-white text-black border border-black/15 outline-none 
                                   font-mono ltr text-center placeholder-black/40
                                   dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                        value={editCode}
                        onChange={onEditCodeChange}
                        placeholder="123"
                      />
                    ) : (
                      r.code || "—"
                    )}
                  </TD>

                  {/* نام پروژه (نمایش/ویرایش درون‌ردیفی) */}
                  <TD className="px-3 py-3 truncate">
                    {editId === r.id ? (
                      <input
                        className="w-full max-w-[260px] rounded-xl px-2 py-2 
                                   bg-white text-black border border-black/15 outline-none 
                                   placeholder-black/40
                                   dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                        value={editName}
                        onChange={(e) =>
                          setEditName(e.target.value)
                        }
                        placeholder="نام…"
                      />
                    ) : (
                      r.name || "—"
                    )}
                  </TD>

                  {/* اکشن‌ها */}
                  <TD className="px-3 py-3">
                    {editId === r.id ? (
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={saveInline}
                          className="px-4 py-2 rounded-xl bg-black text-white 
                                     dark:bg-neutral-100 dark:text-neutral-900"
                        >
                          ذخیره
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 rounded-xl ring-1 ring-black/15 text-black hover:bg-black/5 transition
                                     dark:ring-neutral-800 dark:text-neutral-100 dark:hover:bg-white/10"
                        >
                          انصراف
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => beginEdit(r)}
                          className="px-4 py-2 rounded-xl ring-1 ring-black/15 text-black hover:bg-black/5 transition
                                     dark:ring-neutral-800 dark:text-neutral-100 dark:hover:bg-white/10"
                          aria-label="ویرایش"
                        >
                          <img
                            src="/images/icons/pencil.svg"
                            alt=""
                            className="w-5 h-5 dark:invert"
                          />
                        </button>
                        <button
                          onClick={() => del(r)}
                          className="px-4 py-2 rounded-xl border border-red-500 text-red-600 
                                     hover:bg-red-600 hover:text-white transition
                                     dark:border-red-600 dark:text-red-400"
                          aria-label="حذف"
                        >
                          <img
                            src="/images/icons/hazf.svg"
                            alt=""
                            className="w-5 h-5 dark:invert"
                          />
                        </button>
                      </div>
                    )}
                  </TD>
                </TR>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>
    </Card>
  );
}

export default ProjectsPage;
