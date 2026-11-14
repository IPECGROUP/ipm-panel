import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { api } from "../utils/api.js";

const inputClass = "h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-[#184a6b] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100";
const toEnDigits = (value = "") => String(value).replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit)).replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
const toFaDigits = (value = "") => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
const parseAmount = (value) => {
  const normalized = toEnDigits(value).replace(/[^\d]/g, "");
  return normalized ? String(BigInt(normalized)) : "0";
};
const formatAmount = (value) => parseAmount(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const normalizeCode = (value = "") => toEnDigits(value).trim().replace(/[^\d.-]/g, "-").replace(/[.-]+/g, "-").replace(/^-|-$/g, "");
const isTopProject = (code) => /^\d{3}$/.test(toEnDigits(String(code || "")).trim());

// Read-only mirror of CostBreakdownPage. This page never creates or changes records.
export default function FinancialCommitmentsPage() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [rows, setRows] = useState([]);
  const [usageByCode, setUsageByCode] = useState({});
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState("");
  const [expandedCodes, setExpandedCodes] = useState(() => new Set());

  const sortedProjects = useMemo(() => projects.slice().sort((a, b) => a.code.localeCompare(b.code, "fa", { numeric: true })), [projects]);
  const projectCode = useMemo(() => normalizeCode(projects.find((project) => String(project.id) === String(projectId))?.code || ""), [projectId, projects]);
  const selectedProject = useMemo(() => projects.find((project) => String(project.id) === String(projectId)), [projectId, projects]);

  const displayRows = useMemo(() => rows.map((row) => {
    const normalizedCode = normalizeCode(row.budgetCode);
    const fullCode = projectCode && normalizedCode !== projectCode && !normalizedCode.startsWith(`${projectCode}-`)
      ? `${projectCode}-${normalizedCode}`
      : normalizedCode;
    return { ...row, fullCode };
  }).sort((a, b) => a.fullCode.localeCompare(b.fullCode, "fa", { numeric: true })), [projectCode, rows]);

  useEffect(() => {
    let active = true;
    api("/projects").then((result) => {
      const source = Array.isArray(result) ? result : Array.isArray(result?.items) ? result.items : [];
      const clean = source.filter((project) => project && typeof project === "object")
        .map((project) => ({ id: String(project.id), code: toEnDigits(String(project.code ?? "")).trim(), name: String(project.name ?? "").trim(), isActive: Boolean(project.isActive ?? true) }))
        .filter((project) => project.id && project.code && project.isActive && isTopProject(project.code));
      if (active) setProjects(clean);
    }).catch(() => { if (active) setError("دریافت فهرست پروژه‌ها انجام نشد."); })
      .finally(() => { if (active) setLoadingProjects(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!projectId) { setRows([]); setUsageByCode({}); return () => { active = false; }; }
    setLoadingRows(true);
    setError("");
    api(`/cost-breakdown?project_id=${encodeURIComponent(projectId)}`).then((result) => {
      const items = Array.isArray(result?.items) ? result.items : [];
      if (active) {
        setRows(items.map((item) => ({
          id: item?.id,
          budgetCode: String(item?.budgetCode ?? item?.budget_code ?? "").trim(),
          budgetName: String(item?.budgetName ?? item?.budget_name ?? "").trim(),
          baseBudget: parseAmount(item?.baseBudget ?? item?.base_budget ?? 0),
        })));
        setUsageByCode(result?.usageByCode && typeof result.usageByCode === "object" ? result.usageByCode : {});
      }
    }).catch(() => { if (active) { setRows([]); setError("دریافت اطلاعات ساختار هزینه انجام نشد."); } })
      .finally(() => { if (active) setLoadingRows(false); });
    return () => { active = false; };
  }, [projectId]);

  const codeSet = useMemo(() => new Set(displayRows.map((row) => row.fullCode)), [displayRows]);
  const parentCodes = useMemo(() => {
    const parents = new Set();
    displayRows.forEach((row) => {
      const parts = row.fullCode.split("-");
      for (let i = 1; i < parts.length; i += 1) {
        const parent = parts.slice(0, i).join("-");
        if (codeSet.has(parent)) parents.add(parent);
      }
    });
    return parents;
  }, [codeSet, displayRows]);
  useEffect(() => setExpandedCodes(new Set(parentCodes)), [parentCodes]);
  const visibleRows = useMemo(() => displayRows.filter((row) => {
    const parts = row.fullCode.split("-");
    for (let i = 1; i < parts.length; i += 1) {
      const parent = parts.slice(0, i).join("-");
      if (parentCodes.has(parent) && !expandedCodes.has(parent)) return false;
    }
    return true;
  }), [displayRows, expandedCodes, parentCodes]);
  const totals = useMemo(() => {
    const cache = new Map();
    const getTotal = (row) => {
      if (cache.has(row.fullCode)) return cache.get(row.fullCode);
      const descendants = displayRows.filter((candidate) => candidate.fullCode.startsWith(`${row.fullCode}-`));
      const directChildren = descendants.filter((candidate) => {
        const parent = candidate.fullCode.split("-").slice(0, -1).join("-");
        return parent === row.fullCode;
      });
      const total = directChildren.length ? directChildren.reduce((sum, child) => sum + getTotal(child), 0n) : BigInt(row.baseBudget);
      cache.set(row.fullCode, total);
      return total;
    };
    displayRows.forEach(getTotal);
    return cache;
  }, [displayRows]);
  const usageTotals = useMemo(() => {
    const normalizedUsage = Object.entries(usageByCode).map(([rawCode, amount]) => {
      const code = normalizeCode(rawCode);
      const fullCode = projectCode && code !== projectCode && !code.startsWith(`${projectCode}-`) ? `${projectCode}-${code}` : code;
      return [fullCode, BigInt(parseAmount(amount))];
    });
    return new Map(displayRows.map((row) => [
      row.fullCode,
      normalizedUsage.reduce((sum, [code, amount]) => code === row.fullCode || code.startsWith(`${row.fullCode}-`) ? sum + amount : sum, 0n),
    ]));
  }, [displayRows, projectCode, usageByCode]);

  return (
    <Card className="rounded-2xl border bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800">
      <div className="p-3 md:p-4">
        <div className="mb-4 flex min-w-0 items-center gap-3 border-b border-black/[0.07] pb-3 dark:border-white/10 sm:mb-5 sm:pb-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06]">
            <span aria-hidden="true" className="h-6 w-6 bg-[#184a6b] dark:bg-[#8fc4e3]" style={{ WebkitMask: "url(/images/icons/masaref-mali.svg) center / contain no-repeat", mask: "url(/images/icons/masaref-mali.svg) center / contain no-repeat" }} />
          </span>
          <span className="min-w-0"><span className="block truncate text-base font-bold text-[#184a6b] dark:text-[#8fc4e3] md:text-lg">تعهدات و مصارف مالی</span><span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت پروژه</span></span>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white dark:bg-neutral-900 dark:border-neutral-800">
          <div className="px-[15px] py-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1.15fr)_minmax(130px,0.65fr)_minmax(260px,1.45fr)] md:items-end">
              <label className="flex min-w-0 flex-col gap-1"><span className="text-sm text-neutral-700 dark:text-neutral-300">پروژه</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)} className={inputClass} disabled={loadingProjects}><option value="">{loadingProjects ? "در حال دریافت..." : "انتخاب کنید"}</option>{sortedProjects.map((project) => <option key={project.id} value={project.id}>{project.code}{project.name ? ` - ${project.name}` : ""}</option>)}</select></label>
              <div className="flex min-w-0 flex-col gap-1"><span className="text-sm text-neutral-700 dark:text-neutral-300">کد بودجه</span><div className={`${inputClass} flex items-center ltr text-left font-sans tabular-nums`} dir="ltr">{projectId ? projectCode || "—" : "—"}</div></div>
              <div className="flex min-w-0 flex-col gap-1"><span className="text-sm text-neutral-700 dark:text-neutral-300">نام بودجه</span><div className={`${inputClass} flex items-center`}>{selectedProject?.name || "—"}</div></div>
            </div>
          </div>
          <div className="px-[15px] pb-4">
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
              <div className="overflow-x-auto"><table dir="rtl" className="w-full min-w-[760px] table-fixed text-sm [&_th]:text-right [&_td]:text-right [&_th]:py-2 [&_td]:py-1.5">
                <colgroup><col style={{ width: 48 }} /><col style={{ width: 192 }} /><col /><col style={{ width: 210 }} /><col style={{ width: 190 }} /></colgroup>
                <thead className="border-b border-[#184a6b] bg-[#184a6b] text-white"><tr><th className="!text-center !text-[14px] md:!text-[15px] !font-semibold">ردیف</th><th className="px-3 !text-[14px] md:!text-[15px] !font-semibold">کد بودجه</th><th className="px-3 !text-[14px] md:!text-[15px] !font-semibold">نام بودجه</th><th className="px-3 !text-[14px] md:!text-[15px] !font-semibold">بودجه مبنا</th><th className="px-3 !text-[14px] md:!text-[15px] !font-semibold">مصارف</th></tr></thead>
                <tbody className="[&_td]:text-black dark:[&_td]:text-neutral-100 [&_tr:nth-child(odd)]:bg-white [&_tr:nth-child(even)]:bg-neutral-50 dark:[&_tr:nth-child(odd)]:bg-neutral-900 dark:[&_tr:nth-child(even)]:bg-neutral-800/50">
                  {!projectId ? <tr><td colSpan={5} className="py-6 text-center text-black/60 dark:text-neutral-400">پروژه را انتخاب کنید.</td></tr> : loadingRows ? <tr><td colSpan={5} className="py-6 text-center text-black/60 dark:text-neutral-400">در حال بارگذاری...</td></tr> : !displayRows.length ? <tr><td colSpan={5} className="py-6 text-center text-black/60 dark:text-neutral-400">موردی ثبت نشده.</td></tr> : visibleRows.map((row, index) => {
                    const depth = Math.max(0, row.fullCode.split("-").length - projectCode.split("-").length - 1);
                    const isExpanded = expandedCodes.has(row.fullCode);
                    return <tr key={row.id ?? row.fullCode} className="border-b border-neutral-300 dark:border-neutral-700"><td className="px-3 text-center">{toFaDigits(index + 1)}</td><td className="px-3"><span className="flex items-center gap-2" style={{ paddingRight: `${Math.min(depth, 4) * 24}px` }}>{parentCodes.has(row.fullCode) ? <button type="button" onClick={() => setExpandedCodes((current) => { const next = new Set(current); if (next.has(row.fullCode)) next.delete(row.fullCode); else next.add(row.fullCode); return next; })} className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-black/15 bg-white text-base font-bold leading-none text-neutral-700 hover:bg-black/5 dark:border-white/15 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-white/10" aria-label={isExpanded ? "بستن زیرمجموعه" : "نمایش زیرمجموعه"}>{isExpanded ? "−" : "+"}</button> : <span className="h-6 w-6 shrink-0" />}<span dir="ltr" className="font-sans tabular-nums">{row.fullCode}</span></span></td><td className="px-3">{row.budgetName || "—"}</td><td className="px-3">{toFaDigits(formatAmount(String(totals.get(row.fullCode) ?? 0n)))}</td><td className="px-3">{toFaDigits(formatAmount(String(usageTotals.get(row.fullCode) ?? 0n)))}</td></tr>;
                  })}
                </tbody>
              </table></div>
            </div>
          </div>
        </div>
        {error && <div className="mt-3 text-center text-sm text-red-600 dark:text-red-400">{error}</div>}
      </div>
    </Card>
  );
}
