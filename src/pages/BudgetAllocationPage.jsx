// src/pages/BudgetAllocationPage.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Shell from "../components/layout/Shell";
import { Card } from "../components/ui/Card";
import { TableWrap, THead, TH, TR, TD } from "../components/ui/Table";
import { usePageAccess } from "../hooks/usePageAccess";

// تب‌ها به‌صورت ثابت بیرون کامپوننت
const ALLOC_TABS = [
  { id: "office", label: "دفتر مرکزی", prefix: "OB" },
  { id: "site", label: "سایت", prefix: "SB" },
  { id: "finance", label: "مالی", prefix: "FB" },
  { id: "cash", label: "نقدی", prefix: "CB" },
  { id: "capex", label: "سرمایه‌ای", prefix: "IB" },
  { id: "projects", label: "پروژه‌ها", prefix: "" },
];

const PAGE_KEY = "BudgetAllocationPage";

function BudgetAllocationPage() {
  const [active, setActive] = useState("office"); // office|site|finance|cash|capex|projects

  const API_BASE = (window.API_URL || "/api").replace(/\/+$/, "");

  async function api(path, opt = {}) {
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
    if (!res.ok) {
      throw new Error(data?.error || data?.message || "request_failed");
    }
    return data;
  }

  const { me, loading: accessLoading, canAccessPage, allowedTabs } = usePageAccess(PAGE_KEY, ALLOC_TABS);

  const tabs = useMemo(() => {
    if (!allowedTabs) return [];
    return ALLOC_TABS.filter((t) => allowedTabs.includes(t.id));
  }, [allowedTabs]);

  useEffect(() => {
    if (!tabs.length) return;
    if (!tabs.some((t) => t.id === active)) setActive(tabs[0].id);
  }, [tabs, active]);

  const prefixOf = (k) => tabs.find((t) => t.id === k)?.prefix || "";

  const renderCode = (code) => {
    if (active === "projects") return code || "—";
    const pref = prefixOf(active);
    let raw = String(code || "").trim();
    if (pref) {
      const re = new RegExp("^" + pref + "[\\-\\.]?", "i");
      raw = raw.replace(re, "").replace(/^[-.]/, "");
    }
    return (pref ? pref + "-" : "") + raw;
  };

  const todayFa = useMemo(() => {
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

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");

  const selectedProject = useMemo(
    () => (projects || []).find((p) => String(p.id) === String(projectId)),
    [projects, projectId]
  );

  const normalizeProject = (p) => {
    const code =
      p?.code ??
      p?.project_code ??
      p?.projectCode ??
      p?.projectCodeText ??
      p?.project_no ??
      p?.projectNo ??
      "";
    const name =
      p?.name ??
      p?.project_name ??
      p?.projectName ??
      p?.title ??
      p?.label ??
      "";
    return {
      ...p,
      id: p?.id,
      code: code == null ? "" : String(code),
      name: name == null ? "" : String(name),
    };
  };

  // پروژه‌ها از سرور
  useEffect(() => {
    if (canAccessPage !== true) return;
    let alive = true;
    (async () => {
      try {
        const r = await api("/projects");
        if (!alive) return;

        const raw = Array.isArray(r)
          ? r
          : Array.isArray(r?.items)
          ? r.items
          : Array.isArray(r?.projects)
          ? r.projects
          : Array.isArray(r?.data)
          ? r.data
          : [];

        const list = Array.isArray(raw) ? raw : [];
        const norm = list
          .map(normalizeProject)
          .filter((x) => x && x.id != null && String(x.code || "").trim());

        setProjects(norm);
      } catch {
        if (!alive) return;
        setProjects([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [canAccessPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedProjects = useMemo(() => {
    return (projects || [])
      .slice()
      .sort((a, b) =>
        String(a?.code || "").localeCompare(String(b?.code || ""), "fa", {
          numeric: true,
          sensitivity: "base",
        })
      );
  }, [projects]);

  const [sourceItems, setSourceItems] = useState([]); // [{code,name,last_amount}]
  const [totals, setTotals] = useState({}); // { code: totalAlloc }
  const [historyByCode, setHistoryByCode] = useState({}); // { code: [...] }

  const [rows, setRows] = useState([]); // [{code,name,lastAmount,totalAlloc,allocRaw,desc}]
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [pickCode, setPickCode] = useState("");
  const moneyRefs = useRef({});
  const descRefs = useRef({});

  const [codeSortDir, setCodeSortDir] = useState("asc");

  // ===== Helpers: تبدیل اعداد =====
  const formatMoney = (n) => {
    if (n === null || n === undefined) return "";
    const sign = n < 0 ? "-" : "";
    const s = String(Math.abs(Number(n) || 0));
    return sign + s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const toFaDigits = (s) =>
    String(s ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

  const toEnDigits = (s) =>
    String(s || "")
      .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
      .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

  const parseMoney = (s) => {
    if (s == null) return 0;
    const sign = /^\s*-/.test(String(s)) ? -1 : 1;
    const d = toEnDigits(String(s)).replace(/[^\d]/g, "");
    if (!d) return 0;
    return sign * parseInt(d, 10);
  };

  const formatDateTimeFa = (dt) => {
    try {
      return toFaDigits(
        new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(dt))
      );
    } catch {
      return toFaDigits(new Date(dt).toLocaleString("fa-IR"));
    }
  };

  // ===== نمایش کد بودجه در حالت پروژه با پیشوند کد پروژه (نمایشی، بدون تغییر منطق ذخیره) =====
  const renderDisplayBudgetCode = (code) => {
    const base = renderCode(code);
    if (active === "projects" && selectedProject?.code) {
      const pc = String(selectedProject.code || "").trim();
      if (!pc) return base;
      return `${pc}-${base}`;
    }
    return base;
  };

  const budgetCodeHeader = useMemo(() => {
    if (active === "projects") return "کد بودجه (پروژه)";
    return "کد بودجه";
  }, [active]);

  const getNextSerial = async () => {
    const qs = new URLSearchParams();
    qs.set("kind", active);
    if (active === "projects" && projectId)
      qs.set("project_id", String(projectId));
    qs.set("_", String(Date.now()));
    const r = await api("/budget-allocations/next?" + qs.toString());
    return r || {};
  };

  // ===== لود داده‌ها از سرور =====
  useEffect(() => {
    if (canAccessPage !== true) return;
    if (active === "projects" && !projectId) return;

    let abort = false;
    (async () => {
      setErr("");
      setLoading(true);
      try {
        const qs1 = new URLSearchParams();
        qs1.set("kind", active);
        if (active === "projects" && projectId)
          qs1.set("project_id", String(projectId));
        qs1.set("_", String(Date.now()));

        let items = [];
        try {
          const est = await api("/budget-estimates?" + qs1.toString());
          items = Array.isArray(est?.items) ? est.items.slice() : [];
        } catch {
          items = [];
        }

        if (items.length === 0) {
          try {
            const centers = await api(`/centers/${active}`);
            const raw =
              centers?.items || centers?.centers || centers?.data || [];
            const list = Array.isArray(raw) ? raw : [];
            items = list
              .map((c) => ({
                code: c?.code || c?.center_code || c?.suffix || "",
                center_desc: c?.center_desc || c?.description || c?.name || "",
                last_amount: Number(c?.last_amount || 0),
              }))
              .filter((x) => String(x.code || "").trim());
          } catch {
            items = [];
          }
        }

        const qs2 = new URLSearchParams();
        qs2.set("kind", active);
        if (active === "projects" && projectId)
          qs2.set("project_id", String(projectId));
        qs2.set("_", String(Date.now()));

        let sum = { totals: {} };
        try {
          sum = await api("/budget-allocations/summary?" + qs2.toString());
        } catch {
          sum = { totals: {} };
        }

        let histMap = {};
        try {
          const qs3 = new URLSearchParams();
          qs3.set("kind", active);
          if (active === "projects" && projectId)
            qs3.set("project_id", String(projectId));
          qs3.set("_", String(Date.now()));
          const hist = await api("/budget-allocations/history?" + qs3.toString());
          histMap = hist?.history || {};
        } catch {
          histMap = {};
        }

        if (abort) return;

        const sorted = (items || [])
          .slice()
          .sort((a, b) =>
            String(a.code).localeCompare(String(b.code), "fa", {
              numeric: true,
              sensitivity: "base",
            })
          );

        const built = sorted.map((s) => ({
          code: s.code,
          name: s.center_desc || "",
          lastAmount: s.last_amount || 0,
          totalAlloc: (sum?.totals || {})[s.code] || 0,
          allocRaw: 0,
          desc: "",
        }));

        setSourceItems(sorted);
        setTotals(sum?.totals || {});
        setHistoryByCode(histMap);
        setRows(built);
      } catch (ex) {
        if (!abort) setErr(ex.message || "خطا در بارگذاری");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [active, projectId, refreshKey, canAccessPage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const kick = () => {
      setRefreshKey((x) => x + 1);
    };
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

  const onAllocChange = (code, v) => {
    const rawVal = parseMoney(v);
    setRows((prev) =>
      prev.map((r) => (r.code === code ? { ...r, allocRaw: rawVal } : r))
    );
    requestAnimationFrame(() => {
      const el = moneyRefs.current[code];
      if (el) {
        el.focus();
        const txt = el.value;
        el.setSelectionRange(txt.length, txt.length);
      }
    });
  };

  const onDescChange = (code, v) => {
    setRows((prev) =>
      prev.map((r) => (r.code === code ? { ...r, desc: v } : r))
    );
  };

  const removeRow = async (code) => {
    try {
      const hist = historyByCode?.[code] || [];
      if (hist.length === 0) {
        setErr("سابقه‌ای برای حذف یافت نشد.");
        return;
      }
      const last = hist
        .slice()
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .pop();
      const lastAmt = Number(last?.amount || 0);
      if (!lastAmt) {
        setErr("آخرین تخصیص قابل حذف نیست.");
        return;
      }

      const next = await getNextSerial();
      const serial = next?.serial || "";
      const date_jalali = next?.date_jalali || todayFa;

      const body = {
        serial,
        date_jalali,
        project_id:
          active === "projects" ? (projectId ? Number(projectId) : null) : null,
        project_name:
          active === "projects" && selectedProject ? selectedProject.name : null,
        kind: active,
        rows: [{ code, alloc: -lastAmt, desc: "حذف آخرین تخصیص" }],
      };
      await api("/budget-allocations", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setTotals((prev) => ({
        ...prev,
        [code]: Number(prev[code] || 0) - lastAmt,
      }));
      setRefreshKey((x) => x + 1);
    } catch (ex) {
      setErr(ex.message || "خطا در حذف آخرین تخصیص");
    }
  };

  const [saving, setSaving] = useState(false);
  const [modalMsg, setModalMsg] = useState(null);

  const onSubmit = async () => {
    try {
      setSaving(true);
      setErr("");
      const payloadRows = rows
        .filter((r) => (r.allocRaw || 0) !== 0)
        .map((r) => ({
          code: r.code,
          alloc: Number(r.allocRaw || 0),
          desc: (r.desc || "").trim() || null,
        }));

      if (payloadRows.length === 0) {
        setModalMsg({ ok: true, msg: "چیزی برای ثبت انتخاب نشده است." });
        return;
      }

      const viol = payloadRows.find((pr) => {
        const r = rows.find((x) => x.code === pr.code);
        const newTotal = Number(r?.totalAlloc || 0) + Number(pr.alloc || 0);
        return newTotal > Number(r?.lastAmount || 0);
      });
      if (viol) {
        setErr("مبلغ تخصیص از آخرین برآورد این کُد بیشتر می‌شود.");
        setSaving(false);
        return;
      }

      const next = await getNextSerial();
      const serial = next?.serial || "";
      const date_jalali = next?.date_jalali || todayFa;

      const body = {
        serial,
        date_jalali,
        project_id:
          active === "projects" ? (projectId ? Number(projectId) : null) : null,
        project_name:
          active === "projects" && selectedProject ? selectedProject.name : null,
        kind: active,
        rows: payloadRows,
      };
      await api("/budget-allocations", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          totalAlloc:
            Number(r.totalAlloc || 0) +
            Number(payloadRows.find((p) => p.code === r.code)?.alloc || 0),
          allocRaw: 0,
          desc: "",
        }))
      );
      setRefreshKey((x) => x + 1);
      setModalMsg({ ok: true, msg: `ثبت با موفقیت انجام شد. سریال: ${serial}` });
    } catch (ex) {
      setModalMsg({ ok: false, msg: ex.message || "خطا از سرور" });
    } finally {
      setSaving(false);
    }
  };

  const Picker = () => (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <label className="text-sm text-black/70 dark:text-neutral-300">
          انتخاب کد/نام بودجه (برای فیلتر)
        </label>
        <select
          className="w-full rounded-xl px-3 py-2 bg-white text-black placeholder-black/40 border border-black/15 outline-none
                     dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700"
          value={pickCode}
          onChange={(e) => setPickCode(e.target.value)}
          disabled={active === "projects" && !projectId}
        >
          <option
            className="bg-white text-black dark:bg-neutral-900 dark:text-neutral-100"
            value=""
          >
            -- همه موارد --
          </option>
          {(sourceItems || []).map((it) => (
            <option
              className="bg-white text-black dark:bg-neutral-900 dark:text-neutral-100"
              key={it.code}
              value={it.code}
            >
              {`${toFaDigits(renderDisplayBudgetCode(it.code))} — ${
                it.center_desc || it.name || ""
              }`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const rowsToRender = useMemo(() => {
    let base = rows || [];
    if (pickCode) {
      base = base.filter((r) => String(r.code) === String(pickCode));
    }
    const sorted = base.slice().sort((a, b) => {
      const ac = renderDisplayBudgetCode(a.code);
      const bc = renderDisplayBudgetCode(b.code);
      const cmp = String(ac || "").localeCompare(String(bc || ""), "fa", {
        numeric: true,
        sensitivity: "base",
      });
      return codeSortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, pickCode, codeSortDir, active, projectId, selectedProject]); // eslint-disable-line react-hooks/exhaustive-deps

  const TopButtons = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => {
            setPickCode("");
            setActive(t.id);
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
  );

  const ProjectsControls = () => {
    if (active !== "projects") return null;
    return (
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
              setPickCode("");
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
                {toFaDigits(p.code || "—")} {p?.name ? `— ${p.name}` : ""}
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
    );
  };

  // ===== UI states for access =====
  if (accessLoading) {
    return (
      <>
        <Card>
          <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
            <span>بودجه‌بندی</span>
            <span className="mx-2">›</span>
            <span className="font-semibold text-black dark:text-neutral-100">
              تخصیص بودجه
            </span>
          </div>
          <div className="p-5 text-center text-black/60 dark:text-neutral-300">
            در حال بررسی دسترسی…
          </div>
        </Card>
      </>
    );
  }

  if (!me) {
    return (
      <>
        <Card>
          <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
            <span>بودجه‌بندی</span>
            <span className="mx-2">›</span>
            <span className="font-semibold text-black dark:text-neutral-100">
              تخصیص بودجه
            </span>
          </div>
          <div className="p-5 text-center text-red-600 dark:text-red-400">
            ابتدا وارد سامانه شوید.
          </div>
        </Card>
      </>
    );
  }

  if (canAccessPage !== true || (tabs || []).length === 0) {
    return (
      <>
        <Card>
          <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
            <span>بودجه‌بندی</span>
            <span className="mx-2">›</span>
            <span className="font-semibold text-black dark:text-neutral-100">
              تخصیص بودجه
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
        <div className="mb-4 text-black/70 dark:text-neutral-300 text-base md:text-lg">
          <span>بودجه‌بندی</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-black dark:text-neutral-100">
            تخصیص بودجه
          </span>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <div className="text-sm text-black/60 dark:text-neutral-400">
            تاریخ:
          </div>
          <div className="px-3 py-1 rounded-lg bg-black/5 text-black text-sm ring-1 ring-black/15 dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-800">
            {toFaDigits(todayFa)}
          </div>
        </div>

        <div className="space-y-4 mb-4">
          <TopButtons />
          <ProjectsControls />
          <Picker />
        </div>

        <TableWrap>
          <div
            className="bg-white rounded-2xl overflow-hidden border border-black/10 shadow-sm
                          text-black dark:bg-neutral-900 dark:text-neutral-200 dark:border-neutral-800"
          >
            <table
              className="w-full text-sm [&_th]:text-center [&_td]:text-center"
              dir="rtl"
            >
              <THead>
                <tr
                  className="bg-black/5 text-black border-y border-black/10
                               dark:bg-white/5 dark:text-neutral-100 dark:border-neutral-700"
                >
                  <TH className="!text-center py-3 w-16 !text-black dark:!text-neutral-100">
                    #
                  </TH>
                  <TH className="!text-center py-3 w-56 !text-black dark:!text-neutral-100">
                    <div className="flex items-center justify-center gap-1 w-full">
                      <span>{budgetCodeHeader}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCodeSortDir((prev) =>
                            prev === "asc" ? "desc" : "asc"
                          )
                        }
                        className="rounded-lg px-2 py-1 ring-1 ring-black/15 hover:bg-black/5
                                   dark:ring-neutral-800 dark:hover:bg-white/10"
                        aria-label="مرتب‌سازی کد بودجه"
                      >
                        <img
                          src={
                            codeSortDir === "asc"
                              ? "/images/icons/kochikbebozorg.svg"
                              : "/images/icons/bozorgbekochik.svg"
                          }
                          alt=""
                          className="w-5 h-5 dark:invert"
                        />
                      </button>
                    </div>
                  </TH>
                  <TH className="!text-center py-3 !text-black dark:!text-neutral-100">
                    نام بودجه
                  </TH>
                  <TH className="!text-center py-3 w-40 !text-black dark:!text-neutral-100">
                    آخرین برآورد
                  </TH>
                  <TH className="!text-center py-3 w-44 !text-black dark:!text-neutral-100">
                    مجموع تخصیص‌ها
                  </TH>
                  <TH className="!text-center py-3 w-48 !text-black dark:!text-neutral-100">
                    تخصیص جدید
                  </TH>
                  <TH className="!text-center py-3 w-[28ch] !text-black dark:!text-neutral-100">
                    شرح
                  </TH>
                  <TH className="!text-center py-3 w-28 !text-black dark:!text-neutral-100">
                    اقدامات
                  </TH>
                </tr>
              </THead>

              <tbody className="[&_td]:text-black dark:[&_td]:text-neutral-100">
                {loading ? (
                  <TR>
                    <TD
                      colSpan={8}
                      className="!text-center text-black/60 dark:text-neutral-400 py-3"
                    >
                      در حال بارگذاری…
                    </TD>
                  </TR>
                ) : (rowsToRender || []).length === 0 ? (
                  <TR>
                    <TD
                      colSpan={8}
                      className="!text-center text-black/60 dark:text-neutral-400 py-3"
                    >
                      {active === "projects" && !projectId
                        ? "ابتدا پروژه را انتخاب کنید"
                        : "موردی یافت نشد."}
                    </TD>
                  </TR>
                ) : (
                  (rowsToRender || []).map((r, idx) => {
                    const newTotal =
                      Number(r.totalAlloc || 0) + Number(r.allocRaw || 0);
                    const limit = Number(r.lastAmount || 0);
                    const isOver = newTotal > limit;

                    return (
                      <TR
                        key={r.code}
                        className="border-t border-black/10 odd:bg-black/[0.02] even:bg-black/[0.04] hover:bg-black/[0.06] transition-colors
                                     dark:border-neutral-800 dark:odd:bg-white/5 dark:even:bg-white/10 dark:hover:bg-white/15 last:border-b"
                      >
                        <TD className="px-2.5 py-2 align-middle !text-center">
                          {toFaDigits(idx + 1)}
                        </TD>
                        <TD className="px-2.5 py-2 align-middle">
                          <div className="flex justify-center ltr">
                            {toFaDigits(renderDisplayBudgetCode(r.code))}
                          </div>
                        </TD>
                        <TD className="px-2.5 py-2 whitespace-normal break-words leading-snug align-middle max-w-[28ch] mx-auto !text-center">
                          {r.name || "—"}
                        </TD>
                        <TD className="px-2.5 py-2 align-middle">
                          <div className="flex justify-center ltr">
                            {toFaDigits(formatMoney(r.lastAmount || 0))}
                          </div>
                        </TD>
                        <TD className="px-2.5 py-2 align-middle">
                          <div className="flex justify-center ltr">
                            {toFaDigits(formatMoney(r.totalAlloc || 0))}
                          </div>
                        </TD>
                        <TD className="px-2.5 py-2 align-middle !text-center">
                          <div className="flex flex-col">
                            <input
                              ref={(el) => (moneyRefs.current[r.code] = el)}
                              dir="ltr"
                              className={`w-full rounded-xl px-2 py-1.5 outline-none border transition
                                        ${
                                          isOver
                                            ? "border-red-500 ring-1 ring-red-400 bg-red-50 text-red-700 placeholder-red-400 dark:bg-red-600/10 dark:text-red-200"
                                            : "bg-white text-black placeholder-black/40 border border-black/15 focus:ring-2 focus:ring-black/10 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                                        }`}
                              value={toFaDigits(formatMoney(r.allocRaw))}
                              onChange={(e) =>
                                onAllocChange(r.code, e.target.value)
                              }
                              placeholder="۰"
                              title={
                                isOver
                                  ? "تخصیص جدید از آخرین برآورد بیشتر می‌شود"
                                  : ""
                              }
                              aria-invalid={isOver ? "true" : "false"}
                            />
                            {isOver && (
                              <span className="mt-1 text-[11px] leading-none text-red-600 dark:text-red-400">
                                مقدار «تخصیص جدید» از مقدار آخرین برآورد بیشتر
                                می‌شود
                              </span>
                            )}
                          </div>
                        </TD>
                        <TD className="px-2.5 py-2 align-middle !text-center">
                          <textarea
                            ref={(el) => (descRefs.current[r.code] = el)}
                            className="w-full rounded-xl px-2 py-1.5 whitespace-normal break-words leading-snug outline-none
                                     bg-white text-black placeholder-black/40 border border-black/15 focus:ring-2 focus:ring-black/10
                                     dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700 dark:focus:ring-neutral-600/50"
                            rows={2}
                            value={r.desc}
                            onChange={(e) => onDescChange(r.code, e.target.value)}
                            placeholder="شرح تخصیص…"
                          />
                        </TD>
                        <TD className="px-2.5 py-2 align-middle !text-center">
                          <div className="inline-flex items-center justify-center gap-2">
                            <button
                              onClick={() => removeRow(r.code)}
                              className="h-9 w-11 grid place-items-center rounded-xl bg-white text-red-600
                                      border border-red-500 hover:bg-red-50 transition
                                      dark:bg-transparent dark:text-red-300 dark:border-red-400/60 dark:hover:bg-white/10"
                              aria-label="حذف"
                              title="حذف"
                            >
                              <img
                                src="/images/icons/hazf.svg"
                                alt=""
                                className="w-5 h-5 [filter:invert(22%)_sepia(94%)_saturate(7488%)_hue-rotate(1deg)_brightness(103%)_contrast(122%)]"
                              />
                            </button>
                          </div>
                        </TD>
                      </TR>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TableWrap>

        {err && (
          <div className="text-sm text-red-600 dark:text-red-400 mt-3">
            {err}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 justify-end">
          <button
            onClick={onSubmit}
            disabled={saving || (active === "projects" && !projectId)}
            className="h-10 w-14 grid place-items-center rounded-xl bg-neutral-900 text-white disabled:opacity-50
                       dark:bg-neutral-100 dark:text-neutral-900"
            aria-label="ثبت"
            title="ثبت"
          >
            <img
              src="/images/icons/check.svg"
              alt=""
              className="w-5 h-5 invert dark:invert"
            />
          </button>
        </div>

        {modalMsg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-2 sm:px-4">
            <div
              className="absolute inset-0 bg-black/40 dark:bg-neutral-950/60 backdrop-blur-[2px]"
              onClick={() => setModalMsg(null)}
            />
            <div
              className="relative w-full max-w-4xl max-h-[90vh] overflow-auto bg-white rounded-3xl shadow-2xl ring-1 ring-black/10 p-4 sm:p-6
                         text-black dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div id="alloc-preview">
                <h2 className="text-lg md:text-xl font-bold text-black dark:text-neutral-100 mb-2 text-center">
                  تخصیص بودجه
                </h2>
                <div className="meta text-sm text-black/70 dark:text-neutral-300 grid sm:grid-cols-2 gap-x-6 gap-y-1 mb-3 text-center">
                  <div>
                    تاریخ:{" "}
                    <b className="text-black dark:text-neutral-100">
                      {toFaDigits(todayFa)}
                    </b>
                  </div>
                  <div>
                    ساعت:{" "}
                    <b className="text-black dark:text-neutral-100">
                      {toFaDigits(new Date().toLocaleTimeString("fa-IR"))}
                    </b>
                  </div>
                  {me && (
                    <div>
                      کاربر:{" "}
                      <b className="text-black dark:text-neutral-100">
                        {me.name || me.username || me.email}
                      </b>
                    </div>
                  )}
                  {active === "projects" && selectedProject && (
                    <div>
                      پروژه:{" "}
                      <b className="text-black dark:text-neutral-100">
                        {toFaDigits(selectedProject.code)} —{" "}
                        {selectedProject.name}
                      </b>
                    </div>
                  )}
                </div>

                {(rows || []).length > 0 && (
                  <div className="overflow-auto rounded-xl ring-1 ring-black/10 dark:ring-neutral-800 mb-6">
                    <table className="w-full text-sm [&_th]:text-center [&_td]:text-center">
                      <thead className="bg-black/5 dark:bg:white/5 dark:text-neutral-100">
                        <tr>
                          <th className="py-3 px-2 text-center">#</th>
                          <th className="py-3 px-2 text-center">
                            {budgetCodeHeader}
                          </th>
                          <th className="py-3 px-2 text-center">نام بودجه</th>
                          <th className="py-3 px-2 text-center">آخرین برآورد</th>
                          <th className="py-3 px-2 text-center">
                            مجموع تخصیص‌ها
                          </th>
                          <th className="py-3 px-2 text-center">تخصیص جدید</th>
                          <th className="py-3 px-2 text-center">شرح</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr
                            key={r.code}
                            className="border-t border-black/10 dark:border-neutral-800"
                          >
                            <td className="py-2 px-2 text-center">
                              {toFaDigits(i + 1)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {toFaDigits(renderDisplayBudgetCode(r.code))}
                            </td>
                            <td className="py-2 px-2 whitespace-normal break-words leading-relaxed text-center max-w-[28ch] mx-auto">
                              {r.name || "—"}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {toFaDigits(formatMoney(r.lastAmount || 0))}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {toFaDigits(formatMoney(r.totalAlloc || 0))}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {toFaDigits(formatMoney(r.allocRaw || 0))}
                            </td>
                            <td className="py-2 px-2 whitespace-normal break-words leading-relaxed text-center">
                              {r.desc || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h3 className="section-title text-center text-base md:text-lg text-black dark:text-neutral-100">
                  تاریخچه تخصیص‌ها
                </h3>
                <div className="overflow-auto rounded-xl ring-1 ring-black/10 dark:ring-neutral-800 mt-2">
                  <table className="w-full text-sm [&_th]:text-center [&_td]:text-center">
                    <thead className="bg-black/5 dark:bg:white/5 dark:text-neutral-100">
                      <tr>
                        <th className="py-3 px-2 w-56 text-center">
                          {budgetCodeHeader}
                        </th>
                        <th className="py-3 px-2 text-center">
                          سوابق (مبلغ — تاریخ/ساعت)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(rows || []).map((r) => {
                        const hist = historyByCode?.[r.code] || {};
                        const list = Array.isArray(hist) ? hist : [];
                        return (
                          <tr
                            key={"h-" + r.code}
                            className="border-t border-black/10 dark:border-neutral-800"
                          >
                            <td className="py-2 px-2 text-center align-middle">
                              {toFaDigits(renderDisplayBudgetCode(r.code))}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {list.length === 0 ? (
                                <span className="text-black/50 dark:text-neutral-400">
                                  — سابقه‌ای یافت نشد —
                                </span>
                              ) : (
                                <div className="grid gap-1">
                                  {list.map((h, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center justify-center gap-4 text-sm"
                                    >
                                      <span>
                                        {toFaDigits(formatMoney(h.amount || 0))}
                                      </span>
                                      <span className="text-black/70 dark:text-neutral-300">
                                        —
                                      </span>
                                      <span>{formatDateTimeFa(h.created_at)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  onClick={() => window.print()}
                  className="h-10 w-10 grid place-items-center rounded-xl border border-black/15 bg-white hover:bg-black/5 transition
               dark:bg-neutral-900 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  <img
                    src="/images/icons/print.svg"
                    alt="چاپ"
                    className="w-5 h-5 dark:invert"
                  />
                </button>
                <button
                  onClick={() => setModalMsg(null)}
                  className="h-10 w-10 grid place-items-center rounded-xl bg-black text-white dark:bg-neutral-100 dark:text-neutral-900"
                >
                  <img
                    src="/images/icons/bastan.svg"
                    alt="بستن"
                    className="w-5 h-5 invert dark:invert-0"
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

export default BudgetAllocationPage;
