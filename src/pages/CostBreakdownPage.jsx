import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/ui/Card.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";
import { api } from "../utils/api.js";

const PAGE_ICON = "/images/icons/sakhtar-shekast.svg";

const SHARED_ESTIMATE_TABS = [
  { id: "office", label: "دفتر", prefix: "OB" },
  { id: "site", label: "سایت", prefix: "SB" },
  { id: "finance", label: "مالی", prefix: "FB" },
  { id: "cash", label: "نقدی", prefix: "CB" },
  { id: "capex", label: "سرمایه‌ای", prefix: "IB" },
];

const tableWrapCls =
  "rounded-2xl border border-black/10 overflow-hidden bg-white text-black " +
  "dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800";

const theadRowCls =
  "bg-neutral-200 text-black border-b border-neutral-300 " +
  "dark:bg-white/10 dark:text-neutral-100 dark:border-neutral-700";

const tbodyCls =
  "[&_td]:text-black dark:[&_td]:text-neutral-100 " +
  "[&_tr:nth-child(odd)]:bg-white [&_tr:nth-child(even)]:bg-neutral-50 " +
  "dark:[&_tr:nth-child(odd)]:bg-neutral-900 dark:[&_tr:nth-child(even)]:bg-neutral-800/50";

const rowDividerCls = "border-b border-neutral-300 dark:border-neutral-700";

const rowActionsRevealCls =
  "w-full flex items-center justify-center gap-1 opacity-0 pointer-events-none transition-opacity " +
  "group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto";

const toEnDigits = (value = "") =>
  String(value)
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

const toFaDigits = (value = "") =>
  String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

const parseMoney = (value) => {
  const normalized = toEnDigits(value).replace(/[^\d]/g, "");
  if (!normalized) return "0";
  return String(BigInt(normalized));
};

