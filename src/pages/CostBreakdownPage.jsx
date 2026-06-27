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

const normalizeCode = (value = "") =>
  toEnDigits(value)
    .replace(/^PB[-.]?/i, "")
    .replace(/[^\d.]/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\./, "")
    .replace(/\.$/, "");

export default function CostBreakdownPage() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [budgetCenters, setBudgetCenters] = useState([]);

  const [budgetCode, setBudgetCode] = useState("");
  const [budgetName, setBudgetName] = useState("");
  const [baseBudget, setBaseBudget] = useState("");
  const [pendingRows, setPendingRows] = useState([]);

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

  const selectedProjectCode = normalizeCode(selectedProject?.code || "");

  const budgetCenterByCode = useMemo(() => {
    const map = new Map();
    for (const center of budgetCenters || []) {
      const raw = normalizeCode(center?.suffix ?? center?.code ?? "");
      if (!raw) continue;
      const name = String(center?.description ?? center?.name ?? center?.center_desc ?? "").trim();
      map.set(raw, name);
      if (selectedProjectCode && raw.startsWith(selectedProjectCode + ".")) {
        map.set(raw.slice(selectedProjectCode.length + 1), name);
      }
    }
    return map;
  }, [budgetCenters, selectedProjectCode]);

  const resolvedBudgetName = useMemo(() => {
    const code = normalizeCode(budgetCode);
    if (!code) return "";
    return budgetCenterByCode.get(code) || "";
  }, [budgetCenterByCode, budgetCode]);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await api("/projects?isActive=true");
      const raw = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
      const clean = raw
        .filter((p) => p && typeof p === "object")
        .map((p) => ({
          id: String(p.id),
          code: normalizeCode(p.code ?? ""),
          name: String(p.name ?? "").trim(),
          isActive: p.isActive !== false,
        }))
        .filter((p) => p.id && p.code && p.isActive)
        .filter((p) => !p.code.includes("."));

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

  const loadBudgetCenters = useCallback(async (nextProject = selectedProject) => {
    const baseCode = normalizeCode(nextProject?.code || "");
    if (!baseCode) {
      setBudgetCenters([]);
      return;
    }

    try {
      const res = await api("/centers/projects");
      const raw = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
      const scoped = raw
        .filter((item) => item && typeof item === "object")
        .filter((item) => {
          const code = normalizeCode(item?.suffix ?? item?.code ?? "");
          return code === baseCode || code.startsWith(baseCode + ".");
        });
      setBudgetCenters(scoped);
    } catch {
      setBudgetCenters([]);
    }
  }, [selectedProject]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!projectId) {
      setRows([]);
      setBudgetCenters([]);
      setPendingRows([]);
      return;
    }
    clearDraft();
    setPendingRows([]);
    loadRows(projectId);
    loadBudgetCenters(selectedProject);
  }, [projectId, loadRows]);

  useEffect(() => {
    loadBudgetCenters(selectedProject);
  }, [selectedProject, loadBudgetCenters]);

  useEffect(() => {
    setBudgetName(resolvedBudgetName);
  }, [resolvedBudgetName]);

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
    const code = normalizeCode(budgetCode);
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

    const existsSaved = rows.some((row) => normalizeCode(row.budgetCode) === code);
    const existsPending = pendingRows.some((row) => normalizeCode(row.budgetCode) === code);
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

  const updatePendingBaseBudget = (tempId, value) => {
    setPendingRows((prev) =>
      prev.map((row) => (row.tempId === tempId ? { ...row, baseBudget: parseMoney(value) } : row))
    );
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
        await api("/cost-breakdown", {
          method: "POST",
          body: JSON.stringify({
            project_id: Number(projectId),
            budget_code: row.budgetCode,
            budget_name: row.budgetName,
            base_budget: parseMoney(row.baseBudget),
          }),
        });
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
              clearDraft();
              setPendingRows([]);
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
            onChange={(e) => setBudgetCode(normalizeCode(e.target.value))}
            className={inputCls + " ltr text-left"}
            placeholder="مثلا 01.02"
            spellCheck={false}
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-sm text-neutral-700 dark:text-neutral-300">نام بودجه</span>
          <span className="flex min-w-0 items-center gap-2">
            <input
              value={budgetName}
              readOnly
              className={inputCls + " bg-neutral-50 dark:bg-neutral-800"}
              placeholder="بر اساس کد بودجه پر می‌شود"
            />
            <button
              type="button"
              onClick={addPendingRow}
              disabled={!projectId || saving || !normalizeCode(budgetCode) || !budgetName}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-900 text-white transition disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
              aria-label="افزودن به جدول"
              title="افزودن به جدول"
            >
              <img src="/images/icons/afzodan.svg" alt="" className="h-5 w-5 invert dark:invert-0" />
            </button>
          </span>
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
                  ) : !pendingRows.length && rows.length === 0 ? (
                    <TR>
                      <TD colSpan={5} className={tablePreset.emptyRow}>
                        موردی ثبت نشده.
                      </TD>
                    </TR>
                  ) : (
                    <>
                      {pendingRows.map((row, pendingIdx) => (
                        <TR key={row.tempId} className={getHoverSelectableRowClass(false)}>
                          <TD className="px-2.5 py-2 text-center">جدید {toFaDigits(pendingIdx + 1)}</TD>
                          <TD className="px-2.5 py-2 text-center font-mono ltr">
                            {toFaDigits(row.budgetCode || "—")}
                          </TD>
                          <TD className="px-2.5 py-2 text-center">{row.budgetName || "—"}</TD>
                          <TD className="px-2.5 py-2 text-center">
                            <input
                              value={row.baseBudget ? toFaDigits(formatMoney(row.baseBudget)) : ""}
                              onChange={(e) => updatePendingBaseBudget(row.tempId, e.target.value)}
                              className={moneyInputCls}
                              placeholder="0"
                              inputMode="numeric"
                            />
                          </TD>
                          <TD className="px-2.5 py-2 text-center">
                            <div className="flex min-h-[34px] items-center justify-center">
                              <RowActionIconBtn action="delete" onClick={() => removePendingRow(row.tempId)} size={34} iconSize={16} />
                            </div>
                          </TD>
                        </TR>
                      ))}

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
