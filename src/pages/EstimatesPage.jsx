// src/pages/EstimatesPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";

export default function EstimatesPage() {
  const API_BASE = (window.API_URL || "/api").replace(/\/+$/, "");

  async function api(path, opt = {}) {
    const res = await fetch(API_BASE + path, {
      credentials: "include",
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

  const tabs = useMemo(
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

  const [active, setActive] = useState("office");

  const prefixOf = useCallback((kind) => tabs.find((t) => t.id === kind)?.prefix || "", [tabs]);

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

  // projects
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
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
  }, []);

  const selectedProject = useMemo(
    () => (projects || []).find((p) => String(p.id) === String(projectId)),
    [projects, projectId],
  );

  const sortedProjects = useMemo(() => {
    return (projects || [])
      .slice()
      .sort((a, b) =>
        String(a?.code || "").localeCompare(String(b?.code || ""), "fa", { numeric: true, sensitivity: "base" }),
      );
  }, [projects]);

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

  const reqSeq = useRef(0);

  const parseDescMonths = useCallback(
    (descRaw) => {
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
    },
    [],
  );

  useEffect(() => {
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
          const prev = byCode.get(code) || {
            code,
            name: "",
            desc: "",
            baseAmount: 0,
            months: {},
            lastMonths: {},
          };
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
  }, [active, projectId, dynamicMonths, renderCode, parseDescMonths, coreOf, selectedProject]); // ✅

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

  // hierarchy (for display tree)
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

  // month modal
  const [monthModal, setMonthModal] = useState({ open: false, code: null, monthKey: "", label: "", name: "", value: "" });
  const monthInputRef = useRef(null);

  const openMonthModal = (row, month) => {
    let rawVal = 0;
    if (row.months && row.months[month.key] != null) rawVal = row.months[month.key];
    else if (row.lastMonths && row.lastMonths[month.key] != null) rawVal = row.lastMonths[month.key];
    const currentVal = Number(rawVal || 0);
    setMonthModal({
      open: true,
      code: row.code,
      monthKey: month.key,
      label: month.label,
      name: row.name || "",
      value: currentVal ? formatMoney(currentVal) : "",
    });
  };
  const closeMonthModal = () => setMonthModal((p) => ({ ...p, open: false }));

  const handleMonthModalChange = (raw) => {
    const en = toEnDigits(raw);
    const digits = en.replace(/[^\d]/g, "");
    const formatted = digits ? formatMoney(Number(digits)) : "";
    setMonthModal((p) => ({ ...p, value: formatted }));
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

  const handleMonthModalSave = () => {
    if (!monthModal.code || !monthModal.monthKey) return closeMonthModal();
    const num = parseMoney(monthModal.value);

    setRows((prev) =>
      (prev || []).map((r) => {
        if (String(r.code) !== String(monthModal.code)) return r;
        const nextMonths = { ...(r.months || {}), [monthModal.monthKey]: num };
        const nextLast = { ...(r.lastMonths || {}) };
        if (num) nextLast[monthModal.monthKey] = num;
        else delete nextLast[monthModal.monthKey];
        return { ...r, months: nextMonths, lastMonths: nextLast };
      }),
    );

    const c = monthModal.code;
    const mk = monthModal.monthKey;

    setMonthModal({ open: false, code: null, monthKey: "", label: "", name: "", value: "" });

    persistSingleCell(c, mk, num);
  };

  useEffect(() => {
    if (monthModal.open && monthInputRef.current) {
      monthInputRef.current.focus();
      monthInputRef.current.select();
    }
  }, [monthModal.open]);

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

  const TopButtons = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
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

  const ProjectsControls = () => {
    if (active !== "projects") return null;
    return (
      <div className="grid grid-cols-1 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-black/70 dark:text-neutral-300">پروژه</label>
          <select
            className="w-full rounded-xl px-3 py-2 text-sm font-[inherit] bg-white text-black border border-black/15 outline-none text-right dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option className="bg-white dark:bg-neutral-900" value="">
              انتخاب کنید
            </option>
            {(sortedProjects || []).map((p) => (
              <option className="bg-white dark:bg-neutral-900" key={p.id} value={p.id}>
                {p.code ? `${p.code} - ${p.name || ""}` : p.name || "—"}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  const colCount = 3 + dynamicMonths.length + 1;

  return (
    <>
      <Card>
        <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
          <span>بودجه‌بندی</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-black dark:text-neutral-100">برآورد هزینه‌ها</span>
        </div>

        <div className="space-y-4 mb-4">
          <TopButtons />
          <ProjectsControls />
        </div>

        <TableWrap>
          <div className="bg-white rounded-2xl overflow-hidden border border-black/10 shadow-sm text-black dark:bg-neutral-900 dark:text-neutral-200 dark:border-neutral-800">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-[12px] md:text-[13px] text-center [&_th]:text-center [&_td]:text-center" dir="rtl">
                <THead>
                  <tr className="bg-black/5 border-b border-black/10 sticky top-0 z-10 text-black dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700">
                    <TH className="!text-center py-3 w-14 !text-black dark:!text-neutral-300">#</TH>
                    <TH className="!text-center py-3 w-40 !text-black dark:!text-neutral-300">
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
                    <TH className="!text-center py-3 w-40 !text-black dark:!text-neutral-300">نام بودجه</TH>
                    {dynamicMonths.map((m) => (
                      <TH key={m.key} className="!text-center py-3 w-24 px-0 !text-black dark:!text-neutral-300">
                        {m.label}
                      </TH>
                    ))}
                    <TH className="!text-center py-3 w-28 !text-black dark:!text-neutral-300 border-l border-r border-black/10 dark:border-neutral-700">
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

                <tbody className="[&_td]:text-black dark:[&_td]:text-neutral-100">
                  {loading ? (
                    <TR>
                      <TD colSpan={colCount} className="text-center text-black/60 dark:text-neutral-400 py-4">
                        در حال بارگذاری…
                      </TD>
                    </TR>
                  ) : (displayRows || []).length === 0 ? (
                    <TR>
                      <TD colSpan={colCount} className="text-center text-black/60 py-4 dark:text-neutral-400">
                        {active === "projects" && !projectId ? "ابتدا پروژه را انتخاب کنید" : "موردی یافت نشد."}
                      </TD>
                    </TR>
                  ) : (
                    <>
                      <TR className="text-center border-t border-black/10 bg-black/[0.04] font-semibold dark:border-neutral-800 dark:bg-white/10">
                        <TD className="px-2 py-3 border-b border-black/10 dark:border-neutral-800">-</TD>
                        <TD className="px-2 py-3 border-b border-black/10 dark:border-neutral-800">-</TD>
                        <TD className="px-2 py-3 text-center border-b border-black/10 dark:border-neutral-800">جمع</TD>
                        {dynamicMonths.map((m) => (
                          <TD key={m.key} className="px-0 py-2 text-center align-middle border-b border-black/10 dark:border-neutral-800">
                            {totalsComputed[m.key] ? (
                              <span className="inline-flex items-center justify-center gap-1">
                                <span className="ltr">{toFaDigits(formatMoney(totalsComputed[m.key]))}</span>
                                <span>ریال</span>
                              </span>
                            ) : (
                              "—"
                            )}
                          </TD>
                        ))}
                        <TD className="px-3 py-3 whitespace-nowrap text-center border-l border-r border-b border-black/10 dark:border-neutral-700">
                          <span className="inline-flex items-center justify-center gap-1">
                            <span className="ltr">{toFaDigits(formatMoney(totalGrand || 0))}</span>
                            <span>ریال</span>
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
                          <TR
                            key={code || idx}
                            className="text-center border-t border-black/10 odd:bg-black/[0.02] even:bg-black/[0.04] hover:bg-black/[0.06] transition-colors dark:border-neutral-800 dark:odd:bg-white/5 dark:even:bg-white/10 dark:hover:bg-white/15"
                          >
                            <TD className="px-2 py-3">{toFaDigits(idx + 1)}</TD>

                            <TD className="px-2 py-3 text-center whitespace-nowrap">
                              <div className="inline-flex items-center justify-center gap-1 flex-row-reverse" style={{ paddingRight: node.depth ? node.depth * 12 : 0 }}>
                                {hasChildren && (
                                  <button
                                    type="button"
                                    onClick={() => setOpenCodes((p) => ({ ...p, [toggleKey]: !p[toggleKey] }))}
                                    className="h-5 w-5 grid place-items-center rounded-md border border-black/25 bg-white text-black dark:border-neutral-500 dark:bg-white dark:text-black"
                                    aria-label={isOpen ? "بستن زیرمجموعه" : "باز کردن زیرمجموعه"}
                                  >
                                    {isOpen ? <span className="text-[11px] leading-none text-black">−</span> : <img src="/images/icons/afzodan.svg" alt="" className="w-3 h-3" />}
                                  </button>
                                )}
                                <span className="ltr text-xs md:text-[13px]">{renderCode(code)}</span>
                              </div>
                            </TD>

                            <TD className="px-2 py-3 text-center break-words text-[11px] md:text-[13px] max-w-[180px]">{r.name || "—"}</TD>

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

                              return (
                                <TD key={m.key} className="px-0 py-2 text-center align-middle">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!isParent) openMonthModal(r, m);
                                    }}
                                    disabled={isParent}
                                    className={`w-24 mx-auto h-12 md:w-24 md:h-12 rounded-2xl border text-[11px] md:text-[12px] flex items-center justify-center shadow-sm transition ${
                                      hasVal
                                        ? "bg-[#edaf7c] border-[#edaf7c]/90 text-black"
                                        : "bg-black/5 border-black/10 text-black/70 dark:bg-white/5 dark:border-neutral-700 dark:text-neutral-100"
                                    } ${isParent ? "cursor-default" : "cursor-pointer"}`}
                                  >
                                    {hasVal ? (
                                      <div className="flex flex-col items-center justify-center leading-tight">
                                        <span>{toFaDigits(formatMoney(val))}</span>
                                        <span className="mt-0.5 text-[10px] text-black/70 dark:text-neutral-300">ریال</span>
                                      </div>
                                    ) : (
                                      "—"
                                    )}
                                  </button>
                                </TD>
                              );
                            })}

                            <TD className="px-3 py-3 whitespace-nowrap text-center border-l border-r border-black/10 dark:border-neutral-700">
                              <span className="inline-flex items-center justify-center gap-1">
                                <span className="ltr">{toFaDigits(formatMoney(finalTotal || 0))}</span>
                                <span>ریال</span>
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
        </TableWrap>

        {monthModal.open && (
          <div className="fixed inset-0 z-40 flex items-center justify-center px-3">
            <div className="absolute inset-0 bg-black/40 dark:bg-neutral-950/70 backdrop-blur-[2px]" onClick={closeMonthModal} />
            <div className="relative w-full max-w-sm rounded-2xl bg-white text-neutral-900 border border-black/10 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">ثبت برآورد ماهانه</div>
                  <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 space-y-0.5">
                    <div>
                      کد بودجه: <b className="ltr text-xs">{monthModal.code ? renderCode(monthModal.code) : "—"}</b>
                    </div>
                    <div>
                      نام بودجه: <b>{monthModal.name || "—"}</b>
                    </div>
                    <div>
                      ماه: <b>{monthModal.label || "—"}</b>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeMonthModal}
                  className="h-8 w-8 grid place-items-center rounded-xl bg-black text-white dark:bg-neutral-100 dark:text-neutral-900"
                >
                  <img src="/images/icons/bastan.svg" alt="" className="w-4 h-4 invert dark:invert-0" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-600 dark:text-neutral-300">مبلغ برآورد برای این ماه</label>
                <div className="flex items-center gap-2">
                  <input
                    ref={monthInputRef}
                    dir="ltr"
                    className="flex-1 w-full rounded-xl px-3 py-2 text-sm text-center bg-white text-black border border-black/15 outline-none focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                    placeholder="0"
                    value={monthModal.value ? toFaDigits(monthModal.value) : ""}
                    onChange={(e) => handleMonthModalChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleMonthModalSave();
                      }
                    }}
                  />
                  <span className="text-xs text-neutral-600 dark:text-neutral-300">ریال</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeMonthModal}
                  className="h-9 px-4 rounded-xl border border-neutral-300 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
                >
                  انصراف
                </button>

                <button
                  type="button"
                  onClick={handleMonthModalSave}
                  disabled={saving}
                  className="h-9 w-11 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 grid place-items-center disabled:opacity-50"
                  aria-label="ثبت برآورد"
                  title="ثبت برآورد"
                >
                  <img src="/images/icons/check.svg" alt="" className="w-5 h-5 invert dark:invert-0" />
                </button>
              </div>
            </div>
          </div>
        )}

        {err && <div className="text-sm text-red-600 dark:text-red-400 mt-3">{err}</div>}

        <div className="mt-4 flex items-center gap-2 justify-end">
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
