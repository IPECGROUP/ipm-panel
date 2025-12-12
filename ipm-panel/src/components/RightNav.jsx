// src/components/RightNav.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { isMainAdminUser } from "../utils/auth";
import { Btn, LinkBtn } from "./ui/Button";

// menu
function RightNav() {
  const { user } = useAuth();
  const isMainAdmin = isMainAdminUser(user);

  const { pathname } = useLocation();
  const clean = (p) => (p || "").replace(/\/+$/, "") || "/";
  const [pendingPath, setPendingPath] = useState(null);

  // وقتی مسیر عوض شد، مسیر جاری را به‌عنوان active نگه دار
  useEffect(() => {
    setPendingPath(clean(pathname));
  }, [pathname]);

  const isActive = (to) => {
    const p = clean(pathname),
      t = clean(to);
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

  // آیکن‌ها
  const icImgCls = "w-6 h-6 block m-0";
  const IcDashboard = () => (
    <img src="/images/icons/dashbaord.svg" className={icImgCls + " invert"} alt="" />
  );
  const IcPay = () => (
    <img src="/images/icons/darkastpardakht.svg" className={icImgCls + " invert"} alt="" />
  );
  const IcLetter = () => (
    <img src="/images/icons/nameha.svg" className={icImgCls + " invert"} alt="" />
  );
  const IcProjects = () => (
    <img src="/images/icons/project.svg" className={icImgCls + " invert"} alt="" />
  );
  const IcBudget = () => (
    <img src="/images/icons/busgebandi.svg" className={icImgCls + " invert"} alt="" />
  );
  const IcBase = () => (
    <img src="/images/icons/atelaatpaye.svg" className={icImgCls + " invert"} alt="" />
  );
  const IcCurrency = () => (
    <img src="/images/icons/arz.svg" className={icImgCls + " invert"} alt="" />
  );
  const IcUsers = () => (
    <img src="/images/icons/users.svg" className={icImgCls + " invert"} alt="" />
  );
  const IcContract = () => (
    <img src="/images/icons/gharadad.svg" className={icImgCls + " invert"} alt="" />
  );

  const svgCls = "w-6 h-6 block m-0";
  const sw = 2.2;

  const IcDoc = () => (
    <svg viewBox="0 0 24 24" className={svgCls} fill="none" stroke="currentColor" strokeWidth={sw}>
      <path d="M6 4h9l3 3v13H6z" />
      <path d="M9 13h6M9 17h6M9 9h3" />
    </svg>
  );

  const IcReport = () => (
    <svg viewBox="0 0 24 24" className={svgCls} fill="none" stroke="currentColor" strokeWidth={sw}>
      <path d="M3 3h18v18H3z" />
      <path d="M7 15l3-3 2 2 4-4 3 3" />
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

  // کلاس‌ها (همان قبلی)
  const railBtn = (active) =>
    [
      "group w-14 h-14 border transition-all duration-200 p-0 mx-auto",
      "flex items-center justify-center cursor-pointer select-none",
      "focus:outline-none focus:ring-0",
      active
        ? "text-neutral-900 border-neutral-800"
        : "bg-neutral-900/90 text-white/90 border-neutral-800 hover:bg-[#f5882c] hover:border-[#f5882c] dark:bg-neutral-800/90 dark:text-neutral-100 dark:border-neutral-700",
    ].join(" ");

  // 👈 این قسمت فقط برای active: inline style که هیچ چیز نتونه override کنه
  const railStyle = (active) =>
    active
      ? {
          backgroundColor: "#F48B35",
          borderColor: "#F48B35",
          color: "#111827",
        }
      : undefined;

  const [tip, setTip] = useState({ show: false, y: 0, label: "" });

  const showTip = (label, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTip({ show: true, y: rect.top + rect.height / 2, label });
  };

  const hideTip = () => setTip({ show: false, y: 0, label: "" });

  const RailDivider = () => (
    <div className="my-2 h-px bg-neutral-800/60 dark:bg-neutral-700/60 w-10 mx-auto" />
  );

  return (
    <>
      <aside
        dir="rtl"
        className="fixed right-0 top-0 bottom-0 z-50 w-[88px] rounded-none
                   bg-neutral-900/85 backdrop-blur-xl border-s border-neutral-800 shadow-2xl
                   px-3 overflow-auto"
      >
        <div className="h-full flex flex-col items-center pt-4 gap-2">
          <div onMouseEnter={(e) => showTip("داشبورد", e)} onMouseLeave={hideTip}>
            <LinkBtn
              to="/"
              className={railBtn(isActive("/"))}
              style={railStyle(isActive("/"))}
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
              style={railStyle(isActive("/payment"))}
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
              style={railStyle(isActive("/letters"))}
              aria-label="نامه‌ها"
              onPointerDown={() => setPendingPath(clean("/letters"))}
              onTouchStart={() => setPendingPath(clean("/letters"))}
            >
              <IcLetter />
            </LinkBtn>
          </div>

          <RailDivider />

          {/* پروژه‌ها */}
          <Btn
            className={railBtn(open.projects)}
            style={railStyle(open.projects)}
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
                  style={railStyle(isActive("/centers/contract-info"))}
                  aria-label="اطلاعات قراردادی"
                  onPointerDown={() => setPendingPath(clean("/centers/contract-info"))}
                  onTouchStart={() => setPendingPath(clean("/centers/contract-info"))}
                >
                  <IcContract />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("کاربرگ مالی", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/projects/financial-worksheet"
                  className={railBtn(isActive("/projects/financial-worksheet"))}
                  style={railStyle(isActive("/projects/financial-worksheet"))}
                  aria-label="کاربرگ مالی"
                  onPointerDown={() => setPendingPath(clean("/projects/financial-worksheet"))}
                  onTouchStart={() => setPendingPath(clean("/projects/financial-worksheet"))}
                >
                  <IcWorksheet />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("گزارش‌ها", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/projects/reports"
                  className={railBtn(isActive("/projects/reports"))}
                  style={railStyle(isActive("/projects/reports"))}
                  aria-label="گزارش‌ها"
                  onPointerDown={() => setPendingPath(clean("/projects/reports"))}
                  onTouchStart={() => setPendingPath(clean("/projects/reports"))}
                >
                  <img src="/images/icons/gozareshrozane.svg" className={icImgCls + " invert"} alt="" />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("صورت وضعیت‌ها", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/projects/statements"
                  className={railBtn(isActive("/projects/statements"))}
                  style={railStyle(isActive("/projects/statements"))}
                  aria-label="صورت وضعیت‌ها"
                  onPointerDown={() => setPendingPath(clean("/projects/statements"))}
                  onTouchStart={() => setPendingPath(clean("/projects/statements"))}
                >
                  <IcDoc />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("دریافتی‌ها", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/projects/receipts"
                  className={railBtn(isActive("/projects/receipts"))}
                  style={railStyle(isActive("/projects/receipts"))}
                  aria-label="دریافتی‌ها"
                  onPointerDown={() => setPendingPath(clean("/projects/receipts"))}
                  onTouchStart={() => setPendingPath(clean("/projects/receipts"))}
                >
                  <IcReceipt />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("ترازمالی پروژه", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/projects/balance"
                  className={railBtn(isActive("/projects/balance"))}
                  style={railStyle(isActive("/projects/balance"))}
                  aria-label="ترازمالی پروژه"
                  onPointerDown={() => setPendingPath(clean("/projects/balance"))}
                  onTouchStart={() => setPendingPath(clean("/projects/balance"))}
                >
                  <IcBalance />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("روزنگار پروژه", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/projects/daily-log"
                  className={railBtn(isActive("/projects/daily-log"))}
                  style={railStyle(isActive("/projects/daily-log"))}
                  aria-label="روزنگار پروژه"
                  onPointerDown={() => setPendingPath(clean("/projects/daily-log"))}
                  onTouchStart={() => setPendingPath(clean("/projects/daily-log"))}
                >
                  <IcDaily />
                </LinkBtn>
              </div>
            </div>
          )}

          <RailDivider />

          {/* بودجه‌بندی */}
          <Btn
            className={railBtn(open.budget)}
            style={railStyle(open.budget)}
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
                <LinkBtn
                  to="/budget/centers"
                  className={railBtn(isActive("/budget/centers"))}
                  style={railStyle(isActive("/budget/centers"))}
                  aria-label="تعریف مراکز بودجه"
                  onPointerDown={() => setPendingPath(clean("/budget/centers"))}
                  onTouchStart={() => setPendingPath(clean("/budget/centers"))}
                >
                  <img src="/images/icons/tarifmarakez.svg" className={icImgCls + " invert"} alt="" />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("برآورد هزینه‌ها", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/estimates"
                  className={railBtn(isActive("/estimates"))}
                  style={railStyle(isActive("/estimates"))}
                  aria-label="برآورد هزینه‌ها"
                  onPointerDown={() => setPendingPath(clean("/estimates"))}
                  onTouchStart={() => setPendingPath(clean("/estimates"))}
                >
                  <img src="/images/icons/baravord.svg" className={icImgCls + " invert"} alt="" />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("تخصیص بودجه", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/budget-allocation"
                  className={railBtn(isActive("/budget-allocation"))}
                  style={railStyle(isActive("/budget-allocation"))}
                  aria-label="تخصیص بودجه"
                  onPointerDown={() => setPendingPath(clean("/budget-allocation"))}
                  onTouchStart={() => setPendingPath(clean("/budget-allocation"))}
                >
                  <img src="/images/icons/taksisbodge.svg" className={icImgCls + " invert"} alt="" />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("گزارش‌ها", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/budget/reports"
                  className={railBtn(isActive("/budget/reports"))}
                  style={railStyle(isActive("/budget/reports"))}
                  aria-label="گزارش‌ها"
                  onPointerDown={() => setPendingPath(clean("/budget/reports"))}
                  onTouchStart={() => setPendingPath(clean("/budget/reports"))}
                >
                  <img src="/images/icons/gozareshha.svg" className={icImgCls + " invert"} alt="" />
                </LinkBtn>
              </div>
            </div>
          )}

          <RailDivider />

          {/* اطلاعات پایه */}
          <Btn
            className={railBtn(open.base)}
            style={railStyle(open.base)}
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
                <LinkBtn
                  to="/base/units"
                  className={railBtn(isActive("/base/units"))}
                  style={railStyle(isActive("/base/units"))}
                  aria-label="واحدها"
                  onPointerDown={() => setPendingPath(clean("/base/units"))}
                  onTouchStart={() => setPendingPath(clean("/base/units"))}
                >
                  <img src="/images/icons/unit.svg" className={icImgCls + " invert"} alt="" />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("نقش‌های کاربری", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/base/user-roles"
                  className={railBtn(isActive("/base/user-roles"))}
                  style={railStyle(isActive("/base/user-roles"))}
                  aria-label="نقش‌های کاربری"
                  onPointerDown={() => setPendingPath(clean("/base/user-roles"))}
                  onTouchStart={() => setPendingPath(clean("/base/user-roles"))}
                >
                  <img src="/images/icons/role.svg" className={icImgCls + " invert"} alt="" />
                </LinkBtn>
              </div>

              {isMainAdmin && (
                <div onMouseEnter={(e) => showTip("کاربران", e)} onMouseLeave={hideTip}>
                  <LinkBtn
                    to="/admin/users"
                    className={railBtn(isActive("/admin/users"))}
                    style={railStyle(isActive("/admin/users"))}
                    aria-label="کاربران"
                    onPointerDown={() => setPendingPath(clean("/admin/users"))}
                    onTouchStart={() => setPendingPath(clean("/admin/users"))}
                  >
                    <IcUsers />
                  </LinkBtn>
                </div>
              )}

              <div onMouseEnter={(e) => showTip("پروژه‌ها", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/centers/projects"
                  className={railBtn(isActive("/centers/projects"))}
                  style={railStyle(isActive("/centers/projects"))}
                  aria-label="پروژه‌ها"
                  onPointerDown={() => setPendingPath(clean("/centers/projects"))}
                  onTouchStart={() => setPendingPath(clean("/centers/projects"))}
                >
                  <IcProjects />
                </LinkBtn>
              </div>

              <div onMouseEnter={(e) => showTip("ارزها", e)} onMouseLeave={hideTip}>
                <LinkBtn
                  to="/base/currencies"
                  className={railBtn(isActive("/base/currencies"))}
                  style={railStyle(isActive("/base/currencies"))}
                  aria-label="ارزها"
                  onPointerDown={() => setPendingPath(clean("/base/currencies"))}
                  onTouchStart={() => setPendingPath(clean("/base/currencies"))}
                >
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
