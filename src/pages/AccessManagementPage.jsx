import React, { useEffect, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { PrimaryBtn } from "../components/ui/Button.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { api } from "../utils/api.js";

const PAGE_OPTIONS = [
  { key: "centers", label: "تعریف مراکز بودجه", page: "DefineBudgetCentersPage" },
  { key: "alloc", label: "تخصیص بودجه", page: "BudgetAllocationPage" },
  { key: "reports", label: "گزارش‌ها", page: "ReportsPage" },
];

const TAB_OPTIONS = [
  { key: "office", label: "دفتر مرکزی" },
  { key: "site", label: "سایت" },
  { key: "finance", label: "مالی" },
  { key: "cash", label: "نقدی" },
  { key: "capex", label: "سرمایه‌ای" },
  { key: "projects", label: "پروژه‌ها" },
];

const emptyAccess = () =>
  Object.fromEntries(PAGE_OPTIONS.map(({ key }) => [key, {}]));

export default function AccessManagementPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [units, setUnits] = useState([]);
  const [unitId, setUnitId] = useState("");
  const [access, setAccess] = useState(emptyAccess);
  const [loading, setLoading] = useState(true);
  const [accessLoading, setAccessLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api("/base/units", { credentials: "include" })
      .then((data) => setUnits(Array.isArray(data?.units) ? data.units : []))
      .catch((err) => setError(err?.message || "خطا در دریافت واحدها"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!unitId) {
      setAccess(emptyAccess());
      return;
    }
    setAccessLoading(true);
    setError("");
    setSuccess("");
    api(`/admin/unit-access?unit_id=${unitId}`, { credentials: "include" })
      .then((data) => {
        const next = emptyAccess();
        (data?.items || []).forEach((rule) => {
          if (!rule.permitted) return;
          const page = PAGE_OPTIONS.find((item) => item.page === rule.page);
          if (!page) return;
          if (rule.tab) next[page.key][rule.tab] = true;
          else TAB_OPTIONS.forEach((tab) => { next[page.key][tab.key] = true; });
        });
        setAccess(next);
      })
      .catch((err) => setError(err?.message || "خطا در دریافت سطح دسترسی"))
      .finally(() => setAccessLoading(false));
  }, [unitId]);

  const togglePage = (pageKey) => {
    setAccess((current) => {
      const allSelected = TAB_OPTIONS.every((tab) => current[pageKey]?.[tab.key]);
      return {
        ...current,
        [pageKey]: Object.fromEntries(TAB_OPTIONS.map((tab) => [tab.key, !allSelected])),
      };
    });
  };

  const toggleTab = (pageKey, tabKey) => {
    setAccess((current) => ({
      ...current,
      [pageKey]: { ...current[pageKey], [tabKey]: !current[pageKey]?.[tabKey] },
    }));
  };

  const save = async () => {
    if (!unitId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api(`/admin/unit-access?unit_id=${unitId}`, { method: "DELETE", credentials: "include" });
      for (const page of PAGE_OPTIONS) {
        const selectedTabs = TAB_OPTIONS.filter((tab) => access[page.key]?.[tab.key]);
        if (!selectedTabs.length) continue;
        const rules = selectedTabs.length === TAB_OPTIONS.length ? [null] : selectedTabs.map((tab) => tab.key);
        await Promise.all(rules.map((tab) => api("/admin/unit-access", {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ unit_id: Number(unitId), page: page.page, tab, permitted: 1 }),
        })));
      }
      setSuccess("تغییرات سطح دسترسی ذخیره شد.");
    } catch (err) {
      setError(err?.message || "خطا در ذخیره سطح دسترسی");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return <Card className="text-center py-8">دسترسی به این بخش فقط برای مدیر سیستم مجاز است.</Card>;
  }

  return (
    <Card className="max-w-6xl mx-auto" dir="rtl">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
          <img src="/images/icons/sath.svg" alt="" className="h-6 w-6 dark:invert" />
        </span>
        <div>
          <h1 className="text-base font-bold md:text-lg">مدیریت دسترسی‌ها</h1>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">تنظیمات</p>
        </div>
      </div>

      <div className="mb-5 max-w-md">
        <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">واحد سازمانی</label>
        <select
          value={unitId}
          onChange={(event) => setUnitId(event.target.value)}
          disabled={loading}
          className="h-11 w-full rounded-xl border border-black/15 bg-white px-3 outline-none focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:ring-neutral-600/50"
        >
          <option value="">انتخاب واحد سازمانی</option>
          {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
        </select>
      </div>

      {!unitId ? (
        <div className="rounded-2xl border border-dashed border-black/15 px-4 py-10 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">برای مشاهده و تغییر دسترسی‌ها، یک واحد سازمانی انتخاب کنید.</div>
      ) : accessLoading ? (
        <div className="py-10 text-center text-sm text-neutral-500">در حال دریافت سطح دسترسی…</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-neutral-800">
          {PAGE_OPTIONS.map((page, index) => {
            const selectedCount = TAB_OPTIONS.filter((tab) => access[page.key]?.[tab.key]).length;
            const allSelected = selectedCount === TAB_OPTIONS.length;
            return (
              <section key={page.key} className={index ? "border-t border-black/10 dark:border-neutral-800" : ""}>
                <label className="flex cursor-pointer items-center gap-3 bg-black/[0.03] px-4 py-3 font-semibold dark:bg-white/[0.04]">
                  <input type="checkbox" checked={allSelected} onChange={() => togglePage(page.key)} className="h-4 w-4 accent-black dark:accent-white" />
                  {page.label}
                  <span className="mr-auto text-xs font-normal text-neutral-500 dark:text-neutral-400">{selectedCount} از {TAB_OPTIONS.length} بخش</span>
                </label>
                <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {TAB_OPTIONS.map((tab) => (
                    <label key={tab.key} className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 px-3 py-2.5 text-sm hover:bg-black/[0.03] dark:border-neutral-800 dark:hover:bg-white/[0.05]">
                      <input type="checkbox" checked={!!access[page.key]?.[tab.key]} onChange={() => toggleTab(page.key, tab.key)} className="h-4 w-4 accent-black dark:accent-white" />
                      {tab.label}
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {(error || success) && <p className={`mt-4 text-sm ${error ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>{error || success}</p>}
      <div className="mt-5 flex justify-end">
        <PrimaryBtn type="button" onClick={save} disabled={!unitId || saving || accessLoading}>{saving ? "در حال ذخیره…" : "ذخیره تغییرات"}</PrimaryBtn>
      </div>
    </Card>
  );
}