const formatMoney = (value) => {
  const raw = parseMoney(value);
  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const normalizeItem = (item) => ({
  id: item?.id,
  projectId: item?.projectId ?? item?.project_id,
  budgetCode: String(item?.budgetCode ?? item?.budget_code ?? "").trim(),
  budgetName: String(item?.budgetName ?? item?.budget_name ?? "").trim(),
  baseBudget: parseMoney(item?.baseBudget ?? item?.base_budget ?? 0),
});

const normalizeCode = (value = "") => {
  const raw = toEnDigits(value).trim().toUpperCase();
  const prefixed = raw.match(/^(OB|SB|FB|CB|IB)[-.]?\s*(.*)$/i);
  if (prefixed) {
    const suffix = String(prefixed[2] || "")
      .replace(/[^\d.-]/g, "-")
      .replace(/[.-]+/g, "-")
      .replace(/^-/, "")
      .replace(/-$/, "");
    return suffix ? `${prefixed[1].toUpperCase()}-${suffix}` : "";
  }

  return raw
    .replace(/^PB[-.]?/i, "")
    .replace(/[^\d.-]/g, "-")
    .replace(/[.-]+/g, "-")
    .replace(/^-/, "")
    .replace(/-$/, "");
};

const coreOf = (value = "") => {
  const raw = toEnDigits(String(value || "")).trim();
  const noPrefix = raw.replace(/^[A-Za-z]+[^0-9]*/, "");
  return noPrefix.replace(/[^0-9.]+/g, ".").replace(/\.+/g, ".").replace(/^\./, "").replace(/\.$/, "");
};

const isTopProjectCode = (code) => /^\d{3}$/.test(toEnDigits(String(code || "")).trim());

const displayCode = (value = "") => normalizeCode(value);

const sharedEstimateCode = (baseCode, value = "") => {
  const suffix = normalizeCode(String(value || "").replace(/^[A-Za-z]+[-.]?/i, ""));
  return baseCode && suffix ? `${baseCode}-${suffix}` : suffix;
};

const estimateNameOf = (item) => {
  const direct = String(item?.center_desc ?? item?.name ?? "").trim();
  if (direct) return direct;
  const rawDesc = item?.last_desc ?? item?.description ?? "";
  try {
    const parsed = JSON.parse(String(rawDesc || ""));
    return String(parsed?.desc || "").trim();
  } catch {
    return String(rawDesc || "").trim();
  }
};

export default function CostBreakdownPage() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [budgetCodeOptions, setBudgetCodeOptions] = useState([]);

  const [budgetCode, setBudgetCode] = useState("");
  const [budgetName, setBudgetName] = useState("");
  const [baseBudget, setBaseBudget] = useState("");
  const [pendingRows, setPendingRows] = useState([]);
  const pendingRowsRef = useRef([]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);

  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState({
    budgetCode: "",
    budgetName: "",
    baseBudget: "",
  });

  const selectedProject = useMemo(
    () => (projects || []).find((p) => String(p.id) === String(projectId)),
    [projects, projectId]
  );

  const sortedProjects = useMemo(
    () =>
      (projects || [])
        .slice()
        .sort((a, b) =>
          String(a?.code || "").localeCompare(String(b?.code || ""), "fa", {
            numeric: true,
            sensitivity: "base",
          })
        ),
    [projects]
  );

  const selectedProjectCode = normalizeCode(selectedProject?.code || "");

  const projectBudgetCode = useCallback(
    (value = "") => {
      const code = normalizeCode(value);
      const sharedMatch = code.match(/^(OB|SB|FB|CB|IB)-(.+)$/i);
      if (selectedProjectCode === "100" && sharedMatch) return `${selectedProjectCode}-${sharedMatch[2]}`;
      return code;
    },
    [selectedProjectCode]
  );

  const tableRows = useMemo(() => {
    const pending = pendingRows.map((row, idx) => ({
      kind: "pending",
      key: `pending:${row.tempId}`,
      row,
      label: `جدید ${idx + 1}`,
    }));

    const saved = rows.map((row, idx) => ({
      kind: "saved",
      key: `saved:${row.id}`,
      row,
      label: String(idx + 1),
    }));

    return [...pending, ...saved];
  }, [pendingRows, rows]);

  const safeRowsPerPage = Number(rowsPerPage) || 10;
  const totalRows = tableRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / safeRowsPerPage));
  const safePage = Math.min(page, totalPages - 1);
  const startIdx = safePage * safeRowsPerPage;
  const endIdx = Math.min(totalRows, startIdx + safeRowsPerPage);
  const pageItems = tableRows.slice(startIdx, endIdx);
  const visibleIds = pageItems.map((item) => item.key);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected;

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleRowSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const budgetCenterByCode = useMemo(() => {
    const map = new Map();
    for (const center of budgetCodeOptions || []) {
      const raw = projectBudgetCode(center?.code ?? "");
      if (!raw) continue;
      const name = String(center?.name ?? "").trim();
      map.set(raw, name);
      if (selectedProjectCode && raw.startsWith(selectedProjectCode + "-")) {
        map.set(raw.slice(selectedProjectCode.length + 1), name);
      }
    }
    return map;
  }, [budgetCodeOptions, projectBudgetCode, selectedProjectCode]);

  const resolvedBudgetName = useMemo(() => {
    const code = projectBudgetCode(budgetCode);
    if (!code) return "";
    return budgetCenterByCode.get(code) || "";
  }, [budgetCenterByCode, budgetCode, projectBudgetCode]);

  const handleBudgetCodeChange = (value) => {
    const nextCode = projectBudgetCode(value);
    const selectedOption = (budgetCodeOptions || []).find((item) => projectBudgetCode(item.code) === nextCode);
    const nextName = selectedOption?.name || budgetCenterByCode.get(nextCode) || "";
    setBudgetCode(nextCode);
    if (nextName && (!budgetName || budgetName === resolvedBudgetName)) {
      setBudgetName(nextName);
    }
    if (selectedOption?.baseAmount != null) {
      setBaseBudget(parseMoney(selectedOption.baseAmount));
    }
  };

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      // Same source as ProjectsPage; this page only keeps active, top-level projects.
      const res = await api("/projects");
      const raw = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
      const clean = raw
        .filter((p) => p && typeof p === "object")
        .map((p) => ({
          id: String(p.id),
          code: toEnDigits(String(p.code ?? "")).trim(),
          name: String(p.name ?? "").trim(),
          isActive: Boolean(p.isActive ?? true),
        }))
        .filter((p) => p.id && p.code && p.isActive)
        .filter((p) => isTopProjectCode(p.code));

      setProjects(clean);
    } catch {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const loadRows = useCallback(async (nextProjectId = projectId) => {
    if (!nextProjectId) {
      setRows([]);
      return;
    }

    setLoading(true);
    setErr("");
    try {
      const res = await api(`/cost-breakdown?project_id=${encodeURIComponent(nextProjectId)}`);
      const items = Array.isArray(res?.items) ? res.items : [];
      setRows(items.map(normalizeItem));
    } catch (ex) {
      setRows([]);
      setErr(ex.message || "خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadBudgetCenters = useCallback(async (nextProject) => {
    const baseCode = coreOf(nextProject?.code || "");
    if (!baseCode) {
      setBudgetCodeOptions([]);
      return;
    }

    try {
      const qs = new URLSearchParams();
      qs.set("kind", "projects");
      if (nextProject?.id) qs.set("project_id", String(nextProject.id));

      const shouldLoadSharedTabs = baseCode === "100";
      const [centersRes, estimatesRes, ...sharedResponses] = await Promise.all([
        api("/centers/projects").catch(() => ({ items: [] })),
        api("/budget-estimates?" + qs.toString()).catch(() => ({ items: [] })),
        ...(shouldLoadSharedTabs
          ? SHARED_ESTIMATE_TABS.map((tab) =>
              api(`/budget-estimates?kind=${encodeURIComponent(tab.id)}`).catch(() => ({ items: [] }))
            )
          : []),
      ]);

      const rawCenters = centersRes?.items || centersRes?.centers || centersRes?.data || centersRes || [];
      const centers = Array.isArray(rawCenters) ? rawCenters : [];
      const estimates = Array.isArray(estimatesRes?.items) ? estimatesRes.items : [];

      const scoped = centers
        .filter((item) => item && typeof item === "object")
        .filter((item) => {
          const code = coreOf(item?.suffix ?? item?.code ?? "");
          return code === baseCode || code.startsWith(baseCode + ".");
        });

      const byCode = new Map();
      for (const center of scoped) {
        const code = normalizeCode(center?.suffix ?? center?.code ?? "");
        if (!code) continue;
        byCode.set(code, {
          code,
          name: String(center?.description ?? center?.name ?? center?.center_desc ?? "").trim(),
          sourceLabel: "پروژه‌ها",
          baseAmount: 0,
        });
      }

      for (const item of estimates) {
        const code = normalizeCode(item?.code ?? "");
        if (!code) continue;
        const prev = byCode.get(code) || { code, name: "" };
        byCode.set(code, {
          code,
          name: prev.name || estimateNameOf(item),
          sourceLabel: prev.sourceLabel || "پروژه‌ها",
          baseAmount: item?.last_amount ?? item?.amount ?? prev.baseAmount ?? 0,
        });
      }

      if (shouldLoadSharedTabs) {
        SHARED_ESTIMATE_TABS.forEach((tab, index) => {
          const response = sharedResponses[index] || {};
          const items = Array.isArray(response?.items) ? response.items : [];
          for (const item of items) {
            const code = sharedEstimateCode(baseCode, item?.code ?? "");
            if (!code) continue;
            byCode.set(code, {
              code,
              name: estimateNameOf(item),
              sourceLabel: tab.label,
              baseAmount: item?.last_amount ?? item?.amount ?? 0,
            });
          }
        });
      }

      const options = Array.from(byCode.values()).sort((a, b) =>
        displayCode(a.code).localeCompare(displayCode(b.code), "fa", {
          numeric: true,
          sensitivity: "base",
        })
      );

      setBudgetCodeOptions(options);
    } catch {
      setBudgetCodeOptions([]);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!projectId) {
      setRows([]);
      setBudgetCodeOptions([]);
      setPendingRows([]);
      setSelectedIds(new Set());
      return;
    }
    clearDraft();
    setPendingRows([]);
    setSelectedIds(new Set());
    setPage(0);
    loadRows(projectId);
  }, [projectId, loadRows]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = new Set(tableRows.map((item) => item.key));
      const next = new Set();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
      });
      return next;
    });
  }, [tableRows]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  useEffect(() => {
    pendingRowsRef.current = pendingRows;
  }, [pendingRows]);

  useEffect(() => {
    loadBudgetCenters(selectedProject);
  }, [selectedProject, loadBudgetCenters]);

  useEffect(() => {
    if (!projectId) return;
    const exists = (projects || []).some((p) => String(p.id) === String(projectId));
    if (!exists) setProjectId("");
  }, [projectId, projects]);

  const clearDraft = () => {
    setBudgetCode("");
    setBudgetName("");
    setBaseBudget("");
    setErr("");
  };

  const addPendingRow = () => {
    const code = projectBudgetCode(budgetCode);
    const name = String(budgetName || resolvedBudgetName || "").trim();

    setErr("");
    if (!projectId) {
      setErr("مرکز/پروژه را انتخاب کنید.");
      return;
    }
    if (!code || !name) {
      setErr("کد بودجه معتبر وارد کنید تا نام بودجه به‌صورت خودکار پر شود.");
      return;
    }

    const existsSaved = rows.some((row) => projectBudgetCode(row.budgetCode) === code);
    const existsPending = pendingRows.some((row) => projectBudgetCode(row.budgetCode) === code);
    if (existsSaved || existsPending) {
      setErr("این کد بودجه قبلاً در جدول وجود دارد.");
      return;
    }

    setPendingRows((prev) => [
      ...prev,
      {
        tempId: `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        budgetCode: code,
        budgetName: name,
        baseBudget: parseMoney(baseBudget),
      },
    ]);
    clearDraft();
  };

  const removePendingRow = (tempId) => {
    setPendingRows((prev) => prev.filter((row) => row.tempId !== tempId));
  };

  const editPendingRow = (row) => {
    setBudgetCode(row.budgetCode || "");
    setBudgetName(row.budgetName || "");
    setBaseBudget(row.baseBudget || "");
    removePendingRow(row.tempId);
    setErr("");
  };

  const updatePendingBaseBudget = (tempId, value) => {
    setPendingRows((prev) =>
      prev.map((row) => (row.tempId === tempId ? { ...row, baseBudget: parseMoney(value) } : row))
    );
  };

  const upsertSavedRow = (item) => {
    const normalized = normalizeItem(item);
    if (!normalized.id) return;
    setRows((prev) => {
      const exists = prev.some((row) => String(row.id) === String(normalized.id));
      if (exists) return prev.map((row) => (String(row.id) === String(normalized.id) ? normalized : row));
      return [...prev, normalized].sort((a, b) =>
        projectBudgetCode(a.budgetCode).localeCompare(projectBudgetCode(b.budgetCode), "fa", {
          numeric: true,
          sensitivity: "base",
        })
      );
    });
  };

  const savePendingRow = async (row, { silent = false } = {}) => {
    if (!projectId || !row?.tempId) return false;

    const code = projectBudgetCode(row.budgetCode);
    const name = String(row.budgetName || "").trim();
    if (!code || !name) return false;

    if (!silent) setSaving(true);

    try {
      const res = await api("/cost-breakdown", {
        method: "POST",
        body: JSON.stringify({
          project_id: Number(projectId),
          budget_code: code,
          budget_name: name,
          base_budget: parseMoney(row.baseBudget),
        }),
      });

      if (res?.item) upsertSavedRow(res.item);
      removePendingRow(row.tempId);
      return true;
    } catch (ex) {
      if (!silent) {
        setErr(ex.message === "duplicate_budget_code" ? "این کد بودجه برای پروژه انتخاب‌شده قبلاً ثبت شده است." : ex.message || "خطا در ثبت");
      }
      return false;
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const savePendingOnBlur = async (tempId) => {
    const row = pendingRowsRef.current.find((item) => item.tempId === tempId);
    if (!row) return;
    await savePendingRow(row, { silent: true });
  };

  const saveDraft = async () => {
    setErr("");
    if (!projectId) {
      setErr("مرکز/پروژه را انتخاب کنید.");
      return;
    }
    if (!pendingRows.length) {
      setErr("ابتدا با دکمه افزودن، ردیف را به جدول اضافه کنید.");
      return;
    }

    setSaving(true);
    try {
      for (const row of pendingRows) {
        const ok = await savePendingRow(row, { silent: true });
        if (!ok) throw new Error("خطا در ثبت");
      }
      setPendingRows([]);
      await loadRows(projectId);
    } catch (ex) {
      setErr(ex.message === "duplicate_budget_code" ? "این کد بودجه برای پروژه انتخاب‌شده قبلاً ثبت شده است." : ex.message || "خطا در ثبت");
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (row) => {
    setEditId(row.id);
    setEditDraft({
      budgetCode: projectBudgetCode(row.budgetCode),
      budgetName: row.budgetName,
      baseBudget: row.baseBudget,
    });
    setErr("");
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditDraft({ budgetCode: "", budgetName: "", baseBudget: "" });
  };

  const saveEdit = async () => {
    if (!editId) return;

    const code = projectBudgetCode(editDraft.budgetCode);
    const name = String(editDraft.budgetName || "").trim();
    if (!code || !name) {
      setErr("کد بودجه و نام بودجه را وارد کنید.");
      return;
    }

    setSaving(true);
    setErr("");
    try {
      await api("/cost-breakdown", {
        method: "PATCH",
        body: JSON.stringify({
          id: Number(editId),
          project_id: Number(projectId),
          budget_code: code,
          budget_name: name,
          base_budget: parseMoney(editDraft.baseBudget),
        }),
      });
      cancelEdit();
      await loadRows(projectId);
    } catch (ex) {
      setErr(ex.message === "duplicate_budget_code" ? "این کد بودجه برای پروژه انتخاب‌شده قبلاً ثبت شده است." : ex.message || "خطا در ویرایش");
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row) => {
    if (!window.confirm("حذف این ردیف؟")) return;

    setSaving(true);
    setErr("");
    try {
      await api(`/cost-breakdown?id=${encodeURIComponent(row.id)}`, { method: "DELETE" });
      await loadRows(projectId);
    } catch (ex) {
      setErr(ex.message || "خطا در حذف");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-right text-neutral-900 outline-none placeholder:text-neutral-400 " +
    "focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500";

  const moneyInputCls =
    "h-9 w-full max-w-[180px] rounded-xl border border-neutral-300 bg-white px-2 text-center text-neutral-900 outline-none ltr " +
    "dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100";

  const PagerBtn = ({ direction, disabled, onClick }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-9 w-9 grid place-items-center rounded-lg bg-transparent hover:bg-black/5 active:bg-black/10 disabled:opacity-40 disabled:cursor-not-allowed dark:hover:bg-white/10 dark:active:bg-white/15"
      aria-label={direction === "prev" ? "صفحه قبل" : "صفحه بعد"}
      title={direction === "prev" ? "صفحه قبل" : "صفحه بعد"}
    >
      {direction === "prev" ? (
        <svg className="w-5 h-5 text-black/70 dark:text-neutral-200" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M10.7 6.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 1 1-1.4-1.4L15.29 12 10.7 7.7a1 1 0 0 1 0-1.4z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-black/70 dark:text-neutral-200" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M13.3 17.7a1 1 0 0 1-1.4 0l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 1 1 1.4 1.4L8.71 12l4.59 4.3a1 1 0 0 1 0 1.4z" />
        </svg>
      )}
    </button>
  );

  return (
    <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
      <div className="mb-5 flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
          <img src={PAGE_ICON} alt="" className="h-6 w-6 dark:invert" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-bold md:text-lg">ساختار شکست هزینه ها</span>
          <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت پروژه</span>
        </span>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white overflow-hidden dark:bg-neutral-900 dark:border-neutral-800">
        <div className="px-[15px] py-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1.2fr)_minmax(160px,0.8fr)_minmax(180px,1fr)] md:items-end">
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-sm text-neutral-700 dark:text-neutral-300">مرکز/پروژه</span>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  cancelEdit();
                  clearDraft();
                  setPendingRows([]);
                  setErr("");
                }}
                className={inputCls}
              >
                <option value="">{projectsLoading ? "در حال دریافت..." : "انتخاب کنید"}</option>
                {sortedProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code}
                    {p.name ? ` - ${p.name}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-sm text-neutral-700 dark:text-neutral-300">کد بودجه</span>
              <select
                value={budgetCode}
                onChange={(e) => handleBudgetCodeChange(e.target.value)}
                disabled={!projectId}
                className={inputCls + " font-sans tabular-nums"}
              >
                <option value=""></option>
                {budgetCodeOptions.map((item) => (
                  <option key={item.code} value={projectBudgetCode(item.code)}>
                    {item.sourceLabel ? `${item.sourceLabel} - ` : ""}
                    {projectBudgetCode(item.code)}
                    {item.name ? ` - ${item.name}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-sm text-neutral-700 dark:text-neutral-300">نام بودجه</span>
              <span className="flex min-w-0 items-center gap-2">
                <input
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  className={inputCls}
                  placeholder={resolvedBudgetName || "نام بودجه"}
                />
                <button
                  type="button"
                  onClick={addPendingRow}
                  disabled={!projectId || saving || !projectBudgetCode(budgetCode) || !budgetName}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white text-black transition hover:bg-black/5 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-200/20"
                  aria-label="افزودن به جدول"
                  title="افزودن به جدول"
                >
                  <img src="/images/icons/afzodan.svg" alt="" className="h-5 w-5" />
                </button>
              </span>
            </label>
          </div>
        </div>

        <div className="px-[15px] pb-4">
          <div className={tableWrapCls}>
            <div className="overflow-x-auto">
              <table
                dir="rtl"
                className="w-full min-w-[760px] table-fixed text-sm [&_th]:text-center [&_td]:text-center [&_th]:py-2 [&_td]:py-1.5"
              >
                <colgroup>
                  <col style={{ width: 48 }} />
                  <col style={{ width: 176 }} />
                  <col />
                  <col style={{ width: 176 }} />
                  <col style={{ width: 136 }} />
                </colgroup>
                <thead>
                  <tr className={theadRowCls}>
                    <th className="!text-[14px] md:!text-[15px] !font-semibold">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-black dark:accent-neutral-200"
                        checked={allVisibleSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someVisibleSelected;
                        }}
                        onChange={toggleSelectAllVisible}
                        aria-label="انتخاب همه"
                        title="انتخاب همه"
                      />
                    </th>
                    <th className="!text-[14px] md:!text-[15px] !font-semibold">کد بودجه</th>
                    <th className="!text-[14px] md:!text-[15px] !font-semibold">نام بودجه</th>
                    <th className="!text-[14px] md:!text-[15px] !font-semibold">بودجه مبنا</th>
                    <th className="!text-[14px] md:!text-[15px] !font-semibold">اقدامات</th>
                  </tr>
                </thead>

                <tbody className={tbodyCls}>
                  {!projectId ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-black/60 dark:text-neutral-400">
                        مرکز/پروژه را انتخاب کنید.
                      </td>
                    </tr>
                  ) : loading ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-black/60 dark:text-neutral-400">
                        در حال بارگذاری...
                      </td>
                    </tr>
                  ) : tableRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-black/60 dark:text-neutral-400">
                        موردی ثبت نشده.
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((item, pageIdx) => {
                      const row = item.row;
                      const isPending = item.kind === "pending";
                      const isEditing = !isPending && editId === row.id;
                      const divider = startIdx + pageIdx === tableRows.length - 1 ? "" : rowDividerCls;
                      const rowSelected = selectedIds.has(item.key);

                      if (isPending) {
                        return (
                          <tr key={item.key} className="group transition-colors hover:bg-black/[0.04] dark:hover:bg-white/10">
                            <td className={`px-3 ${divider}`}>
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-black dark:accent-neutral-200"
                                checked={rowSelected}
                                onChange={() => toggleRowSelect(item.key)}
                                aria-label="انتخاب"
                                title="انتخاب"
                              />
                            </td>
                            <td className={`px-3 ${divider}`}>
                              <span dir="ltr" className="inline-block w-full text-center font-sans tabular-nums">
                                {projectBudgetCode(row.budgetCode) || "—"}
                              </span>
                            </td>
                            <td className={`px-3 whitespace-normal break-words leading-6 ${divider}`}>{row.budgetName || "—"}</td>
                            <td className={`px-3 ${divider}`}>
                              <input
                                value={row.baseBudget ? toFaDigits(formatMoney(row.baseBudget)) : ""}
                                onChange={(e) => updatePendingBaseBudget(row.tempId, e.target.value)}
                                onBlur={() => savePendingOnBlur(row.tempId)}
                                className={moneyInputCls}
                                placeholder="0"
                                inputMode="numeric"
                              />
                            </td>
                            <td className={`px-3 ${divider}`}>
                              <div className="relative flex min-h-[34px] items-center justify-center">
                                <span className="transition-opacity group-hover:opacity-0">-</span>
                                <div className={`absolute inset-0 ${rowActionsRevealCls}`}>
                                  <RowActionIconBtn action="edit" onClick={() => editPendingRow(row)} disabled={saving} size={34} iconSize={15} />
                                  <RowActionIconBtn action="delete" onClick={() => removePendingRow(row.tempId)} disabled={saving} size={34} iconSize={16} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                          <tr key={item.key} className="group transition-colors hover:bg-black/[0.04] dark:hover:bg-white/10">
                            <td className={`px-3 ${divider}`}>
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-black dark:accent-neutral-200"
                                checked={rowSelected}
                                onChange={() => toggleRowSelect(item.key)}
                                aria-label="انتخاب"
                                title="انتخاب"
                              />
                            </td>
                            <td className={`px-3 ${divider}`}>
                              {isEditing ? (
                                <input
                                  value={editDraft.budgetCode}
                                  onChange={(e) =>
                                    setEditDraft((prev) => ({ ...prev, budgetCode: projectBudgetCode(e.target.value) }))
                                  }
                                  className={moneyInputCls + " font-sans tabular-nums"}
                                  spellCheck={false}
                                />
                              ) : (
                                <span dir="ltr" className="inline-block w-full text-center font-sans tabular-nums">
                                  {projectBudgetCode(row.budgetCode) || "—"}
                                </span>
                              )}
                            </td>
                            <td className={`px-3 whitespace-normal break-words leading-6 ${divider}`}>
                              {isEditing ? (
                                <input
                                  value={editDraft.budgetName}
                                  onChange={(e) =>
                                    setEditDraft((prev) => ({ ...prev, budgetName: e.target.value }))
                                  }
                                  className="h-9 w-full max-w-md rounded-xl border border-neutral-300 bg-white px-2 text-center text-neutral-900 outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                />
                              ) : (
                                row.budgetName || "—"
                              )}
                            </td>
                            <td className={`px-3 ${divider}`}>
                              {isEditing ? (
                                <input
                                  value={editDraft.baseBudget ? toFaDigits(formatMoney(editDraft.baseBudget)) : ""}
                                  onChange={(e) =>
                                    setEditDraft((prev) => ({ ...prev, baseBudget: parseMoney(e.target.value) }))
                                  }
                                  className={moneyInputCls}
                                  inputMode="numeric"
                                />
                              ) : (
                                toFaDigits(formatMoney(row.baseBudget || 0))
                              )}
                            </td>
                            <td className={`px-3 ${divider}`}>
                              <div className="relative flex min-h-[34px] items-center justify-center">
                                <span
                                  className={`transition-opacity ${
                                    isEditing ? "opacity-0 pointer-events-none" : "group-hover:opacity-0"
                                  }`}
                                >
                                  -
                                </span>
                                <div
                                  className={`absolute inset-0 ${
                                    isEditing
                                      ? "flex items-center justify-center gap-1"
                                      : rowActionsRevealCls
                                  }`}
                                >
                                  {isEditing ? (
                                    <>
                                      <RowActionIconBtn action="save" onClick={saveEdit} disabled={saving} size={34} iconSize={15} />
                                      <RowActionIconBtn action="cancel" onClick={cancelEdit} disabled={saving} size={34} iconSize={14} />
                                    </>
                                  ) : (
                                    <>
                                      <RowActionIconBtn action="edit" onClick={() => beginEdit(row)} disabled={saving} size={34} iconSize={15} />
                                      <RowActionIconBtn action="delete" onClick={() => deleteRow(row)} disabled={saving} size={34} iconSize={16} />
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
              <div className="flex flex-col items-stretch gap-2 px-3 py-2 md:flex-row md:items-center md:justify-between" dir="rtl">
                <div className="flex items-center justify-between gap-2 md:justify-start">
                  <div className="flex items-center gap-1">
                    <PagerBtn
                      direction="prev"
                      disabled={safePage <= 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    />
                    <PagerBtn
                      direction="next"
                      disabled={safePage >= totalPages - 1}
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    />
                  </div>
                  <div className="whitespace-nowrap text-sm text-black/70 dark:text-neutral-300">
                    {totalRows === 0
                      ? "۰ از ۰"
                      : `${toFaDigits(startIdx + 1)}–${toFaDigits(endIdx)} از ${toFaDigits(totalRows)}`}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 md:justify-start">
                  <span className="text-sm text-black/70 dark:text-neutral-400">تعداد در هر صفحه:</span>
                  <div className="inline-flex h-9 overflow-hidden rounded-lg border border-black/15 dark:border-neutral-700">
                    {[10, 25, 100].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setRowsPerPage(size);
                          setPage(0);
                        }}
                        className={
                          "min-w-10 px-3 text-sm transition " +
                          (safeRowsPerPage === size
                            ? "bg-black text-white dark:bg-neutral-100 dark:text-neutral-900"
                            : "bg-white text-black hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-white/10")
                        }
                      >
                        {toFaDigits(size)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {err && <div className="mt-3 text-center text-sm text-red-600 dark:text-red-400">{err}</div>}

      <div className="mt-4 flex items-center justify-end">
        <button
          type="button"
          onClick={saveDraft}
          disabled={saving || !projectId || !pendingRows.length}
          className="grid h-10 w-14 place-items-center rounded-xl bg-neutral-900 text-white transition disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          aria-label="ثبت"
          title="ثبت"
        >
          <img src="/images/icons/check.svg" alt="" className="h-5 w-5 invert dark:invert" />
        </button>
      </div>
    </Card>
  );
}
