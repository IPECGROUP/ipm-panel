// src/pages/ReportsPage.jsx
import React from "react";
import Shell from "../components/layout/Shell";
import { Card } from "../components/ui/Card";

// ===== تب‌ها به صورت ثابت بیرون از کامپوننت =====
const REPORT_TABS = [
  { id: "office", label: "دفتر مرکزی", prefix: "OB" },
  { id: "site", label: "سایت", prefix: "SB" },
  { id: "finance", label: "مالی", prefix: "FB" },
  { id: "cash", label: "نقدی", prefix: "CB" },
  { id: "capex", label: "سرمایه‌ای", prefix: "IB" },
  { id: "projects", label: "پروژه‌ها", prefix: "" },
];

const PAGE_KEY = "ReportsPage";

// ===== Fake local DB برای گزارش‌ها (بدون API واقعی) =====
function createFakeReportsDb() {
  const projects = [
    { id: 1, code: "P-101", name: "پروژه نمونه ۱" },
    { id: 2, code: "P-102", name: "پروژه نمونه ۲" },
  ];

  // مجموع تخصیص‌ها برای هر نوع
  const totalsByKind = {
    office: {
      "101": 200_000_000,
      "102": 50_000_000,
      "103": 75_000_000,
    },
    site: {
      "101": 120_000_000,
      "102": 30_000_000,
    },
    finance: {
      "201": 90_000_000,
      "202": 40_000_000,
    },
    cash: {
      "301": 15_000_000,
    },
    capex: {
      "401": 180_000_000,
      "402": 220_000_000,
    },
    projects: {
      "501": 250_000_000,
      "502": 140_000_000,
    },
  };

  // تاریخچه تخصیص‌ها
  const sampleDate = (d, h) => new Date(2025, 0, d, h, 15, 0).toISOString(); // فقط برای تست

  const historyByKind = {
    office: {
      "101": [
        {
          amount: 100_000_000,
          created_at: sampleDate(3, 10),
          serial: "BA0408001",
          desc: "پیش‌پرداخت حقوق",
        },
        {
          amount: 100_000_000,
          created_at: sampleDate(10, 11),
          serial: "BA0408007",
          desc: "تسویه حقوق",
        },
      ],
      "102": [
        {
          amount: 50_000_000,
          created_at: sampleDate(5, 9),
          serial: "BA0408002",
          desc: "هزینه اداری",
        },
      ],
    },
    site: {
      "101": [
        {
          amount: 70_000_000,
          created_at: sampleDate(2, 8),
          serial: "BA0408003",
          desc: "هزینه سایت A",
        },
      ],
      "102": [
        {
          amount: 30_000_000,
          created_at: sampleDate(7, 12),
          serial: "BA0408004",
          desc: "هزینه ایاب و ذهاب",
        },
      ],
    },
    finance: {
      "201": [
        {
          amount: 60_000_000,
          created_at: sampleDate(4, 14),
          serial: "BA0408005",
          desc: "کارمزد بانکی",
        },
      ],
      "202": [
        {
          amount: 40_000_000,
          created_at: sampleDate(9, 16),
          serial: "BA0408006",
          desc: "سایر هزینه‌ها",
        },
      ],
    },
    cash: {
      "301": [
        {
          amount: 15_000_000,
          created_at: sampleDate(6, 10),
          serial: "BA0408008",
          desc: "پرداخت نقدی",
        },
      ],
    },
    capex: {
      "401": [
        {
          amount: 180_000_000,
          created_at: sampleDate(1, 11),
          serial: "BA0408009",
          desc: "خرید تجهیز",
        },
      ],
      "402": [
        {
          amount: 220_000_000,
          created_at: sampleDate(12, 13),
          serial: "BA0408010",
          desc: "خرید ماشین‌آلات",
        },
      ],
    },
    projects: {
      "501": [
        {
          amount: 150_000_000,
          created_at: sampleDate(8, 9),
          serial: "BA0408011",
          desc: "هزینه پروژه ۱",
        },
        {
          amount: 100_000_000,
          created_at: sampleDate(15, 10),
          serial: "BA0408012",
          desc: "تخصیص تکمیلی پروژه ۱",
        },
      ],
      "502": [
        {
          amount: 140_000_000,
          created_at: sampleDate(11, 15),
          serial: "BA0408013",
          desc: "هزینه پروژه ۲",
        },
      ],
    },
  };

  return { projects, totalsByKind, historyByKind };
}

