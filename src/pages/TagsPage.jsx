// src/pages/TagsPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";

/* ===================== UI helpers (OUTSIDE main component to avoid remount/focus loss) ===================== */

const FieldLabel = React.memo(function FieldLabel({ children }) {
  return (
    <label className="block text-[11px] md:text-xs text-neutral-600 dark:text-neutral-300 mb-1">
      {children}
    </label>
  );
});

const AddIconBtn = React.memo(function AddIconBtn({ title, disabled }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="h-10 w-10 rounded-xl bg-white text-black border border-black/15 hover:bg-black/5
                 dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-800 dark:hover:bg-neutral-200
                 disabled:opacity-50 grid place-items-center shrink-0"
      aria-label={title}
      title={title}
    >
      <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5" />
    </button>
  );
});

const TabButtons = React.memo(function TabButtons({ tabs, activeId, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`h-10 px-4 rounded-2xl border text-sm shadow-sm transition ${
            activeId === t.id
              ? "bg-black text-white border-black"
              : "bg-white text-black border border-black/15 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
});

// ✅ دقیقا مثل BaseCurrenciesPage
const TableShell = React.memo(function TableShell({ children }) {
  return (
    <TableWrap>
      <div className="bg-white text-black overflow-hidden dark:bg-neutral-900 dark:text-neutral-100">
        <div className="px-[15px] pb-4">
          <div className="rounded-2xl border border-black/10 overflow-hidden bg-white text-black dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
            <table
              className="w-full text-sm [&_th]:text-center [&_td]:text-center [&_th]:py-0.5 [&_td]:py-0.5"
              dir="rtl"
            >
              {children}
            </table>
          </div>
        </div>
      </div>
    </TableWrap>
  );
});

const Chip = React.memo(function Chip({ label, onRemove, disabled }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs
                 text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
    >
      <span className="whitespace-nowrap">{label}</span>
      {!!onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="h-4 w-4 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
          aria-label="حذف"
          title="حذف"
        >
          <img src="/images/icons/bastan.svg" alt="" className="w-3 h-3 opacity-70 hover:opacity-100 dark:invert" />
        </button>
      )}
    </span>
  );
});

const CategoryCombobox = React.memo(function CategoryCombobox({
  categories,
  value,
  onValueChange,
  selectedId,
  onSelect,
  inputRef,
  disabled,
}) {
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = String(value || "").trim();
    if (!q) return categories || [];
    const qq = q.toLowerCase();
    return (categories || []).filter((c) => String(c?.label || "").toLowerCase().includes(qq));
  }, [categories, value]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        disabled={disabled}
        placeholder="انتخاب/جستجو…"
        className="w-full h-10 rounded-xl px-3 pe-10 bg-white text-black placeholder-neutral-400
                   border border-black/15 outline-none focus:ring-2 focus:ring-black/10
                   dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50
                   disabled:opacity-60"
        aria-label="دسته‌بندی‌ها"
        autoComplete="off"
      />

      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
        <img src="/images/icons/dropdown.svg" alt="" className="w-4 h-4 opacity-70 dark:invert" />
      </span>

      {open && (filtered || []).length > 0 && (
        <div
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-black/10 bg-white shadow-lg
                     dark:bg-neutral-900 dark:border-neutral-800"
        >
          <div className="max-h-56 overflow-auto py-1">
            {(filtered || []).map((c) => {
              const isSel = selectedId != null && String(selectedId) === String(c?.id);
              return (
                <button
                  key={c?.id ?? c?.label}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(c?.id);
                    onValueChange(c?.label || "");
                    setOpen(false);
                  }}
                  className={`w-full text-right px-3 py-2 text-sm transition ${
                    isSel
                      ? "bg-black text-white"
                      : "text-black hover:bg-black/5 dark:text-neutral-100 dark:hover:bg-white/10"
                  }`}
                >
                  {c?.label || "—"}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

/* ===================== Main ===================== */

function TagsPage() {
  const API_BASE = (window.API_URL || "/api").replace(/\/+$/, "");

  const api = useCallback(
    async (path, opt = {}) => {
      const res = await fetch(API_BASE + path, {
        credentials: "include",
        cache: "no-store",
        ...opt,
        headers: {
          "Content-Type": "application/json",
          ...(opt.headers || {}),
        },
      });

      const txt = await res.text();
      let data = {};
      try {
        data = txt ? JSON.parse(txt) : {};
      } catch (_e) {
        const snippet = String(txt || "").slice(0, 300);
        throw new Error(`bad_json_response: ${res.status} ${res.statusText} :: ${snippet}`);
      }

      if (!res.ok) throw new Error(data?.error || data?.message || "request_failed");
      return data;
    },
    [API_BASE],
  );

  const TABS = useMemo(
    () => [
      { id: "projects", label: "پروژه‌ها" },
      { id: "letters", label: "نامه‌ها و مستندات" },
      { id: "execution", label: "اجرای پروژه‌ها" },
    ],
    [],
  );

  const [activeTab, setActiveTab] = useState("projects");

  const activeScope = useMemo(() => {
    if (activeTab === "projects") return "projects";
    if (activeTab === "letters") return "letters";
    if (activeTab === "execution") return "execution";
    return null;
  }, [activeTab]);

  // ====== Projects list for dropdown ======
  const [projects, setProjects] = useState([]);
  const [projLoading, setProjLoading] = useState(false);
  const [projErr, setProjErr] = useState("");

  useEffect(() => {
    if (activeTab !== "projects") return;

    let dead = false;
    (async () => {
      setProjLoading(true);
      setProjErr("");
      try {
        const r = await api("/projects");
        const list = r.projects || r.items || r.data || [];
        if (!dead) setProjects(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!dead) {
          setProjects([]);
          setProjErr(e.message || "خطا در دریافت پروژه‌ها");
        }
      } finally {
        if (!dead) setProjLoading(false);
      }
    })();

    return () => {
      dead = true;
    };
  }, [activeTab, api]);

  const projectsSorted = useMemo(() => {
    return (projects || [])
      .slice()
      .sort((a, b) => String(b?.code || "").localeCompare(String(a?.code || ""), "fa", { numeric: true }));
  }, [projects]);

  // ✅ فقط پروژه‌های سطح اول (مثل 159) - شبیه صفحه پروژه‌ها
  const projectsTopLevel = useMemo(() => {
    return (projectsSorted || []).filter((p) => {
      const code = String(p?.code || "").trim();
      if (!code) return false;
      return !code.includes(".");
    });
  }, [projectsSorted]);

  // ====== Scoped categories + tags (letters/execution/projects) ======
  const [lettersLoading, setLettersLoading] = useState(false);
  const [lettersErr, setLettersErr] = useState("");

  const [categories, setCategories] = useState([]); // [{id,label}]
  const [tags, setTags] = useState([]); // [{id,label,category_id}]

  const [newCategory, setNewCategory] = useState("");

  const [catQuery, setCatQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const [newTag, setNewTag] = useState("");
  const [lettersSaving, setLettersSaving] = useState(false);

  const newCategoryRef = useRef(null);
  const catComboRef = useRef(null);
  const newTagRef = useRef(null);

  const loadScopedTags = useCallback(
    async (scope) => {
      if (!scope) return;

      setLettersLoading(true);
      setLettersErr("");
      try {
        const r = await api(`/tags?scope=${encodeURIComponent(scope)}`);
        const cats = r.categories || r.cats || [];
        const tgs = r.tags || [];
        if (Array.isArray(cats) || Array.isArray(tgs)) {
          setCategories(Array.isArray(cats) ? cats : []);
          setTags(Array.isArray(tgs) ? tgs : []);
        } else {
          const items = r.items || [];
          setCategories(Array.isArray(items) ? items.filter((x) => x?.type === "category") : []);
          setTags(Array.isArray(items) ? items.filter((x) => x?.type !== "category") : []);
        }
      } catch (e) {
        setCategories([]);
        setTags([]);
        setLettersErr(e.message || "خطا در دریافت دسته‌بندی/برچسب‌ها");
      } finally {
        setLettersLoading(false);
      }
    },
    [api],
  );

  useEffect(() => {
    if (!activeScope) return;

    setCatQuery("");
    setSelectedCategoryId(null);
    setNewTag("");
    setLettersErr("");

    loadScopedTags(activeScope).catch(() => {});
  }, [activeTab, activeScope, loadScopedTags]);

  const categoriesSorted = useMemo(() => {
    return (categories || [])
      .slice()
      .sort((a, b) => String(a?.label || "").localeCompare(String(b?.label || ""), "fa", { numeric: true }));
  }, [categories]);

  useEffect(() => {
    const v = String(catQuery || "").trim();
    if (!v) {
      setSelectedCategoryId(null);
      return;
    }
    const found = (categoriesSorted || []).find((c) => String(c?.label || "").trim() === v);
    setSelectedCategoryId(found ? found.id : null);
  }, [catQuery, categoriesSorted]);

  const tagsByCategory = useMemo(() => {
    const map = new Map();
    (categoriesSorted || []).forEach((c) => map.set(String(c?.id), []));
    (tags || []).forEach((t) => {
      const cid = t?.category_id;
      if (cid == null) return;
      const key = String(cid);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => String(a?.label || "").localeCompare(String(b?.label || ""), "fa", { numeric: true }));
      map.set(k, arr);
    }
    return map;
  }, [tags, categoriesSorted]);

  // ====== Letters/Execution create category/tag ======
  const addCategory = async (e) => {
    e?.preventDefault();
    const v = String(newCategory || "").trim();
    if (!activeScope) return;

    if (!v) {
      setLettersErr("نام دسته‌بندی را وارد کنید");
      return;
    }
    const exists = (categoriesSorted || []).some((c) => String(c?.label || "").trim() === v);
    if (exists) {
      setLettersErr("این دسته‌بندی قبلاً ثبت شده است");
      return;
    }

    setLettersSaving(true);
    setLettersErr("");
    try {
      const r = await api("/tags", {
        method: "POST",
        body: JSON.stringify({ scope: activeScope, type: "category", label: v }),
      });
      const item = r.item || { id: r.id, label: v };
      if (item?.id) {
        setCategories((prev) => [...(prev || []), item]);
        setNewCategory("");
        setCatQuery(item.label || v);
        setSelectedCategoryId(item.id);
        requestAnimationFrame(() => catComboRef.current?.focus?.());
      } else {
        await loadScopedTags(activeScope);
        setNewCategory("");
      }
    } catch (e2) {
      setLettersErr(e2.message || "خطا در ثبت دسته‌بندی");
    } finally {
      setLettersSaving(false);
    }
  };

  const addScopedTag = async ({ scope, categoryId, label }) => {
    const v = String(label || "").trim();
    const cid = Number(categoryId);

    if (!scope) return null;
    if (!cid || !Number.isFinite(cid)) return null;
    if (!v) return null;

    const exists = (tags || []).some(
      (t) => String(t?.category_id) === String(cid) && String(t?.label || "").trim() === v,
    );
    if (exists) return null;

    const r = await api("/tags", {
      method: "POST",
      body: JSON.stringify({ scope, type: "tag", category_id: cid, label: v }),
    });

    const item = r.item || { id: r.id, label: v, category_id: cid };
    if (item?.id) {
      setTags((prev) => [...(prev || []), item]);
      return item;
    }

    await loadScopedTags(scope);
    return null;
  };

  const addLetterTag = async (e) => {
    e?.preventDefault();
    const v = String(newTag || "").trim();
    if (!activeScope) return;

    if (!selectedCategoryId) {
      setLettersErr("ابتدا یک دسته‌بندی را انتخاب کنید");
      return;
    }
    if (!v) {
      setLettersErr("نام برچسب را وارد کنید");
      return;
    }

    setLettersSaving(true);
    setLettersErr("");
    try {
      await addScopedTag({ scope: activeScope, categoryId: selectedCategoryId, label: v });
      setNewTag("");
      requestAnimationFrame(() => newTagRef.current?.focus?.());
    } catch (e2) {
      setLettersErr(e2.message || "خطا در ثبت برچسب");
    } finally {
      setLettersSaving(false);
    }
  };

  const deleteScopedTag = async (t) => {
    const id = t?.id;
    if (!id) return;

    setLettersSaving(true);
    setLettersErr("");
    try {
      await api("/tags", { method: "DELETE", body: JSON.stringify({ id }) });
      setTags((prev) => (prev || []).filter((x) => String(x?.id) !== String(id)));
    } catch (e) {
      setLettersErr(e.message || "خطا در حذف برچسب");
    } finally {
      setLettersSaving(false);
    }
  };

  const deleteCategory = async (c) => {
    const catId = c?.id;
    if (!catId) return;

    setLettersSaving(true);
    setLettersErr("");
    try {
      const related = (tagsByCategory.get(String(catId)) || []).slice();

      for (const t of related) {
        if (!t?.id) continue;
        await api("/tags", { method: "DELETE", body: JSON.stringify({ id: t.id }) });
      }

      await api("/tags", { method: "DELETE", body: JSON.stringify({ id: catId, type: "category" }) });

      setTags((prev) => (prev || []).filter((t) => String(t?.category_id) !== String(catId)));
      setCategories((prev) => (prev || []).filter((x) => String(x?.id) !== String(catId)));

      if (String(selectedCategoryId || "") === String(catId)) {
        setSelectedCategoryId(null);
        setCatQuery("");
      } else if (String(catQuery || "").trim() === String(c?.label || "").trim()) {
        setSelectedCategoryId(null);
        setCatQuery("");
      }
    } catch (e) {
      setLettersErr(e.message || "خطا در حذف دسته‌بندی");
    } finally {
      setLettersSaving(false);
    }
  };

  // ====== Projects tab: persist selected projects as tags in scope="projects" ======
  const [projPickId, setProjPickId] = useState("");
  const [projectCategoryId, setProjectCategoryId] = useState(null);

  useEffect(() => {
    if (activeScope !== "projects") return;
    const found = (categoriesSorted || []).find((c) => String(c?.label || "").trim() === "پروژه‌ها");
    setProjectCategoryId(found?.id ?? null);
  }, [activeScope, categoriesSorted]);

  const ensureProjectsCategory = useCallback(async () => {
    if (activeScope !== "projects") return null;

    const found = (categoriesSorted || []).find((c) => String(c?.label || "").trim() === "پروژه‌ها");
    if (found?.id) return found.id;

    const r = await api("/tags", {
      method: "POST",
      body: JSON.stringify({ scope: "projects", type: "category", label: "پروژه‌ها" }),
    });

    const item = r.item || { id: r.id, label: "پروژه‌ها", scope: "projects" };
    if (item?.id) {
      setCategories((prev) => [...(prev || []), item]);
      return item.id;
    }

    await loadScopedTags("projects");
    const after = (categoriesSorted || []).find((c) => String(c?.label || "").trim() === "پروژه‌ها");
    return after?.id ?? null;
  }, [activeScope, api, categoriesSorted, loadScopedTags]);

  const addProjectTag = async (e) => {
    e?.preventDefault();
    const id = String(projPickId || "").trim();
    if (!id) return;

    setLettersSaving(true);
    setLettersErr("");
    try {
      const catId = projectCategoryId || (await ensureProjectsCategory());
      if (!catId) throw new Error("category_id_required");

      const p =
        (projectsTopLevel || []).find((x) => String(x?.id) === id) ||
        (projectsSorted || []).find((x) => String(x?.id) === id);

      const label = `${p?.code || "—"} - ${p?.name || ""}`.trim();

      await addScopedTag({ scope: "projects", categoryId: catId, label });

      setProjPickId("");
    } catch (e2) {
      setLettersErr(e2.message || "خطا در افزودن پروژه");
    } finally {
      setLettersSaving(false);
    }
  };

  const projectTagsList = useMemo(() => {
    const cid = projectCategoryId;
    if (!cid) return [];
    return tagsByCategory.get(String(cid)) || [];
  }, [projectCategoryId, tagsByCategory]);

  /* ===================== Sections ===================== */

  const CategoriesBar = (
    <div className="px-[15px]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <form
          onSubmit={addCategory}
          className="rounded-2xl border border-black/10 bg-white p-3 dark:bg-neutral-900 dark:border-neutral-800"
        >
          <FieldLabel>دسته‌بندی جدید</FieldLabel>
          <div className="flex items-center gap-2 flex-row-reverse">
            <AddIconBtn title="افزودن دسته‌بندی" disabled={lettersSaving} />
            <input
              ref={newCategoryRef}
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="نام دسته‌بندی..."
              className="flex-1 h-10 rounded-xl px-3 bg-white text-black placeholder-neutral-400
                         border border-black/15 outline-none focus:ring-2 focus:ring-black/10
                         dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
            />
          </div>
        </form>

        <div className="md:col-span-2 rounded-2xl border border-black/10 bg-white p-3 dark:bg-neutral-900 dark:border-neutral-800">
          <div className="flex flex-col md:flex-row-reverse gap-3">
            <form onSubmit={addLetterTag} className="md:flex-1">
              <FieldLabel>برچسب جدید</FieldLabel>
              <div className="flex items-center gap-2 flex-row-reverse">
                <AddIconBtn title="افزودن برچسب" disabled={lettersSaving || !selectedCategoryId} />
                <input
                  ref={newTagRef}
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="نام برچسب..."
                  className="flex-1 h-10 rounded-xl px-3 bg-white text-black placeholder-neutral-400
                             border border-black/15 outline-none focus:ring-2 focus:ring-black/10
                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                />
              </div>
            </form>

            <div className="md:flex-1">
              <FieldLabel>دسته‌بندی‌ها</FieldLabel>
              <CategoryCombobox
                categories={categoriesSorted}
                value={catQuery}
                onValueChange={setCatQuery}
                selectedId={selectedCategoryId}
                onSelect={(id) => setSelectedCategoryId(id)}
                inputRef={catComboRef}
                disabled={lettersSaving}
              />
              {!selectedCategoryId && String(catQuery || "").trim() ? (
                <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                  یک دسته‌بندی معتبر انتخاب کنید.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {lettersErr && <div className="mt-2 text-sm text-red-600 dark:text-red-400">{lettersErr}</div>}
    </div>
  );

  const ProjectsBar = (
    <div className="px-[15px]">
      <form
        onSubmit={addProjectTag}
        className="rounded-2xl border border-black/10 bg-white p-3 dark:bg-neutral-900 dark:border-neutral-800"
      >
        <FieldLabel>افزودن پروژه به برچسب‌ها</FieldLabel>
        <div className="flex items-center gap-2 flex-row-reverse">
          <AddIconBtn title="افزودن پروژه" disabled={lettersSaving || projLoading || !String(projPickId || "").trim()} />
          <select
            value={projPickId}
            onChange={(e) => setProjPickId(e.target.value)}
            className="flex-1 h-10 rounded-xl px-3 bg-white text-black
                       border border-black/15 outline-none focus:ring-2 focus:ring-black/10
                       dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50
                       disabled:opacity-60"
            disabled={projLoading || lettersSaving}
            aria-label="انتخاب پروژه"
          >
            <option value="">انتخاب پروژه…</option>
            {(projectsTopLevel || []).map((p) => {
              const label = `${p?.code || "—"} - ${p?.name || ""}`.trim();
              return (
                <option key={p?.id ?? label} value={p?.id ?? ""}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>
      </form>

      {projErr && <div className="mt-2 text-sm text-red-600 dark:text-red-400">{projErr}</div>}
      {lettersErr && <div className="mt-2 text-sm text-red-600 dark:text-red-400">{lettersErr}</div>}
    </div>
  );

  const ProjectsTab = (
    <>
      {ProjectsBar}

      <div className="mt-3">
        <TableShell>
          <THead>
            <tr className="bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700">
              <TH className="w-44 !text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
                دسته‌بندی
              </TH>
              <TH className="!text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
                برچسب‌ها
              </TH>
              <TH className="w-28 !text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
                اقدامات
              </TH>
            </tr>
          </THead>

          <tbody
            className="[&_td]:text-black dark:[&_td]:text-neutral-100
                       [&_tr:nth-child(odd)]:bg-white [&_tr:nth-child(even)]:bg-neutral-50
                       dark:[&_tr:nth-child(odd)]:bg-neutral-900 dark:[&_tr:nth-child(even)]:bg-neutral-800/50"
          >
            <TR>
              <TD className="px-3 font-semibold">پروژه‌ها</TD>

              {/* ✅ فاصله خیلی کم بالا/پایین برای تگ‌ها */}
              <TD className="px-3 py-2">
                {lettersLoading ? (
                  <span className="text-neutral-600 dark:text-neutral-400">در حال بارگذاری…</span>
                ) : (projectTagsList || []).length === 0 ? (
                  <span className="text-neutral-600 dark:text-neutral-400">پروژه‌ای به برچسب‌ها اضافه نشده است.</span>
                ) : (
                  <div className="flex flex-wrap items-center justify-start gap-2">
                    {(projectTagsList || []).map((t) => (
                      <Chip
                        key={t?.id ?? t?.label}
                        label={t?.label || "—"}
                        disabled={lettersSaving}
                        onRemove={() => deleteScopedTag(t)}
                      />
                    ))}
                  </div>
                )}
              </TD>

              <TD className="px-3">
                <div className="flex items-center justify-center gap-2 pointer-events-none">
                  <span className="invisible">
                    <RowActionIconBtn action="delete" onClick={() => {}} size={36} iconSize={17} />
                  </span>
                </div>
              </TD>
            </TR>
          </tbody>
        </TableShell>
      </div>
    </>
  );

  const CategoriesTagsTable = (
    <div className="mt-3">
      <TableShell>
        <THead>
          <tr className="bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700">
            <TH className="w-44 !text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
              دسته‌بندی
            </TH>
            <TH className="!text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
              برچسب‌ها
            </TH>
            <TH className="w-28 !text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
              اقدامات
            </TH>
          </tr>
        </THead>

        <tbody
          className="[&_td]:text-black dark:[&_td]:text-neutral-100
                     [&_tr:nth-child(odd)]:bg-white [&_tr:nth-child(even)]:bg-neutral-50
                     dark:[&_tr:nth-child(odd)]:bg-neutral-900 dark:[&_tr:nth-child(even)]:bg-neutral-800/50"
        >
          {lettersLoading ? (
            <TR className="bg-white dark:bg-transparent">
              <TD colSpan={3} className="text-center text-black/60 dark:text-neutral-400 py-3">
                در حال بارگذاری…
              </TD>
            </TR>
          ) : (categoriesSorted || []).length === 0 ? (
            <TR className="bg-white dark:bg-transparent">
              <TD colSpan={3} className="text-center text-black/60 dark:text-neutral-400 py-3">
                دسته‌بندی‌ای ثبت نشده است.
              </TD>
            </TR>
          ) : (
            (categoriesSorted || []).map((c, idx) => {
              const catId = c?.id;
              const list = tagsByCategory.get(String(catId)) || [];
              const isLast = idx === categoriesSorted.length - 1;
              const tdBorder = isLast ? "" : "border-b border-neutral-300 dark:border-neutral-700";

              return (
                <TR key={catId ?? c?.label}>
                  <TD className={`px-3 font-semibold ${tdBorder}`}>{c?.label || "—"}</TD>

                  {/* ✅ فاصله خیلی کم بالا/پایین برای تگ‌ها (هر سه تب: letters/execution هم از همین استفاده می‌کنن) */}
                  <TD className={`px-3 py-2 ${tdBorder}`}>
                    {list.length ? (
                      <div className="flex flex-wrap items-center justify-start gap-2">
                        {list.map((t) => (
                          <Chip
                            key={t?.id ?? t?.label}
                            label={t?.label || "—"}
                            disabled={lettersSaving}
                            onRemove={() => deleteScopedTag(t)}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-neutral-500 dark:text-neutral-400">—</span>
                    )}
                  </TD>

                  <TD className={`px-3 ${tdBorder}`}>
                    <div className="flex items-center justify-center gap-2">
                      <RowActionIconBtn
                        action="delete"
                        onClick={() => deleteCategory(c)}
                        disabled={lettersSaving}
                        size={36}
                        iconSize={17}
                      />
                    </div>
                  </TD>
                </TR>
              );
            })
          )}
        </tbody>
      </TableShell>
    </div>
  );

  const LettersTab = (
    <>
      {CategoriesBar}
      {CategoriesTagsTable}
    </>
  );

  const ExecutionTab = (
    <>
      {CategoriesBar}
      {CategoriesTagsTable}
    </>
  );

  return (
    <Card
      className="rounded-2xl border bg-white text-neutral-900 border-black/10
                 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
      dir="rtl"
    >
      <div className="mb-3 text-base md:text-lg">
        <span className="text-neutral-700 dark:text-neutral-300">اطلاعات پایه</span>
        <span className="mx-2 text-neutral-500 dark:text-neutral-400">›</span>
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">برچسب‌ها</span>
      </div>

      <div className="space-y-4">
        <TabButtons tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

        {activeTab === "projects" ? ProjectsTab : null}
        {activeTab === "letters" ? LettersTab : null}
        {activeTab === "execution" ? ExecutionTab : null}
      </div>
    </Card>
  );
}

export default TagsPage;
