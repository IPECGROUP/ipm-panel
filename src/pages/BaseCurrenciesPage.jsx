// src/pages/BaseCurrenciesPage.jsx
import React from "react";
import Shell from "../components/layout/Shell.jsx";
import Card from "../components/ui/Card.jsx";
import {
  TableWrap,
  THead,
  TH,
  TR,
  TD,
} from "../components/ui/Table.jsx";
import {
  Btn,
  PrimaryBtn,
  DangerBtn,
} from "../components/ui/Button.jsx";

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
    if (!res.ok)
      throw new Error(data?.error || data?.message || "request_failed");
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
  const norm = (s = "") =>
    String(s).trim().replace(/\s+/g, " ").toLowerCase();

  // افزودن نوع ارز
  const addType = async (e) => {
    e?.preventDefault();
    setErrType("");
    const title = (typeTitle || "").trim();
    if (!title) {
      setErrType("نوع ارز را بنویسید");
      return;
    }

    const exists = (types || []).some(
      (r) => norm(r.title || r.name || "") === norm(title)
    );
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
      const realId =
        (resp && (resp.id ?? resp.lastId ?? resp.insertId)) || null;
      if (realId) {
        setTypes((prev) =>
          prev.map((r) => (r.id === tempId ? { ...r, id: realId } : r))
        );
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

    const exists = (sources || []).some(
      (r) => norm(r.title || r.name || "") === norm(title)
    );
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
      const realId =
        (resp && (resp.id ?? resp.lastId ?? resp.insertId)) || null;
      if (realId) {
        setSources((prev) =>
          prev.map((r) => (r.id === tempId ? { ...r, id: realId } : r))
        );
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

  // حذف ردیف (با id در body، مشابه TagsPage)
  const removeRow = async (kind, id) => {
    if (!confirm("حذف این ردیف؟")) return;

    // اگر هنوز temp هست (tmp-...)، فقط لوکالی حذف کن
    if (typeof id === "string" && id.startsWith("tmp-")) {
      if (kind === "type") {
        setTypes((prev) => prev.filter((r) => r.id !== id));
      } else {
        setSources((prev) => prev.filter((r) => r.id !== id));
      }
      return;
    }

    const path =
      kind === "type"
        ? `/base/currencies/types`
        : `/base/currencies/sources`;

    try {
      await api(path, {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      if (kind === "type")
        setTypes((prev) => prev.filter((r) => r.id !== id));
      else setSources((prev) => prev.filter((r) => r.id !== id));
    } catch (ex) {
      alert(ex.message || "خطا در حذف");
    }
  };

  const startEdit = (kind, row) =>
    setEditRow({ kind, id: row.id, title: row.title || "" });

  const cancelEdit = () =>
    setEditRow({ kind: null, id: null, title: "" });

  // ویرایش با id داخل body (نه در URL)
  const saveEdit = async () => {
    if (!editRow.id || !editRow.kind) return;

    // اگر temp-row است، فقط لوکالی آپدیت کن
    if (
      typeof editRow.id === "string" &&
      editRow.id.startsWith("tmp-")
    ) {
      if (editRow.kind === "type") {
        setTypes((prev) =>
          prev.map((r) =>
            r.id === editRow.id ? { ...r, title: editRow.title } : r
          )
        );
      } else {
        setSources((prev) =>
          prev.map((r) =>
            r.id === editRow.id ? { ...r, title: editRow.title } : r
          )
        );
      }
      cancelEdit();
      return;
    }

    const path =
      editRow.kind === "type"
        ? `/base/currencies/types`
        : `/base/currencies/sources`;

    try {
      await api(path, {
        method: "PATCH",
        body: JSON.stringify({
          id: editRow.id,
          title: (editRow.title || "").trim(),
        }),
      });

      if (editRow.kind === "type") {
        setTypes((prev) =>
          prev.map((r) =>
            r.id === editRow.id ? { ...r, title: editRow.title } : r
          )
        );
      } else {
        setSources((prev) =>
          prev.map((r) =>
            r.id === editRow.id ? { ...r, title: editRow.title } : r
          )
        );
      }
      cancelEdit();
    } catch (ex) {
      alert(ex.message || "خطا در ویرایش");
    }
  };

  // لیست‌های مرتب‌شده
  const sortedTypes = React.useMemo(() => {
    const arr = Array.isArray(types) ? [...types] : [];
    arr.sort((a, b) => {
      const at = String(a.title || a.name || "");
      const bt = String(b.title || b.name || "");
      const cmp = at.localeCompare(bt, "fa", {
        numeric: true,
        sensitivity: "base",
      });
      return typeSortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [types, typeSortDir]);

  const sortedSources = React.useMemo(() => {
    const arr = Array.isArray(sources) ? [...sources] : [];
    arr.sort((a, b) => {
      const at = String(a.title || a.name || "");
      const bt = String(b.title || b.name || "");
      const cmp = at.localeCompare(bt, "fa", {
        numeric: true,
        sensitivity: "base",
      });
      return srcSortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [sources, srcSortDir]);

  // فرم عمومی (در یک ردیف و هم‌ارتفاع با دکمه + آیکن ۲۰px)
  const FormRow = ({
    placeholder,
    value,
    onChange,
    onSubmit,
    inputRef,
    error,
  }) => (
    <form
      onSubmit={onSubmit}
      dir="rtl"
      className="grid grid-cols-[1fr_auto] gap-3 items-center"
    >
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
          className="h-10 w-10 grid place-items-center rounded-xl
                     bg-black text-white hover:opacity-90 transition disabled:opacity-50
                     dark:bg-neutral-100 dark:text-neutral-900"
          aria-label="افزودن"
        >
          <img
            src="/images/icons/afzodan.svg"
            alt=""
            className="w-5 h-5 invert dark:invert-0"
          />
        </button>
      </div>
      {!!error && (
        <div className="col-span-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </form>
  );

  // جدول (بوردر ظریف، وسط‌چین، آیکن‌ها ۲۰px)
  const SimpleTable = ({ rows, kind, sortDir, onToggleSort }) => (
    <TableWrap>
      <div
        className="bg-white text-black rounded-2xl border border-black/10 overflow-hidden
                      dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
      >
        <table
          className="w-full text-sm text-center [&_th]:text-center [&_td]:text-center"
          dir="rtl"
        >
          <THead>
            <tr
              className="bg-black/5 text-black border-y border-black/10
                           dark:bg-white/5 dark:text-neutral-100 dark:border-neutral-700"
            >
              <TH className="w-24 !text-center !font-semibold !text-black dark:!text-neutral-100">
                #
              </TH>
              <TH className="!text-center !font-semibold !text-black dark:!text-neutral-100">
                <div className="flex items-center justify-center gap-2">
                  <span>عنوان</span>
                  <button
                    type="button"
                    onClick={onToggleSort}
                    className="rounded-lg px-2 py-1 text-xs ring-1 ring-black/15 hover:bg-black/5
                               dark:ring-neutral-800 dark:hover:bg سفید/10"
                    title="مرتب‌سازی عنوان"
                    aria-label="مرتب‌سازی"
                  >
                    {sortDir === "desc" ? (
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
              <TH className="w-48 !text-center !font-semibold !text-black dark:!text-neutral-100">
                اقدامات
              </TH>
            </tr>
          </THead>

          <tbody className="[&_td]:text-black dark:[&_td]:text-neutral-100">
            {loading ? (
              <TR>
                <TD
                  colSpan={3}
                  className="text-center text-black/60 dark:text-neutral-400 py-4"
                >
                  در حال بارگذاری…
                </TD>
              </TR>
            ) : (rows || []).length === 0 ? (
              <TR>
                <TD
                  colSpan={3}
                  className="text-center text-black/60 dark:text-neutral-400 py-4 bg-black/[0.02] dark:bg-transparent"
                >
                  موردی ثبت نشده.
                </TD>
              </TR>
            ) : (
              rows.map((r, idx) => (
                <TR
                  key={`${kind}-${r.id}`}
                  className="odd:bg-black/[0.02] even:bg-black/[0.04] hover:bg-black/[0.06] transition-colors
                             dark:odd:bg-white/5 dark:even:bg-white/10 dark:hover:bg-white/15 border-t border-black/10 dark:border-neutral-800"
                >
                  <TD className="px-3 py-3">{idx + 1}</TD>
                  <TD className="px-3 py-3">
                    {editRow.kind === kind && editRow.id === r.id ? (
                      <input
                        className="w-full max-w-md rounded-xl px-2 py-2 text-center
                                   bg-white text-black border border-black/15 outline-none
                                   focus:ring-2 focus:ring-black/10
                                   dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
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
                  <TD className="px-3 py-3">
                    {editRow.kind === kind && editRow.id === r.id ? (
                      <div className="inline-flex items-center gap-2">
                        <PrimaryBtn
                          onClick={saveEdit}
                          className="!h-10 !px-4 !rounded-xl !bg-neutral-900 !text-white !ring-1 !ring-black/15 hover:!bg-black
                                     dark:!bg-neutral-100 dark:!text-neutral-900 dark:!ring-neutral-700 dark:hover:!bg-neutral-200"
                        >
                          ذخیره
                        </PrimaryBtn>
                        <Btn
                          onClick={cancelEdit}
                          className="!h-10 !px-4 !rounded-xl !bg-white !text-neutral-900 !ring-1 !ring-neutral-300 hover:!bg-neutral-100
                                     dark:!bg-transparent dark:!text-neutral-100 dark:!ring-neutral-700 dark:hover:!bg-white/10"
                        >
                          انصراف
                        </Btn>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2">
                        <Btn
                          onClick={() => startEdit(kind, r)}
                          className="!h-10 !w-10 !rounded-xl !bg-white !text-neutral-900 !ring-1 !ring-neutral-300 hover:!bg-neutral-100
                                     dark:!bg-transparent dark:!text-neutral-100 dark:!ring-neutral-700 dark:hover:!bg-white/10 grid place-items-center"
                          aria-label="ویرایش"
                          title="ویرایش"
                        >
                          <img
                            src="/images/icons/pencil.svg"
                            alt=""
                            className="w-5 h-5 dark:invert"
                          />
                        </Btn>
                        <DangerBtn
                          onClick={() => removeRow(kind, r.id)}
                          className="!h-10 !w-10 !rounded-xl !bg-white !text-red-600 !ring-1 !ring-red-500 hover:!bg-red-50
                                     dark:!bg-transparent dark:!text-red-300 dark:!ring-red-400/60 dark:hover:!bg-white/10 grid place-items-center"
                          aria-label="حذف"
                          title="حذف"
                        >
                          <img
                            src="/images/icons/hazf.svg"
                            alt=""
                            className="w-5 h-5 dark:invert"
                          />
                        </DangerBtn>
                      </div>
                    )}
                  </TD>
                </TR>
              ))
            )}
          </tbody>
        </table>
      </div>
    </TableWrap>
  );

  return (
    <>
      <Card className="rounded-2xl border bg-white text-black border-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        {/* نوار مسیر */}
        <div className="mb-4 text-base md:text-lg">
          <span className="text-black/70 dark:text-neutral-300">
            اطلاعات پایه
          </span>
          <span className="mx-2 text-black/50 dark:text-neutral-400">
            ›
          </span>
          <span className="font-semibold text-black dark:text-neutral-100">
            ارزها
          </span>
        </div>

        {/* نوع ارز */}
        <div
          className="rounded-2xl p-4 mb-6 border border-black/10 bg-white
                        dark:bg-neutral-900 dark:border-neutral-800"
          dir="rtl"
        >
          <div className="mb-3 font-medium text-black dark:text-neutral-200">
            نوع ارز
          </div>
          <FormRow
            placeholder="نوع ارز…"
            value={typeTitle}
            onChange={setTypeTitle}
            onSubmit={addType}
            inputRef={typeInputRef}
            error={errType}
          />
        </div>

        <SimpleTable
          rows={sortedTypes}
          kind="type"
          sortDir={typeSortDir}
          onToggleSort={() =>
            setTypeSortDir((d) => (d === "asc" ? "desc" : "asc"))
          }
        />

        {/* منشأ ارز */}
        <div
          className="rounded-2xl p-4 mt-8 mb-6 border border-black/10 bg-white
                        dark:bg-neutral-900 dark:border-neutral-800"
          dir="rtl"
        >
          <div className="mb-3 font-medium text-black dark:text-neutral-200">
            منشأ ارز
          </div>
          <FormRow
            placeholder="منشأ ارز…"
            value={srcTitle}
            onChange={setSrcTitle}
            onSubmit={addSource}
            inputRef={srcInputRef}
            error={errSrc}
          />
        </div>

        <SimpleTable
          rows={sortedSources}
          kind="source"
          sortDir={srcSortDir}
          onToggleSort={() =>
            setSrcSortDir((d) => (d === "asc" ? "desc" : "asc"))
          }
        />
      </Card>
    </>
  );
}

export default BaseCurrenciesPage;
