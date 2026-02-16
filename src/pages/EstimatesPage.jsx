// برآورد هزینه
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";
import { baseCurrenciesTablePreset as tablePreset } from "../components/ui/tablePresets.js";
import { usePageAccess } from "../hooks/usePageAccess";

const PAGE_KEY = "EstimatesPage";

export default function EstimatesPage() {
  const API_BASE = (window.API_URL || "/api").replace(/\/+$/, "");

  async function api(path, opt = {}) {
    const res = await fetch(API_BASE + path, {
      credentials: "include",
      cache: "no-store",
      ...opt,
      headers: { "Content-Type": "application/json", ...(opt.headers || {}) },
    });

    const txt = await res.text();
    let data = {};
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch (_e) {
      const snippet = String(txt || "").slice(0, 300);
      throw new Error(`bad_json_response: ${res.status} ${res.statusText} :: ${snippet}`);
    }

    if (!res.ok) throw new Error(data?.error || data?.message || "request_failed");
    return data;
  }

  const ALL_TABS = useMemo(
    () => [
      { id: "office", label: "دفتر", prefix: "OB" },
      { id: "site", label: "سایت", prefix: "SB" },
      { id: "finance", label: "مالی", prefix: "FB" },
      { id: "cash", label: "نقدی", prefix: "CB" },
      { id: "capex", label: "سرمایه‌ای", prefix: "IB" },
      { id: "projects", label: "پروژه‌ها", prefix: "" },
    ],
    [],
  );

  // ✅ Access (مثل DefineBudgetCentersPage)
  const { me, loading: accessLoading, canAccessPage, allowedTabs } = usePageAccess(PAGE_KEY, ALL_TABS);

  const tabs = useMemo(() => {
    if (!allowedTabs) return [];
    return ALL_TABS.filter((t) => allowedTabs.includes(t.id));
  }, [ALL_TABS, allowedTabs]);

  const canUseProjectsTab = useMemo(() => tabs.some((t) => t.id === "projects"), [tabs]);

  const [active, setActive] = useState("office");
  useEffect(() => {
    if (canAccessPage !== true) return;
    if (!tabs.length) return;
    if (!tabs.some((t) => t.id === active)) setActive(tabs[0].id);
  }, [tabs, active, canAccessPage]);

  const prefixOf = useCallback((kind) => ALL_TABS.find((t) => t.id === kind)?.prefix || "", [ALL_TABS]);

  const formatMoney = useCallback((n) => {
    const s = String(n ?? "");
    if (s === "") return "";
    const sign = Number(n) < 0 ? "-" : "";
    const digits = String(Math.abs(Number(n) || 0));
    return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }, []);

  const toFaDigits = useCallback((s) => String(s ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]), []);
  const toEnDigits = useCallback(
    (s) =>
      String(s || "")
        .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
        .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)),
    [],
  );

  const parseMoney = useCallback(
    (s) => {
      if (s == null) return 0;
      const sign = /^\s*-/.test(String(s)) ? -1 : 1;
      const d = toEnDigits(String(s)).replace(/[^\d]/g, "");
      if (!d) return 0;
      return sign * parseInt(d, 10);
    },
    [toEnDigits],
  );

  const renderCode = useCallback(
    (code) => {
      if (active === "projects") return code || "—";
      const pre = (prefixOf(active) || "").toUpperCase();
      const raw = String(code || "").trim();
      const re = new RegExp("^" + pre + "[\\-\\.]?\\s*", "i");
      const suffix = raw.replace(re, "");
      return pre + "-" + suffix;
    },
    [active, prefixOf],
  );

  const coreOf = useCallback(
    (s) => {
      const raw = toEnDigits(String(s || "")).trim();
      const noPrefix = raw.replace(/^[A-Za-z]+[^0-9]*/, "");
      const normalized = noPrefix.replace(/[^0-9.]+/g, ".");
      const cleaned = normalized.replace(/\.+/g, ".").replace(/^\./, "").replace(/\.$/, "");
      return cleaned;
    },
    [toEnDigits],
  );

  const onlyDigitsDot = useCallback((s = "") => toEnDigits(s).replace(/[^0-9.]/g, ""), [toEnDigits]);

  const visualPrefix = useCallback(
    (kind) => (kind === "projects" ? "PB-" : prefixOf(kind) ? prefixOf(kind) + "-" : ""),
    [prefixOf],
  );

  // projects
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    if (canAccessPage !== true) return;
    if (!canUseProjectsTab) return;

    let stop = false;
    (async () => {
      try {
        const r = await api("/projects");
        const list = r.projects || r.items || r.data || [];
        if (!stop) setProjects(Array.isArray(list) ? list : []);
      } catch (_e) {
        if (!stop) setProjects([]);
      }
    })();
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccessPage, canUseProjectsTab]);

// ✅ دقیقاً مثل صفحه پروژه‌ها:
// - فقط پروژه‌های اصلی: کد فقط عدد و بدون نقطه (مثل 156)
// - فقط پروژه‌های فعال: isActive !== false
const isTopProjectCode = (code) => {
  const c = toEnDigits(String(code ?? "")).trim();
  if (!c) return false;
  if (c.includes(".")) return false;
  return /^\d+$/.test(c);
};

const topLevelProjects = useMemo(() => {
  return (projects || [])
    .filter((p) => p?.isActive !== false)     // ✅ فعال‌ها (مثل صفحه پروژه‌ها)
    .filter((p) => isTopProjectCode(p?.code)); // ✅ فقط کدهای اصلی عددی و بدون نقطه
}, [projects, toEnDigits]);


  const selectedProject = useMemo(
    () => (topLevelProjects || []).find((p) => String(p.id) === String(projectId)),
    [topLevelProjects, projectId],
  );

