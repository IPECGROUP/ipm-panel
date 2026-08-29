import { useEffect, useState } from "react";

const inputClass = "h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none focus:border-neutral-400 dark:border-white/15 dark:bg-white/5";

export default function DocumentClassesSection() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/base/document-classes", { credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "دریافت کلاس‌های سند انجام نشد.");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err.message || "دریافت کلاس‌های سند انجام نشد.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async (event) => {
    event.preventDefault();
    const value = title.trim();
    if (!value) return setError("عنوان کلاس سند را وارد کنید.");

    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/base/document-classes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error === "title_exists" ? "این کلاس سند قبلاً ثبت شده است." : data.error || "ثبت کلاس سند انجام نشد.");
      setItems((previous) => [...previous, data.item]);
      setTitle("");
    } catch (err) {
      setError(err.message || "ثبت کلاس سند انجام نشد.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
      <h2 className="mb-4 text-sm font-bold">کلاس سند</h2>
      <form onSubmit={add} className="flex items-center gap-3">
        <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} placeholder="کلاس سند..." />
        <button type="submit" disabled={saving} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/15 text-3xl font-light leading-none transition hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10" aria-label="افزودن کلاس سند" title="افزودن کلاس سند">+</button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-neutral-200 dark:bg-white/10"><tr><th className="w-20 px-4 py-3 text-right">#</th><th className="px-4 py-3 text-right">عنوان</th><th className="w-14 px-4 py-3"><input type="checkbox" aria-label="انتخاب همه" /></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan="3" className="px-4 py-6 text-center text-neutral-500">در حال دریافت...</td></tr> : items.length ? items.map((item, index) => <tr key={item.id} className="border-t border-black/10 dark:border-white/10"><td className="px-4 py-3">{index + 1}</td><td className="px-4 py-3">{item.title}</td><td className="px-4 py-3 text-center"><input type="checkbox" aria-label={`انتخاب ${item.title}`} /></td></tr>) : <tr><td colSpan="3" className="px-4 py-6 text-center text-neutral-500">هنوز کلاسی ثبت نشده است.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
