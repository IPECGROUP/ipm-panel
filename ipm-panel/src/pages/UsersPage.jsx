// src/pages/UsersPage.jsx
import React, { useState, useEffect } from "react";
import Shell from "../components/layout/Shell.jsx";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";
import { Btn, PrimaryBtn, DangerBtn } from "../components/ui/Button.jsx";
import { useAuth } from "../components/AuthProvider.jsx";

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

function UsersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return (
      <>
        <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
          <div className="mb-3 text-base md:text-lg">
            <span className="text-neutral-700 dark:text-neutral-300">
              اطلاعات پایه
            </span>
            <span className="mx-2 text-neutral-500 dark:text-neutral-400">
              ›
            </span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              کاربران
            </span>
          </div>
          <div className="p-6 rounded-2xl border border-neutral-200 bg-white text-center text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            دسترسی به این بخش فقط برای مدیر سیستم مجاز است.
          </div>
        </Card>
      </>
    );
  }

  // ===== state =====
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

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
    "مدیریت": "executive",
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
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    department: "",
    role: "user",
    password: "",
    access: [],
    positions: [],
  });
  // انتخاب «قراردادها» در حالت ویرایش
  const [contractsSel, setContracts] = useState("contracts:nonfinancial");

  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    department: "",
    role: "user",
    unitPack: "",
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
    Array.from(
      new Set(
        (arr || []).filter((k) =>
          allowedAccessRe.test(String(k || ""))
        )
      )
    );

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
        name:
          (u.name ??
            u.title ??
            u.label ??
            u.department_name ??
            "").trim(),
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
    const candidates = [
      "/basic/units",
      "/basic/units/list",
      "/basic/units/all",
      "/units",
      "/base/units",
    ];
    for (const path of candidates) {
      try {
        const r = await api(path);
        const data = r?.units ?? r?.items ?? r?.data ?? r;
        const arr = Array.isArray(data) ? data : [];
        const norm = normalizeUnits(arr);
        if (norm.length) {
          setUnits(norm);
          return;
        }
      } catch {
        /* next */
      }
    }
    setUnits([]);
  };

  // ترتیب درست: اول نقش‌ها، بعد کاربران (تا نگاشت آماده باشد)
  useEffect(() => {
    (async () => {
      await loadRoles().catch(() => {});
      await Promise.all([
        reload().catch(() => {}),
        loadUnits().catch(() => {}),
      ]);
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
    if (!addForm.username.trim() || !addForm.password.trim()) {
      setAddErr("نام کاربری و گذرواژه الزامی است.");
      return;
    }
    if (
      (addForm.positions || []).length &&
      (rolesLoading || (roleItems || []).length === 0)
    ) {
      setAddErr(
        "نقش‌ها هنوز بارگذاری نشده‌اند. چند ثانیه بعد دوباره ذخیره کنید."
      );
      return;
    }
    try {
      setAddSaving(true);
      const positionsIds = (addForm.positions || [])
        .map((n) => nameToId[n])
        .filter((v) => v != null);
      await api("/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name?.trim() || null,
          email: addForm.email?.trim() || null,
          username: addForm.username.trim(),
          password: addForm.password,
          department: addForm.department || null,
          role: addForm.role || "user",
          access: buildAccessArrayFromAddForm(),
          positions: positionsIds,
          roles: positionsIds,
        }),
      });
      setAddSaving(false);
      setAddOpen(false);
      setAddForm({
        name: "",
        email: "",
        username: "",
        password: "",
        department: "",
        role: "user",
        unitPack: "",
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
      await reload();
    } catch (ex) {
      setAddSaving(false);
      setAddErr(ex?.message || "خطا در ایجاد کاربر");
    }
  };

  // ===== edit (modal) =====
  const startEdit = (u) => {
    const acc = Array.isArray(u.access_labels)
      ? u.access_labels
      : Array.isArray(u.access)
      ? u.access
      : [];
    const contracts =
      acc.find((x) => String(x).startsWith("contracts:")) ||
      "contracts:nonfinancial";

    // u.positions یا u.roles را به اسلاگ نقش تبدیل کن
    const rawPos = Array.isArray(u.positions)
      ? u.positions
      : Array.isArray(u.roles)
      ? u.roles
      : [];
    const positionsNorm = rawPos
      .map((p) => {
        if (typeof p === "string") {
          const raw = String(p).trim();
          if (ROLE_FA_TO_SLUG[raw]) return ROLE_FA_TO_SLUG[raw];
          if (ROLE_SLUG_TO_FA[raw]) return raw;
          return raw;
        }
        if (typeof p === "number")
          return idToName[String(p)] || "";
        if (p && typeof p === "object") {
          if (p.name) {
            const raw = String(p.name).trim();
            if (ROLE_FA_TO_SLUG[raw]) return ROLE_FA_TO_SLUG[raw];
            if (ROLE_SLUG_TO_FA[raw]) return raw;
            return raw;
          }
          if (p.id != null) return idToName[String(p.id)] || "";
        }
        return "";
      })
      .filter(Boolean);

    setEditId(u.id);
    setForm({
      name: u.name || "",
      email: u.email || "",
      username: u.username || "",
      department: u.department || "",
      role: u.role || "user",
      password: "",
      access: acc.filter(
        (x) => !String(x).startsWith("contracts:")
      ),
      positions: positionsNorm,
    });
    setContracts(contracts);
    setEditOpen(true);
  };
  const cancelEdit = () => {
    setEditId(null);
    setEditOpen(false);
    setForm((s) => ({ ...s, password: "" }));
  };

  const has = (key) =>
    Array.isArray(form.access) && form.access.includes(key);
  const toggleBudget = (key) =>
    setForm((s) => {
      const set = new Set(s.access || []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...s, access: Array.from(set) };
    });

  const saveEdit = async () => {
    if (
      (form.positions || []).length &&
      (rolesLoading || (roleItems || []).length === 0)
    ) {
      alert(
        "نقش‌ها هنوز بارگذاری نشده‌اند. لطفاً چند ثانیه بعد دوباره ذخیره کنید."
      );
      return;
    }

    const payload = { ...form };

    // ⭐ اینجا id رو داخل body می‌فرستیم برای PATCH
    payload.id = editId;

    if (payload.role !== "admin") {
      const base = Array.isArray(payload.access)
        ? payload.access.filter(
            (x) => !String(x).startsWith("contracts:")
          )
        : [];
      if (contractsSel) base.push(contractsSel);
      payload.access = sanitizeAccess(base);
    } else {
      delete payload.access;
    }
    if (!payload.password) delete payload.password;

    const positionsIds = (form.positions || [])
      .map((n) => nameToId[n])
      .filter((v) => v != null);
    payload.positions = positionsIds;
    payload.roles = positionsIds;

    try {
      await api(`/admin/users`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      cancelEdit();
      await reload();
    } catch (ex) {
      alert(ex?.message || "خطا در ذخیره تغییرات");
    }
  };

  const del = async (u) => {
    if (
      !confirm(
        `حذف کاربر «${u.username || u.name || "-"}»؟`
      )
    )
      return;
    try {
      await api(`/admin/users`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id }),
      });
      await reload();
    } catch (ex) {
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
    const arr = Array.isArray(u.access)
      ? u.access
      : Array.isArray(u.access_labels)
      ? u.access_labels
      : [];
    if (!arr.length) return "—";
    return arr.map(toFaAccess).join(" ، ");
  };

  // ===== sorted list =====
  const sortedList = React.useMemo(() => {
    const arr = Array.isArray(list) ? [...list] : [];
    if (!sortKey) return arr;
    arr.sort((a, b) => {
      const av =
        sortKey === "name"
          ? a.name || a.username || ""
          : a.department || "";
      const bv =
        sortKey === "name"
          ? b.name || b.username || ""
          : b.department || "";
      const cmp = String(av).localeCompare(String(bv), "fa", {
        sensitivity: "base",
        numeric: true,
      });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [list, sortKey, sortDir]);

  const [addRolesOpen, setAddRolesOpen] = useState(false);
  const [editRolesOpen, setEditRolesOpen] = useState(false);

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

  const addPositionToEdit = (slug) => {
    setForm((s) => {
      const set = new Set(s.positions || []);
      set.add(slug);
      return { ...s, positions: Array.from(set) };
    });
  };
  const removePositionFromEdit = (slug) => {
    setForm((s) => ({
      ...s,
      positions: (s.positions || []).filter((x) => x !== slug),
    }));
  };

  // فقط اگر جایی نیاز شد
  const roleNames = roleItems.map((r) => r.name);

  return (
    <>
      <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        {/* Header + Add button */}
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base md:text-lg">
            <span className="text-neutral-700 dark:text-neutral-300">
              اطلاعات پایه
            </span>
            <span className="mx-2 text-neutral-500 dark:text-neutral-400">
              ›
            </span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              کاربران
            </span>
          </div>

          <button
            onClick={() => setAddOpen((s) => !s)}
            className="h-10 w-14 grid place-items-center rounded-xl bg-neutral-900 text-white hover:opacity-90 transition
                       dark:bg-neutral-100 dark:text-neutral-900"
            aria-label="افزودن کاربر"
            title="افزودن کاربر"
          >
            <img
              src="/images/icons/afzodan.svg"
              alt=""
              className="w-5 h-5 invert dark:invert-0"
            />
          </button>
        </div>

        {/* Add form */}
        {addOpen && (
          <form
            onSubmit={submitAdd}
            className="mb-4 rounded-2xl p-4 border border-neutral-200 bg-white text-neutral-900
                       dark:ring-1 dark:ring-neutral-800 dark:border-transparent dark:bg-neutral-900 dark:text-neutral-100"
          >
            <div className="grid md:grid-cols-2 gap-4" dir="rtl">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-neutral-700 dark:text-neutral-300">
                  نام
                </label>
                <input
                  className="rounded-xl px-3 py-2 bg-white text-neutral-900 placeholder-neutral-400
                             border border-neutral-300 outline-none focus:ring-2 focus:ring-neutral-300
                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm((s) => ({
                      ...s,
                      name: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-neutral-700 dark:text-neutral-300 text-left">
                  Email
                </label>
                <input
                  type="email"
                  className="rounded-xl px-3 py-2 bg-white text-neutral-900 placeholder-neutral-400
                             border border-neutral-300 outline-none text-left focus:ring-2 focus:ring-neutral-300
                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                  dir="ltr"
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm((s) => ({
                      ...s,
                      email: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-neutral-700 dark:text-neutral-300 text-left">
                  Username*
                </label>
                <input
                  className="rounded-xl px-3 py-2 bg-white text-neutral-900 placeholder-neutral-400
                             border border-neutral-300 outline-none text-left focus:ring-2 focus:ring-neutral-300
                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                  dir="ltr"
                  required
                  value={addForm.username}
                  onChange={(e) =>
                    setAddForm((s) => ({
                      ...s,
                      username: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-neutral-700 dark:text-neutral-300 text-left">
                  Password* (حداکثر ۸)
                </label>
                <input
                  type="password"
                  maxLength={8}
                  className="rounded-xl px-3 py-2 bg-white text-neutral-900 placeholder-neutral-400
                             border border-neutral-300 outline-none text-left focus:ring-2 focus:ring-neutral-300
                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                  dir="ltr"
                  required
                  value={addForm.password}
                  onChange={(e) =>
                    setAddForm((s) => ({
                      ...s,
                      password: e.target.value.slice(0, 8),
                    }))
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-neutral-700 dark:text-neutral-300">
                  واحد
                </label>
                <select
                  className="rounded-xl px-3 py-2 bg-white text-neutral-900 border border-neutral-300 outline-none
                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                  value={addForm.department}
                  onChange={(e) =>
                    setAddForm((s) => ({
                      ...s,
                      department: e.target.value,
                    }))
                  }
                >
                  <option value="">— انتخاب کنید —</option>
                  {(units || []).map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-neutral-700 dark:text-neutral-300">
                  نوع
                </label>
                <select
                  className="rounded-xl px-3 py-2 bg-white text-neutral-900 border border-neutral-300 outline-none
                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                  value={addForm.role}
                  onChange={(e) =>
                    setAddForm((s) => ({
                      ...s,
                      role: e.target.value,
                    }))
                  }
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>

            {/* نقش کاربری */}
            <div
              className="mt-4 text-neutral-900 dark:text-neutral-100"
              dir="rtl"
            >
              <label className="block mb-2 text-sm text-neutral-700 dark:text-neutral-300">
                نقش کاربری
              </label>

              <div className="flex flex-wrap gap-2 mb-2">
                {(addForm.positions || []).map((slug) => (
                  <span
                    key={slug}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full
                                             bg-neutral-100 text-neutral-900 border border-neutral-300
                                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                  >
                    {slugToLabel[slug] || slug}
                    <button
                      type="button"
                      onClick={() => removePositionFromAdd(slug)}
                      className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {(!addForm.positions ||
                  addForm.positions.length === 0) && (
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    نقشی انتخاب نشده است
                  </span>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAddRolesOpen((s) => !s)}
                  className="w-full h-10 text-right rounded-xl px-3 bg-white text-neutral-900 border border-neutral-300 outline-none
                             hover:bg-neutral-50
                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800/90"
                >
                  {rolesLoading
                    ? "در حال بارگذاری نقش‌ها…"
                    : "انتخاب از نقش‌های کاربری"}
                </button>

                {addRolesOpen && (
                  <div className="absolute z-20 mt-2 w-full max-h-56 overflow-auto rounded-xl border border-neutral-200 bg-white shadow
                                  text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
                    {roleItems.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
                        نقشی ثبت نشده است.
                      </div>
                    ) : (
                      roleItems.map((r) => (
                        <button
                          type="button"
                          key={r.name}
                          onClick={() => {
                            addPositionToAdd(r.name);
                          }}
                          className={`w-full text-right px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-white/10
                                    ${
                                      (addForm.positions || []).includes(
                                        r.name
                                      )
                                        ? "bg-neutral-50 dark:bg-white/10"
                                        : ""
                                    }`}
                        >
                          {r.label || r.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* دسترسی‌های بودجه و قرارداد */}
            <div
              className={`mt-4 grid md:grid-cols-2 gap-6 ${
                addForm.role === "admin"
                  ? "opacity-50 pointer-events-none"
                  : ""
              }`}
              dir="rtl"
            >
              <div className="rounded-xl p-3 border border-neutral-200 bg-white text-neutral-900
                              dark:ring-1 dark:ring-neutral-800 dark:border-transparent dark:bg-neutral-900 dark:text-neutral-100">
                <div className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">
                  بودجه‌بندی
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["budget:projects", "پروژه‌ها"],
                    ["budget:office", "دفتر مرکزی"],
                    ["budget:site", "سایت"],
                    ["budget:finance", "مالی"],
                    ["budget:cash", "نقدی"],
                    ["budget:capex", "سرمایه‌ای"],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 cursor-pointer select-none
                                                ring-1 ring-neutral-300 hover:bg-neutral-100
                                                dark:ring-neutral-800 dark:hover:bg-white/10"
                    >
                      <input
                        type="checkbox"
                        className="accent-neutral-900 dark:accent-neutral-200"
                        checked={!!addForm.accessBudget[key]}
                        onChange={() =>
                          setAddForm((s) => ({
                            ...s,
                            accessBudget: {
                              ...s.accessBudget,
                              [key]: !s.accessBudget[key],
                            },
                          }))
                        }
                      />
                      <span className="text-neutral-900 dark:text-neutral-200">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-3 border border-neutral-200 bg-white text-neutral-900
                              dark:ring-1 dark:ring-neutral-800 dark:border-transparent dark:bg-neutral-900 dark:text-neutral-100">
                <div className="font-medium mb-2">قراردادها</div>
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 rounded-full px-3 py-1 cursor-pointer select-none
                                      ring-1 ring-neutral-300 hover:bg-neutral-100
                                      dark:ring-neutral-800 dark:hover:bg-white/10">
                    <input
                      type="radio"
                      name="contracts-add"
                      className="accent-neutral-900 dark:accent-neutral-200"
                      checked={addForm.contracts === "contracts:all"}
                      onChange={() =>
                        setAddForm((s) => ({
                          ...s,
                          contracts: "contracts:all",
                        }))
                      }
                    />
                    <span className="text-neutral-900 dark:text-neutral-200">
                      همه اطلاعات
                    </span>
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-full px-3 py-1 cursor-pointer select-none
                                      ring-1 ring-neutral-300 hover:bg-neutral-100
                                      dark:ring-neutral-800 dark:hover:bg-white/10">
                    <input
                      type="radio"
                      name="contracts-add"
                      className="accent-neutral-900 dark:accent-neutral-200"
                      checked={
                        addForm.contracts === "contracts:nonfinancial"
                      }
                      onChange={() =>
                        setAddForm((s) => ({
                          ...s,
                          contracts: "contracts:nonfinancial",
                        }))
                      }
                    />
                    <span className="text-neutral-900 dark:text-neutral-200">
                      صرفاً اطلاعات غیرمالی
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {addErr && (
              <div className="text-sm text-red-600 dark:text-red-400 mt-3">
                {addErr}
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button
                type="submit"
                disabled={addSaving}
                className="h-10 w-10 grid place-items-center rounded-xl bg-neutral-900 text-white disabled:opacity-50
                           dark:bg-neutral-100 dark:text-neutral-900"
                aria-label="افزودن"
                title="افزودن"
              >
                <img
                  src="/images/icons/afzodan.svg"
                  alt=""
                  className="w-5 h-5 invert dark:invert-0"
                />
              </button>
              <Btn type="button" onClick={() => setAddOpen(false)}>
                بستن
              </Btn>
            </div>
          </form>
        )}

        {/* جدول کاربران */}
        <TableWrap>
          <div className="bg-white text-neutral-900 rounded-2xl border border-neutral-200 overflow-hidden dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
            <table
              className="w-full text-sm text-neutral-900 [&_th]:text-center [&_td]:text-center dark:text-neutral-100"
              dir="rtl"
            >
              <THead>
                <tr className="bg-neutral-100 text-neutral-900 border-y border-neutral-200 dark:bg_WHITE/5 dark:text-neutral-100 dark:border-neutral-700">
                  <TH className="!text-center w-20 !font-semibold !text-neutral-900 dark:!text-neutral-100">
                    #
                  </TH>
                  <TH className="!text-center !font-semibold !text-neutral-900 dark:!text-neutral-100">
                    <div className="flex items-center justify-center gap-2">
                      <span>نام</span>
                      <button
                        type="button"
                        onClick={() => toggleSort("name")}
                        className="rounded-lg px-2 py-1 ring-1 ring-black/15 hover:bg-black/5 dark:ring-neutral-800 dark:hover:bg-white/10"
                        title="مرتب‌سازی نام"
                        aria-label="مرتب‌سازی نام"
                      >
                        {sortKey === "name" && sortDir === "desc" ? (
                          <img
                            src="/images/icons/bozorgbekochik.svg"
                            alt=""
                            className="w-4 h-4 dark:invert"
                          />
                        ) : (
                          <img
                            src="/images/icons/kochikbebozorg.svg"
                            alt=""
                            className="w-4 h-4 dark:invert"
                          />
                        )}
                      </button>
                    </div>
                  </TH>
                  <TH className="!text-center !font-semibold !text-neutral-900 dark:!text-neutral-100">
                    <div className="flex items-center justify-center gap-2">
                      <span>واحد</span>
                      <button
                        type="button"
                        onClick={() => toggleSort("department")}
                        className="rounded-lg px-2 py-1 ring-1 ring-black/15 hover:bg-black/5 dark:ring-neutral-800 dark:hover:bg-white/10"
                        title="مرتب‌سازی واحد"
                        aria-label="مرتب‌سازی واحد"
                      >
                        {sortKey === "department" &&
                        sortDir === "desc" ? (
                          <img
                            src="/images/icons/bozorgbekochik.svg"
                            alt=""
                            className="w-4 h-4 dark:invert"
                          />
                        ) : (
                          <img
                            src="/images/icons/kochikbebozorg.svg"
                            alt=""
                            className="w-4 h-4 dark:invert"
                          />
                        )}
                      </button>
                    </div>
                  </TH>
                  <TH className="!text-center !font-semibold !text-neutral-900 dark:!text-neutral-100">
                    سطح دسترسی‌ها
                  </TH>
                  <TH className="!text-center w-56 !font-semibold !text-neutral-900 dark:!text-neutral-100">
                    اقدامات
                  </TH>
                </tr>
              </THead>

              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {loading ? (
                  <TR>
                    <TD
                      colSpan={5}
                      className="text-center !text-neutral-700 dark:!text-neutral-400 py-4"
                    >
                      در حال بارگذاری...
                    </TD>
                  </TR>
                ) : (sortedList || []).length === 0 ? (
                  <TR>
                    <TD
                      colSpan={5}
                      className="text-center !text-neutral-600 dark:!text-neutral-400 py-4 bg-neutral-50 dark:bg-transparent"
                    >
                      کاربری ثبت نشده است.
                    </TD>
                  </TR>
                ) : (
                  (sortedList || []).map((u, idx) => (
                    <TR
                      key={u.id}
                      className="text-neutral-900 odd:bg-white even:bg-neutral-50 hover:bg-neutral-100 transition-colors
                               dark:text-neutral-100 dark:odd:bg-transparent dark:even:bg_WHITE/5 dark:hover:bg_WHITE/10"
                    >
                      <TD className="px-3 py-3 !text-neutral-900 dark:!text-neutral-100">
                        {idx + 1}
                      </TD>
                      <TD className="px-3 py-3 !text-neutral-900 dark:!text-neutral-100">
                        {u.name || u.username || "—"}
                      </TD>
                      <TD className="px-3 py-3 !text-neutral-900 dark:!text-neutral-100">
                        {u.department || "—"}
                      </TD>
                      <TD className="px-3 py-3 !text-neutral-900 dark:!text-neutral-300">
                        {renderAccessText(u)}
                      </TD>
                      <TD className="px-3 py-3 !text-neutral-900 dark:!text-neutral-100">
                        <div className="inline-flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                          <Btn
                            className="!h-10 !w-10 !rounded-xl !bg-white !text-neutral-900 !ring-1 !ring-neutral-300 hover:!bg-neutral-100
                                       dark:!bg-transparent dark:!ring-neutral-800 dark:hover:!bg-white/10 grid place-items-center"
                            onClick={() => startEdit(u)}
                            aria-label="ویرایش"
                          >
                            <img
                              src="/images/icons/pencil.svg"
                              alt=""
                              className="w-5 h-5 dark:invert"
                            />
                          </Btn>
                          <DangerBtn
                            className="!h-10 !w-10 !rounded-xl !bg-white !text-red-600 !ring-1 !ring-red-500 hover:!bg-red-50
                                       dark:!bg-transparent dark:!text-red-300 dark:!ring-red-400/60 dark:hover:!bg-white/10 grid place-items-center"
                            onClick={() => del(u)}
                            aria-label="حذف"
                          >
                            <img
                              src="/images/icons/hazf.svg"
                              alt=""
                              className="w-5 h-5 dark:invert"
                            />
                          </DangerBtn>
                        </div>
                      </TD>
                    </TR>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TableWrap>
      </Card>

      {/* ===== Edit Modal ===== */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={cancelEdit}
          />
          <div className="relative w-[96%] max-w-3xl rounded-2xl shadow-2xl p-5 bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:ring-1 dark:ring-neutral-800 dark:border-transparent">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-bold">
                ویرایش کاربر
              </h3>
              <button
                onClick={cancelEdit}
                className="px-3 py-1 rounded-xl ring-1 ring-neutral-300 hover:bg-neutral-100 text-neutral-800
                           dark:text-neutral-200 dark:ring-neutral-800 dark:hover:bg_WHITE/10"
              >
                بستن
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4" dir="rtl">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-neutral-700 dark:text-neutral-300">
                  نام
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      name: e.target.value,
                    }))
                  }
                  className="rounded-xl px-3 py-2 bg-white text-neutral-900 placeholder-neutral-400
                             border border-neutral-300 outline-none focus:ring-2 focus:ring-neutral-300
                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-neutral-700 dark:text-neutral-300">
                  واحد
                </label>
                <select
                  className="rounded-xl px-3 py-2 bg-white text-neutral-900 border border-neutral-300 outline-none
                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                  value={form.department}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      department: e.target.value,
                    }))
                  }
                >
                  <option value="">— انتخاب کنید —</option>
                  {(units || []).map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-neutral-700 dark:text-neutral-300 text-left">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      email: e.target.value,
                    }))
                  }
                  className="rounded-xl px-3 py-2 bg-white text-neutral-900 placeholder-neutral-400
                             border border-neutral-300 outline-none text-left focus:ring-2 focus:ring-neutral-300
                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                  dir="ltr"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-neutral-700 dark:text-neutral-300 text-left">
                  Username
                </label>
                <input
                  value={form.username}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      username: e.target.value,
                    }))
                  }
                  className="rounded-xl px-3 py-2 bg-white text-neutral-900 placeholder-neutral-400
                             border border-neutral-300 outline-none text-left focus:ring-2 focus:ring-neutral-300
                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                  dir="ltr"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-neutral-700 dark:text-neutral-300">
                  نوع
                </label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      role: e.target.value,
                    }))
                  }
                  className="rounded-xl px-3 py-2 bg-white text-neutral-900 border border-neutral-300 outline-none
                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-neutral-700 dark:text-neutral-300 text-left">
                  New password (حداکثر ۸)
                </label>
                <input
                  value={form.password}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      password: e.target.value.slice(0, 8),
                    }))
                  }
                  className="rounded-xl px-3 py-2 bg-white text-neutral-900 placeholder-neutral-400
                             border border-neutral-300 outline-none text-left focus:ring-2 focus:ring-neutral-300
                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                  dir="ltr"
                  type="password"
                  maxLength={8}
                />
              </div>
            </div>

            {/* نقش کاربری در ویرایش */}
            <div
              className="mt-5 text-neutral-900 dark:text-neutral-100"
              dir="rtl"
            >
              <div className="font-medium mb-2">نقش کاربری</div>

              <div className="flex flex-wrap gap-2 mb-2">
                {(form.positions || []).map((slug) => (
                  <span
                    key={slug}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full
                                             bg-neutral-100 text-neutral-900 border border-neutral-300
                                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                  >
                    {slugToLabel[slug] || slug}
                    <button
                      type="button"
                      onClick={() => removePositionFromEdit(slug)}
                      className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {(!form.positions ||
                  form.positions.length === 0) && (
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    نقشی انتخاب نشده است
                  </span>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setEditRolesOpen((s) => !s)}
                  className="w-full h-10 text-right rounded-xl px-3 bg-white text-neutral-900 border border-neutral-300 outline-none
                             hover:bg-neutral-50
                             dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800/90"
                >
                  {rolesLoading
                    ? "در حال بارگذاری نقش‌ها…"
                    : "انتخاب از نقش‌های کاربری"}
                </button>

                {editRolesOpen && (
                  <div className="absolute z-20 mt-2 w-full max-h-56 overflow-auto rounded-xl border border-neutral-200 bg-white shadow
                                  text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
                    {roleItems.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
                        نقشی ثبت نشده است.
                      </div>
                    ) : (
                      roleItems.map((r) => (
                        <button
                          type="button"
                          key={r.name}
                          onClick={() => {
                            addPositionToEdit(r.name);
                          }}
                          className={`w-full text-right px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-white/10
                                    ${
                                      (form.positions || []).includes(
                                        r.name
                                      )
                                        ? "bg-neutral-50 dark:bg-white/10"
                                        : ""
                                    }`}
                        >
                          {r.label || r.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* دسترسی‌ها در ویرایش */}
            <div
              className={`mt-5 grid md:grid-cols-2 gap-6 ${
                form.role === "admin"
                  ? "opacity-50 pointer-events-none"
                  : ""
              }`}
              dir="rtl"
            >
              <div className="rounded-xl p-3 border border-neutral-200 bg-white text-neutral-900 dark:ring-1 dark:ring-neutral-800 dark:border-transparent dark:bg-neutral-900 dark:text-neutral-100">
                <div className="font-medium mb-2">بودجه‌بندی</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["budget:projects", "پروژه‌ها"],
                    ["budget:office", "دفتر مرکزی"],
                    ["budget:site", "سایت"],
                    ["budget:finance", "مالی"],
                    ["budget:cash", "نقدی"],
                    ["budget:capex", "سرمایه‌ای"],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 cursor-pointer select-none
                                                ring-1 ring-neutral-300 hover:bg-neutral-100
                                                dark:ring-neutral-800 dark:hover:bg-white/10"
                    >
                      <input
                        type="checkbox"
                        className="accent-neutral-900 dark:accent-neutral-200"
                        checked={has(key)}
                        onChange={() => toggleBudget(key)}
                      />
                      <span className="text-neutral-900 dark:text-neutral-200">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-3 border border-neutral-200 bg-white text-neutral-900 dark:ring-1 dark:ring-neutral-800 dark:border-transparent dark:bg-neutral-900 dark:text-neutral-100">
                <div className="font-medium mb-2">قراردادها</div>
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 rounded-full px-3 py-1 cursor-pointer select-none
                                      ring-1 ring-neutral-300 hover:bg-neutral-100
                                      dark:ring-neutral-800 dark:hover:bg-white/10">
                    <input
                      type="radio"
                      name={`contracts-${editId}`}
                      className="accent-neutral-900 dark:accent-neutral-200"
                      checked={contractsSel === "contracts:all"}
                      onChange={() => setContracts("contracts:all")}
                    />
                    <span className="text-neutral-900 dark:text-neutral-200">
                      همه اطلاعات
                    </span>
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-full px-3 py-1 cursor-pointer select-none
                                      ring-1 ring-neutral-300 hover:bg-neutral-100
                                      dark:ring-neutral-800 dark:hover:bg-white/10">
                    <input
                      type="radio"
                      name={`contracts-${editId}`}
                      className="accent-neutral-900 dark:accent-neutral-200"
                      checked={
                        contractsSel === "contracts:nonfinancial"
                      }
                      onChange={() =>
                        setContracts("contracts:nonfinancial")
                      }
                    />
                    <span className="text-neutral-900 dark:text-neutral-200">
                      صرفاً اطلاعات غیرمالی
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <Btn onClick={cancelEdit}>انصراف</Btn>
              <PrimaryBtn
                onClick={saveEdit}
                className="!bg-neutral-900 !text-white dark:!bg-white dark:!text-neutral-900"
              >
                ذخیره
              </PrimaryBtn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default UsersPage;
