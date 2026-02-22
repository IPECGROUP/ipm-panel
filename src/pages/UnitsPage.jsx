// ساختار سازمانی
// src/pages/OrgStructurePage.jsx
import React, { useState, useEffect, useMemo } from "react";
import Shell from "../components/layout/Shell.jsx";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";
import { Btn, PrimaryBtn, DangerBtn } from "../components/ui/Button.jsx";
import { api } from "../utils/api"; // 👈 فقط این خط اضافه شد

function OrgStructurePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [activeTab, setActiveTab] = useState(null); // "units" | "roles" | null

  const [list, setList] = useState([]);
  const [adding, setAdding] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

  const [nameSortDir, setNameSortDir] = useState("asc");

  // --- نقش‌ها (ادغام UserRolesPage داخل تب نقش‌ها) ---
  const [rolesList, setRolesList] = React.useState([]);
  const [rolesLoading, setRolesLoading] = React.useState(false);

  const [roleName, setRoleName] = React.useState("");
  const [rolesErr, setRolesErr] = React.useState("");
  const [rolesEditingId, setRolesEditingId] = React.useState(null);
  const [rolesEditingName, setRolesEditingName] = React.useState("");

  const loadRoles = async () => {
    setRolesLoading(true);
    setRolesErr("");
    try {
      const data = await api("/base/user-roles", { credentials: "include" });
      setRolesList(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setRolesErr(e.message || "خطا در دریافت نقش‌ها");
    } finally {
      setRolesLoading(false);
    }
  };

  const addRole = async (e) => {
    e?.preventDefault();
    setRolesErr("");
    const v = roleName.trim();
    if (!v) {
      setRolesErr("نام نقش را وارد کنید");
      return;
    }

    try {
      const resp = await api("/base/user-roles", {
        method: "POST",
        body: JSON.stringify({ name: v }),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const item = resp.item || null;
      if (item) {
        setRolesList((prev) => [...prev, item]);
      } else {
        loadRoles().catch(() => {});
      }
      setRoleName("");
    } catch (e2) {
      setRolesErr(e2.message || "خطا در ثبت نقش");
    }
  };

  const startRoleEdit = (it) => {
    setRolesEditingId(it.id);
    setRolesEditingName(it.name);
  };

  const cancelRoleEdit = () => {
    setRolesEditingId(null);
    setRolesEditingName("");
  };

  const saveRoleEdit = async () => {
    const v = rolesEditingName.trim();
    if (!v) {
      alert("نام نقش را وارد کنید");
      return;
    }
    try {
      const resp = await api("/base/user-roles", {
        method: "PATCH",
        body: JSON.stringify({ id: rolesEditingId, name: v }),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const item = resp.item || null;
      if (item) {
        setRolesList((prev) => prev.map((it) => (it.id === item.id ? item : it)));
      } else {
        await loadRoles();
      }
      cancelRoleEdit();
    } catch (e) {
      alert(e.message || "خطا در ویرایش نقش");
    }
  };

  const delRole = async (it) => {
    if (!window.confirm(`حذف نقش «${it.name}»؟`)) return;
    try {
      await api("/base/user-roles", {
        method: "DELETE",
        body: JSON.stringify({ id: it.id }),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      setRolesList((prev) => prev.filter((r) => r.id !== it.id));
    } catch (e) {
      alert(e.message || "خطا در حذف نقش");
    }
  };

  useEffect(() => {
    if (activeTab === "roles") {
      loadRoles().catch(console.error);
    }
  }, [activeTab]);

  // --- پاپ‌آپ سطح دسترسی ---
  const [accessUnit, setAccessUnit] = useState(null);
  const [accessOpen, setAccessOpen] = useState(false);

  const pageOptions = [
    { key: "centers", label: "تعریف مراکز بودجه" },
    { key: "estimate", label: "برآورد هزینه‌ها" },
    { key: "revenue", label: "برآورد درآمدها" },
    { key: "alloc", label: "تخصیص بودجه" },
    { key: "reports", label: "گزارش‌ها" },
  ];

  const tabOptions = [
    { key: "office", label: "دفتر مرکزی" },
    { key: "site", label: "سایت" },
    { key: "finance", label: "مالی" },
    { key: "cash", label: "نقدی" },
    { key: "capex", label: "سرمایه‌ای" },
    { key: "projects", label: "پروژه‌ها" },
  ];

  const [checkedPages, setCheckedPages] = useState({});
  const [checkedTabsByPage, setCheckedTabsByPage] = useState({});
  const [openPages, setOpenPages] = useState({});

  const [accessLoading, setAccessLoading] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [accessOk, setAccessOk] = useState("");

  const PAGE_MAP = {
    centers: "DefineBudgetCentersPage",
    estimate: "EstimatesPage",
    revenue: "RevenueEstimatesPage",
    alloc: "BudgetAllocationPage",
    reports: "ReportsPage",
  };

  const resetAccessState = () => {
    setCheckedPages({});
    setCheckedTabsByPage({});
    setOpenPages({});
    setAccessError("");
    setAccessOk("");
  };

  const loadUnitAccess = async (unitId) => {
    setAccessLoading(true);
    setAccessError("");
    setAccessOk("");
    try {
      const r = await api(`/admin/unit-access?unit_id=${unitId}`, {
        credentials: "include",
      });
      const items = Array.isArray(r?.items) ? r.items : [];

      const pages = {};
      const tabsMap = {};
      pageOptions.forEach((p) => {
        pages[p.key] = false;
        tabsMap[p.key] = {};
      });

      for (const row of items) {
        if (row.permitted !== 1 && row.permitted !== true) continue;
        const pageKey = Object.keys(PAGE_MAP).find((k) => PAGE_MAP[k] === row.page);
        if (!pageKey) continue;

        const currentTabs = tabsMap[pageKey] || {};
        if (row.tab) {
          currentTabs[row.tab] = true;
        } else {
          tabOptions.forEach((t) => {
            currentTabs[t.key] = true;
          });
        }
        tabsMap[pageKey] = currentTabs;
      }

      pageOptions.forEach((p) => {
        const tmap = tabsMap[p.key] || {};
        const anyTab = tabOptions.some((t) => tmap[t.key]);
        pages[p.key] = anyTab;
      });

      setCheckedPages(pages);
      setCheckedTabsByPage(tabsMap);
    } catch (ex) {
      setAccessError(ex?.message || "خطا در دریافت سطح دسترسی");
    } finally {
      setAccessLoading(false);
    }
  };

  const saveUnitAccess = async () => {
    if (!accessUnit) return;
    setAccessSaving(true);
    setAccessError("");
    setAccessOk("");
    try {
      const unitId = accessUnit.id;

      // ✅ تغییر اصلی: حذف یک‌جای همه رول‌های قبلی تا چیزی ته‌مانده نمونه
      await api(`/admin/unit-access?unit_id=${unitId}`, {
        method: "DELETE",
        credentials: "include",
      });

      for (const p of pageOptions) {
        const pageTabsMap = checkedTabsByPage[p.key] || {};
        const tabs = Object.entries(pageTabsMap)
          .filter(([, v]) => !!v)
          .map(([k]) => k);

        const enabled = tabs.length > 0;
        if (!enabled) continue;

        const pageName = PAGE_MAP[p.key];

        const allSelected = tabOptions.every((t) => pageTabsMap[t.key]);
        if (allSelected) {
          await api("/admin/unit-access", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              unit_id: unitId,
              page: pageName,
              tab: null,
              permitted: 1,
            }),
          });
        } else {
          for (const t of tabs) {
            await api("/admin/unit-access", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                unit_id: unitId,
                page: pageName,
                tab: t,
                permitted: 1,
              }),
            });
          }
        }
      }

      setAccessOk("ذخیره شد.");
    } catch (ex) {
      setAccessError(ex?.message || "خطا در ذخیره سطح دسترسی");
    } finally {
      setAccessSaving(false);
    }
  };

  const togglePageCheck = (pageKey) => {
    setCheckedTabsByPage((prev) => {
      const pageMap = prev[pageKey] || {};
      const totalTabs = tabOptions.length;
      const checkedCount = tabOptions.filter((t) => pageMap[t.key]).length;
      const isAll = checkedCount === totalTabs && totalTabs > 0;
      const newVal = !isAll;

      const nextPageMap = {};
      tabOptions.forEach((t) => {
        nextPageMap[t.key] = newVal;
      });

      setCheckedPages((prevPages) => ({
        ...prevPages,
        [pageKey]: newVal,
      }));

      return { ...prev, [pageKey]: nextPageMap };
    });
  };

  const togglePageOpen = (k) =>
    setOpenPages((p) => ({
      ...p,
      [k]: !p[k],
    }));

  const toggleTabInPage = (pageKey, tabKey) => {
    setCheckedTabsByPage((prev) => {
      const pageMap = prev[pageKey] || {};
      const nextPageMap = { ...pageMap, [tabKey]: !pageMap[tabKey] };

      const checkedCount = tabOptions.filter((t) => nextPageMap[t.key]).length;
      const enabled = checkedCount > 0;

      setCheckedPages((prevPages) => ({
        ...prevPages,
        [pageKey]: enabled,
      }));

      return { ...prev, [pageKey]: nextPageMap };
    });
  };

  const unitIdOf = (u) => {
    const raw = u?.id ?? u?.unit_id ?? u?.unitId;
    const id = Number(raw);
    return id && Number.isFinite(id) ? id : 0;
  };

  const openAccess = async (u) => {
    const id = unitIdOf(u);
    if (!id) {
      alert("شناسه واحد معتبر نیست.");
      return;
    }
    setAccessUnit(u);
    setAccessOpen(true);
    resetAccessState();
    await loadUnitAccess(id);
  };

  const closeAccess = () => {
    setAccessOpen(false);
    setAccessUnit(null);
  };

  const reload = async () => {
    const r = await api("/base/units", {
      credentials: "include",
    });
    const units = (r.units || []).slice().sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), "fa", {
        sensitivity: "base",
      })
    );
    setList(units);
  };

  useEffect(() => {
    reload().catch(console.error);
  }, []);

  const sortedList = useMemo(() => {
    const arr = Array.isArray(list) ? [...list] : [];
    arr.sort((a, b) => {
      const an = String(a.name || "");
      const bn = String(b.name || "");
      const cmp = an.localeCompare(bn, "fa", {
        numeric: true,
        sensitivity: "base",
      });
      return nameSortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [list, nameSortDir]);

  const addUnit = async () => {
    setErr("");
    const name = (adding || "").trim();
    if (!name) {
      setErr("نام واحد را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await api("/base/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      setAdding("");
      await reload();
    } catch (ex) {
      setErr(ex.message || "خطا در ثبت");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (u) => {
    const id = unitIdOf(u);
    if (!id) {
      alert("شناسه واحد معتبر نیست.");
      return;
    }
    setEditId(id);
    setEditName(u.name || "");
  };

  const saveEdit = async () => {
    const name = (editName || "").trim();
    if (!name) {
      alert("نام واحد را وارد کنید");
      return;
    }
    try {
      const id = Number(editId);
      if (!id) {
        alert("شناسه واحد معتبر نیست.");
        return;
      }
      await api(`/base/units/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      setEditId(null);
      setEditName("");
      await reload();
    } catch (ex) {
      alert(ex.message || "خطا در ویرایش");
    }
  };

  const del = async (u) => {
    const id = unitIdOf(u);
    if (!id) {
      alert("شناسه واحد معتبر نیست.");
      return;
    }
    if (!confirm(`حذف واحد «${u.name}»؟`)) return;
    try {
      await api(`/base/units/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      await reload();
    } catch (ex) {
      alert(ex.message || "خطا در حذف");
    }
  };

  return (
    <>
      <Card className="rounded-2xl border bg-white text-black border-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        {/* تب‌ها */}
        <div className="w-full isolate" dir="rtl">
          <div className="w-full rounded-t-3xl bg-neutral-300 dark:bg-neutral-800 p-2">
            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("units")}
                className={`flex-1 h-12 sm:h-14 text-center rounded-2xl transition select-none relative
                          ${
                            activeTab === "units"
                              ? "bg-black text-white z-20 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.6)]"
                              : "bg-neutral-300 text-white/95 z-10 hover:bg-neutral-400 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                          }`}
              >
                واحد ها
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("roles")}
                className={`flex-1 h-12 sm:h-14 text-center rounded-2xl transition select-none relative
                          ${
                            activeTab === "roles"
                              ? "bg-black text-white z-20 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.6)]"
                              : "bg-neutral-300 text-white/95 z-10 hover:bg-neutral-400 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                          }`}
              >
                نقش ها
              </button>
            </div>
          </div>
        </div>

        {activeTab === "units" && (
          <>
            {/* نوار مسیر */}
            <div className="mt-4 mb-3 text-base md:text-lg">
              <span className="text-black/70 dark:text-neutral-300">اطلاعات پایه</span>
              <span className="mx-2 text-black/50 dark:text-neutral-400">›</span>
              <span className="font-semibold text-black dark:text-neutral-100">ساختار سازمانی</span>
            </div>

            {/* Section: form + table */}
            <div className="rounded-2xl border border-black/10 bg-white overflow-hidden dark:bg-neutral-900 dark:border-neutral-800">
              {/* فرم افزودن */}
              <div className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-end items-stretch gap-2">
                  <input
                    disabled={!isAdmin}
                    value={adding}
                    onChange={(e) => setAdding(e.target.value)}
                    placeholder="نام واحد..."
                    className="h-10 w-full flex-1 rounded-xl px-3 text-right bg-white text-black placeholder-black/40 border border-black/15 outline-none
                           focus:ring-2 focus:ring-black/10 disabled:opacity-60
                           dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                  />

                  <button
                    type="button"
                    disabled={!isAdmin || saving}
                    onClick={addUnit}
                    className="h-10 w-10 grid place-items-center rounded-xl bg-white text-black border border-black/15 hover:bg-black/5 disabled:opacity-50 transition
                           dark:bg-neutral-100 dark:text-neutral-900"
                    aria-label="افزودن"
                    title="افزودن"
                  >
                    <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5 dark:invert" />
                  </button>
                </div>

                {err && <div className="text-sm text-red-600 dark:text-red-400 mt-2">{err}</div>}
              </div>

              {/* جدول واحدها */}
              <TableWrap>
                <div className="px-[15px] pb-4">
                  <div className="rounded-2xl border border-black/10 overflow-hidden bg-white text-black dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
                    <div className="overflow-x-auto">
                      <table
                        className="min-w-[560px] w-full text-sm [&_th]:text-center [&_td]:text-center [&_th]:py-0.5 [&_td]:py-0.5"
                        dir="rtl"
                      >
                        <THead>
                          <tr className="bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700">
                            <TH className="w-20 sm:w-24 !text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
                              #
                            </TH>

                            <TH className="!text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
                              <div className="flex items-center justify-center gap-2">
                                <span>نام واحد</span>

                                <button
                                  type="button"
                                  onClick={() => setNameSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                                  className="h-7 w-7 inline-grid place-items-center bg-transparent p-0
                                         text-neutral-500 hover:text-neutral-600 active:text-neutral-700
                                         dark:text-neutral-400 dark:hover:text-neutral-300"
                                  title="مرتب‌سازی نام"
                                  aria-label="مرتب‌سازی نام"
                                >
                                  <svg
                                    className={`w-[14px] h-[14px] transition-transform ${
                                      nameSortDir === "asc" ? "rotate-180" : ""
                                    }`}
                                    focusable="false"
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"></path>
                                  </svg>
                                </button>
                              </div>
                            </TH>

                            <TH className="w-44 sm:w-72 !text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
                              اقدامات
                            </TH>
                          </tr>
                        </THead>

                        <tbody
                          className="[&_td]:text-black dark:[&_td]:text-neutral-100
                                 [&_tr:nth-child(odd)]:bg-white [&_tr:nth-child(even)]:bg-neutral-50
                                 dark:[&_tr:nth-child(odd)]:bg-neutral-900 dark:[&_tr:nth-child(even)]:bg-neutral-800/50"
                        >
                          {(sortedList || []).length === 0 ? (
                            <TR className="bg-white dark:bg-transparent">
                              <TD colSpan={3} className="text-center text-black/60 dark:text-neutral-400 py-4">
                                واحدی ثبت نشده.
                              </TD>
                            </TR>
                          ) : (
                            sortedList.map((u, idx) => {
                              const isLast = idx === sortedList.length - 1;
                              const tdBorder = isLast ? "" : "border-b border-neutral-300 dark:border-neutral-700";
                              const rowId = unitIdOf(u);

                              return (
                                <TR key={rowId || u.id || idx}>
                                  <TD className={`px-3 ${tdBorder}`}>{idx + 1}</TD>

                                  <TD className={`px-3 ${tdBorder}`}>
                                    {editId === rowId ? (
                                      <input
                                        className="w-full max-w-xs rounded-xl px-3 py-2 text-center bg-white text-black placeholder-black/40 border border-black/15 outline-none
                                               focus:ring-2 focus:ring-black/10
                                               dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        autoFocus
                                      />
                                    ) : (
                                      u.name || "—"
                                    )}
                                  </TD>

                                  <TD className={`px-3 ${tdBorder}`}>
                                    {editId === rowId ? (
                                      <div className="flex items-center justify-center gap-3">
                                        <button
                                          type="button"
                                          onClick={saveEdit}
                                          className="h-10 w-10 grid place-items-center !bg-transparent !ring-0 !border-0 !shadow-none hover:opacity-80 active:opacity-70 transition"
                                          aria-label="ذخیره"
                                          title="ذخیره"
                                        >
                                          <img src="/images/icons/check.svg" alt="" className="w-[18px] h-[18px] dark:invert" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditId(null);
                                            setEditName("");
                                          }}
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
                                      <div className="flex items-center justify-center gap-3">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            openAccess(u);
                                          }}
                                          disabled={!isAdmin}
                                          className="h-10 w-10 grid place-items-center !p-0 !bg-transparent !ring-0 !border-0 !shadow-none disabled:opacity-50 hover:opacity-80 active:opacity-70 transition"
                                          aria-label="سطح دسترسی"
                                          title="سطح دسترسی"
                                        >
                                          <img src="/images/icons/sath.svg" alt="" className="w-[18px] h-[18px] dark:invert" />
                                        </button>

                                        <Btn
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            startEdit(u);
                                          }}
                                          className="!h-10 !w-10 !p-0 !rounded-xl !grid !place-items-center !bg-transparent !ring-0 !border-0 !shadow-none hover:opacity-80 active:opacity-70 disabled:opacity-50"
                                          disabled={!isAdmin}
                                          aria-label="ویرایش"
                                          title="ویرایش"
                                        >
                                          <img src="/images/icons/pencil.svg" alt="" className="w-[18px] h-[18px] dark:invert" />
                                        </Btn>

                                        <DangerBtn
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            del(u);
                                          }}
                                          className="!h-10 !w-10 !p-0 !rounded-xl !grid !place-items-center !bg-transparent !ring-0 !border-0 !shadow-none hover:opacity-80 active:opacity-70 disabled:opacity-50"
                                          disabled={!isAdmin}
                                          aria-label="حذف"
                                          title="حذف"
                                        >
                                          <img
                                            src="/images/icons/hazf.svg"
                                            alt=""
                                            className="w-[18px] h-[18px]"
                                            style={{
                                              filter:
                                                "brightness(0) saturate(100%) invert(25%) sepia(95%) saturate(4870%) hue-rotate(355deg) brightness(95%) contrast(110%)",
                                            }}
                                          />
                                        </DangerBtn>
                                      </div>
                                    )}
                                  </TD>
                                </TR>
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

            {/* پاپ‌آپ سطح دسترسی */}
            {accessOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-sm">
                <div
                  className="w-full max-w-[820px] max-h-[90vh] overflow-auto
                         rounded-3xl shadow-2xl ring-1 ring-black/10 dark:ring-neutral-800
                         p-3 sm:p-4 bg-white text-black dark:bg-neutral-900 dark:text-neutral-100"
                  dir="rtl"
                >
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <h2 className="text-[14px] md:text-base font-bold">
                      سطح دسترسی {accessUnit ? `— ${accessUnit.name}` : ""}
                    </h2>

                    <button
                      type="button"
                      onClick={closeAccess}
                      className="h-8 w-8 grid place-items-center rounded-lg
                             ring-1 ring-black/15 hover:bg-black/5 transition
                             dark:ring-neutral-800 dark:hover:bg-white/10"
                      aria-label="بستن"
                      title="بستن"
                    >
                      <img src="/images/icons/bastan.svg" alt="" className="w-4 h-4 dark:invert" />
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-neutral-800">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700">
                        <tr>
                          <th className="py-1.5 px-4 text-center !font-semibold">صفحه</th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr className="border-t border-black/10 dark:border-neutral-800">
                          <td className="py-2 px-3 sm:px-4">
                            {accessLoading ? (
                              <div className="text-center text-black/60 dark:text-neutral-400 py-4">در حال بارگذاری…</div>
                            ) : (
                              <div className="grid gap-1">
                                {pageOptions.map((opt) => {
                                  const isOpen = !!openPages[opt.key];
                                  const pageTabs = checkedTabsByPage[opt.key] || {};

                                  const totalTabs = tabOptions.length;
                                  const checkedCount = tabOptions.filter((t) => pageTabs[t.key]).length;
                                  const isAllChecked = totalTabs > 0 && checkedCount === totalTabs;
                                  const isSomeChecked = checkedCount > 0 && checkedCount < totalTabs;

                                  return (
                                    <div
                                      key={opt.key}
                                      className="rounded-2xl border border-black/10 dark:border-neutral-800 overflow-hidden"
                                    >
                                      <div className="flex items-center justify-between gap-3 px-3 py-1 hover:bg-black/[0.04] dark:hover:bg-white/10">
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => togglePageOpen(opt.key)}
                                            className="h-8 w-8 grid place-items-center rounded-lg
                                                   bg-transparent hover:opacity-80 active:opacity-70 transition
                                                   ring-1 ring-black/15 dark:ring-neutral-800"
                                            aria-label="باز/بستن"
                                            title="باز/بستن"
                                          >
                                            <span className="text-sm leading-none">{isOpen ? "−" : "+"}</span>
                                          </button>
                                          <span className="font-medium text-sm md:text-[14px]">{opt.label}</span>
                                        </div>

                                        <input
                                          type="checkbox"
                                          className="w-3.5 h-3.5 accent-black dark:accent-neutral-200"
                                          checked={isAllChecked}
                                          ref={(el) => {
                                            if (el) el.indeterminate = isSomeChecked;
                                          }}
                                          onChange={() => togglePageCheck(opt.key)}
                                        />
                                      </div>

                                      {isOpen && (
                                        <div className="px-3 py-2 bg-black/[0.02] dark:bg-white/5">
                                          <div className="text-[11px] text-black/60 dark:text-neutral-400 mb-1.5 text-center">
                                            تب‌ها
                                          </div>

                                          <div className="grid sm:grid-cols-2 gap-1">
                                            {tabOptions.map((t) => (
                                              <label
                                                key={t.key}
                                                className="flex items-center justify-between gap-3 rounded-xl
                                                       border border-black/10 px-3 py-1 hover:bg-black/[0.04]
                                                       dark:border-neutral-800 dark:hover:bg-white/10"
                                              >
                                                <span className="text-[13px]">{t.label}</span>
                                                <input
                                                  type="checkbox"
                                                  className="w-3.5 h-3.5 accent-black dark:accent-neutral-200"
                                                  checked={!!pageTabs[t.key]}
                                                  onChange={() => toggleTabInPage(opt.key, t.key)}
                                                />
                                              </label>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {(accessError || accessOk) && (
                    <div className={`mt-3 text-sm ${accessError ? "text-red-600 dark:text-red-400" : "text-green-600"}`}>
                      {accessError || accessOk}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-end gap-2">
                    <PrimaryBtn
                      type="button"
                      onClick={saveUnitAccess}
                      disabled={!isAdmin || accessSaving || accessLoading}
                      className="!bg-neutral-900 !text-white dark:!bg-neutral-100 dark:!text-neutral-900 !h-10"
                    >
                      {accessSaving ? "..." : "ذخیره"}
                    </PrimaryBtn>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "roles" && (
          <>
            <div className="mt-4 mb-3 text-base md:text-lg">
              <span className="text-black/70 dark:text-neutral-300">اطلاعات پایه</span>
              <span className="mx-2 text-black/50 dark:text-neutral-400">›</span>
              <span className="font-semibold text-black dark:text-neutral-100">ساختار سازمانی</span>
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
                  <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5 dark:invert" />
                </button>

                <input
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="نام نقش..."
                  className="w-full flex-1 h-10 rounded-xl px-3 bg-white text-black placeholder-black/40 border border-black/15 outline-none
                       focus:ring-2 focus:ring-black/10
                       dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:placeholder-neutral-400 dark:focus:ring-neutral-600/50"
                />
              </form>

              {(rolesErr || rolesLoading) && (
                <div className="px-4 pb-2 text-sm -mt-2">
                  {rolesLoading ? (
                    <span className="text-black/60 dark:text-neutral-400">در حال بارگذاری…</span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">{rolesErr}</span>
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
                            <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold w-20 sm:w-24">#</th>
                            <th className="!py-2 !text-[14px] md:!text-[15px] !font-semibold">نام نقش</th>
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
                          {rolesList.length === 0 && !rolesLoading ? (
                            <tr>
                              <td colSpan={3} className="py-4 text-black/60 dark:text-neutral-400 bg-transparent">
                                آیتمی ثبت نشده است.
                              </td>
                            </tr>
                          ) : (
                            rolesList.map((it, idx) => {
                              const isLast = idx === rolesList.length - 1;
                              const tdBorder = isLast ? "" : "border-b border-neutral-300 dark:border-neutral-700";

                              return (
                                <tr key={it.id}>
                                  <td className={`px-3 ${tdBorder}`}>{idx + 1}</td>

                                  <td className={`px-3 ${tdBorder}`}>
                                    {rolesEditingId === it.id ? (
                                      <input
                                        value={rolesEditingName}
                                        onChange={(e) => setRolesEditingName(e.target.value)}
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
                                    {rolesEditingId === it.id ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          type="button"
                                          onClick={saveRoleEdit}
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
                                          onClick={cancelRoleEdit}
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
                                          onClick={() => startRoleEdit(it)}
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
                                          onClick={() => delRole(it)}
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
          </>
        )}
      </Card>
    </>
  );
}

export default OrgStructurePage;
