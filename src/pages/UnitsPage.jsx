// src/pages/UnitsPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import Shell from "../components/layout/Shell.jsx";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";
import { Btn, PrimaryBtn, DangerBtn } from "../components/ui/Button.jsx";
import { api } from "../utils/api"; // 👈 فقط این خط اضافه شد

function UnitsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [list, setList] = useState([]);
  const [adding, setAdding] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

  const [nameSortDir, setNameSortDir] = useState("asc");

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

      const cur = await api(`/admin/unit-access?unit_id=${unitId}`, {
        credentials: "include",
      });
      const old = Array.isArray(cur?.items) ? cur.items : [];
      for (const row of old) {
        await api(`/admin/unit-access/${row.id}`, {
          method: "DELETE",
          credentials: "include",
        });
      }

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

  const openAccess = async (u) => {
    setAccessUnit(u);
    setAccessOpen(true);
    resetAccessState();
    await loadUnitAccess(u.id);
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
    setEditId(u.id);
    setEditName(u.name || "");
  };

  const saveEdit = async () => {
    const name = (editName || "").trim();
    if (!name) {
      alert("نام واحد را وارد کنید");
      return;
    }
    try {
      await api(`/base/units/${editId}`, {
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
    if (!confirm(`حذف واحد «${u.name}»؟`)) return;
    try {
      await api(`/base/units/${u.id}`, {
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
      <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        {/* نوار مسیر */}
        <div className="mb-3 text-base md:text-lg">
          <span className="text-neutral-700 dark:text-neutral-300">
            اطلاعات پایه
          </span>
          <span className="mx-2 text-neutral-500 dark:text-neutral-400">›</span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            واحدها
          </span>
        </div>

        {/* فرم افزودن */}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3 mb-4 bg-white dark:bg-transparent">
          <div className="grid md:grid-cols-[1fr_auto] items-end gap-2">
            <input
              disabled={!isAdmin}
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              placeholder="نام واحد..."
              className="h-10 w-full rounded-xl px-3 text-right
                         border border-neutral-200 dark:border-neutral-700
                         bg-white text-neutral-900
                         dark:bg-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-400"
            />
            <button
              type="button"
              disabled={!isAdmin || saving}
              onClick={addUnit}
              className="h-10 w-10 grid place-items-center rounded-xl bg-neutral-900 text-white disabled:opacity-50
                         dark:bg-neutral-100 dark:text-neutral-900"
              aria-label="افزودن"
              title="افزودن"
            >
              <img
                src="/images/icons/afzodan.svg"
                alt=""
                className="w-5 h-5 invert dark:invert"
              />
            </button>
          </div>
          {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
        </div>

        {/* جدول واحدها */}
        <TableWrap>
          <div className="bg-white text-black rounded-2xl border border-black/10 overflow-hidden dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
            <table
              className="w-full text-sm [&_th]:text-center [&_td]:text-center [&_th]:py-0.5 [&_td]:py-0.5"
              dir="rtl"
            >
              <THead>
                <tr className="bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700">
                  <TH className="w-20 sm:w-24 !text-center !font-semibold !text-black dark:!text-neutral-100">
                    #
                  </TH>

                  <TH className="!text-center !font-semibold !text-black dark:!text-neutral-100">
                    <div className="flex items-center justify-center gap-2">
                      <span>نام واحد</span>

                      {/* Sort icon (grey, smaller, no bg) */}
                      <button
                        type="button"
                        onClick={() =>
                          setNameSortDir((d) => (d === "asc" ? "desc" : "asc"))
                        }
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

                  <TH className="w-44 sm:w-72 !text-center !font-semibold !text-black dark:!text-neutral-100">
                    اقدامات
                  </TH>
                </tr>
              </THead>

              {/* zebra striping (lighter) */}
              <tbody
                className="[&_td]:text-black dark:[&_td]:text-neutral-100
                           [&_tr:nth-child(odd)]:bg-white [&_tr:nth-child(even)]:bg-neutral-50
                           dark:[&_tr:nth-child(odd)]:bg-neutral-900 dark:[&_tr:nth-child(even)]:bg-neutral-800/50"
              >
                {(sortedList || []).length === 0 ? (
                  <TR className="bg-white dark:bg-transparent">
                    <TD
                      colSpan={3}
                      className="text-center text-black/60 dark:text-neutral-400 py-4"
                    >
                      واحدی ثبت نشده.
                    </TD>
                  </TR>
                ) : (
                  sortedList.map((u, idx) => {
                    const isLast = idx === sortedList.length - 1;
                    const tdBorder = isLast
                      ? ""
                      : "border-b border-neutral-300 dark:border-neutral-700";

                    return (
                      <TR key={u.id}>
                        <TD className={`px-3 ${tdBorder}`}>{idx + 1}</TD>

                        <TD className={`px-3 ${tdBorder}`}>
                          {editId === u.id ? (
                            <input
                              className="w-full max-w-xs rounded-xl px-2 py-0.5 text-center
                                     border border-black/15 dark:border-neutral-700
                                     bg-white text-black placeholder-black/40
                                     dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          ) : (
                            u.name || "—"
                          )}
                        </TD>

                        <TD className={`px-3 ${tdBorder}`}>
                          {editId === u.id ? (
                            <div className="inline-flex items-center gap-2">
                              <PrimaryBtn
                                type="button"
                                onClick={saveEdit}
                                className="!h-10 !px-4 !rounded-xl !bg-neutral-900 !text-white !ring-1 !ring-black/15 hover:!bg-black
                                       dark:!bg-neutral-100 dark:!text-neutral-900 dark:!ring-neutral-700 dark:hover:!bg-neutral-200"
                              >
                                ذخیره
                              </PrimaryBtn>
                              <Btn
                                type="button"
                                onClick={() => {
                                  setEditId(null);
                                  setEditName("");
                                }}
                                className="!h-10 !px-4 !rounded-xl !bg-white !text-neutral-900 !ring-1 !ring-neutral-300 hover:!bg-neutral-100
                                       dark:!bg-transparent dark:!text-neutral-100 dark:!ring-neutral-700 dark:hover:!bg:white/10"
                              >
                                انصراف
                              </Btn>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openAccess(u);
                                }}
                                disabled={!isAdmin}
                                className="h-10 w-10 grid place-items-center bg-transparent disabled:opacity-50 hover:opacity-80 active:opacity-70 transition"
                                aria-label="سطح دسترسی"
                                title="سطح دسترسی"
                              >
                                <img
                                  src="/images/icons/sath.svg"
                                  alt=""
                                  className="w-[20px] h-[20px] dark:invert"
                                />
                              </button>

                              <Btn
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  startEdit(u);
                                }}
                                className="!h-10 !w-10 !p-0 !rounded-xl !bg-transparent !bg-none !ring-0 !border-0 !shadow-none
                                           hover:!bg-transparent active:!bg-transparent focus:!bg-transparent
                                           hover:opacity-80 active:opacity-70 disabled:opacity-50"
                                disabled={!isAdmin}
                                aria-label="ویرایش"
                                title="ویرایش"
                              >
                                <img
                                  src="/images/icons/pencil.svg"
                                  alt=""
                                  className="w-[18px] h-[18px] dark:invert"
                                />
                              </Btn>

                              <DangerBtn
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  del(u);
                                }}
                                className="!h-10 !w-10 !p-0 !rounded-xl !bg-transparent !bg-none !ring-0 !border-0 !shadow-none
                                           hover:!bg-transparent active:!bg-transparent focus:!bg-transparent
                                           hover:opacity-80 active:opacity-70 disabled:opacity-50"
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
        </TableWrap>

        {/* پاپ‌آپ سطح دسترسی */}
        {accessOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm">
            <div className="w-[min(96vw,820px)] max-w-[820px] max-h-[90vh] overflow-auto rounded-3xl shadow-2xl ring-1 ring-black/10 dark:ring-neutral-800 p-6
                            bg-white text-black dark:bg-neutral-900 dark:text-neutral-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-xl font-bold">
                  سطح دسترسی {accessUnit ? `— ${accessUnit.name}` : ""}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeAccess}
                    className="px-3 h-9 rounded-lg border border-black/15 hover:bg-black/5 transition dark:border-neutral-700 dark:hover:bg-white/10"
                  >
                    بستن
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-neutral-800">
                <table className="w-full text-sm">
                  <thead className="bg-black/5 text-black dark:bg:white/5 dark:text-neutral-100">
                    <tr>
                      <th className="py-3 px-4 text-center">صفحه</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-black/10 dark:border-neutral-800">
                      <td className="py-3 px-4">
                        {accessLoading ? (
                          <div className="text-center text-black/60 dark:text-neutral-400 py-6">
                            در حال بارگذاری…
                          </div>
                        ) : (
                          <div className="grid gap-2">
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
                                  className="rounded-xl border border-black/10 dark:border-neutral-800 overflow-hidden"
                                >
                                  <div className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-black/[0.04] dark:hover:bg:white/10">
                                    <div className="flex items-center gap-3">
                                      <button
                                        type="button"
                                        onClick={() => togglePageOpen(opt.key)}
                                        className="w-6 h-6 grid place-items-center rounded-lg border border-black/20 dark:border-neutral-700 text-xs"
                                        aria-label="باز/بستن"
                                        title="باز/بستن"
                                      >
                                        {isOpen ? "−" : "+"}
                                      </button>
                                      <span>{opt.label}</span>
                                    </div>
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 accent-black dark:accent-neutral-200"
                                      checked={isAllChecked}
                                      ref={(el) => {
                                        if (el) el.indeterminate = isSomeChecked;
                                      }}
                                      onChange={() => togglePageCheck(opt.key)}
                                    />
                                  </div>

                                  {isOpen && (
                                    <div className="px-3 py-3 bg-black/[0.02] dark:bg-white/5">
                                      <div className="text-xs text-black/60 dark:text-neutral-400 mb-2 text-center">
                                        تب‌ها
                                      </div>
                                      <div className="grid sm:grid-cols-2 gap-2">
                                        {tabOptions.map((t) => (
                                          <label
                                            key={t.key}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-black/10 px-3 py-2 hover:bg-black/[0.04] dark:border-neutral-800 dark:hover:bg-white/10"
                                          >
                                            <span>{t.label}</span>
                                            <input
                                              type="checkbox"
                                              className="w-4 h-4 accent-black dark:accent-neutral-200"
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
                <div
                  className={`mt-3 text-sm ${accessError ? "text-red-600" : "text-green-600"}`}
                >
                  {accessError || accessOk}
                </div>
              )}

              <div className="mt-4 flex items-center justify-end gap-2">
                <PrimaryBtn
                  type="button"
                  onClick={saveUnitAccess}
                  disabled={!isAdmin || accessSaving || accessLoading}
                >
                  {accessSaving ? "..." : "ذخیره"}
                </PrimaryBtn>
              </div>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

export default UnitsPage;
