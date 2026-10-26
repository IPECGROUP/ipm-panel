import { useEffect, useState } from "react";
import { format3, toEnglishDigits } from "../utils/format.js";

const digits = (value) => toEnglishDigits(String(value ?? "")).replace(/[^\d]/g, "");

export default function PettyCashLimitsTable() {
  const [items, setItems] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

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

  const changes = items
    .filter((item) => (drafts[item.id] ?? item.amount ?? "") !== (item.amount ?? ""))
    .map((item) => ({ unitId: item.id, amount: drafts[item.id] }));

  async function save(event) {
    event.preventDefault();
    if (!changes.length) return;
    if (changes.some(({ amount }) => amount && (!/^[1-9]\d*$/.test(amount) || amount.length > 19 || BigInt(amount) > 9223372036854775807n))) {
      setError("حد تنخواه باید عددی بزرگ‌تر از صفر و در بازه مجاز باشد.");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/base/petty-cash-limits", {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: changes.map(({ unitId, amount }) => ({ unitId, amount: amount || null })) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "ذخیره حد تنخواه انجام نشد.");
      const savedAmounts = new Map(data.items.map((item) => [item.unitId, item.amount]));
      setItems((old) => old.map((row) => savedAmounts.has(row.id) ? { ...row, amount: savedAmounts.get(row.id) } : row));
      setDrafts({});
      setSaved(true);
    } catch { setError("ذخیره تغییرات حد تنخواه انجام نشد."); }
    finally { setSaving(false); }
  }

  return <form onSubmit={save}>
    <h2 className="mb-2 text-sm font-bold">حد تنخواه</h2>
    <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">حد مجاز هر واحد را به ریال وارد کنید. خانه خالی یعنی بدون حد.</p>
    {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {saved && <p role="status" className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">تغییرات حد تنخواه ذخیره شد.</p>}
    <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
      <table className="w-full min-w-[400px] text-right text-sm">
        <thead className="bg-neutral-200 dark:bg-neutral-800"><tr><th className="px-4 py-3">واحد</th><th className="px-4 py-3">حد تنخواه (ریال)</th></tr></thead>
        <tbody className="divide-y divide-black/10 dark:divide-white/10">
          {loading ? <tr><td colSpan={2} className="px-4 py-5 text-center">در حال دریافت...</td></tr> : items.length ? items.map((item) => {
            const value = drafts[item.id] ?? item.amount ?? "";
            return <tr key={item.id}><td className="px-4 py-2 font-medium">{item.name}</td><td className="px-4 py-2"><input inputMode="numeric" aria-label={`حد تنخواه ${item.name}`} value={format3(value)} onChange={(event) => { setSaved(false); setDrafts((old) => ({ ...old, [item.id]: digits(event.target.value) })); }} disabled={saving} className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-right outline-none focus:border-neutral-500 disabled:opacity-60 dark:border-white/15 dark:bg-white/5" placeholder="بدون حد" /></td></tr>;
          }) : <tr><td colSpan={2} className="px-4 py-5 text-center text-neutral-500">واحدی ثبت نشده است.</td></tr>}
        </tbody>
      </table>
    </div>
    <div className="mt-4 flex justify-end border-t border-black/10 pt-4 dark:border-white/10">
      <button type="submit" disabled={loading || saving || !changes.length} title={saving ? "در حال ذخیره..." : "ذخیره تغییرات حد تنخواه"} aria-label={saving ? "در حال ذخیره..." : "ذخیره تغییرات حد تنخواه"} className="grid h-11 w-11 place-items-center rounded-xl bg-black text-white transition hover:bg-black/90 disabled:opacity-40 dark:bg-white dark:text-black"><img src="/images/icons/check.svg" alt="" className="h-5 w-5 brightness-0 invert dark:invert-0" /></button>
    </div>
  </form>;
}
