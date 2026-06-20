import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { JalaliDatePicker } from "../components/JalaliDatePicker";
import { useAuth } from "../components/AuthProvider";
import { todayJalaliYmd } from "../utils/date";
import { toEnglishDigits } from "../utils/format";

const EMPTY_FORM = {
  dateJalali: todayJalaliYmd(),
  scope: "office",
  title: "",
  amount: "",
  beneficiaryName: "",
  bankInfo: "",
  description: "",
  docId: "pre_invoice",
  docOther: "",
  docNumber: "",
  docDateJalali: "",
};

const SCOPE_OPTIONS = [
  ["office", "دفتر مرکزی"],
  ["site", "سایت"],
  ["finance", "مالی"],
  ["cash", "نقدی"],
  ["capex", "سرمایه‌ای"],
  ["projects", "پروژه‌ها"],
];

const DOC_OPTIONS = [
  ["pre_invoice", "پیش‌فاکتور"],
  ["invoice", "فاکتور"],
  ["goods_services", "صورت‌حساب رسمی کالا و خدمات"],
  ["other_invoice", "صورت‌حساب غیررسمی"],
  ["status_invoice", "صورت‌وضعیت"],
  ["internal_list", "لیست پرداخت داخلی"],
  ["gov_salary", "فیش بدهی دولتی"],
  ["other", "سایر"],
];

