import { toEnglishDigits } from "./format.js";

const normalizeCode = (value) => toEnglishDigits(String(value ?? "")).trim().toUpperCase()
  .replace(/[^\d.-]/g, "-").replace(/[.-]+/g, "-").replace(/^-|-$/g, "");

export function fullBudgetCode(storedCode, projectCode) {
  const prefix = normalizeCode(projectCode);
  const code = normalizeCode(storedCode);
  if (!code) return "";
  return prefix && code !== prefix && !code.startsWith(`${prefix}-`) ? `${prefix}-${code}` : code;
}

// Both forms show the project hierarchy; petty cash keeps the stored code as
// its selected value because its API validates against the cost breakdown.
export function budgetPickerItems(items, project, keepStoredValue = false) {
  const prefix = normalizeCode(project?.code);
  const byCode = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const storedCode = String(item?.budgetCode ?? item?.budget_code ?? item?.code ?? "");
    const code = fullBudgetCode(storedCode, project?.code);
    if (!code) return;
    const previous = byCode.get(code);
    byCode.set(code, {
      code,
      value: previous?.value ?? (keepStoredValue ? storedCode : code),
      center_desc: previous?.center_desc || String(item?.budgetName ?? item?.budget_name ?? item?.name ?? ""),
      last_amount: Number(item?.baseBudget ?? item?.base_budget ?? previous?.last_amount ?? 0),
    });
  });
  if (!byCode.size && prefix) byCode.set(prefix, { code: prefix, value: prefix, center_desc: project?.name || "", last_amount: 0 });
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code, "fa", { numeric: true, sensitivity: "base" }));
}
