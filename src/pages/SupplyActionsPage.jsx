// اقدامات تامین
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";
import { useAuth } from "../components/AuthProvider.jsx";

const PAGE_ICON = "/images/icons/egdamat-tamin.svg";

const statusLabels = {
  in_progress: "در حال اقدام",
  done: "انجام شد",
  canceled: "لغو شد",
  pending: "در حال اقدام",
  approved: "انجام شد",
  rejected: "لغو شد",
};

const inputCls =
  "h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-right text-sm text-neutral-900 outline-none transition " +
  "placeholder:text-neutral-400 focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-neutral-100 dark:placeholder:text-neutral-500";

function toFaDigits(value = "") {
  return String(value ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function normalizeDigits(value = "") {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function formatDate(value) {
  return toFaDigits(String(value || "—").replaceAll("-", "/"));
}

function projectLabel(item) {
  const code = item?.projectCode || "";
  const name = item?.projectName || "";
  if (code && name) return `${code} - ${name}`;
  return item?.projectLabel || name || code || "—";
}

function actionFiles(action) {
  return Array.isArray(action?.files) ? action.files : [];
}

function clientActionTime() {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}

function formatActionTime(action) {
  const ownTime = normalizeDigits(action?.time || "");
  if (/^\d{1,2}:\d{2}$/.test(ownTime)) return toFaDigits(ownTime);
  if (!action?.createdAt) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(action.createdAt));
  } catch {
    return "—";
  }
}

function shouldPersist(action) {
  return !!(action?.date || action?.description || actionFiles(action).length || action?.status !== "in_progress");
}

function statusBadgeClass(status) {
  if (status === "done" || status === "approved") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  if (status === "canceled" || status === "rejected") return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
  return "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300";
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${statusBadgeClass(status)}`}>
      {statusLabels[status] || "در حال اقدام"}
    </span>
  );
}

export default function SupplyActionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedActionId = searchParams.get("request");
  const openedNotificationRef = useRef("");
  const uploadFileRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [editingIds, setEditingIds] = useState({});
  const [savingIds, setSavingIds] = useState({});
  const [uploadingIds, setUploadingIds] = useState({});
  const [uploadTarget, setUploadTarget] = useState(null);
  const [filesModal, setFilesModal] = useState(null);

  const api = useCallback(
    async (path, options = {}) => {
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
    },
    [user?.id]
  );

  const loadItems = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    setError("");
    try {
      const data = await api("/supply-actions");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setError("دریافت کارهای در دست انجام انجام نشد.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [api, authLoading]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const expandedItem = useMemo(() => items.find((item) => String(item.id) === String(expandedId)) || null, [expandedId, items]);

  const patchItem = (requestId, updater) => {
    setItems((prev) => prev.map((item) => (String(item.id) === String(requestId) ? updater(item) : item)));
  };

  const patchAction = (requestId, actionId, patch) => {
    patchItem(requestId, (item) => ({
      ...item,
      actions: (Array.isArray(item.actions) ? item.actions : []).map((action) =>
        String(action.id) === String(actionId) ? { ...action, ...patch } : action
      ),
    }));
  };

  const replaceItem = (nextItem) => {
    if (!nextItem) return;
    setItems((prev) => prev.map((item) => (String(item.id) === String(nextItem.id) ? nextItem : item)));
  };

  const persistAction = async (requestId, action) => {
    if (!action || !shouldPersist(action)) return;
    const key = `${requestId}:${action.id}`;
    setSavingIds((prev) => ({ ...prev, [key]: true }));
    setError("");
    try {
      const data = await api("/supply-actions", {
        method: "POST",
        body: JSON.stringify({
          requestId,
          actionId: action.id,
          date: action.date || "",
          description: action.description || "",
          status: action.status || "in_progress",
          time: action.time || "",
          files: actionFiles(action),
        }),
      });
      replaceItem(data?.item);
      setEditingIds((prev) => ({ ...prev, [key]: false }));
    } catch {
      setError("ذخیره اقدام تامین انجام نشد.");
    } finally {
      setSavingIds((prev) => ({ ...prev, [key]: false }));
    }
  };

  const addActionRow = (requestId) => {
    const current = items.find((item) => String(item.id) === String(requestId));
    if (Array.isArray(current?.actions) && current.actions.some((action) => action?.isNew)) return;
    const latestAction = (Array.isArray(current?.actions) ? current.actions : [])
      .filter((action) => !action?.isNew)
      .sort((a, b) => String(b?.createdAt || b?.updatedAt || "").localeCompare(String(a?.createdAt || a?.updatedAt || "")))[0];
    if (latestAction && latestAction.status !== "in_progress") return;
    const id = `sa_client_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    patchItem(requestId, (item) => ({
      ...item,
      actions: [{ id, date: "", time: clientActionTime(), description: "", status: "in_progress", files: [], isNew: true }, ...(Array.isArray(item.actions) ? item.actions : [])],
    }));
    setEditingIds((prev) => ({ ...prev, [`${requestId}:${id}`]: true }));
  };

  const openActions = (item) => {
    addActionRow(item.id);
    setExpandedId(item.id);
  };

  useEffect(() => {
    if (!requestedActionId || loading || openedNotificationRef.current === requestedActionId) return;
    const requested = items.find((item) => String(item.id) === String(requestedActionId));
    if (!requested) return;
    openedNotificationRef.current = requestedActionId;
    openActions(requested);
  }, [items, loading, requestedActionId]);

  const deleteAction = async (requestId, action) => {
    const key = `${requestId}:${action.id}`;
    if (action.isNew && !shouldPersist(action)) {
      patchItem(requestId, (item) => ({ ...item, actions: (item.actions || []).filter((row) => String(row.id) !== String(action.id)) }));
      return;
    }
    setSavingIds((prev) => ({ ...prev, [key]: true }));
    try {
      const data = await api("/supply-actions", {
        method: "POST",
        body: JSON.stringify({ mode: "delete", requestId, actionId: action.id }),
      });
      replaceItem(data?.item);
    } catch {
      setError("حذف اقدام تامین انجام نشد.");
    } finally {
      setSavingIds((prev) => ({ ...prev, [key]: false }));
    }
  };

  const uploadFiles = async (fileList) => {
    const requestId = uploadTarget?.requestId;
    const action = uploadTarget?.action;
    const files = Array.from(fileList || []);
    if (!requestId || !action || !files.length) return;
    const key = `${requestId}:${action.id}`;
    setUploadingIds((prev) => ({ ...prev, [key]: true }));
    setError("");
    try {
      const uploadedFiles = [];
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/supply-actions/upload", {
          method: "POST",
          credentials: "include",
          headers: user?.id != null ? { "x-user-id": String(user.id) } : undefined,
          body,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || "upload_failed");
        uploadedFiles.push(data.file || data);
      }
      const nextAction = { ...action, files: [...actionFiles(action), ...uploadedFiles] };
      patchAction(requestId, action.id, { files: nextAction.files });
      if (!action.isNew) await persistAction(requestId, nextAction);
      setUploadTarget((prev) => (prev ? { ...prev, action: nextAction } : prev));
    } catch {
      setError("بارگذاری فایل انجام نشد.");
    } finally {
      setUploadingIds((prev) => ({ ...prev, [key]: false }));
      if (uploadFileRef.current) uploadFileRef.current.value = "";
    }
  };

  const removeUploadedFile = async (index) => {
    const requestId = uploadTarget?.requestId;
    const action = uploadTarget?.action;
    if (!requestId || !action) return;
    const nextFiles = actionFiles(action).filter((_, i) => i !== index);
    const nextAction = { ...action, files: nextFiles };
    patchAction(requestId, action.id, { files: nextFiles });
    setUploadTarget((prev) => (prev ? { ...prev, action: nextAction } : prev));
    if (!action.isNew) await persistAction(requestId, nextAction);
  };

  const tableWrapCls =
    "overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100";
  const theadCls = "border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-white/10 dark:text-neutral-100";
  const tdBorder = "border-b border-neutral-300 dark:border-neutral-700";

  return (
    <div dir="rtl" className="mx-auto max-w-[1400px]">
      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white p-3 text-neutral-900 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 md:p-4">
        <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
              <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold md:text-lg">کار های در دست انجام</span>
              <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت تامین و پشتیبانی</span>
            </span>
          </div>
        </div>

        {error && <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

        <SupplyActionsFilterMock />

        <div className={tableWrapCls}>
          <div className="hidden overflow-x-auto md:block" dir="ltr">
            <table dir="rtl" className="w-full min-w-[860px] table-fixed text-sm [&_td]:py-1.5 [&_td]:text-center [&_th]:py-2 [&_th]:text-center">
              <colgroup>
                <col style={{ width: 130 }} />
                <col style={{ width: 120 }} />
                <col />
                <col style={{ width: 210 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 110 }} />
              </colgroup>
              <thead>
                <tr className={theadCls}>
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
                  <tr><td colSpan={6} className="py-8 text-neutral-500">درخواستی برای کارهای در دست انجام وجود ندارد.</td></tr>
                ) : (
                  items.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr className="group bg-white transition-colors hover:bg-black/[0.04] dark:bg-neutral-900 dark:hover:bg-white/10">
                        <td dir="ltr" className={`${tdBorder} px-3 font-sans tabular-nums`}>{item.serial || "—"}</td>
                        <td className={`${tdBorder} px-3`}>{formatDate(item.dateJalali)}</td>
                        <td className={`${tdBorder} px-3`}><span className="mx-auto block truncate">{item.title || "—"}</span></td>
                        <td className={`${tdBorder} px-3`}><span className="mx-auto block truncate">{projectLabel(item)}</span></td>
                        <td className={`${tdBorder} px-3`}><StatusBadge status={item.workflowStatus || item.status} /></td>
                        <td className={`${tdBorder} px-3`}>
                          <button
                            type="button"
                            onClick={() => openActions(item)}
                            className="mx-auto grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/[0.04] dark:hover:bg-white/10"
                            title="اقدامات"
                            aria-label="اقدامات"
                          >
                            <img src="/images/icons/namayeshname.svg" alt="" className="h-4 w-4 dark:invert" />
                          </button>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 md:hidden">
            {loading ? (
              <div className="py-6 text-center text-sm text-neutral-500">در حال دریافت...</div>
            ) : items.length === 0 ? (
              <div className="py-6 text-center text-sm text-neutral-500">درخواستی برای کارهای در دست انجام وجود ندارد.</div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <b dir="ltr" className="font-sans text-sm tabular-nums">{item.serial || "—"}</b>
                    <StatusBadge status={item.workflowStatus || item.status} />
                  </div>
                  <div className="mt-2 truncate text-sm">{item.title || "—"}</div>
                  <div className="mt-2 text-xs text-neutral-500">{projectLabel(item)}</div>
                  <button
                    type="button"
                    onClick={() => openActions(item)}
                    className="mt-3 h-9 rounded-xl border border-black/10 px-3 text-xs dark:border-white/10"
                  >
                    اقدامات
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {expandedItem && (
        <SupplyActionsModal
          item={expandedItem}
          editingIds={editingIds}
          savingIds={savingIds}
          uploadingIds={uploadingIds}
          onClose={() => {
            setExpandedId(null);
            openedNotificationRef.current = "";
            if (requestedActionId) setSearchParams({}, { replace: true });
          }}
          onAdd={() => addActionRow(expandedItem.id)}
          onPatch={patchAction}
          onPersist={persistAction}
          onEdit={(action) => setEditingIds((prev) => ({ ...prev, [`${expandedItem.id}:${action.id}`]: true }))}
          onDelete={deleteAction}
          onOpenUpload={(action) => setUploadTarget({ requestId: expandedItem.id, action })}
          onOpenFiles={(action) => setUploadTarget({ requestId: expandedItem.id, action })}
        />
      )}

      {uploadTarget && (
        <SupplyActionUploadModal
          fileRef={uploadFileRef}
          files={actionFiles(uploadTarget.action)}
          uploading={!!uploadingIds[`${uploadTarget.requestId}:${uploadTarget.action.id}`]}
          onUpload={uploadFiles}
          onRemove={removeUploadedFile}
          onClose={() => setUploadTarget(null)}
        />
      )}
      {filesModal && (
        <SupplyActionFilesModal
          files={filesModal.files}
          preview={filesModal.preview}
          onPreview={(file) => setFilesModal((prev) => ({ ...(prev || {}), preview: file }))}
          onClose={() => setFilesModal(null)}
        />
      )}
    </div>
  );
}

function SupplyActionsFilterMock() {
  return (
    <div className="mb-4 rounded-2xl border border-black/10 bg-white p-3 text-xs dark:border-white/10 dark:bg-transparent">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[230px] flex-1">
          <span className="mb-1 block text-neutral-500 dark:text-neutral-400">جست‌وجو</span>
          <div className={`${inputCls} flex items-center text-neutral-400 dark:text-neutral-500`}>جست‌وجو در همه فیلدها (شماره، موضوع، تاریخ، پروژه و ...)</div>
        </label>
        <label className="w-[calc(50%-0.25rem)] md:w-[145px]"><span className="mb-1 block text-neutral-500 dark:text-neutral-400">از</span><div className={`${inputCls} flex items-center text-neutral-400 dark:text-neutral-500`}>انتخاب تاریخ</div></label>
        <label className="w-[calc(50%-0.25rem)] md:w-[145px]"><span className="mb-1 block text-neutral-500 dark:text-neutral-400">تا</span><div className={`${inputCls} flex items-center text-neutral-400 dark:text-neutral-500`}>انتخاب تاریخ</div></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="ml-1 text-neutral-500 dark:text-neutral-400">برچسب‌ها</span>
        {['همه', 'در حال اقدام', 'انجام شد', 'لغو شد', 'هفته قبل', 'دو هفته قبل', 'ماه قبل', 'سه ماه قبل', '۶ ماه قبل'].map((label, index) => (
          <span key={label} className={`inline-flex h-8 items-center rounded-full border px-3 ${index === 0 ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black' : 'border-black/10 text-neutral-600 dark:border-white/15 dark:text-neutral-300'}`}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function SupplyActionsModal({ item, onClose, ...actionsProps }) {
  return (
    <div dir="rtl" className="fixed inset-0 z-[9999] flex items-center justify-center p-3 md:p-6">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="supply-actions-modal relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-neutral-900 shadow-2xl dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100">
        <header className="flex shrink-0 items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
          <div>
            <h2 className="text-sm font-bold md:text-base">کار های در دست انجام</h2>
            <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">ثبت و پیگیری اقدامات درخواست</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 transition hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/10" title="بستن" aria-label="بستن">
            <img src="/images/icons/bastan.svg" alt="" className="h-4 w-4 dark:invert" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
          <div dir="ltr" className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <main dir="rtl" className="min-w-0 lg:order-1">
              <ActionsGrid item={item} {...actionsProps} />
            </main>
            <aside dir="rtl" className="space-y-4 lg:order-2">
              <RequestInfoCard title="مشخصات درخواست">
                <RequestInfoRow label="شماره درخواست" value={item.serial || "—"} ltr />
                <RequestInfoRow label="تاریخ درخواست" value={formatDate(item.dateJalali)} />
                <RequestInfoRow label="درخواست‌کننده" value={item.createdByName || "—"} />
                <RequestInfoRow label="پروژه" value={projectLabel(item)} />
                <RequestInfoRow label="کد بودجه" value={item.budgetCode || "—"} ltr />
                <RequestInfoRow label="وضعیت" value={<StatusBadge status={item.workflowStatus || item.status} />} />
                <RequestInfoRow label="مرحله فعلی" value={item.currentStepName || item.currentAssigneeName || "—"} />
              </RequestInfoCard>
              <RequestInfoCard title="جزئیات درخواست">
                <RequestInfoRow label="موضوع" value={item.title || "—"} />
                <RequestInfoRow label="شرح" value={item.description || "—"} />
                <RequestInfoRow label="برآورد هزینه" value={item.amount ? toFaDigits(Number(item.amount).toLocaleString("en-US")) : "—"} />
                <RequestInfoRow label="تاریخ نیاز" value={formatDate(item.needDateJalali)} />
                <RequestInfoRow label="پیوست‌ها" value={Array.isArray(item.attachments) && item.attachments.length ? `${toFaDigits(item.attachments.length)} فایل` : "—"} />
              </RequestInfoCard>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestInfoCard({ title, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900">
      <h3 className="border-b border-black/10 px-4 py-3 text-sm font-bold dark:border-white/10">{title}</h3>
      <div className="px-4">{children}</div>
    </section>
  );
}

function RequestInfoRow({ label, value, ltr = false }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-black/10 py-2.5 text-xs last:border-b-0 dark:border-white/10">
      <div dir={ltr ? "ltr" : "rtl"} className={`min-w-0 break-words font-medium ${ltr ? "text-left" : "text-right"}`}>{value}</div>
      <div className="text-neutral-500 dark:text-neutral-400">{label}</div>
    </div>
  );
}

function ActionsGrid({ item, editingIds, savingIds, uploadingIds, onAdd, onPatch, onPersist, onEdit, onDelete, onOpenUpload, onOpenFiles }) {
  const actions = Array.isArray(item?.actions) ? item.actions : [];
  const requestId = item?.id;
  const savedActions = actions
    .filter((action) => !action?.isNew)
    .sort((a, b) => String(b?.createdAt || b?.updatedAt || "").localeCompare(String(a?.createdAt || a?.updatedAt || "")));
  const draftAction = actions.find((action) => action?.isNew);
  const canAddAction = !draftAction && (!savedActions[0] || savedActions[0]?.status === "in_progress");

  return (
    <div className="mt-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">سوابق اقدامات</h3>
          <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">جدیدترین اقدام در ابتدای فهرست نمایش داده می‌شود.</p>
        </div>
        {canAddAction ? (
          <button type="button" onClick={onAdd} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white text-neutral-700 shadow-sm transition hover:border-black/30 hover:bg-neutral-50 dark:border-white/15 dark:bg-white/[0.06] dark:text-neutral-100 dark:hover:bg-white/10" title="افزودن اقدام جدید" aria-label="افزودن اقدام جدید"><span className="text-2xl font-light leading-none">+</span></button>
        ) : null}
      </div>

      {draftAction ? (
        <div className="mb-4">
          <ActionRow
            index={savedActions.length}
            requestId={requestId}
            action={draftAction}
            editingIds={editingIds}
            savingIds={savingIds}
            uploadingIds={uploadingIds}
            onPatch={onPatch}
            onPersist={onPersist}
            onEdit={onEdit}
            onDelete={onDelete}
            onOpenUpload={onOpenUpload}
            onOpenFiles={onOpenFiles}
            compact
          />
        </div>
      ) : null}

      <div className="relative">
        {savedActions.length === 0 && !draftAction ? <div className="rounded-2xl border border-dashed border-black/10 py-8 text-center text-xs text-neutral-500 dark:border-white/10">هنوز اقدامی ثبت نشده است.</div> : null}
        {savedActions.map((action, index) => (
          <div key={action.id} className="relative grid grid-cols-[16px_minmax(0,1fr)] gap-3 pb-3 last:pb-0">
            <div className="relative flex justify-center" aria-hidden="true">
              {index === 0 ? <span className="absolute -top-3 h-3 w-px bg-emerald-200 dark:bg-emerald-500/30" /> : null}
              {index < savedActions.length - 1 ? <span className="absolute bottom-[-12px] top-3 w-px bg-emerald-200 dark:bg-emerald-500/30" /> : null}
              <span className={`relative z-10 mt-1.5 h-3 w-3 rounded-full ring-4 ${action.status === "canceled" ? "bg-rose-500 ring-rose-100 dark:ring-rose-500/20" : action.status === "done" ? "bg-emerald-500 ring-emerald-100 dark:ring-emerald-500/20" : "bg-sky-500 ring-sky-100 dark:ring-sky-500/20"}`} />
            </div>
            <ActionRow
              index={index}
              requestId={requestId}
              action={action}
              editingIds={editingIds}
              savingIds={savingIds}
              uploadingIds={uploadingIds}
              onPatch={onPatch}
              onPersist={onPersist}
              onEdit={onEdit}
              onDelete={onDelete}
              onOpenUpload={onOpenUpload}
              onOpenFiles={onOpenFiles}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionRow({ index, requestId, action, editingIds, savingIds, uploadingIds, onPatch, onPersist, onEdit, onDelete, onOpenUpload, onOpenFiles, compact = false }) {
  const key = `${requestId}:${action.id}`;
  const editable = action.isNew || editingIds[key];
  const saving = savingIds[key];
  const uploading = uploadingIds[key];
  const files = actionFiles(action);

  if (compact) {
    if (!editable) {
      return (
        <div className="group min-w-0 px-0 py-0.5 transition">
          <div className="grid gap-2 sm:grid-cols-[92px_minmax(0,1fr)_auto_104px] sm:items-start">
            <time className="text-xs font-medium leading-5 tabular-nums text-emerald-700 dark:text-emerald-400"><span className="block">{formatDate(action.date)}</span><span className="block text-[10px] text-neutral-400 dark:text-neutral-500">{formatActionTime(action)}</span></time>
            <div className="min-w-0 pt-0 text-xs leading-5 text-neutral-700 dark:text-neutral-200">{action.description || "—"}</div>
            <div className="pt-0.5"><StatusBadge status={action.status} /></div>
            <div className="flex items-center justify-end gap-1">
              <FileSummary files={files} uploading={uploading} onClick={() => onOpenFiles(action)} />
              <span className="flex items-center gap-1 opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                <RowActionIconBtn action="edit" onClick={() => onEdit(action)} size={30} iconSize={14} />
                <RowActionIconBtn action="delete" onClick={() => onDelete(requestId, action)} size={30} iconSize={14} />
              </span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`rounded-2xl border p-3 transition ${action.isNew ? "border-black/10 bg-neutral-100 shadow-sm dark:border-white/10 dark:bg-white/[0.07]" : "border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900"}`}>
        <div className="mb-2 flex justify-end"><StatusBadge status={action.status} /></div>
        <div className="grid gap-2 md:grid-cols-[108px_minmax(180px,1fr)_118px_auto] md:items-start">
          <JalaliPopupDatePicker value={action.date || ""} onChange={(value) => onPatch(requestId, action.id, { date: value })} buttonClassName={`${inputCls} flex items-center justify-between`} placeholder="تاریخ" />
          <textarea
            value={action.description || ""}
            onChange={(event) => onPatch(requestId, action.id, { description: event.target.value })}
            className={`${inputCls} h-10 min-h-10 resize-y py-2`}
            placeholder="شرح اقدام/توضیح"
          />
          <select value={action.status || "in_progress"} onChange={(event) => onPatch(requestId, action.id, { status: event.target.value })} className={inputCls}>
            <option value="in_progress">در حال اقدام</option>
            <option value="done">انجام شد</option>
            <option value="canceled">لغو شد</option>
          </select>
          <div className="flex flex-wrap items-center justify-between gap-2 md:min-h-10 md:border-r md:border-t-0 md:pr-2 md:pt-0 dark:border-white/10">
            <div className="flex items-center gap-2">
              <FileButton disabled={uploading} onClick={() => onOpenUpload(action)} />
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => onPersist(requestId, action)} disabled={saving} className="grid h-8 w-8 place-items-center rounded-lg bg-black text-white transition hover:bg-black/85 disabled:opacity-50 dark:bg-white dark:text-black" title={action.isNew ? "ثبت اقدام" : "ذخیره تغییرات"} aria-label={action.isNew ? "ثبت اقدام" : "ذخیره تغییرات"}>
                {action.isNew ? <span className="text-lg leading-none">+</span> : <img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" />}
              </button>
            </div>
          </div>
          {saving && <div className="text-xs text-neutral-400">در حال ذخیره...</div>}
        </div>
      </div>
    );
  }

  return (
    <tr className="bg-white transition-colors hover:bg-black/[0.03] dark:bg-neutral-900 dark:hover:bg-white/10">
      <td className="border-b border-neutral-300 px-2 dark:border-neutral-700">{toFaDigits(index + 1)}</td>
      <td className="border-b border-neutral-300 px-2 dark:border-neutral-700">
        {editable ? (
          <JalaliPopupDatePicker value={action.date || ""} onChange={(value) => patchAndPersist({ date: value })} buttonClassName={`${inputCls} flex items-center justify-between`} placeholder="تاریخ اقدام" />
        ) : (
          formatDate(action.date)
        )}
      </td>
      <td className="border-b border-neutral-300 px-2 dark:border-neutral-700">
        {editable ? (
          <textarea
            value={action.description || ""}
            onChange={(event) => onPatch(requestId, action.id, { description: event.target.value })}
            onBlur={(event) => onPersist(requestId, { ...action, description: event.currentTarget.value })}
            className={`${inputCls} min-h-[42px] resize-y py-2`}
            placeholder="شرح اقدام/توضیح"
          />
        ) : (
          <span className="mx-auto block truncate text-right">{action.description || "—"}</span>
        )}
      </td>
      <td className="border-b border-neutral-300 px-2 dark:border-neutral-700">
        {editable ? (
          <select value={action.status || "in_progress"} onChange={(event) => patchAndPersist({ status: event.target.value })} className={inputCls}>
            <option value="in_progress">در حال اقدام</option>
            <option value="done">انجام شد</option>
            <option value="canceled">لغو شد</option>
          </select>
        ) : (
          <StatusBadge status={action.status} />
        )}
      </td>
      <td className="border-b border-neutral-300 px-2 dark:border-neutral-700">
        <div className="flex items-center justify-center gap-2">
          <FileButton disabled={!editable || uploading} onClick={() => onOpenUpload(action)} />
          <FileSummary files={files} uploading={uploading} onClick={() => onOpenFiles(action)} />
        </div>
      </td>
      <td className="border-b border-neutral-300 px-2 dark:border-neutral-700">
        <div className="flex items-center justify-center gap-1">
          {saving && <span className="text-xs text-neutral-400">ذخیره...</span>}
          <RowActionIconBtn action="edit" onClick={() => onEdit(action)} size={32} iconSize={15} />
          <RowActionIconBtn action="delete" onClick={() => onDelete(requestId, action)} size={32} iconSize={15} />
        </div>
      </td>
    </tr>
  );
}

function FileSummary({ files, uploading, onClick }) {
  const list = Array.isArray(files) ? files : [];
  if (uploading) return <span className="min-w-0 truncate text-xs text-neutral-500">در حال بارگذاری...</span>;
  if (!list.length) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-neutral-500 transition hover:bg-black/[0.05] hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white"
      title="نمایش فایل‌ها"
      aria-label="نمایش فایل‌ها"
    >
      <img src="/images/icons/Uplod.svg" alt="" className="h-4 w-4 dark:invert" />
    </button>
  );
}

function FileButton({ disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg border border-black/10 bg-white transition hover:bg-black/[0.04] disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
      title="بارگذاری فایل"
      aria-label="بارگذاری فایل"
    >
      <img src="/images/icons/Uplod.svg" alt="" className="h-4 w-4 dark:invert" />
    </button>
  );
}

function isImageFile(file) {
  const type = String(file?.type || "").toLowerCase();
  const url = String(file?.url || "").toLowerCase();
  return type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(url);
}

function isPdfFile(file) {
  const type = String(file?.type || "").toLowerCase();
  const url = String(file?.url || "").toLowerCase();
  return type.includes("pdf") || /\.pdf($|\?)/i.test(url);
}

function SupplyActionFilesModal({ files, preview, onPreview, onClose }) {
  const list = Array.isArray(files) ? files : [];
  const current = preview || list[0] || null;
  return (
    <div dir="rtl" className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative grid w-full max-w-[760px] overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100 md:grid-cols-[240px_1fr]">
        <div className="border-b border-black/10 p-3 dark:border-white/10 md:border-b-0 md:border-l">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-sm font-bold">فایل‌های اقدام</div>
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black" title="بستن" aria-label="بستن">
              <img src="/images/icons/bastan.svg" alt="" className="h-4 w-4 invert dark:invert-0" />
            </button>
          </div>
          <div className="max-h-[56vh] space-y-2 overflow-auto">
            {list.length ? (
              list.map((file, index) => (
                <button
                  key={`${file.url || file.name || index}-${index}`}
                  type="button"
                  onClick={() => onPreview(file)}
                  className={`block w-full truncate rounded-xl border px-3 py-2 text-right text-xs transition ${
                    current?.url === file.url
                      ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                      : "border-black/10 hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/10"
                  }`}
                  title={file.name || ""}
                >
                  {file.name || `فایل ${toFaDigits(index + 1)}`}
                </button>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-black/10 p-4 text-center text-xs text-neutral-500 dark:border-white/10">فایلی ثبت نشده است.</div>
            )}
          </div>
        </div>

        <div className="min-h-[320px] p-3">
          {current?.url ? (
            <div className="flex h-full min-h-[320px] flex-col gap-3">
              <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">{current.name || "فایل"}</div>
              <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-black/10 bg-neutral-50 dark:border-white/10 dark:bg-white/5">
                {isImageFile(current) ? (
                  <img src={current.url} alt={current.name || ""} className="h-full max-h-[56vh] w-full object-contain" />
                ) : isPdfFile(current) ? (
                  <iframe title="supply_action_file_preview" src={`${current.url}#view=FitH`} className="h-[56vh] w-full bg-white" />
                ) : (
                  <div className="flex h-[320px] flex-col items-center justify-center gap-3 text-sm text-neutral-500">
                    <div>پیش‌نمایش این نوع فایل در مرورگر ممکن نیست.</div>
                    <a href={current.url} target="_blank" rel="noreferrer" className="rounded-xl bg-black px-4 py-2 text-white dark:bg-white dark:text-black">
                      باز کردن فایل
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-[320px] items-center justify-center text-sm text-neutral-500">فایلی برای نمایش انتخاب نشده است.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SupplyActionUploadModal({ fileRef, files, uploading, onUpload, onRemove, onClose }) {
  const list = Array.isArray(files) ? files : [];
  const handleDrop = async (event) => {
    event.preventDefault();
    const dropped = event.dataTransfer?.files;
    if (dropped?.length) await onUpload(dropped);
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[700px] overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100">
        <div className="relative border-b border-black/10 px-4 py-4 text-right dark:border-white/10">
          <button type="button" onClick={onClose} className="absolute left-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl bg-black text-white transition hover:bg-black/85 dark:bg-white dark:text-black" title="بستن" aria-label="بستن">
            <img src="/images/icons/bastan.svg" alt="" className="h-4 w-4 invert dark:invert-0" />
          </button>
          <div className="min-w-0 truncate pl-12 text-sm font-bold leading-6">بارگذاری اسناد (وارده)</div>
        </div>

        <div className="p-4">
          <div className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <div className="mb-2 text-right text-xs font-medium text-neutral-600 dark:text-neutral-300">فایل‌های بارگذاری‌شده</div>
            <div className="min-h-[92px] rounded-xl border border-black/10 bg-neutral-50 p-3 dark:border-white/10 dark:bg-white/5">
              {list.length === 0 ? (
                <div className="flex h-[54px] items-center justify-center text-sm text-neutral-500">فایلی انتخاب نشده است.</div>
              ) : (
                <div className="grid gap-2">
                  {list.map((file, index) => (
                    <div key={`${file.url || file.name || index}-${index}`} className="flex items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 text-xs dark:border-white/10">
                      <a href={file.url || "#"} target="_blank" rel="noreferrer" className="min-w-0 truncate underline-offset-4 hover:underline">
                        {file.name || `فایل ${toFaDigits(index + 1)}`}
                      </a>
                      <button type="button" onClick={() => onRemove(index)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-red-600 transition hover:bg-red-50 dark:hover:bg-red-500/10" title="حذف" aria-label="حذف">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="my-4 h-px bg-black/10 dark:bg-white/10" />
            <div className="mb-2 text-right text-xs font-medium text-neutral-600 dark:text-neutral-300">بارگذاری فایل جدید</div>
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className="mt-3 flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 bg-white px-4 py-5 text-center dark:border-white/15 dark:bg-white/5"
            >
              <div className="mb-1 text-sm font-bold">فایل را اینجا رها کنید</div>
              <div className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">هر نوع فایلی را می‌توانید انتخاب کنید</div>
              <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-sm font-bold text-white transition hover:bg-black/85 disabled:opacity-50 dark:bg-white dark:text-black">
                <img src="/images/icons/Uplod.svg" alt="" className="h-5 w-5 invert dark:invert-0" />
                {uploading ? "در حال بارگذاری..." : "انتخاب فایل"}
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  onUpload(event.target.files);
                  event.target.value = "";
                }}
              />
            </div>

            <button type="button" onClick={onClose} className="mt-6 grid h-10 w-10 place-items-center rounded-xl bg-black text-white transition hover:bg-black/85 dark:bg-white dark:text-black" title="تایید" aria-label="تایید">
              <img src="/images/icons/check.svg" alt="" className="h-4 w-4 invert dark:invert-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
