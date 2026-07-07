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
  const [activeTab, setActiveTab] = useState("supply");
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

  const topTabBtnClass = (isActive, index, total) =>
    [
      "relative z-10 h-10 min-w-[118px] flex-none rounded-lg px-3 text-[11px] font-semibold transition whitespace-nowrap md:h-11 md:min-w-[150px] md:flex-1 md:rounded-none md:px-4 md:text-sm",
      index > 0 ? "md:border-r md:border-black/10 md:dark:border-neutral-800" : "",
      index === 0 ? "md:rounded-tr-2xl" : "",
      index === total - 1 ? "md:rounded-tl-2xl" : "",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20",
      isActive
        ? "bg-black text-white shadow-sm dark:bg-black dark:text-white"
        : "bg-white text-[#1f2937] hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800",
    ].join(" ");

  const tableWrapCls =
    "bg-white text-black rounded-2xl border border-black/10 overflow-hidden dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800";
  const theadRowCls =
    "bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700";
  const tbodyCls =
    "[&_td]:text-black dark:[&_td]:text-neutral-100 [&_tr:nth-child(odd)]:bg-white [&_tr:nth-child(even)]:bg-neutral-50 dark:[&_tr:nth-child(odd)]:bg-neutral-900 dark:[&_tr:nth-child(even)]:bg-neutral-800/50";
  const rowDividerCls = "border-b border-neutral-300 dark:border-neutral-700";

  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white p-3 text-neutral-900 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 md:p-4">
        <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
          <h1 className="text-base font-bold md:text-lg">کارتابل</h1>
        </div>

        {error && <div className="m-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

        <div
          className="mx-auto mb-0 flex w-full max-w-[360px] items-center justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-xl border border-black/10 bg-black/[0.03] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mb-px md:max-w-[760px] md:items-stretch md:justify-center md:gap-0 md:rounded-b-none md:rounded-t-2xl md:border-b-0 md:bg-white md:p-0 md:shadow-sm dark:border-neutral-800 dark:bg-white/[0.04] md:dark:bg-neutral-900"
          dir="rtl"
        >
          <button type="button" onClick={() => setActiveTab("supply")} className={topTabBtnClass(activeTab === "supply", 0, 2)}>
            درخواست تامین
          </button>
          <button type="button" onClick={() => setActiveTab("management")} className={topTabBtnClass(activeTab === "management", 1, 2)}>
            مدیریت درخواست ها
          </button>
        </div>

        <div className={tableWrapCls}>
          {activeTab === "supply" ? (
            <>
              <div className="md:hidden">
                {loading ? (
                  <div className="px-4 py-8 text-center text-sm text-black/60 dark:text-neutral-400">در حال دریافت...</div>
                ) : items.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-black/60 dark:text-neutral-400">موردی در کارتابل شما وجود ندارد.</div>
                ) : (
                  <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {items.map((item) => (
                      <button key={item.id} type="button" onClick={() => openPreview(item)} className="block w-full p-3 text-right transition hover:bg-black/[0.03] dark:hover:bg-white/10">
                        <div className="flex items-center justify-between gap-2">
                          <b dir="ltr" className="font-sans text-sm tabular-nums">{item.serial || "—"}</b>
                          <StatusBadge status={displayStatusOf(item)} />
                        </div>
                        <div className="mt-2 truncate text-sm">{item.title || "—"}</div>
                        <div className="mt-2 text-xs text-neutral-500">{projectLabel(item)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="hidden max-h-[55vh] overflow-y-auto overflow-x-hidden md:block" dir="ltr">
                <table dir="rtl" className="w-full min-w-full table-fixed text-sm [&_td]:min-w-0 [&_td]:py-0.5 [&_td]:text-center [&_th]:whitespace-nowrap [&_th]:py-0.5 [&_th]:text-center">
                  <colgroup>
                    <col style={{ width: 112 }} />
                    <col style={{ width: 104 }} />
                    <col />
                    <col style={{ width: 190 }} />
                    <col style={{ width: 150 }} />
                    <col style={{ width: 92 }} />
                  </colgroup>
                  <thead>
                    <tr className={theadRowCls}>
                      <th className="sticky top-0 z-30 bg-neutral-200 !py-2 !text-[14px] !font-semibold dark:bg-white/10 md:!text-[15px]">شماره</th>
                      <th className="sticky top-0 z-30 bg-neutral-200 !py-2 !text-[14px] !font-semibold dark:bg-white/10 md:!text-[15px]">تاریخ</th>
                      <th className="sticky top-0 z-30 bg-neutral-200 !py-2 !text-[14px] !font-semibold dark:bg-white/10 md:!text-[15px]">موضوع</th>
                      <th className="sticky top-0 z-30 bg-neutral-200 !py-2 !text-[14px] !font-semibold dark:bg-white/10 md:!text-[15px]">پروژه</th>
                      <th className="sticky top-0 z-30 bg-neutral-200 !py-2 !text-[14px] !font-semibold dark:bg-white/10 md:!text-[15px]">وضعیت</th>
                      <th className="sticky top-0 z-30 bg-neutral-200 !py-2 !text-[14px] !font-semibold dark:bg-white/10 md:!text-[15px]">اقدام</th>
                    </tr>
                  </thead>
                  <tbody className={tbodyCls}>
                    {loading ? (
                      <tr><td colSpan={6} className="py-8 text-neutral-500">در حال دریافت...</td></tr>
                    ) : items.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-neutral-500">موردی در کارتابل شما وجود ندارد.</td></tr>
                    ) : (
                      items.map((item, index) => {
                        const isLast = index === items.length - 1;
                        const tdBorder = isLast ? "" : rowDividerCls;
                        return (
                          <tr key={item.id} className="group transition-colors hover:bg-black/[0.04] dark:hover:bg-white/10">
                            <td dir="ltr" className={`${tdBorder} px-3 font-sans tabular-nums`}>
                              <button type="button" onClick={() => openPreview(item)} className="underline-offset-4 transition hover:underline">
                                {item.serial || "—"}
                              </button>
                            </td>
                            <td className={`${tdBorder} px-3`}>{toFaDigits(String(item.dateJalali || item.dateFa || "—").replaceAll("-", "/"))}</td>
                            <td className={`${tdBorder} px-3`}><span className="mx-auto block truncate">{item.title || "—"}</span></td>
                            <td className={`${tdBorder} px-3`}><span className="mx-auto block truncate">{projectLabel(item)}</span></td>
                            <td className={`${tdBorder} px-3`}><StatusBadge status={displayStatusOf(item)} /></td>
                            <td className={`${tdBorder} px-3`}>
                              <button type="button" onClick={() => openPreview(item)} className="mx-auto grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/[0.04] dark:hover:bg-white/10" title="اقدام" aria-label="اقدام">
                                <img src="/images/icons/namayeshname.svg" alt="" className="h-4 w-4 dark:invert" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-black/60 dark:text-neutral-400">
              موردی برای مدیریت درخواست‌ها ثبت نشده است.
            </div>
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
