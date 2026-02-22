// src/pages/BudgetAllocationPage.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card } from "../components/ui/Card";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";
import {
  baseCurrenciesTablePreset as tablePreset,
  hoverSelectableRowPreset,
  getHoverSelectableRowClass,
} from "../components/ui/tablePresets";
import { usePageAccess } from "../hooks/usePageAccess";

// تب‌ها به‌صورت ثابت بیرون کامپوننت
const ALLOC_TABS = [
  { id: "office", label: "دفتر مرکزی", prefix: "OB" },
  { id: "site", label: "سایت", prefix: "SB" },
  { id: "finance", label: "مالی", prefix: "FB" },
  { id: "cash", label: "نقدی", prefix: "CB" },
  { id: "capex", label: "سرمایه‌ای", prefix: "IB" },
  { id: "projects", label: "پروژه‌ها", prefix: "" },
];

const PAGE_KEY = "BudgetAllocationPage";

function BudgetAllocationPage() {
  const [active, setActive] = useState("office"); // office|site|finance|cash|capex|projects

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
    if (!res.ok) {
      throw new Error(data?.error || data?.message || "request_failed");
    }
    return data;
  }

  const { me, loading: accessLoading, canAccessPage, allowedTabs } = usePageAccess(PAGE_KEY, ALLOC_TABS);

  const tabs = useMemo(() => {
    if (!allowedTabs) return [];
    return ALLOC_TABS.filter((t) => allowedTabs.includes(t.id));
  }, [allowedTabs]);

  useEffect(() => {
    if (!tabs.length) return;
    if (!tabs.some((t) => t.id === active)) setActive(tabs[0].id);
  }, [tabs, active]);

  const prefixOf = useCallback(
    (k) => tabs.find((t) => t.id === k)?.prefix || "",
    [tabs]
  );

  const renderCode = useCallback((code) => {
    if (active === "projects") return code || "—";
    const pref = prefixOf(active);
    let raw = String(code || "").trim();
    if (pref) {
      const re = new RegExp("^" + pref + "[\\-\\.]?", "i");
      raw = raw.replace(re, "").replace(/^[-.]/, "");
    }
    return (pref ? pref + "-" : "") + raw;
  }, [active, prefixOf]);


  const todayFa = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        dateStyle: "medium",
      }).format(new Date());
    } catch {
      return new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    }
  }, []);

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");

  const selectedProject = useMemo(
    () => (projects || []).find((p) => String(p.id) === String(projectId)),
    [projects, projectId]
  );

  const isTopProjectCode = (code) => {
  const c = toEnDigits(String(code || "")).trim();
  return /^\d{3}$/.test(c);
};

