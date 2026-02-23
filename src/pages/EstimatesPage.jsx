// برآورد هزینه
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";
import {
  hoverSelectableCrudTablePreset as tablePreset,
  getHoverSelectableRowClass,
} from "../components/ui/tablePresets.js";
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

  const formatDateTimeFa = useCallback(
    (dt) => {
      if (!dt) return "—";
      try {
        return toFaDigits(
          new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(dt)),
        );
      } catch {
        return toFaDigits(new Date(dt).toLocaleString("fa-IR"));
      }
    },
    [toFaDigits],
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

  const normalizeBudgetCode = useCallback(
    (code) => {
      const raw = String(code || "").trim();
      if (!raw) return "";
      if (active === "projects") return raw;
      const pre = (prefixOf(active) || "").toUpperCase();
      const re = pre ? new RegExp("^" + pre + "[\\-\\.]?\\s*", "i") : null;
      const noPrefix = re ? raw.replace(re, "") : raw;
      return toEnDigits(noPrefix).replace(/[^0-9.]/g, "");
    },
    [active, prefixOf, toEnDigits],
  );

  const isSameBudgetCode = useCallback(
    (a, b) => {
      const sa = String(a || "").trim();
      const sb = String(b || "").trim();
      if (!sa || !sb) return false;
      if (sa === sb) return true;
      const na = normalizeBudgetCode(sa);
      const nb = normalizeBudgetCode(sb);
      if (na && nb && na === nb) return true;
      const ca = coreOf(sa);
      const cb = coreOf(sb);
      return !!ca && ca === cb;
    },
    [normalizeBudgetCode, coreOf],
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

  const monthLabelByKey = useMemo(() => {
    const map = {};
    for (let i = 1; i <= 12; i += 1) map["m" + i] = monthNames[i - 1] || "m" + i;
    return map;
  }, [monthNames]);

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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyErr, setHistoryErr] = useState("");
  const [historyFetchedAt, setHistoryFetchedAt] = useState("");
  const [historyEvents, setHistoryEvents] = useState([]);

  const reqSeq = useRef(0);

  const parseDescMonths = useCallback((descRaw) => {
    let desc = descRaw ?? "";
    let lastMonths = {};
    if (desc && typeof desc === "string") {
      try {
        const parsed = JSON.parse(desc);
        if (parsed && typeof parsed === "object") {
          if (Object.prototype.hasOwnProperty.call(parsed, "desc")) {
            if (typeof parsed.desc === "string") desc = parsed.desc;
            else desc = "";
          }
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

  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [active, projectId]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil((displayRows.length || 0) / (pageSize || 1)));
    if (page > totalPages - 1) setPage(totalPages - 1);
  }, [displayRows.length, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalRows = displayRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / (pageSize || 1)));
  const startIdx = totalRows === 0 ? 0 : page * pageSize;
  const endIdx = Math.min(totalRows, startIdx + pageSize);
  const pageRows = displayRows.slice(startIdx, endIdx);

  const [selectedCodes, setSelectedCodes] = useState([]);
  const setSelected = useCallback((nextOrUpdater) => {
    setSelectedCodes((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const rawNext = typeof nextOrUpdater === "function" ? nextOrUpdater(prevList) : nextOrUpdater;
      return Array.from(
        new Set(
          (Array.isArray(rawNext) ? rawNext : [])
            .map((code) => String(code || "").trim())
            .filter(Boolean),
        ),
      );
    });
  }, []);

  const allRowCodes = useMemo(
    () =>
      (displayRows || [])
        .map((n) => String(n?.row?.code || "").trim())
        .filter(Boolean),
    [displayRows],
  );

  const visibleCodes = useMemo(
    () =>
      (pageRows || [])
        .map((n) => String(n?.row?.code || "").trim())
        .filter(Boolean),
    [pageRows],
  );

  const selectedSet = useMemo(
    () => new Set((selectedCodes || []).map((c) => String(c || "").trim())),
    [selectedCodes],
  );

  const selectedVisibleCount = useMemo(() => {
    if (!visibleCodes.length) return 0;
    return visibleCodes.reduce((acc, code) => (selectedSet.has(code) ? acc + 1 : acc), 0);
  }, [visibleCodes, selectedSet]);

  const allVisibleSelected = visibleCodes.length > 0 && selectedVisibleCount === visibleCodes.length;
  const someVisibleSelected = selectedVisibleCount > 0 && selectedVisibleCount < visibleCodes.length;

  const toggleRowSelect = (code) => {
    const sc = String(code || "").trim();
    if (!sc) return;
    setSelected((prev) => {
      const s = new Set((prev || []).map((x) => String(x)));
      if (s.has(sc)) s.delete(sc);
      else s.add(sc);
      return Array.from(s);
    });
  };

  const toggleSelectAllVisible = () => {
    if (!visibleCodes.length) return;
    if (allVisibleSelected) {
      setSelected((prev) => (prev || []).filter((code) => !visibleCodes.includes(String(code))));
      return;
    }
    setSelected((prev) => {
      const s = new Set((prev || []).map((x) => String(x)));
      visibleCodes.forEach((code) => s.add(String(code)));
      return Array.from(s);
    });
  };

  useEffect(() => {
    if (!allRowCodes.length) {
      if (selectedCodes.length) setSelected([]);
      return;
    }
    const valid = new Set(allRowCodes.map((c) => String(c)));
    setSelected((prev) => (prev || []).filter((code) => valid.has(String(code))));
  }, [allRowCodes]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!allRowCodes.length) {
      if (editingCodes.length) {
        setEditingCodes([]);
        setEditDraftByCode({});
      }
      return;
    }
    const valid = new Set(allRowCodes.map((c) => String(c)));
    setEditingCodes((prev) => (prev || []).filter((code) => valid.has(String(code))));
    setEditDraftByCode((prev) => {
      const next = { ...(prev || {}) };
      Object.keys(next).forEach((code) => {
        if (!valid.has(String(code))) delete next[code];
      });
      return next;
    });
  }, [allRowCodes]); // eslint-disable-line react-hooks/exhaustive-deps

  const [editingCodes, setEditingCodes] = useState([]);
  const [editDraftByCode, setEditDraftByCode] = useState({});
  const editingSet = useMemo(
    () => new Set((editingCodes || []).map((code) => String(code || "").trim())),
    [editingCodes],
  );

  const beginEdit = (row) => {
    const clickedCode = String(row?.code || "").trim();
    if (!clickedCode) return;

    const shouldEditSelected = selectedCodes.length > 1 && selectedSet.has(clickedCode);
    const targetCodes = shouldEditSelected ? selectedCodes.map((code) => String(code)) : [clickedCode];
    const targetSet = new Set(targetCodes);
    const drafts = {};
    const finalCodes = [];

    (rowsToRender || []).forEach((r) => {
      const code = String(r?.code || "").trim();
      if (!code || !targetSet.has(code)) return;
      drafts[code] = {
        code: active === "projects" ? code : normalizeBudgetCode(code) || code,
        name: String(r?.name || ""),
      };
      finalCodes.push(code);
    });

    if (!finalCodes.length) return;
    setEditingCodes(finalCodes);
    setEditDraftByCode(drafts);
    setErr("");
  };

  const cancelEdit = (code = null) => {
    if (code === null || code === undefined) {
      setEditingCodes([]);
      setEditDraftByCode({});
      return;
    }
    const sc = String(code).trim();
    setEditingCodes((prev) => (prev || []).filter((x) => String(x) !== sc));
    setEditDraftByCode((prev) => {
      if (!prev || !Object.prototype.hasOwnProperty.call(prev, sc)) return prev;
      const next = { ...prev };
      delete next[sc];
      return next;
    });
  };

  const onEditNameChange = (code, value) => {
    const sc = String(code || "").trim();
    if (!sc) return;
    setEditDraftByCode((prev) => ({
      ...(prev || {}),
      [sc]: {
        ...(prev?.[sc] || {}),
        name: value,
      },
    }));
  };

  const onEditCodeChange = (code, value) => {
    const sc = String(code || "").trim();
    if (!sc) return;
    const normalized = toEnDigits(value).replace(/[^0-9.]/g, "");
    setEditDraftByCode((prev) => ({
      ...(prev || {}),
      [sc]: {
        ...(prev?.[sc] || {}),
        code: normalized,
      },
    }));
  };

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

  const loadCentersForActive = useCallback(async () => {
    const r = await api(`/centers/${active}`);
    const items = Array.isArray(r?.items) ? r.items : [];
    return items
      .map((it) => ({
        id: it?.id,
        code: String(it?.code ?? it?.suffix ?? "").trim(),
        name: String(it?.name ?? it?.description ?? "").trim(),
      }))
      .filter((it) => it.id != null && it.code);
  }, [active]);

  const buildEstimatePayloadFromRow = useCallback(
    (row, code) => {
      const nextMonths = {};
      const merged = { ...(row?.lastMonths || {}), ...(row?.months || {}) };
      ALL_MONTH_KEYS.forEach((k) => {
        const v = Number(merged[k] || 0);
        if (v) nextMonths[k] = v;
      });

      const plainDesc = String(row?.desc || "").trim();
      const amount = Object.values(nextMonths).reduce((sum, v) => sum + Number(v || 0), 0);

      let description = null;
      if (plainDesc || Object.keys(nextMonths).length) {
        try {
          description = JSON.stringify({ desc: plainDesc || null, months: nextMonths });
        } catch {
          description = plainDesc || null;
        }
      }

      return {
        code: String(code || "").trim(),
        amount,
        description,
      };
    },
    [ALL_MONTH_KEYS],
  );

  const saveInlineRow = async (code) => {
    const targetCode = String(code || "").trim();
    const draft = editDraftByCode[targetCode];
    if (!targetCode || !draft) return;

    const targetName = String(draft?.name || "").trim();
    const nextCode = onlyDigitsDot(draft?.code || "");
    if (!targetName) {
      setErr("نام بودجه الزامی است.");
      return;
    }
    if (!nextCode) {
      setErr("کد بودجه الزامی است.");
      return;
    }

    setSaving(true);
    setErr("");
    let migrationErr = "";
    try {
      const centers = await loadCentersForActive();
      const target = centers.find((c) => isSameBudgetCode(c.code, targetCode));
      if (!target?.id) throw new Error("row_not_found_for_edit");

      await api(`/centers/${active}/${target.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          suffix: nextCode,
          description: targetName,
        }),
      });

      const codeChanged = String(nextCode) !== String(targetCode || "").trim();
      if (codeChanged) {
        try {
          const sourceRow = (rowsRef.current || []).find((r) => String(r?.code || "").trim() === targetCode);
          if (sourceRow) {
            const nextPayload = buildEstimatePayloadFromRow(sourceRow, nextCode);
            if (nextPayload.code) {
              await api("/budget-estimates", {
                method: "POST",
                body: JSON.stringify({
                  kind: active,
                  project_id: active === "projects" ? Number(projectId) : null,
                  rows: [nextPayload],
                }),
              });
            }
          }

          await api("/budget-estimates", {
            method: "DELETE",
            body: JSON.stringify({
              kind: active,
              project_id: active === "projects" ? Number(projectId) : null,
              codes: [targetCode],
            }),
          });
        } catch (ex) {
          migrationErr = ex?.message || "انتقال اطلاعات کد قبلی به کد جدید کامل نشد.";
        }
      }

      setRows((prev) =>
        (prev || []).map((r) => (String(r.code) === targetCode ? { ...r, code: nextCode, name: targetName } : r)),
      );
      if (nextCode !== targetCode) {
        setSelected((prev) => (prev || []).map((x) => (String(x) === targetCode ? nextCode : x)));
      }
      cancelEdit(targetCode);
    } catch (ex) {
      setErr(ex.message || "خطا در ذخیره ویرایش");
      setReloadTick((v) => v + 1);
    } finally {
      setSaving(false);
    }

    if (migrationErr) {
      setErr(migrationErr);
      setReloadTick((v) => v + 1);
    }
  };

  const buildHistoryEvents = useCallback(
    (historyByCode = {}, nameByCode = {}) => {
      const events = [];
      const keys = Object.keys(historyByCode || {});
      keys.forEach((code) => {
        const rawList = Array.isArray(historyByCode?.[code]) ? historyByCode[code] : [];
        if (!rawList.length) return;

        const sorted = rawList
          .map((h) => {
            const { desc, lastMonths } = parseDescMonths(h?.desc ?? h?.description ?? "");
            const cleanDesc = String(desc || "").trim();
            const normalizedDesc =
              cleanDesc.startsWith("{") && cleanDesc.includes("\"months\"") ? "" : cleanDesc;
            const months = {};
            ALL_MONTH_KEYS.forEach((k) => {
              const v = Number(lastMonths?.[k] || 0);
              if (v) months[k] = v;
            });
            return {
              code: String(code || "").trim(),
              name: String(nameByCode?.[code] || "").trim(),
              amount: Number(h?.amount || 0),
              desc: normalizedDesc,
              months,
              createdAt: h?.created_at || null,
            };
          })
          .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

        sorted.forEach((entry, index) => {
          const prev = index > 0 ? sorted[index - 1] : null;
          const beforeAmount = Number(prev?.amount || 0);
          const afterAmount = Number(entry?.amount || 0);
          const beforeDesc = String(prev?.desc || "").trim();
          const afterDesc = String(entry?.desc || "").trim();

          const changedMonths = ALL_MONTH_KEYS.filter((k) => {
            const a = Number(prev?.months?.[k] || 0);
            const b = Number(entry?.months?.[k] || 0);
            return a !== b;
          });

          const hasAnyDiff =
            !prev ||
            beforeAmount !== afterAmount ||
            beforeDesc !== afterDesc ||
            changedMonths.length > 0;
          if (!hasAnyDiff) return;

          let type = "update";
          if (!prev) type = "create";
          else if (!afterAmount && !afterDesc && Object.keys(entry?.months || {}).length === 0) type = "clear";

          events.push({
            type,
            code: entry.code,
            name: entry.name,
            createdAt: entry.createdAt,
            beforeAmount,
            afterAmount,
            beforeDesc,
            afterDesc,
            beforeMonths: prev?.months || {},
            afterMonths: entry.months || {},
            changedMonths,
          });
        });
      });

      events.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return events;
    },
    [ALL_MONTH_KEYS, parseDescMonths],
  );

  const openHistoryModal = async () => {
    if (active === "projects" && !projectId) return;
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryErr("");
    setHistoryEvents([]);
    try {
      const qs = new URLSearchParams();
      qs.set("kind", active);
      if (active === "projects") qs.set("project_id", String(projectId));
      qs.set("history", "1");
      qs.set("_", String(Date.now()));

      const [histRes, centers] = await Promise.all([
        api("/budget-estimates?" + qs.toString()),
        loadCentersForActive().catch(() => []),
      ]);

      const nameByCode = {};
      (rowsToRender || []).forEach((r) => {
        const c = String(r?.code || "").trim();
        if (!c) return;
        const nm = String(r?.name || "").trim();
        if (nm) nameByCode[c] = nm;
      });
      (centers || []).forEach((c) => {
        const code = String(c?.code || "").trim();
        const name = String(c?.name || "").trim();
        if (code && name && !nameByCode[code]) nameByCode[code] = name;
      });

      const events = buildHistoryEvents(histRes?.history || {}, nameByCode);
      setHistoryEvents(events);
      setHistoryFetchedAt(new Date().toISOString());
    } catch (ex) {
      setHistoryErr(ex.message || "history_failed");
    } finally {
      setHistoryLoading(false);
    }
  };

  const removeRows = async (codes) => {
    const uniqCodes = Array.from(
      new Set(
        (Array.isArray(codes) ? codes : [codes])
          .map((code) => String(code || "").trim())
          .filter(Boolean),
      ),
    );
    if (!uniqCodes.length) return;

    const confirmText =
      uniqCodes.length > 1 ? `حذف ${uniqCodes.length} ردیف انتخاب‌شده؟` : "حذف این ردیف؟";
    if (!window.confirm(confirmText)) return;

    const isTargetCode = (candidate) =>
      uniqCodes.some((c) => isSameBudgetCode(String(candidate || "").trim(), String(c || "").trim()));

    const deleteCodeSet = new Set();
    uniqCodes.forEach((c) => {
      const raw = String(c || "").trim();
      if (!raw) return;
      deleteCodeSet.add(raw);
      const normalized = normalizeBudgetCode(raw);
      if (normalized) deleteCodeSet.add(normalized);
    });
    const deleteCodes = Array.from(deleteCodeSet);

    setRows((prev) => (prev || []).filter((r) => !isTargetCode(r?.code)));
    setSelected((prev) => (prev || []).filter((code) => !isTargetCode(code)));
    setEditingCodes((prev) => (prev || []).filter((code) => !isTargetCode(code)));
    setEditDraftByCode((prev) => {
      const next = { ...(prev || {}) };
      Object.keys(next).forEach((code) => {
        if (isTargetCode(code)) delete next[String(code)];
      });
      return next;
    });

    try {
      setSaving(true);
      setErr("");

      await api("/budget-estimates", {
        method: "DELETE",
        body: JSON.stringify({
          kind: active,
          project_id: active === "projects" ? Number(projectId) : null,
          codes: deleteCodes,
        }),
      });

      const centers = await loadCentersForActive().catch(() => []);
      const centerIds = centers
        .filter((c) => isTargetCode(c.code))
        .map((c) => c.id)
        .filter((id) => id != null);

      if (centerIds.length) {
        await Promise.all(
          centerIds.map((id) =>
            api(`/centers/${active}/${id}`, {
              method: "DELETE",
            }),
          ),
        );
      }

      setReloadTick((v) => v + 1);
    } catch (ex) {
      setErr(ex.message || "delete_failed");
      setReloadTick((v) => v + 1);
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

  const exportExcel = useCallback(async () => {
    const activeLabel = tabs.find((t) => t.id === active)?.label || "";
    const projectLabel =
      active === "projects" ? (selectedProject ? `${selectedProject.code || ""} - ${selectedProject.name || ""}` : "") : "";
    const title = `\u0628\u0631\u0622\u0648\u0631\u062F \u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627${activeLabel ? ` - ${activeLabel}` : ""}`;
    const dash = "-";

    const headers = [
      "#",
      "\u06A9\u062F \u0628\u0648\u062F\u062C\u0647",
      "\u0646\u0627\u0645 \u0628\u0648\u062F\u062C\u0647",
      ...dynamicMonths.map((m) => String(m?.label || "").trim() || dash),
      "\u062C\u0645\u0639",
    ];

    const bodyRows = (allRowsForExport || []).map((node, idx) => {
      const r = node?.row || {};
      const depth = Math.max(0, Number(node?.depth || 0));
      const codeCell = String(renderCode(r.code) || "").trim() || dash;
      const indentMarker = depth > 0 ? `${"  ".repeat(depth)}\u21B3 ` : "";
      const nameCell = `${indentMarker}${String(r?.name || "").trim() || dash}`;

      const monthCells = dynamicMonths.map((m) => {
        const v = monthValueOfRow(r, m.key);
        return v ? toFaDigits(formatMoney(v)) : dash;
      });

      const rowTotal = finalTotalOfRow(r);
      return [
        toFaDigits(idx + 1),
        codeCell,
        nameCell,
        ...monthCells,
        rowTotal ? toFaDigits(formatMoney(rowTotal)) : dash,
      ];
    });

    const footerRow = [
      dash,
      dash,
      "\u062C\u0645\u0639 \u06A9\u0644",
      ...dynamicMonths.map((m) => {
        const v = totalsComputed[m.key];
        return v ? toFaDigits(formatMoney(v)) : dash;
      }),
      totalGrand ? toFaDigits(formatMoney(totalGrand)) : dash,
    ];

    const exportDate = new Date().toLocaleDateString("fa-IR");
    const metaRows = [
      [title],
      ...(active === "projects" ? [[`\u067E\u0631\u0648\u0698\u0647: ${projectLabel || dash}`]] : []),
      [`\u062A\u0627\u0631\u06CC\u062E \u062E\u0631\u0648\u062C\u06CC: ${exportDate}`],
    ];

    const hasRows = bodyRows.length > 0;
    const rowsSection = hasRows
      ? bodyRows
      : [[dash, dash, "\u0645\u0648\u0631\u062F\u06CC \u0628\u0631\u0627\u06CC \u0646\u0645\u0627\u06CC\u0634 \u0646\u06CC\u0633\u062A.", ...dynamicMonths.map(() => dash), dash]];

    const sheetData = [...metaRows, [], headers, ...rowsSection, footerRow];

    const xlsxMod = await import("xlsx");
    const XLSX = xlsxMod?.default || xlsxMod;

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws["!cols"] = [
      { wch: 7 },
      { wch: 20 },
      { wch: 44 },
      ...dynamicMonths.map(() => ({ wch: 16 })),
      { wch: 18 },
    ];

    const headerRowIndex = metaRows.length + 1;
    ws["!rows"] = Array.from({ length: sheetData.length }, (_, i) => {
      if (i < metaRows.length) return { hpt: 22 };
      if (i === metaRows.length) return { hpt: 8 };
      if (i === headerRowIndex) return { hpt: 20 };
      return { hpt: 18 };
    });

    const lastColIndex = headers.length - 1;
    ws["!merges"] = metaRows.map((_, i) => ({
      s: { r: i, c: 0 },
      e: { r: i, c: lastColIndex },
    }));

    const lastCol = XLSX.utils.encode_col(lastColIndex);
    const headerRowNum = headerRowIndex + 1;
    const lastRowNum = sheetData.length;
    ws["!autofilter"] = { ref: `A${headerRowNum}:${lastCol}${lastRowNum}` };

    const wb = XLSX.utils.book_new();
    wb.Workbook = wb.Workbook || {};
    wb.Workbook.Views = [{ RTL: true }];
    XLSX.utils.book_append_sheet(wb, ws, "Estimates");

    XLSX.writeFile(wb, `estimates-${active}.xlsx`, {
      bookType: "xlsx",
      compression: true,
    });
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

  const renderCenterCreateControls = (children = null) => (
    <div
      className="rounded-2xl ring-1 ring-black/10 border border-black/10 py-3 md:py-4 bg-white dark:bg-neutral-900 dark:ring-neutral-800 dark:border-neutral-800"
      dir="rtl"
    >
      <div className="px-[15px]">
        <form
          className="flex flex-col md:flex-row-reverse md:items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            addCenterRow();
          }}
        >
          <div className="md:w-auto md:translate-x-[2px]">
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

      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );

  const tableUi = tablePreset.table;
  const rowUi = tablePreset.row;
  const colCount = 4 + dynamicMonths.length + 1;
  const PagerBtn = ({ disabled, onClick, direction }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-10 w-10 grid place-items-center rounded-xl bg-transparent
                 hover:bg-black/5 active:bg-black/10 disabled:opacity-40 disabled:cursor-not-allowed
                 dark:hover:bg-white/10 dark:active:bg-white/15"
      aria-label={direction === "prev" ? "صفحه قبل" : "صفحه بعد"}
      title={direction === "prev" ? "صفحه قبل" : "صفحه بعد"}
    >
      {direction === "prev" ? (
        <svg className="w-5 h-5 text-black/70 dark:text-neutral-200" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M10.7 6.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 1 1-1.4-1.4L15.29 12 10.7 7.7a1 1 0 0 1 0-1.4z"
          />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-black/70 dark:text-neutral-200" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M13.3 17.7a1 1 0 0 1-1.4 0l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 1 1 1.4 1.4L8.71 12l4.59 4.3a1 1 0 0 1 0 1.4z"
          />
        </svg>
      )}
    </button>
  );

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
          {renderCenterCreateControls(
            <TableWrap>
              <div className={tableUi.outer}>
                <div className={tableUi.innerPad}>
                  <div className={`${tableUi.frame} shadow-sm`}>
                    <div className="max-h-[520px] overflow-auto">
                      <table
                        className={`${tableUi.table} table-fixed text-[12px] md:text-[13px] min-w-[900px] lg:min-w-[1020px]`}
                        dir="rtl"
                      >
                    <THead>
                      <tr className={`sticky top-0 z-20 ${tableUi.headRow}`}>
                        <TH className={`${tablePreset.columns.select} ${tableUi.th}`}>
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
                        <TH className={`${tablePreset.columns.index} ${tableUi.th}`}>#</TH>
                        <TH className={`w-36 md:w-40 ${tableUi.th}`}>
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
                        <TH className={`w-32 md:w-40 ${tableUi.th}`}>نام بودجه</TH>
                    {dynamicMonths.map((m) => (
                          <TH key={m.key} className={`w-20 md:w-24 px-0 ${tableUi.th}`}>
                        {m.label}
                      </TH>
                    ))}
                        <TH className={`w-24 md:w-28 border-l border-r border-black/10 dark:border-neutral-700 ${tableUi.th}`}>
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

                    <tbody className={tableUi.body}>
                  {loading ? (
                    <TR>
                          <TD colSpan={colCount} className={tableUi.emptyRow}>
                        در حال بارگذاری…
                      </TD>
                    </TR>
                  ) : (displayRows || []).length === 0 ? (
                    <TR>
                          <TD colSpan={colCount} className={tableUi.emptyRow}>
                        {active === "projects" && !projectId ? "ابتدا پروژه را انتخاب کنید" : "موردی یافت نشد."}
                      </TD>
                    </TR>
                  ) : (
                    <>
                      <TR className="text-center bg-black/[0.04] font-semibold dark:bg-white/10">
                        <TD className="px-2 py-3 border-b border-black/10 dark:border-neutral-800">-</TD>
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

                      {(pageRows || []).map((node, idx) => {
                        const r = node.row;
                        const code = r.code;
                        const rowCode = String(code || "").trim();
                        const isSelected = rowCode ? selectedSet.has(rowCode) : false;
                        const shouldDeleteSelectedOnAction = isSelected && selectedCodes.length > 1;
                        const rowIsEditing = rowCode ? editingSet.has(rowCode) : false;
                        const rowDraft = rowCode
                          ? (editDraftByCode[rowCode] || { code: active === "projects" ? rowCode : normalizeBudgetCode(rowCode) || rowCode, name: String(r?.name || "") })
                          : { code: "", name: String(r?.name || "") };
                        const isParent = !!code && !hierarchyMaps.isLeafByCode[r.code];
                        const hasChildren = !!node.hasChildren || isParent;
                        const mainReadonlyRow = isParent;
                        const codeTextClass = mainReadonlyRow
                          ? "text-[13px] md:text-[15px] font-semibold"
                          : (node.depth ? "text-[11px] md:text-xs" : "text-xs md:text-[13px]");
                        const nameCellTextClass = mainReadonlyRow
                          ? "text-[12px] md:text-[14px] font-semibold"
                          : (node.depth ? "text-[10px] md:text-[12px]" : "text-[11px] md:text-[13px]");
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
                          <TR key={code || idx} className={getHoverSelectableRowClass(isSelected)}>
                            <TD className="px-2 py-3">
                              <input
                                type="checkbox"
                                className={rowUi.checkbox}
                                checked={isSelected}
                                disabled={!rowCode}
                                onChange={() => toggleRowSelect(rowCode)}
                                aria-label="انتخاب ردیف"
                                title="انتخاب ردیف"
                              />
                            </TD>
                            <TD className="px-2 py-3">{toFaDigits(startIdx + idx + 1)}</TD>

                            <TD className={`px-2 py-3 whitespace-nowrap ${rowIsEditing ? "text-center" : "text-right"}`}>
                              <div
                                className={`inline-flex items-center ${rowIsEditing ? "justify-center gap-2" : "justify-end gap-1 flex-row-reverse"}`}
                                style={!rowIsEditing && shiftX ? { transform: `translateX(${shiftX}px)` } : undefined}
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
                                {rowIsEditing ? (
                                  active === "projects" ? (
                                    <input
                                      className="h-10 w-32 rounded-xl px-2 text-center border border-black/15 bg-white text-black font-mono outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                                      value={rowDraft.code}
                                      onChange={(e) => onEditCodeChange(rowCode, e.target.value)}
                                      spellCheck={false}
                                      autoFocus
                                    />
                                  ) : (
                                    <div className="inline-flex h-10 items-center rounded-xl overflow-hidden border border-black/15 bg-white text-black ltr dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700">
                                      <span className="px-2.5 h-full inline-flex items-center font-mono select-none bg-black/[0.04] ring-1 ring-black/10 dark:bg-neutral-900 dark:ring-neutral-800">
                                        {visualPrefix(active)}
                                      </span>
                                      <input
                                        className="w-24 px-2 h-full text-center font-mono outline-none bg-transparent focus:ring-2 focus:ring-black/10 dark:focus:ring-neutral-600/50"
                                        value={rowDraft.code}
                                        onChange={(e) => onEditCodeChange(rowCode, e.target.value)}
                                        spellCheck={false}
                                        autoFocus
                                      />
                                    </div>
                                  )
                                ) : (
                                  <span className={`ltr ${codeTextClass}`}>
                                    {renderCode(code)}
                                  </span>
                                )}
                              </div>
                            </TD>

                            <TD
                              className={`px-2 py-3 text-right break-words max-w-[180px] ${nameCellTextClass}`}
                            >
                              {rowIsEditing ? (
                                <input
                                  className="w-full h-10 rounded-xl px-3 text-right border border-black/15 bg-white text-black outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                                  value={rowDraft.name}
                                  onChange={(e) => onEditNameChange(rowCode, e.target.value)}
                                  placeholder="نام بودجه..."
                                />
                              ) : (
                                <div style={{ transform: shiftX ? `translateX(${shiftX}px)` : undefined }}>{r.name || "—"}</div>
                              )}
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
                              <div className="relative flex min-h-[34px] items-center justify-center">
                                <span
                                  className={`inline-flex items-center justify-center gap-1 transition-opacity ${
                                    rowIsEditing || isSelected
                                      ? "opacity-0 pointer-events-none"
                                      : "opacity-100 group-hover:opacity-0 group-hover:pointer-events-none"
                                  }`}
                                >
                                  <span className="ltr">{toFaDigits(formatMoney(finalTotal || 0))}</span>
                                </span>

                                <div
                                  className={`absolute inset-0 flex items-center justify-center gap-1 transition-opacity ${
                                    rowIsEditing || isSelected
                                      ? "opacity-100 pointer-events-auto"
                                      : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
                                  }`}
                                >
                                  {rowIsEditing ? (
                                    <>
                                      <RowActionIconBtn
                                        action="save"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          saveInlineRow(rowCode);
                                        }}
                                        size={34}
                                        iconSize={15}
                                      />
                                      <RowActionIconBtn
                                        action="cancel"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          cancelEdit(rowCode);
                                        }}
                                        size={34}
                                        iconSize={14}
                                      />
                                    </>
                                  ) : (
                                    <>
                                      <RowActionIconBtn
                                        action="edit"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          beginEdit(r);
                                        }}
                                        size={34}
                                        iconSize={15}
                                      />
                                      <RowActionIconBtn
                                        action="delete"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          if (shouldDeleteSelectedOnAction) {
                                            removeRows(selectedCodes);
                                            return;
                                          }
                                          removeRows([rowCode]);
                                        }}
                                        size={34}
                                        iconSize={16}
                                      />
                                    </>
                                  )}
                                </div>
                              </div>
                            </TD>
                          </TR>
                        );
                      })}
                    </>
                  )}
                      </tbody>
                    </table>
                    </div>

                    <div className="border-t border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                      <div className="px-3 py-2 flex items-center justify-between gap-3" dir="rtl">
                        <div className="flex items-center gap-2">
                          <PagerBtn
                            direction="prev"
                            disabled={page <= 0}
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                          />
                          <PagerBtn
                            direction="next"
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                          />
                          <div className="text-sm text-black/70 dark:text-neutral-300">
                            {totalRows === 0
                              ? "۰ از ۰"
                              : `${toFaDigits(startIdx + 1)}–${toFaDigits(endIdx)} از ${toFaDigits(totalRows)}`}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-black/70 dark:text-neutral-300">تعداد در هر صفحه:</span>
                          <select
                            value={pageSize}
                            onChange={(e) => {
                              const v = Number(e.target.value) || 25;
                              setPageSize(v);
                              setPage(0);
                            }}
                            className="h-10 rounded-xl px-3 bg-white text-black border border-black/15
                                   dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                          >
                            <option value={25}>۲۵</option>
                            <option value={50}>۵۰</option>
                            <option value={100}>۱۰۰</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TableWrap>
          )}
        </div>

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
            onClick={openHistoryModal}
            disabled={historyLoading || (active === "projects" && !projectId)}
            className="h-10 px-3 inline-flex items-center justify-center gap-2 rounded-xl border border-black/15 hover:bg-black/5 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            aria-label="تاریخچه"
            title="تاریخچه"
          >
            <img src="/images/icons/gozareshha.svg" alt="" className="w-4 h-4 dark:invert" />
            <span className="text-xs">تاریخچه</span>
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

        {historyOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-2 sm:px-4">
            <div className="absolute inset-0 bg-black/40 dark:bg-neutral-950/70" onClick={() => setHistoryOpen(false)} />
            <div
              className="relative w-full max-w-[98vw] sm:max-w-7xl max-h-[92vh] overflow-auto bg-white rounded-3xl shadow-2xl ring-1 ring-black/10 p-4 sm:p-6 text-black dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <div className="text-sm sm:text-base font-semibold">تاریخچه تغییرات</div>
                  <div className="text-[11px] sm:text-xs text-black/60 dark:text-neutral-300 mt-1">
                    آخرین بروزرسانی: {historyFetchedAt ? formatDateTimeFa(historyFetchedAt) : "-"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  className="h-9 w-9 grid place-items-center rounded-xl border border-black/15 hover:bg-black/5 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  <img src="/images/icons/bastan.svg" alt="" className="w-4 h-4 dark:invert" />
                </button>
              </div>

              {historyLoading ? (
                <div className="text-sm text-center py-10">در حال بارگذاری تاریخچه...</div>
              ) : historyErr ? (
                <div className="text-sm text-red-600 dark:text-red-400 py-4">{historyErr}</div>
              ) : historyEvents.length === 0 ? (
                <div className="text-sm text-center py-10">تاریخچه‌ای یافت نشد.</div>
              ) : (
                <div className="overflow-auto rounded-2xl ring-1 ring-black/10 dark:ring-neutral-800">
                  <table className="w-full min-w-[1120px] text-xs sm:text-sm [&_th]:text-center [&_td]:text-center" dir="rtl">
                    <thead className="bg-black/[0.06] dark:bg-white/10 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-3">#</th>
                        <th className="px-2 py-3">تاریخ/ساعت</th>
                        <th className="px-2 py-3">کد بودجه</th>
                        <th className="px-2 py-3">نام بودجه</th>
                        <th className="px-2 py-3">نوع</th>
                        <th className="px-2 py-3">قبل</th>
                        <th className="px-2 py-3">بعد</th>
                        <th className="px-2 py-3">جزئیات تغییر ماه‌ها</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyEvents.map((ev, idx) => {
                        const typeLabel =
                          ev.type === "create" ? "ایجاد" : ev.type === "clear" ? "حذف/صفر" : "ویرایش";
                        return (
                          <tr
                            key={`${ev.code}-${ev.createdAt || idx}-${idx}`}
                            className="border-t border-black/10 dark:border-neutral-800 odd:bg-white even:bg-black/[0.02] dark:odd:bg-neutral-900 dark:even:bg-neutral-800/30"
                          >
                            <td className="px-2 py-3">{toFaDigits(idx + 1)}</td>
                            <td className="px-2 py-3 whitespace-nowrap">{formatDateTimeFa(ev.createdAt)}</td>
                            <td className="px-2 py-3 ltr">{toFaDigits(renderCode(ev.code))}</td>
                            <td className="px-2 py-3">{ev.name || "-"}</td>
                            <td className="px-2 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10">
                                {typeLabel}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-right align-top">
                              <div className="space-y-1 leading-6 rounded-xl p-2 bg-black/[0.03] dark:bg-white/[0.04]">
                                <div>
                                  <span className="text-black/60 dark:text-neutral-300">جمع:</span>{" "}
                                  <span className="ltr">{toFaDigits(formatMoney(ev.beforeAmount || 0))}</span>
                                </div>
                                <div>
                                  <span className="text-black/60 dark:text-neutral-300">شرح:</span>{" "}
                                  <span>{ev.beforeDesc || "-"}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-3 text-right align-top">
                              <div className="space-y-1 leading-6 rounded-xl p-2 bg-black/[0.03] dark:bg-white/[0.04]">
                                <div>
                                  <span className="text-black/60 dark:text-neutral-300">جمع:</span>{" "}
                                  <span className="ltr">{toFaDigits(formatMoney(ev.afterAmount || 0))}</span>
                                </div>
                                <div>
                                  <span className="text-black/60 dark:text-neutral-300">شرح:</span>{" "}
                                  <span>{ev.afterDesc || "-"}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-3 text-right align-top">
                              {ev.changedMonths.length === 0 ? (
                                <span>-</span>
                              ) : (
                                <div className="space-y-1 leading-6 rounded-xl p-2 bg-black/[0.03] dark:bg-white/[0.04]">
                                  {ev.changedMonths.map((mKey) => (
                                    <div key={mKey}>
                                      <span className="text-black/60 dark:text-neutral-300">{monthLabelByKey[mKey] || mKey}:</span>{" "}
                                      <span className="ltr">{toFaDigits(formatMoney(ev.beforeMonths?.[mKey] || 0))}</span>
                                      <span className="px-1">→</span>
                                      <span className="ltr">{toFaDigits(formatMoney(ev.afterMonths?.[mKey] || 0))}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}


      </Card>
    </>
  );
}
