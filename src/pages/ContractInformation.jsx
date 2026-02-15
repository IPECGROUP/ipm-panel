import React from "react";
import Card from "../components/ui/Card.jsx";

const CONTRACT_SCOPE_TABS = [
  { id: "main", label: "قرارداد اصلی (با کارفرما)" },
  { id: "sub", label: "قرارداد فرعی (با پیمانکاران/ تامین کنندگان/ مشاوران)" },
];

const DETAIL_TABS = [
  { id: "general", label: "عمومی" },
  { id: "technical", label: "فنی" },
  { id: "financial", label: "مالی" },
];

export default function ContractInformation() {
  const [projects, setProjects] = React.useState([]);
  const [projectsLoading, setProjectsLoading] = React.useState(false);
  const [projectId, setProjectId] = React.useState("");
  const [error, setError] = React.useState("");

  const [contractScopeTab, setContractScopeTab] = React.useState(CONTRACT_SCOPE_TABS[0].id);
  const [detailTab, setDetailTab] = React.useState(DETAIL_TABS[0].id);

  const api = React.useCallback(async (path, opt = {}) => {
    const base = (window.API_URL || "/api").replace(/\/+$/, "");
    const res = await fetch(base + path, {
      credentials: "include",
      cache: "no-store",
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
    } catch {
      throw new Error("bad_json_response");
    }
    if (!res.ok) throw new Error(data?.error || data?.message || "request_failed");
    return data;
  }, []);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setProjectsLoading(true);
      setError("");
      try {
        const r = await api("/projects");
        const raw = Array.isArray(r) ? r : Array.isArray(r?.projects) ? r.projects : Array.isArray(r?.items) ? r.items : [];

        const onlyActive = (raw || [])
          .filter((p) => p && typeof p === "object" && !Array.isArray(p))
          .map((p) => ({
            id: p?.id == null ? null : String(p.id),
            code: p?.code == null ? "" : String(p.code).trim(),
            name: p?.name == null ? "" : String(p.name).trim(),
            isActive: p?.isActive !== false,
          }))
          .filter((p) => p.id != null && p.isActive)
          .sort((a, b) =>
            String(a.code || "").localeCompare(String(b.code || ""), "fa", {
              numeric: true,
              sensitivity: "base",
            })
          );

        if (alive) setProjects(onlyActive);
      } catch (ex) {
        if (!alive) return;
        setProjects([]);
        setError(ex?.message || "خطا در دریافت پروژه‌ها");
      } finally {
        if (alive) setProjectsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [api]);

  React.useEffect(() => {
    if (!projectId) return;
    const exists = (projects || []).some((p) => String(p.id) === String(projectId));
    if (!exists) setProjectId("");
  }, [projectId, projects]);

  const selectedProject = React.useMemo(
    () => (projects || []).find((p) => String(p.id) === String(projectId)),
    [projects, projectId]
  );

  const activeScopeLabel =
    CONTRACT_SCOPE_TABS.find((t) => t.id === contractScopeTab)?.label || CONTRACT_SCOPE_TABS[0].label;
  const activeDetailLabel = DETAIL_TABS.find((t) => t.id === detailTab)?.label || DETAIL_TABS[0].label;

  const tabBtnClass = (isActive) =>
    `h-10 px-4 rounded-2xl border text-sm shadow-sm transition ${
      isActive
        ? "bg-neutral-100 text-neutral-900 border-neutral-100"
        : "bg-white text-black border-black/15 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
    }`;

  return (
    <Card
      className="p-5 md:p-6 rounded-2xl border bg-white text-black border-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
      dir="rtl"
    >
      <div className="mb-5 text-base md:text-lg">
        <span className="text-black/70 dark:text-neutral-300">پروژه‌ها</span>
        <span className="mx-2 text-black/50 dark:text-neutral-400">›</span>
        <span className="font-semibold text-black dark:text-neutral-100">اطلاعات قراردادی</span>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-4 md:p-5 space-y-4 dark:bg-neutral-900 dark:border-neutral-800">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-black/70 dark:text-neutral-300">پروژه</label>
          <select
            className="w-full h-11 rounded-xl px-3 ltr font-[inherit] bg-white text-black placeholder-black/40 border border-black/15 outline-none dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option className="bg-white text-black dark:bg-neutral-900 dark:text-neutral-100" value="">
              {projectsLoading ? "در حال بارگذاری پروژه‌ها..." : "انتخاب پروژه فعال"}
            </option>
            {(projects || []).map((p) => (
              <option
                className="bg-white text-black dark:bg-neutral-900 dark:text-neutral-100"
                key={p.id}
                value={p.id}
              >
                {p.code ? `${p.code} - ` : ""}
                {p.name || "بدون نام"}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {CONTRACT_SCOPE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setContractScopeTab(tab.id)}
              className={tabBtnClass(contractScopeTab === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {DETAIL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDetailTab(tab.id)}
              className={tabBtnClass(detailTab === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-black/70 dark:border-neutral-700 dark:bg-white/[0.03] dark:text-neutral-300">
          <div>
            پروژه انتخاب‌شده:{" "}
            <span className="font-semibold text-black dark:text-neutral-100">
              {selectedProject ? `${selectedProject.code ? `${selectedProject.code} - ` : ""}${selectedProject.name || "بدون نام"}` : "—"}
            </span>
          </div>
          <div className="mt-1">
            تب فعال:{" "}
            <span className="font-semibold text-black dark:text-neutral-100">
              {activeScopeLabel} / {activeDetailLabel}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