const normalizeTopProject = (p) => {
  return {
    id: p?.id == null ? null : String(p.id),
    code: toEnDigits(String(p?.code ?? "")).trim(), // ✅ کد واقعی بدون بریدن
    name: p?.name == null ? "" : String(p.name).trim(),
    isActive: p?.isActive !== false, // ✅ مثل صفحه پروژه‌ها
  };
};


  // پروژه‌ها از سرور
  useEffect(() => {
  if (canAccessPage !== true) return;

  let alive = true;

  (async () => {
    try {
      // ✅ فقط از پروژه‌ها (صفحه پروژه‌ها) + فقط فعال‌ها
      const r = await api("/projects?isActive=true");
      if (!alive) return;

      // ✅ فقط parse (نه fallback به مسیرهای دیگر)
      const raw = Array.isArray(r) ? r : Array.isArray(r?.items) ? r.items : [];

    const clean = (raw || [])
  .filter((p) => p && typeof p === "object" && !Array.isArray(p))
  .map(normalizeTopProject)
  .filter((p) => p && p.id != null)
  .filter((p) => p.isActive === true)
  .filter((p) => isTopProjectCode(p.code)); // ✅ دقیقاً مثل ProjectsPage

// ✅ حذف تکراری بر اساس id (نه code)
const byId = new Map();
for (const p of clean) {
  const k = String(p.id);
  if (!byId.has(k)) byId.set(k, p);
}

setProjects(Array.from(byId.values()));

    } catch {
      if (!alive) return;
      setProjects([]);
    }
  })();

  return () => {
    alive = false;
  };
}, [canAccessPage]); // eslint-disable-line react-hooks/exhaustive-deps

 const sortedProjects = useMemo(() => {
  return (projects || [])
    .slice()
    .sort((a, b) =>
      String(b?.code || "").localeCompare(String(a?.code || ""), "fa", {
        numeric: true,
        sensitivity: "base",
      })
    );
}, [projects]);

  const [totals, setTotals] = useState({}); // { code: totalAlloc }
  const [historyByCode, setHistoryByCode] = useState({}); // { code: [...] }

  const [rows, setRows] = useState([]); // [{code,name,lastAmount,totalAlloc,allocRaw,desc}]
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedCodes, setSelectedCodes] = useState([]);

  const moneyRefs = useRef({});
  const selectAllRef = useRef(null);

  const [codeSortDir, setCodeSortDir] = useState("asc");
  const [openCodes, setOpenCodes] = useState({});

  useEffect(() => {
    setOpenCodes({});
  }, [active, projectId]);

  useEffect(() => {
    setSelectedCodes([]);
  }, [active, projectId]);

  // ===== Helpers: تبدیل اعداد =====
  const formatMoney = (n) => {
    if (n === null || n === undefined) return "";
    const sign = n < 0 ? "-" : "";
    const s = String(Math.abs(Number(n) || 0));
    return sign + s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const toFaDigits = useCallback(
    (s) => String(s ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]),
    []
  );

  const toEnDigits = useCallback(
    (s) =>
      String(s || "")
        .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
        .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)),
    []
  );

  const parseMoney = (s) => {
    if (s == null) return 0;
    const sign = /^\s*-/.test(String(s)) ? -1 : 1;
    const d = toEnDigits(String(s)).replace(/[^\d]/g, "");
    if (!d) return 0;
    return sign * parseInt(d, 10);
  };

  const coreOf = useCallback(
    (s) => {
      const raw = toEnDigits(String(s || "")).trim();
      const noPrefix = raw.replace(/^[A-Za-z]+[^0-9]*/, "");
      const normalized = noPrefix.replace(/[^0-9.]+/g, ".");
      return normalized.replace(/\.+/g, ".").replace(/^\./, "").replace(/\.$/, "");
    },
    [toEnDigits]
  );

  const formatDateTimeFa = (dt) => {
    try {
      return toFaDigits(
        new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(dt))
      );
    } catch {
      return toFaDigits(new Date(dt).toLocaleString("fa-IR"));
    }
  };

  // ===== نمایش کد بودجه در حالت پروژه با پیشوند کد پروژه (نمایشی، بدون تغییر منطق ذخیره) =====
  const renderDisplayBudgetCode = useCallback(
    (code) => renderCode(code),
    [renderCode]
  );

  const budgetCodeHeader = useMemo(() => {
    if (active === "projects") return "کد بودجه (پروژه)";
    return "کد بودجه";
  }, [active]);

  const getNextSerial = async () => {
    const qs = new URLSearchParams();
    qs.set("kind", active);
    if (active === "projects" && projectId)
      qs.set("project_id", String(projectId));
    qs.set("_", String(Date.now()));
    const r = await api("/budget-allocations/next?" + qs.toString());
    return r || {};
  };

  // ===== لود داده‌ها از سرور =====
  useEffect(() => {
    if (canAccessPage !== true) return;
    if (active === "projects" && !projectId) {
      setRows([]);
      return;
    }
    if (active === "projects" && !selectedProject) {
      setRows([]);
      return;
    }
    let abort = false;
    (async () => {
      setErr("");
      setLoading(true);
      try {
        const qs1 = new URLSearchParams();
        qs1.set("kind", active);
        if (active === "projects" && projectId)
          qs1.set("project_id", String(projectId));
        qs1.set("_", String(Date.now()));

        let items = [];

        if (active === "projects") {
          const [rEst, rCenters] = await Promise.all([
            api("/budget-estimates?" + qs1.toString()).catch(() => ({ items: [] })),
            api("/centers/projects").catch(() => ({ items: [] })),
          ]);

          const estItems = Array.isArray(rEst?.items) ? rEst.items : [];
          const centersRaw = rCenters?.items || rCenters?.centers || rCenters?.data || [];
          const centersList = Array.isArray(centersRaw) ? centersRaw : [];

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
              center_desc: String(c?.description ?? c?.name ?? ""),
              last_amount: 0,
            });
          }

          for (const it of estItems) {
            const code = String(it?.code ?? "").trim();
            if (!code) continue;
            const cCore = coreOf(code);
            if (pCore && !(cCore === pCore || cCore.startsWith(pCore + "."))) continue;
            const prev = byCode.get(code) || { code, center_desc: "", last_amount: 0 };
            byCode.set(code, {
              ...prev,
              center_desc: prev.center_desc || String(it?.center_desc ?? it?.name ?? ""),
              last_amount: Number(it?.last_amount ?? it?.amount ?? prev.last_amount ?? 0),
            });
          }

          if (!byCode.size && selectedProject?.code) {
            const code = String(selectedProject.code || "").trim();
            byCode.set(code, {
              code,
              center_desc: String(selectedProject?.name || "").trim(),
              last_amount: 0,
            });
          }

          items = Array.from(byCode.values());
        } else {
          // حالت‌های غیر پروژه مثل قبل
          try {
            const est = await api("/budget-estimates?" + qs1.toString());
            items = Array.isArray(est?.items) ? est.items.slice() : [];
          } catch {
            items = [];
          }

          if (items.length === 0) {
            try {
              const centers = await api(`/centers/${active}`);
              const raw = centers?.items || centers?.centers || centers?.data || [];
              const list = Array.isArray(raw) ? raw : [];
              items = list
                .map((c) => ({
                  code: c?.code || c?.center_code || c?.suffix || "",
                  center_desc: c?.center_desc || c?.description || c?.name || "",
                  last_amount: Number(c?.last_amount || 0),
                }))
                .filter((x) => String(x.code || "").trim());
            } catch {
              items = [];
            }
          }
        }

        const qs2 = new URLSearchParams();
        qs2.set("kind", active);
        if (active === "projects" && projectId)
          qs2.set("project_id", String(projectId));
        qs2.set("_", String(Date.now()));

        let sum = { totals: {} };
        try {
          sum = await api("/budget-allocations/summary?" + qs2.toString());
        } catch {
          sum = { totals: {} };
        }

        let histMap = {};
        try {
          const qs3 = new URLSearchParams();
          qs3.set("kind", active);
          if (active === "projects" && projectId)
            qs3.set("project_id", String(projectId));
          qs3.set("_", String(Date.now()));
          const hist = await api("/budget-allocations/history?" + qs3.toString());
          histMap = hist?.history || {};
        } catch {
          histMap = {};
        }

        if (abort) return;

        const sorted = (items || [])
          .slice()
          .sort((a, b) =>
            String(a.code).localeCompare(String(b.code), "fa", {
              numeric: true,
              sensitivity: "base",
            })
          );

        const built = sorted.map((s) => ({
          code: s.code,
          name: s.center_desc || "",
          lastAmount: s.last_amount || 0,
          totalAlloc: (sum?.totals || {})[s.code] || 0,
          allocRaw: 0,
          desc: "",
        }));

        setTotals(sum?.totals || {});
        setHistoryByCode(histMap);
        setRows(built);
      } catch (ex) {
        if (!abort) setErr(ex.message || "خطا در بارگذاری");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [active, projectId, selectedProject, refreshKey, canAccessPage, coreOf]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const kick = () => {
      setRefreshKey((x) => x + 1);
    };
    const onVis = () => {
      if (!document.hidden) kick();
    };
    window.addEventListener("focus", kick);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", kick);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const onAllocChange = (code, v) => {
    const rawVal = parseMoney(v);
    setRows((prev) =>
      prev.map((r) => (r.code === code ? { ...r, allocRaw: rawVal } : r))
    );
    requestAnimationFrame(() => {
      const el = moneyRefs.current[code];
      if (el) {
        el.focus();
        const txt = el.value;
        el.setSelectionRange(txt.length, txt.length);
      }
    });
  };

  const onDescChange = (code, v) => {
    setRows((prev) =>
      prev.map((r) => (r.code === code ? { ...r, desc: v } : r))
    );
  };

  const removeRows = async (codesInput) => {
    const codes = Array.from(
      new Set(
        (Array.isArray(codesInput) ? codesInput : [codesInput])
          .map((x) => String(x || "").trim())
          .filter(Boolean)
      )
    );
    if (!codes.length) return;

    try {
      setErr("");
      const removedByCode = {};
      let removedAny = false;

      for (const code of codes) {
        const hist = historyByCode?.[code] || [];
        if (hist.length === 0) continue;

        const last = hist
          .slice()
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          .pop();
        const lastAmt = Number(last?.amount || 0);
        if (!lastAmt) continue;

        const next = await getNextSerial();
        const serial = next?.serial || "";
        const date_jalali = next?.date_jalali || todayFa;

        const body = {
          serial,
          date_jalali,
          project_id:
            active === "projects" ? (projectId ? Number(projectId) : null) : null,
          project_name:
            active === "projects" && selectedProject ? selectedProject.name : null,
          kind: active,
          rows: [{ code, alloc: -lastAmt, desc: "حذف آخرین تخصیص" }],
        };
        await api("/budget-allocations", {
          method: "POST",
          body: JSON.stringify(body),
        });

        removedAny = true;
        removedByCode[code] = Number(removedByCode[code] || 0) + lastAmt;
      }

      if (!removedAny) {
        setErr("سابقه‌ای برای حذف یافت نشد.");
        return;
      }

      setTotals((prev) => {
        const next = { ...prev };
        Object.entries(removedByCode).forEach(([code, amt]) => {
          next[code] = Number(next[code] || 0) - Number(amt || 0);
        });
        return next;
      });
      setSelectedCodes((prev) => prev.filter((code) => !codes.includes(code)));
      setRefreshKey((x) => x + 1);
    } catch (ex) {
      setErr(ex.message || "خطا در حذف آخرین تخصیص");
    }
  };

  const [saving, setSaving] = useState(false);
  const [modalMsg, setModalMsg] = useState(null);
  const [descModal, setDescModal] = useState({
    open: false,
    code: "",
    name: "",
    value: "",
  });

  const onSubmit = async () => {
    try {
      setSaving(true);
      setErr("");
      const payloadRows = rows
        .filter((r) => (r.allocRaw || 0) !== 0)
        .map((r) => ({
          code: r.code,
          alloc: Number(r.allocRaw || 0),
          desc: (r.desc || "").trim() || null,
        }));

      if (payloadRows.length === 0) {
        setModalMsg({ ok: true, msg: "چیزی برای ثبت انتخاب نشده است." });
        return;
      }

      const viol = payloadRows.find((pr) => {
        const r = rows.find((x) => x.code === pr.code);
        const newTotal = Number(r?.totalAlloc || 0) + Number(pr.alloc || 0);
        return newTotal > Number(r?.lastAmount || 0);
      });
      if (viol) {
        setErr("مبلغ تخصیص از آخرین برآورد این کُد بیشتر می‌شود.");
        setSaving(false);
        return;
      }

      const next = await getNextSerial();
      const serial = next?.serial || "";
      const date_jalali = next?.date_jalali || todayFa;

      const body = {
        serial,
        date_jalali,
        project_id:
          active === "projects" ? (projectId ? Number(projectId) : null) : null,
        project_name:
          active === "projects" && selectedProject ? selectedProject.name : null,
        kind: active,
        rows: payloadRows,
      };
      await api("/budget-allocations", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          totalAlloc:
            Number(r.totalAlloc || 0) +
            Number(payloadRows.find((p) => p.code === r.code)?.alloc || 0),
          allocRaw: 0,
          desc: "",
        }))
      );
      setRefreshKey((x) => x + 1);
      setModalMsg({ ok: true, msg: `ثبت با موفقیت انجام شد. سریال: ${serial}` });
    } catch (ex) {
      setModalMsg({ ok: false, msg: ex.message || "خطا از سرور" });
    } finally {
      setSaving(false);
    }
  };

  const flatRowsToRender = useMemo(() => {
    let base = rows || [];
    const sorted = base.slice().sort((a, b) => {
      const ac = renderDisplayBudgetCode(a.code);
      const bc = renderDisplayBudgetCode(b.code);
      const cmp = String(ac || "").localeCompare(String(bc || ""), "fa", {
        numeric: true,
        sensitivity: "base",
      });
      return codeSortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, codeSortDir, active, coreOf]); // eslint-disable-line react-hooks/exhaustive-deps

  const hierarchyMaps = useMemo(() => {
    if (active !== "projects") {
      return { coreByCode: {}, hasChildrenByCode: {}, isLeafByCode: {} };
    }

    const base = flatRowsToRender || [];
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
    Object.keys(coreByCode).forEach((code) => {
      isLeafByCode[code] = !hasChildrenByCode[code];
    });

    return { coreByCode, hasChildrenByCode, isLeafByCode };
  }, [active, flatRowsToRender, coreOf]);

  const displayRows = useMemo(() => {
    if (active !== "projects") {
      return (flatRowsToRender || []).map((r, index) => ({
        row: r,
        depth: 0,
        key: String(r?.code || `__idx_${index}`),
        core: coreOf(r?.code),
        hasChildren: false,
      }));
    }

    const base = flatRowsToRender || [];
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

    nodes.forEach((n) => {
      n.hasChildren = !!(n.core && childrenMap.has(n.core));
    });

    const sortFn = (a, b) => {
      const ca = renderDisplayBudgetCode(a.row.code);
      const cb = renderDisplayBudgetCode(b.row.code);
      const cmp = String(ca || "").localeCompare(String(cb || ""), "fa", {
        numeric: true,
        sensitivity: "base",
      });
      return codeSortDir === "asc" ? cmp : -cmp;
    };

    const roots = nodes.filter((n) => !n.parentCore || !byCore.has(n.parentCore));
    roots.sort(sortFn);
    for (const list of childrenMap.values()) list.sort(sortFn);

    const out = [];
    const visit = (node, depth) => {
      out.push({
        row: node.row,
        depth,
        key: node.key,
        core: node.core,
        hasChildren: node.hasChildren,
      });
      if (!node.hasChildren) return;
      const toggleKey = node.core || node.key;
      const isOpen = !!openCodes[toggleKey];
      if (!isOpen) return;
      const children = node.core ? childrenMap.get(node.core) || [] : [];
      children.forEach((child) => visit(child, depth + 1));
    };

    roots.forEach((r) => visit(r, 0));
    return out;
  }, [active, flatRowsToRender, coreOf, renderDisplayBudgetCode, codeSortDir, openCodes]);

  const selectableRowCodes = useMemo(
    () =>
      (displayRows || [])
        .filter((node) => !(active === "projects" && !!node?.hasChildren))
        .map((node) => String(node?.row?.code || ""))
        .filter(Boolean),
    [displayRows, active]
  );

  const allSelectableChecked =
    selectableRowCodes.length > 0 &&
    selectableRowCodes.every((code) => selectedCodes.includes(code));
  const someSelectableChecked = selectableRowCodes.some((code) =>
    selectedCodes.includes(code)
  );

  useEffect(() => {
    setSelectedCodes((prev) =>
      prev.filter((code) => selectableRowCodes.includes(String(code)))
    );
  }, [selectableRowCodes]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        !allSelectableChecked && someSelectableChecked;
    }
  }, [allSelectableChecked, someSelectableChecked]);

  const exportRowsAll = useMemo(() => {
    if (active !== "projects") {
      return (flatRowsToRender || []).map((r, index) => ({
        row: r,
        depth: 0,
        key: String(r?.code || `__idx_${index}`),
        core: coreOf(r?.code),
        hasChildren: false,
      }));
    }

    const base = flatRowsToRender || [];
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

    nodes.forEach((n) => {
      n.hasChildren = !!(n.core && childrenMap.has(n.core));
    });

    const sortFn = (a, b) => {
      const ca = renderDisplayBudgetCode(a.row.code);
      const cb = renderDisplayBudgetCode(b.row.code);
      const cmp = String(ca || "").localeCompare(String(cb || ""), "fa", {
        numeric: true,
        sensitivity: "base",
      });
      return codeSortDir === "asc" ? cmp : -cmp;
    };

    const roots = nodes.filter((n) => !n.parentCore || !byCore.has(n.parentCore));
    roots.sort(sortFn);
    for (const list of childrenMap.values()) list.sort(sortFn);

    const out = [];
    const visit = (node, depth) => {
      out.push({
        row: node.row,
        depth,
        key: node.key,
        core: node.core,
        hasChildren: node.hasChildren,
      });
      if (!node.hasChildren) return;
      const children = node.core ? childrenMap.get(node.core) || [] : [];
      children.forEach((child) => visit(child, depth + 1));
    };

    roots.forEach((r) => visit(r, 0));
    return out;
  }, [active, flatRowsToRender, coreOf, renderDisplayBudgetCode, codeSortDir]);

  const valueOfRow = useCallback(
    (row, key) => {
      const own = Number(row?.[key] || 0);
      if (active !== "projects") return own;
      if (!row?.code) return own;

      const code = String(row.code);
      const isLeaf = !!hierarchyMaps?.isLeafByCode?.[code];
      if (isLeaf) return own;

      const core = hierarchyMaps?.coreByCode?.[code];
      if (!core) return own;
      const prefix = core + ".";

      let sum = 0;
      (flatRowsToRender || []).forEach((rr) => {
        if (!rr?.code) return;
        const rrCode = String(rr.code);
        if (!hierarchyMaps?.isLeafByCode?.[rrCode]) return;
        const rrCore = hierarchyMaps?.coreByCode?.[rrCode];
        if (!rrCore || !rrCore.startsWith(prefix)) return;
        sum += Number(rr?.[key] || 0);
      });

      return sum;
    },
    [active, hierarchyMaps, flatRowsToRender]
  );

  const focusRowForEdit = useCallback((code) => {
    requestAnimationFrame(() => {
      const target = moneyRefs.current[code];
      if (!target) return;
      target.focus();
      if (typeof target.setSelectionRange === "function") {
        const txt = String(target.value ?? "");
        target.setSelectionRange(txt.length, txt.length);
      }
    });
  }, []);

  const openDescModal = (row) => {
    setDescModal({
      open: true,
      code: String(row?.code || ""),
      name: String(row?.name || ""),
      value: String(row?.desc || ""),
    });
  };

  const closeDescModal = () => {
    setDescModal({ open: false, code: "", name: "", value: "" });
  };

  const saveDescModal = () => {
    if (!descModal.code) {
      closeDescModal();
      return;
    }
    onDescChange(descModal.code, descModal.value);
    closeDescModal();
  };

  const exportExcel = () => {
    const rowsForExport = exportRowsAll || [];
    if (!rowsForExport.length) return;

    const escapeHtml = (v) =>
      String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const activeLabel = tabs.find((t) => t.id === active)?.label || "";
    const projectLabel =
      active === "projects" && selectedProject
        ? `${selectedProject.code || ""} - ${selectedProject.name || ""}`
        : "";
    const title = `Budget Allocation${activeLabel ? ` - ${activeLabel}` : ""}`;

    const headerHtml = `
      <tr>
        <th>#</th>
        <th>${escapeHtml(budgetCodeHeader)}</th>
        <th>نام بودجه</th>
        <th>آخرین برآورد</th>
        <th>تخصیص جدید</th>
        <th>مجموع تخصیص‌ها</th>
        <th>شرح</th>
      </tr>
    `;

    const bodyHtml = rowsForExport
      .map((node, idx) => {
        const r = node.row || {};
        const depth = Math.max(0, Number(node.depth || 0));
        const outlineLevel = Math.min(depth, 7);
        const isParentRow = active === "projects" && !!node.hasChildren;
        const lastAmountView = valueOfRow(r, "lastAmount");
        const totalAllocView = valueOfRow(r, "totalAlloc");
        const allocRawView = isParentRow
          ? valueOfRow(r, "allocRaw")
          : Number(r.allocRaw || 0);

        const rowStyle = [
          outlineLevel > 0 ? `mso-outline-level:${outlineLevel}` : "",
          isParentRow ? "font-weight:700;background-color:#f8fafc" : "",
        ]
          .filter(Boolean)
          .join(";");

        const trClass = isParentRow ? "parent-row" : "child-row";

        return `
          <tr class="${trClass}" style="${rowStyle}">
            <td>${escapeHtml(toFaDigits(idx + 1))}</td>
            <td>${escapeHtml(toFaDigits(renderDisplayBudgetCode(r.code) || "—"))}</td>
            <td style="text-align:right;padding-right:${8 + depth * 16}px">${escapeHtml(
              r.name || "—"
            )}</td>
            <td>${escapeHtml(toFaDigits(formatMoney(lastAmountView || 0)))}</td>
            <td>${escapeHtml(toFaDigits(formatMoney(allocRawView || 0)))}</td>
            <td>${escapeHtml(toFaDigits(formatMoney(totalAllocView || 0)))}</td>
            <td style="text-align:right">${escapeHtml(r.desc || "—")}</td>
          </tr>
        `;
      })
      .join("");

    const noRowsHtml = `<tr><td colspan="7">موردی برای نمایش نیست.</td></tr>`;
    const exportDate = new Date().toLocaleDateString("fa-IR");

    const html = `
      <html lang="fa" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Vazir, Vazirmatn, IRANSans, Segoe UI, Tahoma, sans-serif; direction: rtl; }
            table { border-collapse: collapse; width: 100%; font-size: 11pt; }
            th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: center; vertical-align: middle; }
            thead th { background-color: #f3f4f6; font-weight: 700; }
            tbody tr.parent-row td { font-weight: 700; }
            tbody tr.child-row td { background-color: #ffffff; }
            .meta { margin-bottom: 10px; font-size: 11pt; }
            .meta div { margin-bottom: 4px; }
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
          </table>
        </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-allocation-${active}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const TopButtons = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => {
            setActive(t.id);
          }}
          className={`h-10 px-4 rounded-2xl border text-sm shadow-sm transition
            ${
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

  const ProjectsControls = () => {
    if (active !== "projects") return null;
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-xs sm:text-sm text-black/70 dark:text-neutral-300">
            کد پروژه
          </label>
          <div className="relative">
            <select
              dir="rtl"
              className="w-full h-11 rounded-xl pr-3 pl-9 sm:pr-4 sm:pl-10 text-sm leading-6 text-right bg-white text-black border border-black/15 outline-none appearance-none truncate
                         [-webkit-appearance:none] [-moz-appearance:none] [background-image:none]
                         focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">انتخاب کنید</option>
              {(sortedProjects || []).map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {toFaDigits(p.code || "—")} {p?.name ? `— ${p.name}` : ""}
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
          <label className="text-xs sm:text-sm text-black/70 dark:text-neutral-300">
            نام پروژه
          </label>
          <input
            className="w-full h-11 rounded-xl px-3 sm:px-4 text-sm text-right bg-black/5 text-black border border-black/15 outline-none truncate
                       dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
            value={selectedProject?.name || ""}
            readOnly
          />
        </div>
      </div>
    );
  };

  
  // ===== UI states for access =====
  if (accessLoading) {
    return (
      <>
        <Card>
          <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
            <span>بودجه‌بندی</span>
            <span className="mx-2">›</span>
            <span className="font-semibold text-black dark:text-neutral-100">
              تخصیص بودجه
            </span>
          </div>
          <div className="p-5 text-center text-black/60 dark:text-neutral-300">
            در حال بررسی دسترسی…
          </div>
        </Card>
      </>
    );
  }

  if (!me) {
    return (
      <>
        <Card>
          <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
            <span>بودجه‌بندی</span>
            <span className="mx-2">›</span>
            <span className="font-semibold text-black dark:text-neutral-100">
              تخصیص بودجه
            </span>
          </div>
          <div className="p-5 text-center text-red-600 dark:text-red-400">
            ابتدا وارد سامانه شوید.
          </div>
        </Card>
      </>
    );
  }

  if (canAccessPage !== true || (tabs || []).length === 0) {
    return (
      <>
        <Card>
          <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
            <span>بودجه‌بندی</span>
            <span className="mx-2">›</span>
            <span className="font-semibold text-black dark:text-neutral-100">
              تخصیص بودجه
            </span>
          </div>
          <div className="p-5 rounded-2xl ring-1 ring-black/10 bg-white text-center text-red-600 dark:bg-neutral-900 dark:ring-neutral-800 dark:text-red-400">
            شما سطح دسترسی لازم را ندارید.
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <Card>
        <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
          <span>بودجه‌بندی</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-black dark:text-neutral-100">
            تخصیص بودجه
          </span>
        </div>

        <div className="px-[15px]">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="text-sm text-black/60 dark:text-neutral-400">
              تاریخ:
            </div>
            <div className="px-3 py-1 rounded-lg bg-black/5 text-black text-sm ring-1 ring-black/15 dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-800">
              {toFaDigits(todayFa)}
            </div>
          </div>

          <div className="space-y-3 md:space-y-4 mb-4">
            <TopButtons />
            <ProjectsControls />
          </div>
        </div>

        <TableWrap>
          <div className={tablePreset.outer}>
            <div className={tablePreset.innerPad}>
              <div className={tablePreset.frame + " shadow-sm"}>
                <div className="overflow-x-auto">
                <table className={tablePreset.table + " table-fixed text-[12px] md:text-[13px] min-w-[900px] lg:min-w-[1020px]"} dir="rtl">
              <THead>
                <tr className={tablePreset.headRow}>
                  <TH className={`w-12 ${tablePreset.th}`}>
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      className={hoverSelectableRowPreset.checkbox}
                      checked={allSelectableChecked}
                      onChange={(e) => {
                        const checked = !!e.target.checked;
                        setSelectedCodes((prev) => {
                          if (checked) {
                            return Array.from(new Set([...prev, ...selectableRowCodes]));
                          }
                          return prev.filter((code) => !selectableRowCodes.includes(code));
                        });
                      }}
                      aria-label="انتخاب همه"
                    />
                  </TH>
                  <TH className={`w-14 sm:w-16 ${tablePreset.th}`}>
                    #
                  </TH>
                  <TH className={`w-40 sm:w-44 md:w-56 ${tablePreset.th}`}>
                    <div className="flex items-center justify-center gap-1 w-full">
                      <span>{budgetCodeHeader}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCodeSortDir((prev) =>
                            prev === "asc" ? "desc" : "asc"
                          )
                        }
                        className="rounded-lg px-2 py-1 ring-1 ring-black/15 hover:bg-black/5
                                   dark:ring-neutral-800 dark:hover:bg-white/10"
                        aria-label="مرتب‌سازی کد بودجه"
                      >
                        <img
                          src={
                            codeSortDir === "asc"
                              ? "/images/icons/kochikbebozorg.svg"
                              : "/images/icons/bozorgbekochik.svg"
                          }
                          alt=""
                          className="w-5 h-5 dark:invert"
                        />
                      </button>
                    </div>
                  </TH>
                  <TH className={tablePreset.th}>
                    نام بودجه
                  </TH>
                  <TH className={`w-28 sm:w-32 md:w-40 ${tablePreset.th}`}>
                    آخرین برآورد
                  </TH>
                  <TH className={`w-36 sm:w-40 md:w-48 ${tablePreset.th}`}>
                    تخصیص جدید
                  </TH>
                  <TH className={`w-32 sm:w-36 md:w-44 ${tablePreset.th}`}>
                    مجموع تخصیص‌ها
                  </TH>
                </tr>
              </THead>

              <tbody className={tablePreset.body}>
                {loading ? (
                  <TR>
                    <TD colSpan={7} className={tablePreset.emptyRow}>
                      در حال بارگذاری…
                    </TD>
                  </TR>
                ) : (displayRows || []).length === 0 ? (
                  <TR>
                    <TD colSpan={7} className={tablePreset.emptyRow}>
                      {active === "projects" && !projectId
                        ? "ابتدا پروژه را انتخاب کنید"
                        : "موردی یافت نشد."}
                    </TD>
                  </TR>
                ) : (
                  (displayRows || []).map((node, idx) => {
                    const r = node.row;
                    const isComputed = active === "projects" && !!node.hasChildren;
                    const toggleKey = node.core || node.key;
                    const isOpen = !!openCodes[toggleKey];
                    const depthPad = node.depth ? node.depth * 12 : 0;

                    const lastAmountView = valueOfRow(r, "lastAmount");
                    const totalAllocView = valueOfRow(r, "totalAlloc");
                    const allocRawView = isComputed
                      ? valueOfRow(r, "allocRaw")
                      : Number(r.allocRaw || 0);
                    const hasAllocValue = Number(allocRawView || 0) !== 0;
                    const rowCode = String(r.code || "");
                    const isSelected = selectedCodes.includes(rowCode);
                    const shouldDeleteSelectedOnAction =
                      isSelected && selectedCodes.length > 1;
                    const newTotal = totalAllocView + allocRawView;
                    const limit = lastAmountView;
                    const isOver = newTotal > limit;

                    return (
                      <TR
                        key={node.key || r.code || idx}
                        className={getHoverSelectableRowClass(isSelected)}
                      >
                        <TD className="px-2.5 pt-1.5 pb-1 align-middle !text-center">
                          <input
                            type="checkbox"
                            className={hoverSelectableRowPreset.checkbox}
                            checked={isSelected}
                            disabled={isComputed}
                            onChange={(e) => {
                              const checked = !!e.target.checked;
                              setSelectedCodes((prev) =>
                                checked
                                  ? Array.from(new Set([...prev, rowCode]))
                                  : prev.filter((code) => code !== rowCode)
                              );
                            }}
                            aria-label={`انتخاب ردیف ${toFaDigits(idx + 1)}`}
                          />
                        </TD>
                        <TD className="px-2.5 pt-1.5 pb-1 align-middle !text-center">
                          {toFaDigits(idx + 1)}
                        </TD>
                        <TD className="px-2.5 pt-1.5 pb-1 align-middle">
                          <div
                            className="inline-flex items-center justify-center gap-1 flex-row-reverse"
                            style={{ paddingRight: depthPad }}
                          >
                            {node.hasChildren && (
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenCodes((p) => ({ ...p, [toggleKey]: !p[toggleKey] }))
                                }
                                className="h-5 w-5 grid place-items-center rounded-md border border-black/25 bg-white text-black dark:border-neutral-500 dark:bg-white dark:text-black"
                                aria-label={isOpen ? "بستن زیرمجموعه" : "باز کردن زیرمجموعه"}
                                title={isOpen ? "بستن زیرمجموعه" : "باز کردن زیرمجموعه"}
                              >
                                {isOpen ? (
                                  <span className="text-[11px] leading-none text-black">−</span>
                                ) : (
                                  <img src="/images/icons/afzodan.svg" alt="" className="w-3 h-3" />
                                )}
                              </button>
                            )}
                            <span className="ltr">{toFaDigits(renderDisplayBudgetCode(r.code))}</span>
                          </div>
                        </TD>
                        <TD className="px-2.5 pt-1.5 pb-1 whitespace-normal break-words leading-snug align-middle max-w-[26ch] mx-auto !text-center">
                          {r.name || "—"}
                        </TD>
                        <TD className="px-2.5 pt-1.5 pb-1 align-middle">
                          <div className="flex justify-center ltr">
                            {toFaDigits(formatMoney(lastAmountView || 0))}
                          </div>
                        </TD>
                        <TD className="px-2.5 pt-1.5 pb-1 align-middle !text-center">
                          <div className="relative flex min-h-[34px] items-center justify-center">
                            <input
                              ref={(el) => {
                                if (!isComputed) moneyRefs.current[r.code] = el;
                              }}
                              dir="ltr"
                              disabled={isComputed}
                              className={`w-24 mx-auto h-9 md:w-24 md:h-9 rounded-xl border text-[11px] md:text-[12px] text-center shadow-sm outline-none transition
                                        ${
                                          isOver
                                            ? "border-red-500 ring-2 ring-red-300 bg-red-50 text-red-700 placeholder-red-400 dark:bg-red-600/10 dark:text-red-200"
                                            : hasAllocValue
                                            ? "bg-[#edaf7c] border-[#edaf7c]/90 text-black focus:ring-2 focus:ring-[#edaf7c]/50"
                                            : "bg-black/5 border-black/10 text-black/70 focus:ring-2 focus:ring-black/10 dark:bg-white/5 dark:border-neutral-700 dark:text-neutral-100 dark:focus:ring-neutral-600/50"
                                        } ${isComputed ? "opacity-70 cursor-default" : ""}`}
                              value={toFaDigits(formatMoney(allocRawView))}
                              onChange={(e) =>
                                !isComputed && onAllocChange(r.code, e.target.value)
                              }
                              placeholder={isComputed ? "—" : "۰"}
                              title={
                                isOver
                                  ? "تخصیص جدید از آخرین برآورد بیشتر می‌شود"
                                  : ""
                              }
                              aria-invalid={isOver ? "true" : "false"}
                            />
                          </div>
                          <div className="flex flex-col">
                            {isOver && !isComputed && (
                              <span className="mt-1 text-[11px] leading-none text-red-600 dark:text-red-400">
                                مقدار «تخصیص جدید» از مقدار آخرین برآورد بیشتر
                                می‌شود
                              </span>
                            )}
                          </div>
                        </TD>
                        <TD className="px-2.5 pt-1.5 pb-1 align-middle">
                          <div className="relative flex min-h-[34px] items-center justify-center">
                            <span className="inline-flex items-center justify-center transition-opacity opacity-100 group-hover:opacity-0 group-hover:pointer-events-none">
                              {toFaDigits(formatMoney(totalAllocView || 0))}
                            </span>
                            <div
                              dir="rtl"
                              className="absolute inset-0 flex items-center justify-center gap-1 transition-opacity opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
                            >
                              <RowActionIconBtn
                                icon="/images/icons/sayer.svg"
                                title="ثبت شرح"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openDescModal(r);
                                }}
                                size={34}
                                iconSize={15}
                              />
                              <RowActionIconBtn
                                action="edit"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  focusRowForEdit(r.code);
                                }}
                                disabled={isComputed}
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
                                  removeRows([r.code]);
                                }}
                                disabled={isComputed}
                                size={34}
                                iconSize={16}
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

        {err && (
          <div className="text-sm text-red-600 dark:text-red-400 mt-3">
            {err}
          </div>
        )}

        {descModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/40 dark:bg-neutral-950/60 backdrop-blur-[2px]"
              onClick={closeDescModal}
            />
            <div
              className="relative w-full max-w-xl rounded-2xl bg-white p-4 sm:p-5 ring-1 ring-black/10 shadow-2xl dark:bg-neutral-900 dark:ring-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-base font-semibold text-black dark:text-neutral-100">
                ثبت شرح
              </div>
              <div className="mt-1 text-xs text-black/60 dark:text-neutral-300">
                کد بودجه:{" "}
                <span className="ltr">
                  {toFaDigits(renderDisplayBudgetCode(descModal.code) || "—")}
                </span>
                {descModal.name ? ` — ${descModal.name}` : ""}
              </div>

              <textarea
                autoFocus
                rows={5}
                value={descModal.value}
                onChange={(e) =>
                  setDescModal((prev) => ({ ...prev, value: e.target.value }))
                }
                placeholder="شرح تخصیص را وارد کنید…"
                className="mt-3 w-full rounded-xl px-3 py-2 whitespace-normal break-words leading-snug outline-none
                           bg-white text-black placeholder-black/40 border border-black/15 focus:ring-2 focus:ring-black/10
                           dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
              />

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDescModal}
                  className="h-10 px-4 rounded-xl border border-black/15 hover:bg-black/5 transition
                             dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={saveDescModal}
                  className="h-10 px-4 rounded-xl bg-neutral-900 text-white transition
                             dark:bg-neutral-100 dark:text-neutral-900"
                >
                  ذخیره
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 justify-end">
          <button
            onClick={exportExcel}
            disabled={loading || (active === "projects" && !projectId) || !(exportRowsAll || []).length}
            className="h-10 w-14 grid place-items-center rounded-xl border border-black/15 hover:bg-black/5 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            aria-label="خروجی اکسل"
            title="خروجی اکسل"
          >
            <img src="/images/icons8-excel-50.png" alt="" className="w-5 h-5" />
          </button>

          <button
            onClick={onSubmit}
            disabled={saving || (active === "projects" && !projectId)}
            className="h-10 w-14 grid place-items-center rounded-xl bg-neutral-900 text-white disabled:opacity-50
                       dark:bg-neutral-100 dark:text-neutral-900"
            aria-label="ثبت"
            title="ثبت"
          >
            <img
              src="/images/icons/check.svg"
              alt=""
              className="w-5 h-5 invert dark:invert"
            />
          </button>
        </div>

        {modalMsg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-2 sm:px-4">
            <div
              className="absolute inset-0 bg-black/40 dark:bg-neutral-950/60 backdrop-blur-[2px]"
              onClick={() => setModalMsg(null)}
            />
            <div
              className="relative w-full max-w-[96vw] sm:max-w-4xl max-h-[90vh] overflow-auto bg-white rounded-3xl shadow-2xl ring-1 ring-black/10 p-4 sm:p-6
                         text-black dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div id="alloc-preview">
                <h2 className="text-lg md:text-xl font-bold text-black dark:text-neutral-100 mb-2 text-center">
                  تخصیص بودجه
                </h2>
                <div className="meta text-sm text-black/70 dark:text-neutral-300 grid sm:grid-cols-2 gap-x-6 gap-y-1 mb-3 text-center">
                  <div>
                    تاریخ:{" "}
                    <b className="text-black dark:text-neutral-100">
                      {toFaDigits(todayFa)}
                    </b>
                  </div>
                  <div>
                    ساعت:{" "}
                    <b className="text-black dark:text-neutral-100">
                      {toFaDigits(new Date().toLocaleTimeString("fa-IR"))}
                    </b>
                  </div>
                  {me && (
                    <div>
                      کاربر:{" "}
                      <b className="text-black dark:text-neutral-100">
                        {me.name || me.username || me.email}
                      </b>
                    </div>
                  )}
                  {active === "projects" && selectedProject && (
                    <div>
                      پروژه:{" "}
                      <b className="text-black dark:text-neutral-100">
                        {toFaDigits(selectedProject.code)} —{" "}
                        {selectedProject.name}
                      </b>
                    </div>
                  )}
                </div>

                {(rows || []).length > 0 && (
                  <div className="-mx-2 px-2 sm:mx-0 sm:px-0 overflow-auto rounded-xl ring-1 ring-black/10 dark:ring-neutral-800 mb-6">
                    <table className="w-full min-w-[700px] sm:min-w-[760px] md:min-w-[880px] text-xs sm:text-sm [&_th]:text-center [&_td]:text-center">
                      <thead className="bg-black/5 dark:bg-white/5 dark:text-neutral-100">
                        <tr>
                          <th className="py-3 px-2 text-center">#</th>
                          <th className="py-3 px-2 text-center">
                            {budgetCodeHeader}
                          </th>
                          <th className="py-3 px-2 text-center">نام بودجه</th>
                          <th className="py-3 px-2 text-center">آخرین برآورد</th>
                          <th className="py-3 px-2 text-center">تخصیص جدید</th>
                          <th className="py-3 px-2 text-center">
                            مجموع تخصیص‌ها
                          </th>
                          <th className="py-3 px-2 text-center">شرح</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr
                            key={r.code}
                            className="border-t border-black/10 dark:border-neutral-800"
                          >
                            <td className="py-2 px-2 text-center">
                              {toFaDigits(i + 1)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {toFaDigits(renderDisplayBudgetCode(r.code))}
                            </td>
                            <td className="py-2 px-2 whitespace-normal break-words leading-relaxed text-center max-w-[26ch] mx-auto">
                              {r.name || "—"}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {toFaDigits(formatMoney(r.lastAmount || 0))}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {toFaDigits(formatMoney(r.allocRaw || 0))}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {toFaDigits(formatMoney(r.totalAlloc || 0))}
                            </td>
                            <td className="py-2 px-2 whitespace-normal break-words leading-relaxed text-center">
                              {r.desc || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h3 className="section-title text-center text-base md:text-lg text-black dark:text-neutral-100">
                  تاریخچه تخصیص‌ها
                </h3>
                <div className="-mx-2 px-2 sm:mx-0 sm:px-0 overflow-auto rounded-xl ring-1 ring-black/10 dark:ring-neutral-800 mt-2">
                  <table className="w-full min-w-[620px] sm:min-w-[680px] md:min-w-[760px] text-xs sm:text-sm [&_th]:text-center [&_td]:text-center">
                    <thead className="bg-black/5 dark:bg-white/5 dark:text-neutral-100">
                      <tr>
                        <th className="py-3 px-2 w-56 text-center">
                          {budgetCodeHeader}
                        </th>
                        <th className="py-3 px-2 text-center">
                          سوابق (مبلغ — تاریخ/ساعت)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(rows || []).map((r) => {
                        const hist = historyByCode?.[r.code] || {};
                        const list = Array.isArray(hist) ? hist : [];
                        return (
                          <tr
                            key={"h-" + r.code}
                            className="border-t border-black/10 dark:border-neutral-800"
                          >
                            <td className="py-2 px-2 text-center align-middle">
                              {toFaDigits(renderDisplayBudgetCode(r.code))}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {list.length === 0 ? (
                                <span className="text-black/50 dark:text-neutral-400">
                                  — سابقه‌ای یافت نشد —
                                </span>
                              ) : (
                                <div className="grid gap-1">
                                  {list.map((h, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center justify-center gap-4 text-sm"
                                    >
                                      <span>
                                        {toFaDigits(formatMoney(h.amount || 0))}
                                      </span>
                                      <span className="text-black/70 dark:text-neutral-300">
                                        —
                                      </span>
                                      <span>{formatDateTimeFa(h.created_at)}</span>
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
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  onClick={() => window.print()}
                  className="h-10 w-10 grid place-items-center rounded-xl border border-black/15 bg-white hover:bg-black/5 transition
               dark:bg-neutral-900 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  <img
                    src="/images/icons/print.svg"
                    alt="چاپ"
                    className="w-5 h-5 dark:invert"
                  />
                </button>
                <button
                  onClick={() => setModalMsg(null)}
                  className="h-10 w-10 grid place-items-center rounded-xl bg-black text-white dark:bg-neutral-100 dark:text-neutral-900"
                >
                  <img
                    src="/images/icons/bastan.svg"
                    alt="بستن"
                    className="w-5 h-5 invert dark:invert-0"
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

export default BudgetAllocationPage;
