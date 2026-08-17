// src/pages/UsersTab.jsx
import React, { useState, useEffect } from "react";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";
import {
  hoverSelectableCrudTablePreset as tablePreset,
  getHoverSelectableRowClass,
} from "../components/ui/tablePresets.js";
import { dayjs } from "../utils/date";

// اگر api جدا داری، می‌تونی این بخش رو حذف و از util خودت ایمپورت کنی
const api = async (path, opt = {}) => {
  const res = await fetch("/api" + path, {
    credentials: "include",
    ...opt,
    headers: {
      "Content-Type": "application/json",
      ...(opt.headers || {}),
    },
  });
  const txt = await res.text();
  let data = {};
  try {
    data = txt ? JSON.parse(txt) : {};
  } catch {}
  if (!res.ok) throw new Error(data?.error || data?.message || "request_failed");
  return data;
};

const inputCls =
  "h-10 rounded-2xl px-3 bg-white text-black placeholder-black/40 border border-black/15 outline-none " +
  "focus:ring-2 focus:ring-black/10 disabled:opacity-60 " +
  "dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50";

const selectCls =
  "h-10 rounded-2xl px-3 bg-white text-black border border-black/15 outline-none " +
  "dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700";

const dateButtonCls =
  "h-10 w-full rounded-2xl px-3 bg-white text-black border border-black/15 outline-none " +
  "focus:ring-2 focus:ring-black/10 flex items-center justify-between gap-2 " +
  "dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50";

const createEmptyUserForm = () => ({
  name: "",
  email: "",
  username: "",
  password: "",
  expiresAt: "",
  department: "",
  role: "user",
  unitPack: "",
  isActive: true,
  accessBudget: {
    "budget:projects": false,
    "budget:office": false,
    "budget:site": false,
    "budget:finance": false,
    "budget:cash": false,
    "budget:capex": false,
  },
  contracts: "contracts:nonfinancial",
  positions: [],
});

