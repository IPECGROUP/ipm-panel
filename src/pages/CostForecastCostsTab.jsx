import React, { useCallback, useEffect, useMemo, useState } from "react";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";
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

const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور"];

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

function ExpandButton({ expanded, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-black/20 bg-white text-lg font-bold leading-none text-black transition hover:bg-black/5 disabled:opacity-40 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-white/10"
      aria-label={expanded ? "بستن زیرمجموعه" : "نمایش زیرمجموعه"}
      title={expanded ? "بستن زیرمجموعه" : "نمایش زیرمجموعه"}
    >
      {expanded ? "−" : "+"}
    </button>
  );
}

export default function CostForecastCostsTab() {
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [rowsByProject, setRowsByProject] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());
  const [adding, setAdding] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loadingProjectId, setLoadingProjectId] = useState("");
  const [err, setErr] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);

  const tableUi = tablePreset.table;
  const rowUi = tablePreset.row;
  const colCount = 4 + monthNames.length + 1;

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

  const addedProjectIds = useMemo(
    () => new Set(rowsByProject.map((item) => String(item.project.id))),
    [rowsByProject],
  );

  const availableProjects = useMemo(
    () => projects.filter((project) => !addedProjectIds.has(String(project.id))),
    [projects, addedProjectIds],
  );

  const makeChildRows = useCallback((projectEntry) => {
    const items = projectEntry.items || [];
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
      parentCode: "",
      originalIndex: index,
    }));

    const byCode = new Map();
    itemNodes.forEach((node) => {
      if (node.code) byCode.set(node.code, node);
    });

    const childrenByParent = new Map();
    itemNodes.forEach((node) => {
      const parts = String(node.code || "").split("-").filter(Boolean);
      let parentCode = "";
      for (let index = parts.length - 1; index > 0; index -= 1) {
        const candidate = parts.slice(0, index).join("-");
        if (byCode.has(candidate)) {
          parentCode = candidate;
          break;
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
  }, [expandedKeys]);

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
        hasChildren: (entry.items || []).length > 0,
      });
      if (expandedKeys.has(projectKey)) result.push(...childRows);
    });
    return result;
  }, [expandedKeys, makeChildRows, rowsByProject]);

  const visibleKeys = useMemo(() => displayRows.map((row) => row.key), [displayRows]);
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

  const toggleExpanded = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const addProject = async (projectId) => {
    const project = projects.find((item) => String(item.id) === String(projectId));
    if (!project || addedProjectIds.has(String(project.id))) return;

    setErr("");
    setLoadingProjectId(String(project.id));
    try {
      const res = await api(`/cost-breakdown?project_id=${encodeURIComponent(project.id)}`);
      const rawItems = Array.isArray(res?.items) ? res.items : [];
      const items = rawItems
        .map(normalizeBreakdownItem)
        .filter((item) => item.budgetCode || item.budgetName)
        .sort((a, b) =>
          String(a.budgetCode || "").localeCompare(String(b.budgetCode || ""), "fa", {
            numeric: true,
            sensitivity: "base",
          }),
        );

      setRowsByProject((prev) => [...prev, { project, items }]);
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
                      <TH className={`w-36 md:w-40 ${tableUi.th}`}>کد بودجه</TH>
                      <TH className={`w-32 md:w-40 ${tableUi.th}`}>نام بودجه</TH>
                      {monthNames.map((month) => (
                        <TH key={month} className={`w-20 md:w-24 px-0 ${tableUi.th}`}>
                          {month}
                        </TH>
                      ))}
                      <TH className={`w-40 md:w-52 border-l border-r border-black/10 dark:border-neutral-700 ${tableUi.th}`}>
                        جمع
                      </TH>
                    </tr>
                  </THead>

                  <tbody className={tableUi.body}>
                    {displayRows.length > 0 && (
                      <TR className="text-center bg-black/[0.04] font-semibold dark:bg-white/10">
                        <TD className="px-2 py-3 border-b border-black/10 dark:border-neutral-800">-</TD>
                        <TD className="px-2 py-3 border-b border-black/10 dark:border-neutral-800">-</TD>
                        <TD className="px-2 py-3 border-b border-black/10 dark:border-neutral-800">-</TD>
                        <TD className="px-2 py-3 text-center border-b border-black/10 dark:border-neutral-800">جمع</TD>
                        {monthNames.map((month) => (
                          <TD key={`total-${month}`} className="px-0 py-2 text-center align-middle border-b border-black/10 dark:border-neutral-800">
                            —
                          </TD>
                        ))}
                        <TD className="px-3 py-3 whitespace-nowrap text-center border-l border-r border-b border-black/10 dark:border-neutral-700">
                          <span className="ltr">۰</span>
                        </TD>
                      </TR>
                    )}

                    {displayRows.map((row, index) => {
                      const expanded = expandedKeys.has(row.key);
                      const isSelected = selectedSet.has(row.key);
                      const isProject = row.kind === "project";
                      const shiftX = row.depth ? row.depth * 10 : 0;
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

                      return (
                        <TR key={row.key} className={getHoverSelectableRowClass(isSelected)}>
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
                          <TD className="px-2 py-3">{toFaDigits(index + 1)}</TD>

                          <TD className="px-2 py-3 whitespace-nowrap text-right">
                            <div
                              className="inline-flex items-center justify-end gap-1 flex-row-reverse"
                              style={shiftX ? { transform: `translateX(${shiftX}px)` } : undefined}
                            >
                              {row.hasChildren && (
                                <ExpandButton expanded={expanded} onClick={() => toggleExpanded(row.key)} />
                              )}
                              <span className={`ltr ${codeTextClass}`}>{row.code || "—"}</span>
                            </div>
                          </TD>

                          <TD className={`px-2 py-3 text-right break-words max-w-[180px] ${nameCellTextClass}`}>
                            <div style={shiftX ? { transform: `translateX(${shiftX}px)` } : undefined}>
                              {row.name || "—"}
                            </div>
                          </TD>

                          {monthNames.map((month) => (
                            <TD key={`${row.key}-${month}`} className="px-0 py-2 text-center align-middle">
                              <button
                                type="button"
                                className="w-[5.5rem] mx-auto h-10 md:w-[5.5rem] md:h-10 rounded-xl border text-[10px] md:text-[11px] flex items-center justify-center shadow-sm transition bg-black/5 border-black/10 text-black/70 dark:bg-white/5 dark:border-neutral-700 dark:text-neutral-100"
                              >
                                —
                              </button>
                            </TD>
                          ))}

                          <TD className="px-3 py-3 whitespace-nowrap text-center border-l border-r border-black/10 dark:border-neutral-700">
                            <span className="ltr">۰</span>
                          </TD>
                        </TR>
                      );
                    })}

                    {adding && (
                      <TR>
                        <TD className="px-2 py-3">-</TD>
                        <TD className="px-2 py-3">{toFaDigits(displayRows.length + 1)}</TD>
                        <TD colSpan={2} className="px-2 py-3 text-right">
                          <select
                            value={selectedProjectId}
                            onChange={(event) => handleSelectProject(event.target.value)}
                            disabled={projectsLoading || Boolean(loadingProjectId)}
                            className="h-10 w-full max-w-md rounded-xl border border-black/15 bg-white px-3 text-right text-sm text-black outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                            autoFocus
                          >
                            <option value="">
                              {projectsLoading ? "در حال دریافت پروژه‌ها..." : "انتخاب پروژه فعال"}
                            </option>
                            {availableProjects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.code}
                                {project.name ? ` - ${project.name}` : ""}
                              </option>
                            ))}
                          </select>
                        </TD>
                        {monthNames.map((month) => (
                          <TD key={`select-${month}`} className="px-0 py-2" />
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
            </div>
          </div>
        </div>
      </TableWrap>

      {err && <div className="px-[15px] text-sm text-red-600 dark:text-red-400">{err}</div>}
    </>
  );
}
