import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const uploadFileRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [editingIds, setEditingIds] = useState({});
  const [savingIds, setSavingIds] = useState({});
  const [uploadingIds, setUploadingIds] = useState({});
  const [uploadTarget, setUploadTarget] = useState(null);

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
      setError("دریافت اقدامات تامین انجام نشد.");
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
    const id = `sa_client_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    patchItem(requestId, (item) => ({
      ...item,
      actions: [{ id, date: "", description: "", status: "in_progress", files: [], isNew: true }, ...(Array.isArray(item.actions) ? item.actions : [])],
    }));
    setEditingIds((prev) => ({ ...prev, [`${requestId}:${id}`]: true }));
  };

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
      await persistAction(requestId, nextAction);
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
    await persistAction(requestId, nextAction);
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
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-black text-white dark:bg-white dark:text-black">
              <img src={PAGE_ICON} alt="" className="h-6 w-6 invert dark:invert-0" />
            </span>
            <h1 className="truncate text-base font-bold md:text-lg">اقدامات تامین</h1>
          </div>
        </div>

        {error && <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

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
                  <tr><td colSpan={6} className="py-8 text-neutral-500">درخواستی برای اقدامات تامین وجود ندارد.</td></tr>
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
                            onClick={() => setExpandedId((old) => (String(old) === String(item.id) ? null : item.id))}
                            className="mx-auto grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/[0.04] dark:hover:bg-white/10"
                            title="اقدامات"
                            aria-label="اقدامات"
                          >
                            <img src="/images/icons/namayeshname.svg" alt="" className="h-4 w-4 dark:invert" />
                          </button>
                        </td>
                      </tr>
                      {String(expandedId) === String(item.id) && (
                        <tr>
                          <td colSpan={6} className="border-b border-neutral-300 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-950/40">
                            <ActionsGrid
                              item={expandedItem || item}
                              editingIds={editingIds}
                              savingIds={savingIds}
                              uploadingIds={uploadingIds}
                              onAdd={() => addActionRow(item.id)}
                              onPatch={patchAction}
                              onPersist={persistAction}
                              onEdit={(action) => setEditingIds((prev) => ({ ...prev, [`${item.id}:${action.id}`]: true }))}
                              onDelete={deleteAction}
                              onOpenUpload={(action) => setUploadTarget({ requestId: item.id, action })}
                            />
                          </td>
                        </tr>
                      )}
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
              <div className="py-6 text-center text-sm text-neutral-500">درخواستی برای اقدامات تامین وجود ندارد.</div>
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
                    onClick={() => setExpandedId((old) => (String(old) === String(item.id) ? null : item.id))}
                    className="mt-3 h-9 rounded-xl border border-black/10 px-3 text-xs dark:border-white/10"
                  >
                    اقدامات
                  </button>
                  {String(expandedId) === String(item.id) && (
                    <div className="mt-3">
                      <ActionsGrid
                        item={expandedItem || item}
                        editingIds={editingIds}
                        savingIds={savingIds}
                        uploadingIds={uploadingIds}
                        onAdd={() => addActionRow(item.id)}
                        onPatch={patchAction}
                        onPersist={persistAction}
                        onEdit={(action) => setEditingIds((prev) => ({ ...prev, [`${item.id}:${action.id}`]: true }))}
                        onDelete={deleteAction}
                        onOpenUpload={(action) => setUploadTarget({ requestId: item.id, action })}
                        compact
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

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
    </div>
  );
}

function ActionsGrid({ item, editingIds, savingIds, uploadingIds, onAdd, onPatch, onPersist, onEdit, onDelete, onOpenUpload, compact = false }) {
  const actions = Array.isArray(item?.actions) ? item.actions : [];
  const requestId = item?.id;

  if (compact) {
    return (
      <div className="grid gap-2">
        <button type="button" onClick={onAdd} className="grid h-9 w-9 place-items-center rounded-xl bg-black text-white dark:bg-white dark:text-black" title="افزودن" aria-label="افزودن">
          +
        </button>
        {actions.length === 0 ? <div className="rounded-xl border border-dashed border-black/10 p-4 text-center text-xs text-neutral-500 dark:border-white/10">اقدامی ثبت نشده است.</div> : null}
        {actions.map((action, index) => (
          <ActionRow
            key={action.id}
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
            compact
          />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900" dir="ltr">
      <table dir="rtl" className="w-full min-w-[760px] table-fixed text-sm [&_td]:py-1.5 [&_td]:text-center [&_th]:py-2 [&_th]:text-center">
        <colgroup>
          <col style={{ width: 72 }} />
          <col style={{ width: 150 }} />
          <col />
          <col style={{ width: 150 }} />
          <col style={{ width: 110 }} />
          <col style={{ width: 110 }} />
        </colgroup>
        <thead>
          <tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-white/10 dark:text-neutral-100">
            <th>
              <button type="button" onClick={onAdd} className="mx-auto grid h-8 w-8 place-items-center rounded-xl bg-black text-white transition hover:bg-black/85 dark:bg-white dark:text-black" title="افزودن" aria-label="افزودن">
                +
              </button>
            </th>
            <th>تاریخ اقدام</th>
            <th>شرح اقدام/توضیح</th>
            <th>آخرین وضعیت</th>
            <th>فایل</th>
            <th>اقدامات</th>
          </tr>
        </thead>
        <tbody>
          {actions.length === 0 ? (
            <tr><td colSpan={6} className="py-8 text-neutral-500">اقدامی ثبت نشده است.</td></tr>
          ) : (
            actions.map((action, index) => (
              <ActionRow
                key={action.id}
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
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ActionRow({ index, requestId, action, editingIds, savingIds, uploadingIds, onPatch, onPersist, onEdit, onDelete, onOpenUpload, compact = false }) {
  const key = `${requestId}:${action.id}`;
  const editable = action.isNew || editingIds[key];
  const saving = savingIds[key];
  const uploading = uploadingIds[key];
  const files = actionFiles(action);
  const fileName = files[files.length - 1]?.name || "";

  const patchAndPersist = (patch) => {
    const next = { ...action, ...patch };
    onPatch(requestId, action.id, patch);
    onPersist(requestId, next);
  };

  if (compact) {
    return (
      <div className="rounded-xl border border-black/10 p-2 dark:border-white/10">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-neutral-500">ردیف {toFaDigits(index + 1)}</span>
          <StatusBadge status={action.status} />
        </div>
        <div className="grid gap-2">
          <JalaliPopupDatePicker value={action.date || ""} onChange={(value) => patchAndPersist({ date: value })} buttonClassName={`${inputCls} flex items-center justify-between`} placeholder="تاریخ اقدام" />
          <textarea
            value={action.description || ""}
            readOnly={!editable}
            onChange={(event) => onPatch(requestId, action.id, { description: event.target.value })}
            onBlur={(event) => onPersist(requestId, { ...action, description: event.currentTarget.value })}
            className={`${inputCls} min-h-[76px] resize-y py-2`}
            placeholder="شرح اقدام/توضیح"
          />
          <select value={action.status || "in_progress"} disabled={!editable} onChange={(event) => patchAndPersist({ status: event.target.value })} className={inputCls}>
            <option value="in_progress">در حال اقدام</option>
            <option value="done">انجام شد</option>
            <option value="canceled">لغو شد</option>
          </select>
          <div className="flex items-center justify-between gap-2">
            <FileButton disabled={!editable || uploading} onClick={() => onOpenUpload(action)} />
            <span className="min-w-0 truncate text-xs text-neutral-500">{uploading ? "در حال بارگذاری..." : fileName || "—"}</span>
            <RowActionIconBtn action="edit" onClick={() => onEdit(action)} size={32} iconSize={15} />
            <RowActionIconBtn action="delete" onClick={() => onDelete(requestId, action)} size={32} iconSize={15} />
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
          {fileName ? (
            <a href={files[files.length - 1]?.url || "#"} target="_blank" rel="noreferrer" className="max-w-[70px] truncate text-xs underline-offset-4 hover:underline">
              {fileName}
            </a>
          ) : (
            <span className="text-xs text-neutral-400">{uploading ? "..." : "—"}</span>
          )}
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
      <img src="/images/icons/upload.svg" alt="" className="h-4 w-4 dark:invert" />
    </button>
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
      <div className="relative w-full max-w-[720px] overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-4 dark:border-white/10">
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white transition hover:bg-black/85 dark:bg-white dark:text-black" title="بستن" aria-label="بستن">
            <img src="/images/icons/bastan.svg" alt="" className="h-4 w-4 invert dark:invert-0" />
          </button>
          <div className="min-w-0 truncate text-sm font-bold leading-6">بارگذاری فایل اقدام تامین</div>
        </div>

        <div className="p-4">
          <div className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <div className="mb-2 text-right text-xs text-neutral-500 dark:text-neutral-400">فایل‌های انتخاب‌شده</div>
            <div className="min-h-[86px] rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-white/5">
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

            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className="mt-3 flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 bg-white px-4 py-5 text-center dark:border-white/15 dark:bg-white/5"
            >
              <div className="mb-1 text-sm font-bold">فایل را اینجا رها کنید</div>
              <div className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">هر نوع فایلی را می‌توانید انتخاب کنید</div>
              <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-sm font-bold text-white transition hover:bg-black/85 disabled:opacity-50 dark:bg-white dark:text-black">
                <img src="/images/icons/upload.svg" alt="" className="h-5 w-5 invert dark:invert-0" />
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