function toFaDigits(s) {
  return String(s || "").replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function normalizeJalaliYmd(v) {
  const s = String(v || "").trim().replace(/-/g, "/");
  const m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return "";
  return `${m[1]}/${String(m[2]).padStart(2, "0")}/${String(m[3]).padStart(2, "0")}`;
}

function jalaliYmdToIsoEndOfDay(v) {
  const normalized = normalizeJalaliYmd(v);
  if (!normalized) return null;
  const d = dayjs(normalized.replace(/\//g, "-"), { jalali: true })
    .calendar("gregory")
    .hour(23)
    .minute(59)
    .second(59)
    .millisecond(999);
  return d.isValid() ? d.toISOString() : null;
}

function dateTimeToJalaliYmd(v) {
  if (!v) return "";
  const d = dayjs(v);
  if (!d.isValid()) return "";
  return d.calendar("jalali").format("YYYY/MM/DD");
}

function formatExpiresAt(v) {
  const ymd = dateTimeToJalaliYmd(v);
  return ymd ? toFaDigits(ymd) : "بدون محدودیت";
}

function isExpired(v) {
  if (!v) return false;
  const ts = new Date(v).getTime();
  return Number.isFinite(ts) && ts < Date.now();
}

function UsersTab({ embedded = false }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    const deniedContent = (
      <div className="p-6 rounded-2xl border border-black/10 bg-white text-center text-black/80 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
        دسترسی به این بخش فقط برای مدیر سیستم مجاز است.
      </div>
    );

    if (embedded) {
      return <div className="p-3 md:p-4">{deniedContent}</div>;
    }

    return (
      <>
        <Card className="rounded-2xl border bg-white text-black border-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
          <div className="mb-3 text-base md:text-lg">
            <span className="text-black/70 dark:text-neutral-300">تنظیمات</span>
            <span className="mx-2 text-black/50 dark:text-neutral-400">›</span>
            <span className="font-semibold text-black dark:text-neutral-100">کاربران</span>
          </div>
          {deniedContent}
        </Card>
      </>
    );
  }

  // ===== state =====
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeUpdatingIds, setActiveUpdatingIds] = useState([]);

  // مرتب‌سازی
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const toggleSort = (key) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return key;
    });
  };

  const setSelected = (nextOrUpdater) => {
    setSelectedIds((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const rawNext = typeof nextOrUpdater === "function" ? nextOrUpdater(prevList) : nextOrUpdater;
      return Array.from(new Set((Array.isArray(rawNext) ? rawNext : []).map((id) => String(id))));
    });
  };

  // لیست واحدها
  const [units, setUnits] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addErr, setAddErr] = useState("");

  // نقش‌های کاربری
  const [roleItems, setRoleItems] = useState([]); // [{id,name, label}]
  const [rolesLoading, setRolesLoading] = useState(false);

  // نگاشت فارسی/انگلیسی نقش‌ها برای اتصال به گردش‌کار
  const ROLE_SLUG_TO_FA = {
    project_control: "کنترل پروژه",
    project_manager: "مدیر پروژه",
    accounting_specialist: "کارشناس حسابداری",
    finance_manager: "مدیر مالی",
    executive: "مدیریت",
  };
  const ROLE_FA_TO_SLUG = {
    "کنترل پروژه": "project_control",
    "مدیر پروژه": "project_manager",
    "کارشناس حسابداری": "accounting_specialist",
    "مدیر مالی": "finance_manager",
    مدیریت: "executive",
  };

  // نگاشت نقش‌ها (کلید: اسلاگ)
  const nameToId = React.useMemo(() => {
    const map = {};
    (roleItems || []).forEach((r) => {
      if (r?.name) map[r.name] = r.id;
    });
    return map;
  }, [roleItems]);
  const idToName = React.useMemo(() => {
    const map = {};
    (roleItems || []).forEach((r) => {
      if (r?.id != null) map[String(r.id)] = r.name;
    });
    return map;
  }, [roleItems]);
  const slugToLabel = React.useMemo(() => {
    const map = {};
    (roleItems || []).forEach((r) => {
      if (r?.name) map[r.name] = r.label || r.name;
    });
    return map;
  }, [roleItems]);

  // ویرایش
  const [editId, setEditId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [addForm, setAddForm] = useState(createEmptyUserForm);

  const unitPacks = [
    ["pack:pm", "برنامه‌ریزی و کنترل پروژه"],
    ["pack:com", "بازرگانی"],
    ["pack:hr", "منابع انسانی و اداری"],
    ["pack:fin", "مالی"],
    ["pack:siteA", "کارگاه A"],
    ["pack:siteB", "کارگاه B"],
    ["pack:site", "سایت"],
  ];

  const allowedAccessRe =
    /^(budget:(projects|office|site|finance|cash|capex)|contracts:(all|nonfinancial)|pack:(pm|com|hr|fin|site|siteA|siteB))$/;
  const sanitizeAccess = (arr = []) =>
    Array.from(new Set((arr || []).filter((k) => allowedAccessRe.test(String(k || "")))));

  // ===== api helpers =====
  const reload = async () => {
    setLoading(true);
    try {
      const r = await api("/admin/users");
      setList(Array.isArray(r.users) ? r.users : []);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    setRolesLoading(true);
    try {
      const r = await api("/base/user-roles");
      const items = Array.isArray(r.items) ? r.items : [];

      // نرمال‌سازی: اتصال فارسی/انگلیسی و انتخاب id مناسب
      const bySlug = {};
      items
        .filter((it) => (it?.name || "").trim())
        .forEach((it) => {
          const raw = String(it.name).trim();
          let slug = raw;
          let label = raw;
          let priority = 1; // ۲ = اسلاگ انگلیسی رسمی، ۱ = بقیه

          if (ROLE_SLUG_TO_FA[raw]) {
            slug = raw;
            label = ROLE_SLUG_TO_FA[raw];
            priority = 2;
          } else if (ROLE_FA_TO_SLUG[raw]) {
            slug = ROLE_FA_TO_SLUG[raw];
            label = ROLE_SLUG_TO_FA[slug] || raw;
            priority = 1;
          }

          const prev = bySlug[slug];
          if (!prev || priority > prev.priority) {
            bySlug[slug] = {
              id: it.id,
              name: slug,
              label,
              priority,
            };
          }
        });

      const norm = Object.keys(bySlug).map((k) => {
        const { id, name, label } = bySlug[k];
        return { id, name, label };
      });

      setRoleItems(norm);
    } finally {
      setRolesLoading(false);
    }
  };

  const normalizeUnits = (raw = []) => {
    const mapped = raw
      .map((u, i) => ({
        id: u.id ?? u._id ?? i,
        name: (u.name ?? u.title ?? u.label ?? u.department_name ?? "").trim(),
      }))
      .filter((u) => u.name);
    const seen = new Set();
    const dedup = [];
    for (const u of mapped) {
      if (seen.has(u.name)) continue;
      seen.add(u.name);
      dedup.push(u);
    }
    return dedup;
  };

 const loadUnits = async () => {
  try {
    // ✅ بک‌اند شما: /api/base/units
    const r = await api("/base/units");

    // بک‌اند شما این فرم را برمی‌گرداند:
    // { ok: true, units: [...] }
    const arr = Array.isArray(r?.units) ? r.units : [];

    // نرمال‌سازی برای اینکه select درست کار کند
    const norm = normalizeUnits(arr);

    setUnits(norm);
  } catch (e) {
    // اگر 404 یا هر خطایی شد، فقط لیست را خالی کن
    setUnits([]);
  }
};

  // بارگذاری داده‌های مورد نیاز تب کاربران
  useEffect(() => {
    (async () => {
      await Promise.all([reload().catch(() => {}), loadUnits().catch(() => {})]);
    })();
  }, []);

  // ===== add user =====
  const buildAccessArrayFromAddForm = () => {
    if (addForm.role === "admin") return [];
    const arr = [];
    Object.entries(addForm.accessBudget).forEach(([k, v]) => {
      if (v) arr.push(k);
    });
    if (addForm.contracts) arr.push(addForm.contracts);
    if (addForm.unitPack) arr.push(addForm.unitPack);
    return sanitizeAccess(arr);
  };

  const submitAdd = async (e) => {
    e?.preventDefault();
    setAddErr("");
    const isEditing = editId !== null;
    const isPersonnel = addForm.role === "personnel";
    if (isPersonnel && !addForm.name.trim()) {
      setAddErr("نام پرسنل الزامی است.");
      return;
    }
    if (!isPersonnel && (!addForm.username.trim() || (!isEditing && !addForm.password.trim()))) {
      setAddErr(isEditing ? "نام کاربری الزامی است." : "نام کاربری و گذرواژه الزامی است.");
      return;
    }
    try {
      setAddSaving(true);
      await api("/admin/users", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEditing ? { id: editId } : {}),
          name: addForm.name?.trim() || null,
          email: addForm.email?.trim() || null,
          department: addForm.department || null,
          role: addForm.role || "user",
          isActive: addForm.isActive !== false,
          ...(!isPersonnel
            ? {
                username: addForm.username.trim(),
                password: addForm.password,
                expiresAt: jalaliYmdToIsoEndOfDay(addForm.expiresAt),
              }
            : {}),
        }),
      });
      if (!isPersonnel && isEditing && addForm.password) {
        await api("/admin/users/password", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editId, password: addForm.password }),
        });
      }
      setAddSaving(false);
      setAddOpen(false);
      setEditId(null);
      setAddForm(createEmptyUserForm());
      await reload();
    } catch (ex) {
      setAddSaving(false);
      setAddErr(ex?.message || "خطا در ایجاد کاربر");
    }
  };

  // ===== edit in the add form =====
  const startEdit = (u) => {
    setEditId(u.id);
    setAddErr("");
    setAddForm((current) => ({
      ...current,
      name: u.name || "",
      email: u.email || "",
      username: u.username || "",
      department: u.department || "",
      role: u.role || "user",
      isActive: u.isActive !== false,
      password: "",
      expiresAt: dateTimeToJalaliYmd(u.expiresAt || u.expires_at || u.validUntil || u.valid_until),
    }));
    setAddOpen(true);
  };

  const toggleUserActive = async (targetUser) => {
    const id = String(targetUser.id);
    if (activeUpdatingIds.includes(id)) return;
    const isActive = targetUser.isActive === false;
    setActiveUpdatingIds((prev) => [...prev, id]);
    setList((prev) => prev.map((u) => (String(u.id) === id ? { ...u, isActive } : u)));
    try {
      await api("/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: targetUser.id, isActive }),
      });
    } catch (ex) {
      setList((prev) => prev.map((u) => (String(u.id) === id ? { ...u, isActive: targetUser.isActive !== false } : u)));
      alert(ex?.message || "خطا در تغییر وضعیت کاربر");
    } finally {
      setActiveUpdatingIds((prev) => prev.filter((value) => value !== id));
    }
  };

  const removeRows = async (ids) => {
    const uniqIds = Array.from(
      new Set(
        (Array.isArray(ids) ? ids : [ids])
          .filter((id) => id !== null && id !== undefined)
          .map((id) => String(id))
      )
    );
    if (!uniqIds.length) return;

    const firstUser = (list || []).find((u) => String(u.id) === String(uniqIds[0]));
    const firstLabel = firstUser?.username || firstUser?.name || uniqIds[0] || "-";
    const confirmText = uniqIds.length > 1 ? `حذف ${uniqIds.length} کاربر انتخاب‌شده؟` : `حذف کاربر «${firstLabel}»؟`;
    if (!confirm(confirmText)) return;

    const idSet = new Set(uniqIds);
    if (editId != null && idSet.has(String(editId))) {
      setEditId(null);
      setAddOpen(false);
      setAddForm(createEmptyUserForm());
    }

    setList((prev) => (prev || []).filter((u) => !idSet.has(String(u.id))));
    setSelected((prev) => (prev || []).filter((id) => !idSet.has(String(id))));

    const idMap = new Map((list || []).map((it) => [String(it.id), it.id]));
    try {
      await Promise.all(
        uniqIds.map((sid) =>
          api(`/admin/users`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: idMap.has(sid) ? idMap.get(sid) : sid }),
          })
        )
      );
    } catch (ex) {
      await reload();
      alert(ex?.message || "خطا در حذف");
    }
  };

  // ===== translate access labels (فارسی‌سازی) =====
  const accessLabelMap = {
    "budget:projects": "پروژه‌ها",
    "budget:office": "دفتر مرکزی",
    "budget:site": "سایت",
    "budget:finance": "مالی",
    "budget:cash": "نقدی",
    "budget:capex": "سرمایه‌ای",
    "contracts:all": "قراردادها (همه اطلاعات)",
    "contracts:nonfinancial": "قراردادها (غیرمالی)",
    "pack:pm": "برنامه‌ریزی و کنترل پروژه",
    "pack:com": "بازرگانی",
    "pack:hr": "منابع انسانی و اداری",
    "pack:fin": "مالی",
    "pack:siteA": "کارگاه A",
    "pack:siteB": "کارگاه B",
    "pack:site": "سایت",
  };
  const toFaAccess = (k) => {
    if (accessLabelMap[k]) return accessLabelMap[k];
    if (String(k).toLowerCase() === "all") return "همه";
    return k;
  };
  const renderAccessText = (u) => {
    if (u.role === "admin") return "همه";
    const arr = Array.isArray(u.access) ? u.access : Array.isArray(u.access_labels) ? u.access_labels : [];
    if (!arr.length) return "—";
    return arr.map(toFaAccess).join(" ، ");
  };

  // ===== sorted list =====
  const sortedList = React.useMemo(() => {
    const arr = Array.isArray(list) ? [...list] : [];
    if (!sortKey) return arr;
    arr.sort((a, b) => {
      const av = sortKey === "name" ? a.name || a.username || "" : a.department || "";
      const bv = sortKey === "name" ? b.name || b.username || "" : b.department || "";
      const cmp = String(av).localeCompare(String(bv), "fa", {
        sensitivity: "base",
        numeric: true,
      });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [list, sortKey, sortDir]);

  const tableUi = tablePreset.table;
  const rowUi = tablePreset.row;
  const visibleIds = (sortedList || []).map((u) => String(u.id));
  const selectedSet = new Set((selectedIds || []).map((id) => String(id)));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedSet.has(id)) && !allVisibleSelected;

  const toggleSelectAllVisible = () => {
    setSelected((prev) => {
      const prevSet = new Set((prev || []).map((id) => String(id)));
      if (allVisibleSelected) {
        return (prev || []).filter((id) => !visibleIds.includes(String(id)));
      }
      visibleIds.forEach((id) => prevSet.add(String(id)));
      return Array.from(prevSet);
    });
  };
  const userTypeLabel = (role) => ({
    personnel: "پرسنل",
    user: "کاربر",
    admin: "ادمین",
  }[String(role || "user").toLowerCase()] || role || "کاربر");

  const toggleRowSelect = (id) => {
    const sid = String(id);
    setSelected((prev) => {
      const exists = (prev || []).some((x) => String(x) === sid);
      return exists ? (prev || []).filter((x) => String(x) !== sid) : [...(prev || []), sid];
    });
  };

  useEffect(() => {
    const validIds = new Set((sortedList || []).map((u) => String(u.id)));
    setSelected((prev) => prev.filter((id) => validIds.has(String(id))));
  }, [sortedList]);

  const [addRolesOpen, setAddRolesOpen] = useState(false);

  const addPositionToAdd = (slug) => {
    setAddForm((s) => {
      const set = new Set(s.positions || []);
      set.add(slug);
      return { ...s, positions: Array.from(set) };
    });
  };
  const removePositionFromAdd = (slug) => {
    setAddForm((s) => ({
      ...s,
      positions: (s.positions || []).filter((x) => x !== slug),
    }));
  };


  // فقط اگر جایی نیاز شد
  const roleNames = roleItems.map((r) => r.name);

  // ✅ دکمه + طبق استاندارد ذخیره‌شده: بک‌گراند سفید و آیکن مشکی (بدون invert در لایت)
  // اگر فایل آیکن سفید بود: className را به "w-5 h-5 invert dark:invert-0" تغییر بده.
  const AddPlusBtn = ({ onClick, title = "افزودن", disabled = false, className = "" }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "h-10 w-10 grid place-items-center rounded-xl bg-white text-black border border-black/15 hover:bg-black/5 transition disabled:opacity-50 " +
        "dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-200/20 " +
        className
      }
      aria-label={title}
      title={title}
    >
      <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5" />
    </button>
  );

  const Container = embedded ? "div" : Card;
  const containerClass = embedded
    ? "p-3 md:p-4"
    : "rounded-2xl border bg-white text-black border-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800";

  return (
    <>
      <Container className={containerClass}>
        {/* Header + Add button */}
        <div className={`mb-3 flex items-center gap-3 ${embedded ? "justify-end" : "justify-between"}`}>
          {!embedded && (
            <div className="text-base md:text-lg">
              <span className="text-black/70 dark:text-neutral-300">تنظیمات</span>
              <span className="mx-2 text-black/50 dark:text-neutral-400">›</span>
              <span className="font-semibold text-black dark:text-neutral-100">کاربران</span>
            </div>
          )}

          <AddPlusBtn
            onClick={() => {
              setEditId(null);
              setAddErr("");
              setAddForm(createEmptyUserForm());
              setAddOpen((isOpen) => !isOpen);
            }}
            title="افزودن کاربر"
            className="ml-[15px]"
          />
        </div>

        {/* Add form (ریسپانسیو + دارک/لایت) */}
        {addOpen && (
          <form
            onSubmit={submitAdd}
            className="mb-4 rounded-2xl border border-black/10 bg-neutral-100 text-black overflow-hidden
                       dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
            dir="rtl"
          >
            <div className="p-4">
              <div className="grid grid-cols-1 gap-3 lg:items-end">
                <div className={addForm.role === "personnel" ? "flex flex-wrap items-end gap-3" : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]"}>
                <div className={`flex flex-col gap-1 ${addForm.role === "personnel" ? "w-full sm:w-[180px]" : ""}`}>
                  <label className="text-sm text-black/70 dark:text-neutral-300">نام</label>
                  <input
                    className={inputCls}
                    value={addForm.name}
                    onChange={(e) => setAddForm((s) => ({ ...s, name: e.target.value }))}
                  />
                </div>

                <div className={`flex flex-col gap-1 ${addForm.role === "personnel" ? "w-full sm:w-[180px]" : ""}`}>
                  <label className="text-sm text-black/70 dark:text-neutral-300">نوع</label>
                  <select
                    className={selectCls}
                    value={addForm.role}
                    onChange={(e) => setAddForm((s) => ({ ...s, role: e.target.value }))}
                  >
                    <option value="personnel">پرسنل</option>
                    <option value="user">کاربر</option>
                    <option value="admin">ادمین</option>
                  </select>
                </div>

                {addForm.role !== "personnel" && <>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-black/70 dark:text-neutral-300">نام کاربری*</label>
                  <input
                    className={inputCls + " text-left"}
                    dir="ltr"
                    required
                    value={addForm.username}
                    onChange={(e) => setAddForm((s) => ({ ...s, username: e.target.value }))}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm text-black/70 dark:text-neutral-300">
                    {editId !== null ? "کلمه عبور جدید (اختیاری، حداکثر ۸)" : "کلمه عبور* (حداکثر ۸)"}
                  </label>
                  <input
                    type="password"
                    maxLength={8}
                    className={inputCls + " text-left"}
                    dir="ltr"
                    required={editId === null}
                    value={addForm.password}
                    onChange={(e) => setAddForm((s) => ({ ...s, password: e.target.value.slice(0, 8) }))}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm text-black/70 dark:text-neutral-300">اعتبار تا</label>
                  <JalaliPopupDatePicker
                    value={addForm.expiresAt}
                    onChange={(v) => setAddForm((s) => ({ ...s, expiresAt: normalizeJalaliYmd(v) }))}
                    buttonClassName={dateButtonCls}
                    placeholder="بدون محدودیت"
                  />
                </div>
                </>}

                <div className="flex items-end justify-end">
                  <button
                    type="submit"
                    disabled={addSaving}
                    className="h-10 w-10 grid place-items-center rounded-xl bg-neutral-900 text-white hover:opacity-90 transition disabled:opacity-50
                               dark:bg-neutral-100 dark:text-neutral-900"
                    aria-label="ثبت"
                    title="ثبت"
                  >
                    <img src="/images/icons/check.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
                  </button>
                </div>
                </div>
              </div>

              {addErr && <div className="text-sm text-red-600 dark:text-red-400 mt-3">{addErr}</div>}
            </div>
          </form>
        )}

        {/* جدول کاربران (✅ استاندارد BaseCurrenciesPage + ریسپانسیو با اسکرول افقی) */}
        <TableWrap>
          <div className={tableUi.outer}>
            <div className="px-[15px] pb-4">
              <div className={tableUi.frame}>
                <div className="w-full overflow-x-auto">
                  <table className={`${tableUi.table} min-w-[1000px]`} dir="rtl">
                    <THead>
                      <tr className={tableUi.headRow}>
                        <TH className={`w-12 ${tableUi.th}`}>
                          <input
                            type="checkbox"
                            className={rowUi.checkbox}
                            checked={allVisibleSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someVisibleSelected;
                            }}
                            onChange={toggleSelectAllVisible}
                            aria-label="انتخاب همه"
                            title="انتخاب همه"
                          />
                        </TH>

                        <TH className={`w-20 sm:w-24 ${tableUi.th}`}>
                          #
                        </TH>

                        <TH className={`min-w-[180px] ${tableUi.th}`}>
                          <div className="flex items-center justify-center gap-2">
                            <span>نام</span>
                            <button
                              type="button"
                              onClick={() => toggleSort("name")}
                              className="h-7 w-7 inline-grid place-items-center bg-transparent p-0
                                         text-neutral-500 hover:text-neutral-600 active:text-neutral-700
                                         dark:text-neutral-400 dark:hover:text-neutral-300"
                              title="مرتب‌سازی نام"
                              aria-label="مرتب‌سازی نام"
                            >
                              <svg
                                className={`w-[14px] h-[14px] transition-transform ${
                                  sortKey === "name" && sortDir === "asc" ? "rotate-180" : ""
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

                        <TH className={`min-w-[140px] ${tableUi.th}`}>
                          نوع
                        </TH>

                        <TH className={`min-w-[180px] ${tableUi.th}`}>
                          نام کاربری
                        </TH>

                        <TH className={`min-w-[140px] ${tableUi.th}`}>
                          اعتبار تا
                        </TH>

                        <TH className={`w-32 sm:w-40 ${tableUi.th}`}>
                          وضعیت
                        </TH>

                        <TH className={`min-w-[132px] ${tableUi.th}`}>
                          عملیات
                        </TH>
                      </tr>
                    </THead>

                    <tbody className={tableUi.body}>
                      {loading ? (
                        <TR>
                          <TD colSpan={8} className={tableUi.emptyRow}>
                            در حال بارگذاری...
                          </TD>
                        </TR>
                      ) : (sortedList || []).length === 0 ? (
                        <TR>
                          <TD colSpan={8} className={tableUi.emptyRow}>
                            کاربری ثبت نشده است.
                          </TD>
                        </TR>
                      ) : (
                        (sortedList || []).map((u, idx) => {
                          const isLast = idx === (sortedList || []).length - 1;
                          const tdBorder = isLast ? "" : tableUi.rowDivider;
                          const rowId = String(u.id);
                          const isSelected = selectedSet.has(rowId);
                          const shouldDeleteSelectedOnAction = isSelected && selectedIds.length > 1;

                          return (
                            <TR key={u.id} className={getHoverSelectableRowClass(isSelected)}>
                              <TD className={`px-3 ${tdBorder}`}>
                                <input
                                  type="checkbox"
                                  className={rowUi.checkbox}
                                  checked={isSelected}
                                  onChange={() => toggleRowSelect(u.id)}
                                  aria-label="انتخاب"
                                  title="انتخاب"
                                />
                              </TD>

                              <TD className={`px-3 ${tdBorder}`}>{idx + 1}</TD>
                              <TD className={`px-3 ${tdBorder}`}>{u.name || "—"}</TD>
                              <TD className={`px-3 ${tdBorder} text-black/80 dark:text-neutral-300`}>
                                {userTypeLabel(u.role)}
                              </TD>
                              <TD className={`px-3 ${tdBorder}`} dir="ltr">{u.role === "personnel" ? "—" : u.username || "—"}</TD>
                              <TD className={`px-3 ${tdBorder} ${isExpired(u.expiresAt || u.expires_at) ? "text-red-600 dark:text-red-400" : ""}`}>
                                {formatExpiresAt(u.expiresAt || u.expires_at)}
                              </TD>
                              <TD className={`px-3 ${tdBorder}`}>
                                <input
                                  type="checkbox"
                                  className={rowUi.checkbox}
                                  checked={u.isActive !== false}
                                  disabled={activeUpdatingIds.includes(rowId)}
                                  onChange={() => toggleUserActive(u)}
                                  aria-label={u.isActive !== false ? "کاربر فعال" : "کاربر غیرفعال"}
                                  title={u.isActive !== false ? "فعال" : "غیرفعال"}
                                />
                              </TD>
                              <TD className={`px-3 ${rowUi.valueCell} ${tdBorder} text-black/80 dark:text-neutral-300`}>
                                <div className={rowUi.valueWrap}>
                                  <div className={`${rowUi.rowActions} !left-1/2 !-translate-x-1/2`}>
                                    <RowActionIconBtn
                                      action="edit"
                                      onClick={() => startEdit(u)}
                                      size={tablePreset.actionSizes.button}
                                      iconSize={tablePreset.actionSizes.edit}
                                    />
                                    <RowActionIconBtn
                                      action="delete"
                                      onClick={() => {
                                        if (shouldDeleteSelectedOnAction) {
                                          removeRows(selectedIds);
                                          return;
                                        }
                                        removeRows([u.id]);
                                      }}
                                      size={tablePreset.actionSizes.button}
                                      iconSize={tablePreset.actionSizes.delete}
                                    />
                                  </div>
                                </div>
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
      </Container>

    </>
  );
}

export default UsersTab;
