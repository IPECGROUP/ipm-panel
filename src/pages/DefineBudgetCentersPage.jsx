// تعریف مراکز بودجه

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";

const ALL_TABS = [
  { id: "office", label: "دفتر مرکزی", prefix: "OB" },
  { id: "site", label: "سایت", prefix: "SB" },
  { id: "finance", label: "مالی", prefix: "FB" },
  { id: "cash", label: "نقدی", prefix: "CB" },
  { id: "capex", label: "سرمایه‌ای", prefix: "IB" },
  { id: "projects", label: "پروژه‌ها", prefix: "" },
];

function DefineBudgetCentersPage() {
  const { user } = useAuth();
  const PAGE_KEY = "DefineBudgetCentersPage";
  const API_BASE = (window.API_URL || "/api").replace(/\/+$/, "");

  async function api(path, opt = {}) {
    const res = await fetch(API_BASE + path, {
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
  }

  // ===== me از سرور (مثل BudgetAllocationPage) =====
  const [me, setMe] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api("/auth/me");
        if (!alive) return;
        setMe(r?.user || r || null);
      } catch {
        if (!alive) return;
        setMe({ role: "guest", access_labels: [] });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const isAllAccess = useMemo(() => {
    if (!me) return false;
    if (String(me.role || "").toLowerCase() === "admin") return true;

    let labels = [];
    if (Array.isArray(me?.access_labels)) labels = me.access_labels;
    else if (typeof me?.access_labels === "string") {
      try {
        const j = JSON.parse(me.access_labels);
        if (Array.isArray(j)) labels = j;
      } catch {}
    }
    return labels.includes("all");
  }, [me]);

  // ===== تب‌های مجاز از /access/my (null یعنی ALL) =====
  const [accessLoaded, setAccessLoaded] = useState(false);
  const [allowedTabs, setAllowedTabs] = useState(null); // null=loading | []=none | [..ids]

  useEffect(() => {
    if (!me) return;

    let alive = true;
    (async () => {
      try {
        if (isAllAccess) {
          const all = ALL_TABS.map((t) => t.id);
          if (!alive) return;
          setAllowedTabs(all);
          return;
        }

        let tabsAllowed = null;

        try {
          const r = await api("/access/my");
          const raw = r?.pages?.[PAGE_KEY];

          if (raw === null) tabsAllowed = ALL_TABS.map((t) => t.id);
          else if (Array.isArray(raw)) tabsAllowed = raw.map(String);
          else if (r?.ok === true && r?.pages && (PAGE_KEY in r.pages) && raw == null)
            tabsAllowed = ALL_TABS.map((t) => t.id);
          else if (r?.ok === true && (!r?.pages || !(PAGE_KEY in r.pages)))
            tabsAllowed = ALL_TABS.map((t) => t.id);
        } catch {
          tabsAllowed = null;
        }

        if (!alive) return;

        const allIds = ALL_TABS.map((t) => t.id);
        const finalTabs = Array.isArray(tabsAllowed)
          ? tabsAllowed.filter((x) => allIds.includes(x))
          : allIds;

        setAllowedTabs(finalTabs);
      } catch {
        if (!alive) return;
        setAllowedTabs(ALL_TABS.map((t) => t.id));
      } finally {
        if (!alive) return;
        setAccessLoaded(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [me, isAllAccess]);

  const canAccessPage = useMemo(() => {
    if (!me) return null;
    if (allowedTabs === null) return null;
    return (allowedTabs || []).length > 0;
  }, [me, allowedTabs]);

  const tabs = useMemo(() => {
    if (!allowedTabs) return [];
    return ALL_TABS.filter((t) => allowedTabs.includes(t.id));
  }, [allowedTabs]);

  const prefixOf = (kind) => tabs.find((t) => t.id === kind)?.prefix || "";
  const visualPrefix = (kind) => (kind === "projects" ? "PB-" : (prefixOf(kind) ? prefixOf(kind) + "-" : ""));

  // active را بعد از آماده شدن تب‌ها تنظیم کن
  const [active, setActive] = useState("");
  useEffect(() => {
    if (!tabs.length) return;
    if (!active || !tabs.some((t) => t.id === active)) {
      setActive(tabs[0].id);
    }
  }, [tabs, active]);

  // ===== helpers =====
  const toEnDigits = (s = "") =>
    String(s)
      .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
      .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

  const onlyDigitsDot = (s = "") => toEnDigits(s).replace(/[^0-9.]/g, "");

  const canonForCompare = (kind, rawSuffix) => {
    if (kind === "projects") {
      const en = toEnDigits(String(rawSuffix || "")).replace(/[^0-9.]/g, "");
      const segments = en.split(".").filter(Boolean);
      if (segments.length === 0) return "";
      return segments
        .map((x) => {
          const n = parseInt(x, 10);
          return isNaN(n) ? x : String(n);
        })
        .join(".");
    }
    const pref = prefixOf(kind);
    let s = String(rawSuffix || "").toUpperCase().trim();
    if (pref) {
      const re = new RegExp("^" + pref + "[\\-\\.]?", "i");
      s = s.replace(re, "");
    }
    return toEnDigits(s).replace(/[^\d]/g, "");
  };

  // ===== projects =====
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");

  const normalizeProject = (p) => {
    const code =
      p?.code ??
      p?.project_code ??
      p?.projectCode ??
      p?.projectNo ??
      p?.project_no ??
      p?.suffix ??
      "";
    const name =
      p?.name ??
      p?.project_name ??
      p?.projectName ??
      p?.description ??
      p?.title ??
      p?.label ??
      "";
    return {
      ...p,
      id: p?.id,
      code: code == null ? "" : String(code),
      name: name == null ? "" : String(name),
    };
  };

  useEffect(() => {
    if (canAccessPage !== true) return;
    let alive = true;
    (async () => {
      try {
        const r = await api("/projects");
        if (!alive) return;

        const raw = Array.isArray(r)
          ? r
          : Array.isArray(r?.items)
          ? r.items
          : Array.isArray(r?.projects)
          ? r.projects
          : Array.isArray(r?.data)
          ? r.data
          : [];

        const list = (raw || [])
          .map(normalizeProject)
          .filter((x) => x && x.id != null && String(x.code || "").trim());

        setProjects(list);
      } catch {
        if (!alive) return;
        setProjects([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [canAccessPage]);

  const sortedProjects = useMemo(() => {
    return (projects || [])
      .slice()
      .sort((a, b) =>
        String(a.code || "").localeCompare(String(b.code || ""), "fa", {
          numeric: true,
          sensitivity: "base",
        })
      );
  }, [projects]);

  const selectedProject = useMemo(
    () => (projects || []).find((p) => String(p.id) === String(projectId)),
    [projects, projectId]
  );

  // وقتی تب عوض شد، پروژه را ریست کن
  useEffect(() => {
    if (active !== "projects") setProjectId("");
  }, [active]);

  // ===== centers list =====
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newSuffix, setNewSuffix] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [editId, setEditId] = useState(null);
  const [editSuffix, setEditSuffix] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const [openCodes, setOpenCodes] = useState({});

  const codeTextOf = useCallback(
    (kind, suffix) => {
      if (kind === "projects") return "PB-" + String(suffix || "");
      const pref = prefixOf(kind);
      const raw = String(suffix || "").trim();
      let normalized = raw;
      const re = new RegExp("^" + pref + "[\\-\\.]?", "i");
      if (pref && re.test(raw)) normalized = raw.replace(re, "").replace(/^[-.]/, "");
      return (pref ? pref + "-" : "") + normalized;
    },
    [tabs]
  );

  const getSuffixPlain = useCallback(
    (r) => {
      if (active === "projects") {
        const base = String(selectedProject?.code || "").trim();
        const raw = String(r.suffix || "").trim();
        if (!base) return raw;
        if (raw === base) return "";
        if (raw.startsWith(base + ".")) return raw.slice((base + ".").length);
        return raw;
      }
      return String(r.suffix || "").trim();
    },
    [active, selectedProject]
  );

  const loadCenters = async (kind) => {
    if (!kind) {
      setRows([]);
      return;
    }
    setLoading(true);
    setErr("");

    try {
      let items = [];

      if (kind === "projects") {
        if (!projectId) {
          setRows([]);
          return;
        }
        const list = await api("/centers/projects").catch(() => ({ items: [] }));
        const base = String(selectedProject?.code || "").trim();

        items = (list.items || []).filter((it) => {
          const suf = String(it.suffix || "").trim();
          return base ? (suf === base || suf.startsWith(base + ".")) : true;
        });
      } else {
        const r = await api(`/centers/${kind}`);
        items = r.items || [];
      }

      const sorted = items
        .slice()
        .sort((a, b) =>
          String(codeTextOf(kind, a.suffix)).localeCompare(
            String(codeTextOf(kind, b.suffix)),
            "fa",
            { numeric: true, sensitivity: "base" }
          )
        );

      setRows(sorted);
    } catch (e) {
      setErr(e.message || "خطا در دریافت لیست");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setErr("");
    setNewSuffix("");
    setNewDesc("");
    setEditId(null);
    setEditSuffix("");
    setEditDesc("");
    if (active) loadCenters(active);
  }, [active]);

  useEffect(() => {
    if (active === "projects") loadCenters(active);
  }, [projectId]);

  useEffect(() => {
    setOpenCodes({});
  }, [active, projectId]);

  const addRow = async () => {
    setErr("");
    if (!active) return;

    if (active === "projects" && !projectId) {
      setErr("ابتدا کد پروژه را انتخاب کنید.");
      return;
    }

    const desc = (newDesc || "").trim();
    const suffixRaw = onlyDigitsDot(newSuffix || "");

    let suffixToSend = "";
    if (active === "projects") {
      const base = String(selectedProject?.code || "").trim();
      suffixToSend = suffixRaw ? `${base}.${suffixRaw}` : base;
    } else {
      if (!suffixRaw) {
        setErr("کد بودجه را وارد کنید.");
        return;
      }
      suffixToSend = suffixRaw;
    }

    const newCanon = canonForCompare(active, suffixToSend);
    const dup = (rows || []).some((r) => canonForCompare(active, r.suffix) === newCanon);
    if (dup) {
      setErr("این کد بودجه قبلاً ثبت شده است.");
      return;
    }

    setSaving(true);
    try {
      await api(`/centers/${active}`, {
        method: "POST",
        body: JSON.stringify({ suffix: suffixToSend, description: desc }),
      });
      setNewSuffix("");
      setNewDesc("");
      await loadCenters(active);
    } catch (ex) {
      setErr(ex.message || "خطا در ثبت");
    } finally {
      setSaving(false);
    }
  };

  const prefillFromRow = (r) => {
    const part = getSuffixPlain(r);
    setNewSuffix(onlyDigitsDot(part));
  };

  const beginEdit = (r) => {
    setEditId(r.id);
    const part = getSuffixPlain(r);
    setEditSuffix(onlyDigitsDot(part));
    setEditDesc(String(r.description || ""));
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditSuffix("");
    setEditDesc("");
  };

  const saveEdit = async () => {
    if (!editId) return;

    if (active === "projects" && !projectId) {
      setErr("ابتدا کد پروژه را انتخاب کنید.");
      return;
    }

    const desc = (editDesc || "").trim();
    const sufRaw = onlyDigitsDot(editSuffix || "");

    let suffixToSend = "";
    if (active === "projects") {
      const base = String(selectedProject?.code || "").trim();
      suffixToSend = sufRaw ? `${base}.${sufRaw}` : base;
    } else {
      if (!sufRaw) {
        setErr("کد بودجه را وارد کنید.");
        return;
      }
      suffixToSend = sufRaw;
    }

    const newCanon = canonForCompare(active, suffixToSend);
    const dup = (rows || []).some((r) => {
      if (r.id === editId) return false;
      return canonForCompare(active, r.suffix) === newCanon;
    });
    if (dup) {
      setErr("این کد بودجه قبلاً ثبت شده است.");
      return;
    }

    setSaving(true);
    setErr("");
    try {
      await api(`/centers/${active}/${editId}`, {
        method: "PATCH",
        body: JSON.stringify({ suffix: suffixToSend, description: desc }),
      });
      cancelEdit();
      await loadCenters(active);
    } catch (ex) {
      setErr(ex.message || "خطا در ویرایش");
    } finally {
      setSaving(false);
    }
  };

  const displayRows = useMemo(() => {
    const baseList = rows || [];
    if (!baseList.length) return [];

    const nodes = baseList.map((r) => {
      const suffixPlain = getSuffixPlain(r);
      const parts = suffixPlain ? suffixPlain.split(".").filter(Boolean) : [];
      const key = suffixPlain;
      let parentKey = null;
      if (parts.length > 1) parentKey = parts.slice(0, -1).join(".");
      return { row: r, key, parentKey, suffixPlain, parts };
    });

    const byKey = new Map();
    nodes.forEach((n) => byKey.set(n.key, n));

    const childrenMap = new Map();
    nodes.forEach((n) => {
      if (n.parentKey == null) return;
      if (!byKey.has(n.parentKey)) return;
      if (!childrenMap.has(n.parentKey)) childrenMap.set(n.parentKey, []);
      childrenMap.get(n.parentKey).push(n);
    });

    nodes.forEach((n) => (n.hasChildren = childrenMap.has(n.key)));

    const sortFn = (a, b) => {
      const ca = codeTextOf(active, a.row.suffix);
      const cb = codeTextOf(active, b.row.suffix);
      return String(ca || "").localeCompare(String(cb || ""), "fa", {
        numeric: true,
        sensitivity: "base",
      });
    };

    const roots = nodes.filter((n) => n.parentKey == null || !byKey.has(n.parentKey));
    roots.sort(sortFn);
    for (const list of childrenMap.values()) list.sort(sortFn);

    const result = [];
    const visit = (node, depth) => {
      result.push({ ...node, depth });
      if (!node.hasChildren) return;
      if (!openCodes[node.key]) return;
      const children = childrenMap.get(node.key) || [];
      children.forEach((child) => visit(child, depth + 1));
    };

    roots.forEach((root) => visit(root, 0));
    return result;
  }, [rows, active, getSuffixPlain, openCodes, codeTextOf]);

  const del = async (r) => {
    if (!confirm("حذف این ردیف؟")) return;
    try {
      await api(`/centers/${active}/${r.id}`, { method: "DELETE" });
      await loadCenters(active);
    } catch (ex) {
      alert(ex.message || "خطا در حذف");
    }
  };

  // ===== UI states =====
  if (!me || !accessLoaded || canAccessPage === null) {
    return (
      <>
        <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
          <div className="mb-4 text-base md:text-lg">
            <span className="text-neutral-700 dark:text-neutral-300">بودجه‌بندی</span>
            <span className="mx-2 text-neutral-500 dark:text-neutral-400">›</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              تعریف مراکز بودجه
            </span>
          </div>
          <div className="p-6 text-center text-neutral-600 dark:text-neutral-400">
            در حال بررسی دسترسی…
          </div>
        </Card>
      </>
    );
  }

  if (canAccessPage === false || tabs.length === 0) {
    return (
      <>
        <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
          <div className="mb-4 text-base md:text-lg">
            <span className="text-neutral-700 dark:text-neutral-300">بودجه‌بندی</span>
            <span className="mx-2 text-neutral-500 dark:text-neutral-400">›</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              تعریف مراکز بودجه
            </span>
          </div>
          <div className="p-6 rounded-2xl ring-1 ring-neutral-200 bg-white text-center text-red-600 dark:bg-neutral-900 dark:ring-neutral-800 dark:text-red-400">
            شما سطح دسترسی لازم را ندارید.
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        <div className="mb-4 text-base md:text-lg">
          <span className="text-neutral-700 dark:text-neutral-300">بودجه‌بندی</span>
          <span className="mx-2 text-neutral-500 dark:text-neutral-400">›</span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            تعریف مراکز بودجه
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`h-10 px-4 rounded-2xl text-sm shadow-sm transition border
                ${
                  active === t.id
                    ? "bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-100"
                    : "bg-white text-neutral-900 border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {active === "projects" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-neutral-700 dark:text-neutral-300">کد پروژه</label>
              <select
                className="w-full rounded-xl px-3 py-2 ltr font-[inherit]
                           bg-white text-neutral-900 border border-neutral-200 outline-none
                           dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option className="bg-white dark:bg-neutral-900" value="">
                  انتخاب کنید
                </option>
                {(sortedProjects || []).map((p) => (
                  <option className="bg-white dark:bg-neutral-900" key={p.id} value={p.id}>
                    {p.code ? p.code : "—"}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-neutral-700 dark:text-neutral-300">نام پروژه</label>
              <input
                className="w-full rounded-xl px-3 py-2
                           bg-white text-neutral-900 border border-neutral-200 outline-none placeholder:text-neutral-400
                           dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                value={selectedProject?.name || ""}
                readOnly
                placeholder="پس از انتخاب کد پروژه پر می‌شود"
              />
            </div>
          </div>
        )}

        <div
          className="rounded-2xl ring-1 ring-neutral-200 border border-neutral-200 p-4 mb-4 bg-white
                     dark:bg-neutral-900 dark:ring-neutral-800 dark:border-neutral-800"
          dir="rtl"
        >
          <form
            className="flex flex-col md:flex-row-reverse md:items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              addRow();
            }}
          >
            <div className="md:w-auto">
              <button
                type="submit"
                disabled={saving || (active === "projects" && !projectId)}
                className="h-10 w-12 grid place-items-center rounded-xl bg-neutral-900 text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
                title={active === "projects" && !projectId ? "ابتدا کد پروژه را انتخاب کنید" : "افزودن"}
                aria-label="افزودن"
              >
                <img src="/images/icons/afzodan.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
              </button>
            </div>

            <div className="flex-1 min-w-[260px] flex flex-col gap-1">
              <label className="text-sm text-neutral-700 dark:text-neutral-300">شرح بودجه</label>
              <input
                className="w-full rounded-2xl px-3 py-2 text-center
                           bg-white text-neutral-900 border border-neutral-200 outline-none placeholder:text-neutral-400
                           dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="شرح…"
              />
            </div>

            <div className="w-[260px] flex flex-col gap-1">
              <label className="text-sm text-neutral-700 dark:text-neutral-300">کد بودجه</label>

              {active !== "projects" && (
                <div className="w-full flex items-center rounded-xl overflow-hidden bg-white text-neutral-900 ltr border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700">
                  <span className="px-3 py-2 font-mono select-none bg-neutral-100 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
                    {visualPrefix(active)}
                  </span>
                  <input
                    className="flex-1 px-3 py-2 font-mono outline-none bg-transparent placeholder:text-neutral-400 text-center"
                    value={newSuffix}
                    onChange={(e) => setNewSuffix(onlyDigitsDot(e.target.value))}
                    spellCheck={false}
                  />
                </div>
              )}

              {active === "projects" && (
                <div className="w-full flex items-center rounded-xl overflow-hidden bg-white text-neutral-900 ltr border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700">
                  <span className="px-3 py-2 font-mono select-none bg-neutral-100 ring-1 ring-neutral-200 text-xs md:text-sm whitespace-nowrap dark:bg-neutral-900 dark:ring-neutral-800">
                    {"PB-"}
                    {selectedProject?.code || ""}
                    {selectedProject ? "." : ""}
                  </span>
                  <input
                    className="flex-1 px-3 py-2 font-mono outline-none bg-transparent text-center text-sm md:text-base placeholder:text-neutral-400"
                    value={newSuffix}
                    onChange={(e) => setNewSuffix(onlyDigitsDot(e.target.value))}
                    spellCheck={false}
                  />
                </div>
              )}
            </div>
          </form>

          {err && <div className="text-sm text-red-600 dark:text-red-400 mt-2 text-center">{err}</div>}
        </div>

        <TableWrap>
          <div
            className="bg-white text-neutral-900 rounded-2xl ring-1 ring-neutral-200 border border-neutral-200 overflow-hidden
                       dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-800 dark:border-neutral-800
                       [&_th]:text-neutral-900 [&_td]:text-neutral-900
                       dark:[&_th]:text-neutral-100 dark:[&_td]:text-neutral-100"
          >
            <table className="w-full text-[13px] md:text-sm text-center [&_th]:text-center [&_td]:text-center" dir="rtl">
              <THead>
                <tr className="bg-neutral-100 text-neutral-900 border-b border-neutral-200 sticky top-0 z-10 dark:bg-white/5 dark:text-neutral-100 dark:border-neutral-700">
                  <TH className="!text-center !font-semibold !py-2 w-20">#</TH>
                  <TH className="!text-center !font-semibold !py-2 w-56">کد بودجه</TH>
                  <TH className="!text-center !font-semibold !py-2">شرح</TH>
                  <TH className="!text-center !font-semibold !py-2 w-40">اقدامات</TH>
                </tr>
              </THead>

              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {loading ? (
                  <TR>
                    <TD colSpan={4} className="text-center text-neutral-700 dark:text-neutral-400 py-3">
                      در حال بارگذاری…
                    </TD>
                  </TR>
                ) : (displayRows || []).length === 0 ? (
                  <TR>
                    <TD colSpan={4} className="text-center text-neutral-700 py-3 bg-neutral-50 dark:text-neutral-400 dark:bg-transparent">
                      {active === "projects" && !projectId ? "ابتدا کد پروژه را انتخاب کنید" : "موردی ثبت نشده."}
                    </TD>
                  </TR>
                ) : (
                  (displayRows || []).map((node, idx) => {
                    const r = node.row;
                    const level = node.depth || 0;
                    const hasChildren = !!node.hasChildren;
                    const codeText = codeTextOf(active, r.suffix);
                    const isEditing = editId === r.id;
                    const isOpen = !!openCodes[node.key];

                    return (
                      <TR
                        key={r.id}
                        className="border-t border-neutral-200 odd:bg-neutral-50 even:bg-neutral-100/70 hover:bg-neutral-200/40 transition-colors
                                   dark:border-neutral-800 dark:odd:bg-transparent dark:even:bg-white/5 dark:hover:bg-white/10"
                      >
                        <TD className="px-2.5 py-2">{idx + 1}</TD>

                        <TD className="px-2.5 py-2 font-mono ltr text-center" style={{ paddingRight: level * 12 }}>
                          {isEditing ? (
                            <input
                              className="w-full max-w-[220px] rounded-xl px-2 py-1.5 bg-white text-neutral-900 font-mono ltr text-center border border-neutral-300 outline-none placeholder:text-neutral-400 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                              value={editSuffix}
                              onChange={(e) => setEditSuffix(onlyDigitsDot(e.target.value))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  saveEdit();
                                }
                              }}
                              spellCheck={false}
                            />
                          ) : (
                            <div className="inline-flex items-center justify-center gap-1">
                              {hasChildren && (
                                <button
                                  type="button"
                                  onClick={() => setOpenCodes((prev) => ({ ...prev, [node.key]: !isOpen }))}
                                  className="w-5 h-5 grid place-items-center rounded-full border border-neutral-300 text-xs bg-white dark:bg-neutral-800 dark:border-neutral-600"
                                  aria-label={isOpen ? "بستن زیرمجموعه" : "باز کردن زیرمجموعه"}
                                >
                                  {isOpen ? "−" : "+"}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => prefillFromRow(r)}
                                className="px-1 py-0.5 hover:underline"
                                title="قرار دادن این کد در فیلد کد بودجه"
                              >
                                {codeText}
                              </button>
                            </div>
                          )}
                        </TD>

                        <TD className="px-2.5 py-2 text-center">
                          {isEditing ? (
                            <input
                              className="w-full max-w-md rounded-xl px-2 py-1.5 bg-white text-neutral-900 text-center border border-neutral-300 outline-none placeholder:text-neutral-400 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  saveEdit();
                                }
                              }}
                            />
                          ) : (
                            r.description || "—"
                          )}
                        </TD>

                        <TD className="px-2.5 py-2 text-center">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={saveEdit}
                                className="h-9 w-11 grid place-items-center rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                                aria-label="ذخیره"
                                title="ذخیره"
                              >
                                <img src="/images/icons/check.svg" alt="" className="w-4 h-4 invert dark:invert-0" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="h-9 w-11 grid place-items-center rounded-xl ring-1 ring-neutral-200 text-neutral-900 hover:bg-neutral-50 transition dark:ring-neutral-800 dark:text-neutral-100 dark:hover:bg-white/10"
                                aria-label="انصراف"
                                title="انصراف"
                              >
                                <img src="/images/icons/hazf.svg" alt="" className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => beginEdit(r)}
                                className="h-9 w-11 grid place-items-center rounded-xl ring-1 ring-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 transition dark:bg-transparent dark:ring-neutral-800 dark:text-neutral-100 dark:hover:bg-white/10"
                                aria-label="ویرایش"
                                title="ویرایش"
                              >
                                <img src="/images/icons/pencil.svg" alt="" className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => del(r)}
                                className="h-9 w-11 grid place-items-center rounded-xl ring-1 ring-red-400 bg-white text-red-600 hover:bg-neutral-50 transition dark:bg-transparent dark:ring-red-500 dark:text-red-400 dark:hover:bg-white/10"
                                aria-label="حذف"
                                title="حذف"
                              >
                                <img
                                  src="/images/icons/hazf.svg"
                                  alt=""
                                  className="w-4 h-4"
                                  style={{
                                    filter:
                                      "invert(18%) sepia(93%) saturate(7494%) hue-rotate(2deg) brightness(96%) contrast(110%)",
                                  }}
                                />
                              </button>
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
      </Card>
    </>
  );
}

export default DefineBudgetCentersPage;
