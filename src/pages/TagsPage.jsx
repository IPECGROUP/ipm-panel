// src/pages/TagsPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/ui/Card.jsx";

function TagsPage() {
  const API_BASE = (window.API_URL || "/api").replace(/\/+$/, "");

  const api = useCallback(async (path, opt = {}) => {
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
  }, [API_BASE]);

  const TABS = useMemo(
    () => [
      { id: "projects", label: "پروژه‌ها" },
      { id: "letters", label: "نامه‌ها و مستندات" },
      { id: "execution", label: "اجرای پروژه‌ها" },
    ],
    [],
  );

  const [activeTab, setActiveTab] = useState("projects");

  // ====== Projects (read from Projects page) ======
  const [projects, setProjects] = useState([]);
  const [projLoading, setProjLoading] = useState(false);
  const [projErr, setProjErr] = useState("");
  const [projDeletingId, setProjDeletingId] = useState(null);

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

  const removeProject = async (p) => {
    const id = p?.id;
    if (!id) return;
    const label = `${p?.code || ""}${p?.name ? ` - ${p.name}` : ""}`.trim() || "پروژه";
    const ok = window.confirm(`حذف «${label}»؟`);
    if (!ok) return;

    setProjDeletingId(id);
    setProjErr("");
    try {
      await api("/projects", { method: "DELETE", body: JSON.stringify({ id }) });
      setProjects((prev) => (prev || []).filter((x) => String(x?.id) !== String(id)));
    } catch (e) {
      setProjErr(e.message || "خطا در حذف پروژه");
    } finally {
      setProjDeletingId(null);
    }
  };

  // ====== Letters & Documents (categories + tags) ======
  const [lettersLoading, setLettersLoading] = useState(false);
  const [lettersErr, setLettersErr] = useState("");

  const [categories, setCategories] = useState([]); // [{id,label}]
  const [tags, setTags] = useState([]); // [{id,label,category_id}]
  const [newCategory, setNewCategory] = useState("");

  const [catQuery, setCatQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const [newTag, setNewTag] = useState("");
  const [lettersSaving, setLettersSaving] = useState(false);

  const catDatalistId = "tags-categories-datalist";
  const catInputRef = useRef(null);

  const loadLettersTags = useCallback(async () => {
    setLettersLoading(true);
    setLettersErr("");
    try {
      const r = await api("/tags?scope=letters");
      const cats = r.categories || r.cats || [];
      const tgs = r.tags || [];
      if (Array.isArray(cats) || Array.isArray(tgs)) {
        setCategories(Array.isArray(cats) ? cats : []);
        setTags(Array.isArray(tgs) ? tgs : []);
      } else {
        // fallback: اگر بک‌اند فعلاً فقط items بده
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
  }, [api]);

  useEffect(() => {
    if (activeTab !== "letters") return;
    loadLettersTags().catch(() => {});
  }, [activeTab, loadLettersTags]);

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

  const addCategory = async (e) => {
    e?.preventDefault();
    const v = String(newCategory || "").trim();
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
        body: JSON.stringify({ scope: "letters", type: "category", label: v }),
      });
      const item = r.item || { id: r.id, label: v };
      if (item?.id) {
        setCategories((prev) => [...(prev || []), item]);
        setNewCategory("");
        setCatQuery(item.label || v);
        setSelectedCategoryId(item.id);
        setTimeout(() => catInputRef.current?.focus?.(), 50);
      } else {
        await loadLettersTags();
        setNewCategory("");
      }
    } catch (e2) {
      setLettersErr(e2.message || "خطا در ثبت دسته‌بندی");
    } finally {
      setLettersSaving(false);
    }
  };

  const addLetterTag = async (e) => {
    e?.preventDefault();
    const v = String(newTag || "").trim();
    if (!selectedCategoryId) {
      setLettersErr("ابتدا یک دسته‌بندی را انتخاب کنید");
      return;
    }
    if (!v) {
      setLettersErr("نام برچسب را وارد کنید");
      return;
    }

    const exists = (tags || []).some(
      (t) => String(t?.category_id) === String(selectedCategoryId) && String(t?.label || "").trim() === v,
    );
    if (exists) {
      setLettersErr("این برچسب قبلاً در همین دسته‌بندی ثبت شده است");
      return;
    }

    setLettersSaving(true);
    setLettersErr("");
    try {
      const r = await api("/tags", {
        method: "POST",
        body: JSON.stringify({ scope: "letters", type: "tag", category_id: selectedCategoryId, label: v }),
      });
      const item = r.item || { id: r.id, label: v, category_id: selectedCategoryId };
      if (item?.id) {
        setTags((prev) => [...(prev || []), item]);
        setNewTag("");
      } else {
        await loadLettersTags();
        setNewTag("");
      }
    } catch (e2) {
      setLettersErr(e2.message || "خطا در ثبت برچسب");
    } finally {
      setLettersSaving(false);
    }
  };

  const deleteLetterTag = async (t) => {
    const id = t?.id;
    if (!id) return;
    const ok = window.confirm(`حذف برچسب «${t?.label || ""}»؟`);
    if (!ok) return;

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

  // ====== UI pieces ======
  const TabButtons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setActiveTab(t.id)}
          className={`h-10 px-4 rounded-2xl border text-sm shadow-sm transition ${
            activeTab === t.id
              ? "bg-black text-white border-black"
              : "bg-white text-black border border-black/15 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const Chip = ({ label, onRemove, disabled }) => (
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
          className="h-5 w-5 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
          aria-label="حذف"
          title="حذف"
        >
          <img src="/images/icons/bastan.svg" alt="" className="w-3.5 h-3.5 opacity-70 hover:opacity-100 dark:invert" />
        </button>
      )}
    </span>
  );

  const TableShell = ({ children }) => (
    <div className="px-[15px] pb-4">
      <div className="rounded-2xl border border-black/10 overflow-hidden bg-white text-black dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        <table className="w-full text-sm [&_th]:text-center [&_td]:text-center" dir="rtl">
          {children}
        </table>
      </div>
    </div>
  );

  const ProjectsTab = () => (
    <>
      {projErr && <div className="text-sm text-red-600 dark:text-red-400 mb-3">{projErr}</div>}

      <TableShell>
        <thead>
          <tr className="bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700">
            <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold w-44">عنوان</th>
            <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold">برچسب‌ها</th>
          </tr>
        </thead>

        <tbody
          className="border-t border-neutral-300 dark:border-neutral-700
                     [&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-neutral-50
                     dark:[&>tr:nth-child(odd)]:bg-neutral-900 dark:[&>tr:nth-child(even)]:bg-neutral-800/50"
        >
          <tr className="[&_td]:py-3 border-b border-neutral-300 dark:border-neutral-700">
            <td className="px-3 font-semibold">پروژه‌ها</td>
            <td className="px-3">
              {projLoading ? (
                <span className="text-neutral-600 dark:text-neutral-400">در حال بارگذاری…</span>
              ) : (projects || []).length === 0 ? (
                <span className="text-neutral-600 dark:text-neutral-400">پروژه‌ای یافت نشد.</span>
              ) : (
                <div className="flex flex-wrap items-center justify-start gap-2">
                  {(projects || []).map((p) => {
                    const label = `${p?.code || "—"} - ${p?.name || ""}`.trim();
                    return (
                      <Chip
                        key={p?.id ?? label}
                        label={label}
                        disabled={projDeletingId === p?.id}
                        onRemove={() => removeProject(p)}
                      />
                    );
                  })}
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </TableShell>
    </>
  );

  const LettersTab = () => (
    <>
      <div className="space-y-3 px-[15px]">
        {/* دسته‌بندی جدید */}
        <form onSubmit={addCategory} className="flex items-center gap-2 flex-row-reverse">
          <button
            type="submit"
            disabled={lettersSaving}
            className="h-10 w-10 rounded-xl bg-white text-black border border-black/15 hover:bg-black/5
                       dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-800 dark:hover:bg-neutral-200
                       disabled:opacity-50 grid place-items-center"
            aria-label="افزودن دسته‌بندی"
            title="افزودن دسته‌بندی"
          >
            <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">دسته‌بندی جدید</label>
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="نام دسته‌بندی..."
              className="w-full h-10 rounded-xl px-3 bg-white text-black placeholder-neutral-400
                         border border-black/15 outline-none focus:ring-2 focus:ring-black/10
                         dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
            />
          </div>
        </form>

        {/* انتخاب دسته‌بندی + برچسب جدید */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">دسته‌بندی‌ها</label>
            <input
              ref={catInputRef}
              list={catDatalistId}
              value={catQuery}
              onChange={(e) => setCatQuery(e.target.value)}
              placeholder="برای جستجو تایپ کنید…"
              className="w-full h-10 rounded-xl px-3 bg-white text-black placeholder-neutral-400
                         border border-black/15 outline-none focus:ring-2 focus:ring-black/10
                         dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
            />
            <datalist id={catDatalistId}>
              {(categoriesSorted || []).map((c) => (
                <option key={c?.id ?? c?.label} value={c?.label || ""} />
              ))}
            </datalist>
            {!selectedCategoryId && String(catQuery || "").trim() ? (
              <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">یک دسته‌بندی معتبر انتخاب کنید.</div>
            ) : null}
          </div>

          <form onSubmit={addLetterTag} className="flex items-end gap-2 flex-row-reverse">
            <button
              type="submit"
              disabled={lettersSaving || !selectedCategoryId}
              className="h-10 w-10 rounded-xl bg-white text-black border border-black/15 hover:bg-black/5
                         dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-800 dark:hover:bg-neutral-200
                         disabled:opacity-50 grid place-items-center"
              aria-label="افزودن برچسب"
              title="افزودن برچسب"
            >
              <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5" />
            </button>

            <div className="flex-1">
              <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">برچسب جدید</label>
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="نام برچسب..."
                className="w-full h-10 rounded-xl px-3 bg-white text-black placeholder-neutral-400
                           border border-black/15 outline-none focus:ring-2 focus:ring-black/10
                           dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
              />
            </div>
          </form>
        </div>

        {lettersErr && <div className="text-sm text-red-600 dark:text-red-400">{lettersErr}</div>}
      </div>

      <div className="mt-3">
        <TableShell>
          <thead>
            <tr className="bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700">
              <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold w-44">دسته‌بندی</th>
              <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold">برچسب‌ها</th>
            </tr>
          </thead>

          <tbody
            className="border-t border-neutral-300 dark:border-neutral-700
                       [&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-neutral-50
                       dark:[&>tr:nth-child(odd)]:bg-neutral-900 dark:[&>tr:nth-child(even)]:bg-neutral-800/50
                       [&>tr]:border-b [&>tr]:border-neutral-300 dark:[&>tr]:border-neutral-700"
          >
            {lettersLoading ? (
              <tr>
                <td colSpan={2} className="py-4 text-neutral-600 dark:text-neutral-400">
                  در حال بارگذاری…
                </td>
              </tr>
            ) : (categoriesSorted || []).length === 0 ? (
              <tr>
                <td colSpan={2} className="py-4 text-neutral-600 dark:text-neutral-400">
                  دسته‌بندی‌ای ثبت نشده است.
                </td>
              </tr>
            ) : (
              (categoriesSorted || []).map((c) => {
                const catId = c?.id;
                const list = tagsByCategory.get(String(catId)) || [];
                return (
                  <tr key={catId ?? c?.label}>
                    <td className="px-3 py-3 font-semibold">{c?.label || "—"}</td>
                    <td className="px-3 py-3">
                      {list.length ? (
                        <div className="flex flex-wrap items-center justify-start gap-2">
                          {list.map((t) => (
                            <Chip
                              key={t?.id ?? t?.label}
                              label={t?.label || "—"}
                              disabled={lettersSaving}
                              onRemove={() => deleteLetterTag(t)}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-neutral-500 dark:text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </TableShell>
      </div>
    </>
  );

  const ExecutionTab = () => (
    <TableShell>
      <thead>
        <tr className="bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700">
          <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold">اجرای پروژه‌ها</th>
        </tr>
      </thead>
      <tbody
        className="border-t border-neutral-300 dark:border-neutral-700
                   [&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-neutral-50
                   dark:[&>tr:nth-child(odd)]:bg-neutral-900 dark:[&>tr:nth-child(even)]:bg-neutral-800/50"
      >
        <tr className="border-b border-neutral-300 dark:border-neutral-700">
          <td className="px-3 py-4 text-neutral-600 dark:text-neutral-400">—</td>
        </tr>
      </tbody>
    </TableShell>
  );

  return (
    <Card
      className="rounded-2xl border bg-white text-neutral-900 border-black/10
                 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
      dir="rtl"
    >
      {/* breadcrumb */}
      <div className="mb-3 text-base md:text-lg">
        <span className="text-neutral-700 dark:text-neutral-300">اطلاعات پایه</span>
        <span className="mx-2 text-neutral-500 dark:text-neutral-400">›</span>
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">برچسب‌ها</span>
      </div>

      <div className="space-y-4">
        <TabButtons />

        {activeTab === "projects" ? <ProjectsTab /> : null}
        {activeTab === "letters" ? <LettersTab /> : null}
        {activeTab === "execution" ? <ExecutionTab /> : null}
      </div>
    </Card>
  );
}

export default TagsPage;
