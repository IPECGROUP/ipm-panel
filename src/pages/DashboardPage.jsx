import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SupplyRequestPreview } from "./SupplyRequestPage.jsx";
import { useAuth } from "../components/AuthProvider.jsx";

const statusLabels = {
  pending: "در انتظار تایید اولیه",
  final_approval: "در انتظار تایید نهایی",
  approved: "در انتظار تایید نهایی",
  in_progress: "در حال اقدام",
  done: "انجام شد",
  completed: "انجام شد",
  canceled: "لغو شد",
  cancelled: "لغو شد",
  rejected: "لغو شد",
  returned: "در انتظار تایید اولیه",
};

function toFaDigits(value = "") {
  return String(value ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function displayStatusOf(item) {
  return item?.workflowStatus || item?.status || "";
}

function projectLabel(item) {
  const code = item?.projectCode || "";
  const name = item?.projectName || "";
  if (code && name) return `${code} - ${name}`;
  return name || code || "—";
}

function StatusBadge({ status }) {
  const cls =
    status === "done" || status === "completed"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
      : status === "canceled" || status === "cancelled" || status === "rejected"
        ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
        : status === "in_progress"
          ? "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
          : status === "final_approval" || status === "approved"
            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
            : "bg-neutral-100 text-neutral-700 dark:bg-white/10 dark:text-neutral-200";
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${cls}`}>{statusLabels[status] || "—"}</span>;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [actionNote, setActionNote] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(`/api${path}`, {
      credentials: "include",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(user?.id != null ? { "x-user-id": String(user.id) } : {}),
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {}
    if (!response.ok) throw new Error(data.error || data.message || "request_failed");
    return data;
  }, [user?.id]);

  const loadCartable = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    setError("");
    try {
      const data = await api("/supply-requests?cartable=1");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setError("دریافت کارتابل انجام نشد.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [api, authLoading]);

  useEffect(() => {
    loadCartable();
  }, [loadCartable]);

  const projects = useMemo(() => {
    const byId = new Map();
    items.forEach((item) => {
      if (!item.projectId || byId.has(String(item.projectId))) return;
      byId.set(String(item.projectId), {
        id: item.projectId,
        code: item.projectCode || "",
        name: item.projectName || "",
      });
    });
    return Array.from(byId.values());
  }, [items]);

  const openPreview = (item) => {
    setSelected(item);
    setActionNote("");
    setActionError("");
  };

  const recordWorkflowAction = async (workflowAction, extraPayload = {}) => {
    if (!selected || actionBusy) return;
    setActionBusy(true);
    setActionError("");
    try {
      const data = await api("/supply-requests", {
        method: "POST",
        body: JSON.stringify({
          id: selected.id,
          workflowAction,
          note: actionNote,
          ...extraPayload,
        }),
      });
      const nextItem = data?.item || null;
      if (nextItem) {
        setSelected(nextItem.canAct ? nextItem : null);
      }
      setActionNote("");
      await loadCartable();
    } catch (ex) {
      const message = String(ex?.message || "");
      setActionError(
        message === "target_assignee_required"
          ? "گیرنده درخواست تامین را انتخاب کنید."
          : message === "target_assignee_invalid"
            ? "گیرنده انتخاب شده برای این مرحله معتبر نیست."
            : message === "forbidden"
              ? "شما اجازه انجام این اقدام را ندارید."
              : "ثبت اقدام انجام نشد."
      );
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100">
        <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
          <div>
            <h1 className="text-base font-bold md:text-lg">کارتابل</h1>
            <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">درخواست‌های تامین ارجاع‌شده برای اقدام</div>
          </div>
          <button
            type="button"
            onClick={loadCartable}
            disabled={loading}
            className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
            title="به‌روزرسانی"
            aria-label="به‌روزرسانی"
          >
            <span className={`block h-4 w-4 rounded-full border-2 border-current border-t-transparent ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {error && <div className="m-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

        <div className="hidden overflow-x-auto md:block" dir="ltr">
          <table dir="rtl" className="w-full min-w-[820px] table-fixed text-sm [&_td]:py-2 [&_td]:text-center [&_th]:py-2 [&_th]:text-center">
            <colgroup>
              <col style={{ width: 130 }} />
              <col style={{ width: 120 }} />
              <col />
              <col style={{ width: 190 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 92 }} />
            </colgroup>
            <thead>
              <tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-white/10 dark:text-neutral-100">
                <th>شماره</th>
                <th>تاریخ</th>
                <th>موضوع</th>
                <th>پروژه</th>
                <th>وضعیت</th>
                <th>اقدام</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-neutral-500">در حال دریافت...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-neutral-500">موردی در کارتابل شما وجود ندارد.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="bg-black/[0.02] transition hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10">
                    <td dir="ltr" className="border-b border-neutral-300 px-3 font-sans tabular-nums dark:border-neutral-700">
                      <button type="button" onClick={() => openPreview(item)} className="underline-offset-4 transition hover:underline">
                        {item.serial || "—"}
                      </button>
                    </td>
                    <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFaDigits(String(item.dateJalali || item.dateFa || "—").replaceAll("-", "/"))}</td>
                    <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="mx-auto block truncate">{item.title || "—"}</span></td>
                    <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="mx-auto block truncate">{projectLabel(item)}</span></td>
                    <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><StatusBadge status={displayStatusOf(item)} /></td>
                    <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">
                      <button type="button" onClick={() => openPreview(item)} className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white transition hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="اقدام" aria-label="اقدام">
                        <img src="/images/icons/namayeshname.svg" alt="" className="h-4 w-4 dark:invert" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-3 md:hidden">
          {loading ? (
            <div className="py-6 text-center text-sm text-neutral-500">در حال دریافت...</div>
          ) : items.length === 0 ? (
            <div className="py-6 text-center text-sm text-neutral-500">موردی در کارتابل شما وجود ندارد.</div>
          ) : (
            items.map((item) => (
              <button key={item.id} type="button" onClick={() => openPreview(item)} className="rounded-xl border border-black/10 p-3 text-right transition hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/10">
                <div className="flex items-center justify-between gap-2">
                  <b dir="ltr" className="font-sans tabular-nums">{item.serial || "—"}</b>
                  <StatusBadge status={displayStatusOf(item)} />
                </div>
                <div className="mt-2 truncate text-sm">{item.title || "—"}</div>
                <div className="mt-2 text-xs text-neutral-500">{projectLabel(item)}</div>
              </button>
            ))
          )}
        </div>
      </section>

      {selected && (
        <SupplyRequestPreview
          item={selected}
          projects={projects}
          actionNote={actionNote}
          setActionNote={setActionNote}
          actionBusy={actionBusy}
          actionError={actionError}
          onAction={recordWorkflowAction}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
