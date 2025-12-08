// src/pages/TagsPage.jsx
import React from "react";
import Card from "../components/ui/Card.jsx";
import { Btn, PrimaryBtn, DangerBtn } from "../components/ui/Button.jsx";

function TagsPage() {
  const [list, setList] = React.useState([]);
  const [name, setName] = React.useState("");
  const [err, setErr] = React.useState("");
  const [editingId, setEditingId] = React.useState(null);
  const [editingName, setEditingName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const api = async (path, opt = {}) => {
    const res = await fetch("/api" + path, {
      credentials: "include",
      ...opt,
      headers: {
        "Content-Type": "application/json",
        ...(opt.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(data?.error || data?.message || "request_failed");
    return data;
  };

  const loadAll = async () => {
    setLoading(true);
    setErr("");
    try {
      const r = await api("/tags");
      setList(r.items || []);
    } catch (e) {
      setErr(e.message || "خطا در دریافت برچسب‌ها");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadAll().catch(console.error);
  }, []);

  const addTag = async (e) => {
    e?.preventDefault();
    setErr("");
    const v = name.trim();
    if (!v) {
      setErr("نام برچسب را وارد کنید");
      return;
    }

    const exists = (list || []).some(
      (it) => String(it.label || "").trim() === v
    );
    if (exists) {
      setErr("این برچسب قبلاً ثبت شده است");
      return;
    }

    setSaving(true);
    try {
      const resp = await api("/tags", {
        method: "POST",
        body: JSON.stringify({ label: v }),
      });
      const item = resp.item || { id: resp.id, label: v };
      if (item?.id) {
        setList((prev) => [...prev, item]);
        setName("");
      } else {
        await loadAll();
        setName("");
      }
    } catch (e) {
      setErr(e.message || "خطا در ثبت برچسب");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (it) => {
    setEditingId(it.id);
    setEditingName(it.label);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEdit = async () => {
    const v = editingName.trim();
    if (!v) {
      alert("نام برچسب را وارد کنید");
      return;
    }
    try {
      await api("/tags", {
        method: "PATCH",
        body: JSON.stringify({ id: editingId, label: v }),
      });
      setList((prev) =>
        prev.map((it) => (it.id === editingId ? { ...it, label: v } : it))
      );
      cancelEdit();
    } catch (e) {
      alert(e.message || "خطا در ویرایش");
    }
  };

  const del = async (it) => {
    if (!window.confirm(`حذف برچسب «${it.label}»؟`)) return;
    try {
      await api("/tags", {
        method: "DELETE",
        body: JSON.stringify({ id: it.id }),
      });
      setList((prev) => prev.filter((r) => r.id !== it.id));
    } catch (e) {
      alert(e.message || "خطا در حذف");
    }
  };

  return (
    <Card
      className="rounded-2xl border bg-white text-neutral-900 border-black/10 
                 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
      dir="rtl"
    >
      {/* breadcrumb */}
      <div className="mb-3 text-base md:text-lg">
        <span className="text-neutral-700 dark:text-neutral-300">
          اطلاعات پایه
        </span>
        <span className="mx-2 text-neutral-500 dark:text-neutral-400">›</span>
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
          برچسب‌ها
        </span>
      </div>

      {/* add form */}
      <form
        onSubmit={addTag}
        className="flex items-center gap-3 mb-4 flex-row-reverse"
      >
        <button
          type="submit"
          disabled={saving}
          className="h-10 w-14 grid place-items-center rounded-xl 
                     bg-neutral-900 text-white hover:bg-neutral-800 transition
                     disabled:opacity-50
                     dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          aria-label="افزودن برچسب"
          title="افزودن برچسب"
        >
          <img
            src="/images/icons/afzodan.svg"
            alt=""
            className="w-5 h-5 invert dark:invert-0"
          />
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="نام برچسب..."
          className="flex-1 h-10 rounded-xl px-3 
                     bg-white text-neutral-900 placeholder-neutral-400 
                     border border-black/10 outline-none 
                     focus:ring-2 focus:ring-black/10
                     dark:bg-neutral-800 dark:text-neutral-100 
                     dark:border-neutral-700 dark:focus:ring-neutral-600/50"
        />
      </form>
      {err && (
        <div className="text-sm text-red-600 dark:text-red-400 -mt-2 mb-3">
          {err}
        </div>
      )}

      {/* table */}
      <div
        className="rounded-2xl overflow-hidden 
                   bg-white text-neutral-900 border border-black/10
                   dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
      >
        <table
          className="w-full text-sm 
                     [&_th]:text-center [&_td]:text-center"
          dir="rtl"
        >
          <thead>
            <tr
              className="bg-black/5 text-neutral-900 border-y border-black/10
                         dark:bg-white/5 dark:text-neutral-100 dark:border-neutral-700"
            >
              <th className="py-3 w-20">#</th>
              <th className="py-3">نام برچسب</th>
              <th className="py-3 w-56">اقدامات</th>
            </tr>
          </thead>
          <tbody
            className="divide-y divide-black/5 dark:divide-neutral-800
                       [&>tr:nth-child(odd)]:bg-black/[0.02]
                       [&>tr:nth-child(even)]:bg-black/[0.04]
                       [&>tr:hover]:bg-black/[0.06]
                       dark:[&>tr:nth-child(odd)]:bg-white/5
                       dark:[&>tr:nth-child(even)]:bg-white/10
                       dark:[&>tr:hover]:bg-white/15"
          >
            {loading ? (
              <tr>
                <td
                  colSpan={3}
                  className="py-4 text-neutral-700 dark:text-neutral-400 bg-transparent"
                >
                  در حال بارگذاری…
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="py-4 text-neutral-700 dark:text-neutral-400 bg-transparent"
                >
                  آیتمی ثبت نشده است.
                </td>
              </tr>
            ) : (
              list.map((it, idx) => (
                <tr key={it.id}>
                  <td className="px-3 py-3">{idx + 1}</td>
                  <td className="px-3 py-3">
                    {editingId === it.id ? (
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 
                                   bg-white text-neutral-900 border border-black/10 outline-none 
                                   focus:ring-2 focus:ring-black/10
                                   dark:bg-neutral-800 dark:text-neutral-100 
                                   dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                        autoFocus
                      />
                    ) : (
                      it.label
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {editingId === it.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <PrimaryBtn
                          type="button"
                          onClick={saveEdit}
                          className="!h-9 !px-3 !text-xs !rounded-xl !shadow-none
                                     !bg-white !text-neutral-900 !ring-1 !ring-black/15 
                                     hover:!bg-black/5
                                     dark:!bg-neutral-100 dark:!text-neutral-900 dark:hover:!bg-neutral-200"
                        >
                          ذخیره
                        </PrimaryBtn>
                        <Btn
                          type="button"
                          onClick={cancelEdit}
                          className="!h-9 !px-3 !text-xs !rounded-xl !shadow-none
                                     !bg-neutral-900 !text-white hover:!bg-neutral-800
                                     dark:!bg-neutral-900 dark:!text-white dark:hover:!bg-neutral-800"
                        >
                          انصراف
                        </Btn>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Btn
                          className="h-10 w-10 rounded-xl 
                                     ring-1 ring-black/15 bg-white text-neutral-900 
                                     hover:bg-black/5
                                     dark:bg-transparent dark:text-neutral-100 
                                     dark:ring-neutral-800 dark:hover:bg-white/10"
                          onClick={() => startEdit(it)}
                          aria-label="ویرایش"
                          title="ویرایش"
                        >
                          <img
                            src="/images/icons/pencil.svg"
                            alt=""
                            className="w-5 h-5"
                          />
                        </Btn>
                        <DangerBtn
                          className="h-10 w-10 rounded-xl 
                                     !bg-white !text-red-600 ring-1 ring-red-500/70 
                                     hover:!bg-black/5 hover:!text-red-600
                                     dark:!bg-transparent dark:!text-red-300 
                                     dark:ring-red-400/70 dark:hover:!bg-white/10"
                          onClick={() => del(it)}
                          aria-label="حذف"
                          title="حذف"
                        >
                          <img
                            src="/images/icons/hazf.svg"
                            alt=""
                            className="w-5 h-5"
                          />
                        </DangerBtn>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default TagsPage;
