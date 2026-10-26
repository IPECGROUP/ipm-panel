import { useEffect, useState } from "react";
import { format3, toEnglishDigits } from "../utils/format.js";

const digits = (value) => toEnglishDigits(String(value ?? "")).replace(/[^\d]/g, "");

export default function PettyCashLimitsTable() {
  const [items, setItems] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/base/petty-cash-limits", { credentials: "include" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "دریافت حد تنخواه انجام نشد.");
        if (active) setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => { if (active) setError("دریافت واحدها و حد تنخواه انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function save(item) {
    const value = drafts[item.id] ?? item.amount ?? "";
    if (value && !/^[1-9]\d*$/.test(value)) { setError("حد تنخواه باید عددی بزرگ‌تر از صفر باشد."); return; }
    setSavingId(item.id);
    setError("");
    try {
      const response = await fetch("/api/base/petty-cash-limits", {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: item.id, amount: value || null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "ذخیره حد تنخواه انجام نشد.");
      setItems((old) => old.map((row) => row.id === item.id ? { ...row, amount: data.item.amount } : row));
      setDrafts((old) => { const next = { ...old }; delete next[item.id]; return next; });
    } catch { setError(`ذخیره حد تنخواه «${item.name}» انجام نشد.`); }
    finally { setSavingId(null); }
  }

  return <section>
    <h2 className="mb-2 text-sm font-bold">حد تنخواه</h2>
    <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">حد مجاز هر واحد را به ریال وارد و همان ردیف را ذخیره کنید. خانه خالی یعنی بدون حد.</p>
    {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
      <table className="w-full min-w-[500px] text-right text-sm">
        <thead className="bg-neutral-200 dark:bg-neutral-800"><tr><th className="px-4 py-3">واحد</th><th className="px-4 py-3">حد تنخواه (ریال)</th><th className="w-28 px-4 py-3">عملیات</th></tr></thead>
        <tbody className="divide-y divide-black/10 dark:divide-white/10">
          {loading ? <tr><td colSpan={3} className="px-4 py-5 text-center">در حال دریافت...</td></tr> : items.length ? items.map((item) => {
            const value = drafts[item.id] ?? item.amount ?? "";
            const changed = value !== (item.amount ?? "");
            return <tr key={item.id}><td className="px-4 py-2 font-medium">{item.name}</td><td className="px-4 py-2"><input inputMode="numeric" aria-label={`حد تنخواه ${item.name}`} value={format3(value)} onChange={(event) => setDrafts((old) => ({ ...old, [item.id]: digits(event.target.value) }))} className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-right outline-none focus:border-neutral-500 dark:border-white/15 dark:bg-white/5" placeholder="بدون حد" /></td><td className="px-4 py-2"><button type="button" onClick={() => save(item)} disabled={!changed || savingId !== null} className="h-9 rounded-xl bg-black px-3 text-xs font-bold text-white disabled:opacity-40 dark:bg-white dark:text-black">{savingId === item.id ? "در حال ذخیره" : "ذخیره"}</button></td></tr>;
          }) : <tr><td colSpan={3} className="px-4 py-5 text-center text-neutral-500">واحدی ثبت نشده است.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}
