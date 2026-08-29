import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";

const inputClass = "h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-right text-sm outline-none transition focus:border-neutral-400 dark:border-white/15 dark:bg-white/5";
const checkboxClass = "h-4 w-4 rounded border-neutral-400 accent-black dark:accent-neutral-200";

export default function BaseOptionsTable({ title, endpoint }) {
  const [items, setItems] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef(null);

  const api = async (options = {}) => {
    const response = await fetch(endpoint, {
      credentials: "include",
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "عملیات انجام نشد.");
    return data;
  };

  useEffect(() => {
    let active = true;
    api().then((data) => { if (active) setItems(data.items || []); }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [endpoint]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => { if (!menuRef.current?.contains(event.target)) setMenuOpen(false); };
    const escape = (event) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, [menuOpen]);

  const add = async (event) => {
    event.preventDefault();
    if (!newTitle.trim()) return;
    setBusy(true); setError("");
    try { const data = await api({ method: "POST", body: JSON.stringify({ title: newTitle.trim() }) }); setItems((old) => [...old, data.item]); setNewTitle(""); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const saveEdit = async () => {
    if (!editingTitle.trim()) return;
    setBusy(true); setError("");
    try { const data = await api({ method: "PATCH", body: JSON.stringify({ id: editingId, title: editingTitle.trim() }) }); setItems((old) => old.map((item) => item.id === data.item.id ? data.item : item)); setEditingId(null); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const removeSelected = async () => {
    setBusy(true); setError("");
    try { await api({ method: "DELETE", body: JSON.stringify({ ids: [...selectedIds] }) }); setItems((old) => old.filter((item) => !selectedIds.has(String(item.id)))); setSelectedIds(new Set()); setDeleteOpen(false); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const toggle = (id) => setSelectedIds((old) => { const next = new Set(old); const key = String(id); next.has(key) ? next.delete(key) : next.add(key); return next; });
  const allSelected = items.length > 0 && items.every((item) => selectedIds.has(String(item.id)));
  const selectedItem = selectedIds.size === 1 ? items.find((item) => selectedIds.has(String(item.id))) : null;

  const openMenu = (event) => {
    if (menuOpen) return setMenuOpen(false);
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 8, left: Math.max(8, rect.right - 240) });
    setMenuOpen(true);
  };

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
      <h2 className="mb-4 text-sm font-bold">{title}</h2>
      <form onSubmit={add} className="grid grid-cols-[1fr_auto] items-center gap-3" dir="rtl">
        <input className={inputClass} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder={`${title}...`} />
        <button type="submit" disabled={busy} className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 bg-white transition hover:bg-black/5 disabled:opacity-50 dark:bg-neutral-100" aria-label={`افزودن ${title}`}><img src="/images/icons/afzodan.svg" alt="" className="h-5 w-5" /></button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
        <div className="relative overflow-x-auto" dir="ltr">
          <table dir="rtl" className="w-full min-w-[620px] table-fixed text-sm [&_th]:whitespace-nowrap [&_th]:text-center [&_td]:text-center [&_th]:!py-2 [&_td]:!py-2">
            <colgroup><col style={{ width: 48 }} /><col style={{ width: 80 }} /><col /><col style={{ width: 96 }} /></colgroup>
            <thead><tr className="border-b border-neutral-300 bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800">
              <th><input type="checkbox" className={checkboxClass} checked={allSelected} onChange={() => setSelectedIds(allSelected ? new Set() : new Set(items.map((item) => String(item.id))))} aria-label="انتخاب همه" /></th>
              <th>#</th><th>عنوان</th>
              <th className="relative"><button type="button" onClick={openMenu} className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg transition hover:bg-black/[0.08] dark:hover:bg-white/10" aria-label="عملیات"><img src="/images/icons/menu-table.svg" alt="" className="h-4 w-3 dark:invert" /></button></th>
            </tr></thead>
            <tbody className="text-[13px] [&>tr]:h-10">
              {items.map((item, index) => {
                const editing = editingId === item.id;
                return <tr key={item.id} className="bg-black/[0.02] hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10">
                  <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><input type="checkbox" className={checkboxClass} checked={selectedIds.has(String(item.id))} onChange={() => toggle(item.id)} /></td>
                  <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{index + 1}</td>
                  <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{editing ? <input autoFocus className="h-7 w-full rounded-xl border border-black/15 bg-white px-3 text-center outline-none dark:border-white/15 dark:bg-white/5" value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveEdit(); if (event.key === "Escape") setEditingId(null); }} /> : item.title}</td>
                  <td className="border-b border-neutral-300 px-2 dark:border-neutral-700">{editing && <div className="flex items-center justify-start gap-1" dir="ltr"><RowActionIconBtn action="cancel" onClick={() => setEditingId(null)} size={30} iconSize={14} /><RowActionIconBtn action="save" onClick={saveEdit} disabled={busy} size={30} iconSize={15} /></div>}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>

      {menuOpen && createPortal(<div ref={menuRef} className="fixed z-[10001] w-60 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 text-right text-neutral-900 shadow-[0_18px_45px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100" style={menuPosition} dir="rtl"><div className="px-2.5 pb-2 pt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{selectedIds.size ? `${selectedIds.size} مورد انتخاب شده` : "ابتدا موارد موردنظر را انتخاب کنید"}</div><button type="button" disabled={!selectedItem} onClick={() => { setEditingId(selectedItem.id); setEditingTitle(selectedItem.title); setMenuOpen(false); }} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-amber-500/10"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 transition group-hover:scale-105 dark:bg-amber-500/15"><img src="/images/icons/pencil.svg" alt="" className="h-4 w-4 dark:invert" /></span><span className="flex-1 text-sm font-semibold">ویرایش</span></button><button type="button" disabled={!selectedIds.size} onClick={() => { setDeleteOpen(true); setMenuOpen(false); }} className="group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45 dark:text-red-300 dark:hover:bg-red-500/10"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-100 transition group-hover:scale-105 dark:bg-red-500/15"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" /></span><span className="flex-1 text-sm font-semibold">حذف موارد انتخاب‌شده</span></button></div>, document.body)}
      {deleteOpen && <DeleteModal count={selectedIds.size} busy={busy} onConfirm={removeSelected} onClose={() => setDeleteOpen(false)} />}
    </section>
  );
}

function DeleteModal({ count, busy, onConfirm, onClose }) {
  return createPortal(<div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" dir="rtl"><div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-neutral-900"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-100 dark:bg-red-500/15"><img src="/images/icons/hazf.svg" alt="" className="h-5 w-5" /></span><div><h3 className="font-bold text-neutral-900 dark:text-white">حذف موارد انتخاب‌شده</h3><p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">آیا از حذف {count} مورد انتخاب‌شده مطمئن هستید؟ این عملیات قابل بازگشت نیست.</p></div></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="h-10 rounded-xl border border-black/10 px-4 text-sm dark:border-white/10">انصراف</button><button type="button" onClick={onConfirm} disabled={busy} className="h-10 rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50">{busy ? "در حال حذف..." : "حذف"}</button></div></div></div>, document.body);
}
