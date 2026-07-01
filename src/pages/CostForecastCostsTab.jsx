import React, { useCallback, useEffect, useMemo, useState } from "react";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";
import {
  hoverSelectableCrudTablePreset as tablePreset,
  getHoverSelectableRowClass,
} from "../components/ui/tablePresets.js";
import { api } from "../utils/api.js";

const toEnDigits = (value = "") =>
  String(value)
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

const toFaDigits = (value = "") =>
  String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

const parseMoney = (value) => {
  const sign = /^\s*-/.test(String(value ?? "")) ? -1 : 1;
  const digits = toEnDigits(String(value ?? "")).replace(/[^\d]/g, "");
  if (!digits) return 0;
  return sign * Number.parseInt(digits, 10);
};

const formatMoney = (value) => {
  const num = Number(value || 0);
  const sign = num < 0 ? "-" : "";
  const digits = String(Math.abs(num));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const normalizeCode = (value = "") =>
  toEnDigits(value)
    .trim()
    .replace(/[^\d.-]/g, "-")
    .replace(/[.-]+/g, "-")
    .replace(/^-/, "")
    .replace(/-$/, "");

const isTopProjectCode = (code) => {
  const clean = toEnDigits(String(code ?? "")).trim();
  return Boolean(clean) && !clean.includes(".") && !clean.includes("-") && /^\d+$/.test(clean);
};

const normalizeProject = (project) => ({
  id: String(project?.id ?? ""),
  code: toEnDigits(String(project?.code ?? "")).trim(),
  name: String(project?.name ?? "").trim(),
  isActive: project?.isActive !== false,
});

const normalizeBreakdownItem = (item) => ({
  id: String(item?.id ?? ""),
  budgetCode: normalizeCode(item?.budgetCode ?? item?.budget_code ?? ""),
  budgetName: String(item?.budgetName ?? item?.budget_name ?? "").trim(),
  baseBudget: String(item?.baseBudget ?? item?.base_budget ?? "0"),
});

const projectBudgetCode = (projectCode, value = "") => {
  const projectCodeClean = normalizeCode(projectCode);
  const code = normalizeCode(value);
  if (!code || !projectCodeClean) return code;
  if (code === projectCodeClean || code.startsWith(`${projectCodeClean}-`)) return code;
  return `${projectCodeClean}-${code}`;
};

const PERSIAN_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const currentPersianMonth = () => {
  try {
    const value = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "numeric" }).format(new Date());
    const month = Number(toEnDigits(value));
    return month >= 1 && month <= 12 ? month : 1;
  } catch {
    return 1;
  }
};

function PlusButton({ onClick, disabled = false, title = "افزودن پروژه" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="grid h-10 w-10 place-items-center rounded-xl border border-black/15 bg-white text-black shadow-sm transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
      aria-label={title}
      title={title}
    >
      <img src="/images/icons/afzodan.svg" alt="" className="h-5 w-5 dark:invert" />
    </button>
  );
}

function ExpandButton({ onClick, onMouseDown, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={onMouseDown}
      disabled={disabled}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-black/25 bg-white text-lg font-bold leading-none text-black shadow-sm transition hover:bg-black/5 disabled:opacity-40 dark:border-white/20 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-white/10"
      aria-label="نمایش / افزودن زیرمجموعه"
      title="نمایش / افزودن زیرمجموعه"
    >
      +
    </button>
  );
}

