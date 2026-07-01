// ساختار سازمانی
// src/pages/OrgStructurePage.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";
import { PrimaryBtn } from "../components/ui/Button.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";
import {
  hoverSelectableCrudTablePreset as tablePreset,
  getHoverSelectableRowClass,
} from "../components/ui/tablePresets.js";
import { api } from "../utils/api"; // 
import UsersTab from "./UsersTab.jsx";

const PAGE_ICON = "/images/icons/unit.svg";

const UnitRolesTableShell = React.memo(function UnitRolesTableShell({ children }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white text-black overflow-hidden dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
      <div dir="ltr" className="overflow-x-auto">
        <table
          className="w-full min-w-[700px] table-fixed text-xs sm:text-sm [&_th]:text-center [&_td]:text-center [&_th]:py-2 [&_td]:py-2 [&_th]:whitespace-nowrap [&_td]:min-w-0"
          dir="rtl"
        >
          {children}
        </table>
      </div>
    </div>
  );
});

const UnitRoleFieldLabel = React.memo(function UnitRoleFieldLabel({ children }) {
  return (
    <label className="block text-[11px] md:text-xs text-neutral-600 dark:text-neutral-300 mb-1">
      {children}
    </label>
  );
});

const UnitRoleAddIconBtn = React.memo(function UnitRoleAddIconBtn({ title, disabled }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="h-10 w-10 rounded-xl bg-white text-black border border-black/15 hover:bg-black/5
                 dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-800 dark:hover:bg-neutral-200
                 disabled:opacity-50 grid place-items-center shrink-0"
      aria-label={title}
      title={title}
    >
      <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5" />
    </button>
  );
});

