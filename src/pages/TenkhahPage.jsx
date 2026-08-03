import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { todayJalaliYmd } from "../utils/date.js";
import { format3, toEnglishDigits } from "../utils/format.js";
const input =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-right text-sm outline-none focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-white";
const fa = (v) => String(v ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const today = () => todayJalaliYmd().replaceAll("-", "/");
const name = (u) => u?.name || u?.username || "—";
const empty = () => ({
  requestNumber: "",
  requestDate: today(),
  projectId: "",
  amount: "",
  currency: "",
  unregisteredBalance: "",
  unsettledBalance: "",
  projectManagerId: "",
});
function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
        {label}
        {required && <b className="mr-1 text-red-500">*</b>}
      </span>
      {children}
    </label>
  );
}
export default function TenkhahPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]),
    [form, setForm] = useState(empty),
    [open, setOpen] = useState(false),
    [projects, setProjects] = useState([]),
    [users, setUsers] = useState([]),
    [currencies, setCurrencies] = useState([]),
    [selected, setSelected] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const api = async (path, opt = {}) => {
    const r = await fetch(`/api${path}`, {
      credentials: "include",
      ...opt,
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(user?.id || ""),
        ...(opt.headers || {}),
      },
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || d.error || "خطا در ثبت اطلاعات");
    return d;
  };
  const load = async () => {
    if (!user?.id) return;
    try {
      const d = await api("/tenkhah");
      setItems(d.items || []);
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => {
    load();
  }, [user?.id]);
  const loadOptions = async () => {
    const [p, u, c] = await Promise.all([
      api("/projects?isActive=true"),
      api("/admin/users"),
      api("/base/currencies/types"),
    ]);
    setProjects(
      (p.items || p.projects || []).filter((x) => x.isActive !== false && /^\d{3}$/.test(String(x.code || "").trim())),
    );
    setUsers(u.users || []);
    setCurrencies(c.items || []);
  };
  const managers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.isActive !== false &&
          /مدیر\s*پروژه|project\s*manager/i.test(
            [
              u.department,
              u.role,
              ...(u.positions || []).map((x) => x.name),
            ].join(" "),
          ),
      ),
    [users],
  );
  const finances = useMemo(
    () =>
      users.filter(
        (u) =>
          u.isActive !== false &&
          /مالی|حسابدار|finance|account/i.test(
            [
              u.department,
              u.role,
              ...(u.positions || []).map((x) => x.name),
            ].join(" "),
          ),
      ),
    [users],
  );
  const add = async () => {
    setOpen(true);
    setForm(empty());
    setError("");
    try {
      await loadOptions();
    } catch (e) {
      setError(e.message);
    }
  };
  const money = (k, v) =>
    setForm((x) => ({
      ...x,
      [k]: format3(toEnglishDigits(v).replace(/[^\d]/g, "")),
    }));
  const create = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/tenkhah", { method: "POST", body: JSON.stringify(form) });
      setOpen(false);
      await load();
      window.dispatchEvent(new Event("tenkhah-notifications-refresh"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const action = async () => {
    setBusy(true);
    setError("");
    try {
      const isManager = selected.stage === "project_manager";
      await api("/tenkhah", {
        method: "PATCH",
        body: JSON.stringify(
          isManager
            ? {
                id: selected.id,
                financeUserId: selected.financeUserId,
                approvedDate: selected.managerApprovedDate || today(),
              }
            : {
                id: selected.id,
                chargedDate: selected.chargedDate || today(),
                chargedAmount:
                  selected.chargedAmount ?? selected.requestedAmount,
              },
        ),
      });
      setSelected(null);
      await load();
      window.dispatchEvent(new Event("tenkhah-notifications-refresh"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const updateSelected = (k, v) => setSelected((s) => ({ ...s, [k]: v }));
  const incoming =
    selected &&
    Number(selected.currentAssigneeUserId) === Number(user?.id) &&
    selected.status === "pending";
  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <Card className="rounded-2xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-neutral-900 md:p-4">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 bg-black/[.03] dark:border-white/10 dark:bg-white/[.06]">
              <img
                src="/images/icons/tenkhah.svg"
                className="h-6 w-6 dark:invert"
              />
            </span>
            <span>
              <h1 className="text-base font-bold md:text-lg">تنخواه</h1>
              <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                مدیریت مالی
              </span>
            </span>
          </div>
          <button
            onClick={open ? () => setOpen(false) : add}
            className="grid h-10 w-10 place-items-center rounded-xl ring-1 ring-black/15 hover:bg-black/5 dark:ring-white/15"
          >
            <img
              src={
                open
                  ? "/images/icons/listdarkhast.svg"
                  : "/images/icons/afzodan.svg"
              }
              className="h-5 w-5 dark:invert"
            />
          </button>
        </div>
        {open && (
          <section className="mb-5 rounded-2xl border border-black/10 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[.03] md:p-5">
            <h2 className="mb-5 text-base font-bold">درخواست تنخواه جدید</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="شماره درخواست" required>
                <input
                  value={form.requestNumber}
                  onChange={(e) =>
                    updateSelected
                      ? setForm((x) => ({
                          ...x,
                          requestNumber: e.target.value,
                        }))
                      : null
                  }
                  className={input}
                />
              </Field>
              <Field label="تاریخ درخواست" required>
                <JalaliPopupDatePicker
                  value={form.requestDate}
                  onChange={(v) => setForm((x) => ({ ...x, requestDate: v }))}
                  disableFuture
                  buttonClassName={`${input} flex items-center justify-between`}
                />
              </Field>
              <Field label="درخواست‌کننده">
                <div
                  className={`${input} flex items-center bg-neutral-100 dark:bg-white/10`}
                >
                  {name(user)}
                </div>
              </Field>
              <Field label="پروژه" required>
                <select
                  value={form.projectId}
                  onChange={(e) =>
                    setForm((x) => ({ ...x, projectId: e.target.value }))
                  }
                  className={input}
                >
                  <option value="">انتخاب کنید</option>
                  {projects.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="مبلغ تنخواه درخواستی" required>
                <div className="flex overflow-hidden rounded-xl border border-black/10 dark:border-white/15">
                  <input
                    inputMode="numeric"
                    value={fa(form.amount)}
                    onChange={(e) => money("amount", e.target.value)}
                    className="h-11 min-w-0 flex-1 bg-transparent px-3 outline-none dark:text-white"
                  />
                  <select
                    value={form.currency}
                    onChange={(e) =>
                      setForm((x) => ({ ...x, currency: e.target.value }))
                    }
                    className="m-1 min-w-28 rounded-lg bg-gradient-to-bl from-amber-400 via-orange-500 to-rose-500 px-3 text-center text-sm font-semibold text-white shadow-sm outline-none"
                  >
                    <option value="">ارز را انتخاب کنید</option>
                    {currencies.map((currency) => <option key={currency.id} value={currency.title} className="bg-white text-neutral-900">{currency.title}</option>)}
                  </select>
                </div>
              </Field>
              <Field label="مانده تنخواه ثبت‌نشده">
                <input
                  value={fa(form.unregisteredBalance)}
                  onChange={(e) => money("unregisteredBalance", e.target.value)}
                  className={input}
                />
              </Field>
              <Field label="مانده تنخواه تسویه‌نشده">
                <input
                  value={fa(form.unsettledBalance)}
                  onChange={(e) => money("unsettledBalance", e.target.value)}
                  className={input}
                />
              </Field>
              <Field label="ارسال درخواست به مدیر پروژه" required>
                <select
                  value={form.projectManagerId}
                  onChange={(e) =>
                    setForm((x) => ({ ...x, projectManagerId: e.target.value }))
                  }
                  className={input}
                >
                  <option value="">انتخاب کنید</option>
                  {managers.map((u) => (
                    <option value={u.id} key={u.id}>
                      {name(u)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-5 flex justify-end border-t border-black/10 pt-4 dark:border-white/10">
              <button
                disabled={busy}
                onClick={create}
                className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black"
              >
                <img
                  src="/images/icons/check.svg"
                  className="h-5 w-5 invert dark:invert-0"
                />
              </button>
            </div>
          </section>
        )}
        {error && (
          <div className="mb-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}
        <section className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-neutral-200 dark:bg-white/10">
                <tr>
                  {[
                    "شماره درخواست",
                    "تاریخ درخواست",
                    "درخواست‌کننده",
                    "پروژه",
                    "مبلغ",
                    "ارز",
                    "وضعیت",
                    "اقدامات",
                  ].map((x) => (
                    <th className="px-3 py-2 text-center" key={x}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((x) => (
                    <tr
                      className="border-t border-black/10 dark:border-white/10"
                      key={x.id}
                    >
                      <td className="p-3 text-center">{x.requestNumber}</td>
                      <td className="p-3 text-center">{fa(x.requestDate)}</td>
                      <td className="p-3 text-center">
                        {x.requesterName || x.requesterUsername}
                      </td>
                      <td className="p-3 text-center">
                        {x.projectCode} - {x.projectName}
                      </td>
                      <td className="p-3 text-center">
                        {fa(format3(x.chargedAmount || x.requestedAmount))}
                      </td>
                      <td className="p-3 text-center">{x.currency}</td>
                      <td className="p-3 text-center">
                        {x.status === "charged"
                          ? "شارژ شد"
                          : x.stage === "finance"
                            ? "در انتظار مالی"
                            : "در انتظار مدیر پروژه"}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() =>
                            setSelected({
                              ...x,
                              managerApprovedDate: today(),
                              chargedDate: today(),
                              chargedAmount: x.requestedAmount,
                            })
                          }
                          className="rounded-lg border px-3 py-1.5"
                        >
                          {Number(x.currentAssigneeUserId) ===
                            Number(user?.id) && x.status === "pending"
                            ? "اقدامات"
                            : "نمایش"}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      className="p-10 text-center text-neutral-500"
                    >
                      هنوز درخواست تنخواهی ثبت نشده است.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        {selected && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 dark:bg-neutral-900">
              <div className="mb-5 flex justify-between">
                <b>
                  {incoming ? "بررسی درخواست تنخواه" : "جزئیات درخواست تنخواه"}
                </b>
                <button onClick={() => setSelected(null)}>×</button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="شماره درخواست">
                  <div className={input}>{selected.requestNumber}</div>
                </Field>
                <Field
                  label={
                    selected.stage === "project_manager"
                      ? "تاریخ تایید"
                      : "تاریخ شارژ تنخواه"
                  }
                >
                  <div className={input}>
                    {fa(
                      selected.stage === "project_manager"
                        ? selected.managerApprovedDate || today()
                        : selected.chargedDate || today(),
                    )}
                  </div>
                </Field>
                <Field label="درخواست‌کننده">
                  <div className={input}>
                    {selected.requesterName || selected.requesterUsername}
                  </div>
                </Field>
                <Field label="پروژه">
                  <div className={input}>
                    {selected.projectCode} - {selected.projectName}
                  </div>
                </Field>
                <Field label="مبلغ تنخواه درخواستی">
                  <div className={input}>
                    {fa(format3(selected.requestedAmount))} {selected.currency}
                  </div>
                </Field>
                <Field label="مانده تنخواه ثبت‌نشده">
                  <div className={input}>
                    {fa(format3(selected.unregisteredBalance))}
                  </div>
                </Field>
                <Field label="مانده تنخواه تسویه‌نشده">
                  <div className={input}>
                    {fa(format3(selected.unsettledBalance))}
                  </div>
                </Field>
                {selected.stage !== "project_manager" && (
                  <Field label="نقدینگی پروژه">
                    <div className={input}>
                      {fa(format3(selected.projectLiquidity || 0))}
                    </div>
                  </Field>
                )}
                {incoming && selected.stage === "project_manager" && (
                  <Field label="ارسال نهایی به واحد مالی" required>
                    <select
                      value={selected.financeUserId || ""}
                      onChange={(e) =>
                        updateSelected("financeUserId", e.target.value)
                      }
                      className={input}
                    >
                      <option value="">انتخاب کنید</option>
                      {finances.map((u) => (
                        <option value={u.id} key={u.id}>
                          {name(u)}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {incoming && selected.stage === "finance" && (
                  <Field label="مبلغ تنخواه شارژ شده">
                    <input
                      value={fa(selected.chargedAmount || "")}
                      onChange={(e) =>
                        updateSelected(
                          "chargedAmount",
                          format3(
                            toEnglishDigits(e.target.value).replace(
                              /[^\d]/g,
                              "",
                            ),
                          ),
                        )
                      }
                      className={input}
                    />
                  </Field>
                )}
              </div>
              {incoming && (
                <div className="mt-5 flex justify-end">
                  <button
                    disabled={busy}
                    onClick={action}
                    className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black"
                  >
                    <img
                      src="/images/icons/check.svg"
                      className="h-5 w-5 invert dark:invert-0"
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
