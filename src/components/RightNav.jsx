// src/components/RightNav.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { isMainAdminUser } from "../utils/auth";
import { Btn, LinkBtn } from "./ui/Button";

function RightNav() {
  const { user } = useAuth();
  const isMainAdmin = isMainAdminUser(user);

  const { pathname } = useLocation();

  const clean = (p) => (p || "").replace(/\/+$/, "") || "/";

  // اگر پروژه با BASE_URL (ساب‌پث) بالا بیاد، path رو normalize کن
  const base = (import.meta?.env?.BASE_URL || "/").replace(/\/+$/, "");
  const stripBase = (p) => {
    const cp = clean(p);
    if (!base || base === "/" || base === "") return cp;
    return cp.startsWith(base) ? clean(cp.slice(base.length) || "/") : cp;
  };

  const pNow = stripBase(pathname);

  const [pendingPath, setPendingPath] = useState(null);
  useEffect(() => {
    setPendingPath(pNow);
  }, [pNow]);

  const isActive = (to) => {
    const p = clean(pNow);
    const t = clean(stripBase(to));
    return p === t || (t !== "/" && p.startsWith(t + "/"));
  };

  const [open, setOpen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nav_open") || "{}");
    } catch {
      return {};
    }
  });

  const toggle = (key) =>
    setOpen((curr) => {
      const willOpen = !curr[key];
      const next = willOpen ? { [key]: true } : {};
      localStorage.setItem("nav_open", JSON.stringify(next));
      return next;
    });

  // تشخیص سکشن فعال بر اساس مسیر
  const sectionFromPath = (p) => {
    const path = clean(p);

    if (
      path.startsWith("/budget/") ||
      path === "/budget/centers" ||
      path === "/estimates" ||
      path === "/revenue-estimates" ||
      path === "/budget-allocation" ||
      path === "/budget/reports"
    )
      return "budget";

    if (path.startsWith("/base/") || path === "/centers/projects" || path.startsWith("/admin/"))
      return "base";

    if (path.startsWith("/centers/contract-info") || path.startsWith("/projects/"))
      return "projects";

    return null;
  };

  const activeSection = sectionFromPath(pNow);

  // آیکن‌ها
  const icImgCls = "w-5 h-5 block m-0 filter invert";
  const IcDashboard = () => <img src="/images/icons/dashbaord.svg" className={icImgCls} alt="" />;
  const IcPay = () => <img src="/images/icons/darkastpardakht.svg" className={icImgCls} alt="" />;
  const IcLetter = () => <img src="/images/icons/nameha.svg" className={icImgCls} alt="" />;
  const IcProjects = () => <img src="/images/icons/project.svg" className={icImgCls} alt="" />;
  const IcBudget = () => <img src="/images/icons/busgebandi.svg" className={icImgCls} alt="" />;
  const IcBase = () => <img src="/images/icons/atelaatpaye.svg" className={icImgCls} alt="" />;
  const IcCurrency = () => <img src="/images/icons/arz.svg" className={icImgCls} alt="" />;
  const IcUsers = () => <img src="/images/icons/users.svg" className={icImgCls} alt="" />;
  const IcContract = () => <img src="/images/icons/gharadad.svg" className={icImgCls} alt="" />;

  const svgCls = "w-5 h-5 block m-0 text-white";
  const sw = 2.2;

  const IcDoc = () => (
    <svg viewBox="0 0 24 24" className={svgCls} fill="none" stroke="currentColor" strokeWidth={sw}>
      <path d="M6 4h9l3 3v13H6z" />
      <path d="M9 13h6M9 17h6M9 9h3" />
    </svg>
  );

  const IcWorksheet = () => (
    <svg viewBox="0 0 24 24" className={svgCls} fill="none" stroke="currentColor" strokeWidth={sw}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 4v16M3 10h18" />
    </svg>
  );

  const IcBalance = () => (
    <svg viewBox="0 0 24 24" className={svgCls} fill="none" stroke="currentColor" strokeWidth={sw}>
      <path d="M4 20h16M12 4v16M6 8l6 4 6-4" />
    </svg>
  );

  const IcReceipt = () => (
    <svg viewBox="0 0 24 24" className={svgCls} fill="none" stroke="currentColor" strokeWidth={sw}>
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />
      <path d="M8 7h8M8 11h8M8 15h6" />
    </svg>
  );

  const IcDaily = () => (
    <svg viewBox="0 0 24 24" className={svgCls} fill="none" stroke="currentColor" strokeWidth={sw}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
    </svg>
  );

  // ✅ کلاس Active با ! (هیچ چیزی نتونه override کنه)
  const railBtn = (active) =>
    [
      "group w-14 h-14 border transition-all duration-200 p-0 mx-auto",
      "flex items-center justify-center cursor-pointer select-none",
      "focus:outline-none focus:ring-0",
      active
        ? "!bg-[#F48B35] !border-[#F48B35] !text-neutral-900"
        : "bg-neutral-900/90 text-white/90 border-neutral-800 hover:bg-[#f5882c] hover:border-[#f5882c] dark:bg-neutral-800/90 dark:text-neutral-100 dark:border-neutral-700",
    ].join(" ");

  const [tip, setTip] = useState({ show: false, y: 0, label: "" });

  const showTip = (label, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTip({ show: true, y: rect.top + rect.height / 2, label });
  };
  const hideTip = () => setTip({ show: false, y: 0, label: "" });

  const RailDivider = () => (
    <div className="my-2 h-px bg-neutral-800/60 dark:bg-neutral-700/60 w-10 mx-auto" />
  );

  // والدها هم وقتی زیرمنو فعاله یا خودش بازه، هایلایت بشن
  const projectsParentActive = !!open.projects || activeSection === "projects";
  const budgetParentActive = !!open.budget || activeSection === "budget";
  const baseParentActive = !!open.base || activeSection === "base";

  return (
    <>
      <aside
        dir="rtl"
        className="fixed right-0 top-0 bottom-0 z-50 w-[92px] rounded-none
                   bg-neutral-900/85 backdrop-blur-xl border-s border-neutral-800 shadow-2xl
                   px-3 overflow-auto"
      >
        <div className="h-full flex flex-col items-center pt-4 gap-2">
          <div onMouseEnter={(e) => showTip("داشبورد", e)} onMouseLeave={hideTip}>
            <LinkBtn
              to="/"
              className={railBtn(isActive("/"))}
              aria-label="داشبورد"
              onPointerDown={() => setPendingPath(clean("/"))}
              onTouchStart={() => setPendingPath(clean("/"))}
            >
              <IcDashboard />
            </LinkBtn>
          </div>

          <div onMouseEnter={(e) => showTip("درخواست پرداخت", e)} onMouseLeave={hideTip}>
            <LinkBtn
              to="/payment"
              className={railBtn(isActive("/payment"))}
              aria-label="درخواست پرداخت"
              onPointerDown={() => setPendingPath(clean("/payment"))}
              onTouchStart={() => setPendingPath(clean("/payment"))}
            >
              <IcPay />
            </LinkBtn>
          </div>

          <div onMouseEnter={(e) => showTip("نامه‌ها", e)} onMouseLeave={hideTip}>
            <LinkBtn
              to="/letters"
              className={railBtn(isActive("/letters"))}
              aria-label="نامه‌ها"
              onPointerDown={() => setPendingPath(clean("/letters"))}
              onTouchStart={() => setPendingPath(clean("/letters"))}
            >
              <IcLetter />
            </LinkBtn>
          </div>

          <RailDivider />

          <Btn
            className={railBtn(projectsParentActive)}
            onClick={() => toggle("projects")}
            aria-label="پروژه‌ها"
            onMouseEnter={(e) => showTip("پروژه‌ها", e)}
            onMouseLeave={hideTip}
          >
            <IcProjects />
          </Btn>

          {open.projects && (
            <div className="ms-2 mt-2 flex flex-col items-stretch gap-2">
              <div onMouseEnter={(e) => showTip("اطلاعات قراردادی", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/centers/contract-info"
                  className={railBtn(isActive("/centers/contract-info"))}
                  aria-label="اطلاعات قراردادی"
                >
                  <IcContract />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("کاربرگ مالی", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/projects/financial-worksheet"
                  className={railBtn(isActive("/projects/financial-worksheet"))}
                  aria-label="کاربرگ مالی"
                >
                  <IcWorksheet />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("گزارش‌ها", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/projects/reports"
                  className={railBtn(isActive("/projects/reports"))}
                  aria-label="گزارش‌ها"
                >
                  <img src="/images/icons/gozareshrozane.svg" className={icImgCls} alt="" />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("صورت وضعیت‌ها", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/projects/statements"
                  className={railBtn(isActive("/projects/statements"))}
                  aria-label="صورت وضعیت‌ها"
                >
                  <IcDoc />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("دریافتی‌ها", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/projects/receipts"
                  className={railBtn(isActive("/projects/receipts"))}
                  aria-label="دریافتی‌ها"
                >
                  <IcReceipt />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("ترازمالی پروژه", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/projects/balance"
                  className={railBtn(isActive("/projects/balance"))}
                  aria-label="ترازمالی پروژه"
                >
                  <IcBalance />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("روزنگار پروژه", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/projects/daily-log"
                  className={railBtn(isActive("/projects/daily-log"))}
                  aria-label="روزنگار پروژه"
                >
                  <IcDaily />
                </LinkBtn>
              </div>
            </div>
          )}

          <RailDivider />

          <Btn
            className={railBtn(budgetParentActive)}
            onClick={() => toggle("budget")}
            aria-label="بودجه‌بندی"
            onMouseEnter={(e) => showTip("بودجه‌بندی", e)}
            onMouseLeave={hideTip}
          >
            <IcBudget />
          </Btn>

          {open.budget && (
            <div className="ms-2 mt-2 flex flex-col items-stretch gap-2">
              <div onMouseEnter={(e) => showTip("تعریف مراکز بودجه", e)} onMouseLeave={hideTip}>
                <LinkBtn to="/budget/centers" className={railBtn(isActive("/budget/centers"))}>
                  <img src="/images/icons/tarifmarakez.svg" className={icImgCls} alt="" />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("برآورد هزینه‌ها", e)} onMouseLeave={hideTip}>
                <LinkBtn to="/estimates" className={railBtn(isActive("/estimates"))}>
                  <img src="/images/icons/baravord.svg" className={icImgCls} alt="" />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("برآورد درآمد", e)} onMouseLeave={hideTip}>
                <LinkBtn to="/revenue-estimates" className={railBtn(isActive("/revenue-estimates"))}>
                  <img src="/images/icons/baravord-daramad.svg" className={icImgCls} alt="" />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("تخصیص بودجه", e)} onMouseLeave={hideTip}>
                <LinkBtn to="/budget-allocation" className={railBtn(isActive("/budget-allocation"))}>
                  <img src="/images/icons/taksisbodge.svg" className={icImgCls} alt="" />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("گزارش‌ها", e)} onMouseLeave={hideTip}>
                <LinkBtn to="/budget/reports" className={railBtn(isActive("/budget/reports"))}>
                  <img src="/images/icons/gozareshha.svg" className={icImgCls} alt="" />
                </LinkBtn>
              </div>
            </div>
          )}

          <RailDivider />

          <Btn
            className={railBtn(baseParentActive)}
            onClick={() => toggle("base")}
            aria-label="اطلاعات پایه"
            onMouseEnter={(e) => showTip("اطلاعات پایه", e)}
            onMouseLeave={hideTip}
          >
            <IcBase />
          </Btn>

          {open.base && (
            <div className="ms-2 mt-2 flex flex-col items-stretch gap-2">
              <div onMouseEnter={(e) => showTip("واحدها", e)} onMouseLeave={hideTip}>
                <LinkBtn to="/base/units" className={railBtn(isActive("/base/units"))}>
                  <img src="/images/icons/unit.svg" className={icImgCls} alt="" />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("نقش‌های کاربری", e)} onMouseLeave={hideTip}>
                <LinkBtn to="/base/user-roles" className={railBtn(isActive("/base/user-roles"))}>
                  <img src="/images/icons/role.svg" className={icImgCls} alt="" />
                </LinkBtn>
              </div>

              {isMainAdmin && (
                <div onMouseEnter={(e) => showTip("کاربران", e)} onMouseLeave={hideTip}>
                  <LinkBtn to="/admin/users" className={railBtn(isActive("/admin/users"))}>
                    <IcUsers />
                  </LinkBtn>
                </div>
              )}

              <div onMouseEnter={(e) => showTip("پروژه‌ها", e)} onMouseLeave={hideTip}>
                <LinkBtn to="/centers/projects" className={railBtn(isActive("/centers/projects"))}>
                  <IcProjects />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("ارزها", e)} onMouseLeave={hideTip}>
                <LinkBtn to="/base/currencies" className={railBtn(isActive("/base/currencies"))}>
                  <IcCurrency />
                </LinkBtn>
              </div>
            </div>
          )}
        </div>
      </aside>

      {tip.show && (
        <div
          className="fixed z-[60] pointer-events-none text-xs px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-100 border border-neutral-700 shadow-lg whitespace-nowrap"
          style={{ top: tip.y, right: "100px", transform: "translateY(-50%)" }}
        >
          {tip.label}
        </div>
      )}
    </>
  );
}

export default RightNav;