function TreeToggleButton({ expanded, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-[#1f2b38] bg-[#263445] text-white shadow-sm transition hover:bg-[#1f2b38]"
      aria-label={expanded ? "بستن زیرمجموعه" : "نمایش زیرمجموعه"}
      title={expanded ? "بستن زیرمجموعه" : "نمایش زیرمجموعه"}
    >
      <svg
        viewBox="0 0 20 20"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-transform ${expanded ? "rotate-180" : ""}`}
      >
        <path d="M5 8l5 5 5-5" />
      </svg>
    </button>
  );
}

export default function CostForecastCostsTab({
  storageApiPath = "/cost-forecast-costs",
  allowManualChildren = false,
} = {}) {
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [rowsByProject, setRowsByProject] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());
  const [adding, setAdding] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loadingProjectId, setLoadingProjectId] = useState("");
  const [err, setErr] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [savedProjectIds, setSavedProjectIds] = useState([]);
  const [forecastValues, setForecastValues] = useState({});
  const [customItems, setCustomItems] = useState([]);
  const [addingChildFor, setAddingChildFor] = useState("");
  const [childDraft, setChildDraft] = useState("");
  const [savingChildKey, setSavingChildKey] = useState("");
  const [savingCell, setSavingCell] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);

  const forecastMonths = useMemo(() => {
    const start = currentPersianMonth();
    return Array.from({ length: 6 }, (_, index) => {
      const monthIndex = ((start + index - 1) % 12) + 1;
      return { key: `m${monthIndex}`, label: PERSIAN_MONTH_NAMES[monthIndex - 1] };
    });
  }, []);

  const tableUi = tablePreset.table;
  const rowUi = tablePreset.row;
  const colCount = 3 + forecastMonths.length + 1;
  const paginationIconBtnCls =
    "h-9 w-9 rounded-lg grid place-items-center transition !bg-transparent !ring-0 !border-0 !shadow-none " +
    "hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed";

  const valueKey = useCallback((projectId, budgetCode, monthKey) => {
    return `${projectId}::${budgetCode}::${monthKey}`;
  }, []);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await api("/projects");
      const raw = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : res?.projects || [];
      const list = (Array.isArray(raw) ? raw : [])
        .map(normalizeProject)
        .filter((project) => project.id && project.isActive && isTopProjectCode(project.code))
        .sort((a, b) =>
          String(a.code || "").localeCompare(String(b.code || ""), "fa", {
            numeric: true,
            sensitivity: "base",
          }),
        );
      setProjects(list);
    } catch (ex) {
      setProjects([]);
      setErr(ex.message || "خطا در دریافت پروژه‌ها");
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const loadForecast = useCallback(async () => {
    try {
      const res = await api(storageApiPath);
      const projectIds = (Array.isArray(res?.projects) ? res.projects : [])
        .map((item) => String(item?.project_id ?? item?.projectId ?? ""))
        .filter(Boolean);
      const values = {};
      const items = [];
      (Array.isArray(res?.values) ? res.values : []).forEach((item) => {
        const projectId = String(item?.project_id ?? item?.projectId ?? "");
        const budgetCode = normalizeCode(item?.budget_code ?? item?.budgetCode ?? "");
        const monthKey = String(item?.month_key ?? item?.monthKey ?? "");
        if (!projectId || !budgetCode || !monthKey) return;
        values[valueKey(projectId, budgetCode, monthKey)] = String(item?.amount ?? "0");
      });
      if (allowManualChildren) {
        (Array.isArray(res?.items) ? res.items : []).forEach((item) => {
          const projectId = String(item?.project_id ?? item?.projectId ?? "");
          const code = normalizeCode(item?.code ?? "");
          const title = String(item?.title ?? "").trim();
          if (!projectId || !code || !title) return;
          items.push({
            id: String(item?.id ?? code),
            projectId,
            parentCode: normalizeCode(item?.parent_code ?? item?.parentCode ?? ""),
            code,
            title,
            rowIndex: Number(item?.row_index ?? item?.rowIndex ?? 0) || 0,
          });
        });
      }
      setSavedProjectIds(Array.from(new Set(projectIds)));
      setForecastValues(values);
      setCustomItems(items);
    } catch (ex) {
      setErr(ex.message || "خطا در دریافت پیش بینی هزینه‌ها");
    }
  }, [allowManualChildren, storageApiPath, valueKey]);

  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  const addedProjectIds = useMemo(
    () => new Set(rowsByProject.map((item) => String(item.project.id))),
    [rowsByProject],
  );

  const availableProjects = useMemo(
    () => projects.filter((project) => !addedProjectIds.has(String(project.id))),
    [projects, addedProjectIds],
  );

  const loadProjectEntry = useCallback(async (project) => {
    const res = await api(`/cost-breakdown?project_id=${encodeURIComponent(project.id)}`);
    const rawItems = Array.isArray(res?.items) ? res.items : [];
    const items = rawItems
      .map(normalizeBreakdownItem)
      .map((item) => ({
        ...item,
        budgetCode: projectBudgetCode(project.code, item.budgetCode),
      }))
      .filter((item) => item.budgetCode || item.budgetName)
      .sort((a, b) =>
        String(a.budgetCode || "").localeCompare(String(b.budgetCode || ""), "fa", {
          numeric: true,
          sensitivity: "base",
        }),
      );
    return { project, items };
  }, []);

  useEffect(() => {
    if (!projects.length || !savedProjectIds.length) return;

    let cancelled = false;
    const missingProjects = savedProjectIds
      .filter((id) => !addedProjectIds.has(String(id)))
      .map((id) => projects.find((project) => String(project.id) === String(id)))
      .filter(Boolean);

    if (!missingProjects.length) return;

    (async () => {
      try {
        const entries = await Promise.all(missingProjects.map(loadProjectEntry));
        if (cancelled) return;
        setRowsByProject((prev) => {
          const seen = new Set(prev.map((entry) => String(entry.project.id)));
          const next = [...prev];
          entries.forEach((entry) => {
            if (!seen.has(String(entry.project.id))) next.push(entry);
          });
          return next;
        });
      } catch (ex) {
        if (!cancelled) setErr(ex.message || "خطا در دریافت ساختار شکست هزینه‌ها");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [addedProjectIds, loadProjectEntry, projects, savedProjectIds]);

  const customItemsByProject = useMemo(() => {
    const map = new Map();
    if (!allowManualChildren) return map;
    customItems.forEach((item) => {
      const list = map.get(String(item.projectId)) || [];
      list.push(item);
      map.set(String(item.projectId), list);
    });
    return map;
  }, [allowManualChildren, customItems]);

  const makeChildRows = useCallback((projectEntry) => {
    const manualItems = (customItemsByProject.get(String(projectEntry.project.id)) || [])
      .slice()
      .sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0));
    const items = [
      ...(projectEntry.items || []),
      ...manualItems.map((item) => ({
        id: `manual-${item.id}`,
        budgetCode: item.code,
        budgetName: item.title,
        baseBudget: "0",
        parentCode: item.parentCode,
        isCustom: true,
        customId: item.id,
      })),
    ];
    if (!items.length) return [];

    const itemNodes = items.map((item, index) => ({
      kind: "breakdown",
      key: `breakdown:${projectEntry.project.id}:${item.id || item.budgetCode || index}`,
      projectId: projectEntry.project.id,
      code: item.budgetCode,
      name: item.budgetName,
      baseBudget: item.baseBudget,
      depth: 1,
      hasChildren: false,
      parentCode: normalizeCode(item.parentCode || ""),
      originalIndex: index,
      isCustom: !!item.isCustom,
      customId: item.customId || "",
    }));

    const byCode = new Map();
    itemNodes.forEach((node) => {
      if (node.code) byCode.set(node.code, node);
    });

    const childrenByParent = new Map();
    itemNodes.forEach((node) => {
      let parentCode = node.parentCode;
      if (!parentCode) {
        const parts = String(node.code || "").split("-").filter(Boolean);
        for (let index = parts.length - 1; index > 0; index -= 1) {
          const candidate = parts.slice(0, index).join("-");
          if (byCode.has(candidate)) {
            parentCode = candidate;
            break;
          }
        }
      }
      node.parentCode = parentCode;
      if (parentCode) {
        const list = childrenByParent.get(parentCode) || [];
        list.push(node);
        childrenByParent.set(parentCode, list);
      }
    });

    itemNodes.forEach((node) => {
      node.hasChildren = (childrenByParent.get(node.code) || []).length > 0;
    });

    const result = [];
    const used = new Set();
    const visit = (node, depth) => {
      if (!node || used.has(node.key)) return;
      used.add(node.key);
      result.push({ ...node, depth });
      if (!expandedKeys.has(node.key)) return;
      (childrenByParent.get(node.code) || []).forEach((child) => visit(child, depth + 1));
    };

    itemNodes
      .filter((node) => !node.parentCode)
      .forEach((node) => visit(node, 1));

    return result;
  }, [customItemsByProject, expandedKeys]);

  const displayRows = useMemo(() => {
    const result = [];
    rowsByProject.forEach((entry) => {
      const projectKey = `project:${entry.project.id}`;
      const childRows = makeChildRows(entry);
      result.push({
        kind: "project",
        key: projectKey,
        projectId: entry.project.id,
        code: entry.project.code,
        name: entry.project.name,
        baseBudget: "0",
        depth: 0,
        hasChildren: (entry.items || []).length > 0 || (customItemsByProject.get(String(entry.project.id)) || []).length > 0,
      });
      if (expandedKeys.has(projectKey)) result.push(...childRows);
    });
    return result;
  }, [customItemsByProject, expandedKeys, makeChildRows, rowsByProject]);

  const totalRows = displayRows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / Math.max(1, rowsPerPage)));
  const safePage = Math.min(page, pageCount - 1);
  const startIdx = safePage * rowsPerPage;
  const endIdx = Math.min(totalRows, startIdx + rowsPerPage);
  const pageItems = displayRows.slice(startIdx, endIdx);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const visibleKeys = useMemo(() => pageItems.map((row) => row.key), [pageItems]);
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const allVisibleSelected = visibleKeys.length > 0 && visibleKeys.every((key) => selectedSet.has(key));
  const someVisibleSelected = visibleKeys.some((key) => selectedSet.has(key)) && !allVisibleSelected;

  const toggleRowSelect = (key) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key);
      return [...prev, key];
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedKeys((prev) => {
      if (allVisibleSelected) return prev.filter((key) => !visibleKeys.includes(key));
      return Array.from(new Set([...prev, ...visibleKeys]));
    });
  };

  const entryByProjectId = useMemo(() => {
    const map = new Map();
    rowsByProject.forEach((entry) => map.set(String(entry.project.id), entry));
    return map;
  }, [rowsByProject]);

  const isLeafBudgetCode = useCallback((projectId, budgetCode) => {
    const entry = entryByProjectId.get(String(projectId));
    const manualItems = customItemsByProject.get(String(projectId)) || [];
    const code = String(budgetCode || "");
    if (!code) return true;
    const allItems = [
      ...(entry?.items || []).map((item) => ({ code: item.budgetCode })),
      ...manualItems.map((item) => ({ code: item.code, parentCode: item.parentCode })),
    ];
    return !allItems.some((item) => {
      const other = String(item.code || "");
      return other && other !== code && other.startsWith(`${code}-`);
    });
  }, [customItemsByProject, entryByProjectId]);

  const getCellAmount = useCallback((projectId, budgetCode, monthKey) => {
    const raw = forecastValues[valueKey(projectId, budgetCode, monthKey)];
    return Number.parseInt(String(raw ?? "0"), 10) || 0;
  }, [forecastValues, valueKey]);

  const getRowMonthTotal = useCallback((row, monthKey) => {
    if (!row) return 0;

    if (row.kind === "project") {
      const entry = entryByProjectId.get(String(row.projectId));
      const manualItems = customItemsByProject.get(String(row.projectId)) || [];
      const allItems = [
        ...(entry?.items || []).map((item) => ({ code: item.budgetCode })),
        ...manualItems.map((item) => ({ code: item.code })),
      ];
      return allItems.reduce((sum, item) => {
        if (!isLeafBudgetCode(row.projectId, item.code)) return sum;
        return sum + getCellAmount(row.projectId, item.code, monthKey);
      }, 0);
    }

    if (row.hasChildren) {
      const entry = entryByProjectId.get(String(row.projectId));
      const manualItems = customItemsByProject.get(String(row.projectId)) || [];
      const allItems = [
        ...(entry?.items || []).map((item) => ({ code: item.budgetCode })),
        ...manualItems.map((item) => ({ code: item.code })),
      ];
      const prefix = `${row.code}-`;
      return allItems.reduce((sum, item) => {
        const code = String(item.code || "");
        if (!code.startsWith(prefix)) return sum;
        if (!isLeafBudgetCode(row.projectId, code)) return sum;
        return sum + getCellAmount(row.projectId, code, monthKey);
      }, 0);
    }

    return getCellAmount(row.projectId, row.code, monthKey);
  }, [customItemsByProject, entryByProjectId, getCellAmount, isLeafBudgetCode]);

  const getRowGrandTotal = useCallback((row) => {
    return forecastMonths.reduce((sum, month) => sum + getRowMonthTotal(row, month.key), 0);
  }, [getRowMonthTotal]);

  const totalByMonth = useMemo(() => {
    const totals = {};
    forecastMonths.forEach((month) => {
      totals[month.key] = rowsByProject.reduce((sum, entry) => {
        const manualItems = customItemsByProject.get(String(entry.project.id)) || [];
        const allItems = [
          ...(entry.items || []).map((item) => ({ code: item.budgetCode })),
          ...manualItems.map((item) => ({ code: item.code })),
        ];
        return sum + allItems.reduce((inner, item) => {
          if (!isLeafBudgetCode(entry.project.id, item.code)) return inner;
          return inner + getCellAmount(entry.project.id, item.code, month.key);
        }, 0);
      }, 0);
    });
    return totals;
  }, [customItemsByProject, getCellAmount, isLeafBudgetCode, rowsByProject]);

  const totalGrand = useMemo(
    () => forecastMonths.reduce((sum, month) => sum + (totalByMonth[month.key] || 0), 0),
    [totalByMonth],
  );

  const toggleExpanded = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const startAddChild = (row) => {
    if (!allowManualChildren || !row) return;
    if (addingChildFor === row.key) {
      if (String(childDraft || "").trim()) {
        saveChild(row);
      } else {
        setAddingChildFor("");
        setChildDraft("");
      }
      return;
    }
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      next.add(row.key);
      return next;
    });
    setAddingChildFor(row.key);
    setChildDraft("");
  };

  const saveChild = async (row) => {
    if (!allowManualChildren || savingChildKey) return;
    const title = String(childDraft || "").trim();
    if (!row || !title) {
      setAddingChildFor("");
      setChildDraft("");
      return;
    }

    setErr("");
    setSavingChildKey(row.key);
    try {
      const res = await api(storageApiPath, {
        method: "POST",
        body: JSON.stringify({
          action: "add_item",
          project_id: Number(row.projectId),
          parent_code: row.kind === "project" ? "" : row.code,
          title,
        }),
      });
      const item = res?.item;
      if (item?.code) {
        setCustomItems((prev) => [
          ...prev,
          {
            id: String(item.id ?? item.code),
            projectId: String(item.project_id ?? item.projectId ?? row.projectId),
            parentCode: normalizeCode(item.parent_code ?? item.parentCode ?? ""),
            code: normalizeCode(item.code),
            title: String(item.title ?? title),
            rowIndex: Number(item.row_index ?? item.rowIndex ?? Date.now()) || Date.now(),
          },
        ]);
      }
      setAddingChildFor("");
      setChildDraft("");
    } catch (ex) {
      setErr(ex.message || "خطا در افزودن زیرمجموعه");
    } finally {
      setSavingChildKey("");
    }
  };

  const updateCellValue = (row, monthKey, rawValue) => {
    if (!row || row.kind !== "breakdown" || row.hasChildren) return;
    const amount = parseMoney(rawValue);
    const key = valueKey(row.projectId, row.code, monthKey);
    setForecastValues((prev) => ({ ...prev, [key]: String(amount) }));
  };

  const saveCellValue = async (row, monthKey) => {
    if (!row || row.kind !== "breakdown" || row.hasChildren) return;
    const key = valueKey(row.projectId, row.code, monthKey);
    const amount = forecastValues[key] || "0";
    setSavingCell(key);
    setErr("");
    try {
      await api(storageApiPath, {
        method: "PATCH",
        body: JSON.stringify({
          project_id: Number(row.projectId),
          budget_code: row.code,
          month_key: monthKey,
          amount,
        }),
      });
    } catch (ex) {
      setErr(ex.message || "خطا در ذخیره مبلغ پیش بینی");
    } finally {
      setSavingCell((current) => (current === key ? "" : current));
    }
  };

  const removeForecastRows = async (rows) => {
    const targets = (Array.isArray(rows) ? rows : [rows]).filter(Boolean);
    if (!targets.length) return;

    setErr("");
    try {
      for (const row of targets) {
        if (row.kind === "project") {
          await api(storageApiPath, {
            method: "DELETE",
            body: JSON.stringify({ project_id: Number(row.projectId) }),
          });
          setRowsByProject((prev) => prev.filter((entry) => String(entry.project.id) !== String(row.projectId)));
          setSavedProjectIds((prev) => prev.filter((id) => String(id) !== String(row.projectId)));
          setForecastValues((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((key) => {
              if (key.startsWith(`${row.projectId}::`)) delete next[key];
            });
            return next;
          });
          continue;
        }

        const entry = entryByProjectId.get(String(row.projectId));
        const codes = row.hasChildren
          ? (entry?.items || [])
              .map((item) => item.budgetCode)
              .filter((code) => String(code || "").startsWith(`${row.code}-`))
          : [row.code];

        setForecastValues((prev) => {
          const next = { ...prev };
          codes.forEach((code) => {
            forecastMonths.forEach((month) => delete next[valueKey(row.projectId, code, month.key)]);
          });
          return next;
        });

        await Promise.all(
          codes.map((code) =>
            api(storageApiPath, {
              method: "DELETE",
              body: JSON.stringify({
                project_id: Number(row.projectId),
                budget_code: code,
                item_id: row.isCustom && code === row.code ? Number(row.customId) : undefined,
              }),
            }),
          ),
        );
        if (row.isCustom) {
          setCustomItems((prev) => prev.filter((item) => String(item.id) !== String(row.customId)));
        }
      }
      setSelectedKeys([]);
    } catch (ex) {
      setErr(ex.message || "خطا در حذف مقادیر پیش بینی");
    }
  };

  const focusFirstEditableCell = (row) => {
    if (!row || row.kind !== "breakdown" || row.hasChildren) return;
    window.setTimeout(() => {
      const el = document.querySelector(`[data-forecast-cell="${row.key}-${forecastMonths[0]?.key || "m1"}"]`);
      if (el) {
        el.focus();
        el.select?.();
      }
    }, 0);
  };

  const addProject = async (projectId) => {
    const project = projects.find((item) => String(item.id) === String(projectId));
    if (!project || addedProjectIds.has(String(project.id))) return;

    setErr("");
    setLoadingProjectId(String(project.id));
    try {
      const entry = await loadProjectEntry(project);
      await api(storageApiPath, {
        method: "POST",
        body: JSON.stringify({ project_id: Number(project.id) }),
      });
      setRowsByProject((prev) => [...prev, entry]);
      setSavedProjectIds((prev) => Array.from(new Set([...prev, String(project.id)])));
      setSelectedProjectId("");
      setAdding(false);
    } catch (ex) {
      setErr(ex.message || "خطا در دریافت ساختار شکست هزینه‌ها");
    } finally {
      setLoadingProjectId("");
    }
  };

  const handleSelectProject = (value) => {
    setSelectedProjectId(value);
    if (value) addProject(value);
  };

  return (
    <>
      <TableWrap>
        <div className={tableUi.outer}>
          <div className={tableUi.innerPad}>
            <div className={`${tableUi.frame} shadow-sm`}>
              <div className="relative max-h-[55vh] overflow-y-auto overflow-x-auto pb-0">
                <table
                  className="w-full min-w-full table-fixed text-sm [&_th]:text-center [&_td]:text-center [&_th]:py-0.5 [&_td]:py-0.5 [&_th]:whitespace-nowrap [&_td]:min-w-0"
                  dir="rtl"
                >
                  <colgroup>
                    <col style={{ width: 48 }} />
                    <col style={{ width: 112 }} />
                    <col style={{ width: "28%" }} />
                    {forecastMonths.map((month) => (
                      <col key={month.key} style={{ width: 92 }} />
                    ))}
                    <col style={{ width: 156 }} />
                  </colgroup>
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
                      <TH className={`w-28 ${tableUi.th}`}>کد بودجه</TH>
                      <TH className={tableUi.th}>نام بودجه</TH>
                      {forecastMonths.map((month) => (
                        <TH key={month.key} className={`w-20 md:w-24 px-0 ${tableUi.th}`}>
                          {month.label}
                        </TH>
                      ))}
                      <TH className={`w-40 border-l border-r border-black/10 dark:border-neutral-700 ${tableUi.th}`}>
                        جمع
                      </TH>
                    </tr>
                  </THead>

                  <tbody className={tableUi.body}>
                    {displayRows.length > 0 && (
                      <TR className="text-center bg-black/[0.04] font-semibold dark:bg-white/10">
                        <TD className="px-2 py-3 border-b border-black/10 dark:border-neutral-800">-</TD>
                        <TD className="px-2 py-3 border-b border-black/10 dark:border-neutral-800">-</TD>
                        <TD className="px-2 py-3 text-center border-b border-black/10 dark:border-neutral-800">جمع</TD>
                        {forecastMonths.map((month) => (
                          <TD key={`total-${month.key}`} className="px-0 py-2 text-center align-middle border-b border-black/10 dark:border-neutral-800">
                            {totalByMonth[month.key] ? toFaDigits(formatMoney(totalByMonth[month.key])) : "—"}
                          </TD>
                        ))}
                        <TD className="px-3 py-3 whitespace-nowrap text-center border-l border-r border-b border-black/10 dark:border-neutral-700">
                          <span className="ltr">{toFaDigits(formatMoney(totalGrand || 0))}</span>
                        </TD>
                      </TR>
                    )}

                    {pageItems.map((row, index) => {
                      const isSelected = selectedSet.has(row.key);
                      const isProject = row.kind === "project";
                      const canEditAmounts = row.kind === "breakdown" && !row.hasChildren;
                      const rowIndent = `${Math.min(Math.max(0, Number(row.depth || 0)), 4) * 36}px`;
                      const rowIndentStyle = { paddingRight: rowIndent };
                      const rowGrandTotal = getRowGrandTotal(row);
                      const actionTargets = selectedKeys.length > 1 && isSelected
                        ? displayRows.filter((item) => selectedSet.has(item.key))
                        : [row];
                      const codeTextClass = isProject
                        ? "text-[13px] md:text-[15px] font-semibold"
                        : row.depth
                          ? "text-[11px] md:text-xs"
                          : "text-xs md:text-[13px]";
                      const nameCellTextClass = isProject
                        ? "text-[12px] md:text-[14px] font-semibold"
                        : row.depth
                          ? "text-[10px] md:text-[12px]"
                          : "text-[11px] md:text-[13px]";
                      const isAddingChild = allowManualChildren && addingChildFor === row.key;
                      const isSavingChild = savingChildKey === row.key;
                      const isExpanded = expandedKeys.has(row.key);

                      return (
                        <React.Fragment key={row.key}>
                        <TR className={getHoverSelectableRowClass(isSelected)}>
                          <TD className="px-2 py-3">
                            <input
                              type="checkbox"
                              className={rowUi.checkbox}
                              checked={isSelected}
                              onChange={() => toggleRowSelect(row.key)}
                              aria-label="انتخاب ردیف"
                              title="انتخاب ردیف"
                            />
                          </TD>
                          <TD className="px-2 py-3 whitespace-nowrap text-right">
                            <div
                              className={`flex items-center justify-start gap-2 ${allowManualChildren ? "flex-row-reverse" : ""}`}
                              dir={allowManualChildren ? "ltr" : "rtl"}
                              style={rowIndentStyle}
                            >
                              {allowManualChildren ? (
                                <>
                                  <span className={`ltr ${codeTextClass}`}>{row.code || "—"}</span>
                                  <ExpandButton
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => startAddChild(row)}
                                  />
                                </>
                              ) : row.hasChildren ? (
                                <>
                                  <ExpandButton onClick={() => toggleExpanded(row.key)} />
                                  <span className={`ltr ${codeTextClass}`}>{row.code || "—"}</span>
                                </>
                              ) : (
                                <span className={`ltr ${codeTextClass}`}>{row.code || "—"}</span>
                              )}
                            </div>
                          </TD>

                          <TD className={`px-2 py-3 text-right break-words max-w-[180px] ${nameCellTextClass}`}>
                            <div className="flex items-center justify-start gap-2" dir="rtl" style={rowIndentStyle}>
                              {row.name || "—"}
                              {allowManualChildren && row.hasChildren ? (
                                <TreeToggleButton
                                  expanded={isExpanded}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    toggleExpanded(row.key);
                                  }}
                                />
                              ) : null}
                            </div>
                          </TD>

                          {forecastMonths.map((month) => {
                            const amount = getRowMonthTotal(row, month.key);
                            const cellKey = valueKey(row.projectId, row.code, month.key);
                            const isSaving = savingCell === cellKey;

                            return (
                            <TD key={`${row.key}-${month.key}`} className="px-0 py-2 text-center align-middle">
                              {canEditAmounts ? (
                                <input
                                  data-forecast-cell={`${row.key}-${month.key}`}
                                  dir="ltr"
                                  value={amount ? toFaDigits(formatMoney(amount)) : ""}
                                  onChange={(event) => updateCellValue(row, month.key, event.target.value)}
                                  onBlur={() => saveCellValue(row, month.key)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      event.currentTarget.blur();
                                    }
                                    if (event.key === "Escape") {
                                      event.preventDefault();
                                      event.currentTarget.blur();
                                    }
                                  }}
                                  className={`w-[5.5rem] mx-auto h-10 md:w-[5.5rem] md:h-10 rounded-xl border text-[10px] md:text-[11px] text-center bg-white text-black border-black/20 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-600 outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 ${
                                    isSaving ? "opacity-70" : ""
                                  }`}
                                  placeholder="0"
                                />
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className={`w-[5.5rem] mx-auto h-10 md:w-[5.5rem] md:h-10 rounded-xl border text-[10px] md:text-[11px] flex items-center justify-center shadow-sm transition ${
                                    amount
                                      ? "bg-[#edaf7c] border-[#edaf7c]/90 text-black"
                                      : "bg-black/5 border-black/10 text-black/70 dark:bg-white/5 dark:border-neutral-700 dark:text-neutral-100"
                                  } cursor-default`}
                                >
                                  {amount ? toFaDigits(formatMoney(amount)) : "—"}
                                </button>
                              )}
                            </TD>
                            );
                          })}

                          <TD className="px-3 py-3 whitespace-nowrap text-center border-l border-r border-black/10 dark:border-neutral-700">
                            <div className="relative mx-auto flex min-h-[34px] w-full max-w-[230px] items-center justify-center overflow-visible">
                              <span
                                className={`inline-flex items-center justify-center gap-1 px-1 transition-transform duration-200 ${
                                  isSelected ? "translate-x-7" : "group-hover:translate-x-7"
                                }`}
                              >
                                <span className="ltr">{rowGrandTotal ? toFaDigits(formatMoney(rowGrandTotal)) : "۰"}</span>
                              </span>

                              <div
                                className={`absolute left-1 top-1/2 flex -translate-y-1/2 items-center gap-1 transition-all duration-200 ${
                                  isSelected
                                    ? "translate-x-0 opacity-100 pointer-events-auto"
                                    : "-translate-x-1 opacity-0 pointer-events-none group-hover:translate-x-0 group-hover:opacity-100 group-hover:pointer-events-auto"
                                }`}
                              >
                                <RowActionIconBtn
                                  action="edit"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    focusFirstEditableCell(row);
                                  }}
                                  disabled={!canEditAmounts}
                                  size={34}
                                  iconSize={15}
                                />
                                <RowActionIconBtn
                                  action="delete"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    removeForecastRows(actionTargets);
                                  }}
                                  size={34}
                                  iconSize={16}
                                />
                              </div>
                            </div>
                          </TD>
                        </TR>
                        {isAddingChild && (
                          <TR>
                            <TD className="px-2 py-3">-</TD>
                            <TD colSpan={colCount - 1} className="px-2 py-3 text-right">
                              <div className="flex w-full items-center justify-start" style={{ paddingRight: `calc(${rowIndent} + 36px)` }}>
                                <input
                                  value={childDraft}
                                  onChange={(event) => setChildDraft(event.target.value)}
                                  onBlur={() => saveChild(row)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      event.currentTarget.blur();
                                    }
                                    if (event.key === "Escape") {
                                      event.preventDefault();
                                      setAddingChildFor("");
                                      setChildDraft("");
                                    }
                                  }}
                                  disabled={isSavingChild}
                                  dir="rtl"
                                  className="h-12 w-full max-w-3xl rounded-xl border border-black/15 bg-white px-4 text-right text-base text-black shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-black/25 focus:ring-2 focus:ring-black/10 disabled:opacity-70 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-white/25 dark:focus:ring-white/20"
                                  placeholder="عنوان زیرمجموعه"
                                  autoFocus
                                />
                              </div>
                            </TD>
                          </TR>
                        )}
                        </React.Fragment>
                      );
                    })}

                    {adding && (
                      <TR>
                        <TD className="px-2 py-3">-</TD>
                        <TD colSpan={2} className="px-2 py-3 text-right">
                          <select
                            value={selectedProjectId}
                            onChange={(event) => handleSelectProject(event.target.value)}
                            disabled={projectsLoading || Boolean(loadingProjectId)}
                            className="h-11 w-full max-w-xl rounded-xl border border-black/15 bg-white px-4 text-right text-base text-black outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                            autoFocus
                          >
                            <option value="">
                              {projectsLoading ? "در حال دریافت پروژه‌ها..." : "انتخاب پروژه"}
                            </option>
                            {availableProjects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.code}
                                {project.name ? ` - ${project.name}` : ""}
                              </option>
                            ))}
                          </select>
                        </TD>
                        {forecastMonths.map((month) => (
                          <TD key={`select-${month.key}`} className="px-0 py-2" />
                        ))}
                        <TD className="px-3 py-3 border-l border-r border-black/10 dark:border-neutral-700">
                          {loadingProjectId ? (
                            <span className="text-xs text-black/55 dark:text-neutral-400">در حال افزودن...</span>
                          ) : null}
                        </TD>
                      </TR>
                    )}

                    <TR>
                      <TD colSpan={colCount} className="px-3 py-3 text-right">
                        <PlusButton
                          onClick={() => {
                            setAdding(true);
                            setErr("");
                          }}
                          disabled={adding || projectsLoading || availableProjects.length === 0}
                        />
                      </TD>
                    </TR>
                  </tbody>
                </table>
              </div>

              <div className="border-t border-neutral-300 dark:border-neutral-800 px-3 py-2">
                <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center md:justify-between gap-2">
                  <div className="flex items-center justify-between md:justify-start gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                      disabled={safePage <= 0}
                      className={paginationIconBtnCls}
                      aria-label="صفحه قبل"
                      title="صفحه قبل"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.min(pageCount - 1, prev + 1))}
                      disabled={safePage >= pageCount - 1}
                      className={paginationIconBtnCls}
                      aria-label="صفحه بعد"
                      title="صفحه بعد"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>

                    <div className="text-black/70 dark:text-neutral-400 whitespace-nowrap">
                      {totalRows === 0 ? "۰ از ۰" : `${toFaDigits(startIdx + 1)}–${toFaDigits(endIdx)} از ${toFaDigits(totalRows)}`}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-start gap-2 text-sm">
                    <span className="text-black/70 dark:text-neutral-400">تعداد در هر صفحه:</span>
                    <div className="inline-flex h-9 overflow-hidden rounded-lg border border-black/10 bg-white dark:border-white/15 dark:bg-white/5">
                      {[10, 25, 100].map((count) => {
                        const active = rowsPerPage === count;
                        return (
                          <button
                            key={count}
                            type="button"
                            onClick={() => {
                              setRowsPerPage(count);
                              setPage(0);
                            }}
                            className={
                              "min-w-10 px-3 text-sm font-semibold transition " +
                              (active
                                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                                : "text-neutral-700 hover:bg-black/[0.04] dark:text-white/75 dark:hover:bg-white/10")
                            }
                            aria-pressed={active}
                          >
                            {toFaDigits(count)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TableWrap>

      {err && <div className="px-[15px] text-sm text-red-600 dark:text-red-400">{err}</div>}
    </>
  );
}
