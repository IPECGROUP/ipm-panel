import { useEffect, useMemo, useState } from "react";

const inputClass = "h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-right text-sm outline-none transition focus:border-neutral-400 dark:border-white/15 dark:bg-white/5";

const categoryEndpoint = "/api/base/project-lesson-categories";
const descriptionEndpoint = "/api/base/project-lesson-descriptions";

async function request(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "عملیات انجام نشد.");
  return data;
}

export default function ProjectLessonCategoryDescriptionsTable() {
  const [categories, setCategories] = useState([]);
  const [descriptions, setDescriptions] = useState([]);
  const [categoryTitle, setCategoryTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [descriptionTitle, setDescriptionTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadCategories = () => request(categoryEndpoint).then((data) => setCategories(data.items || []));
  const loadDescriptions = () => request(descriptionEndpoint).then((data) => setDescriptions(data.items || []));

  useEffect(() => {
    Promise.all([loadCategories(), loadDescriptions()]).catch((err) => setError(err.message));
    const refresh = (event) => {
      if (event.detail?.endpoint === categoryEndpoint) loadCategories().catch((err) => setError(err.message));
      if (event.detail?.endpoint === descriptionEndpoint) loadDescriptions().catch((err) => setError(err.message));
    };
    window.addEventListener("base-options-updated", refresh);
    return () => window.removeEventListener("base-options-updated", refresh);
  }, []);

  const descriptionsByCategory = useMemo(() => {
    const result = new Map();
    descriptions.forEach((item) => {
      const key = String(item.categoryId || "");
      if (!key) return;
      result.set(key, [...(result.get(key) || []), item.title]);
    });
    return result;
  }, [descriptions]);

  const addCategory = async (event) => {
    event.preventDefault();
    const title = categoryTitle.trim();
    if (!title) return;
    setBusy(true); setError("");
    try {
      const data = await request(categoryEndpoint, { method: "POST", body: JSON.stringify({ title }) });
      setCategories((items) => [...items, data.item]);
      setCategoryTitle("");
      window.dispatchEvent(new CustomEvent("base-options-updated", { detail: { endpoint: categoryEndpoint } }));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const addDescription = async (event) => {
    event.preventDefault();
    const title = descriptionTitle.trim();
    if (!categoryId || !title) return;
    setBusy(true); setError("");
    try {
      const data = await request(descriptionEndpoint, { method: "POST", body: JSON.stringify({ categoryId, title }) });
      setDescriptions((items) => [...items, data.item]);
      setDescriptionTitle("");
      window.dispatchEvent(new CustomEvent("base-options-updated", { detail: { endpoint: descriptionEndpoint } }));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900" dir="rtl">
      <h2 className="mb-4 text-sm font-bold">دسته‌بندی درس‌آموخته</h2>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <form onSubmit={addCategory} className="grid grid-cols-[1fr_auto] items-center gap-3">
          <input className={inputClass} value={categoryTitle} onChange={(event) => setCategoryTitle(event.target.value)} placeholder="دسته‌بندی درس‌آموخته..." />
          <button type="submit" disabled={busy} className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 bg-white transition hover:bg-black/5 disabled:opacity-50 dark:bg-neutral-100" aria-label="افزودن دسته‌بندی"><img src="/images/icons/afzodan.svg" alt="" className="h-5 w-5" /></button>
        </form>
        <form onSubmit={addDescription} className="grid grid-cols-[minmax(170px,0.85fr)_minmax(0,1.15fr)_auto] items-center gap-3">
          <select className={inputClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
            <option value="">دسته‌بندی درس‌آموخته را انتخاب کنید</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
          </select>
          <input className={inputClass} value={descriptionTitle} onChange={(event) => setDescriptionTitle(event.target.value)} placeholder="توضیح..." />
          <button type="submit" disabled={busy} className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 bg-white transition hover:bg-black/5 disabled:opacity-50 dark:bg-neutral-100" aria-label="افزودن توضیح"><img src="/images/icons/afzodan.svg" alt="" className="h-5 w-5" /></button>
        </form>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
        <div className="overflow-x-auto" dir="ltr">
          <table dir="rtl" className="w-full min-w-[620px] table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:text-center [&_th]:!py-2 [&_td]:!py-2">
            <colgroup><col style={{ width: 80 }} /><col style={{ width: "42%" }} /><col /></colgroup>
            <thead><tr className="border-b border-neutral-300 bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800"><th>#</th><th>دسته‌بندی درس‌آموخته</th><th>توضیح</th></tr></thead>
            <tbody className="text-[13px] [&>tr]:h-10">
              {categories.map((category, index) => <tr key={category.id} className="bg-black/[0.02] hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10"><td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{index + 1}</td><td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{category.title}</td><td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{(descriptionsByCategory.get(String(category.id)) || []).filter(Boolean).join("، ") || "—"}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