const sortedProjects = useMemo(() => {
  return (topLevelProjects || [])
    .slice()
    .sort((a, b) =>
      String(b?.code || "").localeCompare(String(a?.code || ""), "fa", {
        numeric: true,
        sensitivity: "base",
      }),
    );
}, [topLevelProjects]);

  const projectOptionLabel = useCallback(
    (p) => {
      const code = toFaDigits(String(p?.code || "—"));
      const name = String(p?.name || "").trim();
      return name ? `${code} - ${name}` : code;
    },
    [toFaDigits],
  );

  // months
  const monthNames = useMemo(
    () => ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"],
    [],
  );

  const ALL_MONTH_KEYS = useMemo(() => Array.from({ length: 12 }, (_, i) => "m" + (i + 1)), []);

  const [todayKey, setTodayKey] = useState(() => new Date().toDateString());
  useEffect(() => {
    const id = setInterval(() => {
      const k = new Date().toDateString();
      setTodayKey((p) => (p === k ? p : k));
    }, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const jalaliMonthIndex = useMemo(() => {
    try {
      const fmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "numeric" });
      const fa = fmt.format(new Date());
      const en = Number(toEnDigits(fa));
      if (!en || en < 1 || en > 12) return new Date().getMonth() + 1;
      return en;
    } catch {
      return new Date().getMonth() + 1;
    }
  }, [toEnDigits, todayKey]);

  const dynamicMonths = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 6; i++) {
      const m = ((jalaliMonthIndex + i - 1) % 12) + 1;
      arr.push({ key: "m" + m, monthIndex: m, label: monthNames[m - 1] });
    }
    return arr;
  }, [jalaliMonthIndex, monthNames]);

  // data rows
  const [rows, setRows] = useState([]);
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [newSuffix, setNewSuffix] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creatingCenter, setCreatingCenter] = useState(false);
  const [centerFormErr, setCenterFormErr] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const reqSeq = useRef(0);

  const parseDescMonths = useCallback((descRaw) => {
    let desc = descRaw ?? "";
    let lastMonths = {};
    if (desc && typeof desc === "string") {
      try {
        const parsed = JSON.parse(desc);
        if (parsed && typeof parsed === "object") {
          if (typeof parsed.desc === "string") desc = parsed.desc;
          if (parsed.months && typeof parsed.months === "object") {
            const mm = {};
            Object.keys(parsed.months || {}).forEach((k) => {
              if (!/^m(1[0-2]|[1-9])$/.test(k)) return;
              const v = parsed.months[k];
              if (v !== undefined && v !== null && !isNaN(Number(v))) mm[k] = Number(v);
            });
            lastMonths = mm;
          }
        }
      } catch {}
    }
    return { desc: desc || "", lastMonths };
  }, []);

  useEffect(() => {
    setNewSuffix("");
    setNewDesc("");
    setCenterFormErr("");
  }, [active, projectId]);

  useEffect(() => {
    if (canAccessPage !== true) return;
    if (!tabs.length) return;

    let dead = false;
    const seq = ++reqSeq.current;

    (async () => {
      setErr("");

      if (active === "projects" && !projectId) {
        setRows([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set("kind", active);
        if (active === "projects") qs.set("project_id", String(projectId));

        if (active !== "projects") {
          const r = await api("/budget-estimates?" + qs.toString());
          if (dead || seq !== reqSeq.current) return;

          const items = r.items || [];
          const mapped = (items || []).map((it) => {
            const { desc, lastMonths } = parseDescMonths(it.last_desc ?? it.description ?? "");
            return {
              code: it.code,
              name: it.center_desc ?? it.name ?? "",
              desc,
              baseAmount: it.last_amount ?? it.amount ?? 0,
              months: {},
              lastMonths,
            };
          });

          mapped.sort((a, b) =>
            String(renderCode(a.code)).localeCompare(String(renderCode(b.code)), "fa", {
              numeric: true,
              sensitivity: "base",
            }),
          );

          setRows(mapped);
          return;
        }

        const [rEst, rCenters] = await Promise.all([
          api("/budget-estimates?" + qs.toString()).catch(() => ({ items: [] })),
          api("/centers/projects").catch(() => ({ items: [] })),
        ]);
        if (dead || seq !== reqSeq.current) return;

        const estItems = Array.isArray(rEst?.items) ? rEst.items : [];
        const centersListRaw = rCenters?.items || rCenters?.centers || rCenters?.data || [];
        const centersList = Array.isArray(centersListRaw) ? centersListRaw : [];

        const pCore = coreOf(selectedProject?.code);
        const matchedCenters = pCore
          ? centersList.filter((c) => {
              const code = String(c?.suffix ?? c?.code ?? "").trim();
              if (!code) return false;
              const cCore = coreOf(code);
              return cCore === pCore || cCore.startsWith(pCore + ".");
            })
          : [];

        const byCode = new Map();

        for (const c of matchedCenters) {
          const code = String(c?.suffix ?? c?.code ?? "").trim();
          if (!code) continue;
          byCode.set(code, {
            code,
            name: String(c?.description ?? c?.name ?? ""),
            desc: "",
            baseAmount: 0,
            months: {},
            lastMonths: {},
          });
        }

        for (const it of estItems) {
          const code = String(it?.code ?? "").trim();
          if (!code) continue;
          const prev = byCode.get(code) || { code, name: "", desc: "", baseAmount: 0, months: {}, lastMonths: {} };
          const { desc, lastMonths } = parseDescMonths(it.last_desc ?? it.description ?? "");
          byCode.set(code, {
            ...prev,
            name: prev.name || String(it.center_desc ?? it.name ?? ""),
            desc: desc || prev.desc || "",
            baseAmount: it.last_amount ?? it.amount ?? prev.baseAmount ?? 0,
            months: {},
            lastMonths: lastMonths || prev.lastMonths || {},
          });
        }

        const mapped = Array.from(byCode.values());
        mapped.sort((a, b) =>
          String(renderCode(a.code)).localeCompare(String(renderCode(b.code)), "fa", {
            numeric: true,
            sensitivity: "base",
          }),
        );

        setRows(mapped);
      } catch (ex) {
        if (!dead && seq === reqSeq.current) setErr(ex.message || "خطا در بارگذاری");
      } finally {
        if (!dead && seq === reqSeq.current) setLoading(false);
      }
    })();

    return () => {
      dead = true;
    };
  }, [canAccessPage, tabs.length, active, projectId, dynamicMonths, renderCode, parseDescMonths, coreOf, selectedProject, reloadTick]);

  const filteredRows = useMemo(() => {
    if (active !== "projects") return rows || [];
    return rows || [];
  }, [rows, active]);

  const finalPreviewOf = useCallback(
    (r) =>
      dynamicMonths.reduce((acc, m) => {
        let val = 0;
        if (r.months && r.months[m.key] != null) val = Number(r.months[m.key] || 0);
        else val = Number((r.lastMonths && r.lastMonths[m.key]) || 0);
        return acc + (val || 0);
      }, 0),
    [dynamicMonths],
  );

  const sumMonths = useCallback(
    (r) =>
      dynamicMonths.reduce((acc, m) => {
        const lastVal = Number((r.lastMonths && r.lastMonths[m.key]) || 0);
        const curRaw = r.months && r.months[m.key];
        if (curRaw === undefined || curRaw === null) return acc;
        const curVal = Number(curRaw) || 0;
        return acc + (curVal - lastVal);
      }, 0),
    [dynamicMonths],
  );

  const [codeSortDir, setCodeSortDir] = useState("asc");
  const [openCodes, setOpenCodes] = useState({});
  useEffect(() => setOpenCodes({}), [active, projectId]);

  const rowsToRender = useMemo(() => filteredRows || [], [filteredRows]);

  const hierarchyMaps = useMemo(() => {
    const base = rowsToRender || [];
    const coreByCode = {};
    base.forEach((r) => {
      if (!r?.code) return;
      coreByCode[r.code] = coreOf(r.code);
    });

    const hasChildrenByCode = {};
    base.forEach((r) => {
      if (!r?.code) return;
      const core = coreByCode[r.code];
      if (!core) return (hasChildrenByCode[r.code] = false);
      const prefix = core + ".";
      hasChildrenByCode[r.code] = base.some((o) => {
        if (!o?.code || o === r) return false;
        const oc = coreByCode[o.code];
        return oc && oc.startsWith(prefix);
      });
    });

    const isLeafByCode = {};
    Object.keys(coreByCode).forEach((code) => (isLeafByCode[code] = !hasChildrenByCode[code]));
    return { coreByCode, hasChildrenByCode, isLeafByCode };
  }, [rowsToRender, coreOf]);

  const displayRows = useMemo(() => {
    const base = rowsToRender || [];
    if (!base.length) return [];

    const nodes = base.map((r, index) => {
      const core = coreOf(r.code);
      const parts = core ? core.split(".").filter(Boolean) : [];
      const key = core || `__idx_${index}`;
      let parentCore = null;
      if (parts.length > 1) parentCore = parts.slice(0, -1).join(".");
      return { row: r, key, core, parentCore };
    });

    const byCore = new Map();
    nodes.forEach((n) => n.core && byCore.set(n.core, n));

    // ✅ اگر پدر مستقیم وجود نداشت (مثلاً 162.1 نیست)، نزدیک‌ترین پدر موجود را پیدا کن (مثلاً 162)
    nodes.forEach((n) => {
      if (!n.core) return;
      const parts = n.core.split(".").filter(Boolean);
      if (parts.length <= 1) {
        n.parentCore = null;
        return;
      }
      let found = null;
      for (let i = parts.length - 1; i >= 1; i--) {
        const candidate = parts.slice(0, i).join(".");
        if (byCore.has(candidate)) {
          found = candidate;
          break;
        }
      }
      n.parentCore = found;
    });

    const childrenMap = new Map();
    nodes.forEach((n) => {
      if (!n.parentCore) return;
      if (!byCore.has(n.parentCore)) return;
      if (!childrenMap.has(n.parentCore)) childrenMap.set(n.parentCore, []);
      childrenMap.get(n.parentCore).push(n);
    });

    nodes.forEach((n) => (n.hasChildren = !!(n.core && childrenMap.has(n.core))));

    const sortFn = (a, b) => {
      const ca = renderCode(a.row.code);
      const cb = renderCode(b.row.code);
      const cmp = String(ca || "").localeCompare(String(cb || ""), "fa", { numeric: true, sensitivity: "base" });
      return codeSortDir === "asc" ? cmp : -cmp;
    };

    const roots = nodes.filter((n) => !n.parentCore || !byCore.has(n.parentCore));
    roots.sort(sortFn);
    for (const list of childrenMap.values()) list.sort(sortFn);

    const result = [];
    const visit = (node, depth) => {
      result.push({ row: node.row, depth, key: node.key, core: node.core, hasChildren: node.hasChildren });
      if (!node.hasChildren) return;
      const toggleKey = node.core || node.key;
      const isOpen = !!openCodes[toggleKey];
      if (!isOpen) return;
      const children = node.core ? childrenMap.get(node.core) || [] : [];
      children.forEach((child) => visit(child, depth + 1));
    };

    roots.forEach((root) => visit(root, 0));
    return result;
  }, [rowsToRender, coreOf, renderCode, codeSortDir, openCodes]);

  const allRowsForExport = useMemo(() => {
    const base = rowsToRender || [];
    if (!base.length) return [];

    const nodes = base.map((r, index) => {
      const core = coreOf(r.code);
      const parts = core ? core.split(".").filter(Boolean) : [];
      const key = core || `__idx_${index}`;
      let parentCore = null;
      if (parts.length > 1) parentCore = parts.slice(0, -1).join(".");
      return { row: r, key, core, parentCore };
    });

    const byCore = new Map();
    nodes.forEach((n) => n.core && byCore.set(n.core, n));

    nodes.forEach((n) => {
      if (!n.core) return;
      const parts = n.core.split(".").filter(Boolean);
      if (parts.length <= 1) {
        n.parentCore = null;
        return;
      }
      let found = null;
      for (let i = parts.length - 1; i >= 1; i--) {
        const candidate = parts.slice(0, i).join(".");
        if (byCore.has(candidate)) {
          found = candidate;
          break;
        }
      }
      n.parentCore = found;
    });

    const childrenMap = new Map();
    nodes.forEach((n) => {
      if (!n.parentCore) return;
      if (!byCore.has(n.parentCore)) return;
      if (!childrenMap.has(n.parentCore)) childrenMap.set(n.parentCore, []);
      childrenMap.get(n.parentCore).push(n);
    });

    nodes.forEach((n) => (n.hasChildren = !!(n.core && childrenMap.has(n.core))));

    const sortFn = (a, b) => {
      const ca = renderCode(a.row.code);
      const cb = renderCode(b.row.code);
      const cmp = String(ca || "").localeCompare(String(cb || ""), "fa", { numeric: true, sensitivity: "base" });
      return codeSortDir === "asc" ? cmp : -cmp;
    };

    const roots = nodes.filter((n) => !n.parentCore || !byCore.has(n.parentCore));
    roots.sort(sortFn);
    for (const list of childrenMap.values()) list.sort(sortFn);

    const result = [];
    const visit = (node, depth) => {
      result.push({ row: node.row, depth, key: node.key, core: node.core, hasChildren: node.hasChildren });
      const children = node.core ? childrenMap.get(node.core) || [] : [];
      children.forEach((child) => visit(child, depth + 1));
    };

    roots.forEach((root) => visit(root, 0));
    return result;
  }, [rowsToRender, coreOf, renderCode, codeSortDir]);

  const monthValueOfRow = useCallback(
    (row, monthKey) => {
      if (!row?.code) return 0;
      const code = row.code;
      const isParent = !hierarchyMaps.isLeafByCode[code];

      if (!isParent) {
        if (row.months && row.months[monthKey] != null) return Number(row.months[monthKey] || 0);
        return Number((row.lastMonths && row.lastMonths[monthKey]) || 0);
      }

      const core = hierarchyMaps.coreByCode[code];
      if (!core) return 0;
      const prefix = core + ".";

      let sum = 0;
      (rowsToRender || []).forEach((rr) => {
        if (!rr?.code) return;
        const c2 = hierarchyMaps.coreByCode[rr.code];
        if (!c2 || !hierarchyMaps.isLeafByCode[rr.code]) return;
        if (!c2.startsWith(prefix)) return;
        if (rr.months && rr.months[monthKey] != null) sum += Number(rr.months[monthKey] || 0);
        else sum += Number((rr.lastMonths && rr.lastMonths[monthKey]) || 0);
      });
      return sum;
    },
    [rowsToRender, hierarchyMaps],
  );

  const finalTotalOfRow = useCallback(
    (row) => dynamicMonths.reduce((acc, m) => acc + monthValueOfRow(row, m.key), 0),
    [dynamicMonths, monthValueOfRow],
  );

  const totalsComputed = useMemo(() => {
    const t = {};
    dynamicMonths.forEach((m) => (t[m.key] = 0));
    (rowsToRender || []).forEach((r) => {
      if (!r?.code) return;
      if (!hierarchyMaps.isLeafByCode[r.code]) return;
      dynamicMonths.forEach((m) => {
        let val = 0;
        if (r.months && r.months[m.key] != null) val = Number(r.months[m.key] || 0);
        else val = Number((r.lastMonths && r.lastMonths[m.key]) || 0);
        if (val) t[m.key] += val;
      });
    });
    return t;
  }, [rowsToRender, hierarchyMaps, dynamicMonths]);

  const totalGrand = useMemo(() => {
    let grand = 0;
    (rowsToRender || []).forEach((r) => {
      if (!r?.code) return;
      if (!hierarchyMaps.isLeafByCode[r.code]) return;
      grand += finalPreviewOf(r);
    });
    return grand;
  }, [rowsToRender, hierarchyMaps, finalPreviewOf]);

  const [editingCell, setEditingCell] = useState({
    code: null,
    monthKey: "",
    value: "",
  });
  const editingInputRef = useRef(null);
  const skipBlurSaveRef = useRef(false);

  const startInlineEdit = (row, monthKey) => {
    if (!row?.code) return;
    let rawVal = 0;
    if (row.months && row.months[monthKey] != null) rawVal = row.months[monthKey];
    else if (row.lastMonths && row.lastMonths[monthKey] != null) rawVal = row.lastMonths[monthKey];
    const currentVal = Number(rawVal || 0);
    setEditingCell({
      code: row.code,
      monthKey,
      value: currentVal ? formatMoney(currentVal) : "",
    });
  };

  const closeInlineEdit = useCallback(() => {
    setEditingCell({ code: null, monthKey: "", value: "" });
  }, []);

  const handleInlineEditChange = (raw) => {
    const en = toEnDigits(raw);
    const digits = en.replace(/[^\d]/g, "");
    const formatted = digits ? formatMoney(Number(digits)) : "";
    setEditingCell((p) => ({ ...p, value: formatted }));
  };

  const persistSingleCell = async (code, monthKey, num) => {
    const list = rowsRef.current || [];
    const row = list.find((r) => String(r.code) === String(code));
    if (!row) return;

    const merged = { ...(row.lastMonths || {}), ...(row.months || {}) };
    merged[monthKey] = num;

    const nextMonths = {};
    ALL_MONTH_KEYS.forEach((k) => {
      const v = Number(merged[k] || 0);
      if (v) nextMonths[k] = v;
    });

    const plainDesc = (row.desc || "").trim();
    const total = Object.values(nextMonths).reduce((sum, v) => sum + Number(v || 0), 0);

    let description = null;
    if (plainDesc || Object.keys(nextMonths).length) {
      try {
        description = JSON.stringify({ desc: plainDesc || null, months: nextMonths });
      } catch {
        description = plainDesc || null;
      }
    }

    const body = {
      kind: active,
      project_id: active === "projects" ? (projectId ? Number(projectId) : null) : null,
      rows: [{ code, description, amount: total }],
    };

    setSaving(true);
    setErr("");
    try {
      await api("/budget-estimates", { method: "POST", body: JSON.stringify(body) });

      setRows((prev) =>
        (prev || []).map((r) => {
          if (String(r.code) !== String(code)) return r;
          const lm = { ...(r.lastMonths || {}), ...(r.months || {}) };
          if (num) lm[monthKey] = num;
          else delete lm[monthKey];
          const mm = { ...(r.months || {}) };
          delete mm[monthKey];
          return { ...r, lastMonths: lm, months: mm };
        }),
      );
    } catch (ex) {
      setErr(ex.message || "خطا در ذخیره برآورد");
    } finally {
      setSaving(false);
    }
  };

  const saveInlineEdit = useCallback(() => {
    if (!editingCell.code || !editingCell.monthKey) return;
    const num = parseMoney(editingCell.value);
    const targetCode = editingCell.code;
    const targetMonthKey = editingCell.monthKey;

    setRows((prev) =>
      (prev || []).map((r) => {
        if (String(r.code) !== String(targetCode)) return r;
        const nextMonths = { ...(r.months || {}), [targetMonthKey]: num };
        const nextLast = { ...(r.lastMonths || {}) };
        if (num) nextLast[targetMonthKey] = num;
        else delete nextLast[targetMonthKey];
        return { ...r, months: nextMonths, lastMonths: nextLast };
      }),
    );

    closeInlineEdit();
    persistSingleCell(targetCode, targetMonthKey, num);
  }, [editingCell, parseMoney, closeInlineEdit, persistSingleCell]);

  useEffect(() => {
    if (editingCell.code && editingInputRef.current) {
      editingInputRef.current.focus();
      editingInputRef.current.select();
    }
  }, [editingCell.code, editingCell.monthKey]);

  useEffect(() => {
    if (!editingCell.code) skipBlurSaveRef.current = false;
  }, [editingCell.code]);

  const onUpdate = async () => {
    try {
      setSaving(true);
      setErr("");

      const payloadRows = (filteredRows || [])
        .map((r) => {
          if (!r.code) return null;

          const nextMonths = {};
          ALL_MONTH_KEYS.forEach((k) => {
            const cur = r.months && r.months[k];
            const last = r.lastMonths && r.lastMonths[k];
            const effective = cur !== undefined && cur !== null ? Number(cur) || 0 : Number(last) || 0;
            if (effective) nextMonths[k] = effective;
          });

          const plainDesc = (r.desc || "").trim();
          const total = Object.values(nextMonths).reduce((sum, v) => sum + Number(v || 0), 0);

          const delta = sumMonths(r);
          if (!delta && !plainDesc && !Object.keys(nextMonths).length) return null;

          let description = null;
          if (plainDesc || Object.keys(nextMonths).length) {
            try {
              description = JSON.stringify({ desc: plainDesc || null, months: nextMonths });
            } catch {
              description = plainDesc || null;
            }
          }

          return { code: r.code, description, amount: total };
        })
        .filter(Boolean);

      if (!payloadRows.length) return;

      const body = {
        kind: active,
        project_id: active === "projects" ? Number(projectId) : null,
        rows: payloadRows,
      };

      await api("/budget-estimates", { method: "POST", body: JSON.stringify(body) });

      setRows((p) =>
        (p || []).map((r) => {
          const lm = { ...(r.lastMonths || {}), ...(r.months || {}) };
          return { ...r, lastMonths: lm, months: {} };
        }),
      );
    } catch (ex) {
      setErr(ex.message || "خطا در بروزرسانی");
    } finally {
      setSaving(false);
    }
  };

  const resetAllEstimates = async () => {
    if (!rowsToRender.length) return;
    const ok = window.confirm("آیا از صفر کردن تمام برآوردهای این صفحه اطمینان دارید؟");
    if (!ok) return;

    try {
      setSaving(true);
      setErr("");

      const codes = (rowsToRender || []).map((r) => String(r.code || "").trim()).filter(Boolean);

      await api("/budget-estimates", {
        method: "DELETE",
        body: JSON.stringify({
          kind: active,
          project_id: active === "projects" ? Number(projectId) : null,
          codes,
        }),
      });

      setRows((prev) =>
        (prev || []).map((r) => ({
          ...r,
          desc: "",
          baseAmount: 0,
          months: {},
          lastMonths: {},
        })),
      );
    } catch (ex) {
      setErr(ex.message || "خطا در صفر کردن برآوردها");
    } finally {
      setSaving(false);
    }
  };

  const addCenterRow = async () => {
    setCenterFormErr("");
    if (!active) return;

    if (active === "projects" && !projectId) {
      setCenterFormErr("ابتدا پروژه را انتخاب کنید.");
      return;
    }

    const desc = String(newDesc || "").trim();
    const suffixRaw = onlyDigitsDot(newSuffix || "");

    if (active !== "projects" && !suffixRaw) {
      setCenterFormErr("کد بودجه را وارد کنید.");
      return;
    }

    const baseProjectCode = String(selectedProject?.code || "").trim();
    if (active === "projects" && !baseProjectCode) {
      setCenterFormErr("کد پروژه نامعتبر است.");
      return;
    }

    const suffixToSend = active === "projects" ? (suffixRaw ? `${baseProjectCode}.${suffixRaw}` : baseProjectCode) : suffixRaw;

    setCreatingCenter(true);
    try {
      await api(`/centers/${active}`, {
        method: "POST",
        body: JSON.stringify({ suffix: suffixToSend, description: desc }),
      });

      const parts = coreOf(suffixToSend).split(".").filter(Boolean);
      if (parts.length > 1) {
        setOpenCodes((prev) => {
          const next = { ...prev };
          for (let i = 1; i < parts.length; i += 1) {
            next[parts.slice(0, i).join(".")] = true;
          }
          return next;
        });
      }

      setNewSuffix("");
      setNewDesc("");
      setReloadTick((v) => v + 1);
    } catch (ex) {
      setCenterFormErr(ex.message || "خطا در ثبت مرکز بودجه");
    } finally {
      setCreatingCenter(false);
    }
  };

  const exportExcel = useCallback(() => {
    const escapeHtml = (v) =>
      String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const activeLabel = tabs.find((t) => t.id === active)?.label || "";
    const projectLabel =
      active === "projects" ? (selectedProject ? `${selectedProject.code || ""} - ${selectedProject.name || ""}` : "") : "";
    const title = `برآورد هزینه‌ها${activeLabel ? ` - ${activeLabel}` : ""}`;

    const headerHtml = `
      <tr>
        <th>#</th>
        <th>کد بودجه</th>
        <th>نام بودجه</th>
        ${dynamicMonths.map((m) => `<th>${escapeHtml(m.label)}</th>`).join("")}
        <th>جمع</th>
      </tr>
    `;

    const bodyHtml = (allRowsForExport || [])
      .map((node, idx) => {
        const r = node.row || {};
        const codeCell = renderCode(r.code);
        const indent = "&nbsp;".repeat(Math.max(0, Number(node.depth || 0)) * 4);
        const nameCell = `${indent}${escapeHtml(r.name || "—")}`;

        const monthsHtml = dynamicMonths
          .map((m) => {
            const v = monthValueOfRow(r, m.key);
            return `<td>${v ? escapeHtml(toFaDigits(formatMoney(v))) : "—"}</td>`;
          })
          .join("");

        const rowTotal = finalTotalOfRow(r);

        return `
          <tr>
            <td>${escapeHtml(toFaDigits(idx + 1))}</td>
            <td>${escapeHtml(codeCell || "—")}</td>
            <td style="text-align:right">${nameCell}</td>
            ${monthsHtml}
            <td>${rowTotal ? escapeHtml(toFaDigits(formatMoney(rowTotal))) : "—"}</td>
          </tr>
        `;
      })
      .join("");

    const footerHtml = `
      <tr>
        <td>-</td>
        <td>-</td>
        <td>جمع کل</td>
        ${dynamicMonths
          .map((m) => {
            const v = totalsComputed[m.key];
            return `<td>${v ? escapeHtml(toFaDigits(formatMoney(v))) : "—"}</td>`;
          })
          .join("")}
        <td>${totalGrand ? escapeHtml(toFaDigits(formatMoney(totalGrand))) : "—"}</td>
      </tr>
    `;

    const noRowsHtml = `<tr><td colspan="${3 + dynamicMonths.length + 1}">موردی برای نمایش نیست.</td></tr>`;
    const exportDate = new Date().toLocaleDateString("fa-IR");

    const html = `
      <html lang="fa" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Vazir, Vazirmatn, IRANSans, Segoe UI, Tahoma, sans-serif; direction: rtl; }
            table, th, td, .meta { font-family: Vazir, Vazirmatn, IRANSans, Segoe UI, Tahoma, sans-serif; }
            .meta { margin-bottom: 10px; font-size: 11pt; }
            .meta div { margin-bottom: 4px; }
            table { border-collapse: collapse; width: 100%; font-size: 11pt; }
            th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: center; vertical-align: middle; }
            thead th { background-color: #f3f4f6; font-weight: 700; }
            tfoot td { background-color: #f9fafb; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="meta">
            <div><strong>${escapeHtml(title)}</strong></div>
            ${active === "projects" ? `<div>پروژه: ${escapeHtml(projectLabel || "—")}</div>` : ""}
            <div>تاریخ خروجی: ${escapeHtml(exportDate)}</div>
          </div>
          <table>
            <thead>${headerHtml}</thead>
            <tbody>${bodyHtml || noRowsHtml}</tbody>
            <tfoot>${footerHtml}</tfoot>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `estimates-${active}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [
    tabs,
    active,
    selectedProject,
    dynamicMonths,
    allRowsForExport,
    renderCode,
    monthValueOfRow,
    finalTotalOfRow,
    toFaDigits,
    formatMoney,
    totalsComputed,
    totalGrand,
  ]);

  const renderTopButtons = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setActive(t.id)}
          className={`h-10 px-4 rounded-2xl border text-sm shadow-sm transition ${
            active === t.id
              ? "bg-black text-white border-black"
              : "bg-white text-black border border-black/15 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const renderProjectsControls = () => {
    if (active !== "projects") return null;
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-xs sm:text-sm text-black/70 dark:text-neutral-300">کد/نام پروژه</label>
          <div className="relative">
            <select
              dir="rtl"
              className="w-full h-11 rounded-xl pr-3 pl-9 sm:pr-4 sm:pl-10 text-sm leading-6 text-right bg-white text-black border border-black/15 outline-none appearance-none
                         [-webkit-appearance:none] [-moz-appearance:none] [background-image:none]
                         focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option className="bg-white dark:bg-neutral-900" value="">
                انتخاب کنید
              </option>
              {(sortedProjects || []).map((p) => (
                <option className="bg-white dark:bg-neutral-900" key={p.id} value={p.id}>
                  {projectOptionLabel(p)}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-black/60 dark:text-neutral-300">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M5.5 7.5 10 12l4.5-4.5" />
              </svg>
            </span>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-xs sm:text-sm text-black/70 dark:text-neutral-300">نام پروژه</label>
          <input
            className="w-full h-11 rounded-xl px-3 sm:px-4 text-sm text-right bg-black/5 text-black border border-black/15 outline-none
                       dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
            value={selectedProject?.name || ""}
            readOnly
            placeholder="پس از انتخاب پروژه پر می‌شود"
          />
        </div>
      </div>
    );
  };

  const renderCenterCreateControls = () => (
    <div
      className="rounded-2xl ring-1 ring-black/10 border border-black/10 p-3 md:p-4 bg-white dark:bg-neutral-900 dark:ring-neutral-800 dark:border-neutral-800"
      dir="rtl"
    >
      <form
        className="flex flex-col md:flex-row-reverse md:items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          addCenterRow();
        }}
      >
        <div className="md:w-auto">
          <button
            type="submit"
            disabled={creatingCenter || (active === "projects" && !projectId)}
            className="h-10 w-12 grid place-items-center rounded-xl bg-neutral-900 text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
            title={active === "projects" && !projectId ? "ابتدا پروژه را انتخاب کنید" : "تأیید"}
            aria-label="تأیید"
          >
            <img src="/images/icons/check.svg" alt="" className="w-4 h-4 invert dark:invert-0" />
          </button>
        </div>

        <div className="flex-1 min-w-[240px] flex flex-col gap-1">
          <label className="text-xs sm:text-sm text-black/70 dark:text-neutral-300">شرح بودجه</label>
          <input
            className="w-full h-11 rounded-2xl px-3 sm:px-4 text-sm text-center bg-white text-black border border-black/15 outline-none placeholder:text-black/40 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="شرح..."
          />
        </div>

        <div className="w-full md:w-[280px] flex flex-col gap-1">
          <label className="text-xs sm:text-sm text-black/70 dark:text-neutral-300">کد بودجه</label>

          {active !== "projects" ? (
            <div className="w-full h-11 flex items-center rounded-xl overflow-hidden bg-white text-black ltr border border-black/15 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700">
              <span className="px-3 h-full inline-flex items-center font-mono select-none bg-black/[0.04] ring-1 ring-black/10 dark:bg-neutral-900 dark:ring-neutral-800">
                {visualPrefix(active)}
              </span>
              <input
                className="flex-1 px-3 font-mono outline-none bg-transparent text-center text-sm placeholder:text-black/40 dark:placeholder:text-neutral-500"
                value={newSuffix}
                onChange={(e) => setNewSuffix(onlyDigitsDot(e.target.value))}
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="w-full h-11 flex items-center rounded-xl overflow-hidden bg-white text-black ltr border border-black/15 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700">
              <span className="px-3 h-full inline-flex items-center font-mono select-none text-xs md:text-sm whitespace-nowrap bg-black/[0.04] ring-1 ring-black/10 dark:bg-neutral-900 dark:ring-neutral-800">
                {"PB-"}
                {selectedProject?.code || ""}
                {selectedProject ? "." : ""}
              </span>
              <input
                className="flex-1 px-3 font-mono outline-none bg-transparent text-center text-sm placeholder:text-black/40 dark:placeholder:text-neutral-500"
                value={newSuffix}
                onChange={(e) => setNewSuffix(onlyDigitsDot(e.target.value))}
                spellCheck={false}
              />
            </div>
          )}
        </div>
      </form>

      {centerFormErr && <div className="text-sm text-red-600 dark:text-red-400 mt-2 text-center">{centerFormErr}</div>}
    </div>
  );

  const colCount = 3 + dynamicMonths.length + 1;

  // ✅ Guards (مثل DefineBudgetCentersPage)
  if (accessLoading) {
    return (
      <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
          <span>بودجه‌بندی</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-black dark:text-neutral-100">برآورد هزینه‌ها</span>
        </div>
        <div className="p-6 text-center text-neutral-600 dark:text-neutral-400">در حال بررسی دسترسی…</div>
      </Card>
    );
  }

  if (!me) {
    return (
      <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
          <span>بودجه‌بندی</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-black dark:text-neutral-100">برآورد هزینه‌ها</span>
        </div>
        <div className="p-6 text-center text-red-600 dark:text-red-400">ابتدا وارد سامانه شوید.</div>
      </Card>
    );
  }

  if (canAccessPage === false) {
    return (
      <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
        <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
          <span>بودجه‌بندی</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-black dark:text-neutral-100">برآورد هزینه‌ها</span>
        </div>
        <div className="p-6 rounded-2xl ring-1 ring-neutral-200 bg-white text-center text-red-600 dark:bg-neutral-900 dark:ring-neutral-800 dark:text-red-400">
          شما سطح دسترسی لازم را ندارید.
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
          <span>بودجه‌بندی</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-black dark:text-neutral-100">برآورد هزینه‌ها</span>
        </div>

        <div className="space-y-3 md:space-y-4 mb-4">
          {renderTopButtons()}
          {renderProjectsControls()}
          {renderCenterCreateControls()}
        </div>

        <TableWrap>
          <div className={tablePreset.outer}>
            <div className={tablePreset.innerPad}>
              <div className={tablePreset.frame + " shadow-sm"}>
                <div className="overflow-x-auto">
                  <table
                    className={tablePreset.table + " table-fixed text-[12px] md:text-[13px] min-w-[900px] lg:min-w-[1020px]"}
                    dir="rtl"
                  >
                    <THead>
                      <tr className={tablePreset.headRow + " sticky top-0 z-10"}>
                        <TH className={`w-14 ${tablePreset.th}`}>#</TH>
                        <TH className={`w-36 md:w-40 ${tablePreset.th}`}>
                      <div className="flex items-center justify-center gap-1 w-full">
                        <span>کد بودجه</span>
                        <button
                          type="button"
                          onClick={() => setCodeSortDir((p) => (p === "asc" ? "desc" : "asc"))}
                          className="rounded-lg px-2 py-1 ring-1 ring-black/15 hover:bg-black/5 dark:ring-neutral-800 dark:hover:bg-white/10"
                          aria-label="مرتب‌سازی کد بودجه"
                        >
                          <img
                            src={codeSortDir === "asc" ? "/images/icons/kochikbebozorg.svg" : "/images/icons/bozorgbekochik.svg"}
                            alt=""
                            className="w-5 h-5 dark:invert"
                          />
                        </button>
                      </div>
                        </TH>
                        <TH className={`w-32 md:w-40 ${tablePreset.th}`}>نام بودجه</TH>
                    {dynamicMonths.map((m) => (
                          <TH key={m.key} className={`w-20 md:w-24 px-0 ${tablePreset.th}`}>
                        {m.label}
                      </TH>
                    ))}
                        <TH className={`w-24 md:w-28 border-l border-r border-black/10 dark:border-neutral-700 ${tablePreset.th}`}>
                      <div className="flex items-center justify-center gap-1">
                        <span>جمع</span>
                        <button
                          type="button"
                          onClick={resetAllEstimates}
                          className="h-5 w-5 flex items-center justify-center rounded-full border border-black/20 text-xs leading-none hover:bg-black/10 dark:border-neutral-600 dark:hover:bg-white/10"
                          title="صفر کردن همه"
                        >
                          <span className="text-[11px]">×</span>
                        </button>
                      </div>
                        </TH>
                      </tr>
                    </THead>

                    <tbody className={tablePreset.body}>
                  {loading ? (
                    <TR>
                          <TD colSpan={colCount} className={tablePreset.emptyRow}>
                        در حال بارگذاری…
                      </TD>
                    </TR>
                  ) : (displayRows || []).length === 0 ? (
                    <TR>
                          <TD colSpan={colCount} className={tablePreset.emptyRow}>
                        {active === "projects" && !projectId ? "ابتدا پروژه را انتخاب کنید" : "موردی یافت نشد."}
                      </TD>
                    </TR>
                  ) : (
                    <>
                      <TR className="text-center bg-black/[0.04] font-semibold dark:bg-white/10">
                        <TD className="px-2 py-3 border-b border-black/10 dark:border-neutral-800">-</TD>
                        <TD className="px-2 py-3 border-b border-black/10 dark:border-neutral-800">-</TD>
                        <TD className="px-2 py-3 text-center border-b border-black/10 dark:border-neutral-800">جمع</TD>
                        {dynamicMonths.map((m) => (
                          <TD key={m.key} className="px-0 py-2 text-center align-middle border-b border-black/10 dark:border-neutral-800">
                            {totalsComputed[m.key] ? (
                              <span className="inline-flex items-center justify-center gap-1">
                                <span className="ltr">{toFaDigits(formatMoney(totalsComputed[m.key]))}</span>
                              </span>
                            ) : (
                              "—"
                            )}
                          </TD>
                        ))}
                        <TD className="px-3 py-3 whitespace-nowrap text-center border-l border-r border-b border-black/10 dark:border-neutral-700">
                          <span className="inline-flex items-center justify-center gap-1">
                            <span className="ltr">{toFaDigits(formatMoney(totalGrand || 0))}</span>
                          </span>
                        </TD>
                      </TR>

                      {(displayRows || []).map((node, idx) => {
                        const r = node.row;
                        const code = r.code;
                        const isParent = !!code && !hierarchyMaps.isLeafByCode[r.code];
                        const hasChildren = !!node.hasChildren || isParent;
                        const toggleKey = node.core || node.key;
                        const isOpen = !!openCodes[toggleKey];
                        const shiftX = node.depth ? node.depth * 10 : 0;

                        const finalTotal = (() => {
                          if (!code || !isParent) return finalPreviewOf(r);
                          const core = hierarchyMaps.coreByCode[code];
                          if (!core) return finalPreviewOf(r);
                          const prefix = core + ".";
                          let sum = 0;
                          (rowsToRender || []).forEach((rr) => {
                            if (!rr?.code) return;
                            const c2 = hierarchyMaps.coreByCode[rr.code];
                            if (!c2 || !hierarchyMaps.isLeafByCode[rr.code]) return;
                            if (!c2.startsWith(prefix)) return;
                            sum += finalPreviewOf(rr);
                          });
                          return sum;
                        })();

                        return (
                          <TR key={code || idx} className="text-center hover:bg-black/[0.06] transition-colors dark:hover:bg-white/15">
                            <TD className="px-2 py-3">{toFaDigits(idx + 1)}</TD>

                            <TD className="px-2 py-3 text-right whitespace-nowrap">
                              <div
                                className="inline-flex items-center justify-end gap-1 flex-row-reverse"
                                style={{ transform: shiftX ? `translateX(${shiftX}px)` : undefined }}
                              >
                                {hasChildren && (
                                  <button
                                    type="button"
                                    onClick={() => setOpenCodes((p) => ({ ...p, [toggleKey]: !p[toggleKey] }))}
                                    className="h-5 w-5 grid place-items-center rounded-md border border-black/25 bg-white text-black dark:border-neutral-500 dark:bg-white dark:text-black"
                                    aria-label={isOpen ? "بستن زیرمجموعه" : "باز کردن زیرمجموعه"}
                                  >
                                    {isOpen ? (
                                      <span className="text-[11px] leading-none text-black">−</span>
                                    ) : (
                                      <img src="/images/icons/afzodan.svg" alt="" className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                                <span className={`ltr ${node.depth ? "text-[11px] md:text-xs" : "text-xs md:text-[13px]"}`}>
                                  {renderCode(code)}
                                </span>
                              </div>
                            </TD>

                            <TD
                              className={`px-2 py-3 text-right break-words max-w-[180px] ${
                                node.depth ? "text-[10px] md:text-[12px]" : "text-[11px] md:text-[13px]"
                              }`}
                            >
                              <div style={{ transform: shiftX ? `translateX(${shiftX}px)` : undefined }}>{r.name || "—"}</div>
                            </TD>

                            {dynamicMonths.map((m) => {
                              let val = 0;

                              if (!isParent) {
                                if (r.months && r.months[m.key] != null) val = Number(r.months[m.key] || 0);
                                else val = Number((r.lastMonths && r.lastMonths[m.key]) || 0);
                              } else {
                                const core = hierarchyMaps.coreByCode[code];
                                if (core) {
                                  const prefix = core + ".";
                                  (rowsToRender || []).forEach((rr) => {
                                    if (!rr?.code) return;
                                    const c2 = hierarchyMaps.coreByCode[rr.code];
                                    if (!c2 || !hierarchyMaps.isLeafByCode[rr.code]) return;
                                    if (!c2.startsWith(prefix)) return;
                                    let childVal = 0;
                                    if (rr.months && rr.months[m.key] != null) childVal = Number(rr.months[m.key] || 0);
                                    else childVal = Number((rr.lastMonths && rr.lastMonths[m.key]) || 0);
                                    if (childVal) val += childVal;
                                  });
                                }
                              }

                              const hasVal = !!val;
                              const isEditing =
                                !isParent &&
                                String(editingCell.code || "") === String(r.code || "") &&
                                editingCell.monthKey === m.key;

                              return (
                                <TD key={m.key} className="px-0 py-2 text-center align-middle">
                                  {isEditing ? (
                                    <input
                                      ref={editingInputRef}
                                      dir="ltr"
                                      value={editingCell.value ? toFaDigits(editingCell.value) : ""}
                                      onChange={(e) => handleInlineEditChange(e.target.value)}
                                      onBlur={() => {
                                        if (skipBlurSaveRef.current) {
                                          skipBlurSaveRef.current = false;
                                          return;
                                        }
                                        saveInlineEdit();
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          skipBlurSaveRef.current = true;
                                          saveInlineEdit();
                                        }
                                        if (e.key === "Escape") {
                                          e.preventDefault();
                                          skipBlurSaveRef.current = true;
                                          closeInlineEdit();
                                        }
                                      }}
                                      className="w-[5.5rem] mx-auto h-10 md:w-[5.5rem] md:h-10 rounded-xl border text-[10px] md:text-[11px] text-center bg-white text-black border-black/20 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-600 outline-none ring-2 ring-black/10 dark:ring-white/20"
                                      placeholder="0"
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!isParent) startInlineEdit(r, m.key);
                                      }}
                                      disabled={isParent}
                                      className={`w-[5.5rem] mx-auto h-10 md:w-[5.5rem] md:h-10 rounded-xl border text-[10px] md:text-[11px] flex items-center justify-center shadow-sm transition ${
                                        hasVal
                                          ? "bg-[#edaf7c] border-[#edaf7c]/90 text-black"
                                          : "bg-black/5 border-black/10 text-black/70 dark:bg-white/5 dark:border-neutral-700 dark:text-neutral-100"
                                      } ${isParent ? "cursor-default" : "cursor-pointer"}`}
                                    >
                                      {hasVal ? (
                                        <div className="flex flex-col items-center justify-center leading-tight">
                                          <span>{toFaDigits(formatMoney(val))}</span>
                                        </div>
                                      ) : (
                                        "—"
                                      )}
                                    </button>
                                  )}
                                </TD>
                              );
                            })}

                            <TD className="px-3 py-3 whitespace-nowrap text-center border-l border-r border-black/10 dark:border-neutral-700">
                              <span className="inline-flex items-center justify-center gap-1">
                                <span className="ltr">{toFaDigits(formatMoney(finalTotal || 0))}</span>
                              </span>
                            </TD>
                          </TR>
                        );
                      })}
                    </>
                  )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </TableWrap>

        {err && <div className="text-sm text-red-600 dark:text-red-400 mt-3">{err}</div>}

        <div className="mt-4 flex items-center gap-2 justify-end">
          <button
            onClick={exportExcel}
            disabled={loading || (active === "projects" && !projectId) || !(rowsToRender || []).length}
            className="h-10 w-14 grid place-items-center rounded-xl border border-black/15 hover:bg-black/5 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            aria-label="خروجی اکسل"
            title="خروجی اکسل"
          >
            <img src="/images/icons8-excel-50.png" alt="" className="w-5 h-5" />
          </button>

          <button
            onClick={onUpdate}
            disabled={saving || (active === "projects" && !projectId)}
            className="h-10 w-14 grid place-items-center rounded-xl bg-neutral-900 text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
            aria-label="بروزرسانی"
            title="بروزرسانی"
          >
            <img src="/images/icons/berozresani.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
          </button>
        </div>
      </Card>
    </>
  );
}
