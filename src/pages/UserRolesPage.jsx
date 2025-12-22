// src/pages/UserRolesPage.jsx
import React from "react";
import Card from "../components/ui/Card.jsx";
import { TableWrap } from "../components/ui/Table.jsx";

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
        setList((prev) => prev.map((it) => (it.id === item.id ? item : it)));
      } else {
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
      className="rounded-2xl border bg-white text-black border-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
      dir="rtl"
    >
      {/* breadcrumb */}
      <div className="mb-3 text-base md:text-lg">
        <span className="text-black/70 dark:text-neutral-300">اطلاعات پایه</span>
        <span className="mx-2 text-black/50 dark:text-neutral-400">›</span>
        <span className="font-semibold text-black dark:text-neutral-100">
          نقش‌های کاربری
        </span>
      </div>

      {/* Section (form + table) */}
      <div className="rounded-2xl border border-black/10 bg-white overflow-hidden dark:bg-neutral-900 dark:border-neutral-800">
        {/* فرم افزودن نقش */}
        <form
          onSubmit={addRole}
          className="p-4 flex flex-col sm:flex-row-reverse sm:items-center items-stretch gap-3"
        >
          <button
            type="submit"
            className="h-10 w-10 grid place-items-center rounded-xl bg-white text-black border border-black/15 hover:bg-black/5
                       dark:bg-neutral-100 dark:text-neutral-900"
            aria-label="افزودن نقش"
            title="افزودن نقش"
          >
            <img
              src="/images/icons/afzodan.svg"
              alt=""
              className="w-5 h-5 dark:invert"
            />
          </button>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام نقش..."
            className="w-full flex-1 h-10 rounded-xl px-3 bg-white text-black placeholder-black/40 border border-black/15 outline-none
                       focus:ring-2 focus:ring-black/10
                       dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:placeholder-neutral-400 dark:focus:ring-neutral-600/50"
          />
        </form>

        {(err || loading) && (
          <div className="px-4 pb-2 text-sm -mt-2">
            {loading ? (
              <span className="text-black/60 dark:text-neutral-400">
                در حال بارگذاری…
              </span>
            ) : (
              <span className="text-red-600 dark:text-red-400">{err}</span>
            )}
          </div>
        )}

        {/* جدول نقش‌ها */}
        <TableWrap>
          <div className="px-[15px] pb-4">
            <div className="rounded-2xl border border-black/10 overflow-hidden bg-white text-black dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
              <div className="overflow-x-auto">
                <table
                  className="min-w-[520px] w-full text-sm [&_th]:text-center [&_td]:text-center [&_th]:py-0.5 [&_td]:py-0.5"
                  dir="rtl"
                >
                  <thead>
                    <tr className="bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700">
                      <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold w-20 sm:w-24">
                        #
                      </th>
                      <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold">
                        نام نقش
                      </th>
                      <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold w-44 sm:w-72">
                        اقدامات
                      </th>
                    </tr>
                  </thead>

                  <tbody
                    className="[&_td]:text-black dark:[&_td]:text-neutral-100
                               [&_tr:nth-child(odd)]:bg-white [&_tr:nth-child(even)]:bg-neutral-50
                               dark:[&_tr:nth-child(odd)]:bg-neutral-900 dark:[&_tr:nth-child(even)]:bg-neutral-800/50"
                  >
                    {list.length === 0 && !loading ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-4 text-black/60 dark:text-neutral-400 bg-transparent"
                        >
                          آیتمی ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      list.map((it, idx) => {
                        const isLast = idx === list.length - 1;
                        const tdBorder = isLast
                          ? ""
                          : "border-b border-neutral-300 dark:border-neutral-700";

                        return (
                          <tr key={it.id}>
                            <td className={`px-3 ${tdBorder}`}>{idx + 1}</td>

                            <td className={`px-3 ${tdBorder}`}>
                              {editingId === it.id ? (
                                <input
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  className="w-full rounded-xl px-3 py-2 bg-white text-black placeholder-black/40 border border-black/15 outline-none text-center
                                             focus:ring-2 focus:ring-black/10
                                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:placeholder-neutral-400 dark:focus:ring-neutral-600/50"
                                  autoFocus
                                />
                              ) : (
                                it.name
                              )}
                            </td>

                            <td className={`px-3 ${tdBorder}`}>
                              {editingId === it.id ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={saveEdit}
                                    className="h-10 w-10 grid place-items-center !bg-transparent !ring-0 !border-0 !shadow-none hover:opacity-80 active:opacity-70 transition"
                                    aria-label="ذخیره"
                                    title="ذخیره"
                                  >
                                    <img
                                      src="/images/icons/check.svg"
                                      alt=""
                                      className="w-[18px] h-[18px] dark:invert"
                                    />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="h-10 w-10 grid place-items-center !bg-transparent !ring-0 !border-0 !shadow-none hover:opacity-80 active:opacity-70 transition"
                                    aria-label="انصراف"
                                    title="انصراف"
                                  >
                                    <img
                                      src="/images/icons/bastan.svg"
                                      alt=""
                                      className="w-[16px] h-[16px] dark:invert"
                                      style={{
                                        filter:
                                          "brightness(0) saturate(100%) invert(25%) sepia(95%) saturate(4870%) hue-rotate(355deg) brightness(95%) contrast(110%)",
                                      }}
                                    />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(it)}
                                    className="h-10 w-10 grid place-items-center !bg-transparent !ring-0 !border-0 !shadow-none hover:opacity-80 active:opacity-70 transition"
                                    aria-label="ویرایش"
                                    title="ویرایش"
                                  >
                                    <img
                                      src="/images/icons/pencil.svg"
                                      alt=""
                                      className="w-[18px] h-[18px] dark:invert"
                                    />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => del(it)}
                                    className="h-10 w-10 grid place-items-center !bg-transparent !ring-0 !border-0 !shadow-none hover:opacity-80 active:opacity-70 transition"
                                    aria-label="حذف"
                                    title="حذف"
                                  >
                                    <img
                                      src="/images/icons/hazf.svg"
                                      alt=""
                                      className="w-[19px] h-[19px]"
                                      style={{
                                        filter:
                                          "brightness(0) saturate(100%) invert(25%) sepia(95%) saturate(4870%) hue-rotate(355deg) brightness(95%) contrast(110%)",
                                      }}
                                    />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TableWrap>
      </div>
    </Card>
  );
}

export default UserRolesPage;