const STATUS_LABELS = {
  pending: "در انتظار بررسی",
  approved: "تأییدشده",
  rejected: "ردشده",
  returned: "برگشت‌خورده",
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-white/15 dark:bg-white/5 dark:text-white dark:focus:border-white/30 dark:focus:ring-white/10";

function parseAmount(value) {
  const digits = toEnglishDigits(String(value || "")).replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function formatAmount(value) {
  const amount = parseAmount(value);
  return amount ? amount.toLocaleString("en-US") : "";
}

function formatDate(value) {
  if (!value) return "—";
  return String(value).replaceAll("-", "/");
}

function isMarandi(user) {
  const username = String(user?.username || "").trim().toLowerCase();
  const email = String(user?.email || "").trim().toLowerCase();
  return username === "marandi" || email === "marandi@ipecgroup.net";
}

export default function PaymentRequestPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selected, setSelected] = useState(null);

  const mainAdmin = useMemo(() => isMarandi(user), [user]);

  const api = useCallback(
    async (path, options = {}) => {
      const uid = user?.id != null ? String(user.id) : "";
      const response = await fetch(`/api${path}`, {
        credentials: "include",
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(uid ? { "x-user-id": uid } : {}),
          ...(options.headers || {}),
        },
      });
      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }
      if (!response.ok) throw new Error(data.error || data.message || "request_failed");
      return data;
    },
    [user?.id]
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api(mainAdmin ? "/requests" : "/requests?view=mine");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setError("دریافت درخواست‌ها انجام نشد. لطفاً دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }, [api, mainAdmin]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
    setSuccess("");
  };

  const submit = async (event) => {
    event.preventDefault();
    const amount = parseAmount(form.amount);
    if (!form.title.trim()) {
      setError("موضوع درخواست را وارد کنید.");
      return;
    }
    if (amount <= 0) {
      setError("مبلغ درخواست باید بیشتر از صفر باشد.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await api("/requests", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          amount,
          beneficiaryName: form.beneficiaryName.trim() || null,
          bankInfo: form.bankInfo.trim() || null,
          description: form.description.trim() || null,
          docOther: form.docId === "other" ? form.docOther.trim() || null : null,
          serial: `PR-${Date.now()}`,
        }),
      });
      setForm({ ...EMPTY_FORM, dateJalali: todayJalaliYmd() });
      setSuccess("درخواست با موفقیت ثبت و برای مرندی ارسال شد.");
      await loadItems();
    } catch (submitError) {
      setError(
        submitError.message === "marandi_user_not_found"
          ? "کاربر مرندی در سامانه پیدا نشد."
          : "ثبت درخواست انجام نشد. لطفاً دوباره تلاش کنید."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir="rtl" className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      <div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">درخواست پرداخت</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          فرم را تکمیل کنید؛ درخواست پس از ثبت مستقیماً برای مرندی ارسال می‌شود.
        </p>
      </div>

      <Card className="p-5 md:p-6">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="تاریخ درخواست">
              <div className="mt-1.5 [&_input]:h-[42px] [&_input]:border-black/10 [&_input]:px-3 dark:[&_input]:border-white/15 dark:[&_input]:bg-white/5 dark:[&_input]:text-white">
                <JalaliDatePicker
                  value={form.dateJalali}
                  onChange={(value) => setField("dateJalali", value)}
                />
              </div>
            </Field>
            <Field label="نوع هزینه">
              <select
                className={inputClass}
                value={form.scope}
                onChange={(event) => setField("scope", event.target.value)}
              >
                {SCOPE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="مبلغ (ریال)" required>
              <input
                className={inputClass}
                inputMode="numeric"
                value={form.amount}
                onChange={(event) => setField("amount", formatAmount(event.target.value))}
                placeholder="مثلاً 10,000,000"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="موضوع درخواست" required>
              <input
                className={inputClass}
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
                placeholder="موضوع پرداخت"
              />
            </Field>
            <Field label="نام ذی‌نفع">
              <input
                className={inputClass}
                value={form.beneficiaryName}
                onChange={(event) => setField("beneficiaryName", event.target.value)}
                placeholder="نام شخص یا شرکت"
              />
            </Field>
          </div>

          <Field label="اطلاعات بانکی ذی‌نفع">
            <input
              className={inputClass}
              value={form.bankInfo}
              onChange={(event) => setField("bankInfo", event.target.value)}
              placeholder="نام بانک، شماره شبا یا شماره حساب"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="نوع مدرک">
              <select
                className={inputClass}
                value={form.docId}
                onChange={(event) => setField("docId", event.target.value)}
              >
                {DOC_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label={form.docId === "other" ? "عنوان مدرک" : "شماره مدرک"}>
              <input
                className={inputClass}
                value={form.docId === "other" ? form.docOther : form.docNumber}
                onChange={(event) =>
                  setField(form.docId === "other" ? "docOther" : "docNumber", event.target.value)
                }
              />
            </Field>
            <Field label="تاریخ مدرک">
              <div className="mt-1.5 [&_input]:h-[42px] [&_input]:border-black/10 [&_input]:px-3 dark:[&_input]:border-white/15 dark:[&_input]:bg-white/5 dark:[&_input]:text-white">
                <JalaliDatePicker
                  value={form.docDateJalali}
                  onChange={(value) => setField("docDateJalali", value)}
                />
              </div>
            </Field>
          </div>

          <Field label="شرح درخواست">
            <textarea
              className={`${inputClass} min-h-24 resize-y`}
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
              placeholder="توضیحات تکمیلی"
            />
          </Field>

          {(error || success) && (
            <div
              className={`rounded-xl px-3 py-2 text-sm ${
                error
                  ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
              }`}
            >
              {error || success}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {submitting ? "در حال ارسال..." : "ثبت و ارسال درخواست"}
            </button>
          </div>
        </form>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 dark:border-white/10">
          <h2 className="font-semibold">
            {mainAdmin ? "همه درخواست‌های ثبت‌شده" : "درخواست‌های ثبت‌شده من"}
          </h2>
          <span className="text-xs text-neutral-500">{items.length} درخواست</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="bg-neutral-50 text-neutral-600 dark:bg-white/5 dark:text-neutral-300">
              <tr>
                <th className="px-4 py-3 font-medium">تاریخ</th>
                {mainAdmin && <th className="px-4 py-3 font-medium">ثبت‌کننده</th>}
                <th className="px-4 py-3 font-medium">موضوع</th>
                <th className="px-4 py-3 font-medium">ذی‌نفع</th>
                <th className="px-4 py-3 font-medium">مبلغ (ریال)</th>
                <th className="px-4 py-3 font-medium">وضعیت</th>
                <th className="px-4 py-3 font-medium">جزئیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {loading ? (
                <tr><td colSpan={mainAdmin ? 7 : 6} className="px-4 py-10 text-center text-neutral-500">در حال دریافت...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={mainAdmin ? 7 : 6} className="px-4 py-10 text-center text-neutral-500">هنوز درخواستی ثبت نشده است.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/70 dark:hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(item.dateFa || item.date_jalali)}</td>
                    {mainAdmin && <td className="px-4 py-3">{item.createdByName || `کاربر #${item.createdById}`}</td>}
                    <td className="max-w-64 truncate px-4 py-3 font-medium">{item.title}</td>
                    <td className="px-4 py-3">{item.beneficiaryName || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{Number(item.amount || 0).toLocaleString("fa-IR")}</td>
                    <td className="px-4 py-3">
                      <span className="whitespace-nowrap rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700 dark:bg-white/10 dark:text-neutral-200">
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelected(item)}
                        className="rounded-lg border border-black/10 px-3 py-1.5 text-xs hover:bg-neutral-100 dark:border-white/15 dark:hover:bg-white/10"
                      >
                        مشاهده
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div
            className="w-full max-w-xl rounded-2xl bg-white p-5 text-neutral-900 shadow-2xl dark:bg-neutral-900 dark:text-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold">{selected.title}</h3>
                <p className="mt-1 text-xs text-neutral-500">{formatDate(selected.dateFa || selected.date_jalali)}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg px-2 py-1 text-xl">×</button>
            </div>
            <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <Detail label="مبلغ" value={`${Number(selected.amount || 0).toLocaleString("fa-IR")} ریال`} />
              <Detail label="ذی‌نفع" value={selected.beneficiaryName || "—"} />
              <Detail label="اطلاعات بانکی" value={selected.bankInfo || "—"} />
              <Detail label="شماره مدرک" value={selected.docNumber || "—"} />
              <div className="sm:col-span-2"><Detail label="شرح" value={selected.description || "—"} /></div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, required = false, children }) {
  return (
    <label className="block text-sm text-neutral-700 dark:text-neutral-200">
      {label}{required && <span className="mr-1 text-red-500">*</span>}
      {children}
    </label>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="mt-1 break-words">{value}</dd>
    </div>
  );
}
