import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { todayJalaliYmd } from "../utils/date.js";
import { format3, toEnglishDigits } from "../utils/format.js";

const PAGE_ICON = "/images/icons/tenkhah.svg";
const inputClass = "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-right text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-neutral-500";
const labelClass = "mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200";

function toFaDigits(value = "") {
  return String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function isActive(user) {
  return user?.isActive !== false && user?.is_active !== false;
}

function userName(user) {
  return user?.name || user?.fullName || user?.username || "—";
}

function hasRole(user, pattern) {
  const roles = [
    user?.department,
    user?.role,
    ...(Array.isArray(user?.positions) ? user.positions.map((item) => item?.name) : []),
  ].filter(Boolean).join(" ");
  return pattern.test(roles);
}

function Field({ label, required, children }) {
  return <label className="block min-w-0">
    <span className={labelClass}>{label}{required && <span className="mr-1 text-red-500">*</span>}</span>
    {children}
  </label>;
}

export default function TenkhahPage() {
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(() => ({
    requestNumber: "",
    requestDate: todayJalaliYmd().replaceAll("-", "/"),
    projectId: "",
    amount: "",
    currency: "IRR",
    unregisteredBalance: "",
    unsettledBalance: "",
    projectManagerId: "",
    financeUserId: "",
  }));

  const requesterName = userName(user);
  const activeProjects = useMemo(() => projects.filter((project) => project?.isActive !== false && project?.is_active !== false), [projects]);
  const projectManagers = useMemo(() => users.filter((item) => isActive(item) && hasRole(item, /مدیر\s*پروژه|project\s*manager/i)), [users]);
  const financeUsers = useMemo(() => users.filter((item) => isActive(item) && hasRole(item, /مالی|حسابدار|finance|account/i)), [users]);

  const resetForm = () => setForm({
    requestNumber: "",
    requestDate: todayJalaliYmd().replaceAll("-", "/"),
    projectId: "",
    amount: "",
    currency: "IRR",
    unregisteredBalance: "",
    unsettledBalance: "",
    projectManagerId: "",
    financeUserId: "",
  });

  useEffect(() => {
    if (!formOpen) return;
    let active = true;
    setLoadingOptions(true);
    Promise.all([
      fetch("/api/projects?isActive=true", { credentials: "include" }).then((response) => response.ok ? response.json() : { items: [] }),
      fetch("/api/admin/users", { credentials: "include" }).then((response) => response.ok ? response.json() : { users: [] }),
    ]).then(([projectData, userData]) => {
      if (!active) return;
      setProjects(Array.isArray(projectData?.items) ? projectData.items : projectData?.projects || []);
      setUsers(Array.isArray(userData?.users) ? userData.users : []);
    }).catch(() => {
      if (!active) return;
      setProjects([]);
      setUsers([]);
    }).finally(() => active && setLoadingOptions(false));
    return () => { active = false; };
  }, [formOpen]);

  const openForm = () => {
    resetForm();
    setNotice("");
    setFormOpen(true);
  };

  const updateMoney = (key, value) => setForm((current) => ({
    ...current,
    [key]: format3(toEnglishDigits(value).replace(/[^\d]/g, "")),
  }));

  const submitPreview = () => {
    setNotice("فرم آماده است؛ ثبت و ارسال آن همراه با بک‌اند و گردش‌کار در مرحله بعد فعال می‌شود.");
  };

  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <Card className="overflow-hidden rounded-2xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-neutral-900 md:p-4">
        <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
              <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
            </span>
            <h1 className="truncate text-base font-bold text-neutral-900 dark:text-white md:text-lg">تنخواه</h1>
          </div>
          <button type="button" onClick={() => formOpen ? setFormOpen(false) : openForm()} className="grid h-10 w-10 place-items-center rounded-xl ring-1 ring-black/15 transition hover:bg-black/5 dark:ring-white/15 dark:hover:bg-white/10" title={formOpen ? "بستن" : "افزودن"} aria-label={formOpen ? "بستن" : "افزودن"}>
            <img src={formOpen ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" />
          </button>
        </div>

        {formOpen ? (
          <section className="rounded-2xl border border-black/10 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03] md:p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">درخواست تنخواه جدید</h2>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">اطلاعات درخواست را تکمیل و مسئول هر مرحله را انتخاب کنید.</p>
              </div>
              {loadingOptions && <span className="text-xs text-neutral-500 dark:text-neutral-400">در حال دریافت اطلاعات…</span>}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="شماره درخواست" required>
                <input value={form.requestNumber} onChange={(event) => setForm((current) => ({ ...current, requestNumber: event.target.value }))} className={inputClass} placeholder="شماره درخواست را وارد کنید" />
              </Field>
              <Field label="تاریخ درخواست" required>
                <JalaliPopupDatePicker value={form.requestDate} onChange={(requestDate) => setForm((current) => ({ ...current, requestDate }))} disableFuture buttonClassName={`${inputClass} flex items-center justify-between`} />
              </Field>
              <Field label="درخواست‌کننده">
                <div className={`${inputClass} flex items-center bg-neutral-100 text-neutral-600 dark:bg-white/[0.07] dark:text-neutral-300`} aria-label="نام کاربر فعلی">{requesterName}</div>
              </Field>
              <Field label="پروژه" required>
                <select value={form.projectId} onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))} className={inputClass}>
                  <option value="">پروژه فعال را انتخاب کنید</option>
                  {activeProjects.map((project) => <option key={project.id} value={project.id}>{project.code ? `${project.code} - ` : ""}{project.name}</option>)}
                </select>
              </Field>
              <Field label="مبلغ تنخواه درخواستی" required>
                <div className="flex overflow-hidden rounded-xl border border-black/10 bg-white focus-within:border-neutral-400 dark:border-white/15 dark:bg-white/5">
                  <input inputMode="numeric" value={toFaDigits(form.amount)} onChange={(event) => updateMoney("amount", event.target.value)} className="h-11 min-w-0 flex-1 bg-transparent px-3 text-right text-sm text-neutral-900 outline-none dark:text-white" placeholder="۰" />
                  <select value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} className="m-1 h-9 rounded-lg bg-[#e9a154] px-3 text-sm font-medium text-white outline-none">
                    <option value="IRR">ریال</option><option value="IRT">تومان</option><option value="USD">دلار</option><option value="EUR">یورو</option>
                  </select>
                </div>
              </Field>
              <Field label="مانده تنخواه ثبت‌نشده">
                <input inputMode="numeric" value={toFaDigits(form.unregisteredBalance)} onChange={(event) => updateMoney("unregisteredBalance", event.target.value)} className={inputClass} placeholder="۰" />
              </Field>
              <Field label="مانده تنخواه تسویه‌نشده">
                <input inputMode="numeric" value={toFaDigits(form.unsettledBalance)} onChange={(event) => updateMoney("unsettledBalance", event.target.value)} className={inputClass} placeholder="۰" />
              </Field>
              <Field label="ارسال درخواست به مدیر پروژه" required>
                <select value={form.projectManagerId} onChange={(event) => setForm((current) => ({ ...current, projectManagerId: event.target.value }))} className={inputClass}>
                  <option value="">انتخاب کنید</option>
                  {projectManagers.map((item) => <option key={item.id} value={item.id}>{userName(item)}</option>)}
                  {!loadingOptions && !projectManagers.length && <option disabled>مدیر پروژه‌ای تعریف نشده است</option>}
                </select>
              </Field>
              <Field label="ارسال نهایی به واحد مالی" required>
                <select value={form.financeUserId} onChange={(event) => setForm((current) => ({ ...current, financeUserId: event.target.value }))} className={inputClass}>
                  <option value="">انتخاب کنید</option>
                  {financeUsers.map((item) => <option key={item.id} value={item.id}>{userName(item)}</option>)}
                  {!loadingOptions && !financeUsers.length && <option disabled>عضو واحد مالی تعریف نشده است</option>}
                </select>
              </Field>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-black/10 pt-4 dark:border-white/10">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">مسیر درخواست: درخواست‌کننده ← مدیر پروژه ← واحد مالی</p>
              <button type="button" onClick={submitPreview} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white transition hover:bg-black/85 dark:bg-white dark:text-black" title="ارسال درخواست" aria-label="ارسال درخواست">
                <img src="/images/icons/check.svg" alt="" className="h-5 w-5 invert dark:invert-0" />
              </button>
            </div>
            {notice && <div role="status" className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{notice}</div>}
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-white/10 dark:text-neutral-100">
                  <tr>
                    {["شماره درخواست", "تاریخ درخواست", "درخواست‌کننده", "پروژه", "مبلغ", "ارز", "وضعیت", "ارسال به"].map((label) => <th key={label} className="px-3 py-2 text-center text-[14px] font-semibold md:text-[15px]">{label}</th>)}
                  </tr>
                </thead>
                <tbody className="[&_tr:nth-child(odd)]:bg-white [&_tr:nth-child(even)]:bg-neutral-50 dark:[&_tr:nth-child(odd)]:bg-neutral-900 dark:[&_tr:nth-child(even)]:bg-neutral-800/50">
                  <tr><td colSpan="8" className="px-3 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">هنوز درخواست تنخواهی ثبت نشده است.</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </Card>
    </div>
  );
}
