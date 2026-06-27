import React, { useCallback, useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table.jsx";
import RowActionIconBtn from "../components/ui/RowActionIconBtn.jsx";
import {
  baseCurrenciesTablePreset as tablePreset,
  getHoverSelectableRowClass,
} from "../components/ui/tablePresets.js";
import { api } from "../utils/api.js";

const PAGE_ICON = "/images/icons/sakhtar-shekast.svg";

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

export default function CostBreakdownPage() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [budgetCode, setBudgetCode] = useState("");
  const [budgetName, setBudgetName] = useState("");
  const [baseBudget, setBaseBudget] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

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

  const hasDraftRow = !!(String(budgetCode).trim() || String(budgetName).trim());

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await api("/projects?isActive=true");
      const raw = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
      const clean = raw
        .filter((p) => p && typeof p === "object")
        .map((p) => ({
          id: String(p.id),
          code: String(p.code ?? "").trim(),
          name: String(p.name ?? "").trim(),
          isActive: p.isActive !== false,
        }))
        .filter((p) => p.id && p.isActive);

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
      return;
    }
    loadRows(projectId);
  }, [projectId, loadRows]);

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

  const saveDraft = async () => {
    const code = String(budgetCode || "").trim();
    const name = String(budgetName || "").trim();

    setErr("");
    if (!projectId) {
      setErr("مرکز/پروژه را انتخاب کنید.");
      return;
    }
    if (!code || !name) {
      setErr("کد بودجه و نام بودجه را وارد کنید.");
      return;
    }

    setSaving(true);
    try {
      await api("/cost-breakdown", {
        method: "POST",
        body: JSON.stringify({
          project_id: Number(projectId),
          budget_code: code,
          budget_name: name,
          base_budget: parseMoney(baseBudget),
        }),
      });
      clearDraft();
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
      budgetCode: row.budgetCode,
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

    const code = String(editDraft.budgetCode || "").trim();
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

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1.2fr)_minmax(160px,0.8fr)_minmax(180px,1fr)]">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-sm text-neutral-700 dark:text-neutral-300">مرکز/پروژه</span>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              cancelEdit();
              setErr("");
            }}
            className={inputCls}
          >
            <option value="">{projectsLoading ? "در حال دریافت..." : "انتخاب کنید"}</option>
            {sortedProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {toFaDigits(p.code)}
                {p.name ? ` - ${p.name}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-sm text-neutral-700 dark:text-neutral-300">کد بودجه</span>
          <input
            value={budgetCode}
            onChange={(e) => setBudgetCode(toEnDigits(e.target.value))}
            className={inputCls + " ltr text-left"}
            placeholder="مثلا 01.02"
            spellCheck={false}
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-sm text-neutral-700 dark:text-neutral-300">نام بودجه</span>
          <input
            value={budgetName}
            onChange={(e) => setBudgetName(e.target.value)}
            className={inputCls}
            placeholder="نام بودجه"
          />
        </label>
      </div>

      <TableWrap>
        <div className={tablePreset.outer}>
          <div className={tablePreset.innerPad}>
            <div className={tablePreset.frame}>
              <table className={tablePreset.table + " text-[13px] md:text-sm"} dir="rtl">
                <THead>
                  <tr className={tablePreset.headRow}>
                    <TH className={`w-20 ${tablePreset.th}`}>#</TH>
                    <TH className={`w-52 ${tablePreset.th}`}>کد بودجه</TH>
                    <TH className={tablePreset.th}>نام بودجه</TH>
                    <TH className={`w-52 ${tablePreset.th}`}>بودجه مبنا</TH>
                    <TH className={`w-36 ${tablePreset.th}`}>اقدامات</TH>
                  </tr>
                </THead>

                <tbody className={tablePreset.body}>
                  {!projectId ? (
                    <TR>
                      <TD colSpan={5} className={tablePreset.emptyRow}>
                        مرکز/پروژه را انتخاب کنید.
                      </TD>
                    </TR>
                  ) : loading ? (
                    <TR>
                      <TD colSpan={5} className={tablePreset.emptyRow}>
                        در حال بارگذاری...
                      </TD>
                    </TR>
                  ) : !hasDraftRow && rows.length === 0 ? (
                    <TR>
                      <TD colSpan={5} className={tablePreset.emptyRow}>
                        موردی ثبت نشده.
                      </TD>
                    </TR>
                  ) : (
                    <>
                      {hasDraftRow && (
                        <TR className={getHoverSelectableRowClass(false)}>
                          <TD className="px-2.5 py-2 text-center">جدید</TD>
                          <TD className="px-2.5 py-2 text-center font-mono ltr">
                            {toFaDigits(budgetCode || "—")}
                          </TD>
                          <TD className="px-2.5 py-2 text-center">{budgetName || "—"}</TD>
                          <TD className="px-2.5 py-2 text-center">
                            <input
                              value={baseBudget ? toFaDigits(formatMoney(baseBudget)) : ""}
                              onChange={(e) => setBaseBudget(parseMoney(e.target.value))}
                              className={moneyInputCls}
                              placeholder="0"
                              inputMode="numeric"
                            />
                          </TD>
                          <TD className="px-2.5 py-2 text-center">
                            <div className="flex min-h-[34px] items-center justify-center">
                              <RowActionIconBtn action="delete" onClick={clearDraft} size={34} iconSize={16} />
                            </div>
                          </TD>
                        </TR>
                      )}

                      {rows.map((row, idx) => {
                        const isEditing = editId === row.id;
                        return (
                          <TR key={row.id} className={getHoverSelectableRowClass(false)}>
                            <TD className="px-2.5 py-2 text-center">{toFaDigits(idx + 1)}</TD>
                            <TD className="px-2.5 py-2 text-center font-mono ltr">
                              {isEditing ? (
                                <input
                                  value={editDraft.budgetCode}
                                  onChange={(e) =>
                                    setEditDraft((prev) => ({ ...prev, budgetCode: toEnDigits(e.target.value) }))
                                  }
                                  className={moneyInputCls}
                                  spellCheck={false}
                                />
                              ) : (
                                toFaDigits(row.budgetCode || "—")
                              )}
                            </TD>
                            <TD className="px-2.5 py-2 text-center">
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
                            </TD>
                            <TD className="px-2.5 py-2 text-center">
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
                            </TD>
                            <TD className="px-2.5 py-2 text-center">
                              <div className="relative flex min-h-[34px] items-center justify-center">
                                <span
                                  className={`transition-opacity ${
                                    isEditing
                                      ? "opacity-0 pointer-events-none"
                                      : "opacity-100 group-hover:opacity-0 group-hover:pointer-events-none"
                                  }`}
                                >
                                  -
                                </span>
                                <div
                                  className={`absolute inset-0 flex items-center justify-center gap-1 transition-opacity ${
                                    isEditing
                                      ? "opacity-100 pointer-events-auto"
                                      : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
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
      </TableWrap>

      {err && <div className="mt-3 text-center text-sm text-red-600 dark:text-red-400">{err}</div>}

      <div className="mt-4 flex items-center justify-end">
        <button
          type="button"
          onClick={saveDraft}
          disabled={saving || !projectId || !hasDraftRow}
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
