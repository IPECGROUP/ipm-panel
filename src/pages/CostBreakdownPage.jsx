// ساختار شکست هزینه ها
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/ui/Card.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";
import { api } from "../utils/api.js";

const PAGE_ICON = "/images/icons/sakhtar-shekast.svg";

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
  return raw
    .replace(/[^\d.-]/g, "-")
    .replace(/[.-]+/g, "-")
    .replace(/^-/, "")
    .replace(/-$/, "");
};

const isTopProjectCode = (code) => /^\d{3}$/.test(toEnDigits(String(code || "")).trim());

const displayCode = (value = "") => normalizeCode(value);

const cleanBudgetCodeInput = (value = "") =>
  toEnDigits(value)
    .toUpperCase()
    .replace(/[^0-9A-Z.-]/g, "");

export default function CostBreakdownPage() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [budgetCode, setBudgetCode] = useState("");
  const [budgetName, setBudgetName] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [expandedCodes, setExpandedCodes] = useState(() => new Set());
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const tableMenuRef = useRef(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);

  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState({
    budgetCode: "",
    budgetName: "",
    baseBudget: "",
  });

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

  const selectedProjectCode = useMemo(() => {
    if (!projectId) return "";
    const project = (projects || []).find((p) => String(p.id) === String(projectId));
    return normalizeCode(project?.code || "");
  }, [projectId, projects]);

  const projectBudgetCode = useCallback(
    (value = "") => {
      const code = normalizeCode(value);
      if (!code || !selectedProjectCode) return code;
      if (code === selectedProjectCode || code.startsWith(`${selectedProjectCode}-`)) return code;
      return `${selectedProjectCode}-${code}`;
    },
    [selectedProjectCode]
  );

  const tableRows = useMemo(() => {
    return rows.map((row, idx) => ({
      kind: "saved",
      key: `saved:${row.id}`,
      row,
      label: String(idx + 1),
    }));
  }, [rows]);

  const childRowsByParentCode = useMemo(() => {
    const codes = new Set(tableRows.map((item) => projectBudgetCode(item.row?.budgetCode)));
    const map = new Map();
    for (const item of tableRows) {
      const code = projectBudgetCode(item.row?.budgetCode);
      const parts = code.split("-").filter(Boolean);
      let parentCode = "";
      for (let i = parts.length - 1; i > 0; i -= 1) {
        const candidate = parts.slice(0, i).join("-");
        if (codes.has(candidate)) {
          parentCode = candidate;
          break;
        }
      }
      if (!parentCode) continue;
      const list = map.get(parentCode) || [];
      list.push(item);
      map.set(parentCode, list);
    }
    return map;
  }, [projectBudgetCode, tableRows]);

  const expandableCodes = useMemo(() => Array.from(childRowsByParentCode.keys()), [childRowsByParentCode]);
  const allRowsExpanded = expandableCodes.length > 0 && expandableCodes.every((code) => expandedCodes.has(code));

  const displayRows = useMemo(() => {
    const childKeys = new Set();
    childRowsByParentCode.forEach((children) => {
      children.forEach((child) => childKeys.add(child.key));
    });

    const result = [];
    const used = new Set();

    const pushRow = (item, depth = 0) => {
      if (!item || used.has(item.key)) return;
      used.add(item.key);
      const code = projectBudgetCode(item.row?.budgetCode);
      const children = childRowsByParentCode.get(code) || [];
      result.push({ ...item, depth, hasChildren: children.length > 0 });
      if (expandedCodes.has(code)) {
        children.forEach((child) => pushRow(child, depth + 1));
      }
    };

    tableRows.forEach((item) => {
      if (!childKeys.has(item.key)) pushRow(item, 0);
    });

    return result;
  }, [childRowsByParentCode, expandedCodes, projectBudgetCode, tableRows]);

  const totalRows = displayRows.length;
  const safeRowsPerPage = Number(rowsPerPage) || 10;
  const totalPages = Math.max(1, Math.ceil(totalRows / safeRowsPerPage));
  const safePage = Math.min(page, totalPages - 1);
  const startIdx = safePage * safeRowsPerPage;
  const endIdx = Math.min(totalRows, startIdx + safeRowsPerPage);
  const visibleIds = displayRows.map((item) => item.key);
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

  const toggleAllRowsExpanded = () => {
    setExpandedCodes((prev) => {
      if (expandableCodes.length > 0 && expandableCodes.every((code) => prev.has(code))) return new Set();
      return new Set(expandableCodes);
    });
  };

  const handleBudgetCodeChange = (value) => {
    setBudgetCode(cleanBudgetCodeInput(value));
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

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!projectId) {
      setRows([]);
      setSelectedIds(new Set());
      setExpandedCodes(new Set());
      return;
    }
    clearDraft();
    setSelectedIds(new Set());
    setExpandedCodes(new Set());
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
    if (!projectId) return;
    const exists = (projects || []).some((p) => String(p.id) === String(projectId));
    if (!exists) setProjectId("");
  }, [projectId, projects]);

  useEffect(() => {
    if (!tableMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!tableMenuRef.current?.contains(event.target)) setTableMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setTableMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [tableMenuOpen]);

  const clearDraft = () => {
    setBudgetCode("");
    setBudgetName("");
    setErr("");
  };

  const addRow = async () => {
    const code = projectBudgetCode(budgetCode);
    const name = String(budgetName || "").trim();

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
    if (existsSaved) {
      setErr("این کد بودجه قبلاً در جدول وجود دارد.");
      return false;
    }

    setSaving(true);
    try {
      const res = await api("/cost-breakdown", {
        method: "POST",
        body: JSON.stringify({
          project_id: Number(projectId),
          budget_code: code,
          budget_name: name,
          base_budget: 0,
        }),
      });

      if (res?.item) upsertSavedRow(res.item);
      clearDraft();
      return true;
    } catch (ex) {
      setErr(ex.message === "duplicate_budget_code" ? "این کد بودجه برای پروژه انتخاب‌شده قبلاً ثبت شده است." : ex.message || "خطا در ثبت");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const canAddDraft = Boolean(projectId && !saving && projectBudgetCode(budgetCode) && String(budgetName || "").trim());

  const handleDraftKeyDown = async (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      clearDraft();
      event.currentTarget.blur();
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (canAddDraft) {
      const saved = await addRow();
      if (saved) event.currentTarget.blur();
    }
  };

  const upsertSavedRow = (item) => {
    const normalized = normalizeItem(item);
    if (!normalized.id) return;
    setRows((prev) => {
      const exists = prev.some((row) => String(row.id) === String(normalized.id));
      const nextRows = exists
        ? prev.map((row) => (String(row.id) === String(normalized.id) ? normalized : row))
        : [...prev, normalized];
      return nextRows.sort((a, b) =>
        projectBudgetCode(a.budgetCode).localeCompare(projectBudgetCode(b.budgetCode), "fa", {
          numeric: true,
          sensitivity: "base",
        })
      );
    });
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
      const res = await api("/cost-breakdown", {
        method: "PATCH",
        body: JSON.stringify({
          id: Number(editId),
          project_id: Number(projectId),
          budget_code: code,
          budget_name: name,
          base_budget: parseMoney(editDraft.baseBudget),
        }),
      });
      if (res?.item) upsertSavedRow(res.item);
      cancelEdit();
    } catch (ex) {
      setErr(ex.message === "duplicate_budget_code" ? "این کد بودجه برای پروژه انتخاب‌شده قبلاً ثبت شده است." : ex.message || "خطا در ویرایش");
    } finally {
      setSaving(false);
    }
  };

  const handleEditKeyDown = async (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    await saveEdit();
  };

  const selectedRows = useMemo(
    () => tableRows.filter((item) => selectedIds.has(item.key)).map((item) => item.row),
    [selectedIds, tableRows]
  );

  const editSelectedRows = () => {
    if (!selectedRows.length) return;
    beginEdit(selectedRows[0]);
    setTableMenuOpen(false);
  };

  const deleteSelectedRows = async () => {
    if (!selectedRows.length) return;
    const message = selectedRows.length === 1 ? "حذف این ردیف؟" : `حذف ${toFaDigits(selectedRows.length)} ردیف انتخاب‌شده؟`;
    if (!window.confirm(message)) return;

    setSaving(true);
    setErr("");
    try {
      await Promise.all(
        selectedRows.map((row) => api(`/cost-breakdown?id=${encodeURIComponent(row.id)}`, { method: "DELETE" }))
      );
      setSelectedIds(new Set());
      setTableMenuOpen(false);
      await loadRows(projectId);
    } catch (ex) {
      setErr(ex.message || "خطا در حذف موارد انتخاب‌شده");
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = async () => {
    if (!rows.length) {
      setErr("برای دریافت خروجی، ابتدا حداقل یک ردیف ثبت کنید.");
      return;
    }

    const xlsxMod = await import("xlsx");
    const XLSX = xlsxMod.default || xlsxMod;
    const project = projects.find((item) => String(item.id) === String(projectId));
    const sheetData = [
      ["گزارش ساختار شکست هزینه‌ها"],
      ["پروژه", project ? `${project.code}${project.name ? ` - ${project.name}` : ""}` : "—"],
      [],
      ["ردیف", "کد بودجه", "نام بودجه", "بودجه مبنا"],
      ...rows.map((row, index) => [index + 1, projectBudgetCode(row.budgetCode), row.budgetName || "—", Number(parseMoney(row.baseBudget))]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws["!cols"] = [{ wch: 10 }, { wch: 22 }, { wch: 42 }, { wch: 22 }];
    ws["!rows"] = [{ hpt: 28 }, { hpt: 22 }, { hpt: 8 }, { hpt: 24 }];
    ws["!merges"] = [XLSX.utils.decode_range("A1:D1")];
    ws["!view"] = [{ rightToLeft: true }];
    ["A1", "A2", "B2", "A4", "B4", "C4", "D4"].forEach((address) => {
      if (!ws[address]) return;
      ws[address].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: address === "A1" ? "1F4E78" : "3B82F6" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    });
    for (let rowIndex = 5; rowIndex < sheetData.length + 1; rowIndex += 1) {
      ["A", "B", "C", "D"].forEach((column) => {
        const cell = ws[`${column}${rowIndex}`];
        if (!cell) return;
        cell.s = {
          alignment: { horizontal: column === "C" ? "right" : "center", vertical: "center" },
          fill: { fgColor: { rgb: rowIndex % 2 ? "F8FAFC" : "EAF2F8" } },
        };
      });
      if (ws[`D${rowIndex}`]) ws[`D${rowIndex}`].z = "#,##0";
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ساختار هزینه");
    XLSX.writeFile(wb, `cost-breakdown-${project?.code || "project"}.xlsx`, { compression: true });
  };

  const inputCls =
    "h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-right text-neutral-900 outline-none placeholder:text-neutral-400 " +
    "focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500";

  const moneyInputCls =
    "h-11 w-full max-w-[260px] rounded-xl border border-neutral-300 bg-white px-3 text-right text-neutral-900 outline-none ltr " +
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
    <Card className="rounded-2xl border bg-white p-3 text-neutral-900 md:p-4 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
      <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1.15fr)_minmax(130px,0.65fr)_minmax(260px,1.45fr)] md:items-end">
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-sm text-neutral-700 dark:text-neutral-300">پروژه</span>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  cancelEdit();
                  clearDraft();
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
              <input
                value={budgetCode}
                onChange={(e) => handleBudgetCodeChange(e.target.value)}
                onKeyDown={handleDraftKeyDown}
                disabled={!projectId}
                className={inputCls + " ltr text-left font-sans tabular-nums"}
                spellCheck={false}
              />
            </label>

            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-sm text-neutral-700 dark:text-neutral-300">نام بودجه</span>
              <span className="flex min-w-0 items-center gap-2">
                <input
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  onKeyDown={handleDraftKeyDown}
                  className={inputCls}
                  placeholder="نام بودجه"
                />
                <button
                  type="button"
                  onClick={addRow}
                  disabled={!canAddDraft}
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
                className="w-full min-w-[760px] table-fixed text-sm [&_th]:text-right [&_td]:text-right [&_th]:py-2 [&_td]:py-1.5"
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
                    <th className="!text-center !text-[14px] md:!text-[15px] !font-semibold">
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
                    <th className="px-3 !text-[14px] md:!text-[15px] !font-semibold">
                      <span className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={toggleAllRowsExpanded}
                          disabled={!expandableCodes.length}
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-transparent text-lg leading-none text-black transition hover:text-black/60 disabled:cursor-not-allowed disabled:opacity-35 dark:text-neutral-100 dark:hover:text-white/60"
                          aria-label={allRowsExpanded ? "بستن همه زیرمجموعه‌ها" : "باز کردن همه زیرمجموعه‌ها"}
                          title={allRowsExpanded ? "بستن همه زیرمجموعه‌ها" : "باز کردن همه زیرمجموعه‌ها"}
                        >
                          {allRowsExpanded ? "−" : "+"}
                        </button>
                        کد بودجه
                      </span>
                    </th>
                    <th className="px-3 !text-[14px] md:!text-[15px] !font-semibold">نام بودجه</th>
                    <th className="px-3 !text-[14px] md:!text-[15px] !font-semibold">بودجه مبنا</th>
                    <th className="relative px-3 !text-center !text-[14px] md:!text-[15px] !font-semibold">
                      <span>عملیات</span>
                      <div ref={tableMenuRef} className="absolute left-1 top-1/2 z-30 -translate-y-1/2">
                        <button type="button" onClick={() => setTableMenuOpen((open) => !open)} className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/[0.08] dark:hover:bg-white/10" title="عملیات انتخاب‌شده" aria-label="عملیات انتخاب‌شده" aria-expanded={tableMenuOpen}>
                          <img src="/images/icons/menu-table.svg" alt="" className={`h-4 w-3 transition-transform duration-200 ${tableMenuOpen ? "scale-110" : ""} dark:invert`} />
                        </button>
                        {tableMenuOpen && (
                          <div className="absolute left-0 top-[calc(100%+8px)] w-60 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 text-right text-neutral-900 shadow-[0_18px_45px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100">
                            <div className="px-2.5 pb-2 pt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{selectedRows.length ? `${toFaDigits(selectedRows.length)} مورد انتخاب شده` : "ابتدا موارد موردنظر را انتخاب کنید"}</div>
                            <button type="button" disabled={!selectedRows.length || saving} onClick={editSelectedRows} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-white/10"><img src="/images/icons/pencil.svg" alt="" className="h-4 w-4 dark:invert" /><span className="text-sm font-semibold">ویرایش</span></button>
                            <button type="button" disabled={!selectedRows.length || saving} onClick={deleteSelectedRows} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45 dark:text-red-300 dark:hover:bg-red-500/10"><img src="/images/icons/hazf.svg" alt="" className="h-4 w-4" /><span className="text-sm font-semibold">حذف</span></button>
                          </div>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody className={tbodyCls}>
                  {!projectId ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-black/60 dark:text-neutral-400">
                        پروژه را انتخاب کنید.
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
                    displayRows.map((item, pageIdx) => {
                      const row = item.row;
                      const isEditing = editId === row.id;
                      const divider = pageIdx === displayRows.length - 1 ? "" : rowDividerCls;
                      const rowSelected = selectedIds.has(item.key);
                      const displayBudgetCode = projectBudgetCode(row.budgetCode);
                      const isParentRow = Boolean(item.hasChildren);
                      const rowIndent = `${Math.min(Number(item.depth || 0), 4) * 36}px`;
                      const rowIndentStyle = { paddingRight: rowIndent };
                      const parentWeightCls = isParentRow ? "font-semibold" : "";

                      return (
                          <tr key={item.key} className={`group transition-colors hover:bg-black/[0.04] dark:hover:bg-white/10 ${parentWeightCls}`}>
                            <td className={`px-3 text-center ${divider}`}>
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
                                <div className="flex items-center justify-start" dir="rtl" style={rowIndentStyle}>
                                  <input
                                    value={editDraft.budgetCode}
                                    onChange={(e) =>
                                      setEditDraft((prev) => ({ ...prev, budgetCode: projectBudgetCode(e.target.value) }))
                                    }
                                    onKeyDown={handleEditKeyDown}
                                    className={moneyInputCls + " text-right font-sans tabular-nums"}
                                    spellCheck={false}
                                    autoFocus
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center justify-start gap-2" dir="rtl" style={rowIndentStyle}>
                                  <span dir="ltr" className={`inline-block min-w-0 text-center font-sans tabular-nums ${parentWeightCls}`}>
                                    {displayBudgetCode || "—"}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className={`px-3 whitespace-normal break-words leading-6 ${divider}`}>
                              <div className="flex items-center justify-start" style={rowIndentStyle}>
                                {isEditing ? (
                                  <input
                                    value={editDraft.budgetName}
                                    onChange={(e) =>
                                      setEditDraft((prev) => ({ ...prev, budgetName: e.target.value }))
                                    }
                                    onKeyDown={handleEditKeyDown}
                                    className="h-11 w-full max-w-2xl rounded-xl border border-neutral-300 bg-white px-3 text-right text-neutral-900 outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                  />
                                ) : (
                                  <span className={parentWeightCls}>{row.budgetName || "—"}</span>
                                )}
                              </div>
                            </td>
                            <td className={`px-3 ${divider}`}>
                              <div className="flex items-center justify-start" style={rowIndentStyle}>
                                {isEditing ? (
                                  <input
                                    value={editDraft.baseBudget ? toFaDigits(formatMoney(editDraft.baseBudget)) : ""}
                                    onChange={(e) =>
                                      setEditDraft((prev) => ({ ...prev, baseBudget: parseMoney(e.target.value) }))
                                    }
                                    onKeyDown={handleEditKeyDown}
                                    className={moneyInputCls + " text-right"}
                                    inputMode="numeric"
                                  />
                                ) : (
                                  <span className={parentWeightCls}>{toFaDigits(formatMoney(row.baseBudget || 0))}</span>
                                )}
                              </div>
                            </td>
                            <td className={`px-3 text-center ${divider}`}>
                              {isEditing ? <div className="flex items-center justify-center gap-1"><RowActionIconBtn action="save" onClick={saveEdit} disabled={saving} size={34} iconSize={15} /><RowActionIconBtn action="cancel" onClick={cancelEdit} disabled={saving} size={34} iconSize={14} /></div> : <span className="text-neutral-400">—</span>}
                            </td>
                          </tr>
                        );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="hidden border-t border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
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

      <div className="mt-4 flex justify-end">
        <button type="button" onClick={exportExcel} disabled={!rows.length} className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-600/20 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20">
          <img src="/images/icons8-excel-50.png" alt="" className="h-5 w-5" />
          خروجی اکسل
        </button>
      </div>

      {err && <div className="mt-3 text-center text-sm text-red-600 dark:text-red-400">{err}</div>}
    </Card>
  );
}
