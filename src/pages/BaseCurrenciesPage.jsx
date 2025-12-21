// ارز ها
// src/pages/BaseCurrenciesPage.jsx
import React from "react";
import Shell from "../components/layout/Shell.jsx";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";
import { Btn, PrimaryBtn, DangerBtn } from "../components/ui/Button.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";

function BaseCurrenciesPage() {
  const [types, setTypes] = React.useState([]);
  const [sources, setSources] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // فرم "نوع ارز"
  const [typeTitle, setTypeTitle] = React.useState("");
  const [savingType, setSavingType] = React.useState(false);
  const [errType, setErrType] = React.useState("");
  const typeInputRef = React.useRef(null);

  // فرم "منشأ ارز"
  const [srcTitle, setSrcTitle] = React.useState("");
  const [savingSrc, setSavingSrc] = React.useState(false);
  const [errSrc, setErrSrc] = React.useState("");
  const srcInputRef = React.useRef(null);

  // ادیت
  const [editRow, setEditRow] = React.useState({
    kind: null,
    id: null,
    title: "",
  });

  // مرتب‌سازی ستون «عنوان»
  const [typeSortDir, setTypeSortDir] = React.useState("asc"); // asc | desc
  const [srcSortDir, setSrcSortDir] = React.useState("asc"); // asc | desc

  const api = async (path, opt = {}) => {
    const res = await fetch("/api" + path, {
      credentials: "include",
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

  const keepFocus = (ref) => {
    requestAnimationFrame(() => {
      if (ref?.current) {
        const len = ref.current.value.length;
        ref.current.focus();
        ref.current.setSelectionRange(len, len);
      }
    });
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        api("/base/currencies/types").catch((e) => {
          setErrType(String(e.message || e));
          return { items: [] };
        }),
        api("/base/currencies/sources").catch((e) => {
          setErrSrc(String(e.message || e));
          return { items: [] };
        }),
      ]);
      setTypes(t.items || []);
      setSources(s.items || []);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadAll().catch(console.error);
  }, []);

  // کمکی: نرمال‌سازی عنوان برای مقایسه تکراری
  const norm = (s = "") => String(s).trim().replace(/\s+/g, " ").toLowerCase();

  // افزودن نوع ارز
  const addType = async (e) => {
    e?.preventDefault();
    setErrType("");
    const title = (typeTitle || "").trim();
    if (!title) {
      setErrType("نوع ارز را بنویسید");
      return;
    }

    const exists = (types || []).some((r) => norm(r.title || r.name || "") === norm(title));
    if (exists) {
      setErrType("این نوع ارز قبلاً ثبت شده است.");
      return;
    }

    const tempId = "tmp-" + Math.random().toString(36).slice(2);
    const tempRow = { id: tempId, title };
    setTypes((prev) => [tempRow, ...prev]);
    setTypeTitle("");
    keepFocus(typeInputRef);

    setSavingType(true);
    try {
      const resp = await api("/base/currencies/types", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      const realId = (resp && (resp.id ?? resp.lastId ?? resp.insertId)) || null;
      if (realId) {
        setTypes((prev) => prev.map((r) => (r.id === tempId ? { ...r, id: realId } : r)));
      } else {
        loadAll().catch(() => {});
      }
    } catch (ex) {
      setTypes((prev) => prev.filter((r) => r.id !== tempId));
      setTypeTitle(title);
      keepFocus(typeInputRef);
      setErrType(ex.message || "خطا در ثبت نوع ارز");
    } finally {
      setSavingType(false);
    }
  };

  // افزودن منشأ ارز
  const addSource = async (e) => {
    e?.preventDefault();
    setErrSrc("");
    const title = (srcTitle || "").trim();
    if (!title) {
      setErrSrc("منشأ ارز را بنویسید");
      return;
    }

    const exists = (sources || []).some((r) => norm(r.title || r.name || "") === norm(title));
    if (exists) {
      setErrSrc("این منشأ ارز قبلاً ثبت شده است.");
      return;
    }

    const tempId = "tmp-" + Math.random().toString(36).slice(2);
    const tempRow = { id: tempId, title };
    setSources((prev) => [tempRow, ...prev]);
    setSrcTitle("");
    keepFocus(srcInputRef);

    setSavingSrc(true);
    try {
      const resp = await api("/base/currencies/sources", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      const realId = (resp && (resp.id ?? resp.lastId ?? resp.insertId)) || null;
      if (realId) {
        setSources((prev) => prev.map((r) => (r.id === tempId ? { ...r, id: realId } : r)));
      } else {
        loadAll().catch(() => {});
      }
    } catch (ex) {
      setSources((prev) => prev.filter((r) => r.id !== tempId));
      setSrcTitle(title);
      keepFocus(srcInputRef);
      setErrSrc(ex.message || "خطا در ثبت منشأ ارز");
    } finally {
      setSavingSrc(false);
    }
  };

  // حذف ردیف
  const removeRow = async (kind, id) => {
    if (!confirm("حذف این ردیف؟")) return;

    if (typeof id === "string" && id.startsWith("tmp-")) {
      if (kind === "type") setTypes((prev) => prev.filter((r) => r.id !== id));
      else setSources((prev) => prev.filter((r) => r.id !== id));
      return;
    }

    const path = kind === "type" ? `/base/currencies/types` : `/base/currencies/sources`;

    try {
      await api(path, {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      if (kind === "type") setTypes((prev) => prev.filter((r) => r.id !== id));
      else setSources((prev) => prev.filter((r) => r.id !== id));
    } catch (ex) {
      alert(ex.message || "خطا در حذف");
    }
  };

  const startEdit = (kind, row) => setEditRow({ kind, id: row.id, title: row.title || "" });
  const cancelEdit = () => setEditRow({ kind: null, id: null, title: "" });

  const saveEdit = async () => {
    if (!editRow.id || !editRow.kind) return;

    if (typeof editRow.id === "string" && editRow.id.startsWith("tmp-")) {
      if (editRow.kind === "type") {
        setTypes((prev) => prev.map((r) => (r.id === editRow.id ? { ...r, title: editRow.title } : r)));
      } else {
        setSources((prev) => prev.map((r) => (r.id === editRow.id ? { ...r, title: editRow.title } : r)));
      }
      cancelEdit();
      return;
    }

    const path = editRow.kind === "type" ? `/base/currencies/types` : `/base/currencies/sources`;

    try {
      await api(path, {
        method: "PATCH",
        body: JSON.stringify({
          id: editRow.id,
          title: (editRow.title || "").trim(),
        }),
      });

      if (editRow.kind === "type") {
        setTypes((prev) => prev.map((r) => (r.id === editRow.id ? { ...r, title: editRow.title } : r)));
      } else {
        setSources((prev) => prev.map((r) => (r.id === editRow.id ? { ...r, title: editRow.title } : r)));
      }
      cancelEdit();
    } catch (ex) {
      alert(ex.message || "خطا در ویرایش");
    }
  };

  const sortedTypes = React.useMemo(() => {
    const arr = Array.isArray(types) ? [...types] : [];
    arr.sort((a, b) => {
      const at = String(a.title || a.name || "");
      const bt = String(b.title || b.name || "");
      const cmp = at.localeCompare(bt, "fa", { numeric: true, sensitivity: "base" });
      return typeSortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [types, typeSortDir]);

  const sortedSources = React.useMemo(() => {
    const arr = Array.isArray(sources) ? [...sources] : [];
    arr.sort((a, b) => {
      const at = String(a.title || a.name || "");
      const bt = String(b.title || b.name || "");
      const cmp = at.localeCompare(bt, "fa", { numeric: true, sensitivity: "base" });
      return srcSortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [sources, srcSortDir]);

  const FormRow = ({ placeholder, value, onChange, onSubmit, inputRef, error, adding }) => (
    <form onSubmit={onSubmit} dir="rtl" className="grid grid-cols-[1fr_auto] gap-3 items-center">
      <input
        ref={inputRef}
        className="h-10 w-full rounded-2xl px-3
                   bg-white text-black placeholder-black/40 border border-black/15
                   outline-none focus:ring-2 focus:ring-black/10
                   dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          keepFocus(inputRef);
        }}
        placeholder={placeholder}
      />
      <div className="justify-self-start">
        <button
          type="submit"
          disabled={adding}
          className="h-10 w-10 grid place-items-center rounded-xl
                     bg-white text-black border border-black/15 hover:bg-black/5 transition disabled:opacity-50
                     dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-200/20"
          aria-label="افزودن"
          title="افزودن"
        >
          <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5" />
        </button>
      </div>
      {!!error && <div className="col-span-2 text-sm text-red-600 dark:text-red-400">{error}</div>}
    </form>
  );

  const SimpleTable = ({ rows, kind, sortDir, onToggleSort }) => (
    <TableWrap>
      <div className="bg-white text-black overflow-hidden dark:bg-neutral-900 dark:text-neutral-100">
        <table className="w-full text-sm [&_th]:text-center [&_td]:text-center [&_th]:py-0.5 [&_td]:py-0.5" dir="rtl">
          <THead>
            <tr className="bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700">
              <TH className="w-20 sm:w-24 !text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
                #
              </TH>

              <TH className="!text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
                <div className="flex items-center justify-center gap-2">
                  <span>عنوان</span>
                  <button
                    type="button"
                    onClick={onToggleSort}
                    className="h-7 w-7 inline-grid place-items-center bg-transparent p-0
                               text-neutral-500 hover:text-neutral-600 active:text-neutral-700
                               dark:text-neutral-400 dark:hover:text-neutral-300"
                    title="مرتب‌سازی عنوان"
                    aria-label="مرتب‌سازی عنوان"
                  >
                    <svg
                      className={`w-[14px] h-[14px] transition-transform ${sortDir === "asc" ? "rotate-180" : ""}`}
                      focusable="false"
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"></path>
                    </svg>
                  </button>
                </div>
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
                <TD colSpan={3} className="text-center text-black/60 dark:text-neutral-400 py-3">
                  در حال بارگذاری…
                </TD>
              </TR>
            ) : (rows || []).length === 0 ? (
              <TR className="bg-white dark:bg-transparent">
                <TD colSpan={3} className="text-center text-black/60 dark:text-neutral-400 py-3">
                  موردی ثبت نشده.
                </TD>
              </TR>
            ) : (
              rows.map((r, idx) => {
                const isLast = idx === rows.length - 1;
                const tdBorder = isLast ? "" : "border-b border-neutral-300 dark:border-neutral-700";

                return (
                  <TR key={`${kind}-${r.id}`}>
                    <TD className={`px-3 ${tdBorder}`}>{idx + 1}</TD>

                    <TD className={`px-3 ${tdBorder}`}>
                      {editRow.kind === kind && editRow.id === r.id ? (
                        <input
                          className="w-full max-w-md rounded-xl px-2 py-0.5 text-center
                                     border border-black/15 dark:border-neutral-700
                                     bg-white text-black placeholder-black/40
                                     dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400"
                          value={editRow.title}
                          onChange={(e) =>
                            setEditRow({
                              ...editRow,
                              title: e.target.value,
                            })
                          }
                          autoFocus
                        />
                      ) : (
                        r.title || "—"
                      )}
                    </TD>

                    <TD className={`px-3 ${tdBorder}`}>
                      {editRow.kind === kind && editRow.id === r.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <RowActionIconBtn action="save" onClick={saveEdit} size={36} iconSize={16} />
                          <RowActionIconBtn action="cancel" onClick={cancelEdit} size={36} iconSize={15} />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <RowActionIconBtn action="edit" onClick={() => startEdit(kind, r)} size={36} iconSize={16} />
                          <RowActionIconBtn action="delete" onClick={() => removeRow(kind, r.id)} size={36} iconSize={17} />
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
  );

  // باکس یکپارچه: فرم + جدول (بدون خط جداکننده/بوردر پایین فرم)
  const Section = ({ title, form, table }) => (
    <div
      className="rounded-2xl border border-black/10 bg-white overflow-hidden
                 dark:bg-neutral-900 dark:border-neutral-800"
      dir="rtl"
    >
      <div className="p-4">
        <div className="mb-3 font-medium text-black dark:text-neutral-200">{title}</div>
        {form}
      </div>

      {/* اینجا قبلاً border-t داشت؛ حذف شد تا بوردر پایین فرم دیده نشه */}
      {table}
    </div>
  );

  return (
    <>
      <Card className="rounded-2xl border bg-white text-black border-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        <div className="mb-4 text-base md:text-lg">
          <span className="text-black/70 dark:text-neutral-300">اطلاعات پایه</span>
          <span className="mx-2 text-black/50 dark:text-neutral-400">›</span>
          <span className="font-semibold text-black dark:text-neutral-100">ارزها</span>
        </div>

        <div className="mb-6">
          <Section
            title="نوع ارز"
            form={
              <FormRow
                placeholder="نوع ارز…"
                value={typeTitle}
                onChange={setTypeTitle}
                onSubmit={addType}
                inputRef={typeInputRef}
                error={errType}
                adding={savingType}
              />
            }
            table={
              <SimpleTable
                rows={sortedTypes}
                kind="type"
                sortDir={typeSortDir}
                onToggleSort={() => setTypeSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              />
            }
          />
        </div>

        <Section
          title="منشأ ارز"
          form={
            <FormRow
              placeholder="منشأ ارز…"
              value={srcTitle}
              onChange={setSrcTitle}
              onSubmit={addSource}
              inputRef={srcInputRef}
              error={errSrc}
              adding={savingSrc}
            />
          }
          table={
            <SimpleTable
              rows={sortedSources}
              kind="source"
              sortDir={srcSortDir}
              onToggleSort={() => setSrcSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            />
          }
        />
      </Card>
    </>
  );
}

export default BaseCurrenciesPage;
