import React, { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { api } from "../utils/api.js";

const labels = {
  "auth.login": "ورود",
  "auth.logout": "خروج",
  "unit.create": "ایجاد واحد",
  "unit.update": "ویرایش واحد",
  "unit.delete": "حذف واحد",
  "user.create": "ایجاد کاربر",
  "user.update": "ویرایش کاربر",
  "user.update_with_password": "ویرایش کاربر و رمز",
  "user.password_change": "تغییر رمز",
  "user.delete": "حذف کاربر",
  "letter.create": "ثبت نامه",
  "letter.update": "ویرایش نامه",
  "letter.delete": "حذف نامه",
  "letter.delete_all": "حذف همه نامه‌ها",
  "audit.export": "خروجی لاگ",
};

function formatDate(value) {
  if (!value) return "—";
  try { return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value)); } catch { return String(value); }
}

export default function SecurityAuditPage() {
  const { user } = useAuth();
  const isAli = String(user?.username || "").trim().toLowerCase() === "ali" &&
    Array.isArray(user?.access) && user.access.includes("system:super-admin");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ action: "", actor: "", status: "" });

  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: "200" });
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    return params.toString();
  }, [filters]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api(`/admin/audit-logs?${query}`);
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e?.message || "خطا در دریافت گزارش امنیتی");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (isAli) load(); }, [query, isAli]);
  if (!isAli) return <Navigate to="/dashboard" replace />;

  return (
    <div dir="rtl" className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">گزارش امنیتی و فعالیت‌ها</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">ورودها و تغییرات مهم کاربران، واحدها و نامه‌ها</p>
      </div>
      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <input value={filters.actor} onChange={(e) => setFilters((v) => ({ ...v, actor: e.target.value }))} placeholder="کاربر یا شناسه" className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-neutral-700" />
          <input value={filters.action} onChange={(e) => setFilters((v) => ({ ...v, action: e.target.value }))} placeholder="نوع رویداد" className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-neutral-700" />
          <select value={filters.status} onChange={(e) => setFilters((v) => ({ ...v, status: e.target.value }))} className="rounded-xl border border-black/15 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
            <option value="">همه وضعیت‌ها</option><option value="success">موفق</option><option value="failure">ناموفق</option><option value="blocked">مسدودشده</option>
          </select>
          <div className="flex gap-2">
            <button type="button" onClick={load} className="flex-1 rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white dark:bg-white dark:text-black">به‌روزرسانی</button>
            <a href={`/api/admin/audit-logs?${query}&format=csv`} className="rounded-xl border border-black/15 px-3 py-2 text-sm dark:border-neutral-700">CSV</a>
          </div>
        </div>
        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
        <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-neutral-800">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-neutral-100 dark:bg-neutral-800"><tr><th className="p-3 text-right">زمان</th><th className="p-3 text-right">کاربر</th><th className="p-3 text-right">رویداد</th><th className="p-3 text-right">هدف</th><th className="p-3 text-right">وضعیت</th><th className="p-3 text-right">IP</th><th className="p-3 text-right">جزئیات</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="7" className="p-6 text-center">در حال بارگذاری…</td></tr> : items.length === 0 ? <tr><td colSpan="7" className="p-6 text-center text-neutral-500">رویدادی ثبت نشده است.</td></tr> : items.map((row) => (
                <tr key={row.id} className="border-t border-black/10 align-top dark:border-neutral-800">
                  <td className="whitespace-nowrap p-3">{formatDate(row.occurred_at)}</td>
                  <td className="p-3">{row.actor_username || "ناشناس"}{row.actor_id ? ` (#${row.actor_id})` : ""}</td>
                  <td className="p-3 font-medium">{labels[row.action] || row.action}</td>
                  <td className="p-3">{row.entity_type ? `${row.entity_type}${row.entity_id ? ` #${row.entity_id}` : ""}` : "—"}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${row.status === "success" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{row.status}</span></td>
                  <td className="p-3" dir="ltr">{row.ip_address || "—"}</td>
                  <td className="max-w-[360px] p-3 text-xs text-neutral-600 dark:text-neutral-300"><pre className="whitespace-pre-wrap break-words font-sans">{JSON.stringify(row.details || {}, null, 2)}</pre></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