function ReportsPage() {
  const tabs = REPORT_TABS;

  const [active, setActive] = React.useState("office");

  const prefixOf = (k) => tabs.find((t) => t.id === k)?.prefix || "";

  // ===== Access (الگوی درست مثل صفحات جدید) =====
  const API_BASE = (window.API_URL || "/api").replace(/\/+$/, "");
  async function realApi(path, opt = {}) {
    const res = await fetch(API_BASE + path, {
      credentials: "include",
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
    } catch {}
    if (!res.ok) throw new Error(data?.error || data?.message || "request_failed");
    return data;
  }

  const [accessMy, setAccessMy] = React.useState(null);
  const [accessLoading, setAccessLoading] = React.useState(true);
  const [accessErr, setAccessErr] = React.useState("");

  const [allowedTabs, setAllowedTabs] = React.useState(null); // null=درحال‌بررسی | []=هیچ تبی مجاز نیست | [...ids]
  const [accessRefreshKey, setAccessRefreshKey] = React.useState(0);

  const fetchAccess = React.useCallback(async () => {
    setAccessErr("");
    setAccessLoading(true);
    try {
      const r = await realApi("/access/my");
      setAccessMy(r || null);
    } catch (e) {
      setAccessMy(null);
      setAccessErr(e?.message || "خطا در بررسی دسترسی");
    } finally {
      setAccessLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await fetchAccess();
    })();
    return () => {
      alive = false;
    };
  }, [fetchAccess, accessRefreshKey]);

  const me = React.useMemo(() => accessMy?.user || null, [accessMy]);

  const isAllAccess = React.useMemo(() => {
    const u = accessMy?.user;
    if (!u) return false;

    if (String(u.role || "").toLowerCase() === "admin") return true;

    const raw = u.access_labels ?? u.access;
    const labels = Array.isArray(raw)
      ? raw.map((x) => String(x))
      : typeof raw === "string"
      ? [raw]
      : [];

    return labels.includes("all");
  }, [accessMy]);

  const canAccessPage = React.useMemo(() => {
    if (!accessMy) return null;
    if (isAllAccess) return true;

    const pageRule = accessMy?.pages?.[PAGE_KEY];
    return pageRule?.permitted === 1 || pageRule?.permitted === true;
  }, [accessMy, isAllAccess]);

  React.useEffect(() => {
    if (canAccessPage !== true) {
      if (canAccessPage === false) setAllowedTabs([]);
      return;
    }

    let alive = true;
    (async () => {
      try {
        if (isAllAccess) {
          const all = tabs.map((t) => t.id);
          if (!alive) return;
          setAllowedTabs(all);
          if (all.length && !all.includes(active)) setActive(all[0]);
          return;
        }

        let tabsAllowed = null;
        try {
          const r = await realApi("/auth/check-page", {
            method: "POST",
            body: JSON.stringify({
              page: PAGE_KEY,
              tabs: tabs.map((t) => t.id),
            }),
          });

          const cand =
            r?.allowed_tabs || r?.allowedTabs || r?.tabs || r?.allowed || null;

          if (Array.isArray(cand)) tabsAllowed = cand;
          else if (r?.ok === true) tabsAllowed = tabs.map((t) => t.id);
          else if (r?.ok === false) tabsAllowed = [];
        } catch {
          tabsAllowed = null;
        }

        if (!alive) return;

        const allIds = tabs.map((t) => t.id);
        const finalTabs = Array.isArray(tabsAllowed)
          ? tabsAllowed.filter((x) => allIds.includes(x))
          : allIds;

        setAllowedTabs(finalTabs);
        if (finalTabs.length && !finalTabs.includes(active)) {
          setActive(finalTabs[0]);
        }
      } catch {
        if (!alive) return;
        const all = tabs.map((t) => t.id);
        setAllowedTabs(all);
        if (!all.includes(active)) setActive(all[0]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [canAccessPage, isAllAccess, active]); // tabs ثابت است // eslint-disable-line react-hooks/exhaustive-deps

  const visibleTabs = React.useMemo(() => {
    if (allowedTabs === null) return [];
    return tabs.filter((t) => (allowedTabs || []).includes(t.id));
  }, [allowedTabs, tabs]);

  React.useEffect(() => {
    const kick = () => setAccessRefreshKey((x) => x + 1);
    const onVis = () => {
      if (!document.hidden) kick();
    };
    window.addEventListener("focus", kick);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", kick);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // ===== fake DB این صفحه =====
  const fakeDbRef = React.useRef(null);
  if (!fakeDbRef.current) {
    fakeDbRef.current = createFakeReportsDb();
  }
  const fakeDb = fakeDbRef.current;

  // ===== fake API بدون fetch =====
  async function api(path) {
    await new Promise((r) => setTimeout(r, 120));

    if (path === "/projects") {
      return { projects: fakeDb.projects };
    }

    if (path.startsWith("/budget-allocations/summary")) {
      const url = new URL(path, window.location.origin);
      const kind = url.searchParams.get("kind") || "office";
      const totals = fakeDb.totalsByKind[kind] || {};
      return { totals };
    }

    if (path.startsWith("/budget-allocations/history")) {
      const url = new URL(path, window.location.origin);
      const kind = url.searchParams.get("kind") || "office";
      const history = fakeDb.historyByKind[kind] || {};
      return { history };
    }

    return {};
  }

  // ===== today (fa) =====
  const todayFa = React.useMemo(() => {
    try {
      return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        dateStyle: "medium",
      }).format(new Date());
    } catch {
      return new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    }
  }, []);

  // ===== formatters =====
  const formatMoney = (n) => {
    if (n === null || n === undefined) return "";
    const sign = n < 0 ? "-" : "";
    const s = String(Math.abs(Number(n) || 0));
    return sign + s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const renderBudgetCodeOnce = React.useCallback(
    (code, scope) => {
      if (scope === "projects") return String(code || "");
      const pref = String(prefixOf(scope) || "").toUpperCase();
      let raw = String(code || "").trim();
      if (pref) {
        const re = new RegExp("^" + pref + "[\\-\\.]?", "i");
        raw = raw.replace(re, "").replace(/^[-.]/, "");
      }
      return pref ? `${pref}-${raw}` : raw;
    },
    [] // prefixOf روی REPORT_TABS ثابت کار می‌کند
  );

  // ===== projects (برای تب پروژه‌ها) =====
  const [projects, setProjects] = React.useState([]);
  const [projectId, setProjectId] = React.useState("");
  const selectedProject = React.useMemo(
    () => (projects || []).find((p) => String(p.id) === String(projectId)),
    [projects, projectId]
  );

  React.useEffect(() => {
    if (canAccessPage !== true) return;
    let stop = false;
    (async () => {
      try {
        const r = await api("/projects");
        if (!stop) setProjects(r.projects || []);
      } catch {}
    })();
    return () => {
      stop = true;
    };
  }, [canAccessPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedProjects = React.useMemo(() => {
    return (projects || [])
      .slice()
      .sort((a, b) =>
        String(a?.code || "").localeCompare(String(b?.code || ""), "fa", {
          numeric: true,
          sensitivity: "base",
        })
      );
  }, [projects]);

  // ===== state گزارش =====
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [show, setShow] = React.useState(false);

  const [totals, setTotals] = React.useState({});
  const [history, setHistory] = React.useState({});

  const loadReport = React.useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const qs1 = new URLSearchParams();
      qs1.set("kind", active);
      if (active === "projects" && projectId)
        qs1.set("project_id", String(projectId));
      const sum = await api("/budget-allocations/summary?" + qs1.toString());

      const qs2 = new URLSearchParams();
      qs2.set("kind", active);
      if (active === "projects" && projectId)
        qs2.set("project_id", String(projectId));
      const hist = await api("/budget-allocations/history?" + qs2.toString());

      setTotals(sum.totals || {});
      setHistory(hist.history || {});
      setShow(true);
    } catch (ex) {
      setErr(ex.message || "خطا در بارگذاری گزارش");
    } finally {
      setLoading(false);
    }
  }, [active, projectId]);

  // ===== toolbar =====
  const Toolbar = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
      <button
        onClick={loadReport}
        disabled={active === "projects" && !projectId}
        className="h-10 px-4 rounded-2xl text-sm shadow-sm transition
                   bg-neutral-100 text-neutral-900 disabled:opacity-50
                   dark:bg-neutral-100 dark:text-neutral-900"
      >
        تخصیص بودجه
      </button>
    </div>
  );

  // ===== tabs & project picker =====
  const Controls = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {(visibleTabs || []).map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setShow(false);
              setErr("");
              setActive(t.id);
              if (t.id !== "projects") setProjectId("");
            }}
            className={`h-10 px-4 rounded-2xl border text-sm shadow-sm transition
              ${
                active === t.id
                  ? "bg-neutral-100 text-neutral-900 border-neutral-100"
                  : "bg-white text-black border border-black/15 hover:bg-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === "projects" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-black/70 dark:text-neutral-300">
              کد پروژه
            </label>
            <select
              className="w-full rounded-xl px-3 py-2 ltr font-[inherit] bg-white text-black placeholder-black/40 border border-black/15 outline-none
                         dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700"
              value={projectId}
              onChange={(e) => {
                setShow(false);
                setErr("");
                setProjectId(e.target.value);
              }}
            >
              <option
                className="bg-white text-black dark:bg-neutral-900 dark:text-neutral-100"
                value=""
              >
                انتخاب کنید
              </option>
              {(sortedProjects || []).map((p) => (
                <option
                  className="bg-white text-black dark:bg-neutral-900 dark:text-neutral-100"
                  key={p.id}
                  value={p.id}
                >
                  {p.code ? p.code : "—"} {p?.name ? `— ${p.name}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-black/70 dark:text-neutral-300">
              نام پروژه
            </label>
            <input
              className="w-full rounded-xl px-3 py-2 bg-black/5 text-black border border-black/15 outline-none
                         dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
              value={selectedProject?.name || ""}
              readOnly
            />
          </div>
        </div>
      )}
    </div>
  );

  if (accessLoading || allowedTabs === null) {
    return (
      <>
        <Card>
          <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
            <span>گزارش‌ها</span>
            <span className="mx-2">›</span>
            <span className="font-semibold text-black dark:text-neutral-100">
              گزارش‌های بودجه
            </span>
          </div>
          <div className="p-5 text-center text-black/60 dark:text-neutral-300">
            در حال بررسی دسترسی…
          </div>
        </Card>
      </>
    );
  }

  if (accessErr) {
    return (
      <>
        <Card>
          <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
            <span>گزارش‌ها</span>
            <span className="mx-2">›</span>
            <span className="font-semibold text-black dark:text-neutral-100">
              گزارش‌های بودجه
            </span>
          </div>
          <div className="p-5 rounded-2xl ring-1 ring-black/10 bg-white text-center text-red-600 dark:bg-neutral-900 dark:ring-neutral-800 dark:text-red-400">
            {accessErr}
          </div>
        </Card>
      </>
    );
  }

  if (canAccessPage !== true || (allowedTabs || []).length === 0) {
    return (
      <>
        <Card>
          <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
            <span>گزارش‌ها</span>
            <span className="mx-2">›</span>
            <span className="font-semibold text-black dark:text-neutral-100">
              گزارش‌های بودجه
            </span>
          </div>
          <div className="p-5 rounded-2xl ring-1 ring-black/10 bg-white text-center text-red-600 dark:bg-neutral-900 dark:ring-neutral-800 dark:text-red-400">
            شما سطح دسترسی لازم را ندارید.
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <Card>
        {/* عنوان */}
        <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
          <span>گزارش‌ها</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-black dark:text-neutral-100">
            گزارش‌های بودجه
          </span>
        </div>

        {/* تاریخ */}
        <div className="mb-3 flex items-center gap-2">
          <div className="text-sm text-black/60 dark:text-neutral-400">
            تاریخ:
          </div>
          <div className="px-3 py-1 rounded-lg bg-black/5 text-black text-sm ring-1 ring-black/15 dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-800">
            {todayFa}
          </div>
        </div>

        {/* دکمه‌ها */}
        <div className="mb-4">
          <Toolbar />
        </div>

        {/* فیلترها */}
        <Controls />

        {err && (
          <div className="text-sm text-red-600 dark:text-red-400 mt-3 text-center">
            {err}
          </div>
        )}

        {loading && (
          <div className="mt-4 text-center text-sm text-black/60 dark:text-neutral-400">
            در حال بارگذاری…
          </div>
        )}

        {/* نمایش گزارش */}
        {show && (
          <div className="mt-5 space-y-6">
            {/* خلاصه تخصیص‌ها */}
            <div className="rounded-xl ring-1 ring-black/10 overflow-hidden dark:ring-neutral-800">
              <table className="w-full text-sm text-center bg-white text-black dark:bg-neutral-900 dark:text-neutral-200">
                <thead className="bg-black/5 text-black dark:bg-white/5 dark:text-neutral-100">
                  <tr>
                    <th className="py-3 px-2 w-16 text-center">ردیف</th>
                    <th className="py-3 px-2 w-56 text-center">کد بودجه</th>
                    <th className="py-3 px-2 text-center">مجموع تخصیص‌ها</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(totals || {}).length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-6 text-black/60 text-center dark:text-neutral-400"
                      >
                        موردی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(totals)
                      .sort((a, b) =>
                        renderBudgetCodeOnce(a[0], active).localeCompare(
                          renderBudgetCodeOnce(b[0], active),
                          "fa",
                          { numeric: true, sensitivity: "base" }
                        )
                      )
                      .map(([code, sum], i) => (
                        <tr
                          key={code}
                          className="border-t border-black/10 odd:bg-black/[0.02] even:bg-black/[0.04] dark:border-neutral-800 dark:odd:bg-white/5 dark:even:bg-white/10"
                        >
                          <td className="py-2 px-2 text-center">{i + 1}</td>
                          <td className="py-2 px-2 font-mono ltr text-center">
                            {renderBudgetCodeOnce(code, active)}
                          </td>
                          <td className="py-2 px-2 font-mono ltr text-center">
                            {formatMoney(sum)}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>

            {/* تاریخچه تخصیص‌ها */}
            <div className="rounded-xl ring-1 ring-black/10 overflow-hidden dark:ring-neutral-800">
              <table className="w-full text-sm text-center bg-white text-black dark:bg-neutral-900 dark:text-neutral-200">
                <thead className="bg-black/5 text-black dark:bg-white/5 dark:text-neutral-100">
                  <tr>
                    <th className="py-3 px-2 w-56 text-center">کد بودجه</th>
                    <th className="py-3 px-2 text-center">
                      (مبلغ / تاریخ/ساعت) — سریال
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(history || {}).length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="py-6 text-black/60 text-center dark:text-neutral-400"
                      >
                        سابقه‌ای یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    Object.keys(history)
                      .sort((a, b) =>
                        renderBudgetCodeOnce(a, active).localeCompare(
                          renderBudgetCodeOnce(b, active),
                          "fa",
                          { numeric: true, sensitivity: "base" }
                        )
                      )
                      .map((code) => (
                        <tr
                          key={code}
                          className="border-t border-black/10 odd:bg-black/[0.02] even:bg-black/[0.04] dark:border-neutral-800 dark:odd:bg-white/5 dark:even:bg-white/10"
                        >
                          <td className="py-2 px-2 font-mono ltr text-center align-top">
                            {renderBudgetCodeOnce(code, active)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {(history[code] || []).length === 0 ? (
                              <span className="text-black/60 dark:text-neutral-400">
                                —
                              </span>
                            ) : (
                              <div className="flex flex-col gap-1 items-center">
                                {(history[code] || []).map((h, idx) => (
                                  <div key={idx} className="text-xs">
                                    <span className="font-mono ltr">
                                      {formatMoney(h.amount || 0)}
                                    </span>
                                    <span className="mx-2 text-black/50 dark:text-neutral-500">
                                      —
                                    </span>
                                    <span>
                                      {new Date(h.created_at).toLocaleDateString(
                                        "fa-IR"
                                      )}
                                    </span>
                                    <span className="mx-1 text-black/50 dark:text-neutral-500">
                                      /
                                    </span>
                                    <span>
                                      {new Date(h.created_at).toLocaleTimeString(
                                        "fa-IR"
                                      )}
                                    </span>
                                    {h.serial ? (
                                      <span className="mx-2 text-black/50 dark:text-neutral-400">
                                        [ {h.serial} ]
                                      </span>
                                    ) : null}
                                    {h.desc ? (
                                      <span className="mx-2 text-black/70 dark:text-neutral-300">
                                        — {h.desc}
                                      </span>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>

            {/* اکشن‌ها */}
            <div className="flex items-center justify-start gap-2">
              <button
                onClick={() => window.print()}
                className="h-10 w-10 grid place-items-center rounded-xl border border-black/15 bg-white hover:bg-black/5 transition
                           dark:bg-neutral-900 dark:border-neutral-700 dark:hover:bg-neutral-800"
                title="چاپ"
                aria-label="چاپ"
              >
                <img
                  src="/images/icons/print.svg"
                  alt="چاپ"
                  className="w-5 h-5 dark:invert"
                />
              </button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

export default ReportsPage;
