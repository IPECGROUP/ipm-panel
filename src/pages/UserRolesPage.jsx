// src/pages/UserRolesPage.jsx
import React from "react";
import Card from "../components/ui/Card.jsx";
import { Btn, PrimaryBtn, DangerBtn } from "../components/ui/Button.jsx";

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
  if (!res.ok) {
    throw new Error(data?.error || data?.message || "request_failed");
  }
  return data;
};

function UserRolesPage() {
  const [list, setList] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const [name, setName] = React.useState("");
  const [err, setErr] = React.useState("");
  const [editingId, setEditingId] = React.useState(null);
  const [editingName, setEditingName] = React.useState("");

  const loadAll = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await api("/base/user-roles");
      setList(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setErr(e.message || "خطا در دریافت نقش‌ها");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadAll().catch(console.error);
  }, []);

  const addRole = async (e) => {
    e?.preventDefault();
    setErr("");
    const v = name.trim();
    if (!v) {
      setErr("نام نقش را وارد کنید");
      return;
    }

    try {
      const resp = await api("/base/user-roles", {
        method: "POST",
        body: JSON.stringify({ name: v }),
      });
      const item = resp.item || null;
      if (item) {
        setList((prev) => [...prev, item]);
      } else {
        // اگر به هر دلیلی آیتم برنگشت، دوباره لود کن
        loadAll().catch(() => {});
      }
      setName("");
    } catch (e2) {
      setErr(e2.message || "خطا در ثبت نقش");
    }
  };

  const startEdit = (it) => {
    setEditingId(it.id);
    setEditingName(it.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEdit = async () => {
    const v = editingName.trim();
    if (!v) {
      alert("نام نقش را وارد کنید");
      return;
    }
    try {
      const resp = await api("/base/user-roles", {
        method: "PATCH",
        body: JSON.stringify({ id: editingId, name: v }),
      });
      const item = resp.item || null;
      if (item) {
        setList((prev) =>
          prev.map((it) => (it.id === item.id ? item : it))
        );
      } else {
        // اگر آیتم آپدیت‌شده نیامد، از سرور دوباره بگیر
        await loadAll();
      }
      cancelEdit();
    } catch (e) {
      alert(e.message || "خطا در ویرایش نقش");
    }
  };

  const del = async (it) => {
    if (!window.confirm(`حذف نقش «${it.name}»؟`)) return;
    try {
      await api("/base/user-roles", {
        method: "DELETE",
        body: JSON.stringify({ id: it.id }),
      });
      setList((prev) => prev.filter((r) => r.id !== it.id));
    } catch (e) {
      alert(e.message || "خطا در حذف نقش");
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
          نقش‌های کاربری
        </span>
      </div>

      {/* فرم افزودن نقش */}
      <form
        onSubmit={addRole}
        className="flex items-center gap-3 mb-4 flex-row-reverse"
      >
        <button
          type="submit"
          className="h-10 w-14 grid place-items-center rounded-xl 
                     bg-neutral-900 text-white hover:bg-neutral-800 transition
                     dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          aria-label="افزودن نقش"
          title="افزودن نقش"
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
          placeholder="نام نقش..."
          className="flex-1 h-10 rounded-xl px-3 
                     bg-white text-neutral-900 placeholder-neutral-400 
                     border border-black/10 outline-none 
                     focus:ring-2 focus:ring-black/10
                     dark:bg-neutral-800 dark:text-neutral-100 
                     dark:border-neutral-700 dark:focus:ring-neutral-600/50"
        />
      </form>
      {(err || loading) && (
        <div className="text-sm -mt-2 mb-3">
          {loading ? (
            <span className="text-neutral-600 dark:text-neutral-400">
              در حال بارگذاری…
            </span>
          ) : (
            <span className="text-red-600 dark:text-red-400">
              {err}
            </span>
          )}
        </div>
      )}

      {/* جدول نقش‌ها */}
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
              <th className="py-3">نام نقش</th>
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
            {list.length === 0 && !loading ? (
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
                      it.name
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {editingId === it.id ? (
                      <div className="flex items-center justify-center gap-2">
                        {/* ذخیره: سفید با متن مشکی */}
                        <PrimaryBtn
                          type="button"
                          onClick={saveEdit}
                          className="!h-10 !px-4 !rounded-xl 
                                     !bg-white !text-neutral-900 !ring-1 !ring-black/15 
                                     hover:!bg-black/5
                                     dark:!bg-white dark:!text-neutral-900 dark:hover:!bg-neutral-200"
                        >
                          ذخیره
                        </PrimaryBtn>

                        {/* انصراف: مشکی با متن سفید */}
                        <Btn
                          type="button"
                          onClick={cancelEdit}
                          className="!h-10 !px-4 !rounded-xl
                                     !bg-neutral-900 !text-white hover:!bg-neutral-800
                                     dark:!bg-neutral-900 dark:!text-white dark:hover:!bg-neutral-800"
                        >
                          انصراف
                        </Btn>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        {/* ویرایش */}
                        <Btn
                          className="!h-10 !w-10 !rounded-xl 
                                     !ring-1 !ring-black/15 !bg-white !text-neutral-900 
                                     hover:!bg-black/5
                                     dark:!bg-transparent dark:!text-neutral-100 
                                     dark:!ring-neutral-800 dark:hover:!bg-white/10"
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

                        {/* حذف – فقط هاور خاکستری ملایم */}
                        <DangerBtn
                          className="!h-10 !w-10 !rounded-xl 
                                     !ring-1 !ring-red-500/70 !bg-white !text-red-600 
                                     hover:!bg-black/5
                                     dark:!bg-transparent dark:!text-red-300 
                                     dark:!ring-red-400/70 dark:hover:!bg-white/10"
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

export default UserRolesPage;
