// src/pages/BudgetCodesPage.jsx
import React, { useEffect, useState } from "react";
import Shell from "../components/layout/Shell.jsx";
import Card from "../components/ui/Card.jsx";
import PrefixInput from "../components/ui/PrefixInput.jsx";
import { PrimaryBtn } from "../components/ui/Button.jsx";

function BudgetCodesPage({ title, apiKey, prefix, api }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ suffix: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const reload = async () => {
    const r = await api(`/centers/${apiKey}`);
    setRows(r.items || []);
  };

  useEffect(() => {
    reload().catch((e) => console.error(e));
  }, [apiKey]);

  const addRow = async () => {
    setErr("");
    if (!form.suffix && !form.description) {
      setErr("کد یا شرح را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await api(`/centers/${apiKey}`, {
        method: "POST",
        body: JSON.stringify({
          suffix: form.suffix,
          description: form.description,
        }),
      });
      setForm({ suffix: "", description: "" });
      await reload();
    } catch (ex) {
      setErr(ex.message || "خطا در ثبت ردیف");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-bold text-neutral-100">
            اطلاعات پایه • مراکز هزینه • {title}
          </h1>
        </div>

        <div
          className="rounded-2xl p-4 mb-3 ring-1 ring-neutral-800 bg-neutral-900"
          dir="rtl"
        >
          <div className="grid md:grid-cols-[1fr_2fr_auto] gap-2 items-center">
            <PrefixInput
              prefix={prefix}
              value={form.suffix}
              onChange={(s) => setForm((f) => ({ ...f, suffix: s }))}
              placeholder="101"
            />
            <input
              className="w-full rounded-xl px-3 py-2 bg-neutral-800 text-neutral-100 placeholder-neutral-400 border border-neutral-700 outline-none"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="شرح…"
            />
            <PrimaryBtn onClick={addRow} disabled={saving}>
              {saving ? "..." : "افزودن"}
            </PrimaryBtn>
          </div>
          {err && <div className="text-sm text-red-400 mt-2">{err}</div>}
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm text-neutral-200" dir="rtl">
            <thead>
              <tr className="text-neutral-300">
                <th className="p-2 w-56 text-right">کد بودجه</th>
                <th className="p-2 text-right">شرح</th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((r) => (
                <tr key={r.id} className="border-t border-neutral-800">
                  <td className="p-2">
                    <span className="font-mono" dir="ltr">
                      {prefix}
                      {r.suffix || ""}
                    </span>
                  </td>
                  <td className="p-2">{r.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Shell>
  );
}

export default BudgetCodesPage;

// ---- صفحات رَپِر برای هر واحد ----

export function OfficePage(props) {
  return (
    <BudgetCodesPage
      {...props}
      title="دفتر مرکزی"
      apiKey="office"
      prefix="OB"
    />
  );
}

export function SitePage(props) {
  return (
    <BudgetCodesPage {...props} title="سایت" apiKey="site" prefix="SB" />
  );
}

export function FinancePage(props) {
  return (
    <BudgetCodesPage
      {...props}
      title="مالی"
      apiKey="finance"
      prefix="FB"
    />
  );
}

export function CashPage(props) {
  return (
    <BudgetCodesPage
      {...props}
      title="نقدی"
      apiKey="cash"
      prefix="CB"
    />
  );
}

export function CapexPage(props) {
  return (
    <BudgetCodesPage
      {...props}
      title="سرمایه‌ای"
      apiKey="capex"
      prefix="IB"
    />
  );
}