const UnitRoleCombobox = React.memo(function UnitRoleCombobox({
  items,
  value,
  onValueChange,
  selectedId,
  onSelect,
  inputRef,
  disabled,
  ariaLabel = "انتخاب",
}) {
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = String(value || "").trim();
    if (!q) return items || [];
    const qq = q.toLowerCase();
    return (items || []).filter((item) => String(item?.label || "").toLowerCase().includes(qq));
  }, [items, value]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        disabled={disabled}
        placeholder="انتخاب/جستجو…"
        className="w-full h-10 rounded-xl px-3 pe-10 bg-white text-black placeholder-neutral-400
                   border border-black/15 outline-none focus:ring-2 focus:ring-black/10
                   dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50
                   disabled:opacity-60"
        aria-label={ariaLabel}
        autoComplete="off"
      />

      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
        <img src="/images/icons/dropdown.svg" alt="" className="w-4 h-4 opacity-70 dark:invert" />
      </span>

      {open && (filtered || []).length > 0 && (
        <div
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-black/10 bg-white shadow-lg
                     dark:bg-neutral-900 dark:border-neutral-800"
        >
          <div className="max-h-56 overflow-auto py-1">
            {(filtered || []).map((item) => {
              const isSel = selectedId != null && String(selectedId) === String(item?.id);
              return (
                <button
                  key={item?.id ?? item?.label}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(item?.id);
                    onValueChange(item?.label || "");
                    setOpen(false);
                  }}
                  className={`w-full text-right px-3 py-2 text-sm transition ${
                    isSel
                      ? "bg-black text-white"
                      : "text-black hover:bg-black/5 dark:text-neutral-100 dark:hover:bg-white/10"
                  }`}
                >
                  {item?.label || "—"}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

const UnitRoleChip = React.memo(function UnitRoleChip({ label, onRemove, disabled }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs
                 text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
    >
      <span className="whitespace-nowrap">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="h-4 w-4 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
        aria-label="حذف"
        title="حذف"
      >
        <img src="/images/icons/bastan.svg" alt="" className="w-3 h-3 opacity-70 hover:opacity-100 dark:invert" />
      </button>
    </span>
  );
});

function OrgStructurePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(() => {
    if (requestedTab === "assignments" && isAdmin) return "assignments";
    if (requestedTab === "users" && isAdmin) return "users";
    return "unitRoles";
  }); // "unitRoles" | "users" | "assignments"

  const [list, setList] = useState([]);
  const [adding, setAdding] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);
  const [editingUnitsById, setEditingUnitsById] = useState({});

  const [nameSortDir, setNameSortDir] = useState("asc");

  // --- نقش‌ها (ادغام UserRolesPage داخل تب نقش‌ها) ---
  const [rolesList, setRolesList] = React.useState([]);
  const [rolesLoading, setRolesLoading] = React.useState(false);

  const [roleName, setRoleName] = React.useState("");
  const [rolesErr, setRolesErr] = React.useState("");
  const [selectedRoleIds, setSelectedRoleIds] = React.useState([]);
  const [editingRolesById, setEditingRolesById] = React.useState({});

  const [unitRoleNewUnit, setUnitRoleNewUnit] = useState("");
  const [unitRoleUnitQuery, setUnitRoleUnitQuery] = useState("");
  const [selectedUnitRoleUnitId, setSelectedUnitRoleUnitId] = useState(null);
  const [unitRoleNewRole, setUnitRoleNewRole] = useState("");
  const [unitRoleErr, setUnitRoleErr] = useState("");
  const [unitRoleSaving, setUnitRoleSaving] = useState(false);
  const [unitRoleLoading, setUnitRoleLoading] = useState(false);
  const [unitRoleItems, setUnitRoleItems] = useState([]);
  const unitRoleUnitComboRef = useRef(null);
  const unitRoleRoleInputRef = useRef(null);

  const [assignmentUserQuery, setAssignmentUserQuery] = useState("");
  const [selectedAssignmentUserId, setSelectedAssignmentUserId] = useState(null);
  const [assignmentRoleQuery, setAssignmentRoleQuery] = useState("");
  const [selectedAssignmentRoleId, setSelectedAssignmentRoleId] = useState(null);
  const [assignmentErr, setAssignmentErr] = useState("");
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentItems, setAssignmentItems] = useState([]);
  const [assignmentRoles, setAssignmentRoles] = useState([]);
  const assignmentUserComboRef = useRef(null);
  const assignmentRoleComboRef = useRef(null);

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

  const createRole = async (name) => {
    const resp = await api("/base/user-roles", {
      method: "POST",
      body: JSON.stringify({ name }),
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const item = resp.item || null;
    if (item) {
      setRolesList((prev) => [...(prev || []), item]);
    } else {
      await loadRoles().catch(() => {});
    }
    return item;
  };

  const loadUnitRoles = async () => {
    setUnitRoleLoading(true);
    setUnitRoleErr("");
    try {
      const data = await api("/base/unit-roles", { credentials: "include" });
      const items = Array.isArray(data.items) ? data.items : [];
      setUnitRoleItems(items);
      if (Array.isArray(data.units)) {
        setList(sortUnitsByName(data.units));
      }
      if (Array.isArray(data.roles)) {
        setRolesList(data.roles);
      }
    } catch (e) {
      setUnitRoleItems([]);
      setUnitRoleErr(e.message || "خطا در دریافت واحدها و نقش‌ها");
    } finally {
      setUnitRoleLoading(false);
    }
  };

  const loadAssignments = async () => {
    setAssignmentLoading(true);
    setAssignmentErr("");
    try {
      const data = await api("/base/user-role-assignments", { credentials: "include" });
      setAssignmentItems(Array.isArray(data.items) ? data.items : []);
      setAssignmentRoles(Array.isArray(data.roles) ? data.roles : []);
    } catch (e) {
      setAssignmentItems([]);
      setAssignmentRoles([]);
      setAssignmentErr(e.message || "خطا در دریافت انتصاب‌ها");
    } finally {
      setAssignmentLoading(false);
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
      await createRole(v);
      setRoleName("");
    } catch (e2) {
      setRolesErr(e2.message || "خطا در ثبت نقش");
    }
  };

  const setSelectedRoles = (nextOrUpdater) => {
    setSelectedRoleIds((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const rawNext = typeof nextOrUpdater === "function" ? nextOrUpdater(prevList) : nextOrUpdater;
      return Array.from(new Set((Array.isArray(rawNext) ? rawNext : []).map((id) => String(id))));
    });
  };

  const startRoleEdit = (it) => {
    const clickedId = String(it.id);
    const shouldEditSelected = selectedRoleIds.length > 1 && selectedRoleIds.some((id) => String(id) === clickedId);
    const targetSet = new Set((shouldEditSelected ? selectedRoleIds : [clickedId]).map((id) => String(id)));
    const next = {};

    (rolesList || []).forEach((r) => {
      const sid = String(r.id);
      if (!targetSet.has(sid)) return;
      next[sid] = { id: r.id, name: r.name || "" };
    });

    setEditingRolesById(next);
  };

  const cancelRoleEdit = (rowId = null) => {
    if (rowId === null || rowId === undefined) {
      setEditingRolesById({});
      return;
    }
    const sid = String(rowId);
    setEditingRolesById((prev) => {
      const next = { ...(prev || {}) };
      delete next[sid];
      return next;
    });
  };

  const setRoleDraftName = (rowId, name) => {
    const sid = String(rowId);
    setEditingRolesById((prev) => {
      const current = prev?.[sid];
      if (!current) return prev;
      return { ...(prev || {}), [sid]: { ...current, name } };
    });
  };

  const saveRoleEdit = async (rowId) => {
    const sid = String(rowId);
    const draft = editingRolesById?.[sid];
    if (!draft) return;

    const v = String(draft.name || "").trim();
    if (!v) {
      alert("نام نقش را وارد کنید");
      return;
    }

    try {
      const resp = await api("/base/user-roles", {
        method: "PATCH",
        body: JSON.stringify({ id: draft.id, name: v }),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const item = resp.item || null;
      if (item) {
        setRolesList((prev) => prev.map((it) => (String(it.id) === sid ? item : it)));
      } else {
        setRolesList((prev) => prev.map((it) => (String(it.id) === sid ? { ...it, name: v } : it)));
      }
      cancelRoleEdit(sid);
    } catch (e) {
      alert(e.message || "خطا در ویرایش نقش");
    }
  };

  const removeRoleRows = async (ids) => {
    const uniqIds = Array.from(
      new Set(
        (Array.isArray(ids) ? ids : [ids])
          .filter((id) => id !== null && id !== undefined)
          .map((id) => String(id))
      )
    );
    if (!uniqIds.length) return;

    const confirmText = uniqIds.length > 1 ? `حذف ${uniqIds.length} نقش انتخاب‌شده؟` : "حذف این نقش؟";
    if (!window.confirm(confirmText)) return;

    const idSet = new Set(uniqIds);
    setRolesList((prev) => (prev || []).filter((r) => !idSet.has(String(r.id))));
    setSelectedRoles((prev) => (prev || []).filter((id) => !idSet.has(String(id))));
    setEditingRolesById((prev) => {
      const next = { ...(prev || {}) };
      uniqIds.forEach((id) => {
        delete next[String(id)];
      });
      return next;
    });

    const idMap = new Map((rolesList || []).map((it) => [String(it.id), it.id]));
    try {
      await Promise.all(
        uniqIds.map((sid) =>
          api("/base/user-roles", {
            method: "DELETE",
            body: JSON.stringify({ id: idMap.has(sid) ? idMap.get(sid) : sid }),
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          })
        )
      );
    } catch (e) {
      await loadRoles().catch(() => {});
      alert(e.message || "خطا در حذف نقش");
    }
  };

  useEffect(() => {
    if (activeTab === "roles") {
      loadRoles().catch(console.error);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "unitRoles") {
      loadUnitRoles().catch(console.error);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "assignments" && isAdmin) {
      loadAssignments().catch(console.error);
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (requestedTab === "users" && isAdmin) {
      setActiveTab("users");
      return;
    }
    if (requestedTab === "assignments" && isAdmin) {
      setActiveTab("assignments");
      return;
    }
    if (requestedTab === "unit-roles" || requestedTab === "roles" || requestedTab === "units") {
      setActiveTab("unitRoles");
      return;
    }
    setActiveTab("unitRoles");
  }, [requestedTab, isAdmin]);

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

  const sortUnitsByName = (items) =>
    (Array.isArray(items) ? items : []).slice().sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), "fa", {
        sensitivity: "base",
      })
    );

  const reload = async () => {
    const r = await api("/base/units", {
      credentials: "include",
    });
    setList(sortUnitsByName(r.units || []));
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

  const setSelectedUnits = (nextOrUpdater) => {
    setSelectedUnitIds((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const rawNext = typeof nextOrUpdater === "function" ? nextOrUpdater(prevList) : nextOrUpdater;
      return Array.from(new Set((Array.isArray(rawNext) ? rawNext : []).map((id) => String(id))));
    });
  };

  const unitRowId = (u, fallback = "") => {
    const id = unitIdOf(u);
    if (id) return String(id);
    return String(u?.id ?? u?.unit_id ?? u?.unitId ?? fallback);
  };

  const createUnit = async (name) => {
    const resp = await api("/base/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
      credentials: "include",
    });
    const item = resp.item || null;
    if (item) {
      setList((prev) => sortUnitsByName([...(prev || []).filter((u) => unitIdOf(u) !== unitIdOf(item)), item]));
    } else {
      await reload();
    }
    return item;
  };

  const addUnit = async () => {
    setErr("");
    const name = (adding || "").trim();
    if (!name) {
      setErr("نام واحد را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await createUnit(name);
      setAdding("");
    } catch (ex) {
      setErr(ex.message || "خطا در ثبت");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (u) => {
    const clickedId = unitRowId(u);
    const shouldEditSelected = selectedUnitIds.length > 1 && selectedUnitIds.some((id) => String(id) === clickedId);
    const targetSet = new Set((shouldEditSelected ? selectedUnitIds : [clickedId]).map((id) => String(id)));
    const next = {};

    (list || []).forEach((it, idx) => {
      const sid = unitRowId(it, idx);
      if (!targetSet.has(sid)) return;
      const apiId = unitIdOf(it);
      if (!apiId) return;
      next[sid] = { id: apiId, name: it.name || "" };
    });

    setEditingUnitsById(next);
  };

  const cancelEdit = (rowId = null) => {
    if (rowId === null || rowId === undefined) {
      setEditingUnitsById({});
      return;
    }
    const sid = String(rowId);
    setEditingUnitsById((prev) => {
      const next = { ...(prev || {}) };
      delete next[sid];
      return next;
    });
  };

  const setUnitDraftName = (rowId, name) => {
    const sid = String(rowId);
    setEditingUnitsById((prev) => {
      const current = prev?.[sid];
      if (!current) return prev;
      return { ...(prev || {}), [sid]: { ...current, name } };
    });
  };

  const saveEdit = async (rowId) => {
    const sid = String(rowId);
    const draft = editingUnitsById?.[sid];
    if (!draft) return;

    const name = String(draft.name || "").trim();
    if (!name) {
      alert("نام واحد را وارد کنید");
      return;
    }
    try {
      const id = Number(draft.id);
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
      setList((prev) => prev.map((it, idx) => (unitRowId(it, idx) === sid ? { ...it, name } : it)));
      cancelEdit(sid);
    } catch (ex) {
      alert(ex.message || "خطا در ویرایش");
    }
  };

  const removeUnitRows = async (ids) => {
    const uniqIds = Array.from(
      new Set(
        (Array.isArray(ids) ? ids : [ids])
          .filter((id) => id !== null && id !== undefined)
          .map((id) => String(id))
      )
    );
    if (!uniqIds.length) return;

    const confirmText = uniqIds.length > 1 ? `حذف ${uniqIds.length} واحد انتخاب‌شده؟` : "حذف این واحد؟";
    if (!confirm(confirmText)) return;

    const idSet = new Set(uniqIds);
    setList((prev) => (prev || []).filter((u, idx) => !idSet.has(unitRowId(u, idx))));
    setSelectedUnits((prev) => (prev || []).filter((id) => !idSet.has(String(id))));
    setEditingUnitsById((prev) => {
      const next = { ...(prev || {}) };
      uniqIds.forEach((id) => {
        delete next[String(id)];
      });
      return next;
    });

    const realIds = (list || [])
      .filter((u, idx) => idSet.has(unitRowId(u, idx)))
      .map((u) => unitIdOf(u))
      .filter((id) => !!id);

    if (!realIds.length) return;
    try {
      await Promise.all(
        realIds.map((id) =>
          api(`/base/units/${id}`, {
            method: "DELETE",
            credentials: "include",
          })
        )
      );
    } catch (ex) {
      await reload();
      alert(ex.message || "خطا در حذف");
    }
  };

  const visibleTabCount = isAdmin ? 3 : 1;

  const topTabBtnClass = (isActive, index, total) =>
    [
      "relative z-10 h-10 min-w-[104px] flex-none rounded-lg px-3 text-[11px] font-semibold transition whitespace-nowrap md:h-11 md:min-w-[132px] md:flex-1 md:rounded-none md:px-4 md:text-sm",
      index > 0 ? "md:border-r md:border-black/10 md:dark:border-neutral-800" : "",
      index === 0 ? "md:rounded-tr-2xl" : "",
      index === total - 1 ? "md:rounded-tl-2xl" : "",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20",
      isActive
        ? "bg-black text-white shadow-sm dark:bg-black dark:text-white"
        : "bg-white text-[#1f2937] hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800",
    ].join(" ");

  const tabbedPanelClass =
    "relative rounded-2xl border border-black/10 bg-white overflow-hidden dark:bg-neutral-900 dark:border-neutral-800";

  const tableUi = tablePreset.table;
  const rowUi = tablePreset.row;

  const unitRoleUnitOptions = useMemo(
    () =>
      (unitRoleItems || []).map((u, idx) => ({
        id: String(u?.id ?? unitRowId(u, idx)),
        label: u?.name || "—",
        item: u,
      })),
    [unitRoleItems]
  );

  useEffect(() => {
    const v = String(unitRoleUnitQuery || "").trim();
    if (!v) {
      setSelectedUnitRoleUnitId(null);
      return;
    }
    const found = (unitRoleUnitOptions || []).find((u) => String(u?.label || "").trim() === v);
    setSelectedUnitRoleUnitId(found ? found.id : null);
  }, [unitRoleUnitQuery, unitRoleUnitOptions]);

  const unitRolesRows = useMemo(
    () =>
      (unitRoleItems || []).map((unit, idx) => ({
        id: String(unit?.id ?? idx),
        unitId: unit?.id,
        unit: unit?.name || unit?.label || "—",
        roles: Array.isArray(unit?.roles) ? unit.roles : [],
      })),
    [unitRoleItems]
  );

  const addUnitFromUnitRoles = async (e) => {
    e?.preventDefault();
    const name = String(unitRoleNewUnit || "").trim();
    if (!name) {
      setUnitRoleErr("نام واحد را وارد کنید");
      return;
    }

    setUnitRoleSaving(true);
    setUnitRoleErr("");
    try {
      const resp = await api("/base/unit-roles", {
        method: "POST",
        body: JSON.stringify({ unit_name: name }),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const item = resp.item || resp.unit || null;
      await loadUnitRoles();
      const newId = item?.id ? String(item.id) : "";
      setUnitRoleNewUnit("");
      setUnitRoleUnitQuery(item?.name || name);
      if (newId) setSelectedUnitRoleUnitId(newId);
      requestAnimationFrame(() => unitRoleUnitComboRef.current?.focus?.());
    } catch (ex) {
      setUnitRoleErr(ex.message || "خطا در ثبت واحد");
    } finally {
      setUnitRoleSaving(false);
    }
  };

  const addRoleToSelectedUnit = async (e) => {
    e?.preventDefault();
    const unitId = String(selectedUnitRoleUnitId || "");
    const name = String(unitRoleNewRole || "").trim();

    if (!unitId) {
      setUnitRoleErr("ابتدا یک واحد را انتخاب کنید");
      return;
    }
    if (!name) {
      setUnitRoleErr("نام نقش را وارد کنید");
      return;
    }

    setUnitRoleSaving(true);
    setUnitRoleErr("");
    try {
      await api("/base/unit-roles", {
        method: "POST",
        body: JSON.stringify({ unit_id: Number(unitId), role_name: name }),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      await loadUnitRoles();
      setUnitRoleNewRole("");
      requestAnimationFrame(() => unitRoleRoleInputRef.current?.focus?.());
    } catch (ex) {
      setUnitRoleErr(ex.message || "خطا در ثبت نقش");
    } finally {
      setUnitRoleSaving(false);
    }
  };

  const removeRoleFromUnit = (unitId, role) => {
    const uid = Number(unitId);
    const rid = Number(role?.id);
    if (!uid || !rid) return;
    setUnitRoleSaving(true);
    setUnitRoleErr("");
    api("/base/unit-roles", {
      method: "DELETE",
      body: JSON.stringify({ unit_id: uid, role_id: rid }),
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
      .then(() => loadUnitRoles())
      .catch((ex) => setUnitRoleErr(ex.message || "خطا در حذف نقش از واحد"))
      .finally(() => setUnitRoleSaving(false));
  };

  const deleteUnitFromUnitRoles = (unitId, unitName = "") => {
    const uid = Number(unitId);
    if (!uid) return;
    const confirmText = unitName ? `حذف واحد «${unitName}»؟` : "حذف این واحد؟";
    if (!window.confirm(confirmText)) return;

    setUnitRoleSaving(true);
    setUnitRoleErr("");
    api("/base/unit-roles", {
      method: "DELETE",
      body: JSON.stringify({ unit_id: uid, delete_unit: true }),
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
      .then(() => loadUnitRoles())
      .catch((ex) => setUnitRoleErr(ex.message || "خطا در حذف واحد"))
      .finally(() => setUnitRoleSaving(false));
  };

  const assignmentUserOptions = useMemo(
    () =>
      (assignmentItems || []).map((u) => ({
        id: String(u?.id || ""),
        label: u?.label || u?.name || u?.username || "—",
        item: u,
      })),
    [assignmentItems]
  );

  const assignmentRoleOptions = useMemo(
    () =>
      (assignmentRoles || []).map((role) => ({
        id: String(role?.id || ""),
        label: role?.name || "—",
        item: role,
      })),
    [assignmentRoles]
  );

  useEffect(() => {
    const v = String(assignmentUserQuery || "").trim();
    if (!v) {
      setSelectedAssignmentUserId(null);
      return;
    }
    const found = (assignmentUserOptions || []).find((item) => String(item?.label || "").trim() === v);
    setSelectedAssignmentUserId(found ? found.id : null);
  }, [assignmentUserQuery, assignmentUserOptions]);

  useEffect(() => {
    const v = String(assignmentRoleQuery || "").trim();
    if (!v) {
      setSelectedAssignmentRoleId(null);
      return;
    }
    const found = (assignmentRoleOptions || []).find((item) => String(item?.label || "").trim() === v);
    setSelectedAssignmentRoleId(found ? found.id : null);
  }, [assignmentRoleQuery, assignmentRoleOptions]);

  const assignmentRows = useMemo(
    () =>
      (assignmentItems || []).map((item, idx) => ({
        id: String(item?.id ?? idx),
        userId: item?.id,
        user: item?.label || item?.name || item?.username || "—",
        roles: Array.isArray(item?.roles) ? item.roles : [],
      })),
    [assignmentItems]
  );

  const addAssignment = async (e) => {
    e?.preventDefault();
    const userId = Number(selectedAssignmentUserId);
    const roleId = Number(selectedAssignmentRoleId);

    if (!userId) {
      setAssignmentErr("ابتدا یک کاربر را انتخاب کنید");
      return;
    }
    if (!roleId) {
      setAssignmentErr("ابتدا یک نقش را انتخاب کنید");
      return;
    }

    setAssignmentSaving(true);
    setAssignmentErr("");
    try {
      await api("/base/user-role-assignments", {
        method: "POST",
        body: JSON.stringify({ user_id: userId, role_id: roleId }),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      await loadAssignments();
      setAssignmentRoleQuery("");
      setSelectedAssignmentRoleId(null);
      requestAnimationFrame(() => assignmentRoleComboRef.current?.focus?.());
    } catch (ex) {
      setAssignmentErr(ex.message || "خطا در ثبت انتصاب");
    } finally {
      setAssignmentSaving(false);
    }
  };

  const removeRoleFromUser = (userId, role) => {
    const uid = Number(userId);
    const rid = Number(role?.id);
    if (!uid || !rid) return;
    setAssignmentSaving(true);
    setAssignmentErr("");
    api("/base/user-role-assignments", {
      method: "DELETE",
      body: JSON.stringify({ user_id: uid, role_id: rid }),
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
      .then(() => loadAssignments())
      .catch((ex) => setAssignmentErr(ex.message || "خطا در حذف نقش از کاربر"))
      .finally(() => setAssignmentSaving(false));
  };

  const clearRolesFromUser = (userId, userName = "") => {
    const uid = Number(userId);
    if (!uid) return;
    const confirmText = userName ? `حذف همه نقش‌های «${userName}»؟` : "حذف همه نقش‌های این کاربر؟";
    if (!window.confirm(confirmText)) return;

    setAssignmentSaving(true);
    setAssignmentErr("");
    api("/base/user-role-assignments", {
      method: "DELETE",
      body: JSON.stringify({ user_id: uid }),
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
      .then(() => loadAssignments())
      .catch((ex) => setAssignmentErr(ex.message || "خطا در حذف انتصاب‌ها"))
      .finally(() => setAssignmentSaving(false));
  };

  useEffect(() => {
    const validIds = new Set((sortedList || []).map((u, idx) => unitRowId(u, idx)));
    setSelectedUnits((prev) => prev.filter((id) => validIds.has(String(id))));
    setEditingUnitsById((prev) => {
      const next = { ...(prev || {}) };
      Object.keys(next).forEach((id) => {
        if (!validIds.has(String(id))) delete next[id];
      });
      return next;
    });
  }, [sortedList]);

  useEffect(() => {
    const validIds = new Set((rolesList || []).map((it) => String(it.id)));
    setSelectedRoles((prev) => prev.filter((id) => validIds.has(String(id))));
    setEditingRolesById((prev) => {
      const next = { ...(prev || {}) };
      Object.keys(next).forEach((id) => {
        if (!validIds.has(String(id))) delete next[id];
      });
      return next;
    });
  }, [rolesList]);

  const unitVisibleIds = (sortedList || []).map((u, idx) => unitRowId(u, idx));
  const selectedUnitSet = new Set((selectedUnitIds || []).map((id) => String(id)));
  const allVisibleUnitsSelected = unitVisibleIds.length > 0 && unitVisibleIds.every((id) => selectedUnitSet.has(id));
  const someVisibleUnitsSelected = unitVisibleIds.some((id) => selectedUnitSet.has(id)) && !allVisibleUnitsSelected;

  const toggleSelectAllUnitsVisible = () => {
    setSelectedUnits((prev) => {
      const prevSet = new Set((prev || []).map((id) => String(id)));
      if (allVisibleUnitsSelected) {
        return (prev || []).filter((id) => !unitVisibleIds.includes(String(id)));
      }
      unitVisibleIds.forEach((id) => prevSet.add(String(id)));
      return Array.from(prevSet);
    });
  };

  const toggleUnitRowSelect = (id) => {
    const sid = String(id);
    setSelectedUnits((prev) => {
      const exists = (prev || []).some((x) => String(x) === sid);
      return exists ? (prev || []).filter((x) => String(x) !== sid) : [...(prev || []), sid];
    });
  };

  const roleVisibleIds = (rolesList || []).map((it) => String(it.id));
  const selectedRoleSet = new Set((selectedRoleIds || []).map((id) => String(id)));
  const allVisibleRolesSelected = roleVisibleIds.length > 0 && roleVisibleIds.every((id) => selectedRoleSet.has(id));
  const someVisibleRolesSelected = roleVisibleIds.some((id) => selectedRoleSet.has(id)) && !allVisibleRolesSelected;

  const toggleSelectAllRolesVisible = () => {
    setSelectedRoles((prev) => {
      const prevSet = new Set((prev || []).map((id) => String(id)));
      if (allVisibleRolesSelected) {
        return (prev || []).filter((id) => !roleVisibleIds.includes(String(id)));
      }
      roleVisibleIds.forEach((id) => prevSet.add(String(id)));
      return Array.from(prevSet);
    });
  };

  const toggleRoleRowSelect = (id) => {
    const sid = String(id);
    setSelectedRoles((prev) => {
      const exists = (prev || []).some((x) => String(x) === sid);
      return exists ? (prev || []).filter((x) => String(x) !== sid) : [...(prev || []), sid];
    });
  };

  return (
    <>
      <Card className="rounded-2xl border bg-white text-black border-black/10 text-[11px] md:text-sm dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        <div className="mb-5 flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
            <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold md:text-lg">ساختار سازمانی</span>
            <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">تنظیمات</span>
          </span>
        </div>
        {/* تب‌ها */}
        <div
          className="mx-auto mb-2 flex w-full max-w-[360px] items-center justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-xl border border-black/10 bg-black/[0.03] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mb-px md:max-w-[1040px] md:items-stretch md:justify-center md:gap-0 md:rounded-b-none md:rounded-t-2xl md:border-b-0 md:bg-white md:p-0 md:shadow-sm dark:border-neutral-800 dark:bg-white/[0.04] md:dark:bg-neutral-900"
          dir="rtl"
        >
          <button
            type="button"
            onClick={() => setActiveTab("unitRoles")}
            className={topTabBtnClass(activeTab === "unitRoles", 0, visibleTabCount)}
          >
            واحد ها و نقش ها
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("users")}
                className={topTabBtnClass(activeTab === "users", 1, visibleTabCount)}
              >
                کاربران
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("assignments")}
                className={topTabBtnClass(activeTab === "assignments", 2, visibleTabCount)}
              >
                انتصاب ها
              </button>
            </>
          )}
        </div>

        {activeTab === "units" && (
          <>
            {/* Section: form + table */}
            <div className={tabbedPanelClass}>
              {/* فرم افزودن */}
              <div className="p-3 md:p-4">
                <div className="flex items-center gap-2">
                  <input
                    disabled={!isAdmin}
                    value={adding}
                    onChange={(e) => setAdding(e.target.value)}
                    placeholder="نام واحد..."
                    className="h-10 min-w-0 flex-1 rounded-xl px-3 text-right text-[13px] md:text-sm bg-white text-black placeholder-black/40 border border-black/15 outline-none
                           focus:ring-2 focus:ring-black/10 disabled:opacity-60
                           dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                  />

                  <button
                    type="button"
                    disabled={!isAdmin || saving}
                    onClick={addUnit}
                    className="h-10 w-10 shrink-0 grid place-items-center rounded-xl bg-white text-black border border-black/15 hover:bg-black/5 disabled:opacity-50 transition
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
                <div className={tableUi.outer}>
                  <div className={tableUi.innerPad}>
                    <div className={tableUi.frame}>
                    <div className="md:hidden">
                      {(sortedList || []).length === 0 ? (
                        <div className="px-3 py-8 text-center text-sm text-black/55 dark:text-neutral-400">
                          واحدی ثبت نشده.
                        </div>
                      ) : (
                        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                          {sortedList.map((u, idx) => {
                            const rowId = unitRowId(u, idx);
                            const isSelected = selectedUnitSet.has(rowId);
                            const isEditing = !!editingUnitsById[rowId];
                            const shouldDeleteSelectedOnAction = isSelected && selectedUnitIds.length > 1;

                            return (
                              <div key={rowId || idx} className="border-r-4 border-neutral-900 bg-white p-3 dark:border-neutral-100 dark:bg-neutral-900">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <input
                                        type="checkbox"
                                        className={rowUi.checkbox + " shrink-0"}
                                        checked={isSelected}
                                        onChange={() => toggleUnitRowSelect(rowId)}
                                        aria-label="انتخاب"
                                        title="انتخاب"
                                      />
                                      <span className="shrink-0 rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] text-neutral-700 dark:bg-white/10 dark:text-white/80">
                                        {idx + 1}
                                      </span>
                                      <span className="min-w-0 truncate text-sm font-bold">{u.name || "—"}</span>
                                    </div>
                                  </div>

                                  {!isEditing ? (
                                    <div className="flex shrink-0 items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          openAccess(u);
                                        }}
                                        disabled={!isAdmin}
                                        className="inline-grid h-[34px] w-[34px] place-items-center rounded-xl !bg-transparent !ring-0 !border-0 !shadow-none hover:opacity-80 active:opacity-70 disabled:opacity-50"
                                        aria-label="سطح دسترسی"
                                        title="سطح دسترسی"
                                      >
                                        <img src="/images/icons/sath.svg" alt="" className="h-[18px] w-[18px] dark:invert" />
                                      </button>

                                      <RowActionIconBtn
                                        action="edit"
                                        onClick={() => startEdit(u)}
                                        disabled={!isAdmin}
                                        size={34}
                                        iconSize={15}
                                      />

                                      <RowActionIconBtn
                                        action="delete"
                                        onClick={() => {
                                          if (shouldDeleteSelectedOnAction) {
                                            removeUnitRows(selectedUnitIds);
                                            return;
                                          }
                                          removeUnitRows([rowId]);
                                        }}
                                        disabled={!isAdmin}
                                        size={34}
                                        iconSize={16}
                                      />
                                    </div>
                                  ) : null}
                                </div>

                                {isEditing ? (
                                  <div className="mt-3 flex items-center gap-2">
                                    <input
                                      className="min-w-0 flex-1 rounded-xl border border-black/15 bg-white px-3 py-2 text-center text-[13px] text-black outline-none focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:ring-neutral-600/50"
                                      value={editingUnitsById?.[rowId]?.name || ""}
                                      onChange={(e) => setUnitDraftName(rowId, e.target.value)}
                                      autoFocus
                                    />
                                    <div className="flex shrink-0 items-center gap-1">
                                      <RowActionIconBtn action="save" onClick={() => saveEdit(rowId)} size={34} iconSize={15} />
                                      <RowActionIconBtn action="cancel" onClick={() => cancelEdit(rowId)} size={34} iconSize={15} />
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                      <table className={`${tableUi.table} min-w-[560px]`} dir="rtl">
                        <THead>
                          <tr className={tableUi.headRow}>
                            <TH className={`w-12 ${tableUi.th}`}>
                              <input
                                type="checkbox"
                                className={rowUi.checkbox}
                                checked={allVisibleUnitsSelected}
                                ref={(el) => {
                                  if (el) el.indeterminate = someVisibleUnitsSelected;
                                }}
                                onChange={toggleSelectAllUnitsVisible}
                                aria-label="انتخاب همه"
                                title="انتخاب همه"
                              />
                            </TH>

                            <TH className={`w-20 sm:w-24 ${tableUi.th}`}>
                              #
                            </TH>

                            <TH className={tableUi.th}>
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
                          </tr>
                        </THead>

                        <tbody className={tableUi.body}>
                          {(sortedList || []).length === 0 ? (
                            <TR>
                              <TD colSpan={3} className={tableUi.emptyRow}>
                                واحدی ثبت نشده.
                              </TD>
                            </TR>
                          ) : (
                            sortedList.map((u, idx) => {
                              const isLast = idx === sortedList.length - 1;
                              const tdBorder = isLast ? "" : tableUi.rowDivider;
                              const rowId = unitRowId(u, idx);
                              const isSelected = selectedUnitSet.has(rowId);
                              const isEditing = !!editingUnitsById[rowId];
                              const shouldDeleteSelectedOnAction = isSelected && selectedUnitIds.length > 1;

                              return (
                                <TR key={rowId || idx} className={getHoverSelectableRowClass(isSelected)}>
                                  <TD className={`px-3 ${tdBorder}`}>
                                    <input
                                      type="checkbox"
                                      className={rowUi.checkbox}
                                      checked={isSelected}
                                      onChange={() => toggleUnitRowSelect(rowId)}
                                      aria-label="انتخاب"
                                      title="انتخاب"
                                    />
                                  </TD>

                                  <TD className={`px-3 ${tdBorder}`}>{idx + 1}</TD>

                                  <TD className={`px-3 ${rowUi.valueCell} ${tdBorder}`}>
                                    {isEditing ? (
                                      <div className="flex items-center justify-between gap-2">
                                        <input
                                          className="w-full max-w-xs rounded-xl px-3 py-2 text-center bg-white text-black placeholder-black/40 border border-black/15 outline-none
                                                 focus:ring-2 focus:ring-black/10
                                                 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                                          value={editingUnitsById?.[rowId]?.name || ""}
                                          onChange={(e) => setUnitDraftName(rowId, e.target.value)}
                                          autoFocus
                                        />
                                        <div className="flex items-center gap-1 shrink-0">
                                          <RowActionIconBtn
                                            action="save"
                                            onClick={() => saveEdit(rowId)}
                                            size={tablePreset.actionSizes.button}
                                            iconSize={tablePreset.actionSizes.save}
                                          />
                                          <RowActionIconBtn
                                            action="cancel"
                                            onClick={() => cancelEdit(rowId)}
                                            size={tablePreset.actionSizes.button}
                                            iconSize={tablePreset.actionSizes.cancel}
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className={rowUi.valueWrap}>
                                        <span className={rowUi.valueText}>{u.name || "—"}</span>
                                        <div className={rowUi.rowActions}>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              openAccess(u);
                                            }}
                                            disabled={!isAdmin}
                                            className="inline-grid place-items-center rounded-xl !bg-transparent !ring-0 !border-0 !shadow-none hover:opacity-80 active:opacity-70 disabled:opacity-50"
                                            style={{ width: tablePreset.actionSizes.button, height: tablePreset.actionSizes.button }}
                                            aria-label="سطح دسترسی"
                                            title="سطح دسترسی"
                                          >
                                            <img src="/images/icons/sath.svg" alt="" className="w-[18px] h-[18px] dark:invert" />
                                          </button>

                                          <RowActionIconBtn
                                            action="edit"
                                            onClick={() => startEdit(u)}
                                            disabled={!isAdmin}
                                            size={tablePreset.actionSizes.button}
                                            iconSize={tablePreset.actionSizes.edit}
                                          />

                                          <RowActionIconBtn
                                            action="delete"
                                            onClick={() => {
                                              if (shouldDeleteSelectedOnAction) {
                                                removeUnitRows(selectedUnitIds);
                                                return;
                                              }
                                              removeUnitRows([rowId]);
                                            }}
                                            disabled={!isAdmin}
                                            size={tablePreset.actionSizes.button}
                                            iconSize={tablePreset.actionSizes.delete}
                                          />
                                        </div>
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
                </div>
              </TableWrap>
            </div>

            {/* پاپ‌آپ سطح دسترسی */}
            {accessOpen && (
              <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-black/50 p-2 backdrop-blur-sm sm:p-6">
                <div
                  className="flex w-[min(820px,calc(100vw-1rem))] max-h-[calc(100dvh-1rem)] flex-col overflow-hidden
                         rounded-2xl sm:rounded-3xl shadow-2xl ring-1 ring-black/10 dark:ring-neutral-800
                         bg-white text-black dark:bg-neutral-900 dark:text-neutral-100"
                  dir="rtl"
                >
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/10 px-3 py-2.5 dark:border-neutral-800 sm:px-4">
                    <h2 className="min-w-0 truncate text-[11px] font-bold md:text-base">
                      سطح دسترسی {accessUnit ? `— ${accessUnit.name}` : ""}
                    </h2>

                    <button
                      type="button"
                      onClick={closeAccess}
                      className="h-8 w-8 shrink-0 grid place-items-center rounded-lg
                             ring-1 ring-black/15 hover:bg-black/5 transition
                             dark:ring-neutral-800 dark:hover:bg-white/10"
                      aria-label="بستن"
                      title="بستن"
                    >
                      <img src="/images/icons/bastan.svg" alt="" className="w-4 h-4 dark:invert" />
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-auto p-2 sm:p-3">
                  <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-neutral-800">
                    <table className="w-full text-xs md:text-sm">
                      <thead className="hidden sm:table-header-group bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700">
                        <tr>
                          <th className="py-1.5 px-4 text-center !font-semibold">صفحه</th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr className="border-t border-black/10 dark:border-neutral-800">
                          <td className="py-2 px-2 sm:px-4">
                            {accessLoading ? (
                              <div className="text-center text-black/60 dark:text-neutral-400 py-4">در حال بارگذاری…</div>
                            ) : (
                              <div className="grid gap-1.5 sm:gap-1">
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
                                      className="rounded-xl sm:rounded-2xl border border-black/10 dark:border-neutral-800 overflow-hidden"
                                    >
                                      <div className="flex items-center justify-between gap-2 px-2.5 py-2 md:gap-3 md:px-3 md:py-1 hover:bg-black/[0.04] dark:hover:bg-white/10">
                                        <div className="flex min-w-0 items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => togglePageOpen(opt.key)}
                                            className="h-7 w-7 sm:h-8 sm:w-8 grid place-items-center rounded-lg
                                                   bg-transparent hover:opacity-80 active:opacity-70 transition
                                                   ring-1 ring-black/15 dark:ring-neutral-800"
                                            aria-label="باز/بستن"
                                            title="باز/بستن"
                                          >
                                            <span className="text-sm leading-none">{isOpen ? "−" : "+"}</span>
                                          </button>
                                          <span className="min-w-0 truncate text-right font-semibold text-[11px] md:text-[14px]">{opt.label}</span>
                                        </div>

                                        <input
                                          type="checkbox"
                                          className="w-3.5 h-3.5 shrink-0 accent-black dark:accent-neutral-200"
                                          checked={isAllChecked}
                                          ref={(el) => {
                                            if (el) el.indeterminate = isSomeChecked;
                                          }}
                                          onChange={() => togglePageCheck(opt.key)}
                                        />
                                      </div>

                                      {isOpen && (
                                        <div className="px-3 py-2 bg-black/[0.02] dark:bg-white/5">
                                          <div className="text-[10px] sm:text-[11px] text-black/60 dark:text-neutral-400 mb-1.5 text-center">
                                            تب‌ها
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                            {tabOptions.map((t) => (
                                              <label
                                                key={t.key}
                                                className="flex items-center justify-between gap-2 rounded-xl
                                                       border border-black/10 px-2.5 py-1.5 sm:px-3 sm:py-1 hover:bg-black/[0.04]
                                                       dark:border-neutral-800 dark:hover:bg-white/10"
                                              >
                                                <span className="min-w-0 truncate text-[11px] md:text-[13px]">{t.label}</span>
                                                <input
                                                  type="checkbox"
                                                  className="w-3.5 h-3.5 shrink-0 accent-black dark:accent-neutral-200"
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
                  </div>

                  {(accessError || accessOk) && (
                    <div className={`shrink-0 px-3 pt-2 text-xs md:text-sm ${accessError ? "text-red-600 dark:text-red-400" : "text-green-600"}`}>
                      {accessError || accessOk}
                    </div>
                  )}

                  <div className="shrink-0 flex items-center justify-end gap-2 border-t border-black/10 px-3 py-3 dark:border-neutral-800 sm:px-4">
                    <PrimaryBtn
                      type="button"
                      onClick={saveUnitAccess}
                      disabled={!isAdmin || accessSaving || accessLoading}
                      className="!h-9 !rounded-xl !bg-neutral-900 !px-4 !text-xs !text-white dark:!bg-neutral-100 dark:!text-neutral-900 md:!h-10 md:!text-sm"
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
            {/* Section (form + table) */}
            <div className={tabbedPanelClass}>
              {/* فرم افزودن نقش */}
              <form
                onSubmit={addRole}
                className="p-3 md:p-4 flex items-center gap-2"
              >
                <button
                  type="submit"
                  className="order-2 h-10 w-10 shrink-0 grid place-items-center rounded-xl bg-white text-black border border-black/15 hover:bg-black/5
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
                  className="order-1 min-w-0 flex-1 h-10 rounded-xl px-3 text-[13px] md:text-sm bg-white text-black placeholder-black/40 border border-black/15 outline-none
                       focus:ring-2 focus:ring-black/10
                       dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:placeholder-neutral-400 dark:focus:ring-neutral-600/50"
                />
              </form>

              {(rolesErr || rolesLoading) && (
                <div className="px-3 pb-2 text-[13px] md:px-4 md:text-sm -mt-2">
                  {rolesLoading ? (
                    <span className="text-black/60 dark:text-neutral-400">در حال بارگذاری…</span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">{rolesErr}</span>
                  )}
                </div>
              )}

              {/* جدول نقش‌ها */}
              <TableWrap>
                <div className={tableUi.outer}>
                  <div className={tableUi.innerPad}>
                    <div className={tableUi.frame}>
                    <div className="md:hidden">
                      {rolesList.length === 0 && !rolesLoading ? (
                        <div className="px-3 py-8 text-center text-sm text-black/55 dark:text-neutral-400">
                          آیتمی ثبت نشده است.
                        </div>
                      ) : (
                        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                          {rolesList.map((it, idx) => {
                            const rowId = String(it.id);
                            const isSelected = selectedRoleSet.has(rowId);
                            const isEditing = !!editingRolesById[rowId];
                            const shouldDeleteSelectedOnAction = isSelected && selectedRoleIds.length > 1;

                            return (
                              <div key={it.id} className="border-r-4 border-neutral-900 bg-white p-3 dark:border-neutral-100 dark:bg-neutral-900">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <input
                                        type="checkbox"
                                        className={rowUi.checkbox + " shrink-0"}
                                        checked={isSelected}
                                        onChange={() => toggleRoleRowSelect(rowId)}
                                        aria-label="انتخاب"
                                        title="انتخاب"
                                      />
                                      <span className="shrink-0 rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] text-neutral-700 dark:bg-white/10 dark:text-white/80">
                                        {idx + 1}
                                      </span>
                                      <span className="min-w-0 truncate text-sm font-bold">{it.name || "—"}</span>
                                    </div>
                                  </div>

                                  {!isEditing ? (
                                    <div className="flex shrink-0 items-center gap-1">
                                      <RowActionIconBtn action="edit" onClick={() => startRoleEdit(it)} size={34} iconSize={15} />
                                      <RowActionIconBtn
                                        action="delete"
                                        onClick={() => {
                                          if (shouldDeleteSelectedOnAction) {
                                            removeRoleRows(selectedRoleIds);
                                            return;
                                          }
                                          removeRoleRows([rowId]);
                                        }}
                                        size={34}
                                        iconSize={16}
                                      />
                                    </div>
                                  ) : null}
                                </div>

                                {isEditing ? (
                                  <div className="mt-3 flex items-center gap-2">
                                    <input
                                      value={editingRolesById?.[rowId]?.name || ""}
                                      onChange={(e) => setRoleDraftName(rowId, e.target.value)}
                                      className="min-w-0 flex-1 rounded-xl border border-black/15 bg-white px-3 py-2 text-center text-[13px] text-black outline-none focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:ring-neutral-600/50"
                                      autoFocus
                                    />
                                    <div className="flex shrink-0 items-center gap-1">
                                      <RowActionIconBtn action="save" onClick={() => saveRoleEdit(rowId)} size={34} iconSize={15} />
                                      <RowActionIconBtn action="cancel" onClick={() => cancelRoleEdit(rowId)} size={34} iconSize={15} />
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                      <table className={`${tableUi.table} min-w-[520px]`} dir="rtl">
                        <thead>
                          <tr className={tableUi.headRow}>
                            <th className={`w-12 ${tableUi.th}`}>
                              <input
                                type="checkbox"
                                className={rowUi.checkbox}
                                checked={allVisibleRolesSelected}
                                ref={(el) => {
                                  if (el) el.indeterminate = someVisibleRolesSelected;
                                }}
                                onChange={toggleSelectAllRolesVisible}
                                aria-label="انتخاب همه"
                                title="انتخاب همه"
                              />
                            </th>
                            <th className={`w-20 sm:w-24 ${tableUi.th}`}>#</th>
                            <th className={tableUi.th}>نام نقش</th>
                          </tr>
                        </thead>

                        <tbody className={tableUi.body}>
                          {rolesList.length === 0 && !rolesLoading ? (
                            <tr>
                              <td colSpan={3} className={tableUi.emptyRow}>
                                آیتمی ثبت نشده است.
                              </td>
                            </tr>
                          ) : (
                            rolesList.map((it, idx) => {
                              const isLast = idx === rolesList.length - 1;
                              const tdBorder = isLast ? "" : tableUi.rowDivider;
                              const rowId = String(it.id);
                              const isSelected = selectedRoleSet.has(rowId);
                              const isEditing = !!editingRolesById[rowId];
                              const shouldDeleteSelectedOnAction = isSelected && selectedRoleIds.length > 1;

                              return (
                                <tr key={it.id} className={getHoverSelectableRowClass(isSelected)}>
                                  <td className={`px-3 ${tdBorder}`}>
                                    <input
                                      type="checkbox"
                                      className={rowUi.checkbox}
                                      checked={isSelected}
                                      onChange={() => toggleRoleRowSelect(rowId)}
                                      aria-label="انتخاب"
                                      title="انتخاب"
                                    />
                                  </td>
                                  <td className={`px-3 ${tdBorder}`}>{idx + 1}</td>

                                  <td className={`px-3 ${rowUi.valueCell} ${tdBorder}`}>
                                    {isEditing ? (
                                      <div className="flex items-center justify-between gap-2">
                                        <input
                                          value={editingRolesById?.[rowId]?.name || ""}
                                          onChange={(e) => setRoleDraftName(rowId, e.target.value)}
                                          className="w-full rounded-xl px-3 py-2 bg-white text-black placeholder-black/40 border border-black/15 outline-none text-center
                                               focus:ring-2 focus:ring-black/10
                                               dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:placeholder-neutral-400 dark:focus:ring-neutral-600/50"
                                          autoFocus
                                        />
                                        <div className="flex items-center gap-1 shrink-0">
                                          <RowActionIconBtn
                                            action="save"
                                            onClick={() => saveRoleEdit(rowId)}
                                            size={tablePreset.actionSizes.button}
                                            iconSize={tablePreset.actionSizes.save}
                                          />
                                          <RowActionIconBtn
                                            action="cancel"
                                            onClick={() => cancelRoleEdit(rowId)}
                                            size={tablePreset.actionSizes.button}
                                            iconSize={tablePreset.actionSizes.cancel}
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className={rowUi.valueWrap}>
                                        <span className={rowUi.valueText}>{it.name}</span>
                                        <div className={rowUi.rowActions}>
                                          <RowActionIconBtn
                                            action="edit"
                                            onClick={() => startRoleEdit(it)}
                                            size={tablePreset.actionSizes.button}
                                            iconSize={tablePreset.actionSizes.edit}
                                          />
                                          <RowActionIconBtn
                                            action="delete"
                                            onClick={() => {
                                              if (shouldDeleteSelectedOnAction) {
                                                removeRoleRows(selectedRoleIds);
                                                return;
                                              }
                                              removeRoleRows([rowId]);
                                            }}
                                            size={tablePreset.actionSizes.button}
                                            iconSize={tablePreset.actionSizes.delete}
                                          />
                                        </div>
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
                </div>
              </TableWrap>
            </div>
          </>
        )}

        {activeTab === "unitRoles" && (
          <div className={tabbedPanelClass}>
            <div className="space-y-4 p-3 sm:p-4">
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <form
                    onSubmit={addUnitFromUnitRoles}
                    className="rounded-2xl border border-black/10 bg-black/[0.02] p-3 dark:border-neutral-800 dark:bg-white/[0.03]"
                  >
                    <UnitRoleFieldLabel>واحد جدید</UnitRoleFieldLabel>
                    <div className="flex items-center gap-2 flex-row-reverse">
                      <UnitRoleAddIconBtn title="افزودن واحد" disabled={!isAdmin || unitRoleSaving} />
                      <input
                        value={unitRoleNewUnit}
                        onChange={(e) => setUnitRoleNewUnit(e.target.value)}
                        disabled={!isAdmin || unitRoleSaving}
                        placeholder="نام واحد..."
                        className="flex-1 h-10 rounded-xl px-3 bg-white text-black placeholder-neutral-400
                                   border border-black/15 outline-none focus:ring-2 focus:ring-black/10
                                   dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50
                                   disabled:opacity-60"
                      />
                    </div>
                  </form>

                  <div className="md:col-span-2 rounded-2xl border border-black/10 bg-black/[0.02] p-3 dark:border-neutral-800 dark:bg-white/[0.03]">
                    <div className="flex flex-col md:flex-row-reverse gap-3">
                      <form onSubmit={addRoleToSelectedUnit} className="md:flex-1">
                        <UnitRoleFieldLabel>نقش جدید</UnitRoleFieldLabel>
                        <div className="flex items-center gap-2 flex-row-reverse">
                          <UnitRoleAddIconBtn title="افزودن نقش" disabled={!isAdmin || unitRoleSaving || !selectedUnitRoleUnitId} />
                          <input
                            ref={unitRoleRoleInputRef}
                            value={unitRoleNewRole}
                            onChange={(e) => setUnitRoleNewRole(e.target.value)}
                            disabled={!isAdmin || unitRoleSaving || !selectedUnitRoleUnitId}
                            placeholder="نام نقش..."
                            className="flex-1 h-10 rounded-xl px-3 bg-white text-black placeholder-neutral-400
                                       border border-black/15 outline-none focus:ring-2 focus:ring-black/10
                                       dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50
                                       disabled:opacity-60"
                          />
                        </div>
                      </form>

                      <div className="md:flex-1">
                        <UnitRoleFieldLabel>واحد ها</UnitRoleFieldLabel>
                        <UnitRoleCombobox
                          items={unitRoleUnitOptions}
                          value={unitRoleUnitQuery}
                          onValueChange={setUnitRoleUnitQuery}
                          selectedId={selectedUnitRoleUnitId}
                          onSelect={(id) => setSelectedUnitRoleUnitId(id)}
                          inputRef={unitRoleUnitComboRef}
                          disabled={unitRoleSaving}
                        />
                        {!selectedUnitRoleUnitId && String(unitRoleUnitQuery || "").trim() ? (
                          <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                            یک واحد معتبر انتخاب کنید.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {unitRoleErr && <div className="mt-2 text-sm text-red-600 dark:text-red-400">{unitRoleErr}</div>}
                {rolesLoading && (
                  <div className="mt-2 text-sm text-black/60 dark:text-neutral-400">در حال بارگذاری نقش‌ها…</div>
                )}
              </div>

              <div className="mt-3">
                <UnitRolesTableShell>
                  <THead>
                    <tr className="bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700">
                      <TH className="w-44 !text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
                        واحد ها
                      </TH>
                      <TH className="!text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
                        نقش‌ها
                      </TH>
                    </tr>
                  </THead>

                  <tbody className="[&_td]:text-black dark:[&_td]:text-neutral-100 [&_td]:text-center [&_th]:text-center">
                    {unitRoleLoading ? (
                      <TR className="border-t-0 bg-white dark:bg-neutral-900">
                        <TD colSpan={2} className="text-center text-black/60 dark:text-neutral-400 py-3">
                          در حال بارگذاری…
                        </TD>
                      </TR>
                    ) : unitRolesRows.length === 0 ? (
                      <TR className="border-t-0 bg-white dark:bg-neutral-900">
                        <TD colSpan={2} className="text-center text-black/60 dark:text-neutral-400 py-3">
                          واحدی ثبت نشده است.
                        </TD>
                      </TR>
                    ) : (
                      unitRolesRows.map((row, idx) => {
                        const isLast = idx === unitRolesRows.length - 1;
                        const tdBorder = isLast ? "" : "border-b border-neutral-300 dark:border-neutral-700";
                        const hasRoles = (row.roles || []).length > 0;

                        return (
                          <TR
                            key={row.id}
                            className="group border-t-0 bg-white transition-colors hover:bg-black/[0.04] dark:bg-neutral-900 dark:hover:bg-white/10"
                          >
                            <TD className={`px-3 font-semibold ${tdBorder}`}>{row.unit || "—"}</TD>

                            <TD className={`px-3 !py-[6px] ${tdBorder}`}>
                              {hasRoles ? (
                                <div className="flex flex-wrap items-center justify-start gap-2">
                                  {row.roles.map((role) => (
                                    <UnitRoleChip
                                      key={`${row.id}-${role?.id ?? role?.name}`}
                                      label={role?.name || "—"}
                                      disabled={!isAdmin || unitRoleSaving}
                                      onRemove={() => removeRoleFromUnit(row.id, role)}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <span className="text-neutral-500 dark:text-neutral-400">—</span>
                              )}
                            </TD>
                          </TR>
                        );
                      })
                    )}
                  </tbody>
                </UnitRolesTableShell>
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && isAdmin && (
          <div className={tabbedPanelClass}>
            <UsersTab embedded />
          </div>
        )}

        {activeTab === "assignments" && isAdmin && (
          <div className={tabbedPanelClass}>
            <div className="space-y-4 p-3 sm:p-4">
              <div>
                <form
                  onSubmit={addAssignment}
                  className="rounded-2xl border border-black/10 bg-black/[0.02] p-3 dark:border-neutral-800 dark:bg-white/[0.03]"
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <UnitRoleFieldLabel>کاربران</UnitRoleFieldLabel>
                      <UnitRoleCombobox
                        items={assignmentUserOptions}
                        value={assignmentUserQuery}
                        onValueChange={setAssignmentUserQuery}
                        selectedId={selectedAssignmentUserId}
                        onSelect={(id) => setSelectedAssignmentUserId(id)}
                        inputRef={assignmentUserComboRef}
                        disabled={assignmentSaving || assignmentLoading}
                        ariaLabel="کاربران"
                      />
                      {!selectedAssignmentUserId && String(assignmentUserQuery || "").trim() ? (
                        <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                          یک کاربر معتبر انتخاب کنید.
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <UnitRoleFieldLabel>نقش ها</UnitRoleFieldLabel>
                      <div className="flex items-center gap-2 flex-row-reverse">
                        <UnitRoleAddIconBtn
                          title="ثبت انتصاب"
                          disabled={assignmentSaving || assignmentLoading || !selectedAssignmentUserId || !selectedAssignmentRoleId}
                        />
                        <div className="min-w-0 flex-1">
                          <UnitRoleCombobox
                            items={assignmentRoleOptions}
                            value={assignmentRoleQuery}
                            onValueChange={setAssignmentRoleQuery}
                            selectedId={selectedAssignmentRoleId}
                            onSelect={(id) => setSelectedAssignmentRoleId(id)}
                            inputRef={assignmentRoleComboRef}
                            disabled={assignmentSaving || assignmentLoading || !selectedAssignmentUserId}
                            ariaLabel="نقش ها"
                          />
                        </div>
                      </div>
                      {!selectedAssignmentRoleId && String(assignmentRoleQuery || "").trim() ? (
                        <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                          یک نقش معتبر انتخاب کنید.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </form>

                {assignmentErr && <div className="mt-2 text-sm text-red-600 dark:text-red-400">{assignmentErr}</div>}
              </div>

              <div className="mt-3">
                <UnitRolesTableShell>
                  <THead>
                    <tr className="bg-neutral-200 text-black border-b border-neutral-300 dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700">
                      <TH className="w-44 !text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
                        کاربران
                      </TH>
                      <TH className="!text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
                        نقش ها
                      </TH>
                      <TH className="w-28 !text-center !font-semibold !text-black dark:!text-neutral-100 !py-2 !text-[14px] md:!text-[15px]">
                        اقدامات
                      </TH>
                    </tr>
                  </THead>

                  <tbody className="[&_td]:text-black dark:[&_td]:text-neutral-100 [&_td]:text-center [&_th]:text-center">
                    {assignmentLoading ? (
                      <TR className="border-t-0 bg-white dark:bg-neutral-900">
                        <TD colSpan={3} className="text-center text-black/60 dark:text-neutral-400 py-3">
                          در حال بارگذاری…
                        </TD>
                      </TR>
                    ) : assignmentRows.length === 0 ? (
                      <TR className="border-t-0 bg-white dark:bg-neutral-900">
                        <TD colSpan={3} className="text-center text-black/60 dark:text-neutral-400 py-3">
                          کاربری ثبت نشده است.
                        </TD>
                      </TR>
                    ) : (
                      assignmentRows.map((row, idx) => {
                        const isLast = idx === assignmentRows.length - 1;
                        const tdBorder = isLast ? "" : "border-b border-neutral-300 dark:border-neutral-700";
                        const hasRoles = (row.roles || []).length > 0;

                        return (
                          <TR
                            key={row.id}
                            className="group border-t-0 bg-white transition-colors hover:bg-black/[0.04] dark:bg-neutral-900 dark:hover:bg-white/10"
                          >
                            <TD className={`px-3 font-semibold ${tdBorder}`}>{row.user || "—"}</TD>

                            <TD className={`px-3 !py-[6px] ${tdBorder}`}>
                              {hasRoles ? (
                                <div className="flex flex-wrap items-center justify-start gap-2">
                                  {row.roles.map((role) => (
                                    <UnitRoleChip
                                      key={`${row.id}-${role?.id ?? role?.name}`}
                                      label={role?.name || "—"}
                                      disabled={assignmentSaving}
                                      onRemove={() => removeRoleFromUser(row.id, role)}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <span className="text-neutral-500 dark:text-neutral-400">—</span>
                              )}
                            </TD>

                            <TD className={`px-3 ${tdBorder}`}>
                              <div className="flex items-center justify-center gap-2">
                                <RowActionIconBtn
                                  action="delete"
                                  onClick={() => clearRolesFromUser(row.id, row.user)}
                                  disabled={assignmentSaving || !hasRoles}
                                  size={36}
                                  iconSize={17}
                                />
                              </div>
                            </TD>
                          </TR>
                        );
                      })
                    )}
                  </tbody>
                </UnitRolesTableShell>
              </div>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

export default OrgStructurePage;
