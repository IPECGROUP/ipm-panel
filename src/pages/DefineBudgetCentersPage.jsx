// src/pages/DefineBudgetCentersPage.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";
import { usePageAccess } from "../hooks/usePageAccess";

const PAGE_KEY = "DefineBudgetCentersPage";

const ALL_TABS = [
  { id: "office", label: "دفتر مرکزی", prefix: "OB" },
  { id: "site", label: "سایت", prefix: "SB" },
  { id: "finance", label: "مالی", prefix: "FB" },
  { id: "cash", label: "نقدی", prefix: "CB" },
  { id: "capex", label: "سرمایه‌ای", prefix: "IB" },
  { id: "projects", label: "پروژه‌ها", prefix: "" },
];

function DefineBudgetCentersPage() {
  const API_BASE = useMemo(() => (window.API_URL || "/api").replace(/\/+$/, ""), []);

  const api = useCallback(
    async (path, opt = {}) => {
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
      } catch {
        data = { _raw: txt };
      }

      if (!res.ok) {
        const msg =
          data?.error ||
          data?.message ||
          (typeof txt === "string" && txt.includes("<!DOCTYPE") ? "api_returned_html" : "request_failed");
        const e = new Error(msg);
        e.status = res.status;
        e.url = res.url;
        e.raw = txt;
        throw e;
      }
      return data;
    },
    [API_BASE]
  );

  const { me, loading: accessLoading, canAccessPage, allowedTabs } = usePageAccess(PAGE_KEY, ALL_TABS);

  const allowedTabsSet = useMemo(() => {
    if (allowedTabs == null) return null;
    if (allowedTabs instanceof Set) return new Set([...allowedTabs].map((x) => String(x)));
    if (Array.isArray(allowedTabs)) return new Set(allowedTabs.map((x) => String(x)));
    if (typeof allowedTabs === "object") {
      return new Set(Object.keys(allowedTabs).filter((k) => allowedTabs[k]).map((k) => String(k)));
    }
    return null;
  }, [allowedTabs]);

  const tabs = useMemo(() => {
    if (allowedTabsSet === null) return ALL_TABS;
    return ALL_TABS.filter((t) => allowedTabsSet.has(String(t.id)));
  }, [allowedTabsSet]);

  const prefixOf = useCallback((kind) => tabs.find((t) => t.id === kind)?.prefix || "", [tabs]);

  const visualPrefix = useCallback(
    (kind) => (kind === "projects" ? "PB-" : prefixOf(kind) ? prefixOf(kind) + "-" : ""),
    [prefixOf]
  );

  const toEnDigits = (s = "") =>
    String(s)
      .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
      .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

  const onlyDigitsDot = (s = "") => toEnDigits(s).replace(/[^0-9.]/g, "");

  const canonForCompare = useCallback(
    (kind, rawSuffix) => {
      const onlyDigits = (txt) => {
        const en = toEnDigits(txt);
        return en.replace(/[^\d]/g, "");
      };

      if (kind === "projects") {
        const en = toEnDigits(String(rawSuffix || "")).replace(/[^0-9.]/g, "");
        const segments = en.split(".").filter(Boolean);
        if (segments.length === 0) return "";
        return segments
          .map((s) => {
            const n = parseInt(s, 10);
            return isNaN(n) ? s : String(n);
          })
          .join(".");
      }

      const pref = prefixOf(kind);
      let s = String(rawSuffix || "").toUpperCase().trim();
      if (pref) {
        const re = new RegExp("^" + pref + "[\\-\\.]?", "i");
        s = s.replace(re, "");
      }
      return onlyDigits(s);
    },
    [prefixOf]
  );

  const [active, setActive] = useState(null);

  useEffect(() => {
    if (!tabs.length) return;
    if (!active || !tabs.some((t) => t.id === active)) {
      setActive(tabs[0].id);
    }
  }, [tabs, active]);

  const canAccessActiveTab = useMemo(() => {
    if (!active) return false;
    if (allowedTabsSet === null) return true;
    return allowedTabsSet.has(String(active));
  }, [active, allowedTabsSet]);

  const extractArray = useCallback((r) => {
    if (!r) return [];
    if (Array.isArray(r)) return r;
    if (Array.isArray(r.items)) return r.items;
    if (Array.isArray(r.projects)) return r.projects;
    if (Array.isArray(r.data)) return r.data;
    if (Array.isArray(r.rows)) return r.rows;
    if (Array.isArray(r.result)) return r.result;
    if (r?.data && Array.isArray(r.data.items)) return r.data.items;
    if (r?.data && Array.isArray(r.data.projects)) return r.data.projects;
    return [];
  }, []);

  const normalizeProject = useCallback((p, idx = 0) => {
    const code =
      p?.code ??
      p?.project_code ??
      p?.projectCode ??
      p?.projectCodeText ??
      p?.project_no ??
      p?.projectNo ??
      p?.suffix ??
      p?.project_suffix ??
      "";

    const name =
      p?.name ??
      p?.project_name ??
      p?.projectName ??
      p?.description ??
      p?.title ??
      p?.label ??
      "";

    const id =
      p?.id ??
      p?.project_id ??
      p?.projectId ??
      p?.pid ??
      p?.ProjectID ??
      (code != null && String(code).trim() ? String(code).trim() : idx + 1);

    return {
      ...p,
      id,
      code: code == null ? "" : String(code).trim(),
      name: name == null ? "" : String(name).trim(),
    };
  }, []);

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [projectsLoading, setProjectsLoading] = useState(false);

  const selectedProject = useMemo(
    () => (projects || []).find((p) => String(p.id) === String(projectId)),
    [projects, projectId]
  );

  useEffect(() => {
    if (canAccessPage !== true) return;
    if (allowedTabsSet !== null && !allowedTabsSet.has("projects")) return;

    let alive = true;
    (async () => {
      setProjectsLoading(true);
      try {
        const candidates = ["/projects", "/projects/list", "/projects/all", "/meta/projects"];
        let raw = [];
        for (const path of candidates) {
          try {
            const r = await api(path);
            raw = extractArray(r);
            if (raw.length) break;
          } catch (e) {
            if (e?.status === 404) continue;
            if (e?.status === 401 || e?.status === 403) break;
          }
        }

        let list = (raw || [])
          .map((x, i) => normalizeProject(x, i))
          .filter((x) => x && x.id != null && String(x.code || "").trim());

        if (!list.length) {
          try {
            const c = await api("/centers/projects");
            const items = extractArray(c);
            const bases = new Map();
            (items || []).forEach((it) => {
              const suf = String(it?.suffix || "").trim();
              if (!suf) return;
              const base = suf.split(".")[0];
              if (!base) return;
              if (!bases.has(base)) bases.set(base, { id: base, code: base, name: "" });
            });
            list = Array.from(bases.values());
          } catch {}
        }

        if (!alive) return;
        setProjects(list);
      } catch {
        if (!alive) return;
        setProjects([]);
      } finally {
        if (!alive) return;
        setProjectsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [canAccessPage, allowedTabsSet, api, extractArray, normalizeProject]);

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
    [prefixOf]
  );

  const requestSeqRef = useRef(0);

  const loadCenters = useCallback(
    async (kind) => {
      if (!kind) {
        setRows([]);
        return;
      }

      const seq = ++requestSeqRef.current;

      setLoading(true);
      setErr("");
      try {
        let items = [];
        if (kind === "projects") {
          if (!projectId) {
            if (seq === requestSeqRef.current) setRows([]);
            return;
          }
          const list = await api("/centers/projects").catch(() => ({ items: [] }));
          const base = String(selectedProject?.code || "").trim();
          items = (list.items || []).filter((it) => {
            const suf = String(it.suffix || "").trim();
            return suf === base || suf.startsWith(base + ".");
          });
        } else {
          const r = await api(`/centers/${kind}`);
          items = r.items || [];
        }

        const sorted = items.slice().sort((a, b) =>
          String(codeTextOf(kind, a.suffix)).localeCompare(String(codeTextOf(kind, b.suffix)), "fa", {
            numeric: true,
            sensitivity: "base",
          })
        );

        if (seq !== requestSeqRef.current) return;
        setRows(sorted);
      } catch (e) {
        if (seq !== requestSeqRef.current) return;
        setErr(e.message || "خطا در دریافت لیست");
        setRows([]);
      } finally {
        if (seq !== requestSeqRef.current) return;
        setLoading(false);
      }
    },
    [api, projectId, selectedProject, codeTextOf]
  );

  useEffect(() => {
    setErr("");
    setNewSuffix("");
    setNewDesc("");
    setEditId(null);
    setEditSuffix("");
    setEditDesc("");
    if (active && active !== "projects") setProjectId("");
    if (active && canAccessPage === true && canAccessActiveTab) loadCenters(active);
  }, [active, canAccessPage, canAccessActiveTab, loadCenters]);

  useEffect(() => {
    if (!active) return;
    if (active === "projects" && canAccessPage === true && canAccessActiveTab) loadCenters(active);
  }, [projectId, active, canAccessPage, canAccessActiveTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setOpenCodes({});
  }, [active, projectId]);

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

  const addRow = async () => {
    setErr("");
    if (!active) return;
    if (active === "projects" && !projectId) {
      setErr("ابتدا کد پروژه را انتخاب کنید.");
      return;
    }

    const desc = (newDesc || "").trim();
    const suffixRaw = onlyDigitsDot(newSuffix || "");

    if (!suffixRaw && active !== "projects") {
      setErr("کد بودجه را وارد کنید.");
      return;
    }

    let suffixToSend = "";
    if (active === "projects") {
      const base = String(selectedProject?.code || "").trim();
      suffixToSend = suffixRaw ? `${base}.${suffixRaw}` : base;
    } else {
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

  const beginEdit = (r) => {
    setEditId(r.id);
    setEditSuffix(onlyDigitsDot(getSuffixPlain(r)));
    setEditDesc(String(r.description || ""));
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditSuffix("");
    setEditDesc("");
  };

  const saveEdit = async () => {
    if (!editId) return;

    const desc = (editDesc || "").trim();
    const sufRaw = onlyDigitsDot(editSuffix || "");

    let suffixToSend = "";
    if (active === "projects") {
      const base = String(selectedProject?.code || "").trim();
      suffixToSend = sufRaw ? `${base}.${sufRaw}` : base;
    } else {
      suffixToSend = sufRaw;
    }

    const newCanon = canonForCompare(active, suffixToSend);
    const dup = (rows || []).some((r) => r.id !== editId && canonForCompare(active, r.suffix) === newCanon);
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

  const del = async (r) => {
    if (!confirm("حذف این ردیف؟")) return;
    try {
      await api(`/centers/${active}/${r.id}`, { method: "DELETE" });
      await loadCenters(active);
    } catch (ex) {
      alert(ex.message || "خطا در حذف");
    }
  };

  const displayRows = useMemo(() => {
    const baseList = rows || [];
    if (!baseList.length) return [];

    const nodes = baseList.map((r) => {
      const suffixPlain = getSuffixPlain(r);
      const parts = suffixPlain ? suffixPlain.split(".").filter(Boolean) : [];
      const key = suffixPlain;
      const parentKey = parts.length > 1 ? parts.slice(0, -1).join(".") : null;
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

    nodes.forEach((n) => {
      n.hasChildren = childrenMap.has(n.key);
    });

    const sortFn = (a, b) => {
      const ca = codeTextOf(active, a.row.suffix);
      const cb = codeTextOf(active, b.row.suffix);
      return String(ca || "").localeCompare(String(cb || ""), "fa", { numeric: true, sensitivity: "base" });
    };

    const roots = nodes.filter((n) => n.parentKey == null || !byKey.has(n.parentKey));
    roots.sort(sortFn);
    for (const list of childrenMap.values()) list.sort(sortFn);

    const result = [];
    const visit = (node, depth) => {
      result.push({ ...node, depth });
      if (!node.hasChildren) return;
      if (!openCodes[node.key]) return;
      (childrenMap.get(node.key) || []).forEach((child) => visit(child, depth + 1));
    };

    roots.forEach((root) => visit(root, 0));
    return result;
  }, [rows, active, getSuffixPlain, openCodes, codeTextOf]);

  if (accessLoading) {
    return (
      <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        <div className="mb-4 text-base md:text-lg">
          <span className="text-neutral-700 dark:text-neutral-300">بودجه‌بندی</span>
          <span className="mx-2 text-neutral-500 dark:text-neutral-400">›</span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">تعریف مراکز بودجه</span>
        </div>
        <div className="p-6 text-center text-neutral-600 dark:text-neutral-400">در حال بررسی دسترسی…</div>
      </Card>
    );
  }

  if (!me) {
    return (
      <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        <div className="mb-4 text-base md:text-lg">
          <span className="text-neutral-700 dark:text-neutral-300">بودجه‌بندی</span>
          <span className="mx-2 text-neutral-500 dark:text-neutral-400">›</span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">تعریف مراکز بودجه</span>
        </div>
        <div className="p-6 text-center text-red-600 dark:text-red-400">ابتدا وارد سامانه شوید.</div>
      </Card>
    );
  }

  if (canAccessPage === false) {
    return (
      <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        <div className="mb-4 text-base md:text-lg">
          <span className="text-neutral-700 dark:text-neutral-300">بودجه‌بندی</span>
          <span className="mx-2 text-neutral-500 dark:text-neutral-400">›</span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">تعریف مراکز بودجه</span>
        </div>
        <div className="p-6 rounded-2xl ring-1 ring-neutral-200 bg-white text-center text-red-600 dark:bg-neutral-900 dark:ring-neutral-800 dark:text-red-400">
          شما سطح دسترسی لازم را ندارید.
        </div>
      </Card>
    );
  }

  if (!active || !tabs.length) {
    return (
      <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        <div className="mb-4 text-base md:text-lg">
          <span className="text-neutral-700 dark:text-neutral-300">بودجه‌بندی</span>
          <span className="mx-2 text-neutral-500 dark:text-neutral-400">›</span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">تعریف مراکز بودجه</span>
        </div>
        <div className="p-6 text-center text-neutral-600 dark:text-neutral-400">در حال آماده‌سازی…</div>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
      <div className="mb-4 text-base md:text-lg">
        <span className="text-neutral-700 dark:text-neutral-300">بودجه‌بندی</span>
        <span className="mx-2 text-neutral-500 dark:text-neutral-400">›</span>
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">تعریف مراکز بودجه</span>
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
                {projectsLoading ? "در حال دریافت پروژه‌ها…" : "انتخاب کنید"}
              </option>

              {(sortedProjects || []).map((p) => (
                <option className="bg-white dark:bg-neutral-900" key={String(p.id)} value={String(p.id)}>
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
        className="rounded-2xl ring-1 ring-neutral-200 border border-neutral-200 p-4 mb-4 bg-white dark:bg-neutral-900 dark:ring-neutral-800 dark:border-neutral-800"
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
                  <TD
                    colSpan={4}
                    className="text-center text-neutral-700 py-3 bg-neutral-50 dark:text-neutral-400 dark:bg-transparent"
                  >
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
                              onClick={() => setNewSuffix(onlyDigitsDot(getSuffixPlain(r)))}
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
  );
}

export default DefineBudgetCentersPage;
